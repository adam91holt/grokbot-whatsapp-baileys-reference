/**
 * Canonical jid-map.json (version 1):
 *   { version, botE164, defaultAgentId?, bindings: [{ jid, kind, agentId }] }
 *
 * Explicit bindings win. Optional defaultAgentId covers unbound JIDs
 * (infer kind from @g.us vs other). Unknown JID without default → drop.
 * Never invent agentIds. Never parse a JID from the prompt. Never CoS-hop.
 *
 * Chat JID = remoteJid, then remoteJidAlt for LID.
 */

import { chmod, mkdir, readFile } from "node:fs/promises";
import { dirname } from "node:path";
import type {
  AgentId,
  BindingKind,
  ChatJid,
  JidBinding,
  JidMapFile,
  WaMessageKey,
} from "./types.ts";

export const JID_MAP_VERSION = 1 as const;
export const BINDING_KINDS = ["dm", "group"] as const;

export type ResolvedBinding = {
  jid: ChatJid;
  kind: BindingKind;
  agentId: AgentId;
  source: "binding" | "default";
};

export function emptyJidMap(): JidMapFile {
  return {
    version: 1,
    botE164: "+10000000000",
    bindings: [],
  };
}

export function isGroupJid(jid: string | null | undefined): boolean {
  return Boolean(jid?.endsWith("@g.us"));
}

export function inferBindingKind(jid: string): BindingKind {
  return isGroupJid(jid) ? "group" : "dm";
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

export function findBinding(map: JidMapFile, jid: ChatJid): JidBinding | undefined {
  return map.bindings.find((binding) => binding.jid === jid);
}

export function resolveBinding(map: JidMapFile, key: WaMessageKey): ResolvedBinding | undefined {
  const chatJid = chatJidFromKey(key);
  for (const jid of lookupCandidates(key)) {
    const hit = findBinding(map, jid);
    if (hit) {
      return {
        jid: chatJid ?? jid,
        kind: hit.kind,
        agentId: hit.agentId,
        source: "binding",
      };
    }
  }
  if (!map.defaultAgentId || !chatJid) return undefined;
  return {
    jid: chatJid,
    kind: inferBindingKind(chatJid),
    agentId: map.defaultAgentId,
    source: "default",
  };
}

export function resolveAgentId(map: JidMapFile, key: WaMessageKey): AgentId | undefined {
  return resolveBinding(map, key)?.agentId;
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new TypeError(`jid-map.${field} must be a non-empty string`);
  }
  return value.trim();
}

function parseBinding(raw: unknown, index: number): JidBinding {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) {
    throw new TypeError(`jid-map.bindings[${index}] must be an object`);
  }
  const rec = raw as Record<string, unknown>;
  const jid = requireString(rec.jid, `bindings[${index}].jid`);
  const kind = requireString(rec.kind, `bindings[${index}].kind`);
  if (kind !== "dm" && kind !== "group") {
    throw new TypeError(`jid-map.bindings[${index}].kind must be "dm" or "group"`);
  }
  const inferred = inferBindingKind(jid);
  if (kind !== inferred) {
    throw new TypeError(
      `jid-map.bindings[${index}].kind "${kind}" does not match JID (${inferred})`,
    );
  }
  const agentId = requireString(rec.agentId, `bindings[${index}].agentId`);
  return { jid, kind, agentId };
}

export function parseJidMap(raw: unknown): JidMapFile {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) {
    throw new TypeError("jid-map must be an object");
  }
  const rec = raw as Record<string, unknown>;
  if (rec.version !== JID_MAP_VERSION) {
    throw new TypeError(`jid-map.version must be ${JID_MAP_VERSION}`);
  }
  const botE164 = requireString(rec.botE164, "botE164");
  if (!Array.isArray(rec.bindings)) {
    throw new TypeError("jid-map.bindings must be an array");
  }

  const seen = new Set<string>();
  const bindings = rec.bindings.map((entry, index) => {
    const binding = parseBinding(entry, index);
    if (seen.has(binding.jid)) {
      throw new TypeError(`jid-map.bindings duplicate jid at [${index}]`);
    }
    seen.add(binding.jid);
    return binding;
  });

  const defaultAgentId =
    rec.defaultAgentId === undefined
      ? undefined
      : requireString(rec.defaultAgentId, "defaultAgentId");

  return { version: 1, botE164, defaultAgentId, bindings };
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
