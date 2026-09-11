import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";
import {
  chatJidFromKey,
  inferBindingKind,
  parseJidMap,
  resolveAgentId,
  resolveBinding,
} from "../src/jid-map.ts";

const DM = "10000000000@s.whatsapp.net";
const GROUP = "120000000000000000@g.us";
const UNBOUND = "10000000001@s.whatsapp.net";
const AGENT_A = "00000000-0000-4000-8000-000000000001";
const AGENT_B = "00000000-0000-4000-8000-000000000002";
const AGENT_DEFAULT = "00000000-0000-4000-8000-000000000099";

function fixture(overrides: Record<string, unknown> = {}) {
  return {
    version: 1,
    botE164: "+10000000000",
    defaultAgentId: AGENT_DEFAULT,
    bindings: [
      { jid: DM, kind: "dm", agentId: AGENT_A },
      { jid: GROUP, kind: "group", agentId: AGENT_B },
    ],
    ...overrides,
  };
}

describe("jid-map", () => {
  it("parses the committed example (placeholder ids only)", async () => {
    const raw = JSON.parse(await readFile(new URL("../jid-map.example.json", import.meta.url), "utf8"));
    const map = parseJidMap(raw);
    assert.equal(map.version, 1);
    assert.equal(map.botE164, "+10000000000");
    assert.equal(map.defaultAgentId, AGENT_DEFAULT);
    assert.deepEqual(map.bindings, [
      { jid: DM, kind: "dm", agentId: AGENT_A },
      { jid: GROUP, kind: "group", agentId: AGENT_B },
    ]);
  });

  it("requires version 1 and dm|group kinds that match the JID", () => {
    assert.throws(() => parseJidMap(fixture({ version: 2 })), /version must be 1/);
    assert.throws(
      () => parseJidMap(fixture({ bindings: [{ jid: DM, kind: "channel", agentId: AGENT_A }] })),
      /kind must be "dm" or "group"/,
    );
    assert.throws(
      () => parseJidMap(fixture({ bindings: [{ jid: GROUP, kind: "dm", agentId: AGENT_B }] })),
      /does not match JID/,
    );
    assert.throws(
      () =>
        parseJidMap(
          fixture({
            bindings: [
              { jid: DM, kind: "dm", agentId: AGENT_A },
              { jid: DM, kind: "dm", agentId: AGENT_B },
            ],
          }),
        ),
      /duplicate jid/,
    );
  });

  it("uses remoteJid then remoteJidAlt", () => {
    assert.equal(chatJidFromKey({ remoteJid: DM, remoteJidAlt: "000000000000000@lid" }), DM);
    assert.equal(chatJidFromKey({ remoteJidAlt: DM }), DM);
    assert.equal(inferBindingKind(GROUP), "group");
    assert.equal(inferBindingKind(DM), "dm");
  });

  it("lets explicit bindings win; default covers unbound; unknown without default drops", () => {
    const map = parseJidMap(fixture());
    assert.equal(resolveAgentId(map, { remoteJid: DM }), AGENT_A);
    assert.equal(resolveAgentId(map, { remoteJid: "000000000000000@lid", remoteJidAlt: DM }), AGENT_A);
    assert.equal(resolveAgentId(map, { remoteJid: GROUP }), AGENT_B);
    assert.equal(resolveAgentId(map, { remoteJid: UNBOUND }), AGENT_DEFAULT);
    assert.equal(resolveBinding(map, { remoteJid: UNBOUND })?.source, "default");
    assert.equal(resolveBinding(map, { remoteJid: UNBOUND })?.kind, "dm");
    assert.equal(resolveBinding(map, { remoteJid: GROUP })?.source, "binding");

    const noDefault = parseJidMap(fixture({ defaultAgentId: undefined }));
    assert.equal(resolveAgentId(noDefault, { remoteJid: UNBOUND }), undefined);
  });
});
