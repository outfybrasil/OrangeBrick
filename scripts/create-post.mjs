import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: "../.env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const blocks = [
  {
    id: "intro",
    type: "text",
    content:
      "Depois de oito anos presa no mundo da realidade virtual, a saga de **Quill**, a ratinha aventureira, finalmente chegou às telas planas. **Moss: The Forgotten Relic** foi lançado hoje (16 de julho) para **Nintendo Switch 2**, **Switch**, **PlayStation 5**, **Xbox Series X|S**, **Xbox One** e **Steam** — e não, você não precisa de um headset VR para jogar. O lançamento é também a história de sobrevivência da **Polyarc**, estúdio que demitiu dois terços da equipe em março e aposta todas as fichas nessa estreia.",
  },
  {
    id: "img-vr",
    type: "image",
    url: "https://images.unsplash.com/photo-1758874572979-bd0f18d34565?auto=format&fit=crop&w=1200&q=80",
    alt: "Homem usando óculos de realidade virtual no sofá, representando a origem de Moss como franquia exclusiva de VR antes de migrar para telas planas",
    caption:
      "Moss nasceu no VR em 2018 e foi aclamado pela crítica — hoje, o jogo chega a um público muito maior sem headset.",
  },
  {
    id: "detalhes",
    type: "text",
    content:
      "## O que vem no pacote\n\n**The Forgotten Relic** reúne **Moss** (2018) e **Moss: Book II** (2022) com todo o DLC **Twilight Garden** num único jogo por **US$ 19,99** — menos que a maioria dos lançamentos padrão. O pacote inclui cenas novas produzidas para essa versão e um modo **Skip Combat** que permite focar só na exploração e nos puzzles.\n\nA grande questão técnica era a câmera. No VR, o jogador movia a cabeça para olhar os cenários em diorama. Sem o headset, a **Polyarc** criou a **Smart Follow Camera**: um sistema que reposiciona a câmera dinamicamente para manter Quill e o cenário sempre legíveis. O sistema de controle **Twofold** também foi adaptado: o **analógico esquerdo** controla Quill, o **direito** controla o cursor do Reader (que interage com objetos no cenário). No Switch 2, dá pra usar a tela sensível ao toque também.",
  },
  {
    id: "img-console",
    type: "image",
    url: "https://images.unsplash.com/photo-1758611970807-2002c7abf952?auto=format&fit=crop&w=1200&q=80",
    alt: "Jogador no sofá jogando videogame com controle, simbolizando a experiência de jogar Moss em telas planas sem headset VR",
    caption:
      "A ratinha Quill agora pode ser controlada com qualquer controle tradicional — sem óculos, sem motion controllers.",
  },
  {
    id: "reviews",
    type: "text",
    content:
      "## O que a crítica achou\n\nCom **80 de 100** no **OpenCritic** e **94% de recomendação**, a adaptação convenceu a maioria. O **IGN** deu **8/10**, chamando o jogo de \"um conto de fadas incrivelmente charmoso\". A **ZTGD** cravou **9/10**. Já o **Nintendo World Report** anotou **7,5/10**, criticando a câmera em momentos específicos — \"impossível julgar a posição das plataformas\", disse o revisor.\n\nO veredito geral: a essência emocional do jogo — a expressividade de Quill, os cenários em diorama, a narração de **Morla Gorrondona** — sobreviveu à migração. O que se perdeu foi a sensação de presença física que só o VR proporciona.\n\n## A crise do VR\n\nA Polyarc demitiu **~30 funcionários** (dois terços do estúdio) em março de 2026 depois que um projeto não anunciado perdeu funding com a retração da **Meta** no desenvolvimento de jogos VR. O movimento da Polyarc de levar Quill para telas planas é o exemplo mais visível de estúdios VR apostando em audiências que não podiam alcançar antes — e pode ser o modelo de sobrevivência para uma indústria que viu **nDreams**, **Rec Room**, **Cloudhead Games** e estúdios internos da Meta fecharem ou encolherem em 2026.\n\n---\n\n**Fonte:** [TechTimes](https://www.techtimes.com/articles/320694/20260716/moss-forgotten-relic-launches-consoles-today-after-8-years-vr-smart-camera-makes-it-work.htm) • [Road to VR](https://roadtovr.com/moss-polyarc-layoffs-project-cancellation-2026/) • [OpenCritic](https://opencritic.com/game/20976/moss-the-forgotten-relic)",
  },
];

const post = {
  slug: "moss-forgotten-relic-lancamento-consoles-fim-exclusividade-vr",
  title:
    "MOSS: THE FORGOTTEN RELIC SAI DO VR E CHEGA HOJE A TODOS OS CONSOLES POR US$ 20",
  summary:
    "Aclamada saga da ratinha Quill foi lançada para Switch 2, PS5, Xbox e PC sem necessidade de headset. Polyarc sobreviveu a demissões em massa e aposta tudo na estreia em telas planas.",
  body: JSON.stringify(blocks),
  category: "industry",
  image_url: "https://images.pexels.com/photos/33562568/pexels-photo-33562568.jpeg?auto=compress&cs=tinysrgb&w=1200",
  image_alt: "Miniatura de casa de madeira em tronco de árvore em floresta verde, representando o mundo encantado em diorama de Moss: The Forgotten Relic",
  author_name: "The Brick",
  author_tag: "📡 Radar",
  is_published: false,
  published_at: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const { data, error } = await supabase.from("posts").insert(post).select().single();

if (error) {
  console.error("Erro:", error.message);
  process.exit(1);
}

console.log("OK ID:", data.id);
console.log("Slug:", data.slug);
