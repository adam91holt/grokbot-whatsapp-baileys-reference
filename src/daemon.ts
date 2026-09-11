/**
 * Stay-connected daemon. The only process a host wrapper should start.
 * Loads jid-map, opens the warm socket, wires inbound + outbound.
 */

import { access } from "node:fs/promises";
import { MsgIdDedupe } from "./dedupe.ts";
import { createGrokHost } from "./grok-host.ts";
import { handleUpsert } from "./inbound.ts";
import { loadJidMap } from "./jid-map.ts";
import { jidMapPath, shareDir } from "./media-dir.ts";
import { CorrTable, flushOutbound } from "./outbound.ts";
import type { InboundWaMessage, JidMapFile, UpsertType } from "./types.ts";
import { openWarmSocket } from "./warm-socket.ts";

export type DaemonOptions = {
  shareRoot?: string;
  map?: JidMapFile;
};

export async function startDaemon(options: DaemonOptions = {}): Promise<void> {
  const root = shareDir(options.shareRoot);
  const mapFile = jidMapPath(root);
  if (!options.map) {
    try {
      await access(mapFile);
    } catch {
      throw new Error(
        `Missing jid-map.json at ${mapFile}. Copy jid-map.example.json, chmod 600, then start daemon — never pair from here.`,
      );
    }
  }
  const map = options.map ?? (await loadJidMap(mapFile));
  const host = createGrokHost();
  const corr = new CorrTable();
  const dedupe = new MsgIdDedupe();

  const onUpsert = async (type: string, messages: unknown[]): Promise<void> => {
    await handleUpsert(
      { host, map, corr, dedupe },
      type as UpsertType,
      messages as InboundWaMessage[],
    );
  };

  // Outbound tick (implementer: poll each recently prompted agentId):
  // const tail = await host.getAgentTranscriptTail({ id: agentId });
  // await flushOutbound({ agentId, entries: tail.entries, corr, sender });
  void flushOutbound;

  await openWarmSocket({ onUpsert });
}

export async function runDaemonCli(): Promise<void> {
  await startDaemon();
}
