import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";
import {
  chatJidFromKey,
  parseJidMap,
  resolveAgentId,
} from "../src/jid-map.ts";

const DM = "10000000000@s.whatsapp.net";
const GROUP = "120000000000000000@g.us";
const AGENT_A = "00000000-0000-4000-8000-000000000001";
const AGENT_B = "00000000-0000-4000-8000-000000000002";

describe("jid-map", () => {
  it("parses the committed example (placeholder ids only)", async () => {
    const raw = JSON.parse(await readFile(new URL("../jid-map.example.json", import.meta.url), "utf8"));
    const map = parseJidMap(raw);
    assert.equal(map.defaultAgentId, AGENT_A);
    assert.equal(map.agents[DM], AGENT_A);
    assert.equal(map.agents[GROUP], AGENT_B);
  });

  it("uses remoteJid then remoteJidAlt", () => {
    assert.equal(chatJidFromKey({ remoteJid: DM, remoteJidAlt: "000000000000000@lid" }), DM);
    assert.equal(chatJidFromKey({ remoteJidAlt: DM }), DM);
  });

  it("resolves agent via jid, alt, then default", () => {
    const map = parseJidMap({
      defaultAgentId: AGENT_A,
      agents: { [DM]: AGENT_A, [GROUP]: AGENT_B },
    });
    assert.equal(resolveAgentId(map, { remoteJid: DM }), AGENT_A);
    assert.equal(resolveAgentId(map, { remoteJid: "000000000000000@lid", remoteJidAlt: DM }), AGENT_A);
    assert.equal(resolveAgentId(map, { remoteJid: GROUP }), AGENT_B);
    assert.equal(resolveAgentId(map, { remoteJid: "unmapped@s.whatsapp.net" }), AGENT_A);
    assert.equal(resolveAgentId({ agents: {} }, { remoteJid: DM }), undefined);
  });
});
