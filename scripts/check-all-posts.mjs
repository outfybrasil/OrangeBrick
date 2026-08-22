import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: posts } = await supabase
  .from("posts")
  .select("id, slug, title, summary, category, is_published, created_at")
  .order("created_at", { ascending: false });

console.log(`Total posts in database: ${posts?.length || 0}\n`);
for (const p of posts || []) {
  console.log(`- [${p.is_published ? "PUBLISHED" : "DRAFT"}] ${p.title} (slug: ${p.slug})`);
  console.log(`  Resumo: ${p.summary}\n`);
}
