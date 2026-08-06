import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: "./.env.local" });

const now = new Date().toISOString();

const blocks = [
  {
    id: "intro",
    type: "text",
    content:
      "A **Rockstar Games** quebrou o silêncio em torno de **Grand Theft Auto VI** de uma forma inédita: a empresa anunciou hoje (6 de agosto) que **\"Grand Theft Auto VI: An Extended Look\"**, uma apresentação aprofundada sobre o próximo jogo da série, vai estrear na **Netflix** em 27 de agosto. Pela primeira vez, um trailer da franquia não chega primeiro pelo canal da própria Rockstar no YouTube — o streaming assume a dianteira e segura o material por seis horas antes do resto do mundo.",
  },
  {
    id: "img-capa",
    type: "image",
    url: "https://static.wikia.nocookie.net/gtawiki/images/c/cf/OfficialScreenshots-GTAVI-PromotionalWebsite-ViceCity-SS2.jpg/revision/latest?cb=20250506164254",
    alt: "Avenida litorânea de Vice City com palmeiras e prédios ao longe em screenshot oficial de Grand Theft Auto VI divulgado pelo estúdio",
    caption:
      "Screenshot oficial de Grand Theft Auto VI mostra a versão recriada do litoral da Flórida no estado fictício de Leonida.",
  },
  {
    id: "horarios",
    type: "text",
    content:
      "## Horários da estreia\n\nO material estreia na **Netflix** na quinta-feira, 27 de agosto, às **12h (horário do Pacífico) / 15h (horário do Leste)**, ou **16h de Brasília**. No mesmo dia, às **18h (PT) / 21h (ET)** — **22h de Brasília** —, a apresentação também estará disponível no canal oficial da Rockstar Games no YouTube e no site oficial do Grand Theft Auto VI.\n\nOu seja: assinantes da Netflix ganham **seis horas de exclusividade** antes de o vídeo ficar aberto ao público. O streaming já montou uma página dedicada em **netflix.com/GTAVI** para receber o programa, tratado pela empresa como um lançamento de evento.",
  },
  {
    id: "img-neon",
    type: "image",
    url: "https://static.wikia.nocookie.net/gtawiki/images/c/c4/OfficialScreenshots-GTAVI-PromotionalWebsite-JasonDuval-SS1.jpg/revision/latest?cb=20250506161804",
    alt: "Jason Duval em cena de Grand Theft Auto VI em screenshot oficial do site promocional do jogo",
    caption:
      "Jason Duval é um dos protagonistas de GTA VI, ao lado de Lucia Caminos.",
  },
  {
    id: "parceria",
    type: "text",
    content:
      "## A parceria com a Netflix\n\nA **Netflix** chamou a colaboração de parceria \"first-of-its-kind\" — a primeira desse tipo —, desenhada para estrear uma apresentação da próxima evolução da franquia. **Brandon Riegg**, vice-presidente de séries de não ficção da Netflix, explicou a aposta em comunicado oficial:\n\n> \"As revelações de Grand Theft Auto se tornaram momentos culturais por direito próprio. A expectativa e a fanbase em torno de Grand Theft Auto VI são sem precedentes, e estamos honrados de que a Rockstar Games tenha se juntado a nós para estrear a próxima parte da história de Grand Theft Auto primeiro com os membros da Netflix. É um reflexo do que esperamos que a Netflix seja: um lugar onde as histórias mais ambiciosas, de qualquer mídia, encontram a maior audiência possível.\"\n\nA fala é de Riegg, executivo da Netflix, e foi reproduzida pela imprensa de games no anúncio. O streaming trata o acordo como um marco de como quer disputar atenção também no território dos videogames.",
  },
{
    id: "img-miami",
    type: "image",
    url: "https://static.wikia.nocookie.net/gtawiki/images/f/f3/OfficialScreenshots-GTAVI-PromotionalWebsite-LuciaCaminos-SS1.jpg/revision/latest?cb=20250506161813",
    alt: "Lucia Caminos em cena de Grand Theft Auto VI em screenshot oficial do site promocional do jogo",
    caption:
      "Lucia Caminos é a outra protagonista da aventura, retratada juntamente com Jason nas peças oficiais.",
  },
  {
    id: "expecativa",
    type: "text",
    content:
      "## Doze anos de espera\n\nGrand Theft Auto VI está em produção há mais de uma década — a Rockstar confirmou o jogo em fevereiro de 2022, depois de mais de oito anos de silêncio desde a chegada de GTA V aos consoles. Até hoje, a empresa liberou apenas dois trailers: a revelação histórica de dezembro de 2023, que quebrou recordes de audiência no YouTube, e o segundo trailer em maio de 2025.\n\nA comunidade esperava um novo material em junho, quando as pré-vendas abriram — mas, na ocasião, a Rockstar apresentou apenas a capa oficial do jogo. Curiosamente, nenhum dos trailers exibiu jogabilidade confirmada até hoje. Por isso, o \"Extended Look\" é encarado pelos fãs como a aposta mais provável de finalmente mostrar o jogo em ação após 13 anos de produção.\n\nO lançamento segue marcado para **19 de novembro** em **PlayStation 5** e **Xbox Series X|S**, com preço de **US$ 79,99** na edição padrão e **US$ 99,99** na Ultimate. A campanha de pré-venda, aberta em junho, posicionou o título como o mais caro da história da Rockstar.",
  },
  {
    id: "conclusao",
    type: "text",
    content:
      "## O que isso muda\n\nA jogada da Netflix confirma o tamanho de GTA VI como fenômeno cultural: a franquia já vendeu mais de **450 milhões** de cópias — GTA V sozinho ultrapassou **215 milhões** — e se tornou uma das propriedades mais lucrativas do entretenimento. Tratar um trailer como evento de streaming, com página própria na plataforma, mostra a escala que a Rockstar e a Take-Two enxergam nesta campanha.\n\nNa trama anunciada, **Jason e Lucia** são um casal que sempre soube que as cartas estavam marcadas contra eles; quando um assalto fácil dá errado, os dois caem no lado mais sombrio do lugar mais ensolarado da América, em meio a uma conspiração criminal que se espalha pelo estado fictício de **Leonida**. O que exatamente o programa de 27 de agosto vai mostrar, porém, a Rockstar não confirma — e é exatamente essa dúvida que segura a expectativa.\n\n**Fonte:** [Gematsu](https://www.gematsu.com/2026/08/grand-theft-auto-vi-an-extended-look-premieres-august-27) • [Variety](https://variety.com/2026/gaming/news/gta-6-trailer-netflix-youtube-aug-27-1236789693/) • [Collider](https://collider.com/grand-theft-auto-6-netflix-release/)",
  },
];

const post = {
  slug: "gta-vi-an-extended-look-estreia-na-netflix-em-27-de-agosto",
  title: "GTA VI ESTREIA 'EXTENDED LOOK' NA NETFLIX ANTES DO YOUTUBE",
  summary:
    "A Rockstar anunciou que \"Grand Theft Auto VI: An Extended Look\" estreia no Netflix em 27 de agosto, seis horas antes de chegar ao YouTube. Veja os horários e o que isso significa.",
  category: "breaking",
  image_url:
    "https://variety.com/wp-content/uploads/2026/08/Grand-Theft-Auto-6.jpg",
  image_alt:
    "Arte oficial de Jason e Lucia em frente a um posto de gasolina, peça promocional que acompanhou o anúncio de Grand Theft Auto VI: An Extended Look na Netflix",
  author_name: "The Brick",
  author_tag: "💣 Plantão",
  is_published: false,
  published_at: null,
  created_at: now,
  updated_at: now,
  body: JSON.stringify(blocks),
};

const cjk = /[\u4e00-\u9fff]/u;

const images = [
  post.image_url,
  ...JSON.parse(post.body)
    .filter((block) => block.type === "image")
    .map((block) => block.url),
];

if (post.title.length > 70) {
  throw new Error(`Título longo: ${post.title.length} (máx 70)`);
}

if (cjk.test(JSON.stringify(post))) {
  throw new Error("Conteúdo CJK detectado");
}

if (new Set(images).size !== images.length) {
  throw new Error("Imagem repetida na matéria");
}

console.log(
  `VALID title=${post.title.length} summary=${post.summary.length} images=${images.length}`,
);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const { data: existing, error: lookupError } = await supabase
  .from("posts")
  .select("id, slug, is_published")
  .eq("slug", post.slug)
  .maybeSingle();

if (lookupError) {
  throw lookupError;
}

if (existing) {
  const { data, error } = await supabase
    .from("posts")
    .update({
      body: post.body,
      image_url: post.image_url,
      image_alt: post.image_alt,
      updated_at: now,
    })
    .eq("slug", post.slug)
    .select("id, slug, is_published, title")
    .single();

  if (error) {
    throw error;
  }

  console.log(JSON.stringify({ status: "updated", ...data }));
  process.exit(0);
}

const { data, error } = await supabase
  .from("posts")
  .insert(post)
  .select("id, slug, is_published, title")
  .single();

if (error) {
  throw error;
}

console.log(JSON.stringify({ status: "created", ...data }));