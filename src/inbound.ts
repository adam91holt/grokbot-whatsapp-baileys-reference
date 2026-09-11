/**
 * Inbound WhatsApp → sendPrompt.
 * upsert → policy → jid-map → human prompt → clientNonce=msgId → corr.
 */

import { displayName } from "./display-name.ts";
import { MsgIdDedupe } from "./dedupe.ts";
import { acceptPrompt, type GrokHost } from "./grok-host.ts";
import { chatJidFromKey, isGroupJid, resolveAgentId } from "./jid-map.ts";
import { imageBody, formatPrompt } from "./prompt.ts";
import { shouldHandleUpsert } from "./upsert-policy.ts";
import { extractWaText, isProtocolOrStub } from "./wa-text.ts";
import type { CorrTable } from "./outbound.ts";
import type { InboundWaMessage, JidMapFile, UpsertType } from "./types.ts";

export type InboundContext = {
  host: GrokHost;
  map: JidMapFile;
  corr: CorrTable;
  dedupe: MsgIdDedupe;
  groupSubject?: (gid: string) => Promise<string | undefined> | string | undefined;
  attachmentPathsFor?: (msg: InboundWaMessage) => Promise<string[] | undefined> | string[] | undefined;
};

export async function handleUpsert(
  ctx: InboundContext,
  type: UpsertType,
  messages: InboundWaMessage[],
  nowMs?: number,
): Promise<number> {
  let accepted = 0;
  for (const msg of messages) {
    const did = await handleOne(ctx, type, msg, nowMs);
    if (did) accepted += 1;
  }
  return accepted;
}

export async function handleOne(
  ctx: InboundContext,
  type: UpsertType,
  msg: InboundWaMessage,
  nowMs?: number,
): Promise<boolean> {
  if (!shouldHandleUpsert({ type, messageTimestamp: msg.messageTimestamp, nowMs })) {
    return false;
  }
  if (msg.key.fromMe) return false;

  const waMsgId = msg.key.id?.trim();
  if (!waMsgId) return false;
  if (!ctx.dedupe.take(waMsgId)) return false;

  if (isProtocolOrStub(msg.message)) return false;

  const chatJid = chatJidFromKey(msg.key);
  if (!chatJid) return false;

  const agentId = resolveAgentId(ctx.map, msg.key);
  if (!agentId) return false;

  const extracted = extractWaText(msg.message);
  const body = extracted.hasImage ? imageBody(extracted.text) : extracted.text.trim();
  if (!body) return false;

  const name = displayName({
    pushName: msg.pushName,
    chatJid,
    altJid: msg.key.remoteJidAlt,
  });

  let groupSubject: string | undefined;
  if (isGroupJid(chatJid) && ctx.groupSubject) {
    groupSubject = await ctx.groupSubject(chatJid);
  }

  const prompt = formatPrompt({ displayName: name, body, groupSubject });
  const attachmentPaths = ctx.attachmentPathsFor
    ? await ctx.attachmentPathsFor(msg)
    : undefined;

  const result = await acceptPrompt(ctx.host, {
    prompt,
    agentId,
    attachmentPaths,
    clientNonce: waMsgId,
  });

  if (result.accepted !== true) return false;

  ctx.corr.set(waMsgId, { jid: chatJid, agentId, prompt });
  return true;
}
