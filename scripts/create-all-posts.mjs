import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: "../.env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const posts = [
  // =========================================================
  // POST 1: COD Modern Warfare 4 Kill Block
  // =========================================================
  {
    slug: "call-of-duty-modern-warfare-4-kill-block-modo-multiplayer",
    title:
      "CALL OF DUTY MW4 REVELA KILL BLOCK: MAPAS QUE SE REMONTAM SOZINHOS ENTRE PARTIDAS",
    summary:
      "Novo modo multiplayer tem 500+ configurações de mapa possíveis, suporta 3v3 e 10v10, e estreia em outubro no PS5, Xbox, Switch 2 e PC.",
    body: JSON.stringify([
      {
        id: "intro",
        type: "text",
        content:
          "A **Activision** e a **Infinity Ward** revelaram hoje o **Kill Block**, uma experiência multiplayer inédita para **Call of Duty: Modern Warfare 4**. Em vez de mapas estáticos, o Kill Block reconstrói fisicamente o cenário entre as partidas — as linhas de tiro que você decorou em uma rodada podem simplesmente não existir mais na próxima.",
      },
      {
        id: "img-killblock",
        type: "image",
        url: "https://images.unsplash.com/photo-1606305321490-0c05711a8fb6?auto=format&fit=crop&w=1200&q=80",
        alt: "Pessoa segurando controle branco do Xbox, representando a jogatina de Call of Duty Modern Warfare 4 e seu novo modo Kill Block",
        caption:
          "Kill Block promete revolucionar o multiplayer de COD com mapas que se reorganizam sozinhos.",
      },
      {
        id: "detalhes",
        type: "text",
        content:
          "## Como funciona\n\nO Kill Block é na verdade a **West Bridge Advanced Military Training Facility**, um campo de treinamento adaptável. O mapa é montado a partir de **três seções modulares**: duas **End Slabs** (laterais) e uma **Central Slab** — que juntas formam um **Combo**. São **mais de 500 combinações** possíveis no lançamento, e os layouts podem se reconfigurar no meio da partida durante as rodadas de Gunfight.\n\nOs modos disponíveis no lançamento são **3v3 Gunfight** e o novíssimo **10v10 Gunfight**. A Activision promete adicionar mais modos multiplayer tradicionais depois do lançamento.\n\n## Onde jogar\n\nQuem estiver no **Fanatics Fest NYC** (de 16 a 19 de julho, no **Javits Center**) vai ser o primeiro público a colocar as mãos no Kill Block. Para todo mundo, o **Call of Duty: Modern Warfare 4** chega em **23 de outubro de 2026** para **PS5, Xbox Series X|S, Nintendo Switch 2 e PC**.",
      },
      {
        id: "img-gaming",
        type: "image",
        url: "https://images.unsplash.com/photo-1775410631936-7de96322df0b?auto=format&fit=crop&w=1200&q=80",
        alt: "Setup gamer com múltiplos monitores e iluminação RGB, representando o ecossistema competitivo de Call of Duty",
        caption:
          "Mais de 500 configurações de mapa prometem manter cada partida imprevisível em Modern Warfare 4.",
      },
      {
        id: "contexto",
        type: "text",
        content:
          "## Impacto\n\nO Kill Block é a aposta mais ousada da franquia em anos. Enquanto a concorrência aposta em mapas sazonais e remasterizações, a Infinity Ward está tentando resolver um problema fundamental do multiplayer competitivo: a decoreba de mapas. Se funcionar, pode mudar a forma como a série lida com rotação de conteúdo.\n\nO jogo também terá um SUV conceito da **Aston Martin** chamado **Dreadnought**, revelado hoje em parceria com a montadora.\n\n---\n\n**Fonte:** [PowerUp!](https://powerup-gaming.com/call-of-duty-modern-warfare-4s-kill-block-is-a-brand-new-multiplayer-experience/) • [GamerFuzion](https://www.gamerfuzion.com/call-of-duty-mw4-kill-block/) • [GamingTrend](https://gamingtrend.com/news/aston-martin-unveils-the-dreadnought-new-vehicle-for-modern-warfare-4-and-warzone/)",
      },
    ]),
    category: "breaking",
    image_url: "https://images.unsplash.com/photo-1762219214808-154d74e0d761?auto=format&fit=crop&w=1200&q=80",
    image_alt: "Setup gamer com monitores exibindo arte de jogo e iluminação laranja, representando a arena competitiva de Call of Duty Modern Warfare 4",
    author_name: "The Brick",
    author_tag: "💣 Plantão",
    is_published: false,
  },

  // =========================================================
  // POST 2: Final Fantasy Resonance trailer
  // =========================================================
  {
    slug: "final-f fantasy-resonance-trailer-pixel-data-lancamento-outubro",
    title:
      "FINAL FANTASY RESONANCE GANHA TRAILER PIXEL E DATA: 22 DE OUTUBRO POR US$ 50",
    summary:
      "Square Enix mostra novo trailer em pixel art cinematográfico, revela sistema Visions de batalha e confirma lançamento mundial em outubro para Switch 2, PS5, Xbox e PC.",
    body: JSON.stringify([
      {
        id: "intro",
        type: "text",
        content:
          "A **Square Enix** divulgou hoje um novo trailer de **Final Fantasy Resonance**, seu aguardado RPG em **HD-2D**. O vídeo, apelidado de **\"Pixel\" trailer**, mostra dois reinos — **Dilmagia** e **Olderion** — e detalha o sistema de batalha **Visions**, que promete ser o coração tático do jogo. O lançamento está marcado para **22 de outubro de 2026**.",
      },
      {
        id: "img-pixel",
        type: "image",
        url: "https://images.unsplash.com/vector-1757946405909-19fb99b93ef3?auto=format&fit=crop&w=1200&q=80",
        alt: "Cavaleiro pixelado em visão isométrica com espada e escudo, representando o estilo HD-2D de Final Fantasy Resonance",
        caption:
          "O estilo HD-2D de Final Fantasy Resonance combina pixel art clássico com efeitos cinematográficos modernos.",
      },
      {
        id: "detalhes",
        type: "text",
        content:
          "## O que o trailer mostra\n\nO novo trailer foca no sistema **Visions** — uma mecânica de batalha em turnos que permite aos jogadores invocar ataques especiais baseados em memórias e visões dos personagens. O jogo também tem um sistema de **stagger** para quebrar defesas inimigas.\n\nO Resonance é uma reconstrução completa de um título mobile cancelado da franquia,mas **sem sistemas gacha** — é um RPG tradicional fechado, vendido por **US$ 49,99** (versão digital deluxe por **US$ 59,99**).\n\n## Plataformas e Edição de Colecionador\n\nO jogo chega em **22 de outubro** para **Nintendo Switch 2, Nintendo Switch, PlayStation 5, Xbox Series X|S e PC** (Steam e Microsoft Store). A **Edição de Colecionador** custa **US$ 209,99** e inclui book de arte, trilha sonora e uma carta promocional do **FF Trading Card Game**.",
      },
      {
        id: "img-fantasy",
        type: "image",
        url: "https://plus.unsplash.com/premium_photo-1725609131529-aa4097a265a7?auto=format&fit=crop&w=1200&q=80",
        alt: "Dragão branco em fundo azul, simbolizando o universo de fantasia épica de Final Fantasy Resonance",
        caption:
          "Final Fantasy Resonance promete uma campanha de RPG tradicional de 30+ horas com visual HD-2D.",
      },
      {
        id: "contexto",
        type: "text",
        content:
          "## O que esperar\n\nDesenvolvido pela **Lancarse** (responsável por **Etrian Odyssey**), o Resonance é descrito como uma carta de amor aos FFs clássicos de turno — mas com a roupagem visual moderna do HD-2D que a Square Enix popularizou com **Octopath Traveler**. O jogo estava originalmente previsto para 2025, mas foi adiado para polimento.\n\nCom **mais de 30 horas de campanha** estimadas e um preço de entrada de US$ 50, a Square aposta que o público de RPG tradicional ainda existe e quer experiências completas sem microtransações.\n\n---\n\n**Fonte:** [Shane the Gamer](https://www.shanethegamer.com/nintendo/final-fantasy-resonance-new-pixel-trailer-reveals-dilmagia-olderion-ahead-of-oct-22-launch/) • [Gematsu](https://gematsu.com/) • [The Otaku Authority](https://theotakuauthority.com/final-fantasy-resonance-pixel-trailer-released/)",
      },
    ]),
    category: "industry",
    image_url: "https://images.unsplash.com/photo-1768056583420-a01f649f5088?auto=format&fit=crop&w=1200&q=80",
    image_alt: "Camiseta preta com logo de 35 anos de Final Fantasy, representando o legado da franquia que ganha mais um capítulo com Final Fantasy Resonance",
    author_name: "The Brick",
    author_tag: "📡 Radar",
    is_published: false,
  },

  // =========================================================
  // POST 3: Marvel Rivals patch
  // =========================================================
  {
    slug: "marvel-rivals-patch-julho-2026-van-dyne-couture-visuais",
    title:
      "MARVEL RIVALS REDUZ CAOS VISUAL E LANÇA VAN DYNE COUTURE COM SKINS NOVAS",
    summary:
      "Patch de julho ajusta efeitos visuais de heróis para diminuir poluição na tela, traz evento de moda com skins do Gambit e Gavião Arqueiro, e reativa o passe S3.",
    body: JSON.stringify([
      {
        id: "intro",
        type: "text",
        content:
          "A **NetEase** liberou hoje a atualização **version 20260716** de **Marvel Rivals** com uma missão nobre: diminuir a poluição visual do jogo. O patch ajusta os efeitos das habilidades de vários heróis — incluindo a **Jubileu**, que finalmente não vai mais cegar os jogadores — e promete \"deixar o campo de batalha mais limpo e legível\".",
      },
      {
        id: "img-marvel",
        type: "image",
        url: "https://images.unsplash.com/photo-1529335764857-3f1164d1cb24?auto=format&fit=crop&w=1200&q=80",
        alt: "Action figure do Homem-Aranha da Marvel em pose clássica, representando o universo Marvel Rivals e sua nova atualização visual",
        caption:
          "Marvel Rivals ajusta efeitos visuais para reduzir o caos nos confrontos de equipe.",
      },
      {
        id: "detalhes",
        type: "text",
        content:
          "## Ajustes visuais\n\nA NetEase afirmou que \"diminuiu os efeitos visuais de uma série de heróis\" para reduzir a poluição na tela. A lista é extensa demais para detalhar, mas a empresa garantiu que **todas as Team-Up abilities** novas também foram ajustadas. O problema vinha se acumulando desde o lançamento, com skins de luxo adicionando **VFX únicos** que tornavam alguns combates ilegíveis.\n\n## Evento Van Dyne Couture\n\nA atualização também marca o início do evento **Van Dyne Couture**, com skins temáticas de alta-costura para **Gambit** e **Gavião Arqueiro**. O **passe de batalha da temporada 3** está de volta como rerun, permitindo que jogadores que perderam a temporada anterior possam resgatar os itens.",
      },
      {
        id: "img-ironman",
        type: "image",
        url: "https://images.unsplash.com/photo-1572340875364-6bbeb81d709d?auto=format&fit=crop&w=1200&q=80",
        alt: "Action figure do Homem de Ferro da Marvel na armadura Bleeding Edge, representando os heróis de Marvel Rivals que tiveram efeitos visuais ajustados",
        caption:
          "Jubileu finalmente não vai mais cegar ninguém — um dos ajustes mais pedidos pela comunidade.",
      },
      {
        id: "contexto",
        type: "text",
        content:
          "## Correções e impacto\n\nAlém dos ajustes visuais, o patch corrige bugs nas **Team-Up abilities** e melhora a performance geral. A NetEase prometeu manter \"o scanner ligado\" para continuar otimizando o jogo.\n\nA PC Gamer destacou que, apesar das melhorias, o jogo ainda sofre com o excesso de informações na tela — especialmente quando todos os heróis ativam suas ultimates ao mesmo tempo. Ainda assim, jogadores relataram que ter uma Jubileu no time \"não dá mais dor de cabeça\".\n\n---\n\n**Fonte:** [PC Gamer](https://www.pcgamer.com/games/third-person-shooter/marvel-rivals-is-making-some-big-visual-changes-to-cut-down-on-battlefield-chaos-which-is-wonderful-because-my-old-brain-cant-handle-that-level-of-overstimulation/) • [Insider Gaming](https://insider-gaming.com/fortnite-servers-down-july-16/)",
      },
    ]),
    category: "industry",
    image_url: "https://images.unsplash.com/photo-1557985594-29f3ad9f5134?auto=format&fit=crop&w=1200&q=80",
    image_alt: "Action figure do Homem-Aranha da Marvel no traje do Aranha de Ferro, simbolizando o universo Marvel Rivals e sua nova temporada",
    author_name: "The Brick",
    author_tag: "📡 Radar",
    is_published: false,
  },

  // =========================================================
  // POST 4: Kyoto Xanadu
  // =========================================================
  {
    slug: "kyoto-xanadu-lancamento-japao-falcom-arpg-onze-anos",
    title:
      "KYOTO XANADU: FALCOM LANÇA ARPG URBANO APÓS 11 ANOS DE ESPERA NO JAPÃO",
    summary:
      "Novo capítulo da série Xanadu chega hoje a PS5, Switch 2 e PC no Japão e Ásia. Versão ocidental ainda sem data nem publisher definidos.",
    body: JSON.stringify([
      {
        id: "intro",
        type: "text",
        content:
          "A **Nihon Falcom** lançou hoje no Japão e Ásia **Kyoto Xanadu: The Blooming Phantom**, encerrando uma espera de **onze anos** pelo próximo capítulo da série de ARPG urbano da empresa. O jogo chega para **PlayStation 5**, **Nintendo Switch**, **Nintendo Switch 2** e **PC via Steam** — e marca a tentativa da Falcom de transformar Xanadu em seu **terceiro pilar** ao lado de **Trails** e **Ys**.",
      },
      {
        id: "img-kyoto",
        type: "image",
        url: "https://images.unsplash.com/photo-1753008265372-0ecb0e51827a?auto=format&fit=crop&w=1200&q=80",
        alt: "Templo japonês com pagode tradicional com vista para a cidade de Kyoto ao fundo, representando o cenário urbano de Kyoto Xanadu",
        caption:
          "Kyoto Xanadu mistura elementos urbanos modernos com fantasia em um ARPG ambientado na histórica cidade japonesa.",
      },
      {
        id: "detalhes",
        type: "text",
        content:
          "## O jogo\n\n**Kyoto Xanadu** é a sequência de **Tokyo Xanadu** (2015), trazendo a mesma fórmula de action RPG com ambientação urbana — mas agora nas ruas de **Kyoto**. O jogador explora a cidade, enfrenta inimigos em tempo real e alterna entre missões principais e atividades paralelas.\n\nO presidente da Falcom, **Toshihiro Kondo**, afirmou que vê a linha Xanadu urbana como um potencial terceiro pilar da empresa. Isso significa que **Kyoto Xanadu** não é um lançamento isolado, mas o início de uma nova série contínua.\n\n## Versão ocidental\n\nA Falcom confirmou que uma versão para **América do Norte e Europa** está sendo coordenada, mas **não há data nem publisher** anunciados. O editor-chefe do **Gematsu** confirmou que **NIS America** e **GungHo** não são os parceiros — o que sugere que pode ser uma editora diferente das que costumam lançar Falcom no Ocidente.",
      },
      {
        id: "img-city",
        type: "image",
        url: "https://images.pexels.com/photos/15486981/pexels-photo-15486981.jpeg?auto=compress&cs=tinysrgb&w=1200",
        alt: "Vista da cidade de Kyoto com a Kyoto Tower refletida em um canal, representando a ambientação urbana de Kyoto Xanadu",
        caption:
          "A cidade de Kyoto serve de palco para o ARPG da Falcom — e pode ser o início de uma nova franquia regular.",
      },
      {
        id: "contexto",
        type: "text",
        content:
          "## Histórico\n\nO último Xanadu urbano foi **Tokyo Xanadu** em 2015 (que chegou ao Ocidente em 2017 via Aksys Games). A série Xanadu original é ainda mais antiga — o primeiro jogo é de **1985**. Com a popularidade de **Trails** e **Ys** crescendo no Ocidente, a Falcom parece determinada a não deixar Xanadu morrer.\n\nPara referência, o intervalo entre o lançamento japonês e ocidental de Tokyo Xanadu foi de aproximadamente **21 meses**. Se o padrão se repetir, Kyoto Xanadu pode chegar ao Ocidente entre meados e final de 2028.\n\n---\n\n**Fonte:** [TechTimes](https://www.techtimes.com/articles/320692/20260716/kyoto-xanadu-launches-today-falcoms-urban-arpg-returns-after-eleven-year-gap.htm) • [Gematsu](https://gematsu.com/)",
      },
    ]),
    category: "industry",
    image_url: "https://images.unsplash.com/photo-1701497616206-69b080a858b8?auto=format&fit=crop&w=1200&q=80",
    image_alt: "Rua noturna em Kyoto com trânsito e letreiros, representando a fusão entre o moderno e o tradicional em Kyoto Xanadu",
    author_name: "The Brick",
    author_tag: "📡 Radar",
    is_published: false,
  },
];

const now = new Date().toISOString();

for (const p of posts) {
  const { data, error } = await supabase
    .from("posts")
    .insert({
      ...p,
      published_at: null,
      created_at: now,
      updated_at: now,
    })
    .select("slug")
    .single();

  if (error) {
    console.error(`ERRO [${p.slug}]: ${error.message}`);
  } else {
    console.log(`OK: ${data.slug}`);
  }
}
