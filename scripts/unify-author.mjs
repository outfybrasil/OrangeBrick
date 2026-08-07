import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: "./.env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const AUTHOR_NAME = "The Brick";

const AUTHOR_TAGS = {
  breaking: "Plantão",
  hardware: "Hard News",
  industry: "Radar",
  modding: "Gambiarra",
  review: "Review",
  opinion: "Opinião",
};

const { data: posts, error: selectError } = await supabase
  .from("posts")
  .select("id, author_name, author_tag, category");

if (selectError) {
  console.error("Falha ao listar posts:", selectError.message);
  process.exit(1);
}

function tagWithoutEmoji(value) {
  return (value || "")
    .replace(/^(?:\u{1F4A3}|\u{1F6E0}\u{FE0F}?|\u{1F4E1}|\u{1F527}|\u{1F3AE}|\u{1F525}|\u{26A1})\s*/u, "")
    .trim();
}

let changed = 0;
for (const post of posts || []) {
  const expectedTag = AUTHOR_TAGS[post.category] || "";
  const currentTag = tagWithoutEmoji(post.author_tag);
  if (post.author_name === AUTHOR_NAME && currentTag === expectedTag) continue;

  const { error: updateError } = await supabase
    .from("posts")
    .update({ author_name: AUTHOR_NAME, author_tag: expectedTag, updated_at: new Date().toISOString() })
    .eq("id", post.id);

  if (updateError) {
    console.error("Falha ao atualizar", post.id, updateError.message);
    continue;
  }
  changed++;
}

console.log(`Posts alinhados para "${AUTHOR_NAME}": ${changed}`);