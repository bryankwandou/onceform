/*
  End-to-end check against devnet.

  Exercises the paths a judge will click: register a vault, rotate it, issue an
  attestation, record a disclosure, then withdraw it. Prints a signature for
  each so every claim on the site can be followed to a real transaction.

  Run:  node smoke.mjs
*/

import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const RPC = "https://api.devnet.solana.com";
const PROGRAM_ID = new PublicKey("GiK9msFggXvftThohLKrsHjCTHVtLDiWLFij1whc2oML");

const connection = new Connection(RPC, "confirmed");

const payer = Keypair.fromSecretKey(
  new Uint8Array(
    JSON.parse(readFileSync(join(homedir(), ".config/solana/onceform-deployer.json"), "utf8"))
  )
);

/* ------------------------------- encoding -------------------------------- */

const sha256 = (bytes) => new Uint8Array(createHash("sha256").update(bytes).digest());
const disc = (name) => sha256(Buffer.from(`global:${name}`)).slice(0, 8);
const hash = (text) => sha256(Buffer.from(text));

function u64(value) {
  const out = Buffer.alloc(8);
  out.writeBigUInt64LE(BigInt(value));
  return out;
}
function i64(value) {
  const out = Buffer.alloc(8);
  out.writeBigInt64LE(BigInt(value));
  return out;
}
function u16(value) {
  const out = Buffer.alloc(2);
  out.writeUInt16LE(value);
  return out;
}
const cat = (...parts) => Buffer.concat(parts.map(Buffer.from));

/* --------------------------------- PDAs ---------------------------------- */

const profilePda = (authority) =>
  PublicKey.findProgramAddressSync([Buffer.from("profile"), authority.toBuffer()], PROGRAM_ID)[0];

const receiptPda = (authority, nonce) =>
  PublicKey.findProgramAddressSync(
    [Buffer.from("receipt"), authority.toBuffer(), u64(nonce)],
    PROGRAM_ID
  )[0];

const attestationPda = (issuer, subject, schema) =>
  PublicKey.findProgramAddressSync(
    [Buffer.from("attestation"), issuer.toBuffer(), subject.toBuffer(), u16(schema)],
    PROGRAM_ID
  )[0];

/* -------------------------------- sending -------------------------------- */

let failures = 0;

async function send(label, ix) {
  try {
    const tx = new Transaction().add(ix);
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
    tx.recentBlockhash = blockhash;
    tx.feePayer = payer.publicKey;
    tx.sign(payer);

    const signature = await connection.sendRawTransaction(tx.serialize());
    await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, "confirmed");

    console.log(`  ok   ${label}`);
    console.log(`       https://explorer.solana.com/tx/${signature}?cluster=devnet`);
    return signature;
  } catch (error) {
    failures += 1;
    console.log(`  FAIL ${label}`);
    console.log(`       ${error.message}`);
    const logs = error.logs || (await error.getLogs?.(connection).catch(() => null));
    if (logs) console.log(logs.map((l) => `       ${l}`).join("\n"));
    return null;
  }
}

/* --------------------------------- run ----------------------------------- */

const me = payer.publicKey;
const profile = profilePda(me);
const nonce = Date.now();
const SYS = { pubkey: SystemProgram.programId, isSigner: false, isWritable: false };

console.log(`payer   ${me.toBase58()}`);
console.log(`balance ${(await connection.getBalance(me)) / 1e9} SOL`);
console.log(`program ${PROGRAM_ID.toBase58()}\n`);

const info = await connection.getAccountInfo(PROGRAM_ID);
if (!info) {
  console.log("The program is not deployed at that address. Nothing to test.");
  process.exit(1);
}
console.log(`program account is ${info.data.length} bytes, executable=${info.executable}\n`);

const registered = Boolean(await connection.getAccountInfo(profile));

if (!registered) {
  await send(
    "init_profile",
    new TransactionInstruction({
      programId: PROGRAM_ID,
      keys: [
        { pubkey: profile, isSigner: false, isWritable: true },
        { pubkey: me, isSigner: true, isWritable: true },
        SYS,
      ],
      data: cat(disc("init_profile"), hash("vault-v1")),
    })
  );
} else {
  console.log("  --   init_profile (profile already exists)");
}

await send(
  "rotate_vault",
  new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: profile, isSigner: false, isWritable: true },
      { pubkey: me, isSigner: true, isWritable: false },
    ],
    data: cat(disc("rotate_vault"), hash(`vault-${nonce}`)),
  })
);

const attestation = attestationPda(me, me, 0);
if (!(await connection.getAccountInfo(attestation))) {
  await send(
    "issue_attestation",
    new TransactionInstruction({
      programId: PROGRAM_ID,
      keys: [
        { pubkey: attestation, isSigner: false, isWritable: true },
        { pubkey: me, isSigner: true, isWritable: true },
        { pubkey: me, isSigner: false, isWritable: false },
        SYS,
      ],
      data: cat(
        disc("issue_attestation"),
        u16(0),
        hash("unique-human"),
        i64(Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30)
      ),
    })
  );
} else {
  console.log("  --   issue_attestation (already issued for schema 0)");
}

/*
  Revocation needs an attestation that has not been revoked yet, and schema 0 is
  the long-lived one every earlier run has been reusing. So issue a throwaway on
  a schema nobody has touched, then withdraw it — that way the pair can run again
  tomorrow without tripping AlreadyRevoked.
*/
const throwawaySchema = 1 + (nonce % 65000);
const throwaway = attestationPda(me, me, throwawaySchema);

await send(
  `issue_attestation (schema ${throwawaySchema}, to be revoked)`,
  new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: throwaway, isSigner: false, isWritable: true },
      { pubkey: me, isSigner: true, isWritable: true },
      { pubkey: me, isSigner: false, isWritable: false },
      SYS,
    ],
    data: cat(
      disc("issue_attestation"),
      u16(throwawaySchema),
      hash(`throwaway-${nonce}`),
      i64(Math.floor(Date.now() / 1000) + 60 * 60)
    ),
  })
);

await send(
  "revoke_attestation",
  new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: throwaway, isSigner: false, isWritable: true },
      { pubkey: me, isSigner: true, isWritable: false },
    ],
    data: cat(disc("revoke_attestation")),
  })
);

const receipt = receiptPda(me, nonce);

await send(
  "record_consent",
  new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: receipt, isSigner: false, isWritable: true },
      { pubkey: profile, isSigner: false, isWritable: true },
      { pubkey: me, isSigner: true, isWritable: true },
      SYS,
    ],
    data: cat(
      disc("record_consent"),
      u64(nonce),
      hash("https://example-panel.test"),
      u64(0b10011), // full name, email, age band
      hash("screening")
    ),
  })
);

await send(
  "revoke_consent",
  new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: receipt, isSigner: false, isWritable: true },
      { pubkey: profile, isSigner: false, isWritable: true },
      { pubkey: me, isSigner: true, isWritable: false },
    ],
    data: cat(disc("revoke_consent")),
  })
);

console.log(`\nreceipt https://explorer.solana.com/address/${receipt.toBase58()}?cluster=devnet`);
console.log(failures === 0 ? "\nAll instructions succeeded." : `\n${failures} instruction(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
