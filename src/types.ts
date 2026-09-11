/**
 * Shared placeholder-friendly types for the reference scaffold.
 * No real JIDs, phones, or agent UUIDs live here.
 */

export type AgentId = string;
export type WaMsgId = string;
export type ChatJid = string;

/** Canonical sendPrompt body — cite only these fields. */
export type SendPromptInput = {
  prompt: string;
  agentId?: AgentId;
  attachmentPaths?: string[];
  attachmentNames?: string[];
  replyToId?: string;
  /** MUST equal the WhatsApp msgId. */
  clientNonce?: WaMsgId;
};

export type SendPromptResult = { accepted: true };

/** Public SDK tail query: getAgentTranscriptTail({ id, limit?, beforeSeq? }). */
export type TranscriptTailQuery = {
  id: AgentId;
  limit?: number;
  beforeSeq?: number;
};

export type CorrRecord = {
  jid: ChatJid;
  agentId: AgentId;
  prompt: string;
};

export type JidMapFile = {
  defaultAgentId?: AgentId;
  agents: Record<ChatJid, AgentId>;
};

export type WaMessageKey = {
  id?: string | null;
  remoteJid?: string | null;
  remoteJidAlt?: string | null;
  participant?: string | null;
  participantAlt?: string | null;
  fromMe?: boolean | null;
};

export type InboundWaMessage = {
  key: WaMessageKey;
  pushName?: string | null;
  messageTimestamp?: number | null;
  message?: Record<string, unknown> | null;
};

export type UpsertType = "notify" | "append" | "prepend" | string;
