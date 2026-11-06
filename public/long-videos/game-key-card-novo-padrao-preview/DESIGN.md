# Prévia — Game-Key Card

Padrão editorial aprovado em 04/11/2026. Amostra horizontal de aproximadamente 59 segundos, sem publicação em redes.

## Público e promessa

Jogadores brasileiros que querem entender o que compram na edição física. Explicar download inicial, armazenamento, presença do cartão e uso em outro console. CTA principal: inscrição para acompanhar explicações sobre jogos e consoles.

## Montagem

1. Abertura direta: embalagem oficial de exemplo, identificada como Game-Key Card, e resposta inicial.
2. Requisitos: diagrama editorial de internet, armazenamento e informação na embalagem.
3. Depois do download: diagrama de cartão inserido para iniciar o jogo.
4. Outro console: diagrama de instalação dos dados nesse aparelho.
5. Fecho: benefício de acompanhar e convite de inscrição após entregar a explicação.

As âncoras das frases estão em `episode.json`; os tempos renderizados estão em `youtube-metadata.json`. Os diagramas são explicações gráficas do Orange Brick, não capturas da interface do console. A imagem oficial aparece na abertura; os demais planos usam composições gráficas próprias. Preto quente, branco e laranja, com títulos curtos e legendas por frase. Movimento discreto de enquadramento; esta amostra não demonstra gameplay em vídeo nem animação complexa de elementos.

## Fontes e materiais

- [Guia oficial da Nintendo](https://www.nintendo.com/ph/games/switch2/key-card/index.html).
- [FAQ oficial do Nintendo Switch 2](https://www.nintendo.com/us/gaming-systems/switch-2/faq/).
- [Imagem original de exemplo da embalagem](https://www.nintendo.com/ph/games/switch2/key-card/assets/img/intro_img01.png): HTTP 200, 1920 × 910, aberta para inspeção e preservada com margens na composição. Material corporativo da Nintendo; não representa um jogo específico.
- Trilha: “Shadow”, James Gargette, CC0, conforme `assets/reels/audio/THIRD_PARTY_ASSETS.md` e [página de origem](https://opengameart.org/content/shadow-2). Sem efeitos decorativos.

## Voz e verificação

Thalita Multilingual Neural, português brasileiro, Edge TTS, velocidade normal. ElevenLabs não estava configurado. Roteiro de 160 palavras, incluindo CTA; sem aceleração posterior nem preenchimento para alcançar oito minutos.

Build do projeto, testes direcionados de montagem/voz e lint dos arquivos TypeScript alterados passaram. Quadros extraídos do MP4 foram inspecionados e a sobreposição inicial do título foi corrigida. O áudio final foi corrigido e medido em aproximadamente −14,08 LUFS e −1,94 dBTP; a decodificação audiovisual passou. Valores da última medição em `verification.json`.

Não houve escuta humana nem avaliação de naturalidade, pronúncia ou reprodução em outros dispositivos. Os tempos por palavra no Edge TTS são estimados dentro das frases; esta prévia usa legendas por frase. Não houve teste de audiência, teste A/B, configuração de tela final no Studio ou publicação. A naturalidade da voz é um dos pontos a avaliar nesta revisão.

## Reproduzir

`npm run video:long -- --episode=public/long-videos/game-key-card-novo-padrao-preview/episode.json --preview`

O comando renderiza a prévia e a mantém aguardando revisão. Não publica no YouTube.
