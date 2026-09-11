# IMPLEMENTATION.md

Deeper wiring for a Baileys WhatsApp ↔ Grok Bot bridge. Contracts in
`README.md` are canonical; this file explains *how* the pieces fit. The
TypeScript under `src/` is an illustrative scaffold, not a runnable fleet.

Placeholders only: `+10000000000`, `10000000000@s.whatsapp.net`,
`120000000000000000@g.us`, `00000000-0000-4000-8000-000000000001`.
Durable share dir: `~/.local/share/my-baileys-bridge/`.

---

## 1. Pairing vs warm daemon

### `pair.ts` — one-shot device code

1. Ensure the durable share dir exists at mode `700`.
2. Open Baileys with `useMultiFileAuthState(…/auth)` (auth dir `700`).
3. If already registered, print that and **exit**. Do not linger.
4. Otherwise `requestPairingCode("10000000000")` — digits only, no `+`.
5. Wait until `connection === "open"` (or creds show registered).
6. Flush creds. **Exit.** No inbound listeners. No `sendPrompt`.

The human enters the code in WhatsApp → Settings → Linked Devices →
Link with phone number.

### `daemon.ts` — stay-connected

1. Load `jid-map.json` (mode `600` after write).
2. Start `warm-socket.ts` against the **same** auth dir pair used.
3. On `messages.upsert` → `inbound.ts`.
4. On a timer / idle tick → `outbound.ts` (`getAgentTranscriptTail`).
5. Reconnect on close. Never call `requestPairingCode` from daemon.
6. If auth is missing / unregistered, **refuse** and tell the operator to
   run `pair`. Do not start a pairing loop inside the daemon.

### Host wrapper

A process manager, systemd unit, or Grok Bot host wrapper must exec
`daemon` only. Pointing it at `pair` re-issues device codes and fights
the warm socket for the same auth dir.

---

## 2. Chat JID and `jid-map.json`

WhatsApp now addresses many DMs as LID (`…@lid`) with a phone JID on
`key.remoteJidAlt` (groups: `participant` + `participantAlt`).

**Chat JID for routing / reply:**

```ts
const chatJid = key.remoteJid || key.remoteJidAlt;
```

Prefer `remoteJid` when present; fall back to `remoteJidAlt` when the
primary is missing or you need the PN form for map lookup.

**Map lookup order:**

1. `agents[remoteJid]`
2. `agents[remoteJidAlt]` (when different)
3. `defaultAgentId` if set
4. else drop (log a sanitized “unmapped chat” — no raw JID dumps in
   prompts; logs may store the JID locally at `600`)

`jid-map.example.json` shows the file shape. A live map is **not**
committed. After writing, `chmod 600`.

Do not derive the agent from the message body. Do not read a JID out of
the Grok transcript. That is how you accidentally CoS-hop or leak LID
strings into another seat.

---

## 3. Inbound: human prompts + `attachmentPaths`

`messages.upsert` payload: `{ type, messages }`.

| `type` | Action |
| --- | --- |
| `notify` | Handle (real-time) |
| `append` | Handle only if message time is within ~10 minutes |
| other (`prepend`, …) | Ignore |

See `src/upsert-policy.ts`. Baileys timestamps are usually unix
**seconds**; normalize to ms before comparing.

For each message:

1. Skip `key.fromMe`, skip missing `key.id`, skip protocol / stub
   messages (`src/wa-text.ts`).
2. Dedupe on `key.id` (`src/dedupe.ts`).
3. Resolve chat JID + agentId (`src/jid-map.ts`).
4. Display name (`src/display-name.ts`): `pushName` → `notify` →
   profile name → E.164 digits from the PN JID. Never `@lid`.
5. Body (`src/wa-text.ts`): conversation / extendedText / caption.
   Images with no caption become `[image]`.
6. `src/prompt.ts` builds the human string.
7. If there is inbound media, download into `…/media/` (`700`) and pass
   local paths as `attachmentPaths` / `attachmentNames`.
8. Presence: `composing` on that chat JID (`src/typing.ts`).
9. `sendPrompt` (`src/grok-host.ts`):

```ts
await sendPrompt({
  prompt,                    // HUMAN-readable only
  agentId,
  attachmentPaths,           // optional local files
  attachmentNames,
  replyToId,                 // optional, only if you truly have a host entry id
  clientNonce: waMsgId,      // MUST = WhatsApp msgId
});
// → { accepted: true }
```

10. On accept, write corr:
    `waMsgId → { jid: chatJid, agentId, prompt }`.
11. Do not wait for the model inside inbound. Outbound is a separate
    poll loop.

`replyToId` is a **Grok** transcript entry id, not a WhatsApp msgId.
Only set it when you actually have one (quoted Grok card, etc.). Do not
stuff the WhatsApp msgId into `replyToId`.

---

## 4. Outbound: send-message only + corr table

Poll `getAgentTranscriptTail({ id: agentId, limit, beforeSeq })` from
`@adam91holt/grokbot-sdk` for each agent you have recently prompted
(or every mapped agent, with backoff).

Walk new tail entries newest-last. **Egress only:**

- `kind === "send-message"`
- payload is text, or image/attachment
- `streaming !== true`

**Drop:**

- `kind === "message"` (including `role: "assistant"`)
- `kind === "spend-initiation"`
- tool-call / tool-result kinds
- `streaming: true` partials
- inbound echoes — the same human `prompt` you stored in corr, or
  `kind: "message"` with `role: "user"`

This filter is `isEgressSendMessage` in `src/outbound.ts`. Treat it as a
hard gate, not a hint.

### Corr table

In-memory is enough to start; persist if you must survive daemon restarts
while a run is in flight (still mode `600`, never commit).

```ts
type CorrRecord = {
  jid: string;       // WhatsApp chat JID to send back to
  agentId: string;
  prompt: string;    // inbound human text, for echo suppression
};
// key = clientNonce = waMsgId
```

Routing algorithm:

1. If the tail entry carries `clientNonce`, use `corr.get(clientNonce)`.
2. Else use the latest unmatched corr for that `agentId`.
3. Else `jid-map` reverse lookup is **not** required — if you cannot
   correlate, **do not send** (better than guessing a chat).
4. Never regex a `@s.whatsapp.net` / `@g.us` / `@lid` out of the
   send-message text.

After a successful WhatsApp send, mark that corr consumed (or keep it
for a short echo window). Presence: `paused`, then `sendMessage`.

**Never CoS-hop:** a send-message from agent A goes to the WhatsApp
chat that prompted A. Do not `sendPrompt` that text into agent B.

---

## 5. Typing / presence

```ts
await sock.sendPresenceUpdate("composing", chatJid);
// … accepted …
// … later, immediately before sock.sendMessage:
await sock.sendPresenceUpdate("paused", chatJid);
```

Rules:

- Composing starts after a prompt is **accepted**, not on every upsert
  (avoid composing on stale append you then drop).
- Always pause on send, timeout, interrupt, or inbound skip after you
  started composing.
- Do not send presence to group JIDs if your Baileys version rejects
  it — fail soft.

---

## 6. Media

- Directory: `~/.local/share/my-baileys-bridge/media/` at `700`
  (`src/media-dir.ts`).
- Inbound: download via Baileys (`downloadMediaMessage` or the current
  equivalent). Name files with `waMsgId` + a safe extension, not the
  sender JID.
- Pass **absolute local paths** in `attachmentPaths`.
- Outbound image/attachment: send `{ image: { url: localPath }, caption }`
  or the Baileys buffer form. Do not fetch arbitrary https URLs from
  transcript text.
- Do not commit `media/`. Do not put bytes in logs.

---

## 7. Persistence notes

Generic durable-share-dir only. Do **not** invent fleet box-backup
paths or hostnames.

```text
~/.local/share/my-baileys-bridge/          700
  auth/                                    700   Baileys multi-file auth
  media/                                   700   inbound / outbound files
  jid-map.json                             600   jid → agentId
```

- Auth is session material. Mode `700`. Gitignored. Never print creds.
- `jid-map.json` is a routing secret of sorts (who talks to which
  agent). Mode `600`. Commit only `jid-map.example.json`.
- `gateway.json` belongs to the Grok Bot host, not this bridge. The SDK
  may read it at runtime. **Gitignore it. Never log it.**
- Override the share root with an env var such as
  `BAILEYS_BRIDGE_HOME` if you must; keep the default generic.

`warm-socket.ts` must subscribe to `creds.update` and persist, or the
next process will fail to decrypt.

---

## 8. Suggested control flow

```text
bin pair    → pair.ts          → exit
bin daemon  → daemon.ts
                ├─ loadJidMap()
                ├─ openWarmSocket()
                │     creds.update → save
                │     messages.upsert → handleInbound()
                └─ loop
                      for agentId of recentlyPrompted
                        tail = getAgentTranscriptTail({ id: agentId })
                        for entry of tail
                          if isEgressSendMessage(entry)
                            jid = correlate(entry, corr)
                            pause + send WhatsApp
```

Implement against `@whiskeysockets/baileys` and public
`@adam91holt/grokbot-sdk`. Keep extra host fields out of the contract
surface you document — the README list is the allowlist for
`sendPrompt`.
