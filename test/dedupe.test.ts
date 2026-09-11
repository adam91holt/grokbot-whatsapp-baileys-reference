import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { MsgIdDedupe } from "../src/dedupe.ts";

describe("dedupe", () => {
  it("accepts a msgId once", () => {
    const d = new MsgIdDedupe();
    assert.equal(d.take("3EB0PLACEHOLDER0001"), true);
    assert.equal(d.take("3EB0PLACEHOLDER0001"), false);
    assert.equal(d.has("3EB0PLACEHOLDER0001"), true);
  });

  it("evicts oldest when over max", () => {
    const d = new MsgIdDedupe(2);
    assert.equal(d.take("a"), true);
    assert.equal(d.take("b"), true);
    assert.equal(d.take("c"), true);
    assert.equal(d.has("a"), false);
    assert.equal(d.has("c"), true);
  });
});
