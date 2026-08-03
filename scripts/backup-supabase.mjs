import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) throw new Error("Configure NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY");

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const timestamp = new Date().toISOString().replaceAll(":", "-");
const outputDirectory = resolve("tmp", "backups", timestamp);
const tables = [
  "posts",
  "profiles",
  "topics",
  "release_radar_items",
  "editorial_images",
  "community_posts",
  "community_comments",
  "community_reactions",
  "community_comment_likes",
  "community_polls",
  "community_poll_votes",
  "community_reports",
  "community_moderation_actions",
  "achievements",
  "user_achievements",
  "xp_events",
  "xp_rules",
  "user_progress",
  "seasons",
  "season_progress",
  "rewards",
  "user_rewards",
  "push_subscriptions",
  "notification_preferences",
  "user_follows",
  "community_notes",
  "community_note_votes",
  "editorial_revisions",
  "admin_trash",
  "admin_audit_log",
];

await mkdir(outputDirectory, { recursive: true });

async function exportTable(table) {
  const rows = [];
  for (let start = 0; ; start += 1000) {
    const { data, error } = await supabase.from(table).select("*").range(start, start + 999);
    if (error) {
      if (error.code === "42P01" || error.code === "PGRST205") return { table, skipped: true, reason: "Tabela inexistente" };
      throw new Error(`${table}: ${error.message}`);
    }
    rows.push(...data);
    if (data.length < 1000) break;
  }
  await writeFile(resolve(outputDirectory, `${table}.json`), JSON.stringify(rows, null, 2));
  return { table, rows: rows.length };
}

async function listStorage(bucket, prefix = "") {
  const objects = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await supabase.storage.from(bucket).list(prefix, { limit: 1000, offset });
    if (error) throw new Error(`${bucket}: ${error.message}`);
    for (const item of data) {
      const path = prefix ? `${prefix}/${item.name}` : item.name;
      if (item.id) objects.push({ path, size: item.metadata?.size || null, updated_at: item.updated_at });
      else objects.push(...await listStorage(bucket, path));
    }
    if (data.length < 1000) break;
  }
  return objects;
}

const tableResults = [];
for (const table of tables) tableResults.push(await exportTable(table));

const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
if (bucketError) throw bucketError;
const storage = {};
for (const bucket of buckets) storage[bucket.name] = await listStorage(bucket.name);
await writeFile(resolve(outputDirectory, "storage-manifest.json"), JSON.stringify(storage, null, 2));

const users = [];
for (let page = 1; ; page += 1) {
  const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
  if (error) throw error;
  users.push(...data.users.map((user) => ({
    id: user.id,
    email: user.email,
    created_at: user.created_at,
    last_sign_in_at: user.last_sign_in_at,
    user_metadata: user.user_metadata,
  })));
  if (data.users.length < 1000) break;
}
await writeFile(resolve(outputDirectory, "auth-users.json"), JSON.stringify(users, null, 2));

const manifest = {
  created_at: new Date().toISOString(),
  project: new URL(url).hostname,
  tables: tableResults,
  users: users.length,
  storage_objects: Object.values(storage).reduce((total, objects) => total + objects.length, 0),
};
await writeFile(resolve(outputDirectory, "manifest.json"), JSON.stringify(manifest, null, 2));
console.log(JSON.stringify({ outputDirectory, ...manifest }, null, 2));
