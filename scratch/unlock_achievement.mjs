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

  const targetUserId = "1428e2cb-5e84-42fb-b3e5-c984fbb9d4bc"; // OrangeBrick
  const achievementSlug = "fundador-brickboard";

  console.log(`Buscando conquista pelo slug: ${achievementSlug}`);
  const { data: achievement, error: achError } = await supabase
    .from("achievements")
    .select("id, name")
    .eq("slug", achievementSlug)
    .single();

  if (achError) {
    console.error("Erro ao buscar conquista:", achError);
    return;
  }

  console.log(`Conquista encontrada: ${achievement.name} (ID: ${achievement.id})`);

  // 1. Garantir que a conquista esteja desbloqueada para o perfil OrangeBrick
  console.log(`\nDesbloqueando conquista para o perfil OrangeBrick (User ID: ${targetUserId})...`);
  const { data: upsertResult, error: upsertError } = await supabase
    .from("user_achievements")
    .upsert({
      user_id: targetUserId,
      achievement_id: achievement.id,
      progress: 1,
      target: 1,
      unlocked_at: new Date().toISOString(),
    })
    .select();

  if (upsertError) {
    console.error("Erro ao desbloquear conquista:", upsertError);
    return;
  }
  console.log("Conquista desbloqueada com sucesso para OrangeBrick!");
  console.log(JSON.stringify(upsertResult, null, 2));

  // 2. Remover a conquista de qualquer outro usuário para garantir exclusividade
  console.log(`\nRemovendo a conquista de outros usuários para garantir exclusividade...`);
  const { data: deleteResult, error: deleteError, count } = await supabase
    .from("user_achievements")
    .delete({ count: "exact" })
    .eq("achievement_id", achievement.id)
    .neq("user_id", targetUserId)
    .select();

  if (deleteError) {
    console.error("Erro ao remover conquista dos outros usuários:", deleteError);
    return;
  }

  console.log(`Removido com sucesso de outros usuários. Total de registros deletados: ${count || 0}`);
  if (deleteResult && deleteResult.length > 0) {
    console.log("Usuários afetados:", JSON.stringify(deleteResult.map(r => r.user_id), null, 2));
  }
}

run();
