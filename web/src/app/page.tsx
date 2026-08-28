import Link from "next/link";
import {
  ArrowRight,
  Ban,
  Building2,
  Clock3,
  FileCheck2,
  Fingerprint,
  KeyRound,
  Layers,
  Radar,
  Wallet,
} from "lucide-react";
import { Nav } from "@/components/site/nav";
import { Footer } from "@/components/site/footer";
import { Reveal, RevealGroup, RevealItem } from "@/components/site/reveal";
import { FillDemo } from "@/components/demo/fill-demo";
import { PROGRAM_ID } from "@/lib/chain";
import { explorer, shortAddress } from "@/lib/utils";

const STEPS = [
  {
    icon: KeyRound,
    title: "Fill the vault once",
    body: "Seventeen fields, most of them optional. The vault is encrypted with a key derived from your wallet and stored on your own device. What reaches the chain is a hash of it, nothing more.",
  },
  {
    icon: Fingerprint,
    title: "Collect attestations",
    body: "An issuer checks something once — that you are a unique person, that you live where you say, that you work in the industry you claim — and signs it against your wallet. You never repeat that check for another site.",
  },
  {
    icon: FileCheck2,
    title: "Answer, and keep the receipt",
    body: "Onceform shows exactly which fields a form is asking for before anything moves. Approve, trim the list, or refuse. Whatever you release leaves a receipt in your name that you can withdraw later.",
  },
];

const PANEL_POINTS = [
  {
    icon: Ban,
    title: "Fraud stops at the door",
    body: "A respondent either holds a uniqueness attestation from an issuer you trust, or they do not. Duplicates and click farms fail the check before they consume a single quota slot.",
  },
  {
    icon: Radar,
    title: "Screen without collecting",
    body: "Check that someone falls inside a quota — age band, market, seniority — by verifying an attestation rather than gathering the underlying detail. Data you never held is data you never have to defend.",
  },
  {
    icon: Clock3,
    title: "Pay in seconds, not quarters",
    body: "Incentives settle to the respondent's wallet the moment a response clears. No points ledger, no thirty day gift card cycle, no support queue asking where the reward went.",
  },
  {
    icon: FileCheck2,
    title: "Consent you can actually produce",
    body: "Article 7 asks you to demonstrate that consent was given. A receipt signed by the respondent and timestamped independently of your own systems is a stronger answer than a row in your database.",
  },
];

const FAQ = [
  {
    q: "Where does my personal data actually live?",
    a: "On your device, encrypted. The program on Solana stores a 32-byte hash of your vault and nothing else. Someone reading the entire chain learns that a wallet has a vault and how many forms it has answered. They do not learn your name, your address, or a single field inside it.",
  },
  {
    q: "What stops a site from asking for everything?",
    a: "Nothing stops them asking. Onceform shows you the full request before a value moves and lets you untick anything you would rather keep. Sites that habitually over-ask become visible, because the request itself is part of the receipt.",
  },
  {
    q: "Is this a tool for getting through surveys I should not be taking?",
    a: "No, and the design works against that. Onceform answers with your real details from your own vault. The attestation layer exists specifically so panels can tell one genuine person from a hundred fake ones, which is the opposite of what a farming tool does.",
  },
  {
    q: "Which browsers can run the extension?",
    a: "Chrome, Edge, Brave, Arc and anything else built on Chromium, plus Firefox. On mobile the honest answer is Firefox for Android and a small number of Chromium forks — Chrome on Android and iOS does not load extensions at all, so the web vault covers phones instead.",
  },
  {
    q: "What happens when I withdraw consent?",
    a: "A revocation is written against the original receipt. The grant stays readable, because pretending it never happened would defeat the point of a record. Anyone verifying that receipt afterwards sees an explicit withdrawal rather than a missing account.",
  },
];

export default function Home() {
  return (
    <>
      <Nav />
      <main id="main">
        {/* ------------------------------ hero ------------------------------ */}
        <section className="relative overflow-hidden pt-32 pb-20 sm:pt-40 sm:pb-28">
          <div className="grid-field pointer-events-none absolute inset-0" aria-hidden />
          <div
            className="pointer-events-none absolute left-1/2 top-0 h-[420px] w-[720px] -translate-x-1/2 rounded-full opacity-[0.13] blur-[120px]"
            style={{ background: "radial-gradient(circle, #F5B13D, transparent 70%)" }}
            aria-hidden
          />

          <div className="relative mx-auto grid max-w-6xl gap-14 px-5 sm:px-8 lg:grid-cols-[1.05fr_auto] lg:items-center lg:gap-10">
            <div>
              <Reveal>
                <Link
                  href="#proof"
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] py-1.5 pl-2 pr-3.5 text-[12.5px] text-chalk-400 transition-colors hover:border-amber-brand/30 hover:text-chalk-200"
                >
                  <span className="rounded-full bg-verified/15 px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide text-verified">
                    Live
                  </span>
                  Consent receipts running on Solana devnet
                  <ArrowRight className="size-3.5" aria-hidden />
                </Link>
              </Reveal>

              <Reveal delay={0.05}>
                <h1 className="mt-6 max-w-xl text-[2.6rem] font-semibold leading-[1.05] tracking-[-0.035em] text-gradient sm:text-[3.4rem]">
                  Fill any form in one click. Hand over almost nothing.
                </h1>
              </Reveal>

              <Reveal delay={0.1}>
                <p className="mt-5 max-w-lg text-[15.5px] leading-relaxed text-chalk-400">
                  Your details sit in a vault on your own device. Onceform releases
                  only the fields a site genuinely needs, proves the rest with an
                  attestation instead of a disclosure, and leaves you a receipt
                  you can tear up whenever you like.
                </p>
              </Reveal>

              <Reveal delay={0.15}>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Link
                    href="/vault"
                    className="group inline-flex h-11 items-center justify-center gap-2 rounded-[10px] amber-gradient px-6 text-[14px] font-semibold text-ink-950 transition-transform duration-200 hover:scale-[1.02] active:scale-[0.99]"
                  >
                    Set up your vault
                    <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden />
                  </Link>
                  <Link
                    href="/extension"
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-[10px] border border-white/12 bg-white/[0.03] px-6 text-[14px] font-medium text-chalk-200 transition-colors hover:bg-white/[0.07]"
                  >
                    Get the extension
                  </Link>
                </div>
              </Reveal>

              <Reveal delay={0.2}>
                <p className="mt-6 text-[12.5px] text-chalk-500">
                  No account. No email. Your wallet is the login.
                </p>
              </Reveal>
            </div>

            <Reveal delay={0.12} className="flex justify-center lg:justify-end">
              <FillDemo />
            </Reveal>
          </div>
        </section>

        {/* ---------------------------- the problem -------------------------- */}
        <section className="border-y border-white/[0.07] bg-ink-900/40 py-20 sm:py-24">
          <div className="mx-auto max-w-6xl px-5 sm:px-8">
            <Reveal>
              <p className="text-[11.5px] font-semibold uppercase tracking-wider text-amber-brand">
                Two problems, one shape
              </p>
              <h2 className="mt-3 max-w-2xl text-[2rem] font-semibold leading-[1.15] tracking-[-0.03em] sm:text-[2.4rem]">
                People retype their lives. Panels drown in fake people.
              </h2>
            </Reveal>

            <RevealGroup className="mt-12 grid gap-6 md:grid-cols-2">
              <RevealItem>
                <article className="h-full rounded-2xl border border-white/[0.08] bg-ink-850 p-7">
                  <h3 className="text-[17px] font-semibold text-chalk-50">
                    On one side of the form
                  </h3>
                  <p className="mt-3 text-[14px] leading-relaxed text-chalk-400">
                    The same twelve answers, typed again, for the fortieth time
                    this year. Every one of them lands in a different company&apos;s
                    database, under terms nobody read, with no realistic way to
                    ask for any of it back.
                  </p>
                  <p className="mt-4 text-[14px] leading-relaxed text-chalk-400">
                    Browser autofill handles a name and a postcode. It has no
                    answer for age bands, income brackets, or the question of
                    whether this particular site deserved to know.
                  </p>
                </article>
              </RevealItem>

              <RevealItem>
                <article className="h-full rounded-2xl border border-white/[0.08] bg-ink-850 p-7">
                  <h3 className="text-[17px] font-semibold text-chalk-50">
                    On the other side
                  </h3>
                  <p className="mt-3 text-[14px] leading-relaxed text-chalk-400">
                    Research panels pay for responses and receive a mixture of
                    real participants, people running six accounts, and scripts.
                    Screening harder means collecting more personal data, which
                    creates a liability that grows with every regulation.
                  </p>
                  <p className="mt-4 text-[14px] leading-relaxed text-chalk-400">
                    Competing panels will never pool their respondent lists to
                    catch the overlap. That refusal is not stubbornness — it is
                    their entire commercial position.
                  </p>
                </article>
              </RevealItem>
            </RevealGroup>

            <Reveal delay={0.1}>
              <div className="mt-6 rounded-2xl border border-amber-brand/20 bg-amber-brand/[0.04] p-7">
                <p className="text-[15px] leading-relaxed text-chalk-200">
                  Both sides want the same thing and cannot get it from each
                  other: a way to confirm something true about a person without
                  moving the underlying facts around. That is the gap Onceform
                  fills, and it is the reason there is a ledger involved rather
                  than a database.
                </p>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ---------------------------- how it works ------------------------- */}
        <section id="how" className="scroll-mt-20 py-20 sm:py-28">
          <div className="mx-auto max-w-6xl px-5 sm:px-8">
            <Reveal>
              <p className="text-[11.5px] font-semibold uppercase tracking-wider text-amber-brand">
                How it works
              </p>
              <h2 className="mt-3 max-w-2xl text-[2rem] font-semibold leading-[1.15] tracking-[-0.03em] sm:text-[2.4rem]">
                Three steps, and you only do the first one once.
              </h2>
            </Reveal>

            <RevealGroup className="mt-12 grid gap-5 md:grid-cols-3">
              {STEPS.map((step, i) => (
                <RevealItem key={step.title}>
                  <article className="group h-full rounded-2xl border border-white/[0.08] bg-ink-850 p-7 transition-colors duration-300 hover:border-amber-brand/25">
                    <div className="flex items-center justify-between">
                      <div className="grid size-10 place-items-center rounded-xl bg-amber-brand/12 transition-colors duration-300 group-hover:bg-amber-brand/20">
                        <step.icon className="size-5 text-amber-brand" aria-hidden />
                      </div>
                      <span className="tnum font-mono text-[12px] text-chalk-500">
                        0{i + 1}
                      </span>
                    </div>
                    <h3 className="mt-5 text-[17px] font-semibold text-chalk-50">
                      {step.title}
                    </h3>
                    <p className="mt-2.5 text-[13.5px] leading-relaxed text-chalk-400">
                      {step.body}
                    </p>
                  </article>
                </RevealItem>
              ))}
            </RevealGroup>
          </div>
        </section>

        {/* --------------------------- on-chain proof ------------------------ */}
        <section
          id="proof"
          className="scroll-mt-20 border-y border-white/[0.07] bg-ink-900/40 py-20 sm:py-24"
        >
          <div className="mx-auto max-w-6xl px-5 sm:px-8">
            <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
              <Reveal>
                <p className="text-[11.5px] font-semibold uppercase tracking-wider text-amber-brand">
                  Why a ledger
                </p>
                <h2 className="mt-3 text-[2rem] font-semibold leading-[1.15] tracking-[-0.03em] sm:text-[2.4rem]">
                  The part a private database cannot do.
                </h2>
                <p className="mt-5 text-[14.5px] leading-relaxed text-chalk-400">
                  Almost everything in Onceform could run on a normal server, and
                  where that is true, it does. Four things could not, and each of
                  them is the reason a specific piece of state sits on Solana
                  instead.
                </p>

                <ul className="mt-7 space-y-4">
                  {[
                    {
                      icon: Layers,
                      t: "Trust across parties that distrust each other",
                      d: "Rival panels will not read from one company's respondent table. They will read from a ledger none of them controls.",
                    },
                    {
                      icon: Wallet,
                      t: "A record the issuer cannot quietly edit",
                      d: "A consent grant that the collecting party can rewrite is not evidence of anything. Withdrawal has to be as durable as the grant.",
                    },
                    {
                      icon: Fingerprint,
                      t: "One person, one slot, across every site",
                      d: "Uniqueness only means something if it holds outside the system that issued it.",
                    },
                    {
                      icon: Clock3,
                      t: "Payouts worth less than the fee to send them",
                      d: "A forty cent incentive is not worth a card rail. On Solana it costs a fraction of a cent and lands immediately.",
                    },
                  ].map((row) => (
                    <li key={row.t} className="flex gap-3.5">
                      <div className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-white/[0.05]">
                        <row.icon className="size-4 text-amber-brand" aria-hidden />
                      </div>
                      <div>
                        <p className="text-[14px] font-medium text-chalk-100">{row.t}</p>
                        <p className="mt-1 text-[13px] leading-relaxed text-chalk-500">
                          {row.d}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </Reveal>

              <Reveal delay={0.1}>
                <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-ink-950">
                  <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-3">
                    <p className="text-[12.5px] font-medium text-chalk-300">
                      onceform_registry
                    </p>
                    <span className="rounded-full bg-verified/12 px-2.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide text-verified">
                      devnet
                    </span>
                  </div>
                  <div className="space-y-3.5 p-5 font-mono text-[12px]">
                    {[
                      ["program", shortAddress(PROGRAM_ID, 8, 8)],
                      ["accounts", "Profile · Attestation · ConsentReceipt"],
                      ["instructions", "6"],
                      ["personal data stored", "none"],
                    ].map(([k, v]) => (
                      <div key={k} className="flex items-start justify-between gap-4">
                        <span className="text-chalk-500">{k}</span>
                        <span className="text-right text-chalk-200">{v}</span>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-white/[0.07] p-5">
                    <a
                      href={explorer("address", PROGRAM_ID)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 text-[13px] font-medium text-amber-brand transition-opacity hover:opacity-80"
                    >
                      Open it on Solana Explorer
                      <ArrowRight className="size-3.5" aria-hidden />
                    </a>
                  </div>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* ------------------------------ panels ---------------------------- */}
        <section id="panels" className="scroll-mt-20 py-20 sm:py-28">
          <div className="mx-auto max-w-6xl px-5 sm:px-8">
            <Reveal>
              <div className="flex items-center gap-2">
                <Building2 className="size-4 text-amber-brand" aria-hidden />
                <p className="text-[11.5px] font-semibold uppercase tracking-wider text-amber-brand">
                  For research panels
                </p>
              </div>
              <h2 className="mt-3 max-w-2xl text-[2rem] font-semibold leading-[1.15] tracking-[-0.03em] sm:text-[2.4rem]">
                Buy verified respondents, not cleaned-up guesses.
              </h2>
              <p className="mt-5 max-w-2xl text-[14.5px] leading-relaxed text-chalk-400">
                Consumers do not pay for autofill, and they should not have to.
                The side with the budget is the side currently paying for
                responses it later throws away.
              </p>
            </Reveal>

            <RevealGroup className="mt-12 grid gap-5 sm:grid-cols-2">
              {PANEL_POINTS.map((point) => (
                <RevealItem key={point.title}>
                  <article className="h-full rounded-2xl border border-white/[0.08] bg-ink-850 p-7">
                    <div className="grid size-10 place-items-center rounded-xl bg-white/[0.05]">
                      <point.icon className="size-5 text-amber-brand" aria-hidden />
                    </div>
                    <h3 className="mt-5 text-[16.5px] font-semibold text-chalk-50">
                      {point.title}
                    </h3>
                    <p className="mt-2.5 text-[13.5px] leading-relaxed text-chalk-400">
                      {point.body}
                    </p>
                  </article>
                </RevealItem>
              ))}
            </RevealGroup>

            <Reveal delay={0.1}>
              <div className="mt-8 flex flex-col items-start gap-4 rounded-2xl border border-white/[0.08] bg-ink-850 p-7 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[15px] font-medium text-chalk-100">
                    Integrating takes one endpoint and a verification call.
                  </p>
                  <p className="mt-1 text-[13.5px] text-chalk-500">
                    Drop in the request widget, read the attestation, settle the
                    incentive.
                  </p>
                </div>
                <Link
                  href="/developers"
                  className="inline-flex h-10 shrink-0 items-center gap-2 rounded-[10px] border border-white/12 bg-white/[0.04] px-5 text-[13.5px] font-medium text-chalk-100 transition-colors hover:bg-white/[0.08]"
                >
                  Read the integration guide
                  <ArrowRight className="size-3.5" aria-hidden />
                </Link>
              </div>
            </Reveal>
          </div>
        </section>

        {/* -------------------------------- faq ----------------------------- */}
        <section className="border-t border-white/[0.07] bg-ink-900/40 py-20 sm:py-24">
          <div className="mx-auto max-w-3xl px-5 sm:px-8">
            <Reveal>
              <h2 className="text-[2rem] font-semibold leading-[1.15] tracking-[-0.03em] sm:text-[2.2rem]">
                Straight answers
              </h2>
            </Reveal>

            <RevealGroup className="mt-10 space-y-3">
              {FAQ.map((item) => (
                <RevealItem key={item.q}>
                  <details className="group rounded-xl border border-white/[0.08] bg-ink-850 px-5 open:border-amber-brand/20">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4.5 text-[14.5px] font-medium text-chalk-100 marker:hidden">
                      {item.q}
                      <span className="grid size-5 shrink-0 place-items-center rounded-full border border-white/15 text-chalk-400 transition-transform duration-300 group-open:rotate-45">
                        +
                      </span>
                    </summary>
                    <p className="pb-5 pr-8 text-[13.5px] leading-relaxed text-chalk-400">
                      {item.a}
                    </p>
                  </details>
                </RevealItem>
              ))}
            </RevealGroup>
          </div>
        </section>

        {/* ------------------------------- close ---------------------------- */}
        <section className="relative overflow-hidden py-24 sm:py-32">
          <div
            className="pointer-events-none absolute left-1/2 top-1/2 h-[300px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-[0.12] blur-[110px]"
            style={{ background: "radial-gradient(circle, #F5B13D, transparent 70%)" }}
            aria-hidden
          />
          <div className="relative mx-auto max-w-2xl px-5 text-center sm:px-8">
            <Reveal>
              <h2 className="text-[2.1rem] font-semibold leading-[1.12] tracking-[-0.03em] sm:text-[2.6rem]">
                Set it up once. Stop repeating yourself.
              </h2>
              <p className="mx-auto mt-5 max-w-lg text-[15px] leading-relaxed text-chalk-400">
                The vault takes about two minutes to fill in. After that, every
                form you meet is a single decision instead of a chore.
              </p>
              <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
                <Link
                  href="/vault"
                  className="group inline-flex h-11 items-center justify-center gap-2 rounded-[10px] amber-gradient px-7 text-[14px] font-semibold text-ink-950 transition-transform duration-200 hover:scale-[1.02] active:scale-[0.99]"
                >
                  Set up your vault
                  <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden />
                </Link>
                <Link
                  href="/verify"
                  className="inline-flex h-11 items-center justify-center rounded-[10px] border border-white/12 bg-white/[0.03] px-7 text-[14px] font-medium text-chalk-200 transition-colors hover:bg-white/[0.07]"
                >
                  Verify someone
                </Link>
              </div>
            </Reveal>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
