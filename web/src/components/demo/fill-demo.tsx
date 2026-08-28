"use client";

/*
  The hero demo.

  This is the whole product compressed into one card: a form arrives, Onceform
  proposes exactly which fields it wants to release, the person approves or
  trims that list, the fields fill, and a receipt drops out the bottom.

  It runs entirely client side on canned data. Nothing here talks to the chain —
  the live version of this flow lives at /vault. What it has to get right is the
  sequencing, because the ordering *is* the argument: consent is asked for
  before anything is disclosed, never after.
*/

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, ChevronRight, Lock, RotateCcw, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

type Field = {
  key: string;
  label: string;
  value: string;
  /** Fields the person is unlikely to want to hand over by default. */
  guarded?: boolean;
};

const REQUESTED: Field[] = [
  { key: "fullName", label: "Full name", value: "Bryan Kwandou" },
  { key: "email", label: "Work email", value: "bryan@onceform.id" },
  { key: "country", label: "Country", value: "Indonesia" },
  { key: "ageBand", label: "Age band", value: "25 – 34" },
  { key: "industry", label: "Industry", value: "Software" },
  { key: "incomeBand", label: "Income band", value: "Prefer not to say", guarded: true },
];

type Phase = "idle" | "consent" | "filling" | "done";

export function FillDemo() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [granted, setGranted] = useState<string[]>(
    REQUESTED.filter((f) => !f.guarded).map((f) => f.key)
  );
  const [filled, setFilled] = useState<string[]>([]);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const reduced = useReducedMotion();

  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);

  useEffect(() => clearTimers, [clearTimers]);

  const toggle = (key: string) =>
    setGranted((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );

  const approve = () => {
    setPhase("filling");
    const order = REQUESTED.filter((f) => granted.includes(f.key));
    const step = reduced ? 0 : 180;

    order.forEach((field, i) => {
      timers.current.push(
        setTimeout(() => setFilled((prev) => [...prev, field.key]), i * step)
      );
    });
    timers.current.push(
      setTimeout(() => setPhase("done"), order.length * step + 320)
    );
  };

  const reset = () => {
    clearTimers();
    setPhase("idle");
    setFilled([]);
    setGranted(REQUESTED.filter((f) => !f.guarded).map((f) => f.key));
  };

  const releasedCount = granted.length;
  const withheldCount = REQUESTED.length - granted.length;

  return (
    <div className="relative w-full max-w-md">
      {/* The pretend third-party questionnaire. */}
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-ink-850 shadow-lift">
        <div className="flex items-center gap-2 border-b border-white/[0.07] bg-ink-800/60 px-4 py-3">
          <div className="flex gap-1.5">
            <span className="size-2.5 rounded-full bg-white/15" />
            <span className="size-2.5 rounded-full bg-white/15" />
            <span className="size-2.5 rounded-full bg-white/15" />
          </div>
          <div className="ml-2 flex-1 truncate rounded-md bg-ink-900 px-2.5 py-1 font-mono text-[11px] text-chalk-500">
            research-panel.example.com/screener
          </div>
        </div>

        <div className="space-y-3.5 p-5">
          <div className="mb-1">
            <p className="text-[13px] font-medium text-chalk-200">
              Participant screener
            </p>
            <p className="mt-0.5 text-[11.5px] text-chalk-500">
              Six questions. Takes most people four minutes.
            </p>
          </div>

          {REQUESTED.map((field) => {
            const isFilled = filled.includes(field.key);
            const isWithheld = phase !== "idle" && !granted.includes(field.key);

            return (
              <div key={field.key} className="space-y-1.5">
                <label className="block text-[11px] font-medium uppercase tracking-wide text-chalk-500">
                  {field.label}
                </label>
                <div
                  className={cn(
                    "relative flex h-9 items-center rounded-[10px] border px-3 text-[13px] transition-colors duration-300",
                    isFilled
                      ? "border-amber-brand/35 bg-amber-brand/[0.07] text-chalk-50"
                      : isWithheld
                        ? "border-white/[0.07] bg-ink-900/60 text-chalk-500"
                        : "border-white/[0.09] bg-ink-900 text-chalk-500"
                  )}
                >
                  <AnimatePresence mode="wait" initial={false}>
                    {isFilled ? (
                      <motion.span
                        key="value"
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                        className="font-medium"
                      >
                        {field.value}
                      </motion.span>
                    ) : isWithheld ? (
                      <motion.span
                        key="withheld"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="inline-flex items-center gap-1.5 text-[12px] italic"
                      >
                        <Lock className="size-3" aria-hidden />
                        withheld
                      </motion.span>
                    ) : (
                      <motion.span
                        key="empty"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-chalk-500/60"
                      >
                        —
                      </motion.span>
                    )}
                  </AnimatePresence>

                  {isFilled && (
                    <motion.span
                      layout
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: "spring", stiffness: 520, damping: 26 }}
                      className="absolute right-2.5 grid size-4 place-items-center rounded-full bg-amber-brand"
                    >
                      <Check className="size-2.5 text-ink-950" strokeWidth={3.5} aria-hidden />
                    </motion.span>
                  )}
                </div>
              </div>
            );
          })}

          <div className="pt-1.5">
            {phase === "idle" ? (
              <button
                onClick={() => setPhase("consent")}
                className="group inline-flex h-10 w-full items-center justify-center gap-2 rounded-[10px] amber-gradient text-[13px] font-semibold text-ink-950 transition-transform duration-200 hover:scale-[1.015] active:scale-[0.99]"
              >
                Fill with Onceform
                <ChevronRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden />
              </button>
            ) : (
              <button
                onClick={reset}
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-[10px] border border-white/10 bg-ink-800 text-[13px] font-medium text-chalk-400 transition-colors hover:bg-ink-700 hover:text-chalk-200"
              >
                <RotateCcw className="size-3.5" aria-hidden />
                Run it again
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Consent sheet. Shows up before a single value moves. */}
      <AnimatePresence>
        {phase === "consent" && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            className="absolute inset-x-0 bottom-0 z-20 rounded-2xl border border-amber-brand/25 bg-ink-900/95 p-4 shadow-glow backdrop-blur-xl"
            role="dialog"
            aria-label="Choose what to release"
          >
            <div className="mb-3 flex items-start gap-2.5">
              <div className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg bg-amber-brand/15">
                <ShieldCheck className="size-4 text-amber-brand" aria-hidden />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-chalk-50">
                  Release these to research-panel.example.com?
                </p>
                <p className="mt-0.5 text-[11.5px] leading-relaxed text-chalk-500">
                  Untick anything you would rather keep. The site still gets a
                  valid response.
                </p>
              </div>
            </div>

            <div className="mb-3 grid grid-cols-2 gap-1.5">
              {REQUESTED.map((field) => {
                const on = granted.includes(field.key);
                return (
                  <button
                    key={field.key}
                    onClick={() => toggle(field.key)}
                    aria-pressed={on}
                    className={cn(
                      "flex items-center gap-2 rounded-lg border px-2.5 py-2 text-left text-[11.5px] transition-colors",
                      on
                        ? "border-amber-brand/40 bg-amber-brand/10 text-chalk-100"
                        : "border-white/[0.08] bg-ink-850 text-chalk-500"
                    )}
                  >
                    <span
                      className={cn(
                        "grid size-3.5 shrink-0 place-items-center rounded-[4px] border transition-colors",
                        on ? "border-amber-brand bg-amber-brand" : "border-white/20"
                      )}
                    >
                      {on && <Check className="size-2.5 text-ink-950" strokeWidth={4} aria-hidden />}
                    </span>
                    <span className="truncate">{field.label}</span>
                  </button>
                );
              })}
            </div>

            <button
              onClick={approve}
              disabled={releasedCount === 0}
              className="h-9 w-full rounded-[10px] amber-gradient text-[12.5px] font-semibold text-ink-950 transition-transform duration-200 hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
            >
              {releasedCount === 0
                ? "Pick at least one field"
                : `Release ${releasedCount}, keep ${withheldCount}`}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Receipt. */}
      <AnimatePresence>
        {phase === "done" && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            className="mt-3 rounded-xl border border-verified/25 bg-verified/[0.06] p-3.5"
          >
            <div className="flex items-center gap-2">
              <span className="grid size-5 place-items-center rounded-full bg-verified/20">
                <Check className="size-3 text-verified" strokeWidth={3.5} aria-hidden />
              </span>
              <p className="text-[12.5px] font-semibold text-chalk-100">
                Consent receipt written
              </p>
            </div>
            <p className="mt-1.5 text-[11.5px] leading-relaxed text-chalk-400">
              {releasedCount} field{releasedCount === 1 ? "" : "s"} released,{" "}
              {withheldCount} withheld. The receipt is yours — revoke it later and
              the withdrawal is recorded just as permanently as the grant.
            </p>
            <p className="mt-2 truncate font-mono text-[10.5px] text-chalk-500">
              receipt · 7fA2…c91e · devnet
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
