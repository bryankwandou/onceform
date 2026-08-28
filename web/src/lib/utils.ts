import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Shorten a base58 address for display without losing its recognisable ends. */
export function shortAddress(address: string, lead = 4, tail = 4) {
  if (address.length <= lead + tail + 1) return address;
  return `${address.slice(0, lead)}…${address.slice(-tail)}`;
}

/** Solana Explorer link, pinned to devnet since that is where SaySo runs today. */
export function explorer(kind: "tx" | "address", value: string) {
  return `https://explorer.solana.com/${kind}/${value}?cluster=devnet`;
}

/**
 * The vault field catalogue.
 *
 * Order is load-bearing: a field's index is its bit position in the
 * `fields_mask` written into every consent receipt on chain. Append only —
 * reordering these would silently rewrite the meaning of every receipt already
 * issued.
 */
export const VAULT_FIELDS = [
  { key: "fullName", label: "Full name", group: "core", sensitivity: "low" },
  { key: "email", label: "Email address", group: "core", sensitivity: "medium" },
  { key: "phone", label: "Phone number", group: "core", sensitivity: "high" },
  { key: "birthYear", label: "Year of birth", group: "demographic", sensitivity: "medium" },
  { key: "ageBand", label: "Age band", group: "demographic", sensitivity: "low" },
  { key: "gender", label: "Gender", group: "demographic", sensitivity: "medium" },
  { key: "country", label: "Country", group: "demographic", sensitivity: "low" },
  { key: "city", label: "City", group: "demographic", sensitivity: "medium" },
  { key: "postcode", label: "Postcode", group: "demographic", sensitivity: "high" },
  { key: "occupation", label: "Occupation", group: "professional", sensitivity: "low" },
  { key: "industry", label: "Industry", group: "professional", sensitivity: "low" },
  { key: "seniority", label: "Seniority", group: "professional", sensitivity: "low" },
  { key: "companySize", label: "Company size", group: "professional", sensitivity: "low" },
  { key: "incomeBand", label: "Income band", group: "professional", sensitivity: "high" },
  { key: "education", label: "Education level", group: "background", sensitivity: "low" },
  { key: "household", label: "Household size", group: "background", sensitivity: "medium" },
  { key: "languages", label: "Languages", group: "background", sensitivity: "low" },
] as const;

export type VaultFieldKey = (typeof VAULT_FIELDS)[number]["key"];

/** Turn a set of field keys into the u64 bitmask the program stores. */
export function fieldsToMask(keys: readonly string[]): bigint {
  let mask = 0n;
  for (const key of keys) {
    const index = VAULT_FIELDS.findIndex((f) => f.key === key);
    if (index >= 0) mask |= 1n << BigInt(index);
  }
  return mask;
}

/** Reverse of {@link fieldsToMask}, for rendering a receipt back to a human. */
export function maskToFields(mask: bigint): string[] {
  return VAULT_FIELDS.filter((_, i) => (mask >> BigInt(i)) & 1n).map((f) => f.label);
}

/** Attestation schema ids, mirrored from the on-chain program. */
export const SCHEMAS = {
  UNIQUE_HUMAN: 0,
  AGE_BAND: 1,
  COUNTRY: 2,
  EMPLOYMENT: 3,
} as const;
