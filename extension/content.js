/*
  Runs on every page, but stays completely inert until the popup asks it to do
  something. Nothing is read from the page and nothing is stored unless the
  person opens Onceform and presses a button, which is the only reason this is
  safe to grant broad host permissions to.
*/

/* Ordered by how much we trust the signal. An explicit autocomplete attribute
   is a deliberate statement by the site author, so it beats a name guess. */
const MATCHERS = [
  { key: "fullName", autocomplete: ["name"], patterns: [/full.?name/i, /^name$/i, /your.?name/i] },
  { key: "email", autocomplete: ["email"], patterns: [/e.?mail/i], types: ["email"] },
  { key: "phone", autocomplete: ["tel"], patterns: [/phone/i, /mobile/i, /telp/i, /nomor.?hp/i], types: ["tel"] },
  { key: "birthYear", autocomplete: ["bday-year"], patterns: [/birth.?year/i, /year.?of.?birth/i, /tahun.?lahir/i] },
  { key: "ageBand", autocomplete: [], patterns: [/age.?(range|band|group)/i, /^age$/i, /usia/i] },
  { key: "gender", autocomplete: ["sex"], patterns: [/gender/i, /jenis.?kelamin/i] },
  { key: "country", autocomplete: ["country", "country-name"], patterns: [/country/i, /negara/i] },
  { key: "city", autocomplete: ["address-level2"], patterns: [/city/i, /town/i, /kota/i] },
  { key: "postcode", autocomplete: ["postal-code"], patterns: [/post(al)?.?code/i, /zip/i, /kode.?pos/i] },
  { key: "occupation", autocomplete: ["organization-title"], patterns: [/occupation/i, /job.?title/i, /profesi/i, /pekerjaan/i] },
  { key: "industry", autocomplete: [], patterns: [/industry/i, /sector/i, /industri/i] },
  { key: "seniority", autocomplete: [], patterns: [/seniority/i, /career.?level/i, /jabatan/i] },
  { key: "companySize", autocomplete: [], patterns: [/company.?size/i, /employees/i, /ukuran.?perusahaan/i] },
  { key: "incomeBand", autocomplete: [], patterns: [/income/i, /salary/i, /penghasilan/i] },
  { key: "education", autocomplete: [], patterns: [/education/i, /degree/i, /pendidikan/i] },
  { key: "household", autocomplete: [], patterns: [/household/i, /family.?size/i] },
  { key: "languages", autocomplete: ["language"], patterns: [/language/i, /bahasa/i] },
];

const FILLABLE =
  'input:not([type=hidden]):not([type=submit]):not([type=button]):not([type=password]), select, textarea';

/**
 * Every scrap of text a site might have attached to a field. Labels are the
 * usual carrier, but plenty of survey tools put the question in an aria-label
 * or a placeholder and leave the name attribute as something like `q_14`.
 */
function describe(el) {
  const bits = [
    el.name,
    el.id,
    el.getAttribute("aria-label"),
    el.getAttribute("placeholder"),
    el.getAttribute("data-question"),
  ];

  if (el.id) {
    const label = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
    if (label) bits.push(label.textContent);
  }
  const wrapping = el.closest("label");
  if (wrapping) bits.push(wrapping.textContent);

  /* Survey builders often render the question as a sibling heading rather than
     a real label, so give the surrounding block one look too. */
  const block = el.closest("div, li, fieldset, section");
  if (block) {
    const heading = block.querySelector("legend, h1, h2, h3, h4, p, span");
    if (heading && heading.textContent.length < 200) bits.push(heading.textContent);
  }

  return bits.filter(Boolean).join(" ").slice(0, 400);
}

function classify(el) {
  const auto = (el.getAttribute("autocomplete") || "").toLowerCase();
  const type = (el.getAttribute("type") || "").toLowerCase();
  const text = describe(el);

  for (const m of MATCHERS) {
    if (auto && m.autocomplete.includes(auto)) return m.key;
  }
  for (const m of MATCHERS) {
    if (m.types && m.types.includes(type)) return m.key;
    if (m.patterns.some((p) => p.test(text))) return m.key;
  }
  return null;
}

/** What this page is asking for, without touching any of it. */
function scan() {
  const found = new Map();
  for (const el of document.querySelectorAll(FILLABLE)) {
    if (el.offsetParent === null && el.type !== "hidden") continue;
    const key = classify(el);
    if (key && !found.has(key)) found.set(key, describe(el).slice(0, 80));
  }
  return Array.from(found, ([key, label]) => ({ key, label }));
}

/*
  Assigning to .value directly is invisible to React and Vue, which track the
  last value they wrote and skip the re-render when it looks unchanged. Going
  through the native setter and then dispatching input+change makes the write
  look like a real keystroke to every framework we have tested against.
*/
function setValue(el, value) {
  const proto =
    el instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : el instanceof HTMLSelectElement
        ? HTMLSelectElement.prototype
        : HTMLInputElement.prototype;

  const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
  if (setter) setter.call(el, value);
  else el.value = value;

  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
}

/** Selects need an existing option; a free-text value would be silently dropped. */
function setSelect(el, value) {
  const target = value.trim().toLowerCase();
  const option =
    Array.from(el.options).find((o) => o.value.trim().toLowerCase() === target) ||
    Array.from(el.options).find((o) => o.textContent.trim().toLowerCase() === target) ||
    Array.from(el.options).find((o) => o.textContent.trim().toLowerCase().includes(target));

  if (!option) return false;
  setValue(el, option.value);
  return true;
}

function fill(values) {
  let filled = 0;
  const skipped = [];

  for (const el of document.querySelectorAll(FILLABLE)) {
    if (el.offsetParent === null) continue;
    if (el.disabled || el.readOnly) continue;

    const key = classify(el);
    if (!key) continue;

    const value = values[key];
    if (value === undefined || value === "") continue;

    const ok = el instanceof HTMLSelectElement ? setSelect(el, value) : (setValue(el, value), true);
    if (ok) {
      filled += 1;
      el.setAttribute("data-onceform-filled", "1");
    } else {
      skipped.push(key);
    }
  }

  return { filled, skipped };
}

chrome.runtime.onMessage.addListener((msg, _sender, respond) => {
  if (msg.type === "onceform:scan") {
    respond({ fields: scan(), origin: location.origin, title: document.title });
  }
  if (msg.type === "onceform:fill") {
    respond(fill(msg.values || {}));
  }
  return true;
});
