"use client";

/*
  The vault.

  Values live in localStorage and are never sent anywhere. What reaches the
  chain is a single 32-byte commitment over the whole set, salted per device,
  which is enough to prove later that a disclosed value came from the vault the
  person had registered without putting any of it on a public ledger.
*/

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Check, Loader2, ShieldCheck, Wallet } from "lucide-react";
import { Nav } from "@/components/site/nav";
import { Footer } from "@/components/site/footer";
import { useWallet } from "@/lib/wallet";
import { ixInitProfile, ixRotateVault, profilePda, vaultCommitment } from "@/lib/chain";
import { VAULT_FIELDS, explorer, shortAddress } from "@/lib/utils";

const STORAGE_KEY = "onceform:vault";
const SALT_KEY = "onceform:salt";

const GROUPS = [
  { id: "core", title: "Who you are", note: "Only ever released field by field." },
  { id: "demographic", title: "Demographics", note: "What most panels screen on." },
  { id: "professional", title: "What you do", note: "The usual B2B screening questions." },
  { id: "background", title: "Background", note: "Asked less often, worth having ready." },
] as const;

const SENSITIVITY_COPY = {
  low: "Low",
  medium: "Medium",
  high: "Sensitive",
} as const;

function newSalt() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function hex(bytes: Uint8Array) {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export default function VaultPage() {
  const wallet = useWallet();
  const [values, setValues] = useState<Record<string, string>>({});
  const [salt, setSalt] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [commitment, setCommitment] = useState("");
  const [registered, setRegistered] = useState<boolean | null>(null);
  const [onChain, setOnChain] = useState("");
  const [busy, setBusy] = useState(false);
  const [signature, setSignature] = useState("");
  const [error, setError] = useState("");

  /* ---------------------------- local storage ---------------------------- */

  useEffect(() => {
    try {
      setValues(JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"));
      let s = localStorage.getItem(SALT_KEY);
      if (!s) {
        s = newSalt();
        localStorage.setItem(SALT_KEY, s);
      }
      setSalt(s);
    } catch {
      /* Private browsing, or storage disabled. The vault simply starts empty. */
      setSalt(newSalt());
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(values));
    } catch {}
  }, [values, loaded]);

  useEffect(() => {
    if (!loaded || !salt) return;
    vaultCommitment(values, salt).then((c) => setCommitment(hex(c)));
  }, [values, salt, loaded]);

  /* ------------------------------- on chain ------------------------------ */

  const refreshProfile = useCallback(async () => {
    if (!wallet.publicKey) {
      setRegistered(null);
      return;
    }
    const [pda] = profilePda(wallet.publicKey);
    const info = await wallet.connection.getAccountInfo(pda);
    setRegistered(Boolean(info));
    /* Commitment sits after the 8-byte header and the 32-byte authority. */
    if (info) setOnChain(hex(new Uint8Array(info.data.slice(40, 72))));
  }, [wallet.publicKey, wallet.connection]);

  useEffect(() => {
    refreshProfile();
  }, [refreshProfile]);

  const filled = useMemo(
    () => VAULT_FIELDS.filter((f) => values[f.key]?.trim()).length,
    [values]
  );

  const dirty = registered === true && onChain !== "" && onChain !== commitment;

  async function publish() {
    if (!wallet.publicKey) return;
    setBusy(true);
    setError("");
    setSignature("");
    try {
      const bytes = await vaultCommitment(values, salt);
      const ix = registered
        ? await ixRotateVault(wallet.publicKey, bytes)
        : await ixInitProfile(wallet.publicKey, bytes);
      setSignature(await wallet.send([ix]));
      await refreshProfile();
    } catch (e) {
      setError(e instanceof Error ? e.message : "The transaction did not go through.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Nav />
      <main id="content" className="mx-auto max-w-5xl px-5 pb-24 pt-28 sm:px-8">
        <header className="max-w-2xl">
          <h1 className="text-[34px] font-semibold leading-[1.1] tracking-[-0.03em] sm:text-[42px]">
            Your vault
          </h1>
          <p className="mt-3.5 text-[15px] leading-relaxed text-chalk-400">
            Fill in as much or as little as you want. Everything here stays in
            this browser. What goes to the chain is one 32-byte fingerprint of
            the whole set, which proves later that an answer came from this
            vault without revealing a single value in it.
          </p>
        </header>

        {/* ------------------------------ status ----------------------------- */}

        <div className="mt-8 rounded-2xl border border-white/[0.08] bg-ink-900 p-5">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="size-4 text-amber-brand" />
              <span className="text-[13.5px] text-chalk-300">
                {filled} of {VAULT_FIELDS.length} fields filled
              </span>
            </div>

            <div className="ml-auto flex items-center gap-2.5">
              {wallet.publicKey ? (
                <>
                  <span className="font-mono text-[12px] text-chalk-500">
                    {shortAddress(wallet.publicKey.toBase58(), 4, 4)}
                  </span>
                  <button
                    onClick={wallet.disconnect}
                    className="rounded-lg border border-white/10 px-3 py-1.5 text-[12.5px] text-chalk-400 transition-colors hover:text-chalk-50"
                  >
                    Disconnect
                  </button>
                </>
              ) : (
                <button
                  onClick={wallet.connect}
                  disabled={wallet.connecting}
                  className="inline-flex items-center gap-2 rounded-lg amber-gradient px-3.5 py-2 text-[12.5px] font-semibold text-ink-950 disabled:opacity-60"
                >
                  {wallet.connecting ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Wallet className="size-3.5" />
                  )}
                  {wallet.available ? "Connect wallet" : "Get a wallet"}
                </button>
              )}
            </div>
          </div>

          {commitment && (
            <div className="mt-4 border-t border-white/[0.06] pt-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-chalk-500">
                Commitment
              </p>
              <p className="mt-1.5 break-all font-mono text-[12px] text-chalk-400">
                {commitment}
              </p>

              {registered === false && wallet.publicKey && (
                <p className="mt-2.5 text-[12.5px] text-chalk-500">
                  Not registered on chain yet.
                </p>
              )}
              {registered === true && !dirty && (
                <p className="mt-2.5 flex items-center gap-1.5 text-[12.5px] text-verified">
                  <Check className="size-3.5" /> Matches what is on chain.
                </p>
              )}
              {dirty && (
                <p className="mt-2.5 text-[12.5px] text-amber-brand">
                  The vault has changed since it was last published.
                </p>
              )}
            </div>
          )}

          {wallet.publicKey && (registered === false || dirty) && (
            <button
              onClick={publish}
              disabled={busy || filled === 0}
              className="mt-4 inline-flex h-9 items-center gap-2 rounded-[10px] amber-gradient px-4 text-[13px] font-semibold text-ink-950 disabled:opacity-50"
            >
              {busy && <Loader2 className="size-3.5 animate-spin" />}
              {registered ? "Publish the new fingerprint" : "Register this vault"}
            </button>
          )}

          {filled === 0 && wallet.publicKey && (
            <p className="mt-2.5 text-[12.5px] text-chalk-500">
              Fill at least one field before registering.
            </p>
          )}

          {signature && (
            <a
              href={explorer("tx", signature)}
              target="_blank"
              rel="noreferrer"
              className="mt-3 block font-mono text-[12px] text-verified underline-offset-4 hover:underline"
            >
              Confirmed · {shortAddress(signature, 8, 8)}
            </a>
          )}
          {error && <p className="mt-3 text-[12.5px] text-revoked">{error}</p>}
        </div>

        {/* ------------------------------ fields ----------------------------- */}

        <div className="mt-10 space-y-9">
          {GROUPS.map((group) => {
            const fields = VAULT_FIELDS.filter((f) => f.group === group.id);
            if (fields.length === 0) return null;

            return (
              <section key={group.id}>
                <div className="flex items-baseline gap-3">
                  <h2 className="text-[17px] font-semibold tracking-[-0.02em]">
                    {group.title}
                  </h2>
                  <p className="text-[12.5px] text-chalk-500">{group.note}</p>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {fields.map((field, i) => (
                    <motion.label
                      key={field.key}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.35, delay: i * 0.03, ease: [0.22, 1, 0.36, 1] }}
                      className="block rounded-xl border border-white/[0.08] bg-ink-900 p-3.5 transition-colors focus-within:border-amber-brand/40"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[12.5px] font-medium text-chalk-300">
                          {field.label}
                        </span>
                        <span
                          className={`text-[10.5px] uppercase tracking-wider ${
                            field.sensitivity === "high"
                              ? "text-amber-brand"
                              : "text-chalk-500"
                          }`}
                        >
                          {SENSITIVITY_COPY[field.sensitivity]}
                        </span>
                      </div>
                      <input
                        value={values[field.key] ?? ""}
                        onChange={(e) =>
                          setValues((v) => ({ ...v, [field.key]: e.target.value }))
                        }
                        placeholder="Leave blank to keep it out"
                        className="mt-2 w-full bg-transparent text-[14px] text-chalk-50 outline-none placeholder:text-chalk-500/60"
                      />
                    </motion.label>
                  ))}
                </div>
              </section>
            );
          })}
        </div>

        <p className="mt-10 text-[12.5px] leading-relaxed text-chalk-500">
          Clearing this browser&rsquo;s site data erases the vault and the salt.
          The fingerprint on chain will still be there, but nothing will match it
          again, so treat a fresh browser as a fresh vault and publish it anew.
        </p>
      </main>
      <Footer />
    </>
  );
}
