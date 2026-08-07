import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: "./.env.local" });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const posts = [
  {
    slug: "gears-of-war-e-day-beta-game-pass-agosto-2026",
    title: "GEARS OF WAR E-DAY BETA JÁ ESTÁ NO GAME PASS",
    summary: "O beta multiplayer de Gears of War: E-Day começou no Xbox e PC para assinantes elegíveis; veja acesso, datas e o que está disponível.",
    category: "breaking",
    image_url: "/editorial/2026-08-07/gears-day-final.webp",
    image_alt: "Soldado com armadura pesada em cidade destruída, representando o beta multiplayer de Gears of War: E-Day",
    blocks: [
      { id: "intro", type: "text", content: "O retorno de **Gears of War** já pode ser testado antes do lançamento. O beta multiplayer de **Gears of War: E-Day** começou em 6 de agosto no Xbox Series X|S e no PC, com acesso antecipado para quem reservou o jogo ou assina **Xbox Game Pass Ultimate** ou **PC Game Pass**. A primeira janela termina em 10 de agosto e coloca a nova geração da série diante dos jogadores pela primeira vez em uma partida pública." },
      { id: "img", type: "image", url: "/editorial/2026-08-07/gears-beta-final.webp", alt: "Dois soldados futuristas em arena industrial iluminada por luz vermelha durante uma partida multiplayer", caption: "O beta concentra a experiência competitiva em uma arena industrial marcada por cobertura, fumaça e combate de curta distância." },
      { id: "access", type: "text", content: "## Quem pode entrar e quando\n\nA Microsoft abriu o primeiro período entre 6 e 10 de agosto. O acesso antecipado é oferecido a quem comprou qualquer edição de **Gears of War: E-Day** e aos assinantes dos planos Ultimate e PC do Game Pass. No console, também é necessário um plano que inclua multiplayer online. A página oficial do Xbox informa que o cliente do beta pode ser baixado antes do início da sessão, evitando que o jogador espere o horário de abertura para instalar os arquivos.\n\nO jogo completo chega em 6 de outubro para Xbox Series X|S, Xbox no PC e nuvem, além do Steam. A Microsoft confirmou lançamento no primeiro dia do Game Pass Ultimate. A estratégia coloca o beta no centro da campanha: a empresa quer testar servidores, medir o ritmo das partidas e recuperar a confiança dos fãs antes da estreia da campanha.\n\nA primeira janela também funciona como recompensa para a comunidade mais comprometida. Quem participou da fase de testes poderá receber itens cosméticos associados ao período de lançamento, enquanto as reservas garantem o pacote Exfil, com skin de personagem e armas. Os bônus não mudam o equilíbrio das partidas, mas criam um registro visível de quem esteve presente no começo da nova fase." },
      { id: "context", type: "text", content: "## O que muda em E-Day\n\nA história volta ao dia em que a humanidade enfrentou a primeira invasão dos Locust, anos antes dos eventos do jogo original. O retorno de Marcus Fenix e Dominic Santiago dá ao projeto um apelo de memória, mas a equipe da The Coalition promete uma abordagem mais agressiva para o combate. O beta serve justamente para medir se as novas armas, o sistema de cobertura e o desenho das arenas mantêm a identidade da série sem parecer uma repetição.\n\nDanielle Partis, editora da Xbox Wire, descreveu a aposta como um renascimento de uma franquia lendária no material oficial do showcase. A publicação não traz uma declaração inédita de um desenvolvedor sobre o beta, então não há fala direta adicional a atribuir nesta apuração.\n\nO ponto mais importante é o timing. Agosto costuma ser um mês de transição, mas o Xbox colocou seu principal teste multiplayer no centro do Game Pass enquanto prepara um lançamento de outubro. Se os servidores aguentarem e o combate convencer, E-Day pode recuperar o peso de Gears como vitrine técnica do ecossistema Xbox. Se a experiência chegar instável, a lembrança da trilogia clássica pode se voltar contra o novo jogo.\n\n**Fonte:** [Xbox Wire](https://news.xbox.com/en-us/2026/06/07/gears-of-war-eday-direct-xbox-games-showcase-2026/), [Xbox](https://www.xbox.com/en-us/games/gears-of-war-eday), [Windows Central](https://www.windowscentral.com/gaming/xbox/gears-of-war-e-day-multiplayer-beta-tests-how-to-enter)" },
    ],
  },
  {
    slug: "crazy-taxi-world-tour-teste-fechado-ps5-xbox-pc",
    title: "CRAZY TAXI WORLD TOUR TERÁ TESTE FECHADO EM SETEMBRO",
    summary: "A SEGA marcou um teste de Crazy Taxi: World Tour para PS5, Xbox Series e PC; inscrições abrem caminho para o retorno do arcade.",
    category: "breaking",
    image_url: "/editorial/2026-08-07/crazy-taxi-world-tour-final.webp",
    image_alt: "Táxi amarelo esportivo derrapando em avenida urbana molhada, representando Crazy Taxi: World Tour",
    blocks: [
      { id: "intro", type: "text", content: "A **SEGA** vai colocar **Crazy Taxi: World Tour** nas ruas antes do lançamento. O novo jogo terá um teste fechado de rede entre 11 e 13 de setembro no PlayStation 5, Xbox Series X|S e PC. A sessão marca o primeiro teste público do projeto em sua versão moderna e pode revelar como a série de direção arcade pretende sobreviver fora dos fliperamas e das gerações anteriores." },
      { id: "img", type: "image", url: "/editorial/2026-08-07/crazy-taxi-gameplay-final.webp", alt: "Visão interna de um táxi amarelo em alta velocidade por uma avenida ensolarada com passageiros no banco traseiro", caption: "World Tour leva a fantasia de dirigir pela cidade a uma experiência contemporânea, com passageiros, rotas e velocidade como foco." },
      { id: "test", type: "text", content: "## Como funciona o teste\n\nSegundo a Gematsu, a SEGA realizará o teste fechado entre 11 de setembro às 17h e 13 de setembro às 17h, em horário do Pacífico. A atividade será limitada a participantes selecionados e exige cadastro na página oficial de **Crazy Taxi: World Tour**. A empresa ainda não detalhou quantas vagas serão oferecidas, quais modos estarão disponíveis ou se o progresso será levado para a versão final.\n\nO teste tem uma função prática: avaliar a estabilidade da rede, o comportamento do tráfego e a capacidade dos servidores em partidas com muitos jogadores. A série sempre foi baseada em sessões curtas, pontuação e improviso, mas World Tour apresenta uma estrutura online que precisa transformar esse caos em algo consistente. Um problema de conexão pode ser mais grave para Crazy Taxi do que para um jogo de corrida tradicional, porque cada segundo perdido destrói a sensação de urgência.\n\nA SEGA ainda não divulgou uma data final de lançamento nem uma janela completa para todas as plataformas. A existência do teste confirma que o desenvolvimento avançou o suficiente para colocar a experiência nas mãos do público, mas não permite concluir que a estreia está próxima. A inscrição, portanto, deve ser tratada como oportunidade de testar o projeto, não como pré-venda disfarçada." },
      { id: "legacy", type: "text", content: "## O desafio de atualizar um clássico\n\nO Crazy Taxi original nasceu como arcade em 1999 e virou uma das marcas mais reconhecíveis da SEGA. A fórmula era simples de entender: escolher passageiros, acelerar por uma cidade cheia de atalhos e entregar cada pessoa antes que o cronômetro acabasse. O jogo premiava direção arriscada, não realismo. World Tour precisa preservar essa leitura imediata em um mercado acostumado a mapas abertos, temporadas e atualizações constantes.\n\nO nome indica uma expansão do alcance geográfico e da estrutura do jogo, mas a empresa ainda não explicou se haverá uma campanha tradicional, eventos competitivos ou um sistema de personalização. Também não há declaração pública de um diretor ou produtor disponível nas fontes consultadas; a comunicação atual se limita às informações do teste e à página oficial do projeto.\n\nO retorno é importante porque a SEGA vem revisitando propriedades clássicas em formatos diferentes, de remakes a novos jogos. Crazy Taxi tem uma vantagem: sua fantasia continua compreensível em segundos. Um táxi amarelo, uma cidade viva e passageiros desesperados bastam para explicar a proposta. O teste fechado vai dizer se essa simplicidade continua divertida quando a corrida deixa de ser individual e passa a depender de uma infraestrutura online.\n\n**Fonte:** [Gematsu](https://www.gematsu.com/2026/07/crazy-taxi-world-tour-closed-network-test-set-for-september-11-to-13), [site oficial de Crazy Taxi: World Tour](https://crazytaxi-asia.sega.com/worldtour/en/), [SEGA Sammy](https://www.segasammy.co.jp/cms/wp-content/uploads/pdf/en/ir/20260615_ManagementMTG_2026_Entertainment_en.pdf)" },
    ],
  },
];

for (const post of posts) {
  const payload = {
    slug: post.slug,
    title: post.title,
    summary: post.summary,
    body: JSON.stringify(post.blocks),
    category: post.category,
    image_url: post.image_url,
    image_alt: post.image_alt,
    author_name: "The Brick",
    author_tag: "💣 Plantão",
    is_published: false,
    published_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await supabase.from("posts").insert(payload).select("id,slug,is_published").single();
  if (error) throw error;
  console.log(JSON.stringify(data));
}
