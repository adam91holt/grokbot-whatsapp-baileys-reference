/**
 * Pull conversation text / captions from a Baileys message object.
 * Protocol stubs and empty wrappers are not prompts.
 */

export function unwrapMessage(message: Record<string, unknown> | null | undefined): Record<
  string,
  unknown
> | null {
  if (!message) return null;
  const viewOnce =
    (message.viewOnceMessage as { message?: Record<string, unknown> } | undefined)?.message ??
    (message.viewOnceMessageV2 as { message?: Record<string, unknown> } | undefined)?.message ??
    (message.ephemeralMessage as { message?: Record<string, unknown> } | undefined)?.message;
  if (viewOnce) return unwrapMessage(viewOnce);
  return message;
}

export function isProtocolOrStub(message: Record<string, unknown> | null | undefined): boolean {
  const inner = unwrapMessage(message);
  if (!inner) return true;
  if (inner.protocolMessage) return true;
  if (inner.senderKeyDistributionMessage && Object.keys(inner).length === 1) return true;
  return false;
}

function captionOf(node: unknown): string {
  if (!node || typeof node !== "object") return "";
  const caption = (node as { caption?: unknown }).caption;
  return typeof caption === "string" ? caption : "";
}

export function extractWaText(message: Record<string, unknown> | null | undefined): {
  text: string;
  hasImage: boolean;
} {
  const inner = unwrapMessage(message);
  if (!inner || isProtocolOrStub(inner)) return { text: "", hasImage: false };

  if (typeof inner.conversation === "string" && inner.conversation.trim()) {
    return { text: inner.conversation, hasImage: false };
  }

  const ext = inner.extendedTextMessage as { text?: unknown } | undefined;
  if (typeof ext?.text === "string" && ext.text.trim()) {
    return { text: ext.text, hasImage: false };
  }

  if (inner.imageMessage) {
    return { text: captionOf(inner.imageMessage), hasImage: true };
  }
  if (inner.stickerMessage) {
    return { text: "", hasImage: true };
  }
  if (inner.videoMessage) {
    return { text: captionOf(inner.videoMessage), hasImage: false };
  }
  if (inner.documentMessage) {
    return { text: captionOf(inner.documentMessage), hasImage: false };
  }

  return { text: "", hasImage: false };
}
