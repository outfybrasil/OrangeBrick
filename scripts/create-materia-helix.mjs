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
      "O próximo Xbox pode transformar compatibilidade com jogos antigos no seu maior argumento de venda. Um documento vazado, repercutido nesta semana por veículos especializados, descreve o **Project Helix** como uma plataforma capaz de reunir jogos do Xbox original, Xbox 360, Xbox One e Xbox Series, além de títulos de PC. A informação ainda não foi confirmada pela Microsoft, mas chega num momento em que a Sony prepara uma virada radical para o PlayStation: novos jogos físicos deixarão de ser produzidos a partir de 2028.",
  },
  {
    id: "img-helix",
    type: "image",
    url: "/editorial/2026-08-07/xbox-helix.webp",
    alt: "Console Xbox futurista ao lado de uma pilha de jogos físicos de várias gerações, representando a compatibilidade do Project Helix",
    caption:
      "O Project Helix ainda não teve especificações completas reveladas, mas a compatibilidade aparece como prioridade da próxima geração do Xbox.",
  },
  {
    id: "leak",
    type: "text",
    content:
      "## O que o documento vazado afirma\n\nSegundo a apuração do Tom's Hardware, o memorando orienta a Microsoft a trabalhar com editoras para ampliar o catálogo compatível do próximo Xbox. A proposta seria fazer o **Helix** rodar jogos de todas as gerações da marca, desde que cada detentor de direitos autorize a distribuição ou a emulação do título. Isso é importante porque compatibilidade não depende apenas de potência: trilhas licenciadas, contratos antigos, periféricos e versões removidas das lojas podem impedir uma conversão automática.\n\nO mesmo material menciona uma expansão da compatibilidade para PC. Jogos selecionados do Xbox 360 poderiam chegar ao Windows por meio da iniciativa de retrocompatibilidade que a Microsoft começou a testar em 2026. O documento também cita uma solução de conversão de mídia física em licença digital, descrita por reportagens como **Disc to Digital**. A ideia permitiria associar certos discos de Xbox One e Xbox Series à conta do jogador, reduzindo o problema de um futuro aparelho sem leitor.\n\nNada disso equivale a um anúncio. O vazamento pode refletir uma meta interna, uma apresentação para parceiros ou um plano que ainda será alterado. A própria imprensa que publicou os detalhes alerta que licenciamento e aprovação das editoras serão decisivos.",
  },
  {
    id: "img-physical",
    type: "image",
    url: "/editorial/2026-08-07/playstation-digital-shift.webp",
    alt: "Pessoa segurando um disco de jogo diante de um console PlayStation, representando a transição da mídia física para o digital",
    caption:
      "A mudança do PlayStation para lançamentos digitais torna a preservação e a posse dos jogos físicos uma questão central na disputa da próxima geração.",
  },
  {
    id: "impact",
    type: "text",
    content:
      "## Xbox e PlayStation estão escolhendo caminhos opostos?\n\nA comparação com a Sony dá peso ao rumor. Em julho, a PlayStation confirmou que deixará de fabricar discos para novos jogos a partir de janeiro de 2028. Os varejistas ainda poderão vender códigos de download, mas a mídia física deixará de ser o formato padrão para lançamentos inéditos. A decisão atingirá diretamente colecionadores, lojas e jogadores que dependem de cópias que funcionem sem servidores ativos.\n\nA Microsoft, por outro lado, tenta transformar o passado em vantagem competitiva. Em março, durante a GDC, a executiva Asha Sharma afirmou que o próximo Xbox “vai liderar em desempenho e rodar seus jogos de Xbox e PC” — tradução nossa a partir da publicação oficial da Xbox Wire. A fala não confirma que todos os jogos antigos funcionarão, nem revela se o aparelho terá leitor, mas estabelece a direção pública: o ecossistema será mais amplo do que um console tradicional.\n\nO impacto comercial seria enorme se a promessa se concretizar. Um jogador poderia levar uma biblioteca acumulada por décadas para um hardware novo, comprar jogos de PC dentro da mesma conta e usar o Game Pass como camada de descoberta. Para a Microsoft, isso cria um motivo concreto para permanecer no ecossistema Xbox mesmo quando os lançamentos também chegam ao computador. Para a Sony, a aposta digital precisa compensar a perda de conveniência da mídia física com preservação, preços e acesso duradouro.\n\n## O que já é fato e o que continua rumor\n\nA existência do Project Helix e o suporte a jogos de Xbox e PC foram anunciados oficialmente. A retrocompatibilidade ampliada, a chegada de jogos do Xbox 360 ao PC e o sistema **Disc to Digital** aparecem apenas em documentos vazados e reportagens baseadas em fontes anônimas. Não há data de lançamento, preço, lista de jogos ou confirmação de que o aparelho terá leitor.\n\nPor isso, a notícia é grande, mas não deve ser tratada como especificação final. Se a Microsoft conseguir entregar uma biblioteca realmente ampla, o Helix pode fazer da preservação o diferencial mais importante da próxima geração. Se depender de autorizações fragmentadas e conversões individuais, a promessa corre o risco de virar apenas mais uma camada de marketing. O próximo movimento público da Xbox será decisivo para separar o projeto ambicioso do produto que chegará às lojas.",
  },
  {
    id: "sources",
    type: "text",
    content:
      "**Fonte:** [Xbox Wire](https://news.xbox.com/en-us/2026/03/11/project-helix-building-next-generation-of-xbox/), [Tom's Hardware](https://www.tomshardware.com/video-games/xbox/microsoft-wants-the-next-gen-xbox-helix-to-play-every-xbox-game-ever-made-as-it-urges-publishers-to-opt-in-new-report-also-claims-xbox-360-games-coming-to-pc-soon), [TechRadar](https://www.techradar.com/gaming/leaked-document-suggests-microsofts-rumored-disc-to-digital-feature-will-roll-out-this-month-and-allow-users-to-play-the-xbox-360-catalogue-on-project-helix), [PlayStation.Blog](https://blog.playstation.com/2026/07/01/physical-disc-production-ending-in-january-2028-for-new-games-releasing-on-playstation-consoles/)",
  },
];

const post = {
  slug: "project-helix-pode-rodar-todos-os-jogos-do-xbox",
  title: "PROJECT HELIX PODE RODAR TODOS OS JOGOS DO XBOX",
  summary:
    "Documento vazado aponta compatibilidade ampla no próximo Xbox, enquanto a Sony abandona discos; entenda o choque entre Helix e PlayStation.",
  body: JSON.stringify(blocks),
  category: "hardware",
  image_url: "/editorial/2026-08-07/xbox-helix.webp",
  image_alt:
    "Console Xbox futurista ao lado de jogos físicos de várias gerações, representando o Project Helix e sua possível retrocompatibilidade",
  author_name: "The Brick",
  author_tag: "🛠️ Hard News",
  is_published: false,
  published_at: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const { data, error } = await supabase.from("posts").insert(post).select().single();

if (error) {
  console.error("Erro ao inserir post:", error.message);
  process.exit(1);
}

console.log(JSON.stringify({ id: data.id, slug: data.slug, is_published: data.is_published }));
