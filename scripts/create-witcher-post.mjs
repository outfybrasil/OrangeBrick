import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: "./.env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const blocks = [
  {
    id: "intro",
    type: "text",
    content:
      "A **CD Projekt RED** surpreendeu a comunidade hoje (21 de julho) ao anunciar oficialmente que apresentará a terceira expansão de conteúdo para **The Witcher 3: Wild Hunt**. Intitulada **Songs of the Past**, a nova aventura inédita terá seu primeiro trailer e detalhes de jogabilidade revelados durante a **Gamescom Opening Night Live**, no dia **25 de agosto de 2026**.",
  },
  {
    id: "img-witcher-1",
    type: "image",
    url: "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/378648/header.jpg",
    alt: "Captura in-game oficial de Geralt de Rívia cavalgando pelos cenários de The Witcher 3",
    caption:
      "A expansão Songs of the Past promete um escopo comparável ao aclamado DLC Blood and Wine.",
  },
  {
    id: "detalhes-expansao",
    type: "text",
    content:
      "## Escopo comparável a Blood and Wine e foco na nova geração\n\nDesenvolvida em parceria com o estúdio **Fool's Theory** — formado por veteranos que trabalharam no jogo original de 2015 —, a expansão **Songs of the Past** foi descrita pela produtora como um capítulo robusto com dezenas de horas de conteúdo. O DLC será lançado exclusivamente para **PlayStation 5**, **Xbox Series X|S** e **PC**, deixando de fora os consoles da geração passada (PS4 e Xbox One) para garantir melhorias técnicas avançadas.",
  },
  {
    id: "img-witcher-2",
    type: "image",
    url: "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/378641/header.jpg",
    alt: "Screenshot oficial in-game de Geralt de Rívia em combate com espadas em The Witcher 3",
    caption:
      "A nova expansão servirá como ponte narrativa antes do lançamento de The Witcher 4.",
  },
  {
    id: "ponte-narrativa",
    type: "text",
    content:
      "## Ponte narrativa para o futuro da franquia\n\nSegundo os diretores da CD Projekt RED, além de trazer um novo arco narrativo focado em segredos do passado de Geralt, **Songs of the Past** funcionará como um elo entre a trilogia original e o aguardado **The Witcher 4** (Projeto Polaris). Apresentações guiadas com demonstração jogável estarão disponíveis no estande da empresa durante a feira na Alemanha entre 26 e 30 de agosto.\n\n---\n\n**Fonte:** [CD Projekt RED](https://www.cdprojektred.com) • [IGN](https://www.ign.com)",
  },
];

const post = {
  slug: "the-witcher-3-expansao-songs-of-the-past-anuncio-gamescom-2026",
  title: "THE WITCHER 3 ANUNCIA EXPANSÃO SONGS OF THE PAST PARA GAMESCOM 2026",
  summary:
    "CD Projekt RED confirmou a revelação da nova expansão inédita de The Witcher 3 para a Gamescom 2026. Veja a data e os primeiros detalhes.",
  body: JSON.stringify(blocks),
  category: "breaking",
  image_url:
    "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/292030/library_hero.jpg",
  image_alt:
    "Arte conceitual oficial de Geralt de Rívia em The Witcher 3 Wild Hunt",
  author_name: "The Brick",
  author_tag: "💣 Plantão",
  is_published: false,
  published_at: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

async function run() {
  const { data, error } = await supabase
    .from("posts")
    .insert(post)
    .select()
    .single();

  if (error) {
    console.error("Erro ao inserir post:", error.message);
    process.exit(1);
  }

  console.log("MATÉRIA DO DIA (WITCHER 3) CRIADA COM SUCESSO COMO RASCUNHO!");
  console.log("ID:", data.id);
  console.log("Title:", data.title);
  console.log("Slug:", data.slug);
  console.log("Is Published:", data.is_published);
}

run();
