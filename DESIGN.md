---
name: Orange Brick
description: Portal editorial brasileiro de games com linguagem direta e identidade modular.
colors:
  orange-signal: "#FF5E00"
  orange-deep: "#A84300"
  void: "#0D0E12"
  slate: "#1C1E24"
  text: "#E5E5E5"
  white: "#FFFFFF"
  contrast: "#000000"
  category-breaking: "#FF5E00"
  category-hardware: "#6EA8D8"
  category-industry: "#8FBF8F"
  category-modding: "#56BFB2"
  category-review: "#D9B45B"
  category-opinion: "#E5766B"
typography:
  display:
    fontFamily: "Outfit, sans-serif"
    fontSize: "clamp(2rem, 5vw, 3.75rem)"
    fontWeight: 900
    lineHeight: 1
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Outfit, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 800
    lineHeight: 1.2
  body:
    fontFamily: "Plus Jakarta Sans, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Space Grotesk, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "0.06em"
  mono:
    fontFamily: "ui-monospace, Cascadia Mono, Segoe UI Mono, Menlo, Consolas, monospace"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.4
rounded:
  editorial: "0px"
  temporary: "12px"
  avatar: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.orange-signal}"
    textColor: "{colors.white}"
    rounded: "{rounded.editorial}"
    padding: "12px 16px"
  card-editorial:
    backgroundColor: "{colors.void}"
    textColor: "{colors.text}"
    rounded: "{rounded.editorial}"
    padding: "16px"
  input:
    backgroundColor: "{colors.void}"
    textColor: "{colors.white}"
    rounded: "{rounded.editorial}"
    padding: "12px 16px"
---

# Design System: Orange Brick

## Overview

**Creative North Star: "Redação em Blocos"**

O Orange Brick deve parecer uma redação de games construída em módulos firmes: informação antes de ornamento, contraste alto e uma hierarquia que conduz diretamente à matéria. O tijolo é uma lógica de composição, não uma ilustração repetida.

A identidade é escura, editorial e precisa. O laranja marca seleção, urgência e ação; não colore tudo. A interface rejeita decoração genérica, excesso de arredondamento, emojis como atalhos visuais e elementos que pareçam gerados por IA.

**Key Characteristics:**

- Estrutura modular e cantos retos nas superfícies editoriais.
- Preto, branco e laranja com uso contido do acento.
- Títulos fortes, metadados legíveis e texto corrido estável.
- Conteúdo oficial de jogos acima de imagens genéricas.

## Colors

A paleta combina um fundo quase preto, superfícies de ardósia e laranja de sinalização.

### Primary

- **Laranja de Sinalização:** ações principais, seleção, foco e informação editorial prioritária.
- **Laranja Profundo:** estados secundários e detalhes com menor ênfase.

### Neutral

- **Vazio Editorial:** fundo principal e cartões de conteúdo.
- **Ardósia:** superfícies elevadas, menus e estados temporários.
- **Texto Claro:** corpo e informação funcional.
- **Branco:** títulos e contraste máximo.
- **Preto de Contraste:** modo de acessibilidade com separação máxima entre conteúdo e fundo.

### Category Signals

Matizes discretos que identificam cada categoria editorial em tags e metadados. São tons dessaturados, legíveis sobre o Vazio Editorial (AA), usados apenas em texto e detalhe de borda inferior — nunca como preenchimento de superfície:

- **Plantão (`#FF5E00`):** mantém o laranja de sinalização — urgência genuína.
- **Hard News (`#6EA8D8`):** azul-aço para hardware.
- **Radar (`#8FBF8F`):** verde suave para indústria e mercado.
- **Gambiarra (`#56BFB2`):** turquesa para modding.
- **Review (`#D9B45B`):** dourado para análises.
- **Opinião (`#E5766B`):** coral para artigos de opinião.

**The Signal Rule.** O laranja indica algo; nunca funciona como preenchimento decorativo indiscriminado.

## Typography

**Display Font:** Outfit (com fallback sans-serif)
**Body Font:** Plus Jakarta Sans (com fallback sans-serif)
**Label Font:** Space Grotesk (com fallback sans-serif)

**Character:** títulos compactos e contundentes; corpo confortável; rótulos técnicos apenas onde classificação e estado exigem leitura rápida.

### Hierarchy

- **Display:** peso 900, escala fluida e entrelinha fechada para manchetes.
- **Title:** peso 800 para seções e cards prioritários.
- **Body:** base de 16px, entrelinha de 1.6 e medida preferencial entre 65 e 75 caracteres.
- **Label:** mínimo de 12px; caixa alta apenas em tags e estados curtos.

**The Readability Floor.** Informação funcional não usa menos de 12px nem contraste insuficiente sobre fundo escuro.

## Layout

O conteúdo usa contêiner central de até 1280px, margens responsivas e fluxo prioritariamente vertical. A home pode usar colunas em desktop, mas retorna a uma coluna no mobile. A navegação inferior preserva os mesmos destinos essenciais em telas pequenas, com alvos de toque mínimos de 44px.

## Elevation & Depth

A interface é plana por padrão. Bordas sutis e diferenças tonais separam superfícies; sombras ficam reservadas para menus, drawers e elementos fixos que realmente se sobrepõem ao conteúdo.

**The Flat Editorial Rule.** Cartões de notícia não recebem sombra ornamental.

## Shapes

Cards, campos, filtros e botões editoriais usam cantos retos. Avatares são circulares. Modais, menus temporários e controles de conta podem usar raio de 12px para comunicar que estão acima do fluxo editorial.

## Components

### Buttons

- **Shape:** reto no conteúdo editorial; raio moderado apenas em superfícies temporárias.
- **Primary:** laranja com texto branco e altura mínima de 44px.
- **Hover / Focus:** mudança tonal no hover e contorno laranja de 2px no foco visível.

### Chips

- **Style:** tags pequenas com texto em caixa alta e borda inferior; filtros selecionados usam laranja com contraste explícito.

### Cards / Containers

- **Corner Style:** reto.
- **Background:** vazio editorial ou ardósia discreta.
- **Shadow Strategy:** nenhuma sombra em repouso.
- **Border:** branca translúcida, reforçada no hover ou seleção.
- **Internal Padding:** 16px como base.

### Inputs / Fields

- **Style:** fundo escuro, borda discreta, texto de 16px no mobile e cantos retos.
- **Focus:** borda e contorno laranja.
- **Error / Disabled:** mensagem objetiva junto ao controle; estado nunca depende apenas da cor.

### Navigation

Desktop usa texto explícito e mobile usa cinco destinos persistentes com rótulos. A seção atual deve expor `aria-current` e contraste visual.

### Release Radar

Usa somente datas verificadas e imagens oficiais horizontais. Deve possuir loading, erro com nova tentativa, vazio explícito e fallback para os próximos lançamentos quando o mês atual não tiver itens.

## Do's and Don'ts

### Do:

- **Do** usar o nome “Orange Brick” em texto corrido.
- **Do** priorizar arte oficial, screenshot ou material promocional em 16:9.
- **Do** manter estados de carregamento, erro, vazio e recuperação.
- **Do** usar o laranja para ação, seleção e foco.

### Don't:

- **Don't** usar emojis como ícones, decoração ou substitutos de rótulos.
- **Don't** misturar cantos retos e arredondados sem razão funcional.
- **Don't** usar imagens genéricas para representar jogos.
- **Don't** esconder destinos essenciais no mobile.
- **Don't** publicar lançamentos sem data oficial verificada.
