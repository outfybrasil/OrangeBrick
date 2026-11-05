# Componentes e referências

Brasa Motion é o nome deste pacote privado de composição e renderização. A marca não apresenta o Heditor ou suas dependências como código originalmente criado pelo proprietário deste projeto.

## Heditor

O fluxo de edição usado como referência é o [Heditor, de Felipe Azambuja / PycodeBR](https://github.com/pycodebr/heditor), identificado como MIT na skill instalada, versão 2.15.1. A instalação original permanece em `.agents/skills/heditor` no Orange Brick, com sua identificação preservada. O pacote Brasa Motion não inclui o kit Python, os estilos, os arquivos de skill ou o executável do Heditor. Sua integração com o Orange Brick reaproveita a composição própria desenvolvida neste projeto e princípios do fluxo de trabalho estudado.

Se componentes do Heditor forem distribuídos futuramente junto com o pacote, inclua os avisos de autoria e a licença correspondente aos arquivos efetivamente copiados.

## GSAP

[GSAP 3.14.2](https://github.com/greensock/GSAP) é uma dependência do pacote, sob sua licença própria. O runtime copia a distribuição oficial instalada, preservando os avisos presentes no arquivo. Consulte a licença incluída na dependência antes de redistribuí-la em outro contexto.

## Playwright

[Playwright 1.63.0](https://github.com/microsoft/playwright) é usado para renderizar no Chromium e é distribuído sob Apache-2.0. Seus avisos e licenças acompanham a dependência instalada. Chromium é instalado separadamente e mantém suas próprias licenças.

## Outfit

As fontes Outfit são de The Outfit Project Authors. São distribuídas sob SIL Open Font License 1.1, incluída em `assets/fonts/OFL.txt`. Os arquivos de fonte são copiados sem alterações.

## Música

A biblioteca local em `assets/music` reúne 20 faixas oferecidas como CC0 nas páginas dos autores no OpenGameArt. Consulte `assets/music/CREDITS.md` e `catalog.json` para autor, fonte, duração, licença e hash de cada arquivo. Os arquivos foram convertidos para MP3 160 kbps / 48 kHz; não foram reapresentados como composições do Brasa Motion.

## Materiais editoriais

Vídeos enviados como referência, screenshots de jogos e logos de projetos não fazem parte da distribuição Brasa Motion. Usá-los numa composição não transfere seus direitos de autoria para o pacote.

## Efeitos e adaptadores

Os efeitos tick, soft-hit e whoosh são sinais procedurais sintetizados pelo Brasa Motion via FFmpeg; não são amostras extraídas de vídeos de terceiros. FFmpeg e FFprobe são executáveis externos e mantêm suas próprias licenças. O adaptador Python opcional usa a instalação de edge-tts escolhida no projeto de destino; essa biblioteca e o serviço remoto não são incorporados ao pacote.
