import type { Metadata } from "next";
import { Nav } from "@/components/site/nav";
import { Footer } from "@/components/site/footer";
import { Reveal } from "@/components/site/reveal";

export const metadata: Metadata = {
  title: "Browser extension",
  description:
    "Install Onceform in Chrome, Edge, Brave or Firefox and fill any questionnaire from your own vault.",
};

const STEPS = [
  {
    n: "01",
    title: "Get the source",
    body: "Clone the repository, or download it as a zip and unpack it. The extension folder is the part you need — there is nothing to compile.",
  },
  {
    n: "02",
    title: "Open the extensions page",
    body: "Visit chrome://extensions in Chrome, Edge or Brave, and turn on developer mode with the switch in the corner.",
  },
  {
    n: "03",
    title: "Load it unpacked",
    body: "Choose “Load unpacked” and point it at the extension folder. In Firefox the equivalent is about:debugging, then “Load Temporary Add-on”, pointing at manifest.json.",
  },
  {
    n: "04",
    title: "Fill your vault",
    body: "Open the vault on this site and enter as much as you want to keep on hand. The extension copies it across while that page is open, and only from this site — nothing is uploaded, and no other site can hand it a vault.",
  },
  {
    n: "05",
    title: "Sign the receipt",
    body: "After a fill, the extension hands the log — which fields, which site, when — back to this site. Your receipts page lists it as unrecorded until you sign it onto the chain with your wallet. Your answers never make that trip.",
  },
];

export default function ExtensionPage() {
  return (
    <>
      <Nav />
      <main id="content" className="mx-auto max-w-3xl px-5 pb-24 pt-28 sm:px-8">
        <header>
          <h1 className="text-[34px] font-semibold leading-[1.1] tracking-[-0.03em] sm:text-[42px]">
            The extension
          </h1>
          <p className="mt-3.5 text-[15px] leading-relaxed text-chalk-400">
            A questionnaire appears, the extension shows you exactly what it is
            asking for, and you decide how much of it leaves your machine. It
            does not read a page until you open it and press something.
          </p>
        </header>

        <div className="mt-10 space-y-3">
          {STEPS.map((step, i) => (
            <Reveal key={step.n} delay={i * 0.05}>
              <div className="flex gap-4 rounded-2xl border border-white/[0.08] bg-ink-900 p-5">
                <span className="font-mono text-[12px] text-amber-brand">{step.n}</span>
                <div>
                  <h2 className="text-[15px] font-medium tracking-[-0.01em]">
                    {step.title}
                  </h2>
                  <p className="mt-1.5 text-[13.5px] leading-relaxed text-chalk-400">
                    {step.body}
                  </p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal>
          <section className="mt-12 rounded-2xl border border-amber-brand/20 bg-amber-brand/[0.04] p-6">
            <h2 className="text-[16px] font-semibold tracking-[-0.02em]">
              What will not work, and why
            </h2>
            <p className="mt-3 text-[13.5px] leading-relaxed text-chalk-400">
              Chrome on Android has never exposed an extension API, and Kiwi
              Browser — the workaround most people used — shut down in January
              2025. There is no version of this that installs into mobile
              Chrome, and anyone telling you otherwise is describing something
              that does not exist.
            </p>
            <p className="mt-3 text-[13.5px] leading-relaxed text-chalk-400">
              Firefox for Android is the one genuine mobile path, and it needs
              the add-on signed through Mozilla first. Everywhere else on a
              phone, the vault, receipts and verification all work through this
              site; only the automatic filling does not.
            </p>
          </section>
        </Reveal>

        <Reveal>
          <section className="mt-10">
            <h2 className="text-[16px] font-semibold tracking-[-0.02em]">
              What it is allowed to do
            </h2>
            <p className="mt-3 text-[13.5px] leading-relaxed text-chalk-400">
              The extension asks for access to every site, which is a large
              permission and worth being suspicious of. It needs it because a
              questionnaire can live on any domain, and there is no way to know
              which in advance. What it does with that access is narrow: it
              reads the field labels on a page only when you open the popup, and
              it writes values only after you press the button. Nothing is sent
              anywhere. The code is short enough to read in a sitting, which is
              the only assurance on this point actually worth anything.
            </p>
          </section>
        </Reveal>
      </main>
      <Footer />
    </>
  );
}
