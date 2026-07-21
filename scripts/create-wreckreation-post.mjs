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
      "O recém-formado estúdio **When Tides Turn**, liderado por **Fiona Sperry** (cofundadora da Criterion Games e criadora de *Burnout*), anunciou hoje (21 de julho) o desenvolvimento de **Wreckreation 2**. O novo jogo de corrida arcade em mundo aberto está confirmado para **PlayStation 5**, **Xbox Series X|S** e **PC**.",
  },
  {
    id: "img-wreck-1",
    type: "image",
    url: "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1839940/header.jpg",
    alt: "Captura in-game oficial de corrida arcade com veículos em alta velocidade e acotovelamento",
    caption:
      "Wreckreation 2 aposta em física de capotamento e agressividade tática nas pistas.",
  },
  {
    id: "proposta-e-cidade",
    type: "text",
    content:
      "## Destruição tática e o mapa de Heartbreak City\n\nDiferente de simuladores convencionais, **Wreckreation 2** foca na essência visceral dos jogos de corrida arcade dos anos 2000. Ambientado na fictícia e densa metrópole de **Heartbreak City**, o projeto traz como pilar central as disputas agressivas, atalhos perigosos e destruição tática de veículos nas ruas e rodovias da cidade.",
  },
  {
    id: "img-wreck-2",
    type: "image",
    url: "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1262540/header.jpg",
    alt: "Screenshot oficial de carro esportivo em corrida urbana noturna",
    caption:
      "O estúdio When Tides Turn é composto por veteranos das franquias Burnout e Need for Speed.",
  },
  {
    id: "desenvolvimento-comunitario",
    type: "text",
    content:
      "## Foco no feedback da comunidade\n\nSegundo Fiona Sperry, a sequência está sendo projetada a partir de conversas diretas com fãs do gênero para aprimorar a dirigibilidade e a progressão de carreira. Embora uma data exata de lançamento ainda não tenha sido confirmada, a publisher promete revelar as primeiras demonstrações de jogabilidade nos próximos meses.\n\n---\n\n**Fonte:** [Gematsu](https://www.gematsu.com) • [Insider Gaming](https://insider-gaming.com)",
  },
];

const post = {
  slug: "wreckreation-2-anunciado-criadores-burnout-ps5-xbox-pc",
  title: "WRECKREATION 2 E ANUNCIADO PELOS CRIADORES DE BURNOUT PARA PS5 E PC",
  summary:
    "When Tides Turn anunciou Wreckreation 2, novo jogo de corrida arcade em mundo aberto focado em destruição e velocidade. Confira os primeiros detalhes.",
  body: JSON.stringify(blocks),
  category: "breaking",
  image_url:
    "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1839940/library_hero.jpg",
  image_alt:
    "Arte conceitual oficial de Wreckreation 2 com carros esportivos em disputas de alta velocidade",
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

  console.log("OUTRA MATÉRIA DO DIA (WRECKREATION 2) CRIADA COM SUCESSO!");
  console.log("ID:", data.id);
  console.log("Title:", data.title);
  console.log("Slug:", data.slug);
  console.log("Is Published:", data.is_published);
}

run();
