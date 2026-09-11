import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { extractWaText, isProtocolOrStub } from "../src/wa-text.ts";

describe("wa-text", () => {
  it("reads conversation and extended text", () => {
    assert.deepEqual(extractWaText({ conversation: "hello" }), {
      text: "hello",
      hasImage: false,
    });
    assert.deepEqual(extractWaText({ extendedTextMessage: { text: "hello" } }), {
      text: "hello",
      hasImage: false,
    });
  });

  it("reads image captions and flags images", () => {
    assert.deepEqual(extractWaText({ imageMessage: { caption: "a cat" } }), {
      text: "a cat",
      hasImage: true,
    });
    assert.deepEqual(extractWaText({ imageMessage: {} }), {
      text: "",
      hasImage: true,
    });
  });

  it("skips protocol stubs", () => {
    assert.equal(isProtocolOrStub({ protocolMessage: { type: 1 } }), true);
    assert.equal(isProtocolOrStub({ conversation: "hello" }), false);
  });
});
