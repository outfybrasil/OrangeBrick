import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { isAbsolute, relative, resolve } from "node:path";

export function parseBackupEncryptionKey(value) {
  const encoded = String(value || "").trim();
  const key = Buffer.from(encoded, "base64");
  if (key.length !== 32 || key.toString("base64") !== encoded) throw new Error("BACKUP_ENCRYPTION_KEY must be a 32-byte base64 key");
  return key;
}

export function backupKeyFingerprint(key) {
  return createHash("sha256").update(key).digest("hex").slice(0, 16);
}

export function encryptBackupData(data, key) {
  const nonce = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, nonce);
  const ciphertext = Buffer.concat([cipher.update(data), cipher.final()]);
  const envelope = {
    format: "orange-brick-backup-v1",
    nonce: nonce.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
    ciphertext: ciphertext.toString("base64"),
  };
  return Buffer.from(JSON.stringify(envelope));
}

export function decryptBackupData(envelopeData, key) {
  const envelope = JSON.parse(Buffer.from(envelopeData).toString("utf8"));
  if (envelope.format !== "orange-brick-backup-v1") throw new Error("Unsupported backup format");
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(envelope.nonce, "base64"));
  decipher.setAuthTag(Buffer.from(envelope.tag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(envelope.ciphertext, "base64")), decipher.final()]);
}

export function storageBackupFilePath(root, bucket, objectPath) {
  if (typeof bucket !== "string" || !bucket || typeof objectPath !== "string" || !objectPath) throw new Error("Invalid Storage object path");
  const segments = [bucket, ...objectPath.split("/")];
  if (segments.some((segment) => !segment)) throw new Error("Invalid Storage object path");
  const encodedSegments = segments.map((segment) => Buffer.from(segment).toString("base64url"));
  const base = resolve(root);
  const destination = resolve(base, ...encodedSegments.slice(0, -1), `${encodedSegments.at(-1)}.enc`);
  const destinationRelative = relative(base, destination);
  if (!destinationRelative || destinationRelative.startsWith("..") || isAbsolute(destinationRelative)) throw new Error("Invalid Storage object path");
  return destination;
}

export function sha256(data) {
  return createHash("sha256").update(data).digest("hex");
}
