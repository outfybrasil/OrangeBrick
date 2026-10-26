import { createClient } from "@supabase/supabase-js";
import { validateStoredEditorialPost } from "../src/lib/content-validation.ts";
import { inspectPublicationImagesInDatabase } from "../src/lib/server/manual-publication-images.ts";

const ORDER = [
  "e5c0ca0c-a5a1-41f0-8876-70dc372935a5",
  "50866e04-53f3-415c-a25a-f7467bdded6d",
];

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

async function run() {
  const { data: posts, error } = await supabase.from("posts").select("*").in("id", ORDER);
  if (error || !posts) throw error || new Error("Matérias não encontradas.");

  const byId = new Map(posts.map((post) => [post.id, post]));
  const drafts = ORDER.map((id) => byId.get(id));
  if (drafts.some((post) => !post)) throw new Error("Uma das matérias não foi encontrada.");
  if (drafts.some((post) => post.is_published)) throw new Error("Uma das matérias já está publicada.");

  const imageChecks = await inspectPublicationImagesInDatabase(drafts, supabase);
  const blockers = drafts.flatMap((post) => [
    ...validateStoredEditorialPost(post).map((item) => `${post.slug}: ${item}`),
    ...(imageChecks.get(post.id) || []).map((item) => `${post.slug}: ${item}`),
  ]);
  if (blockers.length) {
    console.error("BLOCKERS:", blockers);
    process.exitCode = 1;
    return;
  }

  const { data: latest } = await supabase.from("posts")
    .select("published_at").eq("is_published", true)
    .order("published_at", { ascending: false }).limit(1).maybeSingle();

  let previous = latest?.published_at ? new Date(latest.published_at).getTime() : 0;
  const published = [];

  for (const post of drafts) {
    const now = Date.now();
    const time = new Date(Math.max(now, previous + 1)).toISOString();
    const { data, error: updateError } = await supabase.from("posts")
      .update({ is_published: true, published_at: time, updated_at: time })
      .eq("id", post.id).eq("is_published", false)
      .select("id,slug,title,published_at,is_published,author_tag,image_url");
    if (updateError) throw new Error(`${post.slug}: ${updateError.message}`);
    if (!data?.length) throw new Error(`${post.slug}: a publicação não foi confirmada.`);
    published.push(data[0]);
    previous = new Date(time).getTime();
  }

  console.log(JSON.stringify(published, null, 2));
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
