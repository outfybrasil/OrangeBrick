import { access, readFile, readdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { backupKeyFingerprint, decryptBackupData, parseBackupEncryptionKey, sha256, storageBackupFilePath } from "./backup-format.mjs";

const backupRoot = resolve(process.argv[2] || "tmp/backups");
const entries = (await readdir(backupRoot, { withFileTypes: true })).filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort().reverse();
if (!entries.length) throw new Error("Nenhum backup encontrado");

const directory = resolve(backupRoot, entries[0]);
const manifestContents = await readFile(resolve(directory, "manifest.json"));
const manifest = JSON.parse(manifestContents.toString("utf8"));
const key = parseBackupEncryptionKey(process.env.BACKUP_ENCRYPTION_KEY);
const keyFingerprint = backupKeyFingerprint(key);
const failures = [];
let checkedTables = 0;
let checkedStorageObjects = 0;
let checkedUsers = false;

if (manifest.encryption?.key_fingerprint !== keyFingerprint) failures.push({ item: "encryption_key", reason: "fingerprint_mismatch" });

for (const table of manifest.tables.filter((item) => item.complete)) {
  try {
    const encrypted = await readFile(resolve(directory, table.file));
    const contents = decryptBackupData(encrypted, key);
    const rows = JSON.parse(contents.toString("utf8"));
    if (!Array.isArray(rows) || rows.length !== table.rows || sha256(contents) !== table.sha256) throw new Error("integrity_mismatch");
    checkedTables += 1;
  } catch (error) {
    failures.push({ item: table.table, reason: error instanceof Error ? error.code || error.message : "verification_failed" });
  }
}

try {
  const encryptedStorageManifest = await readFile(resolve(directory, "storage-manifest.json.enc"));
  const storageContents = decryptBackupData(encryptedStorageManifest, key);
  if (sha256(storageContents) !== manifest.storage_manifest_sha256) throw new Error("storage_manifest_hash_mismatch");
  const storage = JSON.parse(storageContents.toString("utf8"));
  for (const [bucket, objects] of Object.entries(storage)) {
    for (const object of objects) {
      const file = storageBackupFilePath(resolve(directory, "storage"), bucket, object.path);
      const encrypted = await readFile(file);
      const contents = decryptBackupData(encrypted, key);
      if (contents.length !== object.size || sha256(contents) !== object.sha256) throw new Error("storage_object_integrity_mismatch");
      checkedStorageObjects += 1;
    }
  }
} catch (error) {
  failures.push({ item: "storage", reason: error instanceof Error ? error.code || error.message : "verification_failed" });
}

if (manifest.users_complete) {
  try {
    const encryptedUsers = await readFile(resolve(directory, "auth-users.json.enc"));
    const usersContents = decryptBackupData(encryptedUsers, key);
    const users = JSON.parse(usersContents.toString("utf8"));
    if (!Array.isArray(users) || users.length !== manifest.users || sha256(usersContents) !== manifest.users_sha256) throw new Error("users_integrity_mismatch");
    checkedUsers = true;
  } catch (error) {
    failures.push({ item: "auth_users", reason: error instanceof Error ? error.code || error.message : "verification_failed" });
  }
}

const verification = {
  verified: failures.length === 0,
  complete: manifest.complete === true && failures.length === 0,
  created_at: manifest.created_at,
  checked_at: new Date().toISOString(),
  key_fingerprint: keyFingerprint,
  manifest_sha256: sha256(manifestContents),
  checked_tables: checkedTables,
  checked_users: checkedUsers,
  checked_storage_objects: checkedStorageObjects,
  failures,
};
await writeFile(resolve(directory, "verification.json"), JSON.stringify(verification, null, 2));
await access(resolve(directory, "storage-manifest.json.enc"));
process.stdout.write(`${JSON.stringify({ directory, ...verification }, null, 2)}\n`);
if (!verification.complete) process.exitCode = 1;
