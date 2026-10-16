import { createClient } from "@supabase/supabase-js";
import { validateStoredEditorialPost } from "../src/lib/content-validation.ts";
import { inspectPublicationImagesInDatabase } from "../src/lib/server/manual-publication-images.ts";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  const { data: posts, error } = await supabase
    .from("posts")
    .select("*")
    .eq("is_published", false)
    .is("archived_at", null)
    .order("created_at", { ascending: false });

  if (error || !posts) {
    console.error("Erro:", error);
    return;
  }

  const imagesMap = await inspectPublicationImagesInDatabase(posts, supabase);

  for (const p of posts) {
    const blockers = validateStoredEditorialPost(p);
    const imgBlockers = imagesMap.get(p.id) || [];
    let blocks = [];
    try { blocks = JSON.parse(p.body); } catch {}

    console.log("====================================================");
    console.log("ID:", p.id);
    console.log("SLUG:", p.slug);
    console.log("TITLE:", p.title, `(${p.title.length} chars)`);
    console.log("SUMMARY:", p.summary);
    console.log("IMAGE_URL:", p.image_url);
    console.log("IMAGE_ALT:", p.image_alt);
    console.log("IMAGE_CAPTION:", p.image_caption);
    console.log("BLOCKS COUNT:", blocks.length);
    console.log("BLOCK TYPES:", blocks.map(b => b.type));
    console.log("IMAGES IN BLOCKS:", blocks.filter(b => b.type === "image").map(b => ({ url: b.url, alt: b.alt, caption: b.caption })));
    console.log("SOURCES:", JSON.stringify(p.editorial_sources));
    console.log("QUOTE:", { author: p.quote_author, role: p.quote_role, absence: p.quote_absence_registered });
    console.log("BLOCKERS:", [...blockers, ...imgBlockers]);
  }
}

run();
