/**
 * One-shot device-code pairing. Write auth (700). Exit.
 * Never used as the long-running host wrapper.
 *
 * Phone placeholder: 10000000000 (digits only, no +).
 */

import { ensureAuthDir, ensurePrivateDir, shareDir } from "./media-dir.ts";

export type PairOptions = {
  /** Digits only, e.g. 10000000000 */
  phoneDigits?: string;
  shareRoot?: string;
};

export async function pair(options: PairOptions = {}): Promise<void> {
  const phoneDigits = (options.phoneDigits ?? process.env.WA_PAIR_PHONE ?? "10000000000").replace(
    /\D/g,
    "",
  );
  if (!phoneDigits) {
    throw new TypeError("pair requires digits-only phone (placeholder: 10000000000)");
  }

  const root = await ensurePrivateDir(shareDir(options.shareRoot));
  const authPath = await ensureAuthDir(root);

  // const { state, saveCreds } = await useMultiFileAuthState(authPath);
  // if (state.creds.registered) {
  //   console.error("Already registered. Use daemon.");
  //   return;
  // }
  // const sock = makeWASocket({ auth: state, printQRInTerminal: false });
  // sock.ev.on("creds.update", saveCreds);
  // const code = await sock.requestPairingCode(phoneDigits);
  // console.error(`Pairing code: ${code}`);
  // wait until connection open → close socket → process.exit(0)

  console.error(
    [
      "Scaffold pair (illustrative):",
      `  share: ${root}`,
      `  auth:  ${authPath} (mode 700)`,
      `  phone: ${phoneDigits}`,
      "  next:  requestPairingCode, persist creds, exit.",
      "  never: start inbound/outbound from pair.",
    ].join("\n"),
  );
}

export async function runPairCli(): Promise<void> {
  await pair();
}
