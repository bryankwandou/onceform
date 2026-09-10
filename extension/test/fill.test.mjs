/*
  Tests for the content script, run against real questionnaire markup.

  The content script is the part of Onceform nobody can inspect at a glance: it
  runs on other people's pages, against markup we do not control, and a mistake
  there either fills a field wrongly or leaks one the person did not tick. So
  the cases below are drawn from the shapes survey builders actually emit —
  labels wired by `for`, questions in a sibling heading, inputs named `q_14` —
  rather than from tidy markup that would only prove the happy path.

  Run:  node --test extension/test/
*/

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";

const SOURCE = readFileSync(new URL("../content.js", import.meta.url), "utf8");

/**
 * Evaluate the content script against a fresh document and hand back its
 * internals. The script registers a chrome listener on load, so a stub has to
 * exist before it runs.
 */
function load(html, options = {}) {
  const dom = new JSDOM(`<!doctype html><html><body>${html}</body></html>`, {
    url: options.url || "https://panel.example.test/survey",
  });

  const win = dom.window;

  const previous = {
    window: globalThis.window,
    document: globalThis.document,
    location: globalThis.location,
    localStorage: globalThis.localStorage,
    CSS: globalThis.CSS,
    chrome: globalThis.chrome,
    Event: globalThis.Event,
    HTMLInputElement: globalThis.HTMLInputElement,
    HTMLSelectElement: globalThis.HTMLSelectElement,
    HTMLTextAreaElement: globalThis.HTMLTextAreaElement,
  };

  globalThis.window = win;
  globalThis.document = win.document;
  globalThis.location = win.location;
  globalThis.localStorage = win.localStorage;
  /* jsdom ships no CSS.escape; every browser the extension targets has it. */
  globalThis.CSS = win.CSS ?? {
    escape: (value) => String(value).replace(/[^a-zA-Z0-9_-]/g, (c) => `\${c}`),
  };
  globalThis.Event = win.Event;
  globalThis.HTMLInputElement = win.HTMLInputElement;
  globalThis.HTMLSelectElement = win.HTMLSelectElement;
  globalThis.HTMLTextAreaElement = win.HTMLTextAreaElement;
  /* Everything the content script writes to extension storage, in order, so a
     test can assert on it without a browser. */
  const written = [];
  globalThis.chrome = {
    runtime: { onMessage: { addListener() {} } },
    storage: {
      local: {
        set: (items) => written.push(items),
        /* Real chrome.storage is async; the callback form is what the content
           script uses, and it resolves before the next tick in practice. */
        get: (_key, callback) => callback(options.extensionStorage || {}),
      },
      onChanged: { addListener() {} },
    },
  };

  /*
    jsdom does not lay anything out, so every element reports offsetParent as
    null and the visibility guard would reject the entire form. Report a parent
    for anything not explicitly hidden, which is what a real browser does.
  */
  Object.defineProperty(win.HTMLElement.prototype, "offsetParent", {
    configurable: true,
    get() {
      const style = this.getAttribute("style") || "";
      if (this.hidden || /display:\s*none/.test(style)) return null;
      return this.parentElement;
    },
  });

  /* Whatever the app would have saved before the extension ran. */
  for (const [key, value] of Object.entries(options.storage || {})) {
    win.localStorage.setItem(key, value);
  }

  const exposed = `${SOURCE}
    ;globalThis.__onceform = { scan, fill, classify, describe, mirrorVault, vaultMirrorTimer };`;

  // eslint-disable-next-line no-eval
  (0, eval)(exposed);
  const api = globalThis.__onceform;

  return {
    ...api,
    written,
    document: win.document,
    window: win,
    restore() {
      /* The mirror runs on a timer; leaving it armed would hold the test
         runner open. */
      if (api.vaultMirrorTimer !== null) win.clearInterval(api.vaultMirrorTimer);
      Object.assign(globalThis, previous);
    },
  };
}

const APP = "https://onceform.vercel.app/vault";

/* ------------------------------ recognition ------------------------------ */

test("reads a label wired by the for attribute", () => {
  const ctx = load(`
    <label for="f1">Full name</label><input id="f1" name="q_1" />
    <label for="f2">Email address</label><input id="f2" name="q_2" />
  `);
  const keys = ctx.scan().map((f) => f.key);
  assert.deepEqual(keys, ["fullName", "email"]);
  ctx.restore();
});

test("prefers an explicit autocomplete over a misleading name", () => {
  /* The site says this is an email; the name attribute says otherwise. The
     author's declaration should win. */
  const ctx = load(`<input name="city" autocomplete="email" />`);
  assert.equal(ctx.classify(ctx.document.querySelector("input")), "email");
  ctx.restore();
});

test("finds the question when it sits in a sibling heading", () => {
  const ctx = load(`
    <div class="question">
      <h3>What is your year of birth?</h3>
      <input name="q_14" />
    </div>
  `);
  assert.equal(ctx.classify(ctx.document.querySelector("input")), "birthYear");
  ctx.restore();
});

test("matches Indonesian survey wording", () => {
  const ctx = load(`
    <label for="a">Nomor HP</label><input id="a" />
    <label for="b">Tahun lahir</label><input id="b" />
    <label for="c">Jenis kelamin</label><input id="c" />
    <label for="d">Pekerjaan</label><input id="d" />
  `);
  const keys = ctx.scan().map((f) => f.key);
  assert.deepEqual(keys, ["phone", "birthYear", "gender", "occupation"]);
  ctx.restore();
});

test("never classifies a password field", () => {
  const ctx = load(`<label for="p">Email</label><input id="p" type="password" />`);
  assert.equal(ctx.scan().length, 0);
  ctx.restore();
});

test("ignores fields hidden from the person", () => {
  const ctx = load(`
    <label for="v">Email</label><input id="v" />
    <label for="h">Phone</label><input id="h" style="display: none" />
  `);
  assert.deepEqual(ctx.scan().map((f) => f.key), ["email"]);
  ctx.restore();
});

/* -------------------------------- filling -------------------------------- */

test("fills only the fields it was handed", () => {
  const ctx = load(`
    <label for="n">Full name</label><input id="n" />
    <label for="e">Email address</label><input id="e" />
    <label for="p">Phone number</label><input id="p" />
  `);

  const result = ctx.fill({ fullName: "Bryan Kwandou", email: "b@example.test" });

  assert.equal(result.filled, 2);
  assert.equal(ctx.document.querySelector("#n").value, "Bryan Kwandou");
  assert.equal(ctx.document.querySelector("#e").value, "b@example.test");
  assert.equal(ctx.document.querySelector("#p").value, "", "unticked field must stay empty");
  ctx.restore();
});

test("dispatches input and change so frameworks notice", () => {
  const ctx = load(`<label for="n">Full name</label><input id="n" />`);
  const el = ctx.document.querySelector("#n");

  const seen = [];
  el.addEventListener("input", () => seen.push("input"));
  el.addEventListener("change", () => seen.push("change"));

  ctx.fill({ fullName: "Bryan" });
  assert.deepEqual(seen, ["input", "change"]);
  ctx.restore();
});

test("chooses a select option by its visible text", () => {
  const ctx = load(`
    <label for="c">Country</label>
    <select id="c">
      <option value="">Choose</option>
      <option value="id">Indonesia</option>
      <option value="sg">Singapore</option>
    </select>
  `);

  const result = ctx.fill({ country: "Indonesia" });
  assert.equal(result.filled, 1);
  assert.equal(ctx.document.querySelector("#c").value, "id");
  ctx.restore();
});

test("reports a select whose options do not contain the value", () => {
  const ctx = load(`
    <label for="c">Country</label>
    <select id="c"><option value="sg">Singapore</option></select>
  `);

  const result = ctx.fill({ country: "Indonesia" });
  assert.equal(result.filled, 0);
  assert.deepEqual(result.skipped, ["country"]);
  ctx.restore();
});

test("leaves disabled and readonly fields alone", () => {
  const ctx = load(`
    <label for="a">Email address</label><input id="a" disabled />
    <label for="b">Full name</label><input id="b" readonly />
  `);

  const result = ctx.fill({ email: "b@example.test", fullName: "Bryan" });
  assert.equal(result.filled, 0);
  ctx.restore();
});

test("marks what it touched so a person can see it afterwards", () => {
  const ctx = load(`<label for="n">Full name</label><input id="n" />`);
  ctx.fill({ fullName: "Bryan" });
  assert.equal(ctx.document.querySelector("#n").getAttribute("data-onceform-filled"), "1");
  ctx.restore();
});

test("an empty vault value is not written over an existing answer", () => {
  const ctx = load(`<label for="n">Full name</label><input id="n" value="typed by hand" />`);
  const result = ctx.fill({ fullName: "" });
  assert.equal(result.filled, 0);
  assert.equal(ctx.document.querySelector("#n").value, "typed by hand");
  ctx.restore();
});

/* ----------------------------- the vault bridge ---------------------------- */

test("mirrors the vault out of the app's localStorage", () => {
  const ctx = load("", {
    url: APP,
    storage: { "onceform:vault": JSON.stringify({ fullName: "Bryan", email: "b@example.test" }) },
  });

  assert.deepEqual(ctx.written, [
    { vault: { fullName: "Bryan", email: "b@example.test" } },
  ]);
  ctx.restore();
});

test("does not touch extension storage on anyone else's site", () => {
  const ctx = load("", { storage: { "onceform:vault": JSON.stringify({ email: "b@example.test" }) } });
  assert.deepEqual(ctx.written, [], "a survey page must never write the vault");
  assert.equal(ctx.vaultMirrorTimer, null, "and must not arm the mirror");
  ctx.restore();
});

test("writes once per actual change, not once per check", () => {
  const ctx = load("", { url: APP, storage: { "onceform:vault": "{}" } });
  ctx.mirrorVault();
  ctx.mirrorVault();
  assert.equal(ctx.written.length, 1);

  ctx.window.localStorage.setItem("onceform:vault", JSON.stringify({ city: "Jakarta" }));
  ctx.mirrorVault();
  assert.deepEqual(ctx.written[1], { vault: { city: "Jakarta" } });
  ctx.restore();
});

test("survives a vault that is not an object", () => {
  const ctx = load("", { url: APP, storage: { "onceform:vault": '"not a vault"' } });
  assert.deepEqual(ctx.written, []);
  ctx.restore();
});

test("survives a half-written vault", () => {
  const ctx = load("", { url: APP, storage: { "onceform:vault": "{\"email\":" } });
  assert.deepEqual(ctx.written, []);
  ctx.restore();
});

/* --------------------------- the disclosure log --------------------------- */

test("hands the disclosure log to the app", () => {
  const ctx = load("", {
    url: APP,
    extensionStorage: {
      history: [{ origin: "panel.example.test", fields: ["email", "ageBand"], at: 1700000000000 }],
    },
  });

  const published = JSON.parse(ctx.window.localStorage.getItem("onceform:disclosures"));
  assert.deepEqual(published, [
    { origin: "panel.example.test", fields: ["email", "ageBand"], at: 1700000000000 },
  ]);
  ctx.restore();
});

test("carries the log but never the answers", () => {
  const ctx = load("", {
    url: APP,
    extensionStorage: {
      history: [
        {
          origin: "panel.example.test",
          fields: ["email"],
          at: 1700000000000,
          values: { email: "b@example.test" },
        },
      ],
    },
  });

  const raw = ctx.window.localStorage.getItem("onceform:disclosures");
  assert.equal(raw.includes("b@example.test"), false, "an answer must not cross");
  assert.deepEqual(Object.keys(JSON.parse(raw)[0]).sort(), ["at", "fields", "origin"]);
  ctx.restore();
});

test("drops log entries that are the wrong shape", () => {
  const ctx = load("", {
    url: APP,
    extensionStorage: { history: [null, { origin: 7 }, { origin: "ok.test", fields: ["email"] }] },
  });

  const published = JSON.parse(ctx.window.localStorage.getItem("onceform:disclosures"));
  assert.deepEqual(published, [{ origin: "ok.test", fields: ["email"], at: 0 }]);
  ctx.restore();
});

test("publishes nothing on a site that is not the app", () => {
  const ctx = load("", {
    extensionStorage: { history: [{ origin: "panel.example.test", fields: ["email"], at: 1 }] },
  });
  assert.equal(ctx.window.localStorage.getItem("onceform:disclosures"), null);
  ctx.restore();
});
