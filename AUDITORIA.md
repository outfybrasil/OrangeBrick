# Auditoria Orange Brick — consolidada em 29/09/2026

> **Aviso:** este arquivo pode conter informações sensíveis e não deve ser versionado em repositório público. Segredos encontrados serão mascarados.

## Fase 0 — Mapeamento e identificação da stack

### Stack confirmada

- **Aplicação:** Orange Brick, pacote único (não monorepo), aplicação web monolítica em Next.js App Router, com páginas renderizadas no servidor e componentes cliente.
- **Runtime e linguagens:** Node.js `>=22 <25` (`package.json`); TypeScript e JavaScript ESM. `tsconfig.json` ativa `strict` e usa resolução `bundler`.
- **Versões instaladas conforme `package-lock.json`:** Next.js 16.3.6, React 19.3.0, TypeScript 5.9.3, `@supabase/ssr` 0.12.7, `@supabase/supabase-js` 2.117.1, `@google/genai` 2.24.0, Playwright 1.63.0 e ESLint 9.39.5.
- **Persistência e autenticação:** PostgreSQL via Supabase, acesso pelo cliente oficial JS, autenticação Supabase e políticas RLS em migrações SQL. A barreira de navegação administrativa aparece em `src/proxy.ts`; as autorizações de cada API serão cruzadas individualmente na Fase 1.
- **Integrações descobertas na configuração/dependências e busca inicial:** Supabase (Auth, Postgres, Storage e Edge Functions), Google Gemini, Groq, Telegram, RAWG, YouTube, Google Analytics e Plausible. A cobertura e os fluxos de cada uma serão verificados nas fases seguintes.
- **Infraestrutura declarada:** Vercel (`vercel.json`, funções cron); Supabase Edge Functions em `supabase/functions`; GitHub Actions em `.github/workflows`. Não foram encontrados Dockerfile, Compose ou arquivos Terraform na busca inicial.
- **Testes declarados:** Node test runner, Playwright e `@axe-core/playwright`; existem `tests/` e `e2e/`.
- **Comandos do projeto declarados:** `lint`, `typecheck`, `test`, `e2e`, `textcheck`, `check`, `build` e `production:check`. A suíte `check` inclui build e, portanto, pode gerar artefatos dentro do workspace; será executada apenas se for possível preservar a regra de somente escrita em `AUDITORIA.md`.

### Inventário inicial de páginas e endpoints

Foram encontrados 37 arquivos `page.tsx` e 33 `route.ts` em `src/app`. O inventário de caminhos abaixo deriva desses arquivos; verbos HTTP, proteção e uso no frontend serão confirmados por leitura dos handlers e chamadas nas Fases 1 e 2.

**Páginas:** `/`, `/admin`, `/admin/community`, `/admin/contact`, `/admin/edit`, `/admin/health`, `/admin/images`, `/admin/login`, `/admin/progression`, `/admin/releases`, `/admin/settings`, `/admin/team`, `/brickboard`, `/brickboard/como-funciona`, `/brickboard/conquistas`, `/brickboard/ranking`, `/busca`, `/cadastro`, `/configuracoes/notificacoes`, `/configuracoes/perfil`, `/contato`, `/em-alta`, `/entrar`, `/institucional/{slug}`, `/lancamentos`, `/minha-orange`, `/noticias`, `/nova-senha`, `/plataforma/{platform}`, `/post`, `/posts/{slug}`, `/privacidade`, `/profile/{nickname}`, `/profile/setup`, `/recuperar-senha`, `/sobre`, `/termos`.

**Handlers:** `/api/admin/community`, `/api/admin/contact`, `/api/admin/games`, `/api/admin/images`, `/api/admin/posts`, `/api/admin/posts/{id}`, `/api/admin/stats`, `/api/admin/storage-health`, `/api/admin/team`, `/api/community/poll-vote`, `/api/contact`, `/api/cron/daily-poll`, `/api/cron/editorial-scheduler`, `/api/cron/generate-daily`, `/api/cron/release-radar-cleanup`, `/api/cron/retention`, `/api/errors`, `/api/home-engagement`, `/api/news`, `/api/newsletter`, `/api/notifications`, `/api/telegram/set-commands`, `/api/telegram/webhook`, `/api/user/avatar`, `/api/user/banner`, `/api/user/data`, `/api/user/delete`, `/api/youtube/latest`, `/assuntos/{slug}`, `/auth/callback`, `/feed.xml`, `/news-sitemap.xml`, `/sitemap.xml`.

**Cron declarados em `vercel.json`:** limpeza do radar, retenção diária, enquete diária, geração de conteúdo nos slots 12/17/20 e scheduler editorial. Os horários configurados estão em UTC e a autenticação/compatibilidade dos caminhos será checada em fase posterior.

### Inventário de dados e integrações (preliminar)

- As migrações SQL declaram entidades de conteúdo, perfis, comunidade, notificações, imagens editoriais, radar de lançamentos, auditoria/administração, backup e newsletter. A lista de tabelas, RLS, índices e divergência entre schema local/remoto será fechada após leitura das migrações e dos tipos.
- Foram encontrados sete diretórios de Edge Functions executáveis: `generate-image`, `manage-push-subscription`, `post-stats`, `register-view`, `send-push-notification`, `submit-contact` e `toggle-reaction` (`_shared` é código comum, não uma função).
- O ambiente local contém variáveis para Supabase, Gemini, Groq, Telegram, RAWG, VAPID, analytics, e-mail, cron, preview, rate limit e backups. Apenas os nomes foram inventariados; nenhum valor foi lido ou reproduzido.

### Estado do workspace e limites iniciais

- O workspace já estava modificado antes da criação deste relatório: `git status --short` mostrou 87 arquivos modificados, 9 removidos e 30 não rastreados. A atribuição temporal dessas mudanças não é verificável nesta auditoria.
- Inventário atualizado em 29/09/2026: 620 caminhos rastreados pelo Git e 508 arquivos não ignorados. `src/` contém 215 arquivos, dos quais 212 são `.ts`, `.tsx` ou `.css`; `src/app/` tem 37 `page.tsx` e 33 `route.ts`; `supabase/migrations/` contém 65 arquivos; `scripts/` 56, `tests/` 24, `e2e/` 1, `.github/workflows/` 2 e `public/` 115. Os caminhos e totais foram recalculados com `rg --files`; todos os 212 arquivos de código em `src/` têm referência explícita no relatório.
- Diretórios existentes excluídos da leitura de código de aplicação: `node_modules/`, `.next/`, `.git/`, `test-results/`, `tmp/`, `.agents/`, `.codex/` e `.vercel/`. Justificativa: dependências, saída/cache, temporários, instruções/ferramentas de agente ou metadados locais; workflows, configurações e scripts do produto permanecem no escopo. Exceção pontual: consultei `node_modules/@supabase/storage-js/src/packages/StorageFileApi.ts:1184-1201` e `node_modules/@supabase/storage-js/src/lib/common/BaseApiClient.ts:17,88-101` para confirmar o contrato e o tratamento padrão de `remove`, sem auditar o restante das dependências. Os 115 itens de `public/` tiveram inventário e metadados de imagem verificados; a inspeção visual individual de todos os arquivos binários não foi feita.
- Ferramentas externas detectadas nesta máquina: `git`, `node` e `npm` disponíveis; `gitleaks`, `osv-scanner`, `semgrep`, Lighthouse, Docker, `uvx`, `pipx` e Go não encontrados no `PATH`. Python está associado a um alias da Microsoft Store. A disponibilidade será reavaliada antes da execução dos scanners; os que não puderem rodar serão justificados.

### Plano de auditoria

1. Segurança e dependências: scanners isolados quando viáveis; revisão de segredos com saída mascarada; autenticação, autorização por endpoint, RLS, validação, uploads, SSRF, CSRF, headers, cookies e privacidade.
2. Fluxos e lógica: cron, integrações externas/LLM, erros assíncronos, limites, validação de schemas, sincronização e consistência de banco/migrações.
3. Qualidade e desempenho: lint/typecheck/testes existentes, dependências/código morto e pontos quentes de consultas/renderização, sem gravar artefatos fora de `AUDITORIA.md`.
4. Interface: navegação e chamadas frontend contra o inventário, UX, acessibilidade, SEO, texto e responsividade nos viewports pedidos, usando servidor/navegador se disponíveis sem alterar arquivos do projeto.
5. Operação: logs, monitoramento, CI/CD, configuração remota confirmável e cobertura de testes.
6. Consolidar achados com evidência, localização e mitigação pesquisada; fechar escopo, contagens, scores e plano de correção.

---

## Fases 1–5 — Execução inicial concluída; fechamento pendente

O levantamento original destas fases foi somente leitura. As correções feitas depois, a verificação atual e os limites de produção estão registrados nos adendos de remediação ao final deste arquivo. O workspace já estava sujo antes da auditoria; mudanças anteriores não foram revertidas.

### Fase 1 — Segurança e dependências

- Inventariadas as 33 rotas de API e 7 Edge Functions executáveis. APIs administrativas verificam token Supabase e app_metadata.is_admin; rotas de usuário verificam sessão e filtram pelo ID do próprio usuário; mutações cookie-auth conferem origem. O proxy protege páginas /admin, mas exclui /api, portanto cada handler precisa de proteção própria.
- A primeira passagem não confirmou SQL/NoSQL injection, execução de comandos ou HTML não escapado nos trechos aprofundados. Nesta continuação, a revisão do exportador encontrou OB-59: a consulta privilegiada de histórico aceita device_id sem vínculo verificado com a sessão. O único dangerouslySetInnerHTML encontrado está no JSON-LD do layout, cujo texto serializado escapa <. Filtros de busca são normalizados, uploads limitam tamanho e formato, e fetchValidatedRemote revalida redirects e fixa DNS público.
- Gitleaks confirmou uma chave Supabase service_role histórica ainda aceita pelo projeto configurado localmente e uma chave Google API histórica. A validade/escopo da segunda e a igualdade entre a chave Supabase histórica e o valor secreto atualmente implantado são NÃO VERIFICADAS.

### Fase 2 — Bugs, dados, integrações e IA

- npm run production:check retornou PGRST205 para admin_audit_log, admin_trash, backup_runs, notification_preferences e user_follows. As migrações locais as declaram, mas o ledger remoto não foi confirmado.
- O último backup verificado está incompleto por causa dessas cinco relações. O snapshot de Storage/Auth teve verificações de integridade; isso não torna a cópia parcial completa.
- A primeira inspeção da Vercel não mostrou SHA/commit. A rechecagem posterior com `vercel list` identificou a revisão publicada; ver OB-03 e a rechecagem de 29/09 ao final. A agenda publicada tem uma invocação diária sem `slot`, enquanto as três entradas locais ainda não foram implantadas.
- RAWG_API_KEY não aparece entre os nomes de variáveis do Vercel Production; o handler retorna 503 sem ela.
- Conteúdo externo de notícias entra diretamente no prompt Gemini. A geração não define prazo ou limite de saída explícito por chamada; o fallback Groq pode consumir quase toda a duração máxima da função.
- post-stats lê linhas completas e agrega em memória sem paginação/contagem SQL. A exclusão de Storage ignora erros de remoção e auditoria.

### Fase 3 — UX, acessibilidade, SEO e responsividade

- Playwright + axe-core visitou 12 páginas públicas em 375, 768, 1280 e 2560 px (48 combinações). Não houve falhas HTTP ou erros de página; a largura do documento igualou a viewport nas páginas amostradas. Requisições externas e ações mutáveis foram bloqueadas.
- Axe encontrou contraste insuficiente em páginas publicadas, link sem sublinhado permanente em texto corrido e região rolável sem foco. Há correções no workspace para cores, sublinhado e foco que não aparecem no DOM de produção testado.
- Títulos e descrições estavam presentes nas páginas amostradas, mas várias URLs internas receberam canonical da homepage por herança.
- Lighthouse foi tentado com Chromium, mas não conectou ao navegador.

### Fase 4 — Código, textos e testes

- npm run lint e npx tsc --noEmit --incremental false passaram. A suíte Node passou em 49 testes.
- Cobertura: 26,71% de linhas, 70,71% de branches e 46,92% de funções. gemini-news.ts teve 14,77% de linhas e 0% de funções; telegram/bot.ts teve 10,22% de linhas e 0% de funções; server/network.ts teve 36,88% de linhas e 20% de funções.
- node scripts/check-text-integrity.mjs passou em 338 arquivos; ele confirma integridade de caracteres, não gramática completa.
- Geração/publicação editorial, renovação de sessão por API, Telegram e fluxos administrativos não têm cobertura comportamental compatível com a criticidade.

### Fase 5 — Operação, CI/CD e ferramentas

- O workflow de qualidade usa npm ci, npm run check e Playwright; as ações observadas estão fixadas por SHA e as permissões são restritas. Não foi encontrado scanner de dependências/segredos na pipeline lida.
- Não há Dockerfile/Compose ou Terraform no inventário.
- supabase migration list --linked não concluiu e ficou em Initialising login role...; migrações remotas e política de backup gerenciado não foram confirmadas.
- O plano Vercel, limite remoto de linhas PostgREST e valores/comprimentos dos segredos de produção não foram expostos.

## Achados registrados durante a auditoria

> Os registros abaixo refletem as datas indicadas; a vigência atual e os itens encerrados constam na Fase 12.

# **[OB-01] Chave privilegiada Supabase ainda válida no histórico Git**

- **Categoria:** Segurança
- **Severidade:** Crítica
- **Confiança:** Alta
- **Status:** CONFIRMADO
- **Tipo de evidência:** Dinâmica
- **CVSS estimado:** 9.8 (CVSS 3.1 estimado)
- **Localização:** `scripts/check-posts.cjs:5 (histórico Git; arquivo removido do checkout)` no commit b2026890f1e2fae55cb9ba0d25b00f97287cb426.
- **Evidência:**

```
const supabase = createClient("https://[projeto].supabase.co", "eyJh***");
```

- **Descrição:** Revalidação: a inspeção histórica identificou JWT com papel service_role. Na observação anterior, a comparação em memória com a chave local retornou igualdade; em 05/10/2026, a chave histórica não coincidiu com as chaves locais atuais, mas uma consulta HTTP HEAD sem linhas ao mesmo projeto Supabase retornou 200. A credencial antiga continua aceita pelo projeto associado. Igualdade com a variável de produção Vercel permanece NÃO VERIFICADA. A inspeção do histórico identificou o JWT; o papel decodificado era service_role. A comparação em memória com SUPABASE_SERVICE_ROLE_KEY do .env.local retornou igualdade. O check de prontidão somente leitura foi aceito pelo projeto Supabase configurado. A variável Vercel Production existe, mas igualdade com o segredo implantado é NÃO VERIFICADA.
- **Mitigações verificadas:** .env.local é ignorado pelo Git e clientes atuais recebem a chave por variável de ambiente. Gitleaks não encontrou o valor no código atual. Isso não invalida a cópia histórica.
- **Impacto:** Quem obtiver o histórico pode contornar RLS e ler, alterar ou remover dados do projeto Supabase. A severidade crítica decorre do alcance privilegiado de uma chave service_role ainda aceita e da possibilidade de operações de leitura e escrita sem as policies RLS.
- **Como verificar/reproduzir com segurança:** Execute gitleaks detect --source ., abra o arquivo no commit indicado sem imprimir o valor completo e compare a chave em memória com o ambiente configurado.
- **Solução recomendada:** Revogar/rotacionar imediatamente a chave, atualizar ambientes consumidores, revisar logs Supabase e remover o segredo do histórico remoto com rotação coordenada.
- **Exemplo corrigido:**

```
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!serviceRoleKey) throw new Error("Configuração de servidor ausente");
```
- **Esforço estimado:** G


### Revalidação segura em 05/10/2026

A chave histórica mascarada `eyJh***` foi comparada em memória com os valores atuais do `.env.local` e não coincide com nenhum deles. Uma solicitação HTTP `HEAD` autenticada com a chave histórica ao mesmo projeto Supabase retornou 200 para `posts?select=id&limit=0`; nenhum registro foi retornado ou alterado. O hostname do projeto corresponde ao configurado hoje. A igualdade com a chave implantada na Vercel permanece **NÃO VERIFICADA**.

**Justificativa da severidade crítica:** uma chave `service_role` ainda aceita contorna RLS e permite leitura/escrita privilegiada no projeto por quem obtiver o histórico do repositório.

```text
HEAD /rest/v1/posts?select=id&limit=0 -> HTTP 200; resposta sem corpo/linhas
```

- **Esforço estimado:** G
# **[OB-02] Cinco tabelas usadas pela aplicação não estão expostas no PostgREST**

- **Categoria:** Bug
- **Severidade:** Média
- **Confiança:** Média
- **Status:** POTENCIAL
- **Tipo de evidência:** Estática
- **CVSS estimado:** N/A
- **Localização:** `scripts/check-production-readiness.mjs:28-33`; `src/app/admin/health/page.tsx:29-35,51,54`; `supabase/migrations/20260803000001_reader_experience.sql:1,9`; `supabase/migrations/20260803000006_admin_operations.sql:1,12`; `supabase/migrations/20260803000007_quality_operations.sql:21`.
- **Evidência:**

```
for (const table of REQUIRED_BACKUP_TABLES) {
  const { error } = await supabase.from(table).select("*").limit(1);
database[table] = error ? { ready: false, reason: error.code || "query_failed" } : { ready: true };
}
```

```ts
supabase.from("admin_trash").select("*").is("restored_at", null).order("deleted_at", { ascending: false }),
supabase.from("admin_audit_log").select("*").order("created_at", { ascending: false }).limit(30),
setTrash((trashData || []) as unknown as TrashItem[]);
setAudit((auditData || []) as AuditItem[]);
```

```tsx
{trash.length === 0 ? <p className="text-sm text-gray-500">Nenhum conteúdo arquivado.</p> : trash.map((item) => <div key={item.id}
```

- **Descrição:** Revalidação final em 05/10/2026: este registro não integra os achados vigentes; consultas de verificação sem linhas não reproduziram PGRST205 nas relações rechecadas. A evidência abaixo é histórica e não comprova o estado geral das migrations. O check recebeu PGRST205 para `admin_audit_log`, `admin_trash`, `backup_runs`, `notification_preferences` e `user_follows`. A API oficial de histórico do Supabase retornou 34 migrations aplicadas, contra 65 versões locais únicas; 31 versões locais não constam no ledger remoto. As migrations locais que declaram exatamente essas cinco relações estão entre as pendentes: `20260803000001_reader_experience.sql:1,9`, `20260803000006_admin_operations.sql:1,12` e `20260803000007_quality_operations.sql:21`. O deployment foi identificado como `17af5e0a29e2bb43fcd8fab734432a1e0cdd7966`, mas o ledger só permite comparar versões: 14 migrations do checkout nem sequer existem nesse commit, e as versões duplicadas do commit impedem inferir qual conteúdo foi aplicado. PGRST205 confirma que as relações não estão disponíveis no schema PostgREST usado pela aplicação; existência física fora dessa API continua NÃO VERIFICADA. Além disso, a tela Saúde e auditoria ignora os erros ao ler `admin_trash` e `admin_audit_log`, converte `data: null` em arrays vazios e exibe estado vazio como se não houvesse itens.
- **Mitigações verificadas:** O readiness check sinaliza `ready:false`; as migrations locais declaram as tabelas e políticas RLS. A leitura GET do ledger retornou HTTP 200, 34 versões remotas e 31 versões locais pendentes; não encontrei versões remotas sem arquivo local. A tela de saúde não mostra estado de erro para as duas consultas afetadas. Nenhuma migration foi aplicada.
- **Impacto:** Preferências/seguidores, lixeira, auditoria administrativa e registro de backup podem falhar; o backup também fica incompleto. A equipe pode interpretar a lixeira e o log vazios como dados ausentes em vez de uma falha de acesso ao schema.
- **Como verificar/reproduzir com segurança:** Execute `npm run production:check` com as credenciais configuradas e confira `blockers.missing_tables`. No mesmo projeto, abra `/admin/health`; quando as consultas retornarem PGRST205, observe que a tela apresenta a lixeira vazia e omite o log sem mensagem de erro.
- **Solução recomendada:** Identificar quais das 31 versões locais pertencem à release pretendida; revisar e aplicar essa sequência em staging, validar tabelas, RLS/grants e exposição no PostgREST, depois aplicar a sequência aprovada em produção. Não usar `migration repair` para mascarar a divergência.
- **Exemplo corrigido:**

```
await supabase.from("notification_preferences").select("user_id").limit(1);
```

- **Esforço estimado:** G
# **[OB-03] Agenda de produção não executa os três horários previstos**

- **Categoria:** DevOps
- **Severidade:** Média
- **Confiança:** Alta
- **Status:** POTENCIAL
- **Tipo de evidência:** Dinâmica
- **CVSS estimado:** N/A
- **Localização:** `vercel.json:24-25` e `src/app/api/cron/generate-daily/route.ts:24-35` (commit de produção `17af5e0a29e2bb43fcd8fab734432a1e0cdd7966`); checkout atual: `src/app/api/cron/generate-daily/route.ts:102-105`, `src/lib/server/editorial-slot.ts:3-5` e `vercel.json:20-29`.
- **Evidência:**

```
"path": "/api/cron/generate-daily",
"schedule": "0 12 * * *"
export async function GET(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const result = await generateNewsDraft();
    await sendPostForApproval(result.post, result.wordCount).catch((err) => {
```

- **Descrição:** A consulta de deployment foi feita em 29/09/2026; o cron atualmente implantado não foi revalidado em 05/10. `npx vercel list orange-brick --json` identifica o deployment `READY` como commit `17af5e0a29e2bb43fcd8fab734432a1e0cdd7966`, igual ao `HEAD`. A produção agenda uma execução às 12 UTC (09h em São Paulo); seu handler gera um rascunho e pede aprovação no Telegram. O checkout atual agenda 12h, 17h e 20h de São Paulo (15h, 20h e 23h UTC) e, quando o gate estrutural não encontra bloqueios, publica a matéria e notifica o Telegram. Essa é a automação que você pediu anteriormente, mas ainda não está implantada: 171 caminhos rastreados diferem do commit e há 57 não rastreados.
- **Mitigações verificadas:** O cron publicado exige bearer `CRON_SECRET`; o checkout também valida o slot e registra uma reserva idempotente por horário. O publisher local só prossegue quando `editorialPublicationBlockers` retorna vazio, mas esse gate não valida semanticamente as alegações nem a origem oficial das imagens (OB-12, OB-25 e OB-26). Não executei a rota.
- **Impacto:** Em produção, há uma geração às 09h que exige aprovação, em vez de três publicações e notificações nos horários solicitados. Ao implantar o checkout, a publicação automática passa a operar, mas o gate atual pode deixar passar riscos editoriais descritos nos achados relacionados.
- **Como verificar/reproduzir com segurança:** Consulte `npx --yes vercel@latest list orange-brick --json --limit 10` e `npx --yes vercel@latest crons list --project orange-brick`; compare o SHA de produção com `git rev-parse HEAD` e leia `vercel.json`/handler nesse commit com `git show`. Nenhuma rota foi chamada.
- **Solução recomendada:** Após fechar os bloqueios editoriais de OB-12/OB-25/OB-26, implantar o cron com os três horários solicitados, manter a notificação após publicação e confirmar o estado remoto dos três schedules.
- **Exemplo corrigido:**

```json
[
  { "path": "/api/cron/generate-daily?slot=12", "schedule": "0 15 * * *" },
  { "path": "/api/cron/generate-daily?slot=17", "schedule": "0 20 * * *" },
  { "path": "/api/cron/generate-daily?slot=20", "schedule": "0 23 * * *" }
]
```

- **Esforço estimado:** G
# **[OB-04] Não há backup completo e durável fora desta máquina**

- **Categoria:** DevOps
- **Severidade:** Média
- **Confiança:** Alta
- **Status:** POTENCIAL
- **Tipo de evidência:** Estática
- **CVSS estimado:** N/A
- **Localização:** `scripts/backup-supabase.mjs:17-20,154-156`; `.gitignore:51-52`.
- **Evidência:**

```
const outputDirectory = resolve("tmp", "backups", timestamp);
const missingRequiredTables = REQUIRED_BACKUP_TABLES.filter((table) => !apiTables.includes(table));
const complete = missingRequiredTables.length === 0 && tableFailures.length === 0 && storageErrors.length === 0 && userResults.complete;
```

- **Descrição:** O backup mais recente, 2026-09-25T01:35:41Z, declara complete:false pelas cinco tabelas do OB-02. O Storage cobriu 424 objetos e a verificação criptográfica passou, mas a cópia é parcial. O script grava em tmp/backups, ignorado pelo Git; os dois workflows atuais não enviam o backup para fora. Backup gerenciado Supabase: NÃO VERIFICADO.
- **Mitigações verificadas:** O formato usa AES-256-GCM, fingerprints e hashes; verify-backup validou tabelas/Auth e 424 objetos. Não houve restauração em ambiente isolado.
- **Impacto:** Perda desta máquina ou corrupção do ambiente pode deixar a equipe sem cópia completa; uma restauração parcial omite dados.
- **Como verificar/reproduzir com segurança:** Leia apenas os campos de estado do manifesto e execute npm run production:check; ambos indicam incompleto. Inspecione workflows e destino tmp/backups.
- **Solução recomendada:** Corrigir schema, gerar backup completo, armazenar backup e chave em locais externos separados, verificar e testar restauração isolada.
- **Exemplo corrigido:**

```
backup_destination: encrypted_object_storage
verification_required: true
restore_test_frequency: monthly
```

- **Esforço estimado:** M
# **[OB-05] Chave Google API exposta no histórico Git**

- **Categoria:** Segurança
- **Severidade:** Média
- **Confiança:** Alta
- **Status:** POTENCIAL
- **Tipo de evidência:** Estática
- **CVSS estimado:** N/A — validade atual da chave não verificada
- **Localização:** `docs/drive-sync-codex.md:59` no commit de produção `17af5e0a29e2bb43fcd8fab734432a1e0cdd7966` (repositório público, arquivo removido apenas do working tree); histórico anterior também registra a chave no commit `8e355931412ebe0ea8003d6e69478ebc82d332ba`.
- **Evidência:**

```
GOOGLE_DRIVE_API_KEY=AIza***
```

- **Descrição:** O commit que a Vercel identifica como deployment atual contém `docs/drive-sync-codex.md` com uma chave Google API. A metadata da Vercel identifica o repositório GitHub como público, então a chave é acessível no código desse commit. `vercel env ls` também lista `GOOGLE_DRIVE_API_KEY` em Production, mas a comparação de valores não pôde ser feita: `vercel env run` recusou puxar variáveis marcadas `Secret` e carregou `.env.local`. Validade, APIs habilitadas e restrições permanecem NÃO VERIFICADAS.
- **Mitigações verificadas:** A chave está mascarada no relatório. O documento diz que a integração lê arquivos públicos do Drive; o handler de sync usa a chave somente para chamadas à API Drive. Não confirmei no Google Cloud se a chave está restrita a Drive/refs, nem se é igual à variável de Production.
- **Impacto:** Se a chave exposta ainda for válida e sem restrições, terceiros podem consumir a cota/API do projeto; não há evidência de que ela permita escrever arquivos privados ou aceder a dados além dos itens públicos do Drive.
- **Como verificar/reproduzir com segurança:** Use `git show 17af5e0a29e2bb43fcd8fab734432a1e0cdd7966:docs/drive-sync-codex.md` com saída mascarada; `vercel list` confirma que esse commit está publicado e `vercel env ls` confirma somente a presença do nome no ambiente. Não mostre a chave completa.
- **Solução recomendada:** Revogar/rotacionar no Google Cloud, restringir API/uso, atualizar ambientes consumidores e revisar histórico remoto.
- **Exemplo corrigido:**

```
const apiKey = process.env.GOOGLE_DRIVE_API_KEY;
if (!apiKey) throw new Error("Credencial Google Drive ausente");
```
- **Esforço estimado:** M


### Revalidação em 05/10/2026

A chave histórica não coincide com as chaves Google/Gemini presentes no `.env.local`. Não fiz requisição ao provedor para evitar consumo de quota/custo. A exposição no histórico é confirmada; validade, escopo e possibilidade de abuso atuais estão **NÃO VERIFICADOS**.

- **Esforço estimado:** M
# **[OB-06] A resposta de reação pode subcontar posts populares**

- **Categoria:** Performance
- **Severidade:** Média
- **Confiança:** Média
- **Status:** PROVÁVEL
- **Tipo de evidência:** Estática
- **CVSS estimado:** N/A — desempenho
- **Localização:** `supabase/functions/toggle-reaction/index.ts:60-70`; `src/lib/hooks/useReactions.ts:52-58`; mitigação local do endpoint de estatísticas em `supabase/migrations/20260925000001_post_stats_rpc.sql:16-35`.
- **Evidência:**

```ts
const { data: reactions, error: countError } = await supabase
  .from("reactions")
  .select("reaction_type")
  .eq("post_id", post_id);
```

```ts
for (const reaction of reactions || []) {
  const type = reaction.reaction_type as keyof typeof counts;
  if (type in counts) counts[type]++;
}
```

```ts
setCounts(result.counts);
setUserReaction(result.activeReaction);
```

- **Descrição:** O endpoint `post-stats` local já usa uma RPC SQL com agregações, mas o endpoint separado `toggle-reaction` ainda seleciona todas as linhas de reação da matéria e soma em memória. A API Supabase retorna até 1.000 linhas por padrão e permite configurar outro limite; esse valor remoto não foi consultado ([documentação oficial](https://supabase.com/docs/reference/javascript/v1/select)). O hook substitui os contadores exibidos pela contagem recebida do endpoint.
- **Mitigações verificadas:** Confirmei que `post-stats` chama `get_post_stats`, que agrega contagens no SQL e limita a lista de matérias. Busquei paginação, `count` ou RPC agregada em `toggle-reaction`; não existem nesse caminho. Não encontrei teste de `toggle-reaction` em `tests/` ou `e2e/`.
- **Impacto:** Se uma matéria ultrapassar o limite de linhas configurado, a resposta da reação contará apenas a página retornada e atualizará a interface com valores abaixo do total real. A consulta também transfere e percorre linhas desnecessárias em cada reação.
- **Como verificar/reproduzir com segurança:** Em staging, crie mais reações distintas para uma matéria do que o limite PostgREST configurado. Faça uma reação pela interface e compare os `counts` recebidos de `toggle-reaction` com `COUNT(*)` por tipo no banco.
- **Solução recomendada:** Fazer a gravação/remoção e o cálculo dos três totais em uma RPC SQL transacional com agregação `FILTER`; manter a resposta sem materializar todas as reações.
- **Exemplo corrigido:**

```sql
select
  count(*) filter (where reaction_type = 'hype') as hype,
  count(*) filter (where reaction_type = 'flop') as flop,
  count(*) filter (where reaction_type = 'salty') as salty
from public.reactions
where post_id = target_post_id;
```

- **Esforço estimado:** M
# **[OB-07] Aviso de privacidade não descreve todos os tratamentos observados**

- **Categoria:** Segurança
- **Severidade:** Média
- **Confiança:** Alta
- **Status:** CONFIRMADO
- **Tipo de evidência:** Estática
- **CVSS estimado:** N/A
- **Localização:** `src/app/institucional/[slug]/InstitutionalClient.tsx:110-117`; `src/app/privacidade/page.tsx:37-43,63-86,103-113`.
- **Evidência:**

```
<p>O Orange Brick trata apenas os dados necessários para funcionamento, segurança e interação no portal.</p>
<p>Os dados são usados para entregar recursos solicitados, proteger o serviço e produzir métricas agregadas. Registros deixam de ser mantidos quando não são mais necessários.</p>
```

```tsx
<li><strong className="text-white">Newsletter:</strong> endereço de e-mail informado para receber comunicações editoriais.</li>
<li><strong className="text-white">Telegram:</strong> aviso operacional enviado à equipe quando chega um contato; o aviso não inclui nome, e-mail, assunto ou mensagem.</li>
Contatos enviados pelo formulário são eliminados após 12 meses.
```

- **Descrição:** O checkout agora tem uma página `/privacidade` mais detalhada, que identifica newsletter, fornecedores, transferências internacionais e prazo de retenção para contatos. Porém `/institucional/privacidade` continua publicada com descrições genéricas: omite newsletter e fornecedores e não informa prazo específico. Assim, duas páginas do mesmo site apresentam níveis diferentes de informação. Identidade do controlador, contratos com operadores e aplicabilidade de GDPR são NÃO VERIFICADOS. [LGPD](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm), [Resolução ANPD 2/2022](https://www.gov.br/anpd/pt-br/acesso-a-informacao/institucional/atos-normativos/regulamentacoes_anpd/resolucao-cd-anpd-no-2-de-27-de-janeiro-de-2022).
- **Mitigações verificadas:** A página `/privacidade` lista as categorias de dados, os fornecedores, direitos e prazos observados. A rota de contato envia ao Telegram apenas um aviso genérico com link para a caixa administrativa (`src/app/api/contact/route.ts:103-107`), sem nome, e-mail, assunto ou mensagem. A versão institucional resumida não herda essas informações.
- **Impacto:** Uma pessoa que acesse a página institucional pode não encontrar a finalidade, o destinatário ou o prazo de retenção dos dados tratados. A existência de uma política mais completa reduz, mas não elimina, a inconsistência de transparência.
- **Como verificar/reproduzir com segurança:** Compare o conteúdo de `/institucional/privacidade` com `/privacidade`; confira que a primeira não cita newsletter, fornecedores nem prazo de contato, enquanto a segunda cita esses itens.
- **Solução recomendada:** Manter uma única política canônica ou fazer a página institucional apontar para o conteúdo completo, evitando versões divergentes. Validar controlador, operadores e base legal com responsável jurídico.
- **Exemplo corrigido:**

```
<a href="/privacidade">Consulte a política de privacidade completa.</a>
```

- **Esforço estimado:** M
# **[OB-08] Busca RAWG retorna 503 em produção**

- **Categoria:** Bug
- **Severidade:** Média
- **Confiança:** Alta
- **Status:** POTENCIAL
- **Tipo de evidência:** Dinâmica
- **CVSS estimado:** N/A
- **Localização:** `src/app/api/admin/games/route.ts:18-24`.
- **Evidência:**

```
const query = new URL(request.url).searchParams.get("q")?.trim().slice(0, 80) || "";
if (query.length < 2) return NextResponse.json({ results: [] });
if (!process.env.RAWG_API_KEY) return NextResponse.json({ error: "RAWG_API_KEY não configurada" }, { status: 503 });
```

- **Descrição:** A listagem de variáveis Vercel Production não inclui RAWG_API_KEY; o handler retorna 503 sem ela.
- **Mitigações verificadas:** Exige admin, limita query a 80 caracteres e timeout externo a 8 s; a integração continua ausente.
- **Impacto:** Busca de jogos no painel fica indisponível.
- **Como verificar/reproduzir com segurança:** Pesquise título no painel autenticado; /api/admin/games?q=... responde 503.
- **Solução recomendada:** Configurar a chave como segredo Production e validar busca após redeploy, sem revelar o valor.
- **Exemplo corrigido:**

```
RAWG_API_KEY=<variável secreta configurada no Vercel Production>
```

- **Esforço estimado:** M
# **[OB-09] Exclusão pode responder sucesso após falha**

- **Categoria:** Bug
- **Severidade:** Média
- **Confiança:** Alta
- **Status:** CONFIRMADO
- **Tipo de evidência:** Estática
- **CVSS estimado:** N/A
- **Localização:** `src/app/api/admin/storage-health/route.ts:66-71`.
- **Evidência:**

```
const { data: tracked } = await supabase.from("editorial_images").select("storage_path").in("storage_path", paths);
const safePaths = paths.filter((path) => !protectedPaths.has(path));
if (safePaths.length) await supabase.storage.from("post-images").remove(safePaths);
await supabase.from("admin_audit_log").insert({ actor_id: user.id, action: "delete_orphan_files", target_type: "storage", details: { paths: safePaths } });
return NextResponse.json({ deleted: safePaths.length });
```

- **Descrição:** Erros retornados pelo Storage e pela auditoria não são lidos. O client Supabase pode resolver a Promise com campo error sem lançar. admin_audit_log também está indisponível via PostgREST no projeto consultado (OB-02).
- **Mitigações verificadas:** Só admin acessa; caminhos devem começar com editorial/, há limite de 100 e arquivos rastreados são protegidos. Não há confirmação de resultado.
- **Impacto:** UI afirma exclusão não feita e ação fica sem auditoria.
- **Como verificar/reproduzir com segurança:** Em staging, force erro no Storage ou deixe a tabela audit indisponível e envie exclusão válida como admin.
- **Solução recomendada:** Tratar erro de remoção e auditoria; reportar sucesso apenas para os caminhos removidos.
- **Exemplo corrigido:**

```
const { error } = await supabase.storage.from("post-images").remove(safePaths);
if (error) return NextResponse.json({ error: "Falha ao remover arquivos" }, { status: 502 });
```

- **Esforço estimado:** M
# **[OB-10] Persistência de cookies renovados ainda não foi confirmada em produção**

- **Categoria:** Bug
- **Severidade:** Média
- **Confiança:** Média
- **Status:** POTENCIAL
- **Tipo de evidência:** Teste
- **CVSS estimado:** N/A
- **Localização:** `src/lib/supabase/server.ts:23-30`; `src/lib/server/supabase-cookies.ts:8-12`; `tests/supabase-cookies.test.ts:18-31`.
- **Evidência:**

```
setAll: (cookiesToSet) => {
  cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
},
```

- **Descrição:** A implementação anterior descartava cookies de refresh, mas o checkout atual usa um adaptador que grava cada cookie renovado no `cookieStore`. O teste unitário do adaptador existe. Ainda não confirmei que essa versão foi implantada nem que um Route Handler de produção devolve `Set-Cookie`; a correção local, portanto, não fecha o achado para o site publicado.
- **Mitigações verificadas:** `createServerSupabaseClient()` usa `createSupabaseCookieAdapter(cookieStore)` e o adaptador percorre todos os cookies recebidos. `tests/supabase-cookies.test.ts` cobre a persistência do conjunto. A lista remota da Vercel mostra mudanças locais pendentes de deploy, mas não identifica a revisão atualmente servida por cada rota.
- **Impacto:** Se a versão anterior ainda estiver no site, renovações podem não chegar ao navegador e chamadas autenticadas subsequentes podem falhar ou exigir novo login.
- **Como verificar/reproduzir com segurança:** Após publicar o checkout atual em staging, use um access token expirado com refresh válido, chame uma API autenticada e confira se a resposta inclui todos os cookies `Set-Cookie`; repita a chamada com eles.
- **Solução recomendada:** Publicar a implementação atual e verificar a resposta real de um Route Handler autenticado antes de encerrar o achado.
- **Exemplo corrigido:**

```
cookies: createSupabaseCookieAdapter(cookieStore),
```

- **Esforço estimado:** M
# **[OB-11] Canonical raiz herdada por páginas internas**

- **Categoria:** SEO
- **Severidade:** Média
- **Confiança:** Alta
- **Status:** CONFIRMADO
- **Tipo de evidência:** Dinâmica
- **CVSS estimado:** N/A
- **Localização:** `src/app/layout.tsx:83`; rotas sem override incluem /contato, /termos, /privacidade, /institucional/*, /lancamentos e /busca.
- **Evidência:**

```
alternates: { canonical: "/", types: { "application/rss+xml": "/feed.xml" } },
```

- **Descrição:** O site publicado devolve canonical da homepage para as rotas listadas. Algumas páginas têm override, várias não.
- **Mitigações verificadas:** metadataBase e canonicals por rota existem para /sobre, /noticias, /em-alta, /brickboard/* e posts. Não corrigem as outras páginas.
- **Impacto:** Buscadores podem consolidar URLs internas como homepage e prejudicar indexação.
- **Como verificar/reproduzir com segurança:** Inspecione link[rel=canonical] nas URLs listadas; a verificação recebeu a raiz do domínio.
- **Solução recomendada:** Canonical específico em cada página indexável; noindex em páginas utilitárias/privadas.
- **Exemplo corrigido:**

```
export const metadata: Metadata = {
  alternates: { canonical: "/lancamentos" },
};
```

- **Esforço estimado:** M
# **[OB-12] Instruções contra prompt injection não impedem influência semântica**

- **Categoria:** Segurança-IA
- **Severidade:** Média
- **Confiança:** Média
- **Status:** POTENCIAL
- **Tipo de evidência:** Inferência
- **CVSS estimado:** N/A
- **Localização:** checkout `src/lib/ai/editorial-prompts.ts:11-13`, `src/lib/ai/editorial-output.ts:198-200`, `src/app/api/cron/generate-daily/route.ts:117-160` e `src/lib/server/editorial-publication.ts:18-61`; produção `src/lib/ai/gemini-news.ts:1274`, `src/app/api/cron/generate-daily/route.ts:30-34` e `src/lib/telegram/bot.ts:272-288,707-719`, no commit `17af5e0a29e2bb43fcd8fab734432a1e0cdd7966`.
- **Evidência:**


```ts
const blockers = editorialPublicationBlockers(result);
const publication = await publishEligibleEditorialDraft(blockers, async () => {
```

```ts
.update({ is_published: true, published_at: now, updated_at: now })
.eq("id", result.post.id)
```

```ts
const { data: updated, error } = await supabase
  .from("posts")
  .update({ is_published: true, published_at: now, scheduled_at: null, updated_at: now })
  .eq("id", arg1)
```

- **Descrição:** O checkout serializa os dados externos em JSON e pede que o modelo os trate como conteúdo, não como instrução; isso reduz ambiguidade, mas não impede influência semântica. A rota local de três horários passa o texto gerado por validações estruturais e publica automaticamente quando elas retornam sem bloqueios. Não há verificação semântica independente das alegações. O commit atualmente publicado ainda grava rascunho e exige callback administrativo; a automação local não está implantada. A publicação recorrente foi explicitamente solicitada pelo usuário, portanto o achado é a ausência de validação de conteúdo para esse fluxo, não a falta de aprovação humana.
- **Mitigações verificadas:** Há serialização, limite de conteúdo, extração de texto e instrução explícita contra comandos da fonte. Em produção, o cron atual salva como rascunho; no checkout, o gate mede estrutura e fontes, mas não confere se a matéria segue instruções maliciosas nem valida as alegações de forma independente. Não executei geração real.
- **Impacto:** Uma fonte comprometida pode influenciar o texto de uma matéria e, se ela satisfizer as checagens estruturais, a versão local pode publicá-la automaticamente quando implantada. O impacto atual em produção continua mitigado pela aprovação manual do handler antigo.
- **Como verificar/reproduzir com segurança:** Em teste isolado, simule artigo contendo instrução hostil e confirme que chega ao gerador como dado comum. Não executar geração real em produção.
- **Solução recomendada:** Para manter a publicação automática solicitada, validar alegações contra fontes independentes e deixar em rascunho qualquer texto que contenha instruções anômalas ou alegações sem confirmação; manter a notificação de publicação após o gate.
- **Exemplo corrigido:**

```
const article = await generateDraft(sourceData);
const claimCheck = await verifyClaimsAgainstSources(article, independentSources);
if (!claimCheck.passed) return saveAsDraft(article);
```
- **Esforço estimado:** M


# **[OB-13] JSON do modelo recebe apenas asserção TypeScript**

- **Categoria:** Segurança-IA
- **Severidade:** Baixa
- **Confiança:** Alta
- **Status:** CONFIRMADO
- **Tipo de evidência:** Estática
- **CVSS estimado:** N/A
- **Localização:** `src/lib/ai/gemini-news.ts:1138-1153`.
- **Evidência:**

```
let parsed: EditorialGeminiOutput;
try {
  parsed = JSON.parse(jsonString) as EditorialGeminiOutput;
} catch {
  const firstBrace = jsonString.indexOf("{");
  const lastBrace = jsonString.lastIndexOf("}");
```

- **Descrição:** JSON.parse valida sintaxe, e asserção as não verifica campos/tipos. title numérico pode falhar depois em replace; campos ausentes podem cair em defaults.
- **Mitigações verificadas:** validateStoredEditorialPost e publicationBlockers bloqueiam problemas estruturais antes de publicar. Não há schema runtime antes de usar o objeto.
- **Impacto:** Resposta inesperada do modelo causa erro, perde janela de publicação ou gera rascunho inválido.
- **Como verificar/reproduzir com segurança:** Simule JSON válido com title numérico ou summary array e execute a função.
- **Solução recomendada:** Validar a estrutura com schema runtime imediatamente após parse.
- **Exemplo corrigido:**

```
const parsed = EditorialOutputSchema.parse(JSON.parse(jsonString));
```

- **Esforço estimado:** P
# **[OB-14] Geração pode exceder orçamento de tempo e saída**

- **Categoria:** Performance
- **Severidade:** Média
- **Confiança:** Alta
- **Status:** CONFIRMADO
- **Tipo de evidência:** Estática
- **CVSS estimado:** N/A
- **Localização:** `src/lib/ai/gemini-news.ts:854-860,891,1063-1074`; `src/app/api/cron/generate-daily/route.ts:12`.
- **Evidência:**

```
const attempts: GroqAttempt[] = [
  { maxTokens: 4800, jsonMode: true, waitBefore: false },
  { maxTokens: 4800, jsonMode: false, waitBefore: false },
  { maxTokens: 3600, jsonMode: true, waitBefore: true },
  { maxTokens: 3600, jsonMode: false, waitBefore: false },
  { maxTokens: 2600, jsonMode: false, waitBefore: true },
];
```

- **Descrição:** Groq pode esperar 45 s por cada uma das cinco chamadas e mais 36 s em backoff: até 261 s em falha total. A função cron tem 300 s para todo o fluxo. Gemini tenta até quatro modelos sem AbortSignal nem maxOutputTokens na chamada. Limites internos do provedor existem, mas o código não define orçamento total.
- **Mitigações verificadas:** Handler limita duração a 300 s; Groq define max_tokens e timeout individual; busca de fontes tem timeout. Nenhum limite global/token Gemini.
- **Impacto:** Falha externa pode interromper o slot, perder publicação e aumentar custo de retries/saída.
- **Como verificar/reproduzir com segurança:** Em staging com provedores simulados, force timeout em Gemini e cinco tentativas Groq e compare duração total a 300 s.
- **Solução recomendada:** Deadline global, retries menores, circuit breaker, maxOutputTokens Gemini e custo máximo por slot.
- **Exemplo corrigido:**

```
config: {
  maxOutputTokens: 3200,
}
```

- **Esforço estimado:** M
# **[OB-15] Placeholder fica quase ilegível sem imagem**

- **Categoria:** Acessibilidade
- **Severidade:** Média
- **Confiança:** Alta
- **Status:** CONFIRMADO
- **Tipo de evidência:** Estática
- **CVSS estimado:** N/A
- **Localização:** `src/components/card/NewsCardMedia.tsx:19-24`; cores em src/app/globals.css:8-11.
- **Evidência:**

```
<div className="aspect-video w-full bg-card-slate flex items-center justify-center border-y border-brand-orange-muted/10">
  <div className="flex flex-col items-center gap-1 opacity-40">
    <Icon name="brick" size={32} className="text-brand-orange-muted" />
    <span className="text-xs font-mono text-brand-orange-muted uppercase tracking-widest">
      Sem mídia
```

- **Descrição:** opacity-40 afeta também o texto. Com #D65F1E sobre #1C1E24, a cor composta tem contraste calculado de aproximadamente 1,71:1; WCAG AA pede 4,5:1 para texto normal.
- **Mitigações verificadas:** Token normal é contrastante sem transparência; modo alto contraste muda o token, mas mantém opacidade no pai.
- **Impacto:** Pessoas com baixa visão podem não identificar o estado sem imagem.
- **Como verificar/reproduzir com segurança:** Renderize card sem image_url ou force erro da capa e avalie “Sem mídia”.
- **Solução recomendada:** Aplicar opacidade só ao ícone decorativo e manter texto em cor com contraste medido.
- **Exemplo corrigido:**

```
<Icon name="brick" size={32} className="text-brand-orange-muted opacity-40" />
<span className="text-xs font-mono text-gray-300 uppercase tracking-widest">Sem mídia</span>
```

- **Esforço estimado:** M
# **[OB-16] Produção ainda reprova contraste e foco**

- **Categoria:** Acessibilidade
- **Severidade:** Média
- **Confiança:** Alta
- **Status:** CONFIRMADO
- **Tipo de evidência:** Estática
- **CVSS estimado:** N/A
- **Localização:** Site publicado e build local; `src/app/globals.css:13,102-106`, `src/app/termos/page.tsx:128`, `src/app/brickboard/como-funciona/page.tsx:40-42` e `src/app/configuracoes/notificacoes/page.tsx:19,24`.
- **Evidência:**

```
--color-gray-500: #A0A4AD;
.bg-brand-orange.text-white,
.bg-brand-orange\/90.text-white {
  color: #000000;
}
```

```tsx
<main id="conteudo-principal" tabIndex={-1} className="min-h-dvh bg-background-void text-white">
```

```tsx
<button onClick={() => void save()} className="mt-6 min-h-11 bg-brand-orange px-6 text-xs font-black uppercase">Salvar preferências</button>
```

- **Descrição:** Axe no domínio público mediu texto #6A7282 sobre #0D0E12 (3,98:1), botão branco sobre #FF5E00 (3,06:1), link em texto sem sublinhado permanente (2,08:1) e região rolável sem foco. A revisão local posterior percorreu as 37 rotas em 375 px; `/configuracoes/notificacoes` ainda apresentou botão com texto herdado #FFFFFF sobre fundo #FF5E00, contraste 3,06:1, abaixo dos 4,5:1 exigidos para texto normal. A ausência de outros resultados nessa rodada não cobre o estado posterior à escolha de consentimento, quando a barra inferior volta a aparecer; esse estado revelou um achado separado (OB-66). O teste foi no build local, não no deployment atual.
- **Mitigações verificadas:** O CSS local escurece texto de botões laranja apenas quando o próprio elemento também tem a classe `text-white`; este botão não tem essa classe e herda a cor branca do `<main>`, então a regra não se aplica. Termos sublinha links em estado normal; a tabela Brickboard tem `role=region` e `tabIndex=0`. A publicação da correção e a verificação visual em outros tamanhos continuam pendentes.
- **Impacto:** Leitura e navegação por teclado falham em páginas públicas para pessoas com baixa visão/usuários de teclado.
- **Como verificar/reproduzir com segurança:** Em `/configuracoes/notificacoes`, execute axe com as tags WCAG 2.2 AA em 375 px e inspecione o botão “Salvar preferências”; o relatório calcula 3,06:1 para texto branco sobre #FF5E00.
- **Solução recomendada:** Aplicar uma cor de texto de alto contraste diretamente em todos os botões com fundo laranja, repetir axe nas rotas públicas/autenticadas e validar o deployment publicado.
- **Exemplo corrigido:**

```tsx
<button onClick={() => void save()} className="mt-6 min-h-11 bg-brand-orange px-6 text-xs font-black text-black uppercase">Salvar preferências</button>
```

- **Esforço estimado:** M
# **[OB-17] CSP permite scripts inline**

- **Categoria:** Segurança
- **Severidade:** Baixa
- **Confiança:** Alta
- **Status:** CONFIRMADO
- **Tipo de evidência:** Estática
- **CVSS estimado:** N/A
- **Localização:** `src/proxy.ts:8-16`.
- **Evidência:**

```
"script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://plausible.io",
```

- **Descrição:** Cabeçalho publicado permite scripts inline em todas as páginas, enfraquecendo a defesa contra execução após eventual XSS. Nenhum sink explorável foi confirmado.
- **Mitigações verificadas:** CSP também define object-src none, frame-ancestors none, base-uri/form-action self; HSTS, X-Frame-Options e nosniff estavam presentes. Markdown cria React nodes e JSON-LD escapa <.
- **Impacto:** XSS futuro teria menos barreiras de execução; risco de defesa em profundidade.
- **Como verificar/reproduzir com segurança:** Leia Content-Security-Policy da homepage e procure unsafe-inline em script-src.
- **Solução recomendada:** Avaliar nonce por resposta compatível com Next.js/analytics e remover unsafe-inline quando possível.
- **Exemplo corrigido:**

```
script-src 'self' 'nonce-<nonce-da-resposta>' https://www.googletagmanager.com https://plausible.io
```

- **Esforço estimado:** P
# **[OB-18] Set-commands aceita segredo curto**

- **Categoria:** Segurança
- **Severidade:** Baixa
- **Confiança:** Alta
- **Status:** CONFIRMADO
- **Tipo de evidência:** Estática
- **CVSS estimado:** N/A
- **Localização:** `src/app/api/telegram/set-commands/route.ts:7-10`; helper src/lib/server/cron-auth.ts:3-11.
- **Evidência:**

```
function authorized(request: Request): boolean {
  const cronSecret = process.env.CRON_SECRET;
  return Boolean(cronSecret && request.headers.get("authorization") === `Bearer ${cronSecret}`);
}
```

- **Descrição:** A rota aceita qualquer segredo não vazio e não usa comparação em tempo constante. O helper compartilhado rejeita valores menores que 16 caracteres. production:check encontrou segredo local curto; comprimento do segredo de produção é NÃO VERIFICADO.
- **Mitigações verificadas:** A rota exige bearer exato; outros cron handlers usam helper robusto; esta ação apenas registra comandos do bot.
- **Impacto:** Se produção receber segredo curto, fica mais suscetível a tentativa de força bruta para alterar comandos do bot.
- **Como verificar/reproduzir com segurança:** Em teste isolado, segredo short e header Bearer short fazem a autorização local retornar true; não chame a rota real para não alterar Telegram.
- **Solução recomendada:** Reutilizar isAuthorizedCronRequest e usar segredo aleatório de pelo menos 16 caracteres em cada ambiente.
- **Exemplo corrigido:**

```
if (!isAuthorizedCronRequest(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
```

- **Esforço estimado:** P
# **[OB-19] Fluxos centrais de IA e Telegram têm pouca cobertura comportamental**

- **Categoria:** Testes
- **Severidade:** Média
- **Confiança:** Alta
- **Status:** CONFIRMADO
- **Tipo de evidência:** Teste
- **CVSS estimado:** N/A
- **Localização:** `src/lib/ai/gemini-news.ts:995`; src/lib/telegram/bot.ts; cobertura de tests/*.test.ts.
- **Evidência:**

```
export async function generateNewsDraft(options: GeneratePostOptions = {}): Promise<GeneratedDraftResult> {
```

- **Descrição:** 49 testes passaram, mas cobertura de funções de gemini-news.ts e telegram/bot.ts foi 0%; cobertura de linhas 14,77% e 10,22%. O cron pode publicar matéria e Telegram atende comandos/notifica. Testes que apenas importam módulos não testam os fluxos.
- **Mitigações verificadas:** Há testes para backup, cron-auth, consultas e import de scripts; lint/typecheck passaram. E2E autenticado não foi executado; Playwright cobriu só páginas públicas em modo seguro.
- **Impacto:** Regressões em seleção, geração, publicação, autorização e respostas do bot podem chegar à produção sem serem detectadas.
- **Como verificar/reproduzir com segurança:** Rode node --experimental-test-coverage --test --experimental-strip-types tests/*.test.ts e confira cobertura; busque casos comportamentais de generateNewsDraft/Telegram.
- **Solução recomendada:** Simular provedores e Supabase e testar validação/publicação antes de deploy; incluir integração autenticada em staging.
- **Exemplo corrigido:**

```
test("mantém artigo não validado como rascunho", async () => {
  const result = await runCronWithGeneratedPost(invalidPost);
  assert.equal(result.published, false);
});
```
- **Esforço estimado:** M


## Inventário de rotas e proteções

O inventário automatizado leu os 33 route.ts atuais e coletou métodos e referências a auth, guards admin/cron, origem e clientes Supabase. O proxy protege páginas /admin e exclui /api; os handlers de API foram cruzados por padrões e leitura aprofundada dos fluxos ligados aos achados.

| Grupo | Métodos e proteção observada |
|---|---|
| /api/admin/*: community, contact, games, images, posts, stats, storage-health, team | GET/POST/PATCH/DELETE conforme handler; bearer Supabase, auth.getUser e app_metadata.is_admin. |
| /api/user/avatar e /api/user/banner | POST; bearer, user validado, limite por usuário, Sharp/tamanho. |
| /api/user/data | GET; sessão cookie, auth.getUser, filtros pelo user_id, cursor/paginação. |
| /api/user/delete, /api/notifications, /api/community/poll-vote | DELETE/PUT; sessão cookie, auth.getUser e origem validada. |
| /api/cron/daily-poll, editorial-scheduler, generate-daily, retention | GET com segredo cron compartilhado. |
| /api/cron/release-radar-cleanup | GET com segredo cron; POST com bearer admin. |
| /api/telegram/webhook | POST com secret-token e timingSafeEqual; GET informa status. |
| /api/telegram/set-commands | GET/POST com CRON_SECRET; sem comprimento mínimo local (OB-18). |
| /api/contact, /api/newsletter, /api/errors, /api/home-engagement | POST público; validação, checks de origem e rate limit variam por rota. |
| /api/news, /api/youtube/latest, /feed.xml, /sitemap.xml, /news-sitemap.xml, /assuntos/[slug] | GET público; paginação/cache/rate limit quando aplicável. |
| /auth/callback | GET; callback Supabase. |

Edge Functions: generate-image (JWT/admin), manage-push-subscription (endpoint permitido e rate limit; inscrição anônima permitida), post-stats, register-view, send-push-notification (JWT e escopo admin/usuário), submit-contact e toggle-reaction. `_shared` centraliza CORS, rate limit, IP e allowlist de host. Em 29/09, `supabase functions list` confirmou as sete funções ativas e retornou versões e flags `verify_jwt`; não trouxe hash de código para comparar com o checkout. OB-23 comprova que o CORS efetivo ainda permite a origem antiga.

## Resumo das ferramentas

| Ferramenta | Resultado |
|---|---|
| gitleaks detect --source . | 169 commits; três alertas históricos: chave anon esperada e duas credenciais para tratar (OB-01/OB-05). Scan do runtime atual sem alertas. |
| osv-scanner scan source --recursive --format=table --verbosity=error . | Nenhum problema de dependência reportado. |
| semgrep --config auto . | 533 arquivos rastreados, 99,9% parseados, 64 alertas incluindo .agents/scripts e falsos positivos; alguns arquivos grandes/caminhos ignorados. |
| semgrep --config auto --json --quiet --jobs 4 src supabase/functions scripts .github | 10 candidatos; leitura dos trechos e testes do formato backup não confirmou falha explorável nesses alertas. |
| npm audit --audit-level=low --no-fund | Zero vulnerabilidades reportadas pelo registry npm. |
| npm run lint | Passou, sem avisos. |
| npx tsc --noEmit --incremental false | Passou. |
| node --experimental-test-coverage --test --experimental-strip-types tests/*.test.ts | 49 passaram, 0 falharam. |
| node scripts/check-text-integrity.mjs | Passou em 338 arquivos; checa encoding, não gramática. |
| npx madge --circular --extensions ts,tsx --ts-config tsconfig.json src | 202 arquivos, nenhum ciclo, três avisos de resolução. |
| npx knip --no-progress | Inconclusivo: 167 arquivos, 2 dependências, 7 exports, 26 tipos; inclui .agents, scripts one-off e Edge Functions sem configuração Knip. |
| npm run production:check | ready:false; cinco PGRST205, backup incompleto e segredo cron local curto. Não lê valores Vercel nem confirma estado externo. |
| vercel env ls production --project orange-brick | Nomes apenas; RAWG_API_KEY ausente; valores secretos não lidos. |
| vercel crons list --project orange-brick | Produção divergente e três alterações locais pendentes. |
| Playwright + axe-core | 12 páginas × 4 larguras, 48 visitas; sem erros HTTP/página, 136 requests bloqueadas; axe identificou contrastes/foco. |
| Lighthouse | Tentativa falhou ao conectar ao Chromium; não executado. |
| supabase migration list --linked | CLI parou em `Initialising login role...`; a consulta GET read-only à Management API confirmou o ledger: 34 versões remotas, 65 locais e 31 locais pendentes. |
| Build isolado | Turbopack rejeitou symlink externo de node_modules antes da compilação; não é evidência de erro da aplicação. Nenhum artefato foi copiado ao workspace. |

## Cobertura analisada e ignorada

- Inventário atualizado: 620 caminhos rastreados, 508 arquivos não ignorados; `src/` (215, incluindo 212 arquivos de código), `src/app/` (37 páginas e 33 rotas), 65 migrações SQL, 7 Edge Functions + `_shared`, 56 scripts, 24 testes, 1 arquivo E2E, 2 workflows e 115 itens em `public/`.
- Lint/typecheck cobriram globs do projeto; OSV/Gitleaks examinaram o repositório; Semgrep cobriu os caminhos descritos. Buscas direcionadas revisaram sinks HTML, SQL/filter, autenticação, rotas, metadata e integrações.
- Leitura manual aprofundada cobriu handlers e arquivos que sustentam os achados, auth, cron, sessão, rede, IA, backup, privacidade, estilos e workflows. Outros componentes/páginas receberam análise automatizada, mas não foram lidos linha por linha individualmente; não afirmo ausência absoluta fora da revisão profunda.
- Browser: 12 rotas públicas selecionadas; não cobriu todas as páginas, dados dinâmicos nem estados autenticados. Rotas admin/privadas e mutações foram evitadas.
- Excluídos da leitura manual: `node_modules/` (dependências cobertas por npm/OSV, exceto os contratos acima), `.next/`, `dist/`, `build/`, `vendor/`, `.git/` como código atual (histórico escaneado pelo Gitleaks), `test-results/`, `tmp/`, `.agents/`, `.codex/` e `.vercel/`. `.agents/` e `.codex/` contêm ferramentas/instruções; caches/saídas são metadados. Em `public/`, foram verificados tamanho e dimensões dos arquivos raster, marcadores de risco em SVG e o conteúdo do service worker/manifest; não houve inspeção visual individual de todos os assets.
- .env.local foi lido apenas para nomes e comparação em memória da credencial OB-01; nenhum valor foi impresso. Variáveis Vercel foram verificadas por nome.

## Revisão ortográfica e textual

O verificador de integridade de caracteres passou, mas não verifica gramática. Na leitura individual dos metadados de `/noticias`, encontrei os itens abaixo:

| Arquivo:linha | Texto atual | Texto sugerido | Motivo |
|---|---|---|---|
| `src/app/noticias/page.tsx:14` | “materias, furos jornalisticos, analises da industria e noticias” | “matérias, furos jornalísticos, análises da indústria e notícias” | Faltam acentos na descrição de SEO. |
| `src/app/noticias/page.tsx:19-20` | “Arquivo Editorial de Noticias”; “Todas as materias e noticias publicadas” | “Arquivo Editorial de Notícias”; “Todas as matérias e notícias publicadas” | Faltam acentos nos metadados Open Graph. |

## Resumo executivo

1. Há uma chave Supabase privilegiada ainda válida no histórico Git e uma chave Google API histórica cuja validade não foi confirmada.
2. TypeScript passou e `npm audit` não reportou CVEs conhecidos; o lint atual falha em `src/app/profile/setup/page.tsx:25`.
3. Cinco relações necessárias não estão expostas pelo PostgREST; o GET do ledger confirmou 34 migrations remotas e 31 versões locais ausentes entre 65 locais.
4. O cron de produção não corresponde à agenda local e chama a geração sem o parâmetro exigido pelo handler.
5. O backup mais recente é incompleto, local e sem restauração demonstrada.
6. Busca RAWG, estatísticas, auditoria de Storage e renovação de sessão têm falhas confirmadas; o anexo de imagem do Brickboard é rejeitado pelo banco, a fila pode ocultar denúncias antigas e o editor tem abas inativas e riscos de salvar a matéria errada.
7. A política de privacidade não descreve todos os tratamentos observados, a exportação de atividade aceita um ID de aparelho sem associação à conta e preferências de push podem ser ignoradas. O CORS remoto ainda bloqueia chamadas do domínio próprio.
8. Axe encontrou falhas de contraste/foco no site publicado; o botão de preferências falha em vários tamanhos, a navegação inferior falha quando nenhum item está ativo, o texto animado de carregamento perde contraste e o diálogo administrativo de XP não mantém o foco. As telas globais de erro também não têm landmark principal.
9. IA/Telegram têm cobertura baixa e orçamento de tempo/tokens incompleto; o Radar usa ano fixo e não organiza lançamentos por semana.
10. Auth permite criar contas anônimas sem CAPTCHA, e as policies de comunidade não verificam `is_anonymous`; o site não deve ser declarado pronto até resolver os riscos altos e validar migrações, backup e cron.

## Contagem atual — 29/09/2026

| Crítica | Alta | Média | Baixa | Total |
|---:|---:|---:|---:|---:|
| 1 | 3 | 57 | 35 | 96 |

O total é o inventário de achados. OB-23 foi confirmado por preflight no endpoint Supabase em 29/09/2026: o runtime ainda anuncia a origem antiga da Vercel para o domínio próprio. OB-10 tem mitigação no checkout, mas ainda depende de validação após deploy.

## Scores da auditoria inicial — 25/09/2026

| Área | Nota | Justificativa |
|---|---:|---|
| Segurança | 3/10 | Chave privilegiada ativa no histórico; guards e headers reduzem outros riscos vistos. |
| Segurança de IA | 4/10 | Conteúdo web sem isolamento, schema runtime ausente e custo sem orçamento global. |
| Performance | 6/10 | Rate limit/timeout existem; stats carrega linhas e retries ocupam o cron. |
| Qualidade de Código | 7/10 | Lint/typecheck passam; fronteira de IA e módulos de baixo teste pedem melhoria. |
| UX | 7/10 | Fluxos básicos presentes; busca RAWG e integrações têm falhas. |
| SEO | 5/10 | Metadata/sitemap existem, mas canonical incorreto em rotas internas. |
| Acessibilidade | 4/10 | Falhas WCAG no site publicado, no botão de preferências, na navegação inferior e no texto animado de carregamento. |
| Manutenibilidade | 6/10 | Estrutura clara e sem ciclos; gaps em testes e estado de deploy. |
| Testes | 4/10 | 49 testes passam; cobertura de linhas 26,71%, funções IA/Telegram 0%. |

## Top 20 por risco e facilidade de exploração

Há 96 achados catalogados. O Top 20 abaixo mantém os quatro achados críticos/altos e os 16 achados médios de maior prioridade. Os outros 76 achados permanecem detalhados no relatório, mas ficam fora desse recorte por terem prioridade menor ou dependerem de condições mais restritas, incluindo OB-71 a OB-85, OB-87 a OB-94 e OB-96. A contagem inclui problemas de produção cuja correção existe apenas no checkout e ainda não foi validada após deploy.

| ID | Título | Severidade | Arquivo |
|---|---|---|---|
| OB-01 | Chave privilegiada Supabase ativa no histórico | Crítica | scripts/check-posts.cjs:5 (histórico) |
| OB-02 | Cinco tabelas não expostas no PostgREST | Alta | scripts/check-production-readiness.mjs:28 |
| OB-03 | Agenda de produção não executa os três horários previstos | Alta | src/app/api/cron/generate-daily/route.ts:102 |
| OB-95 | Contas anônimas podem participar do Brickboard sem CAPTCHA | Alta | supabase/migrations/20260723000000_community.sql:68 |
| OB-86 | Filtro da página inicial dispara consultas sem parar | Média | src/lib/hooks/useInfiniteFeed.ts:21,126 |
| OB-05 | Chave Google API no histórico | Média | docs/drive-sync-codex.md:57 (histórico) |
| OB-04 | Backup incompleto/local | Média | scripts/backup-supabase.mjs:17 |
| OB-07 | Aviso de privacidade incompleto | Média | src/app/privacidade/page.tsx:34 |
| OB-25 | Publicação automática aceita imagens sem origem oficial confirmada | Média | src/lib/ai/gemini-news.ts:369 |
| OB-41 | Leitura pública expõe justificativa editorial interna | Média | src/app/posts/[slug]/page.tsx:30 |
| OB-21 | Exportação de dados omite dados vinculados à conta | Média | src/lib/user-data-export.ts:3 |
| OB-22 | Erro ao ler preferências de push envia a notificação mesmo assim | Média | supabase/functions/send-push-notification/index.ts:170 |
| OB-23 | CORS das funções de push permite apenas a origem antiga da Vercel | Média | supabase/functions/_shared/platform.ts:3 |
| OB-24 | Revogação de push marca sucesso sem remover a assinatura | Média | src/components/ui/PrivacyControls.tsx:90 |
| OB-27 | Falha ao enviar denúncia ao Telegram avança o marcador mesmo assim | Média | src/lib/telegram/bot.ts:570 |
| OB-28 | Timeout e replay do webhook podem repetir geração editorial | Média | src/app/api/telegram/webhook/route.ts:7 |
| OB-09 | Exclusão pode responder sucesso falso | Média | src/app/api/admin/storage-health/route.ts:66 |
| OB-29 | Exclusão de conta pode parar após apagar dados | Média | src/app/api/user/delete/route.ts:64 |
| OB-39 | Falha na paginação de notícias pode gerar tentativas em loop | Média | src/components/feed/NewsList.tsx:23 |
| OB-12 | Prompt recebe conteúdo sem isolamento | Média | src/lib/ai/gemini-news.ts:1023 |

## Dez testes mais urgentes

1. cronRouteRejectsMissingOrInvalidSlot — valida slots e garante que parâmetro ausente nunca inicia geração.
2. cronSlotPublishesAtMostOnce — concorrência, idempotência e recuperação de slot interrompido.
3. publicationBlockersRejectUnverifiedImagesAndDuplicatePublishers — imagens sem origem e fontes do mesmo publisher não passam pelo gate.
4. generatedOutputSchemaRejectsWrongTypes — JSON válido com tipos errados não causa escrita parcial.
5. sourcePromptTreatsArticleAsUntrustedData — conteúdo hostil é delimitado/ignorado.
6. aiGenerationRespectsDeadlineAndTokenBudget — timeouts/retries terminam antes de 300 segundos.
7. sessionRefreshCookiesReachApiResponse — cookie renovado chega nas quatro APIs cookie-auth.
8. newsListStopsAutomaticRetriesAfterRateLimit — uma resposta 429 ou falha de rede não recria o ciclo do IntersectionObserver; erro fica visível e retry respeita Retry-After.
9. storageCleanupReportsRemovalAndAuditErrors — falhas de Storage/auditoria nunca retornam sucesso; falha ao apagar avatar/banner antigo agenda limpeza recuperável.
10. webhookNotificationPushReplayAndAccountDeletionAreIdempotent — update_id repetido não duplica geração, o mesmo evento comunitário não dispara push repetido e falhas em etapas de exclusão retomam sem deixar a conta em estado parcial; falhas de Telegram, push e exportação ficam visíveis e recuperáveis.

## Plano de correção

### Imediato (24h)

- OB-01 — P: revogar/rotacionar chave, substituir em serviços e revisar logs; coordenar remoção do histórico.
- OB-05 — P: confirmar validade, revogar/restringir chave Google API.
- OB-02 — G: reconciliar migrações em staging, validar RLS e exibir falhas de consulta no painel antes de qualquer alteração remota.
- OB-03 — M: alinhar agenda/handler/plano Vercel e observar logs de execução.
- OB-04 — G: preservar snapshot, completar depois do schema e criar destino externo com chave separada.

### Curto prazo (1–2 semanas)

- OB-08 — P: configurar RAWG_API_KEY em Production e validar busca.
- OB-09 — M: tratar falhas de remoção/auditoria com erros simulados.
- OB-10 — M: persistir cookies refresh nas respostas.
- OB-06 — M: fazer a mutação de reação retornar totais agregados no SQL e testar acima do limite.
- OB-07 — M: atualizar notice/formulários com newsletter, Telegram, base legal e retenção com revisão jurídica.
- OB-21 — M: revisar o inventário de dados pessoais e completar a exportação com os conjuntos vinculados à conta, preservando a separação de dados de terceiros.
- OB-22 — P: interromper o envio de push quando não for possível consultar a preferência e observar/repetir a consulta após corrigir o schema remoto.
- OB-23/OB-24 — M: configurar `SITE_URL` das Edge Functions para o domínio próprio, validar novamente o preflight e tornar a revogação local eficaz mesmo quando a remoção remota falha.
- OB-25 — M: verificar origem e vínculo das imagens; não atribuir divulgação oficial sem confirmação.
- OB-26 — M: contar publisher/editor independente, não subdomínio, para validar cruzamento de fontes.
- OB-27 — M: só avançar o marcador de denúncia após confirmação de envio pelo Telegram; manter retry/alerta em falha.
- OB-28 — M: enfileirar geração Telegram e deduplicar `update_id` antes de executar IA.
- OB-29 — M: transformar a exclusão de conta em fluxo durável, idempotente e retomável após falhas de Storage, banco ou Auth.
- OB-30 — P: verificar remoções de avatar/banner e agendar limpeza recuperável de objetos órfãos no bucket público.
- OB-32 — P: alinhar os campos da RPC pública com as opções de privacidade e testar que `active_days` não é retornado quando oculto.
- OB-33 — P: ajustar o cadastro para criar o perfil antes do upload opcional de avatar e apresentar um caminho de recuperação se o upload falhar.
- OB-34 — P: reduzir os campos lidos pelo painel de saúde e paginar ou calcular avisos no servidor para não omitir posts antigos.
- OB-35 — P: separar a autenticação interna do cron da autenticação de usuário na função de push de notícias.
- OB-36 — P: tornar push comunitário idempotente por ID da ação e limitar reenvios por usuário; validar replay em staging.
- OB-37 — P: paginar a caixa de contatos com ordenação estável e permitir navegar por mensagens além das 100 mais recentes.
- OB-38 — P: adquirir o lock de alertas de moderação atomicamente e testar duas invocações concorrentes.
- OB-39 — P: interromper retentativas automáticas após erro na lista de notícias, apresentar feedback e obedecer ao `Retry-After`.
- OB-40 — P: conferir erros dos RPCs de rate limit e persistência do monitor, registrar falha sem incluir conteúdo sensível e não responder sucesso quando a gravação falha.
- OB-41 — P: separar campos de fluxo editorial de posts públicos em view/colunas privadas e usar uma projeção explícita na página de matéria.
- OB-86 — P: estabilizar a lista inicial do feed filtrado para evitar nova consulta após cada resposta; confirmar no navegador que a rede fica ociosa após carregar a primeira página.
- OB-87 — P: conferir falhas de gravação das preferências de acompanhamento, reverter o estado otimista e exibir erro ao usuário.
- OB-88 — P: preservar o erro ou sinalizar contagem indisponível quando a leitura de comentários recentes falhar, em vez de exibir zero.
- OB-89 — P: retirar os slides invisíveis do foco e da árvore de acessibilidade do carrossel.
- OB-90 — P: remover ou conectar os módulos sem consumidores confirmados para reduzir código morto.
- OB-42 — P: distinguir falha de leitura de preferências dos padrões e impedir gravação até carregar o estado existente; informar e direcionar usuários sem sessão.
- OB-44 — P: servir resultados agregados da enquete por uma RPC que não exponha a identidade ou as linhas de voto dos leitores.
- OB-45 — P: fornecer contagens agregadas de reações para o feed público sem liberar as linhas individuais nem deixar visitantes sem contadores.
- OB-46 — M: paginar posts na consulta do Brickboard e substituir leituras globais de reações/comentários por agregações limitadas aos posts carregados.
- OB-47 — P: preservar a prioridade de posts fixados no sort do feed cliente.
- OB-48 — P: filtrar enquetes vencidas no feed e exibir erro quando a gravação do voto for rejeitada.
- OB-49 — P: enviar a imagem para o Storage e gravar uma URL HTTP(S) validada, em vez de inserir uma Data URL na coluna `media_url`.
- OB-50 — P: trocar uma reação em uma única operação atômica e testar falha entre a remoção e a nova gravação.
- OB-51 — P: manter aberto o composer de republicação e preservar o texto se a gravação falhar.
- OB-52 — P: confirmar o resultado do voto em notas comunitárias e reverter o estado otimista em erro.
- OB-53 — P: propagar falhas ao editar/excluir posts e manter os diálogos abertos com erro visível.
- OB-54 — P: substituir leitura pública de linhas de curtidas por contagens agregadas e limitar cada usuário à própria identidade de voto.
- OB-55 — P: apresentar erro e estado vazio na seção de notas e capturar falhas de rede no carregamento/envio.
- OB-56 — P: limitar `parent_id` a comentários-raiz no banco ou renderizar threads aninhadas recursivamente.
- OB-57 — P: versionar a criação de `comments.parent_id` na migration que habilita threads de matérias.
- OB-58 — P: criar a policy/grant de exclusão por titular para `comments` ou remover o botão correspondente.
- OB-59 — P: associar os eventos de leitura e reação à conta no servidor; não exportar atividade anônima como dado de uma conta sem vínculo verificável.
- OB-60 — P: impor timeout e limite de bytes durante o streaming da resposta do provedor de imagem.
- OB-61 — P: derivar ano e mês do `release_date` e remover o ano fixo dos metadados/títulos do calendário.
- OB-62 — P: agrupar datas por semanas de segunda a domingo conforme o padrão do projeto.
- OB-63 — P: distinguir erro de leitura dos votos de resultado vazio e permitir nova tentativa para visitantes.
- OB-64 — P: tratar falha na leitura do voto próprio e bloquear a atualização otimista até sincronizar o estado anterior.
- OB-65 — P: fornecer `<main id="conteudo-principal">` nas telas globais de 404 e erro para que o landmark e o link de salto funcionem.
- OB-66 — P: não renderizar o indicador laranja da barra inferior quando nenhuma rota corresponde aos seis itens; testar axe com e sem consentimento salvo.
- OB-67 — P: remover o pulso do texto de carregamento ou manter contraste WCAG 2.2 AA em toda a animação.
- OB-11 — M: canonicals por rota e noindex em páginas utilitárias.
- OB-15/OB-16 — M: corrigir contraste/foco, publicar e repetir axe.

### Médio prazo (1–2 meses)

- OB-12/OB-13/OB-14 — G: isolar conteúdo web, aplicar schema runtime, orçamento global e circuit breaker.
- OB-18 — P: usar guard compartilhado e auditar comprimento dos segredos sem revelá-los.
- OB-20 — P: alinhar o limite exibido com o servidor ou redimensionar a imagem antes do envio.
- OB-19 — G: adicionar os dez testes e integração autenticada em staging.
- OB-04 — G: testar restauração isolada e medir RPO/RTO.
- OB-17 — M: testar CSP com nonce e analytics.
- OB-31 — P: incluir desafio MFA e exigir AAL2 em páginas e APIs administrativas; confirmar enforcement no Supabase.

### Melhorias futuras

- OB-19 — M: ampliar cobertura de sessão, rede, IA, Telegram e Edge Functions.
- OB-06 — M: acompanhar latência/linhas processadas e alertar regressões.
- OB-04 — M: documentar retenção, cópia externa e responsáveis por recuperação.
- OB-16 — M: integrar axe/Lighthouse à pipeline após corrigir execução do navegador.

## Limitações

- Sem sessão admin/usuário, nenhum fluxo autenticado real foi executado; nenhuma mutação foi enviada ao site.
- O ledger remoto não foi consultado; PGRST205 comprova indisponibilidade via API, não causa física.
- Vercel listou nomes de variáveis sem valores. Chave implantada, comprimento de CRON_SECRET, VAPID_PRIVATE_KEY, plano e configuração Edge permanecem NÃO VERIFICADOS.
- Teto remoto de linhas PostgREST não foi consultado; OB-06 é condicional ao limite efetivo.
- O rate limit compartilhado das Edge Functions usa x-forwarded-for antes de x-real-ip em supabase/functions/_shared/platform.ts:51-54. A sanitização do cabeçalho pelo gateway do projeto publicado não foi verificada; mantive a possível falsificação como NÃO VERIFICADA, sem registrar como vulnerabilidade confirmada.
- Backup gerenciado Supabase, escopo da chave GCP, validade do segredo histórico e cópia externa não foram verificados nos consoles.
- GDPR: direcionamento/residência de titulares e identidade jurídica do controlador não verificados.
- Playwright cobriu 12 páginas públicas selecionadas profundamente; a matriz ampla percorreu todas as 37 rotas em 320/375/390/768/1280/2560 px com snapshots após 500 ms (222 combinações), sem overflow, 5xx ou erro de página. Verificações estáveis após 2,2 s cobriram rotas selecionadas, não todos os estados. Requisições externas não permitidas e métodos mutáveis foram bloqueados. Perfis reais, estados autenticados e conteúdo dinâmico não receberam revisão ortográfica completa.
- Lighthouse 13.5 iniciou localmente, mas retornou `NO_NAVSTART`, sem métricas de performance, e terminou com `EPERM` ao limpar o perfil temporário; os scores parciais de acessibilidade 98, boas práticas 100 e SEO 100 não comprovam desempenho. O build isolado anterior parou porque Turbopack rejeitou symlink de node_modules; isso não comprova erro do app.
- Esta auditoria não garante ausência de vulnerabilidades fora das verificações declaradas.

## Referências externas

- [OWASP Top 10:2025](https://owasp.org/www-project-top-ten/) — linha de base atual; “2021/2025” no prompt foi interpretado como 2025.
- [OWASP Top 10 for LLM Applications](https://genai.owasp.org/llm-top-10/) — prompt injection, saída e custo.
- [Supabase SSR](https://supabase.com/docs/guides/auth/server-side) — propagação de cookies renovados.
- [Supabase API: máximo de linhas](https://supabase.com/docs/reference/javascript/v1/select) — limite padrão e paginação.
- [Segurança da API Supabase](https://supabase.com/docs/guides/api/securing-your-api) — exemplos de leitura do cabeçalho x-forwarded-for; não confirmam a sanitização no gateway deste projeto.
- [Vercel Cron Jobs](https://vercel.com/docs/cron-jobs) e [limites/gestão](https://vercel.com/docs/cron-jobs/manage-cron-jobs) — UTC e restrições por plano.
- [LGPD](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm) e [Resolução ANPD nº 2/2022](https://www.gov.br/anpd/pt-br/acesso-a-informacao/institucional/atos-normativos/regulamentacoes_anpd/resolucao-cd-anpd-no-2-de-27-de-janeiro-de-2022).

## Estado da remediação local — 25/09/2026

Esta atualização complementa o relatório original. As mudanças abaixo estão apenas no workspace; não houve deploy, alteração remota de banco, troca de credenciais ou exclusão do histórico Git. O workspace já estava amplamente modificado antes deste trabalho e não foi limpo nem revertido.

### Resumo executivo atualizado

- Corrigi localmente os fluxos de cookies de sessão, validação da saída da IA, remoção de arquivos órfãos, agregação de estatísticas, canonical por rota, privacidade e CSP.
- A causa das falhas de renderização local era a divergência entre o nonce CSP por requisição e o nonce gravado nas páginas estáticas. As páginas renderizam agora na requisição e todos os scripts recebem o mesmo nonce do cabeçalho.
- `npm run lint`, typecheck, `npm test`, integridade textual e build passaram. Os testes unitários passaram em 55 casos.
- Playwright + axe passou em 61 verificações de 12 páginas públicas, em 320, 390, 768, 1280 e 2560 px; quatro verificações repetidas de links foram ignoradas pelo próprio teste.
- A produção continua sem pronta para publicação: a agenda Vercel publicada é antiga, faltam cinco relações no PostgREST e o backup disponível é incompleto.
- A chave service_role histórica ainda precisa ser revogada e o histórico Git precisa ser limpo depois da rotação. A chave Google histórica também precisa de validação e rotação.
- A leitura do ledger remoto do Supabase ficou parada em `Initialising login role...`; nenhuma migration foi aplicada.

### Estado por achado (OB-01 a OB-19)

| ID | Estado local | Estado de produção ou ressalva |
|---|---|---|
| OB-01 | Pendente | A chave privilegiada exposta no histórico ainda requer revogação/rotação; o histórico não foi reescrito. |
| OB-02 | Pendente | `npm run production:check` confirmou `PGRST205` em `admin_audit_log`, `admin_trash`, `backup_runs`, `notification_preferences` e `user_follows`. O ledger remoto não foi confirmado. |
| OB-03 | Registro histórico, supersedido pela rechecagem final | Naquela etapa o SHA do deployment e o comportamento do handler publicado não estavam confirmados. A listagem Vercel posterior identificou o SHA e permitiu confirmar a divergência; ver OB-03 e a seção de rechecagem final. |
| OB-04 | Pendente | O backup local verificado continua incompleto pelas relações indisponíveis; não há destino externo durável confirmado. Não gerei cópias adicionais de dados pessoais. |
| OB-05 | Pendente | A chave Google encontrada no histórico não foi revogada nem teve seu escopo confirmado pelo provedor. |
| OB-06 | RPC local validada acima de 1.000 linhas | `post-stats` usa a RPC SQL `get_post_stats`; o teste PGlite confirmou 1.504 reações, 1.501 visualizações e 1.201 comentários. A migration ainda não foi aplicada remotamente nem validada no Supabase. |
| OB-07 | Corrigido parcialmente | Alertas de contato ao Telegram não incluem nome, e-mail ou assunto; aviso de privacidade e migration de retenção foram atualizados localmente. O prazo de retenção precisa de validação jurídica e a migration não foi aplicada. |
| OB-08 | Pendente | `RAWG_API_KEY` não aparece no ambiente Production da Vercel nem está disponível em `.env.local`; não posso configurar um valor ausente. |
| OB-09 | Corrigido no código local | A remoção só aceita arquivos editoriais existentes e sem registro, registra auditoria antes da operação e falha sem remover se a auditoria não estiver disponível. A verificação de integração está bloqueada pela tabela ausente em produção. |
| OB-10 | Corrigido no código local | O cliente SSR propaga cookies renovados nos Route Handlers que o usam. Build e typecheck passaram; não foi feito login de teste contra produção. |
| OB-11 | Corrigido localmente | Canonical global foi removido e URLs próprias foram adicionadas às páginas públicas indexáveis. A alteração ainda não foi publicada. |
| OB-12 | Mitigado parcialmente | Dados editoriais externos são serializados como JSON e identificados no prompt como conteúdo não confiável; quando os dois classificadores falham, a geração agora é cancelada. Prompt injection indireta ainda pode influenciar o texto e exige revisão humana das fontes e do rascunho. |
| OB-13 | Corrigido localmente | A saída editorial e o JSON do classificador passam por validação de tipos, campos permitidos, categoria, URLs e requisitos de citação. Testes cobrem respostas inválidas. |
| OB-14 | Corrigido localmente | Chamadas Gemini/Groq receberam timeouts, limite de tokens, tentativas limitadas e prazo global; produção não foi exercitada com provedores reais. |
| OB-15 | Corrigido localmente | Contraste do placeholder foi ajustado e as verificações axe locais passaram. A mudança ainda não foi publicada. |
| OB-16 | Parcialmente corrigido | O botão branco sobre laranja em `/configuracoes/notificacoes` mede 3,06:1 no build local e foi reproduzido em 375, 768, 1280 e 2560 px. A rota precisa da correção local e o deployment segue sem validação completa. |
| OB-17 | Corrigido localmente | `script-src` não usa `unsafe-inline`; o layout força renderização dinâmica para alinhar o nonce da CSP e o HTML. Uma resposta HTTP 200 teve um `<main>` e 21 de 21 scripts com nonce correspondente. Isso aumenta renderização no servidor; não houve medição Lighthouse. |
| OB-18 | Código e configuração local corrigidos; Production não verificado | O guard compartilhado rejeita segredo cron ausente ou curto. O segredo local foi substituído por 32 bytes aleatórios; o valor Production continua sem inspeção. |
| OB-19 | Mitigado parcialmente | Há testes comportamentais para prompts, prazos, fallback, recuperação de slot, bloqueios editoriais, cookies SSR, comandos Telegram privados e `post-stats`; os fluxos integrados com provedores reais, Supabase, publicação e demais funções Edge seguem sem cobertura suficiente. |

### Verificações de remediação executadas

| Comando/verificação | Resultado |
|---|---|
| `npm run check` | Passou: integridade textual em 359 arquivos, lint, TypeScript, 89 testes Node e build. |
| `npx tsc --noEmit --incremental false` | Passou antes da última alteração de layout; o build posterior também concluiu o TypeScript sem erros. |
| `npm run lint` | Passou após as alterações finais. |
| `npm test` | 89 passaram, 0 falharam. |
| `npm run textcheck` | Integridade aprovada em 359 arquivos. |
| `npm run build` | Passou; páginas com interface passaram a ser renderizadas sob demanda por causa do nonce CSP. |
| `npx --yes deno@latest check supabase/functions/post-stats/index.ts` | Passou após extrair o handler HTTP para lógica compartilhada sem dependências do runtime Deno. |
| `npx playwright test --workers=1 --max-failures=1` | 61 passaram e 4 foram ignorados pelo teste repetido de links; 12 páginas, axe, teclado e overflow em cinco viewports. O servidor registrou avisos de stream cancelado durante navegações, sem falhas nos testes. |
| Verificação HTTP local de CSP | HTTP 200, um landmark `<main>`, 21 tags de script com nonce e 21 correspondentes ao nonce do cabeçalho. |
| `npm run production:check` | Continua `ready:false`: faltam localmente as chaves Supabase novas e a chave pública VAPID; duas variáveis legadas permanecem; cinco tabelas retornam `PGRST205`; o histórico remoto não foi confirmado; o backup verificado tinha 87,2 horas na última leitura e está obsoleto; verificações externas seguem pendentes. `weak_environment: []`. |
| `npx --yes vercel@latest env ls production` | Leu apenas nomes/tipos; confirmou ausência de `RAWG_API_KEY`. Valores de segredos não foram copiados para este relatório. |
| `npx --yes vercel@latest crons list` | Confirmou seis crons publicados antigos e três horários 12h/17h/20h do arquivo local aguardando deploy. |
| `npx --yes supabase@latest migration list --linked` | Não concluiu após cerca de 55 segundos em `Initialising login role...`; interrompido sem alterar o banco. |

### Scores locais após as correções

| Área | Nota | Justificativa |
|---|---:|---|
| Segurança | 5/10 | Rotas e tratamento local melhoraram, mas há uma chave privilegiada histórica ainda ativa e mudanças de banco/cron não publicadas. |
| Segurança de IA | 6/10 | Saída tipada e limites de execução foram adicionados; conteúdo hostil ainda pode influenciar o texto gerado. |
| Performance | 6/10 | Build passa, mas a renderização dinâmica global não foi medida por Lighthouse nem por métricas de campo. |
| Qualidade de código | 8/10 | Lint, TypeScript, testes e build passam; integração remota ainda falta. |
| UX | 7/10 | Páginas públicas verificadas passaram nos fluxos básicos; telas de preferências e progresso ainda confundem falha de serviço com padrões ou ausência de dados. |
| SEO | 7/10 | Canonicals locais corrigidos; publicação, Lighthouse e cobertura de todas as rotas ainda pendem. |
| Acessibilidade | 8/10 | Axe WCAG 2.2 AA passou nas páginas/viewports testados; leitores de tela e fluxos autenticados precisam revisão manual. |
| Manutenibilidade | 7/10 | Tipos e validações melhoraram; o ledger das migrations remotas e o workspace com alterações preexistentes limitam a previsibilidade. |
| Testes | 7/10 | 89 testes Node e 61 verificações E2E passaram; cobertura de integrações críticas segue incompleta (37,10% de linhas, 73,08% de branches, 58,17% de funções). |

### Bloqueios para fechar a remediação

1. Revogar as duas credenciais históricas nos provedores e depois planejar a limpeza do histórico Git. A rotação pode interromper integrações que ainda usem os valores antigos.
2. Obter um histórico confiável do Supabase remoto, reconciliar as 62 migrations locais e validar as migrations em staging antes de qualquer aplicação em produção.
3. Fornecer/configurar `RAWG_API_KEY` no ambiente Production; a chave não está disponível localmente.
4. Escolher um destino externo para backups e validar uma restauração completa antes de confiar no backup operacional.
5. Fazer deploy controlado. `vercel crons list` mostra alterações locais pendentes, mas o workspace contém muitas mudanças anteriores a esta remediação; um deploy da árvore inteira também publicaria essas alterações.
6. Confirmar a política de retenção de contatos e o prazo legal com o controlador/assessoria responsável antes de executar a migration de retenção.

### Adendo — migração das chaves Supabase — 25/09/2026

- O inventário autenticado do projeto confirmou que há chaves `publishable` e `secret` novas e que as chaves legadas `anon` e `service_role` continuam habilitadas. Os valores não são registrados aqui.
- O runtime Next.js agora prioriza `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` e `SUPABASE_SECRET_KEY`, mantendo as variáveis legadas apenas como fallback temporário. As Edge Functions agora aceitam `SUPABASE_SECRET_KEYS.default` e mantêm fallback legado até o deploy.
- O gate `production:check` distingue as chaves novas das legadas; no `.env.local`, as novas ainda estão ausentes e o runtime depende do fallback legado. O inventário Vercel anterior mostrou os nomes das duas variáveis novas em Production, sem revelar valores.
- A conferência atual de nomes na Vercel confirmou as duas chaves novas e as duas legadas; confirmou também `CRON_SECRET` e `NEXT_PUBLIC_VAPID_PUBLIC_KEY`. `RAWG_API_KEY` continua ausente.
- `vercel crons list` continua mostrando seis trabalhos antigos em produção; os três slots 12h/17h/20h seguem locais e pendentes de deploy.
- A consulta de inventário de chaves via CLI retornou material completo das chaves legadas inesperadamente. Os valores não foram copiados para arquivos nem para este relatório; trate as chaves legadas como comprometidas. A rotação continua pendente até a compatibilidade nova estar publicada.
- `npm run check` passou depois da mudança de chaves, com 55 testes, lint, TypeScript e build. `npx --yes deno@latest check supabase/functions/_shared/platform.ts` passou.
- `npm run production:check` continua bloqueado por chaves novas ausentes no ambiente local, segredos legados ainda presentes, `CRON_SECRET` local curto, cinco tabelas `PGRST205`, backup incompleto e histórico remoto não confirmado.

### Adendo — fechamento das verificações locais — 25/09/2026

- Atualizei 42 scripts operacionais em `scripts/` para preferirem `SUPABASE_SECRET_KEY` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, mantendo fallback legado durante a migração. Nenhum valor de chave foi inserido nos arquivos.
- `node --check` aprovou 54 scripts JavaScript/ESM; `npm run check` terminou com código 0 após essas mudanças e executou integridade textual, ESLint, TypeScript, 55 testes e build.
- `npm run textcheck` foi repetido depois da atualização e aprovou a integridade textual em 343 arquivos.
- `git diff --check` não apontou whitespace inválido; o Git apenas avisou que normalizará LF para CRLF em arquivos modificados na próxima escrita.
- Uma nova execução de `npm run production:check` permanece com resultado `ready: false`: no ambiente local faltam as duas chaves Supabase novas e a chave pública VAPID, as duas variáveis legadas ainda existem, `CRON_SECRET` é curto e seguem ausentes as cinco relações já listadas. O ledger remoto continua sem confirmação, o backup continua incompleto e as verificações externas não foram confirmadas.
- O status do workspace continua amplamente modificado e inclui arquivos anteriores a esta remediação. Não fiz deploy, commit, migração remota nem rotação/desativação de credenciais.

### Adendo — cron editorial e testes da IA — 25/09/2026

- O estado de cada horário editorial agora passa por compare-and-set. Antes de publicar, o slot registra `publishing:<post_id>`; se uma tentativa seguinte encontrar esse estado vencido, consulta o post e marca o slot como publicado quando a gravação do post já tiver sido concluída. Isso evita gerar/publicar uma segunda matéria para um post cujo estado final do slot falhou.
- Se o post ainda estiver como rascunho após um estado `publishing` vencido, uma única chamada pode recuperar o slot por compare-and-set e retomar o processamento. Datas inválidas falham fechadas.
- Montei os prompts de fonte, tema, feed diário e classificador em funções compartilhadas pela execução real. Testes confirmam que texto hostil permanece como dado JSON e que o classificador recebe no máximo 600 caracteres.
- Centralizei o cálculo do timeout para que as chamadas a Gemini e Groq não excedam o limite individual nem o tempo restante do orçamento editorial.
- `npm run check` terminou com código 0 após as alterações: integridade textual em 349 arquivos, lint, TypeScript, 67 testes e build.
- `npm run e2e -- --workers=1 --max-failures=1` passou: 61 verificações em 12 páginas e cinco larguras de tela; quatro testes de links repetidos foram ignorados pela configuração. A suíte agora espera o carregamento completo antes de avaliar o DOM; a falha transitória de locator em `/em-alta` não se reproduziu.
- Testes adicionados nesta rodada: sete cenários de estado/idempotência de slot, três de montagem dos prompts e dois de limite temporal. Isso aumenta a cobertura comportamental local, mas ainda não substitui testes integrados de geração/publicação com provedores e Supabase simulados.
- O resultado de produção continua inalterado: faltam reconciliação das migrations e cinco relações via PostgREST, rotação das credenciais comprometidas, configuração de `RAWG_API_KEY`, backup durável/restaurável e deploy controlado da agenda e das correções locais.

### Adendo — prazo global de geração e estado remoto — 25/09/2026

- Ampliei o prazo global para limitar chamadas Gemini/Groq, classificação de escopo, leitura de feeds e páginas, buscas de imagem na Steam/Gemini, downloads, retries e chamadas Supabase usadas pela geração. Busca de imagem no Gemini também tem teto de 512 tokens. Se o prazo termina, a busca de imagem para e o slot permanece como rascunho conforme os bloqueios editoriais.
- `npm run check` passou após essa alteração: 67 testes, integridade textual em 349 arquivos, ESLint, TypeScript e build.
- `npm run production:check` foi reexecutado com saída sanitizada: `ready:false`; faltam localmente `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY` e `NEXT_PUBLIC_VAPID_PUBLIC_KEY`; as duas variáveis legadas Supabase permanecem no ambiente local; `CRON_SECRET` continua curto; cinco relações dão `PGRST205`; histórico remoto não confirmado; backup incompleto; verificações externas pendentes.
- A consulta Vercel somente leitura confirmou novamente os seis crons antigos (`daily-poll`, `drive-sync`, `editorial-scheduler`, `generate-daily`, `release-radar-cleanup`, `retention`) e os três slots atuais 12/17/20 como alterações locais não implantadas.
- O inventário Vercel por nome confirmou `SUPABASE_SECRET_KEY`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, credenciais legadas e `POSTGRES_PASSWORD` configurados em Production. Não li nem registrei valores. `RAWG_API_KEY` continua ausente; `GOOGLE_DRIVE_API_KEY` está configurada em Production, mas a igualdade com a chave histórica vazada não foi verificada.
- Nenhum deploy, migration remota, commit ou rotação de chave foi feito. A máquina tem o workspace inteiro modificado, as migrations remotas não foram reconciliadas e a mudança local não deve ser promovida antes de backup/restauração válidos e rotação coordenada.
- A suíte E2E completa passou novamente após alterar as navegações para `waitUntil: "load"`: 61 passaram e quatro validações repetidas foram ignoradas; axe e overflow passaram em todas as 12 rotas e cinco larguras configuradas.

### Adendo — validação local após testes do gate editorial e Storage — 25/09/2026

- `npm run check` terminou com código 0: integridade textual aprovada em 351 arquivos, ESLint sem avisos, TypeScript, 74 testes Node aprovados e build de produção concluído.
- Os testes adicionados cobrem a regra que mantém conteúdo bloqueado como rascunho sem chamar a publicação, a aceitação exclusiva dos slots 12/17/20 e a remoção de arquivos órfãos somente quando a auditoria registra a operação com sucesso.
- A validação é local. Não simula o Supabase de produção nem altera crons, tabelas, credenciais ou conteúdo publicado.

### Adendo — segredo cron local e estado de prontidão — 25/09/2026

- Substituí o `CRON_SECRET` curto apenas em `.env.local` por um valor aleatório de 256 bits. O conteúdo não foi exibido nem registrado, e `git check-ignore .env.local` confirmou que o arquivo permanece ignorado pelo Git.
- `npm run production:check` agora retorna `weak_environment: []`. O gate ainda retorna `ready: false`: faltam localmente as chaves Supabase novas e a chave pública VAPID; as duas variáveis Supabase legadas continuam no ambiente local; cinco relações retornam `PGRST205`; o histórico remoto das 62 migrations segue não confirmado; o backup é incompleto e as checagens externas continuam pendentes.
- `npm audit` foi repetido e reportou zero vulnerabilidades no lockfile atual.
- `npm run e2e -- --workers=1 --max-failures=1` terminou com código 0: 61 testes passaram e quatro verificações redundantes de links foram ignoradas; axe, navegação por teclado, overflow e links internos passaram nas 12 páginas públicas e cinco viewports configurados.
- A força do `CRON_SECRET` em Production não foi verificada. Nenhuma variável Vercel, cron, migration remota ou deployment foi alterado.

### Adendo — cobertura de cookies, publicação e Telegram — 25/09/2026

- Extraí o adaptador de cookies SSR usado por `createServerSupabaseClient` e testei leitura e persistência de múltiplos cookies renovados. O teste valida o adaptador real; não simula a resposta HTTP das quatro rotas autenticadas.
- A validação editorial foi extraída para `editorialPublicationBlockers` e testada com uma matéria válida e cenários que devem bloquear a publicação: contagem insuficiente, imagens repetidas e falta de fontes verificadas.
- Foram adicionados testes do webhook interno do bot para rejeição de comandos privados de outro chat, escape do identificador exibido e resposta ao `/start`, usando uma API Telegram simulada.
- `npm run check` terminou com código 0: integridade textual em 355 arquivos, ESLint, TypeScript, 80 testes Node e build de produção.
- Cobertura Node atual com `--experimental-test-coverage`: 35,49% de linhas, 70,59% de branches e 57,49% de funções. `gemini-news.ts` segue em 15,63% de linhas e 0% de funções; `telegram/bot.ts` chegou a 13,91% de linhas e 9,26% de funções. Os fluxos reais com provedores e banco continuam sem cobertura integrada.
- O teste `post-stats-rpc.test.ts` executa a migration exata em PGlite, uma build WASM de PostgreSQL, e confirma agregações acima de 1.000 linhas e exclusão de posts não publicados. PGlite está somente em `devDependencies`; `npm audit` após a inclusão reportou zero vulnerabilidades.
- Lighthouse 13.5.0 foi tentado na página inicial local usando o Chromium do Playwright. O relatório parcial trouxe acessibilidade 98, boas práticas 100 e SEO 100, mas retornou `NO_NAVSTART`, sem métricas de performance; o processo saiu com erro `EPERM` ao limpar o perfil temporário. Esses scores parciais não foram tratados como validação completa nem usados para alterar as notas.
- A suíte E2E foi executada novamente depois das mudanças no gate editorial e no adaptador SSR: 61 passaram e quatro testes redundantes foram ignorados, sem falhas, nas mesmas 12 rotas públicas e cinco viewports.

### Adendo — handler de estatísticas Edge — 25/09/2026

- Extraí a lógica HTTP de `post-stats` para um handler injetável e acrescentei cinco testes comportamentais: JSON/campos inválidos, preflight CORS e método, agregações/valores padrão, posts sem publicação, rate limit e falhas da dependência.
- A resposta HTTP de falha agora é genérica (`Erro interno`) para não expor texto de erro do PostgREST ao cliente. A consulta de dados continua no wrapper Deno e usa a RPC `get_post_stats` já validada em PGlite.
- `npx --yes deno@latest check supabase/functions/post-stats/index.ts` passou. A publicação da função e a migration SQL seguem sem verificação no Supabase remoto.
- Após a alteração, `npm run check` terminou com código 0: integridade textual aprovada em 357 arquivos, ESLint, TypeScript, 85 testes Node e build de produção. Cobertura: 36,52% de linhas, 72,38% de branches e 58,00% de funções; `post-stats-handler.ts` atingiu 100% de linhas e funções e 94,59% de branches.
- O teste direto do handler passou nos cinco casos. Não houve deploy nem chamadas ao Supabase remoto.
### Adendo — fallback de provedores editoriais — 28/09/2026

- Extraí a decisão entre modelos Gemini e fallback Groq para `src/lib/ai/provider-fallback.ts`, com chamadas de provedor e relógio injetáveis. O fluxo em `gemini-news.ts` mantém os modelos, prompt, prazo global, timeout, grounding sources e chamada Groq existentes.
- Acrescentei quatro testes sem rede: tentativa do próximo modelo após falha, fallback Groq após respostas vazias/falha, interrupção ao vencer o prazo e encerramento após resposta válida. Os testes também confirmam que prompt e prazo chegam ao fallback.
- `npm run check` terminou com código 0: integridade textual em 359 arquivos, lint, TypeScript, 89 testes e build. Cobertura: 37,10% de linhas, 73,08% de branches e 58,17% de funções. `provider-fallback.ts`: 100% de linhas e funções, 92,86% de branches; `gemini-news.ts`: 15,75% de linhas e 0% de funções.
- Nenhuma chamada real a Gemini/Groq, gravação no Supabase ou publicação foi executada. Os fluxos completos de geração continuam exigindo testes de integração adicionais.
### Adendo — prontidão local de produção — 28/09/2026

- `npm run production:check` foi executado novamente; retornou `ready:false` e código 1 conforme o gate de bloqueios. As chaves novas de Supabase e a chave pública VAPID não estão no ambiente local; os nomes das variáveis legadas ainda estão presentes; `weak_environment` está vazio.
- O endpoint PostgREST continua sem expor `admin_audit_log`, `admin_trash`, `backup_runs`, `notification_preferences` e `user_follows` (`PGRST205`). Há 62 versões locais únicas, mas o histórico remoto permanece sem confirmação.
- O último backup conhecido tinha 87,2 horas na leitura registrada e está classificado como obsoleto; a cópia segue incompleta. O gate também exige confirmar publicação da Edge Function de push, secret privado VAPID, crons de produção e compatibilidade do plano/duração das funções.
- O comando não consulta variáveis da Vercel nem valida esses itens externos. Não houve criação de backup, migração, deploy ou alteração remota nesta verificação.
- Uma nova tentativa de `vercel crons list` não produziu saída após cerca de 25 segundos e foi interrompida. Não houve mudança remota; o estado atual dos crons não foi confirmado nesta tentativa.

### Adendo — domínio personalizado orangebrick.blog — 28/09/2026

- O projeto local está vinculado à Vercel como `orange-brick`. A conta retornada pelo conector Sites não possui sites listados e não há `.openai/hosting.json` neste workspace; não usei esse serviço para associar o domínio.
- A consulta DNS pública encontrou os nameservers `horizon.dns-parking.com` e `orbit.dns-parking.com`, SOA `dns.hostinger.com`, registro A do apex `orangebrick.blog` em `2.57.91.91` e CNAME `www.orangebrick.blog` apontando para o apex. As consultas não retornaram respostas MX ou TXT naquele momento.
- Incluí no README e em `scripts/check-production-readiness.mjs` os passos para adicionar apex e `www` ao projeto Vercel, manter os nameservers atuais, configurar os registros exatos mostrados pela Vercel, ativar HTTPS, redirecionar `www` ao apex e definir `NEXT_PUBLIC_SITE_URL=https://orangebrick.blog` em Production.
- Não consegui adicionar o domínio à Vercel: não há `VERCEL_TOKEN` no ambiente nem arquivo local de autenticação Vercel reconhecido; `npx --yes vercel@latest domains add orangebrick.blog orange-brick` ficou sem saída por cerca de 40 segundos e foi interrompido. O domínio não foi adicionado e nenhum registro DNS foi alterado. O registro A/CNAME exato da Vercel permanece NÃO VERIFICADO.
- A zona DNS continua administrada pelos nameservers da Hostinger. Não há conector nem sessão Hostinger nesta execução, então a alteração da zona aguarda acesso ao painel e os valores exatos fornecidos após adicionar o domínio à Vercel. A documentação da Vercel orienta consultar `domains inspect` para os registros específicos; a Hostinger administra registros em Domains → Domain portfolio → Manage → DNS / Nameservers → DNS records.
- Referências oficiais: [configuração de domínio personalizado na Vercel](https://vercel.com/docs/domains/set-up-custom-domain) e [gerenciamento de registros DNS na Hostinger](https://support.hostinger.com/en/articles/1583249-how-to-manage-dns-records-at-hostinger).

### Adendo de atualização — domínio vinculado à Vercel após autenticação — 28/09/2026

- Este adendo substitui o estado operacional descrito acima: a autenticação da Vercel foi concluída e `orangebrick.blog` e `www.orangebrick.blog` foram adicionados ao projeto `orange-brick` sem forçar associação. A CLI confirmou os dois domínios vinculados ao projeto; não registrei código de dispositivo, token ou credencial.
- `npx vercel domains verify orangebrick.blog` e `npx vercel domains verify www.orangebrick.blog` foram executados em modo de verificação. Ambos retornaram `invalid-configuration` porque o DNS ainda não aponta para a Vercel. A saída de verificação recomenda estes registros específicos: `A @ → 216.198.79.1`, `A @ → 64.29.17.1` e `CNAME www → 6d8e277d90d3fa80.vercel-dns-017.com`. A saída também lista `76.76.21.21` e `cname.vercel-dns.com` como alternativas de prioridade inferior; usar os valores específicos da verificação atual.
- No momento da consulta, DNS público ainda retorna `A orangebrick.blog → 2.57.91.91` e `CNAME www.orangebrick.blog → orangebrick.blog`. Os nameservers continuam `horizon.dns-parking.com` e `orbit.dns-parking.com`. Nenhum registro DNS foi alterado; a edição permanece pendente no painel da Hostinger.
- O redirecionamento canônico de `www.orangebrick.blog` para `orangebrick.blog`, a ativação de HTTPS para ambos e a definição da variável de produção `NEXT_PUBLIC_SITE_URL=https://orangebrick.blog` ainda não foram confirmados. A configuração de redirect documentada pela Vercel é feita em Project Settings → Domains após os dois domínios estarem associados.
- Nenhum deploy foi iniciado. A variável de produção e qualquer publicação continuam pendentes até a validação DNS, HTTPS e resolução dos bloqueios de prontidão registrados acima.
- Referências oficiais: [configuração de domínio personalizado na Vercel](https://vercel.com/docs/domains/set-up-custom-domain), [redirecionamento de domínios na Vercel](https://vercel.com/docs/domains/working-with-domains/deploying-and-redirecting) e [gerenciamento de registros DNS na Hostinger](https://support.hostinger.com/en/articles/1583249-how-to-manage-dns-records-at-hostinger).

### Adendo de atualização — DNS existente e validação TLS — 28/09/2026

- A consulta DNS pública confirmou os registros já existentes informados pelo usuário: `A orangebrick.blog → 64.29.17.1` com TTL 300 e `CNAME www.orangebrick.blog → orangebrick.blog` com TTL 300, mantendo os nameservers da Hostinger. Não foi necessário criar registros duplicados.
- `npx vercel domains verify orangebrick.blog` e `npx vercel domains verify www.orangebrick.blog` retornaram `status: ok`, `configured-correctly` e nenhuma ocorrência. A Vercel aceita os registros atuais; embora ainda liste registros de prioridade recomendada, não pediu alteração para validar os domínios.
- `npx vercel certs ls` listou certificados para os dois domínios, renovação automática habilitada e cerca de 90 dias até o vencimento.
- A validação de resposta HTTPS por `curl.exe -I` para os dois domínios terminou com conexão resetada durante o handshake TLS. O mesmo cliente alcançou `https://vercel.com` com HTTP 200, mas o deployment `.vercel.app` listado como produção expirou por timeout. Portanto, a configuração DNS e a emissão dos certificados estão confirmadas; o carregamento HTTP da aplicação nesses endereços permanece NÃO VERIFICADO por esta estação.
- Durante essa tentativa, `npx vercel httpstat / --deployment orangebrick.blog` informou que precisava de um token de bypass de proteção, gerou um token automaticamente e depois falhou porque o executável `httpstat` não está instalado. O valor não foi exibido nem salvo em arquivo. Como esse tipo de token pode contornar Deployment Protection, a revogação do segredo mais recente em Project Settings → Deployment Protection → Protection Bypass for Automation fica pendente e deve ser concluída pelo responsável da conta. Referência: [documentação Vercel de bypass para automação](https://vercel.com/docs/deployment-protection/methods-to-bypass-deployment-protection/protection-bypass-automation).
- Nenhum deploy, alteração de DNS, alteração de variáveis de produção ou redirect de domínio foi executado nesta validação.

### Adendo de atualização — redirect canônico da Vercel — 28/09/2026

- Com autorização explícita do usuário, configurei no domínio de projeto `www.orangebrick.blog` o redirect para `orangebrick.blog` com status permanente HTTP 308, pela API oficial `PATCH /v9/projects/{idOrName}/domains/{domain}`. A consulta GET subsequente confirmou `verified: true`, `redirect: orangebrick.blog` e `redirectStatusCode: 308`.
- Não alterei os registros DNS nem criei deployment. O estado DNS continua validado pela Vercel.
- A validação HTTP externa ainda falha nesta estação: `http://www.orangebrick.blog` retornou 503, as conexões HTTPS para ambos os domínios foram resetadas no handshake TLS e o deployment `.vercel.app` expirou por timeout. `https://vercel.com` retornou 200. O redirect está confirmado pela API, mas o percurso completo do visitante até a aplicação segue NÃO VERIFICADO.
- A revogação do token de bypass de automação criado inadvertidamente pela tentativa anterior de `vercel httpstat` ainda está pendente no painel; nenhum valor foi exibido ou registrado. Ação necessária: revogar o segredo mais recente em Project Settings → Deployment Protection → Protection Bypass for Automation.
- Referências oficiais: [atualizar domínio de projeto via API](https://vercel.com/docs/rest-api/projects/update-a-project-domain), [configurar redirects de domínio](https://vercel.com/docs/domains/working-with-domains/deploying-and-redirecting) e [bypass de proteção de deployment](https://vercel.com/docs/deployment-protection/methods-to-bypass-deployment-protection/protection-bypass-automation).

### Adendo de revalidação — redirect e acesso HTTP — 28/09/2026

- Repeti `npx vercel domains verify` nos dois domínios; ambos seguem `status: ok`. `npx vercel alias list` confirmou `orangebrick.blog` e `www.orangebrick.blog` associados ao deployment Production atual. GET da API continua retornando o redirect `www.orangebrick.blog → orangebrick.blog` com status 308.
- Novos testes `curl` não conseguiram carregar a aplicação: HTTP em `www` retornou 503 e HTTPS foi resetado durante o handshake nos dois domínios, tanto no IP DNS atual quanto no segundo IP Vercel testado. O fetch web externo também não conseguiu abrir os domínios. O controle `https://vercel.com` funcionou com HTTP 200, mas a origem da falha específica dos domínios não pôde ser determinada.
- Não houve alteração adicional de domínio, DNS, deployment ou variável nesta repetição. Configuração e alias estão confirmados na Vercel; disponibilidade HTTP pública permanece NÃO VERIFICADA.

### Adendo — atualização do estado de produção e domínio — 28/09/2026

- `npx vercel crons list --project orange-brick` confirmou seis crons ativos em produção: `daily-poll` às 10 UTC, `drive-sync` às 08 UTC, `editorial-scheduler` às 14 UTC, `generate-daily` às 12 UTC, limpeza do radar às 06 UTC no primeiro dia do mês e retenção às 05 UTC. O cron publicado de geração não inclui `slot`; os três crons locais dos slots 12/17/20 (15/20/23 UTC) seguem marcados como `not deployed`. `drive-sync` não existe no checkout atual, mas seu artefato de rota está no deployment ativo; o SHA/handler servido não foi identificado.
- `npx vercel ls` listou o deployment Production mais recente como `Ready`, com idade de 33 dias. Esse estado não inclui as alterações locais posteriores nem comprova os fluxos delas em produção.
- `npx vercel env ls production --project orange-brick` confirmou nomes de variáveis sem registrar valores. `RAWG_API_KEY` continua ausente. As variáveis legadas `SUPABASE_SERVICE_ROLE_KEY` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` permanecem cadastradas junto das novas `SUPABASE_SECRET_KEY` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`; a listagem não comprova validade nem igualdade com as credenciais históricas. `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `CRON_SECRET` e `NEXT_PUBLIC_SITE_URL` também aparecem cadastradas; seus valores não foram lidos.
- As verificações anteriores da Vercel continuam indicando os dois domínios vinculados e corretamente configurados, certificados SSL emitidos, alias para Production e redirect 308 de `www.orangebrick.blog` para `orangebrick.blog`. O responsável confirmou que o domínio abriu pelo celular. A confirmação de acesso por celular é fornecida pelo usuário; não foi feita uma sondagem independente por rede móvel.
- O responsável confirmou que removeu o segredo de bypass de automação criado pela tentativa de `httpstat`. Essa confirmação encerra a pendência operacional; não foi feito readback independente do estado do segredo na Vercel.
- A estação de auditoria ainda recebeu uma página de bloqueio de rede com categoria `parked`. O responsável informou que a etapa de reclassificação não é mais necessária; a classificação em bases de terceiros e os bloqueios de redes administradas por terceiros ficam fora do escopo de remediação atual.
- Esta atualização foi somente leitura nas configurações da Vercel; nenhum segredo foi registrado e nenhum deploy, cron, DNS ou variável foi alterado.

### Complemento da auditoria — avatar e prontidão local — 28/09/2026

- **Esforço estimado:** M
# **[OB-20] A interface promete avatar de até 8 MB, mas a API limita a 4 MB**

- **Categoria:** UX
- **Severidade:** Baixa
- **Confiança:** Alta
- **Status:** CONFIRMADO
- **Tipo de evidência:** Estática
- **CVSS estimado:** N/A — UX
- **Localização:** `src/app/profile/setup/page.tsx:162`; `src/app/configuracoes/perfil/page.tsx:530`; `src/app/api/user/avatar/route.ts:7,30`
- **Evidência:**

```tsx
<span className="text-xs text-brand-orange">Até 8 MB</span>
```

```ts
const MAX_AVATAR_BYTES = 4 * 1024 * 1024;
if (file.size > MAX_AVATAR_BYTES) return NextResponse.json({ error: "A imagem deve ter no máximo 4 MB" }, { status: 413 });
```

- **Descrição:** As telas de criação e edição de perfil informam um limite de 8 MB, mas a rota de avatar rejeita arquivos acima de 4 MB. No cadastro, o arquivo original é enviado antes da inserção do perfil; a resposta 413 interrompe o fluxo e mostra a mensagem do servidor.
- **Mitigações verificadas:** Busquei referências a limites de tamanho nos dois fluxos de interface e nas rotas de avatar/banner. O fluxo de cadastro e o de edição enviam o `File` original; não há validação ou compressão no cliente antes do POST. As rotas de avatar e banner aplicam 4 MB no servidor. A informação de 8 MB aparece nas duas telas de avatar; a tela de banner não anuncia esse limite.
- **Impacto:** Uma imagem válida entre 4 MB e 8 MB parece aceita, mas não pode ser usada. No cadastro, isso impede concluir a criação do perfil até remover/trocar a imagem; na edição, o avatar permanece inalterado.
- **Como verificar/reproduzir com segurança:** 1. Entre em `/profile/setup` ou `/configuracoes/perfil`. 2. Escolha um JPEG, PNG, WebP ou AVIF com tamanho entre 4 MB e 8 MB. 3. No cadastro, clique em “Criar Perfil”; na edição, selecione a foto. 4. A rota `/api/user/avatar` responde 413 com limite de 4 MB, contrariando o texto exibido.
- **Solução recomendada:** Alinhar as duas mensagens para 4 MB, ou redimensionar/comprimir no cliente e ainda validar o tamanho final; manter a validação de limite na API.
- **Exemplo corrigido:**

```tsx
<Field label="Foto de perfil" hint="JPG, PNG, WebP ou AVIF. Até 4 MB.">
```
- **Esforço estimado:** P


### Estado atualizado da auditoria e validação local — 28/09/2026

- O inventário e as fases de análise inicial estão concluídos; a cobertura continua parcial para a exigência de examinar todos os fluxos: o navegador percorreu 12 rotas públicas, enquanto páginas autenticadas/admin, mutações reais e parte das 37 páginas/33 endpoints não foram exercitadas ponta a ponta. A revisão manual foi profunda nos arquivos ligados aos achados, mas não linha por linha nos 484 arquivos.
- A suíte mais recente registrada passou em 61 verificações E2E e ignorou quatro verificações repetidas de links; axe, teclado e overflow foram exercitados nas 12 páginas públicas e viewports da suíte. O Lighthouse ainda não forneceu métricas de performance utilizáveis. Testes integrados com provedores reais, banco e publicação continuam pendentes.
- Nova execução de `npm run production:check` retornou `ready:false` (código 1, resultado esperado do gate). No ambiente local faltam `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` e `SUPABASE_SECRET_KEY`; variáveis Supabase legadas seguem presentes e `weak_environment` está vazio. Isso descreve apenas o ambiente local, não a presença/validade dos valores na Vercel.
- A API PostgREST retornou `PGRST205` para `admin_audit_log`, `admin_trash`, `backup_runs`, `notification_preferences` e `user_follows`; três das oito relações consultadas responderam. Existem 62 versões de migration locais, mas o ledger remoto não foi confirmado.
- O backup local mais recente conhecido, de 25/09/2026 01:35:41 UTC, continua incompleto e tinha cerca de 89,1 horas na execução do gate. A cópia externa durável e o teste de restauração seguem sem comprovação.
- Permanecem não confirmados pelo gate: publicação da Edge Function de notificações push, segredo privado VAPID, agenda efetiva dos crons, plano/duração das funções e configuração da URL pública no runtime. A leitura da Vercel já confirma que os crons locais de 12h/17h/20h não correspondem aos crons atualmente publicados; a mudança local ainda não foi implantada.
- Nenhum arquivo do produto, migration remota, DNS, variável Vercel ou deployment foi alterado durante este complemento. A única escrita desta continuação foi este relatório.

### Complemento da auditoria — completude da exportação de dados — 28/09/2026

- **Esforço estimado:** P
# **[OB-21] A cópia baixável omite dados pessoais vinculados à conta**

- **Categoria:** Segurança
- **Severidade:** Média
- **Confiança:** Alta
- **Status:** CONFIRMADO
- **Tipo de evidência:** Estática
- **CVSS estimado:** N/A
- **Localização:** `src/lib/user-data-export.ts:3-15`; `src/components/ui/PrivacyControls.tsx:29-82`; `src/app/api/user/data/route.ts:53-181`; `src/components/community/ArticleCommunityNotes.tsx:27-49,76-112`; `src/components/community/BrickCard.tsx:248-264`; `src/app/admin/settings/page.tsx:25-46`; `src/app/lancamentos/ReleasesPageClient.tsx:210-262`; `supabase/migrations/20260727000000_brickboard_progression.sql:161-220,284-307`; `supabase/migrations/20260803000001_reader_experience.sql:1-16`; `supabase/migrations/20260728000008_community_safety.sql:1-11`; `supabase/migrations/20260803000007_quality_operations.sql:1-5`; `supabase/migrations/20260728000012_admin_preferences.sql:1-6`; `supabase/migrations/20260725000000_release_hype_meter.sql:1-8`
- **Evidência:**




```sql
create table if not exists public.community_notes (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null check (char_length(content) between 40 and 500),
```

```sql
create table if not exists public.community_note_votes (
  note_id uuid not null references public.community_notes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (note_id, user_id)
);
```

```sql
create table if not exists public.admin_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  default_author text not null default 'Redação' check (char_length(default_author) between 1 and 80),
```

- **Descrição:** A interface oferece “Baixar meus dados” e monta o arquivo percorrendo `USER_DATA_EXPORT_DATASETS`, que inclui 11 conjuntos. A rota não exporta vários registros associados diretamente a `auth.users`: `user_progress`, `xp_events`, `user_achievements`, `user_rewards`, `season_progress`, `user_follows`, `notification_preferences`, `release_hype_votes`, `community_reports`, `community_notes`, `community_note_votes` e `admin_preferences`. Os fluxos de denúncias, notas/votos da comunidade e preferências administrativas também são usados pela aplicação. A exportação precisa selecionar apenas os dados do titular e evitar expor dados pessoais de terceiros em registros compartilhados.
- **Mitigações verificadas:** Comparei a lista completa do manifesto e cada caso `switch` de `/api/user/data` com a busca em todas as migrações locais por referências a `auth.users`. Confirmei os fluxos de notas/votos em `ArticleCommunityNotes`, denúncias em `BrickCard`, preferências em `/admin/settings` e votos de lançamentos em `ReleasesPageClient`; a resposta sem `dataset` inclui perfil e newsletter. O fluxo cobre comentários, reações e outras tabelas de comunidade que já estão no manifesto, mas não as tabelas citadas acima. Busquei cobertura em `tests/` e `e2e/`; não encontrei teste de completude da exportação. `game_clubs` e `game_club_members` aparecem nas migrações e nos tipos, mas não localizei uso em `src/`, então não os classifiquei como omissões confirmadas de um fluxo ativo. O schema remoto e um eventual processo manual de atendimento não foram verificados.
- **Impacto:** O arquivo autogerado não é uma cópia completa dos dados de conta mantidos localmente. Isso pode tornar incompleto o atendimento de pedidos de acesso ou portabilidade quando esses dados forem abrangidos; a aplicação concreta da LGPD/GDPR ao conjunto de dados e aos dados derivados requer avaliação do controlador. Referências: [LGPD, arts. 18 e 19](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm) e [GDPR, arts. 15 e 20](https://eur-lex.europa.eu/eli/reg/2016/679/oj).
- **Como verificar/reproduzir com segurança:** 1. Em staging, use uma conta de teste com XP/progresso, preferências, uma denúncia, uma nota/voto de nota e votos de lançamento. 2. Baixe “meus dados” pela interface. 3. Abra o JSON e confira que não há conjuntos para `user_progress`, `user_follows`, `community_reports`, `community_notes`, `community_note_votes` ou `release_hype_votes`, embora essas tabelas e fluxos existam localmente.
- **Solução recomendada:** Definir com o controlador o inventário exportável, incluir todos os dados pessoais abrangidos e implementar um caso paginado por conjunto, sempre filtrado pelo `user.id` e com projeção explícita de colunas. Para tabelas compartilhadas, decidir o tratamento de conteúdo de terceiros antes de exportar. Adicionar um teste que cria registros nos conjuntos incluídos e valida titularidade, paginação e exclusão de dados de outros usuários.
- **Exemplo corrigido:**

```ts
const page = await serviceClient
  .from("community_notes")
  .select("id,post_id,content,source_url,status,created_at")
  .eq("user_id", user.id)
  .order("id")
  .range(start, end);
```
- **Esforço estimado:** M


- O inventário de endpoints e fluxos privados foi revisitado nos handlers de exportação, exclusão de conta, notificações, votos e nas rotas administrativas de conteúdo, imagens, comunidade e contatos. As proteções observadas incluem validação de sessão/`is_admin`, filtros pelo usuário autenticado e validação de URLs remotas antes de importação. Não registrei novo bypass de autorização nesta rodada; a conclusão não substitui testes ponta a ponta autenticados nem validação do banco remoto.
- Revisei os workflows atuais: `deploy.yml` limita o `GITHUB_TOKEN` a `contents: read` e fixa as Actions por SHA; `news-generator.yml` é manual, limita os horários, não concede permissões ao `GITHUB_TOKEN` e usa `CRON_SECRET` como secret. Não encontrei segredo hardcoded ou execução do deploy nesses arquivos. A configuração externa que liga repositório, build e deploy na Vercel não é declarada por esses workflows e permanece NÃO VERIFICADA.

### Complemento da auditoria — falha ao consultar preferências de push — 28/09/2026

# **[OB-22] Erro ao ler preferências não impede o envio de push**

- **Categoria:** Segurança
- **Severidade:** Média
- **Confiança:** Alta
- **Status:** CONFIRMADO
- **Tipo de evidência:** Estática
- **CVSS estimado:** N/A
- **Localização:** `supabase/functions/send-push-notification/index.ts:169-172,199-203`; `supabase/migrations/20260803000001_reader_experience.sql:9-16`; `scripts/check-production-readiness.mjs:30-35,117-126`
- **Evidência:**

```ts
const { data: preferences } = await supabase.from("notification_preferences").select("brickboard_replies").eq("user_id", recipientId).maybeSingle();
if (preferences && preferences.brickboard_replies === false) return json({ sent: 0, total: 0, skipped: "preference" });
```

```ts
const { data: optedOut } = await supabase.from("notification_preferences").select("user_id").eq("breaking_news", false);
const optedOutIds = new Set((optedOut || []).map((row) => row.user_id));
eligibleSubscriptions = eligibleSubscriptions.filter((subscription) => !subscription.user_id || !optedOutIds.has(subscription.user_id));
```

- **Descrição:** Os dois caminhos de envio ignoram `error` retornado ao consultar `notification_preferences`. Se a consulta falhar, `data` fica nulo: a notificação comunitária continua para o destinatário e o broadcast de notícias considera a lista de opt-out vazia. O helper `allowsNotification` existe em `src/lib/operations.ts`, mas a busca por chamadas mostra apenas sua definição; ele não é usado para mitigar esses caminhos.
- **Mitigações verificadas:** O fluxo comunitário autentica o usuário e valida que ele executou a reação/comentário/repost; o broadcast exige `app_metadata.is_admin`. Isso controla quem pode acionar o evento, mas não protege a preferência do destinatário. A tela de configurações lê e grava a mesma tabela e exibe falha ao salvar. `npm run production:check` foi reexecutado em modo somente leitura e retornou `PGRST205` para `notification_preferences`; portanto a relação não está disponível na API consultada. O código da Edge Function atualmente publicado não foi confirmado, então não afirmo que a versão remota executa este trecho local.
- **Impacto:** Se houver preferências de opt-out armazenadas, qualquer falha transitória ao lê-las faz a função prosseguir como se todas estivessem habilitadas. O estado atual PGRST205 também impede confirmar ou gerenciar as preferências pela API; a existência de linhas remotas não foi verificada.
- **Como verificar/reproduzir com segurança:** 1. Em staging, grave `brickboard_replies=false` para uma conta com push ativo. 2. Faça a consulta da tabela falhar (ou simule `PGRST205`/erro de rede) e acione um evento comunitário que gere push. 3. Observe que a função não retorna `skipped: "preference"` e continua à consulta de assinaturas/envio. Para notícias, simule erro na consulta de `breaking_news=false` e confirme que a lista de assinaturas não é filtrada.
- **Solução recomendada:** Tratar erro da leitura de preferências como falha fechada: retornar 503 sem enviar, registrar o erro sem dados pessoais e permitir retry idempotente. Validar que a migration da tabela foi aplicada e exposta antes de habilitar o envio.
- **Exemplo corrigido:**

```ts
const { data: preferences, error } = await supabase.from("notification_preferences").select("brickboard_replies").eq("user_id", recipientId).maybeSingle();
if (error) return json({ error: "Não foi possível validar as preferências" }, 503);
if (preferences?.brickboard_replies === false) return json({ sent: 0, total: 0, skipped: "preference" });
```
- **Esforço estimado:** M


- A nova execução do gate confirmou `ready:false`; três das oito tabelas consultadas responderam e `notification_preferences` continua em `PGRST205`. O backup local estava com 89,6 horas e classificado como obsoleto. Não houve escrita em Supabase, alteração de preferências, envio de push, deploy ou modificação de código.

### Complemento da auditoria — CORS e revogação de push no domínio próprio — 28/09/2026

# **[OB-23] CORS das funções de push permite apenas a origem antiga da Vercel**

- **Categoria:** Bug
- **Severidade:** Média
- **Confiança:** Alta
- **Status:** CONFIRMADO
- **Tipo de evidência:** Dinâmica
- **CVSS estimado:** N/A — falha de configuração CORS
- **Localização:** `supabase/functions/_shared/platform.ts:3-11`; `src/lib/supabase/functions.ts:6-16`; chamadores `src/components/NotificationBell.tsx:96-105,150-158,182-188` e `src/lib/hooks/useCommunityFeed.ts:40-43`
- **Evidência:**

```ts
const corsOrigin = configuredSiteUrl && configuredSiteUrl !== "http://localhost:3000"
  ? configuredSiteUrl
  : "https://orange-brick.vercel.app";

export const corsHeaders = {
  "Access-Control-Allow-Origin": corsOrigin,
```

- **Descrição:** O helper usa `SITE_URL` quando configurada e, caso contrário, permite `https://orange-brick.vercel.app`. Em 29/09/2026, enviei preflight `OPTIONS` sem autenticação às funções `manage-push-subscription` e `send-push-notification`, com as origens `https://orangebrick.blog`, `https://www.orangebrick.blog` e `https://orange-brick.vercel.app`. As seis respostas foram HTTP 200, mas todas retornaram `Access-Control-Allow-Origin: https://orange-brick.vercel.app`. O navegador bloqueia a resposta para as duas origens próprias. A listagem de secrets confirma o nome `SITE_URL`, atualizado em 13/08/2026, antes da configuração do domínio; o valor não foi lido. Assim, a origem efetiva antiga pode vir do valor desatualizado ou da versão/configuração implantada, sem distinção comprovada.
- **Mitigações verificadas:** `invokeFunction` envia `Authorization`, `apikey` e `Content-Type: application/json`, então o browser realiza preflight. O helper central define uma origem única. `send-push-notification` também é chamado pelo servidor em fluxo editorial, que não depende de CORS. A verificação foi somente `OPTIONS`; não enviei POST nem alterei inscrições/notificações.
- **Impacto:** Navegadores abertos em `orangebrick.blog` bloqueiam inscrição e revogação de push e a chamada comunitária de notificação às Edge Functions. A configuração DNS/HTTPS do domínio segue válida e é independente deste defeito.
- **Como verificar/reproduzir com segurança:** Envie `OPTIONS` ao endpoint `/functions/v1/manage-push-subscription` e a `/functions/v1/send-push-notification` com `Origin: https://orangebrick.blog`, `Access-Control-Request-Method: POST` e `Access-Control-Request-Headers: authorization,apikey,content-type`. Ambos respondem 200 e anunciam `https://orange-brick.vercel.app`; repita com `www` para obter o mesmo resultado.
- **Solução recomendada:** Atualizar o secret `SITE_URL` das Edge Functions para `https://orangebrick.blog`; conferir se a versão ativa de cada função usa a configuração atual e redeployar se necessário. Repetir os dois preflights; só permitir `www` separadamente se páginas forem realmente servidas nessa origem, sem substituir a allowlist por `*`.
- **Exemplo corrigido:**

```env
SITE_URL=https://orangebrick.blog
```
- **Esforço estimado:** M


### Revalidação segura em 05/10/2026

Enviei apenas `OPTIONS` de preflight, sem autenticação, para as duas funções de push usando `Origin: https://orangebrick.blog`. Ambas responderam HTTP 200 com `Access-Control-Allow-Origin: https://orange-brick.vercel.app`. Nenhum `POST`, envio de push ou alteração de assinatura foi realizado.

```text
manage-push-subscription: HTTP 200; allow-origin=https://orange-brick.vercel.app
send-push-notification: HTTP 200; allow-origin=https://orange-brick.vercel.app
```

- **Esforço estimado:** M
# **[OB-24] Revogar preferências marca sucesso sem remover a assinatura de push**

- **Categoria:** Segurança
- **Severidade:** Média
- **Confiança:** Alta
- **Status:** CONFIRMADO
- **Tipo de evidência:** Estática
- **CVSS estimado:** N/A
- **Localização:** `src/components/ui/PrivacyControls.tsx:90-106`; `src/lib/consent.ts:31-36`; `supabase/functions/manage-push-subscription/index.ts:19-22`
- **Evidência:**

```tsx
await invokeFunction("manage-push-subscription", {
  action: "unsubscribe",
  endpoint: subscription.endpoint,
});
await subscription.unsubscribe();
```

```tsx
} catch {
  setMessage("Preferências locais apagadas. A revogação do push será repetida pelo navegador.");
}
clearConsent();
setMessage("Preferências opcionais removidas. O banner será exibido novamente na próxima visita.");
```

- **Descrição:** A tela aguarda a remoção remota antes de cancelar a assinatura no navegador. Se a chamada remota falhar, o `catch` pula `subscription.unsubscribe()`. Mesmo assim, o código limpa o consentimento local e substitui a mensagem de erro por uma confirmação de sucesso. Não encontrei rotina que repita a remoção prometida pela mensagem. O preflight remoto atual para `manage-push-subscription` não aceita a origem do site, então esse erro é reproduzível no domínio próprio.
- **Mitigações verificadas:** `clearConsent()` remove apenas as chaves locais de consentimento e de identidade; não cancela a PushSubscription. O botão separado de `NotificationBell` cancela primeiro a assinatura do navegador e depois tenta remover a linha remota, mas o fluxo “Revogar preferências” desta tela usa outra ordem e mascara a falha. Não encontrei fila, job ou retry para completar a revogação no servidor.
- **Impacto:** A pessoa pode receber confirmação de que revogou as preferências enquanto a assinatura local e o registro remoto continuam ativos. Quando a entrega de push estiver funcional, notificações opcionais podem continuar chegando após a tentativa de revogação.
- **Como verificar/reproduzir com segurança:** 1. Em `orangebrick.blog`, use um navegador com push ativo. 2. Clique em “Revogar preferências” e provoque a falha CORS observada em OB-23. 3. A interface confirma a remoção; consulte `registration.pushManager.getSubscription()` e verifique que a assinatura permanece.
- **Solução recomendada:** Desativar a assinatura local mesmo se a remoção remota falhar; preservar um estado pendente de limpeza para retry; não mostrar confirmação completa até concluir ambos os passos. Mostrar claramente quando a remoção no servidor ainda está pendente.
- **Exemplo corrigido:**

```tsx
const endpoint = subscription?.endpoint;
if (subscription && !(await subscription.unsubscribe())) throw new Error("Não foi possível desligar os alertas neste aparelho.");
clearConsent();
try {
  if (endpoint) await invokeFunction("manage-push-subscription", { action: "unsubscribe", endpoint });
  setMessage("Preferências opcionais removidas.");
} catch {
  setMessage("Alertas desligados neste aparelho; a remoção no servidor está pendente.");
}
```
- **Esforço estimado:** M


## Retomada da auditoria — 28/09/2026

- **Acesso ao domínio:** o responsável confirmou que o site abriu corretamente; a etapa de troubleshooting de DNS, certificado e acesso entre redes está encerrada conforme essa confirmação. Não repetirei essas sondagens. A confirmação veio do responsável e não equivale a uma medição independente em várias redes.
- **Achados da auditoria:** 67 no total (1 crítico, 2 altos, 46 médios e 18 baixos); o Top 20 contém 20 itens. Os achados OB-23 e OB-24 continuam separados da conectividade geral: tratam do CORS das Edge Functions de push e da revogação incompleta no navegador.
- **O que falta para concluir a auditoria:**
  1. Validar em ambiente de teste os fluxos autenticados/admin e as mutações, incluindo replay de push comunitário; a auditoria atual evitou executar ações reais e não teve sessão de teste.
  2. Fazer varreduras estáveis após 2,2 s para as 37 páginas em 320/375/390/768/1280/2560 px e conferir conteúdo dinâmico. A matriz de snapshots de 500 ms cobriu as 222 combinações de rota e viewport; retestes estáveis cobriram caminhos selecionados, mas a cobertura estável completa e o conteúdo real ainda faltam. Também falta validar estados autenticados. `/profile/[nickname]` usou um slug inexistente; páginas administrativas redirecionaram ao login e os fluxos de e-mail ficaram desligados pela configuração local.
  3. Obter métricas Lighthouse válidas; em 28/09, Lighthouse 13.5.0 com Edge chegou a `CHROME_INTERSTITIAL_ERROR`, terminou em `chrome-error://chromewebdata/` e não gerou métricas utilizáveis; a limpeza do perfil temporário também retornou `EPERM`.
  4. Confirmar o ledger de migrações e a configuração implantada do Supabase/Vercel; a CLI do Supabase não concluiu a consulta e o gate local segue `ready:false`.
  5. Demonstrar backup completo fora da máquina e restauração em ambiente isolado; o snapshot consultado está incompleto.
  6. Continuar a revisão manual dos arquivos e fluxos que ainda não foram examinados individualmente; os scanners ampliam a cobertura, mas não substituem essa revisão.
- **Progresso desta retomada:** ampliei OB-21 após cruzar migrações e fluxos ativos de exportação, denúncias, notas, votos de lançamento, preferências administrativas e normalização de e-mail; confirmei OB-29 para falha parcial de exclusão, OB-30 para objetos públicos órfãos após troca de avatar/banner e OB-31 para ausência de MFA/AAL2 imposto pela aplicação administrativa. Verifiquei as permissões da tabela de perfis: o usuário só atualiza uma lista explícita de colunas, `is_official` é excluído e o trigger recalcula esse campo; a RPC de cosméticos valida titularidade e recompensas. Acrescentei OB-32 para `active_days` retornado sem controle pela RPC pública, OB-33 para upload de avatar incompatível com o estado de cadastro sem perfil e OB-34 para leitura sem paginação de posts no painel de saúde. Cruzei a navegação do painel e políticas RLS/grants para notas, preferências, matérias e lançamentos; não encontrei escalada nos caminhos lidos. Ampliei OB-02 porque o painel de saúde transforma erros conhecidos de schema em estados vazios. Revisei as sete Edge Functions, configurações e chamadores; identifiquei em OB-35 que o cron chama a função de push com uma chave de serviço, enquanto a função exige token de usuário e autorização administrativa. Acrescentei OB-36: o handler comunitário aceita reenvio autenticado de uma ação que continua existente, sem idempotência/limite nesse endpoint; o service worker marca a notificação com `renotify` quando há tag. Na revisão manual da caixa de contatos, confirmei OB-37: a consulta administrativa retorna no máximo 100 linhas e a interface não oferece paginação ou outro acesso às mensagens anteriores. Acrescentei OB-38 após ler o caminho de alertas de denúncias: o lock global é consultado e gravado em operações separadas, permitindo que execuções concorrentes processem o mesmo aviso. Revisei os endpoints públicos de erro, engajamento e notícias; em OB-39 registrei que a lista descarta respostas não-2xx e reativa o observador ao alternar o estado de carregamento, permitindo repetição automática da mesma página após `429`/falha de rede. Em OB-40 registrei que `/api/errors` ignora falhas dos RPCs de limite e gravação e ainda responde 204, deixando a telemetria de erros sem evidência de falha. Na revisão de SEO/RLS, acrescentei OB-41 porque uma justificativa editorial de matéria curta permanece na linha publicada e é retornada por uma consulta pública com `select("*")`; o componente recebe a linha inteira embora a justificativa só seja mostrada em rascunhos. A execução remota da migration não foi verificada. Revisei também notificações, callback OAuth, contexto de autenticação, login administrativo, recuperação de senha e perfil; não confirmei bypass de autorização fora do controle de segundo fator ausente. A configuração global de MFA no Supabase não foi verificada. Descartei a suspeita de cursor numérico em visualizações porque `post_views.id` é UUID. Nesta continuação, li as páginas de busca, matérias em alta, notificações, conquistas e ranking; confirmei em OB-42 o risco de a tela de notificações salvar os valores padrão após uma falha de leitura e o envio silencioso sem sessão. OB-43 registra que falhas de RPC no ranking/conquistas são apresentadas como ausência de dados/progresso. Reconfirmei o inventário do workspace. Não alterei código nem configurações do site.
- **Medição Lighthouse desta retomada:** `npx --yes lighthouse@latest https://orangebrick.blog --preset=desktop --output=json` com Edge definido por `CHROME_PATH` gerou artefato temporário, mas o resultado contém `runtimeError.code = CHROME_INTERSTITIAL_ERROR` e `finalDisplayedUrl = chrome-error://chromewebdata/`; não há métricas válidas. O encerramento também falhou ao remover o perfil temporário com `EPERM`. Isso descreve a execução nesta estação e não confirma indisponibilidade geral do domínio.
- **Rechecagem da pré-condição Lighthouse:** a estação tem Edge, mas não encontrou executável Chrome; `curl.exe -I --max-time 15 https://orangebrick.blog` retornou erro 35, conexão reiniciada. Não refiz diagnóstico de DNS/domínio e não obtive métricas; este resultado não contradiz a confirmação de acesso no celular.
- **Achado comunitário desta continuação:** no feed, o resultado da enquete é agregado no navegador a partir de `community_poll_votes`, mas a única policy `SELECT` local restringe cada sessão ao próprio `user_id`; acrescentei OB-44 e verifiquei que não há policy pública ou RPC agregadora nas migrations lidas.
- **Achado de permissões comunitárias:** a policy local menciona `anon` para leitura de reações, mas a migration só concede `SELECT` na tabela a `authenticated`; o cliente descarta o erro e converte os contadores ausentes em zeros. Acrescentei OB-45; a solução deve preservar a privacidade das linhas individuais.
- **Achado de desempenho comunitário:** o hook consulta o feed e todas as reações/comentários sem limite ou cursor e repete as consultas após eventos realtime; o limite padrão documentado do Supabase é 1.000 linhas, mas a configuração remota não foi consultada. Acrescentei OB-46.
- **Achado de ordenação do feed:** a consulta inicialmente ordena por `is_pinned`, mas a camada cliente substitui essa ordem ao ordenar todos os posts apenas por `created_at`. Acrescentei OB-47.
- **Achado de expiração da enquete:** o prompt vence às 23h59 no fuso de Brasília, mas a rota de feed não filtra `expires_at`; o cron seguinte está marcado às 10:00 UTC (07:00 em Brasília) e a validação do voto rejeita a opção vencida. Acrescentei OB-48. [A Vercel usa UTC nos crons](https://vercel.com/docs/cron-jobs).
- **Achado de anexos do Brickboard:** a leitura local encontrou apenas Data URL de `FileReader` passado diretamente a `media_url`; a coluna da migration rejeita valores que não começam com HTTP(S), e não localizei caminho de upload a Storage para essa publicação. Acrescentei OB-49.
- **Achado de mutação comunitária:** ao trocar o tipo de reação, o hook apaga a linha existente antes de inserir a nova em uma chamada separada; após erro, o refetch confirma a ausência da reação anterior. A migration já contém policy `UPDATE` por titularidade, mas o hook não a usa. Acrescentei OB-50.
- **Achado de republicação comunitária:** se a gravação falha, o hook registra `operationError` sem rejeitar a promise; o componente então limpa o comentário e fecha o formulário. O aviso de erro global existe, mas não preserva o rascunho. Acrescentei OB-51.
- **Achado de notas comunitárias:** a avaliação otimista mostra confirmação antes de verificar o retorno da gravação e ignora erros de INSERT/DELETE, sem reverter os votos ou a contagem no componente. Acrescentei OB-52.
- **Achado de edição/exclusão no Brickboard:** os handlers fecham seus diálogos quando os callbacks resolvem; o hook captura erro de delete/edit e não rejeita a promise, e a exclusão também só registra no console. Acrescentei OB-53.
- **Achado de privacidade em curtidas:** migrations locais permitem leitura `anon` das linhas de curtidas de comentários com `user_id` e `comment_id`; a view de perfil expõe `user_id` e nickname, permitindo associar ações a perfis. A publicação remota das migrations não foi consultada. Acrescentei OB-54.
- **Achado de erros das notas:** `loadNotes` ignora o campo `error` da consulta e `submit` não envolve a promise em `try/catch`; uma falha de leitura parece não haver nota, e uma rejeição de rede no envio não chega ao alerta de status. Acrescentei OB-55.
- **Achados de threads de comentários:** os renderizadores `CommentList` e BrickCard mostram apenas raízes e respostas diretas, enquanto as policies de INSERT deixam `parent_id` apontar para outra resposta; acrescentei OB-56. A consulta de schema do PostgREST para `comments?select=id,parent_id&limit=0` retornou HTTP 200, mas `rg parent_id supabase/migrations` não encontrou `ADD COLUMN` para `public.comments`; registrei a divergência como OB-57 e não como falha atual de produção.
- **Achado de exclusão de comentários de matérias:** `useComments.deleteComment` chama DELETE, mas as migrations habilitam RLS e criam somente policies SELECT/INSERT para `public.comments`; não encontrei policy nem grant de DELETE nas migrations. A ação do proprietário aparece no UI, mas o banco rejeita a operação. Acrescentei OB-58.
- **Arquivos lidos nesta etapa:** revisei os demais handlers de `BrickCard`, os fluxos de notas em `ArticleCommunityNotes`/`useComments`, o modal de enquete e as policies/grants correspondentes. Também examinei o sanitizador URL instalado em `node_modules/react-dom/cjs/react-dom-client.development.js:3348-3350`; ele bloqueia protocolo `javascript:` em atributos URL do React, então descartei essa hipótese de XSS.
- **Validação histórica do relatório:** a conferência inicial registrou 55 IDs, 1 crítico, 2 altos, 38 médios e 14 baixos. A validação atualizada está no adendo mais recente; cada achado deve conter os campos obrigatórios e evidência de até 10 linhas.

- **Esforço estimado:** M
# **[OB-49] O banco rejeita imagens anexadas a novos Bricks**

- **Categoria:** Bug
- **Severidade:** Média
- **Confiança:** Alta
- **Status:** CONFIRMADO
- **Tipo de evidência:** Estática
- **CVSS estimado:** N/A
- **Localização:** `src/components/community/ComposeBrickModal.tsx:54-74,81-88`; `src/app/brickboard/page.tsx:675-679`; `src/lib/hooks/useCommunityFeed.ts:251-282`; `supabase/migrations/20260723000000_community.sql:1-11`
- **Evidência:**


```tsx
onPublish={async (content, tag, article, media) => {
  await addPost(content, tag, article, media || inlineMediaUrl || undefined);
  setInlineMediaUrl(null);
  void trackXp();
}}
```

```ts
const { error } = await supabase.from("community_posts").insert({
  user_id: user.id,
  author_name: authorName,
  author_username: profile?.username || null,
  author_avatar: authorAvatar,
  content,
  platform_tag: platformTag || null,
  attached_article: attachedArticle || null,
  media_url: mediaUrl || null,
```

```sql
media_url text check (media_url is null or media_url ~ '^https?://'),
```

- **Descrição:** O seletor aceita uma imagem e `FileReader.readAsDataURL` produz uma string `data:image/...;base64,...`. Esse valor é passado sem conversão ao `addPost` e gravado em `community_posts.media_url`, cuja restrição aceita apenas valores começando por `http://` ou `https://`. Não encontrei etapa intermediária de upload para Storage nesse fluxo. Portanto, a publicação de um Brick com anexo é rejeitada pelo banco.
- **Mitigações verificadas:** A interface limita o arquivo a 5 MB e verifica se o MIME começa com `image/`; essas validações não transformam a Data URL em URL HTTP(S). Busquei todos os usos de `mediaUrl`, `readAsDataURL` e `media_url` em `src/` e migrations: a publicação passa diretamente o valor ao insert e a restrição não foi alterada por outra migration local. O estado do schema remoto não foi verificado.
- **Impacto:** A funcionalidade de anexar imagem ao Brick não conclui a publicação para nenhum arquivo escolhido; o usuário pode perder tempo escrevendo e selecionar mídia que nunca é salva. O post sem imagem continua funcionando.
- **Como verificar/reproduzir com segurança:** 1. Em staging, entre em uma conta e abra o compositor do Brickboard. 2. Escolha uma imagem PNG/JPEG menor que 5 MB, escreva um texto e publique. 3. Confirme que `FileReader` produz uma Data URL, o insert envia esse valor a `media_url` e a restrição PostgreSQL rejeita a linha por não começar com HTTP(S).
- **Solução recomendada:** Enviar o `File` para um bucket de Storage com política de titularidade, validar tamanho/MIME e obter uma URL HTTP(S) controlada pelo Orange Brick antes de inserir o post. Usar a Data URL somente para preview local. Adicionar teste para imagem anexada, rejeição do upload e publicação sem imagem.
- **Exemplo corrigido:**

```ts
const mediaUrl = selectedFile
  ? await uploadCommunityImage(selectedFile, user.id)
  : undefined;
if (mediaUrl && !/^https?:\/\//i.test(mediaUrl)) throw new Error("URL de imagem inválida");
await addPost(content, platformTag, attachedArticle, mediaUrl);
```
- **Esforço estimado:** M


`uploadCommunityImage` deve fazer upload autenticado e devolver apenas a URL HTTP(S) validada; não armazenar a Data URL inteira em `media_url`.

# **[OB-50] A troca de reação pode apagar a reação anterior em falha**

- **Categoria:** Bug
- **Severidade:** Média
- **Confiança:** Alta
- **Status:** CONFIRMADO
- **Tipo de evidência:** Estática
- **CVSS estimado:** N/A
- **Localização:** `src/lib/hooks/useCommunityFeed.ts:315-355`; `supabase/migrations/20260723000000_community.sql:17-26`; `supabase/migrations/20260722000000_community_fixes.sql:1-8`
- **Evidência:**

```ts
} catch (cause) {
  setOperationError(getCommunityErrorMessage(cause));
  setPosts((prevPosts) => prevPosts.map((post) => post.id === postId ? previousPost : post));
  await fetchData();
  return false;
}
```

```sql
unique (post_id, user_id)
```

```sql
create policy community_reactions_update on public.community_reactions
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

- **Descrição:** Ao trocar, por exemplo, `hype` por `flop`, o hook apaga a reação existente e depois tenta inserir outra em duas requisições independentes. Se o segundo passo falhar após o primeiro ter sido confirmado, a linha antiga já não existe. O `catch` restaura o objeto otimista, mas chama `fetchData()` imediatamente; a consulta confirma que a reação foi apagada e substitui o estado restaurado.
- **Mitigações verificadas:** A restrição única `(post_id, user_id)` evita linhas duplicadas; a policy de `UPDATE` autoriza o usuário a alterar sua própria linha. Isso não torna a sequência delete/insert atômica. Não encontrei RPC transacional de troca de reação. A policy e os triggers de progressão tornam necessário preservar os efeitos de XP/notificação ao substituir as duas chamadas por uma operação segura.
- **Impacto:** Uma falha transitória, erro de limite ou conflito após o delete remove a reação anterior e deixa o Brick sem reação para essa conta, embora a tela mostre uma mensagem de erro. A alteração é restrita à reação daquela pessoa e daquela publicação.
- **Como verificar/reproduzir com segurança:** 1. Em staging, reaja a um Brick com `hype`. 2. Simule uma falha no `INSERT` após o `DELETE` ter sido confirmado ao trocar para `flop`. 3. Observe a chamada DELETE bem-sucedida e o INSERT com erro. 4. Confirme que o refetch remove a reação anterior em vez de restaurá-la.
- **Solução recomendada:** Realizar a substituição em uma função SQL transacional com validação de `auth.uid()`, preservando os efeitos de progressão e notificações; alternativamente, atualizar a linha com as regras de XP correspondentes. Só confirmar o estado otimista depois da transação ou restaurar a reação anterior se a operação falhar.
- **Exemplo corrigido:**

```ts
const { error } = await supabase.rpc("set_community_reaction", {
  target_post_id: postId,
  target_reaction_type: reactionType,
});
if (error) throw error;
```
- **Esforço estimado:** M


`set_community_reaction` é uma RPC transacional a implementar; ela deve respeitar a titularidade, a unicidade e os efeitos existentes de progressão.
- **Progresso desta retomada:** ampliei OB-21 após cruzar migrações e fluxos ativos de exportação, denúncias, notas, votos de lançamento, preferências administrativas e normalização de e-mail; confirmei OB-29 para falha parcial de exclusão, OB-30 para objetos públicos órfãos após troca de avatar/banner e OB-31 para ausência de MFA/AAL2 imposto pela aplicação administrativa. Verifiquei as permissões da tabela de perfis: o usuário só atualiza uma lista explícita de colunas, `is_official` é excluído e o trigger recalcula esse campo; a RPC de cosméticos valida titularidade e recompensas. Acrescentei OB-32 para `active_days` retornado sem controle pela RPC pública, OB-33 para upload de avatar incompatível com o estado de cadastro sem perfil e OB-34 para leitura sem paginação de posts no painel de saúde. Cruzei a navegação do painel e políticas RLS/grants para notas, preferências, matérias e lançamentos; não encontrei escalada nos caminhos lidos. Ampliei OB-02 porque o painel de saúde transforma erros conhecidos de schema em estados vazios. Revisei as sete Edge Functions, configurações e chamadores; identifiquei em OB-35 que o cron chama a função de push com uma chave de serviço, enquanto a função exige token de usuário e autorização administrativa. Acrescentei OB-36: o handler comunitário aceita reenvio autenticado de uma ação que continua existente, sem idempotência/limite nesse endpoint; o service worker marca a notificação com `renotify` quando há tag. Na revisão manual da caixa de contatos, confirmei OB-37: a consulta administrativa retorna no máximo 100 linhas e a interface não oferece paginação ou outro acesso às mensagens anteriores. Acrescentei OB-38 após ler o caminho de alertas de denúncias: o lock global é consultado e gravado em operações separadas, permitindo que execuções concorrentes processem o mesmo aviso. Revisei os endpoints públicos de erro, engajamento e notícias; em OB-39 registrei que a lista descarta respostas não-2xx e reativa o observador ao alternar o estado de carregamento, permitindo repetição automática da mesma página após `429`/falha de rede. Em OB-40 registrei que `/api/errors` ignora falhas dos RPCs de limite e gravação e ainda responde 204, deixando a telemetria de erros sem evidência de falha. Na revisão de SEO/RLS, acrescentei OB-41 porque uma justificativa editorial de matéria curta permanece na linha publicada e é retornada por uma consulta pública com `select("*")`; o componente recebe a linha inteira embora a justificativa só seja mostrada em rascunhos. A execução remota da migration não foi verificada. Revisei também notificações, callback OAuth, contexto de autenticação, login administrativo, recuperação de senha e perfil; não confirmei bypass de autorização fora do controle de segundo fator ausente. A configuração global de MFA no Supabase não foi verificada. Descartei a suspeita de cursor numérico em visualizações porque `post_views.id` é UUID. Nesta continuação, li as páginas de busca, matérias em alta, notificações, conquistas e ranking; confirmei em OB-42 o risco de a tela de notificações salvar os valores padrão após uma falha de leitura e o envio silencioso sem sessão. OB-43 registra que falhas de RPC no ranking/conquistas são apresentadas como ausência de dados/progresso. Reconfirmei o inventário do workspace. Não alterei código nem configurações do site.
- **Bloqueios de prontidão já registrados:** chave privilegiada no histórico Git, divergência do cron de produção, relações ausentes no PostgREST, backup incompleto, achados de push/privacidade, exclusão de conta sem retomada após falha (OB-29), validações insuficientes de imagem/fonte (OB-25/OB-26) e perda potencial de alertas de moderação/geração repetida pelo webhook (OB-27/OB-28). OB-30 é uma melhoria de baixa severidade. Esses itens continuam pendentes; esta retomada não altera código, banco, credenciais ou deployment.

# **[OB-25] Cron do checkout publica imagens sem comprovar sua origem oficial**

- **Categoria:** Código
- **Severidade:** Média
- **Confiança:** Alta
- **Status:** CONFIRMADO
- **Tipo de evidência:** Estática
- **CVSS estimado:** N/A
- **Localização:** checkout `src/lib/ai/gemini-news.ts:163-197,271-314,369-379,1281-1297`, `src/lib/server/editorial-publication.ts:18-52`, `src/app/api/cron/generate-daily/route.ts:117-160`; produção `src/lib/ai/gemini-news.ts:1274`, `src/lib/telegram/bot.ts:272-288,707-719` e `src/app/api/cron/drive-sync/route.ts:131-149,418-422,432-437` no commit `17af5e0a29e2bb43fcd8fab734432a1e0cdd7966`.
- **Evidência:**



```ts
is_published: false,
published_at: null,
```

```ts
alt: `Imagem oficial relacionada a ${title}`, caption: `Material oficial relacionado a ${title}.`
```

```ts
const blockers = editorialPublicationBlockers(result);
const publication = await publishEligibleEditorialDraft(blockers, async () => {
```

- **Descrição:** A busca combina imagens da notícia, candidatos da Steam e URLs do Gemini/Google. A validação verifica formato, tamanho e dimensões, mas não confirma origem oficial nem pertinência temática; o gate exige URLs distintas, alt e legendas, e pode atribuir “Divulgação/Oficial” sem prova. O `drive-sync` publicado também não verifica proveniência, mas cria rascunhos. Já o cron de três horários no checkout usa esse gate e publica automaticamente quando não há bloqueios. Essa revisão local ainda não foi implantada; a produção continua no handler antigo com aprovação no Telegram.
- **Mitigações verificadas:** Há validação de HTTP/arquivo, dimensão mínima de 1200 × 675, deduplicação e HTTPS. `isOfficialEditorialSource` valida fontes da matéria, não imagens. O teste isolado de `editorialPublicationBlockers` retornou `[]` para imagens distintas em `unrelated-images.example`. A produção atual grava `is_published: false` no fluxo diário e exige callback administrativo; o checkout não impõe essa revisão antes da publicação automática.
- **Impacto:** Quando o checkout for implantado, uma imagem genérica, não relacionada ou sem autorização comprovada pode chegar ao público com legenda/alt que a apresenta como oficial. Isso pode induzir leitores ao erro, gerar reclamação de direitos autorais e reduzir confiança editorial.
- **Como verificar/reproduzir com segurança:** Em staging, simule imagem JPEG válida de 1200 × 675 em domínio sem relação com a pauta e satisfaça os outros campos do gate. Verifique que `editorialPublicationBlockers` não a bloqueia e que o callback de publicação automática é chamado. Não reproduza em produção.
- **Solução recomendada:** Registrar e verificar origem oficial e pertinência temática por imagem; bloquear a publicação automática quando a evidência faltar e notificar o Telegram que a matéria ficou em rascunho. Só usar “Divulgação/Oficial” quando a origem tiver sido confirmada.
- **Exemplo corrigido:**

```ts
type ImageEvidence = { sourceVerified: boolean; subjectVerified: boolean };

const isImageVerified = (image: ImageEvidence): boolean => image.sourceVerified && image.subjectVerified;
```
- **Esforço estimado:** M


# **[OB-26] Subdomínios do mesmo publisher contam como fontes independentes**

- **Categoria:** Bug
- **Severidade:** Média
- **Confiança:** Alta
- **Status:** CONFIRMADO
- **Tipo de evidência:** Estática
- **CVSS estimado:** N/A
- **Localização:** `src/lib/server/editorial-publication.ts:8-15,18-52,55-61`; `src/lib/content-validation.ts:63-69,198-201`; `src/app/api/cron/generate-daily/route.ts:117-138`; `tests/editorial-publication.test.ts:71-88`.
- **Evidência:**

```ts
function domainFromUrl(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.hostname.toLowerCase().replace(/^www\./, "");
```

```ts
const sourceDomains = new Set(result.sources.map((source) => domainFromUrl(source.url)).filter(Boolean));
const officialSource = result.sources.some((source) => source.is_official || isOfficialEditorialSource(source.url));
if (sourceDomains.size < 3 && !officialSource) {
```

```ts
const sourceDomains = new Set(validSources.map((source) => sourceHostname(source.url)).filter((hostname): hostname is string => Boolean(hostname)));
if (sourceDomains.size < 3 && !validSources.some((source) => source.is_official || isOfficialEditorialSource(source.url))) {
```

- **Descrição:** A validação conta nomes de host completos como fontes distintas. Três URLs em `news.publisher.example`, `blog.publisher.example` e `games.publisher.example` satisfazem a exigência de três fontes, embora possam pertencer ao mesmo publisher e não constituam confirmação independente. O mesmo critério aparece no gate final e no validador editorial. O cron no checkout publica automaticamente quando esse gate e os demais retornam sem bloqueios; o caminho novo ainda não foi implantado.
- **Mitigações verificadas:** Os endereços precisam ser HTTPS e a URL final precisa constar nas fontes estruturadas; fontes oficiais têm uma regra separada. Não encontrei normalização para publisher/proprietário nem teste para subdomínios do mesmo domínio registrável. A reprodução isolada de `editorialPublicationBlockers`, usando três subdomínios e o restante do conteúdo válido, retornou `[]` (comando: `node --experimental-strip-types --input-type=module`, dados enviados por stdin; nenhuma chamada de rede). O handler atualmente publicado ainda exige aprovação administrativa.
- **Impacto:** Se o checkout for implantado, o gate pode liberar publicação automática como cruzada por três fontes quando os links vêm de um único publisher. Isso enfraquece a apuração e pode publicar informação sem confirmação independente.
- **Como verificar/reproduzir com segurança:** 1. Em staging, crie um rascunho válido com fontes em `news.publisher.example`, `blog.publisher.example` e `games.publisher.example`, todas controladas pelo mesmo publisher, e sem fonte oficial reconhecida. 2. Execute `editorialPublicationBlockers`. 3. O gate não informa falta de fontes; no cron do checkout, `publishEligibleEditorialDraft` então publica se os demais requisitos forem satisfeitos. Não execute em produção.
- **Solução recomendada:** Associar fontes a um identificador de veículo/editor e contar identidades editoriais independentes, não hostnames. Normalizar domínios com uma fonte mantida de sufixos públicos como etapa técnica complementar; revisar aliases, subdomínios de hospedagem e propriedade comum. Manter a exceção de fonte oficial explícita.
- **Exemplo corrigido:**

```ts
type SourceIdentity = { publisherId: string; verifiedOfficial: boolean };

function hasEnoughIndependentSources(sources: SourceIdentity[]): boolean {
  const publisherIds = new Set(sources.map((source) => source.publisherId));
  return publisherIds.size >= 3 || sources.some((source) => source.verifiedOfficial);
}
```

- **Esforço estimado:** M
# **[OB-27] Falha ao enviar denúncia ao Telegram avança o marcador mesmo assim**

- **Categoria:** Bug
- **Severidade:** Média
- **Confiança:** Alta
- **Status:** CONFIRMADO
- **Tipo de evidência:** Estática
- **CVSS estimado:** N/A
- **Localização:** `src/lib/telegram/bot.ts:91-103,532-545,548-574`; `src/app/api/telegram/webhook/route.ts:31-36`
- **Evidência:**

```ts
if (!data.ok) {
  console.error(`Erro na API do Telegram (${method}):`, data);
}
return data;
```

```ts
await sendTelegramApi("sendMessage", {
  chat_id: getAdminChatId(),
  text,
  parse_mode: "HTML",
```

```ts
await sendSingleReportAlert(report).catch(() => {});
watermark = report.created_at;
await setState(REPORT_ALERT_WATERMARK, watermark);
```

- **Descrição:** `sendTelegramApi` apenas registra `ok: false` e retorna a resposta normalmente. `sendSingleReportAlert` ignora o resultado. A rotina de alertas captura exceções e avança o watermark de qualquer forma; assim, a denúncia não volta a ser notificada quando a API do Telegram recusa a mensagem.
- **Mitigações verificadas:** O webhook confere o token secreto antes de processar atualizações, e um lock reduz verificações repetidas por 30 segundos. O comando `/denuncias` permite consultar pendências manualmente, mas não refaz o envio perdido. Não encontrei retry/outbox nem teste de falha da API. Reproduzi com Supabase e Telegram simulados: o Telegram retornou `{ ok: false }`; a rotina fez uma tentativa e persistiu o watermark igual ao `created_at` da denúncia. Nenhuma chamada externa real ou alteração de banco ocorreu.
- **Impacto:** O administrador pode não receber a notificação de uma denúncia pendente. Se não consultar a fila manualmente, conteúdo reportado pode permanecer visível por mais tempo.
- **Como verificar/reproduzir com segurança:** 1. Execute `notifyNewCommunityReports` com uma denúncia pendente posterior ao watermark. 2. Simule `sendMessage` retornando HTTP 200 com JSON `{ "ok": false }`. 3. Observe que o código ainda grava o timestamp da denúncia em `tg_report_alert_watermark` e não tenta enviá-la de novo.
- **Solução recomendada:** Tratar `ok: false` como falha e só marcar a denúncia como notificada após a confirmação da API. Persistir status por denúncia com tentativas limitadas e alerta operacional para falhas, preservando recuperação sem perder itens.
- **Exemplo corrigido:**

```ts
const result = await sendTelegramApi("sendMessage", {
  chat_id: getAdminChatId(),
  text,
  parse_mode: "HTML",
  reply_markup: { inline_keyboard: reportKeyboard(report) },
});
if (!result.ok) throw new Error("Telegram não confirmou o envio da denúncia.");
```

```ts
for (const report of reports || []) {
  await sendSingleReportAlert(report);
  await setState(REPORT_ALERT_WATERMARK, report.created_at);
}
```
- **Esforço estimado:** M
# **[OB-28] Timeout e replay do webhook podem repetir geração editorial**

- **Categoria:** Bug
- **Severidade:** Média
- **Confiança:** Alta
- **Status:** CONFIRMADO
- **Tipo de evidência:** Estática
- **CVSS estimado:** N/A — consistência/retries
- **Localização:** `src/app/api/telegram/webhook/route.ts:5-7,31-38`; `src/lib/ai/gemini-news.ts:48-50,1056-1058,1206-1213`; `src/lib/telegram/bot.ts:10,1385-1394,1431-1448,1524-1566`
- **Evidência:**

```ts
export const maxDuration = 60;
```

```ts
const EDITORIAL_GENERATION_DEADLINE_MS = 150_000;
const deadline = Date.now() + EDITORIAL_GENERATION_DEADLINE_MS;
```

```ts
const result = await generateNewsDraft({ topic: args });
await sendPostForApproval(result.post, result.wordCount);
```

- **Descrição:** Os comandos `/hoje`, `/gerar` e envio de URL executam `generateNewsDraft` de forma síncrona dentro do webhook, cuja duração máxima configurada é 60 segundos; o gerador aceita trabalhar por até 150 segundos. A documentação da Vercel informa que a função é encerrada quando excede `maxDuration`. Se a resposta não for 2xx, o Telegram repete a entrega; a mesma API recomenda usar `update_id` para ignorar atualizações repetidas. O código tipa `update_id`, mas não o persiste nem o consulta. A checagem de pauta semelhante ocorre depois da geração do texto, então não evita custo repetido e tampouco é um claim atômico. A versão atualmente implantada não foi confirmada.
- **Mitigações verificadas:** Há deadline global de 150 segundos e a função de cron editorial tem limite de 300 segundos, mas não existe limite Telegram menor, fila durável ou deduplicação por `update_id`. A busca por `update_id` no handler e na rota encontrou apenas a declaração do tipo. A reprodução local chamou duas vezes o handler com o mesmo `update_id`: o mesmo update `/start` gerou duas respostas (`sameUpdateDeliveries: 2`, `telegramReplies: 2`); não foram feitas chamadas externas. Referências primárias: [duração máxima das Vercel Functions](https://vercel.com/docs/functions/configuring-functions/duration) e [Telegram Bot API — `setWebhook` e `Update.update_id`](https://core.telegram.org/bots/api#setwebhook).
- **Impacto:** Um pedido lento pode encerrar antes de responder ao Telegram. A reentrega pode iniciar nova chamada de IA, elevar o custo de tokens e, quando execuções concorrem antes da gravação do primeiro rascunho, criar matérias duplicadas. O administrador também pode não receber o botão de aprovação da primeira tentativa.
- **Como verificar/reproduzir com segurança:** 1. Em um deployment de teste, faça um provedor simulado atrasar a geração para mais de 60 e menos de 150 segundos. 2. Envie `/gerar` por webhook e observe o timeout da função. 3. Reentregue o mesmo objeto com o mesmo `update_id`; confirme que o handler executa novamente e inicia outra geração, pois não há registro de idempotência. Não faça o teste em produção.
- **Solução recomendada:** Persistir e deduplicar o `update_id` numa transação antes de aceitar a atualização; responder ao webhook após enfileirar um job durável; executar geração e notificação num worker cujo limite cubra o orçamento configurado. Se o enfileiramento falhar, retornar erro sem marcar o update como processado.
- **Exemplo corrigido:**

```ts
await enqueueTelegramUpdateOnce(update.update_id, update);
return NextResponse.json({ ok: true });
```

- **Esforço estimado:** M
# **[OB-29] A exclusão de conta pode falhar depois de apagar dados**

- **Categoria:** Bug
- **Severidade:** Média
- **Confiança:** Alta
- **Status:** CONFIRMADO
- **Tipo de evidência:** Estática
- **CVSS estimado:** N/A
- **Localização:** `src/app/api/user/delete/route.ts:53-62,68-76,99-105`; `src/components/ui/PrivacyControls.tsx:105-128`; `supabase/migrations/20260924000003_atomic_user_data_deletion.sql:23-47`
- **Evidência:**

```ts
const { error: cleanupError } = await deleteUserAccountData("delete_user_account_data", {
  p_user_id: user.id,
  p_device_id: deviceId,
  p_email: user.email?.toLowerCase() || null,
});
if (cleanupError) throw cleanupError;

const { error: deleteError } = await serviceClient.auth.admin.deleteUser(user.id);
if (deleteError) throw deleteError;
```

```ts
} catch (error) {
  const reference = crypto.randomUUID();
  console.error("Falha na exclusão de conta", reference, error);
  return NextResponse.json(
    { error: "Não foi possível excluir a conta", reference },
    { status: 500 }
  );
}
```

```sql
  delete from public.community_posts where user_id = p_user_id;
  delete from public.notifications where user_id = p_user_id;
  delete from public.comments where user_id = p_user_id;
  delete from public.push_subscriptions where user_id = p_user_id;
  delete from public.profiles where user_id = p_user_id;
end;
$$;
```

- **Descrição:** A rota remove primeiro arquivos do Storage e, em seguida, executa a RPC que apaga dados relacionais e o perfil. Só depois chama a API Auth para excluir a conta. São operações em serviços diferentes, sem transação distribuída; se a chamada posterior de Auth falhar, o `catch` devolve erro 500, mas não restaura arquivos, perfil ou registros já removidos. A execução remota dessas migrações não foi confirmada.
- **Mitigações verificadas:** A RPC exige `service_role` e executa as exclusões relacionais no banco; isso torna essa etapa atômica dentro do PostgreSQL, mas não inclui Storage nem a chamada Admin Auth posterior. Li o handler até o `catch`: ele apenas registra referência e responde 500; não há estado persistido de exclusão pendente, retry automático, compensação ou job de retomada. `PrivacyControls` reabilita a ação e permite que o usuário tente novamente manualmente, mas não informa que dados já foram apagados nem acompanha o resultado parcial. A busca por fluxos alternativos em `src/`, `supabase/functions/`, `tests/` e `e2e/` encontrou somente essa rota/RPC e nenhum teste de falha parcial.
- **Impacto:** Uma falha de rede ou do serviço Auth depois da limpeza pode deixar a conta de autenticação ativa sem parte do perfil, conteúdo e imagens. A interface mostra um erro genérico e permite nova tentativa manual, mas não revela que a limpeza parcial já ocorreu; enquanto o serviço não se recuperar, o estado da conta fica inconsistente. A severidade é média porque depende de falha de infraestrutura na etapa final e há retry manual.
- **Como verificar/reproduzir com segurança:** 1. Em staging, crie uma conta com perfil, imagem e registros associados. 2. Simule Storage e RPC concluindo com sucesso e faça `auth.admin.deleteUser` retornar erro. 3. Confirme que a resposta é 500, que os dados e arquivos já foram removidos e que a conta Auth continua presente no cenário simulado. Não reproduza em produção.
- **Solução recomendada:** Implementar exclusão como fluxo durável e idempotente, com estado `pending`, job de retomada/retry e bloqueio de novas sessões enquanto pendente. Registrar o progresso por etapa; só declarar falha concluída quando houver recuperação possível e testar falha injetada em cada fronteira entre Storage, banco e Auth.
- **Exemplo corrigido:**

```ts
await enqueueAccountDeletion({
  userId: user.id,
  deviceId,
  email: user.email?.toLowerCase() ?? null,
});
return NextResponse.json({ status: "pending" }, { status: 202 });
```

- **Esforço estimado:** M
# **[OB-30] Avatar e banner antigos podem permanecer públicos após a troca**

- **Categoria:** Bug
- **Severidade:** Baixa
- **Confiança:** Alta
- **Status:** CONFIRMADO
- **Tipo de evidência:** Estática
- **CVSS estimado:** N/A
- **Localização:** `src/app/api/user/avatar/route.ts:66-68`; `src/app/api/user/banner/route.ts:92-95`; `supabase/migrations/20260803000003_profile_images_bucket.sql:1-9`; `node_modules/@supabase/storage-js/src/packages/StorageFileApi.ts:1184-1201`; `node_modules/@supabase/storage-js/src/lib/common/BaseApiClient.ts:17,88-101`
- **Evidência:**



```ts
protected shouldThrowOnError = false
```

```ts
if (this.shouldThrowOnError) {
  throw error
}
if (isStorageError(error)) {
  return { data: null, error: error as TError }
}
```

```sql
values ('profile-images', 'profile-images', true, 8388608, array['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
```

- **Descrição:** As rotas aguardam a remoção da imagem anterior, mas descartam o objeto retornado por `remove`. O SDK tipa falhas de Storage como `{ data: null, error }` sem exigir que a Promise lance. Se a remoção retornar esse erro, a rota ainda responde sucesso depois de atualizar o perfil; a imagem antiga continua no bucket público.
- **Mitigações verificadas:** Os endpoints autenticam o bearer token, limitam a dez alterações por hora e restringem a remoção ao caminho do próprio usuário com prefixo `avatar-`/`banner-`. A exclusão da conta também tenta remover os objetos daquele usuário e verifica erro. `storage-health` apenas contabiliza o bucket `profile-images`; não identifica nem remove órfãos dele. Busquei usos e testes de upload/limpeza em `src/`, `tests/` e `e2e/`; não encontrei reconciliação de órfãos nem teste de falha na remoção.
- **Impacto:** Uma falha isolada de Storage pode deixar uma imagem antiga acessível pelo URL público e acumular arquivos órfãos. O efeito é limitado a imagens de perfil previamente públicas e exige falha na remoção; severidade baixa.
- **Como verificar/reproduzir com segurança:** 1. Em staging, tenha avatar ou banner já salvo e anote seu URL público. 2. Simule o Storage retornando `{ data: null, error }` ao remover o objeto antigo, mantendo upload e atualização de perfil bem-sucedidos. 3. Confirme que a API retorna 200 com o novo URL e que o URL anterior ainda carrega.
- **Solução recomendada:** Verificar o campo `error` retornado pela remoção e registrar falhas em fila idempotente para retry. Adicionar uma rotina de reconciliação por prefixo de usuário e um teste que injete falha de Storage.
- **Exemplo corrigido:**

```ts
const { error } = await supabase.storage.from("profile-images").remove([previousPath]);
if (error) await enqueueProfileImageCleanup({ userId: user.id, path: previousPath });
```
- **Esforço estimado:** P


# **[OB-31] Acesso administrativo não exige segundo fator na aplicação**

- **Categoria:** Segurança
- **Severidade:** Baixa
- **Confiança:** Média
- **Status:** POTENCIAL
- **Tipo de evidência:** Estática
- **CVSS estimado:** N/A
- **Localização:** `src/app/admin/login/page.tsx:46-54`; `src/proxy.ts:74-87`; `src/lib/auth.ts:3-5`; `src/app/api/admin/posts/route.ts:17-23`; `src/app/api/admin/team/route.ts:15-19`
- **Evidência:**

```ts
const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
if (signInError) throw signInError;

const { data: { user } } = await supabase.auth.getUser();
if (!isAdminUser(user)) {
  await supabase.auth.signOut();
```

```ts
const { data: { user } } = await supabase.auth.getUser();

const isAdmin = user.app_metadata?.is_admin === true;

if (!isAdmin) {
```

```ts
export function isAdminUser(user: User | null): boolean {
  return user?.app_metadata?.is_admin === true;
}
```

- **Descrição:** O login administrativo usa e-mail/senha, e o proxy e as rotas administrativas autorizam com base apenas em `app_metadata.is_admin`. Não encontrei etapa de desafio MFA nem validação do nível de garantia `aal2` em `src/` ou nas migrations locais. A documentação Supabase diferencia `aal1` (primeiro fator) de `aal2` (segundo fator) e orienta o aplicativo a aplicar a política de acesso. Referências: [Supabase MFA](https://supabase.com/docs/guides/auth/auth-mfa) e [fluxo TOTP](https://supabase.com/docs/guides/auth/auth-mfa/totp). A configuração de MFA exigida no projeto Supabase remoto não foi verificada.
- **Mitigações verificadas:** O proxy valida a identidade no servidor e exige `app_metadata.is_admin`; as APIs também checam o papel administrativo, evitando que apenas a tela cliente conceda acesso. A busca literal por `aal`, `aal2` e `mfa` não encontrou enforcement na aplicação nem em migrations. Uma política de MFA configurada fora do repositório ainda pode reduzir o risco, mas não foi confirmada.
- **Impacto:** Se a senha de um administrador for roubada, reutilizada ou obtida por phishing, o código não exige outro fator antes de permitir acesso ao painel e às APIs administrativas. A severidade é baixa porque exige comprometimento da primeira credencial e a política remota de Auth é desconhecida.
- **Como verificar/reproduzir com segurança:** 1. Em um projeto Supabase de staging, habilite um fator TOTP para uma conta administrativa sem impor MFA globalmente. 2. Faça login em `/admin/login` apenas com e-mail e senha, sem concluir o desafio TOTP. 3. Verifique que o proxy aceita `is_admin` e abre `/admin`; confirme que uma chamada administrativa com o mesmo token também não verifica `aal2`. Não use conta nem ambiente de produção.
- **Solução recomendada:** Incluir o desafio MFA no fluxo administrativo e exigir `currentLevel === "aal2"` no proxy e em cada API/Edge Function administrativa, preferencialmente por guard compartilhado. Ativar enforcement no Supabase e cobrir com teste que token `aal1` é negado e `aal2` é aceito.
- **Exemplo corrigido:**

```ts
const { data: assurance, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
if (error || assurance.currentLevel !== "aal2") return denyAdminAccess();
```

- **Esforço estimado:** P
# **[OB-32] RPC pública revela dias ativos mesmo sem exibir esse dado no perfil**

- **Categoria:** Segurança
- **Severidade:** Baixa
- **Confiança:** Alta
- **Status:** CONFIRMADO
- **Tipo de evidência:** Estática
- **CVSS estimado:** N/A
- **Localização:** `supabase/migrations/20260924000000_public_profile_view_and_access.sql:79-83,111-115,148-153`; `supabase/migrations/20260925000000_restrict_security_definer_privileges.sql:37-38`; `src/app/configuracoes/perfil/page.tsx:634-638`
- **Evidência:**

```sql
'progress', case when selected_profile.is_official then null else jsonb_build_object(
  'lifetime_xp', case when selected_profile.show_lifetime_xp then coalesce(progress.lifetime_xp, 0) else null end,
  'level', coalesce(progress.level, 1),
  'next_level_xp', least(1000000, 100 * power(coalesce(progress.level, 1) + 1, 2)),
  'active_days', coalesce(progress.active_days, 0)
) end,
```

```sql
'stats', case when selected_profile.show_activity_stats then jsonb_build_object(
  'posts', (select count(*) from public.community_posts where user_id = selected_profile.user_id),
  'comments', (select count(*) from public.community_comments where user_id = selected_profile.user_id),
  'reactions_received', (select count(*) from public.community_reactions reaction join public.community_posts post on post.id = reaction.post_id where post.user_id = selected_profile.user_id)
) else null end,
```

```sql
revoke all on function public.public_profile(text) from public, anon, authenticated;
grant execute on function public.public_profile(text) to anon, authenticated;
```

- **Descrição:** A função `public_profile` é `SECURITY DEFINER` e pode ser chamada por visitantes anônimos. Mesmo quando `show_activity_stats` está desativado, o JSON continua incluindo `progress.active_days`; o perfil público não usa esse campo na interface, mas qualquer cliente pode ler o retorno bruto da RPC. O controle de XP só oculta `lifetime_xp` e não afeta `active_days`.
- **Mitigações verificadas:** `show_activity_stats` condiciona os contadores de publicações, comentários e reações; `show_season_history` também tem controle próprio. Busquei `active_days` na página pública e nos componentes: ele aparece no tipo e no SQL, mas não é renderizado. A busca por grants confirma que `anon` e `authenticated` podem executar a RPC; não encontrei outro filtro de privacidade para esse campo. A configuração remota do banco não foi verificada.
- **Impacto:** Um visitante pode consultar por API uma métrica de atividade que a página não exibe. O dado não é credencial nem localização, por isso a severidade é baixa, mas a exposição amplia os dados públicos além do que a interface apresenta e pode frustrar a expectativa de privacidade do perfil.
- **Como verificar/reproduzir com segurança:** 1. Em staging, configure um perfil com `show_activity_stats = false` e atividade registrada. 2. Chame `public_profile` pela API Supabase usando uma sessão anônima e o nome público do perfil. 3. Observe que `progress.active_days` ainda contém um número, enquanto `stats` é `null`.
- **Solução recomendada:** Remover `active_days` do JSON público se não for necessário ou condicioná-lo ao controle de atividade; manter o contrato da RPC alinhado à configuração exibida ao usuário e adicionar teste para chamada anônima.
- **Exemplo corrigido:**

```sql
'active_days', case
  when selected_profile.show_activity_stats then coalesce(progress.active_days, 0)
  else null
end
```
- **Esforço estimado:** P


# **[OB-33] Envio de avatar falha durante a criação inicial do perfil**

- **Categoria:** Bug
- **Severidade:** Baixa
- **Confiança:** Alta
- **Status:** CONFIRMADO
- **Tipo de evidência:** Estática
- **CVSS estimado:** N/A
- **Localização:** `src/app/profile/setup/page.tsx:54-67,80-85`; `src/app/api/user/avatar/route.ts:39-45`; `src/app/auth/callback/route.ts:40-48`
- **Evidência:**

```ts
const { data: previousProfile, error: previousProfileError } = await supabase
  .from("profiles")
  .select("avatar_url")
  .eq("user_id", user.id)
  .maybeSingle();
if (previousProfileError || !previousProfile) {
  return NextResponse.json({ error: "Não foi possível atualizar o perfil" }, { status: 500 });
}
```

```ts
const { error: insertError } = await supabase.from("profiles").insert({
  user_id: user!.id,
  nickname: trimmed,
  display_name: trimmed,
  username: normalizedUsername,
  avatar_url: durableAvatarUrl,
});
```

```ts
const dest = profile ? `${origin}${next}` : `${origin}/profile/setup`;
const response = NextResponse.redirect(dest);
```

- **Descrição:** O callback envia usuários sem linha em `profiles` para `/profile/setup`. Nessa tela, ao selecionar uma imagem, o cliente chama `/api/user/avatar` antes de inserir o perfil. A rota de avatar exige que a linha já exista e responde 500 quando não a encontra; assim, o envio interrompe o cadastro antes do `insert`. Sem selecionar arquivo, ou usando uma URL de avatar já disponível, o cadastro pode seguir.
- **Mitigações verificadas:** O callback redireciona para a configuração quando não encontra perfil e a tela também redireciona usuários que já têm perfil. A chamada de avatar exige sessão válida e depois atualiza apenas o próprio usuário; não encontrei rota de upload específica para cadastro inicial. A alternativa de ignorar o arquivo permite concluir o fluxo, mas não corrige o recurso de upload.
- **Impacto:** Pessoas que escolhem uma foto local durante o cadastro recebem erro e precisam remover a imagem ou concluir o perfil sem ela. Isso prejudica o onboarding, mas há um caminho alternativo, portanto a severidade é baixa.
- **Como verificar/reproduzir com segurança:** 1. Em staging, autentique uma conta nova sem linha correspondente em `profiles`. 2. Abra `/profile/setup`, informe nome e usuário válidos, selecione um arquivo de avatar e envie. 3. Observe a resposta 500 de `/api/user/avatar` e confirme que o `insert` do perfil não ocorre.
- **Solução recomendada:** Validar a disponibilidade do nome e criar primeiro o perfil com avatar nulo; depois enviar a imagem para a rota, que então encontra o registro. Se o upload falhar, permitir concluir o cadastro sem avatar e informar a falha, ou implementar limpeza/rollback idempotente.
- **Exemplo corrigido:**

```ts
const { error: insertError } = await supabase.from("profiles").insert({
  user_id: user.id,
  nickname: trimmed,
  display_name: trimmed,
  username: normalizedUsername,
  avatar_url: null,
});
if (insertError) throw insertError;

if (avatarFile) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Sua sessão expirou. Entre novamente.");
  const formData = new FormData();
  formData.set("avatar", avatarFile);
  const response = await fetch("/api/user/avatar", {
    method: "POST",
    headers: { Authorization: `Bearer ${session.access_token}` },
    body: formData,
  });
  if (!response.ok) setError("Perfil criado; não foi possível salvar o avatar.");
}
```
- **Esforço estimado:** P


# **[OB-34] Painel de saúde carrega posts sem projeção nem paginação**

- **Categoria:** Performance
- **Severidade:** Baixa
- **Confiança:** Alta
- **Status:** CONFIRMADO
- **Tipo de evidência:** Estática
- **CVSS estimado:** N/A
- **Localização:** `src/app/admin/health/page.tsx:28-35,38,49`
- **Evidência:**

```ts
supabase.from("posts").select("*").order("updated_at", { ascending: false }),
```

```ts
const issues = posts.map((post) => ({ post, warnings: [!post.image_url && "Sem imagem de capa", (!Array.isArray(post.editorial_sources) || post.editorial_sources.length === 0) && "Sem fontes estruturadas", post.title.length > 70 && "Título acima de 70 caracteres", post.summary.length < 80 && "Resumo curto"].filter(Boolean) as string[] })).filter((item) => item.warnings.length);
```

```tsx
issues.slice(0, 20).map(({ post, warnings }) => <div key={post.id}
```

- **Descrição:** A tela busca todos os campos de todos os posts em uma única consulta, embora os avisos usem apenas ID, capa, fontes, título e resumo. Depois percorre o conjunto no navegador e mostra no máximo 20 resultados. Sem paginação ou agregação, o painel transfere conteúdo editorial desnecessário e pode ficar mais lento conforme o catálogo cresce; se o limite PostgREST configurado for alcançado, posts antigos podem ficar fora da verificação. A configuração remota desse limite não foi consultada.
- **Mitigações verificadas:** A lista é ordenada por `updated_at` e a interface limita a 20 avisos renderizados, reduzindo o custo visual. Isso não limita o payload consultado nem garante que todos os posts foram examinados. Não encontrei paginação nesse fluxo. A documentação Supabase descreve o limite de linhas e a paginação por intervalo; o teto do projeto permanece NÃO VERIFICADO: [limite e paginação de consultas](https://supabase.com/docs/reference/javascript/v1/select).
- **Impacto:** A tela interna pode consumir mais rede e memória do que o necessário e, ao atingir o teto remoto, não apontar matérias antigas com campos editoriais ausentes. O efeito depende do volume de posts e do limite efetivo, por isso a severidade é baixa.
- **Como verificar/reproduzir com segurança:** 1. Em staging, crie quantidade de posts superior ao limite PostgREST configurado e deixe um post antigo com imagem ou fontes ausentes. 2. Abra `/admin/health` e inspecione a resposta da consulta `posts`. 3. Confirme que o payload traz campos não usados e que o post fora da primeira janela não aparece entre os avisos.
- **Solução recomendada:** Buscar apenas as colunas usadas e paginar explicitamente ou mover a agregação de avisos para uma consulta/endpoint server-side que retorne o total e os resultados paginados.
- **Exemplo corrigido:**

```ts
const pageSize = 500;
const posts: Pick<Post, "id" | "image_url" | "editorial_sources" | "title" | "summary" | "updated_at">[] = [];
for (let from = 0; ; from += pageSize) {
  const { data, error } = await supabase.from("posts").select("id,image_url,editorial_sources,title,summary,updated_at").order("updated_at", { ascending: false }).order("id", { ascending: true }).range(from, from + pageSize - 1);
  if (error) throw error;
  posts.push(...(data || []));
  if (!data || data.length < pageSize) break;
}
```

- **Esforço estimado:** P
# **[OB-35] Push de notícia agendada usa chave de serviço como token administrativo**

- **Categoria:** Bug
- **Severidade:** Média
- **Confiança:** Alta
- **Status:** PROVÁVEL
- **Tipo de evidência:** Estática
- **CVSS estimado:** N/A
- **Localização:** `src/app/api/cron/editorial-scheduler/route.ts:104-119`; `supabase/config.toml:36-37`; `supabase/functions/send-push-notification/index.ts:17-22,54-60,79-86`
- **Evidência:**


```ts
const { data: { user }, error: authError } = await supabase.auth.getUser(token);
if (authError || !user) return json({ error: "Não autorizado" }, 401);
```

```ts
if (user.app_metadata?.is_admin === true && typeof values.title === "string") {
  title = cleanText(values.title, 120);
```

```ts
const eventType = values.event_type as CommunityEvent;
const referenceId = values.reference_id;
if (!["reaction", "comment", "repost", "comment_like"].includes(eventType) || typeof referenceId !== "string") {
  return json({ error: "Evento inválido" }, 400);
```

- **Descrição:** O cron chama a Edge Function com `SUPABASE_SECRET_KEY` (ou a chave legada `service_role`) no cabeçalho `Authorization` e manda os campos de uma transmissão de notícia. A configuração local exige JWT (`verify_jwt = true`); a chave secreta nova do Supabase é uma API key opaca, não um JWT, e não satisfaz essa verificação. Se a chamada usar a chave legada JWT, a função ainda tenta `auth.getUser(token)` e só aceita transmissão de notícia quando o usuário retornado tem `app_metadata.is_admin`; a chave de serviço não é uma sessão de administrador. Sem essa condição, o payload de notícia também não contém os campos exigidos pelo ramo de eventos comunitários. A documentação oficial descreve `getUser(jwt)` como validação de token de usuário e diferencia chaves secretas de JWTs de sessão: [getUser](https://supabase.com/docs/reference/javascript/auth-getuser), [API keys](https://supabase.com/docs/guides/getting-started/api-keys). O deployment atual da função não foi verificado.
- **Mitigações verificadas:** A rota detecta resposta não-2xx, acrescenta “push agendado falhou” à lista e tenta avisar o administrador pelo Telegram; a publicação principal continua e não há retry de push. O `verify_jwt = true` está explícito no `supabase/config.toml`; não encontrei autenticação interna própria para chamadas do cron.
- **Impacto:** O cron pode publicar a matéria sem entregar a notificação push de notícias. O erro é secundário ao fluxo editorial e fica registrado/alertado, então a severidade é média. A ocorrência em produção depende da versão implantada e das variáveis efetivas.
- **Como verificar/reproduzir com segurança:** 1. Em staging com a mesma configuração, execute o scheduler em uma janela com matéria publicável e `SUPABASE_SECRET_KEY` configurada. 2. Observe a chamada a `send-push-notification`: a validação JWT rejeita a chave opaca; com a chave legada, o handler não identifica usuário administrador. 3. Confirme que o post entra em `published`, a notificação entra em `failures` e o cron tenta avisar o administrador. Não faça o teste em produção.
- **Solução recomendada:** Separar autenticação servidor-a-servidor da autenticação de usuário: usar segredo/assinatura interna dedicado, validado pela Edge Function, e desativar a validação JWT de gateway somente para essa função se necessário. Manter as chamadas comunitárias vinculadas ao JWT do usuário e adicionar retry idempotente para os envios de notícia.
- **Exemplo corrigido:**

```toml
[functions.send-push-notification]
verify_jwt = false
```
- **Esforço estimado:** M


```ts
const payload: unknown = await request.json();
if (!payload || typeof payload !== "object") return json({ error: "Payload inválido" }, 400);
const values = payload as Record<string, unknown>;
const internalBroadcast = await verifyPushCronSignature(request);
const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
const authResult = token ? await supabase.auth.getUser(token) : null;
const user = authResult?.data.user ?? null;
if (!internalBroadcast && !user) return json({ error: "Não autorizado" }, 401);
const mayBroadcast = internalBroadcast || user?.app_metadata?.is_admin === true;
if (typeof values.title === "string" && !mayBroadcast) return json({ error: "Acesso negado" }, 403);
```

# **[OB-36] Replay autenticado pode repetir notificações comunitárias**

- **Categoria:** Segurança
- **Severidade:** Média
- **Confiança:** Alta
- **Status:** CONFIRMADO
- **Tipo de evidência:** Estática
- **CVSS estimado:** N/A
- **Localização:** `supabase/functions/send-push-notification/index.ts:17-22,96-104,165,208`; `public/sw.js:38-44`
- **Evidência:**

```ts
if (eventType === "reaction") {
  const { data: reaction } = await supabase
    .from("community_reactions")
    .select("id")
    .eq("post_id", referenceId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!reaction) return json({ error: "Reação não encontrada" }, 404);
```

```ts
tag = `community-${eventType}-${referenceId}`.slice(0, 96);
```

```js
tag,
renotify: Boolean(tag),
timestamp: typeof data.timestamp === "number" ? data.timestamp : Date.now(),
```

- **Descrição:** A função exige sessão válida e confirma que o usuário realizou uma reação, comentário, repost ou curtida. Depois disso, não registra que a notificação desse evento já foi enviada nem limita chamadas repetidas. Enquanto a ação continuar existindo, o próprio usuário autenticado pode reapresentar o mesmo `event_type` e `reference_id` para reenviar a notificação. O worker usa a mesma tag por evento e define `renotify: true`, solicitando novo alerta quando a notificação é substituída.
- **Mitigações verificadas:** O JWT precisa corresponder a uma conta válida e a ação precisa pertencer a essa conta; a preferência do destinatário interrompe o envio quando a consulta retorna `brickboard_replies = false`. A função não importa o `allowRequest` disponível em `supabase/functions/_shared/platform.ts` nem mantém chave de idempotência. O limite de `toggle-reaction` afeta a criação/alteração da reação, mas não a repetição direta desta chamada; os outros fluxos de criação também não deduplicam o envio no handler. A tag do navegador agrupa/substitui a notificação, mas `renotify` está habilitado.
- **Impacto:** Uma conta autenticada pode insistir no envio de alertas repetidos ao dono do Brick/comentário, gerando spam e incômodo. A exposição requer conta válida, evento comunitário existente e destinatário com push ativo; não foi testado em produção.
- **Como verificar/reproduzir com segurança:** 1. Em staging, entre com uma conta de teste e reaja a um Brick de outra conta que tenha push habilitado. 2. Reenvie várias vezes à função `send-push-notification` o mesmo JSON `{ "event_type": "reaction", "reference_id": "<id-do-brick>" }` com o JWT válido do autor. 3. Observe chamadas de envio repetidas para a mesma assinatura e o worker reutilizando a mesma tag com `renotify: true`.
- **Solução recomendada:** Vincular o push ao ID único da ação de origem (ID da reação, comentário, repost ou curtida) e reivindicar o envio atomicamente em registro com restrição única antes de notificar. Responder como duplicado quando a ação já foi processada e aplicar limite por usuário autenticado e destinatário. Preferir criar o evento de notificação na mesma operação que grava a ação, por fila/outbox, em vez de aceitar reenvio livre do cliente.
- **Exemplo corrigido:**

```ts
const { data: claimed, error } = await supabase.rpc("claim_push_event_once", {
  p_event_type: eventType,
  p_source_event_id: sourceAction.id,
});
if (error) throw error;
if (claimed !== true) return json({ sent: 0, duplicate: true });
```
- **Esforço estimado:** M


`claim_push_event_once` é uma RPC atômica proposta, ainda inexistente; ela deve impor unicidade de `(event_type, source_event_id)` e só confirmar uma reivindicação.

# **[OB-37] Caixa de contatos oculta mensagens após as 100 mais recentes**

- **Categoria:** Bug
- **Severidade:** Média
- **Confiança:** Alta
- **Status:** CONFIRMADO
- **Tipo de evidência:** Estática
- **CVSS estimado:** N/A
- **Localização:** `src/app/api/admin/contact/route.ts:21-29`; `src/app/admin/contact/page.tsx:78-85`
- **Evidência:**

```ts
const { data, error } = await serviceClient()
  .from("contact_submissions")
  .select("id,name,company,subject,email,message,is_read,created_at")
  .order("created_at", { ascending: false })
  .limit(100);
```

```tsx
<p className="text-sm text-gray-400">Últimas {submissions.length} mensagens recebidas.</p>
...
{submissions.map((submission) => (
```

- **Descrição:** A rota da caixa administrativa sempre retorna no máximo as 100 mensagens mais recentes. A tela renderiza apenas a lista recebida e não oferece paginação, cursor, busca ou exportação administrativa. Portanto, a mensagem de número 101 em diante deixa de ser acessível por esse fluxo quando novas mensagens chegam.
- **Mitigações verificadas:** O endpoint verifica `app_metadata.is_admin`, responde com `Cache-Control: no-store` e ordena por data decrescente. A tabela tem índice por `created_at` e uma rotina de retenção de 12 meses; nenhum desses mecanismos permite navegar além do limite fixo. A busca em `src/app/admin` e `src/app/api/admin` encontrou apenas este GET/PATCH administrativo para a caixa e nenhuma rota alternativa ou teste de paginação. O GET individual do usuário na exportação de dados não é uma visualização administrativa da caixa.
- **Impacto:** Com mais de 100 envios retidos, os contatos antigos não aparecem no painel e podem ficar sem resposta. O risco depende do volume de mensagens recebidas.
- **Como verificar/reproduzir com segurança:** 1. Em staging, insira mais de 100 registros de contato com datas diferentes. 2. Autentique um administrador e abra `/admin/contact` ou consulte `GET /api/admin/contact`. 3. Confirme que a resposta contém apenas 100 itens e que a interface não oferece ação para carregar os anteriores.
- **Solução recomendada:** Implementar paginação no endpoint e controles de próxima/anterior na tela, com ordenação estável por `created_at` e `id`, contador total e teste que prove acesso ao registro mais antigo depois da primeira página.
- **Exemplo corrigido:**

```ts
const requestedPage = Number(new URL(request.url).searchParams.get("page") || 0);
const page = Number.isSafeInteger(requestedPage) ? Math.max(0, requestedPage) : 0;
const pageSize = 50;
const { data, error, count } = await serviceClient()
  .from("contact_submissions")
  .select("id,name,company,subject,email,message,is_read,created_at", { count: "exact" })
  .order("created_at", { ascending: false }).order("id", { ascending: false })
  .range(page * pageSize, page * pageSize + pageSize - 1);
```

- **Esforço estimado:** M
# **[OB-38] Lock de alertas do Telegram não impede execuções concorrentes**

- **Categoria:** Bug
- **Severidade:** Média
- **Confiança:** Alta
- **Status:** CONFIRMADO
- **Tipo de evidência:** Estática
- **CVSS estimado:** N/A
- **Localização:** `src/lib/telegram/bot.ts:206-215,548-575`; `src/app/api/telegram/webhook/route.ts:31-35`; `src/app/api/home-engagement/route.ts:41-44`
- **Evidência:**

```ts
const lock = await getState(REPORT_ALERT_LOCK);
if (lock && now - Number(lock) < 30_000) return;
await setState(REPORT_ALERT_LOCK, String(now));
```

```ts
const { data } = await supabase.from("bot_state").select("value").eq("key", key).maybeSingle();
return data?.value ?? null;
```

```ts
await supabase.from("bot_state").upsert({ key, value, updated_at: new Date().toISOString() });
```

- **Descrição:** O lock global é implementado como uma leitura e uma gravação separadas, sem aquisição atômica. Duas chamadas que leiam um lock vencido antes de qualquer uma gravar o novo valor passam pela mesma verificação e consultam os mesmos relatórios pendentes; ambas podem enviar o mesmo alerta ao Telegram. A função é acionada tanto pelo webhook quanto por eventos públicos de engajamento.
- **Mitigações verificadas:** O webhook valida seu segredo e o lock reduz chamadas sequenciais durante 30 segundos. A tabela `bot_state` tem chave primária em `key`, mas o `upsert` não condiciona a escrita ao estado anterior nem informa qual chamada adquiriu o lock. O endpoint de engajamento limita solicitações por IP, sem serializar globalmente a rotina. Não encontrei reivindicação idempotente por ID de denúncia nem teste de concorrência. A perda de aviso em falhas de envio já está registrada separadamente em OB-27.
- **Impacto:** Rajadas concorrentes podem gerar notificações Telegram duplicadas para a mesma denúncia e confundir ou sobrecarregar a moderação. É um fluxo secundário e o cenário depende de chamadas simultâneas.
- **Como verificar/reproduzir com segurança:** 1. Em staging, deixe uma denúncia pendente posterior ao watermark e um lock ausente ou vencido. 2. Use um teste concorrente que faça duas chamadas de `notifyNewCommunityReports` lerem o lock antes de liberar qualquer `setState`. 3. Com `sendTelegramApi` simulado, confirme que o mesmo ID de denúncia é enviado duas vezes.
- **Solução recomendada:** Substituir a sequência de leitura/gravação por aquisição atômica no banco, com expiração comparada e resultado explícito para apenas um vencedor. Também reivindicar cada relatório por ID para deduplicar o envio mesmo que o lock expire ou o processo reinicie.
- **Exemplo corrigido:**

```ts
const { data: acquired, error } = await supabase.rpc("claim_report_alert_lock", {
  p_now: new Date().toISOString(),
  p_lock_seconds: 30,
});
if (error) throw error;
if (acquired !== true) return;
```

`claim_report_alert_lock` é uma RPC atômica proposta, ainda inexistente; ela deve comparar e atualizar o lock em uma única transação.

- **Esforço estimado:** M
# **[OB-41] Leitura pública expõe justificativa editorial interna**

- **Categoria:** Segurança
- **Severidade:** Média
- **Confiança:** Alta
- **Status:** CONFIRMADO
- **Tipo de evidência:** Estática
- **CVSS estimado:** 5.3 (estimativa contextual)
- **Localização:** `src/app/posts/[slug]/page.tsx:27-34,174`; `src/app/posts/[slug]/PostDetailClient.tsx:374`; `src/app/admin/page.tsx:239-248`; `supabase/migrations/20260717190000_secure_platform.sql:98-100,132`; `supabase/migrations/20260924000002_post_editorial_gate_fields.sql:1-2,135-137`
- **Evidência:**



```sql
if v_word_count < 700 and char_length(btrim(coalesce(new.short_article_reason, ''))) < 20 then
  raise exception using errcode = '23514', message = 'Matérias com menos de 700 palavras precisam de justificativa editorial.';
end if;
```

```tsx
<PostArticle post={post} stats={stats} relatedPosts={relatedPosts} />
```

```tsx
{!post.is_published && <DraftQualityBanner post={post} />}
```

- **Descrição:** A policy limita quais linhas são visíveis, mas a permissão SQL libera todas as colunas da tabela para `anon`. O detalhe público consulta `select("*")` e passa a linha completa ao Client Component. `short_article_reason` é exigida pelo trigger em matérias com menos de 700 palavras e permanece após a publicação; a interface só renderiza `DraftQualityBanner`, que usa essa justificativa, enquanto o post ainda é rascunho. Assim, qualquer visitante pode obtê-la pela Data API pública ou pelo payload RSC mesmo sem vê-la na página. A publicação manual do painel também altera `is_published` sem remover essa justificativa. Campos de fluxo editorial, como `scheduled_at` e `brickboard_copy`, seguem a mesma projeção ampla quando preenchidos.
- **Mitigações verificadas:** RLS restringe a consulta pública a posts publicados; isso não filtra colunas. As consultas das listas usam `POST_LIST_COLUMNS`, mas o detalhe público usa `*`. Não encontrei `REVOKE SELECT` por coluna, view pública com projeção segura ou separação dos campos internos em tabela privada nas migrações lidas. A justificativa não é mostrada no componente para posts publicados, mas continua no objeto enviado ao cliente. A migration local adiciona o campo e o trigger; seu estado remoto segue NÃO VERIFICADO.
- **Impacto:** Visitantes podem recuperar a justificativa e outros metadados do fluxo editorial que a interface não pretende exibir. O impacto é exposição de contexto interno, sem evidência de segredo ou dado pessoal, por isso a severidade é média.
- **Como verificar/reproduzir com segurança:** 1. Em staging, crie uma matéria com menos de 700 palavras e uma justificativa editorial de pelo menos 20 caracteres. 2. Publique pelo painel administrativo. 3. Faça uma consulta anônima à Data API para esse slug selecionando `short_article_reason` ou inspecione o payload RSC de `/posts/<slug>`. 4. Confirme que o valor aparece na resposta embora `DraftQualityBanner` não seja renderizado na página pública.
- **Solução recomendada:** Expor somente uma projeção de publicação: mover campos de workflow/justificativa para tabela administrativa com RLS ou para uma view que contenha apenas colunas públicas. Revogar o `SELECT` amplo para `anon`, conceder apenas as colunas públicas necessárias e trocar o detalhe por uma projeção tipada explícita. Testar a resposta anônima para garantir que os campos internos não são retornados.
- **Exemplo corrigido:**

```ts
const PUBLIC_POST_COLUMNS = "id,slug,title,summary,body,category,image_url,image_alt,author_name,author_tag,is_published,published_at,created_at,updated_at,topic_id,information_status,featured_quote,editorial_sources,correction_note";
const { data } = await supabase
  .from("published_posts")
  .select(PUBLIC_POST_COLUMNS)
  .eq("slug", slug)
  .maybeSingle();
```
- **Esforço estimado:** M


`published_posts` deve ser uma view segura ou fonte equivalente com apenas colunas públicas; mudar apenas o `select` do componente não fecha consultas diretas à tabela via Data API.

# **[OB-39] Falha na paginação de notícias pode gerar tentativas em loop**

- **Categoria:** Bug
- **Severidade:** Média
- **Confiança:** Alta
- **Status:** CONFIRMADO
- **Tipo de evidência:** Estática
- **CVSS estimado:** N/A
- **Localização:** `src/components/feed/NewsList.tsx:23-39,41-52`; `src/app/api/news/route.ts:48-51`
- **Evidência:**

```ts
} finally {
  setIsLoading(false);
}
}, [isLoading, hasMore, page, period, search]);
```

```ts
const observer = new IntersectionObserver(
  (entries) => {
    if (entries[0].isIntersecting) void loadMore();
  },
  { rootMargin: "200px" }
);
observer.observe(el);
return () => observer.disconnect();
}, [loadMore]);
```

```ts
status: 429,
headers: { "Cache-Control": "private, no-store", "Retry-After": "60" },
```

- **Descrição:** Quando a próxima página responde com erro HTTP, `loadMore` retorna sem mostrar erro nem avançar a página, mas o `finally` desliga `isLoading`. Esse estado está nas dependências de `loadMore`, que por sua vez é dependência do efeito do `IntersectionObserver`; o efeito recria o observador enquanto o sentinel continua visível e tenta a mesma página outra vez. Uma falha de rede rejeitada também não tem `catch`, e a chamada iniciada pelo observador ignora a Promise. Uma resposta `429` do endpoint pode, portanto, provocar retentativas automáticas em vez de respeitar o `Retry-After` de 60 segundos.
- **Mitigações verificadas:** `isLoading` impede duas chamadas simultâneas dentro do mesmo render, e o observador é desconectado no cleanup; porém o ciclo de estados o reconecta após cada falha. A rota de notícias limita busca e devolve `Retry-After`, mas o componente não lê esse cabeçalho nem apresenta erro ou botão de nova tentativa. A busca em `tests/` e `e2e/` não encontrou teste comportamental para `NewsList` ou para resposta 429/falha de rede nessa paginação.
- **Impacto:** A página pode disparar uma sequência rápida de consultas repetidas, prolongar o bloqueio por limite e deixar o usuário sem carregamento adicional nem explicação. O cenário ocorre quando a API retorna erro ou a conexão falha enquanto ainda há mais resultados.
- **Como verificar/reproduzir com segurança:** 1. Em staging, abra `/noticias` com conteúdo suficiente para o sentinel entrar na viewport. 2. Faça a próxima chamada `/api/news` retornar `429` (ou desconecte a rede durante a chamada). 3. Observe no painel de rede que o mesmo número de página é solicitado novamente sem interação; a tela não oferece mensagem de erro nem controle de retry.
- **Solução recomendada:** Capturar falhas HTTP e de rede, manter um estado de erro visível e suspender o observador nessa condição. Disponibilizar retry explícito ou temporizado e, em `429`, obedecer ao `Retry-After`; reativar o sentinel apenas após a recuperação. Acrescentar teste de componente para provar que uma resposta de erro não repete a requisição automaticamente.
- **Exemplo corrigido:**

```tsx
const [loadError, setLoadError] = useState(false);
const loadMore = useCallback(async () => {
  if (isLoading || !hasMore || loadError) return;
  setIsLoading(true);
  try {
    const params = new URLSearchParams({ page: String(page) });
    if (period === "mes") params.set("periodo", "mes");
    if (search) params.set("q", search);
    const response = await fetch(`/api/news?${params}`);
    if (!response.ok) { setLoadError(true); return; }
    const data = await response.json();
    setPosts((current) => [...current, ...data.posts]);
    setPage((current) => current + 1);
    setHasMore(page + 1 < data.totalPages);
  } catch {
    setLoadError(true);
  } finally {
    setIsLoading(false);
  }
}, [isLoading, hasMore, loadError, page, period, search]);

useEffect(() => {
  const el = sentinelRef.current;
  if (!el || loadError) return;
  const observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) void loadMore();
  }, { rootMargin: "200px" });
  observer.observe(el);
  return () => observer.disconnect();
}, [loadMore, loadError]);
```
- **Esforço estimado:** M


Um botão acessível limpa `loadError` para habilitar nova tentativa; em `429`, ele deve permanecer desabilitado até o prazo informado em `Retry-After`.

# **[OB-40] Monitor de erros confirma recebimento mesmo quando os RPCs falham**

- **Categoria:** DevOps
- **Severidade:** Baixa
- **Confiança:** Alta
- **Status:** CONFIRMADO
- **Tipo de evidência:** Estática
- **CVSS estimado:** N/A
- **Localização:** `src/app/api/errors/route.ts:25-50`; `src/app/error.tsx:12-22`; `supabase/migrations/20260728000010_error_monitoring.sql:23-51`
- **Evidência:**

```ts
const { data: withinLimit } = await supabase.rpc("consume_rate_limit", {
  p_action: "client_error",
  p_identity_hash: identityHash,
  p_window_start: windowStart.toISOString(),
  p_limit: 20,
});
if (!withinLimit) return new NextResponse(null, { status: 204 });
```

```ts
await supabase.rpc("record_app_error", {
  target_source: typeof body.source === "string" ? body.source.slice(0, 80) : "web",
  target_message: body.message.trim().slice(0, 1000),
  target_route: typeof body.route === "string" ? body.route.slice(0, 300) : null,
  target_reference: typeof body.reference === "string" ? body.reference.slice(0, 100) : null,
  target_metadata: {},
});
return new NextResponse(null, { status: 204 });
```

```tsx
void fetch("/api/errors", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ source: "global-error-boundary", message: error.message }),
}).catch(() => undefined);
```

- **Descrição:** O endpoint não lê o campo `error` retornado por `consume_rate_limit` ou `record_app_error`. Quando a verificação do limite falha, `withinLimit` fica vazio e a rota responde 204 como se tivesse descartado um excesso normal; quando a persistência falha, também responde 204. O cliente ignora a resposta. Assim, uma falha na própria telemetria não produz alerta nem registro alternativo e o painel pode ficar sem os erros que deveria monitorar.
- **Mitigações verificadas:** A ingestão limita chamadas por IP, valida que `message` não está vazio e limita os campos gravados; a tabela tem retenção e leitura restrita a administradores. Isso reduz abuso e exposição, mas não detecta falhas da ingestão. Não encontrei log local ou notificação quando qualquer um dos dois RPCs falha, nem teste dessas condições.
- **Impacto:** Erros de banco, RPC ausente ou indisponibilidade podem ser omitidos silenciosamente, reduzindo a capacidade de perceber e investigar falhas do frontend. O restante do site continua respondendo; por isso a severidade é baixa.
- **Como verificar/reproduzir com segurança:** 1. Em staging, simule `consume_rate_limit` retornando erro e depois simule `record_app_error` retornando erro. 2. Envie um POST válido para `/api/errors`. 3. Confirme que o endpoint responde 204 em ambos os casos e que não aparece linha nova no monitor nem log de falha da ingestão.
- **Solução recomendada:** Inspecionar os erros retornados por ambos os RPCs. Em falha, emitir log estruturado de fallback usando apenas código de erro e referência, sem gravar mensagem/PII no log; devolver erro não-2xx e ajustar o texto do error boundary para não afirmar que o registro ocorreu sem confirmação. Adicionar teste de falha para cada RPC.
- **Exemplo corrigido:**

```ts
const { data: withinLimit, error: limitError } = await supabase.rpc("consume_rate_limit", {
  p_action: "client_error",
  p_identity_hash: identityHash,
  p_window_start: windowStart.toISOString(),
  p_limit: 20,
});
if (limitError) {
  console.error("Client error rate-limit failure", limitError.code);
  return NextResponse.json({ error: "Monitor indisponível" }, { status: 503 });
}
if (!withinLimit) return new NextResponse(null, { status: 204 });
const { error: recordError } = await supabase.rpc("record_app_error", {
  target_source: typeof body.source === "string" ? body.source.slice(0, 80) : "web",
  target_message: body.message.trim().slice(0, 1000),
  target_route: typeof body.route === "string" ? body.route.slice(0, 300) : null,
  target_reference: typeof body.reference === "string" ? body.reference.slice(0, 100) : null,
  target_metadata: {},
});
if (recordError) {
  console.error("Client error persistence failure", recordError.code);
  return NextResponse.json({ error: "Monitor indisponível" }, { status: 503 });
}
```

- **Esforço estimado:** P
# **[OB-42] Falha ao carregar notificações pode sobrescrever preferências salvas**

- **Categoria:** Bug
- **Severidade:** Média
- **Confiança:** Alta
- **Status:** CONFIRMADO
- **Tipo de evidência:** Estática
- **CVSS estimado:** N/A
- **Localização:** `src/app/configuracoes/notificacoes/page.tsx:8,14-18`; `src/lib/contexts/AuthContext.tsx:43-52`; `src/proxy.ts:5,50-52`; `supabase/migrations/20260803000001_reader_experience.sql:9-15,47-55`
- **Evidência:**


```tsx
async function save() { if (!user) return; const { error } = await supabase.from("notification_preferences").upsert({ user_id: user.id, ...preferences, updated_at: new Date().toISOString() }); setMessage(error ? "Não foi possível salvar as preferências." : "Preferências atualizadas."); }
```

```tsx
if (isLoading) return <div className="min-h-dvh bg-background-void" />;
```

```sql
user_id uuid primary key references auth.users(id) on delete cascade,
breaking_news boolean not null default true,
followed_topics boolean not null default true,
brickboard_replies boolean not null default true,
weekly_digest boolean not null default true,
```

- **Descrição:** A tela inicia com todos os alertas ativos e ignora o erro da consulta de preferências. Se a leitura falha para um usuário autenticado, o formulário continua editável com os padrões; ao salvar, o `upsert` grava os quatro valores e pode substituir escolhas anteriores. Quando não há sessão, o botão continua visível, mas `save()` retorna sem mensagem nem encaminhamento para login. O contexto de autenticação encerra o carregamento mesmo quando não há sessão, e o proxy não protege essa rota.
- **Mitigações verificadas:** A migration local limita leitura e gravação ao próprio `user_id`, impedindo alteração das preferências de outra conta. Isso não evita que a própria tela sobrescreva os dados do usuário após uma falha de leitura. Há estado de carregamento para autenticação, mas não para leitura/salvamento das preferências; não encontrei retry nem estado de erro para a consulta inicial. A implantação remota da migration não foi confirmada.
- **Impacto:** Uma falha transitória de rede ou PostgREST pode reativar categorias que a pessoa havia desativado ao gravar os padrões junto com uma mudança isolada. Uma pessoa sem sessão também não consegue salvar e não recebe explicação; severidade média pelo risco limitado a preferências de notificação.
- **Como verificar/reproduzir com segurança:** 1. Em staging, entre com uma conta e salve pelo menos uma categoria como desativada. 2. Faça a consulta `notification_preferences` falhar temporariamente, sem bloquear a sessão. 3. Abra `/configuracoes/notificacoes`, mude outra categoria e salve. 4. Consulte a linha da própria conta e confirme que as categorias não alteradas voltaram aos padrões. Como verificação separada, abra a rota sem sessão e clique em “Salvar preferências”; nenhum status ou navegação aparece.
- **Solução recomendada:** Modelar estados distintos de carregamento, sucesso e erro da leitura. Só habilitar a gravação após uma leitura bem-sucedida ou confirmação explícita de que ainda não existe linha; oferecer retry. Sem usuário autenticado, exibir acesso à conta e impedir a edição. Em gravação parcial, enviar apenas campos alterados ou preservar os valores recuperados.
- **Exemplo corrigido:**

```tsx
const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
const { data, error } = await supabase.from("notification_preferences")
  .select("breaking_news, followed_topics, brickboard_replies, weekly_digest")
  .eq("user_id", user.id).maybeSingle();
if (error) { setLoadState("error"); return; }
setPreferences(data ?? defaults);
setLoadState("ready");
```
- **Esforço estimado:** M


# **[OB-43] Falha de RPC oculta o progresso no Brickboard**

- **Categoria:** UX
- **Severidade:** Baixa
- **Confiança:** Alta
- **Status:** CONFIRMADO
- **Tipo de evidência:** Estática
- **CVSS estimado:** N/A
- **Localização:** src/app/brickboard/page.tsx:164-179

- **Evidência:**

```tsx
supabase.rpc("current_user_progress", {}).then(({ data }) => {
  if (data) {
    setUserProgress(data as PrivateProgressData);
    lastXpRef.current = (data as PrivateProgressData).progress.lifetime_xp;
  }
});
```

```tsx
const { data } = await supabase.rpc("current_user_progress", {});
if (!data) return;
setUserProgress(data as PrivateProgressData);
```

- **Descrição:** O resumo de progresso e o refresh de XP no Brickboard descartam error de current_user_progress. Se a RPC falhar, a página mantém o progresso ausente e não informa que os dados estão indisponíveis. Ranking e conquistas já tratam falhas com mensagem e retry; a constatação atual fica restrita ao resumo do Brickboard.
- **Mitigações verificadas:** src/app/brickboard/ranking/page.tsx:23-61 captura erro e apresenta mensagem; src/app/brickboard/conquistas/page.tsx:78-85 também mostra erro no carregamento do progresso. Essas proteções não cobrem as chamadas em src/app/brickboard/page.tsx:164-179.
- **Impacto:** A pessoa pode interpretar dados ausentes como falta de progresso e não consegue distinguir uma falha temporária do serviço.
- **Como verificar/reproduzir com segurança:** Em teste com Supabase mockado, faça current_user_progress retornar { data: null, error }; confirme que o Brickboard mostra estado de erro e permite tentar novamente.
- **Solução recomendada:** Ler e tratar error nos dois pontos de chamada; preservar o último progresso carregado e exibir retry quando não houver dado confirmado.
- **Exemplo corrigido:**

```tsx
const { data, error } = await supabase.rpc("current_user_progress", {});
if (error) throw error;
if (data) setUserProgress(data as PrivateProgressData);
```

- **Esforço estimado:** P
# **[OB-44] RLS limita os resultados da enquete ao voto do próprio leitor**

- **Categoria:** Bug
- **Severidade:** Média
- **Confiança:** Alta
- **Status:** CONFIRMADO
- **Tipo de evidência:** Estática
- **CVSS estimado:** N/A
- **Localização:** `src/lib/hooks/useCommunityFeed.ts:181-204`; `src/components/community/GamerPollWidget.tsx:18-22,73`; `supabase/migrations/20260723000000_community.sql:113-127,135`
- **Evidência:**


```tsx
const percentage = poll.total_votes > 0 ? Math.round((option.votes / poll.total_votes) * 100) : 0;
```

```sql
create policy community_poll_votes_select on public.community_poll_votes
  for select to authenticated
  using (auth.uid() = user_id);
```

```sql
grant select, insert, update on public.community_poll_votes to authenticated;
```

- **Descrição:** O feed consulta todas as linhas de voto no cliente e calcula contagens e percentuais no navegador. A policy `SELECT` só retorna ao usuário autenticado suas próprias linhas; para visitante anônimo não há grant de leitura. Assim, usuários conectados enxergam no máximo o próprio voto, e visitantes recebem zero ou erro de leitura tratado como ausência de votos. A interface apresenta esses dados como total e resultado da comunidade.
- **Mitigações verificadas:** A unicidade `(poll_id, user_id)` impede que uma conta tenha várias linhas para a mesma enquete. RLS protege a identidade dos votos de terceiros, mas também impede a agregação feita pelo feed. Revisei todas as migrations e buscas por `community_poll_votes`; não encontrei policy pública nem RPC que retorne apenas as contagens. A configuração remota segue não verificada.
- **Impacto:** O total e os percentuais exibidos não representam os votos da comunidade: em uma enquete com várias respostas, cada conta conectada vê apenas seu próprio voto, e visitantes não obtêm as linhas. Isso torna os resultados da enquete enganosos apesar de os votos serem gravados.
- **Como verificar/reproduzir com segurança:** 1. Em staging, registre votos de duas contas em opções diferentes da enquete. 2. Abra `/brickboard` em cada conta e como visitante anônimo. 3. Compare “X votos” e os percentuais com `COUNT(*) GROUP BY option_index` no banco. 4. Confirme que cada sessão só consegue obter sua própria linha pela consulta direta.
- **Solução recomendada:** Manter as linhas individuais privadas. Criar uma RPC ou endpoint que devolva somente `option_index` e contagem agregada para a enquete visível, com validação de estado/ID e sem `user_id`; manter uma consulta separada, filtrada pela sessão, para marcar a opção escolhida pelo usuário.
- **Exemplo corrigido:**

```sql
create or replace function public.get_poll_result_counts(target_poll_id uuid)
returns table(option_index integer, vote_count bigint)
language sql stable security definer set search_path = '' as $$
  select v.option_index, count(*)::bigint
  from public.community_poll_votes v
  join public.community_polls p on p.id = v.poll_id
  where v.poll_id = target_poll_id and p.is_active
  group by v.option_index;
$$;
```
- **Esforço estimado:** M


Conceder execução apenas aos papéis que podem ver a enquete e retornar exclusivamente as contagens; não relaxar a policy da tabela de votos individuais.

# **[OB-45] Visitantes anônimos recebem zero nas contagens de reação**

- **Categoria:** Bug
- **Severidade:** Média
- **Confiança:** Alta
- **Status:** CONFIRMADO
- **Tipo de evidência:** Estática
- **CVSS estimado:** N/A
- **Localização:** `src/lib/hooks/useCommunityFeed.ts:77-88,119-142`; `src/components/community/BrickCard.tsx:570-579`; `src/lib/supabase/client.ts:22-43`; `supabase/migrations/20260723000000_community.sql:78-81,131`
- **Evidência:**


```sql
create policy community_reactions_select on public.community_reactions
  for select to anon, authenticated
  using (true);
```

```sql
grant select, insert, delete on public.community_reactions to authenticated;
```

```tsx
<ReactionBar
  hype={post.reactions.hype || 0}
  flop={(post.reactions.flop || 0) + (post.reactions.salty || 0)}
```

- **Descrição:** O feed carrega reações no navegador e calcula os contadores a partir de `allReactions`. Embora a policy RLS inclua `anon`, o SQL não concede `SELECT` desse objeto a esse papel; o cliente usa a chave pública. O retorno sem dados deixa `reactionMap` vazio, e cada Brick é desenhado com contadores zerados. Contas autenticadas conseguem ler as linhas e veem números diferentes dos visitantes.
- **Mitigações verificadas:** A inserção está restrita a `auth.uid() = user_id`; a policy `SELECT` pretendia permitir leitura anônima, mas o grant não inclui `anon`. Busquei outros grants sobre a tabela e não há concessão global nas migrations. Conceder leitura direta a visitantes também exporia as linhas com `user_id`; por isso, o reparo deve retornar somente totais. A aplicação remota da migration não foi confirmada.
- **Impacto:** Visitantes não conseguem ver a participação da comunidade no Brickboard; uma interação popular parece ter zero reações até a pessoa entrar na conta. Isso reduz a precisão da interface pública, mas não impede votar ou reagir após autenticação.
- **Como verificar/reproduzir com segurança:** 1. Em staging, tenha um Brick com reações registradas. 2. Acesse `/brickboard` sem sessão e observe os contadores em zero. 3. Acesse a mesma página autenticado e compare os contadores reais. 4. No Network, confirme que a consulta anônima à tabela não retorna linhas por falta de privilégio.
- **Solução recomendada:** Substituir a leitura pública das linhas por uma RPC agregada que aceite os IDs visíveis e retorne apenas contagens por tipo, sem `user_id`. Manter o `user_reaction` do leitor em consulta autenticada e validar o resultado com uma conta anônima e outra autenticada.
- **Exemplo corrigido:**

```sql
select post_id,
       count(*) filter (where reaction_type = 'hype') as hype,
       count(*) filter (where reaction_type = 'flop') as flop,
       count(*) filter (where reaction_type = 'salty') as salty
from public.community_reactions
where post_id = any(target_post_ids)
group by post_id;
```
- **Esforço estimado:** M


Expor esse agregado por uma função com argumentos limitados e sem devolver a tabela de reações individualmente.

# **[OB-51] Falha ao republicar apaga o comentário digitado**

- **Categoria:** UX
- **Severidade:** Baixa
- **Confiança:** Alta
- **Status:** CONFIRMADO
- **Tipo de evidência:** Estática
- **CVSS estimado:** N/A
- **Localização:** `src/components/community/BrickCard.tsx:181-190`; `src/lib/hooks/useCommunityFeed.ts:436-458`; `src/app/brickboard/page.tsx:304-308`
- **Evidência:**

```tsx
setIsSharing(true);
await onSharePost(post, trimmed);
setShareText("");
setIsShareOpen(false);
setIsSharing(false);
```

```ts
if (error) setOperationError(getCommunityErrorMessage(error));
else await sendCommunityPush("repost", originalPost.id);
```

```tsx
{operationError && (
  <div role="alert" className="mb-5 flex items-start justify-between gap-4 border border-red-400/25 bg-red-500/10 p-4 text-sm text-red-100">
    <p>{operationError}</p>
    <button type="button" onClick={clearOperationError} className="min-h-8 shrink-0 px-2 font-bold text-red-200 hover:text-white" aria-label="Fechar aviso">Fechar</button>
  </div>
)}
```

- **Descrição:** Quando o insert do Brick republicado retorna erro, `sharePost` apenas atualiza o estado global de erro e resolve normalmente. O formulário interpreta a resolução como sucesso: apaga o comentário e fecha o composer. O aviso global informa que algo falhou, mas o texto que a pessoa escreveu já foi descartado.
- **Mitigações verificadas:** A página renderiza `operationError` em um alerta acessível, então a falha não fica totalmente silenciosa. Entretanto, o callback não comunica sucesso/falha ao formulário e não preserva o texto; `handleSubmitShare` também não usa `try/finally`, deixando `isSharing` ativo se o callback rejeitar por outra razão.
- **Impacto:** Uma falha transitória de rede ou RLS pode fazer a pessoa perder o comentário e precisar escrevê-lo novamente. O defeito afeta apenas a republicação, que pode ser tentada de novo.
- **Como verificar/reproduzir com segurança:** 1. Em staging, abra o composer de republicação com uma conta autenticada. 2. Digite um comentário. 3. Faça o insert falhar (por exemplo, simulando uma resposta de rede/RLS). 4. Observe o alerta de erro global e confirme que o composer fecha e o campo fica vazio.
- **Solução recomendada:** Fazer `sharePost` devolver um resultado explícito ou propagar o erro. Limpar o texto e fechar o composer apenas quando o insert for confirmado; usar `finally` para liberar o estado de envio.
- **Exemplo corrigido:**

```tsx
setIsSharing(true);
try {
  await onSharePost(post, trimmed);
  setShareText("");
  setIsShareOpen(false);
} catch {
  return;
} finally {
  setIsSharing(false);
}
```

O callback deve rejeitar a promise quando a gravação retorna erro, depois de registrar a mensagem acessível para a página.

- **Esforço estimado:** P
# **[OB-52] Voto em nota comunitária confirma sucesso antes da gravação**

- **Categoria:** Bug
- **Severidade:** Média
- **Confiança:** Alta
- **Status:** CONFIRMADO
- **Tipo de evidência:** Estática
- **CVSS estimado:** N/A
- **Localização:** `src/components/community/ArticleCommunityNotes.tsx:61-90`; `supabase/migrations/20260803000007_quality_operations.sql:12-19`
- **Evidência:**

```tsx
setVotedNotes((current) =>
  active ? current.filter((id) => id !== noteId) : [...current, noteId]
);
setNotes((current) =>
  current.map((note) =>
    note.id === noteId
      ? { ...note, helpful_count: Math.max(0, note.helpful_count + (active ? -1 : 1)) }
```

```tsx
toast.success("Nota marcada como útil!");
await supabase
  .from("community_note_votes")
  .insert({ note_id: noteId, user_id: user.id });
```

```sql
create trigger sync_community_note_helpful_count_trigger
after insert or delete on public.community_note_votes
for each row execute function public.sync_community_note_helpful_count();
```

- **Descrição:** O componente muda localmente o voto e o contador e mostra um toast de sucesso antes de persistir. O retorno do `insert` e do `delete` é ignorado; uma falha de rede, RLS ou constraint não reverte `votedNotes` nem `helpful_count`. O trigger recalcula o total apenas quando a mutação realmente acontece no banco.
- **Mitigações verificadas:** A tabela tem chave primária composta por nota e usuário, RLS que limita mutações ao titular e trigger que mantém o contador persistido. Essas proteções evitam duplicidade no banco, mas não sincronizam o estado otimista do navegador após resposta de erro. O carregamento também não trata erros de votos, e não há `catch`/rollback em `toggleHelpful`.
- **Impacto:** O leitor recebe confirmação de voto que não foi gravado; a contagem e o estado visual podem ficar incorretos até recarregar a página. A mesma inconsistência ocorre ao tentar remover um voto se o `delete` falhar.
- **Como verificar/reproduzir com segurança:** 1. Em staging, abra uma matéria com nota aprovada usando uma conta autenticada. 2. Intercepte/bloqueie a requisição de INSERT ou DELETE em `community_note_votes` ou use uma sessão sem privilégio. 3. Clique em “Útil”. 4. Observe o toast e contador alterados apesar da resposta de erro; recarregue e confirme que o voto não persistiu.
- **Solução recomendada:** Verificar o retorno da mutação, atualizar UI apenas após confirmação ou reverter o estado e mostrar erro; impedir cliques repetidos enquanto a requisição estiver pendente. Recarregar contagem e voto do usuário após erro recuperável.
- **Exemplo corrigido:**

```tsx
const { error } = active
  ? await supabase.from("community_note_votes").delete().eq("note_id", noteId).eq("user_id", user.id)
  : await supabase.from("community_note_votes").insert({ note_id: noteId, user_id: user.id });
if (error) {
  setMessage("Não foi possível atualizar seu voto. Tente novamente.");
  await reloadNotesAndVotes();
  return;
}
await reloadNotesAndVotes();
toast.success(active ? "Voto removido." : "Nota marcada como útil!");
```

- **Esforço estimado:** M
# **[OB-53] Falha ao editar ou excluir post fecha o diálogo como sucesso**

- **Categoria:** Bug
- **Severidade:** Média
- **Confiança:** Alta
- **Status:** CONFIRMADO
- **Tipo de evidência:** Estática
- **CVSS estimado:** N/A
- **Localização:** `src/lib/hooks/useCommunityFeed.ts:462-510`; `src/components/community/BrickCard.tsx:113-125,238-247`
- **Evidência:**

```ts
if (error) {
  console.error("Error editing post:", error.message);
  setOperationError(getCommunityErrorMessage(error));
  fetchData();
}
```

```tsx
await onEditPost(post.id, trimmed);
setIsEditOpen(false);
```

```tsx
await onDeletePost(post.id);
setIsDeletePostOpen(false);
```

- **Descrição:** `editPost` e `deletePost` tratam erros de banco sem rejeitar a promise. Os handlers da interface interpretam qualquer resolução como sucesso e fecham o editor/confirmação. Na edição, a página pode mostrar um alerta global, mas o formulário some; na exclusão, o erro fica apenas no console e o Brick volta quando `fetchData()` termina.
- **Mitigações verificadas:** O hook filtra exclusão por `user_id` e recarrega os dados ao receber erro; edição também dispara `fetchData()` e exibe `operationError`. Essas medidas atualizam o dado posterior, mas não preservam o diálogo nem informam a falha da exclusão ao usuário. O componente usa `finally` para liberar os indicadores de processamento.
- **Impacto:** O usuário pode acreditar que a operação foi concluída, perder o texto editado e ver o Brick reaparecer após exclusão negada ou falha de rede. É um defeito em ações secundárias autenticadas, sem bypass de autorização.
- **Como verificar/reproduzir com segurança:** 1. Em staging, abra o menu de um Brick próprio e escolha editar ou excluir. 2. Faça a requisição de UPDATE ou DELETE falhar por rede/RLS. 3. Confirme que o diálogo fecha apesar da falha; na exclusão, observe o Brick reaparecer após o refetch sem aviso na tela.
- **Solução recomendada:** Fazer os callbacks rejeitarem erro após registrar uma mensagem para a interface; só fechar o diálogo quando a operação for confirmada. Manter o conteúdo editado e exibir erro junto à ação.
- **Exemplo corrigido:**

```tsx
try {
  await onEditPost(post.id, trimmed);
  setIsEditOpen(false);
} catch (cause) {
  setEditError(cause instanceof Error ? cause.message : "Não foi possível salvar.");
} finally {
  setIsSavingEdit(false);
}
```
- **Esforço estimado:** M


Aplicar o mesmo contrato de erro à exclusão e não ocultar o erro atrás de `console.error`.

# **[OB-54] A API pública expõe quem curtiu comentários**

- **Categoria:** Segurança
- **Severidade:** Média
- **Confiança:** Alta
- **Status:** POTENCIAL
- **Tipo de evidência:** Dinâmica
- **CVSS estimado:** 5.3 (estimativa; se houver linhas acessíveis)
- **Localização:** `supabase/migrations/20260723000001_community_comment_likes.sql:1-16,28`; `supabase/migrations/20260928000000_article_comment_likes.sql:1-16,28`; `supabase/migrations/20260924000000_public_profile_view_and_access.sql:4-10,27-28`; `src/lib/hooks/useComments.ts:51-59`
- **Evidência:**


```sql
create policy community_comment_likes_select on public.community_comment_likes
  for select to anon, authenticated
  using (true);
grant select, insert, delete on public.community_comment_likes to anon, authenticated;
```

```sql
select
  id,
  user_id,
  nickname,
  username,
```

```ts
.from("article_comment_likes")
.select("comment_id, user_id")
.in("comment_id", rawComments.map((comment) => comment.id));
```

- **Descrição:** As duas tabelas de curtidas de comentários têm leitura aberta ao papel `anon` e retornam o identificador do usuário junto ao comentário. A view de perfil expõe o mesmo `user_id` com nickname/username, permitindo associar ações a contas públicas. A interface calcula totais e o estado do próprio usuário, mas a API permite enumerar as linhas de todos os usuários.
- **Mitigações verificadas:** RLS valida que cada conta só insira/apague suas próprias curtidas, mas a policy de leitura é `using (true)` para `anon` e `authenticated`, e os grants autorizam a consulta pública. Um `HEAD SELECT user_id` com chave pública sem sessão foi aceito para as duas tabelas; não baixei valores. A contagem de `community_comment_likes` foi 0 e a resposta de contagem de `article_comment_likes` veio nula, portanto a existência de linhas consultáveis hoje não está confirmada. `article_comment_likes` tem unicidade por comentário/usuário, o que limita duplicatas, não a leitura. A função usa a tabela diretamente; não encontrei RPC de contagem que esconda `user_id`. A view `public_profiles` tem `security_barrier`, mas expõe deliberadamente o identificador usado para associar perfil e curtida.
- **Impacto:** Visitantes podem coletar relações entre contas identificáveis e comentários que curtiram, revelando interesses e comportamento de leitura além das contagens mostradas na tela. Isso amplia a exposição de informações potencialmente identificáveis; a LGPD define dado pessoal como informação relacionada a pessoa identificada ou identificável, e a ANPD explica que associação com contexto pode permitir essa identificação ([Lei 13.709/2018, art. 5º, I](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm), [orientação da ANPD](https://www.gov.br/anpd/pt-br/assuntos/titular-de-dados)). A necessidade dessa divulgação e a política de privacidade devem ser revisadas.
- **Como verificar/reproduzir com segurança:** Em staging, crie uma curtida com uma conta de teste; sem sessão, consulte a tabela correspondente com a chave pública e os campos `comment_id,user_id`. Use um perfil de teste na view `public_profiles` para confirmar a associação. Não faça essa enumeração em produção.
- **Solução recomendada:** Revogar SELECT público das tabelas individuais. Servir contagens por comentário via RPC/view que retorne somente IDs públicos e totais; obter `user_has_liked` em consulta que filtre pelo usuário autenticado. Revisar a mesma classe de dados em `community_reactions` e `community_note_votes` e ajustar a política de privacidade.
- **Exemplo corrigido:**

```sql
revoke select on public.article_comment_likes from anon, authenticated;
revoke select on public.community_comment_likes from anon, authenticated;

create function public.comment_like_counts(target_comment_ids uuid[])
returns table(comment_id uuid, likes_count bigint)
language sql stable security definer set search_path = public as $$
  select comment_id, count(*)
  from public.article_comment_likes
  where comment_id = any(target_comment_ids)
  group by comment_id;
$$;
```
- **Esforço estimado:** M


Conceder execução da função somente aos papéis necessários e manter a consulta individual do usuário autenticado separada.

### Revalidação segura em 05/10/2026

A policy local de `community_comment_likes` permite `SELECT` para `anon` com `using (true)`. Uma consulta pública `GET ...?select=user_id&limit=0` respondeu HTTP 200, confirmando que o endpoint aceita a projeção, mas não requisitei nem li linhas. Para `article_comment_likes`, o endpoint atual retorna PGRST205; a exposição dessa segunda tabela não está ativa no schema consultado e o defeito de disponibilidade está separado em OB-114.

```text
GET /rest/v1/community_comment_likes?select=user_id&limit=0 -> HTTP 200; limit=0, sem linhas lidas
```

# **[OB-55] Falhas ao carregar ou enviar notas não têm feedback completo**

- **Categoria:** UX
- **Severidade:** Baixa
- **Confiança:** Alta
- **Status:** CONFIRMADO
- **Tipo de evidência:** Estática
- **CVSS estimado:** N/A
- **Localização:** `src/components/community/ArticleCommunityNotes.tsx:28-59,93-123,150-173`
- **Evidência:**

```tsx
const { data } = await supabase
  .from("community_notes")
  .select("id, content, source_url, status, helpful_count, created_at")
  .eq("post_id", postId)
  .order("helpful_count", { ascending: false });
if (isMounted && data) {
  setNotes(data as Note[]);
}
```

```tsx
const { error } = await supabase
  .from("community_notes")
  .insert({
    post_id: postId,
    user_id: user.id,
    content: content.trim(),
    source_url: sourceUrl.trim(),
  });
if (error) {
  toast.error("Não foi possível enviar a nota.");
```

```tsx
{message && <p role="status" className="mt-4 text-xs text-gray-300">{message}</p>}
```

- **Descrição:** A leitura descarta `error`; quando a consulta falha e `data` é nulo, a seção permanece sem notas e sem mensagem, igual ao estado sem conteúdo. O envio mostra mensagem quando o Supabase devolve `{ error }`, mas não captura rejeição da promise por falha de rede. O formulário não tem estado de envio nem evita submissão repetida.
- **Mitigações verificadas:** A mensagem usa `role="status"` quando definida e as respostas de erro retornadas pelo cliente Supabase são exibidas no envio. Não há indicador de carregamento, estado vazio/erro para leitura, `try/catch` no `loadNotes` ou `submit`, nem tratamento ao executar `void loadNotes()` no efeito.
- **Impacto:** A pessoa pode concluir que não há notas disponíveis quando o serviço está indisponível. Falha de rede ao enviar deixa a ação sem resposta acessível e pode gerar rejeição não tratada no console; uma nova tentativa pode duplicar a nota se o primeiro INSERT tiver sido gravado e apenas a resposta tiver se perdido.
- **Como verificar/reproduzir com segurança:** 1. Em uma matéria, bloqueie a leitura de `community_notes`; a seção fica sem nota e sem erro/estado de carregamento. 2. Abra o formulário e faça o request de INSERT rejeitar por falha de rede. 3. Confirme que não aparece mensagem e que a promise rejeitada fica sem tratamento no handler.
- **Solução recomendada:** Tratar erros e rejeições no carregamento e no envio, distinguir estados `loading`, `empty` e `error`, e controlar a submissão com indicador/disable. Para resposta perdida, usar chave idempotente ou consultar se a nota já foi persistida antes de repetir.
- **Exemplo corrigido:**

```tsx
try {
  setIsSubmitting(true);
  const { error } = await supabase.from("community_notes").insert(payload);
  if (error) throw error;
  setMessage("Nota enviada para revisão editorial.");
} catch {
  setMessage("Não foi possível enviar a nota. Verifique sua conexão e tente novamente.");
} finally {
  setIsSubmitting(false);
}
```

O carregamento deve usar um estado próprio e exibir “Nenhuma nota aprovada” somente quando a consulta concluir com sucesso e retornar uma lista vazia.

- **Esforço estimado:** P
# **[OB-56] Respostas a respostas são aceitas, mas somem da interface**

- **Categoria:** Bug
- **Severidade:** Média
- **Confiança:** Alta
- **Status:** CONFIRMADO
- **Tipo de evidência:** Estática
- **CVSS estimado:** N/A
- **Localização:** `src/components/comments/CommentList.tsx:43-52`; `src/components/community/BrickCard.tsx:302-311`; `src/lib/hooks/useComments.ts:81-89`; `supabase/migrations/20260717190000_secure_platform.sql:119-129`; `supabase/migrations/20260723000000_community.sql:98-101`; `supabase/migrations/20260928000001_community_comment_threads.sql:18-22`; `supabase/migrations/20260928000002_article_comment_threads.sql:15-19`
- **Evidência:**

```ts
.insert({ post_id: postId, user_id: user.id, parent_id: parentId, content })
.select()
.single();
```

```sql
create policy community_comments_insert on public.community_comments
  for insert to authenticated
  with check (auth.uid() = user_id);
```

```sql
foreign key (parent_id, post_id)
references public.comments (id, post_id)
on delete cascade;
```

- **Descrição:** As interfaces de comentário constroem a lista com comentários-raiz e somente uma camada de respostas diretas. A interface normal também direciona o botão “Responder” à raiz, mas as tabelas expõem INSERT direto via Supabase e as policies não exigem que `parent_id` seja nulo ou aponte a uma raiz. A FK composta só garante que pai e resposta pertençam à mesma matéria; uma conta autenticada pode inserir uma resposta cujo pai já é uma resposta. Esse registro não entra no `flatMap` e não aparece na lista.
- **Mitigações verificadas:** O botão de resposta normaliza o destino com `comment.parent_id || comment.id`; isso impede a criação pela interface usual, mas não substitui validação no banco. A FK composta impede respostas ligadas a outro post e o limite diário reduz volume, mas não restringe profundidade. Não há renderer recursivo nem trigger que exija um pai sem `parent_id` nas migrations lidas.
- **Impacto:** Uma conta autenticada pode gravar respostas públicas que ficam invisíveis na interface, criando discrepância entre banco, moderação e experiência do leitor. Em matérias, a policy limita o autor ao próprio `user_id` e ao post publicado; em ambos os feeds o defeito é restrito ao encadeamento de respostas.
- **Como verificar/reproduzir com segurança:** 1. Em staging, crie uma resposta normal para um comentário. 2. Com uma sessão autenticada válida, envie diretamente ao PostgREST um INSERT de comentário com `post_id` igual ao da matéria e `parent_id` apontando para aquela resposta. 3. Confirme que o banco aceita pela FK/policy, recarregue a lista e observe que o novo comentário não aparece.
- **Solução recomendada:** Como a interface implementa apenas um nível, rejeitar no banco respostas cujo pai já tenha `parent_id` preenchido, para `comments` e `community_comments`. Se respostas aninhadas forem desejadas, substituir o `flatMap` de nível único por uma árvore recursiva e testar a exclusão em cascata.
- **Exemplo corrigido:**

```sql
select parent.parent_id into parent_parent_id
from public.comments parent
where parent.id = new.parent_id and parent.post_id = new.post_id;
if parent_parent_id is not null then
  raise exception 'Respostas devem apontar para um comentário principal.';
end if;
```
- **Esforço estimado:** M


Aplicar a mesma validação à tabela `community_comments` antes de cada INSERT.

# **[OB-57] A migration de respostas usa uma coluna sem criá-la no histórico local**

- **Categoria:** DevOps
- **Severidade:** Baixa
- **Confiança:** Alta
- **Status:** CONFIRMADO
- **Tipo de evidência:** Estática
- **CVSS estimado:** N/A
- **Localização:** `supabase/migrations/20260928000002_article_comment_threads.sql:1-19`; `supabase/migrations/20260928000001_community_comment_threads.sql:1-2`; `src/lib/types/database.ts:490,500`
- **Evidência:**

```sql
create index if not exists comments_parent_created_idx
  on public.comments (parent_id, created_at);
```

```sql
alter table public.community_comments
  add column if not exists parent_id uuid;
```

```sql
alter table public.comments
  add constraint comments_parent_post_fkey
  foreign key (parent_id, post_id)
  references public.comments (id, post_id)
  on delete cascade;
```

- **Descrição:** A migration de threads de matérias cria índice e chave estrangeira usando `comments.parent_id`, mas não adiciona a coluna. Nas migrations locais, somente `community_comments.parent_id` recebe `ALTER TABLE ... ADD COLUMN`. Ainda assim, a consulta de schema atual ao PostgREST `comments?select=id,parent_id&limit=0` retornou HTTP 200: o campo existe na produção consultada, mas sua origem não está no histórico SQL versionado encontrado.
- **Mitigações verificadas:** A coluna está presente no schema remoto consultado, então não há evidência de falha atual da API. Pesquisei todas as migrations por `parent_id`; nenhuma adiciona o campo a `public.comments`. `supabase/` contém `config.toml`, functions e migrations, sem snapshot de schema ou migration adicional fora dessa árvore. A migration ledger remota e eventual bootstrap externo não foram verificados.
- **Impacto:** Uma nova instalação, staging ou restauração baseada apenas no histórico local pode falhar ao criar o índice ou a FK, ou depender de alteração manual não documentada. O risco imediato é baixo porque o campo remoto já existe.
- **Como verificar/reproduzir com segurança:** 1. Em ambiente de teste, aplique o bootstrap conhecido para `public.comments` e as migrations locais em sequência. 2. Antes de `20260928000002_article_comment_threads.sql`, confirme que nenhuma migration adicionou `parent_id`. 3. A criação de `comments_parent_created_idx` falhará se o bootstrap também não fornecer a coluna.
- **Solução recomendada:** Adicionar `ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS parent_id uuid` antes do índice e da FK, ou documentar e versionar formalmente o bootstrap que cria o schema base; em seguida reconciliar a migration ledger com staging.
- **Exemplo corrigido:**

```sql
alter table public.comments
  add column if not exists parent_id uuid;

create unique index if not exists comments_id_post_unique_idx
  on public.comments (id, post_id);
```

- **Esforço estimado:** P
# **[OB-58] O proprietário não consegue apagar o próprio comentário**

- **Categoria:** Bug
- **Severidade:** Média
- **Confiança:** Alta
- **Status:** CONFIRMADO
- **Tipo de evidência:** Estática
- **CVSS estimado:** N/A
- **Localização:** `src/lib/hooks/useComments.ts:142-157`; `src/app/posts/[slug]/PostDetailClient.tsx:587-598`; `src/components/comments/CommentItem.tsx:31,50-53,95-105`; `supabase/migrations/20260717190000_secure_platform.sql:83-96,115-134`
- **Evidência:**

```sql
create policy comments_public_read on public.comments
  for select to anon, authenticated
  using (true);
create policy comments_user_insert on public.comments
  for insert to authenticated
```

```sql
grant select on public.posts, public.comments to anon, authenticated;
grant insert on public.comments to authenticated;
```

```tsx
{isOwner && onDelete && (
  <button onClick={() => setShowDeleteConfirmation(true)}
    aria-label="Apagar comentário">
```

- **Descrição:** O hook oferece uma operação DELETE na tabela `comments` e a página expõe confirmação de exclusão ao autor do comentário. A migration habilita RLS, apaga policies antigas e recria apenas leitura pública e inserção autenticada; não cria policy de DELETE nem concede esse privilégio. A operação do proprietário é portanto recusada pelo banco.
- **Mitigações verificadas:** A tela só mostra o botão quando `user.id === comment.user_id`, e o hook exige sessão. Porém, a verificação do proprietário é somente no cliente; mesmo com esse filtro, a policy e o grant necessários para executar a exclusão não existem nas migrations. O hook converte o erro em `error` visível, mas não remove o comentário. Busquei policies/grants em todas as migrations e não encontrei uma regra posterior para `public.comments`.
- **Impacto:** Leitores não conseguem remover comentários próprios publicados em matérias; o modal fecha e a lista entra em estado de erro, sem concluir a ação. Isso impede correção/autogestão do conteúdo e pode gerar chamadas repetidas sem efeito.
- **Como verificar/reproduzir com segurança:** 1. Em staging, autenticado como autor de um comentário de matéria, clique em “Apagar comentário” e confirme. 2. Observe o DELETE em `comments` retornar erro de permissão/RLS e o registro continuar no banco. 3. Confira que a UI mostra falha e mantém o comentário.
- **Solução recomendada:** Conceder DELETE a `authenticated` e criar policy que exija `auth.uid() = user_id`; filtrar também `.eq("user_id", user.id)` na consulta do cliente. Se a exclusão não for um requisito, remover o botão e os handlers.
- **Exemplo corrigido:**

```sql
grant delete on public.comments to authenticated;
create policy comments_owner_delete on public.comments
  for delete to authenticated
  using (auth.uid() = user_id);
```
- **Esforço estimado:** M


# **[OB-46] Brickboard carrega todo o histórico em cada atualização**

- **Categoria:** Performance
- **Severidade:** Média
- **Confiança:** Alta
- **Status:** CONFIRMADO
- **Tipo de evidência:** Estática
- **CVSS estimado:** N/A
- **Localização:** `src/lib/hooks/useCommunityFeed.ts:49-58,77-105,225-244`; `src/app/brickboard/page.tsx:48,51,127-144`
- **Evidência:**


```ts
const { data: allComments } = await supabase
  .from("community_comments")
  .select("*");
```

```ts
if (
  payload.table === "community_posts" ||
  payload.table === "community_reactions" ||
  payload.table === "community_comments" ||
  payload.table === "community_poll_votes"
) {
  fetchData();
}
```

```tsx
const [visiblePostCount, setVisiblePostCount] = useState(8);
const visiblePosts = displayPosts.slice(0, visiblePostCount);
```

- **Descrição:** A primeira consulta baixa todos os posts; em seguida o cliente busca todas as reações e comentários e agrega tudo em memória. A tela mostra inicialmente oito posts e amplia essa lista no navegador, sem paginação da consulta. Cada mudança realtime em posts, reações, comentários ou votos chama novamente `fetchData()` e repete as leituras globais. Na configuração padrão do Supabase, consultas sem paginação têm teto de 1.000 linhas; acima dele, posts antigos e contagens podem ficar de fora ([documentação oficial](https://supabase.com/docs/reference/javascript/v1/select)).
- **Mitigações verificadas:** `visiblePostCount` limita os elementos renderizados por vez, mas não os dados transferidos. Não há `.limit()`, `.range()` ou cursor nas leituras de posts, reações e comentários do hook. `supabase/config.toml` não define `api.max_rows`; o teto remoto do projeto não foi consultado. A assinatura realtime é removida no cleanup, mas cada evento relevante ainda repete a carga completa.
- **Impacto:** Com o crescimento da comunidade, cada visitante baixa mais conteúdo do que renderiza, usa memória para agregar histórico que não está vendo e gera novas leituras globais em períodos de atividade. Isso aumenta latência, tráfego e carga do banco; ao atingir o teto de linhas, a interface também deixa de representar o histórico e os totais corretamente.
- **Como verificar/reproduzir com segurança:** 1. Em staging, crie mais de 1.000 posts, comentários e reações. 2. Abra `/brickboard` e observe no Network as consultas sem `limit`/`offset`; compare o tamanho de cada resposta e o primeiro conjunto de posts visível. 3. Gere uma reação ou comentário e observe que o cliente consulta novamente as tabelas completas. 4. Compare a contagem mostrada com a agregação SQL do banco.
- **Solução recomendada:** Buscar uma página pequena e ordenada por cursor estável, projetar somente os campos exibidos e agregar reações/comentários no servidor somente para os IDs dessa página. Ao receber evento realtime, atualizar o item afetado ou debouncer uma única atualização da página atual; não recarregar todo o histórico.
- **Exemplo corrigido:**

```ts
const { data: postRows } = await supabase
  .from("community_posts")
  .select("id,content,author_name,created_at,platform_tag,media_url")
  .order("created_at", { ascending: false })
  .order("id", { ascending: false })
  .limit(20);
const postIds = (postRows ?? []).map((post) => post.id);
const { data: counts } = await supabase.rpc("community_feed_counts", { post_ids: postIds });
```
- **Esforço estimado:** M


`community_feed_counts` deve devolver somente os agregados dos IDs autorizados/solicitados, e a próxima página deve usar o cursor do último post.

# **[OB-47] O sort do cliente desfaz a ordem dos posts fixados**

- **Categoria:** Bug
- **Severidade:** Baixa
- **Confiança:** Alta
- **Status:** CONFIRMADO
- **Tipo de evidência:** Estática
- **CVSS estimado:** N/A
- **Localização:** `src/lib/hooks/useCommunityFeed.ts:53-58`; `src/app/brickboard/page.tsx:127-134`; `src/components/community/BrickCard.tsx:337-340`
- **Evidência:**

```ts
const { data: postRows, error: postsError } = await supabase
  .from("community_posts")
  .select("*")
  .order("is_pinned", { ascending: false })
  .order("created_at", { ascending: false });
```

```tsx
const displayPosts = [...filteredPosts].sort((a, b) => {
  if (activeTab === "trending") {
    const score = (post: typeof a) => (post.comments_count || 0) * 3 + (post.reactions.hype || 0) + (post.shares_count || 0) * 2;
    return score(b) - score(a) || new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  }
  return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
});
```

- **Descrição:** A consulta do feed coloca `is_pinned = true` antes dos demais posts, mas o componente cria uma nova ordenação por data em `latest` e `following`, sem considerar `is_pinned`. Um Brick fixado antigo pode ficar abaixo dos posts novos, apesar de continuar marcado visualmente como “Fixo”.
- **Mitigações verificadas:** A ordenação da consulta mantém os fixados no topo apenas até o `sort` no cliente; a renderização de `BrickCard` preserva o rótulo, mas não reposiciona o post. A aba `trending` tem ordenação própria por pontuação e também não prioriza fixados. Não encontrei outro sort aplicado após `displayPosts` que restaure a prioridade.
- **Impacto:** Um aviso ou conversa fixada deixa de cumprir a função de destaque e pode não aparecer entre os primeiros posts visíveis. O efeito é de apresentação e não altera os dados.
- **Como verificar/reproduzir com segurança:** 1. Em staging, marque como fixado um Brick antigo e deixe vários posts recentes sem fixação. 2. Abra `/brickboard` na aba “Mais recentes”. 3. Observe o Brick fixado depois dos posts recentes, embora ainda tenha o selo “Fixo”.
- **Solução recomendada:** Na ordenação de `latest` e `following`, comparar `is_pinned` antes de `created_at`; decidir explicitamente se o ranking “Em alta” também deve manter fixados no topo.
- **Exemplo corrigido:**

```tsx
const displayPosts = [...filteredPosts].sort((a, b) => {
  if (activeTab !== "trending" && a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
  if (activeTab === "trending") {
    const score = (post: typeof a) => (post.comments_count || 0) * 3 + (post.reactions.hype || 0) + (post.shares_count || 0) * 2;
    return score(b) - score(a) || new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  }
  return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
});
```

- **Esforço estimado:** P
# **[OB-48] A enquete vencida continua visível até a próxima execução do cron**

- **Categoria:** Bug
- **Severidade:** Média
- **Confiança:** Alta
- **Status:** CONFIRMADO
- **Tipo de evidência:** Estática
- **CVSS estimado:** N/A
- **Localização:** `src/lib/hooks/useCommunityFeed.ts:157-164,199-208,391-415`; `src/lib/daily-poll-generator.ts:66-72`; `src/app/api/cron/daily-poll/route.ts:9-13`; `supabase/migrations/20260723000003_harden_community_identity.sql:309-320`; `vercel.json:15-17`
- **Evidência:**


```json
{
  "path": "/api/cron/daily-poll",
  "schedule": "0 10 * * *"
}
```

```sql
or (selected_poll.expires_at is not null and selected_poll.expires_at <= now())
or not exists (
  select 1
  from jsonb_array_elements(selected_poll.options) option
```

```ts
} catch (err) {
  console.error("Failed to vote:", err);
  await fetchData();
}
```

- **Descrição:** O gerador expira cada pergunta às 23h59 no fuso de Brasília, e o próximo cron está configurado para 10h UTC, aproximadamente 7h no horário de Brasília. Nesse intervalo, a consulta do feed ainda aceita qualquer enquete marcada `is_active` e já iniciada, pois não filtra `expires_at`; ela continua mostrando a pergunta anterior. O trigger rejeita novos votos quando a data de expiração passou, mas o `catch` só registra no console e recarrega o mesmo estado vencido. O cron pode prolongar a janela se falhar. Vercel define os horários de cron em UTC ([documentação oficial](https://vercel.com/docs/cron-jobs)).
- **Mitigações verificadas:** O handler de alteração de voto também valida `expires_at`, e o trigger de inserção impede gravar depois do vencimento; isso protege o banco, mas não oculta a pergunta vencida nem informa o leitor. `generateDailyPoll` desativa a pergunta anterior ao criar a nova, mas isso só ocorre quando o cron seguinte executa com sucesso. A migration e o cron publicados não foram consultados.
- **Impacto:** Por cerca de sete horas em cada ciclo diário, o Brickboard pode mostrar a pergunta anterior como “Pergunta do dia”; o botão aceita clique, mas o banco rejeita o voto e a interface não explica a falha. A indisponibilidade desse fluxo se amplia se a execução agendada falhar.
- **Como verificar/reproduzir com segurança:** 1. Em staging, mantenha uma enquete `is_active = true` cujo `expires_at` já passou e ainda não execute a geração da próxima pergunta. 2. Abra `/brickboard` com uma conta que não votou. 3. Confirme que a pergunta aparece; tente votar e observe que a gravação falha, o widget permanece e não há mensagem visível.
- **Solução recomendada:** Filtrar `expires_at IS NULL OR expires_at > now()` na seleção do feed e limpar `poll` quando não houver pergunta válida. Exibir uma mensagem de erro se o voto falhar, sem conservar a atualização otimista como se tivesse sido aceita. Separar expiração da publicação da próxima enquete para que uma falha de cron não reabra o período.
- **Exemplo corrigido:**

```ts
const now = new Date().toISOString();
const { data: pollRows } = await supabase.from("community_polls")
  .select("*").eq("is_active", true)
  .lte("prompt_date", new Date().toISOString().slice(0, 10))
  .or(`expires_at.is.null,expires_at.gt.${now}`)
  .order("prompt_date", { ascending: false }).limit(1).maybeSingle();
if (!pollRows) setPoll(null);
```
- **Esforço estimado:** M


### Continuação da auditoria — exportação e integrações de contato — 28/09/2026

- Revisei src/app/api/contact/route.ts, src/app/api/admin/contact/route.ts, src/app/api/newsletter/route.ts, src/app/api/notifications/route.ts, src/app/api/home-engagement/route.ts e src/lib/telegram/bot.ts. O alerta de contato não interpola campos enviados pelo visitante; a mensagem fica persistida na caixa do Supabase antes do aviso. Falhas silenciosas de notificação/telemetria já estão cobertas por achados existentes e não foram duplicadas.
- Revisei o exportador de dados, a tela de privacidade, a criação do identificador local, as rotas de upload/exclusão de conta, a proteção SSRF e o callback OAuth. A sessão é validada, mas os conjuntos de reações e visualizações filtram somente pelo cabeçalho x-orange-brick-device recebido do cliente. Acrescentei OB-59, delimitando a pré-condição de aparelho compartilhado ou identificador previamente conhecido.
- A autenticação dos endpoints administrativos de equipe, estatísticas, mídia e Storage foi lida; a análise não executou mutações externas nem teve sessão autenticada de staging. O ledger remoto e a restauração de backup continuam pendentes.
- Nenhum arquivo do produto, migration remota, configuração de domínio ou serviço externo foi alterado. A única escrita desta continuação foi este relatório.

# **[OB-59] Exportação autenticada pode revelar histórico de outro usuário do mesmo aparelho**

- **Categoria:** Segurança
- **Severidade:** Média
- **Confiança:** Alta
- **Status:** CONFIRMADO
- **Tipo de evidência:** Estática
- **CVSS estimado:** N/A — depende de aparelho/sessão compartilhados
- **Localização:** `src/app/api/user/data/route.ts:40-51,75-96`; `src/components/ui/PrivacyControls.tsx:22-26`; `src/lib/consent.ts:19-27`; `supabase/migrations/20260717190000_secure_platform.sql:68-72,131`
- **Evidência:**

```ts
const { data: { user }, error: authError } = await supabase.auth.getUser();
if (authError || !user) {
  return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
}

const serviceClient = createServiceRoleClient();
const rawDeviceId = request.headers.get("x-orange-brick-device") ?? "";
const deviceId = /^[a-f0-9]{32}$/.test(rawDeviceId) ? rawDeviceId : null;
```

```ts
let query = serviceClient
  .from("reactions")
  .select("id,post_id,device_id,reaction_type,created_at")
  .eq("device_id", deviceId)
  .order("id");
```

- **Descrição:** A rota confirma que a pessoa está autenticada, mas lê reações e histórico de leitura usando apenas o identificador de aparelho informado no cabeçalho da requisição. O cliente obtém esse valor do localStorage; a API não demonstra que o aparelho pertence à conta autenticada. Como a consulta usa credencial de serviço, as policies RLS/grants que bloqueiam leitura direta por anon e authenticated não vinculam essa consulta à sessão. Em um navegador compartilhado, uma segunda conta conectada pode exportar as reações e as matérias visualizadas pela pessoa anterior.
- **Mitigações verificadas:** auth.getUser() exige sessão válida; a rota valida o formato hexadecimal de 32 caracteres; o identificador é criado com 16 bytes aleatórios e guardado no localStorage; as migrations revogam acesso direto às tabelas de anon e authenticated. Esses controles não associam o identificador recebido ao usuário validado pela sessão. Não encontrei nessa rota uma associação server-side de device_id a user.id.
- **Impacto:** Uma pessoa conectada em um perfil de navegador compartilhado pode receber a lista de matérias lidas, horários e tipos de reação de quem usou o mesmo navegador antes. O risco não permite adivinhar IDs aleatórios em massa, mas expõe histórico pessoal quando o identificador já está disponível nesse perfil ou foi obtido previamente.
- **Como verificar/reproduzir com segurança:** 1. Em staging, aceite o consentimento e use uma conta A para ler matérias e registrar reações. 2. No mesmo perfil de navegador, encerre a sessão A e entre com uma conta B sem limpar o armazenamento local. 3. Solicite /api/user/data?dataset=article_views e /api/user/data?dataset=article_reactions com o cabeçalho x-orange-brick-device enviado pelo próprio frontend. 4. Observe que a API retorna linhas associadas ao aparelho sem filtrar pelo ID da conta B. Não faça a verificação com dados reais de usuários.
- **Solução recomendada:** Registrar atividades autenticadas com user_id e filtrar a exportação por esse campo. Para eventos anônimos, manter uma identidade separada e exigir prova de controle do identificador antes de exportá-los; não tratá-los como dados da conta apenas porque a requisição contém uma sessão válida. Evitar que operações privilegiadas usem um valor arbitrário do cabeçalho como autorização.
- **Exemplo corrigido:** Após uma migration que associe a atividade à conta e trate explicitamente os eventos anônimos, consultar somente pelo titular autenticado:

```ts
const { data, error } = await serviceClient
  .from("user_activity")
  .select("post_id,activity,created_at")
  .eq("user_id", user.id)
  .order("id")
  .range(start, end);
```
- **Esforço estimado:** M

### Continuação da auditoria — Edge Function de geração de imagem — 28/09/2026

- Busquei todas as referências a generate-image; só encontrei sua definição e verify_jwt em supabase/config.toml. Não há consumidor frontend no repositório. Se implantada, a função continua acessível diretamente a administradores; a implantação remota não foi consultada.
- A função chama Pollinations sem AbortSignal e lê o corpo inteiro com arrayBuffer antes de comparar o tamanho com 10 MB. Não encontrei um limite de streaming ou cancelamento em outra camada local. Acrescentei OB-60 como risco de disponibilidade restrito a esse endpoint administrativo.

- **Esforço estimado:** M
# **[OB-60] A geração de imagem aplica limite somente após baixar toda a resposta**

- **Categoria:** Performance
- **Severidade:** Baixa
- **Confiança:** Alta
- **Status:** CONFIRMADO
- **Tipo de evidência:** Estática
- **CVSS estimado:** N/A
- **Localização:** `supabase/functions/generate-image/index.ts:30-36`; `supabase/config.toml:39-40`
- **Evidência:**

```ts
const probe = await fetch(url, { method: "GET", redirect: "follow" });
const contentType = probe.headers.get("content-type")?.split(";")[0] || "";
if (!probe.ok || !["image/jpeg", "image/png", "image/webp"].includes(contentType)) {
  return json({ error: "O provedor não retornou uma imagem válida" }, 502);
}
const image = await probe.arrayBuffer();
if (image.byteLength > 10 * 1024 * 1024) return json({ error: "Imagem acima do limite de 10 MB" }, 502);
```

- **Descrição:** A função exige JWT de administrador e monta uma URL fixa para Pollinations, portanto este achado não aponta SSRF por URL fornecida pelo usuário. A chamada não define timeout e arrayBuffer carrega a resposta inteira antes da checagem de 10 MB. Uma resposta excessivamente grande ou lenta pode ocupar memória e duração da invocação antes de a função retornar 502. A busca no repositório não encontrou consumidor frontend; a disponibilidade da função em produção não foi verificada.
- **Mitigações verificadas:** A função exige app_metadata.is_admin === true, aceita apenas tipos de imagem conhecidos e rejeita imagens acima de 10 MB depois da leitura. supabase/config.toml configura verify_jwt = true; não define timeout nem limite de bytes para a resposta recebida. Não encontrei outra camada de streaming ou cancelamento nesse caminho.
- **Impacto:** Uma invocação administrativa pode falhar por timeout ou consumir memória proporcional ao tamanho da resposta do provedor. A exposição é limitada a administradores e a integração não tem consumidor frontend identificado, por isso a severidade é baixa.
- **Como verificar/reproduzir com segurança:** 1. Em ambiente isolado, substitua a resposta de Pollinations por uma resposta image/png lenta ou maior que 10 MB. 2. Invoque a função com JWT de administrador e descrição válida. 3. Observe que a função aguarda e materializa o corpo inteiro antes de responder com erro de tamanho; não use produção para esta verificação.
- **Solução recomendada:** Definir AbortSignal.timeout na chamada e consumir o corpo como stream, interrompendo e cancelando a resposta assim que o acumulado exceder o máximo. Manter a autenticação administrativa e devolver erro operacional sem persistir o arquivo excedente.
- **Exemplo corrigido:** O pseudocódigo pressupõe um helper de leitura limitada que conta os bytes durante o streaming e cancela o corpo ao exceder o máximo:

```ts
const probe = await fetch(url, {
  method: "GET",
  redirect: "follow",
  signal: AbortSignal.timeout(20_000),
});
const image = await readBoundedBody(probe, 10 * 1024 * 1024);
```
- **Esforço estimado:** P


### Continuação da auditoria — Radar de Lançamentos — 28/09/2026

- Revisei a página pública do Radar, o editor administrativo, a função de agrupamento e as migrations locais de lançamentos, votos e tópicos. Não encontrei trigger de sincronização entre `topics` e `release_radar_items`; descartei a gravação parcial como achado porque o tópico continua válido por si só e não confirmei dano funcional.
- A consulta somente leitura ao PostgREST do projeto configurado respondeu HTTP 200 e retornou 33 lançamentos ativos: 22 com `release_date` em 2026, 2 em 2027 e 9 sem data. Os dois registros ativos de 2027 com rótulo de mês são classificados pelo código como 2026. Não incluí títulos de jogos nem credenciais na saída do relatório.
- Acrescentei OB-61 e OB-62 para o ano hardcoded e para o agrupamento mensal incompatível com a instrução de calendário semanal. Acrescentei OB-63 e OB-64 para erros de leitura de votos ignorados e estados de votos incompletos. Não consultei nem alterei dados privados ou configuração remota.
- Arquivos lidos nesta etapa: `src/app/lancamentos/page.tsx`, `src/app/lancamentos/ReleasesPageClient.tsx`, `src/app/admin/releases/page.tsx`, `src/lib/release-images.ts`, `supabase/migrations/20260724000000_release_radar_items.sql`, `supabase/migrations/20260724000001_release_radar_dates.sql`, `supabase/migrations/20260725000000_release_hype_meter.sql`, `supabase/migrations/20260725000001_community_topics_and_prompts.sql` e `AGENTS.md`.
- A contagem foi atualizada para 64 achados: 1 crítico, 2 altos, 45 médios e 16 baixos. A validação estrutural passou: 64 IDs únicos, campos obrigatórios presentes, evidências com até 10 linhas e 20 linhas no Top 20.

- **Esforço estimado:** P
# **[OB-61] O Radar fixa o ano em 2026 e classifica lançamentos futuros no ano errado**

- **Categoria:** Bug
- **Severidade:** Média
- **Confiança:** Alta
- **Status:** CONFIRMADO
- **Tipo de evidência:** Estática
- **CVSS estimado:** N/A
- **Localização:** `src/app/lancamentos/page.tsx:9-15`; `src/app/lancamentos/ReleasesPageClient.tsx:94-108,384-395`; `src/components/feed/ReleaseRadarStrip.tsx:38-43,107-116`
- **Evidência:**

```ts
function getMonthGroupKey(dateStr: string): { key: string; label: string } {
  const lower = dateStr.toLowerCase();
  if (lower.includes("janeiro")) return { key: "2026-01", label: "Janeiro de 2026" };
  if (lower.includes("fevereiro")) return { key: "2026-02", label: "Fevereiro de 2026" };
  if (lower.includes("março")) return { key: "2026-03", label: "Março de 2026" };
```

```ts
title: "Calendário de Lançamentos de Jogos 2026",
description: "Agenda completa de lançamentos de jogos para PlayStation 5, Xbox Series X/S, Nintendo Switch, Switch 2 e PC em 2026.",
openGraph: {
  title: "Calendário de Lançamentos de Jogos 2026 — Orange Brick",
  description: "Agenda completa de lançamentos de jogos em 2026 organizados por mês e plataforma.",
```

```tsx
return new Date(Date.UTC(2026, MONTHS[match[2]], Number(match[1]), 12));
map.set(monthKey, `${capitalized} 2026`);
```

- **Descrição:** O agrupamento decide o ano somente pelo nome do mês e atribui 2026 a todos os meses. Os metadados e o texto introdutório também anunciam 2026. A consulta de leitura ao banco do projeto encontrou dois itens ativos com `release_date` em 2027 e rótulo mensal; ambos caem em chaves `2026-*` na função. A faixa da página inicial repete o ano fixo nas opções de mês e usa 2026 quando falta o ISO. Assim, datas futuras confirmadas são apresentadas como pertencentes a 2026 e a página também informa aos buscadores que o calendário cobre apenas 2026.
- **Mitigações verificadas:** O servidor carrega `release_date` e envia `releaseDateIso` ao componente; a função que cria os grupos recebe apenas `releaseDate` textual e não usa o ISO. `ReleaseRadarStrip` também recebe `releaseDateIso`, mas sua opção de mês concatena `2026` e seu fallback cria a data com ano fixo. Não encontrei seleção de ano ou correção posterior baseada na data completa.
- **Impacto:** Visitantes podem interpretar o ano de lançamento errado e perder a distinção entre calendários anuais; título, description e Open Graph também ficam desatualizados para usuários e buscadores. A falha afeta diretamente os dois registros ativos de 2027 observados.
- **Como verificar/reproduzir com segurança:** Acesse `/lancamentos` com os dois itens ativos de 2027 presentes. Observe que os agrupamentos de mês são rotulados como 2026 e que o título/description da página também dizem 2026.
- **Solução recomendada:** Formar a chave e o rótulo do grupo a partir de `release_date` ISO, incluindo ano e mês. Remover o ano fixo do metadata e do hero, ou gerá-los a partir do intervalo de dados exibido.
- **Exemplo corrigido:**

```ts
function getMonthGroupKey(releaseDateIso: string) {
  const [year, month] = releaseDateIso.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, 1));
  const label = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" }).format(date);
  return { key: `${year}-${String(month).padStart(2, "0")}`, label };
}
```

- **Esforço estimado:** M
# **[OB-62] O calendário agrupa por mês em vez da semana de lançamento**

- **Categoria:** UX
- **Severidade:** Média
- **Confiança:** Alta
- **Status:** CONFIRMADO
- **Tipo de evidência:** Estática
- **CVSS estimado:** N/A
- **Localização:** `src/app/lancamentos/ReleasesPageClient.tsx:94-108,300-321`; `AGENTS.md:72`
- **Evidência:**

```ts
for (const item of filteredReleases) {
  const month = getMonthGroupKey(item.releaseDate);
  const group = groups.get(month.key) || { label: month.label, items: [] };
  group.items.push(item);
  groups.set(month.key, group);
}
```

```md
- **Organização semanal:** Todo item com data definida deve preencher `release_date` e aparecer agrupado pela semana de lançamento, de segunda a domingo.
```

- **Descrição:** A lista pública agrupa todos os itens pelo mês e ordena os dias dentro desse grupo. A regra documentada do projeto exige seções semanais de segunda a domingo para cada data definida.
- **Mitigações verificadas:** O editor administrativo armazena `release_date` e o componente recebe essa data ISO, mas a função `groupedReleases` usa `releaseDate` e `getMonthGroupKey`. Não encontrei outra camada que transforme os grupos mensais em semanas.
- **Impacto:** O leitor precisa percorrer um mês inteiro para localizar os lançamentos de uma semana; a página não cumpre a organização editorial definida para o Radar.
- **Como verificar/reproduzir com segurança:** Abra `/lancamentos` em um mês com lançamentos datados em semanas diferentes. Observe que todos aparecem sob um único cabeçalho mensal, sem divisões de segunda a domingo.
- **Solução recomendada:** Calcular a segunda-feira da semana para cada `release_date`, criar grupos com início e fim de segunda a domingo e ordenar os itens pela data ISO dentro de cada grupo.
- **Exemplo corrigido:**

```ts
function getWeekStart(isoDate: string) {
  const date = new Date(`${isoDate}T00:00:00Z`);
  const daysSinceMonday = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - daysSinceMonday);
  return date.toISOString().slice(0, 10);
}
```

- **Esforço estimado:** M
# **[OB-63] Falha ao consultar votos pode aparecer como ausência de votos para visitantes**

- **Categoria:** Bug
- **Severidade:** Média
- **Confiança:** Alta
- **Status:** CONFIRMADO
- **Tipo de evidência:** Estática
- **CVSS estimado:** N/A
- **Localização:** `src/app/lancamentos/page.tsx:22-29,44-52`; `src/app/lancamentos/ReleasesPageClient.tsx:220-223`; `src/components/releases/ArticleHypeSummary.tsx:15-32,52-54`
- **Evidência:**

```ts
const initialHypeCounts: Record<string, Record<"buy" | "watch" | "skip", number>> = {};
for (const row of ((hype || []) as Array<{ release_id: string; vote_type: string; vote_count: number }>)) {
  if (row.vote_type !== "buy" && row.vote_type !== "watch" && row.vote_type !== "skip") continue;
  const current = initialHypeCounts[row.release_id] || { buy: 0, watch: 0, skip: 0 };
  current[row.vote_type] = Number(row.vote_count);
```

```ts
useEffect(() => {
  if (initialHypeCounts && !user) return;
  queueMicrotask(loadHype);
}, [loadHype, initialHypeCounts, user]);
```

```tsx
const { data: countData } = await supabase.rpc("get_release_hype_counts");
const nextCounts = { buy: 0, watch: 0, skip: 0 };
for (const row of (countData || []) as ReleaseHypeCount[]) {
  if (row.release_id === matchedRelease.id) {
    nextCounts[row.vote_type] = Number(row.vote_count);
  }
}
setCounts(nextCounts);
```

- **Descrição:** O servidor descarta o campo `error` da chamada RPC e transforma `data: null` em um objeto vazio. Para visitantes anônimos, `initialHypeCounts` é sempre passado como objeto; como objetos vazios são truthy, o efeito do cliente não tenta carregar os votos novamente. `ArticleHypeSummary` também inicia as contagens em zero, ignora o erro da RPC e exibe “Sem votos” mesmo que a consulta tenha falhado. O medidor pode, portanto, anunciar ausência de votos sem confirmação.
- **Mitigações verificadas:** `loadHype` no cliente detecta e apresenta erro da RPC, mas essa função não é executada para visitantes quando o servidor passou `{}`. O componente de resumo não possui estado de erro para a consulta de contagens. A migration local concede execução da RPC a `anon`; isso não cobre erro transitório nem divergência de deployment. O ledger remoto não foi confirmado.
- **Impacto:** Durante falha de rede, indisponibilidade da RPC ou divergência de migration, visitantes recebem um ranking falso e não têm mensagem de erro nem nova tentativa automática; no detalhe da matéria, contagens reais podem aparecer como zero.
- **Como verificar/reproduzir com segurança:** Em ambiente de teste, simule `get_release_hype_counts` retornando `data: null` e erro durante a renderização do servidor. Abra `/lancamentos` sem autenticação e observe a mensagem de ausência de votos sem uma segunda chamada no cliente.
- **Solução recomendada:** Preservar um estado distinto entre “contagem carregada vazia” e “contagem não carregada”. Propagar o erro ao componente e permitir retry/estado de erro para visitantes quando a leitura inicial falhar.
- **Exemplo corrigido:**

```ts
const { data: hype, error: hypeError } = await supabase.rpc("get_release_hype_counts");
const initialHypeCounts = hypeError ? undefined : toHypeCounts(hype ?? []);
return <ReleasesPageClient initialReleases={initialReleases} initialHypeCounts={initialHypeCounts} />;
```
- **Esforço estimado:** M


# **[OB-64] Falha na leitura do voto próprio deixa a contagem otimista incorreta**

- **Categoria:** Bug
- **Severidade:** Média
- **Confiança:** Alta
- **Status:** CONFIRMADO
- **Tipo de evidência:** Estática
- **CVSS estimado:** N/A
- **Localização:** `src/app/lancamentos/ReleasesPageClient.tsx:212-217,228-251`
- **Evidência:**

```ts
const { data: voteData } = await supabase.rpc("get_my_release_hype_votes");
const nextVotes: Record<string, HypeVoteType> = {};
for (const row of (voteData || []) as ReleaseHypeVoteSelection[]) {
  nextVotes[row.release_id] = row.vote_type;
}
setMyVotes(nextVotes);
```

```ts
const previousVote = myVotes[releaseId];
const previousCounts = hypeCounts[releaseId] || { ...EMPTY_HYPE_COUNTS };
const nextVote = previousVote === vote ? undefined : vote;
const nextCounts = { ...previousCounts };
if (previousVote) nextCounts[previousVote] = Math.max(0, nextCounts[previousVote] - 1);
if (nextVote) nextCounts[nextVote] += 1;
```

- **Descrição:** A leitura de `get_my_release_hype_votes` ignora `error` e substitui a seleção pessoal por um mapa vazio. Se a pessoa já votou e a RPC falha, o cliente deixa de conhecer o tipo anterior. Ao escolher outro tipo, a gravação usa `upsert` com conflito em `(release_id,user_id)`, que atualiza a linha existente, mas a contagem otimista só incrementa o novo tipo e não decrementa o anterior.
- **Mitigações verificadas:** A chave única no banco impede votos duplicados por jogo/usuário. A gravação do voto verifica o próprio erro e restaura o estado anterior conhecido; ela não recupera o tipo anterior quando a RPC de leitura já falhou. A função SQL local filtra por `auth.uid()` e sua execução é concedida a `authenticated`; deployment remoto não confirmado.
- **Impacto:** Após uma falha de leitura, o medidor e o ranking na sessão mostram uma unidade a mais no novo tipo e mantêm a unidade anterior até recarregar os dados. O voto persistido fica correto, mas o estado exibido diverge temporariamente do banco.
- **Como verificar/reproduzir com segurança:** Em ambiente de teste, mantenha uma votação prévia, faça `get_my_release_hype_votes` retornar erro sem falhar `get_release_hype_counts`, entre com a conta que já votou e troque o tipo do voto. Compare a contagem otimista antes de recarregar com a contagem após nova leitura da RPC agregada.
- **Solução recomendada:** Verificar o erro da RPC de voto próprio, sinalizar estado não sincronizado e impedir mutações até obter a votação anterior. Após gravar, preferir reconciliar as contagens com a RPC agregada ou aplicar uma operação atômica que devolva os totais atualizados.
- **Exemplo corrigido:**

```ts
const { data: voteData, error: voteError } = await supabase.rpc("get_my_release_hype_votes");
if (voteError) {
  setHypeError("Não foi possível confirmar seu voto atual. Tente novamente.");
  return;
}
setMyVotes(toVoteMap(voteData ?? []));
```
- **Esforço estimado:** M


### Continuação da auditoria — cobertura a 375 px e páginas de erro — 28/09/2026

- Executei `npm run start -- --port 3100` usando o build local cujo `.next/BUILD_ID` foi gerado em 28/09/2026 às 19:53; as fontes da aplicação verificadas nesta etapa são anteriores ao build. Iniciei Playwright Chromium com viewport 375 × 812 e Axe WCAG 2.2 AA. O script foi passado em memória por `node --input-type=module -`; não criei arquivos. A interceptação bloqueou métodos diferentes de GET/HEAD e origens externas no navegador.
- Naveguei pelas 37 rotas de página inventariadas a 375 px. Não houve overflow horizontal, erro de JavaScript nem status 5xx. Trinta e seis páginas/estados não apresentaram violações axe nessa largura; `/configuracoes/notificacoes` apresentou `color-contrast` sério no botão “Salvar preferências” (3,06:1). Ampliei OB-16 em vez de duplicá-lo.
- Rotas de conta sem sessão acabaram redirecionadas para `/`; as rotas administrativas terminaram em `/admin/login`. A configuração local mantém `EMAIL_AUTH_ENABLED` diferente de `true`, então cadastro, login e recuperação por e-mail foram redirecionados e não tiveram seus formulários exercitados. O perfil dinâmico usou um slug de teste sem usuário real, portanto o perfil público real permanece sem validação.
- A rota `/posts/__audit-nonexistent-slug__` mostrou o título de 404, mas sem `<main>` e sem o alvo `#conteudo-principal` do skip link. Também inspecionei `src/app/error.tsx`, que usa a mesma estrutura externa sem `<main>`; não forcei uma exceção de runtime para exercitar esse componente.
- O status HTTP 200 observado nessa página 404 não foi registrado como achado: a documentação local do Next 16.3.6 explica que respostas `notFound()` já transmitidas por streaming podem manter 200 e recebem `noindex`; confirmei `robots=noindex` no HTML renderizado. O problema confirmado neste fluxo é a semântica de navegação acessível.
- Arquivos analisados nesta etapa: `e2e/public-site.spec.ts`, `playwright.config.ts`, `src/app/not-found.tsx`, `src/app/error.tsx`, `src/app/layout.tsx`, `src/app/configuracoes/notificacoes/page.tsx`, `src/proxy.ts`, `src/app/post/page.tsx`, `src/app/posts/[slug]/page.tsx` e a documentação do Next instalada em `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/not-found.md` e `04-functions/not-found.md`.
- A contagem atualizada é 65 achados: 1 crítico, 2 altos, 45 médios e 17 baixos. A verificação manual de landmarks encontrou um problema não reportado automaticamente pelo axe; acrescentei OB-65.

- **Esforço estimado:** M
# **[OB-65] Telas globais de 404 e erro não oferecem landmark principal**

- **Categoria:** Acessibilidade
- **Severidade:** Baixa
- **Confiança:** Alta
- **Status:** CONFIRMADO
- **Tipo de evidência:** Estática
- **CVSS estimado:** N/A
- **Localização:** `src/app/not-found.tsx:4-20`; `src/app/error.tsx:26-41`; `src/app/layout.tsx:109-115`
- **Evidência:**

```tsx
export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-dvh gap-4 px-4 text-center">
      <Icon name="brick" size={48} className="text-brand-orange-muted opacity-40" />
      <h1 className="text-lg font-mono font-bold text-white">
        404 — Tijolo não encontrado
```

```tsx
return (
  <div className="flex flex-col items-center justify-center min-h-dvh gap-4 px-4 text-center">
    <Icon name="brick" size={48} className="text-red-400" />
    <h1 className="text-lg font-mono font-bold text-white">
      Algo quebrou
```

```tsx
id="link-pular-conteudo"
href="#conteudo-principal"
```

- **Descrição:** As telas globais de 404 e erro genérico começam em um `<div>` e não definem `<main id="conteudo-principal">`. O layout global continua exibindo o skip link com esse destino, mas, nessas telas, o elemento não existe. Na rota de matéria inexistente, confirmei em runtime `mainCount=0` e `skipTargetCount=0`; o axe não detectou esse problema semântico.
- **Mitigações verificadas:** A tela 404 oferece link para voltar ao feed e a tela genérica tem botão de nova tentativa. O layout inclui skip link em todas as rotas. Nenhum desses controles cria o landmark nem o destino ausente. O componente global de erro foi inspecionado no código, mas não foi provocado em runtime.
- **Impacto:** Pessoas que usam leitor de tela perdem o landmark principal e pessoas que ativam “Pular para o conteúdo” permanecem sem destino, precisando navegar manualmente pelos controles da página.
- **Como verificar/reproduzir com segurança:** Em ambiente local, abra `/posts/__audit-nonexistent-slug__`, localize “Pular para o conteúdo” e confira que `document.querySelector("#conteudo-principal")` retorna `null` e não há `<main>`. Em teste isolado, force um erro de renderização e repita a inspeção da tela global de erro.
- **Solução recomendada:** Envolver o conteúdo de `not-found.tsx` e `error.tsx` em `<main id="conteudo-principal" tabIndex={-1}>` para manter o alvo do skip link e a navegação por landmark.
- **Exemplo corrigido:**

```tsx
return (
  <main id="conteudo-principal" tabIndex={-1} className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
    <h1 className="text-lg font-mono font-bold text-white">404 — Tijolo não encontrado</h1>
    <p className="text-sm text-gray-400">Essa página não existe ou foi quebrada em pedaços.</p>
    <Link href="/">Voltar ao feed</Link>
  </main>
);
```
- **Esforço estimado:** P


### Continuação da auditoria — redirects e cobertura de navegação — 28/09/2026

- Comparei `e2e/public-site.spec.ts` ao inventário de 37 páginas: a suíte percorre 12 rotas públicas e valida status, `<main>`, skip link, foco, overflow e axe. Os projetos usam viewports de 320, 390, 768, 1280 e 2560 px; 375 px não está coberto explicitamente. O teste de destinos internos também coleta links somente dessas 12 rotas. Páginas autenticadas/admin e estados de mutação seguem fora do E2E executado.
- Revisei `src/components/auth/CredentialAuthForm.tsx`, `src/components/auth/AuthModal.tsx`, `src/app/profile/setup/page.tsx`, `src/app/auth/callback/route.ts` e `src/lib/auth/return-to.ts`. Os valores `next` e `returnTo` passam por `safeReturnTo`, que rejeita outra origem e usa fallback interno; não confirmei open redirect nesses caminhos. O fluxo de upload de avatar antes da criação do perfil já está registrado em OB-33.
- Revisei os metadados e o roteamento dinâmico de `src/app/plataforma/[platform]/page.tsx` e `src/app/posts/[slug]/page.tsx`; as canonicals e o `generateStaticParams` da plataforma são específicos por rota nos trechos lidos. O uso de `select("*")` em detalhe de matéria já está registrado em OB-41.
- A auditoria continua somente leitura. Não alterei código, configurações, banco, deployment ou DNS.

### Continuação da auditoria — axe em 375/768 px e estados de carregamento — 28/09/2026

- Iniciei `npm run start -- --port 3100` com o build local já existente, gerado em 28/09/2026 às 19:53. O navegador usou Playwright Chromium e axe-core com WCAG 2.2 AA. Não criei artefatos de teste no repositório.
- A matriz inicial percorreu as 37 rotas em 375 e 768 px (74 combinações), com `ob-cookie-consent=denied` no localStorage isolado do navegador de teste e espera de 500 ms após `DOMContentLoaded`. Não houve 5xx, overflow horizontal nem erro de página. Esses snapshots rápidos mostraram `color-contrast` sério em nove estados resolvidos por viewport: 12 nós a 375 px e 11 a 768 px.
- Repeti a matriz em 320 e 390 px (37 rotas por tamanho, 74 combinações), com a mesma espera de 500 ms. Também não houve 5xx, overflow horizontal ou erro de página. Axe encontrou contraste sério em cinco nós a 320 px e onze a 390 px; os snapshots incluíam redirects e a animação de loading. Nos retestes após 2,2 s, a navegação em `/termos` falhou em 390 px (1,17:1), enquanto a 320 px ficou oculta pelo estilo `watch-hidden`; o botão de notificações manteve 3,06:1 nos dois tamanhos. O texto do skeleton permanecia durante loading, mas uma medição isolada em 320/390 px pode não capturar a fase de baixo contraste.
- Completei também 1280 e 2560 px para as 37 rotas (74 combinações adicionais; 222 no conjunto de seis larguras), com a mesma espera de 500 ms. Não houve 5xx, overflow horizontal nem erro de página. Nos retestes após 2,2 s, a homepage ficou sem violações, o botão de notificações manteve 3,06:1 nos dois tamanhos e a rota /plataforma/playstation continuou em loading sem violação axe naquele ciclo. Isso confirma que o contraste do skeleton varia com a animação.
- Para filtrar redirects e estados de hidratação/carregamento, repeti axe após 2,2 segundos em `/`, `/minha-orange`, `/profile/setup`, `/termos`, `/configuracoes/notificacoes` e `/plataforma/playstation` nos dois tamanhos. A homepage e os dois caminhos de conta que redirecionam para ela ficaram sem violações depois da estabilização. A falha persistente da barra em `/termos` e `/plataforma/playstation` foi confirmada em 375 e 768 px; a configuração de notificações manteve 3,06:1 e o texto do skeleton permaneceu durante o carregamento. No passe estável anterior de 11 rotas a 768 px, a mesma falha de navegação apareceu também em `/contato`, `/sobre`, `/post`, `/privacidade` e `/profile/__audit-placeholder__`.
- A varredura focada a 375 px encontrou novamente o botão “Salvar preferências” em `/configuracoes/notificacoes` (3,06:1) e o texto do skeleton em `/plataforma/playstation`. Também abri `/termos` em contexto isolado com `ob-cookie-consent=denied` gravado apenas no localStorage do navegador de teste; sem o aviso de cookies sobreposto, a barra inferior ficou visível e axe mediu 1,17:1 para “Início” em 375 e 768 px. Nenhuma preferência real foi alterada.
- O mesmo label de carregamento foi medido em dois pontos da animação: 2,08:1 em 375 px e 3,04:1 a 768 px, sempre abaixo de 4,5:1. A cor opaca de base (#D65F1E sobre #0D0E12) mede 5,07:1; a redução vem do `animate-pulse`, então é intermitente e restrita ao estado de carregamento.
- Para os testes com conteúdo remoto, o navegador só permitiu a origem local e requisições `GET`/`HEAD` para a origem Supabase configurada; os demais hosts e métodos foram bloqueados. Na confirmação isolada com consentimento salvo, apenas a origem local foi permitida.
- Arquivos lidos nesta etapa: `src/components/ui/gradient-button-group.tsx`, `src/components/ui/MobileBottomNav.tsx`, `src/components/feed/NewsFeedSkeleton.tsx`, `src/app/loading.tsx`, `src/app/globals.css`, `src/lib/consent.ts` e `src/components/ui/CookieConsent.tsx`. A causa do estado do indicador e a cor/estilo do texto foram conferidas também no DOM renderizado.
- A contagem atualizada é 67 achados: 1 crítico, 2 altos, 46 médios e 18 baixos. OB-66 é uma falha de navegação responsiva em rotas sem item ativo; OB-67 é uma falha intermitente de contraste no loading. Ainda não validei esses estados no deployment atual.

- **Esforço estimado:** P
# **[OB-66] Indicador laranja da navegação inferior aparece sem item ativo**

- **Categoria:** Acessibilidade
- **Severidade:** Média
- **Confiança:** Alta
- **Status:** CONFIRMADO
- **Tipo de evidência:** Estática
- **CVSS estimado:** N/A
- **Localização:** `src/components/ui/gradient-button-group.tsx:19,21-27,34-37`; `src/components/ui/MobileBottomNav.tsx:7-13,68`; `src/app/globals.css:217-220,234-250`
- **Evidência:**

```tsx
style={{ width: `${100 / items.length}%`, transform: `translateX(${activeIndex * 100}%)` }}
```

```tsx
item.active ? "text-black font-black" : "text-gray-400 hover:text-white"
```

```tsx
active: item.active(pathname),
```

- **Descrição:** Nas rotas sem correspondência entre `pathname` e os seis links da barra inferior, `findIndex` retorna `-1` e `Math.max` força o indicador para a primeira posição. A primeira opção permanece inativa e recebe texto cinza, mas o indicador laranja continua atrás dela. Em `/termos`, axe calculou contraste 1,17:1 entre o label “Início” (#99A1AF) e o fundo laranja (#FF5E00), abaixo de 4,5:1. Reproduzi o estado em 375 e 768 px depois de dispensar o aviso de cookies no contexto isolado.
- **Mitigações verificadas:** A barra marca `aria-current="page"` somente quando `item.active` é verdadeiro; não há item ativo em `/termos`. O indicador é decorativo (`aria-hidden`) e sua posição usa o índice forçado a zero, sem verificar se existe uma rota ativa. Em larguras até 480 px, o CSS oculta a barra enquanto o aviso de cookies está aberto; ao dispensar o aviso, o problema retorna. Em até 340 px, a classe `watch-hidden` a oculta para o modo de tela estreita.
- **Impacto:** Em rotas públicas que não pertencem à lista principal, o primeiro rótulo e ícone ficam quase indistinguíveis do fundo e o destaque visual indica incorretamente a página inicial. Isso dificulta a navegação em telas de 341 a 1023 px.
- **Como verificar/reproduzir com segurança:** Abra `/termos` com viewport de 375 ou 768 px. No teste isolado, grave `ob-cookie-consent=denied` no `localStorage` antes da navegação para remover o aviso de consentimento. Execute axe com WCAG 2.2 AA e confira `Início`: #99A1AF sobre #FF5E00, 1,17:1. Também ocorre em `/contato` a 768 px.
- **Solução recomendada:** Só renderizar o indicador quando `findIndex` for maior ou igual a zero; conservar todos os links neutros quando a rota atual não pertence à barra. Alternativamente, definir explicitamente qual item representa cada rota sem sinalizar `/` por padrão.
- **Exemplo corrigido:**

```tsx
{activeIndex >= 0 && (
  <span
    aria-hidden="true"
    className="absolute inset-y-1 rounded-xl bg-brand-orange"
    style={{ width: (100 / items.length) + "%", transform: "translateX(" + (activeIndex * 100) + "%)" }}
  />
)}
```
- **Esforço estimado:** M


# **[OB-67] Pulso do texto de carregamento reduz o contraste**

- **Categoria:** Acessibilidade
- **Severidade:** Baixa
- **Confiança:** Alta
- **Status:** CONFIRMADO
- **Tipo de evidência:** Dinâmica
- **CVSS estimado:** N/A — acessibilidade
- **Localização:** `src/components/feed/NewsFeedSkeleton.tsx:11-13`; `src/app/loading.tsx:1-7`; `src/app/globals.css:10,119-132`
- **Evidência:**

```tsx
<p className="text-xs font-mono text-brand-orange-muted animate-pulse">
  Quebrando os tijolos...
</p>
```

```css
--color-brand-orange-muted: #D65F1E;
```

- **Descrição:** O texto do skeleton usa `animate-pulse`, que reduz sua opacidade em parte do ciclo. No DOM renderizado de `/plataforma/playstation`, axe mediu 2,08:1 em um instante a 375 px e 3,04:1 a 768 px, ambos abaixo dos 4,5:1 requeridos para texto normal. Em opacidade integral, a cor-base mede 5,07:1; a falha ocorre durante o pulso, não em todo o tempo de exibição.
- **Mitigações verificadas:** O loading global realmente usa `NewsFeedSkeleton`. A folha de estilos encurta animações sob `prefers-reduced-motion`, mas no movimento padrão mantém o pulso; não há uma cor estática que preserve o contraste em todas as fases. A classe global de alto contraste altera o token da cor, mas o teste reportado usou o tema padrão.
- **Impacto:** Durante carregamentos demorados ou navegações lentas, pessoas com baixa visão podem perder a mensagem que explica o estado da página. O defeito não indica que o conteúdo final falha no mesmo contraste.
- **Como verificar/reproduzir com segurança:** Com viewport de 375 × 812 px, abra `/plataforma/playstation` e execute axe enquanto “Quebrando os tijolos...” estiver visível; foi observado 2,08:1. A 768 × 900 px, a medição durante outro ciclo foi 3,04:1. O contraste varia com a fase da animação.
- **Solução recomendada:** Remover `animate-pulse` do texto e manter animação apenas no ícone decorativo, ou selecionar uma cor/efeito que mantenha pelo menos 4,5:1 em toda a animação.
- **Exemplo corrigido:**

```tsx
<p className="text-xs font-mono text-gray-300">
  Quebrando os tijolos...
</p>
```
- **Esforço estimado:** P


### Continuação da auditoria — matéria pública em seis larguras e pendências atuais — 28/09/2026

- Com o servidor local já encerrado ao final da verificação, confirmei que a porta 3100 não mantém processo escutando.
- Escolhi em memória uma matéria pública real a partir da homepage e a abri nos viewports de 320, 375, 390, 768, 1280 e 2560 px. As seis navegações retornaram HTTP 200, com `<main>`, um H1, sem overflow horizontal e sem violações axe WCAG 2.2 AA na amostra estabilizada. O slug não foi preservado no relatório.
- Inspecionei a capa e as imagens internas renderizadas. Quando carregadas, as três imagens da matéria tinham texto alternativo e proporção visual de aproximadamente 16:9. Uma imagem com carregamento tardio ainda estava pendente na amostra curta de 1280 px; ela carregou em outro viewport, sem resposta HTTP de erro confirmada. Não registrei isso como bug. Dimensões do arquivo original, origem oficial e adequação semântica completa do alt não foram verificadas.
- Esta validação complementa, mas não substitui, a matriz das 37 rotas: os 222 pares rota/largura anteriores usaram espera de 500 ms; retestes de 2,2 s foram seletivos. Apenas esta matéria real foi confirmada nos seis viewports com carregamento adicional das imagens.
- Não surgiu novo achado; a contagem permanece em 67: 1 crítico, 2 altos, 46 médios e 18 baixos.

#### O que ainda impede o fechamento

1. Exercitar páginas autenticadas e administrativas com contas de teste, incluindo permissões e fluxos de escrita, sem tocar em dados reais de produção.
2. Repetir a matriz completa das 37 rotas após estado estável e hidratação, incluindo axe; a matriz rápida já percorreu 37 rotas em cada uma das seis larguras, mas não é uma verificação estável integral.
3. Confirmar no estado remoto atual o ledger de migrações Supabase, cron e variáveis de produção Vercel. Nesta retomada, `vercel` e `supabase` não estão instalados no PATH e não há conexão MCP para essas contas; os apontamentos remotos anteriores são resultados datados e não foram tratados como estado atual. A autenticação anteriormente revogada não foi refeita.
4. Demonstrar restauração de um backup completo em ambiente isolado e confirmar uma cópia durável fora desta máquina; nenhum restore foi executado nesta etapa.
5. Completar a leitura individual dos arquivos ainda não examinados no inventário de 507 arquivos não ignorados, especialmente os diretórios e ativos que o relatório declara como cobertura parcial. A lista e as justificativas de arquivos/diretórios excluídos continuam na seção de escopo; não se deve interpretar a contagem do inventário como leitura integral de cada arquivo.

A auditoria continua aberta. Não alterei código, configuração, banco, deployment ou DNS nesta etapa; apenas este relatório foi atualizado.
### Continuação da auditoria — matriz estável e rota dinâmica real — 28/09/2026

- Corrigi a extração de caminhos do inventário e executei a matriz estável completa: 37 padrões de rota × seis larguras (320, 375, 390, 768, 1280 e 2560 px), com espera de 2,2 s antes das medições e axe WCAG 2.2 AA. Bloqueei requisições diferentes de GET/HEAD e origens externas não autorizadas; 67 tentativas de métodos não somente leitura foram bloqueadas. O executor terminou 222/222 combinações, sem resposta HTTP 4xx/5xx, overflow horizontal ou exceção JavaScript de página.
- A execução retornou 39 ocorrências axe: 33 `color-contrast`, que repetem os problemas já registrados em OB-16, OB-66 e OB-67; e seis `aria-prohibited-attr` em `/brickboard`, uma em cada viewport. Não dupliquei os problemas de contraste. O novo problema ARIA foi confirmado no DOM e no código como OB-68, abaixo.
- `/post` sem `slug` e `/posts/__audit-nonexistent-slug__` exibem a tela de não encontrado sem `<main>`, coberta por OB-65. O primeiro snapshot de `/minha-orange` a 2560 px capturou a transição do redirect; o reteste esperou o destino estabilizar em `/` e confirmou um `<main>`, um H1, sem overflow e sem violação axe.
- A matriz usou placeholder inexistente para o padrão dinâmico `/posts/{slug}`, pois a tentativa inicial de descobrir um link aconteceu antes de a homepage hidratar. Em seguida, aguardei a homepage estabilizar, escolhi uma matéria pública real (`/posts/gta-vi-mecanicas-reveladas-pelos-vazamentos`) e testei a rota separadamente nos seis viewports: HTTP 200, um `<main>`, um H1, sem overflow e sem violações axe em todos. Capa e primeira imagem interna carregaram nas seis larguras, com alt e proporção próxima de 16:9; a segunda imagem interna ficou pendente em alguns snapshots sem rolagem por carregamento tardio, sem erro HTTP, e já havia carregado no teste anterior após rolar a página. Dimensões do arquivo original e procedência oficial das imagens continuam sem verificação independente.
- Os CLIs `vercel` e `supabase` não estão instalados no PATH nesta retomada (`vercel --version` e `supabase --version` retornaram comando não encontrado); não há conexão MCP para essas contas. Não renovei a autenticação que foi revogada. Portanto, o estado remoto atual de migrações, crons e variáveis segue não verificado nesta retomada; os registros anteriores são datados. Não reabri DNS, TLS nem configuração do domínio, etapa encerrada pelo usuário.
- Atualização das pendências: a matriz estável das 37 rotas está concluída para os padrões e substituições documentadas, e uma matéria real foi verificada separadamente. Ainda faltam sessões de teste para perfil e fluxos autenticados/admin, verificações remotas Vercel/Supabase com acesso vigente, restauração de backup isolado e leitura individual dos arquivos restantes do inventário. Não testei mutações reais de produção.
- A contagem atual é 68 achados: 1 crítico, 2 altos, 46 médios e 19 baixos. O Top 20 permanece inalterado.

### Revalidação dinâmica em 05/10/2026

Axe/Playwright na cópia isolada reproduziu `color-contrast` na homepage em 375, 390, 768, 1280 e 2560 px. A razão medida variou entre 2,58:1 e 3,14:1 durante `animate-pulse`, abaixo de 4,5:1 para texto normal. O teste não acessou o Supabase remoto.

```text
WCAG 2 AA color-contrast: 2.58:1–3.14:1; requerido para texto normal: 4.5:1
```

- **Esforço estimado:** P
# **[OB-68] Sentinela do Brickboard usa aria-label sem papel compatível**

- **Categoria:** Acessibilidade
- **Severidade:** Baixa
- **Confiança:** Alta
- **Status:** CONFIRMADO
- **Tipo de evidência:** Ferramenta automatizada
- **CVSS estimado:** N/A
- **Localização:** `src/app/brickboard/page.tsx:565`
- **Evidência:**

```tsx
<div ref={loadMoreRef} className="flex min-h-20 items-center justify-center border-t border-white/10" aria-label="Carregando mais conversas">
  <span className="size-5 animate-spin rounded-full border-2 border-brand-orange/25 border-t-brand-orange" />
</div>
```

- **Descrição:** O elemento genérico `<div>` recebe `aria-label`, atributo que não nomeia esse papel implícito. Axe reporta `aria-prohibited-attr` como impacto sério em `/brickboard`, nos seis viewports testados. Como o nó só contém um spinner e não define região de status, o texto “Carregando mais conversas” não é anunciado de forma válida por leitores de tela.
- **Mitigações verificadas:** O elemento só existe quando há mais itens que o limite visível e é observado por `IntersectionObserver`, cujo efeito desconecta o observador na limpeza (`src/app/brickboard/page.tsx:137-143`). Não encontrei `role`, região `aria-live` ou texto alternativo no próprio sentinela; axe confirmou que o nome ARIA é inválido. A lista usa os itens carregados pelo feed, então a sentinela visual atua como alvo de rolagem.
- **Impacto:** Pessoas que navegam por leitor de tela não recebem um estado acessível associado ao spinner quando novos itens entram na lista. O impacto é localizado ao carregamento progressivo do Brickboard.
- **Como verificar/reproduzir com segurança:** Abra `/brickboard` com mais de oito conversas disponíveis. Execute axe com WCAG 2.2 AA em qualquer viewport entre 320 e 2560 px; a regra `aria-prohibited-attr` aponta para `.min-h-20` e informa que `aria-label` não pode ser usado em `div` sem papel compatível.
- **Solução recomendada:** Como o nó é apenas o sentinela visual do `IntersectionObserver`, remova o nome ARIA inválido e oculte o spinner decorativo da árvore de acessibilidade. Se houver um estado de carregamento real, exponha-o separadamente por uma região `role="status"` com texto atualizado.
- **Exemplo corrigido:**

```tsx
<div ref={loadMoreRef} aria-hidden="true" className="flex min-h-20 items-center justify-center border-t border-white/10">
  <span className="size-5 animate-spin rounded-full border-2 border-brand-orange/25 border-t-brand-orange" />
</div>
```
- **Esforço estimado:** P

## Situação vigente da auditoria — 28/09/2026

- **Achados confirmados:** 68 (1 crítico, 2 altos, 46 médios, 19 baixos). OB-68 é o último achado incluído; o Top 20 continua cobrindo os mesmos itens de maior risco.
- **Cobertura recém-concluída:** matriz estável de 37 padrões de páginas em seis larguras, rota de matéria real em seis larguras, validação axe WCAG 2.2 AA, sem 4xx/5xx, overflow ou exceção de JavaScript nas navegações concluídas.
- **Auditoria ainda aberta:** não houve sessão de teste de perfil/admin nem mutação autenticada; o estado remoto Vercel/Supabase precisa ser atualizado com credenciais vigentes; falta provar restauração de backup isolado e terminar a leitura individual dos arquivos restantes do inventário. As substituições usadas em rotas dinâmicas estão descritas na continuação mais recente.
- **Domínio:** configuração DNS/TLS e acesso externo foram encerrados pelo usuário e não fazem parte das pendências reabertas.
- **Alterações nesta retomada:** apenas `AUDITORIA.md`; nenhum código, configuração, banco, deployment ou DNS foi alterado.
### Continuação da auditoria — Lighthouse com tráfego restrito e revisão de headings — 28/09/2026

- Instalei Lighthouse 13.5.0 com `npx --yes --package=lighthouse` no cache npm, sem alterar dependências do projeto. Executei a homepage local com Chromium fornecido pelo Playwright e relatório JSON somente em stdout, conforme a [documentação oficial do Lighthouse CLI](https://github.com/GoogleChrome/lighthouse/blob/main/readme.md).
- Para manter a medição somente leitura, usei uma proxy local que permitiu apenas GET/HEAD para `127.0.0.1:3100`, respondeu 405 a outros métodos e bloqueou origens externas. Foram feitas duas passagens. A primeira reportou performance 50, acessibilidade 98, boas práticas 96, SEO 100, LCP 14,9 s, FCP 2,8 s, TBT 570 ms e CLS 0. A segunda reportou performance 0 e não trouxe métricas de performance. Ambas registraram `ERR_TUNNEL_CONNECTION_FAILED` para recursos externos bloqueados; portanto, os scores e tempos não são uma linha de base confiável e não foram convertidos em achados de performance.
- Lighthouse sinalizou `heading-order` e `label-content-name-mismatch`. Cruzei ambos com o DOM renderizado e o código aberto. Confirmei a diferença de nome do botão de alertas como OB-69 e a sequência hierárquica de headings como OB-70. Outros avisos da execução restrita não foram tratados como achados sem confirmação independente.
- O CLI emitiu `EPERM` ao tentar remover seus diretórios temporários no Windows. Verifiquei os dois caminhos exatos em `%TEMP%`: ambos já estavam ausentes, nenhum processo Chrome da execução permanecia e não foi criado relatório ou artefato dentro do projeto.
- Atualização corrente: 70 achados (1 crítico, 2 altos, 47 médios, 20 baixos). OB-69 é médio, mas não altera o Top 20 por ter impacto menor que os 17 achados médios já priorizados; OB-70 é baixo. O Lighthouse não forneceu score de performance válido.

- **Esforço estimado:** P
# **[OB-69] Botão de alertas tem nome acessível diferente do rótulo visível**

- **Categoria:** Acessibilidade
- **Severidade:** Média
- **Confiança:** Alta
- **Status:** CONFIRMADO
- **Tipo de evidência:** Ferramenta automatizada
- **CVSS estimado:** N/A
- **Localização:** `src/components/NotificationBell.tsx:218,234`
- **Evidência:**

```tsx
aria-label={subscribed ? "Desativar alertas" : "Ativar alertas"}
```

```tsx
<span className="whitespace-nowrap">{subscribed ? "Alertas ativos" : "Receber alertas"}</span>
```

- **Descrição:** No estado inicial confirmado no DOM, o botão mostra “Receber alertas”, mas seu `aria-label` define “Ativar alertas”. No estado inscrito, o nome acessível é “Desativar alertas” e o texto visível é “Alertas ativos”. O atributo `aria-label` prevalece sobre o texto filho para definir o nome do botão; Lighthouse marcou `label-content-name-mismatch` e a comparação do DOM confirma a divergência.
- **Mitigações verificadas:** `title` fornece uma dica sobre receber/desativar alertas, mas não substitui o nome acessível definido por `aria-label`. `aria-describedby` só aponta para uma mensagem quando ocorre erro; não alinha o nome ao texto visível. Inspecionei os dois ramos no componente; o ramo ativo foi confirmado no código, não foi acionado em runtime.
- **Impacto:** Pessoas que usam controle por voz podem tentar acionar o botão pelo texto que veem e não encontrar o controle, porque o nome acessível usa outras palavras. A falha afeta a ação opcional de notificações.
- **Como verificar/reproduzir com segurança:** Abra a homepage em uma sessão sem assinatura de push e inspecione `button[aria-label="Ativar alertas"]`: seu texto visível é “Receber alertas”. Compare o `aria-label` ao texto. No componente, confirme a divergência equivalente no ramo `subscribed`.
- **Solução recomendada:** Faça o texto visível e o nome acessível usarem a mesma expressão em cada estado. Se mantiver `aria-label`, atualize também o texto visível; se o texto visível já nomear claramente a ação, remova o `aria-label` redundante.
- **Exemplo corrigido:**

```tsx
aria-label={subscribed ? "Desativar alertas" : "Receber alertas"}
```

```tsx
<span className="whitespace-nowrap">{subscribed ? "Desativar alertas" : "Receber alertas"}</span>
```

- **Esforço estimado:** M
# **[OB-70] Headings da homepage saltam níveis antes do H1**

- **Categoria:** Acessibilidade
- **Severidade:** Baixa
- **Confiança:** Alta
- **Status:** CONFIRMADO
- **Tipo de evidência:** Estática
- **CVSS estimado:** N/A
- **Localização:** `src/components/feed/HomePageClient.tsx:48`; `src/components/feed/NewsFeed.tsx:204,255,277,283`; `src/components/ui/Footer.tsx:32,43`
- **Evidência:**

```tsx
{renderHeroSection()}

<div id="ultimas-noticias" className="scroll-mt-16">
```

```tsx
<h2 className="font-heading text-lg sm:text-2xl md:text-3xl font-black text-white leading-tight uppercase tracking-wider group-hover:text-brand-orange transition-colors duration-300 line-clamp-2">
  {heroPost.title}
</h2>
```

```tsx
<h4 className="line-clamp-2 font-heading text-sm font-bold leading-snug text-white transition-colors duration-200 group-hover:text-brand-orange">
  {post.title}
</h4>
```

- **Descrição:** `HomePageClient` pede que o título “Últimas notícias” seja H1, mas `NewsFeed` renderiza `renderHeroSection()` antes desse título. Com matérias disponíveis, a ordem observada no DOM começa com H2 e H4 dos destaques e só depois chega ao H1; mais abaixo há também títulos H4 no rodapé. Lighthouse sinalizou `heading-order`; a leitura direta do DOM e os componentes confirmam a sequência.
- **Mitigações verificadas:** A página define um único H1 no feed, e `NewsFeed` aceita níveis H1/H2 por propriedade. Isso não corrige a ordem porque o destaque é renderizado antes do componente `Heading`. Não encontrei um H1 anterior envolvendo o destaque nem uma hierarquia alternativa de headings.
- **Impacto:** Leitores de tela que navegam pelo outline encontram subtítulos antes do título principal e saltos de H2 para H4, o que torna a estrutura da homepage menos previsível. Os textos continuam visíveis e navegáveis; o impacto é estrutural.
- **Como verificar/reproduzir com segurança:** Abra `/` quando houver matérias de destaque e inspecione a sequência `h1` a `h6` no DOM ou execute Lighthouse. A sequência observada começou por H2/H4 e depois H1; o rodapé também contém H4 para seus títulos de seção.
- **Solução recomendada:** Coloque um H1 antes dos destaques ou transforme o título da matéria principal em H1; use níveis seguintes coerentes para títulos de seção e cartões. No rodapé, inicie a hierarquia com um nível apropriado ou use texto comum quando o rótulo não for um título de seção.
- **Exemplo corrigido:**

```tsx
<h1>{heroPost.title}</h1>
<h2>Últimas notícias</h2>
<h3>{post.title}</h3>
```
- **Esforço estimado:** P


## Situação vigente após a revisão do Lighthouse — 28/09/2026

- **Contagem atual:** 70 achados (1 crítico, 2 altos, 47 médios, 20 baixos). O Top 20 permanece com os itens anteriormente priorizados.
- **Cobertura adicional:** Lighthouse 13.5.0 foi executado em modo local somente leitura; seus scores de performance foram inconclusivos por bloqueio deliberado de rede. OB-69 e OB-70 foram mantidos porque seus problemas foram confirmados no código e no DOM, além dos avisos automatizados.
- **Falta para fechar:** perfil e operações autenticadas/admin em ambiente de teste; estado remoto Vercel/Supabase após autenticação; restauração isolada do backup; leitura individual dos arquivos restantes. Não reabri domínio/DNS/TLS e não alterei código, banco ou deployment.

### Continuação da auditoria — fila administrativa de denúncias — 28/09/2026

- Li integralmente `src/app/api/admin/community/route.ts` e os trechos de carregamento, contagem, filtragem e exibição em `src/app/admin/community/page.tsx`. Cruzei a persistência dos estados com `supabase/migrations/20260728000008_community_safety.sql` e `supabase/migrations/20260728000009_moderation_controls.sql`.
- A rota exige token válido e `app_metadata.is_admin`; a RPC de moderação também verifica admin e atualiza a denúncia para `dismissed` ou `actioned`. Essas barreiras protegem as operações, mas não corrigem a contagem nem o limite da fila.
- Confirmei dois problemas distintos: o painel soma todos os estados no indicador “denúncias abertas”, e a API devolve somente as 100 mais recentes antes de o cliente filtrar as pendentes. Não fiz escrita ou teste com registros no banco; a reprodução abaixo deve ser feita em staging.
- Revisei também `src/app/api/admin/images/route.ts`, `src/app/api/admin/posts/[id]/route.ts`, `src/app/api/admin/stats/route.ts`, `src/app/api/community/poll-vote/route.ts`, `src/app/api/cron/release-radar-cleanup/route.ts`, `src/app/api/cron/retention/route.ts` e `src/app/api/youtube/latest/route.ts`. Os pontos sem nova evidência confirmada nesta leitura não foram adicionados como achados; a cobertura restante ainda inclui outros arquivos sem revisão individual.
- **Contagem atualizada:** 72 achados (1 crítico, 2 altos, 48 médios e 21 baixos). OB-72 é médio e permanece fora do Top 20 por depender de mais de 100 registros na fila; OB-71 é baixo. A auditoria continua somente leitura: nesta etapa apenas `AUDITORIA.md` foi alterado.

# **[OB-71] Indicador de denúncias abertas inclui registros resolvidos**

- **Categoria:** Bug
- **Severidade:** Baixa
- **Confiança:** Alta
- **Status:** CONFIRMADO
- **Tipo de evidência:** Estática
- **CVSS estimado:** N/A
- **Localização:** `src/app/admin/community/page.tsx:297,332`; `src/app/api/admin/community/route.ts:23-27`; `supabase/migrations/20260728000009_moderation_controls.sql:156-159`
- **Evidência:**

```tsx
<p className="mt-2 font-heading text-3xl font-black text-white">{reports.length}</p>
<span className="text-xs font-bold text-brand-orange">{reports.length} denúncias abertas</span>
```

```sql
set status = case when target_action = 'dismiss' then 'dismissed' else 'actioned' end,
```

- **Descrição:** O indicador chamado “Denúncias abertas” usa o tamanho de `reports`, mas a API seleciona todas as linhas sem restringir `status`. A RPC de moderação mantém registros resolvidos e muda seu estado para `dismissed` ou `actioned`; por isso, após resolver denúncias, o contador continua incluindo-as. O total também fica sujeito ao limite de 100 da API, descrito separadamente em OB-72.
- **Mitigações verificadas:** A rota exige token válido e admin; a RPC revalida a permissão e só resolve denúncias pendentes. As abas da tabela distinguem pendentes e resolvidas, mas não alteram os dois indicadores que leem `reports.length`.
- **Impacto:** Administradores podem interpretar o total histórico carregado como o tamanho atual da fila e não saber quantas denúncias ainda aguardam análise. O efeito fica restrito ao painel administrativo.
- **Como verificar/reproduzir com segurança:** Em staging, crie três denúncias de teste e resolva duas por ações administrativas. Reabra `/admin/community`: com uma pendente e duas resolvidas entre as 100 retornadas, o painel ainda mostra “3 denúncias abertas”. Não reproduza em produção.
- **Solução recomendada:** Calcular o indicador com `status === "pending"`; se o painel também precisar do histórico, exibir os totais pendentes e resolvidos com rótulos distintos.
- **Exemplo corrigido:**

```tsx
const openReportCount = reports.filter((report) => report.status === "pending").length;
```

```tsx
<span>{openReportCount} denúncias abertas</span>
```

- **Esforço estimado:** P
# **[OB-72] A fila omite denúncias pendentes além das 100 mais recentes**

- **Categoria:** Bug
- **Severidade:** Média
- **Confiança:** Alta
- **Status:** CONFIRMADO
- **Tipo de evidência:** Estática
- **CVSS estimado:** N/A
- **Localização:** `src/app/api/admin/community/route.ts:23-27`; `src/app/admin/community/page.tsx:182-186`
- **Evidência:**

```ts
const { data: reports, error } = await client
  .from("community_reports")
  .select("*")
  .order("created_at", { ascending: false })
  .limit(100);
```

```tsx
return reports.filter((report) => {
  if (moderationTab === "pendentes" && report.status !== "pending") return false;
  if (moderationTab === "resolvidas" && report.status === "pending") return false;
```

- **Descrição:** A API busca as 100 denúncias mais recentes sem filtrar estado e sem fornecer paginação. A tela aplica a aba “pendentes” apenas depois que essas linhas chegam. Se denúncias resolvidas mais recentes ocuparem o limite, uma denúncia pendente mais antiga não é devolvida nem aparece na fila; trocar de aba ou buscar não carrega a próxima página.
- **Mitigações verificadas:** O endpoint autentica o administrador, e as abas filtram corretamente os registros recebidos. A migration cria um índice em `(status, created_at desc)`, mas a consulta não aplica filtro de estado nem paginação. Li a rota e o componente de fila completos nos trechos relevantes; não encontrei cursor, botão de próxima página ou nova busca por estado.
- **Impacto:** Denúncias antigas podem permanecer sem revisão enquanto novas denúncias resolvidas continuam chegando; a equipe pode acreditar que a fila está vazia ou completa quando o item não foi carregado. A condição depende de haver mais de 100 registros e afeta apenas a moderação administrativa.
- **Como verificar/reproduzir com segurança:** Em staging, crie mais de 100 denúncias com timestamps ordenados: deixe uma denúncia antiga como `pending` e resolva as 100 mais recentes. Recarregue `/admin/community` e selecione “pendentes”; a denúncia antiga não estará no resultado. Não reproduza em produção.
- **Solução recomendada:** Filtrar no servidor pelo estado selecionado e implementar paginação estável com cursor ou intervalo. Para a aba “todas”, paginar todos os estados; retornar totais separados para que a interface não confunda a página carregada com o total da fila.
- **Exemplo corrigido:**

```ts
let query = client.from("community_reports").select("*", { count: "exact" });
if (status) query = query.eq("status", status);
const { data, count, error } = await query
  .order("created_at", { ascending: false })
  .range(from, to);
```
- **Esforço estimado:** M


## Situação vigente após a revisão da fila de moderação — 28/09/2026

- **Contagem atual:** 72 achados (1 crítico, 2 altos, 48 médios e 21 baixos). OB-71 e OB-72 são os achados mais recentes; o Top 20 contém 20 itens e os demais estão detalhados acima.
- **Falta para fechar:** exercitar perfil e operações autenticadas/admin em ambiente de teste; confirmar estado remoto Vercel/Supabase com acesso vigente; demonstrar restauração de backup isolado; revisar individualmente os arquivos restantes do inventário. A matriz visual estável das 37 rotas e seis larguras foi concluída, mas integrações privadas e estado autenticado não.
- **Domínio:** configuração DNS/TLS e acesso externo continuam encerrados, conforme orientação do usuário.
- **Alterações nesta etapa:** somente `AUDITORIA.md`; nenhum código, configuração, banco, deployment ou DNS foi alterado.

### Continuação da auditoria — biblioteca de imagens e tarefas programadas — 29/09/2026

- Reli integralmente as rotas `src/app/api/admin/images/route.ts`, `src/app/api/admin/posts/[id]/route.ts`, `src/app/api/admin/stats/route.ts`, `src/app/api/community/poll-vote/route.ts`, `src/app/api/cron/release-radar-cleanup/route.ts`, `src/app/api/cron/retention/route.ts` e `src/app/api/youtube/latest/route.ts`, além dos trechos consumidores da biblioteca e do painel administrativo. Não confirmei bypass de autorização nos handlers lidos; `fetchValidatedRemote` valida todos os redirects, resolve endereços públicos e fixa o endereço usado na conexão.
- Cruzei a limpeza do Radar com `vercel.json` e com `supabase/config.toml`. A rotina executa mensalmente. O arquivo local não declara `api.max_rows`; a configuração PostgREST remota não foi consultada. A documentação oficial do Supabase informa limite padrão de 1.000 linhas por resposta, configurável, e recomenda paginação com `range()` ([referência JavaScript](https://supabase.com/docs/reference/javascript/v1/select)).
- Registrei três problemas confirmados no código: pesquisa da biblioteca restrita aos 200 resultados carregados, consulta da limpeza mensal sem paginação e erro ignorado ao apagar o registro da biblioteca depois de remover o arquivo. Para a limpeza sem paginação, a consequência depende de haver mais itens vencidos que o limite remoto; a contagem e o `max_rows` atual de produção permanecem **NÃO VERIFICADOS**.
- **Contagem atualizada:** 75 achados (1 crítico, 2 altos, 48 médios e 24 baixos). OB-73, OB-74 e OB-75 são baixos e não alteram o Top 20. Não fiz mutações na biblioteca, no Radar ou em serviços externos; apenas `AUDITORIA.md` foi alterado.

- **Esforço estimado:** M
# **[OB-73] A biblioteca de imagens esconde itens além dos 200 mais recentes**

- **Categoria:** Bug
- **Severidade:** Baixa
- **Confiança:** Alta
- **Status:** CONFIRMADO
- **Tipo de evidência:** Estática
- **CVSS estimado:** N/A
- **Localização:** `src/app/api/admin/images/route.ts:163-167`; `src/app/admin/images/page.tsx:36-41,97`
- **Evidência:**

```ts
const { data, error } = await supabase
  .from("editorial_images")
  .select("*")
  .order("created_at", { ascending: false })
  .limit(200);
```

```tsx
<span className="text-xs text-gray-500">{filteredImages.length} de {images.length} imagens</span>
```

- **Descrição:** O endpoint carrega no máximo 200 imagens, e a busca da tela filtra apenas esse array local. Quando a biblioteca tem mais registros, os mais antigos não podem ser encontrados pela pesquisa. O contador mostra o total recebido (`images.length`) como se fosse o total da biblioteca, sem indicar que é somente a página recente.
- **Mitigações verificadas:** A tela mostra erros de carregamento e oferece nova tentativa; a busca funciona nos itens já carregados. Li o endpoint e o componente da página: não encontrei paginação, cursor, contagem total do banco nem mensagem de limite. O índice local por `created_at` melhora a consulta, mas não amplia seus resultados.
- **Impacto:** Administradores podem não conseguir localizar imagens antigas por título, URL ou texto alternativo e podem concluir incorretamente que elas não existem. O problema afeta apenas a biblioteca administrativa.
- **Como verificar/reproduzir com segurança:** Em staging, registre mais de 200 imagens e procure por uma imagem entre as mais antigas que não esteja nas 200 mais recentes. A busca retorna “Nenhuma imagem encontrada”, embora o registro exista no banco. Não crie registros de teste em produção.
- **Solução recomendada:** Implementar paginação no endpoint e carregar páginas adicionais ao pesquisar; retornar a contagem total do banco ou rotular explicitamente o subtotal carregado.
- **Exemplo corrigido:**

```ts
const { data, count, error } = await supabase
  .from("editorial_images")
  .select("*", { count: "exact" })
  .order("created_at", { ascending: false })
  .range(from, from + pageSize - 1);
```

- **Esforço estimado:** P
# **[OB-74] Limpeza mensal do Radar não pagina os itens vencidos**

- **Categoria:** Bug
- **Severidade:** Baixa
- **Confiança:** Média
- **Status:** PROVÁVEL
- **Tipo de evidência:** Estática
- **CVSS estimado:** N/A — limite de paginação
- **Localização:** `src/app/api/cron/release-radar-cleanup/route.ts:40-43,47-61`; `vercel.json:8-10`
- **Evidência:**

```ts
const { data: expired, error: loadError } = await supabase
  .from("release_radar_items")
  .select("*")
  .lt("release_date", firstDay);
```

```ts
const rows = expired || [];
const ids = rows.map((item) => item.id);
```

- **Descrição:** A rotina processa somente as linhas retornadas por uma única consulta e não usa `.range()`, cursor nem lote explícito. No Supabase hospedado, uma resposta tem limite padrão de 1.000 linhas configurável; se houver mais itens vencidos que o limite ativo, uma execução não os processa todos. Como as linhas processadas permanecem na tabela com `release_date` antigo, elas continuam satisfazendo o filtro em execuções seguintes e não há cursor que assegure avançar para as demais. O cron roda mensalmente.
- **Mitigações verificadas:** O código confere erros da leitura, da remoção no Storage e da atualização dos itens. Procurei configuração `api.max_rows` no `supabase/config.toml` e não encontrei; não consultei o valor remoto atual nem a quantidade de itens vencidos, portanto a ocorrência depende de ultrapassar o limite efetivo e a confiança é média. A documentação oficial permite paginar com `range()`.
- **Impacto:** Em uma biblioteca de lançamentos grande, itens vencidos e arquivos associados podem permanecer ativos ou ocupando Storage até uma execução que os alcance; não confirmei que o volume atual atingiu o limite.
- **Como verificar/reproduzir com segurança:** Em staging, configure uma tabela com mais registros vencidos que o `max_rows` do projeto e invoque a rotina. Compare `archived_items` com a contagem vencida antes da execução; o endpoint não percorre páginas adicionais. Não altere a configuração nem os dados de produção para reproduzir.
- **Solução recomendada:** Percorrer resultados em lotes com ordenação estável e cursor, ou processar o lote no banco por uma função atômica que registre o progresso. Excluir ou marcar de modo que as linhas já processadas não continuem competindo com as pendentes.
- **Exemplo corrigido:**

```ts
const { data: expired, error } = await supabase
  .from("release_radar_items")
  .select("id,image_url")
  .lt("release_date", firstDay)
  .order("release_date").order("id").range(from, from + batchSize - 1);
```

- **Esforço estimado:** P
# **[OB-75] Erro ao remover registro da biblioteca não impede sucesso da limpeza**

- **Categoria:** Bug
- **Severidade:** Baixa
- **Confiança:** Alta
- **Status:** CONFIRMADO
- **Tipo de evidência:** Estática
- **CVSS estimado:** N/A — consistência operacional
- **Localização:** `src/app/api/cron/release-radar-cleanup/route.ts:47-51,63`
- **Evidência:**

```ts
await supabase.from("editorial_images").delete().in("public_url", rows.map((item) => item.image_url));
```

```ts
return NextResponse.json({ archived_items: ids.length, removed_files: paths.length, cutoff: firstDay });
```

- **Descrição:** Depois de remover os arquivos do Storage, o cron tenta excluir as linhas correspondentes de `editorial_images`, mas descarta o resultado dessa operação. Se o cliente retornar um objeto `error`, o handler ainda limpa os itens do Radar e responde sucesso. A biblioteca pode então manter registros cujas URLs já apontam para arquivos removidos.
- **Mitigações verificadas:** O handler confere e retorna erro quando a remoção no Storage ou a atualização de `release_radar_items` falha. A chamada de exclusão da biblioteca é a exceção: não captura nem inspeciona `error`. O cliente PostgREST local retorna erros no resultado da Promise quando `throwOnError` não foi habilitado; consultei `node_modules/@supabase/postgrest-js/src/PostgrestBuilder.ts`.
- **Impacto:** A limpeza mensal deixa referências quebradas na biblioteca administrativa e reporta conclusão mesmo com estado parcial. O defeito exige falha na exclusão da linha da biblioteca e não expõe dados a usuários públicos.
- **Como verificar/reproduzir com segurança:** Em ambiente de teste, faça a remoção do Storage retornar sucesso e simule erro PostgREST ao excluir `editorial_images`. Invoque a rotina e confirme que ela ainda retorna 200, zera a URL do item do Radar e deixa o registro da biblioteca apontando para o arquivo removido. Não use produção.
- **Solução recomendada:** Verificar o erro retornado, responder com falha sem marcar o lote como concluído e tornar o cleanup recuperável/idempotente para reconciliar o Storage e a biblioteca.
- **Exemplo corrigido:**

```ts
const { error: libraryError } = await supabase
  .from("editorial_images")
  .delete()
  .in("public_url", imageUrls);
if (libraryError) return NextResponse.json({ error: "Falha ao remover registros da biblioteca" }, { status: 500 });
```
- **Esforço estimado:** P


## Situação vigente após a revisão de rotas administrativas e cron — 29/09/2026

- **Contagem atual:** 76 achados (1 crítico, 2 altos, 48 médios e 25 baixos). OB-73 a OB-76 são os achados mais recentes; o Top 20 continua com 20 linhas.
- **Falta para fechar:** concluir a leitura individual dos arquivos restantes, testar fluxos autenticados/admin em ambiente de teste, confirmar o estado remoto Vercel/Supabase com credenciais vigentes e demonstrar restauração isolada do backup. O `max_rows` remoto e a quantidade atual de itens vencidos no Radar também não foram verificados.
- **Domínio:** configuração DNS/TLS permanece encerrada por orientação do usuário.
- **Alterações nesta etapa:** apenas `AUDITORIA.md`; nenhum código, configuração, dado remoto, deployment ou DNS foi alterado.

### Continuação da auditoria — tratamento de falhas nas estatísticas administrativas — 29/09/2026

- Revisei a rota completa de estatísticas e o consumidor em `src/app/admin/page.tsx`. A rota revalida o token e o papel de administrador, mas não verifica os campos `error` das quatro consultas Supabase; o frontend trata qualquer resposta HTTP 2xx como dados válidos.
- A sequência de integração não foi alterada. O novo achado limita-se à apresentação enganosa quando uma das consultas falha; não confirma perda nem alteração de registros.
- **Contagem atualizada:** 76 achados (1 crítico, 2 altos, 48 médios e 25 baixos). OB-76 é baixo e não altera o Top 20. A única escrita continua sendo `AUDITORIA.md`.

- **Esforço estimado:** P
# **[OB-76] Falhas nas consultas de estatísticas aparecem como dados válidos**

- **Categoria:** Bug
- **Severidade:** Baixa
- **Confiança:** Alta
- **Status:** CONFIRMADO
- **Tipo de evidência:** Estática
- **CVSS estimado:** N/A
- **Localização:** `src/app/api/admin/stats/route.ts:20-35`; `src/app/admin/page.tsx:341-344`
- **Evidência:**

```ts
const authorsList = [...new Set((authors.data || []).map((r) => r.author_name).filter(Boolean))];
return NextResponse.json({
  publishedCount: published.count || 0,
  draftsCount: drafts.count || 0,
  scheduledCount: scheduled.count || 0,
```

```tsx
if (statsRes.ok) {
  const data: StatsData = await statsRes.json();
  setStats(data);
}
```

- **Descrição:** A rota executa quatro consultas e não verifica `error` em nenhuma delas. Quando uma consulta retorna erro com `count` ou `data` nulos, a API ainda responde HTTP 200 e converte contagens ausentes para zero; o frontend armazena essa resposta como estatísticas válidas. Uma falha transitória de banco pode, portanto, parecer ausência real de matérias ou editores.
- **Mitigações verificadas:** A rota exige bearer token válido e `app_metadata.is_admin === true`. O frontend atualiza o estado somente quando `statsRes.ok`, mas isso não ajuda porque a rota responde 200 apesar dos erros internos. O `catch` do carregamento do painel também não apresenta estado de falha para estatísticas; ele as considera não críticas.
- **Impacto:** Administradores podem tomar decisões de publicação ou interpretar o estado do catálogo com base em contagens incorretas durante uma falha de consulta. O impacto é restrito às métricas do painel e não altera as matérias.
- **Como verificar/reproduzir com segurança:** Em ambiente isolado, simule erro PostgREST em uma consulta de contagem e deixe as outras consultas responderem normalmente. A rota responde 200 com zero para a contagem que falhou, e o painel substitui o estado pela resposta. Não provoque falha no banco de produção.
- **Solução recomendada:** Verificar os quatro resultados e responder com erro explícito se alguma consulta obrigatória falhar; no painel, mostrar estado de erro ou preservar o último valor confirmado em vez de substituir por zero.
- **Exemplo corrigido:**

```ts
const results = [published, drafts, scheduled, authors];
if (results.some((result) => result.error)) {
  return NextResponse.json({ error: "Falha ao carregar estatísticas" }, { status: 503 });
}
```
- **Esforço estimado:** P


## Situação vigente após a revisão de estatísticas administrativas — 29/09/2026

- **Contagem atual:** 77 achados (1 crítico, 2 altos, 49 médios e 25 baixos). OB-77 é o último achado incluído; o Top 20 continua com 20 linhas.
- **Falta para fechar:** leitura individual dos arquivos restantes, fluxos autenticados/admin em ambiente de teste, estado remoto Vercel/Supabase com credenciais vigentes e restauração isolada do backup. O volume do Radar vencido e o `max_rows` remoto continuam não verificados.
- **Domínio:** DNS/TLS segue fora do escopo retomado, conforme orientação do usuário.
- **Alterações nesta etapa:** somente `AUDITORIA.md`; código, configurações, dados remotos e deployment permanecem sem alteração nesta etapa.

### Continuação da auditoria — teclado no diálogo de ajuste de XP — 29/09/2026

- Revisei integralmente `src/app/admin/progression/page.tsx` e cruzei os quatro RPCs chamados pela página com seus corpos e permissões nas migrations locais. As funções de visão, ajuste de XP, edição das regras e desclassificação revalidam `current_user_is_admin()`; não confirmei bypass de autorização nesses fluxos.
- Comparei o modal de ajuste com `src/lib/hooks/useModalDialog.ts` e com `src/components/admin/PublishConfirmModal.tsx`. O projeto já possui um helper que move e restaura o foco, contém a sequência de Tab e fecha com Escape, mas o diálogo de ajuste não o utiliza. Não houve sessão autenticada para testar o comportamento no navegador.
- **Contagem atualizada:** 77 achados (1 crítico, 2 altos, 49 médios e 25 baixos). OB-77 é de acessibilidade no painel administrativo e não altera o Top 20. A auditoria permanece somente leitura.

- **Esforço estimado:** P
# **[OB-77] Diálogo de ajuste de XP não contém o foco do teclado**

- **Categoria:** Acessibilidade
- **Severidade:** Média
- **Confiança:** Alta
- **Status:** CONFIRMADO
- **Tipo de evidência:** Estática
- **CVSS estimado:** N/A
- **Localização:** `src/app/admin/progression/page.tsx:239-241`; `src/lib/hooks/useModalDialog.ts:14-64`; `src/components/admin/PublishConfirmModal.tsx:3,28-36`
- **Evidência:**

```tsx
{selectedMember && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onMouseDown={(event) => event.target === event.currentTarget && setSelectedMember(null)}>
    <form role="dialog" aria-modal="true" aria-labelledby="xp-dialog-title" onSubmit={applyAdjustment} className="w-full max-w-md bg-[#15161d] p-4 shadow-[0_24px_60px_rgba(0,0,0,0.45)] sm:p-6">
```

- **Descrição:** O painel apresenta o formulário como diálogo modal, mas não conecta essa abertura ao `useModalDialog` nem a outro mecanismo de foco. O foco permanece no botão “Ajustar” sob a sobreposição; pressionar Tab percorre outros controles do painel antes de chegar aos campos do diálogo, e Escape não o fecha. A orientação WAI-ARIA para diálogos modais determina que o foco entre no diálogo, permaneça dentro dele e que Escape feche a janela ([W3C APG](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)).
- **Mitigações verificadas:** O formulário tem `role="dialog"`, `aria-modal="true"` e título referenciado por `aria-labelledby`, mas isso não faz gerenciamento de foco automaticamente. O helper `useModalDialog` implementa foco inicial/restaurado, contenção de Tab e Escape; componentes vizinhos o usam, porém `ProgressionAdminPage` não importa nem chama esse helper. Os RPCs protegem a ação no servidor, mas não afetam a navegação por teclado.
- **Impacto:** Administradores que navegam por teclado ou leitor de tela podem interagir com controles visualmente cobertos e não conseguir concluir o ajuste de XP de maneira previsível. O problema fica restrito ao fluxo administrativo de ajuste.
- **Como verificar/reproduzir com segurança:** Em staging, entre com uma conta administradora, abra `/admin/progression`, foque “Ajustar” e ative o botão. Pressione Tab: o foco avança por controles da página atrás do diálogo antes de alcançar “Quantidade”; pressione Escape e observe que o modal permanece aberto. Não altere XP em produção.
- **Solução recomendada:** Use `useModalDialog` no formulário e forneça a referência ao elemento `role="dialog"`. Isso move o foco para dentro, mantém Tab/Shift+Tab no diálogo, restaura o foco ao fechar e implementa Escape.
- **Exemplo corrigido:**

```tsx
const adjustmentDialogRef = useModalDialog<HTMLFormElement>(Boolean(selectedMember), () => setSelectedMember(null));
<form ref={adjustmentDialogRef} role="dialog" aria-modal="true" aria-labelledby="xp-dialog-title" onSubmit={applyAdjustment}>
```
- **Esforço estimado:** M


## Situação vigente após a revisão de acessibilidade administrativa — 29/09/2026

- **Contagem atual:** 80 achados (1 crítico, 2 altos, 52 médios e 25 baixos). OB-80 é o achado mais recente; o Top 20 permanece com 20 itens.
- **Falta para fechar:** leitura individual dos arquivos restantes; sessão de teste autenticada/admin; confirmação do estado remoto Vercel/Supabase com credenciais vigentes; restauração isolada do backup. O volume vencido do Radar e o `max_rows` remoto continuam não verificados.
- **Domínio:** DNS/TLS continua encerrado por orientação do usuário.
- **Alterações nesta etapa:** somente `AUDITORIA.md`; nenhum código, configuração, serviço ou dado remoto foi alterado.

### Continuação da auditoria — editor de matérias e equipe administrativa — 29/09/2026

- Revisei a página de equipe e sua rota administrativa; a API lista usuários em páginas de 1.000, filtra `app_metadata.is_admin` e exige admin antes de usar o cliente privilegiado. Revisei o editor de matérias em seus fluxos de carregamento, rascunho local, validação, publicação, blocos e controles laterais.
- Cruzei a gravação de matérias com a policy RLS `posts_admin_update` e com o trigger `enforce_post_publication_quality`. O publish exige ação explícita no modal de confirmação, a validação local e o trigger de banco impõem requisitos editoriais, e a policy exige admin; não confirmei bypass de autorização nem publicação direta nesses trechos.
- Confirmei três falhas do editor: três abas laterais só mudam o destaque visual; atualização por ID inexistente pode ser tratada como salvamento concluído; e carregamentos concorrentes de IDs diferentes podem atualizar o estado do editor fora de ordem. Não houve sessão autenticada para reproduzir esses fluxos em navegador.
- **Contagem atualizada:** 80 achados (1 crítico, 2 altos, 52 médios e 25 baixos). OB-78 a OB-80 são médios e não alteram o Top 20. Apenas `AUDITORIA.md` foi atualizado.

- **Esforço estimado:** M
# **[OB-78] Três abas do editor não trocam o painel exibido**

- **Categoria:** Bug
- **Severidade:** Média
- **Confiança:** Alta
- **Status:** CONFIRMADO
- **Tipo de evidência:** Estática
- **CVSS estimado:** N/A
- **Localização:** `src/app/admin/edit/page.tsx:143,894-914`
- **Evidência:**

```tsx
{(["publicacao", "seo", "midia", "historico"] as const).map((tab) => (
  <button key={tab} onClick={() => setActiveSidebarTab(tab)}>
    {tab === "publicacao" ? "Publicação" : tab === "seo" ? "SEO" : tab === "midia" ? "Mídia" : "Histórico"}
```

```tsx
<h3 className="font-heading text-xs font-bold uppercase tracking-wider text-white">Publicação</h3>
```

- **Descrição:** Os botões atualizam `activeSidebarTab` e movem o destaque visual, mas o arquivo não usa esse estado para renderizar conteúdo condicional. O painel seguinte permanece sempre em “Publicação”; clicar em “SEO”, “Mídia” ou “Histórico” não abre uma seção correspondente.
- **Mitigações verificadas:** Procurei todas as referências a `activeSidebarTab` e `setActiveSidebarTab` no editor: o estado só define o valor inicial, recebe os cliques e controla a cor/indicador da aba. Não encontrei painel condicional, handler adicional ou navegação associada a essas três opções.
- **Impacto:** Editores tentam abrir ferramentas que parecem disponíveis, mas não recebem conteúdo nem feedback. Isso torna os controles inoperantes e dificulta encontrar campos editoriais distribuídos no formulário.
- **Como verificar/reproduzir com segurança:** Entre no editor administrativo de uma matéria e clique em “SEO”, “Mídia” e “Histórico”. Observe que só o destaque da aba muda e que o título e conteúdo do painel continuam em “Publicação”.
- **Solução recomendada:** Implementar um painel por aba e renderizar somente a seção selecionada, ou remover as opções sem conteúdo até que os respectivos painéis estejam implementados.
- **Exemplo corrigido:**

```tsx
{activeSidebarTab === "seo" ? (
  <section aria-labelledby="seo-panel-title"><h3 id="seo-panel-title">SEO</h3></section>
) : activeSidebarTab === "midia" ? (
  <section aria-labelledby="media-panel-title"><h3 id="media-panel-title">Mídia</h3></section>
) : null}
```

- **Esforço estimado:** M
# **[OB-79] Editor descarta o rascunho quando o ID da matéria não existe**

- **Categoria:** Bug
- **Severidade:** Média
- **Confiança:** Alta
- **Status:** CONFIRMADO
- **Tipo de evidência:** Estática
- **CVSS estimado:** N/A
- **Localização:** `src/app/admin/edit/page.tsx:284-288,485-512`
- **Evidência:**

```ts
const { error: updateErr } = await supabase.from("posts").update(extendedPostData).eq("id", postId);
```

```ts
setHasChanges(false);
window.localStorage.removeItem(`orange-brick:article-draft:${postId || "new"}`);
router.push("/admin");
```

- **Descrição:** O editor mostra erro se o carregamento por `postId` não encontra uma linha, mas deixa os botões de salvar ativos. No salvamento, o `UPDATE` filtra pelo ID sem selecionar/confirmar a linha afetada. Um ID inexistente pode resultar em zero linhas alteradas sem erro de consulta; o código então limpa a cópia local e navega como se tivesse salvo. A documentação do Supabase confirma que `update()` não devolve as linhas alteradas por padrão ([referência oficial](https://supabase.com/docs/reference/javascript/update)).
- **Mitigações verificadas:** A policy RLS `posts_admin_update` exige administrador, o editor trata erros PostgREST não nulos e o carregamento usa `.single()`. Porém, a tela permanece editável após falha no carregamento e o update não usa `.select()` nem verifica registro retornado; o fluxo de fallback para `basePostData` também não confirma linhas afetadas.
- **Impacto:** Um editor pode perder todo o texto digitado ao salvar um rascunho associado a URL inválida ou a uma matéria apagada por outro administrador. O sistema mostra conclusão implícita e apaga o backup local sem persistir o conteúdo.
- **Como verificar/reproduzir com segurança:** Em staging, abra `/admin/edit?id=<UUID-inexistente>`, confirme a mensagem de falha ao carregar, preencha título e conteúdo e salve como rascunho. O update atinge zero linhas, mas a tela navega para `/admin` e remove a cópia local. Não use produção.
- **Solução recomendada:** Retornar ao menos o `id` atualizado com `.select("id").maybeSingle()` e tratar resultado nulo como falha; preserve o rascunho local e não navegue até confirmar que uma linha foi salva.
- **Exemplo corrigido:**

```ts
const { data: savedPost, error: updateError } = await supabase.from("posts")
  .update(extendedPostData).eq("id", postId).select("id").maybeSingle();
if (updateError) throw updateError;
if (!savedPost) throw new Error("Matéria não encontrada; o rascunho local foi mantido.");
```

- **Esforço estimado:** M
# **[OB-80] Carregamento atrasado pode trocar os dados da matéria em edição**

- **Categoria:** Bug
- **Severidade:** Média
- **Confiança:** Alta
- **Status:** CONFIRMADO
- **Tipo de evidência:** Estática
- **CVSS estimado:** N/A
- **Localização:** `src/app/admin/edit/page.tsx:217-219,284-288,356-357,485-486`
- **Evidência:**

```tsx
const { data: post, error: fetchError } = await supabase
  .from("posts")
  .select("*")
  .eq("id", postId)
  .single();
```

```tsx
setTitle(typedPost.title);
setSlug(typedPost.slug);
setSummary(typedPost.summary);
```

```tsx
void init();
}, [postId, router, supabase]);
```

- **Descrição:** Quando `postId` muda, o componente relança `init()` para a nova query. A chamada anterior continua ativa e, se terminar depois, grava seus campos no mesmo estado React sem conferir se ainda corresponde ao ID atual. Como `handleSave` usa o `postId` da renderização atual, uma resposta antiga pode preencher os dados da matéria A enquanto a URL aponta para B; salvar pode então gravar o conteúdo de A sobre B. A navegação cliente atualiza os parâmetros lidos por `useSearchParams` ([documentação do Next.js](https://nextjs.org/docs/app/api-reference/functions/use-search-params)).
- **Mitigações verificadas:** O componente verifica `fetchError`, exige usuário admin e a policy de `posts` restringe update a admins. O efeito não retorna cleanup, não cancela a consulta, não usa contador de requisição e não revalida o `postId` antes de aplicar os estados; essas proteções não impedem a corrida entre duas leituras autorizadas.
- **Impacto:** Em uma navegação rápida entre matérias sob rede lenta, o conteúdo errado pode aparecer no editor e, após salvar, substituir campos de outra matéria. O cenário é restrito ao painel administrativo e depende de respostas fora de ordem.
- **Como verificar/reproduzir com segurança:** Em staging, mantenha o editor montado, abra a matéria A e atrase a consulta dela; enquanto está carregando, navegue pelo cliente para a URL da matéria B e deixe B responder primeiro. Quando A responder depois, confirme que os campos exibem A embora a URL mantenha B; um salvamento de teste gravaria os campos em B. Não publique nem salve em produção.
- **Solução recomendada:** Cancelar/invalidar cada execução do efeito no cleanup ou associar uma geração ao `postId`; antes de aplicar qualquer estado, confirme que a consulta ainda corresponde à navegação atual. Também desabilite salvamento enquanto a troca de ID está em andamento.
- **Exemplo corrigido:**

```tsx
useEffect(() => {
  let current = true;
  const loadPost = async () => {
    const { data: post, error } = await supabase.from("posts").select("*").eq("id", postId).single();
    if (!current) return;
    if (error) setError(error.message);
    else if (post) setTitle(post.title);
  };
  void loadPost();
  return () => { current = false; };
}, [postId, supabase]);
```
- **Esforço estimado:** M


## Situação vigente após a revisão de perfis, autenticação e páginas públicas — 29/09/2026

- **Contagem atual:** 85 achados (1 crítico, 2 altos, 55 médios e 27 baixos). OB-81 a OB-85 são os achados mais recentes; o Top 20 continua com 20 itens.
- **Falta para fechar:** concluir leitura individual dos arquivos restantes; exercitar perfil e fluxos admin autenticados em staging; atualizar o estado remoto Vercel/Supabase com acesso vigente; testar restauração isolada do backup. `max_rows` remoto e volume vencido do Radar seguem não verificados.
- **Domínio:** etapa de configuração considerada concluída pelo usuário; não foi reaberta nesta retomada.
- **Arquivos revisados nesta retomada:** `src/app/profile/[nickname]/page.tsx`, `src/app/profile/[nickname]/layout.tsx`, `src/app/cadastro/page.tsx`, `src/app/entrar/page.tsx`, `src/app/recuperar-senha/page.tsx`, `src/app/nova-senha/page.tsx`, `src/app/auth/callback/route.ts`, `src/app/admin/team/page.tsx`, `src/components/auth/CredentialAuthForm.tsx`, `src/lib/auth/return-to.ts`, `src/lib/supabase/client.ts`, `src/lib/types/progression.ts`, `src/app/configuracoes/perfil/page.tsx`, `src/components/community/ProgressionUI.tsx`, `supabase/migrations/20260924000000_public_profile_view_and_access.sql`, `supabase/migrations/20260925000000_restrict_security_definer_privileges.sql`, `src/app/manifest.ts`, `src/app/robots.ts`, `src/app/feed.xml/route.ts`, `src/app/news-sitemap.xml/route.ts`, `src/app/sitemap.xml/route.ts`, `src/app/opengraph-image.tsx`, `src/app/posts/[slug]/opengraph-image.tsx`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/noticias/page.tsx`, `src/app/em-alta/page.tsx`, `src/app/busca/page.tsx`, `src/app/assuntos/[slug]/route.ts`, `src/app/plataforma/[platform]/page.tsx`, `src/app/plataforma/[platform]/PlatformHubClient.tsx`, `src/app/minha-orange/page.tsx`, `src/app/contato/page.tsx`, `src/app/sobre/page.tsx`, `src/app/institucional/[slug]/page.tsx`, `src/app/institucional/[slug]/InstitutionalClient.tsx`, `src/app/brickboard/layout.tsx`, `src/app/brickboard/conquistas/layout.tsx`, `src/app/brickboard/ranking/layout.tsx`, `src/lib/markdown.tsx`, `src/lib/content-validation.ts`, `src/components/feed/HomePageClient.tsx`, `src/lib/contexts/AuthContext.tsx`, `src/lib/site-url.ts`, `src/lib/server/supabase-cookies.ts`, `src/lib/server/rate-limit.ts`, `src/lib/preview-token.ts`, `src/lib/news-query.ts` e a documentação local do Next.js 16.3.6 sobre `dynamicParams`.
- **Alterações nesta etapa:** apenas `AUDITORIA.md`; código, configurações, dados externos e deployment não foram alterados.

# **[OB-81] Consulta atrasada pode exibir outro perfil após navegar**

- **Categoria:** Bug
- **Severidade:** Média
- **Confiança:** Alta
- **Status:** CONFIRMADO
- **Tipo de evidência:** Estática
- **CVSS estimado:** N/A
- **Localização:** `src/app/profile/[nickname]/page.tsx:152-157`
- **Evidência:**

```tsx
const { data: publicIdentity } = await supabase
  .from("public_profiles")
  .select("banner_url")
  .eq("user_id", loadedProfile.user_id)
  .maybeSingle<{ banner_url: string | null }>();
setProfile({ ...loadedProfile, banner_url: publicIdentity?.banner_url || null });
```

- **Descrição:** O efeito mantém uma flag `isActive` e verifica essa flag depois da RPC `public_profile` e depois da consulta de posts. Porém, depois da consulta assíncrona a `public_profiles`, grava `profile` sem conferir se a navegação ainda corresponde ao nickname carregado. Se o usuário sair do perfil A para o perfil B enquanto essa consulta estiver pendente, a resposta antiga de A pode sobrescrever os dados de B depois que B já foi exibido.
- **Mitigações verificadas:** O cleanup do efeito marca `isActive = false` e há verificações após outras consultas, mas não entre a leitura de `public_profiles` e `setProfile`. O perfil é obtido pela RPC pública `public_profile`; a view `public_profiles` limita a projeção consultada ao campo `banner_url`. Não encontrei cancelamento da requisição ou validação do nickname/ID antes dessa gravação.
- **Impacto:** A URL pode apontar para um leitor enquanto a página mostra nome, banner, estatísticas e conteúdo de outro. Isso confunde visitantes e pode revelar dados públicos em um contexto incorreto, embora não contorne a autorização de leitura.
- **Como verificar/reproduzir com segurança:** Em ambiente de teste, abra o perfil A com throttling de rede e atrase a consulta à view `public_profiles`; navegue pelo cliente para o perfil B, deixe B carregar primeiro e depois libere a resposta de A. Confirme se a URL de B permanece enquanto os dados do cabeçalho mostram A. Não é necessário gravar dados.
- **Solução recomendada:** Verificar `isActive` imediatamente após cada `await` antes de qualquer atualização de estado; opcionalmente use `AbortController` ou uma geração de requisição associada ao nickname.
- **Exemplo corrigido:**

```tsx
const { data: publicIdentity } = await supabase.from("public_profiles").select("banner_url").eq("user_id", loadedProfile.user_id).maybeSingle<{ banner_url: string | null }>();
if (!isActive) return;
setProfile({ ...loadedProfile, banner_url: publicIdentity?.banner_url || null });
```

- **Esforço estimado:** M
# **[OB-82] Slugs herdados passam pela validação da rota institucional**

- **Categoria:** Bug
- **Severidade:** Baixa
- **Confiança:** Alta
- **Status:** CONFIRMADO
- **Tipo de evidência:** Estática
- **CVSS estimado:** N/A
- **Localização:** `src/app/institucional/[slug]/page.tsx:17-21,31-34`; `src/app/institucional/[slug]/InstitutionalClient.tsx:92-118,122-137`
- **Evidência:**

```ts
const pages = {
  termos: { title: "Termos de Uso", description: "Termos de uso do portal Orange Brick." },
  privacidade: { title: "Política de Privacidade", description: "Como o Orange Brick protege e trata dados pessoais." },
  anuncie: { title: "Anuncie", description: "Fale com a equipe comercial do Orange Brick." },
} as const;
```

```ts
if (!(slug in pages)) notFound();
return <InstitutionalClient slug={slug as keyof typeof pages} />;
```

- **Descrição:** O operador `in` também aceita propriedades herdadas do protótipo. Confirmei em Node que `"constructor" in { termos: 1, privacidade: 2, anuncie: 3 }` retorna `true`. Como `dynamicParams` do Next.js é `true` por padrão e a rota não o desabilita, `/institucional/constructor` passa pela checagem; o componente então encaminha qualquer slug que não seja `termos` ou `anuncie` para o texto de privacidade. `/institucional/toString` tem o mesmo comportamento.
- **Mitigações verificadas:** `generateStaticParams` enumera apenas `termos`, `privacidade` e `anuncie`, mas não bloqueia outros valores em runtime; a documentação local do Next.js confirma que `dynamicParams` por padrão permite gerar slugs não pré-renderizados. Não há verificação de propriedade própria (`Object.hasOwn`) antes do cast.
- **Impacto:** URLs inválidas podem servir conteúdo de privacidade com status de página normal e metadados incompletos, criando duplicatas e confundindo navegação e indexação.
- **Como verificar/reproduzir com segurança:** Em ambiente local/staging, acesse `/institucional/constructor` e `/institucional/toString`; confirme que não ocorre 404 e que aparece o aviso de privacidade. A semântica do lookup foi verificada no Node 24.20.0; a permissão de slugs não gerados foi confirmada na documentação local do Next.js 16.3.6.
- **Solução recomendada:** Use `Object.hasOwn(pages, slug)` para validar e retornar 404 antes do cast; ou desative `dynamicParams` quando o conjunto for fechado.
- **Exemplo corrigido:**

```ts
if (!Object.hasOwn(pages, slug)) notFound();
return <InstitutionalClient slug={slug as keyof typeof pages} />;
```

- **Esforço estimado:** P
# **[OB-83] Falha do RPC de ranking ativa leitura sem limite da tabela de eventos**

- **Categoria:** Performance
- **Severidade:** Média
- **Confiança:** Média
- **Status:** CONFIRMADO
- **Tipo de evidência:** Estática
- **CVSS estimado:** N/A
- **Localização:** `src/app/em-alta/page.tsx:27-43`; agregação principal em `supabase/migrations/20260821000001_post_interest_scores.sql:4-25`
- **Evidência:**

```ts
} else {
  const [{ data: reactionData }, { data: viewData }] = await Promise.all([
    supabase.from("reactions").select("post_id, reaction_type"),
    supabase.from("post_views").select("post_id"),
  ]);
  for (const reaction of (reactionData || []) as Pick<Reaction, "post_id" | "reaction_type">[]) scores[reaction.post_id] = (scores[reaction.post_id] || 0) + (reaction.reaction_type === "hype" ? 4 : 2);
  for (const view of (viewData || []) as Array<{ post_id: string }>) scores[view.post_id] = (scores[view.post_id] || 0) + 1;
}
```

- **Descrição:** Quando `get_post_interest_scores()` falha, a página de ranking baixa as tabelas `reactions` e `post_views` sem filtro, limite explícito ou paginação e agrega tudo na memória. A migração local documenta que o RPC foi criado para substituir esse download integral. Se houver muitas interações, o fallback consome memória/tempo na renderização; se exceder o limite de linhas configurado no PostgREST, os totais podem ser parciais. O volume atual e `max_rows` remoto são NÃO VERIFICADOS.
- **Mitigações verificadas:** A rota limita a lista-base a 40 matérias e usa a agregação SQL no caminho normal. O fallback roda apenas quando o RPC retorna erro; não há cache de scores nem paginação/filtro nas duas consultas alternativas. A função SQL agrega no banco, mas seu deploy remoto não foi confirmado.
- **Impacto:** Durante falha ou indisponibilidade do RPC, `/em-alta` pode ficar lenta ou apresentar ranking incorreto quando o volume de interações ultrapassar o limite da API.
- **Como verificar/reproduzir com segurança:** Em staging, force erro em `get_post_interest_scores()`, carregue mais interações que o limite PostgREST configurado e abra `/em-alta`; observe consultas não paginadas e compare as pontuações com agregação SQL completa. Não faça a simulação em produção.
- **Solução recomendada:** Manter a agregação no banco e, em falha, usar uma resposta degradada com alerta/log em vez de baixar as tabelas inteiras. Se houver fallback, restringi-lo aos IDs das matérias mostradas e paginar, ou consultar uma agregação materializada.
- **Exemplo corrigido:**

```ts
const { data: scoreData, error: scoreError } = await supabase.rpc("get_post_interest_scores");
if (scoreError) console.error("Falha ao calcular pontuação do ranking", scoreError.code);
const scores = Object.fromEntries((scoreData || []).map((row) => [row.post_id, Number(row.interest_score)]));
```

- **Esforço estimado:** M
# **[OB-84] Falhas nas consultas deixam feeds e sitemaps incompletos sem alerta**

- **Categoria:** SEO
- **Severidade:** Baixa
- **Confiança:** Alta
- **Status:** CONFIRMADO
- **Tipo de evidência:** Estática
- **CVSS estimado:** N/A — disponibilidade/SEO
- **Localização:** `src/app/feed.xml/route.ts:18-24,26-34`; `src/app/news-sitemap.xml/route.ts:28-40`; `src/app/sitemap.xml/route.ts:27-47`
- **Evidência:**

```ts
const { data } = await supabase
  .from("posts")
  .select("slug, title, summary, published_at, author_name")
  .eq("is_published", true)
  .order("published_at", { ascending: false })
  .limit(30);
const items = (data || []).map((post) => `
```

```ts
if (data) posts = data as Array<{ slug: string; title: string; published_at: string | null }>;
} catch {
  // return valid XML structure
}
```

- **Descrição:** O RSS e o sitemap de notícias ignoram a propriedade `error` devolvida pelo cliente Supabase; com `data: null`, produzem feed sem matérias ou sitemap sem URLs de notícia. O sitemap geral detecta erros PostgREST, mas os engole e retorna somente as entradas estáticas. Os três endpoints podem responder com XML HTTP 200 sem indicar que a parte dinâmica falhou.
- **Mitigações verificadas:** As consultas selecionam apenas matérias publicadas e os XMLs escapam títulos/slugs onde necessário. A lista estática do sitemap geral permanece disponível. Não há log, métrica ou resposta de erro que permita distinguir “nenhuma notícia” de falha de leitura.
- **Impacto:** Crawlers e leitores RSS podem deixar de receber matérias recentes durante falhas de PostgREST, e a equipe não recebe sinal para investigar; o impacto é limitado enquanto os links internos do site funcionam.
- **Como verificar/reproduzir com segurança:** Em ambiente de teste com resposta Supabase simulada como erro PostgREST, solicite `/feed.xml`, `/news-sitemap.xml` e `/sitemap.xml`; confirme que as respostas continuam em XML 200 e omitem as entradas dinâmicas. Não altere permissões do projeto de produção para reproduzir.
- **Solução recomendada:** Checar `error` explicitamente e registrar o código sem dados pessoais; em falha, servir o último sitemap válido/cacheado ou retornar erro temporário em vez de fingir uma lista vazia.
- **Exemplo corrigido:**

```ts
const { data, error } = await supabase.from("posts").select("slug, title").eq("is_published", true).limit(30);
if (error) {
  console.error("Falha ao gerar feed de notícias", error.code);
  throw new Error("Feed temporariamente indisponível");
}
```

- **Esforço estimado:** P
# **[OB-85] Link Markdown incompleto causa recursão infinita no parser**

- **Categoria:** Bug
- **Severidade:** Média
- **Confiança:** Alta
- **Status:** CONFIRMADO
- **Tipo de evidência:** Estática
- **CVSS estimado:** N/A
- **Localização:** `src/lib/markdown.tsx:9-12,62-71,74-78`; uso em `src/app/posts/[slug]/PostDetailClient.tsx:44-50,105` e `src/app/admin/edit/page.tsx:1092-1095`
- **Evidência:**

```tsx
if (currentIndex < text.length) {
  const remaining = text.slice(currentIndex);
  if (remaining.includes("[") && remaining.includes("](")) {
    parts.push(parseInlineMarkdown(remaining));
  } else {
    parts.push(remaining);
  }
}
```

- **Descrição:** Se `remaining` contém `](` mas não forma um link que satisfaça `tokenRegex` — por exemplo, `[guia](https://exemplo.com` sem `)` final — `currentIndex` permanece no início e a função chama `parseInlineMarkdown` com a mesma string. A chamada se repete até estourar a pilha. O renderer é usado no detalhe público e no preview do editor. `validateEditorialContent` verifica a citação final, mas não verifica a sintaxe de links Markdown em todo o texto.
- **Mitigações verificadas:** O parser permite apenas URLs internas ou `http(s)` para os links que reconhece, escapando HTML via renderização React; isso não cobre a recursão de links incompletos. Li o gate `validateEditorialContent`/`validateStoredEditorialPost` e não encontrei checagem de balanceamento de `[]()` ou tratamento de profundidade.
- **Impacto:** Um bloco com Markdown incompleto pode derrubar o preview administrativo ou fazer a matéria correspondente falhar para leitores, embora não conceda execução de código nem acesso a outras contas.
- **Como verificar/reproduzir com segurança:** No preview do editor em ambiente de teste, escreva `[guia](https://exemplo.com` em um bloco de texto. O parser volta a processar a mesma string até ocorrer `Maximum call stack size exceeded`; a mesma entrada em uma matéria renderizada aciona o mesmo caminho. Não publique conteúdo de teste.
- **Solução recomendada:** Tratar tokens inválidos como texto literal sem recursão; avançar o cursor antes de recursar ou usar parser iterativo com limite de profundidade. Acrescentar validação de links Markdown ao gate de publicação.
- **Exemplo corrigido:** Antes de processar o token reconhecido, mantenha o trecho que não corresponde a token como texto literal:

```tsx
if (matchIndex > currentIndex) {
  parts.push(text.slice(currentIndex, matchIndex));
}
```
- **Esforço estimado:** M


Depois do laço, também acrescente o restante como texto literal:

```tsx
if (currentIndex < text.length) {
  parts.push(text.slice(currentIndex));
}
```

## Rechecagem remota somente leitura — 29/09/2026

- A sessão da Vercel está autenticada. `vercel crons list --project orange-brick` confirmou novamente seis tarefas ativas, inclusive `generate-daily` sem `slot` e `drive-sync`, que não existe no checkout atual; os três slots locais seguem pendentes de deploy. Isso atualiza a confirmação anterior de OB-03; nenhum deploy foi realizado.
- `vercel env ls production --project orange-brick` mostrou apenas nomes/tipos; `RAWG_API_KEY` continua ausente. Não registrei valores de variáveis nem segredos.
- `supabase migration list --linked` voltou a parar em `Initialising login role...`; encerrei a consulta depois de 25 segundos sem resultado. Ledger remoto, `max_rows`, RPCs/tabelas implantadas e volume vencido do Radar seguem não verificados.
- **Contagem após esta retomada:** 85 achados (1 crítico, 2 altos, 55 médios e 27 baixos). A auditoria permanece aberta.
- **Falta para concluir:** leitura e cruzamento individual do restante do inventário de código (81 arquivos `src/**/*.ts(x)/css` não citados no relatório no início desta varredura, vários cobertos por scanners ou revisões anteriores); testar login, perfil e painel admin com sessão de staging; verificar deployment/resultado dos crons sem executar publicação; demonstrar restauração em destino isolado, que não cabe no escopo somente leitura. O domínio continua considerado concluído pelo usuário e não foi reaberto.
- **Alterações externas:** nenhuma. A única escrita do trabalho de auditoria é `AUDITORIA.md`.

## Continuação da auditoria — 29/09/2026

- Revisei `src/lib/hooks/useInfiniteFeed.ts`, `src/components/feed/NewsFeed.tsx` e `src/components/feed/HomePageClient.tsx`. Ao filtrar a página inicial, `HomePageClient` passa `undefined`; o valor padrão do hook cria um novo array em cada render, e esse array está nas dependências do efeito que consulta o feed. Cada resposta bem-sucedida atualiza `posts`, provoca novo render e dispara outra consulta da primeira página. Registrei OB-86 como desempenho médio, confiança alta.
- Revisei `src/lib/hooks/useFollowPreferences.ts`, `src/components/topics/FollowButton.tsx` e a policy local em `supabase/migrations/20260803000001_reader_experience.sql`. O hook altera o estado visual antes da gravação e ignora o campo `error` de insert/delete; a policy local limita as linhas ao titular. Registrei OB-87 como bug baixo, confiança alta. A disponibilidade remota de `user_follows` continua coberta por OB-02 e não foi revalidada nesta etapa.
- Revisei `src/components/feed/CommunityPulse.tsx` e `supabase/migrations/20260723000000_community.sql`. O erro da consulta de comentários recentes é convertido em zero sem aviso; registrei OB-88 como bug baixo, confiança alta. A policy local permite leitura pública desses comentários.
- Revisei `src/components/originkit/ui/coverflowgallery-custom-style.tsx`, usado pela faixa do Radar. Os slides com `opacity: 0` continuam sendo botões sem `tabIndex` restritivo; registrei OB-89 como acessibilidade média, confiança alta.
- Busquei usos em todo o checkout de `CreatePollModal`, `TrendingTicker`, `Skiper40`, `NewsCardError` e `useGlobalReactions`. As buscas só encontram suas próprias declarações; registrei OB-90 como código baixo, confiança alta. `NewsCardSkeleton` foi excluído da lista porque é usado por `NewsFeedSkeleton`.
- **Arquivos revisados nesta continuação:** `src/components/auth/UserNav.tsx`, `src/components/ui/NotificationCenter.tsx`, `src/components/admin/AdminShell.tsx`, `src/components/contact/ContactForm.tsx`, `src/components/contact/NewsletterForm.tsx`, `src/components/comments/CommentForm.tsx`, `src/components/comments/CommentsDrawer.tsx`, `src/components/PushSetup.tsx`, `src/components/PwaInstallBanner.tsx`, `src/components/ui/AccessibilityMenu.tsx`, `src/components/ui/Analytics.tsx`, `src/components/ui/GlobalSearchShortcut.tsx`, `src/components/ui/BookmarkDrawer.tsx`, `src/components/ui/BackToTop.tsx`, `src/components/ui/ToastContainer.tsx`, `src/lib/contexts/ToastContext.tsx`, `src/components/ui/youtube-video-player.tsx`, `src/components/ui/Timer.tsx`, `src/components/ui/Tag.tsx`, `src/components/ui/Icon.tsx`, `src/components/ui/UserBadge.tsx`, `src/components/feed/ReleaseRadarStrip.tsx`, `src/components/feed/NewsSidebar.tsx`, `src/components/feed/TrendingTicker.tsx`, `src/components/feed/CommunityPulse.tsx`, `src/components/feed/HomeEngagementTracker.tsx`, `src/components/feed/SinceLastVisit.tsx`, `src/components/feed/PlatformBar.tsx`, `src/components/feed/MultimediaSection.tsx`, `src/components/feed/NewsFeedEmpty.tsx`, `src/components/reactions/ReactionBar.tsx`, `src/components/reactions/ReactionButton.tsx`, `src/components/reactions/ReactionsError.tsx`, `src/components/releases/ArticleHypeSummary.tsx`, `src/components/community/SpoilerText.tsx`, `src/components/community/GamerBadges.tsx`, `src/components/community/CreatePollModal.tsx`, `src/components/card/NewsCard.tsx`, `src/components/card/NewsCardCompact.tsx`, `src/components/card/NewsCardSummary.tsx`, `src/components/card/NewsCardSkeleton.tsx`, `src/components/card/NewsCardHeader.tsx`, `src/components/card/NewsCardError.tsx`, `src/components/admin/GameRadarAutocomplete.tsx`, `src/components/admin/EditorialQualityChecklist.tsx`, `src/components/originkit/ui/coverflowgallery-custom-style.tsx`, `src/components/ui/skiper-ui/skiper40.tsx`, `src/lib/hooks/usePostViews.ts`, `src/lib/hooks/usePostStats.ts`, `src/lib/hooks/useNotificationCenter.ts`, `src/lib/hooks/useGlobalReactions.ts`, `src/lib/hooks/useDeviceId.ts`, `src/lib/hooks/useCommentCount.ts`, `src/lib/hooks/useBookmarks.ts`, `src/lib/daily-poll.ts`, `src/lib/community-errors.ts`, `src/lib/avatar.ts`, `src/lib/progression.ts`, `src/lib/ai/request-budget.ts`, `src/lib/ai/editorial-prompts.ts`, `src/lib/ai/editorial-output.ts`, `src/lib/server/post-stats-handler.ts`, `src/lib/server/network.ts` e `src/lib/server/editorial-slot.ts`.
- Revisei também os sete arquivos que ainda não tinham referência explícita no índice da varredura: `src/lib/youtube.ts`, `src/lib/utils.ts`, `src/lib/utils/time-ago.ts`, `src/lib/types/platform.ts`, `src/lib/types/community.ts`, `src/components/ui/ContentActionIcons.tsx` e `src/components/layout/SiteHeader.tsx`. Não encontrei outro problema confirmado nesses arquivos; o tratamento de timestamps futuros em `timeAgo` foi registrado como OB-91. A busca de cobertura aponta zero de 212 arquivos `src/**/*.ts(x)/css` sem menção explícita no relatório.
- **Contagem atual:** 91 achados (1 crítico, 2 altos, 57 médios e 31 baixos). O Top 20 continua com 20 linhas; OB-86 entrou no recorte e OB-37 permanece detalhado fora dele.
- **Próximo ponto:** a revisão dos arquivos `src/**/*.ts(x)/css` sem referência explícita foi concluída nesta retomada. Restam a validação de fluxos autenticados em staging, a confirmação somente leitura de migrações/objetos e cron no ambiente remoto e uma restauração demonstrada em destino isolado. A consulta ao ledger Supabase continua bloqueada em `Initialising login role...`; não alterei a sessão nem executei operações de escrita externas.
- **Limite desta etapa:** não rodei testes, build ou deploy. O workspace já apresentava alterações em vários arquivos; preservei todos e esta continuação escreveu apenas `AUDITORIA.md`.

- **Esforço estimado:** M
# **[OB-86] Filtro da página inicial dispara consultas sem parar**

- **Categoria:** Performance
- **Severidade:** Média
- **Confiança:** Alta
- **Status:** CONFIRMADO
- **Tipo de evidência:** Estática
- **CVSS estimado:** N/A
- **Localização:** `src/lib/hooks/useInfiniteFeed.ts:21,111-115,126`; `src/components/feed/HomePageClient.tsx:29,53`
- **Evidência:**

```tsx
queueMicrotask(() => {
  cursorRef.current = null;
  setHasMore(true);
  void fetchPosts(true);
});
```

```tsx
}, [fetchPosts, initialPosts]);
```

```tsx
initialPosts={hasQueryFilters ? undefined : initialPosts}
```

- **Descrição:** Quando há categoria, termo de busca ou tag, a página inicial passa `undefined` para o hook. O parâmetro padrão `[]` cria um novo array a cada render; como `initialPosts` está nas dependências do efeito, a atualização de `posts` após uma resposta bem-sucedida provoca outro render e outra consulta da primeira página. O ciclo se repete enquanto as respostas forem bem-sucedidas e a página filtrada permanecer aberta.
- **Mitigações verificadas:** `loadingRef` impede consultas simultâneas e o timer é limpo no unmount, mas não interrompem esse ciclo sequencial. O efeito redefine o cursor para `null` e recarrega a primeira página. O chamador usa `undefined` exatamente quando os filtros estão ativos. Não encontrei estabilização da lista inicial nem deduplicação do efeito por categoria.
- **Impacto:** Uma visita à página inicial filtrada gera tráfego repetido de leitura no Supabase, consumo de rede e rerenderizações, com potencial de elevar custos e pressionar o limite de requisições. O defeito ocorre sem autenticação.
- **Como verificar/reproduzir com segurança:** Abra `/?category=breaking` ou selecione uma categoria na página inicial e mantenha o painel Network aberto. Observe novas consultas à tabela `posts` após cada resposta, sem clicar em “Carregar mais”. A inspeção estática confirma que cada execução consulta a primeira página; não executei este fluxo no navegador nesta retomada.
- **Solução recomendada:** Usar um valor vazio estável fora do hook ou estabilizar a referência de `initialPosts`; rever as dependências do efeito para que uma atualização dos resultados não inicie outra carga inicial. Validar que uma consulta inicial e o timer intencional são os únicos disparadores.
- **Exemplo corrigido:**

```tsx
const EMPTY_POSTS: Post[] = [];

export function useInfiniteFeed(category?: PostCategory | null, initialPosts: Post[] = EMPTY_POSTS): UseInfiniteFeedReturn {
```
- **Esforço estimado:** M


# **[OB-87] Erro ao salvar acompanhamento deixa a interface em estado falso**

- **Categoria:** Bug
- **Severidade:** Baixa
- **Confiança:** Alta
- **Status:** CONFIRMADO
- **Tipo de evidência:** Estática
- **CVSS estimado:** N/A
- **Localização:** `src/lib/hooks/useFollowPreferences.ts:28-35`; uso em `src/components/topics/FollowButton.tsx:8-15`; policy em `supabase/migrations/20260803000001_reader_experience.sql:52-53`
- **Evidência:**

```tsx
const active = follows[type].includes(value);
setFollows((current) => ({ ...current, [type]: active ? current[type].filter((item) => item !== value) : [...current[type], value] }));
if (active) await supabase.from("user_follows").delete().eq("user_id", user.id).eq("follow_type", type).eq("follow_value", value);
else await supabase.from("user_follows").insert({ user_id: user.id, follow_type: type, follow_value: value });
return !active;
```

- **Descrição:** O hook altera `follows` antes de gravar no banco e não lê o `error` devolvido por `insert` ou `delete`. Se a gravação falhar, o botão continua mostrando “Acompanhando” ou deixa de mostrar esse estado, embora a preferência não tenha sido persistida; ao recarregar, a interface volta ao valor do banco.
- **Mitigações verificadas:** A função exige usuário autenticado; a policy local restringe leitura e escrita ao próprio `user_id`. Essas verificações protegem o acesso aos dados, mas não detectam a falha nem revertem o estado otimista. O erro remoto já conhecido de `user_follows` está registrado em OB-02; este achado também ocorre diante de erro transitório depois que a tabela estiver acessível.
- **Impacto:** O leitor acredita que salvou uma preferência de acompanhamento, mas perde o estado ao atualizar a página; listas de conteúdo “seguindo” também podem divergir do que foi salvo.
- **Como verificar/reproduzir com segurança:** Em staging, autentique uma conta de teste, bloqueie ou simule uma resposta de erro para a gravação em `user_follows` e clique em “Acompanhar”. O botão muda para “Acompanhando”; atualize a página e confirme que o item não aparece como acompanhado. Não altere dados de produção.
- **Solução recomendada:** Conferir o erro de cada mutação; em falha, reverter o estado local e apresentar mensagem de erro. Desabilitar o botão durante a gravação para evitar cliques concorrentes e não retornar sucesso antes da confirmação do banco.
- **Exemplo corrigido:**

```tsx
const { error } = active
  ? await supabase.from("user_follows").delete().eq("user_id", user.id).eq("follow_type", type).eq("follow_value", value)
  : await supabase.from("user_follows").insert({ user_id: user.id, follow_type: type, follow_value: value });
if (error) return false;
setFollows((current) => ({ ...current, [type]: active ? current[type].filter((item) => item !== value) : [...current[type], value] }));
return !active;
```

- **Esforço estimado:** P
# **[OB-88] Falha ao contar respostas aparece como zero no pulso comunitário**

- **Categoria:** Bug
- **Severidade:** Baixa
- **Confiança:** Alta
- **Status:** CONFIRMADO
- **Tipo de evidência:** Estática
- **CVSS estimado:** N/A
- **Localização:** `src/components/feed/CommunityPulse.tsx:44-60`; uso na página inicial em `src/components/feed/HomePageClient.tsx:58`; policy local em `supabase/migrations/20260723000000_community.sql:93-96`
- **Evidência:**

```tsx
const { data: comments, error: commentsError } = await supabase
  .from("community_comments")
  .select("post_id")
  .in("post_id", ids);

if (commentsError) {
  setHasError(false);
}
```

```tsx
setPosts(rows.map((post) => ({ ...post, comments_count: commentCounts.get(post.id) || 0 })));
```

- **Descrição:** Se a consulta das respostas falhar, o componente limpa o estado de erro, não agrega nenhuma linha e registra contagem zero para cada post recente. A faixa do Brickboard continua exibindo esses posts com “0 respostas”, embora a contagem esteja indisponível.
- **Mitigações verificadas:** A consulta principal de posts trata erro e mostra um estado de falha; a consulta de comentários é uma segunda chamada, cujo erro não é propagado. A policy local permite leitura pública de `community_comments`, mas não cobre indisponibilidade de rede, PostgREST ou erro de schema.
- **Impacto:** Visitantes recebem contagens incorretas no resumo da comunidade e não sabem que a leitura falhou; a lista principal de conversas continua acessível pelo link para o Brickboard.
- **Como verificar/reproduzir com segurança:** Em staging, force erro na consulta `community_comments` enquanto a consulta de `community_posts` retorna dados. Abra a página inicial e observe que os três posts aparecem com zero respostas, sem mensagem de erro. Não altere políticas nem dados de produção.
- **Solução recomendada:** Propagar o erro da segunda consulta ao estado visual ou distinguir `null`/indisponível de zero; incluir retry para a contagem sem esconder as conversas recentes.
- **Exemplo corrigido:**

```tsx
if (commentsError) {
  setHasError(true);
  setIsLoaded(true);
  return;
}
```

- **Esforço estimado:** P
# **[OB-89] Slides invisíveis do Radar continuam acessíveis ao teclado**

- **Categoria:** Acessibilidade
- **Severidade:** Média
- **Confiança:** Alta
- **Status:** CONFIRMADO
- **Tipo de evidência:** Estática
- **CVSS estimado:** N/A
- **Localização:** `src/components/originkit/ui/coverflowgallery-custom-style.tsx:147-168`; uso em `src/components/feed/ReleaseRadarStrip.tsx:227-242`
- **Evidência:**

```tsx
const visible = distance <= 2;
```

```tsx
<button
  key={`${slide.title}-${index}`}
  type="button"
  onClick={() => selected ? step(1) : setActive(index)}
  aria-label={selected ? `${slide.title}. Próximo lançamento` : `Selecionar ${slide.title}`}
```

```tsx
opacity: visible ? 1 : 0,
pointerEvents: visible ? "auto" : "none",
```

- **Descrição:** Os slides a mais de duas posições recebem opacidade zero e deixam de aceitar cliques de ponteiro, mas continuam sendo elementos `<button>` focáveis pela tecla Tab e não recebem `tabIndex={-1}` nem `aria-hidden`. O anel de foco também fica invisível junto com o slide.
- **Mitigações verificadas:** O contêiner do carrossel aceita as setas esquerda/direita, cada botão expõe um rótulo e o slide ativo usa `aria-current`. Essas medidas não removem os slides invisíveis da ordem de foco nem da árvore de acessibilidade. A faixa do Radar fornece uma lista dinâmica de lançamentos.
- **Impacto:** Em carrosséis com mais de cinco itens, pessoas que navegam por teclado podem focar controles que não veem, e leitores de tela recebem opções que não estão visualmente disponíveis.
- **Como verificar/reproduzir com segurança:** Em `/`, usando teclado e um Radar com pelo menos seis lançamentos, foque o carrossel e pressione Tab repetidamente. Confirme que um botão invisível recebe foco sem que o contorno apareça. A revisão foi estática nesta retomada; não executei um teste de teclado no navegador.
- **Solução recomendada:** Definir `tabIndex={visible ? 0 : -1}` e `aria-hidden={!visible}` nos slides fora da faixa visível, ou renderizar/focar apenas o slide ativo e os controles de navegação.
- **Exemplo corrigido:**

```tsx
<button
  tabIndex={visible ? 0 : -1}
aria-hidden={!visible}
style={{ opacity: visible ? 1 : 0, pointerEvents: visible ? "auto" : "none" }}
>
```

- **Esforço estimado:** M
# **[OB-90] Quatro módulos de interface não têm consumidores**

- **Categoria:** Código
- **Severidade:** Baixa
- **Confiança:** Alta
- **Status:** CONFIRMADO
- **Tipo de evidência:** Estática
- **CVSS estimado:** N/A
- **Localização:** src/components/feed/TrendingTicker.tsx:18; src/components/ui/skiper-ui/skiper40.tsx:8,22; src/components/card/NewsCardError.tsx:8; src/lib/hooks/useGlobalReactions.ts:15

- **Evidência:**

```tsx
export function TrendingTicker({ activeTag, onSelectTag }: TrendingTickerProps) {
const Skiper40 = () => {
```

```tsx
export function NewsCardError({
export function useGlobalReactions() {
```

- **Descrição:** A busca global no diretório src não encontrou consumidores para os quatro módulos listados. Eles permanecem no checkout sem participar dos fluxos atuais. CreatePollModal foi removido deste achado porque é importado e renderizado em src/app/brickboard/page.tsx:10,802-805.
- **Mitigações verificadas:** Pesquisei cada símbolo em src, contando importações e chamadas e desconsiderando a declaração no próprio módulo. O uso real de CreatePollModal foi confirmado no Brickboard; os quatro módulos restantes só aparecem nas próprias declarações.
- **Impacto:** Código sem uso aumenta a área de manutenção e pode carregar dependências ou demonstrações desnecessárias.
- **Como verificar/reproduzir com segurança:** Pesquise os quatro símbolos em src; nenhuma importação ou uso além da definição deve aparecer.
- **Solução recomendada:** Remover os módulos após confirmar que não fazem parte de fluxo planejado; se forem mantidos, registrar o consumidor previsto.
- **Exemplo corrigido:**

```text
TrendingTicker, Skiper40, NewsCardError e useGlobalReactions removidos após confirmação de ausência de consumidores.
```

- **Esforço estimado:** P
# **[OB-91] Datas futuras são exibidas como se fossem de agora**

- **Categoria:** Bug
- **Severidade:** Baixa
- **Confiança:** Alta
- **Status:** CONFIRMADO
- **Tipo de evidência:** Estática
- **CVSS estimado:** N/A
- **Localização:** `src/lib/utils/time-ago.ts:6-14`; usos em `src/components/ui/Timer.tsx:31-32`, `src/components/community/BrickCard.tsx:343-345`, `src/components/comments/CommentItem.tsx:80` e `src/components/feed/CommunityPulse.tsx:136`
- **Evidência:**

```ts
const diffSeconds = Math.floor(diffMs / 1000);
const diffMinutes = Math.floor(diffSeconds / 60);
if (diffSeconds < 60) return "agora";
```

- **Descrição:** Para qualquer timestamp posterior ao relógio local, `diffSeconds` é negativo e satisfaz `diffSeconds < 60`; a função retorna “agora” mesmo se a data estiver horas ou dias no futuro. Os componentes de data consultados exibem esse resultado diretamente.
- **Mitigações verificadas:** A função retorna texto vazio para datas inválidas, mas não tem tratamento para `diffMs < 0`. Consultei os usos em Timer, posts e comentários; eles passam o timestamp diretamente para `timeAgo`.
- **Impacto:** Um horário futuro causado por importação, relógio divergente ou dado incorreto aparece como atividade atual. O impacto é visual e restrito a registros com data futura.
- **Como verificar/reproduzir com segurança:** Com o relógio atual, passe `new Date(Date.now() + 86_400_000)` para `timeAgo`; pela condição da linha 12, o retorno será “agora”. A reprodução foi deduzida do fluxo estático, sem execução no navegador nesta etapa.
- **Solução recomendada:** Tratar `diffMs < 0` antes das faixas relativas e mostrar uma data/hora futura ou uma expressão relativa apropriada.
- **Exemplo corrigido:**

```ts
if (diffMs < 0) return then.toLocaleString("pt-BR");
```

- **Esforço estimado:** P
# **[OB-92] Rótulos da navegação móvel ficam abaixo do piso de leitura do projeto**

- **Categoria:** UX
- **Severidade:** Baixa
- **Confiança:** Alta
- **Status:** CONFIRMADO
- **Tipo de evidência:** Estática
- **CVSS estimado:** N/A
- **Localização:** `src/components/ui/gradient-button-group.tsx:35`; uso móvel `src/components/ui/MobileBottomNav.tsx:57-77`; `DESIGN.md:141-143`.
- **Evidência:**

```tsx
className={`relative z-10 flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 px-0.5 text-center text-[0.62rem] font-extrabold leading-tight transition-colors active:bg-white/10 sm:px-1 sm:text-xs ${
```

- **Descrição:** A navegação inferior fica visível em larguras menores que `lg`, mas os rótulos só passam a `text-xs` a partir de `sm`. Em telas abaixo de 640 px, `0.62rem` corresponde a aproximadamente 9,9 px com raiz de 16 px, abaixo do mínimo de 12 px definido pelo próprio sistema visual.
- **Mitigações verificadas:** Os itens têm alvos de toque com `min-h-14`, a navegação tem rótulo acessível e a rota ativa usa `aria-current`. Essas medidas não aumentam o texto nos celulares; o estilo responsivo só aplica 12 px a partir de `sm`.
- **Impacto:** Os seis destinos ficam mais difíceis de ler em celulares, especialmente para pessoas com baixa visão. A auditoria estática não classifica isso como falha numérica WCAG; é divergência verificável do padrão de legibilidade do projeto.
- **Como verificar/reproduzir com segurança:** Abra a homepage com viewport de 375 px ou 390 px, inspecione o estilo computado dos nomes da navegação e compare com o piso de 12 px em `DESIGN.md`.
- **Solução recomendada:** Usar pelo menos `text-xs` em todos os tamanhos ou reorganizar/abreviar os rótulos sem reduzir o texto funcional abaixo de 12 px.
- **Exemplo corrigido:**

```tsx
className="... text-xs ..."
```

- **Esforço estimado:** P
# **[OB-93] Lint falha por atualização síncrona de estado em efeito**

- **Categoria:** Código
- **Severidade:** Baixa
- **Confiança:** Alta
- **Status:** CONFIRMADO
- **Tipo de evidência:** Estática
- **CVSS estimado:** N/A
- **Localização:** `src/app/profile/setup/page.tsx:24-26`.
- **Evidência:**

```tsx
useEffect(() => {
  setReturnTo(safeReturnTo(new URLSearchParams(window.location.search).get("returnTo")));
}, []);
```

- **Descrição:** `npm run lint` reprova `react-hooks/set-state-in-effect` na chamada de `setReturnTo` feita imediatamente no efeito de montagem. A regra detecta a atualização síncrona e o render adicional; isso não demonstra, por si só, um erro visível para a pessoa usuária.
- **Mitigações verificadas:** `safeReturnTo` valida o destino antes do redirecionamento, o que reduz risco de open redirect. Não há supressão local da regra. O lint foi executado sobre o checkout atual e retornou código de saída 1 por este erro.
- **Impacto:** O gate de lint não passa e pode bloquear integração contínua ou publicação se o pipeline exigir essa etapa; há também uma renderização extra no formulário.
- **Como verificar/reproduzir com segurança:** Execute `npm run lint`. O ESLint aponta `src/app/profile/setup/page.tsx:25` com `react-hooks/set-state-in-effect`.
- **Solução recomendada:** Derivar o destino dos parâmetros de busca no render ou recebê-lo como propriedade inicial do componente, mantendo a sanitização de `safeReturnTo`.
- **Exemplo corrigido:**

```tsx
const returnTo = safeReturnTo(searchParams.get("returnTo"));
```

- **Esforço estimado:** P
# **[OB-94] Fan-out de push não pagina as assinaturas**

- **Categoria:** Performance
- **Severidade:** Baixa
- **Confiança:** Alta
- **Status:** CONFIRMADO
- **Tipo de evidência:** Estática
- **CVSS estimado:** N/A
- **Localização:** `supabase/functions/send-push-notification/index.ts:180-185`.
- **Evidência:**

```ts
let subscriptionQuery = supabase
  .from("push_subscriptions")
  .select("endpoint, p256dh_key, auth_key, user_id");
if (recipientId) subscriptionQuery = subscriptionQuery.eq("user_id", recipientId);

const { data: subscriptions, error } = await subscriptionQuery;
```

- **Descrição:** A função consulta as assinaturas em uma única página PostgREST, sem `.range()`, loop de paginação ou RPC de fan-out. No broadcast de notícias, `recipientId` fica nulo e a consulta seleciona todas as assinaturas; em seguida, somente as linhas retornadas recebem push. A documentação Supabase informa máximo padrão de 1.000 linhas por consulta, configurável nas opções do projeto ([referência JavaScript](https://supabase.com/docs/reference/javascript/v1/select)). A contagem agregada atual de `push_subscriptions` foi 5; portanto, não há evidência de truncamento atual. O limite remoto efetivo não foi consultado.
- **Mitigações verificadas:** O caminho de notificação comunitária filtra por `user_id`, reduzindo o conjunto por destinatário. Não há paginação no caminho de broadcast. A consulta de contagem foi `HEAD`/`count` e não retornou endpoints nem linhas.
- **Impacto:** Se o número de assinaturas superar o limite PostgREST configurado, parte dos dispositivos fica fora do broadcast sem erro; a resposta `total` representa apenas a página recebida.
- **Como verificar/reproduzir com segurança:** Em staging, configure um limite conhecido ou crie mais assinaturas que o limite, envie um alerta editorial e compare o `total` retornado com a contagem agregada da tabela. A auditoria não enviou notificação.
- **Solução recomendada:** Confirmar `max_rows` no projeto e buscar em páginas com ordenação estável e `.range()`, usando um tamanho de página menor ou igual ao limite efetivo, até esgotar os resultados; alternativamente, mover o fan-out para uma RPC/fila paginada. Processar lotes com concorrência limitada e testar acima do limite configurado.
- **Exemplo corrigido:**

```ts
const pageSize = 500;
let offset = 0;
const subscriptions = [];
while (true) {
  const { data, error } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh_key, auth_key, user_id")
    .order("id")
    .range(offset, offset + pageSize - 1);
  if (error) throw error;
  const page = data ?? [];
  subscriptions.push(...page);
  if (page.length < pageSize) break;
  offset += pageSize;
}
```

- **Esforço estimado:** P
# **[OB-95] Contas anônimas podem participar do Brickboard sem CAPTCHA**

- **Categoria:** Segurança
- **Severidade:** Alta
- **Confiança:** Alta
- **Status:** CONFIRMADO
- **Tipo de evidência:** Estática
- **CVSS estimado:** N/A
- **Localização:** `supabase/migrations/20260723000000_community.sql:68-71,98-101,118-121`; `supabase/migrations/20260728000008_community_safety.sql:23-25,34-66`; `supabase/migrations/20260728000009_moderation_controls.sql:28-53,58-88`; configuração remota Supabase Auth consultada em 29/09/2026.
- **Evidência:**

```sql
create policy community_posts_insert on public.community_posts
  for insert to authenticated
  with check (auth.uid() = user_id);
create policy community_poll_votes_insert on public.community_poll_votes
  for insert to authenticated
  with check (auth.uid() = user_id);
create policy community_reports_own_insert on public.community_reports
for insert to authenticated
with check (reporter_id = auth.uid());
```

- **Descrição:** A configuração remota informa `external_anonymous_users_enabled=true`, `disable_signup=false` e `security_captcha_enabled=false`. Não encontrei chamada a `signInAnonymously` no checkout (`src`, `supabase/functions` e migrations pesquisadas). Mesmo assim, o endpoint público do Supabase pode criar usuários anônimos; o Supabase os coloca no papel Postgres `authenticated` e inclui `is_anonymous` no JWT. As policies aplicadas de posts, comentários e votos, além da RPC de denúncia, aceitam essa role e validam apenas o UID/proprietário; os limites e o helper de participação não rejeitam a claim anônima. Assim, qualquer cliente com a chave publicável pode obter uma identidade descartável e criar conteúdo sem passar pelo fluxo de cadastro do site. As migrations `20260723000000` e `20260728000008`–`20260728000009` constam no ledger remoto como aplicadas.
- **Mitigações verificadas:** As policies impedem falsificar o `user_id`, e há limites por usuário (10 posts e 40 comentários ao dia), mas cada identidade anônima recebe outro UID. `assert_community_participation_allowed` verifica banimento e suspensão, não `is_anonymous`; o CAPTCHA está desabilitado na configuração consultada. As funções administrativas verificadas exigem `is_admin`, portanto não há evidência de bypass administrativo. O ataque exige obter um JWT anônimo pelo fluxo público de Auth e, com ele, fica limitado às ações de comunidade; por não haver bypass administrativo nem exposição de dados demonstrada, a severidade é alta, não crítica. O Supabase confirma que contas anônimas usam `authenticated` e recomenda distinguir `is_anonymous` nas policies ([guia oficial](https://supabase.com/docs/guides/auth/auth-anonymous)).
- **Impacto:** Uma pessoa sem email, senha ou verificação pode automatizar identidades descartáveis para contornar limites de posts/comentários e a unicidade por usuário em votos/denúncias. Isso facilita spam no feed, manipulação de participação e crescimento de `auth.users`. O limite de Auth por IP reduz a taxa, mas não substitui CAPTCHA e não impede abuso distribuído ([prevenção de abuso e limites](https://supabase.com/docs/guides/auth/auth-anonymous#abuse-prevention-and-rate-limits)).
- **Como verificar/reproduzir com segurança:** Em staging, use o endpoint público Auth com a chave publicável para criar uma sessão anônima; com o JWT recebido, tente inserir post/comentário, votar em uma enquete e chamar `report_community_content`. Repita com outra identidade e observe que as quotas de posts/comentários são por UID e não há desafio CAPTCHA. Não executei esse fluxo, pois criaria usuários e conteúdo.
- **Solução recomendada:** Como o checkout não implementa modo visitante, desabilitar `external_anonymous_users_enabled` em Auth. Antes de publicar, ativar CAPTCHA para signup. Se contas anônimas forem requisito de produto, manter a configuração apenas junto de uma negação explícita de `is_anonymous` nas policies e funções de conteúdo, limites por IP/dispositivo e limpeza automática de usuários descartáveis.
- **Exemplo corrigido:**

```sql
create policy community_posts_reject_anonymous
on public.community_posts
as restrictive for insert to authenticated
with check (
  coalesce((select auth.jwt() ->> 'is_anonymous')::boolean, false) is false
);
```

- **Esforço estimado:** G
# **[OB-96] Funções SECURITY DEFINER mantêm EXECUTE amplo em produção**

- **Categoria:** Segurança
- **Severidade:** Baixa
- **Confiança:** Alta
- **Status:** CONFIRMADO
- **Tipo de evidência:** Estática
- **CVSS estimado:** N/A
- **Localização:** `supabase/migrations/20260727000000_brickboard_progression.sql:1017-1025,1132`; `supabase/migrations/20260925000000_restrict_security_definer_privileges.sql:1-21`.
- **Evidência:**

```sql
grant execute on function public.admin_adjust_xp(uuid, integer, text) to authenticated;
```

- **Descrição:** O Security Advisor remoto, consultado em 29/09/2026, retornou `anon_security_definer_function_executable` para 29 funções e `authenticated_security_definer_function_executable` para 29 funções; as listas podem se sobrepor e não foram somadas como 58 funções distintas. O alerta confirma a exposição de `EXECUTE`, mas não demonstra exploração: `admin_adjust_xp` e as demais rotinas administrativas verificadas conferem `current_user_is_admin()`, e várias funções listadas são gatilhos ou consultas públicas intencionais. A migration local `20260925000000_restrict_security_definer_privileges.sql` revoga a execução de todas as funções SECURITY DEFINER de `public`, `anon` e `authenticated`, depois concede acesso por allowlist; ela ainda não consta no ledger remoto. O Advisor foi cruzado com as policies/migrations e não tratado como prova automática de vulnerabilidade ([documentação oficial](https://supabase.com/docs/guides/observability/advisors)).
- **Mitigações verificadas:** `admin_adjust_xp` exige admin dentro da função; o checkout contém a migration de hardening e grants explícitos para as RPCs públicas/de usuário necessárias. O ledger mostra `20260925000000` pendente, e o Advisor ainda reporta permissões para `anon`; portanto, a correção não está confirmada em produção. Não executei nenhuma função nem migration.
- **Impacto:** Acesso EXECUTE desnecessário amplia a superfície de RPCs que operam como proprietário e pode reabrir bypass se uma rotina futura perder a validação interna. A revisão não confirmou um bypass atual; por isso a severidade permanece baixa.
- **Como verificar/reproduzir com segurança:** Consultar o Security Advisor do projeto ou o endpoint Management API `/v1/projects/{ref}/advisors/security`; comparar as 29 entradas anônimas com a migration de allowlist ainda pendente no ledger. Nenhuma rotina foi chamada.
- **Solução recomendada:** Revisar a allowlist da migration em staging, confirmar os chamadores legítimos e aplicar a revogação aprovada; depois repetir o Advisor e verificar que só RPCs públicas intencionais continuam acessíveis a `anon`.
- **Exemplo corrigido:**

```sql
revoke all on function public.admin_adjust_xp(uuid, integer, text) from public, anon, authenticated;
grant execute on function public.admin_adjust_xp(uuid, integer, text) to authenticated;
```

- **Esforço estimado:** P
# **[OB-97] Três migrations publicadas compartilham o mesmo timestamp**

- **Categoria:** DevOps
- **Severidade:** Média
- **Confiança:** Alta
- **Status:** CONFIRMADO
- **Tipo de evidência:** Estática
- **CVSS estimado:** N/A
- **Localização:** `supabase/migrations/20260727000000_brickboard_progression.sql:1`, `supabase/migrations/20260727000000_editorial_workflow.sql:1` e `supabase/migrations/20260727000000_fix_release_radar_images.sql:1`, no commit de produção `17af5e0a29e2bb43fcd8fab734432a1e0cdd7966`.
- **Evidência:**

```sql
create or replace function public.normalize_username(value text)
```

```sql
alter table public.posts
```

```sql
insert into public.release_radar_items
```

- **Descrição:** A árvore Git do deployment contém 53 arquivos de migration, mas apenas 51 prefixos de versão únicos: três arquivos distintos começam com `20260727000000`. A documentação do Supabase exige timestamps únicos para evitar conflitos de ordenação, e o histórico identifica a versão pelo timestamp. O ledger remoto consultado tem 34 versões aplicadas, mas não revela qual conteúdo, entre os três arquivos com o mesmo prefixo, foi executado. Não afirmo que alguma migration tenha sido ignorada ou repetida; a execução física permanece não verificada. No checkout atual, os dois arquivos conflitantes foram renomeados para `20260727000002` e `20260727000003`, mas essas mudanças não estão no deployment.
- **Mitigações verificadas:** Os 65 prefixos locais atuais são únicos; `git status` mostra os nomes antigos removidos e os renomeados ainda não rastreados/implantados. O Supabase documenta timestamp conflitante como problema de ordenação ([documentação oficial](https://supabase.com/docs/guides/deployment/branching/troubleshooting)) e grava o timestamp como identificador único do histórico ([referência da CLI](https://supabase.com/docs/reference/cli/v0/supabase-orgs)). Nenhum comando de migration, reparo de ledger ou SQL mutável foi executado.
- **Impacto:** A automação de banco pode rejeitar o conjunto, ordenar scripts de forma ambígua ou deixar o histórico sem distinguir qual dos três conteúdos da versão foi aplicado. Isso dificulta novos deploys e aumenta o risco de schema e ledger divergirem.
- **Como verificar/reproduzir com segurança:** Execute `git ls-tree -r --name-only 17af5e0a29e2bb43fcd8fab734432a1e0cdd7966 -- supabase/migrations`, agrupe os nomes pelo prefixo anterior ao primeiro `_` e compare com `supabase migration list`/ledger. Não execute `db push` nem `migration repair` para reproduzir.
- **Solução recomendada:** Conferir em staging o schema real e as operações correspondentes ao timestamp `20260727000000`; manter um prefixo único e ordenado por arquivo; validar `db reset` em banco isolado e reconciliar o ledger com o estado comprovado antes de qualquer push. Não reparar o histórico por suposição.
- **Exemplo corrigido:**

```
20260727000000_brickboard_progression.sql
20260727000002_editorial_workflow.sql
20260727000003_fix_release_radar_images.sql
```

- **Esforço estimado:** M
# **[OB-98] Importação do Drive permite SSRF por URL de imagem**

- **Categoria:** Segurança
- **Severidade:** Média
- **Confiança:** Média
- **Status:** CONFIRMADO
- **Tipo de evidência:** Estática
- **CVSS estimado:** N/A
- **Localização:** `src/app/api/cron/drive-sync/route.ts:64-70,120-126,174-183` no commit de produção `17af5e0a29e2bb43fcd8fab734432a1e0cdd7966`; o arquivo foi removido do checkout atual.
- **Evidência:**

```ts
const parsed = new URL(url);
if (/(^|\.)(unsplash\.com|pexels\.com|pixabay\.com)$/i.test(parsed.hostname)) return null;
return /\.(?:avif|gif|jpe?g|png|webp)$/i.test(parsed.pathname) ? url : null;
```

```ts
const imageMatch = line.match(/^!\[([^\]]*)\]\(([^)\s]+)\)$/);
url: unwrapUrl(imageMatch[2]) || "",
```

```ts
const response = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" }, cache: "no-store", signal: AbortSignal.timeout(15000) });
if (!response.ok) return null;
```

- **Descrição:** O cron lê Markdown de documentos do Drive, extrai URLs de imagem e faz requisições do servidor para validar e baixar essas URLs. O filtro verifica extensão e bloqueia três domínios de banco de imagens, mas não restringe hosts/IPs privados nem valida cada redirect antes de `fetch`. A função segura `validateRemoteUrl` existe no mesmo commit, porém a busca no código publicado encontrou seu uso apenas em `src/app/api/admin/images/route.ts`; `drive-sync` não a utiliza. Para explorar, seria necessário poder editar um documento incluído na pasta configurada do Drive; quem tem essa permissão não foi verificado. O endpoint de cron exige `CRON_SECRET`, portanto o achado não descreve uma chamada anônima direta.
- **Mitigações verificadas:** O cron confere `CRON_SECRET`, aplica timeout de 15 segundos, exige extensão de imagem para URLs do Markdown e salva a matéria como rascunho (`is_published: false`). Esses controles não limitam o destino de rede; não executei a rota nem tentei acessar endereços internos. A Vercel lista `drive-sync` como cron de produção, e o código citado foi lido diretamente no SHA do deployment.
- **Impacto:** Um editor com acesso de escrita à pasta importada poderia fazer o servidor requisitar serviços internos ou endereços reservados. Se a resposta puder ser interpretada como imagem, o fluxo também a converte e pode armazená-la no bucket público. A alcançabilidade da rede privada da Vercel e a permissão de escrita na pasta não foram testadas.
- **Como verificar/reproduzir com segurança:** Em ambiente isolado, com uma pasta de teste e permissão controlada, inclua no Markdown uma imagem com URL para loopback ou IP privado e execute o cron de staging; observe as tentativas de saída no servidor. Não teste contra produção.
- **Solução recomendada:** Permitir somente hosts oficiais previamente aprovados, exigir HTTPS, reutilizar a validação de endereço público, bloquear redirects ou revalidar cada destino após resolução DNS e aplicar egress filtering no ambiente.
- **Exemplo corrigido:**

```ts
const target = await validateRemoteUrl(url, true);
if (!ALLOWED_IMAGE_HOSTS.has(target.hostname)) return null;
const response = await fetch(target, { redirect: "error", signal: AbortSignal.timeout(15000) });
```

- **Esforço estimado:** M
# **[OB-99] Download de imagem sem limite de bytes pode esgotar memória do cron**

- **Categoria:** Performance
- **Severidade:** Média
- **Confiança:** Média
- **Status:** CONFIRMADO
- **Tipo de evidência:** Estática
- **CVSS estimado:** N/A
- **Localização:** `src/app/api/cron/drive-sync/route.ts:120-126,142-148` no commit de produção `17af5e0a29e2bb43fcd8fab734432a1e0cdd7966`; o arquivo foi removido do checkout atual.
- **Evidência:**

```ts
const response = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" }, cache: "no-store", signal: AbortSignal.timeout(15000) });
if (!response.ok) return null;
const input = Buffer.from(await response.arrayBuffer());
const original = await sharp(input).metadata();
if (!original.width || !original.height || original.width < 1200 || original.height < 675) return null;
```

- **Descrição:** O corpo inteiro da resposta é lido em memória antes de verificar dimensões. Não há limite de `Content-Length`, leitura em stream com teto de bytes nem rejeição de corpo grande; a conversão e a validação por `sharp` ocorrem depois da alocação. O timeout de 15 segundos restringe duração, não o volume transferido nesse intervalo. A importação processa candidatos sequencialmente, mas uma única resposta grande já pode pressionar a memória da função.
- **Mitigações verificadas:** O código exige resposta HTTP bem-sucedida, timeout e dimensões mínimas; tenta armazenar até três imagens por artigo. Não encontrei limite de bytes no downloader ou no fluxo de importação publicado. Não enviei imagem grande nem medi memória em produção.
- **Impacto:** Um colaborador com permissão de escrita na pasta do Drive, ainda não verificada, pode introduzir uma URL que entregue um arquivo muito grande e fazer a execução agendada falhar por memória/tempo, interrompendo a importação de rascunhos. O impacto observado é no cron editorial; não há evidência de indisponibilidade do site inteiro.
- **Como verificar/reproduzir com segurança:** Em staging, sirva uma imagem de teste que exceda o limite escolhido e referencie-a em um documento importado; verifique se o downloader encerra a leitura antes de reservar o corpo inteiro. Não teste na função de produção.
- **Solução recomendada:** Rejeitar `Content-Length` acima de um teto e impor o mesmo teto ao ler o stream, cancelando a resposta assim que excedido; limitar dimensões/pixels após a leitura e manter o processamento sequencial.
- **Exemplo corrigido:**

```ts
const maxBytes = 8 * 1024 * 1024;
if (Number(response.headers.get("content-length")) > maxBytes) return null;
const reader = response.body?.getReader();
if (!reader) return null;
const chunks: Uint8Array[] = [];
let size = 0;
while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  size += value.byteLength;
  if (size > maxBytes) { await reader.cancel(); return null; }
  chunks.push(value);
}
const input = Buffer.concat(chunks);
```

- **Esforço estimado:** M
# **[OB-100] Sincronização do Drive não percorre páginas além da primeira**

- **Categoria:** Bug
- **Severidade:** Baixa
- **Confiança:** Alta
- **Status:** CONFIRMADO
- **Tipo de evidência:** Estática
- **CVSS estimado:** N/A
- **Localização:** `src/app/api/cron/drive-sync/route.ts:238-252,265-273` no commit de produção `17af5e0a29e2bb43fcd8fab734432a1e0cdd7966`; o arquivo foi removido do checkout atual.
- **Evidência:**

```ts
pageSize: "1000",
```

```ts
const data = (await response.json()) as { files?: { id: string; name: string; mimeType: string; modifiedTime?: string }[] };
return data.files ?? [];
```

- **Descrição:** `driveListChildren` solicita no máximo 1000 arquivos e retorna somente `data.files`; não declara nem usa `nextPageToken`/`pageToken`. A API do Google Drive define 1000 como o máximo por página e informa que, quando há `nextPageToken`, é necessário buscar a página seguinte ([documentação oficial](https://developers.google.com/workspace/drive/api/reference/rest/v3/files/list)). A quantidade atual de arquivos da pasta configurada não foi verificada.
- **Mitigações verificadas:** A consulta ordena por `modifiedTime desc` e exclui itens na lixeira, mas não implementa paginação nem relata truncamento. Não consultei nem alterei o conteúdo do Drive.
- **Impacto:** Se a pasta raiz ou a pasta diária tiver mais de uma página, itens posteriores à primeira página não serão processados; a ordenação pode deixar de fora documentos mais antigos sem indicar que a lista foi truncada.
- **Como verificar/reproduzir com segurança:** Em uma pasta de staging com mais de 1000 arquivos (ou uma resposta de teste com `nextPageToken`), execute a função de listagem e compare a quantidade retornada com as páginas do Drive. Não use a pasta de produção.
- **Solução recomendada:** Ler e acumular todas as páginas até `nextPageToken` estar ausente; definir também um limite operacional e métricas para detectar pastas grandes.
- **Exemplo corrigido:**

```ts
const files = [];
let pageToken: string | undefined;
do {
  if (pageToken) query.set("pageToken", pageToken);
  const data = await fetchDrivePage(query);
  files.push(...(data.files ?? []));
  pageToken = data.nextPageToken;
} while (pageToken);
return files;
```

- **Esforço estimado:** P
# **[OB-101] Falha na limpeza pode transformar rascunho incompleto em importação concluída**

- **Categoria:** Bug
- **Severidade:** Média
- **Confiança:** Alta
- **Status:** CONFIRMADO
- **Tipo de evidência:** Estática
- **CVSS estimado:** N/A
- **Localização:** `src/app/api/cron/drive-sync/route.ts:379-383,386-406,443-448` no commit de produção `17af5e0a29e2bb43fcd8fab734432a1e0cdd7966`; o arquivo foi removido do checkout atual.
- **Evidência:**

```ts
if (existing) {
  await markImported(supabase, file.id, existing.id);
  results.skipped++;
  continue;
}
```

```ts
is_published: false,
published_at: null,
```

```ts
if (uploadedImages.data?.length) await supabase.storage.from("post-images").remove(uploadedImages.data.map((image) => image.storage_path));
await supabase.from("editorial_images").delete().eq("post_id", importedPost.id);
await supabase.from("posts").delete().eq("id", importedPost.id);
throw imageError;
```

- **Descrição:** O fluxo cria o post como rascunho antes de baixar/enviar todas as imagens. Se a etapa de imagens falhar, tenta remover objetos, registros e post, mas não verifica os erros dessas três operações de limpeza. Se a exclusão do post falhar, uma nova execução encontra o mesmo `slug`, chama `markImported` e encerra como ignorado, sem completar o rascunho nem repetir a importação. Esse cenário requer falha na importação e falha adicional na limpeza; não foi reproduzido.
- **Mitigações verificadas:** O post permanece `is_published: false`, e o código tenta uma limpeza compensatória. A próxima execução consulta a existência pelo `slug`; não há estado persistido de `cleanup_failed`/retry nessa rota. Nenhuma falha foi induzida em produção.
- **Impacto:** Um erro transitório combinado pode deixar um rascunho vazio ou parcialmente preenchido e registrar o arquivo como importado na tentativa seguinte, exigindo correção manual e podendo deixar imagens/registros órfãos.
- **Como verificar/reproduzir com segurança:** Em staging, faça o upload de imagem falhar depois da inserção inicial e provoque uma falha controlada na exclusão do post; execute novamente e observe o caminho `existing`. Não injete falhas na produção.
- **Solução recomendada:** Registrar estado de importação por `drive_file_id` antes de criar o post, verificar e registrar cada resultado da limpeza, e permitir retry/reconciliação de importações incompletas em vez de marcar qualquer post com o mesmo `slug` como concluído.
- **Exemplo corrigido:**

```ts
const { error: cleanupError } = await supabase.from("posts").delete().eq("id", importedPost.id);
if (cleanupError) throw cleanupError;
```

- **Esforço estimado:** M
# **[OB-102] A rota editorial do checkout depende de bot_state sem fallback e quebraria o cron no deploy**

- **Categoria:** Bug
- **Severidade:** Média
- **Confiança:** Média
- **Status:** POTENCIAL
- **Tipo de evidência:** Estática
- **CVSS estimado:** N/A
- **Localização:** `src/app/api/cron/generate-daily/route.ts:34-73,97` (HEAD `53f8de9`); `src/lib/server/editorial-slot.ts:26-29`.
- **Evidência:**

```ts
async readSlot(key) {
  const { data, error } = await supabase.from("bot_state").select("value, updated_at").eq("key", key).maybeSingle();
  if (error) throw error;
  return data;
}
```

```ts
const claimed = await claimEditorialSlot(editorialSlotStore(supabase), slotKey);
```

- **Descrição:** Revalidação final em 05/10/2026: bot_state respondeu HTTP 200 à consulta sem linhas, então a pré-condição PGRST205 não se reproduziu; este registro foi retirado da contagem vigente. A implantação do handler do checkout segue não verificada. A rota editorial nova entrou no repositório no commit `53f8de9` (até `db8be6b`, a rota ainda era o fluxo antigo com cartão de aprovação e sem claim de slot). Ela reclama o slot via `claimEditorialSlot` antes de gerar, e `readSlot` lança o erro do PostgREST quando `bot_state` não existe. O `production:check` confirma `bot_state: PGRST205` no banco remoto. Sem fallback, toda invocação dos três horários lançaria antes de gerar, responderia 500 e notificaria falha no Telegram. A release implantada (`dpl_Bp3th4DEwEY77Y3onFHA6F56unsJ`) não depende de `bot_state` e produziu registros em 29/09; o checkout divergiu da produção nesse ponto.
- **Mitigações verificadas:** O erro é capturado pelo `catch` da rota, que tenta registrar `failed` e envia aviso ao admin no Telegram; nenhum rascunho parcial é publicado. O deployment atual não contém esse código e segue operacional.
- **Impacto:** Implantar o checkout como está interrompe a geração editorial automática nos três horários (HTTP 500 em cada slot) até que `bot_state` exista ou o fallback seja restaurado.
- **Como verificar/reproduzir com segurança:** Em staging sem a relação `bot_state`, invoque `GET /api/cron/generate-daily?slot=11` com o segredo do cron e observe o 500 antes de qualquer geração; repita após aplicar a migration que cria a tabela.
- **Solução recomendada:** Restaurar o fallback da release implantada (executar sem lock persistente quando o PostgREST retornar `PGRST205` para `bot_state`) ou aplicar a migration de `bot_state` em staging/produção antes do deploy; validar os três slots após a correção.
- **Exemplo corrigido:**

```ts
const existing = await store.readSlot(key).catch((error) => {
  if (error?.code === "PGRST205") return null;
  throw error;
});
```
- **Esforço estimado:** M


## Retomada da auditoria e revalidação do checkout — 29/09/2026

### Estado do escopo

Esta retomada revalidou achados cujos arquivos mudaram, rodou novamente verificações estáticas e confirmou estado remoto somente por consultas de leitura. O checkout contém alterações locais e arquivos novos ainda sem deploy; o relatório distingue evidência do código atual de comportamento remoto. A configuração do domínio foi encerrada conforme orientação do usuário e não foi reaberta nesta etapa.

O inventário anterior cobre explicitamente 212 arquivos `src/**/*.ts`, `src/**/*.tsx` e `src/**/*.css`; a árvore e os diretórios ignorados estão registrados na seção de escopo acima. O workspace possui alterações locais extensas. Nenhum arquivo do site, configuração de serviço, credencial, dado ou deployment foi alterado nesta retomada; somente `AUDITORIA.md` foi atualizado.

### Estado dos achados revalidados

| Achado | Estado observado |
|---|---|
| OB-01 | Permanece crítico: uma chave privilegiada encontrada no histórico Git coincide em memória com a chave local atual e foi aceita pelo checker de prontidão para consultar tabelas. Não imprimi valores. Igualdade com a variável de produção da Vercel permanece não verificada; o teste HTTP isolado anterior falhou por transporte e não prova revogação. |
| OB-02 | Permanece alto: o checker de produção recebeu PGRST205 para `admin_audit_log`, `admin_trash`, `backup_runs`, `notification_preferences` e `user_follows`; `community_note_votes`, `community_notes` e `editorial_revisions` responderam. |
| OB-03 | Permanece alto: o SHA de produção foi confirmado como `17af5e0a29e2bb43fcd8fab734432a1e0cdd7966`, igual ao `HEAD`. A produção agenda `generate-daily` uma vez às 12 UTC, sem `slot`; o handler publicado gera um rascunho e envia aprovação. Os três horários locais seguem fora do deployment. |
| OB-04 | Permanece: o checker atual classificou o backup local como obsoleto; a última cópia não estava completa nem durável fora desta máquina. |
| OB-07 | Parcialmente mitigado no checkout: `/privacidade` agora detalha newsletter, fornecedores e retenção; `/institucional/privacidade` continua resumida e inconsistente. O Telegram recebe apenas aviso genérico com link administrativo, não os dados pessoais do formulário. |
| OB-10 | Corrigido no checkout pelo adaptador `createSupabaseCookieAdapter` e coberto por teste unitário. Ainda não foi confirmado em uma resposta `Set-Cookie` de produção; permanece pendente de validação pós-deploy. |
| OB-12 | Parcialmente mitigado: prompts agora serializam dados externos em JSON e os marcam como não confiáveis. Ainda falta validação semântica independente; o formato JSON e as instruções textuais não isolam o modelo de influência semântica. |
| OB-21 | Permanece: o exportador inclui 11 conjuntos; ainda não cobre vários dados vinculados à conta encontrados nas migrações, como progresso/XP, conquistas, seguimentos, preferências, votos de lançamentos e denúncias/notas comunitárias. |
| OB-23 | Preflight remoto de 29/09 confirmou que os dois endpoints permitem apenas `https://orange-brick.vercel.app`; as origens próprias são incompatíveis com a resposta. A presença/valor efetivo de `SITE_URL` permanece não verificado. |
| OB-54 | Revalidado no PostgREST com chave pública sem sessão: `HEAD SELECT user_id` nas duas tabelas aceitou a consulta; nenhum identificador foi baixado. A contagem retornada para `community_comment_likes` foi zero; a contagem de `article_comment_likes` veio nula. A policy/grant permite leitura anônima, mas não afirmo que existam linhas expostas hoje. |
| OB-24 | Permanece: a falha de revogação remota é capturada, o estado local é apagado e a mensagem final informa sucesso; não foi encontrado mecanismo de retry. |
| OB-25 | Permanece: publicação valida dimensões e distinção de URLs, mas não confirma origem oficial/pertinência temática de imagens; legenda vazia ainda pode receber texto “Divulgação/Oficial”. |
| OB-26 | Permanece: o gate conta hostname completo como fonte; subdomínios do mesmo publisher podem satisfazer a quantidade mínima. O teste isolado anterior reproduziu esse caso. |
| OB-29 | Parcialmente mitigado: a limpeza relacional agora usa RPC atômica, mas Storage, PostgreSQL e Auth continuam em etapas diferentes sem estado persistido de retomada após falha parcial. |
| OB-41 | Permanece: o detalhe público ainda usa `select("*")` para matérias publicadas, incluindo colunas editoriais internas não removidas na publicação. |
| OB-66 | Permanece: quando nenhum link da navegação corresponde à rota, `Math.max(0, findIndex(...))` deixa o indicador laranja na primeira posição. |
| OB-70 | Permanece: o H1 foi passado ao feed, mas a seção de destaque ainda é renderizada antes dele; os cartões começam com H2/H4. |
| OB-86 | Permanece: o valor padrão de `initialPosts` é um array novo e participa das dependências do efeito; a página filtrada passa `undefined`, permitindo repetição sequencial da consulta inicial. |
| OB-89 | Permanece: slides de carrossel invisíveis continuam como botões na ordem de Tab, sem `tabIndex` ou remoção da árvore acessível. |
| OB-91 | Permanece: `timeAgo` trata qualquer timestamp futuro como “agora”. |
| OB-92/OB-93 | Novos achados de legibilidade dos rótulos móveis e lint falhando em `profile/setup`; ambos são baixos e ficam fora do Top 20. |
| OB-95 | Novo achado alto: Auth aceita contas anônimas sem CAPTCHA; policies aplicadas de comunidade permitem conteúdo, votos e denúncias sem rejeitar `is_anonymous`. |
| OB-96 | Novo achado baixo: o Advisor vê grants amplos em funções SECURITY DEFINER; a migration local de allowlist não aparece no ledger remoto. Nenhum bypass foi demonstrado. |
| OB-97 | Novo achado médio: o commit publicado tem três arquivos de migration com o prefixo `20260727000000`; o checkout renumerou dois, mas não foi implantado. O ledger remoto não identifica qual conteúdo desse prefixo foi executado. |
| OB-98 | Novo achado médio, condicional: o cron `drive-sync` publicado faz fetch de URLs de imagem sem bloquear IPs privados; depende de escrita em documento da pasta Drive, permissão ainda não verificada. O endpoint requer `CRON_SECRET`. |
| OB-99 | Novo achado médio, condicional: o cron publicado carrega a resposta inteira em memória antes de verificar as dimensões; depende de conteúdo de imagem grande e permissão de escrita no Drive, ainda não verificada. |
| OB-100 | Novo achado baixo: a listagem publicada do Drive não usa `nextPageToken`; documentos além da primeira página podem ser omitidos. O tamanho da pasta não foi verificado. |
| OB-101 | Novo achado médio, condicional: falhas na limpeza após uma importação incompleta não são conferidas; se o post ficar, a execução seguinte pode marcá-lo como importado pelo `slug`. |

### Ferramentas e verificações desta retomada

| Comando/verificação | Resultado |
|---|---|
| `npm run typecheck` | Passou. |
| `npm run lint` | Falhou em `src/app/profile/setup/page.tsx:25` (`react-hooks/set-state-in-effect`), registrado em OB-93. |
| `node --experimental-test-coverage --test --experimental-strip-types tests/*.test.ts` | 89 testes passaram, 0 falhas. Cobertura agregada: 37,11% de linhas, 72,71% de branches e 58,17% de funções. `gemini-news.ts` e `telegram/bot.ts` seguem com cobertura comportamental baixa. |
| `npm audit --json` | 0 vulnerabilidades conhecidas na árvore npm consultada. |
| `npm run textcheck` | Passou; integridade textual aprovada em 363 arquivos. |
| `node --env-file=.env.local scripts/check-production-readiness.mjs` | Retornou não pronto: cinco relações ausentes no PostgREST (OB-02), backup obsoleto (OB-04) e três nomes de variáveis ausentes no ambiente local carregado de `.env.local`. Uma consulta separada, somente por nomes, confirmou que Vercel Production lista `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` e `SUPABASE_SECRET_KEY`, além das duas chaves Supabase legadas; nenhum valor foi lido ou exibido. A presença do nome da chave não prova igualdade com a credencial histórica OB-01. |
| `npx --yes vercel@latest crons list --project orange-brick` | Leitura remota confirmou seis crons de produção; `/api/cron/generate-daily` ainda está sem `slot`, enquanto as três mudanças locais estão pendentes de deploy. `drive-sync` segue listado e existe no commit de produção, embora o arquivo esteja removido do checkout; seu código foi recuperado do SHA publicado. |
| `npx --yes vercel@latest inspect https://orangebrick.blog --json` | O alias aponta para um deployment `READY` em produção. A URL atribuída é `orange-brick-9hm46h52k-outfys-projects.vercel.app`; esse comando não inclui SHA Git. A listagem posterior `vercel list` confirmou o commit servido. |
| `npx --yes vercel@latest env ls production --project orange-brick` | Conferi presença apenas pelos nomes e mantive os valores fora da saída: as chaves atuais e legadas listadas acima existem como nomes no ambiente Production. Isso não verifica conteúdo, validade, rotação nem correspondência com `.env.local`. |
| GET Supabase Management API `/v1/projects/{ref}/config/auth` | HTTP 200; consultei somente flags não secretas: `external_anonymous_users_enabled=true`, `disable_signup=false`, `security_captcha_enabled=false`, `password_hibp_enabled=false` e `mailer_autoconfirm=false`. Nenhum valor de credencial foi lido ou impresso. |
| GET Supabase Security Advisor `/v1/projects/{ref}/advisors/security` | HTTP 200; 92 itens: 84 WARN e 8 INFO. Os WARN incluem 29 `anon_security_definer_function_executable`, 29 `authenticated_security_definer_function_executable`, 25 `auth_allow_anonymous_sign_ins` e 1 `auth_leaked_password_protection`. Verifiquei policies/guards dos itens relacionados; não somei os alertas como vulnerabilidades independentes. |
| Consulta PostgREST com papel `anon` | `HEAD SELECT user_id` em `article_comment_likes` e `community_comment_likes` não retornou erro de autorização. Não li valores de linhas; a contagem da segunda tabela foi 0 e a primeira não retornou metadado de contagem. Revalida a permissão descrita em OB-54, sem provar exposição de registros já existentes. |
| `node .agents/skills/impeccable/scripts/detect.mjs --json src` | Um aviso estático: `text-[0.62rem]` na navegação móvel, OB-92. |
| Detector Impeccable em `https://orangebrick.blog` | Não executou a varredura visual: Puppeteer não está instalado. Não instalei dependência no projeto. |

Não rodei `npm run build`, pois o build grava artefatos em `.next` e a instrução desta auditoria permite escrita somente em `AUDITORIA.md`. Não fiz deploy, migração, rotação de chaves nem alteração em dados. A CLI de migrations ficou em `Initialising login role...`, mas o GET somente leitura confirmou o ledger remoto (34 aplicadas, 31 do checkout ausentes). Naquele checkpoint, cookies de refresh e SHA/commit do deployment ainda estavam pendentes; a lista Vercel posterior confirmou o commit e a divergência de checkout descritos no fechamento final.

### Revisão das migrations recentes

Li as migrations adicionadas/alteradas entre 24 e 28/09/2026, incluindo a visão de perfil público, o gate de publicação, a RPC de exclusão, os grants de `SECURITY DEFINER`, retenção, estatísticas e encadeamento de comentários. Cruzei as RPCs administrativas concedidas a `authenticated`: elas verificam `current_user_is_admin()` ou `is_current_admin()` antes de operar; as RPCs de usuário limitam a ação a `auth.uid()`, e a exclusão de conta fica restrita a `service_role`. `public_profile` projeta campos públicos; `season_leaderboard` respeita `show_in_leaderboard`. Não encontrei novo bypass de autorização nesse conjunto. A leitura confirmou as lacunas já registradas em OB-25/OB-26 e o acesso público às curtidas de OB-54.

### Scores da revalidação

| Área | Nota | Justificativa |
|---|---:|---|
| Segurança | 2/10 | A chave privilegiada histórica, contas anônimas na comunidade e cinco relações sem acesso no PostgREST ainda exigem remediação e validação remota. |
| Segurança de IA | 5/10 | Prompts agora serializam dados não confiáveis; faltam validação semântica independente e fechamento do fluxo de publicação automática. |
| Performance | 5/10 | Typecheck passa e há limites/timeout, mas a repetição do feed filtrado e a baixa cobertura em IA/Telegram permanecem. |
| Qualidade de Código | 6/10 | 89 testes passam, mas o lint atual falha e há áreas críticas com cobertura baixa. |
| UX | 6/10 | Fluxos centrais existem, mas há falhas de feedback, legibilidade móvel e estados de erro em achados anteriores. |
| SEO | 5/10 | Canonicals internos e estrutura de títulos da homepage continuam pendentes. |
| Acessibilidade | 4/10 | Achados de contraste, hierarquia de títulos e foco invisível ainda constam no relatório; o teste visual não foi atualizado. |
| Manutenibilidade | 6/10 | Organização e tipagem principais se mantêm, com inconsistência de políticas/padrões e várias mudanças locais sem verificação de deploy. |
| Testes | 5/10 | 89 testes passam; cobertura de linhas permanece em 37,11%, com fluxos de IA e Telegram pouco exercitados. |

### Avaliação complementar de interface (Impeccable)

Pontuação estática provisória: Acessibilidade 2/4, Performance 2/4, Responsividade 3/4, Theming 3/4 e Integridade de implementação 3/4 (13/20, aceitável). O navegador não estava disponível para validação visual atual, portanto os eixos que dependem de renderização não são conclusivos. Pontos positivos verificados: `DESIGN.md` documenta tipografia e cores; a navegação móvel usa `<nav>`, nome acessível, `aria-current` e alvos de 56 px; componentes consultados respeitam movimento reduzido em animações.

### Pendências para concluir a auditoria de publicação

1. Resolver a chave privilegiada do histórico Git e confirmar a rotação/revogação sem expor valores.
2. Reconciliar as cinco relações PostgREST, aplicar/confirmar migrations e repetir o checker de prontidão.
3. Publicar ou ajustar os crons e confirmar os três slots no estado remoto.
4. Produzir backup completo, criptografado e recuperável fora da máquina local; testar restauração.
5. A configuração do domínio e do HTTPS foi concluída segundo a confirmação do usuário; não há etapa de DNS/HTTPS pendente. O preflight confirmou CORS desatualizado em OB-23; falta ajustar `SITE_URL` nas Edge Functions e repetir a validação. O cookie refresh ainda precisa de teste no deployment atual.
6. Corrigir os achados de publicação automática/imagens e dados editoriais públicos antes de liberar a geração automática.
7. Corrigir o lint e os problemas de acessibilidade com maior impacto; repetir axe/Lighthouse em navegador nos tamanhos registrados.
8. Completar a exportação/exclusão de dados e consolidar a política de privacidade.

**Situação final:** auditoria ampla concluída no checkout e complementada com verificações remotas de leitura, mas o site ainda não está comprovadamente pronto para publicação. Permanecem achados críticos/altos e verificações dependentes de deploy, migration e navegador.

### Complemento de cobertura — arquivos públicos e PWA

- `rg --files public` encontrou 115 arquivos. A leitura de metadados com `sharp` cobriu 105 imagens raster: a pasta soma 23,30 MiB e sete imagens excedem 1 MiB. Os maiores arquivos incluem duas variantes de logo PNG de aproximadamente 2 MiB e imagens editoriais entre 1,1 e 1,7 MiB. Dimensões foram lidas, mas não fiz inspeção visual de todas as imagens nem medi o impacto desses arquivos em uma requisição de página.
- A pasta `public/editorial/` contém 64 arquivos. Uma consulta somente leitura às 91 linhas de posts encontrou correspondência por nome/caminho em 14 arquivos, todos ligados a posts publicados; 50 nomes não corresponderam aos registros consultados. Busca no código também não encontrou referências textuais aos arquivos grandes selecionados. Não os classifiquei como órfãos: podem ser arquivo editorial ou material de trabalho, e não há evidência suficiente para removê-los.
- Os seis SVGs não apresentaram `<script>`, `<foreignObject>`, atributos de evento ou referências HTTP externas nas buscas estáticas. `public/manifest.json` foi lido. Em `public/sw.js`, a URL de clique é resolvida e limitada à origem do próprio service worker; a Edge Function de envio define `icon` e `badge` para caminhos do site, não para uma URL recebida no payload.
- Tentei `HEAD` em quatro arquivos estáticos pelo shell e abrir um deles pelo navegador de pesquisa; as consultas falharam por indisponibilidade de transporte/URL. Portanto, não confirmei quais arquivos desta árvore estão servidos no deployment atual e não registrei exposição remota como achado confirmado.
- Arquivos auxiliares restantes em `public/`: `sw.js` (77 linhas), `manifest.json` (31 linhas) e o HTML de verificação do Google (1 linha). Todos foram abertos; não encontrei defeito adicional confirmado nesse conjunto.

## Fechamento e estado atual — 29/09/2026

### Escopo

- **Stack:** Next.js 16.3.6 App Router, React 19.3.0, TypeScript estrito, PostgreSQL/Supabase, autenticação Supabase, Vercel, Edge Functions e integrações Gemini, Groq, Telegram, RAWG, YouTube e analytics. Versões lidas do `package-lock.json` e configurações do repositório.
- **Cobertura:** inventário de 620 caminhos rastreados e 508 arquivos não ignorados; 212 arquivos de código em `src/`, 37 páginas, 33 Route Handlers, 65 migrations, 7 Edge Functions, 56 scripts, 24 testes, 1 E2E, 2 workflows e 115 itens em `public/`. Os arquivos-fonte de `src/` foram inventariados e referenciados; a leitura manual aprofundada priorizou rotas, integrações, autenticação, banco e arquivos ligados a achados. Não afirmo que cada linha dos 508 arquivos tenha sido revisada manualmente.
- **Ignorados da leitura manual:** `node_modules/` (npm/OSV cobrem dependências; exceções documentadas), `.next/`, `dist/`, `build/`, `vendor/`, `.git/` como código atual, `test-results/`, `tmp/`, `.agents/`, `.codex/` e `.vercel/`. O histórico Git foi verificado por Gitleaks. Os motivos e a cobertura de cada scanner constam em “Cobertura analisada e ignorada”.
- **Ferramentas:** Gitleaks encontrou credenciais históricas registradas em OB-01/OB-05; OSV e `npm audit` não reportaram vulnerabilidades conhecidas de dependências; Semgrep gerou candidatos revisados sem confirmação de vulnerabilidade nos trechos selecionados; Madge não encontrou ciclos; Knip foi inconclusivo. TypeScript passou, 89 testes passaram e a cobertura atual registrada é 37,11% de linhas. O lint da retomada falha em OB-93. Playwright/axe e a matriz de rotas estão descritos acima; Lighthouse não produziu métricas confiáveis. O checker de produção ainda retorna `ready:false`.
- **Domínio:** a configuração de `orangebrick.blog` e `www.orangebrick.blog` está concluída segundo a confirmação do usuário; a inspeção Vercel aponta alias `READY`. Não há etapa adicional de DNS/HTTPS a fazer. A estação recebe `ECONNRESET` ao carregar as páginas, mas acessou diretamente o Supabase e confirmou o preflight incompatível de OB-23; HTTP da página, TLS/headers e cookie refresh seguem sem validação por esta estação.

### Rechecagem remota — 29/09/2026

- `npx --yes vercel@latest inspect https://orangebrick.blog --json`: deployment `dpl_ZBg2eChJgSBfqSCdV6xVF3GhARnS` em estado `READY`, criado em 28/09/2026 às 20:59 UTC, com aliases `orangebrick.blog` e `www.orangebrick.blog`. Essa resposta não trouxe `gitSource` nem SHA; a consulta posterior `vercel list` identificou o SHA `17af5e0a29e2bb43fcd8fab734432a1e0cdd7966`.
- `npx --yes vercel@latest crons list --project orange-brick`: seis crons em produção. A rota `/api/cron/generate-daily` está agendada sem `slot`; as entradas locais para `slot=12/17/20` seguem como três alterações pendentes de deploy. `/api/cron/drive-sync` também está agendado e existe no commit de produção, embora tenha sido removido do checkout; o código foi recuperado e revisado nesta continuação.
- `npx --yes vercel@latest env ls production --project orange-brick`: conferi nomes sem registrar valores. Production lista `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY` e `SUPABASE_SECRET_KEY`; também mantém os nomes legados `NEXT_PUBLIC_SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY`. `RAWG_API_KEY` não aparece. Em execução separada de `vercel env run` fora da pasta do projeto e sem `.env.local`, comparei em memória a variável pública `NEXT_PUBLIC_SITE_URL` e confirmei que ela corresponde a `https://orangebrick.blog`, sem imprimir o valor.
- `npx --yes supabase@latest secrets list --project-ref …` e `functions list --project-ref …`: filtrei a saída para nomes e metadados, sem imprimir valores secretos. `SITE_URL` existe e seu metadado de atualização é 13/08/2026. As sete funções (`generate-image` v3, `manage-push-subscription` v5, `post-stats` v4, `register-view` v4, `send-push-notification` v4, `submit-contact` v3 e `toggle-reaction` v3) estão ativas. O gateway lista `verify_jwt=true` para `generate-image` e `send-push-notification`, `false` para as outras cinco; isso não substitui a análise de auth dentro de cada handler. `manage-push-subscription` foi atualizada em 13/08 e `send-push-notification` em 24/07, antes da configuração do domínio. A CLI não fornece hash de código para comparar com o checkout.
- Consulta agregada `HEAD`/`count` em `push_subscriptions`: 5 registros; nenhuma linha ou dado de dispositivo foi retornado. O limite `max_rows` remoto não foi consultado.
- `node --env-file=.env.local scripts/check-production-readiness.mjs`: `ready:false`. No processo local faltam os nomes `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` e `SUPABASE_SECRET_KEY`, enquanto os nomes legados estão presentes; isso não contradiz a lista de Production da Vercel. Cinco tabelas retornam `PGRST205`; três relações verificadas respondem. O GET oficial do ledger encontrou 34 versões aplicadas remotamente versus 65 locais, com 31 pendentes. O backup local verificado é de 25/09/2026 01:35 UTC, incompleto e com 100,2 horas de idade; `external_checks` continua sem confirmação.
- Preflight somente leitura, sem autenticação e sem POST, para `manage-push-subscription` e `send-push-notification`: seis respostas HTTP 200, testando `orangebrick.blog`, `www.orangebrick.blog` e a origem antiga `orange-brick.vercel.app`. Todas anunciam `Access-Control-Allow-Origin: https://orange-brick.vercel.app`; confirmada a incompatibilidade para as origens próprias em OB-23.
- `HEAD` de `https://orange-brick.vercel.app/` retornou 308 para `https://orangebrick.blog/`; o cabeçalho HSTS observado é emitido pela borda Vercel nesse redirect. A URL específica do deployment retorna 302 para login SSO da Vercel. `orangebrick.blog` e `www.orangebrick.blog` deram `ECONNRESET` nesta estação, então não obtive HTML nem headers do host próprio.

### Rechecagem adicional — 29/09/2026

- Reexecutei `npx --yes vercel@latest crons list --project orange-brick`: seis crons publicados seguem ativos; `/api/cron/generate-daily` continua sem `slot`, e as três entradas locais `slot=12/17/20` seguem `not deployed` (15h, 20h e 23h UTC). Nenhuma configuração remota foi alterada.
- Consultei Auth e Security Advisor pela Management API, somente leitura. Auth confirmou signup padrão habilitado, criação de usuários anônimos habilitada, CAPTCHA desabilitado, proteção HIBP de senha desabilitada e confirmação de email não automática. O Advisor retornou 92 resultados (84 WARN, 8 INFO); entre eles estão as permissões SECURITY DEFINER de OB-96 e o sinal de sign-ins anônimos de OB-95. Policies com checagem de `is_admin` e tabelas sem policy foram conferidas antes de concluir que não eram bypasses.
- O Advisor também retornou `auth_leaked_password_protection` e a configuração confirma `password_hibp_enabled=false`. Não criei achado separado: essa configuração é exclusivamente remota e não há arquivo/linha de código local que permita satisfazer a regra de evidência obrigatória. O aviso fica registrado como observação e limitação de rastreabilidade.
- Reexecutei preflight `OPTIONS` sem autenticação para `manage-push-subscription` e `send-push-notification`, usando `NEXT_PUBLIC_SUPABASE_URL` carregada em memória de `.env.local`, método `POST` e os headers `authorization, apikey, content-type`. Nas origens `https://orangebrick.blog` e `https://www.orangebrick.blog`, as quatro respostas foram HTTP 200 e continuaram anunciando `Access-Control-Allow-Origin: https://orange-brick.vercel.app`.
- Repeti `HEAD` em `https://orangebrick.blog/` e `https://www.orangebrick.blog/`; ambas as conexões terminaram em `ECONNRESET`, sem resposta HTTP ou leitura de headers.
- `npx --yes supabase@latest migration list --linked` permaneceu em `Initialising login role...` após aproximadamente 60 segundos. Para contornar a falha sem escrita, consultei por GET `https://api.supabase.com/v1/projects/{ref}/database/migrations`, endpoint oficial de [listagem do histórico de migrations](https://supabase.com/docs/reference/api/v1-list-migration-history), usando a credencial já armazenada pelo Supabase CLI em memória, sem imprimi-la. Resultado HTTP 200: 34 versões aplicadas, 65 locais únicas, 31 locais ausentes do ledger e zero versões remotas sem arquivo local. As 31 pendentes são `20260727000002`, `20260727000003`, `20260803000001`–`20260803000007`, `20260806000000`, `20260806000001`, `20260807000000`, `20260811000001`, `20260813000001`, `20260821000000`, `20260821000001`, `20260822000000`, `20260825000000`, `20260826000000`, `20260924000000`–`20260924000005`, `20260925000000`–`20260925000002` e `20260928000000`–`20260928000002`. O GET é leitura; a consulta SQL usou o endpoint oficial somente leitura e não retornou linhas. Nenhuma migration foi aplicada.
- Tentei confirmar a existência física das cinco tabelas com um `SELECT` de metadados em `information_schema.tables` pela [API oficial de consulta somente leitura](https://supabase.com/docs/reference/api/v1-read-only-query). A resposta foi HTTP 201 com corpo `{}` e não incluiu linhas; não uso esse retorno como prova de existência nem de ausência física.
- `npx --yes vercel@latest list orange-brick --json --limit 10`: a primeira entrada é `READY`, target `production`, SHA `17af5e0a29e2bb43fcd8fab734432a1e0cdd7966`, igual a `git rev-parse HEAD`; a metadata marca o repositório GitHub como público. O checkout tem 171 caminhos rastreados diferentes desse commit e 57 não rastreados (incluindo `AUDITORIA.md`); portanto, a revisão publicada é identificável, mas não corresponde ao conteúdo local atual.
- `git ls-tree -r --name-only 17af5e0a29e2bb43fcd8fab734432a1e0cdd7966 -- supabase/migrations`: 53 arquivos e 51 versões únicas; três arquivos compartilham `20260727000000`. O checkout tem 65 versões únicas, e 14 delas não existem na árvore do deployment. O relatório anterior de 31 versões locais ausentes no ledger se refere ao checkout atual; não atribuí todas as pendências à produção nem inferi quais scripts foram executados.
- Leitura integral das 464 linhas de `src/app/api/cron/drive-sync/route.ts` e busca de usos do helper no commit publicado: registrei OB-98–OB-101; a validação de URLs públicas é usada em `/api/admin/images`, não no cron. Não fiz requisições ao endpoint, URLs internas ou imagens grandes, e não injetei falhas de limpeza.

### Rechecagem final — 29/09/2026

- `npx --yes vercel@latest list orange-brick --json --limit 10`: production continua `READY`, no SHA `17af5e0a29e2bb43fcd8fab734432a1e0cdd7966`, igual ao `HEAD`. `npx --yes vercel@latest crons list --project orange-brick`: seis crons publicados; `generate-daily` continua em `0 12 * * *` UTC (09h de Brasília), e os slots de 12h, 17h e 20h de Brasília continuam como três mudanças locais `not deployed`.
- `npx --yes vercel@latest domains inspect orangebrick.blog --json`: domínio associado ao projeto `orange-brick`, `edgeNetwork:true` e `configuration.misconfigured:false`. Os nameservers atuais são `horizon.dns-parking.com` e `orbit.dns-parking.com`; a resposta também lista os nameservers gerenciados da Vercel como pretendidos. O DNS externo é aceito quando os registros exigidos pelo projeto estão configurados; a documentação recomenda consultar os valores específicos com `vercel domains inspect` ([guia oficial da Vercel](https://vercel.com/docs/domains/set-up-custom-domain)).
- `Resolve-DnsName` local e `Resolve-DnsName -Server 1.1.1.1` retornaram `orangebrick.blog A 64.29.17.1` (TTL 300) e `www.orangebrick.blog CNAME orangebrick.blog`; o RDAP da ARIN identifica `64.29.17.0/24` como `VERCEL-12` ([registro RDAP](https://rdap.arin.net/registry/ip/64.29.17.1)). Consultas diretas ao DNS `8.8.8.8` expiraram nesta rede.
- `curl.exe -I http://orangebrick.blog/` recebeu HTTP 503 e uma página de bloqueio identificada como política de acesso do TJPR, com categoria `parked`; o identificador de usuário presente na resposta foi omitido. HTTPS para apex e `www` terminou em reset; `https://vercel.com/` respondeu HTTP 200. O usuário informou que o site abre pelo celular. A observação comprova bloqueio/classificação desta rede, não falha TLS global nem bloqueio universal do site; não alterei DNS nem regras de rede.
- `node --experimental-strip-types --experimental-test-coverage --test tests/*.test.ts`: 89/89 testes passaram; cobertura 37,11% de linhas, 72,71% de branches e 58,17% de funções. `npm run typecheck` passou; `npm run lint` falhou somente em `src/app/profile/setup/page.tsx:25` (`react-hooks/set-state-in-effect`, OB-93); `npm run textcheck` passou em 363 arquivos. O build não foi repetido porque `next build` gera artefatos no projeto, e a auditoria permite escrita apenas em `AUDITORIA.md`.
- `git diff --name-only HEAD` confirmou 171 caminhos rastreados divergentes; `git ls-files --others --exclude-standard` confirmou 57 não rastreados. As verificações acima não alteraram arquivos do projeto.

### Resumo executivo

1. O relatório contém 101 achados: 1 crítico, 3 altos, 61 médios e 36 baixos.
2. O risco crítico é uma chave privilegiada exposta no histórico Git e ainda aceita pelo projeto Supabase consultado localmente; não confirmei que seja a mesma chave implantada.
3. Há três riscos altos: cinco relações sem acesso no PostgREST e 31 migrations locais ausentes do ledger; o cron publicado não corresponde aos três horários; e contas anônimas podem criar conteúdo, votar e denunciar sem CAPTCHA nem checagem de `is_anonymous`.
4. O backup verificado permanece parcial/local, sem restauração comprovada; a prontidão de produção continua reprovada.
5. Typecheck e 89 testes passaram; cobertura é 37,11% de linhas, 72,71% de branches e 58,17% de funções. O lint falha em OB-93.
6. O commit publicado é conhecido e difere do checkout em 171 caminhos rastreados; o sincronizador do Drive publicado aceita destinos de imagem sem filtro de rede, não limita bytes e não busca páginas posteriores. O checkout já contém o cron de três horários que publica automaticamente quando passam verificações estruturais, mas esse código ainda não está implantado.
7. Falhas combinadas na importação/limpeza podem deixar um rascunho incompleto marcado como importado na execução seguinte.
8. Há três migrations no deployment com o mesmo timestamp; o ledger não identifica qual conteúdo dessa versão foi aplicado. O checkout renumerou dois arquivos, mas ainda não está publicado.
9. A Vercel associa o domínio ao projeto e informa `misconfigured:false`; esta rede do TJPR bloqueou a navegação por categoria `parked`, embora o usuário relate acesso pelo celular. O preflight Supabase confirmou CORS desatualizado nas funções de push.
10. O site ainda não deve ser declarado pronto para publicação até tratar o segredo histórico e as contas anônimas na comunidade, reconciliar banco/crons, restringir os fetches do Drive e comprovar backup e restauração.

### Contagem

| Críticos | Altos | Médios | Baixos | Total |
|---:|---:|---:|---:|---:|
| 1 | 3 | 61 | 36 | 101 |

### Scores atuais (0–10)

| Área | Nota | Justificativa |
|---|---:|---|
| Segurança | 2/10 | Credencial privilegiada histórica, participação comunitária por identidades anônimas e divergência de grants/migrations ainda exigem correção e validação remota. |
| Segurança de IA | 4/10 | Há delimitação do conteúdo, mas o cron do checkout publica sem verificação independente de alegações, origem/pertinência das imagens ou identidade editorial das fontes. |
| Performance | 4/10 | Há consultas sem paginação e o importador publicado carrega imagens sem teto de bytes; Lighthouse sem medição confiável. |
| Qualidade de Código | 6/10 | Tipagem passou, porém o lint atual falha e há estados de erro/sincronização frágeis. |
| UX | 6/10 | Fluxos centrais existem; persistem telas/ações sem feedback, abas inativas e resultados silenciosamente vazios. |
| SEO | 5/10 | Sitemap e metadados existem; canonical e hierarquia de títulos ainda têm achados. |
| Acessibilidade | 4/10 | Axe e inspeções encontraram falhas de contraste, foco, nomes acessíveis e navegação por teclado. |
| Manutenibilidade | 5/10 | Estrutura e tipagem ajudam, mas há divergência entre checkout e deployment, timestamp duplicado de migrations e baixa cobertura de fluxos. |
| Testes | 5/10 | 89 testes passam; cobertura de linhas de 37,11% não cobre adequadamente IA, Telegram e fluxos remotos. |

### Top 20 por risco e facilidade de exploração

| ID | Título | Severidade | Arquivo |
|---|---|---|---|
| OB-01 | Chave privilegiada Supabase ativa no histórico | Crítica | `scripts/check-posts.cjs:5` (histórico) |
| OB-02 | Cinco tabelas não expostas no PostgREST | Alta | `scripts/check-production-readiness.mjs:28` |
| OB-03 | Agenda de produção não executa os três horários previstos | Alta | `src/app/api/cron/generate-daily/route.ts:102` |
| OB-95 | Contas anônimas podem participar do Brickboard sem CAPTCHA | Alta | `supabase/migrations/20260723000000_community.sql:68` |
| OB-98 | Importação do Drive permite SSRF por URL de imagem | Média | `src/app/api/cron/drive-sync/route.ts:64,120` (commit de produção) |
| OB-97 | Três migrations publicadas compartilham o mesmo timestamp | Média | `supabase/migrations/20260727000000_editorial_workflow.sql:1` (commit de produção) |
| OB-86 | Filtro da página inicial dispara consultas sem parar | Média | `src/lib/hooks/useInfiniteFeed.ts:21,126` |
| OB-99 | Download de imagem sem limite de bytes pode esgotar memória do cron | Média | `src/app/api/cron/drive-sync/route.ts:123` (commit de produção) |
| OB-05 | Chave Google API no histórico | Média | `docs/drive-sync-codex.md:57` (histórico) |
| OB-04 | Backup incompleto/local | Média | `scripts/backup-supabase.mjs:17` |
| OB-07 | Aviso de privacidade incompleto | Média | `src/app/privacidade/page.tsx:34` |
| OB-25 | Cron do checkout publica imagens sem comprovar origem oficial | Média | `src/app/api/cron/generate-daily/route.ts:117` (checkout; não implantado) |
| OB-41 | Leitura pública expõe justificativa editorial interna | Média | `src/app/posts/[slug]/page.tsx:30` |
| OB-21 | Exportação de dados omite dados vinculados à conta | Média | `src/lib/user-data-export.ts:3` |
| OB-22 | Erro ao ler preferências de push envia a notificação mesmo assim | Média | `supabase/functions/send-push-notification/index.ts:170` |
| OB-23 | CORS das funções de push permite apenas a origem antiga da Vercel | Média | `supabase/functions/_shared/platform.ts:3` |
| OB-27 | Falha ao enviar denúncia ao Telegram avança o marcador mesmo assim | Média | `src/lib/telegram/bot.ts:570` |
| OB-28 | Timeout e replay do webhook podem repetir geração editorial | Média | `src/app/api/telegram/webhook/route.ts:7` |
| OB-29 | Exclusão de conta pode parar após apagar dados | Média | `src/app/api/user/delete/route.ts:64` |
| OB-101 | Falha na limpeza pode transformar rascunho incompleto em importação concluída | Média | `src/app/api/cron/drive-sync/route.ts:379,443` (commit de produção) |

### Plano de correção

As estimativas são preliminares: **P** pequena (até um dia), **M** média (mudanças coordenadas em mais de um ponto) e **G** grande ou dependente de provedor, migração, dados ou restauração. A auditoria permanece somente leitura; este plano não executa as correções.

#### Imediato (24h)

- **OB-01 — G:** revogar/rotacionar a credencial exposta, substituir nos serviços autorizados e rever logs; limpeza do histórico somente após rotação coordenada.
- **OB-05 — P:** confirmar escopo/validade com o provedor e revogar/restringir a chave histórica se ainda ativa.
- **OB-02 — G:** reconciliar as migrations e permissões/RLS das cinco relações em produção; repetir readiness e backup depois da confirmação.
- **OB-03 — M:** alinhar cron publicado, handler e agenda 12h/17h/20h; verificar execuções e idempotência.
- **OB-04 — G:** obter cópia completa cifrada fora da máquina e testar restauração isolada.
- **OB-95 — M:** desabilitar contas anônimas se modo visitante não for requisito; caso contrário, negar `is_anonymous` nas regras de conteúdo e habilitar CAPTCHA/limites antes de permitir participação.
- **OB-12 — M:** antes de ativar o cron de publicação automática, verificar alegações contra fontes independentes e deixar conteúdo não confirmado em rascunho.
- **OB-25 — M:** exigir procedência e pertinência das imagens no gate automático; deixar em rascunho quando a evidência faltar e retirar a legenda “Oficial” sem confirmação.
- **OB-26 — M:** contar veículos/editoras independentes, não hostnames, antes de liberar publicação automática.
- **OB-97 — M:** reconciliar os três scripts de `20260727000000` contra o schema/ledger; testar a sequência renumerada em staging antes do próximo push.
- **OB-98 — M:** restringir a origem e o destino de rede dos fetches do cron Drive e confirmar quem pode gravar na pasta importada antes da próxima execução.
- **OB-99 — P:** aplicar teto de bytes por stream e testar a interrupção de resposta acima do limite em staging.

#### Curto prazo (1–2 semanas)

- Aplicar as ações já detalhadas para **OB-06 a OB-67** no plano de correção acima, priorizando privacidade/exportação/exclusão (**OB-07, OB-21, OB-29, OB-41, OB-59**), fluxo editorial/IA (**OB-12, OB-14, OB-19, OB-25–OB-28**) e falhas de conta/push/comunidade (**OB-22–OB-24, OB-35–OB-38, OB-44–OB-58**); o esforço individual está indicado naquele plano.
- **OB-72 — M:** paginar a fila de denúncias e cobrir itens pendentes além do primeiro lote.
- **OB-76 — P:** diferenciar erros de consultas administrativas de resultados numéricos válidos.
- **OB-77 — M:** conter o foco no diálogo de XP e devolver foco ao acionador ao fechar.
- **OB-78 — P:** conectar as abas do editor ao painel correto e testar navegação por teclado.
- **OB-79 — M:** preservar rascunho e impedir salvamento até validar o ID da matéria.
- **OB-80 — M:** vincular respostas assíncronas ao ID solicitado para bloquear substituição por resultado atrasado.
- **OB-81 — P:** cancelar ou descartar consultas de perfil obsoletas após navegação.
- **OB-83 — M:** limitar e paginar o fallback de ranking quando a RPC falhar.
- **OB-85 — P:** encerrar o parser em links Markdown malformados e adicionar teste de terminação.
- **OB-86 — M:** interromper o ciclo de consulta automática do feed após erro/rate limit e exigir retry controlado.
- **OB-89 — P:** remover slides invisíveis da ordem de tabulação ou torná-los inertes.
- **OB-93 — P:** corrigir a atualização de estado dentro do efeito e exigir que lint passe.
- **OB-96 — P:** revisar a allowlist de funções SECURITY DEFINER e aplicar a migration aprovada após validação em staging.
- **OB-100 — P:** paginar listagens do Drive pelo `nextPageToken` e validar o limite em pasta de staging.
- **OB-101 — M:** tornar limpeza/retry de posts importados idempotente e registrar cada falha compensatória para reconciliação.

#### Médio prazo (1–2 meses)

- **OB-68 — P:** usar role compatível para a sentinela do Brickboard.
- **OB-69 — P:** alinhar nome acessível do botão de alertas ao rótulo visível.
- **OB-70 — P:** corrigir ordem semântica dos headings da homepage.
- **OB-71 — P:** contar somente denúncias abertas no indicador administrativo.
- **OB-73 — M:** paginar a biblioteca de imagens ou sinalizar claramente o limite de resultados.
- **OB-74 — M:** paginar a limpeza mensal do Radar e registrar progresso.
- **OB-75 — P:** propagar falha na remoção do registro da biblioteca em vez de anunciar sucesso.
- **OB-82 — P:** validar slugs antigos na rota institucional e responder com status apropriado.
- **OB-84 — P:** expor falhas de consultas nos feeds e sitemaps por log/alerta.
- **OB-87 — P:** reverter estado otimista de acompanhamento quando a gravação falhar.
- **OB-88 — P:** exibir estado de erro quando a contagem de respostas não carregar.

#### Melhorias futuras

- **OB-90 — P:** remover ou integrar módulos de interface realmente sem consumidores após confirmar busca global.
- **OB-91 — P:** formatar datas futuras com unidade/tempo correto, sem apresentá-las como atuais.
- **OB-92 — P:** aumentar os rótulos da navegação móvel ao piso tipográfico definido pelo projeto.
- **OB-94 — P:** confirmar `max_rows`, paginar a consulta de assinaturas com tamanho de página compatível e limitar concorrência do envio.

### Limitações da auditoria

- A Vercel associa o apex e o `www` ao projeto e retorna `configuration.misconfigured:false`; DNS local e Cloudflare resolvem o apex para IP registrado pela ARIN à Vercel. Nesta estação, porém, a política de rede do TJPR bloqueou HTTP com categoria `parked` e resetou HTTPS; `8.8.8.8` também expirou. O usuário informou acesso pelo celular, mas não foi possível testar de outra operadora/rede. Portanto, a configuração vinculada ao projeto está confirmada, mas a disponibilidade para todas as redes e a experiência TLS fora desta rede continuam sem verificação independente. Nenhuma alteração de DNS foi feita nesta retomada.
- `vercel inspect` não retornou SHA; a listagem posterior de deployments identificou o commit Vercel publicado e confirmou que ele coincide com `HEAD`. O checkout ainda diverge em 171 caminhos rastreados e tem 57 não rastreados; esses arquivos locais não podem ser tratados como implantados. O código hash das Edge Functions Supabase e a comparação entre alguns secrets de produção e os históricos continuam sem confirmação.
- A CLI `supabase migration list --linked` continua parando em `Initialising login role...`, mas o GET da Management API confirmou 34 migrations remotas e 31 versões do checkout atual ausentes do ledger. O commit publicado contém 53 arquivos em 51 versões, com três arquivos sob o mesmo prefixo; 14 versões atuais do checkout não existem nesse commit. A consulta SQL somente leitura não confirmou existência física das cinco tabelas PGRST205. O ledger e o schema não permitem concluir quais arquivos com versão duplicada foram executados nem atribuir todas as 31 pendências à release.
- Os valores secretos de produção não foram lidos nem registrados. `vercel env run` informou que não pode puxar 22 valores `Secret`. A primeira tentativa dentro do checkout carregou `.env.local`, portanto não foi usada para comparar segredos; a segunda, sem `.env.local`, confirmou apenas a variável pública do site. A igualdade da chave Supabase histórica com a implantação, validade/escopo da chave Google, conteúdo de `CRON_SECRET`, VAPID privado e valor efetivo do secret `SITE_URL` das Edge Functions permanecem sem confirmação.
- As flags de Auth e os resultados do Security Advisor foram lidos remotamente, mas representam configuração/estado sem arquivo e linha local. A proteção HIBP desabilitada foi registrada como observação, sem achado numerado, conforme a regra de evidência. O Advisor pode sinalizar situações que dependem de confirmação contra as policies e o modelo de acesso; seus resultados não foram tratados automaticamente como vulnerabilidades.
- Nenhuma sessão autenticada real, ação mutável, publicação, migração, rotação de chave, deploy ou restauração de backup foi executada.
- Playwright/axe cobriram rotas e viewports declarados, mas não todos os estados dinâmicos/autenticados. Lighthouse não forneceu uma medição confiável; o desempenho em dispositivos e redes reais permanece limitado.
- A auditoria é uma revisão baseada nas fontes, ferramentas e acessos disponíveis. Ela não garante ausência de vulnerabilidades não observadas.

**Conclusão:** a etapa do domínio está encerrada conforme confirmação do usuário, e o relatório da auditoria está consolidado. Isso não atesta prontidão para publicação: antes do próximo deploy, permanecem os bloqueios OB-01, OB-02, OB-03, OB-04, OB-12, OB-23, OB-25, OB-26, OB-95 e OB-97–OB-101, além das validações remotas e da comprovação de backup/restauração. O cron de três horários no checkout publica automaticamente com gate apenas estrutural e ainda não foi implantado; valide os controles editoriais e de imagem antes de ativá-lo.

## Retomada da auditoria — 29/09/2026

### Avanços desta retomada

- OB-95: foi criada a migration local supabase/migrations/20260929000000_restrict_anonymous_community.sql e a configuração local passou a desabilitar novos logins anônimos. A migration bloqueia mutações comunitárias de sessões com is_anonymous e conserva o acesso de usuários autenticados comuns. O teste PGlite confirma os dois casos. A alteração não foi aplicada ao projeto remoto; a flag remota de Auth continua pendente.
- OB-12, OB-25 e OB-26: a rota de geração agendada no checkout agora sempre salva e informa um rascunho que exige aprovação manual; ela não contém mais a atualização que marcava o post como publicado. O gate pede revisão da origem e da relação temática das imagens. As legendas geradas sem comprovação removem a atribuição “Divulgação/Oficial” e recebem “Imagem ilustrativa”. O contador de fontes agrupa subdomínios pela editora/publisher e pelos domínios conhecidos.
- OB-93: a tela de configuração de perfil lê returnTo com useSearchParams dentro de Suspense, removendo a atualização síncrona de estado no efeito que falhava no lint.
- OB-01: as quatro variáveis locais de Supabase passaram a usar as chaves atuais sb_secret e sb_publishable, incluindo os aliases legados. As quatro variáveis correspondentes de Production na Vercel também foram atualizadas; o alias público NEXT_PUBLIC_SUPABASE_ANON_KEY foi recriado como Config porque a Vercel não permite que uma variável NEXT_PUBLIC_ permaneça do tipo Secret. Nenhum valor foi impresso. A CLI aceitou as atualizações, mas a Vercel não permite reler variáveis Secret para confirmação independente.
- A atualização das variáveis da Vercel só vale para deployments futuros; o deployment ativo não foi substituído. As chaves legacy continuam habilitadas no Supabase. Os consumidores das Edge Functions e as variáveis de repositório do GitHub ainda precisam ser migrados e verificados antes da desativação. O workflow local do GitHub foi ajustado para preferir NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY e manter fallback temporário; gh não está instalado neste ambiente para atualizar a variável do repositório.

### Verificações

- npm run check concluiu com sucesso: integridade textual, lint, typecheck, 91 testes e build Next.js.
- npm run production:check conseguiu consultar o Supabase com a nova chave local e permaneceu ready:false. Ainda faltam NEXT_PUBLIC_VAPID_PUBLIC_KEY e a confirmação de estado externo; as cinco relações admin_audit_log, admin_trash, backup_runs, notification_preferences e user_follows continuam com PGRST205.
- O backup criado em 29/09/2026 às 17:41 UTC tem 37 tabelas, cinco tabelas obrigatórias ausentes, cinco usuários e 433 objetos de Storage. A verificação criptográfica retornou verified:true e nenhuma falha de hash, mas o manifesto continua complete:false e backup:verify termina com código 1. Não houve restauração nem cópia externa.

### Bloqueios e próximas ações

1. Reconciliar o ledger e o schema remoto em staging, incluindo as cinco relações ausentes e as 31 versões locais que o relatório anterior não encontrou no histórico remoto.
2. Produzir um backup completo, cifrado e armazenado fora desta máquina; provar restauração em ambiente isolado antes de qualquer migration remota.
3. Atualizar/verificar a variável publicável no repositório GitHub e migrar os secrets dos consumidores Edge. Fazer deployment coordenado e verificar os fluxos com as chaves novas; somente então desativar as chaves Supabase legacy expostas e revisar logs.
4. Aplicar a migration OB-95 e a configuração de Auth em staging, validar RLS e comportamento de contas existentes, e só então planejar a aplicação em produção.
5. Confirmar os crons, a versão publicada do handler editorial, CORS das funções de push, VAPID e as pendências OB-97–OB-101 antes de declarar prontidão. O cron corrigido e as migrations seguem apenas no checkout local.

Nenhuma migration remota, desativação de chave, deployment, publicação de matéria ou restauração de backup foi executada nesta retomada. Este registro substitui as estimativas de lint/testes do relatório anterior; a auditoria permanece aberta e Production não está pronta para publicação.

## Correção do fluxo editorial — 29/09/2026

O usuário confirmou que o Orange Brick **não busca mais matérias no Google Drive**. O fluxo vigente é a IA buscar a pauta e redigir a matéria, que deve ser salva como rascunho para revisão manual. Esta decisão substitui as prioridades anteriores de consertar a importação do Drive.

- No checkout, a rota `src/app/api/cron/drive-sync/route.ts`, o workflow `.github/workflows/drive-sync.yml` e os scripts/documentação da integração já estão removidos; `vercel.json` também não agenda o Drive. Não há referências ativas ao Drive nos arquivos atuais fora deste relatório.
- A produção ainda está defasada: `vercel crons list` retorna `/api/cron/drive-sync` às 08h UTC, e o workflow `drive-sync.yml` do GitHub remoto continua `active`, com execução a cada 30 minutos. A remoção local não desliga esses agendamentos remotos. A tentativa de obter credencial GitHub deste ambiente para desativar o workflow pela API retornou `CREDENTIAL_UNAVAILABLE`; nenhuma alteração remota foi feita.
- OB-98, OB-99, OB-100 e OB-101 continuam válidos enquanto o endpoint publicado puder executar, mas a solução escolhida é **desativar o workflow GitHub e remover a rota e o cron do deployment de produção**. Não há necessidade de desenvolver paginação, limite de download ou novos controles de importação para uma integração aposentada.
- A prioridade editorial passa a ser garantir que `/api/cron/generate-daily` pesquise, redija e salve somente rascunhos, com revisão humana antes da publicação. O checkout já retorna `published:false` e `requiresManualApproval:true`; a Vercel ainda agenda a versão antiga uma vez por dia às 12h UTC, enquanto os três horários locais permanecem não implantados.
- Para retirar somente o cron do Drive na Vercel, é necessário um novo deployment com a entrada removida de `vercel.json`; desativar todos os crons do projeto interromperia também as tarefas válidas. Não implantar diretamente este checkout amplo sem reconciliar as mudanças de banco e os demais bloqueios de produção.

**Próximas ações, em ordem:** (1) desativar o workflow `drive-sync` no GitHub; (2) preparar um deployment isolado que retire a rota e o cron do Drive e confirme a lista de crons após publicar; (3) reconciliar banco/backup e demais dependências do fluxo de IA; (4) implantar e verificar a geração de rascunhos nos horários desejados, sem publicação automática.

## Atualização de produção — 29/09/2026

O usuário definiu os horários editoriais de **11h, 17h e 20h de Brasília**. Foi implantado em produção o hotfix isolado `dpl_92QLyKPkW3b9D1xabMUu72WSrW9j`, construído a partir do SHA publicado `17af5e0a29e2bb43fcd8fab734432a1e0cdd7966` com alterações restritas ao cron editorial e à remoção do Drive. O build local e o build Vercel passaram; a implantação chegou a `READY` e recebeu o domínio `orangebrick.blog`.

- A lista remota da Vercel agora mostra `/api/cron/generate-daily?slot=11` às 14h UTC, `slot=17` às 20h UTC e `slot=20` às 23h UTC. `/api/cron/drive-sync` não aparece mais. Uma requisição à rota antiga no novo deployment retornou HTTP 404.
- A rota implantada usa o gerador existente, salva rascunho e exige confirmação de entrega do cartão de aprovação pelo Telegram; ela retorna `published:false` e `requiresManualApproval:true`. Ela não depende de `bot_state`, relação ausente no banco remoto (`PGRST205`).
- `getMe`, `getChat` e `getWebhookInfo` da API do Telegram responderam com sucesso para a configuração local; o webhook aponta para `/api/telegram/webhook`, sem atualizações pendentes, e o GET da rota no novo deployment respondeu. Não foi disparada geração manual nem enviada mensagem de teste; a primeira execução agendada dos três horários ainda precisa de confirmação operacional.
- O checkout principal foi ajustado para os mesmos horários. Sua rota editorial agora faz fallback quando `bot_state` não existe e exige confirmação de entrega do cartão do Telegram. `npm run typecheck` e `npm run build` concluíram com sucesso.
- **Pendente:** o workflow `drive-sync.yml` do GitHub remoto continua `active` e chamará a rota removida a cada 30 minutos, recebendo HTTP 404. A credencial GitHub não está disponível nesta estação; uma conexão GitHub foi sugerida. O arquivo foi removido dos dois checkouts locais, mas a desativação remota requer conexão/autorização GitHub ou a publicação dessa exclusão no repositório. Nenhum commit foi criado.

Esta atualização substitui a situação remota descrita no adendo anterior. Ela confirma a configuração dos horários e a retirada da função Drive da produção, mas ainda não confirma que as três execuções futuras consigam encontrar pauta, gerar rascunhos válidos e entregar cartões no Telegram.

## Seleção de imagens e publicação automática — 29/09/2026

O usuário autorizou publicação direta nos três horários, seguida apenas de aviso no Telegram, e apontou o uso de imagens genéricas como o principal problema editorial. A autorização foi registrada em AGENTS.md. Foi implantada a release isolada `dpl_Bp3th4DEwEY77Y3onFHA6F56unsJ`, com domínio `orangebrick.blog`, mantendo a base de produção e incluindo os módulos necessários ao novo fluxo editorial; nenhuma migration foi aplicada.

- O seletor anterior aceitava a primeira imagem com dimensões válidas e usava o primeiro resultado da Steam sem conferir o jogo. Agora a correspondência do título da Steam é obrigatória; cápsulas/header pequenos são recusados.
- Imagens devem vir de domínio oficial/CDN aceito ou de URL de imagem encontrada em página oficial efetivamente consultada. Material de bancos de imagens e URLs sem origem aceita são descartados. Cada arquivo passa por análise multimodal dos pixels para confirmar o assunto exato, autenticidade visual e ausência de conteúdo genérico. Respostas incertas, inválidas ou falhas do modelo bloqueiam a escolha.
- A capa e as duas imagens internas precisam ser distintas por URL e hash dos bytes. URLs de imagens registradas nos últimos sete dias são evitadas. São exigidos HTTP válido, tamanho limitado, proporção 16:9 e mínimo de 1200 × 675. Alt text e legenda são produzidos a partir da análise da imagem efetiva.
- A descoberta de trailer exige vídeo incorporado em página oficial, metadata do YouTube acessível e URL do canal também vinculada nessa página. Quando verificado, o bloco de vídeo é colocado antes do primeiro texto. Não foi implementada uma busca irrestrita de vídeos ou reuploads.
- A publicação agendada exige conteúdo válido e evidência de seleção visual para cada uma das três imagens. Se houver pendências, salva rascunho e avisa o motivo. Quando publica, o bot envia título e URL; a resposta registra se o Telegram confirmou a entrega. Não há cartão de aprovação no caminho de publicação automática.
- O banco remoto não possui `bot_state` nem `posts.short_article_reason`. A release trata essas ausências sem migration e reserva tempo de execução para salvar o rascunho após a busca de imagens. A falta de `bot_state` mantém uma limitação: não há bloqueio persistente por horário nessa configuração.
- Verificação: 95 testes passaram, lint dos módulos alterados passou, typecheck e builds local/isolado/Vercel passaram. Os modelos Gemini usados foram encontrados pela API. A tentativa de conferir ao vivo um screenshot da Steam nesta rede expirou; não houve geração/publicação de matéria de teste.
- Após o deployment, a lista remota confirmou os slots 11/17/20, o Drive continuou ausente e sua rota retornou 404. A rota editorial recusou acesso sem o segredo do cron. Ainda falta observar uma execução completa com imagens selecionadas e confirmação de aviso no Telegram. A análise visual por IA reduz o problema, mas não comprova por si só todas as condições de autoria/licenciamento ou todos os casos de semelhança visual.

Este registro substitui o requisito de aprovação manual para o gerador agendado e a situação de produção descritos nos adendos anteriores. O desligamento do workflow legado no GitHub permanece pendente de acesso; sua rota de destino já foi retirada da produção.

## Continuação da auditoria — 30/09/2026

### Estado do workspace e da produção

- O workspace foi commitado e está limpo: HEAD `53f8de9` (redesenho do Meu Brick e do perfil público), sobre `db8be6b` (reações); a branch está 2 commits à frente de `origin/master` (não enviados). Os dois commits **não** estão implantados — a produção com o domínio `orangebrick.blog` continua na release isolada `dpl_Bp3th4DEwEY77Y3onFHA6F56unsJ` (29/09, 16:46 de Brasília).
- A rota editorial nova (slots 11/17/20, gates, publicação direta, `maxDuration = 300`, aviso no Telegram) entrou no repositório no commit `53f8de9`. Até `db8be6b`, a rota ainda era o fluxo antigo (`maxDuration = 60`, cartão de aprovação, sem claim de slot).
- `vercel crons list` confirma em produção: `generate-daily?slot=11` às 14h UTC, `slot=17` às 20h UTC e `slot=20` às 23h UTC; `drive-sync` ausente. Os logs de runtime da Vercel retêm cerca de 30 minutos — insuficientes para auditar execuções passadas; o tráfego visível mostra apenas leituras de middleware/estáticas e sondagens de bot (`/wp-admin/install.php`).

### Execuções editoriais observadas no banco (leitura)

- **Slot 17 de 29/09:** post "Ace Combat 8: Wings of Theve inicia acesso antecipado" (`13b3c7c3-…`) criado às 20:42:46 UTC e publicado (`is_published: true`), 42 min após o horário agendado (atraso de disparo do cron ou origem manual — causa NÃO VERIFICADA). Revisão `update` (confirmed→confirmed, `editor_id` null) 4 min depois. Título em caixa mista com slug divergente indica edição posterior; autoria exata NÃO VERIFICADA. Sem registros em `editorial_images` para o post.
- **Imagem do post Ace Combat:** `live.staticflickr.com`, HTTP 200, `image/jpeg`. Inspeção visual do arquivo baixado: arte/screenshot de caças fictícios estilo Ace Combat, enquadramento 16:9, coerente com o assunto — material de jogo, não foto genérica. Porém o host não consta em `OFFICIAL_EDITORIAL_DOMAINS` (`src/lib/content-validation.ts:64-68`) nem em `ASSET_DOMAINS` (`src/lib/ai/editorial-images.ts:11`), que rejeitariam essa URL; a release implantada aceitou uma origem que o checkout atual recusaria. Autoria/licenciamento da imagem NÃO VERIFICADOS — confirmação de uso editorial pendente (atualiza OB-25).
- **Slot 20 de 29/09:** rascunho "SEGA ENTRA NO XBOX DISC-TO-DIGITAL…" (`52c31298-…`) criado às 23:16:07 UTC (16 min após o horário), **sem capa e sem imagens internas** (0 imagens; `check-drafts-health` confirma). A seleção de imagens falhou por completo e o fluxo degradou corretamente para rascunho com aviso ao admin. Sem registros em `editorial_images`/`editorial_revisions` para o rascunho.
- **Slot 11 de 30/09 (14h UTC):** NENHUM post criado — nenhum registro com `created_at` de 30/09 entre os 20 mais recentes. A rota implantada, em falha de geração, responde 500 e avisa o admin; sem pauta nova, retorna `NoFreshTopic` e avisa com 📭 — em ambos os casos, sem salvar post. A causa (sem pauta, falha de provedor ou cron não disparado) é NÃO VERIFICADA desta estação; conferir o chat admin do Telegram às 11h. Todos os demais rascunhos têm capa e 2 imagens internas com HTTP 200.

### Revalidação de prontidão

- `npm run production:check` segue `ready:false`, com mudanças relevantes: `notification_preferences` e `user_follows` agora respondem OK (OB-02 parcialmente resolvido — 2 de 5). Continuam `PGRST205`: `admin_audit_log`, `admin_trash`, `backup_runs` e `bot_state`.
- Novas pendências remotas das migrations de 30/09: funções `community_poll_results`/`_anon` (PGRST202), coluna `editorial_images.content_sha256` (42703); `add_featured_posts` e `profile_gaming_fields` também não aplicadas — o checkout novo (Meu Brick, enquete, fingerprints) depende delas. `migrations.count` subiu para 72 versões locais únicas; `remote_history_confirmed` segue falso (ledger não reconsultável nesta sessão: sem `SUPABASE_ACCESS_TOKEN`).
- Ambiente local: `NEXT_PUBLIC_VAPID_PUBLIC_KEY` ausente; `PRODUCTION_EXTERNAL_CHECKS_CONFIRMED` definido mas com valor diferente de `"true"` — o check corretamente segue não confirmado; `RAWG_API_KEY` agora consta no `.env.local` (presença no Vercel Production segue NÃO VERIFICADA); os aliases legados do Supabase continuam presentes — rotação OB-01 incompleta (chaves legacy habilitadas, consumidores Edge/GitHub pendentes).
- Backup: último em 29/09 17:44 UTC, 24,4h de idade, incompleto — `stale` (OB-04). `gh` continua indisponível — o workflow `drive-sync.yml` no GitHub remoto segue sem verificação/desativação possíveis desta máquina. OB-95 (migration local-only) segue sem confirmação remota.
- Acesso HTTP ao site continua bloqueado nesta rede (reset TLS; webfetch com erro de transporte) — limitação registrada; Supabase e Vercel acessíveis normalmente.

### Novo achado

- **OB-102 (Alta):** a rota editorial do checkout depende de `bot_state` sem fallback; implantar o checkout quebraria os três horários com HTTP 500 antes de gerar. Detalhe na seção de achados.

### Bloqueios e próximas ações

1. Corrigir OB-102 (fallback `PGRST205` ou migration `bot_state`) antes de qualquer deploy do checkout.
2. Aplicar em staging/produção as quatro relações restantes e as migrations de 30/09 antes de implantar o checkout novo.
3. Investigar o slot de 11h de hoje pelo chat admin do Telegram (avisos 📭/❌) e considerar retenção de logs (log drain) para diagnóstico.
4. Confirmar autoria/licenciamento da imagem Flickr do post Ace Combat ou trocá-la por material oficial rastreado.
5. Observar as execuções de 17h e 20h de hoje (site + Telegram).
6. Desativar o workflow `drive-sync` no GitHub (requer credencial ou push); continuar rotação OB-01, backup completo externo e validações externas.

**Contagem:** 102 achados — 1 crítica, 4 altas, 61 médias, 36 baixas. Nenhuma migration remota, rotação de chave, deployment, publicação ou restauração foi executada nesta continuação; somente `AUDITORIA.md` foi atualizado.

# Reauditoria integral — 05/10/2026

## Fase 0 — Descoberta e inventário (concluída)

### Stack e arquitetura confirmadas

- Aplicação web monolítica em **Next.js App Router**, com React, TypeScript e componentes cliente/servidor. O pacote declara Node `>=22 <25`; o ambiente desta auditoria usa Node `v24.20.0` e npm `11.19.0`. Evidências: `package.json:2-16`, `src/app/` (41 páginas) e `src/proxy.ts`.
- Versões resolvidas no `package-lock.json`: Next.js 16.3.6, React 19.3.0, TypeScript 5.9.3, `@supabase/ssr` 0.12.7, `@supabase/supabase-js` 2.117.1, `@google/genai` 2.24.0, Playwright 1.63.0 e ESLint 9.39.5.
- Persistência e autenticação: Supabase/PostgreSQL, cliente oficial JS, tipos em `src/lib/types/database.ts`, autenticação em `src/lib/supabase/` e 73 migrations SQL locais. Não há ORM identificado nas dependências.
- Backend: 35 Route Handlers em `src/app`; sete Edge Functions de produto em `supabase/functions` (mais `_shared`); lógica comum em `src/lib/server/`. Existem integrações com Supabase Auth/Postgres/Storage, Google Gemini, Groq, Telegram, RAWG, YouTube e analytics; a confirmação por fluxo fica para as fases 2–3.
- Hospedagem e automação declaradas: Vercel (`vercel.json`, com crons), GitHub Actions (dois workflows) e Supabase Edge Functions. A busca inicial não encontrou Docker/Compose, Terraform, Pulumi ou manifests Kubernetes.
- Testes declarados: Node test runner (`tests/`, 27 arquivos) e Playwright (`e2e/`, um arquivo), com dependência `@axe-core/playwright`. O comando `npm run check` inclui build e escreve `.next`; por isso não será executado no workspace.
- Não foi identificada fila persistente nem cache externo dedicado na configuração inicial; revalidação/cache nativo do Next será conferido no código. Server Actions, webhooks, guards e policies serão inventariados junto com os fluxos nas fases seguintes.

### Inventário de páginas

Contagem atual: 41 arquivos `page.tsx` em `src/app`.

| Área | Rotas |
|---|---|
| Portal | `/`, `/busca`, `/em-alta`, `/lancamentos`, `/noticias`, `/noticias/arquivo`, `/plataforma/[platform]`, `/games/[slug]`, `/posts/[slug]`, `/post` |
| Conta e perfil | `/cadastro`, `/entrar`, `/recuperar-senha`, `/nova-senha`, `/configuracoes/notificacoes`, `/configuracoes/perfil`, `/minha-orange`, `/meu-brick`, `/profile/[nickname]`, `/profile/setup`, `/u/[username]` |
| Comunidade | `/brickboard`, `/brickboard/como-funciona`, `/brickboard/conquistas`, `/brickboard/ranking` |
| Administração | `/admin`, `/admin/community`, `/admin/contact`, `/admin/edit`, `/admin/health`, `/admin/images`, `/admin/login`, `/admin/progression`, `/admin/releases`, `/admin/settings`, `/admin/team` |
| Institucional | `/contato`, `/institucional/[slug]`, `/privacidade`, `/sobre`, `/termos` |

Rotas não associadas a `page.tsx`: `/assuntos/[slug]`, `/auth/callback`, `/feed.xml`, `/sitemap.xml` e `/news-sitemap.xml`, além dos Route Handlers abaixo.

### Inventário de Route Handlers

| Método | Endpoint | Handler |
|---|---|---|
| GET, POST | `/api/admin/community` | `src/app/api/admin/community/route.ts` |
| GET, PATCH | `/api/admin/contact` | `src/app/api/admin/contact/route.ts` |
| GET | `/api/admin/games` | `src/app/api/admin/games/route.ts` |
| GET, POST, PATCH, DELETE | `/api/admin/images` | `src/app/api/admin/images/route.ts` |
| DELETE | `/api/admin/posts/[id]` | `src/app/api/admin/posts/[id]/route.ts` |
| GET | `/api/admin/posts` | `src/app/api/admin/posts/route.ts` |
| GET | `/api/admin/stats` | `src/app/api/admin/stats/route.ts` |
| GET, DELETE | `/api/admin/storage-health` | `src/app/api/admin/storage-health/route.ts` |
| GET | `/api/admin/team` | `src/app/api/admin/team/route.ts` |
| PUT | `/api/community/poll-vote` | `src/app/api/community/poll-vote/route.ts` |
| POST | `/api/contact` | `src/app/api/contact/route.ts` |
| GET | `/api/cron/daily-poll` | `src/app/api/cron/daily-poll/route.ts` |
| GET | `/api/cron/editorial-scheduler` | `src/app/api/cron/editorial-scheduler/route.ts` |
| GET | `/api/cron/generate-daily` | `src/app/api/cron/generate-daily/route.ts` |
| GET, POST | `/api/cron/release-radar-cleanup` | `src/app/api/cron/release-radar-cleanup/route.ts` |
| GET | `/api/cron/retention` | `src/app/api/cron/retention/route.ts` |
| POST | `/api/errors` | `src/app/api/errors/route.ts` |
| POST | `/api/home-engagement` | `src/app/api/home-engagement/route.ts` |
| GET | `/api/news` | `src/app/api/news/route.ts` |
| POST | `/api/newsletter` | `src/app/api/newsletter/route.ts` |
| DELETE | `/api/notifications` | `src/app/api/notifications/route.ts` |
| POST | `/api/release-hype-vote` | `src/app/api/release-hype-vote/route.ts` |
| GET, POST | `/api/telegram/set-commands` | `src/app/api/telegram/set-commands/route.ts` |
| POST, GET | `/api/telegram/webhook` | `src/app/api/telegram/webhook/route.ts` |
| POST | `/api/user/avatar` | `src/app/api/user/avatar/route.ts` |
| POST | `/api/user/banner` | `src/app/api/user/banner/route.ts` |
| GET | `/api/user/data` | `src/app/api/user/data/route.ts` |
| DELETE | `/api/user/delete` | `src/app/api/user/delete/route.ts` |
| GET, POST | `/api/user/profile` | `src/app/api/user/profile/route.ts` |
| GET | `/api/youtube/latest` | `src/app/api/youtube/latest/route.ts` |
| GET | `/assuntos/[slug]` | `src/app/assuntos/[slug]/route.ts` |
| GET | `/auth/callback` | `src/app/auth/callback/route.ts` |
| GET | `/feed.xml` | `src/app/feed.xml/route.ts` |
| GET | `/news-sitemap.xml` | `src/app/news-sitemap.xml/route.ts` |
| GET | `/sitemap.xml` | `src/app/sitemap.xml/route.ts` |

Autenticação, autorização, validação, modelos/tabelas, Server Actions e webhooks serão associados aos handlers ao longo das fases 2 e 8; esta tabela registra os exports observados, não afirma que os controles já foram validados.

### Ambiente, limites e cobertura

- `.env.local` contém nomes de variáveis de Supabase, Gemini, Groq, Telegram, e-mail, analytics, cron, preview, rate limit e backup. A URL configurada para Supabase aponta para um serviço remoto; `NEXT_PUBLIC_SITE_URL` está configurado como localhost. Os valores de credenciais não foram impressos. Testes que carreguem `.env.local`, ou qualquer fluxo com escrita, não serão executados contra esse ambiente.
- `scratch/` contém dez scripts exploratórios de chamadas de rede/provedores; foram inventariados, mas não executados. Não fazem parte de `npm test` declarado.
- Escopo de código: `src/` (243 arquivos), `supabase/functions/` (8 arquivos contando `_shared`), `supabase/migrations/` (73), `scripts/` (56), `tests/` (27), `e2e/` (1), `.github/workflows/` (2), `public/` (152) e configurações da raiz.
- Excluídos da análise de código da aplicação: `node_modules/`, `.git/`, `.next/`, `.vercel/`, `test-results/` e `tmp/` por conterem dependências, metadados ou artefatos; `.agents/`/`.codex/` e `scratch/` foram tratados como ferramentas/scripts auxiliares, com leitura limitada quando relevante. Imagens/binários serão avaliados por metadados ou amostragem, não por inspeção visual exaustiva.
- Alterações preexistentes preservadas: `src/lib/ai/editorial-images.ts`, `src/lib/ai/gemini-news.ts`, `src/lib/content-validation.ts` e `scratch/`. Não foram modificadas nesta fase.

### Plano das fases restantes

1. Fase 1: ferramentas disponíveis e compatíveis, dependências, lint/typecheck/testes somente se isolados e sem atingir serviço remoto; resultados serão validados manualmente.
2. Fases 2–3: segurança da aplicação, privacidade, IA/LLMs e integrações; revisão por handler, RLS, upload, SSRF, prompts, schemas, orçamento e webhooks.
3. Fases 4–6: lógica, dados/migrations, concorrência, performance e qualidade arquitetural.
4. Fases 7–9: UX, WCAG 2.2 AA, SEO público, responsividade e microcopy.
5. Fases 8 e 10–12: rastreamento de fluxos ponta a ponta, cobertura de testes, DevOps/observabilidade, consolidação e relatório final.

## Fase 1 — Análise automatizada (concluída)

| Comando/ferramenta | Versão/estado | Resultado |
|---|---|---|
| `npm run textcheck` | Node 24.20.0 | Exit 0; integridade textual aprovada em 402 arquivos. |
| `npm run lint` | ESLint 9.39.5 | Exit 1; três warnings e zero errors, com `--max-warnings=0`: imports não usados em `scratch/test-google-news-url.mjs:1` e `MIN_IMAGE_HEIGHT` não usado em `src/lib/ai/gemini-news.ts:207`. Candidato a achado OB-103, detalhado na consolidação. |
| `npm run typecheck -- --incremental false` | TypeScript 5.9.3 | Exit 0; evita gravar o `.tsbuildinfo` do workspace. |
| `npm test` | Node test runner 24.20.0 | Exit 0; 98 testes passaram, zero falhas/ignorados, em aproximadamente 16,3 s. A inspeção dos testes mostrou PGlite em memória e `fetch` mockado; o comando não carregou `.env.local`. |
| `npm audit --json` | npm 11.19.0 | Uma consulta completa terminou com exit 1 e alertas altos no grafo de desenvolvimento; as consultas ao registry variaram enquanto os metadados eram atualizados. `npm audit --omit=dev --json` terminou com exit 0 e zero vulnerabilidades. As entradas lidas eram dependências de tooling (ESLint, shadcn e dependências transitivas); não demonstram caminho explorável no runtime. Não foi promovido alerta automatizado isolado a vulnerabilidade confirmada. Uma repetição ao registry ficou sem resposta por cerca de 40 s e foi cancelada. |
| Gitleaks | Não instalado | Não executado. Fallback regex estático atual: zero candidatos em arquivos não ignorados; valores não foram emitidos. Histórico Git em todas as refs: 11 correspondências heurísticas em commits antigos, incluindo chaves Google/JWT; coincidem com áreas já discutidas em OB-01/OB-05, e validade/uso externo permanecem NÃO VERIFICADOS. `.env.local` é ignorado por `.gitignore:38` e não foi impresso. |
| OSV-Scanner / Semgrep | Não instalados | Não executados; nenhum pacote foi baixado para o workspace. |
| Knip / Madge | Ausentes em `node_modules/.bin` | Não executados; não foi usado `npx` que pudesse instalar dependências durante a auditoria. |
| Build / Playwright E2E / Lighthouse | E2E e Lighthouse indisponíveis/condicionados | Build não executado porque `next build` escreve em `.next`; E2E não executado porque o `webServer` carrega configuração local com Supabase remoto e o Playwright escreve `test-results`; nenhuma validação dinâmica contra serviços remotos foi iniciada. Lighthouse não está instalado. |

O erro do lint foi conferido manualmente contra os arquivos apontados. O escopo atual inclui alterações locais ainda não commitadas; assim, os três avisos não são atribuídos ao último commit sem comparação adicional. Nenhum arquivo do projeto além de `AUDITORIA.md` foi alterado pelas ferramentas.

## Fase 2 — Segurança (concluída)

### Cobertura e controles confirmados

- Revisados os 35 Route Handlers, o `src/proxy.ts`, as sete Edge Functions, `supabase/config.toml`, migrações de RLS/grants e os fluxos de conta, exportação, upload e moderação. O proxy protege páginas `/admin`, mas o matcher exclui `/api`; os handlers administrativos encontrados repetem validação de bearer, `auth.getUser()` e `app_metadata.is_admin`. Os crons usam `isAuthorizedCronRequest`, que exige segredo com pelo menos 16 caracteres e comparação em tempo constante.
- O service role aparece nos handlers de servidor. Nas rotas de usuário lidas, consultas são limitadas ao `user.id`, exceto a exportação de reações/visualizações anônimas por `device_id` (`OB-59`, já documentado e revalidado abaixo). O controle de acesso por MFA/AAL2 não aparece no código (`rg aal|aal2|mfa` sem ocorrências em `src/` e migrations); a política remota do Supabase não foi consultada nesta rodada.
- A busca por SQL dinâmico, execução de comandos, `eval`, `new Function`, `innerHTML` e equivalentes não encontrou uso em rotas do produto. Os `dangerouslySetInnerHTML` encontrados são JSON-LD; homepage/layout escapam `<`, mas a página de jogo não o faz. A fonte do título do jogo é administrada pelo backend, portanto não foi demonstrado caminho de entrada não privilegiado e não abri achado de XSS.
- `src/lib/server/network.ts` resolve DNS, rejeita endereços reservados, fixa o IP escolhido na conexão, revalida cada redirect e oferece leitura limitada por bytes. As imagens de perfil são reprocessadas por `sharp` com limite de pixels; o limite de 4 MiB é aplicado depois de `request.formData()`, e o limite de corpo efetivo da plataforma não foi verificado.
- A política CSP atual usa nonce em `script-src`, `object-src 'none'`, `frame-ancestors 'none'` e `base-uri 'self'`; os cabeçalhos adicionais estão em `next.config.ts`. Rotas de contato, newsletter, voto comunitário, notificações e exclusão validam origem ou metadados Fetch quando aplicável. As chaves atuais não foram lidas. O fallback de varredura no checkout não encontrou candidato secreto em arquivos não ignorados; onze candidatos heurísticos no histórico permanecem associados às exposições anteriores OB-01/OB-05, com validade atual NÃO VERIFICADA.
- Integrações de analytics só são carregadas após consentimento aceito (`src/components/ui/Analytics.tsx:27-44,59-64`). A política canônica `/privacidade` define direitos e retenção observados; a rota institucional antiga agora tem redirect permanente para a política canônica (`next.config.ts:55`). O art. 18 da LGPD inclui acesso, correção e eliminação em hipóteses previstas; este relatório aponta lacunas técnicas, sem concluir conformidade jurídica. Referência: [Lei nº 13.709/2018, art. 18](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm).
- O exportador continua permitindo que a sessão autenticada escolha um `device_id` local para recuperar eventos anônimos sem vínculo com `user.id`; a limitação de navegador compartilhado/identificador conhecido foi confirmada no código atual (OB-59, severidade média).

### Achados desta fase

- **Esforço estimado:** G
# **[OB-103] A API de perfil contorna a validação de cosméticos desbloqueados**

- **Categoria:** Segurança
- **Severidade:** Baixa
- **Confiança:** Alta
- **Status:** CONFIRMADO
- **Tipo de evidência:** Estática
- **CVSS estimado:** 4.3 (estimativa CVSS 3.1; impacto limitado à própria conta)
- **Localização:** `src/app/api/user/profile/route.ts:177-184`; `supabase/migrations/20260728000000_profile_cosmetics.sql:21-30`; `src/app/configuracoes/perfil/page.tsx:451-455`.

- **Evidência:**

```ts
if (body.selectedTheme !== undefined || body.selectedTitle !== undefined || body.selectedFrame !== undefined) {
  await service
    .from("profiles")
    .update({
      profile_theme: body.selectedTheme || "default",
      equipped_title: body.selectedTitle || null,
      equipped_frame: body.selectedFrame || null,
    })
    .eq("user_id", user.id);
```

```sql
where user_reward.user_id = current_id
  and reward.slug = target_title_slug
  and reward.type = 'title'
  and (user_reward.expires_at is null or user_reward.expires_at > now());
if selected_title is null then raise exception 'Título não desbloqueado'; end if;
```

```ts
await supabase.rpc("set_profile_cosmetics", {
  target_title_slug: selectedTitle || null,
  target_frame_slug: selectedFrame || null,
  target_theme_slug: selectedTheme,
});
```

- **Descrição:** O endpoint autenticado grava diretamente os campos de cosméticos com credencial privilegiada, sem consultar `user_rewards`. A função SQL chamada pelo cliente contém essa validação, mas a atualização privilegiada já ocorreu e seu erro também é ignorado na interface. A exploração permite alterar apenas o próprio perfil.

- **Mitigações verificadas:** A sessão é validada e a atualização da tabela `profiles` filtra `user_id` pelo usuário autenticado; isso impede editar o perfil de outra conta. A migration `20260728000000_profile_cosmetics.sql:21-61` valida propriedade, tipo e validade do prêmio no RPC, porém a escrita direta do endpoint não passa por essa função.

- **Impacto:** Uma conta autenticada pode equipar título, moldura ou tema que não desbloqueou, enfraquecendo a integridade da progressão e dos itens cosméticos. Não concede acesso administrativo nem altera dados de outras contas.

- **Como verificar/reproduzir com segurança:** Em staging, use conta sem uma recompensa e envie `POST /api/user/profile` com um slug conhecido em `selectedTitle`, `selectedFrame` ou `selectedTheme`. Consulte o perfil dessa mesma conta e compare com `user_rewards`; não faça a verificação em produção.

- **Solução recomendada:** Remover esses três campos da escrita privilegiada do endpoint e persistir cosméticos exclusivamente pelo RPC autenticado que valida `auth.uid()` e a propriedade do prêmio. Propagar o objeto `error` do RPC antes de exibir sucesso.

- **Exemplo corrigido:**

```ts
const { error: cosmeticsError } = await supabase.rpc("set_profile_cosmetics", {
  target_title_slug: selectedTitle || null,
  target_frame_slug: selectedFrame || null,
  target_theme_slug: selectedTheme,
});
if (cosmeticsError) setMessage("Não foi possível equipar estes itens.");
```

- **Esforço estimado:** P

# **[OB-104] Avatar externo controlado pelo usuário é carregado por visitantes do Brickboard**

- **Categoria:** Segurança
- **Severidade:** Média
- **Confiança:** Alta
- **Status:** CONFIRMADO
- **Tipo de evidência:** Estática
- **CVSS estimado:** 4.4 (estimativa CVSS 3.1)
- **Localização:** `src/app/api/user/profile/route.ts:150-161`; `src/lib/avatar.ts:42-47`; `src/components/community/BrickCard.tsx:340-350`; `src/lib/hooks/useCommunityFeed.ts:226-240`.

- **Evidência:**

```ts
const durableAvatarUrl = (body.avatarUrl || "").trim() || getGoogleAvatarUrl(user) || null;
const { error: upsertError } = await service
  .from("profiles")
  .upsert({
    user_id: user.id,
    nickname: displayName,
    display_name: displayName,
    username: normalizedUser,
    bio: (body.bio || "").trim() || null,
    avatar_url: durableAvatarUrl,
```

```ts
if (
  raw.startsWith("https://") ||
  raw.startsWith("/")
) {
  return raw;
}
```

```tsx
const avatarSrc = resolveAvatarUrl(post.author_avatar, post.author_name, post.is_official);
<img loading="lazy" decoding="async"
  src={avatarSrc}
  alt={post.author_name}
  onError={(e) => { (e.target as HTMLImageElement).src = resolveAvatarUrl(null, post.author_name, post.is_official); }}
```

- **Descrição:** O endpoint aceita `avatarUrl` arbitrária do corpo da requisição e a salva sem restringir host à foto Google ou ao Storage da conta. O fluxo do Brickboard copia esse valor para `author_avatar`; cartões públicos o carregam em `<img>`. Uma conta pode, portanto, fazer navegadores de visitantes solicitarem um recurso HTTPS de domínio que ela controla. Não é SSRF: a requisição sai do navegador do visitante.

- **Mitigações verificadas:** A UI normal oferece upload processado pelo servidor ou foto do Google, e `next/image` usa `remotePatterns`; porém o cartão do Brickboard usa `<img>` direto e `resolveAvatarUrl` aceita qualquer URL HTTPS. A CSP permite imagens HTTPS. Não há allowlist no endpoint de perfil.

- **Impacto:** O host escolhido pode receber IP, user-agent e horário dos visitantes que veem o Brick, permitindo rastreamento externo e transferência de dados de navegação sem relação necessária com o portal.

- **Como verificar/reproduzir com segurança:** Em staging, configure um endpoint HTTPS de teste controlado pela equipe como `avatarUrl`, publique um Brick com uma conta de teste e abra o feed em outro navegador. Confirme que o endpoint recebe a solicitação; não use domínio de terceiros nem registre visitantes reais.

- **Solução recomendada:** Aceitar somente URLs de Storage pertencentes ao caminho da própria conta e hosts exatos de avatar de identidade confiável; rejeitar qualquer outro host no servidor. Aplicar `referrerPolicy="no-referrer"` nos elementos de imagem como proteção adicional, sabendo que isso não oculta o IP do visitante.

- **Exemplo corrigido:**

```ts
const avatar = new URL(body.avatarUrl || getGoogleAvatarUrl(user) || "https://invalid.local");
const supabaseOrigin = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).origin;
const ownedStoragePath = `/storage/v1/object/public/profile-images/${user.id}/`;
const ownedImage = avatar.origin === supabaseOrigin && avatar.pathname.startsWith(ownedStoragePath);
const googleImage = avatar.hostname === "lh3.googleusercontent.com";
if (!ownedImage && !googleImage) return NextResponse.json({ error: "Avatar inválido" }, { status: 400 });
```

- **Esforço estimado:** P

### Revalidação de achados anteriores e limites desta fase

- OB-07 (duas políticas de privacidade): corrigido no checkout pelo redirect `/institucional/privacidade` → `/privacidade`; deployment atual não foi consultado.
- OB-13 (asserção sem schema de saída): corrigido no checkout; `parseEditorialGeminiOutput` valida estrutura, campos, enumerações e URLs.
- OB-17 (CSP com `unsafe-inline` em scripts): corrigido no checkout; `script-src` usa nonce e não inclui `unsafe-inline` em produção.
- OB-59: confirmado novamente nas linhas atuais de exportação; seu impacto permanece restrito ao identificador de dispositivo disponível no navegador compartilhado ou obtido previamente.
- OB-25/OB-26 (origem visual e contagem de fontes): houve controles locais novos, mas os limites remanescentes são detalhados nas fases 3 e achados OB-105/OB-108.
- OB-31, OB-01/OB-05, OB-02/OB-04/OB-23 e OB-95/OB-96: não foram reconsultados sistemas remotos nem lidos valores de secrets. Os estados de MFA, validade/rotação, schema/backup, CORS implantado, flag de login anônimo e grants remotos ficam NÃO VERIFICADOS nesta rodada; os registros históricos permanecem preservados acima.

**Progresso da fase 2:** rotas sensíveis, sessão, autorização, headers, injeção, uploads, SSRF, CSRF, segredos e tratamentos de dados pessoais foram analisados estaticamente. Nenhuma chamada a serviços remotos, sessão real ou mutação foi executada. Fase 3 — IA, LLMs e integrações externas — iniciada em seguida.

## Fase 3 — IA, LLMs e integrações externas (concluída)

### Escopo e controles revisados

- Aplicado o [OWASP Top 10:2025 para aplicações web](https://top10.owasp.org/2025/0x00_2025-Introduction/) e o [OWASP Top 10 for LLM Applications:2025](https://genai.owasp.org/resource/owasp-top-10-for-llm-applications-2025/) como referência, com foco em prompt injection, saída não confiável, cadeia de provedores e custos.
- O texto público obtido de RSS/páginas externas e os temas são serializados em JSON; o system prompt instrui o modelo a tratar esses valores como dados não confiáveis. As respostas passam por schema e enumeração em `parseEditorialGeminiOutput`; não encontrei saída do modelo executada como SQL, shell, HTML bruto ou ferramenta. A influência semântica sobre o texto continua possível, mas não foi demonstrada como execução de ação privilegiada; OB-12 permanece como risco potencial, sem duplicar os achados específicos de fonte/citação abaixo.
- O pipeline estabelece prazo global de geração de 150 s, limite de chamada de 35 s, máximo declarado de 4.500 tokens de saída e timeout/cancelamento para os fetches. Gemini tenta dois modelos e Groq tem até duas tentativas. Não há teto de gasto do provedor independente dos slots e do segredo de cron; o estado remoto do lock permanece NÃO VERIFICADO.
- A geração normal escolhe uma pauta de feed e extrai uma página; a busca Google do Gemini está desligada (`useSearch = false`), e o fallback Groq retorna lista de fontes vazia. As fontes estruturadas podem, portanto, depender do URL fornecido pelo próprio modelo. A página oficial usada para obter imagens não prova automaticamente que o texto sustenta a alegação.
- A URL de `quote_source_url` não entra no conjunto de páginas buscadas para texto/citações. A validação verifica HTTPS, nome, cargo e presença textual da fala, mas não consulta a página para confirmar citação, pessoa ou contexto.
- Telegram: o webhook compara o header secreto em tempo constante; `update_id` existe no tipo, mas não encontrei persistência ou deduplicação antes de `handleTelegramWebhook`. Reentrega pode repetir geração ou ação administrativa; OB-28 segue válido no código local. Não enviei webhook nem chamadas ao Telegram.
- O helper `fetchValidatedRemote` cobre SSRF de URLs públicas fornecidas ao gerador; o conteúdo recuperado é limitado a 2 MiB e as chamadas têm prazo. Nenhuma chamada a Gemini, Groq, Steam, YouTube ou Telegram foi executada nesta fase para evitar custo, publicação ou efeitos externos.

### Achados desta fase

# **[OB-105] A homepage oficial sintética satisfaz o gate de fonte para publicação automática**

- **Categoria:** Segurança-IA
- **Severidade:** Média
- **Confiança:** Alta
- **Status:** CONFIRMADO
- **Tipo de evidência:** Dinâmica
- **CVSS estimado:** N/A
- **Localização:** `src/lib/ai/gemini-news.ts:1519-1526`; `src/lib/server/editorial-publication.ts:33-36`; `src/app/api/cron/generate-daily/route.ts:121-125`.

- **Evidência:**

```ts
const publisherCount = independentEditorialPublisherCount(result.sources);
const officialSource = result.sources.some((source) => isOfficialEditorialSource(source.url));
if (publisherCount < 3 && !officialSource) {
  blockers.push("Menos de três editoras independentes confirmadas.");
}
```

```ts
if (publisherCount < 3 && !hasOfficialSource) {
  const resolvedPublisher = resolveOfficialPublisherSource(rawTitle) || resolveOfficialPublisherSource(scopeContext);
  if (resolvedPublisher && !sources.some((s) => s.url === resolvedPublisher.url)) {
    sources.push(resolvedPublisher);
  }
}
```

```ts
const { data: publishedPost, error: publicationError } = await supabase.from("posts")
  .update({ is_published: true, published_at: now, updated_at: now })
  .eq("id", result.post.id).eq("is_published", false).select("id").maybeSingle();
```

- **Descrição:** Quando há menos de três editoras e nenhuma fonte reconhecida, o gerador insere a homepage canônica do publisher como `is_official: true`; esse URL não é uma página de notícia nem foi consultado como evidência textual. O gate conta qualquer URL do domínio oficial como fonte suficiente. Em reprodução local isolada, um rascunho sintético com apenas `https://www.nintendo.com` como fonte oficial recebeu `[]` de blockers. Se o restante do gate passar, o cron marca a matéria como publicada. A autorização de publicação automática existe no `AGENTS.md`; o achado é a verificação insuficiente da apuração, não a existência do cron.

- **Mitigações verificadas:** URLs passam por parsing HTTPS, o código identifica domínios oficiais e imagens passam por seleção/análise visual e hash. Esses controles verificam sintaxe, domínio e pixels, não a relação entre página citada e afirmações do corpo. Não executei geração real nem publiquei conteúdo.

- **Impacto:** Uma matéria pode ser publicada sem três fontes independentes nem comunicado/página oficial específica que sustente a pauta; isso aumenta risco de informação incorreta e dano de confiança editorial.

- **Como verificar/reproduzir com segurança:** A reprodução feita chamou `editorialPublicationBlockers` com fixture sintética local e uma fonte `https://www.nintendo.com`; o resultado foi uma lista vazia. Reproduzir em teste isolado com fonte homepage e outra com URL específica e conteúdo incompatível; não acionar o cron real.

- **Solução recomendada:** Remover a inclusão automática de homepages. Exigir URL de publicação específica recuperada com sucesso e validação independente de que a página sustenta a alegação central; sem prova suficiente, adicionar blocker e conservar como rascunho.

- **Exemplo corrigido:**

```ts
const verifiedSources = sources.filter((source) => fetchedSourceUrls.has(source.url));
const hasVerifiedOfficialSource = verifiedSources.some((source) => isOfficialEditorialSource(source.url));
if (publisherCount < 3 && !hasVerifiedOfficialSource) blockers.push("Fontes específicas insuficientes.");
```

- **Esforço estimado:** M

# **[OB-106] A fala atribuída é aceita sem conferir a página citada**

- **Categoria:** Segurança-IA
- **Severidade:** Média
- **Confiança:** Alta
- **Status:** CONFIRMADO
- **Tipo de evidência:** Dinâmica
- **CVSS estimado:** N/A
- **Localização:** `src/lib/ai/gemini-news.ts:1439-1454`; `src/lib/content-validation.ts:240-241`; `src/lib/ai/editorial-output.ts:171-178`.

- **Evidência:**

```ts
if (quoteText && quoteAuthor && quoteRole && quoteSourceUrl.startsWith("https://")) {
  const fullText = `${introText}\n${devText}\n${conclusionText}`;
  if (!fullText.includes(quoteText)) {
    devText = `${devText}\n\n> "${quoteText}" — destacou ${quoteAuthor}, ${quoteRole}.\n`;
  }
  featuredQuote = {
    text: quoteText,
    author: quoteAuthor,
    role: quoteRole,
    source_url: quoteSourceUrl,
```

```ts
if (metadata.quote?.text && (!metadata.quote.author.trim() || !metadata.quote.role.trim() || !isValidHttpsUrl(metadata.quote.sourceUrl))) errors.push("A fala em destaque precisa de nome, cargo e URL HTTPS da fonte.");
if (metadata.quote?.text && !articleText.includes(metadata.quote.text.trim())) errors.push("Inclua no corpo a fala registrada nos metadados, com atribuição e contexto.");
```

- **Descrição:** A URL é aceita por começar com `https://` e ser sintaticamente válida; o código pode inserir a fala que veio do modelo no corpo mesmo se não estava na matéria. A validação final só confirma autor/cargo/URL e repetição no texto. Em reprodução local, o parser aceitou uma fala inventada com URL HTTPS `example.invalid`, sem buscar página alguma. O prompt exige fidelidade, mas não fornece prova independente ao gate.

- **Mitigações verificadas:** Há instrução de só retornar citação oficial comprovada, schema tipado, validação de URL e regra para registrar ausência. Não encontrei fetch da URL de citação, comparação do texto com fonte primária ou revisão obrigatória específica da fala antes do publish.

- **Impacto:** Uma fala falsa ou fora de contexto pode ser atribuída publicamente a pessoa identificada e alcançar publicação agendada quando os demais blockers forem satisfeitos.

- **Como verificar/reproduzir com segurança:** A reprodução local chamou `parseEditorialGeminiOutput` com fala sintética, autor fictício e URL HTTPS `.invalid`; o parser retornou a fala. Testar a validação do gate em fixture local. Não usar pessoa ou matéria real.

- **Solução recomendada:** Buscar e conferir a página de origem da fala, validar que o texto/trecho corresponde à declaração e registrar pessoa, cargo e contexto. Se essa prova não existir, exigir `absence_registered: true` e não preencher citação.

- **Exemplo corrigido:**

```ts
const quotePage = await fetchQuoteSource(quoteSourceUrl);
if (!quotePage || !quotePage.includes(quoteText)) throw new Error("A fala não foi confirmada na fonte indicada.");
```

- **Esforço estimado:** M

# **[OB-107] Texto genérico sem fonte é acrescentado para atingir a contagem mínima**

- **Categoria:** Segurança-IA
- **Severidade:** Média
- **Confiança:** Alta
- **Status:** CONFIRMADO
- **Tipo de evidência:** Estática
- **CVSS estimado:** N/A
- **Localização:** `src/lib/ai/gemini-news.ts:1184-1200,1434-1436,1552-1558`.

- **Evidência:**

```ts
if (currentCount < 750) {
  const additionalAnalysis = `\n\n## Impacto no Mercado e Expectativas da Comunidade\n\nA repercussão em torno de ${subject} marca um momento estratégico para a indústria de videogames. Desdobramentos dessa relevância moldam decisões editoriais, redefinem os calendários de lançamentos das principais distribuidoras e elevam o nível de exigência dos jogadores quanto a acabamento técnico, estabilidade de desempenho e profundidade de conteúdo. Analistas do setor e desenvolvedores independentes observam com atenção as próximas divulgações oficiais, que deverão detalhar cronogramas de atualizações, fases de testes abertos e diretrizes de suporte para a comunidade nas plataformas suportadas. O debate agora se volta para a capacidade das produtoras em atender às expectativas geradas e sustentar o engajamento ao longo dos próximos meses.`;
  currentDev = `${currentDev}${additionalAnalysis}`;
}
```

- **Descrição:** Sempre que a matéria gerada fica abaixo de 750 palavras, o código injeta parágrafo editorial fixo com afirmações sobre analistas, desenvolvedores e divulgações futuras, sem derivá-las da fonte ou registrar citação. A contagem é recalculada depois; o texto artificial pode satisfazer o limite usado pelo gate de publicação.

- **Mitigações verificadas:** O prompt pede 800–950 palavras, proíbe números sem fonte e o gate bloqueia abaixo de 750; esses controles não validam a origem do parágrafo que o próprio código acrescenta. Não há conteúdo editorial dinâmico de terceiros nesse bloco.

- **Impacto:** A automação pode apresentar inferências genéricas como apuração e ampliar uma matéria curta com contexto sem sustentação, afetando precisão e confiança.

- **Como verificar/reproduzir com segurança:** Fornecer à função pura `ensureWordCountRange` texto de menos de 750 palavras e conferir o parágrafo anexado. Não chamar provedores nem persistir artigo.

- **Solução recomendada:** Remover preenchimento automático. Se o material não sustentar o tamanho exigido, salvar como rascunho com blocker editorial; qualquer desenvolvimento adicional deve vir acompanhado de fatos e fontes.

- **Exemplo corrigido:**

```ts
const blocks = buildEditorialBlocks(parsed);
const wordCount = countWords(blocks);
if (wordCount < 750) blockers.push("A apuração não sustenta a extensão mínima.");
```

- **Esforço estimado:** P

# **[OB-108] CDNs compartilhadas são tratadas como origem editorial confiável**

- **Categoria:** Bug
- **Severidade:** Média
- **Confiança:** Alta
- **Status:** CONFIRMADO
- **Tipo de evidência:** Dinâmica
- **CVSS estimado:** N/A
- **Localização:** `src/lib/ai/editorial-images.ts:11-16,36-44`; `src/lib/ai/gemini-news.ts:382`; `src/lib/server/editorial-publication.ts:39-44`.

- **Evidência:**

```ts
  "hoyoverse.com", "mihoyo.com", "akamaized.net", "akamaihd.net", "ctfassets.net", "cloudfront.net", "fastly.net",
```

```ts
return isOfficialEditorialSource(value)
  || ASSET_DOMAINS.some((domain) => url.hostname === domain || url.hostname.endsWith(`.${domain}`));
```

```ts
if (usedImageUrls.has(url) || (!isAllowedEditorialImageUrl(url) && !(officialPage && isOfficialEditorialSource(officialPage)))) return null;
```

- **Descrição:** A lista passou a aceitar hostnames genéricos multi-tenant de CDN sem exigir que a URL da imagem tenha sido encontrada em uma página oficial. Reprodução local de `https://tenant.cloudfront.net/image.jpg` retornou `true` em `isAllowedEditorialImageUrl`. O gate de publicação usa a mesma função para tratar a origem como evidência. A análise visual de pixels confirma aparência/assunto declarado pelo modelo, mas não identifica o proprietário do bucket nem o licenciamento.

- **Mitigações verificadas:** Há lista de domínios oficiais, hash de bytes, análise visual com exigência de confiança e associação de algumas imagens a páginas oficiais consultadas. Esses controles se aplicam quando existe `officialPage`; os domínios genéricos passam diretamente pela allowlist.

- **Impacto:** A automação pode armazenar e publicar imagem de origem não oficial ou não autorizada, apesar de a matéria afirmar ter evidência de origem. A consequência primária é editorial/licenciamento, não acesso ao servidor.

- **Como verificar/reproduzir com segurança:** A reprodução local chamou apenas `isAllowedEditorialImageUrl("https://tenant.cloudfront.net/image.jpg")` e obteve `true`; não houve download. Repetir para cada CDN compartilhada e domínio específico autorizado.

- **Solução recomendada:** Remover domínios multi-tenant genéricos da allowlist direta. Aceitar esses hostnames somente quando a URL exata estiver ligada a uma página oficial consultada e a evidência dessa relação acompanhar o registro até o gate de publicação.

- **Exemplo corrigido:**

```ts
const fromApprovedDomain = isOfficialEditorialSource(value) || ASSET_DOMAINS.some((domain) =>
  url.hostname === domain || url.hostname.endsWith(`.${domain}`),
);
const fromOfficialPage = Boolean(officialPage && isOfficialEditorialSource(officialPage));
if (!fromApprovedDomain && !fromOfficialPage) return null;
```

- **Esforço estimado:** P

### Revalidação de achados anteriores e limites desta fase

- OB-12 segue POTENCIAL: o conteúdo externo é delimitado em JSON e não aciona ferramentas, mas ainda pode influenciar semanticamente o texto. Nenhuma exploração de prompt injection foi feita contra provedores reais.
- OB-14 (orçamento sem prazo/limite de saída): corrigido no checkout por deadline global, timeout por requisição, limite de tokens e tentativas definidas.
- OB-25 permanece parcialmente mitigado: as imagens passam por origem, pixels, hash e alt/caption, mas OB-108 demonstra que alguns hosts aceitos não provam origem oficial.
- OB-26 (subdomínios contados como editoras independentes): corrigido localmente por `editorialPublisherId`, que agrupa domínios reconhecidos e registráveis.
- OB-28 revalidado: o header secreto do Telegram é comparado em tempo constante, mas `update_id` não é usado para idempotência; uma reentrega pode repetir geração/efeito administrativo. O comportamento remoto do webhook não foi acionado.

**Progresso da fase 3:** prompt, schema, provedores, grounding, citações, chamadas externas, imagens, orçamento e webhook foram revisados. Duas reproduções sem rede comprovaram aceitação de homepage oficial sem matéria e URL de citação sem evidência; nenhuma publicação ou chamada paga foi executada. Fase 4 — bugs e lógica — iniciada em seguida.

## Fase 4 — Bugs e lógica (concluída)

### Fluxos, estados e falhas revisados

- Revisados timezone do cron (`America/Sao_Paulo`), seletores/paginação de feed, publicação agendada, troca de votos do Radar, edição de perfil, criação/exclusão de conta, upload de imagens, parsing de RSS/JSON e migrações de identidade/progressão.
- `claimEditorialSlot` usa insert único e compare-and-set quando `bot_state` existe. Quando a relação está ausente, o fallback atual retorna sucesso em vez de falhar fechado; duas chamadas concorrentes com erro `PGRST205` foram reproduzidas em memória e ambas receberam `true`. O cron segue até gerar e publicar. OB-102 foi corrigido quanto ao HTTP 500, mas o fallback abriu a condição descrita em OB-109.
- A rota nova de voto no Radar apaga a linha anterior e insere a nova em duas chamadas separadas. Também ignora o erro da RPC agregada e devolve contagens iniciadas em zero junto com `success: true`. A migration garante unicidade por usuário/lançamento e RLS filtra o próprio usuário, mas não torna as duas etapas atômicas.
- Os caminhos de datas analisados usam datas ISO e `Intl.DateTimeFormat` com o fuso `America/Sao_Paulo`; não encontrei conversão financeira/ponto flutuante nessa feature. Não injetei falhas em banco remoto. A suíte de 98 testes cobre helpers e migrações, mas não tem teste de rota para a transação/erro de `release-hype-vote`.

### Achados desta fase

# **[OB-109] Falta de `bot_state` libera execuções concorrentes do cron editorial**

- **Categoria:** Bug
- **Severidade:** Média
- **Confiança:** Alta
- **Status:** POTENCIAL
- **Tipo de evidência:** Dinâmica
- **CVSS estimado:** N/A
- **Localização:** `src/lib/server/editorial-slot.ts:28-35`; `src/app/api/cron/generate-daily/route.ts:40-45,101-110,121-125`; `tests/editorial-slot.test.ts:98-109`.

- **Evidência:**

```ts
  try {
    existing = await store.readSlot(key);
  } catch (error) {
    if (isMissingPostgrestRelation(error)) return true;
    throw error;
  }
```

```ts
const claimed = await claimEditorialSlot(editorialSlotStore(supabase), slotKey);
if (!claimed) {
  return NextResponse.json({ ok: true, skipped: true, reason: "Horário já processado ou em andamento" });
}
const result = await generateNewsDraft();
```

```ts
.update({ is_published: true, published_at: now, updated_at: now })
.eq("id", result.post.id).eq("is_published", false).select("id").maybeSingle();
if (publicationError || !publishedPost) throw publicationError || new Error("Publicação não confirmada pelo banco.");
```

- **Descrição:** Se PostgREST reportar que `bot_state` não existe, `claimEditorialSlot` devolve `true` sem lock persistente. A implementação em `setSlotState` também apenas registra erro e continua. Reprodução local isolada do helper, com store que lança `PGRST205`, retornou `[true,true]` para duas chamadas concorrentes ao mesmo slot. O caminho pode então gerar dois posts e publicá-los. A migration cria `bot_state`. Nesta revalidação, a relação respondeu HTTP 200 a uma consulta sem linhas no projeto remoto; por isso a pré-condição de ausência não foi observada no ambiente consultado.

- **Mitigações verificadas:** Com a tabela disponível, `insertRunningSlot` trata conflito de chave e `compareAndSetSlot` condiciona a transição ao estado/horário esperado; a migration declara chave única. Essas mitigações não operam no fallback de relação ausente. O teste `tests/editorial-slot.test.ts:98-109` afirma como sucesso o retorno `true` quando a relação falta.

- **Impacto:** Um deployment sem a migration pode aceitar invocações simultâneas/reentregues para o mesmo horário, duplicando publicação e consumo de provedores de IA. A ocorrência do cenário condicional no ambiente remoto atual não foi demonstrada; a relação respondeu HTTP 200 no teste sem leitura de linhas.

- **Como verificar/reproduzir com segurança:** Executado sem rede: um `EditorialSlotStore` em memória cujo `readSlot()` lança `{code:"PGRST205"}` recebeu duas chamadas com `Promise.all`; saída `[true,true]`. Para validar deployment, usar staging sem a migration e dois requests concorrentes autenticados; não chamar o cron de produção.

- **Solução recomendada:** Falhar fechado quando a relação/lock não estiver disponível e manter publicação automática bloqueada até a migration ser confirmada no destino. Alternativamente implementar claim atômico em mecanismo persistente cuja disponibilidade seja requisito do deployment.

- **Exemplo corrigido:**

```ts
  } catch (error) {
    if (isMissingPostgrestRelation(error)) throw new Error("Lock editorial indisponível.");
    throw error;
  }
```

- **Esforço estimado:** P

### Revalidação remota segura em 05/10/2026

A relação ot_state respondeu HTTP 200 com limit=0; nenhuma linha foi lida. O caminho fail-open foi reproduzido apenas com store em memória que simula PGRST205.

`	ext
GET /rest/v1/bot_state?select=key&limit=0 -> HTTP 200; sem linhas lidas
`

# **[OB-110] Falhas na troca de voto podem apagar a escolha e devolver contagem falsa**

- **Categoria:** Bug
- **Severidade:** Média
- **Confiança:** Alta
- **Status:** CONFIRMADO
- **Tipo de evidência:** Estática
- **CVSS estimado:** N/A
- **Localização:** `src/app/api/release-hype-vote/route.ts:38-69`; `supabase/migrations/20260725000000_release_hype_meter.sql:1-11`.

- **Evidência:**

```ts
await serviceClient
  .from("release_hype_votes")
  .delete()
  .eq("release_id", releaseId)
  .eq("user_id", user.id);
```

```ts
const { error: insertError } = await serviceClient
  .from("release_hype_votes")
  .insert({ release_id: releaseId, user_id: user.id, vote_type: vote });
if (insertError) {
  return NextResponse.json({ error: "Erro ao registrar voto." }, { status: 500 });
}
```

```ts
const { data: countData } = await serviceClient.rpc("get_release_hype_counts");
const counts = { buy: 0, watch: 0, skip: 0 };
for (const row of (countData || []) as Array<{ release_id: string; vote_type: "buy" | "watch" | "skip"; vote_count: number }>) {
  if (row.release_id === releaseId) counts[row.vote_type] = Number(row.vote_count);
}
return NextResponse.json({ success: true, releaseId, userVote: vote, counts });
```

- **Descrição:** A mudança de voto executa `DELETE` seguido de `INSERT`, sem transação e sem conferir o erro do `DELETE`; se a inserção falhar depois da remoção, a escolha anterior é perdida. Depois da gravação, o erro da RPC de contagem também é ignorado e a rota pode responder sucesso com todos os contadores em zero.

- **Mitigações verificadas:** A rota exige usuário autenticado, restringe o delete ao próprio `user.id`, valida `vote` contra três valores e a tabela tem `unique (release_id, user_id)` com foreign keys para release e usuário. Isso evita voto de outra conta e linhas duplicadas, mas não evita estado intermediário nem corrige falha da leitura de contagens.

- **Impacto:** Uma falha transitória pode remover o voto anterior ou mostrar contagem zero como se fosse válida, prejudicando a consistência do Radar. O escopo é a feature secundária de votação.

- **Como verificar/reproduzir com segurança:** Em teste isolado, faça o stub do `DELETE` retornar sucesso e o `INSERT` falhar; verifique que a rota retorna 500 depois de remover a linha. Em outro caso, faça a gravação passar e a RPC agregada falhar; confirme que a resposta atual mantém `success: true` e contadores zero. Não injete falhas em produção.

- **Solução recomendada:** Trocar/registrar o voto em operação atômica, por upsert com conflito `(release_id,user_id)` ou RPC transacional. Conferir cada erro e não retornar contagens zeradas se a agregação falhar.

- **Exemplo corrigido:**

```ts
const { error } = await serviceClient.from("release_hype_votes").upsert(
  { release_id: releaseId, user_id: user.id, vote_type: vote },
  { onConflict: "release_id,user_id" },
);
if (error) return NextResponse.json({ error: "Erro ao registrar voto." }, { status: 500 });
```

- **Esforço estimado:** P

**Progresso da fase 4:** bugs de concorrência e consistência foram reproduzidos apenas com doubles em memória ou analisados estaticamente; nenhuma operação em banco foi executada. Fase 5 — performance — iniciada em seguida.

## FASE 5 — PERFORMANCE — 05/10/2026

### Backend e consultas

- **OB-06 permanece confirmado no caminho de reação:** `supabase/functions/toggle-reaction/index.ts:60-70` seleciona todas as reações de uma matéria e soma as linhas em memória. A página de detalhe também repete esse padrão em `src/app/posts/[slug]/page.tsx:37-47`, apesar de existir RPC agregadora usada pelo handler de estatísticas. A paginação/limite efetivo do projeto Supabase hospedado não foi consultado. O risco aparece quando o volume excede o limite de linhas retornadas.
- **OB-74 permanece provável:** `src/app/api/cron/release-radar-cleanup/route.ts:40-43` carrega todos os lançamentos vencidos em uma consulta sem cursor nem lote. Quantidade atual e `api.max_rows` remoto são **NÃO VERIFICADOS**.
- **OB-75 permanece confirmado:** `src/app/api/cron/release-radar-cleanup/route.ts:47-51` descarta o resultado da exclusão em `editorial_images` e continua a rotina.
- **OB-84 permanece confirmado:** os endpoints XML continuam aceitando dados nulos ou engolindo falhas de consulta; `src/app/sitemap.xml/route.ts:27-55` retorna a estrutura estática se consultas dinâmicas falharem. A consulta de lançamentos ativos no sitemap também não pagina; o volume atual não foi medido.
- O feed comunitário usa páginas de 50, bloqueio de chamadas simultâneas e limpeza do intervalo em `src/lib/hooks/useInfiniteFeed.ts:9-11,40,56-73,148-150`. Imagens de notícias usam `next/image` com lazy loading. `next.config.ts:8-9` ativa AVIF/WebP e cache mínimo de 86.400 segundos; não medi acerto de cache em CDN.
- **OB-86 foi corrigido localmente:** `src/lib/hooks/useInfiniteFeed.ts:11,26` usa `EMPTY_INITIAL_POSTS` estável no valor padrão, removendo a criação de array por render que causava o ciclo de consulta descrito no snapshot de 30/09. Não houve execução de navegador para medir tráfego após a correção.

### Frontend, métricas e limitações

- Não executei bundle analyzer, Lighthouse ou medi Core Web Vitals. `npm run build` não foi executado porque gera `.next` dentro do workspace; a aplicação local poderia fazer leituras no Supabase remoto identificado na Fase 0.
- Não identifiquei um problema de cache que pudesse ser recomendado sem dados de tráfego/invalidação. Não proponho cache adicional.
- **Status da fase:** análise estática concluída nos caminhos de feed, reação, detalhe de matéria, sitemap e limpeza mensal; impacto quantitativo de consultas, latência, bundle e cache é **NÃO VERIFICADO** sem telemetria e ambiente isolado.

**Progresso da fase 5:** achados persistentes OB-06, OB-74, OB-75 e OB-84 foram revalidados; OB-86 foi marcado como corrigido no código atual. Fase 6 — arquitetura e qualidade — iniciada em seguida.

## FASE 6 — ARQUITETURA E QUALIDADE DE CÓDIGO — 05/10/2026

### Observações arquiteturais

- A aplicação é um monólito web Next.js App Router com Server Components, Client Components, Route Handlers e funções Supabase Edge. A UI e parte da regra de negócio ficam em `src/app`/`src/components`; serviços e regras compartilhadas ficam em `src/lib`; persistência e políticas ficam em `supabase/migrations`.
- Há separação útil entre clientes Supabase público, SSR e service role, validação editorial (`src/lib/content-validation.ts`), autorização cron (`src/lib/server/cron-auth.ts`), rede (`src/lib/server/network.ts`) e publicação (`src/lib/server/editorial-publication.ts`). A revisão cruzou a autorização final das rotas sensíveis; `proxy` não foi tratado como barreira única.
- `tsconfig.json:11` habilita `strict`; `npm run typecheck -- --incremental false` terminou com código 0. Os arquivos centrais `src/lib/ai/gemini-news.ts` e `src/lib/telegram/bot.ts` têm respectivamente 1.577 e 1.503 linhas no workspace atual. O tamanho aumenta o custo de navegação e testes, mas, sem falha isolada decorrente disso, não foi aberto achado apenas por preferência de arquitetura.
- `madge`/verificador de ciclos não está instalado; dependências circulares são **NÃO VERIFICADAS**. O lint cobre o workspace e retornou avisos sob `--max-warnings=0`.

# **[OB-112] Aviso de lint em código de produção bloqueia o comando de qualidade**

- **Categoria:** Código
- **Severidade:** Baixa
- **Confiança:** Alta
- **Status:** CONFIRMADO
- **Tipo de evidência:** Ferramenta automatizada
- **CVSS estimado:** N/A
- **Localização:** `src/lib/ai/gemini-news.ts:207`; `package.json:13`

- **Evidência:**

```ts
const MIN_IMAGE_HEIGHT = 675;
```

```json
"lint": "eslint --max-warnings=0",
```

- **Descrição:** O ESLint executado na Fase 1 reportou `MIN_IMAGE_HEIGHT` como variável não utilizada. Como o script transforma qualquer aviso em falha, `npm run lint` termina com código 1; isso também interrompe `npm run check` antes de typecheck, testes e build. A execução integral também encontrou aviso em `scratch/test-google-news-url.mjs`, que já estava não rastreado antes desta auditoria e não foi alterado.

- **Mitigações verificadas:** Busquei todas as referências a `MIN_IMAGE_HEIGHT` em `src/lib/ai/gemini-news.ts`; a única ocorrência é a declaração acima. O typecheck separado passa, mas não elimina o bloqueio do lint.

- **Impacto:** O gate local/CI que usa `npm run check` pode falhar sem erro funcional de compilação, atrasando integração e mascarando verificações posteriores.

- **Como verificar/reproduzir com segurança:** Execute `npm run lint` sem habilitar cache; confirme o aviso em `gemini-news.ts:207` e o código de saída 1. Não é necessário acessar serviços externos.

- **Solução recomendada:** Remover a constante sem uso ou conectá-la à validação de dimensão que deveria representar; depois rodar o lint novamente. Tratar o aviso do arquivo scratch separadamente conforme ele permaneça no workspace.

- **Exemplo corrigido:**

```ts
const MIN_IMAGE_WIDTH = 1200;
const MAX_IMAGE_BYTES = 12 * 1024 * 1024;
```

- **Esforço estimado:** P

**Progresso da fase 6:** arquitetura e limites de módulos inspecionados; typecheck e lint já medidos na Fase 1; ciclos não verificados por ausência da ferramenta. OB-112 registrado. Fase 7 — frontend, UX, acessibilidade e SEO — iniciada em seguida.

## FASE 7 — FRONTEND, UX, ACESSIBILIDADE E SEO — 05/10/2026

### Escopo e resultados observados

- Revisei metadados raiz, páginas de notícia/jogo/perfil, `robots.ts`, RSS, sitemap geral e sitemap de notícias. O layout configura `metadataBase`, título/descrição, Open Graph, Twitter e RSS; páginas de matéria, jogo e perfil geram metadados específicos e canonical. As rotas de busca e várias páginas institucionais também definem canonical.
- **OB-84 permanece confirmado:** RSS/news sitemap ignoram erros de leitura e o sitemap geral engole falhas e retorna XML parcial; ver Fase 5.
- Inspecionei formulários, modais e cartões de comunidade quanto a labels, nomes de botões, headings, estados, feedback e imagens. Há labels associados, aria-labels, `aria-labelledby`, headings e alvos interativos de altura mínima em telas revisadas; isso não demonstra conformidade integral.
- **Nível WCAG 2.2 AA observado:** **NÃO VERIFICADO**. O teste `axe`/Playwright não foi executado porque precisaria iniciar a aplicação local, cujo cliente pode consultar o Supabase remoto indicado na Fase 0. Contraste calculado, navegação por teclado real, leitores de tela, foco modal e visual responsivo em 375, 768, 1280 e 2560 px também são **NÃO VERIFICADOS**.
- A inspeção estática mostra utilitários responsivos em páginas analisadas e `viewport` configurado em `src/app/layout.tsx`; não substitui renderização nos quatro tamanhos exigidos.

# **[OB-113] Imagens de usuários têm texto alternativo genérico**

- **Categoria:** Acessibilidade
- **Severidade:** Baixa
- **Confiança:** Alta
- **Status:** CONFIRMADO
- **Tipo de evidência:** Estática
- **CVSS estimado:** N/A
- **Localização:** `src/components/community/BrickCard.tsx:513-516`; `src/lib/types/database.ts:673,692`

- **Evidência:**

```tsx
{post.media_url && !post.attached_article && (
  <div className="relative mt-2.5 max-w-[390px] overflow-hidden rounded-xl border border-white/10 bg-background-void/90 flex items-center justify-center">
    <img loading="lazy" decoding="async" src={post.media_url} alt="Mídia do post" className="h-auto max-h-[260px] w-full object-contain" />
  </div>
)}
```

```ts
media_url: string | null;
```

- **Descrição:** Uma imagem enviada com um post da comunidade pode carregar informação relevante, mas o nome acessível é sempre “Mídia do post”. O formulário permite anexar a imagem, sem coletar descrição alternativa, e o tipo persistido consultado contém `media_url`, sem campo equivalente de alt.

- **Mitigações verificadas:** Busquei `media_alt`, `alt_text` e campos equivalentes no tipo, migrations e formulário de composição. Há alt descritivo para a prévia local, mas a publicação final usa o texto genérico acima. Imagens de matéria anexada usam alt vazio por estarem dentro de um link que também contém o título da matéria, caso separado deste achado.

- **Impacto:** Pessoas que usam leitor de tela não recebem o conteúdo ou a função da imagem enviada por outra pessoa; “Mídia do post” apenas identifica o tipo de elemento.

- **Como verificar/reproduzir com segurança:** Em navegador local isolado, publique um post de teste com imagem informativa e navegue até o cartão com leitor de tela; confirme que o anúncio não descreve a imagem. Não use conta nem conteúdo de produção.

- **Solução recomendada:** Adicionar campo opcional de texto alternativo no fluxo de envio, persistir a descrição associada à mídia e renderizá-la. Manter `alt=""` apenas para imagens comprovadamente decorativas.

- **Exemplo corrigido:**

```tsx
<img src={post.media_url} alt={post.media_alt || "Imagem enviada pela comunidade"} />
```

- **Esforço estimado:** M

**Progresso da fase 7:** SEO inspecionado estaticamente; OB-84 revalidado e OB-113 registrado. WCAG 2.2 AA e responsividade real seguem não verificados por falta de execução segura do navegador. Fase 8 — fluxos ponta a ponta — iniciada em seguida.

## FASE 8 — AUDITORIA PONTA A PONTA DOS FLUXOS — 05/10/2026

Não disparei requests contra o site publicado nem contra o Supabase remoto. A rastreabilidade abaixo foi feita por leitura estática das páginas, hooks, handlers, políticas/migrations e testes existentes; portanto não equivale a execução de navegador contra staging.

| Fluxo | Rastreamento verificado | Resultado / achados relacionados |
|---|---|---|
| Visitante lê matéria | `/posts/[slug]` consulta `posts` com `is_published = true`; renderiza o artigo e metadados; estatísticas vêm de funções separadas; comentários/reação seguem hooks e rotas próprios. | A leitura pública usa `select("*")` e o grant público permite todas as colunas: justificativa editorial interna continua exposta (OB-41). Contagem de reações carrega linhas em caminhos específicos (OB-06). |
| Usuário atualiza perfil | Formulário obtém sessão Supabase; chamadas de perfil/avatar/banner enviam bearer; handler valida a sessão com `auth.getUser()`, limita taxa e usa service role para persistir. | A tela informa 8 MB e as APIs rejeitam acima de 4 MB (OB-20). A rota aceita URL de avatar HTTPS externa e renderiza em cartões públicos (OB-104). Campos de cosméticos do perfil são gravados sem validar o inventário de recompensas, embora exista RPC que faz essa validação (OB-103). |
| Usuário vota em lançamento | Interface envia jogo e opção ao handler; rota autentica, valida voto e restringe exclusão ao `user.id`; banco aplica chave única e foreign keys. | `DELETE` + `INSERT` não é atômico e erros de contagem podem ser ignorados (OB-110). |
| Geração editorial automática | Workflow manual chama Route Handler de cron; handler exige bearer secreto, gera pauta, aplica validadores editoriais/imagens, controla slot e então salva/publica conforme política configurada. | Fonte oficial de homepage pode satisfazer evidência de fonte (OB-105); fala pode entrar sem confirmação no URL citado (OB-106); complemento automático pode introduzir fatos genéricos sem fonte (OB-107); allowlist de CDN compartilhado admite tenants genéricos (OB-108); lock perde exclusão mútua quando tabela `bot_state` falta (OB-109). O host incorreto do workflow foi registrado como OB-111 na fase de DevOps. |
| Geração via Telegram | Rota valida o segredo do webhook e encaminha comandos a `bot.ts`; chamadas de geração têm deadline de 150 s sob Route Handler com `maxDuration` de 60 s. | Retry do Telegram não é deduplicado por `update_id` e pode repetir geração após timeout (OB-28). |
| Usuário exporta dados | API valida sessão; pagina datasets próprios e, para reações/visualizações de matérias, consulta pelo device ID enviado pelo cliente. | O identificador de dispositivo não é vinculado à conta autenticada no caminho com service role, possibilitando exportar atividade de outra conta que usou o mesmo aparelho (OB-59). |

### Resultado da reconciliação frontend/backend

- Os parâmetros básicos de IDs, limites e valores de voto têm validações no servidor nos fluxos sensíveis examinados; autorização não depende somente de esconder ações na UI.
- As falhas comprovadas deste rastreamento estão consolidadas nos achados referenciados acima e não foram duplicadas.
- Rotas que fazem chamadas externas, comportamento de loading/erro em rede real, redirects da autenticação e atualização visual após resposta são **NÃO VERIFICADOS** sem ambiente de staging isolado. Migrations não foram executadas.

**Progresso da fase 8:** seis fluxos de maior risco foram mapeados entre UI, validação, rota, autorização, persistência e resposta. Achados cruzados com Fases 2–7; nenhum request ou mutation remota foi executado. Fase 9 — textos e microcopy — iniciada em seguida.

## FASE 9 — TEXTOS E MICROCOPY — 05/10/2026

`npm run textcheck` foi aprovado em 402 arquivos. Também fiz inspeção textual de telas de perfil, login/cadastro, contato, controles de privacidade e mensagens de falha/loading encontradas nos módulos percorridos. O check automático cobre integridade/caracteres, não gramática. A revisão manual de todas as strings de todos os componentes não é exaustiva.

| Arquivo:linha | Texto atual | Texto sugerido | Motivo |
|---|---|---|---|
| `src/app/configuracoes/perfil/page.tsx:619`; `src/app/profile/setup/page.tsx:169` | “JPG, PNG, WebP ou AVIF. Até 8 MB.” / “Até 8 MB” | “JPG, PNG, WebP ou AVIF. Até 4 MB.” | A API de avatar limita upload a 4 MB e rejeita arquivos maiores com HTTP 413 (OB-20). |

Não registrei outras incorreções linguísticas sem evidência objetiva. Textos automáticos gerados por IA não foram tratados como microcopy fixa da interface nesta fase.

**Progresso da fase 9:** inconsistência de limite de upload revalidada como OB-20; nenhum achado ortográfico novo. Revisão linguística integral permanece parcial. Fase 10 — testes — iniciada em seguida.

## FASE 10 — TESTES — 05/10/2026

### Inventário e execução

- `package.json:15-16` define Node Test Runner e Playwright. O repositório tem 27 arquivos em `tests/` e um arquivo de teste E2E.
- A suíte unitária/integrada foi executada duas vezes, incluindo cobertura: **98 passaram, 0 falharam, 0 ignorados**. Os testes incluem PGlite, stubs/fetch mocks e verificações de SQL/RLS; não carregaram `.env.local` nem enviaram requests ao site publicado.
- `node --test --experimental-strip-types --experimental-test-coverage tests/*.test.ts`: linhas **36,96%**, branches **74,00%**, funções **58,21%** no conjunto de módulos carregados pelo runner. Não é porcentagem de todo o repositório, pois módulos não importados pelos testes não entram no denominador.
- Cobertura dos módulos relevantes: `gemini-news.ts` **14,15%** de linhas; `telegram/bot.ts` **13,92%**; `server/network.ts` **36,88%**; `post-stats-handler.ts`, `editorial-slot.ts`, `rate-limit.ts` e `cron-auth.ts` **100%**.
- `npm run e2e` e build não executados: inicializar a aplicação não foi considerado seguro sem staging comprovado, pois a configuração local indica Supabase remoto; build também criaria `.next` dentro do projeto. Nenhuma migration, seed ou teste mutável foi executado.

### Dez testes prioritários

| # | Nome sugerido / tipo | Arquivo ou módulo | Cenário e comportamento esperado | Risco coberto |
|---:|---|---|---|---|
| 1 | Recompensa é necessária para equipar cosmético — integração de handler | `src/app/api/user/profile/route.ts` | Autenticado tenta definir tema/título/moldura sem registro válido em `user_rewards`; rejeitar e preservar perfil. | Escalada horizontal / bypass de regra de autorização (OB-103). |
| 2 | URL de avatar só aceita origem controlada — integração de handler | `src/app/api/user/profile/route.ts`, `src/lib/avatar.ts` | Submeter URL HTTPS de host controlado pelo atacante; rejeitar antes de gravar e garantir que a UI pública não faça request para essa origem. | Rastreamento de visitantes e exposição de IP/UA (OB-104). |
| 3 | Exportação de atividade respeita titular da conta — integração | `src/app/api/user/data/route.ts` | Autenticar segunda conta e enviar device ID de outra conta; exportar somente dados vinculados ao titular ou negar o conjunto. | Exposição de dados pessoais em aparelho compartilhado (OB-59). |
| 4 | Troca de voto é atômica — integração com Postgres isolado | `src/app/api/release-hype-vote/route.ts` | Forçar falha do insert após voto existente; transação/upsert deve manter estado anterior e não retornar sucesso falso. | Perda de voto e contagens inconsistentes (OB-110). |
| 5 | Slot de publicação falha fechado sem tabela de lock — concorrência | `src/lib/server/editorial-slot.ts` | Simular ausência de `bot_state` e duas execuções concorrentes; no máximo uma pode receber autorização para publicar ou ambas devem bloquear com erro observável. | Publicação duplicada (OB-109). |
| 6 | Fontes oficiais exigem páginas de evidência — unidade | `src/lib/server/editorial-publication.ts`, `src/lib/ai/gemini-news.ts` | Passar apenas homepage institucional; bloqueio deve exigir fontes específicas verificáveis e três veículos/editoriais conforme política. | Aprovação automática sem apuração suficiente (OB-105). |
| 7 | Citação existe na fonte atribuída — integração com fetch mock | `src/lib/ai/gemini-news.ts`, `src/lib/ai/editorial-output.ts` | Retornar URL válida mas sem declaração verificável; geração deve rejeitar a citação e impedir publicação automática. | Citação falsa/não confirmada (OB-106). |
| 8 | Complemento de matéria não inventa contexto — unidade editorial | `src/lib/ai/gemini-news.ts` | Fornecer texto abaixo do mínimo e observar texto gerado; qualquer ampliação precisa de fatos ligados a fontes verificadas ou permanecer como rascunho. | Conteúdo não sustentado por fonte (OB-107). |
| 9 | CDN multitenant não é tratado como origem oficial — unidade | `src/lib/ai/editorial-images.ts` | Testar tenants arbitrários em CloudFront/Akamai e permitir somente origem explicitamente verificada para aquele conteúdo. | Imagem de terceiro aprovada como evidência editorial (OB-108). |
| 10 | Webhook do Telegram é idempotente após timeout — teste de handler com mocks | `src/app/api/telegram/webhook/route.ts`, `src/lib/telegram/bot.ts` | Reenviar mesmo `update_id` após timeout simulado; uma geração no máximo e resposta/retry dentro do limite da plataforma. | Geração/custo duplicados e perda de atualização (OB-28). |

**Progresso da fase 10:** suíte passou e cobertura foi medida sem gerar arquivo no workspace. E2E e build permanecem não executados por risco de conexão remota e geração de artefato local. Fase 11 — DevOps, observabilidade e infraestrutura — iniciada em seguida.

## FASE 11 — DEVOPS, OBSERVABILIDADE E INFRAESTRUTURA — 05/10/2026

### CI/CD e execução

- Revisei os dois workflows GitHub Actions. `deploy.yml` limita `GITHUB_TOKEN` a `contents: read`, fixa `checkout` e `setup-node` por SHA, roda `npm ci`, `npm run check` e Playwright. `news-generator.yml` define `permissions: {}` e recebe o segredo cron pelo contexto de secrets, sem imprimi-lo.
- No workspace atual, o lint encontrado na Fase 6 pode parar `npm run check`, que é executado no CI. A fonte com aviso já estava modificada antes desta auditoria e não foi alterada por ela; o estado do branch remoto e o que está implantado são **NÃO VERIFICADOS**.
- `.env.local` indica URL de Supabase remota enquanto o endereço do site aponta para localhost. Os valores secretos não foram lidos/exibidos. Vercel, Supabase, secrets/vars configurados nos repositórios e configuração de domínio não podem ser inspecionados somente pelo código local.
- Não encontrei Dockerfile, compose ou IaC provisionando cloud no escopo inventariado. A infraestrutura aparenta depender de Vercel e Supabase, mas plano, produção/staging, branch protection, backups, alertas e configurações de runtime são **NÃO VERIFICADOS** sem acesso ao painel.
- Código contém logs de erro (`console.error`) em operações selecionadas; não encontrei evidência local suficiente para afirmar tracing, métricas, alertas, retenção de logs ou redaction global. Esses controles externos são **NÃO VERIFICADOS**.

# **[OB-111] Workflow manual pode encerrar sem executar o cron**

- **Categoria:** DevOps
- **Severidade:** Baixa
- **Confiança:** Alta
- **Status:** CONFIRMADO
- **Tipo de evidência:** Estática
- **CVSS estimado:** N/A
- **Localização:** `.github/workflows/news-generator.yml:28-32`; `next.config.ts:48-52`

- **Evidência:**

```yaml
curl --fail --show-error --silent --max-time 300 --get \
  --data-urlencode "slot=$NEWS_SLOT" \
  "https://orange-brick.vercel.app/api/cron/generate-daily" \
  -H "Authorization: Bearer $CRON_SECRET"
```

```ts
source: "/:path*",
has: [{ type: "host", value: "orange-brick.vercel.app" }],
destination: "https://orangebrick.blog/:path*",
permanent: true,
```

- **Descrição:** O workflow chama o host que a configuração Next redireciona permanentemente para outro domínio. O `curl` não usa `--location`; respostas 3xx não são tratadas por `--fail` como erro HTTP 4xx/5xx, então a etapa pode terminar com código 0 sem chegar ao handler de geração. Não verifiquei qual revisão está implantada no Vercel.

- **Mitigações verificadas:** O handler de cron exige bearer secret e o workflow não imprime a variável. A configuração do host antigo é a causa do desvio; não há opção `--location` nem uso do domínio canônico no comando.

- **Impacto:** Uma execução manual pode aparecer como concluída no GitHub Actions enquanto nenhuma matéria foi gerada. O impacto está restrito a esse mecanismo manual; outros agendamentos não foram inferidos como afetados.

- **Como verificar/reproduzir com segurança:** Em mock HTTP local isolado, configure o primeiro host para responder 308 com `Location` para um segundo host; rode os mesmos argumentos do `curl` usando segredo fictício e confirme que o segundo handler não recebe request apesar da saída 0. Não chame o endpoint publicado, que dispara geração editorial.

- **Solução recomendada:** Chamar diretamente o domínio canônico `https://orangebrick.blog/api/cron/generate-daily` ou outro domínio confirmado como destino autorizado. Se optar por redirecionamento, validar explicitamente resposta final e preservar autenticação de modo seguro entre domínios.

- **Exemplo corrigido:**

```yaml
"https://orangebrick.blog/api/cron/generate-daily" \
-H "Authorization: Bearer $CRON_SECRET"
```

- **Esforço estimado:** P

**Progresso da fase 11:** dois workflows, headers de segurança, Vercel, Supabase, secrets e observabilidade local foram analisados; configuração dos painéis externos permanece não verificada. OB-111 registrado. Fase 12 — consolidação — iniciada em seguida.

# **[OB-114] Curtidas de comentários de matérias não estão expostas no PostgREST consultado**

- **Categoria:** Bug
- **Severidade:** Média
- **Confiança:** Alta
- **Status:** CONFIRMADO
- **Tipo de evidência:** Dinâmica
- **CVSS estimado:** N/A
- **Localização:** `src/lib/hooks/useComments.ts:75-83,159-164`; `supabase/migrations/20260928000000_article_comment_likes.sql:1-29`.

- **Evidência:**

```ts
const { data: likes, error: likesError } = await supabase
  .from("article_comment_likes")
  .select("comment_id, user_id")
  .in("comment_id", rawComments.map((comment) => comment.id));
if (!likesError) {
```

```sql
create table if not exists public.article_comment_likes (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid not null references public.comments(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
```

```text
GET /rest/v1/article_comment_likes?select=id&limit=0 -> HTTP 404, PGRST205
```

- **Descrição:** A aplicação usa essa relação para calcular curtidas e gravar/remover votos. No Supabase configurado no `.env.local`, o PostgREST respondeu PGRST205 mesmo com `limit=0`, sem leitura de dados. A leitura do hook ignora o erro e transforma contagens em zero; a ação de curtir reverte o estado otimista e exibe falha. O resultado comprova que a relação não está exposta à API consultada, mas não distingue tabela ausente de cache/schema PostgREST desatualizado; o ledger de migrations não foi alterado nem inferido.

- **Mitigações verificadas:** Existe migration local com RLS e policies por proprietário para escrita. A migration também permite `SELECT` a `anon` e expõe `user_id`; esse grant deve ser revisto junto com OB-54 antes de habilitar a relação. Nenhuma migration foi executada nesta auditoria.

- **Impacto:** Curtidas e contagens em comentários de matérias ficam indisponíveis no ambiente consultado; se a migration for aplicada sem rever o grant de leitura, a tabela poderá expor identificadores de usuários anonimamente.

- **Como verificar/reproduzir com segurança:** Em staging, fazer `GET /rest/v1/article_comment_likes?select=id&limit=0`; em seguida conferir likes com duas contas de teste. Não ler registros de usuários reais.

- **Solução recomendada:** Reconciliar a migration/schema cache em staging. Antes de aplicar, restringir leitura direta de `user_id`; fornecer contagens agregadas e limitar leitura individual ao necessário para a própria conta.

- **Exemplo corrigido:**

```sql
revoke select on public.article_comment_likes from anon, authenticated;
grant execute on function public.article_comment_like_counts(uuid[]) to anon, authenticated;
```

A função agregadora é uma recomendação nova e deve ser criada/testada com `search_path` fixo e validação de permissões antes da concessão.

- **Esforço estimado:** M

# **[OB-115] View pública de perfis não está exposta no PostgREST consultado**

- **Categoria:** Bug
- **Severidade:** Média
- **Confiança:** Alta
- **Status:** CONFIRMADO
- **Tipo de evidência:** Dinâmica
- **CVSS estimado:** N/A
- **Localização:** `src/lib/contexts/AuthContext.tsx:27-32`; `src/app/api/user/profile/route.ts:48-53,74-95`; `supabase/migrations/20260924000000_public_profile_view_and_access.sql:1-28`.

- **Evidência:**

```ts
const { data } = await supabase
  .from("public_profiles")
  .select("*")
  .eq("user_id", authenticatedUser.id)
  .maybeSingle<Profile>();
```

```ts
const { data: profile } = await service
  .from("public_profiles")
  .select("*")
  .eq("user_id", user.id)
  .maybeSingle<Profile>();
if (profile) return NextResponse.json({ profile });
```

```text
GET /rest/v1/public_profiles?select=id&limit=0 -> HTTP 404, PGRST205
```

- **Descrição:** A view de perfis é consultada pelo contexto de autenticação, pela API de perfil, busca e exibição de autores em comentários. A consulta segura com `limit=0` confirmou que ela não está disponível no PostgREST do projeto remoto consultado. Na API GET, o erro da view não é tratado antes de tentar inserir um perfil inicial; usuários que já possuem linha podem receber falha de unicidade e resposta 500. O comportamento de uma conta real não foi reproduzido por envolver sessão/dados de usuário.

- **Mitigações verificadas:** A migration local cria a view com `security_barrier`, remove grant público genérico e concede `SELECT` a `anon` e `authenticated`. A página pública `/u/[username]` usa a RPC `public_profile`, não essa view; assim a falha não prova indisponibilidade de todas as páginas de perfil. O endpoint continua usado em vários fluxos de cliente.

- **Impacto:** Pode faltar nickname/avatar de autores, a busca de usuários não carregar e o contexto autenticado cair para perfil provisório; o endpoint GET pode falhar para contas com perfil já provisionado. Não foi feita leitura de dados pessoais.

- **Como verificar/reproduzir com segurança:** Em staging, conferir `GET /rest/v1/public_profiles?select=id&limit=0` e, após corrigir o schema, testar busca, comentários e GET de perfil com contas fictícias.

- **Solução recomendada:** Reconciliar aplicação da migration, exposição do schema e cache PostgREST em staging. Tratar erro de consulta separadamente de “perfil inexistente” antes de tentar inserir perfil.

- **Exemplo corrigido:**

```sql
create or replace view public.public_profiles
with (security_barrier = true) as
select id, user_id, nickname, username, display_name, avatar_url
from public.profiles;
```

A definição completa deve seguir a migration existente; não publique dados de perfil além dos campos aprovados.

- **Esforço estimado:** M

## FASE 12 — CONSOLIDAÇÃO FINAL — 05/10/2026

### Revalidação e reconciliação

- A consolidação revalidou **69 achados atuais**: 1 crítico, 0 altos, 43 médios e 25 baixos. A contagem inclui estados CONFIRMADO, PROVÁVEL e POTENCIAL, conforme o limite de evidência disponível.
- Além dos 26 achados já confirmados na rodada anterior, 43 achados históricos foram conferidos novamente nas fontes atuais. Eles permanecem separados dos itens resolvidos e dos que dependem de configuração externa.
- OB-11, OB-15, OB-22, OB-39, OB-42, OB-55, OB-70, OB-76 e OB-89 foram resolvidos ou mitigados no checkout atual; as descrições históricas foram excluídas da contagem vigente.
- OB-43 foi reduzido ao caso ainda presente: falha silenciosa da RPC de progresso no Brickboard. Ranking e conquistas agora exibem erro e retry.
- OB-90 foi corrigido como falso positivo parcial: CreatePollModal é usado; quatro módulos diferentes continuam sem consumidores encontrados.
- OB-10 tem mitigação no código e teste unitário, mas o deploy da correção não foi confirmado.
- OB-03, OB-04 e OB-08 permanecem NÃO VERIFICADOS quanto ao estado atual de cron/deploy, backup externo e chave de produção RAWG. OB-31 depende também da política MFA do Supabase, que não foi consultada.
- OB-35 permanece PROVÁVEL porque a incompatibilidade entre o token enviado pelo cron e a autenticação da Edge Function é demonstrável no código, mas a versão implantada da função não foi conferida.
- OB-01: chave privilegiada histórica mascarada ainda foi aceita no projeto Supabase associado, por HEAD sem linhas. A igualdade com o segredo atualmente implantado na Vercel continua NÃO VERIFICADA.
- OB-02 está resolvido para as relações consultadas: os checks sem linhas responderam 200, e editorial_revisions respondeu 206. Isso não prova conteúdo, grants efetivos ou aplicação integral das migrations.
- OB-23: preflight OPTIONS das duas Edge Functions continua respondendo com o host antigo ao domínio próprio.
- OB-54: consulta anon de community_comment_likes respondeu 200 sem linhas retornadas; a exposição de registros reais não foi testada.
- OB-57: comments.parent_id respondeu 200 em consulta sem linhas.
- OB-67: contraste do estado pulsante foi reproduzido pelo axe entre 2,58:1 e 3,14:1.
- OB-109: o código pode falhar aberto se bot_state não existir, mas a relação remota respondeu 200; a corrida foi reproduzida apenas com mock e permanece POTENCIAL.
- OB-114 e OB-115: article_comment_likes e public_profiles retornam PGRST205 no PostgREST consultado; nenhuma linha foi acessada.
- OB-25 foi desdobrado em OB-105 a OB-108 para evitar duplicidade. OB-16 foi parcialmente coberto por OB-67; contraste e foco globais não foram declarados resolvidos.

### IDs vigentes após a revalidação

- **Atuais/revalidados:** OB-01, OB-05, OB-06, OB-12, OB-19, OB-20, OB-21, OB-23, OB-24, OB-27, OB-28, OB-29, OB-31, OB-32, OB-34 a OB-38, OB-40, OB-41, OB-43, OB-48 a OB-50, OB-53, OB-54, OB-56, OB-58 a OB-60, OB-62 a OB-65, OB-67 a OB-69, OB-71 a OB-75, OB-77 a OB-80, OB-82 a OB-85, OB-88, OB-90 a OB-92, OB-94 e OB-103 a OB-115. Total: 69.
- **Resolvidos/mitigados no checkout ou no schema consultado:** OB-02, OB-07, OB-09, OB-11, OB-13, OB-14, OB-15, OB-17, OB-18, OB-22, OB-26, OB-33, OB-39, OB-42, OB-44 a OB-47, OB-51, OB-52, OB-55, OB-57, OB-61, OB-66, OB-70, OB-76, OB-81, OB-86, OB-87, OB-89, OB-93 e OB-102. Para correções de aplicação, isso não prova publicação em produção.
- **Parcial/dependente de ambiente:** OB-03, OB-04, OB-08 e OB-10; OB-16, OB-25, OB-30, OB-31 e OB-35; OB-43 e OB-90 foram estreitados e mantêm somente o residual descrito; OB-95 a OB-101 dependem de ledger, configuração ou versão remota.
- **Segurança/produto:** OB-31 descreve a ausência de validação AAL2 no código da aplicação, sem afirmar que o projeto Supabase não exija MFA. OB-35 não afirma falha da função publicada sem conferir seu deployment.

### Ferramentas e validações finais

| Comando/ferramenta | Versão | Resultado | Limitação |
|---|---|---|---|
| npm ci em cópia temporária | npm 11.19.0 | Concluído; 653 pacotes | Fora do workspace, sem .env*, .git ou outputs no projeto |
| npm run build | Next.js 16.3.6 | PASSOU; 80 rotas produzidas | Cópia temporária; Supabase apontado para localhost e chaves fictícias |
| npm test | Node 24.20.0 | PASSOU; 98/98 | Suíte existente, sem alterações |
| node --experimental-test-coverage --test --experimental-strip-types tests/*.test.ts | Node 24.20.0 | PASSOU; 98/98; linhas 36,96%, branches 74,00%, funções 58,21% | Apenas módulos carregados pela suíte |
| npm run lint | ESLint do lockfile | FALHOU com um warning sob --max-warnings=0 | src/lib/ai/gemini-news.ts:207, MIN_IMAGE_HEIGHT sem uso; arquivo já estava alterado antes da auditoria |
| npm audit --omit=dev | npm 11.19.0 | PASSOU; nenhuma vulnerabilidade de produção reportada | Consulta completa ao registry não estabilizou |
| npm run e2e com Playwright/axe | Playwright 1.63.0 | 51 passaram, 10 falharam, 4 ignorados na execução inicial | 5 falhas eram contraste na homepage; 5 em /em-alta eram fixture sem chave fictícia e passaram após correção da fixture isolada |
| E2E adicional em 375×812 | Playwright 1.63.0 | 11 passaram, 1 falhou por contraste; sem overflow nos caminhos aprovados | Estado autenticado real não testado |
| HEAD/GET?limit=0 no Supabase e OPTIONS nas Edge Functions | fetch nativo | Somente códigos HTTP e cabeçalhos; nenhuma linha retornada | Sem POST, DML, RPC mutável ou migrations |
| gitleaks, osv-scanner, semgrep, knip, madge e Lighthouse | — | NÃO EXECUTADOS | Binários ausentes; não instalados no workspace |

- A diferença desde o snapshot anterior foi usada para localizar arquivos modificados. Fontes alteradas foram reabertas; verificações remotas permaneceram somente leitura.

# AVISO

Este documento pode conter informações sensíveis sobre arquitetura e segurança. Não deve ser versionado em repositório público.

# 1. ESCOPO

- **Data:** 05/10/2026, horário de São Paulo.
- **Stack:** Next.js App Router 16.3.6, React 19.3.0, TypeScript 5.9.3, Node.js 24.20.0, npm 11.19.0, Supabase JS 2.117.1, Supabase SSR 0.12.7, GenAI 2.24.0 e Playwright 1.63.0, confirmados por inventário e lockfile.
- **Arquitetura:** aplicação web monolítica híbrida com SSR/Server Components e Client Components, Route Handlers, Edge Functions Supabase, migrations PostgreSQL/RLS, GitHub Actions e hospedagem Vercel.
- **Inventário:** 41 páginas, 35 Route Handlers, 7 Edge Functions, 73 migrations, 27 arquivos de teste, 1 arquivo E2E, 56 scripts, 2 workflows e 152 assets públicos.
- **Diretórios analisados:** src/app, src/components, src/lib, supabase/migrations, supabase/functions, tests, scripts, public, .github/workflows e configurações Next/TypeScript/npm.
- **Diretórios ignorados na varredura integral:** node_modules, .git, .next, dist, build, coverage, caches, binários, vendor, venv e .venv. scratch não foi executado; dependências foram inspecionadas pontualmente.
- **Ambiente:** .env.local aponta para Supabase remoto. Nenhum valor secreto foi impresso. As interações remotas foram HEAD, GET com limit=0 ou OPTIONS, sem leitura de linhas nem mutação.

# 2. RESUMO EXECUTIVO

A auditoria-base registrou 69 itens (1 crítico, 43 médios e 25 baixos). Após as correções locais documentadas até 06/10, 60 estão mitigados no checkout e nove permanecem como resíduos de código (1 crítico, 7 médios e 1 baixo). Isso não comprova correção em produção: nenhum deploy, migration ou rotação de segredo foi executado nesta etapa.

A checagem somente leitura encontrou 11 relações e quatro RPCs acessíveis no projeto Supabase configurado. O checker ainda retornou `ready:false`: VAPID pública ausente no ambiente local, aliases legados presentes e backup local com 102,9 horas. Typecheck, lint de `src`/`tests`, integridade textual e 27 arquivos de teste executados isoladamente passaram; o build foi bloqueado pela política local que impede carregar SWC.

# 3. VISÃO GERAL

| Severidade | Quantidade |
|---|---:|
| Crítica | 1 |
| Alta | 0 |
| Média | 7 |
| Baixa | 1 |

A contagem acima descreve os nove resíduos de código no checkout depois das correções locais. Os 60 itens mitigados localmente e as dependências de ambiente/deploy estão discriminados no adendo final; esta contagem não afirma que os riscos foram removidos da produção.

Os scores e o Top 20 abaixo permanecem como linha de base da auditoria anterior às correções. Não foram recalculados para produção, pois o deployment e as migrations não foram atualizados nem revalidados nesta etapa.

# 4. SCORES

- **Segurança — 3,5/10:** segredo privilegiado histórico ainda aceito e pontos de exposição/controle de dados precisam de correção.
- **Segurança de IA — 4,5/10:** há validações estruturais, mas persistem lacunas de evidência, citações e confiança na origem.
- **Performance — 5,5/10:** paginação principal existe, mas há consultas sem limite, fallback integral e fan-out com limite de linhas.
- **Qualidade de código — 5,5/10:** build e typecheck passam; lint falha e ainda existem operações que não propagam erro.
- **Arquitetura — 6,0/10:** camadas são identificáveis; algumas integrações concentram regras e dependem de estado remoto.
- **UX — 5,5/10:** fluxos centrais funcionam, mas falhas em comunidade, calendário, preferências e editor podem parecer sucesso ou vazio.
- **SEO — 6,5/10:** metadata, RSS e sitemap existem; consulta de ranking pode recorrer a leitura sem paginação.
- **Acessibilidade — 4,0/10:** axe encontrou contraste insuficiente e há divergências de nome acessível; WCAG 2.2 AA completo não foi medido.
- **Manutenibilidade — 5,5/10:** cobertura de linhas baixa e divergências entre schema, migrations e serviços remotos.
- **Testes — 5,5/10:** 98 testes passam, mas os módulos centrais de IA e Telegram têm cobertura comportamental insuficiente.
- **DevOps — 5,5/10:** build isolado passa; lint, CORS e verificação de backup/deploy ainda precisam de atenção.

# 5. TOP 20

| ID | Problema | Severidade | Confiança | Arquivo | Esforço | Prioridade |
|---|---|---|---|---|---|---|
| OB-01 | Chave privilegiada histórica ainda aceita no Supabase | Crítica | Alta | scripts/check-posts.cjs:5 (histórico) | G | P0 |
| OB-54 | Leitura pública de IDs de quem curtiu comentários | Média | Alta | supabase/migrations/20260723000001_community_comment_likes.sql:13-28 | M | P1 |
| OB-23 | CORS das funções de push responde pelo domínio antigo | Média | Alta | supabase/functions/_shared/platform.ts:3-11 | P | P1 |
| OB-115 | View public_profiles indisponível no PostgREST atual | Média | Alta | src/lib/contexts/AuthContext.tsx:27-32 | M | P1 |
| OB-114 | Tabela de curtidas de comentários de matérias indisponível | Média | Alta | src/lib/hooks/useComments.ts:75-83 | M | P1 |
| OB-105 | Homepage sintética satisfaz gate de fonte editorial | Média | Alta | src/lib/ai/gemini-news.ts | M | P1 |
| OB-106 | Citação aceita sem conferir a página citada | Média | Alta | src/lib/ai/gemini-news.ts | M | P1 |
| OB-107 | Texto genérico sem fonte completa a matéria | Média | Alta | src/lib/ai/gemini-news.ts | M | P1 |
| OB-108 | CDN compartilhada é tratada como origem editorial confiável | Média | Alta | src/lib/ai/editorial-images.ts | M | P1 |
| OB-59 | Exportação pode misturar atividade por identificador de aparelho | Média | Alta | src/app/api/user/data/route.ts:40-51,75-96 | M | P1 |
| OB-104 | Avatar externo faz visitantes requisitarem host controlado pelo usuário | Média | Alta | src/app/api/user/profile/route.ts | P | P1 |
| OB-21 | Exportação omite dados vinculados à conta | Média | Alta | src/lib/user-data-export.ts:3-15 | M | P1 |
| OB-29 | Exclusão de conta pode falhar após apagar dados | Média | Alta | src/app/api/user/delete/route.ts:53-76 | M | P1 |
| OB-110 | Falha ao trocar voto pode apagar a escolha anterior | Média | Alta | src/app/api/release-hype-vote/route.ts | M | P1 |
| OB-28 | Replay/timeout do webhook pode duplicar geração | Média | Alta | src/app/api/telegram/webhook/route.ts | M | P1 |
| OB-41 | Justificativa editorial interna pode ser serializada publicamente | Média | Alta | src/app/posts/[slug]/page.tsx:27-34 | P | P1 |
| OB-35 | Autenticação da função pode rejeitar push agendado | Média | Média | src/app/api/cron/editorial-scheduler/route.ts:128-130 | P | P1 |
| OB-24 | Revogação de push pode confirmar sucesso sem cancelar assinatura | Média | Alta | src/components/ui/PrivacyControls.tsx:90-106 | M | P1 |
| OB-49 | Anexo de imagem torna publicação de Brick inválida | Média | Alta | src/components/community/ComposeBrickModal.tsx:78-84 | M | P1 |
| OB-50 | Falha na troca de reação pode apagar reação anterior | Média | Alta | src/lib/hooks/useCommunityFeed.ts:290-303 | M | P1 |

# 6. QUICK WINS

> Estado da lista: registrada antes das correções locais do adendo. OB-20, OB-22, OB-23, OB-24, OB-35, OB-41, OB-49, OB-50, OB-54, OB-67, OB-68, OB-69, OB-75, OB-104, OB-110, OB-111 e OB-112 têm correções no checkout; deployment, migrations e validação remota continuam pendentes conforme o ID.

- **OB-23:** corrigir SITE_URL/CORS para o domínio próprio e validar o preflight em staging.
- **OB-20:** alinhar a mensagem do formulário de avatar ao limite efetivo de upload.
- **OB-67:** manter contraste mínimo durante a animação e repetir axe nos breakpoints.
- **OB-68 e OB-69:** corrigir o papel acessível do sentinel e fazer o nome acessível incluir o rótulo visível.
- **OB-75:** propagar falha ao remover registros da biblioteca.
- **OB-90:** remover os quatro módulos sem consumidores depois de confirmar que não há uso planejado.
- **OB-111 e OB-112:** corrigir o domínio do workflow manual e remover/usar a constante que falha no lint.

# 7. PLANO DE CORREÇÃO

> Este plano reflete a priorização original da auditoria. Para o estado atual de cada correção local e suas pendências de implantação, consulte o adendo ao final.

## Imediato — 24 horas

- **OB-01:** revogar/rotacionar a chave exposta, atualizar consumidores legítimos e revisar logs; só depois avaliar limpeza do histórico.
- **OB-23 e OB-35:** corrigir origem e autenticação do push; testar somente em staging.
- **OB-54, OB-114 e OB-115:** reconciliar grants, migrations e cache PostgREST; não aplicar migration diretamente em produção sem validar schema e RLS.
- **OB-105 a OB-108:** exigir fonte, citação e imagem verificáveis antes de publicação automática; manter pendências como rascunho.
- **OB-59 e OB-104:** limitar exportação por titular e impedir requisições de avatar controladas por terceiros.

## Curto prazo — 1 a 2 semanas

- **OB-21, OB-24 e OB-29:** completar exportação e tornar revogação/exclusão duráveis, com estado de falha e retomada.
- **OB-27, OB-28, OB-36 e OB-38:** só avançar marcadores após envio confirmado, proteger replay e tornar locks atômicos.
- **OB-49, OB-50, OB-53, OB-56 e OB-58:** corrigir upload, atomicidade, feedback de falha, profundidade das threads e policy de exclusão.
- **OB-62 a OB-64 e OB-110:** agrupar lançamentos por semana, distinguir votos indisponíveis e preservar voto anterior em falhas.
- **OB-72, OB-78 a OB-80 e OB-85:** paginar moderação, conectar abas do editor, impedir race de carregamento e garantir terminação do parser.
- **OB-103:** validar cosméticos desbloqueados na API de perfil.

## Médio prazo — 1 a 2 meses

- **OB-05, OB-06, OB-12, OB-19, OB-20, OB-31, OB-32 e OB-34:** concluir rotação/escopo de chave, cobertura, política MFA, privacidade e limites de leitura.
- **OB-37, OB-40, OB-43, OB-48, OB-60 e OB-65:** paginar contatos, observar telemetria, exibir falhas de progresso, expirar enquetes e limitar recursos de geração.
- **OB-67 a OB-69, OB-71, OB-73, OB-74, OB-75 e OB-77:** corrigir acessibilidade, contadores, paginação da biblioteca, limpeza do Radar e foco do diálogo.
- **OB-82 a OB-84 e OB-88:** validar slugs, limitar fallback de ranking e tratar erros de sitemap/feed/comunidade.
- **OB-90 a OB-94:** remover módulos sem uso, corrigir datas futuras e tipografia e paginar fan-out de push.
- **OB-111 a OB-113:** corrigir workflow e lint, e fornecer texto alternativo específico para imagens de usuário.

## Melhorias futuras

- **OB-03, OB-04, OB-08, OB-10 e OB-95 a OB-101:** confirmar cron, backup/restauração, secrets e autenticação/deploy com acesso autorizado de leitura aos painéis.
- Reexecutar auditoria de produção depois de alinhar checkout e deployment e confirmar observabilidade, retenção e proteção de branches.

# 8. TESTES MAIS URGENTES

| # | Teste sugerido | Tipo e módulo | Cenário e comportamento esperado | Risco coberto |
|---:|---|---|---|---|
| 1 | historical_service_key_is_revoked | Integração em Supabase de teste | Chave histórica retorna 401/403 após rotação; nunca enviar a chave a produção | OB-01 |
| 2 | public_relations_schema_contract | Integração/staging de perfil e comentários | public_profiles e article_comment_likes respondem a limit=0 e respeitam RLS | OB-114, OB-115, OB-54 |
| 3 | account_export_is_complete_and_scoped | API/exportação | Conta A recebe seus dados exportáveis completos e nenhum registro da conta B ou de terceiros | OB-21, OB-59 |
| 4 | account_deletion_resumes_after_partial_failure | API com serviços mockados | Falha depois da limpeza relacional deixa estado retomável e não confirma exclusão completa | OB-29 |
| 5 | push_auth_preferences_replay_and_cors | Integração/staging Edge Functions | Origem permitida, falha de preferência interrompe envio e replay não repete notificação | OB-23, OB-24, OB-35, OB-36 |
| 6 | editorial_publish_requires_verified_evidence | Teste com mocks de IA | Fonte sintética, citação não confirmada, texto genérico ou CDN não autorizada mantêm rascunho | OB-105 a OB-108 |
| 7 | reaction_and_vote_changes_are_atomic | Integração com banco isolado | Falha durante troca preserva reação/voto anterior e contagens corretas | OB-50, OB-110 |
| 8 | brick_image_upload_matches_database_contract | Integração com Storage de teste | Imagem aceita é enviada ao Storage e post grava URL HTTP(S) válida | OB-49 |
| 9 | comment_threads_and_owner_deletion | Integração com banco isolado | Respostas aninhadas renderizam e autor remove o próprio comentário conforme policy | OB-56, OB-58 |
| 10 | malformed_markdown_link_terminates | Unidade/parser | Link sem fechamento não recursa indefinidamente e mantém conteúdo legível | OB-85 |

# 9. COBERTURA DA AUDITORIA

### Analisado

- Stack, arquitetura, páginas/rotas, Route Handlers, Edge Functions, migrations/RLS, autenticação/autorização, IA editorial, Telegram, upload, perfil, exportação, radar, CI, SEO e testes.
- Mitigações em guards, helpers, policies, schemas e configurações Next/Supabase.
- Build, suíte nativa, cobertura, lint, auditoria de dependências de produção, navegador/axe e breakpoints em cópia temporária isolada.
- Schema e cabeçalhos remotos apenas por requests sem linhas ou mutações.

### Parcialmente analisado

- Vercel/Supabase externos, deployment atual de todas as funções, histórico completo de migrations, Auth settings, backups e observabilidade.
- WCAG 2.2 AA e responsividade de rotas autenticadas; não foi usado leitor de tela nem conta real.
- Performance real/Core Web Vitals, volume de tabelas e comportamento sob carga.
- Validade da chave Google histórica e equivalência de secrets na Vercel; nenhum provedor pago foi chamado.

### Ignorado por segurança/regra

- Execução de scratch, requests mutáveis, migrations, seeds, publicação, envio de push/e-mail/Telegram, uploads e exclusões em serviços reais.
- Conteúdo integral de .git, node_modules, caches, builds, binários e dependências vendorizadas.

### Não aplicável

- Django, FastAPI, Flask, Laravel, Spring, Go, PHP, Ruby, .NET e mobile não foram encontrados.
- Docker/Compose e IaC de provisionamento cloud não foram encontrados no inventário local.
- Pagamentos não foram identificados. IA/LLM, webhooks e integrações externas são aplicáveis e foram auditados.

# 10. LIMITAÇÕES

- .env.local aponta para Supabase remoto. Requests remotos limitaram-se a HEAD, GET com limit=0 e OPTIONS; não houve leitura de linhas, POST/DML, RPC mutável, migration ou teste contra produção.
- PGRST205 para public_profiles e article_comment_likes prova indisponibilidade no PostgREST consultado, mas não distingue tabela ausente, schema não exposto ou cache desatualizado.
- A chave privilegiada histórica foi aceita por HEAD sem linhas no host associado; igualdade com o secret da Vercel e consumidores atuais não foi verificada.
- Cron de produção (OB-03), backup externo/restauração (OB-04), RAWG_API_KEY de produção (OB-08) e deploy do adaptador de cookies (OB-10) dependem de conferência atual nos painéis. Configuração remota de MFA (OB-31) e deployment da Edge Function de push (OB-35) também não foram conferidos.
- Os achados locais PROVÁVEIS/POTENCIAIS não afirmam comportamento externo que não foi observado. OB-05 validade/escopo de chave, OB-54 registros de curtidas e OB-109 corrida remota continuam limitados conforme suas evidências.
- Gitleaks, osv-scanner, semgrep, knip, madge e Lighthouse não estavam disponíveis e não foram instalados. Segredos históricos aparecem mascarados; nenhum segredo completo consta neste documento.
- Browser e axe usaram dados fictícios em cópia isolada. A avaliação não substitui sessão autenticada real, leitor de tela, rede móvel ou Core Web Vitals de produção.
- OB-95 a OB-101 permanecem parcial/reclassificados por configuração/deployment/ledger remoto não conferido. Os achados fechados no checkout não provam que o código já foi publicado.
- Nenhuma conclusão jurídica sobre LGPD/GDPR é emitida; os pontos técnicos de minimização e exposição precisam de validação pelo controlador.
- O workspace já tinha mudanças em .agents/skills/impeccable, .codex/hooks.json, src/lib/ai/editorial-images.ts, src/lib/ai/gemini-news.ts, src/lib/content-validation.ts e scratch. A auditoria não alterou esses caminhos; somente AUDITORIA.md foi escrita.

# ADENDO — CORREÇÕES APLICADAS NO CHECKOUT

Data: 05/10/2026. O pedido posterior à auditoria autorizou alterações no código. Os itens abaixo estão apenas no checkout local e não foram implantados nem aplicados ao Supabase remoto.

As contagens, scores e Top 20 acima representam o retrato da auditoria antes deste adendo. OB-105 a OB-108 foram mitigados localmente abaixo; o estado dos deployments continua não verificado.

## Correções implementadas

- **OB-20:** os dois formulários de avatar agora informam o limite de 4 MB aplicado pela API.
- **OB-22:** falhas ao consultar preferências de push agora encerram o envio com HTTP 503, sem ignorar opt-outs. Enquanto `notification_preferences` não estiver exposta no ambiente remoto, os envios afetados permanecerão bloqueados após deploy.
- **OB-09:** o checkout já exige registro de auditoria pendente, verifica o resultado do Storage e só então conclui a remoção; essa mitigação existente foi confirmada em `src/app/api/admin/storage-health/route.ts`.
- **OB-67:** a mensagem do skeleton mantém cor estável e não pulsa com opacidade reduzida.
- **OB-68:** o sentinel visual de carregamento infinito foi ocultado da árvore acessível; ele continua observando a rolagem.
- **OB-69:** o texto visível e o nome acessível do botão de alertas agora usam a mesma ação em cada estado.
- **OB-75:** a falha ao remover a linha da biblioteca agora retorna erro antes de arquivar os itens vencidos, permitindo nova tentativa do cleanup.
- **OB-111:** o workflow manual chama diretamente o domínio canônico, sem depender do redirect do host antigo.
- **OB-112:** a constante `MIN_IMAGE_HEIGHT` sem uso foi removida de `gemini-news.ts`; o aviso pré-existente no diretório `scratch/` não foi alterado.
- **OB-23:** CORS agora ecoa somente origens exatas permitidas (`orangebrick.blog`, `www.orangebrick.blog`, domínio legado Vercel e origem HTTPS configurada), inclui `Vary: Origin` e cobre todas as sete Edge Functions via wrapper compartilhado. Preflight remoto após deploy continua pendente.
- **OB-24:** revogação local e remota de push é tentada separadamente; a interface informa falha de qualquer etapa em vez de apresentar sucesso falso.
- **OB-35:** `send-push-notification` reconhece a chave de serviço configurada por comparação de hash em tempo constante para o fluxo de publicação do cron; usuários continuam autenticados por `auth.getUser()`. `verify_jwt` foi desativado somente nessa função porque a autorização agora é validada no handler. Deploy e verificação remota continuam pendentes.
- **OB-41:** página pública usa projeção explícita; nova migration restringe SELECT de `posts` a colunas públicas; o editor e a validação administrativa carregam dados internos por `GET /api/admin/posts/[id]`, que exige `app_metadata.is_admin`. A migration não foi executada remotamente.
- **OB-49:** imagens do Brickboard são validadas, convertidas para WebP e enviadas ao Storage por endpoint autenticado com limite por usuário; `media_url` recebe URL pública. Upload recém-criado é removido se a inserção do post falhar.
- **OB-50:** troca de reação existente usa UPDATE sob policy de titularidade, evitando a janela entre DELETE e INSERT.
- **OB-54:** leitura de curtidas foi substituída por RPC de contagem e estado do usuário atual; a migration limita leitura direta à própria linha. Migration ainda não aplicada remotamente.
- **OB-104:** URLs de avatar são limitadas ao Google e ao Storage do próprio usuário; URL externa não confiável não é persistida nem renderizada.
- **OB-110:** mudança de voto usa UPSERT sobre a chave única `(release_id, user_id)`.
- **OB-105:** a geração deixou de sintetizar homepages como fontes. Só considera páginas HTTPS específicas que foram buscadas, tiveram texto suficiente e apresentaram correspondência de pelo menos três termos específicos do título/resumo. O gate exige fonte verificada e a citação final precisa corresponder a uma delas.
- **OB-106:** uma fala gerada só é marcada como verificada quando a página final contém o texto normalizado e o nome da pessoa e também tem correspondência lexical com título/resumo. Falas não confirmadas continuam bloqueando publicação; ausência de declaração não é presumida pela IA e precisa de confirmação no editor. O editor preserva a confirmação explícita da fala.
- **OB-107:** foi removida a função que completava textos curtos com parágrafo genérico. Abaixo do mínimo, o rascunho continua pendente pela regra de extensão, com justificativa editorial exigida quando aplicável.
- **OB-108:** imagens agora precisam vir de domínio oficial ou de URL de imagem extraída de uma página oficial/publicadora confiável realmente consultada. CDNs compartilhadas e hosts comunitários Steam Community/Fandom deixaram de ser aceitos isoladamente; downloads também exigem HTTPS.
- **OB-21:** a cópia agora consulta, com colunas explícitas e filtro pelo titular, comentários e curtidas em comentários de notícias, conteúdo e interações do Brickboard, progresso/XP, temporadas, conquistas/recompensas, follows, preferências, votos de lançamentos, denúncias, notas/votos, preferências administrativas e clubes criados ou integrados pelo titular. Campos com IDs de terceiros (`actor_id`, `reviewed_by`) e o JSON de compartilhamento que pode conter conteúdo de outro usuário não são incluídos.
- **OB-59:** a exportação de conta deixou de aceitar/enviar `x-orange-brick-device`; reações e leituras anônimas foram removidas do manifesto e da API autenticada e aparecem como escopo excluído no JSON/UI. Elas não são atribuídas à conta conectada.

## Revisão e limitações desta etapa

### Revisão complementar de OB-110

- A API mantém o voto anterior em caso de falha no UPSERT e trata erro na consulta de contagens sem marcar o voto já salvo como falho.
- As telas de lançamentos e de jogos não fazem mais fallback de DELETE seguido de INSERT. Quando a resposta não traz contagens, tentam consultá-las separadamente; a tela informa quando essa atualização falha.
- A revisão foi estática. Build, lint e testes continuam pendentes conforme a restrição desta etapa.

- `git diff --check` não encontrou erros de whitespace; Git avisou apenas sobre conversão automática de LF para CRLF nos arquivos editados.
- Não foram executados build, lint, suíte de testes, migrations, uploads reais, chamadas mutáveis nem deploy nesta etapa.
- A aplicação remota depende de publicar o código/configuração, executar as migrations OB-41 e OB-54 em fluxo controlado e repetir os preflights de CORS. Até lá, a correção local não remove os achados do ambiente publicado.
- Permanecem sem correção nesta etapa os demais itens do relatório, incluindo segredo histórico/rotação, backup e recuperação, idempotência do webhook, exclusão de conta retomável e os achados dependentes dos painéis externos.
- As verificações automáticas de fonte editorial usam uma heurística lexical de correspondência e não provam suporte semântico a cada afirmação. A revisão final continua necessária; nenhuma função de geração, busca, upload ou publicação foi executada nesta etapa.
- A exportação expandida não foi exercitada contra o PostgREST remoto. Se alguma relação adicionada não estiver publicada no ambiente implantado, a geração da cópia falha inteira em vez de baixar um arquivo incompleto; deployment e schema permanecem pendentes.

### Continuação de OB-21 e OB-59 — 06/10/2026

- A revisão das tabelas locais identificou também `article_comment_likes`, `game_clubs` e `game_club_members`; os dois últimos não têm consumidores encontrados em `src/`, mas foram incluídos por possuírem vínculo de autoria/participação com `auth.users`.
- A rota agora usa projeção explícita também para comentários, posts/comentários/reação/votos/likes da comunidade, notificações e perfil. O cursor numérico de `user_follows` exige inteiro seguro, não negativo e alinhado ao tamanho de página de 100 registros.
- A consulta privilegiada usa filtro pelo titular (`user.id`) em cada conjunto: `user_id`, `reporter_id`, `created_by` ou e-mail autenticado, conforme a tabela. A projeção omite identificadores de terceiros em notificações e denúncias, `ip_hash` de contato e JSON de compartilhamento potencialmente contendo perfil/conteúdo de outro usuário.
- O objeto principal também inclui metadados de autenticação pertencentes ao titular (telefone, confirmações, provedores vinculados e `user_metadata`), sem serializar sessão, JWT, fatores MFA ou todo o `app_metadata` administrativo.
- A lista do cliente deriva do mesmo manifesto; a exportação deixa de mandar o identificador anônimo do aparelho. Leituras e reações anônimas permanecem declaradas como fora do escopo da cópia de conta.
- Verificação apenas estática de código e migrations locais. Não foi chamada a API PostgREST, não houve teste autenticado nem confirmação do schema remoto. A disponibilidade de todas as relações no ambiente implantado permanece NÃO VERIFICADA; qualquer falha continua abortando a exportação inteira, sem produzir cópia parcial.

### Correção local de OB-27 — 06/10/2026

- `sendSingleReportAlert` agora exige `ok: true` na resposta JSON do Telegram. A rotina não captura e ignora falhas antes de avançar o watermark; registra a falha sem conteúdo da denúncia e propaga o erro. Assim, a denúncia que falhou continua após o watermark e pode ser tentada novamente na próxima execução.
- Limitação: o estado ainda usa um watermark global por timestamp, não uma outbox por denúncia; falhas durante a gravação do estado podem causar reenvio duplicado, e o lock continua sendo não atômico conforme OB-38. A validação é estática; nenhuma notificação foi enviada e o deployment remoto não foi confirmado.

### Revisão e correção local de OB-39 — 06/10/2026

- O `NewsList` atual já captura falhas e suspende o observador automático até nova ação. A correção agora interpreta `Retry-After` como segundos ou data HTTP, usa 60 segundos se o cabeçalho estiver ausente/inválido e desativa o botão manual durante a espera. O sentinel só volta a observar quando o estado de erro é limpo pela ação manual.
- Revisão apenas estática; não foram simuladas respostas HTTP nem executados testes de componente. O bloqueio automático está no cliente; o limite da API continua sendo a proteção server-side.

### Correção local de OB-40 — 06/10/2026

- A rota `/api/errors` agora retorna `503` quando a RPC de limite falha ou não retorna decisão, e quando a gravação falha. Retorna `204` somente quando o evento é salvo ou deliberadamente descartado por exceder o limite. Os logs contêm apenas o código do erro, sem a mensagem do cliente.
- Limitação: `src/app/error.tsx` envia a telemetria sem aguardar a resposta, portanto a falha fica observável no servidor, mas não é re-enviada pelo navegador. Nenhuma RPC foi chamada durante esta correção.

### Revisão de OB-42 — 06/10/2026

- O checkout atual já contém mitigação: a tela de notificações diferencia carregamento/erro, oferece retry, desativa edição enquanto a leitura falha e exibe link de login quando não há sessão. `save()` também bloqueia a gravação sem sessão ou após falha de leitura.
- Não alterei código neste item. O schema remoto de `notification_preferences` continua sem confirmação e a auditoria registrou `PGRST205`; a situação de produção permanece NÃO VERIFICADA.

### Correção local de OB-43 — 06/10/2026

- A carga inicial e a atualização de XP no Brickboard agora verificam `error` e resposta vazia da RPC, capturam rejeições de rede e preservam o último progresso conhecido. Em falha, a tela mostra estado acessível com retry manual.
- Revisão estática; não foi simulada falha da RPC nem executado teste de componente. A disponibilidade remota da função `current_user_progress` não foi confirmada.

### Revisão de OB-44 e correção local de OB-45 — 06/10/2026

- OB-44 já está corrigido no checkout por `community_poll_results(p_poll_id)`, que retorna somente contagens e a escolha do usuário atual. O feed usa essa RPC e agora mostra erro em vez de inventar contagens zeradas se ela estiver indisponível. A migration local é `20260930000000_community_poll_results.sql`; aplicação remota não confirmada.
- OB-45: a migration nova `20261006000000_community_feed_public_reactions.sql` altera `community_feed_page` para `SECURITY DEFINER` com `search_path` vazio e referências qualificadas. A função retorna apenas a reação agregada e a reação do próprio usuário; nenhum grant de leitura das linhas de `community_reactions` foi adicionado para `anon`.
- Revisão estática apenas. A migration não foi executada; contagens para visitante e política remota seguem NÃO VERIFICADAS até aplicação em ambiente de teste/deploy controlado.

### Revisão e correção local de OB-51 e OB-52 — 06/10/2026

- OB-51: o caminho do Brickboard já propaga erro para `BrickCard`, que só limpa/fecha após sucesso. Corrigi também o callback de republicação usado em perfis: agora verifica o resultado do INSERT e rejeita a promessa em falha, preservando o texto digitado e liberando o estado de envio no componente.
- OB-52: o checkout já espera a resposta do banco antes de atualizar o voto, o contador e o toast; erros mostram mensagem e não confirmam sucesso. O carregamento das preferências de voto tem estado de erro e bloqueia novas mutações até retry.
- Sem execução de INSERT/DELETE real ou teste de componente; revisão estática.

### Correção local de OB-53 — 06/10/2026

- Edição e exclusão de posts no Brickboard agora verificam o erro e a presença da linha retornada pelo Supabase. A falha é propagada ao `BrickCard`, que mantém o diálogo aberto, preserva o texto de edição e anuncia a mensagem com `role="alert"`.
- A exclusão deixou de remover o post da lista antes da confirmação do banco. A remoção da imagem é tratada separadamente: se falhar depois da exclusão do post, o diálogo pode fechar porque a publicação já foi apagada, enquanto a tela informa a pendência de limpeza do arquivo.
- A exclusão na página de perfil também filtra pelo titular, confirma a linha removida e só atualiza a lista após sucesso.
- Revisão apenas estática. Nenhuma edição/exclusão real ou teste de componente foi executado; políticas e respostas remotas permanecem não verificadas.

### Correção local de OB-58 — 06/10/2026

- A migration `20261006000001_comments_owner_delete.sql` concede DELETE apenas ao papel `authenticated`, revoga esse privilégio de `PUBLIC` e `anon` e aplica policy que permite excluir somente quando `auth.uid() = user_id`.
- O hook filtra novamente pelo titular, confirma a linha removida e propaga falhas. O diálogo do comentário permanece aberto, mostra erro acessível e bloqueia ações concorrentes até a resposta.
- Revisão estática; a migration não foi aplicada, e nenhuma exclusão real foi executada. O comportamento de cascata da tabela de curtidas depende da foreign key local e ainda não foi verificado remotamente.

### Correção local de OB-56 e OB-57 — 06/10/2026

- A migration histórica `20260928000002_article_comment_threads.sql` agora declara `comments.parent_id` antes de criar o índice/FK. A nova migration `20261006000002_comment_reply_depth_guard.sql` repete a adição com `IF NOT EXISTS` para ambientes onde a migration histórica já foi registrada e instala guards de INSERT/UPDATE nas tabelas `comments` e `community_comments`.
- Os guards rejeitam, no banco, um pai que já seja resposta. Isso mantém o limite de um nível que os dois renderizadores atuais exibem e também vale para gravações diretas via PostgREST.
- Revisão estática apenas. As migrations não foram aplicadas nem testadas em PostgreSQL; ordem real do ledger e compatibilidade do schema remoto continuam pendentes de staging.

### Revisão de OB-55 e correção local de OB-60 — 06/10/2026

- OB-55 já está mitigado no componente do checkout: carregamento diferencia erro, vazio e progresso; falhas de leitura e de envio são capturadas, o botão de envio fica pendente/desabilitado e votos indisponíveis são bloqueados. Não alterei o componente nesta revisão.
- OB-60: `generate-image` agora limita a leitura incremental da resposta a 10 MiB, cancela o corpo ao exceder o teto ou receber `Content-Length` excessivo e aplica timeout de 60 segundos à chamada externa. O destino continua fixo e não houve chamada ao provedor nem upload.
- Revisão estática apenas; compatibilidade com o runtime remoto da Edge Function e comportamento sob resposta truncada/timeout não foram exercitados.

### Revisão e correção local de OB-61 e OB-62 — 06/10/2026

- OB-61 já estava mitigado no checkout: a página usa `release_date` ISO para o calendário e seu metadata não fixa o ano. Não precisei alterar esses pontos.
- OB-62: o calendário agora forma grupos de segunda a domingo usando a data ISO, com rótulos que incluem mês e ano mesmo quando a semana cruza uma virada de mês/ano. O filtro mensal permanece disponível como filtro; o agrupamento principal segue semanas.
- Revisão estática apenas; datas remotas e exibição visual em viradas de ano não foram testadas em navegador.

### Correção local de OB-63 e OB-64 — 06/10/2026

- A página de lançamentos deixa de converter falha da RPC em mapa vazio; quando a leitura server-side falha, o cliente tenta carregar de novo e apresenta estado indisponível com retry, sem declarar que não há votos. As contagens só são marcadas como carregadas após uma resposta sem erro.
- A seleção do voto pessoal é considerada confiável somente depois de `get_my_release_hype_votes` concluir para a sessão atual; a gravação fica bloqueada enquanto essa leitura está pendente ou falha. O detalhe do jogo já consulta o voto anterior antes de mutar; agora também só marca o proprietário após a leitura e informa quando a confirmação inicial falhou.
- O resumo de hype na matéria agora trata falhas de leitura e oferece retry; “Sem votos” só aparece após consulta bem-sucedida.
- Revisão estática apenas. Nenhuma RPC ou voto foi executado; deploy das funções/migrations de voto continua pendente.

### Revisão local de OB-65 a OB-69 — 06/10/2026

- OB-65: as telas globais de 404 e erro agora incluem `<main id="conteudo-principal" tabIndex={-1}>`, destino compatível com o skip link do layout.
- OB-66 já estava mitigado no checkout: o indicador da navegação só é renderizado quando existe item ativo.
- OB-67 já estava mitigado: o texto do skeleton usa cor estática e não pulsa; a animação restante é apenas decorativa no ícone.
- OB-68 já estava mitigado: a sentinela visual do Brickboard está oculta da árvore acessível e não usa `aria-label` em `div` genérico.
- OB-69 já estava mitigado: o texto visível dos dois estados do botão de push corresponde ao `aria-label`.
- Revisão estática apenas; não rodei axe nem repeti medições em navegador após as correções locais.

### Correção local de OB-70 — 06/10/2026

- O cabeçalho da lista de notícias vem antes da matéria em destaque e usa H1 na homepage; a matéria principal passa a H2, os destaques secundários H3 e os cards da lista usam o nível seguinte ao cabeçalho de feed. O rodapé deixou de saltar diretamente para H4 e usa H2 para as duas seções.
- A validação foi estática. Não repeti Lighthouse/axe e não medi a ordem final no DOM renderizado.

### Correção local de OB-71 e OB-72 — 06/10/2026

- A API administrativa agora filtra `pending`, `resolved` ou `all` no banco, devolve a contagem exata de pendentes e o total do filtro selecionado. As páginas usam cursor composto por `created_at` e `id`, com ordenação estável e 50 registros por resposta.
- O painel exibe a contagem global de pendentes, recarrega cada aba no servidor, oferece carregamento incremental e diferencia erro, carregamento, lista vazia e busca sem resultado. A busca local declara seu escopo e pode ser ampliada carregando páginas adicionais.
- Revisão estática do handler e da tela. Não executei testes/build, não consultei nem alterei o banco. A integração e a paginação real ainda precisam ser verificadas em staging.
### Correção local de OB-73 a OB-75 — 06/10/2026

- OB-73: a rota da biblioteca exclui do resultado e da contagem as categorias já ocultadas, ordena por `created_at` e `id`, valida cursor e devolve páginas de 50 imagens. A tela carrega páginas adicionais, atualiza o total exato e informa que a busca local cobre os itens carregados.
- OB-74: a limpeza do Radar agora seleciona lotes estáveis de 100 itens vencidos ainda ativos ou com imagem associada, remove Storage/biblioteca com verificação de erro e desativa/limpa cada lote antes de buscar o próximo. O progresso por lote evita que os mesmos itens voltem a ocupar a primeira página.
- OB-75 já estava corrigido no checkout: a exclusão da biblioteca verifica `libraryError` e retorna falha HTTP em vez de declarar sucesso. Mantive essa checagem.
- Revisão estática; não consultei o PostgREST remoto, não chamei Storage, não executei o cron, nem rodei testes/build. Paginação, limites operacionais e recuperação de falhas parciais precisam de validação em staging.
### Revisão e correções locais de OB-76 a OB-85 — 06/10/2026

- OB-76 já estava mitigado no checkout: a API confere as quatro contagens e categorias e retorna 503 diante de erro; o painel preserva os últimos valores e oferece estado de erro com nova tentativa.
- OB-77: o diálogo de ajuste de XP agora usa `useModalDialog`, com foco inicial, contenção de Tab/Shift+Tab, Escape e restauração do foco.
- OB-78: removi as três abas laterais que não tinham painéis associados; permaneceu o painel funcional de publicação.
- OB-79: atualizações normais e fallback do editor agora selecionam o ID afetado e tratam zero linhas como falha, mantendo o rascunho local. Nenhuma matéria foi salva.
- OB-80: o efeito do editor invalida execuções antigas após cada espera e no cleanup; salvar fica desabilitado durante carregamento e também tem guarda no handler.
- OB-81 já não corresponde ao código atual: a rota legada redireciona para `/u/[username]`, que busca o perfil no servidor e não contém o efeito client-side citado no achado. Não alterei esse fluxo.
- OB-82: metadados e página institucional usam `Object.hasOwn` para aceitar somente os slugs próprios do mapa.
- OB-83: removi o fallback que baixava todas as reações e visualizações; erro do RPC é registrado apenas pelo código e o ranking degrada para matérias recentes com aviso visível.
- OB-84: RSS e sitemaps retornam 503 sem cache em falha de consulta; o sitemap geral também pagina jogos ativos e verifica o erro de cada lote.
- OB-85: trechos Markdown inválidos agora são emitidos como texto literal, sem recursão sobre a mesma string.
- Revisão estática; não rodei testes/build, não usei sessões autenticadas e não fiz consultas remotas. A interação dos modais, o editor sob rede concorrente e as respostas dos endpoints precisam de verificação em ambiente isolado.
### Revisão e correções locais de OB-86 a OB-97 — 06/10/2026

- OB-86, OB-87, OB-89 e OB-93 já estão mitigados no checkout: array vazio estável/efeito dependente do filtro, gravação otimista somente após sucesso, slides fora da faixa com `inert`/`tabIndex`/`aria-hidden`, e `returnTo` derivado de `useSearchParams`. OB-90 também já está resolvido: os quatro módulos sem consumidores não existem mais na árvore atual.
- OB-88: falha da contagem de comentários agora é apresentada como “respostas indisponíveis”, mantendo as conversas visíveis sem converter erro em zero.
- OB-91: timestamps futuros mostram data e hora local em vez de “agora”. OB-92: a navegação móvel usa no mínimo `text-xs` em todas as larguras.
- OB-94: o fan-out percorre assinaturas por cursor estável no endpoint único, em lotes de 100 e com concorrência limitada; preferências de opt-out também são paginadas. Erros ao remover assinaturas expiradas passam a contar como falha.
- OB-95 já tem mitigação local: `supabase/config.toml` desativa signup anônimo e a migration `20260929000000_restrict_anonymous_community.sql` bloqueia contas `is_anonymous` nas tabelas comunitárias e na RPC de denúncias. OB-96 também tem migration local de revogação/allowlist; OB-97 já tem nomes de migration únicos no checkout. Nenhum desses três estados remotos foi alterado ou confirmado nesta etapa.
- Revisão estática. Não enviei push, não criei sessão anônima, não consultei/configurei Auth remoto, não apliquei migrations e não rodei testes/build. OB-95 a OB-97 dependem de deploy/validação do ledger remoto para fechar em produção.

### Revisão e correções locais de OB-103 a OB-115 — 06/10/2026

- OB-103: a API de perfil deixou de gravar tema, título e moldura com credencial de serviço. A tela persiste esses itens somente pelo RPC autenticado 'set_profile_cosmetics' e apresenta falha parcial quando o RPC retorna erro.
- OB-104 já estava mitigado no checkout: o servidor aceita avatar Google confiável ou arquivo no caminho de Storage pertencente ao usuário; o renderizador também rejeita hosts externos não confiáveis.
- OB-105 a OB-107 já estavam mitigados no checkout: a fonte para publicação automática precisa ser uma página específica consultada e relacionada ao assunto; falas só são marcadas como verificadas quando comparadas com o texto da página; o preenchimento genérico para atingir a contagem mínima foi removido.
- OB-108 já estava mitigado no checkout: CDNs compartilhadas genéricas deixaram de ser allowlist direta. A origem da imagem precisa ser um domínio oficial aprovado ou URL extraída de uma página editorial confiável efetivamente consultada, além da revisão visual.
- OB-109: o cron agora propaga a falha quando bot_state não existe e bloqueia a publicação se a atualização do registro do lock não afetar uma linha. A expectativa do teste existente foi atualizada; testes não foram executados.
- OB-110 já estava mitigado no checkout pelo UPSERT do voto e tratamento explícito da falha da RPC de contagens.
- OB-111 já estava mitigado no checkout: o workflow manual chama diretamente https://orangebrick.blog, sem depender do redirect do host legado.
- OB-112: MIN_IMAGE_HEIGHT agora é usado na validação e exige 675 pixels, junto ao mínimo horizontal de 1200 pixels.
- OB-113: novos anexos do Brickboard pedem descrição alternativa de até 300 caracteres; o texto percorre os fluxos de publicação, feed, perfis e exportação. A migration 20261006000004_community_post_media_alt.sql adiciona o campo e bloqueia novos anexos sem descrição. Registros antigos sem descrição não foram alterados; a interface os identifica como imagens sem descrição alternativa.
- OB-114: o hook deixou de ler diretamente IDs de curtidas. A migration 20261006000003_article_comment_like_summaries.sql oferece contagens agregadas e uma RPC autenticada e idempotente para curtir/descurtir; acesso direto à tabela foi revogado para clientes. A migration ainda precisa ser aplicada e validada no ambiente remoto.
- OB-115: os handlers GET/POST de perfil agora distinguem falha ao consultar public_profiles de perfil inexistente; o GET retorna 503 sem tentar inserir outro perfil quando a view falha. A view já existe em migration local; exposição/cache PostgREST no remoto permanece pendente.

Revisão estática somente. git diff --check terminou sem erros de whitespace; Git emitiu avisos de conversão LF/CRLF nos arquivos do checkout. Não rodei build, lint nem testes, e não executei migrations, cron, RPC ou chamadas ao Supabase. A validação das migrations e a publicação do código dependem de um fluxo controlado no ambiente remoto.

### Continuação da remediação local — 06/10/2026

- OB-06: `toggle-reaction` agora usa a RPC `get_post_stats` para receber totais agregados no banco, sem transferir todas as reações para o Edge Function. A RPC já existia e é restrita a `service_role`.
- OB-32: criada a RPC pública `public_profile_safe`, que remove `progress.active_days` quando `show_activity_stats` está desativado; a execução direta da RPC antiga foi revogada para `PUBLIC`, `anon` e `authenticated`, e as páginas que a chamavam foram atualizadas. A migration `20261006000005_public_profile_privacy_rpc.sql` precisa ser aplicada antes da publicação do código.
- OB-48: a consulta do Brickboard exclui enquetes vencidas, limpa o estado quando não há enquete ativa e o widget passa a receber e exibir o erro de voto. A página também oculta uma enquete carregada quando seu prazo expira enquanto ela está aberta.
- OB-50: revalidação do checkout confirmou que a troca de tipo já usa uma única instrução `UPDATE` sob a policy do titular; não há a sequência `DELETE` seguida de `INSERT` descrita no achado. Classificação local: mitigado; a validação comportamental em banco isolado ainda não foi executada.
- OB-37: a API administrativa agora usa cursor composto `created_at` + `id`, retorna lotes de 50 e indica se existe lote anterior; a tela permite carregar mensagens mais antigas e evita duplicar itens já exibidos.
- OB-34: o painel de saúde percorre os posts em páginas de 500 com projeção somente dos campos usados e ordenação estável (`updated_at`, `id`), evitando depender de uma única resposta sujeita ao teto do PostgREST.
- OB-38: os alertas de denúncia usam RPCs de aquisição, renovação e liberação por token; o banco concede o lock a somente uma chamada por vez, e cada envio renova o lease antes de contatar o Telegram. A migration `20261006000006_report_alert_lock.sql` deve ser aplicada antes de publicar o código.
- OB-27: o marcador passou a armazenar cursor composto por `created_at` e ID, evitando perda de relatórios com o mesmo timestamp. Valores antigos em formato timestamp continuam aceitos; a leitura/gravação/exclusão de `bot_state` agora propaga erros, e os chamadores registram o tipo da falha sem incluir conteúdo da denúncia. Ainda existe ambiguidade se o Telegram aceitar o envio e a resposta HTTP se perder; a integração externa não fornece chave idempotente neste fluxo.
- OB-35: revalidei a proteção local: `send-push-notification` aceita a chave de serviço apenas no ramo de notícias, compara a credencial no servidor e `verify_jwt` está desativado nessa função no `config.toml`. Deployment e secrets remotos não foram verificados.
- OB-40: o handler atual verifica erros de `consume_rate_limit` e `record_app_error`, retorna 503 em falhas e registra somente código de erro no log; não precisei alterar o fluxo.
- OB-41: a página pública usa `POST_DETAIL_PUBLIC_COLUMNS`, e a migration local `20261005000100_restrict_public_post_columns.sql` revoga o SELECT amplo e concede ao cliente somente as colunas públicas. A migration ainda depende de aplicação e validação remota.
- OB-43: o Brickboard já distingue falha/ausência do progresso, mostra estado de erro e oferece nova tentativa; revalidação estática, sem chamada à RPC.

Esta nota registrava o estado antes da validação final. Os resultados atualizados, a checagem somente leitura do Supabase e as limitações desta etapa estão no adendo final abaixo.

# ADENDO FINAL — VALIDAÇÃO E STATUS CONSOLIDADO — 06/10/2026

Este adendo atualiza o status do checkout após as correções e verificações desta etapa. Os scores e o Top 20 anteriores permanecem como linha de base anterior às correções; o estado da produção não foi recalculado nem alterado.

## Estado dos achados

| Estado no checkout | Quantidade | IDs |
|---|---:|---|
| Mitigados localmente por revisão estática; aguardam validação/publicação conforme cada caso | 60 | OB-06, OB-20, OB-21, OB-23, OB-24, OB-32, OB-34, OB-35, OB-37, OB-38, OB-40, OB-41, OB-43, OB-48 a OB-50, OB-53, OB-54, OB-56, OB-58 a OB-60, OB-62 a OB-65, OB-67 a OB-69, OB-71 a OB-75, OB-77 a OB-80, OB-82 a OB-85, OB-88, OB-90 a OB-92, OB-94, OB-103 a OB-115 |
| Residuais de código/segurança/testes no checkout | 9 | OB-01, OB-05, OB-12, OB-19, OB-27, OB-28, OB-29, OB-31, OB-36 |

Os nove residuais correspondem a 1 Crítico (OB-01), 7 Médios (OB-05, OB-12, OB-19, OB-27, OB-28, OB-29, OB-36) e 1 Baixo (OB-31). Isso é uma contagem dos resíduos de código dessa lista-base; não inclui riscos dependentes de configuração/deploy. Mitigação no checkout não encerra o risco no deployment publicado.

Pontos residuais principais:

- OB-01: revogar a credencial histórica e confirmar rotação coordenada entre Supabase, Vercel, Edge Functions e workflows; a igualdade entre o valor histórico e o secret publicado não foi verificada nesta etapa.
- OB-05: confirmar escopo/validade da chave Google histórica e revogá-la se ainda ativa.
- OB-12: conteúdo externo ainda pode influenciar semanticamente o texto do modelo; schema e instruções não demonstram isolamento semântico.
- OB-19: os testes atuais passaram, mas ainda falta cobertura integrada autenticada de IA, Telegram, publicação, Supabase e Edge Functions.
- OB-27: o cursor composto e o lock local reduzem perda e concorrência; permanece possibilidade de duplicação se o Telegram aceitar a mensagem e a resposta HTTP se perder.
- OB-28: o webhook do Telegram ainda não deduplica `update_id`.
- OB-29: a exclusão de conta ainda não possui estado durável de retomada após falha entre Storage, banco e Auth.
- OB-31: MFA/AAL2 não foi confirmado nos controles do Supabase nem imposto no código da aplicação.
- OB-36: a repetição de ações autenticadas ainda pode gerar notificações push duplicadas.

## Verificações executadas

| Comando/ferramenta | Resultado |
|---|---|
| `npm run production:check` | Exit 1; `ready:false`. As 11 relações e quatro RPCs consultadas responderam. A VAPID pública está ausente no ambiente local, aliases antigos do Supabase ainda estão definidos e o backup local encontrado tem 102,9 horas. |
| `node --test ...` padrão | O runner falhou antes dos casos com `spawn EPERM` ao criar subprocessos no ambiente. |
| 27 arquivos executados individualmente com `node --experimental-strip-types` | 27/27 passaram. O workaround evitou o subprocesso interno do runner. |
| `npx tsc --noEmit --incremental false` | Passou. |
| `npm run lint -- src tests` | Passou, sem avisos ou erros nesses diretórios. |
| `npm run lint` | Exit 1 por dois avisos preexistentes em `scratch/test-google-news-url.mjs:1` (`fetchValidatedRemote` e `readResponseBuffer` não usados); não alterei o arquivo de scratch. |
| `npm run textcheck` | Passou: integridade textual em 413 arquivos. |
| `git diff --check -- src tests supabase` | Passou; Git emitiu apenas avisos de conversão LF/CRLF. |
| `npm run build` em cópia temporária, sem `.env.local` e com Supabase apontado para loopback | Não concluiu. O Controle de Aplicativos do Windows bloqueou o módulo nativo SWC; o fallback também não pôde criar cache em `%LOCALAPPDATA%`. Nenhum output de build foi escrito no workspace. |

Playwright/axe e a matriz responsiva não foram repetidos: o build local não pôde iniciar por bloqueio do SWC. O runner E2E inicia o servidor a partir de um build local; não apontei testes automatizados para o site de produção.

## Estado remoto e migrations

A checagem PostgREST foi somente leitura e não imprimiu linhas nem valores de segredo. Neste alvo, as 11 relações exigidas pelo script, a coluna `editorial_images.content_sha256` e as RPCs `community_poll_results`/`community_feed_page` com as chaves de serviço e pública responderam. Isso não valida RLS de todos os papéis nem verifica relações que o script não consulta, incluindo `public_profiles` e `article_comment_likes`.

O checker local contou 82 versões de migration e nenhuma duplicata no checkout. `remote_history_confirmed:true` e `external_checks.ready:true` vieram das flags de confirmação do processo; o script não consultou o ledger remoto nem os painéis Vercel nesta execução. O checker continuou `ready:false` por ausência local de `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, aliases legados presentes e backup local obsoleto, criado em 02/10/2026 às 11:59 UTC. Nenhum backup novo ou restauração foi executado.

Continuam pendentes de aplicação/validação remota, conforme os adendos por achado, as migrations `20261005000100_restrict_public_post_columns.sql` e `20261006000000_community_feed_public_reactions.sql` a `20261006000006_report_alert_lock.sql`, além da reconciliação de migrations anteriores. Não apliquei migrations, não alterei secrets, configuração de Auth, workflows, DNS ou deployment. As CLIs `vercel`, `supabase` e `gh` não estão disponíveis neste ambiente; não há conector de gestão Supabase/Vercel nesta sessão.

## Ajustes encontrados durante a validação

A rodada final corrigiu o fechamento JSX do título `h2` em `src/components/feed/NewsFeed.tsx:229`, adicionou validação da resposta da RPC de votos em `src/app/api/release-hype-vote/route.ts:10-18,73-77`, restabeleceu o envio do identificador de aparelho pela exclusão de conta em `src/components/ui/PrivacyControls.tsx:121`, corrigiu tipos e confirmação de operações em `src/lib/hooks/useCommunityFeed.ts`, e removeu violações de lint/atualização de ref no Brickboard e nas rotinas relacionadas. Os fixtures editoriais agora fornecem URLs específicas e fontes marcadas como verificadas, sem enfraquecer os gates.

## Próximas ações para declarar prontidão

1. Em staging, reconciliar o ledger completo e testar as migrations acima contra schema, RLS e chamadas anônimas/autenticadas.
2. Gerar e comprovar um backup completo, externo e restaurável antes de qualquer alteração remota.
3. Rotacionar/revogar as credenciais históricas após mapear todos os consumidores; atualizar a VAPID e confirmar a configuração real da Vercel/Supabase.
4. Publicar código, Edge Functions e migrations aprovadas em sequência controlada; confirmar cron, CORS, MFA, `public_profiles`, `article_comment_likes` e o workflow remoto do Drive.
5. Executar build em máquina/runner cujo SWC seja permitido e repetir Playwright/axe; observar os fluxos de geração e notificações sem usar dados de produção.
6. Recalcular scores, Top 20 e severidades usando evidência do deployment após as validações. Até então, este relatório não atesta produção pronta.

### Atualização incremental após início da remediação local — 06/10/2026

- OB-28: o handler valida `update_id` e usa RPCs atômicas sobre `bot_state` para adquirir, concluir ou liberar um lock com lease de cinco minutos. Updates concluídos são reconhecidos sem repetir o handler; concorrência ativa pede retry ao Telegram; falhas do handler liberam o lock. A migration `20261006000007_telegram_webhook_update_dedup.sql` limita as RPCs a `service_role` e remove registros concluídos após 30 dias.
- Contagem local atualizada em relação à linha de base acima: 61 achados mitigados no checkout e 8 residuais de código/configuração, condicionados às mesmas limitações de deploy e validação remota. OB-28 fica mitigado para replays concorrentes e posteriores à conclusão normal.
- Limitação remanescente: se efeitos externos forem concluídos, mas a confirmação final no banco falhar, a recuperação após o lease pode executar o update novamente. A solução não fornece semântica exatamente-uma-vez para efeitos externos; isso exigiria idempotência durável nas operações de negócio ou outbox.
- Verificação local: `npx tsc --noEmit --incremental false`, lint dos dois arquivos TypeScript alterados e `git diff --check` passaram. Não executei testes do webhook, não apliquei nem executei a migration, não enviei requisições ao Telegram/Supabase e não publiquei o código.
- Ordem necessária para implantação: validar e aplicar a migration em staging; testar replay, concorrência e falha/retomada em ambiente isolado; só então publicar o handler. O deployment atual continua sem essa mitigação confirmada.

### Preparação para aplicação das migrations — 06/10/2026

- O usuário autorizou explicitamente a aplicação das migrations Supabase. Nenhuma migration foi executada nesta tentativa.
- O projeto vinculado em `supabase/.temp/project-ref` coincide com o host `NEXT_PUBLIC_SUPABASE_URL` do ambiente local. O checkout contém 83 arquivos SQL com versões únicas.
- O histórico remoto atual não pôde ser consultado: a CLI Supabase não está instalada, não há `SUPABASE_ACCESS_TOKEN` nem senha PostgreSQL disponíveis no processo, e uma requisição somente leitura ao projeto falhou por conexão de rede. As chaves de API presentes em `.env.local` não substituem uma credencial de gestão ou de conexão PostgreSQL para aplicar migrations.
- A integração Supabase está disponível para conexão, mas não estava instalada nesta sessão; ela foi sugerida ao usuário. O último ledger confirmado no relatório é histórico e não representa o estado atual.
- Em `tmp/backups`, a cópia local mais recente está marcada `complete:false` (02/10/2026); a última marcada `complete:true` terminou em 01/10/2026, cerca de cinco dias antes desta revisão. A restauração e a cobertura do estado atual não foram confirmadas.
- Os dez SQLs de 05–06/10 foram lidos estaticamente. Eles criam/substituem RPCs, índices, triggers e alteram grants/policies. Antes de aplicar, é necessário obter o ledger remoto atual, reconciliar a versão histórica ambígua `20260727000000`, validar uma recuperação recente e executar um `db push --dry-run` no projeto correto.

### Reconciliação remota pelo terminal — 07/10/2026

- O Supabase CLI 2.120.0 foi executado via `npx` e autenticado no terminal. `supabase migration list --linked` confirmou 36 versões remotas. Após recuperar a migration remota `20261006203718_game_entities_core.sql` com `supabase migration fetch` e copiá-la integralmente para o checkout (SHA-256 igual ao arquivo recuperado), há 84 arquivos locais e 48 versões locais ainda não registradas no histórico remoto.
- A versão `20261006203718` está aplicada no remoto e é posterior às 48 versões locais pendentes. `supabase db push --linked --dry-run --skip-vault` interrompeu a execução e exigiu `--include-all`; nenhuma migration foi aplicada. A tentativa de `--include-all --dry-run` caiu na conexão temporária com o pooler (`ECONNRESET`); uma segunda tentativa foi encerrada após aguardar sem resposta.
- Consultas somente leitura via `supabase db query --linked` confirmaram as tabelas `games`, `game_posts`, `game_community_posts` e `user_game_tracking`. Naquele momento, havia 403 itens no Radar, zero linhas em `games`, zero vínculos `release_radar_items.game_id` e zero linhas em `game_posts`; o backfill ainda estava pendente.
- O schema remoto diverge do ledger: `user_follows` e `community_notes` já existem embora a migration local que as cria não conste como aplicada; `post_versions` e as colunas `posts.scheduled_at`/`posts.publish_to_brickboard` ainda não aparecem no schema remoto. Assim, marcar as 48 versões como aplicadas ou executar `--include-all` sem reconciliação individual poderia mascarar objetos ausentes ou colidir com objetos já existentes.
- O backup criptografado de 07/10 exportou as 47 tabelas públicas expostas e cinco usuários sem falhas nessas partes, mas terminou `complete:false`: 413 de 420 objetos do bucket `post-images` foram baixados; sete falharam. `public.backup_runs` não contém registros. A exportação de schema com `supabase db dump` não pôde rodar porque Docker/Podman não estão instalados.
- Até esse ponto da reconciliação, nenhuma migration, repair, seed, alteração de Vault ou outra escrita remota havia sido executada. A definição SQL de `game_entities_core` foi sincronizada localmente; a aplicação das migrations então pendentes exigia reconciliar conteúdo e ordem com o schema real e confirmar um caminho de recuperação antes de qualquer alteração em produção.
- `supabase branches list` retornou nenhum branch de prévia. A segunda tentativa de `db push --include-all --dry-run` permaneceu sem resposta na conexão PostgreSQL e foi encerrada sem alteração remota. Uma leitura REST do Radar respondeu: 403 itens, 390 nomes normalizados distintos, 13 nomes repetidos, 259 datas preenchidas e cinco `post_slug`; um backfill precisa agrupar as duplicatas e validar os vínculos com notícias antes de ser aplicado.

### Aplicação controlada de migrations pelo terminal — 07/10/2026

- O Supabase CLI autenticado listou o projeto Orange Brick `hmjqqoselkgtfkkqrnit` como `ACTIVE_HEALTHY`. `supabase backups list` retornou `walg_enabled:true`, `pitr_enabled:false` e `backups:[]`; isso não fornece uma cópia física restaurável identificada. A segunda execução de `node --env-file=.env.local scripts/backup-supabase.mjs` terminou `complete:true` em `tmp/backups/2026-10-07T16-37-48.927Z`: 47/47 tabelas públicas expostas, cinco usuários e 420/420 objetos do Storage exportados com criptografia, sem falhas. A restauração desse backup lógico não foi testada.
- Como as operações SQL do CLI paravam em `Initialising login role`, as migrations isoladas foram executadas pelo endpoint oficial de consulta SQL da Management API, usando em memória a credencial já salva pelo Supabase CLI no Gerenciador de Credenciais do Windows. O token não foi exibido nem escrito no projeto. Cada aplicação incluiu guarda contra versão já registrada, transação explícita e inserção do conteúdo SQL na tabela `supabase_migrations.schema_migrations`; após cada aplicação, houve consulta somente leitura de confirmação. Uma tentativa inicial do backfill falhou por erro de sintaxe no delimitador do bloco de guarda, antes de executar o corpo da migration, e foi corrigida.
- **`20261007163904_game_catalog_backfill` aplicada e registrada:** o banco agora contém 390 jogos, os 403 itens do Radar têm `game_id`, existem cinco relações `game_posts` e nenhuma ligação órfã. Antes da aplicação, cinco `post_slug` existentes no Radar foram comparados com `posts.slug` e todos encontraram matéria. Dos 13 nomes repetidos, dois grupos tinham datas distintas; a migration mantém `games.release_date` nulo nesses grupos e preserva as datas dos itens do Radar. O backfill não cria ligações `game_community_posts` porque não há correspondência explícita verificada.
- **`20260727000002_editorial_workflow` aplicada e registrada:** `post_versions`, `posts.scheduled_at` e `posts.publish_to_brickboard` foram confirmados após a transação.
- **`20261006000007_telegram_webhook_update_dedup` aplicada e registrada:** as três funções de controle de updates existem; `anon` e `authenticated` não possuem `EXECUTE` na função de aquisição e `service_role` possui.
- **`20261006000006_report_alert_lock` aplicada e registrada:** as três funções de lock existem; `anon` e `authenticated` não possuem `EXECUTE` na função de aquisição e `service_role` possui.
- O ledger passou de 36 para 40 versões. Restam **45 migrations locais sem registro remoto**. Não foram aplicadas em lote: `20260727000003_fix_release_radar_images.sql` sobrescreve imagens e datas de lançamentos de julho de 2026 via `ON CONFLICT DO UPDATE`, e `20260803000001_reader_experience.sql` cria policies em tabelas que já existem parcialmente no remoto; executá-las sem reconciliação pode alterar conteúdo atual ou falhar por duplicidade. O deploy de código, Edge Functions e as demais migrations continuam pendentes. Os arquivos novos desta etapa no projeto são a cópia exata de `game_entities_core` recuperada do remoto e `game_catalog_backfill`; o backup está em `tmp/backups`, diretório ignorado pelo Git.

### Continuação da reconciliação e compatibilidade de clientes — 07/10/2026

Este registro substitui a contagem de 45 pendências acima. O inventário atual contém **87 arquivos SQL locais, 76 versões registradas remotamente e 11 versões históricas ainda não registradas**. A contagem foi obtida comparando os nomes dos arquivos com `supabase_migrations.schema_migrations` após as transações. A versão remota do site permanece no commit `32f356d79f86fab6a6102a944206edb4dc9021ba` (02/10); as correções do checkout não foram publicadas nesta etapa.

- **Aplicadas integralmente e verificadas:** `drive_import_registry`; `article_comment_likes` e `article_comment_like_summaries` na mesma transação; `community_comment_threads`; `article_comment_threads`; `release_hype_votes_select_policy`; `post_stats_rpc`; `contact_inbox`; `profile_images_bucket`; `comments_owner_delete`; `comment_reply_depth_guard`; `telegram_admin` com correção do vínculo `profiles.user_id` e revogação de `EXECUTE` anônimo; `privacy_retention` sem executar a rotina de exclusão; `restrict_anonymous_community` com a mesma correção de `user_id` e restrição da função auxiliar; `community_feed_page` e `community_feed_public_reactions` na mesma transação. As versões foram registradas no ledger com o SQL efetivamente aplicado.
- **Aplicada parcialmente com conteúdo real no ledger:** `reader_experience`. As tabelas já existentes foram preservadas; foram criadas apenas `game_clubs` e `game_club_members`, suas policies e índice faltantes.
- **Registradas após comprovar o estado já existente, sem executar novamente o SQL histórico:** `full_text_search`, `editorial_image_fingerprints`, `add_featured_posts`, `profile_gaming_fields`, `newsletter_subscribers`, `post_interest_scores`, `community_poll_results`. O campo `statements` dessas versões contém o SQL de origem para rastreabilidade, embora a instrução não tenha sido reexecutada.
- **Registradas como supersedidas, sem reexecutar, com `statements` vazio:** `fix_release_radar_images`, `add_august_release_radar`, `register_relevant_releases_through_february`, `show_all_august_releases`, `release_radar_filler`, `editorial_transparency`, `admin_operations`, `quality_operations`, `community_notes_recovery` e `normalize_newsletter_subscribers`. Os efeitos necessários das quatro migrations editoriais já estavam presentes; a normalização não tinha linhas a corrigir; os scripts históricos do Radar poderiam reintroduzir itens antigos ou duplicados. O Radar permaneceu com 403/403 vínculos `game_id`.
- **Compatibilidade aditiva recém-aplicada:** `20261007171753_public_profiles_compatibility` criou a view `public_profiles` de 20 colunas com `SELECT` para `anon` e `authenticated`, sem revogar o acesso atual à tabela `profiles`. `20261007171926_safe_client_contract_additions` adicionou os campos opcionais `posts.short_article_reason`, `community_posts.media_alt` e `community_comments.author_username`; criou um trigger que obtém o username do perfil para comentários; disponibilizou `public_profile_safe` e `get_community_comment_like_summaries`. A segunda transação atualizou usernames dos comentários sob contexto temporário de `service_role`; zero comentários ficaram sem username. As duas versões foram registradas com o SQL executado.

**Validação após as alterações:** consulta somente leitura confirmou 76 versões no ledger, a view de 20 colunas, três colunas opcionais, ambas as RPCs, o trigger de username e grants anônimos esperados. Requisições HTTP com a chave pública retornaram 200 para `public_profiles`, a consulta legada de `profiles`, `public_profile_safe` com nome inexistente e `get_community_comment_like_summaries` com lista vazia. Nenhuma moderação, retenção, exclusão de usuário, envio externo ou publicação de matéria foi acionada.

**Onze versões pendentes, por dependência de rollout:** `20260803000002_sync_profile_avatar`, `20260803000004_community_usernames`, `20260924000000_public_profile_view_and_access`, `20260924000002_post_editorial_gate_fields`, `20260924000003_atomic_user_data_deletion`, `20260924000005_security_definer_search_path`, `20260925000000_restrict_security_definer_privileges`, `20261005000000_community_comment_like_summaries`, `20261005000100_restrict_public_post_columns`, `20261006000004_community_post_media_alt` e `20261006000005_public_profile_privacy_rpc`. Suas partes aditivas necessárias foram antecipadas pelas migrations de compatibilidade; as demais ainda não devem ser marcadas como integralmente aplicadas.

O código atualmente publicado ainda usa consultas diretas a `profiles`, `community_comment_likes` e `article_comment_likes`, além de `public_profile`. Por isso, aplicar agora revogações dessas migrations poderia interromper os clientes publicados. O trigger histórico `sync_profile_identity_to_community` também faria `UPDATE` em posts existentes; o trigger atual `community_enforce_author` pode zerar `media_url` para não administradores durante esse `UPDATE`, então essa migration precisa de revisão antes de aplicação. As migrations globais de `search_path` e `EXECUTE` precisam ser reescritas para preservar as RPCs adicionadas posteriormente. O gate editorial e a exigência de `media_alt` precisam ser ativados junto com clientes preparados. A rotina de exclusão de conta exige validação isolada antes de substituir a função atual.

**Limites:** a restauração do backup lógico completo não foi testada; não há branch de prévia nem backup físico/PITR identificado; o build local segue bloqueado pelo SWC do Windows conforme a validação anterior; nenhuma dessas verificações atesta todos os fluxos de produção. O código e as Edge Functions não foram publicados, nenhum commit foi feito e as 11 versões pendentes não foram forçadas com `db push --include-all`. A sequência segura é validar o código em um runner que permita o build, publicar o cliente preparado, confirmar os fluxos críticos e só então aplicar/reconciliar as revogações e triggers restantes em transações revisadas.

### Correção do grant para usuários autenticados e validação do checkout — 07/10/2026

A suíte inicial falhou em `tests/anonymous-community-security.test.ts`: o papel `authenticated` recebia erro de permissão ao chamar `assert_community_participation_allowed`, antes de a função rejeitar a conta anônima com a mensagem de regra de negócio. A correção concede `EXECUTE` a `authenticated`, mantendo a revogação para `public` e `anon`. Atualizei a migration de origem, a migration global de grants ainda pendente, o teste de contrato e apliquei a migration corretiva `20261007172628_restore_authenticated_community_guard` em transação. A checagem remota confirmou: `anon_execute=false`, `authenticated_execute=true`, versão registrada.

Validações locais do checkout:
- `npm run build`: passou; compilação, TypeScript e geração de 35 páginas concluídos.
- `npm test`: 98/98 casos passaram após a correção. Na execução imediatamente anterior à correção, 97/98 passaram e o único caso falhou pelo grant ausente descrito acima.
- `npm run lint -- src tests`: passou.
- `npx tsc --noEmit --incremental false`: passou.
- `git diff --check -- .github next.config.ts src supabase tests AUDITORIA.md`: passou; apenas avisos de normalização LF/CRLF do Git.
- Estado atual após a migration corretiva: 88 arquivos SQL locais, 77 versões no ledger remoto e 11 migrations antigas ainda pendentes, sem alteração na lista dessas pendências.

O sucesso do build local não substitui a verificação do deployment. As revogações que dependem do código atualizado continuam aguardando a publicação do checkout e a confirmação dos fluxos no site.

### Continuação: publicação, RPCs e view pública de perfis — 07/10/2026

- O deployment Vercel associado a c9519a2 foi confirmado como concluído com sucesso via status público do GitHub. O commit seguinte 26ed9c7 está no master, mas, no momento desta atualização, o GitHub ainda não exibia status Vercel nem deployment para esse SHA. A página de deployment anterior é protegida por SSO e o domínio principal não respondeu a partir deste ambiente; portanto, não confirmei por HTTP a versão servida ao visitante.
- A execução de npm test local passou novamente com **98/98**; npm run lint -- src tests e npm run build também passaram após as mudanças locais mais recentes. O build compilou, validou TypeScript e gerou as 35 páginas.
- **community_comment_like_summaries aplicada:** a migration 20261005000000 foi aplicada após a publicação de código que usa a RPC. A consulta remota confirmou anon sem SELECT direto, authenticated com SELECT necessário para as próprias curtidas e RPC acessível a anon/autenticado.
- **View pública ampliada:** 20261007174026_public_profile_extra_fields foi aplicada e registrada. A view public_profiles agora tem 22 colunas e inclui playing_now e favorite_games, que a página pública já consulta. O REST respondeu HTTP 200 ao selecionar esses campos com a chave pública.
- O checkout agora usa public_profiles nas buscas públicas de perfis, nos autores de comentários e nas listas de seguidores/seguindo; a pesquisa de matérias usa POST_LIST_COLUMNS. A migration pendente 20260924000000_public_profile_view_and_access foi ajustada para manter as 22 colunas da view e conceder SELECT de profiles apenas a authenticated, sob policy que limita linhas ao próprio usuário. Ela ainda não foi aplicada; esta revisão aguarda o deployment do código que troca os acessos públicos diretos por public_profiles.
- O painel de conquistas foi atualizado para chamar public_profile_safe. O commit 26ed9c7 foi enviado, mas seu deployment ainda não foi localizado nos registros consultados; a revogação de public_profile permanece pendente até confirmar essa publicação.
- A contagem atual é **89 migrations locais, 79 registradas no Supabase e 10 pendentes**: 20260803000002_sync_profile_avatar, 20260803000004_community_usernames, 20260924000000_public_profile_view_and_access, 20260924000002_post_editorial_gate_fields, 20260924000003_atomic_user_data_deletion, 20260924000005_security_definer_search_path, 20260925000000_restrict_security_definer_privileges, 20261005000100_restrict_public_post_columns, 20261006000004_community_post_media_alt e 20261006000005_public_profile_privacy_rpc. A lista foi recalculada por comparação do ledger remoto com os nomes locais após as aplicações.

As migrations de restrição de colunas dos posts e de exigência de alt text ainda requerem revisar consultas administrativas e todos os caminhos que inserem Brick com mídia. As migrations históricas de sincronização de avatar/username podem disparar updates em posts existentes e não serão executadas sem corrigir o risco de limpeza de media_url. A revogação global de EXECUTE não será executada como está porque pode remover acesso de RPCs adicionadas depois; a lista de grants precisa ser reconciliada por função. O estado do site publicado ainda não foi confirmado pelo domínio público.
