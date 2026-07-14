const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

try {
  // 1. Carregar variáveis do .env.local
  const envPath = path.join(__dirname, "..", ".env.local");
  if (!fs.existsSync(envPath)) {
    throw new Error("Arquivo .env.local não encontrado.");
  }

  const envConfig = fs.readFileSync(envPath, "utf-8");
  const env = {};
  envConfig.split("\n").forEach((line) => {
    const parts = line.split("=");
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const value = parts.slice(1).join("=").trim().replace(/(^['"]|['"]$)/g, "");
      env[key] = value;
    }
  });

  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Variáveis do Supabase ausentes no .env.local.");
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  async function removeBolds() {
    const slugs = [
      "sony-fim-midias-fisicas-playstation-2028",
      "microsoft-tecnologia-disc2digital-converter-jogos-fisicos-xbox"
    ];

    console.log("Iniciando remoção de negritos artificiais (**) das matérias do banco de dados...");

    for (const slug of slugs) {
      const { data: post, error: getError } = await supabase
        .from("posts")
        .select("id, body")
        .eq("slug", slug)
        .single();

      if (getError) {
        console.error(`Erro ao ler post ${slug}:`, getError.message);
        continue;
      }

      let blocks = JSON.parse(post.body);
      let changed = false;

      // Iterar por todos os blocos do post
      blocks = blocks.map((block) => {
        if (block.type === "text") {
          // Remover os asteriscos duplos (**) que criam negrito
          const newContent = block.content.replace(/\*\*/g, "");
          if (newContent !== block.content) {
            block.content = newContent;
            changed = true;
          }
        }
        return block;
      });

      if (changed) {
        const { error: updateError } = await supabase
          .from("posts")
          .update({
            body: JSON.stringify(blocks),
            updated_at: new Date().toISOString()
          })
          .eq("id", post.id);

        if (updateError) {
          console.error(`Erro ao atualizar o post ${slug}:`, updateError.message);
        } else {
          console.log(`✅ Negritos removidos com sucesso do post: ${slug}`);
        }
      } else {
        console.log(`Nenhum negrito encontrado no post: ${slug}`);
      }
    }

    console.log("Processo concluído com sucesso!");
  }

  removeBolds();
} catch (err) {
  console.error("Erro ao rodar script:", err.message);
}
