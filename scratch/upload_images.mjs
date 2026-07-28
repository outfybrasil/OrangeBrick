import { createClient } from "@supabase/supabase-js";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import sharp from "sharp";
import crypto from "node:crypto";

// 1. Ler as variáveis de ambiente do .env.local
async function loadEnv() {
  const envPath = resolve(process.cwd(), ".env.local");
  const envContent = await readFile(envPath, "utf-8");
  const env = {};
  
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const parts = trimmed.split("=");
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const val = parts.slice(1).join("=").trim().replace(/^"|"$/g, "");
      env[key] = val;
    }
  }
  
  return env;
}

async function run() {
  const env = await loadEnv();
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Variáveis do Supabase não configuradas no .env.local");
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const jobs = [
    {
      id: "everquest-legends",
      game: "EverQuest Legends",
      sourceUrl: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcShAjm5LfPSRLZo0KHVs-de_slaKXH2bSnEZJhvINl_Hw&s=10",
    },
    {
      id: "an-eggstremely-hard-game",
      game: "An Eggstremely Hard Game",
      sourceUrl: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRaB6hSoHCAove11mKMZ69-FBQxs49mY-VE2PRTSZ0SdVG458poKZfXVFo&s=10",
    }
  ];

  for (const job of jobs) {
    console.log(`\n=== Processando ${job.game} ===`);
    try {
      // Baixar imagem
      console.log(`Baixando imagem de: ${job.sourceUrl}`);
      const response = await fetch(job.sourceUrl);
      if (!response.ok) throw new Error(`HTTP error ${response.status}`);
      const buffer = Buffer.from(await response.arrayBuffer());

      // Otimizar com Sharp
      console.log("Otimizando com Sharp para 800x450 (16:9)...");
      const outputBuffer = await sharp(buffer)
        .rotate()
        .resize(800, 450, {
          fit: "cover",
          position: "center"
        })
        .webp({ quality: 88, effort: 5 })
        .toBuffer();

      const metadata = await sharp(outputBuffer).metadata();
      const uuid = crypto.randomUUID();
      const storagePath = `editorial/releases/${job.id}/${uuid}.webp`;

      // Upload para o storage
      console.log(`Fazendo upload no storage em: ${storagePath}`);
      const { error: uploadError } = await supabase.storage
        .from("post-images")
        .upload(storagePath, outputBuffer, {
          contentType: "image/webp",
          cacheControl: "31536000",
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Obter URL pública
      const { data: publicData } = supabase.storage
        .from("post-images")
        .getPublicUrl(storagePath);
      const publicUrl = publicData.publicUrl;
      console.log(`Upload concluído! URL pública: ${publicUrl}`);

      // Inserir registro em editorial_images
      console.log("Inserindo registro na tabela editorial_images...");
      const { data: imgData, error: dbError } = await supabase
        .from("editorial_images")
        .insert({
          kind: "release",
          source_url: job.sourceUrl,
          storage_path: storagePath,
          public_url: publicUrl,
          alt_text: job.game,
          width: metadata.width || 800,
          height: metadata.height || 450,
          file_size: outputBuffer.byteLength,
          mime_type: "image/webp",
        })
        .select()
        .single();

      if (dbError) throw dbError;
      console.log("Registro na biblioteca de imagens criado com id:", imgData.id);

      // Atualizar a tabela release_radar_items
      console.log("Atualizando tabela release_radar_items...");
      const { error: updateError } = await supabase
        .from("release_radar_items")
        .update({ image_url: publicUrl })
        .eq("id", job.id);

      if (updateError) {
        console.error(`Erro ao atualizar a tabela de releases do Supabase: ${updateError.message}`);
      } else {
        console.log(`Tabela release_radar_items atualizada com sucesso para ${job.id}!`);
      }
    } catch (err) {
      console.error(`Erro ao processar ${job.game}:`, err);
    }
  }
}

run();
