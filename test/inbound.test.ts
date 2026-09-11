import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { MsgIdDedupe } from "../src/dedupe.ts";
import type { GrokHost } from "../src/grok-host.ts";
import { handleOne } from "../src/inbound.ts";
import { parseJidMap } from "../src/jid-map.ts";
import { CorrTable } from "../src/outbound.ts";
import type { SendPromptInput } from "../src/types.ts";

const DM = "10000000000@s.whatsapp.net";
const AGENT = "00000000-0000-4000-8000-000000000001";

function hostSpy(): { host: GrokHost; calls: SendPromptInput[] } {
  const calls: SendPromptInput[] = [];
  const host: GrokHost = {
    async sendPrompt(input) {
      calls.push(input);
      return { accepted: true };
    },
    async getAgentTranscriptTail() {
      return { entries: [] };
    },
  };
  return { host, calls };
}

describe("inbound handleOne", () => {
  it("sends a human DM prompt with clientNonce = waMsgId and records corr", async () => {
    const { host, calls } = hostSpy();
    const corr = new CorrTable();
    const ok = await handleOne(
      {
        host,
        corr,
        dedupe: new MsgIdDedupe(),
        map: parseJidMap({
          version: 1,
          botE164: "+10000000000",
          bindings: [{ jid: DM, kind: "dm", agentId: AGENT }],
        }),
      },
      "notify",
      {
        key: { id: "3EB0PLACEHOLDER0001", remoteJid: DM, fromMe: false },
        pushName: "Ada",
        messageTimestamp: Math.floor(Date.now() / 1000),
        message: { conversation: "hello" },
      },
    );
    assert.equal(ok, true);
    assert.equal(calls.length, 1);
    assert.equal(calls[0]?.prompt, "Ada:\nhello");
    assert.equal(calls[0]?.agentId, AGENT);
    assert.equal(calls[0]?.clientNonce, "3EB0PLACEHOLDER0001");
    assert.equal(corr.get("3EB0PLACEHOLDER0001")?.jid, DM);
  });

  it("skips fromMe, protocol, stale append, and unmapped chats without default", async () => {
    const { host, calls } = hostSpy();
    const base = {
      host,
      corr: new CorrTable(),
      dedupe: new MsgIdDedupe(),
      map: parseJidMap({
        version: 1,
        botE164: "+10000000000",
        bindings: [{ jid: DM, kind: "dm", agentId: AGENT }],
      }),
    };
    assert.equal(
      await handleOne(base, "notify", {
        key: { id: "x1", remoteJid: DM, fromMe: true },
        message: { conversation: "me" },
      }),
      false,
    );
    assert.equal(
      await handleOne(base, "notify", {
        key: { id: "x2", remoteJid: DM, fromMe: false },
        message: { protocolMessage: { type: 1 } },
      }),
      false,
    );
    assert.equal(
      await handleOne(
        base,
        "append",
        {
          key: { id: "x3", remoteJid: DM, fromMe: false },
          messageTimestamp: Math.floor((Date.now() - 11 * 60 * 1000) / 1000),
          message: { conversation: "old" },
        },
        Date.now(),
      ),
      false,
    );
    assert.equal(
      await handleOne(base, "notify", {
        key: { id: "x4", remoteJid: "10000000001@s.whatsapp.net", fromMe: false },
        message: { conversation: "no map" },
      }),
      false,
    );
    assert.equal(calls.length, 0);
  });
});
