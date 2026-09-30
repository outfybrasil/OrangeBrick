import { randomBytes } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { parseBackupEncryptionKey } from "./backup-format.mjs";

const file = ".env.local";
let contents = await readFile(file, "utf8");
const newline = contents.includes("\r\n") ? "\r\n" : "\n";
const lines = contents.split(/\r?\n/);
const indexes = lines.map((line, index) => /^\s*(?:export\s+)?BACKUP_ENCRYPTION_KEY\s*=/.test(line) ? index : -1).filter((index) => index >= 0);
if (indexes.length > 1) throw new Error("Remove duplicate BACKUP_ENCRYPTION_KEY entries from .env.local");

if (indexes.length === 1) {
  const index = indexes[0];
  const value = lines[index].split("=").slice(1).join("=").trim();
  if (value) {
    parseBackupEncryptionKey(value);
    process.stdout.write("BACKUP_ENCRYPTION_KEY já está configurada em .env.local.\n");
  } else {
    lines[index] = `BACKUP_ENCRYPTION_KEY=${randomBytes(32).toString("base64")}`;
    await writeFile(file, lines.join(newline), "utf8");
    process.stdout.write("Chave de backup criada em .env.local. Guarde uma cópia separada e protegida para permitir a recuperação.\n");
  }
} else {
  if (lines.at(-1) === "") lines.pop();
  lines.push(`BACKUP_ENCRYPTION_KEY=${randomBytes(32).toString("base64")}`);
  await writeFile(file, lines.join(newline) + newline, "utf8");
  process.stdout.write("Chave de backup criada em .env.local. Guarde uma cópia separada e protegida para permitir a recuperação.\n");
}
