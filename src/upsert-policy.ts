/**
 * messages.upsert: notify + recent append. Skip stale append (~10 minutes).
 */

import type { UpsertType } from "./types.ts";

export const STALE_APPEND_MS = 10 * 60 * 1000;

export function messageTimeMs(timestamp?: number | null, nowMs: number = Date.now()): number {
  if (timestamp == null || !Number.isFinite(Number(timestamp))) return nowMs;
  const n = Number(timestamp);
  return n < 1e12 ? n * 1000 : n;
}

export function shouldHandleUpsert(input: {
  type: UpsertType;
  messageTimestamp?: number | null;
  nowMs?: number;
}): boolean {
  const nowMs = input.nowMs ?? Date.now();
  if (input.type === "notify") return true;
  if (input.type === "append") {
    const ts = messageTimeMs(input.messageTimestamp, nowMs);
    return nowMs - ts <= STALE_APPEND_MS;
  }
  return false;
}
