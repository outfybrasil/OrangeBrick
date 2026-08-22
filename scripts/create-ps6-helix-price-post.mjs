import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import sharp from "sharp";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) throw new Error("Configurar chaves do Supabase");

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function generatePrompt(description) {
  return `Imagem fotorrealista de ${description}. Estilo fotografia editorial, iluminação dramática, alta qualidade, resolução 4K. Mostrar o objeto ou a cena principal em um ambiente coerente com a matéria. Sem texto na imagem, sem marcas d'água.`;
}

const imagesToProcess = [
  {
    localName: "cover",
    storagePath: "editorial/ps6-helix-preco-2026/cover-consoles-us-1000.webp",
    prompt: generatePrompt(
      "dois consoles de videogame futuristas da próxima geração — um branco e prateado no estilo da Sony e um preto com detalhes verdes no estilo da Microsoft — exibidos em pedestais de acrílico dentro de uma loja de eletrônicos premium escura, vitrine fechada com cadeado, luzes de LED dramáticas e refletores direcionais, atmosfera de produto de luxo caro"
    ),
  },
  {
    localName: "body1",
    storagePath: "editorial/ps6-helix-preco-2026/body-analista-mercado-graficos.webp",
    prompt: generatePrompt(
      "uma analista de mercado em uma sala de reunião corporativa escura apontando para um grande painel de LED com gráficos de linha em queda vertiginosa e curvas de projeção sem texto legível, modelos de consoles de videogame futuristas pequenos sobre a mesa, iluminação dramática azul e laranja, clima sério de previsão econômica"
    ),
  },
  {
    localName: "body2",
    storagePath: "editorial/ps6-helix-preco-2026/body-linha-montagem-semicondutores.webp",
    prompt: generatePrompt(
      "linha de montagem de alta tecnologia em uma fábrica de semicondutores com robôs manipulando pastilhas de memória brilhantes e placas-mãe de console, mãos de operador com luva de proteção segurando um chip luminoso, luzes limpas brancas e âmbar, profundidade de campo rasa, clima industrial de crise de componentes"
    ),
  },
];

const uploadedUrls = [];

for (const img of imagesToProcess) {
  const seed = Math.floor(Math.random() * 1e9);
  const endpoint = `https://image.pollinations.ai/prompt/${encodeURIComponent(img.prompt)}?width=1600&height=900&nologo=true&enhance=true&model=flux&seed=${seed}`;
  console.log(`Gerando ${img.localName}...`);
  const probe = await fetch(endpoint);
  const contentType = probe.headers.get("content-type")?.split(";")[0] || "";
  if (!probe.ok || !["image/jpeg", "image/png", "image/webp"].includes(contentType)) {
    throw new Error(`Provedor nao retornou imagem valida para ${img.localName}: HTTP ${probe.status} ${contentType}`);
  }
  const raw = Buffer.from(await probe.arrayBuffer());

  const webpBuffer = await sharp(raw)
    .resize(1920, 1080, { fit: "cover" })
    .webp({ quality: 88 })
    .toBuffer();

  const { error: uploadError } = await supabase.storage
    .from("post-images")
    .upload(img.storagePath, webpBuffer, { contentType: "image/webp", upsert: true });

  if (uploadError) throw new Error(`Falha no upload de ${img.storagePath}: ${uploadError.message}`);

  const { data: publicData } = supabase.storage.from("post-images").getPublicUrl(img.storagePath);
  const check = await fetch(publicData.publicUrl, { method: "HEAD" });
  if (!check.ok) throw new Error(`URL nao acessivel (HTTP ${check.status}): ${publicData.publicUrl}`);

  console.log(`OK upload e validacao: ${publicData.publicUrl}`);
  uploadedUrls.push({ url: publicData.publicUrl, path: img.storagePath, size: webpBuffer.length });
}

const [cover, body1, body2] = uploadedUrls;

const articleSlug = "ps6-e-xbox-helix-us-1000-podem-derrubar-vendas-em-38";
const articleTitle = "PS6 E XBOX HELIX A US$ 1.000 PODEM DERRUBAR VENDAS EM 38%";
const articleSummary = "Estudo da Ampere Analysis projeta até 38% menos consoles vendidos em cinco anos se a próxima geração chegar por US$ 1.000; entenda os caminhos para fugir do preço alto.";

const textBlock1 = `Sony e Microsoft podem estar prestes a despejar a próxima geração em um terreno ainda mais hostil do que o atual. Um relatório da consultoria **Ampere Analysis** publicado nesta semana projeta que, se o **PlayStation 6** e o **Xbox Project Helix** chegarem ao mercado por **US$ 1.000**, as vendas combinadas dos dois consoles nos primeiros cinco anos podem ficar até **38% abaixo** do que PlayStation 5 e Xbox Series X\S. Os dados foram divulgados no dia **19 de agosto de 2026** e repercutidos por veículos como **VGC**, **Kotaku**, **Wccftech** e **PlayStation Universe** — uma das poucas análises quantitativas públicas sobre a estratégia de preço da próxima geração.

O cenário não é teórico: o **PS5 Pro**, que nasceu por US$ 700, já custa **US$ 900** nos Estados Unidos por causa da combinação de escassez de componentes e guerras comerciais. A própria Microsoft anunciou em 1º de agosto aumentos de US$ 100 a US$ 150 em toda a linha Xbox Series. Com esse histórico, vários analistas consideram o teto de quatro dígitos uma possibilidade real para a geração de 2028 — e os números da Ampere mostram o impacto que essa etiqueta teria na adoção.`;

const textBlock2 = `## Uma década de inércia custa caro

A projeção desenha o que aconteceria com lançamentos "convencionais e incrementalmente melhorados" em 2028 a US$ 1.000. Segundo a consultoria, o total de aparelhos vendidos por PS6 e Helix em cinco anos seria até **38% menor** que o acumulado de PS5 e Series no mesmo período — em unidades, a Kotaku traduziu a estimativa em cerca de **39 milhões de consoles a menos** nas prateleiras e nas casas dos jogadores.

O efeito não ficaria restrito ao hardware. Pela conta da Ampere, o mercado de jogos e serviços de PlayStation e Xbox seria **US$ 3,4 bilhões menor (12%)** em 2031 do que seria se as duas máquinas tivessem saído por US$ 700. Ou seja: o preço alto não protege a receita; ele encolhe o ecossistema inteiro — menos consoles vendidos, menos assinaturas, menos vendas de software.

Os números têm pano de fundo concreto. A atual geração já vive o pior momento da sua história: em maio, o Xbox teve o pior mês de vendas de hardware já registrado nos Estados Unidos, e o PS5 caiu 58% na comparação anual, pela Circana. O Switch 2 segura o mercado. Para a Ampere, repetir essa fórmula com preço ainda maior é receita de encolhimento.`;

const textBlock3 = `## As três portas de saída apontadas pela Ampere

O relatório, intitulado **"The US$ 1.000 next-gen problem: Why Sony and Microsoft need a new console strategy"**, não se limita ao alerta — ele propõe três caminhos para escapar do preço de quatro dígitos.

A primeira é **adiar a próxima geração para além de 2028**, esticando a vida útil dos consoles atuais enquanto o custo de componentes — sobretudo memória e armazenamento, inflados pela corrida da IA — eventualmente recua. A segunda é manter a janela de 2028, mas bancar a transição com **subsídios maiores de hardware**, novos modelos de monetização, estratégias digitais mais agressivas e canais de venda otimizados. A terceira é mais radical: **inovar no formato e nos casos de uso**, abandonando a corrida gráfica em favor de uma experiência claramente diferente — a estratégia que a Nintendo usou com o Wii para popularizar o console no auge da guerra de especificações.

O alerta bate na porta de Microsoft e Sony em momentos distintos. A CEO do Xbox, **Asha Sharma**, vem dizendo publicamente desde junho que a empresa procura modelos de negócio inéditos para o Helix. A Sony, por outro lado, ainda não definiu sequer a data do PS6 — o próprio CEO da empresa, **Hiroki Totoki**, afirmou há poucos dias que a decisão sobre quando lançar a máquina "ainda não foi tomada".

## O que muda para o jogador brasileiro

Qualquer um desses cenários cai em cascata sobre quem compra hardware no Brasil. O PS5 chegou ao país custando quase **R$ 5.000** na virada da geração, e os reajustes recentes empurraram o console para o patamar mais caro da história em dólar. Um PS6 a US$ 1.000 — ou um Helix por preço similar —, passando por impostos e câmbio, projetaria a próxima geração para uma faixa que a maioria esmagadora dos jogadores simplesmente não alcança, abrindo terreno para os modelos de assinatura e "tudo incluído" que Sharma vem ensaiando.

A resposta da indústria não é apenas uma questão de marketing: é uma decisão estrutural sobre o tamanho do mercado nos próximos dez anos. Se a Ampere estiver certa, o preço de US$ 1.000 não é um detalhe de etiqueta — é a diferença entre uma geração que encolhe e uma que entra para a história.

**Fonte:** [VGC](https://www.videogameschronicle.com/news/launching-ps6-and-xbox-helix-at-1000-could-lead-to-a-nearly-40-drop-in-sales-over-five-years-analyst-warns/), [Kotaku](https://kotaku.com/dire-forecast-predicts-39-million-fewer-consoles-sold-if-ps6-and-xbox-helix-are-1000-2000725914), [TheGamer](https://www.thegamer.com/how-ps6-xbox-project-helix-can-cost-less-than-1000/), [Wccftech](https://wccftech.com/playstation-6-xbox-project-helix-chasing-1000-price-drive-away-buyers-options/), [PlayStation Universe](https://www.psu.com/news/ps6-and-xbox-helix-launching-at-1000-could-see-combined-sales-decline-of-nearly-40-over-5-years-says-analyst/), [Fortune via Thurrott – fala de Asha Sharma](https://www.thurrott.com/games/337186/xbox-ceo-want-to-explore-new-business-models-and-innovations-to-keep-project-helix-affordable)`;

const blocks = [
  { id: "block-text-1", type: "text", content: textBlock1 },
  {
    id: "block-img-1",
    type: "image",
    url: body1.url,
    alt: "Analista de mercado apontando para painel de gráficos de queda na sala de reuniões, representando a projeção de vendas de PS6 e Xbox Helix",
    caption: "A Ampere Analysis projeta até 38% menos consoles vendidos em cinco anos se a próxima geração custar US$ 1.000, com impacto de US$ 3,4 bilhões no mercado até 2031.",
  },
  { id: "block-text-2", type: "text", content: textBlock2 },
  {
    id: "block-img-2",
    type: "image",
    url: body2.url,
    alt: "Linha de montagem de semicondutores com robôs e chips de memória, representando a crise de componentes que infla o preço dos consoles",
    caption: "Memória e armazenamento subiram 2,75 vezes no ciclo atual por causa da demanda de datacenters de IA, o motor por trás da ameaça de um PS6 a US$ 1.000.",
  },
  { id: "block-text-3", type: "text", content: textBlock3 },
];

const postRecord = {
  slug: articleSlug,
  title: articleTitle,
  summary: articleSummary,
  category: "hardware",
  author_name: "The Brick",
  author_tag: "🛠️ Hard News",
  image_url: cover.url,
  image_alt: "Dois consoles de videogame futuristas das próximas gerações da Sony e da Microsoft exibidos em vitrine premium de loja fechada",
  body: JSON.stringify(blocks),
  is_published: false,
  published_at: null,
  information_status: "confirmed",
  editorial_sources: [
    { title: "VGC", url: "https://www.videogameschronicle.com/news/launching-ps6-and-xbox-helix-at-1000-could-lead-to-a-nearly-40-drop-in-sales-over-five-years-analyst-warns/" },
    { title: "Kotaku", url: "https://kotaku.com/dire-forecast-predicts-39-million-fewer-consoles-sold-if-ps6-and-xbox-helix-are-1000-2000725914" },
    { title: "TheGamer", url: "https://www.thegamer.com/how-ps6-xbox-project-helix-can-cost-less-than-1000/" },
    { title: "Wccftech", url: "https://wccftech.com/playstation-6-xbox-project-helix-chasing-1000-price-drive-away-buyers-options/" },
    { title: "PlayStation Universe", url: "https://www.psu.com/news/ps6-and-xbox-helix-launching-at-1000-could-see-combined-sales-decline-of-nearly-40-over-5-years-says-analyst/" },
    { title: "Thurrott – entrevista de Asha Sharma", url: "https://www.thurrott.com/games/337186/xbox-ceo-want-to-explore-new-business-models-and-innovations-to-keep-project-helix-affordable" },
  ],
  featured_quote: {
    text: "Chegamos a um ponto em que será difícil imaginar que o público de massa consiga gastar milhares de dólares em uma geração de console, e por isso vamos começar a ver modelos de negócio radicalmente diferentes entrando em órbita ainda este ano.",
    author: "Asha Sharma",
    role: "CEO da Xbox, em entrevista sobre a estratégia de preço do Project Helix (tradução)",
    source_url: "https://www.thurrott.com/games/337186/xbox-ceo-want-to-explore-new-business-models-and-innovations-to-keep-project-helix-affordable",
  },
  correction_note: null,
};

const { data: inserted, error: insertError } = await supabase
  .from("posts")
  .upsert([postRecord], { onConflict: "slug" })
  .select("id, slug, title, is_published, created_at")
  .single();

if (insertError) throw new Error(`Erro ao salvar rascunho: ${insertError.message}`);
const postId = inserted.id;

const imageRecords = [
  { post_id: postId, kind: "cover", source_url: cover.url, storage_path: imagesToProcess[0].storagePath, public_url: cover.url, alt_text: postRecord.image_alt, width: 1920, height: 1080, file_size: cover.size, mime_type: "image/webp" },
  { post_id: postId, kind: "body", source_url: body1.url, storage_path: imagesToProcess[1].storagePath, public_url: body1.url, alt_text: blocks[1].alt, width: 1920, height: 1080, file_size: body1.size, mime_type: "image/webp" },
  { post_id: postId, kind: "body", source_url: body2.url, storage_path: imagesToProcess[2].storagePath, public_url: body2.url, alt_text: blocks[3].alt, width: 1920, height: 1080, file_size: body2.size, mime_type: "image/webp" },
];

const { error: imageError } = await supabase.from("editorial_images").insert(imageRecords).select();
if (imageError) {
  console.warn("Aviso: post salvo, mas editorial_images falhou:", imageError.message);
} else {
  console.log("OK 3 imagens registradas em editorial_images");
}

console.log("\nRASCUNHO CRIADO COM SUCESSO NO SUPABASE!");
console.log(JSON.stringify(inserted, null, 2));
console.log("\nCover: " + cover.url);
console.log("Body 1: " + body1.url);
console.log("Body 2: " + body2.url);