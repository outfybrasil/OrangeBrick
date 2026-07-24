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
      "A **Microsoft** deu o primeiro passo oficial para democratizar o acesso ao seu serviço de jogos na nuvem. A empresa iniciou hoje (24 de julho) os testes de um modelo **gratuito do Xbox Cloud Gaming financiado por anúncios**, permitindo que jogadores transmitam títulos diretamente de suas bibliotecas digitais sem a necessidade de pagar pela assinatura do **Xbox Game Pass Ultimate**.",
  },
  {
    id: "img-cloud-mobile",
    type: "image",
    url: "https://images.unsplash.com/photo-1592155931584-901ac15763e3?q=80&w=1920&auto=format&fit=crop",
    alt: "Dispositivo móvel com controle adaptado rodando jogo via transmissão de dados em nuvem",
    caption:
      "O novo plano gratuito permitirá sessões de streaming de até 1 hora no Xbox Insider mediante a exibição de comerciais prévios.",
  },
  {
    id: "regras-e-funcionamento",
    type: "text",
    content:
      "## Como funcionam as sessões e a exibição de comerciais\n\nNesta primeira fase de testes voltada para integrantes do programa **Xbox Insider**, os usuários precisam assistir a um bloco de anúncios antes de iniciar a partida. As sessões têm duração máxima de **1 hora contínua**, sendo possível iniciar uma nova sessão logo em seguida após a visualização de novos comerciais. A Microsoft enfatizou que os anúncios **nunca interromperão a jogabilidade** no meio da partida.",
  },
  {
    id: "img-tech-servers",
    type: "image",
    url: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=1920&auto=format&fit=crop",
    alt: "Painel tecnológico com telas digitais e infraestrutura de servidores de alta velocidade",
    caption:
      "A infraestrutura em nuvem expande o alcance dos jogos para consoles antigos como o Xbox One e navegadores sem custo de assinatura.",
  },
  {
    id: "estrategia-e-mercado",
    type: "text",
    content:
      "## Foco em acessibilidade e expansão global\n\nA iniciativa visa atrair jogadores que ainda utilizam consoles de gerações anteriores, como o **Xbox One**, além de expandir a presença da marca em mercados emergentes onde o custo de hardware atual é elevado. Caso os testes no Xbox Insider obtenham feedback positivo, o recurso deverá ser liberado gradualmente para o público geral nos próximos meses.\n\n---\n\n**Fonte:** [Eurogamer](https://www.eurogamer.net) • [IGN](https://www.ign.com)",
  },
];

const post = {
  slug: "xbox-cloud-gaming-gratuito-anuncios-teste-xbox-insider-julho-2026",
  title: "XBOX TESTA CLOUD GAMING GRATUITO E SEM GAME PASS COM ANÚNCIOS",
  summary:
    "A Microsoft iniciou testes no Xbox Insider para liberar jogos na nuvem gratuitamente via anúncios prévios, sem exigir assinatura do Game Pass.",
  body: JSON.stringify(blocks),
  category: "breaking",
  image_url:
    "https://images.unsplash.com/photo-1600080972464-8e5f35f63d08?q=80&w=1920&auto=format&fit=crop",
  image_alt:
    "Controle sem fio em ambiente moderno com iluminação verde destacando a marca Xbox",
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

  console.log("MATÉRIA DO DIA (XBOX CLOUD) CRIADA COM SUCESSO COMO RASCUNHO!");
  console.log("ID:", data.id);
  console.log("Título:", data.title);
  console.log("Slug:", data.slug);
  console.log("Publicado?:", data.is_published);
}

run();
