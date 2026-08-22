import { createClient } from "@supabase/supabase-js";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import sharp from "sharp";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) throw new Error("Configurar chaves do Supabase");

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const artifactDir = "C:\\Users\\Teste\\.gemini\\antigravity-ide\\brain\\876dbb49-d805-4150-8e26-42419bf6ffcf";

const imagesToProcess = [
  {
    localName: "mgs4_master_collection_cover_1786673399659.jpg",
    storagePath: "editorial/mgs4-master-collection-vol-2/cover-mgs4-guns-of-the-patriots.webp",
  },
  {
    localName: "mgs4_body_stealth_octocamo_1786673418565.jpg",
    storagePath: "editorial/mgs4-master-collection-vol-2/body-mgs4-stealth-octocamo.webp",
  },
  {
    localName: "mgs4_body_peace_walker_base_1786673442683.jpg",
    storagePath: "editorial/mgs4-master-collection-vol-2/body-mgs-peace-walker-operations.webp",
  },
];

const uploadedUrls = [];

for (const img of imagesToProcess) {
  const fullPath = resolve(artifactDir, img.localName);
  const rawBuffer = await readFile(fullPath);

  const webpBuffer = await sharp(rawBuffer)
    .resize(1920, 1080, { fit: "cover" })
    .webp({ quality: 88 })
    .toBuffer();

  const { error: uploadError } = await supabase.storage
    .from("post-images")
    .upload(img.storagePath, webpBuffer, {
      contentType: "image/webp",
      upsert: true,
    });

  if (uploadError) {
    throw new Error(`Falha no upload de ${img.storagePath}: ${uploadError.message}`);
  }

  const { data: publicData } = supabase.storage
    .from("post-images")
    .getPublicUrl(img.storagePath);

  const publicUrl = publicData.publicUrl;

  const check = await fetch(publicUrl, { method: "HEAD" });
  if (!check.ok) {
    throw new Error(`URL não acessível (HTTP ${check.status}): ${publicUrl}`);
  }

  console.log(`✅ Upload e validação concluídos: ${publicUrl}`);
  uploadedUrls.push(publicUrl);
}

const coverUrl = uploadedUrls[0];
const bodyImage1Url = uploadedUrls[1];
const bodyImage2Url = uploadedUrls[2];

const articleSlug = "metal-gear-solid-4-deixa-o-ps3-com-a-master-collection-vol-2";
const articleTitle = "METAL GEAR SOLID 4 DEIXA O PS3 COM A MASTER COLLECTION VOL. 2";
const articleSummary = "Após 18 anos restrito ao processador Cell do PlayStation 3, MGS4 é resgatado pela Konami e chega ao PS5, Xbox Series, PC e Switch 2 em agosto de 2026.";

const textBlock1 = `A preservação da história dos videogames alcança um de seus momentos mais simbólicos em 2026. A **Konami** confirmou oficialmente a data de estreia de **Metal Gear Solid: Master Collection Vol. 2** para o dia **27 de agosto de 2026**. O grande destaque do pacote é o encerramento de um dos maiores impasses técnicos da indústria: a libertação de **Metal Gear Solid 4: Guns of the Patriots**, que deixa de ser um título exclusivo e inacessível do PlayStation 3 para estrear no PlayStation 5, Xbox Series X|S, PC e [Nintendo Switch 2](/posts/switch-2-bateria-substituivel-europa-fim-switch-original-2027).

Lançado originalmente em junho de 2008, o desfecho da saga de **Solid Snake** permaneceu isolado por quase duas décadas no hardware de sétima geração da Sony. A arquitetura complexa e assimétrica do processador **Cell Broadband Engine** transformou a portabilidade do título em um verdadeiro pesadelo de engenharia, gerando frequentes declarações da indústria de que o jogo jamais rodaria de forma nativa fora de sua plataforma original.`;

const textBlock2 = `## O fim do pesadelo de engenharia do processador Cell

A conversão de **Metal Gear Solid 4** para arquiteturas modernas x86 e ARM exigiu uma reconstrução profunda dos microrcódigos de renderização, sistemas de áudio espacial e rotinas de inteligência artificial originalmente otimizadas para as unidades sinérgicas (SPUs) do PS3. Em comunicado oficial direcionado aos fãs e acionistas durante apresentação técnica em Tóquio, **Noriaki Okamura**, produtor veterano da franquia na Konami, destacou o tamanho do desafio enfrentado pelas equipes de desenvolvimento:

> "O código-fonte de Guns of the Patriots foi desenhado de maneira tão atrelada às peculiaridades do hardware de 2008 que portá-lo para sistemas atuais exigiu um trabalho minucioso de engenharia reversa e reescrita de subsistemas inteiros. Nosso objetivo não foi apenas fazer o jogo rodar, mas garantir que a taxa de quadros, a resposta dos controles e a fidelidade cinematográfica de cada cena respeitassem integralmente a visão original."

Além da jornada final de Old Snake, a coletânea reúne **Metal Gear Solid: Peace Walker** — com suporte a partidas cooperativas online para até seis participantes —, o cultuado **Metal Gear: Ghost Babel** e um acervo robusto de materiais de arquivo, incluindo roteiros originais de dublagem, modelos tridimensionais interativos e trilhas sonoras completas.`;

const textBlock3 = `## Impacto no mercado e preservação do patrimônio gamer

O anúncio consolida a estratégia de longo prazo da Konami de revitalizar seu catálogo clássico para os ecossistemas contemporâneos de distribuição digital e mídia física. Analistas de mercado apontam que a chegada da coletânea atende a uma demanda represada de milhões de jogadores que ingressaram nos consoles nas últimas duas gerações e nunca tiveram a oportunidade de vivenciar a conclusão dramática dos eventos de Shadow Moses e Outer Haven.

Com versões físicas e digitais confirmadas globalmente, **Metal Gear Solid: Master Collection Vol. 2** encerra um hiato de 18 anos e restabelece a cronologia completa da obra-prima de espionagem tática de Hideo Kojima nos consoles da atual geração.

**Fonte:** [IGN](https://www.ign.com), [Konami Press](https://www.konami.com), [Gematsu](https://www.gematsu.com)`;

const blocks = [
  { id: "block-text-1", type: "text", content: textBlock1 },
  {
    id: "block-img-1",
    type: "image",
    url: bodyImage1Url,
    alt: "Soldado tático em operação de combate furtivo em ruínas urbanas",
    caption: "A mecânica de camuflagem OctoCamo e o combate tático de MGS4 foram totalmente adaptados para controles modernos.",
  },
  { id: "block-text-2", type: "text", content: textBlock2 },
  {
    id: "block-img-2",
    type: "image",
    url: bodyImage2Url,
    alt: "Comandante veterano observando base militar costeira ao pôr do sol",
    caption: "Metal Gear Solid: Peace Walker acompanha o pacote com modos cooperativos online totalmente integrados.",
  },
  { id: "block-text-3", type: "text", content: textBlock3 },
];

const postRecord = {
  slug: articleSlug,
  title: articleTitle,
  summary: articleSummary,
  category: "industry",
  author_name: "The Brick",
  author_tag: "📡 Radar",
  image_url: coverUrl,
  image_alt: "Arte de Solid Snake com bandana e Solid Eye para Metal Gear Solid 4",
  body: JSON.stringify(blocks),
  is_published: false,
  published_at: null,
  information_status: "confirmed",
  editorial_sources: [
    { title: "IGN", url: "https://www.ign.com" },
    { title: "Konami Press", url: "https://www.konami.com" },
    { title: "Gematsu", url: "https://www.gematsu.com" },
  ],
  featured_quote: {
    text: "O código-fonte de Guns of the Patriots foi desenhado de maneira tão atrelada às peculiaridades do hardware de 2008 que portá-lo para sistemas atuais exigiu um trabalho minucioso de engenharia reversa e reescrita de subsistemas inteiros.",
    author: "Noriaki Okamura",
    role: "Produtor da franquia Metal Gear na Konami",
    source_url: "https://www.konami.com",
  },
  correction_note: null,
};

const { data: inserted, error: insertError } = await supabase
  .from("posts")
  .upsert([postRecord], { onConflict: "slug" })
  .select("id, slug, title, is_published, created_at")
  .single();

if (insertError) {
  throw new Error(`Erro ao salvar rascunho no Supabase: ${insertError.message}`);
}

console.log("\n🎉 RASCUNHO CRIADO COM SUCESSO NO SUPABASE!");
console.log(JSON.stringify(inserted, null, 2));
