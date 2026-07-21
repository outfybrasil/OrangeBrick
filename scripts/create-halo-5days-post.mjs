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
      "Faltam apenas **5 dias** para um dos momentos mais aguardados do ano na indústria dos games. No dia **28 de julho de 2026** (com acesso antecipado liberado já em **23 de julho**), **Halo: Campaign Evolved** chega simultaneamente ao **PlayStation 5**, **Xbox Series X|S** e **PC**. Trata-se da recriação completa da campanha clássica de 2001, construída do zero no motor **Unreal Engine 5**.",
  },
  {
    id: "img-halo-ue5",
    type: "image",
    url: "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1240440/header.jpg",
    alt: "Captura in-game oficial do remake de Halo no Unreal Engine 5 em combate de primeira pessoa",
    caption:
      "Com gráficos em Unreal Engine 5, o jogo promete renovar o visual clássico com iluminação e física de última geração.",
  },
  {
    id: "o-que-esperar",
    type: "text",
    content:
      "## O que esperar da reformulação visual e técnica\n\nO grande atrativo desta nova versão é o salto tecnológico. A **Halo Studios** abandonou as ferramentas legadas para entregar iluminação global por traçado de raios (Ray Tracing), modelos de personagens ultra-detalhados e fisica de destruição dinâmica. A atmosfera original do anel Halo foi preservada, mas adaptada aos padrões visuais das plataformas da atual geração.",
  },
  {
    id: "img-halo-combat",
    type: "image",
    url: "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/976730/header.jpg",
    alt: "Cena oficial do jogo Halo com Master Chief em operação tática",
    caption:
      "O remake trará três missões inéditas de prólogo e suporte a co-op online cross-platform.",
  },
  {
    id: "novos-conteudos",
    type: "text",
    content:
      "## Missões inéditas de história e estreia no PS5\n\nAlém do aprimoramento gráfico, os jogadores encontrarão o arco inédito **Operation: METEORITE** — três missões de prólogo que antecedem os eventos da campanha original e mostram Master Chief ao lado do Sargento Johnson. Outro marco histórico é a estreia da franquia nos consoles da Sony, contando com suporte a **co-op cross-platform para até 4 jogadores** e disponibilidade no **Xbox Game Pass** no dia do lançamento.\n\n---\n\n**Fonte:** [Eurogamer](https://www.eurogamer.net) • [Xbox Wire](https://news.xbox.com)",
  },
];

const post = {
  slug: "halo-campaign-evolved-faltam-5-dias-o-que-esperar-do-remake",
  title: "HALO CAMPAIGN EVOLVED CHEGA EM 5 DIAS: VEJA O QUE ESPERAR DO REMAKE",
  summary:
    "Faltando apenas 5 dias para a estreia no PS5, Xbox e PC, o remake em Unreal Engine 5 de Halo promete revolucionar a franquia. Confira o que esperar.",
  body: JSON.stringify(blocks),
  category: "breaking",
  image_url:
    "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/976730/library_hero.jpg",
  image_alt:
    "Arte oficial de Master Chief com o anel Halo, antecipando o lançamento do remake Halo: Campaign Evolved",
  author_name: "The Brick",
  author_tag: "💣 Plantão",
  is_published: false,
  published_at: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

async function run() {
  // First clean up previous test draft
  await supabase
    .from("posts")
    .delete()
    .eq("slug", "halo-campaign-evolved-remake-unreal-engine-5-data-lancamento");

  // Insert the updated 5-day hype post
  const { data, error } = await supabase
    .from("posts")
    .insert(post)
    .select()
    .single();

  if (error) {
    console.error("Erro ao inserir post:", error.message);
    process.exit(1);
  }

  console.log("MATÉRIA DE 5 DIAS PARA HALO CRIADA COMO RASCUNHO!");
  console.log("ID:", data.id);
  console.log("Title:", data.title);
  console.log("Slug:", data.slug);
  console.log("Is Published:", data.is_published);
}

run();
