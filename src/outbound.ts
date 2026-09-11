/**
 * Outbound: poll getAgentTranscriptTail, egress ONLY kind send-message
 * (text or image/attachment). Route via corr — never parse JID from text,
 * never CoS-hop.
 */

import type { AgentId, ChatJid, CorrRecord, WaMsgId } from "./types.ts";
import type { TranscriptEntry } from "./grok-host.ts";

export class CorrTable {
  private readonly byNonce = new Map<WaMsgId, CorrRecord>();
  private readonly byAgent: AgentId[] = [];

  set(waMsgId: WaMsgId, record: CorrRecord): void {
    this.byNonce.set(waMsgId, record);
    this.byAgent.push(record.agentId);
  }

  get(waMsgId: WaMsgId): CorrRecord | undefined {
    return this.byNonce.get(waMsgId);
  }

  latestForAgent(agentId: AgentId): { waMsgId: WaMsgId; record: CorrRecord } | undefined {
    let found: { waMsgId: WaMsgId; record: CorrRecord } | undefined;
    for (const [waMsgId, record] of this.byNonce) {
      if (record.agentId === agentId) found = { waMsgId, record };
    }
    return found;
  }

  consume(waMsgId: WaMsgId): CorrRecord | undefined {
    const record = this.byNonce.get(waMsgId);
    if (record) this.byNonce.delete(waMsgId);
    return record;
  }
}

const BLOCKED_KINDS = new Set([
  "message",
  "spend-initiation",
  "tool",
  "tool-call",
  "tool_call",
  "tool-result",
  "tool_result",
]);

/**
 * Hard gate. send-message text/image only.
 * Drop assistant message rows, spend-initiation, tool calls, streaming
 * partials, and inbound echoes.
 */
export function isEgressSendMessage(
  entry: TranscriptEntry,
  corrPrompt?: string,
): boolean {
  if (!entry || typeof entry !== "object") return false;
  if (entry.streaming === true) return false;

  const kind = (entry.kind ?? "").trim();
  if (kind !== "send-message") return false;
  if (BLOCKED_KINDS.has(kind)) return false;

  if (entry.role === "assistant" && kind === "message") return false;
  if (entry.role === "user") return false;

  const text = entry.text?.trim() ?? "";
  const hasImage = Boolean(entry.attachmentPath);
  if (!text && !hasImage) return false;

  if (corrPrompt && text === corrPrompt.trim()) return false;

  return true;
}

export function correlateOutbound(
  entry: TranscriptEntry,
  corr: CorrTable,
  agentId: AgentId,
): { jid: ChatJid; waMsgId?: WaMsgId; record: CorrRecord } | undefined {
  const nonce = entry.clientNonce?.trim();
  if (nonce) {
    const record = corr.get(nonce);
    if (record && record.agentId === agentId) {
      return { jid: record.jid, waMsgId: nonce, record };
    }
    return undefined;
  }

  const latest = corr.latestForAgent(agentId);
  if (!latest) return undefined;
  return { jid: latest.record.jid, waMsgId: latest.waMsgId, record: latest.record };
}

export type WhatsAppSender = {
  sendText: (jid: ChatJid, text: string) => Promise<void>;
  sendImage?: (jid: ChatJid, filePath: string, caption?: string) => Promise<void>;
};

/**
 * Filter + route one tail page. Does not send blocked kinds.
 */
export async function flushOutbound(input: {
  agentId: AgentId;
  entries: TranscriptEntry[];
  corr: CorrTable;
  sender: WhatsAppSender;
}): Promise<number> {
  let sent = 0;
  for (const entry of input.entries) {
    const hit = correlateOutbound(entry, input.corr, input.agentId);
    if (!isEgressSendMessage(entry, hit?.record.prompt)) continue;
    if (!hit) continue;

    if (entry.attachmentPath && input.sender.sendImage) {
      await input.sender.sendImage(hit.jid, entry.attachmentPath, entry.text);
    } else if (entry.text) {
      await input.sender.sendText(hit.jid, entry.text);
    } else {
      continue;
    }

    if (hit.waMsgId) input.corr.consume(hit.waMsgId);
    sent += 1;
  }
  return sent;
}
