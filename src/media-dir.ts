/**
 * Durable media directory under the generic share root.
 * Default: ~/.local/share/my-baileys-bridge/media/ at mode 700.
 */

import { homedir } from "node:os";
import { join } from "node:path";
import { chmod, mkdir } from "node:fs/promises";

export const DEFAULT_SHARE_DIR = join(homedir(), ".local", "share", "my-baileys-bridge");

export function shareDir(override?: string): string {
  const fromEnv = process.env.BAILEYS_BRIDGE_HOME?.trim();
  return override?.trim() || fromEnv || DEFAULT_SHARE_DIR;
}

export function authDir(root?: string): string {
  return join(shareDir(root), "auth");
}

export function mediaDir(root?: string): string {
  return join(shareDir(root), "media");
}

export function jidMapPath(root?: string): string {
  return join(shareDir(root), "jid-map.json");
}

export async function ensurePrivateDir(dirPath: string): Promise<string> {
  await mkdir(dirPath, { recursive: true, mode: 0o700 });
  await chmod(dirPath, 0o700);
  return dirPath;
}

export async function ensureMediaDir(root?: string): Promise<string> {
  return await ensurePrivateDir(mediaDir(root));
}

export async function ensureAuthDir(root?: string): Promise<string> {
  return await ensurePrivateDir(authDir(root));
}

export function mediaFilePath(waMsgId: string, ext = "bin", root?: string): string {
  const safe = waMsgId.replace(/[^A-Za-z0-9._-]/g, "_");
  const safeExt = ext.replace(/[^A-Za-z0-9]/g, "") || "bin";
  return join(mediaDir(root), `${safe}.${safeExt}`);
}
