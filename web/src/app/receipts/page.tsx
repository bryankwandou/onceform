"use client";

/*
  Consent receipts, read straight off the chain.

  Nothing here is served from a database of ours, which is the point: the record
  of what somebody disclosed belongs to them, and it stays readable even if this
  site disappears. Every row links to the same account on Explorer.
*/

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ExternalLink, Loader2, RotateCcw, Wallet } from "lucide-react";
import { Nav } from "@/components/site/nav";
import { Footer } from "@/components/site/footer";
import { useWallet } from "@/lib/wallet";
import { fetchReceipts, ixRevokeConsent, receiptPda, type DecodedReceipt } from "@/lib/chain";
import { explorer, maskToFields, shortAddress } from "@/lib/utils";

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

  const load = useCallback(async () => {
    if (!wallet.publicKey) {
      setReceipts(null);
      return;
    }
    setLoading(true);
    setError("");
    try {
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
