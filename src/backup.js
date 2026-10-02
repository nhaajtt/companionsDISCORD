// A daily copy of the data files, so a bad write or a bad edit never loses the settings.
// Copies go to <data>/backups/<day>/ and only the newest few days are kept.
import { copyFileSync, existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import path from "node:path";

const KEEP_DAYS = 7;

/** Copies every top-level .json file of `dataDir` into backups/<day>/ unless that day already has a backup. Returns the copied file names. */
export function backupData(dataDir, day, { keep = KEEP_DAYS } = {}) {
  const target = path.join(dataDir, "backups", day);
  if (existsSync(target) || !existsSync(dataDir)) return [];
  const files = readdirSync(dataDir).filter((name) => name.endsWith(".json"));
  mkdirSync(target, { recursive: true });
  for (const name of files) copyFileSync(path.join(dataDir, name), path.join(target, name));

  const days = readdirSync(path.join(dataDir, "backups")).filter((name) => /^\d{4}-\d{2}-\d{2}$/.test(name)).sort();
  for (const old of days.slice(0, Math.max(0, days.length - keep))) rmSync(path.join(dataDir, "backups", old), { recursive: true, force: true });
  return files;
}
