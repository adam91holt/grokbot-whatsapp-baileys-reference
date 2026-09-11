import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { authDir, mediaDir, mediaFilePath, shareDir } from "../src/media-dir.ts";

describe("durable share paths", () => {
  it("defaults to a generic ~/.local/share/my-baileys-bridge tree", () => {
    const prev = process.env.BAILEYS_BRIDGE_HOME;
    delete process.env.BAILEYS_BRIDGE_HOME;
    try {
      assert.match(shareDir(), /my-baileys-bridge$/);
      assert.match(mediaDir(), /my-baileys-bridge\/media$/);
      assert.match(authDir(), /my-baileys-bridge\/auth$/);
    } finally {
      if (prev !== undefined) process.env.BAILEYS_BRIDGE_HOME = prev;
    }
  });

  it("sanitizes media filenames from waMsgId", () => {
    const path = mediaFilePath("3EB0PLACEHOLDER0001", "jpg", "/tmp/share");
    assert.equal(path, "/tmp/share/media/3EB0PLACEHOLDER0001.jpg");
  });
});
