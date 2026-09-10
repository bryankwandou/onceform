"use client";

/*
  Consent receipts, read straight off the chain.

  Nothing here is served from a database of ours, which is the point: the record
  of what somebody disclosed belongs to them, and it stays readable even if this
  site disappears. Every row links to the same account on Explorer.
*/

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ExternalLink, Loader2, RotateCcw, Upload, Wallet } from "lucide-react";
import { Nav } from "@/components/site/nav";
import { Footer } from "@/components/site/footer";
import { useWallet } from "@/lib/wallet";
import {
  fetchReceipts,
  hashString,
  ixRecordConsent,
  ixRevokeConsent,
  profilePda,
  receiptPda,
  type DecodedReceipt,
} from "@/lib/chain";
import { VAULT_FIELDS, explorer, fieldsToMask, maskToFields, shortAddress } from "@/lib/utils";

/*
  What the extension released, waiting to be signed.

  The extension cannot write a receipt — that needs a wallet, and a service
  worker has no business holding a key. So it leaves the log here and the person
  decides, one entry at a time, which disclosures are worth putting on chain.
*/
const DISCLOSURE_KEY = "onceform:disclosures";
const RECORDED_KEY = "onceform:recorded";

type Disclosure = { origin: string; fields: string[]; at: number };

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function labelFor(key: string) {
  return VAULT_FIELDS.find((f) => f.key === key)?.label ?? key;
}

function when(seconds: number) {
  return new Date(seconds * 1000).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function ReceiptsPage() {
  const wallet = useWallet();
  const [receipts, setReceipts] = useState<DecodedReceipt[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [working, setWorking] = useState<string>("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState<Disclosure[]>([]);
  const [registered, setRegistered] = useState(true);

  /* The content script publishes the log after this page has already rendered,
     and again whenever a fill happens in another tab, so re-read rather than
     look once. */
  useEffect(() => {
    const refresh = () => {
      const recorded = new Set(readJson<number[]>(RECORDED_KEY, []));
      setPending(
        readJson<Disclosure[]>(DISCLOSURE_KEY, [])
          .filter((d) => d && !recorded.has(d.at))
          .sort((a, b) => b.at - a.at)
      );
    };
    refresh();
    const timer = window.setInterval(refresh, 1500);
    return () => window.clearInterval(timer);
  }, []);

  const load = useCallback(async () => {
    if (!wallet.publicKey) {
      setReceipts(null);
      return;
    }
    setLoading(true);
    setError("");
    try {
      /* A receipt hangs off the profile account, so without one the first
         signature fails for a reason the wallet will not explain. */
      const [profile] = profilePda(wallet.publicKey);
      setRegistered(Boolean(await wallet.connection.getAccountInfo(profile)));
      setReceipts(await fetchReceipts(wallet.connection, wallet.publicKey));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read the chain.");
    } finally {
      setLoading(false);
    }
  }, [wallet.publicKey, wallet.connection]);

  useEffect(() => {
    load();
  }, [load]);

  async function record(disclosure: Disclosure) {
    if (!wallet.publicKey) return;
    const id = String(disclosure.at);
    setWorking(id);
    setError("");
    try {
      await wallet.send([
        await ixRecordConsent(wallet.publicKey, {
          nonce: BigInt(disclosure.at),
          originHash: await hashString(disclosure.origin),
          fieldsMask: fieldsToMask(disclosure.fields),
          purposeHash: await hashString("form fill"),
        }),
      ]);

      /* Remember it locally so the entry stops being offered. The receipt
         itself is the chain's job; this is only about not asking twice. */
      const recorded = readJson<number[]>(RECORDED_KEY, []);
      localStorage.setItem(RECORDED_KEY, JSON.stringify([...recorded, disclosure.at]));
      setPending((current) => current.filter((d) => d.at !== disclosure.at));
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "The receipt did not go through.");
    } finally {
      setWorking("");
    }
  }

  async function revoke(receipt: DecodedReceipt) {
    if (!wallet.publicKey) return;
    const [pda] = receiptPda(wallet.publicKey, receipt.nonce);
    setWorking(pda.toBase58());
    setError("");
    try {
      await wallet.send([await ixRevokeConsent(wallet.publicKey, receipt.nonce)]);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "The withdrawal did not go through.");
    } finally {
      setWorking("");
    }
  }

  return (
    <>
      <Nav />
      <main id="content" className="mx-auto max-w-4xl px-5 pb-24 pt-28 sm:px-8">
        <header className="max-w-2xl">
          <h1 className="text-[34px] font-semibold leading-[1.1] tracking-[-0.03em] sm:text-[42px]">
            Consent receipts
          </h1>
          <p className="mt-3.5 text-[15px] leading-relaxed text-chalk-400">
            Every time you release fields to a site, the program writes a record
            in your name: which fields, to which origin, and when. You can
            withdraw any of them. The withdrawal is recorded too, so the history
            stays honest in both directions.
          </p>
        </header>

        {pending.length > 0 && (
          <section className="mt-10">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-[17px] font-semibold tracking-[-0.02em]">
                Released, not yet on chain
              </h2>
              <p className="text-[12.5px] text-chalk-500">
                From the extension. Each one costs a small devnet fee to record.
              </p>
            </div>

            <div className="mt-4 space-y-3">
              {pending.map((d) => {
                const id = String(d.at);
                return (
                  <article
                    key={id}
                    className="rounded-2xl border border-amber-brand/25 bg-ink-900 p-5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-[13px] text-chalk-500">{when(d.at / 1000)}</p>
                        <p className="mt-1 text-[15px] font-medium tracking-[-0.01em]">
                          {d.fields.length} field{d.fields.length === 1 ? "" : "s"} to{" "}
                          <span className="font-mono text-[13.5px]">{d.origin}</span>
                        </p>
                      </div>
                      <span className="rounded-full bg-amber-brand/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-amber-brand">
                        Unrecorded
                      </span>
                    </div>

                    <div className="mt-3.5 flex flex-wrap gap-1.5">
                      {d.fields.map((f) => (
                        <span
                          key={f}
                          className="rounded-md border border-white/[0.08] px-2 py-1 text-[11.5px] text-chalk-400"
                        >
                          {labelFor(f)}
                        </span>
                      ))}
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-white/[0.06] pt-3.5">
                      <p className="text-[12.5px] text-chalk-500">
                        {!wallet.publicKey
                          ? "Connect a wallet to sign this onto the chain."
                          : !registered
                            ? "Publish your vault first — a receipt hangs off your profile."
                            : "Nothing about this is on chain until you sign it."}
                      </p>
                      {!wallet.publicKey ? (
                        <button
                          onClick={wallet.connect}
                          disabled={wallet.connecting}
                          className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-[12.5px] text-chalk-400 transition-colors hover:border-amber-brand/40 hover:text-amber-brand disabled:opacity-50"
                        >
                          <Wallet className="size-3.5" />
                          {wallet.available ? "Connect wallet" : "Get a wallet"}
                        </button>
                      ) : !registered ? (
                        <a
                          href="/vault"
                          className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-[12.5px] text-chalk-400 transition-colors hover:border-amber-brand/40 hover:text-amber-brand"
                        >
                          Open your vault
                        </a>
                      ) : (
                        <button
                          onClick={() => record(d)}
                          disabled={working === id}
                          className="ml-auto inline-flex items-center gap-1.5 rounded-lg amber-gradient px-3 py-1.5 text-[12.5px] font-semibold text-ink-950 disabled:opacity-50"
                        >
                          {working === id ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <Upload className="size-3.5" />
                          )}
                          Write the receipt
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {!wallet.publicKey ? (
          <div className="mt-10 rounded-2xl border border-white/[0.08] bg-ink-900 p-8 text-center">
            <p className="text-[14px] text-chalk-400">
              Connect the wallet that holds your receipts.
            </p>
            <button
              onClick={wallet.connect}
              disabled={wallet.connecting}
              className="mt-4 inline-flex items-center gap-2 rounded-[10px] amber-gradient px-4 py-2.5 text-[13px] font-semibold text-ink-950 disabled:opacity-60"
            >
              {wallet.connecting ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Wallet className="size-3.5" />
              )}
              {wallet.available ? "Connect wallet" : "Get a wallet"}
            </button>
          </div>
        ) : loading ? (
          <div className="mt-10 flex items-center gap-2.5 text-[14px] text-chalk-500">
            <Loader2 className="size-4 animate-spin" /> Reading the chain…
          </div>
        ) : receipts && receipts.length > 0 ? (
          <div className="mt-10 space-y-3">
            {receipts.map((r, i) => {
              const [pda] = receiptPda(wallet.publicKey!, r.nonce);
              const address = pda.toBase58();
              const revoked = r.revokedAt !== 0;
              const fields = maskToFields(r.fieldsMask);

              return (
                <motion.article
                  key={address}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: i * 0.04, ease: [0.22, 1, 0.36, 1] }}
                  className={`rounded-2xl border p-5 ${
                    revoked
                      ? "border-white/[0.06] bg-ink-950 opacity-70"
                      : "border-white/[0.08] bg-ink-900"
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-[13px] text-chalk-500">{when(r.createdAt)}</p>
                      <p className="mt-1 text-[15px] font-medium tracking-[-0.01em]">
                        {fields.length} field{fields.length === 1 ? "" : "s"} released
                      </p>
                    </div>

                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider ${
                        revoked
                          ? "bg-revoked/10 text-revoked"
                          : "bg-verified/10 text-verified"
                      }`}
                    >
                      {revoked ? "Withdrawn" : "Standing"}
                    </span>
                  </div>

                  <div className="mt-3.5 flex flex-wrap gap-1.5">
                    {fields.map((f) => (
                      <span
                        key={f}
                        className="rounded-md border border-white/[0.08] px-2 py-1 text-[11.5px] text-chalk-400"
                      >
                        {f}
                      </span>
                    ))}
                  </div>

                  {revoked && (
                    <p className="mt-3 text-[12.5px] text-chalk-500">
                      Withdrawn {when(r.revokedAt)}.
                    </p>
                  )}

                  <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-white/[0.06] pt-3.5">
                    <a
                      href={explorer("address", address)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 font-mono text-[12px] text-chalk-500 transition-colors hover:text-amber-brand"
                    >
                      {shortAddress(address, 6, 6)}
                      <ExternalLink className="size-3" />
                    </a>

                    {!revoked && (
                      <button
                        onClick={() => revoke(r)}
                        disabled={working === address}
                        className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-[12.5px] text-chalk-400 transition-colors hover:border-revoked/40 hover:text-revoked disabled:opacity-50"
                      >
                        {working === address ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <RotateCcw className="size-3.5" />
                        )}
                        Withdraw consent
                      </button>
                    )}
                  </div>
                </motion.article>
              );
            })}
          </div>
        ) : (
          <div className="mt-10 rounded-2xl border border-white/[0.08] bg-ink-900 p-8 text-center">
            <p className="text-[14px] text-chalk-400">
              No receipts on this wallet yet.
            </p>
            <p className="mt-1.5 text-[13px] text-chalk-500">
              They appear here once you release fields to a site.
            </p>
          </div>
        )}

        {error && <p className="mt-5 text-[13px] text-revoked">{error}</p>}
      </main>
      <Footer />
    </>
  );
}
