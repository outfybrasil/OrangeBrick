import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
);

const phantomId = "50866e04-53f3-415c-a25a-f7467bdded6d";
const wildsId = "e5c0ca0c-a5a1-41f0-8876-70dc372935a5";

const phantomCover = "https://hmjqqoselkgtfkkqrnit.supabase.co/storage/v1/render/image/public/post-images/editorial/50866e04-53f3-415c-a25a-f7467bdded6d/cover-bcd0f78b-a73e-4069-8ea3-e1a08bcfe16d.webp?width=1920&height=1080&resize=cover&quality=82&format=webp";
const phantomBody1 = "https://hmjqqoselkgtfkkqrnit.supabase.co/storage/v1/render/image/public/post-images/editorial/50866e04-53f3-415c-a25a-f7467bdded6d/body-1-d785441d-b82d-4519-90e2-913cd7c26fcc.jpg?width=1920&height=1080&resize=cover&quality=82&format=webp";
const phantomBody2 = "https://hmjqqoselkgtfkkqrnit.supabase.co/storage/v1/render/image/public/post-images/editorial/50866e04-53f3-415c-a25a-f7467bdded6d/body-2-3e935f00-8cdf-4265-a4b5-d6eefe15fc95.jpg?width=1920&height=1080&resize=cover&quality=82&format=webp";

const wildsCover = "https://hmjqqoselkgtfkkqrnit.supabase.co/storage/v1/render/image/public/post-images/editorial/e5c0ca0c-a5a1-41f0-8876-70dc372935a5/cover-bcd92390-e6f7-4770-94ea-6acd2a40ce94.jpg?width=1920&height=1080&resize=cover&quality=82&format=webp";
const wildsBody1 = "https://hmjqqoselkgtfkkqrnit.supabase.co/storage/v1/render/image/public/post-images/editorial/e5c0ca0c-a5a1-41f0-8876-70dc372935a5/body-1-3ab8aff1-c30f-442b-a039-9a24ef4b84d5.jpg?width=1920&height=1080&resize=cover&quality=82&format=webp";
const wildsBody2 = "https://hmjqqoselkgtfkkqrnit.supabase.co/storage/v1/render/image/public/post-images/editorial/e5c0ca0c-a5a1-41f0-8876-70dc372935a5/body-2-ab8619b3-42f2-4b45-96d6-b103e5b63774.jpg?width=1920&height=1080&resize=cover&quality=82&format=webp";

const text = (content) => ({ id: randomUUID(), type: "text", content });
const image = (url, alt, caption) => ({ id: randomUUID(), type: "image", url, alt, caption });
const video = (url, title, channelName) => ({ id: randomUUID(), type: "video", url, title, channelName, officialChannelConfirmed: true });

const phantomQuote = "Este não é um estúdio encontrando seu lugar no gênero de ação; é um estúdio já pronto para liderá-lo";

const phantomBody = [
  text("A S-GAME guardou o anúncio mais importante para o fim do trailer de lançamento. Depois de meses de silêncio sobre mídia física, o estúdio confirmou que **Phantom Blade Zero** terá edições Standard, Deluxe e Ultimate em disco no PlayStation 5 em 2027. A revelação encerra a dúvida de quem acompanhava o projeto e temia que o título ficasse restrito ao download.\n\nA versão digital continua marcada para **29 de outubro de 2026**, com pré-venda aberta na PlayStation Store por **US$ 59,99** na Standard e **US$ 69,99** na Digital Deluxe. O jogo também sai para PC via Steam e Epic Games Store no mesmo dia. No Brasil, o lançamento digital acontece às 23h de 28 de outubro, por causa do fuso de Brasília."),
  video("https://www.youtube.com/watch?v=qgJBFa952mY", "Phantom Blade Zero — trailer de lançamento oficial", "Phantom Blade Zero"),
  text("## Três edições, um steel case e nenhum preço de caixa\n\nQuando as cópias físicas chegarem às lojas, o comprador poderá escolher entre três versões: **Standard Edition**, **Deluxe Edition** e **Ultimate Edition**. A única diferença confirmada até agora é o **steel case colecionável** que acompanha a Ultimate. A S-GAME não divulgou o conteúdo completo das caixas, os preços em dólar ou em real, nem a data exata dentro de 2027.\n\nA expectativa é que os valores sigam a paridade das versões digitais, como acontece na maioria dos lançamentos de grande porte. Mesmo assim, a Push Square lembra que a conversão não é garantida: impostos, distribuição e câmbio costumam mudar o preço final. Para o mercado brasileiro, a ausência de uma edição nacional confirmada é o ponto mais delicado, já que a compra física pode depender de importação ou de uma distribuidora local ainda não anunciada."),
  image(phantomBody1, "Soul, o protagonista de Phantom Blade Zero, salta com a espada contra um inimigo gigantesco em um cenário montanhoso do jogo.", "O combate de Phantom Blade Zero aposta em golpes rápidos de wuxia e chefes de grande porte; a versão física chega em 2027."),
  text("## Um disco, 134 GB e a sombra do Game Key Disc\n\nO tamanho de **134 GB** da versão de PS5 transformou a discussão sobre o formato físico no assunto mais técnico do anúncio. Um Blu-ray de camada dupla armazena 50 GB; o de três camadas, 100 GB. Como o jogo passa dos 100 GB, a S-GAME terá de escolher entre duas alternativas: prensar dois discos ou incluir apenas parte dos dados na mídia e exigir um download complementar.\n\nA arte exibida no fim do trailer mostra **um único disco**, mas a Push Square foi direta ao afirmar que a imagem não serve como confirmação. A dúvida é relevante porque o mercado já convive com discos que funcionam apenas como chave de ativação, e o Switch 2 oficializou o formato com o **Game-Key Card**: a caixa vem com um código, e o jogo inteiro precisa ser baixado. Se a S-GAME seguir esse caminho, o disco deixa de ser uma cópia autônoma e vira apenas um comprovante de licença.\n\nPara colecionadores, a diferença é grande. Um disco jogável preserva o jogo mesmo se a loja digital sair do ar; uma chave de download depende dos servidores da publisher. O anúncio da versão física agradou, mas a comunidade ainda espera uma resposta objetiva sobre o que virá dentro da caixa."),
  image(phantomBody2, "Chefe de Phantom Blade Zero envolto em chamas ataca o jogador em uma vila em ruínas durante uma batalha noturna.", "Batalhas contra chefes são o centro da campanha de 66 dias de Soul; o lançamento digital acontece em 29 de outubro."),
  text("## Seis horas de teste e uma impressão forte\n\nA confirmação física chega em um momento favorável para o jogo. A Push Square passou seis horas com **Phantom Blade Zero** em uma viagem a Pequim, na China, e saiu convencida de que o estúdio encontrou um caminho próprio para a ação de wuxia. O game combina **Unreal Engine 5**, coreografia inspirada no cinema de Hong Kong e um sistema de combate que mistura mais de 30 armas com as chamadas **Phantom Edges**, habilidades especiais que podem ser combinadas.\n\nA trama acompanha **Soul**, um guerreiro com apenas 66 dias de vida depois de ser acusado pela morte do mestre. A estrutura de campanha, os chefes e a direção de arte chamaram a atenção da imprensa antes mesmo do lançamento. Liam Croft, editor da Push Square, resumiu a experiência: \"Este não é um estúdio encontrando seu lugar no gênero de ação; é um estúdio já pronto para liderá-lo\". A fala foi publicada na cobertura do anúncio físico e reforça a expectativa em torno do título.\n\n## O que a versão física muda para o comprador\n\nO lançamento em 2027 coloca a S-GAME em uma posição incomum. A maioria dos grandes jogos aposta na mídia física no dia um ou abandona o formato de vez; aqui, o disco chega meses depois do digital, sem data fechada. Quem faz questão da caixa precisa decidir entre esperar ou comprar duas vezes. Quem compra digital não terá upgrade automático para a edição física.\n\nO histórico recente ajuda a explicar a desconfiança. A indústria fechou estúdios, cortou tiragens e tratou o disco como acessório de nicho, enquanto colecionadores pressionavam por preservação. O anúncio da S-GAME mostra que ainda existe demanda disposta a pagar por isso, mas também expõe o limite da estratégia: sem preço, conteúdo detalhado e confirmação do formato, a edição de 2027 continua sendo uma promessa.\n\nPor enquanto, o que está confirmado é o essencial: **Phantom Blade Zero** sai em 29 de outubro no digital, por US$ 59,99 na Standard e US$ 69,99 na Deluxe, e terá três edições físicas para PS5 em 2027. O restante — disco jogável ou chave, quantidade de mídias e preço final — segue em aberto.\n\n**Fonte:** [Gematsu](https://www.gematsu.com/2026/10/phantom-blade-zero-launch-trailer-ps5-physical-editions-launch-in-2027)"),
];

const wildsQuote = "As três plataformas têm pontos fortes e fracos do ponto de vista de qualidade de imagem";

const wildsBody = [
  text("A Capcom liberou em 20 de outubro uma demo do Prólogo de **Monster Hunter Wilds** no Nintendo Switch 2, e a Digital Foundry já colocou o material sob análise. O veredito preliminar de Oliver Mackenzie é mais positivo do que o histórico do jogo sugeria: mesmo com resoluções baixas e cortes visíveis, o port entrega 30 fps estáveis e usa **DLSS** para compensar a falta de nitidez.\n\nO jogo completo chega em **4 de dezembro de 2026**, com preço de tabela de **US$ 39,99** e desconto de lançamento para pré-venda: **US$ 29,99** até 3 de dezembro, com bônus de armadura e talismã. A demo é offline, permite jogo local sem fio e transfere todo o progresso para a versão final. O arquivo completo ocupa cerca de **39,1 GB**; a demo pede **12,8 GB**."),
  video("https://www.youtube.com/watch?v=CL-tUwfgCi4", "Monster Hunter Wilds — trailer da demo no Nintendo Switch 2", "Monster Hunter"),
  text("## 648p no dock, DLSS no lugar do bruto\n\nNo modo dock, a demo renderiza a **648p** e faz upscaling com DLSS. É uma resolução inferior à do Xbox Series S, mas superior à de outros jogos de **RE Engine** no console, segundo a Digital Foundry. O resultado chama atenção por outro motivo: em vários cenários, a versão Switch 2 apresenta **texturas melhores**, reflexos em espaço de tela e menos aliasing em elementos estáticos do que o Series S.\n\nA análise não é só elogio. A animação da folhagem e as sombras ambientais perderam qualidade, e os **NPCs em segundo plano** rodam a uma taxa reduzida, algo que fica mais evidente no modo portátil e nas áreas com muita gente. Mackenzie descreveu o port como competitivo com o console da Microsoft, mas fez uma ressalva importante: \"As três plataformas têm pontos fortes e fracos do ponto de vista de qualidade de imagem\"."),
  image(wildsBody1, "Caçador de Monster Hunter Wilds enfrenta um monstro com focinho flamejante em um campo aberto, screenshot oficial do Switch 2.", "A demo do Prólogo inclui caçadas nas Planícies Zéfiras; a Digital Foundry mediu 648p no dock com upscaling por DLSS."),
  text("## 30 fps travados e o modo de 40 a 55\n\nNo modo padrão, o jogo mantém **30 fps** com pouca variação e sem problemas de frame pacing, de acordo com a análise. O modo **Frame-Rate** reduz um pouco a resolução e desliga os reflexos em espaço de tela para buscar **40 a 55 fps** — uma opção para quem prefere resposta mais rápida e aceita abrir mão de parte do acabamento visual.\n\nNo portátil, a resolução cai para cerca de **432p** antes do upscaling, e a meta de 30 fps continua com travamento ativado. O modo sem limite de quadros fica mais instável porque o **VRR não funciona corretamente** no console portátil, um problema que a Digital Foundry destacou e que a Capcom ainda não explicou. A recomendação prática, por enquanto, é manter o limite de 30 fps."),
  image(wildsBody2, "Aldeia de Monster Hunter Wilds repleta de NPCs e caçadores ao redor de estruturas de madeira, em imagem oficial do Switch 2.", "NPCs em segundo plano rodam a uma taxa reduzida no Switch 2, um dos cortes que a Digital Foundry destacou na demo."),
  text("## O que a demo antecipa do lançamento\n\nA demo cobre o início da campanha até o capítulo 1-3, \"To the Forest\", e inclui o criador de personagem, o prólogo e as Planícies Zéfiras. Como o progresso é transferido, ela funciona como um teste real da versão final, não como um trecho descartável. A Capcom também confirmou que o jogo chega com **cross-play**, todos os conteúdos de Title Update já lançados — incluindo o Grand Hub, Mizutsune, Lagiacrus, Seregios e o dragão ancião Gogmazios — e a colaboração com **Final Fantasy XIV Online**.\n\nA versão física é um **Game Key Card**: a caixa traz a chave, mas o jogo precisa ser baixado. A Deluxe Edition física custa **US$ 39,99** e inclui o jogo base e os itens cosméticos do Deluxe Pack. A expansão **Monster Hunter Wilds: Ascendance** está marcada para 2027 nas mesmas plataformas.\n\nVale lembrar o histórico: **Monster Hunter Wilds** chegou em 2025 ao PS5, Xbox Series e PC com problemas de desempenho e imagem, um passado que pesa na comparação. A versão Switch 2 herda parte desse aprendizado: a Capcom cortou efeitos, reduziu a resolução e apoiou o resultado no DLSS, em vez de tentar reproduzir a configuração das plataformas mais potentes. A loja da Nintendo lista **39,1 GB**, suporte a português do Brasil e os três modos de uso do console.\n\nPara o Switch 2, o resultado é um teste importante. A versão final, que chega em dezembro, ainda pode corrigir parte das quedas de NPCs e do VRR. O que já está claro é que a Capcom priorizou **estabilidade** sobre resolução: o jogo roda, a caça responde e o DLSS segura a imagem — desde que o jogador aceite os 648p no dock e os 432p no portátil.\n\n**Fonte:** [Digital Foundry](https://www.digitalfoundry.net/previews/monster-hunter-wilds-switch-2-demo-is-surprisingly-refined-with-clever-cutbacks-and-superior-upscaling)"),
];

const phantom = {
  title: "PHANTOM BLADE ZERO GANHA VERSÃO FÍSICA PARA 2027 E TRÊS EDIÇÕES NO PS5",
  summary: "A S-GAME confirma edições físicas de Phantom Blade Zero para 2027 no PS5, com Standard, Deluxe e Ultimate em steel case, após o lançamento digital de 29 de outubro.",
  image_url: phantomCover,
  image_alt: "As três edições físicas de Phantom Blade Zero para PS5, Standard, Deluxe e Ultimate com steel case, sobre a arte oficial do jogo.",
  body: JSON.stringify(phantomBody),
  featured_quote: {
    text: phantomQuote,
    author: "Liam Croft",
    role: "Editor da Push Square",
    source_url: "https://www.pushsquare.com/news/2026/10/phantom-blade-zero-physical-version-set-for-2027-3-ps5-editions-revealed",
    source_verified: true,
    absence_registered: false,
  },
  editorial_sources: [
    { name: "Gematsu", url: "https://www.gematsu.com/2026/10/phantom-blade-zero-launch-trailer-ps5-physical-editions-launch-in-2027", is_official: false, source_verified: true },
    { name: "Push Square", url: "https://www.pushsquare.com/news/2026/10/phantom-blade-zero-physical-version-set-for-2027-3-ps5-editions-revealed", is_official: false, source_verified: true },
    { name: "PlayStation Store", url: "https://store.playstation.com/en-us/product/UB2134-PPSA34579_00-0622032276386943/", is_official: true, source_verified: true },
  ],
  author_tag: "💣 Plantão",
  short_article_reason: null,
};

const wilds = {
  title: "MONSTER HUNTER WILDS: 648P NO DOCK E 30 FPS NA ANÁLISE DO SWITCH 2",
  summary: "Digital Foundry testa a demo de Monster Hunter Wilds no Switch 2: 648p com DLSS no dock, 30 fps estáveis e ajustes visuais para manter a caça fluida.",
  image_url: wildsCover,
  image_alt: "Quatro caçadores de Monster Hunter Wilds encaram um monstro gigantesco em um campo aberto, em imagem oficial do Nintendo Switch 2.",
  body: JSON.stringify(wildsBody),
  featured_quote: {
    text: wildsQuote,
    author: "Oliver Mackenzie",
    role: "Especialista técnico da Digital Foundry",
    source_url: "https://www.nintendolife.com/news/2026/10/digital-foundry-dives-into-monster-hunter-wilds-switch-2-demo",
    source_verified: true,
    absence_registered: false,
  },
  editorial_sources: [
    { name: "Digital Foundry", url: "https://www.digitalfoundry.net/previews/monster-hunter-wilds-switch-2-demo-is-surprisingly-refined-with-clever-cutbacks-and-superior-upscaling", is_official: false, source_verified: true },
    { name: "Nintendo Life", url: "https://www.nintendolife.com/news/2026/10/digital-foundry-dives-into-monster-hunter-wilds-switch-2-demo", is_official: false, source_verified: true },
    { name: "Nintendo", url: "https://www.nintendo.com/us/store/products/monster-hunter-wilds-switch-2/", is_official: true, source_verified: true },
    { name: "Capcom Press Release", url: "https://www.gamespress.com/Monster-Hunter-Wilds-Nintendo-Switch-2-Demo-and-Pre-orders-Available-N", is_official: false, source_verified: true },
  ],
  author_tag: "🛠️ Hard News",
  short_article_reason: null,
};

for (const [label, id, post] of [["PHANTOM", phantomId, phantom], ["WILDS", wildsId, wilds]]) {
  const words = JSON.parse(post.body).filter((block) => block.type === "text").map((block) => block.content).join("\n").trim().split(/\s+/).filter(Boolean).length;
  console.log(label, "palavras:", words, "| título:", post.title.length, "| resumo:", post.summary.length);
  const { data, error } = await supabase.from("posts").update(post).eq("id", id).select("id,title,summary,body,image_url,image_alt,featured_quote,editorial_sources,author_tag").single();
  if (error) throw error;
  console.log(label, "salvo", data.id, data.title.length, data.summary.length);
}
