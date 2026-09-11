import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { displayName, e164Digits, isUnsafeDisplayName } from "../src/display-name.ts";

describe("displayName", () => {
  it("prefers pushName, then notify, then profile", () => {
    assert.equal(displayName({ pushName: "Ada", notify: "Other" }), "Ada");
    assert.equal(displayName({ notify: "Ada" }), "Ada");
    assert.equal(displayName({ profileName: "Ada" }), "Ada");
  });

  it("falls back to E.164 digits, never a raw JID or @lid", () => {
    assert.equal(e164Digits("10000000000@s.whatsapp.net"), "10000000000");
    assert.equal(e164Digits("+10000000000"), "10000000000");
    assert.equal(e164Digits("999999999999999@lid"), "");
    assert.equal(
      displayName({ chatJid: "10000000000@s.whatsapp.net" }),
      "10000000000",
    );
    assert.equal(displayName({ chatJid: "999999999999999@lid" }), "Unknown");
    assert.equal(
      displayName({
        pushName: "999999999999999@lid",
        altJid: "10000000000@s.whatsapp.net",
      }),
      "10000000000",
    );
  });

  it("rejects JID-shaped display names", () => {
    assert.equal(isUnsafeDisplayName("10000000000@s.whatsapp.net"), true);
    assert.equal(isUnsafeDisplayName("120000000000000000@g.us"), true);
    assert.equal(isUnsafeDisplayName("Ada"), false);
  });
});
