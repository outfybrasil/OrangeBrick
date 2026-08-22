import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: posts, error } = await supabase
  .from("posts")
  .select("id, slug, title, category, is_published, created_at, image_url")
  .order("created_at", { ascending: false })
  .limit(20);

if (error) {
  console.error("Error fetching posts:", error);
} else {
  console.log("Recent posts in Supabase (total " + posts.length + "):");
  console.log(JSON.stringify(posts, null, 2));
}
