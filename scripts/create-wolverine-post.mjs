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
      "A **Insomniac Games** e a **Sony Interactive Entertainment** oficializaram a data de lançamento de **Marvel's Wolverine**. O aguardado título de ação exclusivo para o **PlayStation 5** chegará às lojas no dia **15 de setembro de 2026**. Além de confirmar a data, a produtora revelou um trailer inédito de história que apresenta trechos inéditos de jogabilidade e confirma a presença de figuras históricas dos quadrinhos dos X-Men.",
  },
  {
    id: "img-ps5-dualsense",
    type: "image",
    url: "https://images.unsplash.com/photo-1606813907291-d86efa9b94db?q=80&w=1920&auto=format&fit=crop",
    alt: "Console PlayStation 5 e controle DualSense iluminados em estúdio gamer",
    caption:
      "Marvel's Wolverine aproveitará a resposta tátil e gatilhos adaptáveis do DualSense para simular a retração e o impacto das garras de adamantium.",
  },
  {
    id: "elenco-e-viloes",
    type: "text",
    content:
      "## Alianças perigosas e vilões clássicos\n\nO novo vídeo focado na narrativa mostra Logan enfrentando a temida organização ninja **The Hand** (O Tentáculo) nas ruas de Madripoor. A prévia confirmou que **Jean Grey** será uma aliada central na jornada de Logan, enquanto vilões icônicos como **Dentes de Sabre**, **Lady Lethal** (Lady Deathstrike) e **Ômega Red** atuarão como antagonistas principais ao longo da campanha solo.",
  },
  {
    id: "img-dev-tech",
    type: "image",
    url: "https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=1920&auto=format&fit=crop",
    alt: "Estação de trabalho em estúdio de desenvolvimento de jogos com monitores e gráficos tridimensionais",
    caption:
      "Desenvolvido na mesma engine de Marvel's Spider-Man 2, o título foca em combate visceral com classificação indicativa para adultos.",
  },
  {
    id: "combate-e-recursos",
    type: "text",
    content:
      "## Combate maduro e tecnologia de ponta no PS5\n\nDiferente de produções anteriores do estúdio, **Marvel's Wolverine** foi projetado desde o início para receber classificação indicativa adulta (M for Mature), apresentando combate corpo a corpo violento, desmembramentos e regeneração em tempo real no corpo do protagonista. A Insomniac também destacou o uso intensivo de **Ray Tracing** nos reflexos e iluminação global.\n\n---\n\n**Fonte:** [PlayStation.Blog](https://blog.playstation.com) • [IGN Brasil](https://br.ign.com)",
  },
];

const post = {
  slug: "marvels-wolverine-data-lancamento-setembro-2026-ps5-trailer",
  title: "MARVEL'S WOLVERINE CONFIRMA DATA NO PS5 E REVELA DENTES DE SABRE",
  summary:
    "A Insomniac Games confirmou o lançamento de Marvel's Wolverine para 15 de setembro de 2026 no PS5, revelando Jean Grey e Dentes de Sabre no novo trailer.",
  body: JSON.stringify(blocks),
  category: "breaking",
  image_url:
    "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?q=80&w=1920&auto=format&fit=crop",
  image_alt:
    "Ilustração de herói de ação com garras em ambiente urbano noturno sob chuva forte",
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
    .upsert(post, { onConflict: "slug" })
    .select()
    .single();

  if (error) {
    console.error("Erro ao inserir post:", error.message);
    process.exit(1);
  }

  console.log("MATÉRIA DO DIA CRIADA COM SUCESSO COMO RASCUNHO!");
  console.log("ID:", data.id);
  console.log("Título:", data.title);
  console.log("Slug:", data.slug);
  console.log("Publicado?:", data.is_published);
}

run();
