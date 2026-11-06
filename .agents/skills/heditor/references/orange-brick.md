# Orange Brick — direção de vídeo

O objetivo é uma edição editorial, bonita e legível, com imagens que expliquem a fala e uma identidade reconhecível. A referência a edições feitas com Claude descreve uma intenção estética; não pressupõe um estilo único nem uma equivalência de qualidade sem comparar vídeos.

## Direção

O usuário aprovou a prévia `game-key-card-edicao-fluida-v3-preview` como padrão final das próximas produções. Usar sua linguagem de edição e áudio como referência, com cenas próprias para cada assunto; não reproduzir mecanicamente seus 11 planos.

- Abrir diretamente com o assunto e uma informação concreta. Sem vinheta antes do fato.
- Priorizar screenshots, gameplay, trailers e produtos reais adequados ao contexto e com condições de uso verificadas. Não gerar imagens genéricas para preencher a timeline.
- Preservar o enquadramento das artes horizontais. Usar imagem contida e fundo discreto quando o recorte vertical esconder o assunto.
- Usar preto quente, branco e laranja como base; uma família tipográfica, hierarquia clara e espaço entre os elementos.
- Reservar animações para explicar, indicar ou conduzir a leitura. Evitar zooms agressivos, brilhos, emojis decorativos, interfaces falsas e efeitos sonoros aleatórios.
- Manter a identidade entre os episódios. Variar a montagem conforme a matéria, sem trocar a linguagem visual inteira a cada geração.
- Tratar títulos como informação editorial. Não colocar uma lista de pílulas, subtítulo, título e legenda disputando a mesma área.
- Preservar a naturalidade da fala; não acelerar voz para caber. Não remover pausas que sustentem o sentido.
- Revisão aprovada em 04/11/2026: manter o enquadramento fixo. Não deslocar ou ampliar a tela inteira, nem aplicar zoom lento obrigatório nas imagens. Animações locais devem explicar ações ou destacar evidências, com aceleração e desaceleração suaves.
- Não sustentar o desenvolvimento apenas com listas de três cartões. Manter o produto em evidência com detalhes oficiais, demonstrações, provas visuais e consequências práticas. Acrescentar informação até o desfecho, sem repetir a conclusão em várias cenas.
- Variar vozes entre episódios na opção automática; preservar uma voz por vídeo e escolhas explícitas. Exigir revisão auditiva de naturalidade e pronúncia, sem prometer que a síntese soa humana antes da escuta.

## Motion graphics sob medida

Para edições criativas feitas diretamente com a skill, a direção editorial não limita o vídeo a fotografias com zoom. Planejar cenas explicativas conforme a narração:

- Comparações: duas imagens ou dois valores verificados, com a diferença destacada no momento em que for explicada.
- Calendário: eventos reais em uma linha do tempo; não inventar datas para preencher espaço.
- Declaração: retrato ou documento original com identificação e uma fala verificada, distinguindo tradução e paráfrase.
- Hardware: detalhe do produto com uma indicação gráfica ligada ao componente citado.
- Indústria: diagrama simples entre empresas ou produtos, sem sugerir vínculos não confirmados.

Construir os elementos em HTML, SVG e GSAP usando o kit do Heditor. Usar entradas escalonadas, máscaras e mudanças de escala com propósito. Manter animações determinísticas ao buscar qualquer instante e ao renderizar quadros em sequência. Não simular dados ou interfaces como se fossem provas reais.

No DESIGN.md de cada vídeo, registrar o motivo de cada cena, os materiais usados, a informação que ela explica e os tempos da fala. Revisar as cenas em movimento antes de chamar o resultado de edição final. O motor Brasa Motion implementa aberturas, imagens comentadas, destaques, comparações com materiais identificados e resumos em sequência. Diagramas específicos continuam exigindo uma edição criativa própria.

## Fluxo do portal

O gerador de Reels em `scripts/generate-reel.mjs` usa o pacote portátil `packages/brasa-motion`, por meio do adaptador `src/lib/video/reel-composition.ts`, e renderiza por HyperFrames. Consulte `packages/brasa-motion/SKILL.md` para configurar e usar o motor em outro projeto. A marca Orange Brick pertence ao adaptador, não ao motor. Instalar esta skill não faz o portal executar automaticamente todos os comandos do Heditor.

O padrão é `editorial`. O plano usa âncoras do roteiro e limites das frases do áudio; quando uma âncora deixa de corresponder à narração revisada, utiliza limites de frases. `production.json` registra cenas, origem e dimensões das imagens, modo de som e método das legendas.

O Brasa Motion aceita wordTimings reais e valida texto, ordem e limites antes de aplicá-los às legendas. Sem essas marcas, a divisão continua estimada dentro dos tempos por frase e precisa ser identificada como tal. O renderizador exige audioPath ou --silent explícito; uma amostra sem som não deve ser entregue como vídeo completo.

O som do perfil editorial desativa efeitos aleatórios e reduz a trilha. Isso não comprova, por si só, metas de LUFS, pico verdadeiro ou ausência de mascaramento; medir o arquivo final e ouvir antes de aprovar.

## Revisão

Conferir as primeiras telas, cada mudança de cena e a conclusão. Verificar texto completo, contraste, área segura e se a imagem mostra o que a fala diz. Uma resolução válida não comprova conteúdo ou licença.

Prévia visual com texto de demonstração não equivale a um vídeo final aprovado. Na entrega, informar separadamente o que foi testado, renderizado e ouvido. Publicar somente com autorização do usuário.

O gerador de vídeos longos tem implementação separada. Uma mudança nos Reels não deve ser anunciada como aplicada aos vídeos longos.

O padrão longo `youtube-editorial-v3` usa `src/lib/video/long-video-composition.mjs` para composições HTML/SVG com GSAP local, quadro fixo, render a 30 fps e retomada de segmentos concluídos. As cenas são planejadas em `scripts/generate-long-video.mjs`. A rotação entre vozes está em `src/lib/video/video-voice.mjs` e é usada nos longos e nos Reels. O zoom contínuo das imagens foi retirado do Brasa Motion. A prévia revisada está em `public/long-videos/game-key-card-edicao-fluida-v3-preview/`.

## Referências fornecidas pelo usuário

- https://www.youtube.com/shorts/LLtVL6d_eYI — Gabriel Adamuchi: edição com Claude Code.
- https://www.youtube.com/shorts/g4evkA3YliE — Rei do Prompt: vídeo animado.
- https://www.youtube.com/shorts/KRTs04luOGc — Adam Stewart Marketing: edição com Claude Code.
- https://www.youtube.com/shorts/Xk9AuuD1GKo — JP Labs: motion graphics.

Os quatro arquivos enviados em `tmp/video-references/videoplayback*.mp4` foram analisados por quadros distribuídos ao longo de toda a duração e sequências de três quadros por segundo nos primeiros quatro segundos. As folhas de análise ficam em `tmp/video-references/analysis`.

- Rei do Prompt, 25,69 s: cenário de bancada, elementos que entram em etapas e palavras da explicação virando objetos. Adaptar a progressão, sem copiar o personagem ou a ambientação.
- Adam Stewart, 33,62 s: alternância entre apresentador, composições claras, recortes de tela e tipografia grande; a hierarquia muda conforme a explicação.
- JP Labs, 107,56 s: capítulos compactos, demonstrações em painéis, formas e texto com movimento determinístico, resumo em cartões.
- Gabriel Adamuchi, 61,06 s: imagem do apresentador, inserções de telas e destaques tipográficos em momentos específicos; há mudanças claras de escala e de composição.

O objetivo é trazer variedade de composição e progressão visual para a informação do Orange Brick. Não preencher áreas vazias com métricas falsas, cenários genéricos ou interfaces que pareçam provas reais. A análise visual por quadros não equivale a uma revisão auditiva; áudio e sincronização precisam ser avaliados no arquivo final.

Atualização de mixagem aprovada por feedback em 05/11/2026: a trilha dos vídeos longos deve ter presença perceptível. O gerador passou do ganho 0,06 para 0,16, com ducking mais suave (limiar 0,08, razão 2:1, ataque 35 ms, retorno 650 ms). Esses parâmetros são ponto de partida; medir o arquivo e ouvir o equilíbrio com a voz antes de afirmar naturalidade ou ausência de mascaramento.

## Brasa Motion 0.2

O pacote portátil agora aceita media com imagens e clipes, trim, velocidade, transições, foco local, gráficos editoriais e soundEffects explícitos. Use o CLI do Brasa para preparar os quadros determinísticos dos clipes antes da composição. O fluxo antigo de generate-reel.mjs continua recebendo imagens; não declare que ele passou a buscar trailers ou usar clipes automaticamente. Consulte packages/brasa-motion/STUDIO.md para o painel review, os adaptadores voice e os limites reais do QA final.

O enquadramento aprovado permanece como padrão. Não aplique todos os efeitos em todas as cenas. Escute o resultado quando houver capacidade de reprodução e não declare revisão auditiva a partir de uma medição de loudness.
