import { createClient } from "@supabase/supabase-js";
import { readFile } from "node:fs/promises";
import sharp from "sharp";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const SLUG = "ps6-e-xbox-helix-us-1000-podem-derrubar-vendas-em-38";
const DIR = "editorial/ps6-helix-preco-2026";
const TMP = "C:/Users/Teste/AppData/Local/Temp/opencode/";

const sources = [
  {
    key: "cover",
    file: TMP + "ps5pro.jpg",
    storagePath: DIR + "/cover-ps5-pro-oficial.webp",
    width: 1920,
    height: 1080,
    sourceUrl: "https://sonyinteractive.com/tachyon/2024/09/SIE_PS5-Pro.jpg?resize=1920,1080&zoom=1",
    alt: "Console PlayStation 5 Pro branco em foto oficial de imprensa da Sony Interactive Entertainment",
    caption: "Foto oficial do PS5 Pro pela Sony: o console já custa US$ 900 nos Estados Unidos e alimenta a discussão sobre o preço da próxima geração.",
  },
  {
    key: "body1",
    file: TMP + "sharma.jpg",
    storagePath: DIR + "/body-asha-sharma-xbox.webp",
    width: 1920,
    height: 1080,
    sourceUrl: "https://blogs.microsoft.com/wp-content/uploads/2026/02/asha-sharma-matt-booty.jpg",
    alt: "Asha Sharma, CEO da Xbox, ao lado de Matt Booty em foto oficial da Microsoft de fevereiro de 2026",
    caption: "Asha Sharma, CEO da Xbox, em foto oficial da Microsoft: para a executiva, o público de massa não poderá gastar \"milhares de dólares\" em uma geração de console.",
  },
  {
    key: "body2",
    file: TMP + "seriesx.jpg",
    storagePath: DIR + "/body-series-x-oficial.webp",
    width: 1920,
    height: 1080,
    sourceUrl: "https://xboxwire.thesourcemediaassets.com/sites/8/2026/04/Hero_16x9_Family-0bf63a8058e9de1b37a2.jpg",
    alt: "Console Xbox Series X iluminado por luzes de estúdio em foto oficial da Xbox Wire",
    caption: "Foto oficial do Xbox Series X: a Microsoft reajustou os preços da linha em US$ 100 a US$ 150 em agosto de 2026, cenário que embasa as projeções da Ampere Analysis.",
  },
];

async function processSource(s) {
  const raw = await sharp(s.file).rotate().metadata();
  const processed = await sharp(s.file)
    .rotate()
    .resize(s.width, s.height, { fit: "cover", position: "attention" })
    .webp({ quality: 88 })
    .toBuffer();
  console.log(`${s.key}: fonte nativa ${raw.width}x${raw.height} -> saida ${s.width}x${s.height} webp ${processed.length} bytes`);

  const { error } = await supabase.storage
    .from("post-images")
    .upload(s.storagePath, processed, { contentType: "image/webp", upsert: true, cacheControl: "31536000" });
  if (error) throw new Error(`Upload ${s.key}: ${error.message}`);

  const { data: pub } = supabase.storage.from("post-images").getPublicUrl(s.storagePath);
  const check = await fetch(pub.publicUrl, { method: "HEAD" });
  if (!check.ok) throw new Error(`URL invalida ${s.key}: HTTP ${check.status}`);
  return { ...s, publicUrl: pub.publicUrl, fileSize: processed.length };
}

const processed = [];
for (const s of sources) processed.push(await processSource(s));
const [cover, body1, body2] = processed;

const { data: post, error: postError } = await supabase
  .from("posts")
  .select("id,image_url,image_alt,body")
  .eq("slug", SLUG)
  .single();
if (postError) throw postError;

const blocks = JSON.parse(post.body);
const imgBlocks = blocks.filter((b) => b.type === "image");
if (imgBlocks.length !== 2) throw new Error(`Esperava 2 blocos de imagem, achei ${imgBlocks.length}`);
imgBlocks[0].url = body1.publicUrl;
imgBlocks[0].alt = body1.alt;
imgBlocks[0].caption = body1.caption;
imgBlocks[1].url = body2.publicUrl;
imgBlocks[1].alt = body2.alt;
imgBlocks[1].caption = body2.caption;

const { error: updateError } = await supabase
  .from("posts")
  .update({ image_url: cover.publicUrl, image_alt: cover.alt, body: JSON.stringify(blocks), updated_at: new Date().toISOString() })
  .eq("slug", SLUG);
if (updateError) throw updateError;

const { data: images, error: imagesError } = await supabase
  .from("editorial_images")
  .select("id,kind,storage_path")
  .eq("post_id", post.id);
if (imagesError) throw imagesError;

for (const img of images) {
  const target = img.kind === "cover" ? cover : img.kind === "body" && img.storage_path.includes("analista") ? body1 : body2;
  const { error: upError } = await supabase
    .from("editorial_images")
    .update({
      storage_path: target.storagePath,
      public_url: target.publicUrl,
      source_url: target.sourceUrl,
      alt_text: target.alt,
      width: target.width,
      height: target.height,
      file_size: target.fileSize,
      mime_type: "image/webp",
      updated_at: new Date().toISOString(),
    })
    .eq("id", img.id);
  if (upError) throw upError;
  console.log(`biblioteca atualizada [${img.kind}]`, img.id);
}

const oldPaths = [
  DIR + "/cover-consoles-us-1000.webp",
  DIR + "/body-analista-mercado-graficos.webp",
  DIR + "/body-linha-montagem-semicondutores.webp",
];
for (const p of oldPaths) {
  const { error } = await supabase.storage.from("post-images").remove([p]);
  if (error) console.warn("Aviso ao remover", p, error.message);
  else console.log("removido:", p);
}

console.log("\nATUALIZADO COM SUCESSO!");
console.log("Cover  :", cover.publicUrl);
console.log("Body 1 :", body1.publicUrl);
console.log("Body 2 :", body2.publicUrl);