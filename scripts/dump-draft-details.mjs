import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
);

const ids = ["50866e04-53f3-415c-a25a-f7467bdded6d", "e5c0ca0c-a5a1-41f0-8876-70dc372935a5"];

async function run() {
  const { data: posts, error } = await supabase.from("posts").select("*").in("id", ids);
  if (error) { console.error(error); return; }
  for (const p of posts) {
    const { body, ...rest } = p;
    console.log("==================================================");
    console.log(JSON.stringify(rest, null, 2));
    console.log("BODY BLOCKS:", JSON.parse(body).map((b) => b.type));
  }

  const coverUrl = posts.find((p) => p.id === ids[0])?.image_url;
  const { data: registry } = await supabase.from("editorial_images").select("id,kind,source_url,public_url,width,height,post_id").eq("public_url", coverUrl);
  console.log("REGISTRY FOR PHANTOM COVER:", JSON.stringify(registry, null, 2));

  const { data: recent } = await supabase
    .from("posts")
    .select("id,title,image_url,body,published_at")
    .eq("is_published", true)
    .gte("published_at", new Date(Date.now() - 21 * 86400_000).toISOString())
    .order("published_at", { ascending: false })
    .limit(50);
  console.log("RECENT PUBLISHED COUNT (21d):", recent?.length);
  for (const r of recent || []) {
    const images = JSON.parse(r.body).filter((b) => b.type === "image").map((b) => b.url);
    console.log("-", r.published_at, "|", r.title);
    console.log("   cover:", r.image_url);
    for (const u of images) console.log("   body :", u);
  }
}
run();
