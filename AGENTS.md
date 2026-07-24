# Orange Brick — Project Guidelines

## 🖼️ Post Images

- Cada post deve ter uma imagem que **reflete diretamente o conteúdo do resumo** (summary)
- O resumo descreve UMA cena/conceito — a imagem DEVE mostrar essa cena
- O alt text DEVE descrever a imagem E conectar com o contexto do resumo
- A imagem DEVE ser da geração atual do assunto
- **Usar imagens geradas por IA** — criar com base no resumo da matéria
- **NUNCA repetir a mesma imagem** — cada bloco de imagem no corpo da matéria DEVE ser uma imagem diferente da anterior
- **Diversidade visual:** a imagem de capa e as imagens do corpo devem mostrar **ângulos, objetos ou conceitos diferentes** (ex: capa mostra o console, corpo mostra algo complementar como justiça, indústria, disco, etc.)
- Evitar imagens que mostram apenas controles quando o assunto é console, mídia física, ou tecnologia específica
- A imagem deve ser **fotorrealista** — nada de arte conceitual ou abstrata
- **Para fotos de jogos:** buscar screenshots reais do jogo, artes conceituais oficiais ou imagens promocionais — NÃO usar fotos genéricas de lugares/objetos reais
- **Para eventos de jogos (E3, Gamescom, Nintendo Direct etc.):** buscar a **logo oficial do evento** ou foto do palco/banner do evento

### Prompt de IA para geração de imagem

Usar o seguinte template de prompt para gerar as imagens:

```
Imagem fotorrealista de [descrever a cena exata do resumo]. Estilo fotografia editorial, iluminação dramática, alta qualidade, resolução 4K. Mostrar [objeto/cena específico] em [ambiente/contexto]. Sem texto na imagem, sem marcas d'água.
```

### Checklist de verificação

- [ ] A imagem mostra a **cena descrita no resumo**?
- [ ] É da **geração atual** do assunto?
- [ ] Mostra o **objeto certo**, não só um controle genérico?
- [ ] O **alt text** conecta a imagem com o contexto do resumo?
- [ ] É **fotorrealista** (não arte conceitual/abstrata)?
- [ ] **Nenhuma imagem repetida** — capa, bloco 1, bloco 2 são todas diferentes?
- [ ] A **URL da imagem** foi testada (HTTP 200)?

---

## 📅 Game Release Dates & Official Cover Art Standards

- **Nomes dos Jogos:** MANTER o nome original oficial do jogo (ex: *Marvel's Wolverine*, *Starfield: Shattered Space*, *Grand Theft Auto VI*, *Halo: Campaign Evolved Remake*). **NUNCA traduzir títulos de jogos.**
- **Datas e Meses:** Traduzir apenas os meses para o português (*28 de Julho*, *15 de Setembro*, *19 de Novembro*).
- **Capas Oficiais:** As imagens do Radar de Lançamentos e matérias DEVEM ser **artes de capa oficiais, artes promocionais do estúdio ou screenshots oficiais** do jogo. **É estritamente proibido usar fotos genéricas** (ex: computadores/controles de bancos de imagens gratuitos como Unsplash/Pexels).
- **Resolução do Radar:** Usar imagens horizontais em proporção **16:9**, com no mínimo **1200 × 675 px** e preferência por **1920 × 1080 px** ou superior.
- **Evitar miniaturas:** Não usar `header.jpg`, `capsule_616x353`, thumbnails do Google/Bing ou outras cápsulas pequenas da Steam como imagem final do Radar. Buscar a arte promocional original em alta resolução no site oficial, press kit, publisher, console store ou CDN oficial.
- **Validação visual:** Abrir a URL original e confirmar que a imagem não está previamente cortada, comprimida ou ampliada. Além do HTTP 200, verificar dimensões e enquadramento antes de salvar.
- **Organização semanal:** Todo item com data definida deve preencher `release_date` e aparecer agrupado pela semana de lançamento, de segunda a domingo.
- **Retenção mensal:** Após a virada do mês, remover do Radar os itens de meses anteriores. Se a imagem estiver no Storage do Orange Brick, remover também o arquivo e seu registro na biblioteca; URLs externas não ocupam Storage.
- **Verificação de Datas:** Sempre validar as datas oficiais dos jogos antes de publicar. Jogos já lançados em anos/datas passadas não devem figurar na aba de futuros lançamentos.

---

## 📝 Content Standards

### Título

- UPPERCASE (css já trata)
- Gancho forte nos primeiros 40 caracteres
- Sem spoiler, sem clickbait
- Máximo 70 caracteres
- Ex: `"Nintendo Switch 2 mantém cartuchos, mas inventa o 'Game-Key Card'"`
- Ex: `"Sony anuncia fim definitivo de mídias físicas no PlayStation a partir de 2028"`

### Summary

- Uma frase, ~140 caracteres
- Responde: **o que aconteceu?** + **por que importa?**
- Tom direto, sem enrolação
- Ex: `"O Switch 2 trouxe dois tipos de mídia física: o cartucho clássico e o Game-Key Card, que funciona como chave de download. Entenda a diferença e por que os colecionadores estão em guerra com o formato."`

### Body (estrutura de blocos)

```
[text]  → Parágrafo de introdução (contexto + gancho)
[image] → Imagem ilustrativa do assunto (com caption)
[text]  → Desenvolvimento com subtítulo ## (fatos, dados, citações)
[image] → Segunda imagem, ângulo diferente do assunto
[text]  → Contexto maior + conclusão + fonte
```

### Markdown suportado nos blocos de texto

- **`**texto**`** → negrito (renderiza como `<strong>`)
- **`[texto](url)`** → link (abre externo em `_blank`, interno fica na mesma aba)
- **`## `** → subtítulo (`<h2>`)
- **`### `** → sub-subtítulo (`<h3>`)
- **`- `** ou **`* `** → lista (`<ul><li>`)
- Parser compartilhado em `src/lib/markdown.tsx` — usado tanto no post quanto no preview do editor

### Tom de voz

- **Direto, seco, sem firulas**
- Opinativo APENAS em posts de categoria `opinion`
- Para `breaking`, `hardware`, `industry`: factual, jornalístico
- Para `opinion`: pode usar ironia, críticas, voz marcante
- Usar **bold** para termos técnicos ou nomes próprios importantes (`**Game-Key Card**`)
- Links internos para matérias relacionadas do próprio Orange Brick: `[texto](/posts/slug-da-materia)`

### Regra de ouro 1: NUNCA publicar sem aprovação

- Toda matéria criada pelo opencode DEVE ser salva como **rascunho** (`is_published: false`)
- Nunca publicar diretamente — o usuário revisa e publica manualmente pelo painel admin
- Exceção: apenas se o usuário EXPLICITAMENTE pedir para publicar

### Busca de imagens

- **Google Imagens** (`images.google.com`) — método principal, buscar pelo nome do jogo/evento/objeto + termo como "screenshot", "official art", "logo", "promotional image"
- **IA generativa** — para imagens de conceitos, cenários, industriais, hardware (criar prompt baseado no resumo)
- **Sempre testar a URL** com fetch/curl antes de salvar — confirmar HTTP 200
- Preferir imagens com boa resolução (mínimo 1200px de largura)
- Para logos de eventos: buscar `"[nome do evento] logo"` no Google Imagens

### Checklist de qualidade (rodar ANTES de salvar)

- [ ] **Sem caracteres CJK** (chinês/japonês/coreano) — usar `grep -rP "[\x{4e00}-\x{9fff}]"` no conteúdo
- [ ] **Sem termos em inglês soltos** sem tradução ou explicação (ex: "engine" não vira "引擎" em tradutor automático)
- [ ] **Imagens carregam** — testar URL com fetch/curl para confirmar HTTP 200
- [ ] **Bold `**texto**` funciona** — verificar que o parse de markdown está rodando no preview
- [ ] **Links internos** usam `/posts/slug-da-materia` (não URL absoluta)
- [ ] **Fonte citada** no final com `**Fonte:** [Nome](url)`

### Regra de ouro 2: NUNCA copiar texto fonte

- **Reescrever 100%** com outras palavras
- Manter os fatos, mudar a estrutura das frases
- Se a fonte diz "A Sony anunciou hoje que vai descontinuar...", você escreve "A Sony confirmou que vai enterrar de vez os discos físicos..."
- Usar sinônimos, inverter ordem das informações, mudar tom
- **Nunca copiar parágrafo inteiro nem frase idêntica**
- Sempre citar a fonte no final: `**Fonte:** [Nome](url)`

### Autor tags por categoria

| Categoria | Tag |
|---|---|
| `breaking` | `💣 Plantão` |
| `hardware` | `🛠️ Hard News` |
| `industry` | `📡 Radar` |
| `modding` | `🔧 Gambiarra` |
| `review` | `🎮 Review` |
| `opinion` | `🔥 Opinião` |

---

## 📰 Fontes Confiáveis (prioridade)

### Fontes primárias (mais confiáveis)

1. **Gematsu** — `gematsu.com` → indústria japonesa, anúncios oficiais, mais rápido e preciso do nicho
2. **IGN Brasil** — `br.ign.com` → cobertura nacional, bem apurada
3. **Eurogamer** — `eurogamer.net` → investigativo, reportagens originais
4. **Video Games Chronicle (VGC)** — `videogameschronicle.com` → furos e indústria
5. **GameSpot** — `gamespot.com` → cobertura geral sólida

### Secundárias (cruzar com primárias)

6. **Kotaku** — `kotaku.com` → cultura gaming, artigos de opinião
7. **The Verge** — `theverge.com/gaming` → tech + games
8. **Push Square** — `pushsquare.com` → PlayStation-focused
9. **Pure Xbox** — `purexbox.com` → Xbox-focused
10. **Nintendo Life** — `nintendolife.com` → Nintendo-focused

### Fontes oficiais (sempre preferir)

- **Nintendo Direct** / Nintendo Press Room
- **PlayStation.Blog** / State of Play
- **Xbox Wire**
- **Comunicados oficiais** de publishers (Ubisoft, EA, Activision, etc.)

### Fluxo de apuração

1. Buscar notícia em **3 fontes diferentes** no mínimo
2. Se for rumor, citar a fonte original e avisar que não é oficial
3. Se for anúncio oficial, linkar direto pro comunicado
4. **Nunca** publicar com base em uma fonte só (a menos que seja comunicado oficial)
5. Cruzar informações: se uma fonte diz X e outra diz Y, investigar antes de publicar

---

## 🔧 Code & Workflow Standards

### Código

- **NUNCA adicionar comentários** em código — o código deve ser autoexplicativo
- Seguir padrão existente: imports, estilos, tipagem, componentes
- Preferir editar arquivos existentes em vez de criar novos
- TypeScript estrito — usar tipos do `@/lib/types/database`
- Não expor secrets em arquivos de código

### Build obrigatório

- Sempre rodar `npm run build` antes de commitar
- Se houver erro de typecheck, corrigir antes de prosseguir
- Verificar lint se aplicável

### Commits

Formato: `tipo: descrição`

| Tipo | Uso |
|---|---|
| `feat` | Nova funcionalidade |
| `fix` | Correção de bug |
| `refactor` | Refatoração sem mudar comportamento |
| `docs` | Documentação |
| `chore` | Configuração, build, CI |

Exemplos:
- `feat: adiciona preview no editor com modal de visualização`
- `fix: verificação de admin via user_metadata em vez de API routes`
- `docs: expande AGENTS.md com regras de conteúdo e fontes`

### O que NÃO fazer

- ❌ Comentar código
- ❌ Criar arquivos novos sem necessidade real (preferir editar existentes)
- ❌ Expor tokens, keys, secrets no repositório
- ❌ Deixar console.log em produção
- ❌ Commit sem build passar

---

## 🤖 Task Execution Flow (como o opencode responde)

| Seu pedido | Ação do opencode |
|---|---|
| "Cria matéria sobre X" | Pesquisa 2-3 fontes confiáveis → reescreve 100% o conteúdo → busca imagens no Unsplash seguindo regras → monta blocos → salva como rascunho no Supabase |
| "Qual vai ser a matéria do dia?" / "Materia do dia" | Busca **notícias publicadas HOJE** em fontes confiáveis (Gematsu, IGN Brasil, Eurogamer, VGC, GameSpot) → escolhe a mais relevante → pesquisa 2-3 fontes → reescreve 100% → busca **2 imagens diferentes** (fontes: Unsplash, Pexels, Pixabay) que mostrem **ângulos/conceitos diferentes** → monta blocos → salva como rascunho (`is_published: false`) |
| "Corrige Y" | Lê código relevante → diagnostica o problema → propõe solução → edita → build → commit |
| "O que acha de Z?" | Pesquisa → analisa → responde direto sem firulas |
| "Quero X no estilo Orange Brick" | Segue todas as regras deste documento |
| "Faz X" | Executa e explica brevemente o que fez (máx 3 linhas) |
| "Sobe/subi/commit" | Apenas se explicitamente pedido — nunca commitar sem instrução |

---

## 🎯 Category Guidelines

| Categoria | Quando usar | Tom | Estrutura |
|---|---|---|---|
| `breaking` | Furo de reportagem, anúncio de última hora | Direto, factual, sem opinião | Facts first → contexto → repercussão |
| `hardware` | Novo console, placa de vídeo, periférico, specs | Técnico, dados, comparativos | Specs → análise → mercado |
| `industry` | Mercado financeiro, fusão, demissão, vendas | Analítico, números | Fato → contexto → impacto no setor |
| `modding` | Homebrew, custom ROM, hardware modificado | Entusiasta, comunidade | Projeto → como funciona → onde baixar |
| `review` | Análise de jogo, console, acessório | Avaliativo, pró/chave/contra, sem nota numérica | Contexto → testes → veredito |
| `opinion` | Editorial, artigo de opinião | Voz marcante, pode ser ácido, irônico | Tese → argumentos → provocação final |

---
