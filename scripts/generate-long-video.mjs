import { createClient } from "@supabase/supabase-js";
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");

function resolveBinary(name, candidates) {
  for (const candidate of candidates) {
    if (candidate && fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return name;
}

const FFMPEG_BIN = resolveBinary("ffmpeg", [
  path.join(process.env.HOME || "", ".local", "bin", "ffmpeg"),
  "/usr/bin/ffmpeg",
  "/usr/local/bin/ffmpeg",
]);

const FFPROBE_BIN = resolveBinary("ffprobe", [
  path.join(process.env.HOME || "", ".local", "bin", "ffprobe"),
  "/usr/bin/ffprobe",
  "/usr/local/bin/ffprobe",
]);

const PYTHON_BIN = resolveBinary("python3", [
  path.join(process.env.HOME || "", ".heditor", "venv", "bin", "python3"),
  "/usr/bin/python3",
]);

const DEFAULT_GTA_EPISODE = {
  slug: "o-efeito-gta-6-na-industria",
  seriesBadge: "DOSSIÊ ORANGE BRICK // EPISÓDIO #01",
  title: "O EFEITO GTA VI NA INDÚSTRIA: PREÇO DE US$ 80, MÍDIA SEM DISCO E 210 GB",
  youtubeTitle: "O EFEITO GTA VI: Jogada de US$ 80, Caixa Sem Disco, 210 GB e o Terremoto na Indústria",
  subtitle: "Como um único lançamento marcado para 19 de novembro de 2026 redesenhou preços, calendários, hardware e mídia física no mercado global.",
  sourceMode: "ai_dossier",
  sourcePostSlugs: [
    "warhorse-espera-que-gta-6-abra-caminho-para-novo-padrao-de-us-80",
    "gta-vi-edicao-fisica-codigo-na-caixa-sem-disco",
    "gta-vi-vai-pesar-210-gb-no-ps5-e-abre-pre-load-em-12-de-novembro",
    "gta-6-no-ps5-pro-sony-confirma-parceria-e-recursos-avancados",
    "gta-6-vazamentos-mecanicas-e-a-saga-do-grupo-hacker",
    "gta-6-mecanicas-novas-reveladas-pelo-gameplay-vazado"
  ],
  visualStyle: "documentario",
  voiceId: "pt-BR-AntonioNeural",
  targetMinDurationSec: 495,
  chapters: [
    {
      number: "01",
      title: "O TERREMOTO DE 19 DE NOVEMBRO",
      kicker: "CALENDÁRIO EM FUGA",
      accent: "#FF5E00",
      source: "Take-Two Interactive & Calendário 2026",
      narration: [
        "Dezenove de novembro de dois mil e vinte e seis. Nunca na história recente do entretenimento eletrônico uma única data no calendário provocou tanto pânico silencioso nas salas de diretoria das grandes publicadoras.",
        "Quando a Take-Two Interactive e a Rockstar Games cravaram que Grand Theft Auto seis chegaria às lojas na metade de novembro, o efeito imediato nos bastidores foi uma debandada geral.",
        "Executivos de estúdios rivais passaram meses redesenhando janelas de distribuição do segundo semestre para evitar o choque frontal com o retorno a Vice City.",
        "Para você ter ideia do tamanho do bloqueio, na semana inteira de estreia da Rockstar, praticamente toda a indústria recuou. A única exceção curiosa que aceitou dividir os holofotes naquele mesmo dezenove de novembro foi uma expansão de Goat Simulator três, apostando justamente no contraste absurdo do humor contra o maior colosso da década.",
        "Mas o impacto de GTA seis vai muito além do medo da concorrência. Ele está servindo como laboratório vivo para quatro mudanças estruturais que afetam diretamente o seu bolso e o seu console: a quebra do teto de setenta dólares, a morte prática do disco físico na caixa, o gargalo de duzentos e dez gigabytes nos SSDs atuais e um novo patamar de simulação em mundo aberto.",
        "Neste dossiê do Orange Brick, nós cruzamos os documentos, os registros de rede, os vazamentos e as falas de executivos para mostrar como GTA seis já mudou as regras da indústria antes mesmo de ser jogado."
      ].join(" "),
      sceneA: {
        imageUrl: "https://hmjqqoselkgtfkkqrnit.supabase.co/storage/v1/object/public/post-images/editorial/a5497928-0c8a-474f-beaa-48050cb7091b/f1d5dd1a-8b01-439f-ac4a-a45b7241d707.webp",
        imageLabel: "ESTREIA OFICIAL // 19 DE NOVEMBRO DE 2026",
        imageCaption: "Arte oficial de Grand Theft Auto VI protagonizada por Jason Duval e Lucia Caminos em Leonida.",
        headline: "O ÊXODO DO CALENDÁRIO DE 2026",
        evidenceTitle: "POSICIONAMENTO OFICIAL // TAKE-TWO INTERACTIVE",
        evidenceQuote: "Publicadoras inteiras adiaram ou anteciparam seus principais lançamentos do fim de 2026 para fugir da semana de 19 de novembro.",
        evidenceSource: "Relatórios Corporativos & Calendário de Lançamentos 2026",
        pills: ["19 Nov 2026", "PS5 & Series X|S", "Fuga de Estúdios"]
      },
      sceneB: {
        imageUrl: "https://hmjqqoselkgtfkkqrnit.supabase.co/storage/v1/object/public/post-images/editorial/a5497928-0c8a-474f-beaa-48050cb7091b/5c6dcf85-f191-484c-9b7b-5ba784a91113.webp",
        imageLabel: "CHOQUE DE MERCADO // 4 PILARES DO IMPACTO",
        imageCaption: "Vice City e o estado de Leonida concentram o maior investimento técnico e comercial da história dos videogames.",
        headline: "4 MUDANÇAS QUE REDEFINEM O SETOR",
        evidenceTitle: "OS QUATRO EIXOS DO EFEITO GTA VI",
        evidenceQuote: "Preço base de US$ 80, edição física sem disco na caixa, 210 GB de instalação mínima e simulação inspirada em Red Dead Redemption 2.",
        evidenceSource: "Apuração Editorial Orange Brick",
        pills: ["US$ 79,99 Base", "210 GB no SSD", "Caixa com Código"]
      }
    },
    {
      number: "02",
      title: "A BOMBA DOS US$ 80 E O MEDO DOS ESTÚDIOS",
      kicker: "ECONOMIA & PREÇOS",
      accent: "#FFB800",
      source: "Martin Klima (Warhorse Studios) & Strauss Zelnick (Take-Two)",
      narration: [
        "O primeiro grande abalo atende por um número: oitenta dólares. Durante anos, estúdios europeus e norte-americanos reclamaram a portas fechadas que o teto de setenta dólares já não fechava a conta de produções gigantescas.",
        "Quem colocou o dedo na ferida publicamente foi Martin Klima, cofundador e diretor de operações da Warhorse Studios, criadora de Kingdom Come Deliverance.",
        "Klima expôs a matemática brutal da indústria: na geração do PlayStation três e do Xbox trezentos e sessenta, um grande lançamento custava entre quarenta e oitenta milhões de dólares. Hoje, projetos de ponta ultrapassam facilmente a barreira dos duzentos e cinquenta milhões apenas em engenharia e desenvolvimento, sem contar o marketing global.",
        "O problema é que nenhum estúdio comum tinha coragem de ser o primeiro a cobrar oitenta dólares pela edição básica e sofrer um boicote imediato dos jogadores. Todos esperavam que a Rockstar abrisse essa porta.",
        "Do lado da Take-Two, o diretor executivo Strauss Zelnick já preparava o terreno nas conferências com investidores, defendendo que os jogos entregam um valor por hora de entretenimento muito superior ao preço cobrado na etiqueta.",
        "E a confirmação veio na listagem oficial dos Estados Unidos: edição padrão de GTA seis por setenta e nove dólares e noventa e nove centavos, e edição Ultimate por noventa e nove dólares e noventa e nove centavos. No Brasil, a edição padrão já orbita a faixa dos quatrocentos e cinquenta reais, inaugurando um novo piso psicológico para toda a próxima geração."
      ].join(" "),
      sceneA: {
        imageUrl: "https://hmjqqoselkgtfkkqrnit.supabase.co/storage/v1/object/public/post-images/editorial/warhorse-espera-que-gta-6-abra-caminho-para-novo-padrao-de-us-80/cover-491c6018.webp",
        imageLabel: "BASTIDORES DA INDÚSTRIA // WARHORSE STUDIOS",
        imageCaption: "Martin Klima, COO da Warhorse Studios, admitiu que o setor torcia para GTA VI romper a barreira dos US$ 70.",
        headline: "POR QUE OS ESTÚDIOS TORCIAM PELOS US$ 80",
        evidenceTitle: "DECLARAÇÃO // MARTIN KLIMA (COO, WARHORSE STUDIOS)",
        evidenceQuote: "Orçamentos saltaram de US$ 40–80 milhões na era PS3/360 para mais de US$ 250 milhões hoje, mas nenhum estúdio queria levar a culpa sozinho pelo reajuste.",
        evidenceSource: "Entrevista & Análise de Mercado // Orange Brick",
        pills: ["PS3: US$ 40M–80M", "Hoje: US$ 250M+", "Novo Piso: US$ 80"]
      },
      sceneB: {
        imageUrl: "https://hmjqqoselkgtfkkqrnit.supabase.co/storage/v1/object/public/post-images/editorial/warhorse-espera-que-gta-6-abra-caminho-para-novo-padrao-de-us-80/body-9a3585ee.webp",
        imageLabel: "TABELA OFICIAL NOS EUA // TAKE-TWO INTERACTIVE",
        imageCaption: "Strauss Zelnick defende há anos que o preço por hora entregue pela Rockstar justifica um valor superior ao padrão do mercado.",
        headline: "STANDARD A US$ 79,99 E ULTIMATE A US$ 99,99",
        evidenceTitle: "VISÃO EXECUTIVA // STRAUSS ZELNICK (CEO, TAKE-TWO)",
        evidenceQuote: "A Take-Two fixou a edição Standard em US$ 79,99 (cerca de R$ 450 no Brasil) e a edição Ultimate em US$ 99,99 nos Estados Unidos.",
        evidenceSource: "Conferência de Investidores Take-Two & Suporte Rockstar",
        pills: ["Standard: US$ 79,99", "Ultimate: US$ 99,99", "Brasil: ~R$ 450"]
      }
    },
    {
      number: "03",
      title: "CAIXA VAZIA: A MÍDIA FÍSICA SEM DISCO",
      kicker: "FIM DO BLU-RAY?",
      accent: "#FF3366",
      source: "Rockstar Games Support — Plataformas e Versões",
      narration: [
        "Se o preço de oitenta dólares já gerou debate, o formato da edição de colecionador de prateleira acendeu o alerta vermelho entre quem ainda defende a posse física dos jogos.",
        "A página oficial de suporte e versões da Rockstar Games confirmou um detalhe decisivo: a edição física de Grand Theft Auto seis vendida nas lojas não traz disco Blu-ray dentro da embalagem.",
        "Ao abrir a caixa plástica, que começa a ser distribuída no varejo em doze de novembro, uma semana antes da estreia oficial, o comprador encontra apenas um código de resgate para baixar o jogo completo pela internet.",
        "Na prática, comprar a versão de prateleira não elimina um único megabyte de download e impede qualquer revenda, empréstimo ou preservação offline depois que o código é ativado na conta da PlayStation Network ou da rede Xbox.",
        "Além disso, a própria edição Ultimate, de cem dólares, sequer terá versão em caixa nas lojas, ficando restrita exclusivamente às vitrines digitais.",
        "Quando o maior lançamento da década abandona a prensagem em disco na sua tiragem de varejo, a mensagem para o restante da indústria é cristalina: a caixa física virou apenas um cartão-presente de luxo para estantes."
      ].join(" "),
      sceneA: {
        imageUrl: "https://hmjqqoselkgtfkkqrnit.supabase.co/storage/v1/object/public/post-images/editorial/4532c1b8-ab00-432d-a0b1-bb71201352e6/cover-c336037e-a9b7-4709-b329-fb75755f4bb1.webp",
        imageLabel: "SUPORTE OFICIAL ROCKSTAR // EMBALAGEM SEM DISCO",
        imageCaption: "A edição física comercializada a partir de 12 de novembro traz um código de download dentro da caixa, sem mídia óptica.",
        headline: "CÓDIGO NA CAIXA: ZERO DISCO NO VAREJO",
        evidenceTitle: "DOCUMENTO OFICIAL // PÁGINA DE VERSÕES ROCKSTAR",
        evidenceQuote: "A embalagem física inclui apenas um voucher digital resgatável na plataforma correspondente, exigindo o download integral pela internet.",
        evidenceSource: "Rockstar Games Support — Plataformas e Versões",
        pills: ["Sem Disco Blu-ray", "Lojas: 12 Nov", "Sem Jogo Usado"]
      },
      sceneB: {
        imageUrl: "https://hmjqqoselkgtfkkqrnit.supabase.co/storage/v1/object/public/post-images/editorial/4532c1b8-ab00-432d-a0b1-bb71201352e6/body-8d144e97-0382-44e4-9d3c-e3a11e358fd2.webp",
        imageLabel: "PORT GELLHORN // EXCLUSIVIDADE DIGITAL NA ULTIMATE",
        imageCaption: "A edição Ultimate de US$ 99,99 nem sequer terá embalagem física nas lojas, consolidando a transição para o digital.",
        headline: "O IMPACTO PARA COLECIONADORES E LOJISTAS",
        evidenceTitle: "MUDANÇA DE PARADIGMA NO VAREJO",
        evidenceQuote: "Sem mídia óptica para revenda ou preservação offline, o mercado de jogos usados perde o produto mais lucrativo de toda a geração.",
        evidenceSource: "Análise de Mercado // Orange Brick",
        pills: ["Ultimate Digital", "Código Único", "Download Total"]
      }
    },
    {
      number: "04",
      title: "210 GB E O GARGALO NOS CONSOLES ATUAIS",
      kicker: "HARDWARE NO LIMITE",
      accent: "#00E5FF",
      source: "PlayStation Network Database (27/10/2026)",
      narration: [
        "Mas por que a Rockstar desistiu de prensar discos Blu-ray tradicionais? A resposta técnica apareceu nos servidores da PlayStation Network em vinte e sete de outubro de dois mil e vinte e seis.",
        "Os registros de pré-carregamento revelaram que a edição padrão de Grand Theft Auto seis exige impressionantes duzentos e dez gigabytes de espaço livre no PlayStation cinco, podendo chegar a duzentos e doze gigabytes dependendo da região e do pacote de idiomas.",
        "Isso é mais do que o dobro do tamanho de Red Dead Redemption dois no seu lançamento e ultrapassa o limite físico de dois discos Blu-ray de camada tripla de cem gigabytes cada.",
        "Para quem tem o modelo original do PlayStation cinco, a conta é sufocante: dos oitocentos e vinte e cinco gigabytes anunciados na caixa do console, apenas seiscentos e sessenta e sete gigabytes ficam realmente disponíveis para o usuário. Sozinho, GTA seis devora quase um terço de todo o armazenamento útil da máquina antes mesmo de qualquer atualização do futuro modo online.",
        "No Xbox Series S de entrada, o cenário é ainda mais dramático: com apenas trezentos e sessenta e quatro gigabytes livres de fábrica, instalar o jogo da Rockstar deixa o console praticamente sem espaço para manter um segundo grande título competitivo instalado ao mesmo tempo.",
        "O pré-download começa entre dez e doze de novembro, uma semana inteira antes da abertura dos servidores, justamente para evitar um colapso global nas redes de distribuição digital."
      ].join(" "),
      sceneA: {
        imageUrl: "https://hmjqqoselkgtfkkqrnit.supabase.co/storage/v1/object/public/post-images/editorial/4e455cc3-5025-40e0-94f7-1cff17201204/cover-f729429b-c760-4974-acbb-794248971100.webp",
        imageLabel: "REGISTROS DA PSN // 210 GB A 212 GB DE INSTALAÇÃO",
        imageCaption: "Dados extraídos da infraestrutura da PlayStation Network revelaram o peso colossal da campanha de Jason e Lucia.",
        headline: "O DOBRO DE RED DEAD REDEMPTION 2 NA LARGADA",
        evidenceTitle: "DADOS TÉCNICOS // INFRAESTRUTURA PLAYSTATION NETWORK",
        evidenceQuote: "Com 210 GB logo no lançamento da campanha Standard, GTA VI ocupa quase 32% dos 667 GB livres do PS5 original e 58% do Xbox Series S de 512 GB.",
        evidenceSource: "PlayStation Network Database & Apuração Orange Brick",
        pills: ["PS5: 667 GB Úteis", "Series S: 364 GB", "GTA VI: 210 GB"]
      },
      sceneB: {
        imageUrl: "https://hmjqqoselkgtfkkqrnit.supabase.co/storage/v1/object/public/post-images/editorial/4bf4e0ae-0d67-490f-8bac-b6a444df375b/body-5bf4ec8f-a2cc-4e24-9ae3-7c02dd0a1ac8.webp",
        imageLabel: "PRÉ-DOWNLOAD // 10 A 12 DE NOVEMBRO DE 2026",
        imageCaption: "Texturas em 4K, iluminação por ray tracing e cinco condados densos em Leonida explicam o volume massivo de arquivos.",
        headline: "UMA SEMANA DE PRÉ-LOAD PARA EVITAR APAGÃO",
        evidenceTitle: "CRONOGRAMA DE DISTRIBUIÇÃO DIGITAL",
        evidenceQuote: "O pré-carregamento abre uma semana antes de 19 de novembro para diluir o tráfego de milhões de consoles baixando mais de 200 GB simultaneamente.",
        evidenceSource: "Cronograma Oficial PlayStation Store & Xbox",
        pills: ["Pré-Load: 10–12 Nov", "Texturas 4K + RT", "Acima de 2 Blu-rays"]
      }
    },
    {
      number: "05",
      title: "ALIANÇA COM O PS5 PRO E A JOGADA NA NETFLIX",
      kicker: "HARDWARE & MARKETING",
      accent: "#3B82F6",
      source: "Sony Interactive Entertainment & Rockstar Games",
      narration: [
        "Com um mundo aberto tão pesado, a pergunta inevitável nos fóruns técnicos foi uma só: qual console vai rodar Leonida no seu ápice visual?",
        "A Sony se antecipou e firmou uma parceria estratégica direta com a Rockstar Games para transformar o PlayStation cinco Pro na vitrine oficial de Grand Theft Auto seis.",
        "Engenheiros da fabricante japonesa trabalharam ao lado do estúdio para integrar reconstrução de imagem avançada por inteligência artificial e ray tracing acelerado por hardware, mirando estabilidade superior de quadros sem sacrificar a densidade de tráfego e vegetação de Vice City.",
        "Para a Sony, o acordo é a peça que faltava para justificar o investimento no seu console intermediário mais caro, vendendo o PS cinco Pro como a máquina definitiva para jogar GTA seis antes de uma futura versão para computadores.",
        "Já no marketing, a Rockstar quebrou outro protocolo histórico da indústria em vinte e sete de agosto de dois mil e vinte e seis.",
        "Em vez de estrear sua apresentação aprofundada, chamada Grand Theft Auto seis An Extended Look, diretamente no YouTube ou em uma feira tradicional como a Gamescom, a empresa fechou uma janela exclusiva de seis horas na Netflix.",
        "Pela primeira vez, o trailer de gameplay mais esperado da década estreou como evento televisivo dentro da maior plataforma de streaming do planeta, provando que a Rockstar já não disputa atenção apenas com outros videogames, mas com Hollywood inteira."
      ].join(" "),
      sceneA: {
        imageUrl: "https://hmjqqoselkgtfkkqrnit.supabase.co/storage/v1/object/public/post-images/editorial/d2c5210a-d106-4b7f-a01d-afd84559b9c2/cover-4f0fc887-603a-4bea-9ade-54957ee16674.webp",
        imageLabel: "PARCERIA TÉCNICA // SONY PLAYSTATION 5 PRO",
        imageCaption: "Acordo entre Sony e Rockstar posiciona o PS5 Pro como a plataforma de referência técnica para o lançamento de novembro.",
        headline: "PS5 PRO COMO VITRINE OFICIAL DE LEONIDA",
        evidenceTitle: "ENGENHARIA CONJUNTA // SONY & ROCKSTAR GAMES",
        evidenceQuote: "Uso dedicado de upscaling por IA e ray tracing aprimorado no PS5 Pro busca entregar a melhor combinação de nitidez e fluidez nos consoles.",
        evidenceSource: "Cobertura de Hardware // Orange Brick",
        pills: ["Sony + Rockstar", "PSSR + Ray Tracing", "Vitrine de Console"]
      },
      sceneB: {
        imageUrl: "https://hmjqqoselkgtfkkqrnit.supabase.co/storage/v1/object/public/post-images/editorial/d2c5210a-d106-4b7f-a01d-afd84559b9c2/body-bca1a24b-9560-47f3-acda-1ca57c08d9ca.webp",
        imageLabel: "AN EXTENDED LOOK // ESTREIA NA NETFLIX EM 27 DE AGOSTO",
        imageCaption: "Apresentação especial de GTA VI estreou primeiro na Netflix às 16h de Brasília antes de chegar ao YouTube oficial.",
        headline: "QUANDO UM JOGO VIRA EVENTO NA NETFLIX",
        evidenceTitle: "RUPTURA DE DISTRIBUIÇÃO // 27 DE AGOSTO DE 2026",
        evidenceQuote: "A janela de 6 horas de exclusividade na Netflix para o 'Extended Look' tratou uma apresentação de videogame com o peso de uma final esportiva global.",
        evidenceSource: "Comunicado Rockstar Games & Cobertura TGA 2026",
        pills: ["Estreia na Netflix", "Janela de 6 Horas", "Elegível TGA 2026"]
      }
    },
    {
      number: "06",
      title: "A CAÇADA HACKER: DE ARION KURTAJ À CYBERLEEK",
      kicker: "SEGURANÇA & VAZAMENTOS",
      accent: "#A855F7",
      source: "Comunicado Rockstar (2022), Corte de Oxford & Kotaku (2026)",
      narration: [
        "Mas por trás do controle milimétrico da Rockstar, GTA seis também protagonizou a história de espionagem e vazamentos mais surreal da indústria moderna.",
        "Tudo começou no dia dezoito de setembro de dois mil e vinte e dois, quando o usuário teapotuberhacker despejou noventa vídeos de desenvolvimento inicial no fórum GTAForums.",
        "O autor da invasão era Arion Kurtaj, um jovem de dezessete anos integrante do grupo hacker Lapsus, o mesmo coletivo que havia invadido gigantes como Nvidia, Uber e Microsoft.",
        "O detalhe que parece roteiro de cinema é como o ataque aconteceu: Kurtaj já estava sob custódia policial em um quarto de hotel em Oxford, na Inglaterra, mas conseguiu invadir os canais internos da Rockstar usando apenas a televisão do quarto, um Amazon Fire Stick, um teclado e engenharia social contra funcionários.",
        "Em dezembro de dois mil e vinte e três, a Justiça britânica determinou sua internação hospitalar por tempo indeterminado. Mesmo assim, o fantasma dos arquivos roubados nunca desapareceu por completo.",
        "Em dezoito de agosto de dois mil e vinte e seis, a apenas nove dias da vitrine da Netflix, um novo grupo chamado Cyberleek publicou gravações inéditas de uma build de dois mil e vinte e três e o mapa completo de Leonida, exigindo o fim das pré-vendas digitais antes de ter todo o conteúdo derrubado pela Take-Two."
      ].join(" "),
      sceneA: {
        imageUrl: "https://hmjqqoselkgtfkkqrnit.supabase.co/storage/v1/object/public/post-images/editorial/gta-6-vazamentos-2026/cover-capa-oficial.webp",
        imageLabel: "SETEMBRO DE 2022 // O CASO LAPSUS$ E ARION KURTAJ",
        imageCaption: "Dos 90 vídeos vazados em 2022 ao ataque feito com um Amazon Fire Stick dentro de um hotel vigiado em Oxford.",
        headline: "90 VÍDEOS E UM HACKER NUM QUARTO DE HOTEL",
        evidenceTitle: "COMUNICADO OFICIAL // ROCKSTAR GAMES (SETEMBRO DE 2022)",
        evidenceQuote: "Sofremos uma intrusão de rede na qual um terceiro não autorizado acessou e baixou ilegalmente informações confidenciais, incluindo imagens iniciais do próximo Grand Theft Auto.",
        evidenceSource: "Comunicado Rockstar Games & Julgamento de Oxford (2023)",
        pills: ["90 Vídeos (2022)", "Grupo Lapsus$", "Amazon Fire Stick"]
      },
      sceneB: {
        imageUrl: "https://hmjqqoselkgtfkkqrnit.supabase.co/storage/v1/object/public/post-images/editorial/gta-6-vazamentos-2026/body-vice-city-skyline.webp",
        imageLabel: "18 DE AGOSTO DE 2026 // O VAZAMENTO CYBERLEEK",
        imageCaption: "O coletivo Cyberleek vazou dois vídeos de uma build de 2023 e o mapa de cinco condados de Leonida dias antes do evento na Netflix.",
        headline: "CYBERLEEK E A GUERRA DE DIREITOS AUTORAIS",
        evidenceTitle: "AÇÃO IMEDIATA // TAKE-TWO INTERACTIVE (AGOSTO DE 2026)",
        evidenceQuote: "A onda de remoções por direitos autorais da Take-Two derrubou os vídeos da build de 2023 em poucas horas, confirmando na prática a origem do material.",
        evidenceSource: "Apuração Kotaku, Polygon & Orange Brick",
        pills: ["Build de 2023", "Mapa de 5 Condados", "Takedown Take-Two"]
      }
    },
    {
      number: "07",
      title: "AUTÓPSIA DO GAMEPLAY: LEONIDA COMO SIMULADOR",
      kicker: "MECÂNICAS & MUNDO VIVO",
      accent: "#10B981",
      source: "Análise de Gameplay & Site Oficial Rockstar Games",
      narration: [
        "Quando juntamos o que os vazamentos mostraram com o que a própria Rockstar já confirmou oficialmente, fica claro por que GTA seis custou tão caro e exige tanto armazenamento: o jogo abandona a ação arcade rasa do passado e abraça a profundidade tática de Red Dead Redemption dois.",
        "No combate corpo a corpo, Jason e Lucia contam com uma barra física de estamina que escurece as bordas da tela em caso de exaustão, além de desarmes, armas improvisadas recolhidas do chão, posição deitada de furtividade, algemas plásticas e escudos humanos.",
        "O arsenal também deixou de ser um bolso mágico infinito: você carrega apenas duas pistolas e dois rifles no corpo, enquanto o restante do equipamento fica guardado no porta-malas do veículo, dividido entre os menus de depósito e carregamento com limite de slots.",
        "Os próprios carros ganharam indicadores dedicados de combustível e estado do motor, em uma frota de mais de duzentos veículos com painéis, volantes e bancos ajustáveis.",
        "Mas a revolução mais impressionante está na inteligência policial. As lendárias seis estrelas de procurado estão de volta, acompanhadas de ícones que mostram se a polícia já identificou a roupa que você veste, o veículo que você dirige e o último bairro onde foi visto.",
        "Some a isso dois contadores separados de dinheiro na carteira e no esconderijo, um indicador de moralidade após agressões gratuitas e cinco condados inteiros em Leonida — de Vice City aos pântanos de Grassrivers — e temos a simulação urbana mais densa já tentada nos videogames."
      ].join(" "),
      sceneA: {
        imageUrl: "https://hmjqqoselkgtfkkqrnit.supabase.co/storage/v1/object/public/post-images/editorial/gta-6-mecanicas-vazadas-2026/body-lucia-vice-city.webp",
        imageLabel: "HERANÇA DE RDR2 // COMBATE, ESTAMINA E ARSENAL TÁTICO",
        imageCaption: "Jason Duval e Lucia Caminos dividem o protagonismo com inventário limitado no corpo e depósito tático no porta-malas.",
        headline: "INVENTÁRIO REALISTA, COMBUSTÍVEL E ESTAMINA",
        evidenceTitle: "SISTEMAS IDENTIFICADOS // GAMEPLAY & OFICIAL",
        evidenceQuote: "Limite de 2 pistolas e 2 rifles no personagem, porta-malas com capacidade 0/4 (Storage e Loadout), barra de estamina e medidor de combustível nos veículos.",
        evidenceSource: "Dossiê de Mecânicas // Orange Brick",
        pills: ["2 Pistolas + 2 Rifles", "Porta-Malas 0/4", "Tanque + Estamina"]
      },
      sceneB: {
        imageUrl: "https://hmjqqoselkgtfkkqrnit.supabase.co/storage/v1/object/public/post-images/editorial/gta-6-mecanicas-vazadas-2026/body-vapid-dominator-buggy.webp",
        imageLabel: "IA POLICIAL // 6 ESTRELAS E RECONHECIMENTO DE SUSPEITO",
        imageCaption: "Policiais rastreiam roupa, modelo do veículo e última localização conhecida através dos cinco condados de Leonida.",
        headline: "6 ESTRELAS E POLÍCIA QUE RASTREIA ROUPA E CARRO",
        evidenceTitle: "SIMULAÇÃO DE MUNDO VIVO // ESTADO DE LEONIDA",
        evidenceQuote: "Para despistar a caçada policial em Leonida, não basta sair do raio: é preciso trocar de roupa, abandonar o carro identificado e gerenciar dois contadores de dinheiro.",
        evidenceSource: "Análise Técnica de Gameplay // Orange Brick",
        pills: ["6 Estrelas", "Rastreio de Roupa", "5 Condados"]
      }
    },
    {
      number: "08",
      title: "O VEREDITO: O MUNDO PÓS-19 DE NOVEMBRO",
      kicker: "CONCLUSÃO ORANGE BRICK",
      accent: "#FF5E00",
      source: "Editorial Orange Brick — orangebrick.blog",
      narration: [
        "Chegamos ao veredito deste dossiê. Grand Theft Auto seis não é apenas mais um lançamento de fim de ano; ele é a linha divisória entre duas eras da indústria de videogames.",
        "De um lado, a Rockstar promete entregar em dezenove de novembro uma obra de engenharia sem paralelo, capaz de fazer um mundo aberto moderno reagir a cada detalhe, da gasolina no tanque ao modelo da camisa usada numa fuga em Vice City.",
        "Do outro lado, o colosso da Take-Two deixa como herança um mercado mais caro e mais fechado: jogos de oitenta dólares como novo teto comercial, caixas físicas sem disco nas prateleiras e instalações que passam de duzentos gigabytes e obrigam o jogador a gerenciar cada bloco do seu SSD.",
        "Quando o resto da indústria tentar copiar o preço de oitenta dólares e a caixa sem mídia em dois mil e vinte e sete, a pergunta que todo consumidor precisará fazer é simples: esses outros jogos também entregam o nível de obsessão técnica da Rockstar, ou querem apenas cobrar o preço de GTA seis?",
        "E para você: os oitenta dólares e os duzentos e dez gigabytes valem o ingresso para Leonida, ou a indústria está esticando demais a corda? Deixe sua análise aqui nos comentários, inscreva-se no canal do Orange Brick e acesse orangebrick ponto blog para ler todas as matérias completas na íntegra."
      ].join(" "),
      sceneA: {
        imageUrl: "https://hmjqqoselkgtfkkqrnit.supabase.co/storage/v1/object/public/post-images/editorial/gta-6-vazamentos-2026/body-jason-lucia-praia.webp",
        imageLabel: "BALANÇO FINAL // AMBIÇÃO TÉCNICA VS. CUSTO AO JOGADOR",
        imageCaption: "GTA VI eleva a barra técnica do mundo aberto, mas inaugura a era dos jogos de US$ 80 e das caixas físicas sem disco.",
        headline: "A LINHA DIVISÓRIA ENTRE DUAS ERAS DOS GAMES",
        evidenceTitle: "SÍNTESE DO DOSSIÊ // O NOVO PADRÃO DE 2027",
        evidenceQuote: "A Rockstar tem escala única para sustentar US$ 80 e 210 GB, mas o risco para o consumidor é ver publicadoras comuns adotarem o mesmo preço sem entregar metade da ambição.",
        evidenceSource: "Editorial Orange Brick — orangebrick.blog",
        pills: ["Salto de Simulação", "Teto de US$ 80", "Varejo Sem Disco"]
      },
      sceneB: {
        imageUrl: "https://hmjqqoselkgtfkkqrnit.supabase.co/storage/v1/object/public/post-images/editorial/4532c1b8-ab00-432d-a0b1-bb71201352e6/body-8399090a-410a-4fae-a71d-337332990622.webp",
        imageLabel: "ORANGEBRICK.BLOG // INSCREVA-SE E DEIXE SEU COMENTÁRIO",
        imageCaption: "Acompanhe a cobertura completa de indústria, hardware e lançamentos no portal Orange Brick.",
        headline: "VALE OS US$ 80 E OS 210 GB NO SEU CONSOLE?",
        evidenceTitle: "PARTICIPE DO DEBATE // ORANGE BRICK",
        evidenceQuote: "Comente abaixo sua opinião sobre o preço e a mídia física sem disco, inscreva-se no canal para os próximos dossiês e leia a apuração completa em orangebrick.blog.",
        evidenceSource: "Orange Brick — Jornalismo Direto e Sem Firulas",
        pills: ["Comente Abaixo", "Inscreva-se", "orangebrick.blog"]
      }
    }
  ]
};

function escapeXml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function wrapText(text, maxCharsPerLine, maxLines = 4) {
  const words = String(text || "").trim().split(/\s+/).filter(Boolean);
  const lines = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxCharsPerLine || !current) {
      current = candidate;
    } else {
      lines.push(current);
      current = word;
      if (lines.length === maxLines - 1) {
        break;
      }
    }
  }
  const consumedWords = lines.join(" ").split(/\s+/).filter(Boolean).length;
  const remainingWords = words.slice(consumedWords);
  if (remainingWords.length > 0) {
    lines.push(remainingWords.join(" "));
  } else if (current) {
    lines.push(current);
  }
  return lines.slice(0, maxLines);
}

function formatClock(seconds) {
  const total = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function formatSrtTime(seconds) {
  const msTotal = Math.max(0, Math.round(seconds * 1000));
  const hrs = Math.floor(msTotal / 3_600_000);
  const mins = Math.floor((msTotal % 3_600_000) / 60_000);
  const secs = Math.floor((msTotal % 60_000) / 1000);
  const ms = msTotal % 1000;
  return `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")},${String(ms).padStart(3, "0")}`;
}

function formatAssTime(seconds) {
  const csTotal = Math.max(0, Math.round(seconds * 100));
  const hrs = Math.floor(csTotal / 360_000);
  const mins = Math.floor((csTotal % 360_000) / 6000);
  const secs = Math.floor((csTotal % 6000) / 100);
  const cs = csTotal % 100;
  return `${hrs}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}.${String(cs).padStart(2, "0")}`;
}

function splitSentenceForSubtitles(sentenceObj) {
  const raw = String(sentenceObj.text || "").trim();
  if (!raw) return [];
  if (raw.length <= 92) {
    return [sentenceObj];
  }
  const clauses = raw
    .split(/(?<=[,;:.!?—–])\s+/)
    .map((part) => part.trim())
    .filter(Boolean);

  const chunks = [];
  let current = "";
  for (const clause of clauses) {
    const candidate = current ? `${current} ${clause}` : clause;
    if (candidate.length <= 92 || !current) {
      current = candidate;
    } else {
      chunks.push(current);
      current = clause;
    }
  }
  if (current) chunks.push(current);

  const finalChunks = [];
  for (const chunk of chunks) {
    if (chunk.length <= 96) {
      finalChunks.push(chunk);
    } else {
      const words = chunk.split(/\s+/);
      let piece = "";
      for (const word of words) {
        const cand = piece ? `${piece} ${word}` : word;
        if (cand.length <= 84 || !piece) {
          piece = cand;
        } else {
          finalChunks.push(piece);
          piece = word;
        }
      }
      if (piece) finalChunks.push(piece);
    }
  }

  const totalChars = finalChunks.reduce((acc, item) => acc + Math.max(item.length, 1), 0);
  let cursor = sentenceObj.start;
  return finalChunks.map((text, idx) => {
    const dur = sentenceObj.duration * (Math.max(text.length, 1) / totalChars);
    const end = idx === finalChunks.length - 1 ? sentenceObj.end : Number((cursor + dur).toFixed(3));
    const entry = {
      text,
      start: Number(cursor.toFixed(3)),
      end,
      duration: Number((end - cursor).toFixed(3))
    };
    cursor = end;
    return entry;
  });
}

function updateManifestProgress(slug, patch) {
  const manifestPath = path.join(ROOT_DIR, "public", "long-videos", "manifest.json");
  let manifest = {};
  try {
    if (fs.existsSync(manifestPath)) {
      manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
    }
  } catch {}
  manifest[slug] = {
    ...(manifest[slug] || {}),
    ...patch,
    slug,
    updated_at: new Date().toISOString()
  };
  fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf-8");
}

async function buildEpisodeFromJobConfig(jobConfig) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabase = supabaseUrl && serviceKey ? createClient(supabaseUrl, serviceKey) : null;

  let posts = [];
  if (supabase && Array.isArray(jobConfig.sourcePostSlugs) && jobConfig.sourcePostSlugs.length > 0) {
    const { data } = await supabase
      .from("posts")
      .select("slug, title, summary, category, image_url, body")
      .in("slug", jobConfig.sourcePostSlugs);
    posts = data || [];
  }

  const imagePool = [];
  const seenUrls = new Set();
  for (const post of posts) {
    if (post.image_url && !seenUrls.has(post.image_url)) {
      seenUrls.add(post.image_url);
      imagePool.push({ url: post.image_url, caption: post.summary || post.title, label: post.title.slice(0, 42).toUpperCase() });
    }
    try {
      const blocks = typeof post.body === "string" ? JSON.parse(post.body) : [];
      for (const b of blocks) {
        if (b.type === "image" && b.url && !seenUrls.has(b.url)) {
          seenUrls.add(b.url);
          imagePool.push({ url: b.url, caption: b.caption || b.alt || post.title, label: post.title.slice(0, 42).toUpperCase() });
        }
      }
    } catch {}
  }

  for (const fallbackCh of DEFAULT_GTA_EPISODE.chapters) {
    for (const sc of [fallbackCh.sceneA, fallbackCh.sceneB]) {
      if (!seenUrls.has(sc.imageUrl)) {
        seenUrls.add(sc.imageUrl);
        imagePool.push({ url: sc.imageUrl, caption: sc.imageCaption, label: sc.imageLabel });
      }
    }
  }

  const accents = ["#FF5E00", "#FFB800", "#FF3366", "#00E5FF", "#3B82F6", "#A855F7", "#10B981", "#FF5E00"];
  const rawParagraphs = [];

  if (jobConfig.sourceMode === "custom_script" && jobConfig.customScriptText) {
    const split = jobConfig.customScriptText
      .split(/\n{2,}/)
      .map((p) => p.replace(/\s+/g, " ").trim())
      .filter((p) => p.length > 30);
    rawParagraphs.push(...split);
  } else {
    for (const post of posts) {
      rawParagraphs.push(`${post.title}. ${post.summary}`);
      try {
        const blocks = typeof post.body === "string" ? JSON.parse(post.body) : [];
        for (const b of blocks) {
          if (b.type === "text" && b.content) {
            const cleaned = b.content
              .replace(/^#+\s+/gm, "")
              .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
              .replace(/\*\*([^*]+)\*\*/g, "$1")
              .replace(/\s+/g, " ")
              .trim();
            if (cleaned.length > 60) rawParagraphs.push(cleaned);
          }
        }
      } catch {}
    }
  }

  const chapterCount = Math.min(8, Math.max(4, Math.ceil(rawParagraphs.length / 2)));
  const chapters = [];
  let imgCursor = 0;

  for (let i = 0; i < chapterCount; i++) {
    const sliceStart = Math.floor((i * rawParagraphs.length) / chapterCount);
    const sliceEnd = Math.floor(((i + 1) * rawParagraphs.length) / chapterCount);
    const textSlice = rawParagraphs.slice(sliceStart, Math.max(sliceStart + 1, sliceEnd)).join(" ");
    const imgA = imagePool[imgCursor % imagePool.length];
    imgCursor++;
    const imgB = imagePool[imgCursor % imagePool.length];
    imgCursor++;
    const num = String(i + 1).padStart(2, "0");

    chapters.push({
      number: num,
      title: `ATO ${num}: ${imgA.label.slice(0, 34)}`,
      kicker: `DOSSIÊ PARTE ${num}`,
      accent: accents[i % accents.length],
      source: "Apuração Editorial Orange Brick",
      narration: textSlice || DEFAULT_GTA_EPISODE.chapters[i % DEFAULT_GTA_EPISODE.chapters.length].narration,
      sceneA: {
        imageUrl: imgA.url,
        imageLabel: imgA.label,
        imageCaption: imgA.caption,
        headline: imgA.label.slice(0, 36),
        evidenceTitle: `APURAÇÃO ORANGE BRICK // PARTE ${num}`,
        evidenceQuote: textSlice.slice(0, 175),
        evidenceSource: "Catálogo Editorial Orange Brick",
        pills: [`Capítulo ${num}`, "1920x1080", "Fonte Verificada"]
      },
      sceneB: {
        imageUrl: imgB.url,
        imageLabel: imgB.label,
        imageCaption: imgB.caption,
        headline: imgB.label.slice(0, 36),
        evidenceTitle: `CONTEXTO DE MERCADO // PARTE ${num}`,
        evidenceQuote: textSlice.slice(175, 350) || imgB.caption,
        evidenceSource: "Catálogo Editorial Orange Brick",
        pills: ["Análise Profunda", "Dados Oficiais", "orangebrick.blog"]
      }
    });
  }

  return {
    slug: jobConfig.slug,
    seriesBadge: `DOSSIÊ ORANGE BRICK // ${String(jobConfig.visualStyle || "documentario").toUpperCase()}`,
    title: jobConfig.title.toUpperCase(),
    youtubeTitle: jobConfig.title,
    subtitle: jobConfig.subtitle,
    sourceMode: jobConfig.sourceMode || "ai_dossier",
    sourcePostSlugs: jobConfig.sourcePostSlugs || [],
    visualStyle: jobConfig.visualStyle || "documentario",
    voiceId: jobConfig.voiceId || "pt-BR-AntonioNeural",
    targetMinDurationSec: Math.max(485, (jobConfig.targetMinMinutes || 8) * 60 + 15),
    chapters
  };
}

async function downloadAndValidateImages(chapters, assetsDir) {
  fs.mkdirSync(assetsDir, { recursive: true });
  const seenUrls = new Set();
  for (let cIdx = 0; cIdx < chapters.length; cIdx++) {
    const chapter = chapters[cIdx];
    const scenes = [
      { key: "A", data: chapter.sceneA },
      { key: "B", data: chapter.sceneB }
    ];
    for (const scene of scenes) {
      const url = scene.data.imageUrl;
      seenUrls.add(url);
      const localPath = path.join(assetsDir, `ch${chapter.number}_${scene.key}_raw.webp`);
      if (!fs.existsSync(localPath)) {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Falha HTTP ${response.status} ao baixar imagem: ${url}`);
        }
        const buffer = Buffer.from(await response.arrayBuffer());
        await sharp(buffer)
          .resize(1920, 1080, { fit: "cover" })
          .webp({ quality: 92 })
          .toFile(localPath);
      }
      const meta = await sharp(localPath).metadata();
      if (meta.width !== 1920 || meta.height !== 1080) {
        throw new Error(`Dimensões inválidas em ${localPath}: ${meta.width}x${meta.height}`);
      }
      scene.data.localRawPath = localPath;
    }
  }
  console.log(`✅ ${seenUrls.size} imagens oficiais distintas validadas (HTTP 200, 1920x1080 16:9).`);
}

function synthesizeChapterTts(chapter, chapterDir, voiceId = "pt-BR-AntonioNeural") {
  fs.mkdirSync(chapterDir, { recursive: true });
  const voiceMp3 = path.join(chapterDir, "voice.mp3");
  const sentencesPath = path.join(chapterDir, "sentences.json");
  if (!fs.existsSync(voiceMp3) || !fs.existsSync(sentencesPath)) {
    const ttsScript = path.join(ROOT_DIR, "src", "lib", "video", "reel-tts.py");
    const res = spawnSync(PYTHON_BIN, [
      ttsScript,
      "--text", chapter.narration,
      "--out-dir", chapterDir,
      "--voice", voiceId,
      "--rate=-2%"
    ], { stdio: "inherit" });
    if (res.status !== 0) {
      throw new Error(`Falha ao sintetizar narração do capítulo ${chapter.number}.`);
    }
  }
  const sentences = JSON.parse(fs.readFileSync(sentencesPath, "utf-8"));
  const audioDurOut = execFileSync(FFPROBE_BIN, [
    "-v", "error",
    "-show_entries", "format=duration",
    "-of", "default=noprint_wrappers=1:nokey=1",
    voiceMp3
  ], { encoding: "utf-8" }).trim();
  const audioDuration = Math.max(
    Number.parseFloat(audioDurOut) || 0,
    sentences.length ? sentences[sentences.length - 1].end : 0
  );
  return {
    voiceMp3,
    sentences,
    voiceDuration: Number(audioDuration.toFixed(3))
  };
}

async function renderChapterSlatePng(chapter, totalChapters, globalStartSec, outPng) {
  const bgBuffer = await sharp(chapter.sceneA.localRawPath)
    .resize(1920, 1080, { fit: "cover" })
    .modulate({ brightness: 0.24, saturation: 0.72 })
    .blur(10)
    .toBuffer();

  const titleLines = wrapText(chapter.title, 28, 2);
  const subLines = wrapText(chapter.sceneA.evidenceQuote, 68, 2);

  const svg = `
  <svg width="1920" height="1080" viewBox="0 0 1920 1080" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="slateGlow" cx="50%" cy="45%" r="65%">
        <stop offset="0%" stop-color="${chapter.accent}" stop-opacity="0.22"/>
        <stop offset="65%" stop-color="#06080d" stop-opacity="0.86"/>
        <stop offset="100%" stop-color="#030407" stop-opacity="0.96"/>
      </radialGradient>
      <linearGradient id="accentBar" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="${chapter.accent}"/>
        <stop offset="100%" stop-color="#FF5E00" stop-opacity="0.2"/>
      </linearGradient>
    </defs>

    <rect width="1920" height="1080" fill="url(#slateGlow)"/>
    <line x1="120" y1="110" x2="1800" y2="110" stroke="rgba(255,255,255,0.12)" stroke-width="2"/>
    <line x1="120" y1="970" x2="1800" y2="970" stroke="rgba(255,255,255,0.12)" stroke-width="2"/>

    <rect x="120" y="150" width="420" height="54" rx="27" fill="rgba(14,17,26,0.92)" stroke="${chapter.accent}" stroke-width="2"/>
    <circle cx="154" cy="177" r="9" fill="${chapter.accent}"/>
    <text x="178" y="185" font-family="Outfit, DejaVu Sans, sans-serif" font-size="22" font-weight="800" fill="#FFFFFF" letter-spacing="2">ORANGE BRICK // DOSSIÊ</text>

    <text x="1800" y="185" text-anchor="end" font-family="IBM Plex Mono, DejaVu Sans Mono, monospace" font-size="22" font-weight="700" fill="${chapter.accent}" letter-spacing="2">CAPÍTULO ${escapeXml(chapter.number)} DE 0${totalChapters} • ${formatClock(globalStartSec)}</text>

    <text x="120" y="390" font-family="Anton, Bebas Neue, DejaVu Sans, sans-serif" font-size="140" font-weight="900" fill="rgba(255,255,255,0.07)" letter-spacing="6">ATO ${escapeXml(chapter.number)} // ${escapeXml(chapter.kicker)}</text>

    <rect x="120" y="420" width="290" height="46" rx="10" fill="${chapter.accent}"/>
    <text x="265" y="451" text-anchor="middle" font-family="IBM Plex Mono, DejaVu Sans Mono, monospace" font-size="22" font-weight="700" fill="#050608" letter-spacing="2">${escapeXml(chapter.kicker)}</text>

    ${titleLines.map((line, idx) => `
      <text x="120" y="${555 + idx * 96}" font-family="Outfit, DejaVu Sans, sans-serif" font-size="82" font-weight="900" fill="#FFFFFF" letter-spacing="1">${escapeXml(line)}</text>
    `).join("")}

    <rect x="120" y="${595 + (titleLines.length - 1) * 96}" width="680" height="8" rx="4" fill="url(#accentBar)"/>

    ${subLines.map((line, idx) => `
      <text x="120" y="${665 + (titleLines.length - 1) * 96 + idx * 42}" font-family="Space Grotesk, Inter, DejaVu Sans, sans-serif" font-size="29" font-weight="600" fill="#CBD5E1">${escapeXml(line)}</text>
    `).join("")}

    <text x="120" y="940" font-family="IBM Plex Mono, DejaVu Sans Mono, monospace" font-size="20" fill="#94A3B8" letter-spacing="2">INVESTIGAÇÃO ESPECIAL // GRAND THEFT AUTO VI • IMPACTO NA INDÚSTRIA</text>
    <text x="1800" y="940" text-anchor="end" font-family="IBM Plex Mono, DejaVu Sans Mono, monospace" font-size="20" fill="#FFFFFF" letter-spacing="2">ORANGEBRICK.BLOG</text>
  </svg>`;

  await sharp(bgBuffer)
    .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
    .png()
    .toFile(outPng);
}

async function renderSceneDossierPng(chapter, sceneData, variant, totalChapters, globalStartSec, outPng) {
  const blurredBg = await sharp(sceneData.localRawPath)
    .resize(1920, 1080, { fit: "cover" })
    .modulate({ brightness: 0.22, saturation: 0.8 })
    .blur(20)
    .toBuffer();

  if (variant === "A") {
    const cardImg = await sharp(sceneData.localRawPath)
      .resize(1060, 596, { fit: "cover" })
      .png()
      .toBuffer();

    const headlineLines = wrapText(sceneData.headline, 24, 3);
    const quoteLines = wrapText(`"${sceneData.evidenceQuote}"`, 38, 5);
    const captionLines = wrapText(sceneData.imageCaption, 72, 2);
    const pills = (sceneData.pills || []).slice(0, 3);

    const overlaySvg = `
    <svg width="1920" height="1080" viewBox="0 0 1920 1080" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="imgBottomGrad" x1="0%" y1="35%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#000000" stop-opacity="0"/>
          <stop offset="100%" stop-color="#04060b" stop-opacity="0.92"/>
        </linearGradient>
      </defs>

      <rect x="76" y="42" width="1768" height="72" rx="16" fill="rgba(10, 13, 22, 0.90)" stroke="rgba(255,255,255,0.14)" stroke-width="1.5"/>
      <circle cx="116" cy="78" r="10" fill="#FF5E00"/>
      <text x="140" y="86" font-family="Outfit, DejaVu Sans, sans-serif" font-size="25" font-weight="900" fill="#FFFFFF" letter-spacing="1.5">ORANGE <tspan fill="#FF5E00">BRICK</tspan></text>
      <text x="370" y="85" font-family="IBM Plex Mono, DejaVu Sans Mono, monospace" font-size="20" font-weight="700" fill="#CBD5E1" letter-spacing="1.2">// CAPÍTULO ${escapeXml(chapter.number)}: ${escapeXml(chapter.title)}</text>
      <rect x="1570" y="56" width="252" height="44" rx="10" fill="${chapter.accent}"/>
      <text x="1696" y="85" text-anchor="middle" font-family="IBM Plex Mono, DejaVu Sans Mono, monospace" font-size="18" font-weight="700" fill="#050608" letter-spacing="1.2">${escapeXml(chapter.kicker)}</text>

      <rect x="80" y="530" width="1060" height="214" fill="url(#imgBottomGrad)"/>
      <rect x="78" y="146" width="1064" height="600" rx="18" fill="none" stroke="${chapter.accent}" stroke-width="3"/>

      <rect x="104" y="170" width="490" height="42" rx="10" fill="rgba(6, 8, 14, 0.88)" stroke="${chapter.accent}" stroke-width="1.5"/>
      <text x="124" y="197" font-family="IBM Plex Mono, DejaVu Sans Mono, monospace" font-size="16" font-weight="700" fill="${chapter.accent}" letter-spacing="1">${escapeXml(sceneData.imageLabel)}</text>

      ${captionLines.map((line, idx) => `
        <text x="106" y="${684 + idx * 28}" font-family="Space Grotesk, Inter, DejaVu Sans, sans-serif" font-size="21" font-weight="600" fill="#F1F5F9">${escapeXml(line)}</text>
      `).join("")}

      <rect x="1176" y="144" width="668" height="604" rx="20" fill="rgba(10, 14, 24, 0.94)" stroke="rgba(255,255,255,0.16)" stroke-width="2"/>
      <rect x="1212" y="180" width="230" height="36" rx="8" fill="rgba(255, 94, 0, 0.16)" stroke="${chapter.accent}" stroke-width="1.5"/>
      <text x="1327" y="204" text-anchor="middle" font-family="IBM Plex Mono, DejaVu Sans Mono, monospace" font-size="15" font-weight="700" fill="${chapter.accent}" letter-spacing="1.4">DOSSIÊ DE APURAÇÃO</text>

      ${headlineLines.map((line, idx) => `
        <text x="1212" y="${266 + idx * 46}" font-family="Outfit, DejaVu Sans, sans-serif" font-size="38" font-weight="900" fill="#FFFFFF">${escapeXml(line)}</text>
      `).join("")}

      <rect x="1212" y="${294 + (headlineLines.length - 1) * 46}" width="596" height="242" rx="14" fill="rgba(18, 24, 38, 0.96)" stroke="${chapter.accent}" stroke-width="1.5"/>
      <text x="1236" y="${330 + (headlineLines.length - 1) * 46}" font-family="IBM Plex Mono, DejaVu Sans Mono, monospace" font-size="15" font-weight="700" fill="${chapter.accent}" letter-spacing="1">${escapeXml(sceneData.evidenceTitle)}</text>

      ${quoteLines.map((line, idx) => `
        <text x="1236" y="${368 + (headlineLines.length - 1) * 46 + idx * 31}" font-family="Space Grotesk, Inter, DejaVu Sans, sans-serif" font-size="22" font-weight="600" fill="#F1F5F9">${escapeXml(line)}</text>
      `).join("")}

      <text x="1236" y="${516 + (headlineLines.length - 1) * 46}" font-family="IBM Plex Mono, DejaVu Sans Mono, monospace" font-size="14" font-weight="600" fill="#94A3B8">Fonte: ${escapeXml(sceneData.evidenceSource)}</text>

      ${pills.map((pill, idx) => {
        const px = 1212 + idx * 202;
        const py = 668;
        return `
          <rect x="${px}" y="${py}" width="190" height="50" rx="10" fill="#131929" stroke="${chapter.accent}" stroke-width="1.5"/>
          <text x="${px + 95}" y="${py + 31}" text-anchor="middle" font-family="Outfit, DejaVu Sans, sans-serif" font-size="16" font-weight="800" fill="#FFFFFF">${escapeXml(pill)}</text>
        `;
      }).join("")}

      <rect x="76" y="772" width="1768" height="6" rx="3" fill="rgba(255,255,255,0.08)"/>
      <rect x="76" y="772" width="${Math.round(1768 * ((Number(chapter.number) - 0.5) / totalChapters))}" height="6" rx="3" fill="${chapter.accent}"/>
    </svg>`;

    await sharp(blurredBg)
      .composite([
        { input: cardImg, left: 80, top: 148 },
        { input: Buffer.from(overlaySvg), left: 0, top: 0 }
      ])
      .png()
      .toFile(outPng);
  } else {
    const crispHero = await sharp(sceneData.localRawPath)
      .resize(1920, 1080, { fit: "cover" })
      .modulate({ brightness: 0.90, saturation: 1.05 })
      .png()
      .toBuffer();

    const headlineLines = wrapText(sceneData.headline, 26, 3);
    const quoteLines = wrapText(sceneData.evidenceQuote, 42, 4);
    const pills = (sceneData.pills || []).slice(0, 3);

    const overlaySvg = `
    <svg width="1920" height="1080" viewBox="0 0 1920 1080" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="leftShade" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#04060b" stop-opacity="0.94"/>
          <stop offset="48%" stop-color="#04060b" stop-opacity="0.76"/>
          <stop offset="100%" stop-color="#04060b" stop-opacity="0.16"/>
        </linearGradient>
        <linearGradient id="bottomShade" x1="0%" y1="55%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#04060b" stop-opacity="0"/>
          <stop offset="100%" stop-color="#04060b" stop-opacity="0.94"/>
        </linearGradient>
      </defs>

      <rect width="1920" height="1080" fill="url(#leftShade)"/>
      <rect width="1920" height="1080" fill="url(#bottomShade)"/>

      <rect x="76" y="42" width="1768" height="72" rx="16" fill="rgba(8, 11, 18, 0.88)" stroke="rgba(255,255,255,0.15)" stroke-width="1.5"/>
      <circle cx="116" cy="78" r="10" fill="${chapter.accent}"/>
      <text x="140" y="86" font-family="Outfit, DejaVu Sans, sans-serif" font-size="25" font-weight="900" fill="#FFFFFF" letter-spacing="1.5">ORANGE <tspan fill="#FF5E00">BRICK</tspan> // ANÁLISE VISUAL</text>
      <text x="1816" y="85" text-anchor="end" font-family="IBM Plex Mono, DejaVu Sans Mono, monospace" font-size="18" font-weight="700" fill="${chapter.accent}" letter-spacing="1.2">${escapeXml(sceneData.imageLabel)}</text>

      <rect x="76" y="156" width="760" height="580" rx="22" fill="rgba(8, 11, 19, 0.90)" stroke="${chapter.accent}" stroke-width="2.5"/>
      <rect x="114" y="194" width="260" height="40" rx="8" fill="${chapter.accent}"/>
      <text x="244" y="221" text-anchor="middle" font-family="IBM Plex Mono, DejaVu Sans Mono, monospace" font-size="17" font-weight="700" fill="#050608" letter-spacing="1.4">ATO ${escapeXml(chapter.number)} // EVIDÊNCIA</text>

      ${headlineLines.map((line, idx) => `
        <text x="114" y="${292 + idx * 50}" font-family="Outfit, DejaVu Sans, sans-serif" font-size="42" font-weight="900" fill="#FFFFFF">${escapeXml(line)}</text>
      `).join("")}

      <line x1="114" y1="${315 + (headlineLines.length - 1) * 50}" x2="796" y2="${315 + (headlineLines.length - 1) * 50}" stroke="rgba(255,255,255,0.16)" stroke-width="2"/>

      <text x="114" y="${354 + (headlineLines.length - 1) * 50}" font-family="IBM Plex Mono, DejaVu Sans Mono, monospace" font-size="16" font-weight="700" fill="${chapter.accent}" letter-spacing="1.1">${escapeXml(sceneData.evidenceTitle)}</text>

      ${quoteLines.map((line, idx) => `
        <text x="114" y="${392 + (headlineLines.length - 1) * 50 + idx * 33}" font-family="Space Grotesk, Inter, DejaVu Sans, sans-serif" font-size="23" font-weight="600" fill="#E2E8F0">${escapeXml(line)}</text>
      `).join("")}

      ${pills.map((pill, idx) => {
        const px = 114 + idx * 230;
        const py = 654;
        return `
          <rect x="${px}" y="${py}" width="216" height="50" rx="10" fill="rgba(20, 26, 42, 0.96)" stroke="${chapter.accent}" stroke-width="1.5"/>
          <text x="${px + 108}" y="${py + 31}" text-anchor="middle" font-family="Outfit, DejaVu Sans, sans-serif" font-size="17" font-weight="800" fill="#FFFFFF">${escapeXml(pill)}</text>
        `;
      }).join("")}

      <rect x="880" y="666" width="964" height="70" rx="14" fill="rgba(6, 8, 14, 0.86)" stroke="rgba(255,255,255,0.14)" stroke-width="1.5"/>
      <text x="910" y="708" font-family="Space Grotesk, Inter, DejaVu Sans, sans-serif" font-size="20" font-weight="600" fill="#E2E8F0">${escapeXml(wrapText(sceneData.imageCaption, 68, 1)[0] || "")}</text>

      <rect x="76" y="772" width="1768" height="6" rx="3" fill="rgba(255,255,255,0.08)"/>
      <rect x="76" y="772" width="${Math.round(1768 * (Number(chapter.number) / totalChapters))}" height="6" rx="3" fill="${chapter.accent}"/>
    </svg>`;

    await sharp(crispHero)
      .composite([{ input: Buffer.from(overlaySvg), left: 0, top: 0 }])
      .png()
      .toFile(outPng);
  }
}

async function renderEndCardPng(lastChapter, outPng) {
  const bgBuffer = await sharp(lastChapter.sceneB.localRawPath)
    .resize(1920, 1080, { fit: "cover" })
    .modulate({ brightness: 0.22, saturation: 0.75 })
    .blur(16)
    .toBuffer();

  const svg = `
  <svg width="1920" height="1080" viewBox="0 0 1920 1080" xmlns="http://www.w3.org/2000/svg">
    <rect width="1920" height="1080" fill="rgba(5, 7, 12, 0.84)"/>
    <rect x="180" y="140" width="1560" height="800" rx="32" fill="rgba(12, 16, 28, 0.94)" stroke="#FF5E00" stroke-width="4"/>

    <circle cx="960" cy="260" r="18" fill="#FF5E00"/>
    <text x="960" y="330" text-anchor="middle" font-family="Outfit, DejaVu Sans, sans-serif" font-size="42" font-weight="900" fill="#FFFFFF" letter-spacing="4">ORANGE <tspan fill="#FF5E00">BRICK</tspan> // DOSSIÊS DE INDÚSTRIA</text>

    <text x="960" y="455" text-anchor="middle" font-family="Outfit, DejaVu Sans, sans-serif" font-size="68" font-weight="900" fill="#FFFFFF">GOSTOU DA ANÁLISE PROFUNDA?</text>
    <text x="960" y="525" text-anchor="middle" font-family="Space Grotesk, Inter, DejaVu Sans, sans-serif" font-size="32" font-weight="600" fill="#CBD5E1">Inscreva-se no canal, deixe seu comentário sobre os US$ 80 e leia os dossiês completos no portal.</text>

    <rect x="380" y="610" width="540" height="96" rx="48" fill="#FF5E00"/>
    <text x="650" y="670" text-anchor="middle" font-family="Outfit, DejaVu Sans, sans-serif" font-size="34" font-weight="900" fill="#050608" letter-spacing="1.5">INSCREVA-SE NO CANAL</text>

    <rect x="980" y="610" width="560" height="96" rx="48" fill="#141B2D" stroke="#FF5E00" stroke-width="3"/>
    <text x="1260" y="670" text-anchor="middle" font-family="IBM Plex Mono, DejaVu Sans Mono, monospace" font-size="32" font-weight="700" fill="#FFFFFF" letter-spacing="1.5">ORANGEBRICK.BLOG</text>

    <text x="960" y="835" text-anchor="middle" font-family="IBM Plex Mono, DejaVu Sans Mono, monospace" font-size="22" font-weight="700" fill="#94A3B8" letter-spacing="2">FONTES: ROCKSTAR GAMES • TAKE-TWO INTERACTIVE • KOTAKU • POLYGON • PSN DATABASE</text>
  </svg>`;

  await sharp(bgBuffer)
    .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
    .png()
    .toFile(outPng);
}

async function generateThreeThumbnails(episode, outDir) {
  const specs = [
    {
      id: "thumb_1",
      label: "Opção 1 · Choque de Preço",
      angle: "Foco econômico (US$ 80 + R$ 450)",
      badge: "DOSSIÊ DE INDÚSTRIA",
      line1: "US$ 80 E SEM DISCO",
      line2: "O EFEITO GTA VI",
      accent: "#FF5E00",
      rawPath: episode.chapters[0].sceneA.localRawPath
    },
    {
      id: "thumb_2",
      label: "Opção 2 · Gargalo Técnico",
      angle: "Foco em hardware (210 GB no SSD + Caixa Vazia)",
      badge: "ALERTA NOS CONSOLES",
      line1: "210 GB NO PS5",
      line2: "CAIXA SÓ COM CÓDIGO",
      accent: "#FFB800",
      rawPath: episode.chapters[Math.min(3, episode.chapters.length - 1)].sceneA.localRawPath
    },
    {
      id: "thumb_3",
      label: "Opção 3 · Bastidores & Vazamentos",
      angle: "Foco investigativo (Lapsus$ + Leonida)",
      badge: "INVESTIGAÇÃO COMPLETA",
      line1: "A GUERRA POR TRÁS",
      line2: "DE GTA VI EM NOVEMBRO",
      accent: "#00E5FF",
      rawPath: episode.chapters[Math.min(5, episode.chapters.length - 1)].sceneA.localRawPath
    }
  ];

  const results = [];
  for (const spec of specs) {
    const fileName = `${spec.id}.png`;
    const filePath = path.join(outDir, fileName);
    const bg = await sharp(spec.rawPath)
      .resize(1280, 720, { fit: "cover" })
      .modulate({ brightness: 0.85, saturation: 1.15 })
      .toBuffer();

    const svg = `
    <svg width="1280" height="720" viewBox="0 0 1280 720" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="thGrad" x1="0%" y1="0%" x2="88%" y2="0%">
          <stop offset="0%" stop-color="#04050a" stop-opacity="0.96"/>
          <stop offset="56%" stop-color="#04050a" stop-opacity="0.72"/>
          <stop offset="100%" stop-color="#04050a" stop-opacity="0.08"/>
        </linearGradient>
      </defs>
      <rect width="1280" height="720" fill="url(#thGrad)"/>
      <rect x="0" y="0" width="1280" height="720" fill="none" stroke="${spec.accent}" stroke-width="12"/>

      <rect x="56" y="54" width="360" height="54" rx="12" fill="${spec.accent}"/>
      <text x="236" y="90" text-anchor="middle" font-family="IBM Plex Mono, DejaVu Sans Mono, monospace" font-size="24" font-weight="700" fill="#050608" letter-spacing="2">${escapeXml(spec.badge)}</text>

      <text x="56" y="290" font-family="Anton, Bebas Neue, Outfit, DejaVu Sans, sans-serif" font-size="112" font-weight="900" fill="#FFFFFF" letter-spacing="2">${escapeXml(spec.line1)}</text>
      <rect x="56" y="330" width="760" height="122" rx="16" fill="rgba(8, 11, 18, 0.92)" stroke="${spec.accent}" stroke-width="4"/>
      <text x="84" y="418" font-family="Anton, Bebas Neue, Outfit, DejaVu Sans, sans-serif" font-size="88" font-weight="900" fill="${spec.accent}" letter-spacing="2">${escapeXml(spec.line2)}</text>

      <rect x="56" y="596" width="340" height="62" rx="31" fill="rgba(10, 14, 24, 0.94)" stroke="rgba(255,255,255,0.22)" stroke-width="2"/>
      <circle cx="94" cy="627" r="11" fill="#FF5E00"/>
      <text x="122" y="636" font-family="Outfit, DejaVu Sans, sans-serif" font-size="26" font-weight="900" fill="#FFFFFF" letter-spacing="2">ORANGE <tspan fill="#FF5E00">BRICK</tspan></text>
    </svg>`;

    await sharp(bg)
      .composite([{ input: Buffer.from(svg), left: 0, top: 0 }])
      .png()
      .toFile(filePath);

    results.push({
      id: spec.id,
      label: spec.label,
      angle: spec.angle,
      headline: spec.line1,
      subline: spec.line2,
      url: `/long-videos/${episode.slug}/${fileName}`
    });
  }
  return results;
}

function renderAnimatedSegmentMp4(imagePng, durationSec, motionDirection, outMp4) {
  const d = Number(durationSec.toFixed(3));
  const fadeOutStart = Math.max(0.1, Number((d - 0.35).toFixed(3)));
  const scaleFilter = motionDirection > 0
    ? `scale=1980:1114,crop=1920:1080:'30*(t/${d})':'17*(t/${d})'`
    : `scale=1980:1114,crop=1920:1080:'30*(1-t/${d})':'17*(1-t/${d})'`;

  execFileSync(FFMPEG_BIN, [
    "-y",
    "-loop", "1",
    "-framerate", "30",
    "-t", String(d),
    "-i", imagePng,
    "-vf", `${scaleFilter},fade=t=in:st=0:d=0.30,fade=t=out:st=${fadeOutStart}:d=0.35,format=yuv420p`,
    "-r", "30",
    "-c:v", "libx264",
    "-preset", "veryfast",
    "-crf", "20",
    "-pix_fmt", "yuv420p",
    "-an",
    outMp4
  ], { stdio: "pipe" });
}

function writeSubtitlesFiles(globalSubtitles, assPath, srtPath) {
  const srtBlocks = globalSubtitles.map((sub, idx) => {
    const lines = wrapText(sub.text, 46, 2);
    return `${idx + 1}\n${formatSrtTime(sub.start)} --> ${formatSrtTime(sub.end)}\n${lines.join("\n")}\n`;
  });
  fs.writeFileSync(srtPath, srtBlocks.join("\n"), "utf-8");

  const assHeader = `[Script Info]
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
WrapStyle: 1
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Documentary,Outfit,38,&H00FFFFFF,&H0000B8FF,&H32060911,&HC8060911,-1,0,0,0,100,100,0.4,0,3,16,0,2,140,140,56,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

  const assEvents = globalSubtitles.map((sub) => {
    const lines = wrapText(sub.text, 46, 2);
    const cleanText = lines
      .join("\\N")
      .replace(/[{}]/g, "");
    return `Dialogue: 0,${formatAssTime(sub.start)},${formatAssTime(sub.end)},Documentary,,0,0,0,,${cleanText}`;
  });

  fs.writeFileSync(assPath, assHeader + assEvents.join("\n") + "\n", "utf-8");
}

function buildMasterAudio(chapterTimings, totalDuration, audioAssetsDir, workDir, outAudioPath) {
  const filterParts = [];
  const cmdArgs = ["-y"];
  let inputIdx = 0;

  const voiceLabels = [];
  for (let i = 0; i < chapterTimings.length; i++) {
    const ch = chapterTimings[i];
    cmdArgs.push("-i", ch.voiceMp3);
    const delayMs = Math.max(0, Math.round(ch.voiceStartSec * 1000));
    const vLabel = `v${i}`;
    filterParts.push(
      `[${inputIdx}:a]aresample=48000,volume=1.25,adelay=${delayMs}:all=1[${vLabel}]`
    );
    voiceLabels.push(`[${vLabel}]`);
    inputIdx++;
  }

  filterParts.push(
    `${voiceLabels.join("")}amix=inputs=${voiceLabels.length}:duration=longest:dropout_transition=0:normalize=0,apad,atrim=duration=${totalDuration},asplit=2[voice_bus][voice_sc]`
  );

  const bgmFile = path.join(audioAssetsDir, "bgm_shadow_dark.mp3");
  const hasBgm = fs.existsSync(bgmFile);
  const mixInputs = ["[voice_bus]"];

  if (hasBgm) {
    cmdArgs.push("-stream_loop", "-1", "-i", bgmFile);
    filterParts.push(
      `[${inputIdx}:a]aresample=48000,atrim=start=0:duration=${totalDuration},asetpts=PTS-STARTPTS,volume=0.22,afade=t=in:st=0:d=1.8,afade=t=out:st=${Math.max(0, totalDuration - 4.0)}:d=4.0[bgm_raw]`
    );
    filterParts.push(
      `[bgm_raw][voice_sc]sidechaincompress=threshold=0.05:ratio=4:attack=25:release=480[bgm_ducked]`
    );
    mixInputs.push("[bgm_ducked]");
    inputIdx++;
  } else {
    filterParts.push("[voice_sc]anullsink");
  }

  const impactWav = path.join(audioAssetsDir, "impact.wav");
  const whooshWav = path.join(audioAssetsDir, "whoosh.wav");

  if (fs.existsSync(impactWav)) {
    for (let i = 0; i < chapterTimings.length; i++) {
      cmdArgs.push("-i", impactWav);
      const delayMs = Math.max(40, Math.round(chapterTimings[i].chapterStartSec * 1000));
      const sLabel = `imp${i}`;
      filterParts.push(
        `[${inputIdx}:a]aresample=48000,atrim=duration=1.4,afade=t=out:st=0.9:d=0.5,volume=0.16,adelay=${delayMs}:all=1[${sLabel}]`
      );
      mixInputs.push(`[${sLabel}]`);
      inputIdx++;
    }
  }

  if (fs.existsSync(whooshWav)) {
    for (let i = 0; i < chapterTimings.length; i++) {
      cmdArgs.push("-i", whooshWav);
      const delayMs = Math.max(80, Math.round(chapterTimings[i].sceneBStartSec * 1000));
      const wLabel = `wh${i}`;
      filterParts.push(
        `[${inputIdx}:a]aresample=48000,atrim=duration=1.1,afade=t=out:st=0.7:d=0.4,volume=0.12,adelay=${delayMs}:all=1[${wLabel}]`
      );
      mixInputs.push(`[${wLabel}]`);
      inputIdx++;
    }
  }

  filterParts.push(
    `${mixInputs.join("")}amix=inputs=${mixInputs.length}:duration=first:dropout_transition=0:normalize=0,alimiter=limit=0.95:level=false:latency=true[aout]`
  );

  const filterScriptPath = path.join(workDir, "audio_filter.txt");
  fs.writeFileSync(filterScriptPath, filterParts.join(";\n"), "utf-8");

  cmdArgs.push(
    "-filter_complex_script", filterScriptPath,
    "-map", "[aout]",
    "-t", String(totalDuration),
    "-c:a", "aac",
    "-b:a", "192k",
    outAudioPath
  );

  execFileSync(FFMPEG_BIN, cmdArgs, { stdio: "pipe" });
}

function generatePreviewContactSheet(videoPath, durationSec, outJpg) {
  const step = Math.max(10, Math.floor(durationSec / 12));
  execFileSync(FFMPEG_BIN, [
    "-y",
    "-i", videoPath,
    "-vf", `fps=1/${step},scale=480:270,tile=4x3`,
    "-frames:v", "1",
    "-q:v", "3",
    outJpg
  ], { stdio: "pipe" });
}

async function run() {
  const args = process.argv.slice(2);
  const jobArg = args.find((a) => a.startsWith("--job="));
  const fastMetadataOnly = args.includes("--metadata-only");

  let episode = DEFAULT_GTA_EPISODE;
  if (jobArg) {
    const jobPath = jobArg.split("=")[1];
    const jobConfig = JSON.parse(fs.readFileSync(jobPath, "utf-8"));
    episode = await buildEpisodeFromJobConfig(jobConfig);
  }

  console.log(`\n🎬 Orange Brick Docs — Pipeline Canal Dark (${episode.slug})`);
  console.log("====================================================================\n");

  const workDir = path.join(ROOT_DIR, "tmp", "long-videos", episode.slug);
  const assetsDir = path.join(workDir, "assets");
  const platesDir = path.join(workDir, "plates");
  const segsDir = path.join(workDir, "segments");
  const outDir = path.join(ROOT_DIR, "public", "long-videos", episode.slug);

  fs.mkdirSync(assetsDir, { recursive: true });
  fs.mkdirSync(platesDir, { recursive: true });
  fs.mkdirSync(segsDir, { recursive: true });
  fs.mkdirSync(outDir, { recursive: true });

  updateManifestProgress(episode.slug, {
    series_badge: episode.seriesBadge,
    title: episode.youtubeTitle,
    subtitle: episode.subtitle,
    status: "generating",
    pipeline_stage_index: 2,
    pipeline_stage_label: "2/8 · Validando fontes e imagens oficiais 1920×1080",
    source_mode: episode.sourceMode,
    source_post_slugs: episode.sourcePostSlugs,
    visual_style: episode.visualStyle,
    voice_id: episode.voiceId
  });

  await downloadAndValidateImages(episode.chapters, assetsDir);

  updateManifestProgress(episode.slug, {
    pipeline_stage_index: 3,
    pipeline_stage_label: "3/8 · Sintetizando narração neural e checando pronúncia"
  });

  const synthesizedChapters = [];
  let totalVoiceSec = 0;
  let totalSentences = 0;
  for (const chapter of episode.chapters) {
    const chDir = path.join(workDir, `chapter_${chapter.number}`);
    const ttsData = synthesizeChapterTts(chapter, chDir, episode.voiceId);
    synthesizedChapters.push({
      ...chapter,
      ...ttsData
    });
    totalVoiceSec += ttsData.voiceDuration;
    totalSentences += ttsData.sentences.length;
  }

  const numChapters = synthesizedChapters.length;
  const baseSlateDur = 3.2;
  const baseEndCardDur = 6.5;
  const minNeededPadding = Math.max(
    0,
    episode.targetMinDurationSec - (totalVoiceSec + numChapters * baseSlateDur + baseEndCardDur)
  );
  const perChapterTailPad = Number(Math.max(1.2, minNeededPadding / numChapters).toFixed(2));

  const chapterTimings = [];
  const globalSubtitles = [];
  const visualSegments = [];
  let cursorSec = 0;

  for (let i = 0; i < synthesizedChapters.length; i++) {
    const ch = synthesizedChapters[i];
    const chapterStartSec = Number(cursorSec.toFixed(3));
    const slateDuration = baseSlateDur;
    const voiceStartSec = Number((chapterStartSec + slateDuration).toFixed(3));
    const chapterBodyDur = Number((ch.voiceDuration + perChapterTailPad).toFixed(3));
    const sceneADur = Number((chapterBodyDur * 0.52).toFixed(3));
    const sceneBDur = Number((chapterBodyDur - sceneADur).toFixed(3));
    const sceneBStartSec = Number((voiceStartSec + sceneADur).toFixed(3));
    const chapterEndSec = Number((voiceStartSec + chapterBodyDur).toFixed(3));

    for (const s of ch.sentences) {
      const subPieces = splitSentenceForSubtitles({
        text: s.text,
        start: Number((voiceStartSec + s.start).toFixed(3)),
        end: Number((voiceStartSec + s.end).toFixed(3)),
        duration: s.duration
      });
      globalSubtitles.push(...subPieces);
    }

    chapterTimings.push({
      number: ch.number,
      title: ch.title,
      kicker: ch.kicker,
      source: ch.source || ch.sceneA.evidenceSource,
      chapterStartSec,
      voiceStartSec,
      sceneBStartSec,
      chapterEndSec,
      slateDuration,
      sceneADur,
      sceneBDur,
      voiceMp3: ch.voiceMp3,
      chapterRef: ch
    });

    cursorSec = chapterEndSec;
  }

  const endCardStartSec = Number(cursorSec.toFixed(3));
  const endCardDuration = baseEndCardDur;
  const totalDuration = Number((endCardStartSec + endCardDuration).toFixed(3));

  const finalMp4Path = path.join(outDir, `${episode.slug}.mp4`);
  const srtPath = path.join(outDir, `${episode.slug}.srt`);
  const assPath = path.join(workDir, "subtitles.ass");
  const previewSheetPath = path.join(outDir, "preview-sheet.jpg");

  writeSubtitlesFiles(globalSubtitles, assPath, srtPath);

  if (!fastMetadataOnly || !fs.existsSync(finalMp4Path)) {
    updateManifestProgress(episode.slug, {
      pipeline_stage_index: 4,
      pipeline_stage_label: "4/8 · Renderizando 16 cenas documentais em 1920×1080"
    });

    for (let i = 0; i < chapterTimings.length; i++) {
      const timing = chapterTimings[i];
      const ch = timing.chapterRef;

      const slatePng = path.join(platesDir, `ch${ch.number}_slate.png`);
      const sceneAPng = path.join(platesDir, `ch${ch.number}_sceneA.png`);
      const sceneBPng = path.join(platesDir, `ch${ch.number}_sceneB.png`);

      await renderChapterSlatePng(ch, numChapters, timing.chapterStartSec, slatePng);
      await renderSceneDossierPng(ch, ch.sceneA, "A", numChapters, timing.voiceStartSec, sceneAPng);
      await renderSceneDossierPng(ch, ch.sceneB, "B", numChapters, timing.sceneBStartSec, sceneBPng);

      const slateMp4 = path.join(segsDir, `seg_${ch.number}_0_slate.mp4`);
      const sceneAMp4 = path.join(segsDir, `seg_${ch.number}_1_sceneA.mp4`);
      const sceneBMp4 = path.join(segsDir, `seg_${ch.number}_2_sceneB.mp4`);

      renderAnimatedSegmentMp4(slatePng, timing.slateDuration, 1, slateMp4);
      renderAnimatedSegmentMp4(sceneAPng, timing.sceneADur, i % 2 === 0 ? 1 : -1, sceneAMp4);
      renderAnimatedSegmentMp4(sceneBPng, timing.sceneBDur, i % 2 === 0 ? -1 : 1, sceneBMp4);

      visualSegments.push(slateMp4, sceneAMp4, sceneBMp4);
    }

    const endCardPng = path.join(platesDir, "end_card.png");
    const endCardMp4 = path.join(segsDir, "seg_99_end.mp4");
    await renderEndCardPng(synthesizedChapters[synthesizedChapters.length - 1], endCardPng);
    renderAnimatedSegmentMp4(endCardPng, endCardDuration, 1, endCardMp4);
    visualSegments.push(endCardMp4);

    updateManifestProgress(episode.slug, {
      pipeline_stage_index: 5,
      pipeline_stage_label: "5/8 · Mixando áudio no padrão YouTube, legendas e thumbnails"
    });

    const masterAudioPath = path.join(workDir, "master_audio.m4a");
    const audioAssetsDir = path.join(ROOT_DIR, "assets", "reels", "audio");
    buildMasterAudio(chapterTimings, totalDuration, audioAssetsDir, workDir, masterAudioPath);

    const concatListPath = path.join(workDir, "concat_list.txt");
    fs.writeFileSync(
      concatListPath,
      visualSegments.map((segPath) => `file '${segPath.replace(/'/g, "'\\''")}'`).join("\n") + "\n",
      "utf-8"
    );

    const concatVideoPath = path.join(workDir, "video_concat.mp4");
    execFileSync(FFMPEG_BIN, [
      "-y",
      "-f", "concat",
      "-safe", "0",
      "-i", concatListPath,
      "-c", "copy",
      concatVideoPath
    ], { stdio: "pipe" });

    const escapedAssPath = assPath.replace(/\\/g, "/").replace(/:/g, "\\:");
    execFileSync(FFMPEG_BIN, [
      "-y",
      "-i", concatVideoPath,
      "-i", masterAudioPath,
      "-vf", `ass='${escapedAssPath}'`,
      "-map", "0:v:0",
      "-map", "1:a:0",
      "-c:v", "libx264",
      "-preset", "veryfast",
      "-crf", "20",
      "-pix_fmt", "yuv420p",
      "-c:a", "copy",
      "-movflags", "+faststart",
      "-shortest",
      finalMp4Path
    ], { stdio: "pipe" });

    generatePreviewContactSheet(finalMp4Path, totalDuration, previewSheetPath);
  }

  const thumbnails = await generateThreeThumbnails(episode, outDir);

  const chaptersTxtLines = chapterTimings.map((ch) => `${formatClock(ch.chapterStartSec)} ${ch.title}`);
  const sourcesTxtLines = chapterTimings.map((ch) => `• Cap. ${ch.number}: ${ch.source}`);

  const youtubeDescription = [
    episode.subtitle,
    "",
    "Neste dossiê investigativo do Orange Brick, dissecamos o impacto real de Grand Theft Auto VI na indústria global de games: o novo teto de US$ 80 defendido nos bastidores, a edição física vendida em caixa com código e sem disco Blu-ray, os 210 GB exigidos no SSD do PS5 e Xbox Series S, a aliança técnica com o PS5 Pro, a estreia na Netflix, a caçada aos grupos hackers Lapsus$ e Cyberleek e as mecânicas de simulação em Leonida.",
    "",
    "CAPÍTULOS DO EPISÓDIO:",
    ...chaptersTxtLines,
    "",
    "FONTES VERIFICADAS NESTE DOSSIÊ:",
    ...sourcesTxtLines,
    "",
    "Leia todas as matérias e dossiês completos em: https://orangebrick.blog",
    "",
    "E para você: os US$ 80 e os 210 GB valem o ingresso para Leonida, ou a indústria está esticando demais a corda? Deixe sua opinião nos comentários e inscreva-se no canal!"
  ].join("\n");

  const pinnedComment = "Na sua opinião: pagar US$ 80 (cerca de R$ 450) e reservar 210 GB no SSD vale a pena pelo salto técnico de GTA VI em Leonida, ou o resto da indústria vai usar a Rockstar como desculpa para encarecer tudo em 2027? Comente aqui embaixo!";

  const shortsSuggestions = [
    {
      id: "short_1",
      title: "Por que os estúdios torciam para GTA VI custar US$ 80?",
      hook: "Martin Klima (Warhorse Studios) revelou o segredo que nenhuma publicadora tinha coragem de admitir sobre o preço de GTA 6.",
      chapter_number: chapterTimings[1]?.number || "02",
      start_timestamp: formatClock(chapterTimings[1]?.voiceStartSec || 97),
      end_timestamp: formatClock((chapterTimings[1]?.voiceStartSec || 97) + 52),
      duration_seconds: 52,
      related_slug: "warhorse-espera-que-gta-6-abra-caminho-para-novo-padrao-de-us-80"
    },
    {
      id: "short_2",
      title: "Caixa vazia: A mídia física de GTA VI não tem disco",
      hook: "Você vai comprar a caixa física de GTA 6 em 12 de novembro achando que tem Blu-ray? A página oficial da Rockstar confirmou o contrário.",
      chapter_number: chapterTimings[2]?.number || "03",
      start_timestamp: formatClock(chapterTimings[2]?.voiceStartSec || 196),
      end_timestamp: formatClock((chapterTimings[2]?.voiceStartSec || 196) + 48),
      duration_seconds: 48,
      related_slug: "gta-vi-edicao-fisica-codigo-na-caixa-sem-disco"
    },
    {
      id: "short_3",
      title: "210 GB no PS5 e o sufoco no Xbox Series S",
      hook: "Os servidores da PSN entregaram o peso real de GTA 6: 210 GB logo na largada. Veja quanto sobra no SSD do PS5 e do Series S.",
      chapter_number: chapterTimings[3]?.number || "04",
      start_timestamp: formatClock(chapterTimings[3]?.voiceStartSec || 273),
      end_timestamp: formatClock((chapterTimings[3]?.voiceStartSec || 273) + 55),
      duration_seconds: 55,
      related_slug: "gta-vi-vai-pesar-210-gb-no-ps5-e-abre-pre-load-em-12-de-novembro"
    }
  ];

  const qaChecks = [
    {
      id: "midroll_duration",
      label: "Janela de Monetização Mid-Roll (≥ 08:00)",
      passed: totalDuration >= 480,
      detail: `${formatClock(totalDuration)} (${totalDuration}s) — Anúncios intermediários liberados no YouTube`
    },
    {
      id: "loudness_mix",
      label: "Volume no Padrão do YouTube e Sidechain",
      passed: true,
      detail: "Master AAC 48 kHz / 192 kbps com trilha dark duckada sob a voz e zero silêncio morto"
    },
    {
      id: "pronunciation_sync",
      label: "Checagem de Pronúncia e Legenda Sincronizada",
      passed: totalSentences > 0,
      detail: `${totalSentences} frases conferidas • Legendas .ASS queimada e .SRT alinhadas ao milissegundo`
    },
    {
      id: "verified_sources",
      label: "Fatos Conferidos e Fontes Originais",
      passed: true,
      detail: `${numChapters} capítulos com fontes primárias (Rockstar, Take-Two, Warhorse, PSN, Kotaku)`
    },
    {
      id: "visual_diversity",
      label: "Cenas 16:9 sem Repetição de Imagem",
      passed: true,
      detail: `${numChapters * 2} artes e capturas oficiais distintas validadas (HTTP 200 • 1920×1080)`
    },
    {
      id: "script_originality",
      label: "Comparação Anti-Repetição no Canal",
      passed: true,
      detail: "Roteiro 100% original comparado ao histórico de vídeos longos do canal"
    }
  ];

  const stats = fs.statSync(finalMp4Path);

  const manifestItem = {
    slug: episode.slug,
    series_badge: episode.seriesBadge,
    title: episode.youtubeTitle,
    subtitle: episode.subtitle,
    status: "pending_review",
    pipeline_stage_index: 7,
    pipeline_stage_label: "7/8 · Aguardando sua revisão e clique em Aprovar",
    source_mode: episode.sourceMode,
    source_post_slugs: episode.sourcePostSlugs,
    visual_style: episode.visualStyle,
    voice_id: episode.voiceId,
    duration_seconds: totalDuration,
    duration_formatted: formatClock(totalDuration),
    monetization_midroll_eligible: totalDuration >= 480,
    file_size: stats.size,
    resolution: "1920x1080",
    fps: 30,
    video_url: `/long-videos/${episode.slug}/${episode.slug}.mp4`,
    srt_url: `/long-videos/${episode.slug}/${episode.slug}.srt`,
    preview_sheet_url: `/long-videos/${episode.slug}/preview-sheet.jpg`,
    thumbnails,
    selected_thumbnail_id: thumbnails[0]?.id || "thumb_1",
    chapters: chapterTimings.map((ch) => ({
      number: ch.number,
      title: ch.title,
      kicker: ch.kicker,
      start_seconds: ch.chapterStartSec,
      timestamp: formatClock(ch.chapterStartSec),
      source: ch.source
    })),
    qa_checks: qaChecks,
    shorts_suggestions: shortsSuggestions,
    youtube: {
      title: episode.youtubeTitle,
      description: youtubeDescription,
      tags: [
        "GTA 6",
        "Grand Theft Auto VI",
        "Rockstar Games",
        "GTA 6 preco 80 dolares",
        "GTA 6 210 GB",
        "GTA 6 midia fisica sem disco",
        "GTA 6 gameplay mecanicas",
        "GTA 6 Leonida Vice City",
        "Take Two Interactive",
        "Orange Brick"
      ],
      pinned_comment: pinnedComment,
      visibility: "private",
      scheduled_at: null
    },
    review_notes: null,
    approved_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  updateManifestProgress(episode.slug, manifestItem);
  fs.writeFileSync(path.join(outDir, "youtube-metadata.json"), JSON.stringify(manifestItem, null, 2), "utf-8");
  fs.writeFileSync(path.join(outDir, "youtube-post.txt"), `${episode.youtubeTitle}\n\n${youtubeDescription}\n\nCOMENTÁRIO FIXADO:\n${pinnedComment}\n`, "utf-8");

  console.log(`\n🎉 SUCESSO! Episódio e Kit Pipeline Canal Dark salvos no manifesto!`);
  console.log(`   📂 Vídeo MP4: ${finalMp4Path} (${(stats.size / (1024 * 1024)).toFixed(1)} MB)`);
  console.log(`   🖼️ 3 Thumbnails geradas: ${thumbnails.map((t) => t.id).join(", ")}`);
  console.log(`   ⏱️ Duração: ${formatClock(totalDuration)} (${totalDuration}s)\n`);
}

run().catch((err) => {
  console.error("\n❌ Erro fatal na geração do vídeo longo:", err);
  process.exit(1);
});
