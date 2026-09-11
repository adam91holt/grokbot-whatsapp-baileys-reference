/**
 * jid-map.json: jid → agentId, plus optional defaultAgentId.
 * Chat JID = remoteJid, then remoteJidAlt for LID.
 * Never parse a JID from transcript text.
 */

import { chmod, mkdir, readFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { AgentId, ChatJid, JidMapFile, WaMessageKey } from "./types.ts";

export function emptyJidMap(): JidMapFile {
  return { agents: {} };
}

export function isGroupJid(jid: string | null | undefined): boolean {
  return Boolean(jid?.endsWith("@g.us"));
}

/** Prefer remoteJid; fall back to remoteJidAlt when the chat is LID-only. */
export function chatJidFromKey(key: WaMessageKey): ChatJid | undefined {
  const primary = key.remoteJid?.trim();
  if (primary) return primary;
  const alt = key.remoteJidAlt?.trim();
  if (alt) return alt;
  return undefined;
}

export function lookupCandidates(key: WaMessageKey): ChatJid[] {
  const out: ChatJid[] = [];
  for (const value of [key.remoteJid, key.remoteJidAlt]) {
    const jid = value?.trim();
    if (jid && !out.includes(jid)) out.push(jid);
  }
  return out;
}

export function resolveAgentId(map: JidMapFile, key: WaMessageKey): AgentId | undefined {
  for (const jid of lookupCandidates(key)) {
    const hit = map.agents[jid];
    if (hit) return hit;
  }
  return map.defaultAgentId;
}

export function parseJidMap(raw: unknown): JidMapFile {
  if (raw == null || typeof raw !== "object") {
    throw new TypeError("jid-map must be an object");
  }
  const rec = raw as Record<string, unknown>;
  const agentsIn = rec.agents;
  if (agentsIn == null || typeof agentsIn !== "object" || Array.isArray(agentsIn)) {
    throw new TypeError("jid-map.agents must be an object");
  }
  const agents: Record<string, string> = {};
  for (const [jid, agentId] of Object.entries(agentsIn as Record<string, unknown>)) {
    if (typeof jid !== "string" || typeof agentId !== "string" || !agentId.trim()) {
      throw new TypeError(`jid-map.agents[${jid}] must be a non-empty string agentId`);
    }
    agents[jid] = agentId.trim();
  }
  const defaultAgentId =
    typeof rec.defaultAgentId === "string" && rec.defaultAgentId.trim()
      ? rec.defaultAgentId.trim()
      : undefined;
  return { agents, defaultAgentId };
}

export async function loadJidMap(filePath: string): Promise<JidMapFile> {
  const text = await readFile(filePath, "utf8");
  return parseJidMap(JSON.parse(text) as unknown);
}

/** Call after writing a live map. Example files in git stay 644. */
export async function lockDownJidMapFile(filePath: string): Promise<void> {
  await mkdir(dirname(filePath), { recursive: true, mode: 0o700 });
  await chmod(filePath, 0o600);
}
