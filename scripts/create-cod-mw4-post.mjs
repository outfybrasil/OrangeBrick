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
      "A **Activision** confirmou hoje (21 de julho) a data oficial de lançamento de **Call of Duty: Modern Warfare 4** para **23 de outubro de 2026**. Além do anúncio da data, a publisher divulgou o cronograma completo das fases de teste beta e surpreendeu ao confirmar que o novo título terá suporte nativo e participação garantida no beta aberto no **Nintendo Switch 2**.",
  },
  {
    id: "img-cod-beta",
    type: "image",
    url: "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1938090/header.jpg",
    alt: "Captura in-game oficial de Call of Duty em combate acelerado de primeira pessoa",
    caption:
      "O beta aberto em agosto marcará a estreia da franquia no hardware do Nintendo Switch 2.",
  },
  {
    id: "calendario-beta",
    type: "text",
    content:
      "## Calendário do beta e evento oficial\n\nA revelação completa do modo multijogador acontecerá durante o evento anual **Call of Duty: NEXT**, agendado para o dia **21 de agosto de 2026**. Logo após a transmissão, a primeira fase do beta será liberada:\n\n- **Acesso Antecipado (21 a 25 de agosto):** Exclusivo para jogadores que garantirem a pré-venda no **PS5**, **Xbox Series X|S** e **PC**.\n- **Beta Aberto Global (28 de agosto a 1 de setembro):** Disponível para todos os jogadores em todas as plataformas, incluindo o **Nintendo Switch 2** sem necessidade de pré-venda prévia.",
  },
  {
    id: "img-cod-gameplay",
    type: "image",
    url: "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/2519060/header.jpg",
    alt: "Screenshot oficial do modo multiplayer de Call of Duty com soldados em operação tática",
    caption:
      "O evento Call of Duty: NEXT em 21 de agosto revelará o primeiro gameplay completo do multiplayer.",
  },
  {
    id: "nintendo-retorno",
    type: "text",
    content:
      "## O retorno da franquia aos consoles Nintendo\n\nAs pré-vendas digitais para a versão do **Switch 2** terão início no dia **26 de agosto**. A chegada de **Modern Warfare 4** marca o retorno definitivo da franquia aos consoles da Nintendo após mais de uma década, operando com um motor gráfico adaptado especificamente para o novo hardware portátil.\n\n---\n\n**Fonte:** [Eurogamer](https://www.eurogamer.net) • [IGN](https://www.ign.com)",
  },
];

const post = {
  slug: "call-of-duty-modern-warfare-4-beta-nintendo-switch-2-data-outubro",
  title: "CALL OF DUTY MW4 CONFIRMA BETA NO SWITCH 2 E CHEGA EM 23 DE OUTUBRO",
  summary:
    "Activision revelou detalhes do lançamento de Call of Duty: Modern Warfare 4 para outubro e confirmou beta aberto com suporte nativo ao Nintendo Switch 2.",
  body: JSON.stringify(blocks),
  category: "breaking",
  image_url:
    "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1938090/library_hero.jpg",
  image_alt:
    "Arte oficial de Call of Duty: Modern Warfare 4 destacando os soldados em combate militar de alta fidelidade",
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

  console.log("NOVA MATÉRIA CRIADA COM SUCESSO COMO RASCUNHO!");
  console.log("ID:", data.id);
  console.log("Title:", data.title);
  console.log("Slug:", data.slug);
  console.log("Is Published:", data.is_published);
}

run();
