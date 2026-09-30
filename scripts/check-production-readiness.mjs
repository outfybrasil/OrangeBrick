import { createClient } from "@supabase/supabase-js";
import { access, readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { backupKeyFingerprint, parseBackupEncryptionKey, sha256 } from "./backup-format.mjs";
import { REQUIRED_BACKUP_TABLES } from "./backup-schema.mjs";
import { summarizeMigrationReadiness } from "./migration-readiness.mjs";

const requiredEnvironment = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "CRON_SECRET",
  "GEMINI_API_KEY",
  "TELEGRAM_BOT_TOKEN",
  "TELEGRAM_ADMIN_CHAT_ID",
  "NEXT_PUBLIC_VAPID_PUBLIC_KEY",
];

const maximumBackupAgeMs = 24 * 60 * 60 * 1000;
const externalChecksConfirmed = process.env.PRODUCTION_EXTERNAL_CHECKS_CONFIRMED === "true";
const migrationHistoryConfirmed = process.env.PRODUCTION_MIGRATION_HISTORY_CONFIRMED === "true";

const environment = Object.fromEntries(requiredEnvironment.map((name) => [name, Boolean(process.env[name]?.trim())]));
environment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = Boolean(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim());
environment.NEXT_PUBLIC_SUPABASE_ANON_KEY_LEGACY = Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim());
environment.SUPABASE_SECRET_KEY = Boolean(process.env.SUPABASE_SECRET_KEY?.trim());
environment.SUPABASE_SERVICE_ROLE_KEY_LEGACY = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim());
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const database = {};
const columns = {};
const functions = {};

if (url && serviceRoleKey) {
  const supabase = createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  for (const table of REQUIRED_BACKUP_TABLES) {
    const { error } = await supabase.from(table).select("*").limit(1);
    database[table] = error ? { ready: false, reason: error.code || "query_failed" } : { ready: true };
  }
  const editorialHash = await supabase.from("editorial_images").select("content_sha256").limit(1);
  columns["editorial_images.content_sha256"] = editorialHash.error
    ? { ready: false, reason: editorialHash.error.code || "query_failed" }
    : { ready: true };
  const pollResults = await supabase.rpc("community_poll_results", { p_poll_id: "00000000-0000-0000-0000-000000000000" });
  functions.community_poll_results = pollResults.error
    ? { ready: false, reason: pollResults.error.code || "query_failed" }
    : { ready: true };
  const communityFeed = await supabase.rpc("community_feed_page", {
    page_offset: 0,
    search_text: "",
    platform_filter: "",
    article_filter: "",
    topic_filter: "",
    post_filter: "00000000-0000-0000-0000-000000000000",
    feed_order: "latest",
  });
  functions.community_feed_page = communityFeed.error
    ? { ready: false, reason: communityFeed.error.code || "query_failed" }
    : { ready: true };
  const publicKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (publicKey) {
    const publicSupabase = createClient(url, publicKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const publicPollResults = await publicSupabase.rpc("community_poll_results", { p_poll_id: "00000000-0000-0000-0000-000000000000" });
    functions.community_poll_results_anon = publicPollResults.error
      ? { ready: false, reason: publicPollResults.error.code || "query_failed" }
      : { ready: true };
    const publicCommunityFeed = await publicSupabase.rpc("community_feed_page", {
      page_offset: 0,
      search_text: "",
      platform_filter: "",
      article_filter: "",
      topic_filter: "",
      post_filter: "00000000-0000-0000-0000-000000000000",
      feed_order: "latest",
    });
    functions.community_feed_page_anon = publicCommunityFeed.error
      ? { ready: false, reason: publicCommunityFeed.error.code || "query_failed" }
      : { ready: true };
  }
}

let backup = { ready: false, reason: "not_found" };
const backupRoot = resolve("tmp/backups");
try {
  const key = parseBackupEncryptionKey(process.env.BACKUP_ENCRYPTION_KEY);
  const entries = (await readdir(backupRoot, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()
    .reverse();
  if (entries.length) {
    const directory = resolve(backupRoot, entries[0]);
    const manifestContents = await readFile(resolve(directory, "manifest.json"));
    const manifest = JSON.parse(manifestContents.toString("utf8"));
    const verification = JSON.parse(await readFile(resolve(directory, "verification.json"), "utf8"));
    await access(resolve(directory, "storage-manifest.json.enc"));
    await access(resolve(directory, "auth-users.json.enc"));
    const createdAt = manifest.created_at || entries[0];
    const ageMs = Date.now() - new Date(createdAt).getTime();
    const keyMatches = manifest.encryption?.key_fingerprint === backupKeyFingerprint(key)
      && verification.key_fingerprint === backupKeyFingerprint(key);
    const manifestMatches = verification.manifest_sha256 === sha256(manifestContents)
      && verification.created_at === manifest.created_at;
    const backupComplete = manifest.complete === true
      && verification.verified === true
      && verification.complete === true
      && keyMatches
      && manifestMatches;
    const fresh = Number.isFinite(ageMs) && ageMs >= 0 && ageMs <= maximumBackupAgeMs;
    backup = backupComplete && fresh
      ? { ready: true, created_at: createdAt, directory, age_hours: Math.round(ageMs / 360000) / 10, tables: verification.checked_tables, storage_objects: verification.checked_storage_objects }
      : { ready: false, reason: !fresh ? "stale" : !keyMatches ? "encryption_key_mismatch" : !manifest.complete ? "incomplete" : "verification_failed", created_at: createdAt, directory, age_hours: Number.isFinite(ageMs) ? Math.round(ageMs / 360000) / 10 : null };
  }
} catch (error) {
  backup = { ready: false, reason: error instanceof Error ? error.code || (error.message.startsWith("BACKUP_ENCRYPTION_KEY") ? "encryption_key_invalid" : "invalid") : "invalid" };
}

const missingEnvironment = Object.entries(environment)
  .filter(([name, ready]) => !name.endsWith("_LEGACY") && !ready)
  .map(([name]) => name);
const legacyApiKeys = Object.entries(environment)
  .filter(([name, ready]) => name.endsWith("_LEGACY") && ready)
  .map(([name]) => name);
const weakEnvironment = process.env.CRON_SECRET?.trim() && process.env.CRON_SECRET.trim().length < 16
  ? ["CRON_SECRET"]
  : [];
const missingTables = Object.entries(database).filter(([, result]) => !result.ready).map(([name]) => name);
const missingColumns = Object.entries(columns).filter(([, result]) => !result.ready).map(([name]) => name);
const missingFunctions = Object.entries(functions).filter(([, result]) => !result.ready).map(([name]) => name);
let migrations = summarizeMigrationReadiness([], migrationHistoryConfirmed);
try {
  const files = (await readdir(resolve("supabase/migrations"), { withFileTypes: true }))
    .filter((entry) => entry.isFile() && entry.name.endsWith(".sql"))
    .map((entry) => entry.name);
  migrations = summarizeMigrationReadiness(files, migrationHistoryConfirmed);
} catch {
  migrations = { ...migrations, ready: false, local_versions_unique: false, reason: "directory_unavailable" };
}
const ready = missingEnvironment.length === 0 && legacyApiKeys.length === 0 && weakEnvironment.length === 0 && missingTables.length === 0 && missingColumns.length === 0 && missingFunctions.length === 0 && migrations.ready && backup.ready && externalChecksConfirmed;
const report = {
  ready,
  environment_scope: "variáveis do processo atual; não consulta as variáveis configuradas no projeto Vercel",
  environment,
  database,
  columns,
  functions,
  migrations,
  backup,
  external_checks: {
    ready: externalChecksConfirmed,
    required: [
      "Edge Function send-push-notification publicada",
      "VAPID_PRIVATE_KEY configurada nos secrets do Supabase",
      "crons publicados e ativos no deployment de produção",
      "plano e duração de funções compatíveis com a agenda configurada",
      "orangebrick.blog e www.orangebrick.blog adicionados ao projeto Vercel, DNS verificado e HTTPS ativo",
      "NEXT_PUBLIC_SITE_URL de Production definido como https://orangebrick.blog",
    ],
    confirmation_variable: "PRODUCTION_EXTERNAL_CHECKS_CONFIRMED",
  },
  blockers: {
    missing_environment: missingEnvironment,
    legacy_api_keys: legacyApiKeys,
    weak_environment: weakEnvironment,
    missing_tables: missingTables,
    missing_columns: missingColumns,
    missing_functions: missingFunctions,
    duplicate_migration_versions: migrations.duplicate_versions,
    migration_history: migrations.remote_history_confirmed ? null : "not_confirmed",
    backup: backup.ready ? null : backup.reason,
    external_checks: externalChecksConfirmed ? null : "not_confirmed",
  },
};

process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
if (!ready) process.exitCode = 1;
