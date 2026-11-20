import { execFileSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");

dotenv.config({ path: path.join(projectRoot, ".env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY ausente.");
  process.exit(1);
}

function getDiskUsage(mount = "/") {
  const out = execFileSync("df", ["-B1", mount], { encoding: "utf8" });
  const lines = out.trim().split("\n");
  const parts = lines[lines.length - 1].trim().split(/\s+/);
  const totalBytes = Number(parts[1]) || 0;
  const usedBytes = Number(parts[2]) || 0;
  const availBytes = Number(parts[3]) || 0;
  const percent = totalBytes > 0 ? Math.round((usedBytes / totalBytes) * 1000) / 10 : 0;
  return {
    filesystem: parts[0] || mount,
    mount: parts[5] || mount,
    totalBytes,
    usedBytes,
    availBytes,
    percent,
  };
}

function getSwapUsage() {
  try {
    const out = execFileSync("free", ["-b"], { encoding: "utf8" });
    const swapLine = out.split("\n").find((line) => line.toLowerCase().startsWith("swap:"));
    if (!swapLine) return { totalBytes: 0, usedBytes: 0, freeBytes: 0, percent: 0 };
    const parts = swapLine.trim().split(/\s+/);
    const totalBytes = Number(parts[1]) || 0;
    const usedBytes = Number(parts[2]) || 0;
    const freeBytes = Number(parts[3]) || 0;
    const percent = totalBytes > 0 ? Math.round((usedBytes / totalBytes) * 1000) / 10 : 0;
    return { totalBytes, usedBytes, freeBytes, percent };
  } catch {
    return { totalBytes: 0, usedBytes: 0, freeBytes: 0, percent: 0 };
  }
}

function getMemoryUsage() {
  try {
    const out = execFileSync("free", ["-b"], { encoding: "utf8" });
    const memLine = out.split("\n").find((line) => line.toLowerCase().startsWith("mem:"));
    if (memLine) {
      const parts = memLine.trim().split(/\s+/);
      const totalBytes = Number(parts[1]) || 0;
      const usedBytes = Number(parts[2]) || 0;
      const availBytes = Number(parts[6]) || Number(parts[3]) || 0;
      const percent = totalBytes > 0 ? Math.round((usedBytes / totalBytes) * 1000) / 10 : 0;
      return { totalBytes, usedBytes, availBytes, percent };
    }
  } catch {
    // fallback to os module
  }
  const totalBytes = os.totalmem();
  const availBytes = os.freemem();
  const usedBytes = Math.max(0, totalBytes - availBytes);
  const percent = totalBytes > 0 ? Math.round((usedBytes / totalBytes) * 1000) / 10 : 0;
  return { totalBytes, usedBytes, availBytes, percent };
}

function getFolderSizeBytes(targetPath) {
  try {
    const out = execFileSync("du", ["-sb", targetPath], { encoding: "utf8", timeout: 15000 });
    const bytes = Number(out.trim().split(/\s+/)[0]);
    return Number.isFinite(bytes) ? bytes : 0;
  } catch {
    return 0;
  }
}

function collectFolders() {
  const candidates = [
    { label: "OrangeBrick / tmp", path: path.join(projectRoot, "tmp") },
    { label: "OrangeBrick / public/long-videos", path: path.join(projectRoot, "public/long-videos") },
    { label: "OrangeBrick / node_modules", path: path.join(projectRoot, "node_modules") },
    { label: "OrangeBrick / .next", path: path.join(projectRoot, ".next") },
    { label: "OrangeBrick / .git", path: path.join(projectRoot, ".git") },
  ];
  return candidates
    .map((item) => ({
      label: item.label,
      bytes: getFolderSizeBytes(item.path),
    }))
    .filter((item) => item.bytes > 0)
    .sort((a, b) => b.bytes - a.bytes);
}

const snapshot = {
  collectedAt: new Date().toISOString(),
  hostname: os.hostname(),
  platform: `${os.type()} ${os.release()}`,
  uptimeSeconds: Math.floor(os.uptime()),
  cpu: {
    cores: os.cpus().length,
    load1: Number(os.loadavg()[0].toFixed(2)),
    load5: Number(os.loadavg()[1].toFixed(2)),
    load15: Number(os.loadavg()[2].toFixed(2)),
  },
  disk: getDiskUsage("/"),
  memory: getMemoryUsage(),
  swap: getSwapUsage(),
  folders: collectFolders(),
};

const res = await fetch(`${supabaseUrl}/rest/v1/bot_state?on_conflict=key`, {
  method: "POST",
  headers: {
    apikey: supabaseKey,
    Authorization: `Bearer ${supabaseKey}`,
    "Content-Type": "application/json",
    Prefer: "resolution=merge-duplicates,return=minimal",
  },
  body: JSON.stringify({
    key: "infra:vps-health",
    value: JSON.stringify(snapshot),
    updated_at: snapshot.collectedAt,
  }),
});

if (!res.ok) {
  const text = await res.text();
  console.error(`Falha ao enviar telemetria da VPS (${res.status}): ${text}`);
  process.exit(1);
}

console.log(
  `VPS health atualizado (${snapshot.hostname}): disco ${snapshot.disk.percent}% (${(snapshot.disk.usedBytes / 1024 ** 3).toFixed(1)}/${(snapshot.disk.totalBytes / 1024 ** 3).toFixed(1)} GB), RAM ${snapshot.memory.percent}%`
);
