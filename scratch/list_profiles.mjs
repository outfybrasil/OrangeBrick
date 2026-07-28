import { createClient } from "@supabase/supabase-js";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

async function loadEnv() {
  const envPath = resolve(process.cwd(), ".env.local");
  const envContent = await readFile(envPath, "utf-8");
  const env = {};
  
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const parts = trimmed.split("=");
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const val = parts.slice(1).join("=").trim().replace(/^"|"$/g, "");
      env[key] = val;
    }
  }
  
  return env;
}

async function run() {
  const env = await loadEnv();
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("*");

  if (error) {
    console.error("Erro ao ler perfis:", error);
    return;
  }

  console.log("Perfis encontrados no banco de dados:");
  console.log(JSON.stringify(profiles, null, 2));
}

run();
