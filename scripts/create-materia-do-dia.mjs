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
      "A Sony liberou hoje (21 de julho) a nova leva de jogos para os assinantes dos planos **PS Plus Extra** e **Deluxe**. A seleção deste mês se destaca por trazer dois grandes lançamentos de peso do último ano: a aventura em mundo aberto **Avatar: Frontiers of Pandora**, desenvolvida pela Massive Entertainment/Ubisoft, e o RPG de ação histórico **Rise of the Ronin**, criado pela renomada Team Ninja.",
  },
  {
    id: "img-avatar",
    type: "image",
    url: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80",
    alt: "Paisagem de floresta densa e misteriosa com iluminação azulada, evocando a atmosfera de Pandora em Avatar: Frontiers of Pandora",
    caption:
      "Avatar: Frontiers of Pandora leva os jogadores ao ecossistema da Fronteira Ocidental em primeira pessoa.",
  },
  {
    id: "destaques",
    type: "text",
    content:
      "## Destaques do catálogo de julho\n\nEm **Avatar: Frontiers of Pandora**, os jogadores assumem o papel de um Na'vi reconectando-se com suas origens para proteger o planeta contra a corporação militar RDA. O título explora os recursos do PlayStation 5 com gráficos de alta fidelidade e suporte ao feedback tátil do controle DualSense.\n\nJá **Rise of the Ronin** transporta o jogador para o final do período Edo no Japão. O jogo combina a jogabilidade de combate técnico característica da Team Ninja com um vasto mapa aberto e decisões narrativas que moldam o destino do país durante a restauração Meiji.",
  },
  {
    id: "img-ronin",
    type: "image",
    url: "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=1200&q=80",
    alt: "Ilustração dramática no estilo arte japonesa tradicional com guerreiro samurai, alusiva a Rise of the Ronin da Team Ninja",
    caption:
      "Rise of the Ronin combina combate exigente com a exploração livre do Japão feudal do século XIX.",
  },
  {
    id: "outros-jogos",
    type: "text",
    content:
      "## Outras adições e como acessar\n\nAlém dos dois grandes destaques, a atualização inclui títulos como **The Planet Crafter**, **Firefighting Simulator: Ignite** e clássicos no catálogo Deluxe. Todos os jogos já estão disponíveis para download direto pela biblioteca da PlayStation Store para membros ativos do serviço.\n\n---\n\n**Fonte:** [PlayStation Blog](https://blog.playstation.com) • [Push Square](https://www.pushsquare.com)",
  },
];

const post = {
  slug: "avatar-frontiers-of-pandora-rise-of-the-ronin-chegam-ao-ps-plus-extra",
  title: "AVATAR E RISE OF THE RONIN CHEGAM HOJE AO CATALOGO DO PS PLUS",
  summary:
    "A Sony disponibilizou hoje títulos de peso no PS Plus Extra e Deluxe, liderados por Avatar: Frontiers of Pandora e Rise of the Ronin. Veja os detalhes da atualização do catálogo.",
  body: JSON.stringify(blocks),
  category: "industry",
  image_url:
    "https://images.unsplash.com/photo-1606813907291-d86efa9b94db?auto=format&fit=crop&w=1200&q=80",
  image_alt:
    "Console de videogame com iluminação azul em ambiente moderno, representando as novidades no catálogo do PlayStation Plus",
  author_name: "The Brick",
  author_tag: "📡 Radar",
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

  console.log("Post inserido com sucesso como RASCUNHO!");
  console.log("ID:", data.id);
  console.log("Slug:", data.slug);
  console.log("Status is_published:", data.is_published);
}

run();
