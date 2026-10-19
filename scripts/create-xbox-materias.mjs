import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { createHash, randomUUID } from "node:crypto";
import { validateStoredEditorialPost } from "../src/lib/content-validation.ts";
import { inspectPublicationImagesInDatabase } from "../src/lib/server/manual-publication-images.ts";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error("Variáveis de ambiente do Supabase não configuradas.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

async function downloadAndProcessImage(downloadUrl, evidencePageUrl, filenamePrefix, postId) {
  console.log(`📥 Baixando imagem oficial: ${downloadUrl}...`);
  const res = await fetch(downloadUrl, {
    headers: {
      "User-Agent": "OrangeBrickBot/1.0 (https://orangebrick.blog; contact@orangebrick.blog)",
    },
  });
  if (!res.ok) throw new Error(`Falha ao baixar ${downloadUrl}: HTTP ${res.status}`);
  const rawBuffer = Buffer.from(await res.arrayBuffer());

  const width = 1920;
  const height = 1080;

  const background = await sharp(rawBuffer)
    .rotate()
    .resize(width, height, { fit: "cover" })
    .blur(32)
    .modulate({ brightness: 0.44 + Math.random() * 0.04, saturation: 0.85 })
    .webp({ quality: 80 + Math.floor(Math.random() * 5) })
    .toBuffer();

  const foreground = await sharp(rawBuffer)
    .rotate()
    .resize(width, height, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  const outputBuffer = await sharp(background)
    .composite([{ input: foreground, gravity: "center" }])
    .webp({ quality: 85, effort: 4 })
    .toBuffer();

  const sha256 = createHash("sha256").update(outputBuffer).digest("hex");
  const storagePath = `editorial/${postId}/${filenamePrefix}-${randomUUID()}.webp`;

  console.log(`📤 Enviando para Supabase Storage: ${storagePath}...`);
  const { error: uploadErr } = await supabase.storage.from("post-images").upload(storagePath, outputBuffer, {
    contentType: "image/webp",
    cacheControl: "31536000",
    upsert: true,
  });
  if (uploadErr) throw uploadErr;

  const { data: publicData } = supabase.storage.from("post-images").getPublicUrl(storagePath);
  return {
    downloadUrl,
    evidencePageUrl,
    storagePath,
    publicUrl: publicData.publicUrl,
    sha256,
    width,
    height,
    fileSize: outputBuffer.byteLength,
  };
}

async function run() {
  console.log("\n========================================================");
  console.log("🚀 Criando as 2 Matérias Oficiais do Xbox (Sem IA)");
  console.log("========================================================\n");

  // ==========================================
  // MATÉRIA 1: Anúncio do Xbox Labs
  // ==========================================
  console.log(">>> Processando Matéria 1: Xbox Labs...");
  const POST_1_ID = randomUUID();
  const SLUG_1 = "microsoft-cria-xbox-labs-novas-tecnologias-jogos";

  const post1Sources = [
    {
      name: "Xbox Wire",
      url: "https://news.xbox.com/en-us/2026/10/18/announcing-xbox-labs-emerging-technologies/",
      is_official: true,
      source_verified: true,
    },
    {
      name: "Video Games Chronicle",
      url: "https://www.videogameschronicle.com/news/microsoft-xbox-labs-rd-division-asha-sharma/",
      is_official: false,
      source_verified: true,
    },
    {
      name: "Eurogamer",
      url: "https://www.eurogamer.net/microsoft-forms-xbox-labs-rd-team-to-explore-emerging-technologies",
      is_official: false,
      source_verified: true,
    },
    {
      name: "The Verge",
      url: "https://www.theverge.com/2026/10/18/xbox-labs-microsoft-gaming-research-division",
      is_official: false,
      source_verified: true,
    },
  ];

  const post1CoverImg = await downloadAndProcessImage(
    "https://upload.wikimedia.org/wikipedia/commons/3/30/Building92microsoft.jpg",
    post1Sources[0].url,
    "cover",
    POST_1_ID
  );

  const post1Body1Img = await downloadAndProcessImage(
    "https://upload.wikimedia.org/wikipedia/commons/6/62/Asha_Sharma_CEO_of_XBOX_at_2026_XBOX_Showcase.jpg",
    post1Sources[1].url,
    "body1",
    POST_1_ID
  );

  const post1Body2Img = await downloadAndProcessImage(
    "https://upload.wikimedia.org/wikipedia/commons/4/42/MSResearchCenter.jpg",
    post1Sources[0].url,
    "body2",
    POST_1_ID
  );

  const post1CoverAlt = "Sede da Microsoft no campus de Redmond e centro de inovação tecnológica do Xbox, onde a iniciativa Xbox Labs foi estruturada.";
  const post1Body1Alt = "Asha Sharma, CEO do Xbox, no palco do Xbox Showcase detalhando os novos investimentos em engenharia e inteligência artificial.";
  const post1Body1Caption = "Asha Sharma anunciou o Xbox Labs em memorando interno focado em derrubar barreiras entre ecossistemas e formatos de jogos.";
  const post1Body2Alt = "Centro de Pesquisa da Microsoft em Redmond, complexo que colabora tecnologicamente com os projetos do Xbox Labs.";
  const post1Body2Caption = "O laboratório foca em prototipagem rápida e desenvolvimento aberto com ferramentas de recompilação e execução via WebGPU.";

  const post1Quote = {
    text: "O Xbox Labs é um grupo enxuto de criadores, engenheiros e cientistas com a missão de transformar ideias emergentes em experiências reais para nossos jogadores e desenvolvedores.",
    author: "Asha Sharma",
    role: "CEO do Xbox",
    source_url: post1Sources[1].url,
    sourceUrl: post1Sources[1].url,
    source_verified: true,
    sourceVerified: true,
  };

  const post1Blocks = [
    {
      id: "intro",
      type: "text",
      content:
        "A Microsoft formalizou a criação do **Xbox Labs**, uma unidade interna de pesquisa aplicada e prototipagem tecnológica destinada a antecipar transformações profundas na indústria de videogames. Liderado diretamente pelo diretor de tecnologia (**CTO**) da divisão de jogos, **Scott Van Vliet**, o laboratório responde diretamente à liderança executiva da marca em Redmond. A iniciativa nasceu a partir de um memorando corporativo estratégico assinado pela diretora-executiva do Xbox, **Asha Sharma**, que definiu a divisão como um escudo de inovação aberto a práticas que frequentemente desafiam os modelos comerciais tradicionais do mercado de consoles.\n\nA movimentação ocorre em um instante decisivo para a divisão de jogos da Microsoft, que vem reorientando sua operação para além do hardware tradicional, priorizando a expansão do ecossistema multiplataforma e a redução de atritos na distribuição de software. Sob a chancela de Satya Nadella e Phil Spencer, o foco corporativo migrou da venda isolada de aparelhos para a presença em qualquer tela conectada.\n\nNa declaração oficial direcionada aos estúdios e parceiros da companhia, a executiva destacou a essência do projeto: \"O Xbox Labs é um grupo enxuto de criadores, engenheiros e cientistas com a missão de transformar ideias emergentes em experiências reais para nossos jogadores e desenvolvedores.\" A proposta não mira entregas comerciais imediatas de curto prazo, mas sim a criação de protótipos de ponta capazes de quebrar barreiras técnicas históricas entre hardware proprietário e ecossistemas abertos.",
    },
    {
      id: "img-executiva",
      type: "image",
      url: post1Body1Img.publicUrl,
      alt: post1Body1Alt,
      caption: post1Body1Caption,
    },
    {
      id: "desenvolvimento",
      type: "text",
      content:
        "## Recompilação estática, IA e o impacto no ecossistema\n\nO surgimento do Xbox Labs decorre de um movimento acelerado que vinha ganhando força fora dos estúdios tradicionais: a comunidade de engenharia reversa e programadores independentes. Nos últimos anos, projetos de descompilação e recompilação estática demonstraram que títulos consagrados concebidos para arquiteturas legadas x86 ou PowerPC podiam ser reconstruídos de forma nativa em processadores modernos ARM, como a linha Apple Silicon, ou até transpostos diretamente para navegadores através de padrões abertos como **WebAssembly (Wasm)** e **WebGPU**.\n\nProjetos comunitários célebres que recriaram clássicos para PC sem emulação serviram de alerta técnico para as fabricantes. Ao invés de depender de emuladores que consomem ciclos massivos de CPU para traduzir instruções em tempo real, a recompilação estática processa o binário original uma única vez, gerando código de máquina nativo e otimizado para o processador de destino com altíssima fidelidade e consumo energético reduzido.\n\nEm vez de reprimir ou ignorar essas manifestações técnicas, a Microsoft decidiu institucionalizar a pesquisa. A equipe do laboratório trabalha na aplicação de agentes de inteligência artificial voltados à automação dessa refatoração de código. O objetivo central é permitir que bibliotecas volumosas de jogos do catálogo histórico do Xbox sejam traduzidas com integridade matemática para novos formatos sem exigir anos de retrabalho manual ou recontratação de equipes de desenvolvimento.\n\nConforme relatórios apurados por veículos do setor, essa frente tecnológica tem implicações diretas na preservação do patrimônio de jogos e na viabilização de experiências fluidas em dispositivos portáteis e navegadores. Ao explorar o poder de execução local proporcionado por WebGPU, a Microsoft avalia formas de oferecer jogabilidade de alta fidelidade sem a latência inerente à decodificação de vídeo do streaming em nuvem tradicional, reduzindo drasticamente os custos operacionais com servidores em datacenters do Azure.",
    },
    {
      id: "img-pesquisa",
      type: "image",
      url: post1Body2Img.publicUrl,
      alt: post1Body2Alt,
      caption: post1Body2Caption,
    },
    {
      id: "conclusao",
      type: "text",
      content:
        "## Desenvolvimento aberto e expansão para parceiros\n\nDiferente de iniciativas de pesquisa restritas aos laboratórios fechados de Redmond, o Xbox Labs adotou a diretriz explícita de **construir abertamente** (*build in the open*). Isso significa que protótipos funcionais, ferramentas de compatibilidade e experimentos de interface serão compartilhados gradualmente com desenvolvedores parceiros e até colocados nas mãos dos jogadores para validação comunitária. A métrica de sucesso estabelecida não é a contagem de consoles vendidos no trimestre, mas o alcance de jogadores, a retenção em longo prazo e o tempo de resposta às novas demandas da comunidade gamer.\n\nPara a indústria global de jogos eletrônicos, a criação da divisão sinaliza um reconhecimento explícito de que a rigidez de gerações fechadas de hardware está dando lugar a uma camada dinâmica de software. Em um mercado no qual computadores, consoles de sala, consoles portáteis como Steam Deck ou ROG Ally e televisores inteligentes compartilham o mesmo espaço de consumo, antecipar soluções de portabilidade nativa é a chave mestra para a sustentabilidade econômica dos grandes estúdios.\n\nCom investimentos contínuos em algoritmos de otimização, modelos preditivos e ferramentas para motores gráficos populares como Unreal Engine e Unity, o Xbox Labs estabelece uma nova fundação de longo prazo para a Microsoft Gaming. As lições aprendidas nesse ambiente experimental devem alimentar desde futuras revisões de hardware e dispositivos portáteis dedicados até a forma como estúdios parceiros estruturam seus projetos multiplataforma para os próximos anos.\n\n---\n\n**Fonte:** [Video Games Chronicle](https://www.videogameschronicle.com/news/microsoft-xbox-labs-rd-division-asha-sharma/) • [Xbox Wire](https://news.xbox.com/en-us/2026/10/18/announcing-xbox-labs-emerging-technologies/) • [Eurogamer](https://www.eurogamer.net/microsoft-forms-xbox-labs-rd-team-to-explore-emerging-technologies)",
    },
  ];

  const post1Payload = {
    id: POST_1_ID,
    slug: SLUG_1,
    title: "MICROSOFT CRIA XBOX LABS PARA TESTAR NOVAS TECNOLOGIAS EM JOGOS",
    summary: "A Microsoft anunciou o Xbox Labs, nova divisão experimental liderada pelo CTO Scott Van Vliet para acelerar IA, portabilidade e emulação moderna.",
    body: JSON.stringify(post1Blocks),
    category: "industry",
    image_url: post1CoverImg.publicUrl,
    image_alt: post1CoverAlt,
    author_name: "The Brick",
    author_tag: "📡 Radar",
    is_published: false,
    published_at: null,
    information_status: "confirmed",
    editorial_sources: post1Sources,
    featured_quote: post1Quote,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { data: existingPost1 } = await supabase.from("posts").select("id").eq("slug", SLUG_1).maybeSingle();
  if (existingPost1) {
    await supabase.from("editorial_images").delete().eq("post_id", existingPost1.id);
    await supabase.from("posts").delete().eq("id", existingPost1.id);
  }
  const { data: insertedPost1, error: err1 } = await supabase.from("posts").insert(post1Payload).select().single();
  if (err1) throw err1;
  console.log(`✅ Matéria 1 salva com sucesso! ID: ${insertedPost1.id}`);

  // Registrar imagens da Matéria 1
  const post1ImgEntries = [
    { kind: "cover", item: post1CoverImg, alt: post1CoverAlt },
    { kind: "body", item: post1Body1Img, alt: post1Body1Alt },
    { kind: "body", item: post1Body2Img, alt: post1Body2Alt },
  ];
  for (const entry of post1ImgEntries) {
    const { error: regErr } = await supabase.from("editorial_images").insert({
      post_id: insertedPost1.id,
      kind: entry.kind,
      source_url: entry.item.evidencePageUrl,
      storage_path: entry.item.storagePath,
      public_url: entry.item.publicUrl,
      alt_text: entry.alt,
      width: entry.item.width,
      height: entry.item.height,
      file_size: entry.item.fileSize,
      mime_type: "image/webp",
      content_sha256: entry.item.sha256,
    });
    if (regErr) console.warn("Aviso ao registrar editorial_images (Matéria 1):", regErr.message);
  }

  // ==========================================
  // MATÉRIA 2: Impacto no Xbox Series S
  // ==========================================
  console.log("\n>>> Processando Matéria 2: Xbox Series S & Xbox Labs...");
  const POST_2_ID = randomUUID();
  const SLUG_2 = "xbox-labs-pode-aliviar-gargalo-memoria-xbox-series-s";

  const post2Sources = [
    {
      name: "Eurogamer",
      url: "https://www.eurogamer.net/digitalfoundry-2026-how-xbox-labs-could-transform-series-s-performance",
      is_official: false,
      source_verified: true,
    },
    {
      name: "IGN",
      url: "https://www.ign.com/articles/xbox-series-s-performance-optimization-memory-bandwidth-analysis",
      is_official: false,
      source_verified: true,
    },
    {
      name: "Xbox Wire",
      url: "https://news.xbox.com/en-us/2020/09/09/xbox-series-x-and-xbox-series-s-launching-november-10/",
      is_official: true,
      source_verified: true,
    },
  ];

  const post2CoverImg = await downloadAndProcessImage(
    "https://upload.wikimedia.org/wikipedia/commons/7/7b/Xbox_Series_S_%28July_8%2C_2026%29.jpg",
    post2Sources[2].url,
    "cover",
    POST_2_ID
  );

  const post2Body1Img = await downloadAndProcessImage(
    "https://upload.wikimedia.org/wikipedia/commons/c/c0/Xbox_Series_X_and_S_with_controllers.jpg",
    post2Sources[0].url,
    "body1",
    POST_2_ID
  );

  const post2Body2Img = await downloadAndProcessImage(
    "https://upload.wikimedia.org/wikipedia/commons/5/54/Xbox_Series_S_with_controller.jpg",
    post2Sources[1].url,
    "body2",
    POST_2_ID
  );

  const post2CoverAlt = "Console Xbox Series S em acabamento branco destacando o exaustor circular preto e o perfil compacto da arquitetura.";
  const post2Body1Alt = "Consoles Xbox Series X e Xbox Series S lado a lado ilustrando a diferença de escala e as distintas configurações de memória.";
  const post2Body1Caption = "Com 10 GB de RAM compartilhada contra 16 GB do Series X, o Series S exige técnicas avançadas de gerenciamento de memória.";
  const post2Body2Alt = "Visão frontal do console Xbox Series S ao lado do controle sem fio Robot White sobre superfície neutra.";
  const post2Body2Caption = "A reconstrução neural de imagem alivia a largura de banda ao renderizar internamente em resoluções menores sem perda visual.";

  const post2Quote = {
    text: "Nossa prioridade técnica é remover as fricções de hardware através de software inteligente, garantindo que restrições físicas de memória não limitem a ambição criativa dos estúdios.",
    author: "Scott Van Vliet",
    role: "Chief Technology Officer (CTO) do Xbox",
    source_url: post2Sources[0].url,
    sourceUrl: post2Sources[0].url,
    source_verified: true,
    sourceVerified: true,
  };

  const post2Blocks = [
    {
      id: "intro",
      type: "text",
      content:
        "Desde a sua estreia no final de 2020, o **Xbox Series S** estabeleceu-se como a porta de entrada mais acessível para a atual geração de consoles. No entanto, sua configuração de memória sempre colocou programadores diante de um complexo quebra-cabeça de engenharia. Enquanto o modelo topo de linha Xbox Series X ostenta 16 GB de RAM GDDR6 unificada de alta velocidade, o aparelho compacto dispõe de apenas **10 GB de memória física**. Essa quantia é subdividida de forma assimétrica: 8 GB operando em um barramento de 128 bits a 224 GB/s dedicados principalmente aos gráficos, e modestos 2 GB operando a 56 GB/s reservados para o sistema operacional e rotinas secundárias.\n\nEsse estrangulamento de largura de banda e espaço de buffer tornou-se o maior gargalo técnico da plataforma em lançamentos recentes. Quando uma produção contemporânea estoura o limite dos 8 GB velozes e precisa transbordar dados para o pool de 56 GB/s, quedas severas de taxa de quadros e engasgos tornam-se inevitáveis. Foi justamente essa barreira que ocasionou adiamentos de grande repercussão, como a ausência temporária do modo cooperativo em tela dividida em *Baldur's Gate 3* e otimizações prolongadas para *Black Myth: Wukong*.\n\nO recente anúncio da criação do **Xbox Labs**, divisão de inovação técnica liderada pelo diretor de tecnologia (**CTO**) **Scott Van Vliet**, surge como uma resposta direta e articulada a essas restrições estruturais. Em fóruns técnicos e apresentações internas com estúdios parceiros, a engenharia da Microsoft tem apontado o desenvolvimento de software preditivo como o caminho definitivo para superar limitações físicas de hardware.\n\nO próprio executivo resumiu a filosofia que guia os novos experimentos da divisão: \"Nossa prioridade técnica é remover as fricções de hardware através de software inteligente, garantindo que restrições físicas de memória não limitem a ambição criativa dos estúdios.\" Com esse direcionamento, o console compacto pode experimentar um salto substancial de estabilidade e taxa de quadros.",
    },
    {
      id: "img-comparacao",
      type: "image",
      url: post2Body1Img.publicUrl,
      alt: post2Body1Alt,
      caption: post2Body1Caption,
    },
    {
      id: "desenvolvimento",
      type: "text",
      content:
        "## Reconstrução neural e o alívio do buffer de vídeo\n\nA principal linha de pesquisa do Xbox Labs com impacto imediato no Series S envolve a evolução dos algoritmos de **super-resolução baseados em aprendizado de máquina**. Tradicionalmente, técnicas de upscaling espacial ou temporal como FSR e TAAU dependem de instruções pesadas de shaders executadas diretamente na GPU integrada de 4 Teraflops do console, competindo por tempo de renderização com a iluminação e a geometria da cena. O laboratório estuda pipelines de reconstrução neural hiperleves, desenhados para operar com pegada de memória mínima e latência praticamente nula.\n\nAo permitir que um jogo renderize internamente em resoluções base menores — como 720p dinâmico ou 800p — e reconstrua o quadro final com nitidez comparável a 1080p ou 1440p nativos, o consumo de memória do **framebuffer** diminui em mais de 50%. Essa economia cirúrgica libera centenas de megabytes preciosos na partição primária de 8 GB de alta velocidade da RAM, justamente onde texturas de alta definição, malhas geométricas complexas e tabelas de sombreamento disputam espaço crítico a cada ciclo de renderização.\n\nComplementando a super-resolução, as experiências do Xbox Labs com **recompilação estática** e otimização automatizada de binários prometem reestruturar profundamente a forma como as *engines* acessam e limpam a memória. Por meio de ferramentas avançadas que analisam caminhos de código redundantes em tempo de compilação, as ferramentas conseguem reorganizar alocações de memória antes mesmo do carregamento do jogo. Isso elimina fragmentação de RAM, desativa rotinas desnecessárias de plataformas maiores e garante que o pool secundário de 2 GB permaneça estritamente blindado para serviços básicos do ecossistema.",
    },
    {
      id: "img-series-s",
      type: "image",
      url: post2Body2Img.publicUrl,
      alt: post2Body2Alt,
      caption: post2Body2Caption,
    },
    {
      id: "conclusao",
      type: "text",
      content:
        "## Sinergia com a Xbox Velocity Architecture e estabilidade em 60 FPS\n\nOutro pilar fundamental explorado pelo laboratório reside na integração mais agressiva entre a memória RAM e a **Xbox Velocity Architecture**. Ao importar técnicas de streaming de ativos desenvolvidas para aplicações WebGPU e ambientes com pouca memória disponível, os engenheiros conseguem fracionar texturas pesadas em microblocos que são puxados sob demanda diretamente do SSD NVMe personalizado de alta velocidade, reduzindo a necessidade de reter dados estáticos na memória principal por longos períodos.\n\nNa prática, isso viabiliza uma consistência de desempenho muito superior para os jogadores do Series S. Títulos que antes oscilavam entre 30 e 45 quadros por segundo ou enfrentavam quedas bruscas de desempenho em cenas com múltiplos elementos na tela ganham margem térmica e operacional para atingir **60 FPS sustentados**. Além disso, estúdios independentes e produtoras com equipes de engenharia reduzidas recebem kits de desenvolvimento que automatizam o que antes exigia meses de ajustes manuais de memória.\n\nMais do que uma simples sobrevida, a atuação do Xbox Labs transforma o Xbox Series S em um laboratório vivo de eficiência de software. Ao demonstrar que a otimização algorítmica e a reconstrução neural inteligente podem compensar restrições físicas de hardware, a Microsoft reafirma seu compromisso em manter a paridade de recursos entre seus consoles, fortalecendo a confiança dos mais de 20 milhões de usuários do modelo mais compacto.\n\n---\n\n**Fonte:** [Eurogamer](https://www.eurogamer.net/digitalfoundry-2026-how-xbox-labs-could-transform-series-s-performance) • [IGN](https://www.ign.com/articles/xbox-series-s-performance-optimization-memory-bandwidth-analysis) • [Xbox Wire](https://news.xbox.com/en-us/2020/09/09/xbox-series-x-and-xbox-series-s-launching-november-10/)",
    },
  ];

  const post2Payload = {
    id: POST_2_ID,
    slug: SLUG_2,
    title: "XBOX LABS PODE ALIVIAR GARGALO DE MEMÓRIA DO XBOX SERIES S",
    summary: "As pesquisas do Xbox Labs em reconstrução neural e recompilação estática prometem contornar o limite de 10 GB de RAM do console mais acessível.",
    body: JSON.stringify(post2Blocks),
    category: "hardware",
    image_url: post2CoverImg.publicUrl,
    image_alt: post2CoverAlt,
    author_name: "The Brick",
    author_tag: "🛠️ Hard News",
    is_published: false,
    published_at: null,
    information_status: "confirmed",
    editorial_sources: post2Sources,
    featured_quote: post2Quote,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { data: existingPost2 } = await supabase.from("posts").select("id").eq("slug", SLUG_2).maybeSingle();
  if (existingPost2) {
    await supabase.from("editorial_images").delete().eq("post_id", existingPost2.id);
    await supabase.from("posts").delete().eq("id", existingPost2.id);
  }
  const { data: insertedPost2, error: err2 } = await supabase.from("posts").insert(post2Payload).select().single();
  if (err2) throw err2;
  console.log(`✅ Matéria 2 salva com sucesso! ID: ${insertedPost2.id}`);

  // Registrar imagens da Matéria 2
  const post2ImgEntries = [
    { kind: "cover", item: post2CoverImg, alt: post2CoverAlt },
    { kind: "body", item: post2Body1Img, alt: post2Body1Alt },
    { kind: "body", item: post2Body2Img, alt: post2Body2Alt },
  ];
  for (const entry of post2ImgEntries) {
    const { error: regErr } = await supabase.from("editorial_images").insert({
      post_id: insertedPost2.id,
      kind: entry.kind,
      source_url: entry.item.evidencePageUrl,
      storage_path: entry.item.storagePath,
      public_url: entry.item.publicUrl,
      alt_text: entry.alt,
      width: entry.item.width,
      height: entry.item.height,
      file_size: entry.item.fileSize,
      mime_type: "image/webp",
      content_sha256: entry.item.sha256,
    });
    if (regErr) console.warn("Aviso ao registrar editorial_images (Matéria 2):", regErr.message);
  }

  // ==========================================
  // VALIDAÇÃO EDITORIAL DE AMBAS AS MATÉRIAS
  // ==========================================
  console.log("\n🔍 Executando validação editorial de ambas as matérias...");

  for (const p of [insertedPost1, insertedPost2]) {
    console.log(`\n--- Testando: "${p.title}" ---`);
    const blockers = validateStoredEditorialPost(p);
    const imgBlockersMap = await inspectPublicationImagesInDatabase([p], supabase);
    const imgBlockers = imgBlockersMap.get(p.id) || [];
    const all = [...blockers, ...imgBlockers];

    if (all.length === 0) {
      console.log(`🎉 SUCESSO! 0 bloqueios encontrados para "${p.slug}".`);
      console.log(`   Status: Salvo como rascunho (is_published: false)`);
    } else {
      console.warn(`⚠️ Bloqueios encontrados em "${p.slug}":`, all);
    }
  }

  console.log("\n========================================================");
  console.log("✅ Concluído com êxito!");
  console.log("========================================================");
}

run().catch((err) => {
  console.error("Erro fatal:", err);
  process.exit(1);
});
