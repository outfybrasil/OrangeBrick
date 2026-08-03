import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: "./.env.local" });

const now = new Date().toISOString();

const createPost = ({
  slug,
  title,
  summary,
  category,
  imageUrl,
  imageAlt,
  authorTag,
  blocks,
}) => ({
  slug,
  title,
  summary,
  category,
  image_url: imageUrl,
  image_alt: imageAlt,
  author_name: "The Brick",
  author_tag: authorTag,
  is_published: false,
  published_at: null,
  created_at: now,
  updated_at: now,
  body: JSON.stringify(blocks),
});

const posts = [
  createPost({
    slug: "xbox-gamescom-2026-25-jogos-140-estacoes",
    title: "XBOX LEVA 25 JOGOS E 140 ESTAÇÕES À GAMESCOM 2026",
    summary:
      "Xbox confirma estande gigante na Gamescom 2026, com demos públicas de Gears of War: E-Day, Fable, METRO 2039 e mais.",
    category: "industry",
    imageUrl:
      "https://xboxwire.thesourcemediaassets.com/sites/2/2026/07/Gamescom_KV_2026_RGB_16x9_text-JPG-dc3f8f16392335c23c5d-1600x900.jpg",
    imageAlt:
      "Arte oficial do Xbox para a Gamescom 2026, evento em que a marca terá 25 jogos disponíveis em 140 estações de demonstração",
    authorTag: "📡 Radar",
    blocks: [
      {
        id: "intro",
        type: "text",
        content:
          "O **Xbox** confirmou sua operação para a **Gamescom 2026**: serão 25 jogos distribuídos por 140 estações entre 27 e 30 de agosto, em Colônia. A lista mistura produções próprias, estreias públicas e títulos de parceiros, com transmissões ao vivo nos dois primeiros dias de feira.",
      },
      {
        id: "gears-eday",
        type: "image",
        url: "https://i0.wp.com/xboxwire.thesourcemediaassets.com/sites/2/2027/07/00_GoW_EDAY_KeyArt-82d6650f651009cc5180-1024x576.jpg?ssl=1",
        alt: "Marcus Fenix e Dominic Santiago na arte oficial de Gears of War: E-Day, cuja campanha poderá ser testada pelo público na Gamescom 2026",
        caption:
          "Gears of War: E-Day terá sua primeira demonstração pública jogável da campanha antes do lançamento em 6 de outubro.",
      },
      {
        id: "jogos",
        type: "text",
        content:
          "## Campanha de Gears e demonstração de Fable\n\nO principal teste público será o de **Gears of War: E-Day**, com um trecho da campanha centrada no começo da guerra contra os Locust e na parceria entre Marcus Fenix e Dominic Santiago. **Fable** aparecerá em uma apresentação ao vivo da Playground Games, enquanto **Forza Horizon 6** mostrará o modo Drift Attack.\n\nO estande também terá **Call of Duty: Modern Warfare 4**, **Minecraft Dungeons II**, **Halo: Campaign Evolved**, **STRANGER THAN HEAVEN**, **METRO 2039** e **Microsoft Flight Simulator 2024**. Entre os parceiros estão Alien: Isolation 2, The Blood of Dawnwalker, Castlevania: Belmont’s Curse e Star Wars Zero Company.",
      },
      {
        id: "transmissao",
        type: "image",
        url: "https://xboxwire.thesourcemediaassets.com/sites/2/2026/07/gamescom25_Opt5-d8f9e16192781b74c2e0-1024x576.jpg",
        alt: "Palco oficial do Xbox na Gamescom com público acompanhando uma transmissão, formato que retorna na edição de 2026",
        caption:
          "As transmissões do estande começam às 11h de Brasília em 26 e 27 de agosto, com entrevistas, trailers e jogabilidade.",
      },
      {
        id: "servico",
        type: "text",
        content:
          "## Como acompanhar\n\nAs transmissões oficiais começam às **11h de Brasília** nos dias 26 e 27 de agosto, pelos canais do Xbox no YouTube e na Twitch. A empresa promete entrevistas, convidados, trailers e novas demonstrações de jogabilidade.\n\nO estande ficará no Hall 7 da Koelnmesse e terá controles adaptáveis, mesas ajustáveis, sala silenciosa e recursos de acessibilidade. O **Xbox FanFest** também volta em 26 de agosto, dentro do próprio espaço da marca.\n\n**Fonte:** [Xbox Wire](https://news.xbox.com/en-us/2026/07/28/xbox-gamescom-2026/) • [Gematsu](https://www.gematsu.com/2026/07/xbox-announces-gamescom-2026-plans)",
      },
    ],
  }),
  createPost({
    slug: "playstation-plus-agosto-2026-dying-light-2-big-walk-signalis",
    title: "PS PLUS DE AGOSTO TRAZ DYING LIGHT 2, BIG WALK E SIGNALIS",
    summary:
      "PlayStation Plus Essential recebe três jogos em 4 de agosto, com terror, cooperação e sobrevivência para PS5 e PS4.",
    category: "industry",
    imageUrl:
      "https://blog.playstation.com/tachyon/2026/07/4d854b4d31f54e70d5cd5fe3ff1d2390f0254d61.jpg?crop_strategy=smart&resize=1088%2C612",
    imageAlt:
      "Montagem oficial dos jogos mensais do PlayStation Plus de agosto de 2026 com Dying Light 2, Big Walk e Signalis",
    authorTag: "📡 Radar",
    blocks: [
      {
        id: "intro",
        type: "text",
        content:
          "A Sony revelou os jogos mensais do **PlayStation Plus Essential** para agosto de 2026. **Dying Light 2 Stay Human: Reloaded Edition**, **Big Walk** e **Signalis** poderão ser adicionados à biblioteca entre 4 e 31 de agosto.",
      },
      {
        id: "dying-light-2",
        type: "image",
        url: "https://blog.playstation.com/uploads/2026/07/5cdc2119766ef3e9f79921f669ad0f5f4a4e5349.jpg",
        alt: "Aiden atravessa uma cidade pós-apocalíptica na arte oficial de Dying Light 2, principal jogo do PlayStation Plus de agosto",
        caption:
          "Dying Light 2 Stay Human: Reloaded Edition entra no serviço nas versões de PS5 e PS4, com campanha cooperativa para até quatro pessoas.",
      },
      {
        id: "lista",
        type: "text",
        content:
          "## Três propostas bem diferentes\n\n**Dying Light 2 Stay Human: Reloaded Edition** combina parkour, combate e sobrevivência em uma cidade dominada por infectados. A edição oferecida inclui versões para PS5 e PS4 e permite campanha cooperativa para até quatro jogadores.\n\nExclusivo do PS5 nesta seleção, **Big Walk** é uma aventura cooperativa baseada em comunicação, exploração e quebra-cabeças. **Signalis**, disponível na versão de PS4, fecha o trio com terror psicológico, ficção científica e estrutura inspirada nos clássicos do gênero.",
      },
      {
        id: "big-walk",
        type: "image",
        url: "https://blog.playstation.com/uploads/2026/07/62653875e39800fd0931ab582a4a082c767d64ab.jpg",
        alt: "Personagens caminham juntos no cenário colorido de Big Walk, aventura cooperativa que integra o PS Plus de agosto no PS5",
        caption:
          "Big Walk aposta em conversa e cooperação para resolver desafios em um mundo aberto e descontraído.",
      },
      {
        id: "resgate",
        type: "text",
        content:
          "## Janela para resgate\n\nOs três jogos ficam disponíveis para resgate de **4 a 31 de agosto**. Depois de adicionados à conta, permanecem acessíveis enquanto a assinatura do PlayStation Plus estiver ativa. A seleção pode variar conforme a região.\n\nA Sony também anunciou um pacote do **MARVEL Tōkon: Fighting Souls** para assinantes, com avatares e poses de tela de resultado. O conteúdo extra começa a ser distribuído em 6 de agosto.\n\n**Fonte:** [PlayStation.Blog](https://blog.playstation.com/2026/07/28/playstation-plus-monthly-games-for-august-dying-light-2-stay-human-reloaded-edition-big-walk-signalis/) • [Gematsu](https://www.gematsu.com/2026/07/playstation-plus-monthly-games-lineup-for-august-2026-announced)",
      },
    ],
  }),
  createPost({
    slug: "pokemon-pokopia-bubbly-basin-switch-2-agosto-2026",
    title: "POKÉMON POKOPIA MERGULHA EM BUBBLY BASIN NO SWITCH 2",
    summary:
      "Bubbly Basin leva construção submarina a Pokémon Pokopia em agosto, junto de uma atualização gratuita com o movimento Dive.",
    category: "breaking",
    imageUrl:
      "https://assets.nintendo.com/image/upload/f_auto/q_auto/dpr_1.5/Marketing/pmp_pokopia/dlc/wave-1/DLC-bubbly-basin-trailer-fallback-img-2x",
    imageAlt:
      "Ditto e Pokémon exploram a cidade submarina de Bubbly Basin, primeira parte do passe de expansão de Pokémon Pokopia no Switch 2",
    authorTag: "💣 Plantão",
    blocks: [
      {
        id: "intro",
        type: "text",
        content:
          "**Pokémon Pokopia** vai expandir sua construção para o fundo do mar. A primeira parte do passe pago, **Bubbly Basin**, chega ao Nintendo Switch 2 em agosto acompanhada da atualização gratuita 2.0.0, que libera exploração e construção submarinas para todos os donos do jogo.",
      },
      {
        id: "cidade-submarina",
        type: "image",
        url: "https://assets.nintendo.com/image/upload/f_auto/q_auto/dpr_1.5/Marketing/pmp_pokopia/dlc/wave-1/dlc-bubbly-basin-game-screenshot-1-2x",
        alt: "Ditto constrói estruturas entre corais e bolhas na cidade submarina de Bubbly Basin em Pokémon Pokopia",
        caption:
          "Bubbly Basin adiciona blocos flutuantes, móveis, roupas e novas criaturas para a cidade construída debaixo d’água.",
      },
      {
        id: "conteudo",
        type: "text",
        content:
          "## Construção abaixo da superfície\n\nBubbly Basin adiciona uma cidade submersa com novos Pokémon, roupas, móveis e alimentos. Criaturas com especialidade Água ajudam no cultivo, enquanto as do tipo Gerador alimentam máquinas de bolhas e postes. Os blocos flutuantes permitem montar construções em alturas diferentes.\n\nA área profunda fica além de uma abertura no fundo do mar e usa corais luminosos como guia. Também será possível construir um submarino de **Sharpedo** e transformá-lo em uma sala no estilo Secret Base.",
      },
      {
        id: "mergulho",
        type: "image",
        url: "https://assets.nintendo.com/image/upload/f_auto/q_auto/dpr_1.5/Marketing/pmp_pokopia/dlc/wave-1/dlc-bubbly-basin-graphic-protagonist-girl-2x",
        alt: "Ditto usa o movimento Dive ao lado de Pokémon aquáticos durante a exploração gratuita que chega a Pokémon Pokopia",
        caption:
          "A atualização 2.0.0 ensina Dive por meio de Manaphy e libera nado e construção submarina sem exigir o passe pago.",
      },
      {
        id: "atualizacao",
        type: "text",
        content:
          "## Parte gratuita e próximos capítulos\n\nA atualização 2.0.0 adiciona o movimento **Dive**, aprendido com Manaphy, e libera nado e construção submarina sem exigir a compra do passe. Para acessar o portão de Bubbly Basin, o jogador precisa concluir a tarefa de elevar o nível ambiental em Bleak Beach.\n\nO passe terá três partes. A segunda está prevista para o fim de 2026, com acessórios combinados entre o personagem e seus Pokémon, além de novos móveis e criaturas. A terceira chega em 2027.\n\n**Fonte:** [Nintendo](https://www.nintendo.com/sg/news/article/2MQ97bmSz3mG9pHZGeCDOb) • [Gematsu](https://www.gematsu.com/2026/07/pokemon-pokopia-dlc-expansion-pass-part-1-bubbly-basin-launches-august-5-alongside-version-2-0-0-update)",
      },
    ],
  }),
  createPost({
    slug: "wuchang-fallen-feathers-sequencia-indolphinity-505-games",
    title: "WUCHANG TERÁ SEQUÊNCIA COM CRIADOR ORIGINAL E NOVO ESTÚDIO",
    summary:
      "505 Games confirma um novo WUCHANG liderado pelo criador Xia Siyuan, agora no estúdio Indolphinity e com publicação global garantida.",
    category: "industry",
    imageUrl:
      "https://wuchanggame.com/wp-content/uploads/2024/05/Wuchang_Screenshot_1.jpg",
    imageAlt:
      "Arte promocional de WUCHANG: Fallen Feathers usada no anúncio da sequência liderada pelo criador original Xia Siyuan",
    authorTag: "📡 Radar",
    blocks: [
      {
        id: "intro",
        type: "text",
        content:
          "A **505 Games** confirmou um novo jogo da série **WUCHANG**. O projeto será liderado por **Xia Siyuan**, criador de WUCHANG: Fallen Feathers, dentro da recém-formada **Indolphinity**. Ainda não há título definitivo, plataformas ou janela de lançamento.",
      },
      {
        id: "combate",
        type: "image",
        url: "https://wuchanggame.com/wp-content/uploads/2024/05/Wuchang_Screenshot_5.jpg",
        alt: "Wuchang enfrenta criaturas em um cenário da China imperial no screenshot oficial do primeiro Fallen Feathers, base visual da futura sequência",
        caption:
          "A sequência seguirá sob direção do criador original, mas será desenvolvida por uma nova equipe chamada Indolphinity.",
      },
      {
        id: "acordo",
        type: "text",
        content:
          "## Propriedade e criação em mãos diferentes\n\nA **Digital Bros**, dona da 505 Games, comprou os direitos da propriedade intelectual em abril de 2026. Pelo novo acordo, a Indolphinity assume a criação, enquanto a 505 Games financia e publica o projeto mundialmente.\n\nO grupo também abrirá uma subsidiária em Chengdu para apoiar a produção. Segundo as empresas, a estrutura foi desenhada para manter a identidade cultural chinesa da série sem retirar do criador original o comando criativo.",
      },
      {
        id: "cenario",
        type: "image",
        url: "https://wuchanggame.com/wp-content/uploads/2024/05/Wuchang_Screenshot_4.jpg",
        alt: "Ruínas e vegetação da China da dinastia Ming em screenshot oficial de WUCHANG: Fallen Feathers, universo que continuará no novo jogo",
        caption:
          "O primeiro WUCHANG misturou o fim da dinastia Ming, folclore chinês e combate de RPG de ação.",
      },
      {
        id: "contexto",
        type: "text",
        content:
          "## Franquia virou aposta de longo prazo\n\n**WUCHANG: Fallen Feathers** foi lançado em julho de 2025 para PS5, Xbox Series e PC. O jogo ultrapassou um milhão de cópias vendidas até março de 2026, resultado que antecedeu a compra da marca pela Digital Bros.\n\nA empresa diz tratar WUCHANG como uma franquia global de longo prazo. O anúncio, porém, confirma apenas o início da produção: qualquer previsão de data ou plataforma neste momento seria especulação.\n\n**Fonte:** [Gematsu](https://www.gematsu.com/2026/07/wuchang-fallen-feathers-sequel-announced) • [Digital Bros](https://digitalbros.com/) • [505 Games](https://505games.com/games/wuchang-fallen-feathers/)",
      },
    ],
  }),
];

const cjk = /[\u4e00-\u9fff]/u;

for (const post of posts) {
  const images = [
    post.image_url,
    ...JSON.parse(post.body)
      .filter((block) => block.type === "image")
      .map((block) => block.url),
  ];

  if (post.title.length > 70) {
    throw new Error(`Título longo: ${post.slug}`);
  }

  if (cjk.test(JSON.stringify(post))) {
    throw new Error(`Conteúdo CJK: ${post.slug}`);
  }

  if (new Set(images).size !== images.length) {
    throw new Error(`Imagem repetida: ${post.slug}`);
  }

  console.log(
    `VALID ${post.slug} title=${post.title.length} summary=${post.summary.length}`,
  );
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

for (const post of posts) {
  const { data: existing, error: lookupError } = await supabase
    .from("posts")
    .select("id, slug, is_published")
    .eq("slug", post.slug)
    .maybeSingle();

  if (lookupError) {
    throw lookupError;
  }

  if (existing) {
    console.log(JSON.stringify({ status: "exists", ...existing }));
    continue;
  }

  const { data, error } = await supabase
    .from("posts")
    .insert(post)
    .select("id, slug, is_published")
    .single();

  if (error) {
    throw error;
  }

  console.log(JSON.stringify({ status: "created", ...data }));
}
