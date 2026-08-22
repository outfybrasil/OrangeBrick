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

const artifactDir = "C:\\Users\\Teste\\AppData\\Local\\Temp\\opencode\\gta6";

const imagesToProcess = [
  {
    localName: "cover.jpg",
    storagePath: "editorial/gta-6-vazamentos-2026/cover-capa-oficial.webp",
  },
  {
    localName: "jason_lucia.jpg",
    storagePath: "editorial/gta-6-vazamentos-2026/body-jason-lucia-praia.webp",
  },
  {
    localName: "vice_city.png",
    storagePath: "editorial/gta-6-vazamentos-2026/body-vice-city-skyline.webp",
  },
];

const uploadedUrls = [];

for (const img of imagesToProcess) {
  const ext = img.localName.endsWith(".png") ? "png" : "jpg";
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
  uploadedUrls.push({ url: publicUrl, path: img.storagePath, ext });
}

const coverUrl = uploadedUrls[0].url;
const bodyImage1Url = uploadedUrls[1].url;
const bodyImage2Url = uploadedUrls[2].url;

const articleSlug = "gta-6-vazamentos-mecanicas-e-a-saga-do-grupo-hacker";
const articleTitle = "GTA 6: VAZAMENTOS, MECÂNICAS E A CAÇADA AO GRUPO HACKER";
const articleSummary = "Dos 90 vídeos de 2022 ao leak da Cyberleek em 2026: saga de GTA 6, grupo Lapsus$, mecânicas vazadas e a apresentação de 27 de agosto.";

const textBlock1 = `Faltava menos de uma semana para a maior vitrine da história recente da **Rockstar Games** quando o calvário de vazamentos de **Grand Theft Auto VI** voltou a dominar o noticiário. Na terça-feira, **18 de agosto de 2026**, um coletivo que se identifica como **Cyberleek** (ou CYBERLEEK) despejou na internet vídeos de uma build de 2023 do jogo, além do mapa completo de **Leonida**, o estado fictício inspirado na Flórida que serve de palco para a aventura. O material caiu rapidamente das plataformas sob uma onda de remoções da **Take-Two Interactive**, controladora da Rockstar — movimento que, na prática, virou a principal senha de autenticidade das gravações.

O episódio é o capítulo mais recente de uma saga que começou muito antes do primeiro trailer oficial: nenhum lançamento tão aguardado foi tão esquadrinhado por olhos de fora quanto o novo GTA. Entre furos jornalísticos, filamentos de comunidade e criminosos digitais, a história do que se sabe sobre o jogo se confunde com a história dos grupos que tentaram lucrar ou brincar com a informação. Esta matéria reconstitui essa trajetória completa: do mega vazamento de **setembro de 2022** ao material inédito desta semana, passando pela geopolítica do grupo **Lapsus$**, pelo destino do hacker **Arion Kurtaj** e pelas mecânicas de gameplay que já podem ser listadas com razoável segurança.`;

const textBlock2 = `## O mega vazamento de 2022

Quase tudo o que se sabia sobre **GTA 6** antes da hora nasceu em um único fim de semana, em **18 de setembro de 2022**. O usuário de alias **"teapotuberhacker"** publicou no fórum GTAForums links para cerca de **90 vídeos** de uma versão em desenvolvimento datada de meados de 2021, com modelos simplificados, texturas inacabadas e ferramentas de depuração visíveis na tela. As gravações se espalharam em minutos por Twitter, YouTube e Telegram e foram classificadas na hora pela imprensa especializada como um dos maiores vazamentos da indústria, na mesma prateleira do episódio de *Half-Life 2* nos anos 2000.

No dia seguinte, a própria Rockstar confirmou a autenticidade do material em comunicado amplamente publicado por veículos como [TechCrunch](https://techcrunch.com/2022/09/19/rockstar-games-confirms-gta-6-footage-leak/) e [Pure Xbox](https://www.purexbox.com/news/2022/09/rockstar-games-confirms-gta-6-leak-in-official-statement):

> "Sofremos recentemente uma intrusão de rede na qual um terceiro não autorizado acessou e baixou ilegalmente informações confidenciais de nossos sistemas, incluindo imagens de desenvolvimento inicial do próximo Grand Theft Auto. Neste momento, não prevemos qualquer interrupção em nossos serviços ao vivo nem efeito de longo prazo no desenvolvimento de nossos projetos em andamento."

Na sequência, a companhia afirmou estar "extremamente decepcionada" em ver detalhes vazando daquela forma e reiterou que o trabalho seguiria conforme o planejado. O jornalista **Jason Schreier**, da Bloomberg, confirmou às pressas com fontes internas que as gravações eram genuínas e correspondiam a uma fase muito inicial do projeto. O próprio invasor chegou a exibir um arquivo de código-fonte de cerca de **9.500 linhas** relacionado a scripts do jogo e ameaçou soltar o código completo de GTA 6 e GTA 5 caso a Rockstar não o contatasse em 24 horas pelo Telegram. A empresa não cedeu e a Take-Two abriu uma verdadeira caçada de direitos autorais para derrubar as cópias.`;

const textBlock3 = `## O garoto do quarto de hotel e o grupo Lapsus$

A autoria do ataque de 2022 foi atribuída a **Arion Kurtaj**, então com 17 anos, integrante do coletivo britânico **Lapsus$**, o mesmo grupo por trás de invasões à Nvidia, à Uber, à Microsoft, à Samsung, à Revolut, à BT, à Okta e à Vodafone. Preso por crimes anteriores e mantido sob escolta policial em um hotel em Oxford, na Inglaterra, Kurtaj continuou operando de dentro do quarto: com um **Amazon Fire Stick**, a TV do aposento, um teclado e um celular, ele acessou canais internos da Rockstar por engenharia social e phishing, inclusive mirando um funcionário da unidade indiana da empresa.

O desfecho judicial virou caso quase folclórico. Condenado em **agosto de 2023** por 12 ofensas, incluindo fraude, invasão e chantagem ligadas às intrusões na Nvidia, na Uber e na Rockstar, ele recebeu em **21 de dezembro de 2023** uma internação hospitalar por tempo indeterminado: a Justiça britânica entendeu que, por causa de seu autismo severo, Kurtaj não poderia responder a um julgamento tradicional. Na prática, a sentença — que sai do escopo usual de prisões — deixou em aberto uma longa sombra sobre o caso.

Aos poucos, novas informações foram resgatando o episódio. Em **março de 2026**, mensagens atribuídas a Kurtaj voltaram a circular garantindo que o código-fonte de GTA 6 estaria "definitivamente em algum lugar". Em junho do mesmo ano, relatos da imprensa internacional indicaram que ele teria contrabandeado um celular para dentro da unidade de saúde com a ajuda de um drone, postando em redes sociais a surpresa de que o código ainda não tivesse aparecido publicamente. A Rockstar, que se recusou a pagar qualquer resgate, nunca confirmou se o código completo foi comprometido de fato.`;

const textBlock4 = `## O que o vazamento de 2022 acertou

Praticamente tudo o que os 90 vídeos sugeriram foi confirmado depois por trailers e pelo site oficial: a **Vice City moderna**, os protagonistas **Jason Duval** e **Lucia Caminos** em uma trama de amor e crime ao estilo Bonnie e Clyde, o estado de **Leonida** com praias, pântanos, ilhas e cidades como Port Gellhorn, Grassrivers, Ambrosia, Leonida Keys e o parque Mount Kalaga, além da troca entre os dois personagens dentro do mundo aberto. É a primeira vez na série que um casal protagonista comanda a narrativa.

O material desta semana, apesar de vir de uma build mais antiga, reforçou sistemas que a comunidade já esperava e trouxe novidades. Entre os destaques apontados por coberturas como a do [Kotaku](https://kotaku.com/all-the-new-details-we-spotted-in-the-leaked-gta-6-videos-six-star-wanted-level-gas-meter-improved-combat-boosting-stats-with-basketball-2000725524) e a da [TechTudo](https://www.techtudo.com.br/noticias/2026/08/gta-6-supostos-detalhes-de-gameplay-vazam-antes-de-trailer-na-netflix-edjogos.ghtml):

- **Nível de procurado de seis estrelas**, com policiais que levam tempo para chegar ao local e opção de se render;
- **Barra de estamina** no combate corpo a corpo, com escurecimento da tela quando a energia se esgota;
- **Combate inspirado em Red Dead Redemption 2**, com golpes variados e armas improvisadas recolhidas do chão;
- **Combustível e estado do motor**, com indicadores próprios na interface do veículo;
- **Porta-malas como depósito**, com limite de itens nos menus Storage e Loadout;
- **Dois contadores de dinheiro** ao mesmo tempo, separando o que está na mão do que está guardado;
- um **símbolo de moralidade** exibido após agredir um NPC indefeso, sugerindo honra ou reputação;
- **identificação policial por aparência e veículo**, em vez de apenas proximidade;
- e **atividades físicas que elevam atributos**, como basquete melhorando a pontuação de Focus.

Muita coisa, no entanto, só ganhou versão oficial nos trailers e nas listagens da própria Rockstar: o sistema de **prone** (deitar no chão) para furtividade, algemas plásticas para deter inimigos, escudos humanos em trocas de tiro, limite de arsenal de duas pistolas e dois rifles com o restante guardado no carro, retorno das lojas **Ammu-Nation**, mais de **200 veículos** com interiores interativos, relógios com hora real no pulso dos personagens, iluminação com ray tracing e uma história dividida em capítulos, no ritmo de Red Dead Redemption 2.`;

const textBlock5 = `## A resposta oficial chega em 27 de agosto

Enquanto os fãs digerem o vazamento, a Rockstar prepara a maior vitrine da campanha de GTA 6: **Grand Theft Auto VI: An Extended Look**, uma apresentação que estreia em **27 de agosto de 2026** às 16h no horário de Brasília, primeiro na **Netflix**, e chega cerca de seis horas depois ao canal oficial da empresa no YouTube e ao site do jogo. É a primeira ocasião real em que a companhia promete mostrar o jogo em detalhes — a chance de confirmar ou enterrar boa parte do que foi vazado.

O lançamento está marcado para **19 de novembro de 2026** no **PlayStation 5** e no **Xbox Series X|S**, com versão para PC prevista para depois. A lista de pré-venda indica campanha **single-player** no lançamento, sem GTA Online no primeiro dia. No Brasil, a edição base parte de **R$ 450**, enquanto a Ultimate Edition sai por **R$ 550** e inclui o pacote Vintage Vice City, com roupas e cortes de cabelo clássicos, veículos, armas e homenagens à Vice City dos anos 1980.

A dupla lição da saga é que nenhum estúdio está imune à curiosidade digital e que nenhum vazamento substitui a visão final dos criadores. Depois de uma espera de mais de uma década, GTA 6 caminha para a reta final com um recorde nada invejável de exposição prematura — e com a chance de resetar a narrativa diante dos olhos do mundo no dia 27.

**Fonte:** [TechTudo](https://www.techtudo.com.br/noticias/2026/08/gta-6-supostos-detalhes-de-gameplay-vazam-antes-de-trailer-na-netflix-edjogos.ghtml), [Kotaku](https://kotaku.com), [Rockstar Games](https://www.rockstargames.com/newswire/article/ak3ak31a49a221/grand-theft-auto-vi-is-now-set-to-launch-november-19-2026), [TechCrunch](https://techcrunch.com/2022/09/19/rockstar-games-confirms-gta-6-footage-leak/), [Pure Xbox](https://www.purexbox.com/news/2022/09/rockstar-games-confirms-gta-6-leak-in-official-statement)`;

const blocks = [
  { id: "block-text-1", type: "text", content: textBlock1 },
  {
    id: "block-img-1",
    type: "image",
    url: bodyImage1Url,
    alt: "Jason e Lucia abraçados numa praia de Vice City durante o pôr do sol, arte oficial de GTA 6",
    caption: "A dupla de protagonistas revelada pelo vazamento de 2022 apareceu depois em artes oficiais, confirmando a trama de amor e crime ao estilo Bonnie e Clyde.",
  },
  { id: "block-text-2", type: "text", content: textBlock2 },
  {
    id: "block-img-2",
    type: "image",
    url: bodyImage2Url,
    alt: "Vista panorâmica de Vice City com arranha-céus e avenidas à beira-mar, arte oficial de GTA 6",
    caption: "O retorno à Vice City moderna foi a primeira grande confirmação do vazamento de setembro de 2022, meses antes de qualquer anúncio oficial.",
  },
  { id: "block-text-3", type: "text", content: textBlock3 },
  { id: "block-text-4", type: "text", content: textBlock4 },
  { id: "block-text-5", type: "text", content: textBlock5 },
];

const postRecord = {
  slug: articleSlug,
  title: articleTitle,
  summary: articleSummary,
  category: "industry",
  author_name: "The Brick",
  author_tag: "📡 Radar",
  image_url: coverUrl,
  image_alt: "Capa oficial de Grand Theft Auto VI com os protagonistas Jason e Lucia em primeiro plano e cenas de Vice City ao redor",
  body: JSON.stringify(blocks),
  is_published: false,
  published_at: null,
  information_status: "updated",
  editorial_sources: [
    { title: "TechTudo", url: "https://www.techtudo.com.br/noticias/2026/08/gta-6-supostos-detalhes-de-gameplay-vazam-antes-de-trailer-na-netflix-edjogos.ghtml" },
    { title: "Kotaku", url: "https://kotaku.com/all-the-new-details-we-spotted-in-the-leaked-gta-6-videos-six-star-wanted-level-gas-meter-improved-combat-boosting-stats-with-basketball-2000725524" },
    { title: "Rockstar Games", url: "https://www.rockstargames.com/newswire/article/ak3ak31a49a221/grand-theft-auto-vi-is-now-set-to-launch-november-19-2026" },
    { title: "TechCrunch", url: "https://techcrunch.com/2022/09/19/rockstar-games-confirms-gta-6-footage-leak/" },
    { title: "Pure Xbox", url: "https://www.purexbox.com/news/2022/09/rockstar-games-confirms-gta-6-leak-in-official-statement" },
  ],
  featured_quote: {
    text: "Estamos extremamente decepcionados em ter quaisquer detalhes do nosso próximo jogo compartilhados com vocês desta forma. Nosso trabalho no próximo Grand Theft Auto continuará como planejado.",
    author: "Rockstar Games",
    role: "Comunicado oficial (tradução), 19 de setembro de 2022",
    source_url: "https://www.rockstargames.com",
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
    alt_text: "Capa oficial de Grand Theft Auto VI com os protagonistas Jason e Lucia em primeiro plano e cenas de Vice City ao redor",
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
    alt_text: "Jason e Lucia abraçados numa praia de Vice City durante o pôr do sol, arte oficial de GTA 6",
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
    alt_text: "Vista panorâmica de Vice City com arranha-céus e avenidas à beira-mar, arte oficial de GTA 6",
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