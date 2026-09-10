/*
  The extension, loaded unpacked into a real Chromium.

  The jsdom suite next door proves the field matcher in isolation, which is the
  part with the most logic in it. It cannot prove the parts that only exist
  because this is a browser extension: that Chrome accepts the manifest at all,
  that the content script is injected into an ordinary page, that
  chrome.storage is reachable from it, and that the two bridges actually move a
  vault and a disclosure log between an origin's localStorage and extension
  storage. Those are exactly the things that were broken while the unit tests
  were green, so they are worth the cost of starting a browser.

  Run:  node --test extension/test/browser.test.mjs
*/

import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium } from "playwright";

const EXTENSION = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/* The app origin the bridges are gated on, and a stand-in for somebody else's
   questionnaire. Port 3000 is not incidental — it is in the allow list. */
const APP_PORT = 3000;
const PANEL_PORT = 4173;

const SURVEY = `<!doctype html><html><body>
  <form>
    <label for="n">Full name</label><input id="n" name="q_1" />
    <label for="e">Email address</label><input id="e" name="q_2" />
    <label for="p">Phone number</label><input id="p" name="q_3" />
    <div class="question"><h3>What is your year of birth?</h3><input name="q_4" /></div>
  </form>
</body></html>`;

const APP = `<!doctype html><html><body><h1>Onceform</h1></body></html>`;

function serve(port, body) {
  const server = createServer((_req, res) => {
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end(body);
  });
  return new Promise((ok, fail) => {
    server.once("error", fail);
    server.listen(port, "127.0.0.1", () => ok(server));
  });
}

/**
 * Chrome derives an unpacked extension's id from the absolute path it was
 * loaded from, so it is stable across runs but not knowable in advance. Rather
 * than scrape chrome://extensions, work out the two candidates the hash could
 * produce and let the browser say which one answers.
 */
function candidateIds(path) {
  return ["utf16le", "utf8"].map((encoding) =>
    createHash("sha256")
      .update(Buffer.from(path, encoding))
      .digest("hex")
      .slice(0, 32)
      .replace(/[0-9a-f]/g, (d) => String.fromCharCode(97 + parseInt(d, 16)))
  );
}

/* --------------------------------- setup --------------------------------- */

let context;
let profile;
let appServer;
let panelServer;

/** A page inside the extension, used as a handle on the extension APIs. */
let ext;

test.before(async () => {
  appServer = await serve(APP_PORT, APP);
  panelServer = await serve(PANEL_PORT, SURVEY);

  profile = await mkdtemp(join(tmpdir(), "onceform-"));
  context = await chromium.launchPersistentContext(profile, {
    channel: "chromium",
    headless: true,
    args: [`--disable-extensions-except=${EXTENSION}`, `--load-extension=${EXTENSION}`],
  });

  ext = await context.newPage();
  let loaded = false;
  for (const id of candidateIds(EXTENSION)) {
    const response = await ext.goto(`chrome-extension://${id}/popup.html`).catch(() => null);
    if (response && (await ext.title().catch(() => "")) !== "") {
      loaded = true;
      break;
    }
  }
  assert.ok(loaded, "Chrome did not load the extension from this directory");
});

test.after(async () => {
  await context?.close();
  appServer?.close();
  panelServer?.close();
  if (profile) await rm(profile, { recursive: true, force: true });
});

/** Read a key out of extension storage, from inside the extension. */
const readStorage = (key) =>
  ext.evaluate((k) => chrome.storage.local.get(k).then((v) => v[k]), key);

const writeStorage = (items) =>
  ext.evaluate((i) => chrome.storage.local.set(i), items);

/**
 * Poll from here rather than with page.waitForFunction, which does not await an
 * async predicate — it sees the pending Promise, calls it truthy, and returns
 * before the thing being waited for has happened.
 */
async function until(predicate, what, timeout = 10_000) {
  const deadline = Date.now() + timeout;
  for (;;) {
    const value = await predicate();
    if (value) return value;
    if (Date.now() > deadline) throw new Error(`timed out waiting for ${what}`);
    await new Promise((r) => setTimeout(r, 200));
  }
}

/* --------------------------------- tests --------------------------------- */

test("Chrome accepts the manifest and loads the extension", async () => {
  const manifest = await ext.evaluate(() => chrome.runtime.getManifest());
  assert.equal(manifest.manifest_version, 3);
  assert.equal(manifest.name, "Onceform");
  /* A missing icon file is not a manifest error — Chrome loads the extension
     and shows a blank square. Fetch one to be sure it is really there. */
  const ok = await ext.evaluate(async () => {
    const res = await fetch(chrome.runtime.getURL("icons/icon128.png"));
    return res.ok && (await res.blob()).size > 0;
  });
  assert.ok(ok, "icon128.png is declared but not readable");
});

test("the content script is injected into an ordinary page", async () => {
  const page = await context.newPage();
  await page.goto(`http://127.0.0.1:${PANEL_PORT}/`);

  const tabId = await ext.evaluate(async (url) => {
    const [tab] = await chrome.tabs.query({ url });
    return tab?.id ?? null;
  }, `http://127.0.0.1:${PANEL_PORT}/*`);
  assert.ok(tabId, "the survey page has no tab Chrome will talk to");

  const scan = await ext.evaluate(
    (id) => chrome.tabs.sendMessage(id, { type: "onceform:scan" }),
    tabId
  );
  assert.deepEqual(
    scan.fields.map((f) => f.key),
    ["fullName", "email", "phone", "birthYear"]
  );
  await page.close();
});

test("a fill reaches the real form, and only the chosen fields", async () => {
  const page = await context.newPage();
  await page.goto(`http://127.0.0.1:${PANEL_PORT}/`);

  const tabId = await ext.evaluate(async (url) => {
    const [tab] = await chrome.tabs.query({ url });
    return tab.id;
  }, `http://127.0.0.1:${PANEL_PORT}/*`);

  const outcome = await ext.evaluate(
    (id) =>
      chrome.tabs.sendMessage(id, {
        type: "onceform:fill",
        values: { fullName: "Bryan Kwandou", email: "b@example.test" },
      }),
    tabId
  );

  assert.equal(outcome.filled, 2);
  assert.equal(await page.inputValue("#n"), "Bryan Kwandou");
  assert.equal(await page.inputValue("#e"), "b@example.test");
  assert.equal(await page.inputValue("#p"), "", "a field nobody ticked must stay empty");
  await page.close();
});

test("the vault crosses from the app's localStorage into extension storage", async () => {
  await writeStorage({ vault: {} });

  const page = await context.newPage();
  await page.goto(`http://localhost:${APP_PORT}/vault`);
  await page.evaluate(() =>
    localStorage.setItem(
      "onceform:vault",
      JSON.stringify({ fullName: "Bryan Kwandou", city: "Jakarta" })
    )
  );

  /* The mirror runs on a slow timer, which is the whole point of it. */
  try {
    const vault = await until(
      async () => {
        const v = await readStorage("vault");
        return v?.city === "Jakarta" ? v : null;
      },
      "the vault to reach extension storage"
    );
    assert.deepEqual(vault, { fullName: "Bryan Kwandou", city: "Jakarta" });
  } finally {
    /* Leave no tab behind: its mirror would keep writing into the next test. */
    await page.close();
  }
});

test("no other site can hand the extension a vault", async () => {
  await writeStorage({ vault: { fullName: "Bryan Kwandou" } });

  const page = await context.newPage();
  await page.goto(`http://127.0.0.1:${PANEL_PORT}/`);
  await page.evaluate(() =>
    localStorage.setItem("onceform:vault", JSON.stringify({ fullName: "Someone Else" }))
  );
  await page.waitForTimeout(3500); /* longer than the mirror's interval */

  try {
    assert.deepEqual(
      await readStorage("vault"),
      { fullName: "Bryan Kwandou" },
      "a questionnaire origin overwrote the vault"
    );
  } finally {
    await page.close();
  }
});

test("the disclosure log crosses back to the app, without the answers", async () => {
  await writeStorage({
    history: [
      {
        origin: "panel.example.test",
        fields: ["email", "ageBand"],
        at: 1700000000000,
        values: { email: "b@example.test" },
      },
    ],
  });

  const page = await context.newPage();
  await page.goto(`http://localhost:${APP_PORT}/receipts`);

  try {
    const raw = await until(
      () => page.evaluate(() => localStorage.getItem("onceform:disclosures")),
      "the disclosure log to reach the app"
    );
    assert.deepEqual(JSON.parse(raw), [
      { origin: "panel.example.test", fields: ["email", "ageBand"], at: 1700000000000 },
    ]);
    assert.equal(raw.includes("b@example.test"), false, "an answer crossed with the log");
  } finally {
    await page.close();
  }
});

test("the disclosure log is not published to anyone else", async () => {
  const page = await context.newPage();
  await page.goto(`http://127.0.0.1:${PANEL_PORT}/`);
  await page.waitForTimeout(1000);

  assert.equal(
    await page.evaluate(() => localStorage.getItem("onceform:disclosures")),
    null,
    "a questionnaire origin was handed the disclosure log"
  );
  await page.close();
});
