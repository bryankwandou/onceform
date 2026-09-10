"use client";

/*
  The panel's side of the product.

  Paste a wallet, see what has been attested about it and by whom. No account,
  no API key, no call to us — everything on this page is a public read against
  devnet, which is the honest demonstration that the claim survives without our
  servers.
*/

import { useState } from "react";
import { motion } from "framer-motion";
import { PublicKey } from "@solana/web3.js";
import { ExternalLink, Loader2, Search } from "lucide-react";
import { Nav } from "@/components/site/nav";
import { Footer } from "@/components/site/footer";
import {
  fetchAttestations,
  getConnection,
  profilePda,
  type DecodedAttestation,
} from "@/lib/chain";
import { SCHEMAS, explorer, shortAddress } from "@/lib/utils";

const SCHEMA_NAMES: Record<number, string> = Object.fromEntries(
  Object.entries(SCHEMAS).map(([name, id]) => [
    id as number,
    name
      .toLowerCase()
      .split("_")
      .join(" ")
      .replace(/^./, (c) => c.toUpperCase()),
  ])
);

type Result = {
  address: string;
  registered: boolean;
  attestations: DecodedAttestation[];
  /* Fixed at lookup rather than read during render: a clock read while
     rendering makes the server and the browser disagree about what has
     expired. */
  checkedAt: number;
};

function when(seconds: number) {
  return new Date(seconds * 1000).toLocaleDateString(undefined, { dateStyle: "medium" });
}

export default function VerifyPage() {
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result | null>(null);

  async function lookup(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setResult(null);

    let key: PublicKey;
    try {
      key = new PublicKey(input.trim());
    } catch {
      setError("That is not a Solana address.");
      return;
    }

    setBusy(true);
    try {
      const connection = getConnection();
      const [pda] = profilePda(key);
      const [profile, attestations] = await Promise.all([
        connection.getAccountInfo(pda),
        fetchAttestations(connection, key),
      ]);
      setResult({
        address: key.toBase58(),
        registered: Boolean(profile),
        attestations,
        checkedAt: Math.floor(Date.now() / 1000),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reach the network.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Nav />
      <main id="content" className="mx-auto max-w-3xl px-5 pb-24 pt-28 sm:px-8">
        <header>
          <h1 className="text-[34px] font-semibold leading-[1.1] tracking-[-0.03em] sm:text-[42px]">
            Check a respondent
          </h1>
          <p className="mt-3.5 text-[15px] leading-relaxed text-chalk-400">
            Paste a wallet address to see what has been attested about it, who
            said so, and whether it still stands. You will not see a name, an
            email, or anything else the person holds — only whether the claims
            you care about hold up.
          </p>
        </header>

        <form onSubmit={lookup} className="mt-8 flex gap-2.5">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Wallet address"
            spellCheck={false}
            className="h-11 flex-1 rounded-xl border border-white/[0.08] bg-ink-900 px-4 font-mono text-[13px] text-chalk-50 outline-none transition-colors focus:border-amber-brand/40 placeholder:font-sans placeholder:text-chalk-500/70"
          />
          <button
            type="submit"
            disabled={busy || !input.trim()}
            className="inline-flex h-11 items-center gap-2 rounded-xl amber-gradient px-5 text-[13px] font-semibold text-ink-950 disabled:opacity-50"
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
            Look up
          </button>
        </form>

        {error && <p className="mt-4 text-[13px] text-revoked">{error}</p>}

        {result && (
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="mt-8"
          >
            <div className="rounded-2xl border border-white/[0.08] bg-ink-900 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <a
                  href={explorer("address", result.address)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 font-mono text-[13px] text-chalk-300 transition-colors hover:text-amber-brand"
                >
                  {shortAddress(result.address, 6, 6)}
                  <ExternalLink className="size-3" />
                </a>
                <span
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider ${
                    result.registered
                      ? "bg-verified/10 text-verified"
                      : "bg-white/[0.06] text-chalk-500"
                  }`}
                >
                  {result.registered ? "Vault registered" : "No vault"}
                </span>
              </div>

              {!result.registered && (
                <p className="mt-3 text-[13px] leading-relaxed text-chalk-500">
                  This wallet has never registered a vault. That is not proof of
                  anything on its own — but a respondent who has one has at
                  least committed to a fixed set of answers they cannot quietly
                  rewrite later.
                </p>
              )}
            </div>

            <h2 className="mt-8 text-[17px] font-semibold tracking-[-0.02em]">
              Attestations
            </h2>

            {result.attestations.length === 0 ? (
              <p className="mt-3 text-[13.5px] leading-relaxed text-chalk-500">
                Nobody has attested anything about this wallet. Treat it exactly
                as you would treat an anonymous respondent, because that is what
                it is.
              </p>
            ) : (
              <div className="mt-4 space-y-2.5">
                {result.attestations.map((a, i) => {
                  const expired = a.expiresAt !== 0 && a.expiresAt < result.checkedAt;
                  const revoked = a.revokedAt !== 0;
                  const live = !expired && !revoked;

                  return (
                    <motion.div
                      key={`${a.issuer}-${a.schema}`}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.35, delay: i * 0.04 }}
                      className="rounded-xl border border-white/[0.08] bg-ink-900 p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2.5">
                        <span className="text-[14px] font-medium tracking-[-0.01em]">
                          {SCHEMA_NAMES[a.schema] ?? `Schema ${a.schema}`}
                        </span>
                        <span
                          className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider ${
                            live
                              ? "bg-verified/10 text-verified"
                              : "bg-revoked/10 text-revoked"
                          }`}
                        >
                          {revoked ? "Revoked" : expired ? "Expired" : "Valid"}
                        </span>
                      </div>

                      <dl className="mt-3 grid gap-1.5 text-[12.5px] sm:grid-cols-2">
                        <div className="flex gap-2">
                          <dt className="text-chalk-500">Issued by</dt>
                          <dd>
                            <a
                              href={explorer("address", a.issuer)}
                              target="_blank"
                              rel="noreferrer"
                              className="font-mono text-chalk-400 transition-colors hover:text-amber-brand"
                            >
                              {shortAddress(a.issuer, 4, 4)}
                            </a>
                          </dd>
                        </div>
                        <div className="flex gap-2">
                          <dt className="text-chalk-500">Issued</dt>
                          <dd className="text-chalk-400">{when(a.issuedAt)}</dd>
                        </div>
                        <div className="flex gap-2">
                          <dt className="text-chalk-500">Expires</dt>
                          <dd className="text-chalk-400">{when(a.expiresAt)}</dd>
                        </div>
                      </dl>
                    </motion.div>
                  );
                })}
              </div>
            )}

            <p className="mt-8 text-[12.5px] leading-relaxed text-chalk-500">
              An attestation is only worth as much as the wallet that signed it.
              The program does not decide who is allowed to issue one, on
              purpose — deciding which issuers you trust is your judgement to
              make, not something to be quietly settled inside a contract.
            </p>
          </motion.section>
        )}
      </main>
      <Footer />
    </>
  );
}
