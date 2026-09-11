import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatDmPrompt, formatGroupPrompt, formatPrompt, imageBody } from "../src/prompt.ts";

describe("prompt formatting", () => {
  it("formats a DM as DisplayName + newline + body", () => {
    assert.equal(formatDmPrompt("Ada", "hello"), "Ada:\nhello");
  });

  it("formats a group with subject", () => {
    assert.equal(
      formatGroupPrompt("Ada", "Bridge Lab", "hello"),
      "Ada (in Bridge Lab):\nhello",
    );
  });

  it("uses image caption or [image]", () => {
    assert.equal(imageBody("a cat"), "a cat");
    assert.equal(imageBody("  "), "[image]");
    assert.equal(imageBody(undefined), "[image]");
  });

  it("picks DM vs group from groupSubject", () => {
    assert.equal(formatPrompt({ displayName: "Ada", body: "x" }), "Ada:\nx");
    assert.equal(
      formatPrompt({ displayName: "Ada", body: "[image]", groupSubject: "Bridge Lab" }),
      "Ada (in Bridge Lab):\n[image]",
    );
  });
});
