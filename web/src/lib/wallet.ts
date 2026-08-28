"use client";

/*
  Wallet access through the injected provider.

  The wallet-adapter packages bring a provider tree, a modal, and a separate
  bundle per wallet, which is a lot of weight for what this app does: connect,
  sign one transaction, disconnect. Phantom, Solflare and Backpack all expose
  the same three methods on `window`, so talking to them directly is both
  smaller and easier to follow.
*/

import { useCallback, useEffect, useState } from "react";
import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import { getConnection } from "./chain";

type Provider = {
  publicKey: { toBytes(): Uint8Array } | null;
  isConnected?: boolean;
  connect(opts?: { onlyIfTrusted?: boolean }): Promise<{ publicKey: { toBytes(): Uint8Array } }>;
  disconnect(): Promise<void>;
  signTransaction(tx: Transaction): Promise<Transaction>;
  on?(event: string, handler: (...args: unknown[]) => void): void;
  removeListener?(event: string, handler: (...args: unknown[]) => void): void;
};

function findProvider(): Provider | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    phantom?: { solana?: Provider };
    solflare?: Provider;
    solana?: Provider;
  };
  return w.phantom?.solana ?? w.solflare ?? w.solana ?? null;
}

export type WalletState = {
  publicKey: PublicKey | null;
  connecting: boolean;
  available: boolean;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  send(instructions: TransactionInstruction[]): Promise<string>;
  connection: Connection;
};

export function useWallet(): WalletState {
  const [publicKey, setPublicKey] = useState<PublicKey | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    const provider = findProvider();
    setAvailable(Boolean(provider));
    if (!provider) return;

    /* Reconnect silently if this site was approved before, so a refresh does
       not look like a logout. */
    provider
      .connect({ onlyIfTrusted: true })
      .then((res) => setPublicKey(new PublicKey(res.publicKey.toBytes())))
      .catch(() => {});

    const onAccountChanged = (...args: unknown[]) => {
      const key = args[0] as { toBytes(): Uint8Array } | null;
      setPublicKey(key ? new PublicKey(key.toBytes()) : null);
    };
    provider.on?.("accountChanged", onAccountChanged);
    return () => provider.removeListener?.("accountChanged", onAccountChanged);
  }, []);

  const connect = useCallback(async () => {
    const provider = findProvider();
    if (!provider) {
      window.open("https://phantom.app/download", "_blank", "noreferrer");
      return;
    }
    setConnecting(true);
    try {
      const res = await provider.connect();
      setPublicKey(new PublicKey(res.publicKey.toBytes()));
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(async () => {
    await findProvider()?.disconnect();
    setPublicKey(null);
  }, []);

  const send = useCallback(
    async (instructions: TransactionInstruction[]) => {
      const provider = findProvider();
      if (!provider || !publicKey) throw new Error("Connect a wallet first.");

      const connection = getConnection();
      const { blockhash, lastValidBlockHeight } =
        await connection.getLatestBlockhash("confirmed");

      const tx = new Transaction();
      tx.add(...instructions);
      tx.feePayer = publicKey;
      tx.recentBlockhash = blockhash;

      const signed = await provider.signTransaction(tx);
      const signature = await connection.sendRawTransaction(signed.serialize());
      await connection.confirmTransaction(
        { signature, blockhash, lastValidBlockHeight },
        "confirmed"
      );
      return signature;
    },
    [publicKey]
  );

  return {
    publicKey,
    connecting,
    available,
    connect,
    disconnect,
    send,
    connection: getConnection(),
  };
}
