# Onceform

Answer a form once. Release only the fields you choose, prove the ones that
matter without handing over the underlying detail, and keep a record you can
withdraw later.

Built for the Colosseum Eternal challenge. The registry program runs on Solana
devnet.

## What is here

| Path         | What it is                                                        |
| ------------ | ----------------------------------------------------------------- |
| `web/`       | Next.js app — landing page, identity vault, receipts, verification |
| `chain/`     | Anchor program `onceform_registry`                                 |
| `extension/` | Manifest V3 browser extension                                      |

## The idea

Two problems sit on opposite sides of the same form.

People retype the same twenty facts about themselves into every questionnaire
they meet, and once a value is submitted there is no way to see where it went
or take it back.

Research panels have the mirror-image problem. They pay for responses and a
large share of what they get is fraudulent — the same person under forty
identities, or a script. Their only defence today is collecting more personal
data, which makes them a bigger target and does not actually establish that a
respondent is one distinct human.

Onceform answers both with the same structure. Personal detail stays in a vault
on the device, and only a 32-byte commitment to it reaches the chain. Claims
about a person are issued as attestations by whoever can vouch for them, so a
panel can check "this respondent is a distinct human in the bracket we are
paying for" without ever receiving a name or an email. Every disclosure writes
a consent receipt the person can revoke.

## On-chain

Program: `onceform_registry`

| Instruction         | What it does                                                |
| ------------------- | ----------------------------------------------------------- |
| `init_profile`      | Registers a wallet with a commitment to the vault contents   |
| `rotate_vault`      | Replaces the commitment when the vault changes               |
| `issue_attestation` | An issuer signs a claim about a subject, with an expiry      |
| `revoke_attestation`| The issuer withdraws it                                      |
| `record_consent`    | Logs which fields were released, to whom, and for what       |
| `revoke_consent`    | Withdraws consent; the withdrawal itself stays on record     |

No personal data is written on chain. Every personal value appears only as a
SHA-256 commitment, and the field selection as a `u64` bitmask.

## Running it

```
cd web && npm install && npm run dev
```

```
cd chain && anchor build && anchor deploy --provider.cluster devnet
```

The extension loads unpacked from `extension/` via `chrome://extensions`
with developer mode on.

The vault is edited in the web app, where it lives in that origin's
localStorage. The content script mirrors it into extension storage, but only
while a page on the Onceform origin is open, and only in that direction — no
other site can hand the extension a vault, and a script running on someone
else's questionnaire cannot write your answers back.

The log runs the other way. After a fill the extension records which fields went
to which site, hands that log — and only that log, never the answers — back to
the app, and the receipts page lists it as unrecorded until you sign it onto the
chain. Writing a receipt needs a wallet, and a service worker has no business
holding a key.

## Browser support, honestly

Desktop Chrome, Edge, Brave and Firefox load the extension as written.

There is no way to ship this to Chrome on Android — Google has never exposed an
extension API there, and Kiwi Browser, which was the usual workaround, shut down
in January 2025. Firefox for Android is the one real mobile path and needs the
add-on signed through Mozilla. On every other mobile browser the vault and
receipts work through the web app, and form filling does not.
