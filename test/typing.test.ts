import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { withComposing, type Presence } from "../src/typing.ts";

const JID = "10000000000@s.whatsapp.net";

describe("typing presence", () => {
  it("composes then always pauses", async () => {
    const log: Presence[] = [];
    const sock = {
      async sendPresenceUpdate(presence: Presence, jid: string) {
        assert.equal(jid, JID);
        log.push(presence);
      },
    };
    const value = await withComposing(sock, JID, async () => "ok");
    assert.equal(value, "ok");
    assert.deepEqual(log, ["composing", "paused"]);
  });

  it("pauses when work throws", async () => {
    const log: Presence[] = [];
    const sock = {
      async sendPresenceUpdate(presence: Presence) {
        log.push(presence);
      },
    };
    await assert.rejects(
      async () =>
        await withComposing(sock, JID, async () => {
          throw new Error("boom");
        }),
    );
    assert.deepEqual(log, ["composing", "paused"]);
  });
});
