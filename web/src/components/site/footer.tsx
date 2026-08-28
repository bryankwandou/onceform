import Link from "next/link";
import { OnceformMark } from "@/components/brand/logo";
import { PROGRAM_ID } from "@/lib/chain";
import { explorer, shortAddress } from "@/lib/utils";

const COLUMNS = [
  {
    title: "Product",
    links: [
      { href: "/vault", label: "Identity vault" },
      { href: "/receipts", label: "Consent receipts" },
      { href: "/verify", label: "Verify a person" },
      { href: "/extension", label: "Browser extension" },
    ],
  },
  {
    title: "Builders",
    links: [
      { href: "/developers", label: "Integration guide" },
      { href: "/#proof", label: "On-chain records" },
      { href: "https://github.com/bryankwandou/onceform", label: "Source code" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/#panels", label: "For research panels" },
      { href: "/privacy", label: "How we handle data" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-white/[0.07] bg-ink-950">
      <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8">
        <div className="grid gap-10 md:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div>
            <div className="flex items-center gap-2.5">
              <OnceformMark size={26} idPrefix="footer" />
              <span className="text-[15px] font-semibold tracking-[-0.02em]">Onceform</span>
            </div>
            <p className="mt-3 max-w-xs text-[13px] leading-relaxed text-chalk-500">
              Answer a form once. Prove what matters. Keep the rest to yourself,
              and take it back whenever you want.
            </p>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title}>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-chalk-500">
                {col.title}
              </p>
              <ul className="mt-3.5 space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-[13px] text-chalk-400 transition-colors hover:text-chalk-50"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="rule my-10" />

        <div className="flex flex-col gap-3 text-[12px] text-chalk-500 sm:flex-row sm:items-center sm:justify-between">
          <p>Built for the Colosseum Eternal challenge. Running on Solana devnet.</p>
          <a
            href={explorer("address", PROGRAM_ID)}
            target="_blank"
            rel="noreferrer"
            className="font-mono transition-colors hover:text-amber-brand"
          >
            program {shortAddress(PROGRAM_ID, 6, 6)}
          </a>
        </div>
      </div>
    </footer>
  );
}
