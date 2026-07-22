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
const res = await fetch(
  `${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/community_posts?select=id,author_name,content,platform_tag,is_pinned&order=created_at.desc`,
  { headers: { apikey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY } }
);
const data = await res.json();
console.log(JSON.stringify(data, null, 2));
