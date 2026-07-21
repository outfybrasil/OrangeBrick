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
      "A **Halo Studios** (antiga 343 Industries) anunciou hoje a data oficial de lançamento de **Halo: Campaign Evolved**. O título é um **remake completo** desenvolvido do zero no motor **Unreal Engine 5** a partir da campanha clássica de 2001. A estreia mundial está agendada para **28 de julho de 2026** no **PlayStation 5**, **Xbox Series X|S** e **PC** (Steam e Xbox Store), com disponibilidade no **Game Pass** no dia do lançamento.",
  },
  {
    id: "img-halo-1",
    type: "image",
    url: "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1240440/header.jpg",
    alt: "Screenshot oficial in-game de combate futurista com Master Chief em perspectiva de primeira pessoa",
    caption:
      "O remake foi reconstruído do zero no Unreal Engine 5 e chegará simultaneamente ao PS5, Xbox e PC.",
  },
  {
    id: "novidades",
    type: "text",
    content:
      "## Novidades na campanha e missões inéditas\n\nDiferente de remasterizações anteriores, **Campaign Evolved** traz uma reformulação visual e técnica profunda, incluindo novas cenas cinematográficas, física atualizada e dublagem retrabalhada. Além das missões originais de Master Chief na instalação 04, a versão inclui o capítulo inédito **Operation: METEORITE** — uma sequência de três missões focadas na origem da operação ao lado do Sargento Johnson.",
  },
  {
    id: "img-halo-2",
    type: "image",
    url: "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/976730/header.jpg",
    alt: "Cena oficial do jogo Halo mostrando combate tático e cenários sci-fi",
    caption:
      "O jogo incluirá três missões inéditas de história e suporte a co-op cross-platform para quatro jogadores.",
  },
  {
    id: "coop-e-acesso",
    type: "text",
    content:
      "## Co-op de até 4 jogadores e acesso antecipado\n\nO jogo contará com suporte a cooperação local em tela dividida para dois jogadores nos consoles, além de **co-op online cross-platform para até quatro participantes**. Jogadores que garantirem as edições **Premium** ou **Collector's** terão acesso antecipado a partir de **23 de julho**.\n\n---\n\n**Fonte:** [Eurogamer](https://www.eurogamer.net) • [Xbox Wire](https://news.xbox.com)",
  },
];

const post = {
  slug: "halo-campaign-evolved-remake-unreal-engine-5-data-lancamento",
  title: "HALO CAMPAIGN EVOLVED REVELA REMAKE EM UE5 E DATA PARA 28 DE JULHO",
  summary:
    "Halo Studios confirmou o lançamento do remake em Unreal Engine 5 de Halo Combat Evolved para PS5, Xbox e PC. Veja as novidades e a data de lançamento.",
  body: JSON.stringify(blocks),
  category: "breaking",
  image_url:
    "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/976730/library_hero.jpg",
  image_alt:
    "Arte conceitual oficial de Halo mostrando Master Chief com armadura Mjolnir e o anel Halo no horizonte",
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

  console.log("MATÉRIA DE HALO CRIADA COM SUCESSO COMO RASCUNHO!");
  console.log("ID:", data.id);
  console.log("Title:", data.title);
  console.log("Slug:", data.slug);
  console.log("Is Published:", data.is_published);
}

run();
