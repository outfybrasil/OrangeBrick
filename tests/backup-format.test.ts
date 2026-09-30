import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import test from "node:test";
import { relative, resolve } from "node:path";
import { backupKeyFingerprint, decryptBackupData, encryptBackupData, parseBackupEncryptionKey, sha256, storageBackupFilePath } from "../scripts/backup-format.mjs";

test("encrypts and authenticates backup data", () => {
  const key = randomBytes(32);
  const original = Buffer.from("dados pessoais e arquivos");
  const encrypted = encryptBackupData(original, key);
  assert.notEqual(encrypted.toString("utf8").includes(original.toString("utf8")), true);
  assert.deepEqual(decryptBackupData(encrypted, key), original);
});

test("rejects modified encrypted backup data", () => {
  const key = randomBytes(32);
  const encrypted = JSON.parse(encryptBackupData(Buffer.from("backup"), key).toString("utf8"));
  encrypted.tag = Buffer.alloc(16).toString("base64");
  assert.throws(() => decryptBackupData(Buffer.from(JSON.stringify(encrypted)), key));
});

test("accepts only canonical 32-byte base64 backup keys", () => {
  const encoded = randomBytes(32).toString("base64");
  assert.equal(parseBackupEncryptionKey(encoded).length, 32);
  assert.throws(() => parseBackupEncryptionKey("short"));
  assert.equal(backupKeyFingerprint(Buffer.from(encoded, "base64")).length, 16);
});

test("maps arbitrary Storage keys to paths contained by the backup directory", () => {
  const root = resolve("tmp", "backup-test");
  const objectFile = storageBackupFilePath(root, "post-images", "../cover with ?#.png");
  const relativePath = relative(root, objectFile);
  assert.equal(relativePath.startsWith(".."), false);
  assert.equal(objectFile.endsWith(".enc"), true);
  assert.equal(sha256(Buffer.from("a")).length, 64);
});
