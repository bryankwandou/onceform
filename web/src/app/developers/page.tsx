import type { Metadata } from "next";
import { Nav } from "@/components/site/nav";
import { Footer } from "@/components/site/footer";
import { Reveal } from "@/components/site/reveal";
import { PROGRAM_ID } from "@/lib/chain";
import { explorer } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Integration guide",
  description:
    "How a research panel screens respondents against Onceform attestations without collecting personal data.",
};

const INSTRUCTIONS = [
  ["init_profile", "Register a wallet with a commitment to the vault contents."],
  ["rotate_vault", "Replace the commitment when the vault changes."],
  ["issue_attestation", "Sign a claim about a subject, with an expiry."],
  ["revoke_attestation", "Withdraw a claim you issued."],
  ["record_consent", "Log which fields were released, to whom, for what."],
  ["revoke_consent", "Withdraw consent; the withdrawal stays on record."],
];

const SCHEMA_TABLE = [
  ["0", "UNIQUE_HUMAN", "The issuer has satisfied itself this is one distinct person."],
  ["1", "AGE_BAND", "Subject falls in a stated age bracket."],
  ["2", "COUNTRY", "Subject resides in a stated country."],
  ["3", "EMPLOYMENT", "Subject holds a stated role or works in a stated industry."],
];

function Code({ children }: { children: string }) {
  return (
    <pre className="mt-4 overflow-x-auto rounded-xl border border-white/[0.08] bg-ink-950 p-4">
      <code className="font-mono text-[12.5px] leading-relaxed text-chalk-300">
        {children}
      </code>
    </pre>
  );
}

export default function DevelopersPage() {
  return (
    <>
      <Nav />
      <main id="content" className="mx-auto max-w-3xl px-5 pb-24 pt-28 sm:px-8">
        <header>
          <h1 className="text-[34px] font-semibold leading-[1.1] tracking-[-0.03em] sm:text-[42px]">
            Integrating a panel
          </h1>
          <p className="mt-3.5 text-[15px] leading-relaxed text-chalk-400">
            Screening a respondent is two public reads and no personal data. You
            do not need an account with us, and there is no API key to rotate,
            because there is no API.
          </p>
        </header>

        <Reveal>
          <section className="mt-11">
            <h2 className="text-[17px] font-semibold tracking-[-0.02em]">The program</h2>
            <p className="mt-3 text-[14px] leading-relaxed text-chalk-400">
              One program, deployed to devnet. Every account it owns is a PDA
              derived from public inputs, so anything here can be reproduced
              without our help.
            </p>
            <a
              href={explorer("address", PROGRAM_ID)}
              target="_blank"
              rel="noreferrer"
              className="mt-3 block break-all font-mono text-[12.5px] text-amber-brand underline-offset-4 hover:underline"
            >
              {PROGRAM_ID}
            </a>

            <div className="mt-6 overflow-x-auto">
              <table className="w-full min-w-[520px] text-left">
                <tbody>
                  {INSTRUCTIONS.map(([name, note]) => (
                    <tr key={name} className="border-b border-white/[0.06]">
                      <td className="py-2.5 pr-5 align-top font-mono text-[12.5px] text-chalk-300">
                        {name}
                      </td>
                      <td className="py-2.5 text-[13px] text-chalk-400">{note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </Reveal>

        <Reveal>
          <section className="mt-11">
            <h2 className="text-[17px] font-semibold tracking-[-0.02em]">
              Deriving the accounts
            </h2>
            <Code>{`const [profile] = PublicKey.findProgramAddressSync(
  [Buffer.from("profile"), subject.toBuffer()],
  programId
);

const [attestation] = PublicKey.findProgramAddressSync(
  [Buffer.from("attestation"), issuer.toBuffer(), subject.toBuffer(), schemaLe],
  programId
);`}</Code>
          </section>
        </Reveal>

        <Reveal>
          <section className="mt-11">
            <h2 className="text-[17px] font-semibold tracking-[-0.02em]">
              Screening a respondent
            </h2>
            <p className="mt-3 text-[14px] leading-relaxed text-chalk-400">
              Fetch the attestations naming the wallet as subject, keep the ones
              from issuers you have decided to trust, and check they are neither
              expired nor revoked.
            </p>
            <Code>{`const accounts = await connection.getProgramAccounts(programId, {
  filters: [
    { dataSize: 131 },
    { memcmp: { offset: 40, bytes: subject.toBase58() } },
  ],
});

const now = Math.floor(Date.now() / 1000);

const usable = accounts
  .map(({ account }) => decodeAttestation(account.data))
  .filter((a) => TRUSTED_ISSUERS.has(a.issuer))
  .filter((a) => a.revokedAt === 0 && a.expiresAt > now);`}</Code>
            <p className="mt-4 text-[13.5px] leading-relaxed text-chalk-500">
              The program deliberately does not maintain a list of approved
              issuers. Anyone can sign a claim about anyone, exactly as anyone
              can write a reference letter, and it is worth what the reader
              thinks the signer is worth. Deciding that is your job, and burying
              it inside a contract would only hide the decision rather than
              remove it.
            </p>
          </section>
        </Reveal>

        <Reveal>
          <section className="mt-11">
            <h2 className="text-[17px] font-semibold tracking-[-0.02em]">Schemas</h2>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[560px] text-left">
                <thead>
                  <tr className="border-b border-white/[0.1]">
                    <th className="pb-2 pr-5 text-[11px] font-semibold uppercase tracking-wider text-chalk-500">
                      Id
                    </th>
                    <th className="pb-2 pr-5 text-[11px] font-semibold uppercase tracking-wider text-chalk-500">
                      Name
                    </th>
                    <th className="pb-2 text-[11px] font-semibold uppercase tracking-wider text-chalk-500">
                      Meaning
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {SCHEMA_TABLE.map(([id, name, meaning]) => (
                    <tr key={id} className="border-b border-white/[0.06]">
                      <td className="py-2.5 pr-5 font-mono text-[12.5px] text-amber-brand">
                        {id}
                      </td>
                      <td className="py-2.5 pr-5 font-mono text-[12.5px] text-chalk-300">
                        {name}
                      </td>
                      <td className="py-2.5 text-[13px] text-chalk-400">{meaning}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-4 text-[13.5px] leading-relaxed text-chalk-500">
              The claim itself is stored as a hash, so a schema tells you what
              kind of statement was made without publishing the statement. An
              issuer that wants a panel to check the underlying value shares it
              out of band; the hash on chain then proves it was not altered
              afterwards.
            </p>
          </section>
        </Reveal>
      </main>
      <Footer />
    </>
  );
}
