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

const artifactDir = "C:\\Users\\Teste\\AppData\\Local\\Temp\\opencode\\gta6\\mec";

const imagesToProcess = [
  {
    localName: "cover_vintage.jpg",
    storagePath: "editorial/gta-6-mecanicas-vazadas-2026/cover-jason-lucia-vintage.webp",
  },
  {
    localName: "lucia_vicecity.jpg",
    storagePath: "editorial/gta-6-mecanicas-vazadas-2026/body-lucia-vice-city.webp",
  },
  {
    localName: "buggy.jpg",
    storagePath: "editorial/gta-6-mecanicas-vazadas-2026/body-vapid-dominator-buggy.webp",
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

  console.log(`OK upload e validacao: ${publicUrl}`);
  uploadedUrls.push({ url: publicUrl, path: img.storagePath });
}

const coverUrl = uploadedUrls[0].url;
const bodyImage1Url = uploadedUrls[1].url;
const bodyImage2Url = uploadedUrls[2].url;

const articleSlug = "gta-6-mecanicas-novas-reveladas-pelo-gameplay-vazado";
const articleTitle = "GTA 6: TODAS AS MECÂNICAS NOVAS REVELADAS PELO GAMEPLAY VAZADO";
const articleSummary = "Combustível, estamina, seis estrelas, moralidade e muito mais: dissecamos cada sistema mostrado no gameplay vazado de GTA 6 antes da apresentação de 27 de agosto.";

const textBlock1 = `Nove dias antes da maior apresentação já anunciada pela Rockstar Games, o mundo pôde finalmente ver **Grand Theft Auto VI** rodando de verdade — por um caminho que ninguém queria. Na terça-feira, **18 de agosto de 2026**, o grupo que se identifica como **Cyberleek** publicou dois vídeos de gameplay e o mapa completo de Leonida, levando o fandom a um daqueles raros momentos em que vazamento vira aula magna de design. O material foi derrubado das plataformas por pedidos de remoção da **Take-Two Interactive**, o que elevou a confiança na autenticidade das gravações, aparentemente retiradas de uma build de **2023**.

Antes de qualquer coisa, o aviso de praxe: nada disso foi confirmado pela Rockstar, que segue em silêncio sobre o vazamento, e os sistemas exibidos pertencem a uma versão com pelo menos três anos de desenvolvimento pela frente. Tudo o que está aqui pode ter mudado, sido cortado ou nem chegar ao lançamento. Dito isso, o material é o retrato mais completo das intenções mecânicas do estúdio desde o anúncio do jogo — e merece ser dissecado sistema por sistema.`;

const textBlock2 = `## Combate, estamina e o peso das lutas de rua

O ponto alto das gravações é a briga corpo a corpo. Em uma das cenas, Jason bate de frente com o motorista de um caminhão de entregas após uma colisão na rodovia — e o que se vê não tem nada a ver com o "esmurrar até cair" dos GTA anteriores. A luta acompanha a escola de **Red Dead Redemption 2**: golpes com braço e perna, desarmes em tempo real, chutes que jogam o adversário no chão e até ângulos de câmera em câmera lenta no momento do nocaute. Quando o oponente cai, Jason pega uma **chave inglesa** deixada para trás e continua a sessão de pancadaria com a arma improvisada.

Duas novidades de interface andam junto com o novo combate. A primeira é uma **barra de estamina** que aparece durante a briga e se esgota a cada soco; quando chega a zero, as bordas da tela escurecem, sinalizando exaustão — correr, lutar e qualquer esforço prolongado passa a cobrar um preço físico. A segunda é um **ícone de moralidade** que surge ao lado do HUD depois que Jason espanca um motorista indefeso: um símbolo negativo, apontado pela comunidade como um provável sistema de honra ou reputação nos moldes da honra do velho oeste de RDR2.

Outras práticas de combate e furtividade já haviam sido confirmadas por trailers e pelo site oficial: a posição de **prone** (deitar no chão) para se infiltrar, **algemas plásticas** para deter NPCs sem matá-los, **escudos humanos** em tiroteios, troca de mão de apoio das armas e NPCs que reagem se o jogador andar armado em público — obrigando Jason ou Lucia a guardar a arma automaticamente.`;

const textBlock3 = `## Arsenal limitado e o carro como depósito

O vazamento reforça o esforço da Rockstar em transformar o inventário em decisão tática. Na cena em que Jason volta ao próprio veículo, a interface exibe opções de **Storage** (depósito) e **Loadout** (carregamento), com capacidade de **0/4** — um limite claro de itens guardados no carro. Já era sabido, por materiais oficiais, que o jogador só carrega **duas pistolas e dois rifles** por vez, com o restante da coleção trancado em armários e porta-malas, no mesmo espírito de gestão de recursos de Red Dead Redemption 2. As lojas **Ammu-Nation** voltam como vendedoras de armas, com personalização mais profunda que no GTA V.

Outro detalhe da mesma cena: ao se aproximar do carro, o jogo exibe um cartão com **marca e modelo do veículo**, acompanhado de ícones de **combustível e motor**. A leitura da comunidade é direta: pela primeira vez na franquia, carros podem consumir gasolina — e talvez quebrar sem explodir. O assunto já virou o primeiro grande debate público do jogo, entre quem adora a camada extra de imersão e quem teme postos de gasolina obrigatórios no meio da fuga. O porta-malas como bodega de armas, aliás, era uma das mecânicas mais pedidas desde o vazamento de **2022**, quando os 90 vídeos da build antiga já mostravam interação com veículos em plena perseguição policial.

O pacote de direção segue grande: mais de **200 veículos** com interiores interativos — banco ajustável, volante e painel funcionais —, além de tráfego denso em rodovias, viaturas de polícia dirigíveis e um sistema de "bypass de imobilizador" visto em material oficial, espécie de minigame para roubar carros de luxo sem danificá-los.`;

const textBlock4 = `## Polícia esperta: seis estrelas e identificação

O HUD do novo gameplay trouxe de volta um pedido de décadas: as **seis estrelas de procurado**. Na cena do crime, duas estrelas acesas aparecem acompanhadas de outras quatro apagadas — sinal de que o nível máximo de resposta voltou ao patamar que permitia mobilizar o exército, algo que o GTA V tinha reduzido para cinco níveis.

Mais interessante, porém, é o que fica por baixo das estrelas. Um conjunto de ícones parece representar **quanto a polícia sabe sobre o suspeito**: a roupa que Jason veste, o carro que ele dirige, a região onde foi visto pela última vez. A implicação para o gameplay é enorme — trocar de camisa, abandonar o veículo e se afastar da área deixariam de ser gestos decorativos e passariam a influenciar de verdade a caçada. Em vez de apenas dirigir até sair do raio, o jogador teria de despistar a investigação.

O conjunto fecha com a direção de polícia mais "humana" já listada para a série: agentes que demoram a chegar ao local (sem spawn na sua frente), escalada por etapas, opção de se render e áreas privadas onde estacionar já provoca hostilidade imediata da segurança — como mostra uma cena do próprio vazamento, sem que um único tiro precise ser disparado.

## Progressão, economia e mundo vivo

Entre as surpresas, uma atividade banal virou manchete: jogar **basquete**. Na gravação, Jason arremessa bolas de três e a interface registra ganho em um atributo chamado **Focus** — uma pista clara de sistema de atributos de personagem no estilo RPG, expandindo a lógica de saúde, stamina e mira de RDR2 para um leque maior de atividades. A malha completa de atributos, no entanto, segue desconhecida.

A economia também ganhou camadas: o HUD mostra **dois contadores de dinheiro** simultâneos, separando o que Jason carrega na carteira do que mantém guardado, provavelmente em conta ou em um esconderijo. O mapa vazado, por sua vez, divide Leonida em **cinco condados** — Vice-Dale, Mariana, Kelly, Leonard e Lummox —, com área estimada em até duas vezes o mapa de GTA V, e aponta a volta de **animais lendários** para caça, nos moldes de RDR2. Relógios com hora real no pulso dos protagonistas, chapéus que caem e podem ser recolhidos dos adversários, tempestades e furacões dinâmicos e NPCs com rotinas diárias completam o retrato de um mundo que simula mais do que apenas decora.

## O que falta confirmar em 27 de agosto

Nenhuma fala oficial da Rockstar veio a público sobre o vazamento até o fechamento desta matéria. Enquanto o grupo Cyberleek, além do gameplay, pediu em nota o fim das **pré-vendas digitais** — "se os publishers querem receita antes do lançamento, que prensem discos", afirmou o grupo —, entidades como a **Stop Killing Games** condenaram publicamente os vazadores e pediram que ninguém envie dinheiro a eles, já que o coletivo também promove uma criptomoeda própria.

A resposta dos fatos chega em **27 de agosto de 2026**, às 16h no horário de Brasília, com a estreia de **Grand Theft Auto VI: An Extended Look** na **Netflix**, seguida de exibição no YouTube oficial e no site do jogo. É ali que os fãs descobrirão quais das mecânicas dissecadas aqui sobreviveram aos três anos de desenvolvimento que separam a build vazada do lançamento de **19 de novembro de 2026**.

**Fonte:** [Kotaku](https://kotaku.com/all-the-new-details-we-spotted-in-the-leaked-gta-6-videos-six-star-wanted-level-gas-meter-improved-combat-boosting-stats-with-basketball-2000725524), [Kotaku – Cyberleek](https://kotaku.com/gta-6-leak-group-end-digital-pre-orders-2000725477), [TechTudo](https://www.techtudo.com.br/noticias/2026/08/gta-6-supostos-detalhes-de-gameplay-vazam-antes-de-trailer-na-netflix-edjogos.ghtml), [Polygon](https://www.polygon.com/gta-6-leaks-unmoderated-cyberleek-stop-killing-games), [The Game Post](https://thegamepost.com/gta-6-full-map-leaks-online-counties-islands-huge-unseen-areas/)`;

const blocks = [
  { id: "block-text-1", type: "text", content: textBlock1 },
  {
    id: "block-img-1",
    type: "image",
    url: bodyImage1Url,
    alt: "Lucia caminhando pelas ruas ensolaradas de Vice City, screenshot oficial de GTA 6",
    caption: "O vazamento de 2026 mostra combate corpo a corpo, estamina e furtividade, todos centrados na dupla Jason e Lucia, que podem ser alternados no mundo aberto.",
  },
  { id: "block-text-2", type: "text", content: textBlock2 },
  {
    id: "block-img-2",
    type: "image",
    url: bodyImage2Url,
    alt: "Buggy clássico Vapid Dominator estacionado em cenário de Vice City, screenshot oficial de GTA 6",
    caption: "Combustível, estado do motor e porta-malas como depósito aparecem no gameplay vazado, ao lado de mais de 200 veículos com interiores interativos.",
  },
  { id: "block-text-3", type: "text", content: textBlock3 },
  { id: "block-text-4", type: "text", content: textBlock4 },
];

const postRecord = {
  slug: articleSlug,
  title: articleTitle,
  summary: articleSummary,
  category: "breaking",
  author_name: "The Brick",
  author_tag: "💣 Plantão",
  image_url: coverUrl,
  image_alt: "Arte oficial de Jason e Lucia com visual vintage de Vice City para Grand Theft Auto VI",
  body: JSON.stringify(blocks),
  is_published: false,
  published_at: null,
  information_status: "updated",
  editorial_sources: [
    { title: "Kotaku", url: "https://kotaku.com/all-the-new-details-we-spotted-in-the-leaked-gta-6-videos-six-star-wanted-level-gas-meter-improved-combat-boosting-stats-with-basketball-2000725524" },
    { title: "Kotaku – Cyberleek", url: "https://kotaku.com/gta-6-leak-group-end-digital-pre-orders-2000725477" },
    { title: "TechTudo", url: "https://www.techtudo.com.br/noticias/2026/08/gta-6-supostos-detalhes-de-gameplay-vazam-antes-de-trailer-na-netflix-edjogos.ghtml" },
    { title: "Polygon", url: "https://www.polygon.com/gta-6-leaks-unmoderated-cyberleek-stop-killing-games" },
    { title: "The Game Post", url: "https://thegamepost.com/gta-6-full-map-leaks-online-counties-islands-huge-unseen-areas/" },
  ],
  featured_quote: {
    text: "Se os publishers querem receita antes do lançamento, que prensem discos.",
    author: "Cyberleek",
    role: "grupo que assumiu o vazamento de gameplay de GTA 6 em 18 de agosto de 2026 (tradução)",
    source_url: "https://kotaku.com/gta-6-leak-group-end-digital-pre-orders-2000725477",
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

const postId = inserted.id;

const imageRecords = [
  {
    post_id: postId,
    kind: "cover",
    source_url: coverUrl,
    storage_path: imagesToProcess[0].storagePath,
    public_url: coverUrl,
    alt_text: "Arte oficial de Jason e Lucia com visual vintage de Vice City para Grand Theft Auto VI",
    width: 1920,
    height: 1080,
    file_size: 185000,
    mime_type: "image/webp",
  },
  {
    post_id: postId,
    kind: "body",
    source_url: bodyImage1Url,
    storage_path: imagesToProcess[1].storagePath,
    public_url: bodyImage1Url,
    alt_text: "Lucia caminhando pelas ruas ensolaradas de Vice City, screenshot oficial de GTA 6",
    width: 1920,
    height: 1080,
    file_size: 190000,
    mime_type: "image/webp",
  },
  {
    post_id: postId,
    kind: "body",
    source_url: bodyImage2Url,
    storage_path: imagesToProcess[2].storagePath,
    public_url: bodyImage2Url,
    alt_text: "Buggy clássico Vapid Dominator estacionado em cenário de Vice City, screenshot oficial de GTA 6",
    width: 1920,
    height: 1080,
    file_size: 195000,
    mime_type: "image/webp",
  },
];

const { error: imageError } = await supabase.from("editorial_images").insert([
  imageRecords[0],
  imageRecords[1],
  imageRecords[2],
]).select();

if (imageError) {
  console.warn("Aviso: post salvo, mas editorial_images falhou:", imageError.message);
} else {
  console.log("OK 3 imagens registradas em editorial_images");
}

console.log("\nRASCUNHO CRIADO COM SUCESSO NO SUPABASE!");
console.log(JSON.stringify(inserted, null, 2));
console.log("\nCover: " + coverUrl);
console.log("Body 1: " + bodyImage1Url);
console.log("Body 2: " + bodyImage2Url);