import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import sharp from "sharp";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const rows = [
  {
    id: "stalker-2-cost-of-hope",
    game: "S.T.A.L.K.E.R. 2: Cost of Hope",
    release_label: "20 de Agosto",
    release_date: "2026-08-20",
    schedule_label: "Quinta-feira",
    platforms: ["PC", "PS5", "XBOX SERIES"],
    badge: "DLC / Expansão",
    product_type: "dlc",
    is_indie: false,
    sort_order: 8205,
    source: "https://www.youtube.com/watch?v=DhEQ2nXO90M",
    image_url: "https://img.youtube.com/vi/DhEQ2nXO90M/maxresdefault.jpg",
    alt: "Frame oficial do trailer de lançamento de S.T.A.L.K.E.R. 2: Cost of Hope, com a silhueta de um stalker diante da paisagem devastada da Zona de Exclusão.",
  },
  {
    id: "once-human",
    game: "Once Human",
    release_label: "25 de Agosto",
    release_date: "2026-08-25",
    schedule_label: "Terça-feira",
    platforms: ["PS5", "XBOX SERIES"],
    badge: "Lançamento",
    product_type: "game",
    is_indie: false,
    sort_order: 8250,
    source: "https://www.youtube.com/watch?v=YRa7L46q7IE",
    image_url: "https://img.youtube.com/vi/YRa7L46q7IE/maxresdefault.jpg",
    alt: "Frame oficial do trailer de lançamento de Once Human nos consoles, com sobrevivente diante do cenário pós-apocalíptico infestado de anomalias.",
  },
];

async function run() {
  for (const row of rows) {
    const res = await fetch(row.image_url);
    if (!res.ok) throw new Error(`Falha ao baixar ${row.id}: HTTP ${res.status}`);
    const raw = Buffer.from(await res.arrayBuffer());
    const meta = await sharp(raw).metadata();
    if (meta.width < 1200 || meta.width / meta.height < 1.6) {
      throw new Error(`${row.id}: dimensoes fora do padrao (${meta.width}x${meta.height})`);
    }
    const webp = await sharp(raw).webp({ quality: 88 }).toBuffer();
    const webpMeta = await sharp(webp).metadata();

    const storagePath = `editorial/releases/${row.id}/radar-2026.webp`;
    const { error: uploadError } = await supabase.storage
      .from("post-images")
      .upload(storagePath, webp, { contentType: "image/webp", upsert: true, cacheControl: "31536000" });
    if (uploadError) throw uploadError;

    const { data: publicData } = supabase.storage.from("post-images").getPublicUrl(storagePath);
    const check = await fetch(publicData.publicUrl, { method: "HEAD" });
    if (!check.ok) throw new Error(`URL nao acessivel: ${publicData.publicUrl}`);

    const now = new Date().toISOString();
    const { error: topicError } = await supabase.from("topics").upsert(
      { id: row.id, name: row.game, kind: "game", description: `Matérias, lançamentos e conversas sobre ${row.game}.`, image_url: publicData.publicUrl, is_active: true, updated_at: now },
      { onConflict: "id" }
    );
    if (topicError) throw topicError;

    const { error: itemError } = await supabase.from("release_radar_items").upsert(
      { id: row.id, game: row.game, release_label: row.release_label, release_date: row.release_date, schedule_label: row.schedule_label, platforms: row.platforms, image_url: publicData.publicUrl, badge: row.badge, product_type: row.product_type, is_indie: row.is_indie, category: "week", post_slug: null, sort_order: row.sort_order, is_active: true, topic_id: row.id, updated_at: now },
      { onConflict: "id" }
    );
    if (itemError) throw itemError;

    const { data: oldImage } = await supabase.from("editorial_images").select("id").eq("storage_path", storagePath).maybeSingle();
    const { error: imageError } = await supabase.from("editorial_images").upsert(
      { id: oldImage?.id || randomUUID(), post_id: null, kind: "release", source_url: row.source, storage_path: storagePath, public_url: publicData.publicUrl, alt_text: row.alt, width: webpMeta.width, height: webpMeta.height, file_size: webp.length, mime_type: "image/webp", updated_at: now },
      { onConflict: "id" }
    );
    if (imageError) throw imageError;

    console.log("saved", row.id, `${webpMeta.width}x${webpMeta.height}`, publicData.publicUrl);
  }

  const { data, error } = await supabase
    .from("release_radar_items")
    .select("id,game,release_date,platforms,badge,product_type,is_indie,image_url")
    .gte("release_date", "2026-08-01")
    .lte("release_date", "2026-08-31")
    .eq("is_active", true)
    .order("release_date");
  if (error) throw error;
  console.log(JSON.stringify(data, null, 2));
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});