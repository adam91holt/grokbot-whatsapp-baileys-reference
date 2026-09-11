import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CorrTable,
  flushOutbound,
  isEgressSendMessage,
} from "../src/outbound.ts";

const AGENT = "00000000-0000-4000-8000-000000000001";
const JID = "10000000000@s.whatsapp.net";
const PROMPT = "Ada:\nhello";

describe("outbound egress filter", () => {
  it("allows send-message text and image", () => {
    assert.equal(isEgressSendMessage({ kind: "send-message", text: "ok" }), true);
    assert.equal(
      isEgressSendMessage({ kind: "send-message", attachmentPath: "/tmp/x.jpg" }),
      true,
    );
  });

  it("blocks assistant message, spend, tools, streaming, and echoes", () => {
    assert.equal(
      isEgressSendMessage({ kind: "message", role: "assistant", text: "ok" }),
      false,
    );
    assert.equal(isEgressSendMessage({ kind: "spend-initiation", text: "ok" }), false);
    assert.equal(isEgressSendMessage({ kind: "tool-call", text: "ok" }), false);
    assert.equal(
      isEgressSendMessage({ kind: "send-message", text: "ok", streaming: true }),
      false,
    );
    assert.equal(
      isEgressSendMessage({ kind: "send-message", text: PROMPT }, PROMPT),
      false,
    );
  });
});

describe("corr + flush", () => {
  it("routes via clientNonce and never requires parsing JID from text", async () => {
    const corr = new CorrTable();
    corr.set("3EB0PLACEHOLDER0001", { jid: JID, agentId: AGENT, prompt: PROMPT });
    const sent: string[] = [];
    const n = await flushOutbound({
      agentId: AGENT,
      corr,
      entries: [
        { kind: "message", role: "assistant", text: "ignore me", clientNonce: "3EB0PLACEHOLDER0001" },
        { kind: "send-message", text: "pong", clientNonce: "3EB0PLACEHOLDER0001" },
      ],
      sender: {
        async sendText(jid, text) {
          sent.push(`${jid}:${text}`);
        },
      },
    });
    assert.equal(n, 1);
    assert.deepEqual(sent, [`${JID}:pong`]);
    assert.equal(corr.get("3EB0PLACEHOLDER0001"), undefined);
  });

  it("does not send when correlation is missing", async () => {
    const sent: string[] = [];
    const n = await flushOutbound({
      agentId: AGENT,
      corr: new CorrTable(),
      entries: [{ kind: "send-message", text: "pong" }],
      sender: {
        async sendText(_jid, text) {
          sent.push(text);
        },
      },
    });
    assert.equal(n, 0);
    assert.deepEqual(sent, []);
  });
});
