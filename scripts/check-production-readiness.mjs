import { createClient } from "@supabase/supabase-js";
import { access, readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";

const requiredEnvironment = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "CRON_SECRET",
  "NEXT_PUBLIC_VAPID_PUBLIC_KEY",
];

const requiredTables = [
  "admin_audit_log",
  "admin_trash",
  "backup_runs",
  "community_note_votes",
  "community_notes",
  "editorial_revisions",
  "notification_preferences",
  "user_follows",
];
const maximumBackupAgeMs = 24 * 60 * 60 * 1000;
const externalChecksConfirmed = process.env.PRODUCTION_EXTERNAL_CHECKS_CONFIRMED === "true";

const environment = Object.fromEntries(requiredEnvironment.map((name) => [name, Boolean(process.env[name]?.trim())]));
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const database = {};

if (url && serviceRoleKey) {
  const supabase = createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  for (const table of requiredTables) {
    const { error } = await supabase.from(table).select("*").limit(1);
    database[table] = error ? { ready: false, reason: error.code || "query_failed" } : { ready: true };
  }
}

let backup = { ready: false, reason: "not_found" };
const backupRoot = resolve("tmp/backups");
try {
  const entries = (await readdir(backupRoot, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()
    .reverse();
  if (entries.length) {
    const directory = resolve(backupRoot, entries[0]);
    const manifest = JSON.parse(await readFile(resolve(directory, "manifest.json"), "utf8"));
    await access(resolve(directory, "storage-manifest.json"));
    if (manifest.complete !== true) throw Object.assign(new Error("partial_backup"), { code: "partial_backup" });
    const createdAt = manifest.created_at || entries[0];
    const ageMs = Date.now() - new Date(createdAt).getTime();
    backup = Number.isFinite(ageMs) && ageMs <= maximumBackupAgeMs
      ? { ready: true, created_at: createdAt, directory, age_hours: Math.round(ageMs / 360000) / 10 }
      : { ready: false, reason: "stale", created_at: createdAt, directory, age_hours: Math.round(ageMs / 360000) / 10 };
  }
} catch (error) {
  backup = { ready: false, reason: error instanceof Error ? error.code || "invalid" : "invalid" };
}

const missingEnvironment = Object.entries(environment).filter(([, ready]) => !ready).map(([name]) => name);
const missingTables = Object.entries(database).filter(([, result]) => !result.ready).map(([name]) => name);
const ready = missingEnvironment.length === 0 && missingTables.length === 0 && backup.ready && externalChecksConfirmed;
const report = {
  ready,
  environment,
  database,
  backup,
  external_checks: {
    ready: externalChecksConfirmed,
    required: ["Edge Function send-push-notification publicada", "VAPID_PRIVATE_KEY configurada nos secrets do Supabase"],
    confirmation_variable: "PRODUCTION_EXTERNAL_CHECKS_CONFIRMED",
  },
  blockers: {
    missing_environment: missingEnvironment,
    missing_tables: missingTables,
    backup: backup.ready ? null : backup.reason,
    external_checks: externalChecksConfirmed ? null : "not_confirmed",
  },
};

process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
if (!ready) process.exitCode = 1;
