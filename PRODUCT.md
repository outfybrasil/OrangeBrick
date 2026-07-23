# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

O Orange Brick atende leitores brasileiros que buscam notícias, análises e discussão sobre games, hardware, indústria e modding. A área administrativa é usada pela equipe editorial para criar, revisar, publicar, atualizar e organizar matérias.

## Product Purpose

O produto combina um portal editorial de games com uma comunidade própria. O trabalho editorial deve transformar apuração confiável em matérias originais, diretas e fáceis de consumir; o painel administrativo deve reduzir atrito entre pauta, revisão e publicação sem retirar o controle humano.

## Positioning

O Orange Brick prioriza cobertura em português com voz direta, seca e sem firulas, categorias editoriais com personalidade própria e participação da comunidade pelo Brickboard.

## Operating Context

A equipe pesquisa fontes confiáveis, cruza informações, reescreve o conteúdo integralmente, prepara capa e imagens de corpo, monta a matéria em blocos, revisa no painel e salva como rascunho antes da publicação manual. Matérias usam título, resumo, categoria, autoria, capa, texto alternativo e blocos de texto ou imagem.

## Capabilities and Constraints

- Portal em Next.js com Supabase para dados, autenticação e operações protegidas.
- Conteúdo editorial organizado nas categorias `breaking`, `hardware`, `industry`, `modding`, `review` e `opinion`.
- Painel administrativo restrito a usuários com privilégio de administrador.
- Editor com rascunho, publicação, republicação, duplicação, preview, geração de imagens e validação editorial.
- Publicação exige conteúdo válido e imagens acessíveis; novas matérias não devem ser publicadas automaticamente.
- Títulos de jogos permanecem em sua forma oficial e conteúdo de terceiros deve ser reescrito e citado.
- O produto deve funcionar de forma responsiva em desktop e mobile.

## Brand Commitments

O nome Orange Brick, os logotipos existentes em `public/logos`, a linguagem editorial direta e a identidade baseada em preto, branco e laranja são compromissos existentes. A interface não deve parecer genérica nem produzida por IA.

## Evidence on Hand

- Diretrizes editoriais, de imagem, fluxo e código em `AGENTS.md`.
- Arquitetura e comandos de validação em `README.md`.
- Logotipos e ícones oficiais em `public/logos` e `public/icons`.
- Fluxos reais de portal, comunidade e administração em `src/app`.
- Não há depoimentos, métricas comerciais ou provas externas que possam ser inventadas na interface.

## Product Principles

- Controle editorial humano antes da publicação.
- Informação verificável e original acima de volume.
- Operações claras, reversíveis quando possível e difíceis de acionar por engano.
- Experiência rápida e legível em qualquer tamanho de tela.
- Identidade própria sem excesso visual.

## Accessibility & Inclusion

A experiência deve preservar navegação por teclado, foco visível, alvos de toque adequados, contraste legível, texto alternativo para imagens editoriais e adaptação responsiva.
