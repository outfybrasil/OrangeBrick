import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve, relative } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { backupKeyFingerprint, encryptBackupData, parseBackupEncryptionKey, sha256, storageBackupFilePath } from "./backup-format.mjs";
import { REQUIRED_BACKUP_TABLES } from "./backup-schema.mjs";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY);
const encryptionKey = parseBackupEncryptionKey(process.env.BACKUP_ENCRYPTION_KEY);

if (!url || !serviceKey) throw new Error("Configure NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SECRET_KEY ou SUPABASE_SERVICE_ROLE_KEY");

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const timestamp = new Date().toISOString().replaceAll(":", "-");
const outputDirectory = resolve("tmp", "backups", timestamp);
const storageRoot = resolve(outputDirectory, "storage");

await mkdir(outputDirectory, { recursive: true });

async function listPublicTables() {
  const response = await fetch(`${url}/rest/v1/`, {
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      Accept: "application/openapi+json",
    },
  });
  if (!response.ok) throw new Error("Could not enumerate public Supabase resources");
  const schema = await response.json();
  if (!schema.paths || typeof schema.paths !== "object") throw new Error("Supabase did not return an OpenAPI schema");
  return [...new Set(Object.keys(schema.paths)
    .filter((path) => path !== "/" && !path.startsWith("/rpc/") && /^\/[A-Za-z_][A-Za-z0-9_]*$/.test(path))
    .map((path) => path.slice(1)))].sort();
}

async function exportTable(table) {
  const rows = [];
  let orderById = true;
  for (let start = 0; ; start += 1000) {
    let query = supabase.from(table).select("*");
    if (orderById) query = query.order("id", { ascending: true });
    const result = await query.range(start, start + 999);
    if (result.error && start === 0 && orderById) {
      orderById = false;
      const retry = await supabase.from(table).select("*").range(0, 999);
      if (retry.error) return { table, complete: false, reason: retry.error.code || "query_failed" };
      rows.push(...retry.data);
      if (retry.data.length === 1000) continue;
      break;
    }
    if (result.error) return { table, complete: false, reason: result.error.code || "query_failed" };
    rows.push(...result.data);
    if (result.data.length < 1000) break;
  }
  const contents = Buffer.from(JSON.stringify(rows));
  const file = `${table}.json.enc`;
  await writeFile(resolve(outputDirectory, file), encryptBackupData(contents, encryptionKey));
  return { table, complete: true, rows: rows.length, sha256: sha256(contents), file };
}

async function listStorage(bucket, prefix = "") {
  const objects = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await supabase.storage.from(bucket).list(prefix, { limit: 1000, offset });
    if (error) throw new Error(`${bucket}: ${error.code || "storage_list_failed"}`);
    for (const item of data) {
      const path = prefix ? `${prefix}/${item.name}` : item.name;
      if (item.id) objects.push({ path, size: item.metadata?.size ?? null, updated_at: item.updated_at || null });
      else objects.push(...await listStorage(bucket, path));
    }
    if (data.length < 1000) break;
  }
  return objects;
}

async function exportStorageObject(bucket, object) {
  try {
    const { data, error } = await supabase.storage.from(bucket).download(object.path);
    if (error) return { complete: false, reason: error.statusCode || error.name || "download_failed" };
    const contents = Buffer.from(await data.arrayBuffer());
    if (object.size !== null && contents.length !== Number(object.size)) return { complete: false, reason: "size_mismatch" };
    const file = storageBackupFilePath(storageRoot, bucket, object.path);
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, encryptBackupData(contents, encryptionKey));
    return {
      complete: true,
      entry: {
        path: object.path,
        size: contents.length,
        sha256: sha256(contents),
        updated_at: object.updated_at,
      },
    };
  } catch (error) {
    return { complete: false, reason: error instanceof Error ? error.code || error.name : "download_failed" };
  }
}

async function exportBucket(bucket) {
  const objects = await listStorage(bucket);
  const entries = [];
  let failures = 0;
  for (let index = 0; index < objects.length; index += 5) {
    const batch = await Promise.all(objects.slice(index, index + 5).map((object) => exportStorageObject(bucket, object)));
    for (const result of batch) {
      if (!result.complete) failures += 1;
      else entries.push(result.entry);
    }
  }
  return { entries, failures, listed: objects.length };
}

async function exportUsers() {
  const users = [];
  for (let page = 1; ; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) return { complete: false, reason: error.code || "auth_export_failed" };
    users.push(...data.users.map((user) => ({
      id: user.id,
      email: user.email,
      created_at: user.created_at,
      last_sign_in_at: user.last_sign_in_at,
      user_metadata: user.user_metadata,
    })));
    if (data.users.length < 1000) break;
  }
  const contents = Buffer.from(JSON.stringify(users));
  await writeFile(resolve(outputDirectory, "auth-users.json.enc"), encryptBackupData(contents, encryptionKey));
  return { complete: true, users: users.length, sha256: sha256(contents) };
}

const apiTables = await listPublicTables();
const tableResults = [];
for (const table of apiTables) tableResults.push(await exportTable(table));

const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
if (bucketError) throw new Error(`Storage bucket list failed: ${bucketError.code || "request_failed"}`);
const storage = Object.create(null);
const storageErrors = [];
let storageObjects = 0;
let storageBytes = 0;
for (const bucket of buckets) {
  const result = await exportBucket(bucket.name);
  storage[bucket.name] = result.entries;
  storageObjects += result.entries.length;
  storageBytes += result.entries.reduce((total, entry) => total + entry.size, 0);
  if (result.failures || result.listed !== result.entries.length) storageErrors.push({ bucket: bucket.name, listed: result.listed, downloaded: result.entries.length, failures: result.failures });
}
const storageContents = Buffer.from(JSON.stringify(storage));
await writeFile(resolve(outputDirectory, "storage-manifest.json.enc"), encryptBackupData(storageContents, encryptionKey));
const userResults = await exportUsers();
const missingRequiredTables = REQUIRED_BACKUP_TABLES.filter((table) => !apiTables.includes(table));
const tableFailures = tableResults.filter((table) => !table.complete);
const complete = missingRequiredTables.length === 0 && tableFailures.length === 0 && storageErrors.length === 0 && userResults.complete;
const manifest = {
  format: "orange-brick-encrypted-backup-v1",
  created_at: new Date().toISOString(),
  project: new URL(url).hostname,
  complete,
  encryption: { algorithm: "aes-256-gcm", key_fingerprint: backupKeyFingerprint(encryptionKey) },
  public_tables: apiTables.length,
  tables: tableResults,
  missing_required_tables: missingRequiredTables,
  table_failures: tableFailures.map(({ table, reason }) => ({ table, reason })),
  users: userResults.complete ? userResults.users : null,
  users_sha256: userResults.complete ? userResults.sha256 : null,
  users_complete: userResults.complete,
  users_error: userResults.complete ? null : userResults.reason,
  storage_buckets: buckets.length,
  storage_objects: storageObjects,
  storage_bytes: storageBytes,
  storage_failures: storageErrors,
  storage_manifest_sha256: sha256(storageContents),
};
await writeFile(resolve(outputDirectory, "manifest.json"), JSON.stringify(manifest, null, 2));
const summary = {
  outputDirectory: relative(process.cwd(), outputDirectory),
  complete,
  public_tables: apiTables.length,
  exported_tables: tableResults.filter((table) => table.complete).length,
  missing_required_tables: missingRequiredTables,
  table_failures: tableFailures.length,
  users: manifest.users,
  storage_objects: storageObjects,
  storage_bytes: storageBytes,
  storage_failures: storageErrors,
};
process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
if (!complete) process.exitCode = 1;
