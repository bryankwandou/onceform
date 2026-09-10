/*
  The consent step, and the reason the extension exists.

  The page is scanned first and the result shown as a list the person can trim
  before anything moves. Every box starts ticked because the common case is
  "yes, all of it" — but the list is always shown, so nobody finds out after the
  fact which fields a site quietly asked for.
*/

const LABELS = {
  fullName: "Full name",
  email: "Email",
  phone: "Phone",
  birthYear: "Birth year",
  ageBand: "Age range",
  gender: "Gender",
  country: "Country",
  city: "City",
  postcode: "Postcode",
  occupation: "Occupation",
  industry: "Industry",
  seniority: "Seniority",
  companySize: "Company size",
  incomeBand: "Income band",
  education: "Education",
  household: "Household size",
  languages: "Languages",
};

const els = {
  note: document.getElementById("note"),
  list: document.getElementById("fields"),
  fill: document.getElementById("fill"),
  vault: document.getElementById("vault"),
  origin: document.getElementById("origin"),
  result: document.getElementById("result"),
};

let vault = {};
let requested = [];

const VAULT_URL = "https://onceform.vercel.app/vault";

function selected() {
  return Array.from(els.list.querySelectorAll("input:checked")).map((i) => i.value);
}

function refreshButton() {
  const n = selected().length;
  els.fill.disabled = n === 0;
  els.fill.textContent = n === 0 ? "Release nothing" : `Release ${n} field${n === 1 ? "" : "s"}`;
}

function render() {
  els.list.innerHTML = "";

  if (requested.length === 0) {
    els.note.textContent = "";
    els.list.innerHTML =
      '<div class="empty">No fields here that Onceform recognises.</div>';
    refreshButton();
    return;
  }

  const known = requested.filter((f) => vault[f.key]);
  const missing = requested.filter((f) => !vault[f.key]);

  els.note.textContent = `This page asks for ${requested.length} thing${
    requested.length === 1 ? "" : "s"
  }. Untick anything you would rather keep.`;

  for (const f of known) {
    const li = document.createElement("li");
    li.innerHTML = `
      <input type="checkbox" value="${f.key}" checked />
      <span class="field"><b></b><span></span></span>`;
    li.querySelector("b").textContent = LABELS[f.key] || f.key;
    li.querySelector(".field span").textContent = vault[f.key];
    els.list.appendChild(li);
  }

  /* Shown but not offered: the site is asking, and the honest thing is to say
     the vault has no answer rather than silently dropping the field. */
  for (const f of missing) {
    const li = document.createElement("li");
    li.className = "missing";
    li.innerHTML = `
      <input type="checkbox" value="${f.key}" disabled />
      <span class="field"><b></b><span>Not in your vault</span></span>`;
    li.querySelector("b").textContent = LABELS[f.key] || f.key;
    els.list.appendChild(li);
  }

  els.list.addEventListener("change", refreshButton);
  refreshButton();
}

async function activeTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function start() {
  const stored = await chrome.storage.local.get("vault");
  vault = stored.vault || {};

  const tab = await activeTab();
  if (!tab || !/^https?:/.test(tab.url || "")) {
    els.note.textContent = "Onceform only works on ordinary web pages.";
    return;
  }

  els.origin.textContent = new URL(tab.url).hostname;

  let response;
  try {
    response = await chrome.tabs.sendMessage(tab.id, { type: "onceform:scan" });
  } catch {
    /* Content script missing, usually because the page loaded before the
       extension was installed. Injecting once is cheaper than asking for a
       reload. */
    try {
      await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["content.js"] });
      response = await chrome.tabs.sendMessage(tab.id, { type: "onceform:scan" });
    } catch {
      els.note.textContent = "This page will not let extensions read it.";
      return;
    }
  }

  requested = response?.fields || [];

  if (Object.keys(vault).length === 0) {
    els.note.textContent = "Your vault is empty. Add your details to start filling forms.";
    els.list.innerHTML = "";
    refreshButton();
    return;
  }

  render();
}

els.fill.addEventListener("click", async () => {
  const keys = selected();
  const values = Object.fromEntries(keys.map((k) => [k, vault[k]]));

  const tab = await activeTab();
  const outcome = await chrome.tabs.sendMessage(tab.id, { type: "onceform:fill", values });

  const origin = new URL(tab.url).hostname;

  /*
    Local record of the disclosure. The on-chain receipt is written from the web
    app, which is where the wallet lives — a service worker cannot hold a key
    the person can see, and pretending otherwise would put a signing key in the
    least inspectable part of the product.
  */
  const { history = [] } = await chrome.storage.local.get("history");
  history.unshift({ origin, fields: keys, at: Date.now() });
  await chrome.storage.local.set({ history: history.slice(0, 200) });

  els.result.hidden = false;
  els.result.textContent =
    outcome.filled > 0
      ? `Filled ${outcome.filled} field${outcome.filled === 1 ? "" : "s"} on ${origin}. Open Onceform to write the receipt.`
      : `Nothing was filled. The fields may have changed since the scan.`;
});

els.vault.addEventListener("click", () => {
  chrome.tabs.create({ url: VAULT_URL });
});

start();
