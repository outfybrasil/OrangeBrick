# Prévia revisada — enquadramento fixo e progressão visual

## Direção aprovada

A revisão responde ao feedback sobre repetição e movimento da tela na primeira prévia. O quadro permanece fixo. Apenas elementos que explicam uma ação ou destacam uma prova recebem animação breve, com GSAP local e curvas suaves. O texto principal e a marca ficam estáveis. A primeira prévia foi preservada para comparação.

Formato: 1920 × 1080, 30 fps, 50,333 segundos. Voz desta edição: Francisca Neural, português brasileiro, velocidade normal. Uma voz ao longo de todo o episódio. Seleção automática entre vozes editoriais para novos episódios, respeitando escolhas explícitas. A naturalidade não foi avaliada por escuta humana.

## Progressão de retenção

1. Embalagem real: responder imediatamente que o cartão não guarda o jogo completo.
2. Detalhe do aviso oficial: ensinar a reconhecer a marca Game-Key Card na caixa.
3. Demonstração do caminho dos dados: internet para armazenamento do console, sem porcentagem ou velocidade inventada.
4. Destino do armazenamento: memória do console ou microSD Express, com representação gráfica própria.
5. Imagem oficial de inserção: mostrar por que o cartão ainda precisa estar presente.
6. Condição para jogar sem conexão: distinguir jogos que permitem uso offline da exigência de cartão.
7. Troca de console: o cartão se desloca entre duas representações esquemáticas, sem deslocar a tela.
8. Download no segundo aparelho: demonstrar a consequência da troca, em vez de apenas repetir a informação inicial.
9. Informação adicional confirmada: conta Nintendo não é necessária para baixar os dados.
10. Decisão de compra: voltar à embalagem em enquadramento diferente, com uma orientação prática.
11. CTA único: inscrição para acompanhar explicações sobre jogos e consoles, depois da resposta completa.

O objetivo é variar o modo de explicar, não apenas trocar títulos sobre a mesma lista. A resposta principal é entregue no começo; as cenas seguintes acrescentam condições e consequências. A melhora de retenção é uma hipótese editorial e ainda não foi medida com público.

## Origem dos materiais

- [Guia oficial da Nintendo](https://www.nintendo.com/ph/games/switch2/key-card/index.html).
- [Suporte da Nintendo: funcionamento e conta Nintendo](https://en-americas-support.nintendo.com/app/answers/detail/a_id/68415/p/172).
- [FAQ oficial: uso em outro console](https://www.nintendo.com/us/gaming-systems/switch-2/faq/).
- [Embalagem oficial de exemplo](https://www.nintendo.com/ph/games/switch2/key-card/assets/img/intro_img01.png): HTTP 200, 1920 × 910. Recortes distintos da caixa e do aviso, sem transformar o exemplo em um jogo anunciado.
- [Ilustração oficial de inserção](https://www.nintendo.com/ph/games/switch2/key-card/assets/img/keyCard-step01_img.png): HTTP 200, 712 × 400. Exibida em seu tamanho nativo, em um espaço de composição maior, sem ampliação artificial. Este material é uma ilustração de apoio para vídeo, não uma capa ou imagem interna de matéria.
- Diagramas próprios em HTML/SVG, identificados como animações explicativas sem escala. Consoles, armazenamento, cartões e barras não representam captura real de uma interface nem medição de download.
- Trilha: “Shadow”, James Gargette, CC0, conforme `assets/reels/audio/THIRD_PARTY_ASSETS.md` e [página de origem](https://opengameart.org/content/shadow-2). Sem efeitos decorativos aleatórios.
- Animação: GSAP instalado localmente pelo projeto; tipografia Outfit, OFL, fornecida pelo Brasa Motion.

## Verificação

- Build do projeto, lint dos arquivos alterados e testes direcionados passaram.
- Teste no Chromium: cabeçalho inalterado por comparação de pixels, área da cena sem transformação, elementos internos se movendo e reprodução determinística ao buscar o mesmo instante.
- Todos os 11 segmentos registraram enquadramento fixo, quadros a 30 fps e verificação de limites dos títulos e textos.
- `scenes-sheet.jpg`: quadros das 11 cenas inspecionados visualmente.
- `preview-sheet.jpg`: amostras do MP4 montado, incluindo legendas, inspecionadas visualmente.
- Arquivo final: H.264/AAC, pixels quadrados, 1920 × 1080, 30 fps; decodificação audiovisual completa passou.
- Áudio final: −14,84 LUFS integrados e −1,64 dBTP, conforme `verification.json`.
- Pronúncia, naturalidade e mascaramento perceptivo não foram avaliados por escuta humana. As legendas usam limites de frases; os tempos por palavra do Edge TTS continuam estimados.
- A prévia permanece aguardando revisão. Não houve publicação no YouTube nem teste com audiência.

## Reprodução

`npm run video:long -- --episode=public/long-videos/game-key-card-edicao-fluida-v3-preview/episode.json --preview`

Os segmentos concluídos são retomados quando roteiro, material, duração e implementação de render permanecem iguais. A voz selecionada para este episódio é preservada nas novas tentativas.
