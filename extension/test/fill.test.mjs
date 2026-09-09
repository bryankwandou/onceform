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
function load(html) {
  const dom = new JSDOM(`<!doctype html><html><body>${html}</body></html>`, {
    url: "https://panel.example.test/survey",
  });

  const win = dom.window;

  const previous = {
    window: globalThis.window,
    document: globalThis.document,
    location: globalThis.location,
    CSS: globalThis.CSS,
    chrome: globalThis.chrome,
    Event: globalThis.Event,
    HTMLInputElement: globalThis.HTMLInputElement,
    HTMLSelectElement: globalThis.HTMLSelectElement,
    HTMLTextAreaElement: globalThis.HTMLTextAreaElement,
  };

  globalThis.window = win;
  globalThis.document = win.document;
  /* jsdom ships no CSS.escape; every browser the extension targets has it. */
  globalThis.CSS = win.CSS ?? {
    escape: (value) => String(value).replace(/[^a-zA-Z0-9_-]/g, (c) => `\${c}`),
  };
  globalThis.Event = win.Event;
  globalThis.HTMLInputElement = win.HTMLInputElement;
  globalThis.HTMLSelectElement = win.HTMLSelectElement;
  globalThis.HTMLTextAreaElement = win.HTMLTextAreaElement;
  globalThis.chrome = { runtime: { onMessage: { addListener() {} } } };

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

  const exposed = `${SOURCE}
    ;globalThis.__onceform = { scan, fill, classify, describe };`;

  // eslint-disable-next-line no-eval
  (0, eval)(exposed);
  const api = globalThis.__onceform;

  return {
    ...api,
    document: win.document,
    restore() {
      Object.assign(globalThis, previous);
    },
  };
}

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
