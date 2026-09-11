#!/usr/bin/env node
/**
 * pair | daemon
 * Host wrappers must exec daemon only.
 */

import { runDaemonCli } from "../src/daemon.ts";
import { runPairCli } from "../src/pair.ts";

async function main(): Promise<void> {
  const cmd = process.argv[2] ?? "";
  if (cmd === "pair") {
    await runPairCli();
    return;
  }
  if (cmd === "daemon") {
    await runDaemonCli();
    return;
  }
  console.error(
    [
      "usage: grokbot-whatsapp-baileys <pair|daemon>",
      "",
      "  pair    one-shot device code; write auth; exit",
      "  daemon  stay-connected warm socket (host wrapper target)",
      "",
      "Never point a host wrapper at pair.",
    ].join("\n"),
  );
  process.exitCode = 1;
}

await main();
