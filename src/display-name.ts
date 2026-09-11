/**
 * Display names for human-readable prompts.
 * Order: pushName → notify → profile name → E.164 digits.
 * Never emit a raw @lid or a full JID dump.
 */

const LID_SUFFIX = /@lid$/i;
const JID_LIKE = /@.+\./;

export function e164Digits(input: string | null | undefined): string {
  if (!input) return "";
  const local = input.split("@")[0] ?? "";
  if (LID_SUFFIX.test(input.trim())) return "";
  const digits = local.replace(/\D/g, "");
  return digits;
}

export function isUnsafeDisplayName(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return true;
  if (LID_SUFFIX.test(trimmed)) return true;
  if (trimmed.includes("@s.whatsapp.net") || trimmed.includes("@g.us")) return true;
  if (JID_LIKE.test(trimmed) && trimmed.includes("@")) return true;
  return false;
}

export function displayName(input: {
  pushName?: string | null;
  notify?: string | null;
  profileName?: string | null;
  chatJid?: string | null;
  altJid?: string | null;
}): string {
  for (const candidate of [input.pushName, input.notify, input.profileName]) {
    const trimmed = candidate?.trim() ?? "";
    if (trimmed && !isUnsafeDisplayName(trimmed)) return trimmed;
  }

  const fromAlt = e164Digits(input.altJid);
  if (fromAlt) return fromAlt;
  const fromChat = e164Digits(input.chatJid);
  if (fromChat) return fromChat;
  return "Unknown";
}
