# AGENTS.md

Short checklist for an agent implementing a Baileys WhatsApp ↔ Grok Bot bridge
from this reference. Details live in `README.md` and `IMPLEMENTATION.md`.

## Do

- Run **`pair` once**, then **`daemon` forever**. Share the same auth dir.
- Point any host wrapper at **`daemon` only**.
- Handle `messages.upsert` **`notify`** and **recent `append`** (skip stale
  append ~10 minutes).
- Chat JID = `remoteJid`, then `remoteJidAlt` for LID.
- Route with `jid-map.json` (`jid → agentId`, optional `defaultAgentId`) plus
  a corr table: `clientNonce / waMsgId → { jid, agentId, prompt }`.
- `sendPrompt` with **human-readable** text only.
- Set **`clientNonce` = WhatsApp `msgId`**. Expect `{ accepted: true }`.
- Format DM as `{DisplayName}:\n{body}`; group as
  `{DisplayName} (in {GroupSubject}):\n{body}`; image uses the same header plus
  caption or `[image]`.
- Resolve display name from `pushName` / `notify` / profile; fallback **E.164
  digits only**.
- Egress **only** transcript `kind: "send-message"` (text or image/attachment).
- Show **composing** after accept; **paused** before send / on idle.
- Persist auth `700`, jid-map `600`, media `700` under a generic durable share
  dir such as `~/.local/share/my-baileys-bridge/`.
- Dedupe on `waMsgId`. Skip `fromMe` and protocol stubs.
- Use placeholders in docs, examples, and tests:
  `+10000000000`, `10000000000@s.whatsapp.net`,
  `120000000000000000@g.us`,
  `00000000-0000-4000-8000-000000000001`.

## Don’t

- Don’t point the host wrapper at `pair`.
- Don’t put secrets, real phones, real JIDs, real agent UUIDs, session auth,
  private hostnames, or box-backup paths in this repo or in prompts.
- Don’t dump raw `@lid` or full JIDs into prompt text.
- Don’t parse a JID (or agent id) out of transcript text.
- Don’t CoS-hop — one WhatsApp chat ↔ one mapped agent. No bounce via a second
  agent.
- Don’t egress `kind: "message"` + `role: "assistant"`, `spend-initiation`,
  tool calls, `streaming: true`, or inbound echoes.
- Don’t `sendPrompt` non-human protocol dumps.
- Don’t reuse a random nonce. `clientNonce` **must** be the WhatsApp msgId.
- Don’t commit `gateway.json`, auth dirs, media, or a live `jid-map.json`.
