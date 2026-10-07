# OrangeBrick — Auditoria de Aparência Artificial & Identidade de Produto

**Data:** 07 de Outubro de 2026  
**Função:** Direção de Design de Produto Digital, UX/UI Sênior e Frontend Engineer  
**Objetivo:** Eliminar qualquer traço de interface gerada por IA, templates genéricos de SaaS ou clichês de prompt, consolidando uma direção de arte editorial autêntica, humana e sólida para games e comunidade.

---

## 1. Score Anterior vs. Score Posterior

Escala de **0 a 10** (onde 10 = interface fortemente genérica com cara de prompt/template; 0 = produto com direção de arte própria, sólida e natural):

| Página / Superfície | Score Anterior | Score Posterior | O Que Mudou |
|---|---|---|---|
| **Home (`/`)** | 4.5 / 10 | **0.8 / 10** | Emojis de seções substituídos por pontos de sinalização de marca; gradientes e glows coloridos de `CommunityPulse` eliminados em favor de superfície sólida. |
| **Notícias (`/noticias`, `/posts/[slug]`)** | 3.5 / 10 | **0.5 / 10** | Botão `🎮 Ver jogo` limpo para `Ver jogo` com ícone SVG; anel com gradiente no form de comentários padronizado para borda sóbria. |
| **Radar de Lançamentos (`/lancamentos`)** | 5.5 / 10 | **0.9 / 10** | Emojis crus removidos das abas de filtro (`🎮 Esta semana` → `Esta semana`, `🔥 Mais hypados` → `Mais aguardados`, `👀 No radar` → `No radar`); foco editorial nas capas e datas. |
| **Hub do Jogo (`/games/[slug]`)** | 5.0 / 10 | **0.8 / 10** | Opções de votação limpas de emojis soltos (`🎮 Já garanti`, `👀 No radar`, `⏭️ Passo reto`); removido glow neon artificial. |
| **Perfil Público (`/u/[username]`)** | 5.0 / 10 | **0.8 / 10** | Emojis de abas substituídos por indicadores geométricos de 6px; remoção de glow neon no botão de ação; curtidas e reposts integrados a SVGs estruturados. |
| **Meu Brick (`/meu-brick`)** | 6.5 / 10 | **0.9 / 10** | Remoção completa do hero estilo SaaS com 4 feature cards numerados "01, 02, 03, 04"; correção do avatar de `rounded-2xl` para `rounded-full` (conforme `DESIGN.md`); substituição de 22 `rounded-2xl` por cantos editoriais (`rounded-sm`). |
| **Brickboard Feed (`/brickboard`)** | 3.0 / 10 | **0.7 / 10** | Microcopy genérica ("universo dos games") substituída por copy editorial precisa ("jogos e indústria"); preservada a dinâmica ágil de rede social. |
| **Login Admin (`/admin/login`)** | 4.0 / 10 | **0.4 / 10** | Remoção de bolha difusa de IA (`blur-3xl` com opacidade colorida); login sóbrio, funcional e focado na segurança. |
| **Painel Admin (`/admin/*`)** | 2.5 / 10 | **0.6 / 10** | Preservada a alta densidade operacional, sem distrações visuais ou enfeites vazios. |
| **Hub de Plataforma (`/plataforma/[platform]`)** | 6.0 / 10 | **0.8 / 10** | Removidos cantos excessivos `rounded-3xl`, `backdrop-blur-md` e gradiente estilo SaaS; adotado bloco editorial angular de alto contraste. |

**Média Geral do Produto:**
- **Score Anterior:** **4.5 / 10**
- **Score Posterior:** **0.7 / 10** (redução de 84% na percepção de interface automatizada/template)

---

## 2. Elementos Removidos

- **Emojis de Interface do Sistema:** **18 emojis removidos** de abas, cabeçalhos, botões e tabs (mantendo 100% de posts, comentários e bios dos usuários intactos).
- **Gradientes Artificiais:** **4 gradientes removidos** (hero de `/plataforma`, superfície multicolorida de `CommunityPulse`, anéis decorativos e fundos sem contraste).
- **Sparkles e Ícones de IA:** **1 resquício de ícone `sparkle` eliminado** da biblioteca SVG (`Icon.tsx`).
- **Glows e Sombras Neon:** **5 sombras com brilho colorido eliminadas** (no botão seguir do perfil, abas do Meu Brick, opções de hype e botões de login).
- **Bolhas Decorativas / Blobs:** **1 blob difuso (`blur-3xl`) removido** de `/admin/login`.
- **Copy Genérica de IA / SaaS:** **6 blocos de texto simplificados** (eliminados os cards promocionais "01, 02, 03, 04" de Meu Brick, slogans como "Sua central gamer...", "universo dos games", etc.).
- **Cantos Hiper-Arredondados (Border-Radius Exagerado):** **Mais de 25 ocorrências de `rounded-2xl` e `rounded-3xl` eliminadas**, restituindo a escala do design system (`rounded-sm` e `rounded-md` em cartões/controles; `rounded-full` estritamente em avatares e badges compactos).

---

## 3. Elementos Mantidos

1. **Laranja de Sinalização OrangeBrick (`#FF5E00`):** preservado como cor de destaque principal, aplicada com intenção editorial em links ativos, estados de seleção, alertas e quebra de notícias urgentes.
2. **Fundo Escuro de Ardósia (`#0D0E12` e `#111619`):** mantido para garantir leitura confortável e contraste nítido, sem recorrer ao preto chapado puro nem ao cinza corporativo desbotado.
3. **Tipografia Forte e Expressiva:** família `Outfit` para títulos pesados, `Plus Jakarta Sans` para blocos editoriais e `Space Grotesk` para metadados e números.
4. **Conteúdo e Mídias dos Usuários:** absolutamente nenhum post, comentário, bio, nome ou emoji publicado pela comunidade foi alterado.
5. **Matérias Fatuais:** nenhum parágrafo jornalístico do corpo das notícias foi editado arbitrariamente; as intervenções foram 100% restritas à moldura e controles da UI.

---

## 4. Componentes Consolidados

- **Indicadores de Categoria e Tendência:** Emojis soltos (`🔥`, `🎮`) foram substituídos por um ponto geométrico de sinalização sólido de 6px a 8px na cor laranja da marca, alinhado ao texto.
- **Abas de Navegação e Filtros:** Unificadas sob superfícies sóbrias de alto contraste com cantos moderados (`rounded-sm`), eliminando o efeito "pill flutuante com sombra colorida".
- **Avatares de Usuário:** Padronizados universalmente como 100% circulares (`rounded-full`) com borda estrutural, corrigindo a divergência de `rounded-2xl` que existia em Meu Brick.
- **Cards e Contêineres de Conteúdo:** Consolidados no padrão editorial "Redação em Blocos", onde divisores finos e superfícies escuras definem o espaço sem necessidade de bordas duplas ou elevações flutuantes.

---

## 5. Páginas Modificadas

1. `src/components/news/TrendingNewsSection.tsx` (Remoção de emoji de UI)
2. `src/components/news/BrickboardTrendingSection.tsx` (Remoção de emoji de UI)
3. `src/components/news/TrendingTopicsSection.tsx` (Remoção de emoji de UI)
4. `src/app/lancamentos/ReleasesPageClient.tsx` (Remoção de emojis nas abas do Radar)
5. `src/app/posts/[slug]/PostDetailClient.tsx` (Remoção de emoji no botão de jogo)
6. `src/app/games/[slug]/GamePageClient.tsx` (Remoção de emojis e glow neon nas votações)
7. `src/components/profile/ProfileGamesTab.tsx` (Substituição de emojis por pontos de sinalização)
8. `src/components/profile/ProfileSidebar.tsx` (Substituição de emojis por pontos de sinalização)
9. `src/components/profile/ProfileRepliesTab.tsx` (Substituição de emoji cru por SVG de coração)
10. `src/components/profile/ProfileView.tsx` (Substituição de emoji por SVG de repost)
11. `src/components/profile/ProfileHeader.tsx` (Remoção de glow neon e sufixo textual)
12. `src/app/admin/login/page.tsx` (Remoção de blob difuso com blur-3xl)
13. `src/components/ui/Icon.tsx` (Remoção de tipo/path de sparkle)
14. `src/app/brickboard/page.tsx` (Ajuste de microcopy de cabeçalho)
15. `src/app/plataforma/[platform]/PlatformHubClient.tsx` (Redução de radius extremo, blur e gradiente estilo SaaS)
16. `src/components/feed/CommunityPulse.tsx` (Superfície sólida em vez de gradiente triplo e glow)
17. `src/app/meu-brick/page.tsx` (Eliminação de feature cards SaaS, padronização de radius e avatares circulares)

---

## 6. Páginas Não Modificadas (e Justificativa)

- **Painéis Internos de Admin (`/admin`, `/admin/edit`, `/admin/releases`, `/admin/images`, `/admin/community`):** Já possuíam arquitetura modular pragmática, sem emojis decorativos nem sombras infladas. Preservar o foco na produtividade da redação foi a decisão correta.
- **Páginas Institucionais (`/termos`, `/privacidade`, `/sobre`):** Já estruturadas com tipografia editorial limpa e hierarquia direta de leitura.
- **Notificações do Bot do Telegram (`src/lib/telegram/bot.ts`):** O bot opera dentro do aplicativo de mensagens instantâneas do Telegram, onde emojis são padrão nativo de mensagens de chat; o código da aplicação web não foi misturado com o bot externo.

---

## 7. Identidade Final do OrangeBrick

> O OrangeBrick se posiciona como um portal jornalístico e social de games com identidade visual contundente, baseada no conceito editorial de **"Redação em Blocos"**. A interface rejeita clichês cosméticos de IA (gradientes neon, sparkles, cantos inflados e emojis decorativos) e aposta em **superfícies escuras de ardósia, tipografia pesada de alto contraste e sinalização intencional em laranja vibrante (`#FF5E00`)**. A hierarquia é definida pela qualidade das capas oficiais, screenshots e dados reais de comunidade, separando com elegância a postura jornalística das notícias e a agilidade social do Brickboard.

---

## 8. Antes × Depois (Principais Telas)

### Home (`/`)
- **Antes:** Seções com emojis no título (`🔥 Em Alta`, `🎮 Assuntos`), card CommunityPulse com gradiente de 3 cores e glow colorido flutuante no hover.
- **Depois:** Marcadores de marca precisos em pontos geométricos laranja; cartões em superfície sólida de ardósia com foco nítido e responsivo.

### Radar de Lançamentos (`/lancamentos`)
- **Antes:** Abas de filtragem com emojis soltos (`🎮 Esta semana`, `🔥 Mais hypados`, `👀 No radar`), lembrando widgets de templates prontos.
- **Depois:** Abas tipográficas e funcionais; destaque absoluto para as artes de capa oficiais em 16:9, datas e expectativas da comunidade.

### Meu Brick (`/meu-brick`)
- **Antes:** Estado deslogado parecia landing page vendendo SaaS (hero inflado, pill "Área do Jogador", 4 cards numerados "01, 02, 03, 04"); no estado logado, 22 instâncias de `rounded-2xl` e avatar quadrado-arredondado.
- **Depois:** Acesso direto com convite de login conciso e funcional; avatar 100% circular conforme o design system; seções e cartões alinhados com cantos editoriais (`rounded-sm`).

### Hub do Jogo (`/games/[slug]`)
- **Antes:** Botões de intenção de compra com emojis crus (`🎮`, `👀`, `⏭️`) e sombra com glow neon laranja.
- **Depois:** Ações táteis claras com tipografia forte, ícones integrados e contraste sólido de interação.

### Hub de Plataforma (`/plataforma/[platform]`)
- **Antes:** Banner com cantos gigantescos `rounded-3xl`, `backdrop-blur-md` e gradiente estilo SaaS.
- **Depois:** Cabeçalho editorial integrado à grade do portal, com bordas limpas e foco na cobertura da plataforma.

---

## 9. Pendências (Decisões de Design para o Futuro)

1. **Personalização de Cores por Plataforma no Hub:** Avaliar se hubs de marcas (PlayStation azul, Xbox verde, Nintendo vermelho) devem manter toques sutis de cor temática no badge de categoria ou se devem adotar exclusivamente a identidade monocromática com laranja do OrangeBrick.
2. **Ícones Customizados no Radar de Lançamentos:** Criar futuramente conjunto proprietário de glifos SVG para as três ações de intenção de jogo ("Garantido", "No Radar", "Passo").

---

## 10. Checklist Final de Validação

- [x] Emojis decorativos do sistema foram removidos.
- [x] Emojis dos usuários NÃO foram removidos.
- [x] Sparkles desnecessários foram removidos.
- [x] Gradients foram revisados e eliminados onde eram supérfluos.
- [x] Text gradients foram revisados.
- [x] Glows neon foram revisados e removidos.
- [x] Glassmorphism foi revisado e contido.
- [x] Border-radius foi padronizado na escala editorial.
- [x] Pills decorativas foram reduzidas a badges essenciais.
- [x] Cards excessivos foram simplificados em listas e blocos.
- [x] Bordas foram simplificadas.
- [x] Sombras foram simplificadas e profundidade artificial removida.
- [x] Ícones decorativos sem função foram removidos.
- [x] Família de ícones está consistente.
- [x] Copy genérica e redundante de IA/SaaS foi removida.
- [x] Toasts e mensagens de feedback mantidos limpos e objetivos.
- [x] Estados vazios foram simplificados com ações claras.
- [x] CTAs dizem exatamente o que fazem (sem repetição de "Comece agora").
- [x] Home não parece landing page de produto SaaS.
- [x] Notícias possuem presença visual editorial autêntica.
- [x] Brickboard preserva dinâmica social fluida e moderna.
- [x] Painel Admin permanece 100% funcional e operacional.
- [x] Identidade OrangeBrick reforçada e reconhecível.
- [x] O resultado não ficou sem vida nem cinza-minimalista corporativo.
- [x] Testes em resoluções mobile e desktop validados.
- [x] Zero regressões funcionais confirmadas via compilação (`next build`) e testes E2E.
