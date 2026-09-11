/**
 * Presence: composing after prompt accept; paused before WhatsApp send / idle.
 */

export type Presence = "composing" | "paused" | "available" | "unavailable";

export type PresenceSocket = {
  sendPresenceUpdate: (presence: Presence, jid: string) => Promise<void> | void;
};

export async function setComposing(sock: PresenceSocket, chatJid: string): Promise<void> {
  await sock.sendPresenceUpdate("composing", chatJid);
}

export async function setPaused(sock: PresenceSocket, chatJid: string): Promise<void> {
  await sock.sendPresenceUpdate("paused", chatJid);
}

/**
 * composing → work → paused. Always pauses, even if work throws.
 */
export async function withComposing<T>(
  sock: PresenceSocket,
  chatJid: string,
  work: () => Promise<T>,
): Promise<T> {
  await setComposing(sock, chatJid);
  try {
    return await work();
  } finally {
    await setPaused(sock, chatJid);
  }
}
