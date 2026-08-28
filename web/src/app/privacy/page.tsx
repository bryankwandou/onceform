import type { Metadata } from "next";
import { Nav } from "@/components/site/nav";
import { Footer } from "@/components/site/footer";

export const metadata: Metadata = {
  title: "How we handle data",
  description:
    "What Onceform stores, what reaches the chain, and what we cannot help you with if you lose it.",
};

const SECTIONS = [
  {
    title: "What we hold",
    body: [
      "Nothing. There is no account, no server-side database, and no analytics on the pages that touch your vault. The values you type live in your browser's local storage and are read by the extension from that same browser.",
      "This is not a promise about our intentions — it is a description of the architecture. There is no copy of your details for us to lose, sell, or be compelled to hand over, because one was never made.",
    ],
  },
  {
    title: "What reaches the chain",
    body: [
      "Four things, and nothing else: a 32-byte fingerprint of your vault contents, a bitmask saying which fields you released, a hash of the site you released them to, and a hash of the stated purpose.",
      "None of these can be turned back into your data. The vault fingerprint is salted with a random value generated on your device and never transmitted, which is what stops somebody guessing a short field set by brute force.",
    ],
  },
  {
    title: "What the chain cannot do",
    body: [
      "It cannot forget. A consent receipt is a permanent record that you disclosed something at a point in time, and withdrawing consent adds a second record rather than erasing the first.",
      "This is deliberate — a receipt you could silently delete would be worthless as evidence — but it is a genuine trade-off and you should understand it before registering a vault. If your requirement is that no permanent record exists anywhere, this is the wrong tool.",
    ],
  },
  {
    title: "What happens if you lose the browser",
    body: [
      "Clearing site data erases both your vault and the salt. The fingerprint on chain stays where it is, but nothing will ever hash to it again.",
      "We cannot recover it. There is no reset link, because a reset link would mean we held something, and we do not. Treat a new browser as a new vault, fill it again, and publish a fresh fingerprint.",
    ],
  },
  {
    title: "Wallets",
    body: [
      "Connecting a wallet shows us its public address for as long as the page is open, which is public information anyway. We never see a private key, and every transaction is signed inside your wallet where we cannot reach it.",
      "Anything you sign is visible to anyone who looks at the chain, including which sites you have released fields to. Consider using a wallet you keep for this, rather than the one holding your money.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <>
      <Nav />
      <main id="content" className="mx-auto max-w-2xl px-5 pb-24 pt-28 sm:px-8">
        <h1 className="text-[34px] font-semibold leading-[1.1] tracking-[-0.03em] sm:text-[42px]">
          How we handle data
        </h1>
        <p className="mt-3.5 text-[15px] leading-relaxed text-chalk-400">
          Written to be read rather than agreed to. If any of it turns out to be
          untrue of the code, the code is the bug.
        </p>

        <div className="mt-11 space-y-10">
          {SECTIONS.map((section) => (
            <section key={section.title}>
              <h2 className="text-[17px] font-semibold tracking-[-0.02em]">
                {section.title}
              </h2>
              {section.body.map((p, i) => (
                <p key={i} className="mt-3 text-[14px] leading-relaxed text-chalk-400">
                  {p}
                </p>
              ))}
            </section>
          ))}
        </div>

        <p className="mt-12 border-t border-white/[0.07] pt-6 text-[12.5px] leading-relaxed text-chalk-500">
          Onceform currently runs against Solana devnet, where accounts can be
          wiped when the cluster resets. Do not treat anything recorded today as
          a durable legal record.
        </p>
      </main>
      <Footer />
    </>
  );
}
