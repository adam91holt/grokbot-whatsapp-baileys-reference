/**
 * Thin wrapper around public @adam91holt/grokbot-sdk:
 *   sendPrompt({ prompt, agentId, attachmentPaths, attachmentNames, replyToId, clientNonce })
 *     → { accepted: true }
 *   getAgentTranscriptTail({ id, limit?, beforeSeq? })
 *
 * This file is a scaffold: wire GrokBot at implementation time. Do not log
 * gateway.json or tokens.
 */

import type {
  SendPromptInput,
  SendPromptResult,
  TranscriptTailQuery,
} from "./types.ts";

export type TranscriptEntry = {
  kind?: string;
  role?: string;
  streaming?: boolean;
  text?: string;
  clientNonce?: string;
  seq?: number;
  /** Image / attachment send-message (local path once materialized). */
  attachmentPath?: string;
  attachmentName?: string;
};

export type TranscriptTail = {
  entries: TranscriptEntry[];
};

export type GrokHost = {
  sendPrompt: (input: SendPromptInput) => Promise<SendPromptResult>;
  getAgentTranscriptTail: (query: TranscriptTailQuery) => Promise<TranscriptTail>;
};

/**
 * Illustrative adapter. An implementer replaces `client` with
 * `new GrokBot()` from `@adam91holt/grokbot-sdk`.
 *
 * Cite only the sendPrompt fields in README.md — do not add extra host
 * keys at the bridge boundary.
 */
export function createGrokHost(client?: GrokHost): GrokHost {
  if (client) return client;

  return {
    async sendPrompt(input: SendPromptInput): Promise<SendPromptResult> {
      if (!input.prompt.trim()) {
        throw new TypeError("sendPrompt.prompt must be human-readable non-empty text");
      }
      if (input.clientNonce != null && input.clientNonce.trim() === "") {
        throw new TypeError("sendPrompt.clientNonce must be the WhatsApp msgId");
      }
      throw new Error(
        "Scaffold: wire @adam91holt/grokbot-sdk GrokBot.sendPrompt here",
      );
    },
    async getAgentTranscriptTail(_query: TranscriptTailQuery): Promise<TranscriptTail> {
      throw new Error(
        "Scaffold: wire @adam91holt/grokbot-sdk GrokBot.getAgentTranscriptTail here",
      );
    },
  };
}

export async function acceptPrompt(
  host: GrokHost,
  input: SendPromptInput,
): Promise<SendPromptResult> {
  const result = await host.sendPrompt(input);
  if (result?.accepted !== true) {
    throw new Error("sendPrompt did not return { accepted: true }");
  }
  return result;
}
