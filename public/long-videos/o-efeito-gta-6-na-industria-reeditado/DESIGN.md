# GTA VI — edição revisada

## Resultado

Reedição completa do vídeo de 12min18s, no padrão aprovado youtube-editorial-v3. Duração final: 07:12, 432.267 segundos. 34 cenas em sete capítulos, 6 trechos do trailer oficial e três miniaturas de 1280 × 720. Quadro fixo na composição; o movimento original das imagens do trailer é preservado.

O arquivo anterior permanece disponível para comparação. A edição revisada fica aguardando revisão, sem publicação em redes.

## Roteiro e retenção

A abertura apresenta imediatamente preço, formato da caixa e instalação. O desenvolvimento distingue edição/moeda, código de download, Game-Key Card, armazenamento, simulação de transferência e calendário. Recursos de imersão são atribuídos ao comunicado da Sony; materiais promocionais não são apresentados como testes de desempenho. Removidos o desvio sobre hackers, as mecânicas sem confirmação e previsões universais sobre o mercado. O encerramento contém orientação de compra e um CTA de inscrição.

- 00:00 — O custo real de entrar em Leonida
- 00:33 — Preço: edição, moeda e comparação
- 01:52 — Caixa de varejo: o que ela entrega
- 03:09 — Armazenamento e tempo de download
- 04:41 — Calendário: três datas, funções distintas
- 05:30 — O que está confirmado sobre a experiência
- 06:39 — O impacto para quem compra

## Materiais e fontes

As imagens foram obtidas de páginas oficiais da Rockstar e Sony, com HTTP 200 e dimensões registradas em sources.json. A caixa de 300 × 374 e a ilustração do DualSense de 400 × 321 aparecem em tamanho nativo, sem ampliação artificial. As demais imagens têm resolução original de pelo menos 1280 × 720. Nenhuma arte com a data antiga de maio foi usada na abertura.

O trailer oficial de lançamento foi baixado do portal de mídia da Rockstar, que oferece trailers e imagens para download e compartilhamento. Foram escolhidos trechos distintos; o áudio original foi removido. Fontes, intervalos e crédito estão em sources.json. Trilha Shadow, James Gargette, CC0, conforme o registro de assets/reels/audio/THIRD_PARTY_ASSETS.md.

Preços americanos: comunicado da Take-Two. Caixa, edições e resgate: Rockstar Support. Instalação: até 212 GB conforme o aparelho. Pré-download digital: 10 de novembro; envio estimado da caixa: 12 de novembro; lançamento: 19 de novembro, conforme fontes consultadas em 04/11/2026. Nintendo Support é citado para distinguir o Game-Key Card. Não foi apresentado preço brasileiro sem confirmação.

O gráfico de download é uma simulação: 212 × 10^9 bytes × 8 ÷ velocidade. Tempos arredondados: 25 Mb/s ≈ 18h51, 50 Mb/s ≈ 9h25, 100 Mb/s ≈ 4h43. Pressupõe conexão constante e sem perdas; não representa um teste ou previsão da conexão do espectador.

## Verificação

Build do projeto, lint e testes direcionados passaram. O teste de render confirmou 120 quadros em quatro segundos, a 30 fps, incluindo a pausa visual após o fim da animação. O arquivo final foi decodificado; sua quantidade de quadros foi comparada à soma dos segmentos. Foram inspecionadas as folhas de cenas e as amostras com legendas no MP4.

Áudio final: -14.08 LUFS e -1.82 dBTP, conforme verification.json. Voz: Thalita Multilingual Neural, Edge TTS, em velocidade normal. Pronúncia, naturalidade e mascaramento perceptivo ainda dependem de escuta humana. As legendas usam tempos por frase; não houve comprovação de alinhamento real por palavra.

Não houve teste com audiência ou comprovação de ganho de retenção.

## Reprodução

`npm run video:long -- --episode=public/long-videos/o-efeito-gta-6-na-industria-reeditado/episode.json`
