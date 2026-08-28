"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { SaySoLogo } from "@/components/brand/logo";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/#how", label: "How it works" },
  { href: "/#proof", label: "On-chain proof" },
  { href: "/#panels", label: "For panels" },
  { href: "/vault", label: "Vault" },
];

export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-300",
        scrolled
          ? "border-b border-white/[0.07] bg-ink-950/80 backdrop-blur-xl"
          : "border-b border-transparent"
      )}
    >
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
        <Link href="/" className="shrink-0" aria-label="SaySo home">
          <SaySoLogo size={26} />
        </Link>

        <div className="hidden items-center gap-7 md:flex">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-[13.5px] text-chalk-400 transition-colors hover:text-chalk-50"
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <Link
            href="/developers"
            className="text-[13.5px] text-chalk-400 transition-colors hover:text-chalk-50"
          >
            Developers
          </Link>
          <Link
            href="/vault"
            className="inline-flex h-9 items-center rounded-[10px] amber-gradient px-4 text-[13px] font-semibold text-ink-950 transition-transform duration-200 hover:scale-[1.03] active:scale-[0.98]"
          >
            Open the vault
          </Link>
        </div>

        <button
          onClick={() => setOpen((v) => !v)}
          className="grid size-9 place-items-center rounded-lg border border-white/10 text-chalk-300 md:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
        >
          {open ? <X className="size-4.5" /> : <Menu className="size-4.5" />}
        </button>
      </nav>

      {open && (
        <div className="border-t border-white/[0.07] bg-ink-950/95 px-5 py-4 backdrop-blur-xl md:hidden">
          <div className="flex flex-col gap-1">
            {[...LINKS, { href: "/developers", label: "Developers" }].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-2 py-2.5 text-sm text-chalk-300 transition-colors hover:bg-white/5 hover:text-chalk-50"
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/vault"
              onClick={() => setOpen(false)}
              className="mt-2 inline-flex h-10 items-center justify-center rounded-[10px] amber-gradient text-[13px] font-semibold text-ink-950"
            >
              Open the vault
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
