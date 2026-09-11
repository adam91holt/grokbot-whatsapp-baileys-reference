/**
 * Stay-connected Baileys socket. Daemon-only.
 * Persist creds.update. Never request a pairing code here.
 */

import { authDir, ensureAuthDir } from "./media-dir.ts";

export type WarmSocketHandlers = {
  onUpsert?: (type: string, messages: unknown[]) => Promise<void> | void;
  onReconnect?: () => Promise<void> | void;
};

/**
 * Illustrative control flow. Wire `@whiskeysockets/baileys`
 * `makeWASocket` + `useMultiFileAuthState` at implementation time.
 */
export async function openWarmSocket(handlers: WarmSocketHandlers = {}): Promise<{
  authPath: string;
  close: () => Promise<void>;
}> {
  const authPath = await ensureAuthDir();

  // const { state, saveCreds } = await useMultiFileAuthState(authPath);
  // if (!state.creds.registered) {
  //   throw new Error("Auth is not registered. Run pair, not daemon.");
  // }
  // const sock = makeWASocket({ auth: state });
  // sock.ev.on("creds.update", saveCreds);
  // sock.ev.on("messages.upsert", async ({ type, messages }) => {
  //   await handlers.onUpsert?.(type, messages);
  // });
  // sock.ev.on("connection.update", async ({ connection, lastDisconnect }) => {
  //   if (connection === "close") await handlers.onReconnect?.();
  // });

  void handlers;
  void authDir;

  throw new Error(
    `Scaffold: open a Baileys warm socket against ${authPath} (mode 700). Do not pair here.`,
  );
}
