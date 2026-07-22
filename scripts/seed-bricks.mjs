import { readFileSync } from "fs";

function loadEnv(path) {
  const raw = readFileSync(path, "utf-8");
  const env = {};
  for (const line of raw.split("\n")) {
    const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*?)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return env;
}

const env = loadEnv(".env.local");
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error("Missing SUPABASE env vars");
  process.exit(1);
}

const headers = {
  apikey: serviceKey,
  Authorization: `Bearer ${serviceKey}`,
  "Content-Type": "application/json",
  Prefer: "return=minimal",
};

// Get first user from auth
const authRes = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
  headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
});
const authData = await authRes.json();
const user = authData.users?.[0];

if (!user) {
  console.error("No users found. Create one first via /admin/login");
  process.exit(1);
}

const avatar =
  user.user_metadata?.avatar_url ||
  user.user_metadata?.picture ||
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80";
const name =
  user.user_metadata?.full_name ||
  user.user_metadata?.name ||
  user.email?.split("@")[0] ||
  "Leitor Orange Brick";

const now = new Date().toISOString();
const posts = [
  {
    user_id: user.id,
    author_name: name,
    author_avatar: avatar,
    content:
      "Testando o novo Brickboard com banco de dados! Finalmente saímos do localStorage e fomos para o Supabase. Responde aí pra ver se os comentários tão funcionando.",
    platform_tag: "[PC]",
    is_pinned: true,
    created_at: now,
  },
  {
    user_id: user.id,
    author_name: name,
    author_avatar: avatar,
    content: "Segundo post de teste — votem na enquete e testem as reações! 🚀",
    platform_tag: "[PS5]",
    is_pinned: false,
    created_at: new Date(Date.now() - 60000).toISOString(),
  },
];

const res = await fetch(`${supabaseUrl}/rest/v1/community_posts`, {
  method: "POST",
  headers,
  body: JSON.stringify(posts),
});

if (!res.ok) {
  const text = await res.text();
  console.error(`HTTP ${res.status}: ${text}`);
  process.exit(1);
}

console.log("✅ 2 demo bricks created!");
process.exit(0);
