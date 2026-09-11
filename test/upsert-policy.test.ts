import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { STALE_APPEND_MS, messageTimeMs, shouldHandleUpsert } from "../src/upsert-policy.ts";

describe("upsert policy", () => {
  const nowMs = 1_700_000_000_000;

  it("always handles notify", () => {
    assert.equal(
      shouldHandleUpsert({ type: "notify", messageTimestamp: 0, nowMs }),
      true,
    );
  });

  it("handles recent append and skips stale append (~10m)", () => {
    const recentSec = Math.floor((nowMs - 60_000) / 1000);
    const staleSec = Math.floor((nowMs - STALE_APPEND_MS - 1000) / 1000);
    assert.equal(
      shouldHandleUpsert({ type: "append", messageTimestamp: recentSec, nowMs }),
      true,
    );
    assert.equal(
      shouldHandleUpsert({ type: "append", messageTimestamp: staleSec, nowMs }),
      false,
    );
  });

  it("ignores prepend and unknown types", () => {
    assert.equal(shouldHandleUpsert({ type: "prepend", nowMs }), false);
    assert.equal(shouldHandleUpsert({ type: "history", nowMs }), false);
  });

  it("normalizes unix seconds vs ms", () => {
    assert.equal(messageTimeMs(1_700_000_000), 1_700_000_000_000);
    assert.equal(messageTimeMs(1_700_000_000_000), 1_700_000_000_000);
  });
});
