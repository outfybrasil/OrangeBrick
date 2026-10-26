import { createClient } from "@supabase/supabase-js";
import { createHash, randomUUID } from "node:crypto";
import sharp from "sharp";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
);

const phantom = "50866e04-53f3-415c-a25a-f7467bdded6d";
const wilds = "e5c0ca0c-a5a1-41f0-8876-70dc372935a5";

const assets = [
  {
    postId: phantom,
    kind: "body",
    prefix: "body-1",
    sourceUrl: "https://image.api.playstation.com/vulcan/ap/rnd/202608/1021/ab8263b41dab5461640bc7a82b37f4a7313b9fc979906ffb.jpg",
    alt: "Soul, o protagonista de Phantom Blade Zero, salta com a espada contra um inimigo gigantesco em um cenário montanhoso do jogo.",
  },
  {
    postId: phantom,
    kind: "body",
    prefix: "body-2",
    sourceUrl: "https://image.api.playstation.com/vulcan/ap/rnd/202608/1021/1ae965673d5c47e4ee5e6646c49eb450d328bbeb83ef6c0d.jpg",
    alt: "Chefe de Phantom Blade Zero envolto em chamas ataca o jogador em uma vila em ruínas durante uma batalha noturna.",
  },
  {
    postId: wilds,
    kind: "cover",
    prefix: "cover",
    sourceUrl: "https://assets.nintendo.com/image/upload/q_auto/f_auto/store/software/switch2/70010000102602/1572ee453b3f974417a869e508c1fbf10b25776c3ee28d05087d19467e981d6e",
    alt: "Quatro caçadores de Monster Hunter Wilds posam com armas e armaduras no deserto, em arte oficial do Nintendo Switch 2.",
  },
  {
    postId: wilds,
    kind: "body",
    prefix: "body-1",
    sourceUrl: "https://assets.nintendo.com/image/upload/q_auto/f_auto/store/software/switch2/70010000102602/c00c2147a9a9cae723d01ad82a365702eebd21ca9a273cb6800afb3c5cc4c842",
    alt: "Caçador de Monster Hunter Wilds enfrenta um monstro com focinho flamejante em um campo aberto, screenshot oficial do Switch 2.",
  },
  {
    postId: wilds,
    kind: "body",
    prefix: "body-2",
    sourceUrl: "https://assets.nintendo.com/image/upload/q_auto/f_auto/store/software/switch2/70010000102602/fd052f6fd26da1f2aa550890447db086dc738fcf0c40d11e050e792332394dce",
    alt: "Aldeia de Monster Hunter Wilds repleta de NPCs e caçadores ao redor de estruturas de madeira, em imagem oficial do Switch 2.",
  },
];

const inserted = [];

for (const asset of assets) {
  const response = await fetch(asset.sourceUrl, { headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" } });
  if (!response.ok) throw new Error(`${asset.prefix}: HTTP ${response.status}`);
  const contentType = (response.headers.get("content-type") || "").split(";")[0];
  if (!/^image\/(jpeg|png|webp|avif)$/i.test(contentType)) throw new Error(`${asset.prefix}: ${contentType}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  const metadata = await sharp(buffer).metadata();
  if (!metadata.width || !metadata.height || metadata.width < 1200 || metadata.height < 675 || Math.abs(metadata.width / metadata.height - 16 / 9) > 0.02) {
    throw new Error(`${asset.prefix}: dimensões ${metadata.width}x${metadata.height}`);
  }
  const sha256 = createHash("sha256").update(buffer).digest("hex");
  const { data: reused, error: reusedError } = await supabase.from("editorial_images").select("public_url").eq("content_sha256", sha256).limit(1);
  if (reusedError) throw reusedError;
  if (reused?.length) {
    console.log(asset.prefix, "JÁ REGISTRADA", reused[0].public_url);
    inserted.push({ asset, publicUrl: reused[0].public_url });
    continue;
  }
  const ext = contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : "jpg";
  const filename = `editorial/${asset.postId}/${asset.prefix}-${randomUUID()}.${ext}`;
  const { error: uploadError } = await supabase.storage.from("post-images").upload(filename, buffer, {
    contentType,
    cacheControl: "31536000",
    upsert: false,
  });
  if (uploadError) throw uploadError;
  const { data } = supabase.storage.from("post-images").getPublicUrl(filename);
  const publicUrl = `${data.publicUrl.replace("/object/public/", "/render/image/public/")}?width=1920&height=1080&resize=cover&quality=82&format=webp`;
  const { error: registryError } = await supabase.from("editorial_images").insert({
    post_id: asset.postId,
    kind: asset.kind,
    source_url: asset.sourceUrl,
    storage_path: filename,
    public_url: publicUrl,
    alt_text: asset.alt,
    width: metadata.width,
    height: metadata.height,
    file_size: buffer.byteLength,
    mime_type: contentType,
    content_sha256: sha256,
  });
  if (registryError) {
    await supabase.storage.from("post-images").remove([filename]);
    throw registryError;
  }
  console.log(asset.prefix, "OK", metadata.width + "x" + metadata.height, buffer.byteLength, sha256.slice(0, 12));
  inserted.push({ asset, publicUrl });
}

console.log(JSON.stringify(inserted.map(({ asset, publicUrl }) => ({ prefix: asset.prefix, postId: asset.postId, publicUrl })), null, 2));
