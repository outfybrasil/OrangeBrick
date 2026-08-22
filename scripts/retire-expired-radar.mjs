import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const ids = process.argv.slice(2);
if (ids.length === 0) {
  console.error("Uso: node --env-file=.env.local scripts/retire-expired-radar.mjs <id> [id...]");
  process.exit(1);
}

const { data: items, error: itemsError } = await supabase
  .from("release_radar_items")
  .select("id,game,image_url")
  .in("id", ids);
if (itemsError) throw itemsError;

const paths = items
  .map((item) => item.image_url?.split("/object/public/post-images/")[1])
  .filter(Boolean);

for (const id of ids) {
  const imagePaths = paths.filter((path) => path.startsWith(`editorial/releases/${id}/`));
  if (imagePaths.length > 0) {
    const { error: imageError } = await supabase
      .from("editorial_images")
      .delete()
      .in("storage_path", imagePaths);
    if (imageError) throw imageError;
    const { error: storageError } = await supabase.storage
      .from("post-images")
      .remove(imagePaths);
    if (storageError) throw storageError;
  }
  const { error: itemError } = await supabase
    .from("release_radar_items")
    .delete()
    .eq("id", id);
  if (itemError) throw itemError;
  console.log("retirado:", id);
}