# Auditoria completa do Orange Brick

Data da auditoria: 24/09/2026  
Reverificação local: 25/09/2026  
Escopo: código do repositório, configuração de build e deploy, dependências, migrações, rotas, verificações locais e leitura do site público.

## Resumo executivo

O código local compila e os testes passam. O ambiente Supabase consultado pelo projeto, porém, não está pronto para receber esta versão: cinco tabelas necessárias não aparecem no PostgREST, o histórico remoto das migrações precisa ser reconciliado antes de qualquer aplicação, o backup local é parcial e a publicação mais recente visível no site é de 26/08/2026. A revisão SQL também encontrou permissões `SECURITY DEFINER` excessivas e uma função revogada usada por políticas RLS; as correções estão em uma migração local ainda não aplicada. A colisão dos timestamps foi corrigida no workspace, mas não foi possível verificar o registro remoto. O segredo `CRON_SECRET` do ambiente local também fica abaixo da recomendação mínima de 16 caracteres; a produção não pode ser inspecionada sem acesso ao Vercel. As mudanças feitas nesta auditoria ainda não foram implantadas.

| Severidade em aberto | Quantidade |
|---|---:|
| Crítica | 0 |
| Alta | 5 |
| Média | 8 |
| Baixa | 1 |

| Área | Nota | Base da avaliação |
|---|---:|---|
| Segurança | 5,8/10 | Rotas administrativas verificam sessão e papel; SSRF e entradas foram endurecidos. A revisão encontrou RPCs `SECURITY DEFINER` com privilégios excessivos; há correção local, ainda não aplicada. O segredo local de cron é curto e a CSP mantém `unsafe-inline`. |
| Performance | 7,0/10 | Build gera 65 páginas estáticas; exportação e cache público foram limitados por página, mas tráfego de busca e tamanho de arquivos ainda exigem monitoramento. |
| Qualidade de código | 7,0/10 | Lint, tipos, integridade textual, testes e build passaram; há cobertura incompleta de ACL/RLS em banco e a história de migrações precisa ser reconciliada. |
| UX | 7,5/10 | Axe e revisão visual foram executados em 20 rotas locais, em desktop e mobile; autenticação depende de configuração e os fluxos administrativos não foram testados com sessão real. |
| SEO | 7,5/10 | H1 da home e títulos repetidos foram corrigidos localmente; sitemap e RSS existem, mas a produção continua atrasada e sem este deploy. |
| Acessibilidade | 6,5/10 | Axe passou nas 12 rotas locais em cinco larguras, e o E2E verifica o link de salto por teclado; produção ainda apresenta contraste insuficiente e falta teste integral com leitor de tela. |
| Manutenibilidade | 7,0/10 | Há testes unitários e E2E público; falta cobertura autenticada e uma sequência de migrações sem conflitos. |

## Revisão técnica da interface

| Dimensão | Nota (0–4) | Evidência |
|---|---:|---|
| Acessibilidade | 3 | Axe não apontou violações nas 12 rotas locais em cinco larguras; o E2E verifica o foco e a ativação do link de salto, mas a produção ainda falha em contraste e não houve teste integral com leitor de tela. |
| Performance | 2 | O build gera 65 páginas e usa cache, mas não há orçamento de bundle nem medição de LCP, CLS e INP sob carga real. |
| Responsividade | 3 | As 12 rotas passaram em `320×740`, `390×844`, `768×1024`, `1280×800` e `2560×1440`, sem overflow horizontal; zoom de texto a 200% não foi testado. |
| Theming | 3 | `DESIGN.md` define tokens e regras coerentes; o detector estático não encontrou anti-patterns em `src`. |
| Integridade de implementação | 3 | A navegação semântica e a identidade editorial são consistentes. A varredura dinâmica do detector Impeccable não rodou sem Puppeteer; Playwright/axe cobrem as rotas declaradas. |
| **Total** | **14/20 — Bom** | Restam contraste em produção, fluxos autenticados e métricas de performance reais. |

**Pontos positivos:** estrutura visual editorial específica, foco e contraste corrigidos no workspace, alvos touch ampliados e testes automatizados em quatro classes de viewport. A versão publicada ainda não inclui essas correções.

## Evidências e limites

- `npm run check` (25/09/2026): passou após as correções de ACL/RLS — integridade textual em 338 arquivos, ESLint, TypeScript, 49 testes e build Next.js com 65 páginas estáticas.
- `npm run e2e` (25/09/2026): 61 testes Playwright passaram e quatro cópias redundantes da verificação de links foram ignoradas. As 12 rotas passaram em cinco larguras (`320`, `390`, `768`, `1280` e `2560` px), com axe/WCAG 2.2 AA, overflow horizontal e link de salto por teclado; os destinos internos foram verificados uma vez. Os testes não submetem formulários nem autenticam usuários.
- O workflow de deploy instala Chromium e executa `npm run e2e` depois do check de lint, tipos, testes e build; esta mudança local ainda depende de publicação para entrar no CI remoto.
- `npm audit --audit-level=low`: 0 vulnerabilidades conhecidas no lockfile atualizado.
- Busca local por formatos comuns de chaves privadas e tokens de GitHub, Slack, Google e Telegram não encontrou correspondências no código versionável; `.env.local` foi excluído da saída e permanece ignorado pelo Git.
- `npm outdated --json`: versões instaladas estão dentro das faixas declaradas. Há majors mais novas fora delas (`dotenv` 18, ESLint 10, TypeScript 7 e `@types/node` 26); os tipos Node permanecem em 22 para acompanhar o runtime do CI. Não atualizei as demais sem migração compatível. React está em 19.3.0.
- `git diff --check`: passou; o Git emitiu avisos de conversão LF/CRLF do workspace, sem erros de whitespace.
- `npm run production:check` (25/09/2026): não pronto. A consulta ao Supabase retornou `PGRST205` para cinco tabelas; há 60 arquivos sem versões duplicadas locais, mas `migrations.ready` permanece `false` até que o histórico remoto seja confirmado com `PRODUCTION_MIGRATION_HISTORY_CONFIRMED=true`. Essa confirmação manual exige comparar o histórico remoto e validar o plano em staging; o script não finge consultar o ledger. O backup está `incomplete`, a chave pública VAPID não foi encontrada, o `CRON_SECRET` local é curto e não foram confirmados Edge Function, crons ativos ou plano/duração Vercel. A checagem declara seu escopo: variáveis do processo atual; ela não lê as variáveis remotas do projeto Vercel. Ela também exige Gemini e Telegram.
- `npm run backup:create` exportou 37 recursos públicos, cinco contas Auth e os 424 objetos do Storage (123.328.560 bytes), todos criptografados com AES-256-GCM. `npm run backup:verify` validou os 37 arquivos de tabelas, Auth e 424 objetos sem falhas de integridade, mas marcou o conjunto como incompleto porque as cinco tabelas ausentes não puderam ser incluídas. O snapshot está em diretório ignorado pelo Git; a chave só existe no `.env.local` local e ainda não há cópia externa nem restauração testada.
- A limitação de notícias, contato, newsletter, eventos da home e erros agora usa o IP `x-real-ip` fornecido pelo runtime Vercel, valida o formato e guarda apenas o hash. Testes unitários cobrem o hash, janelas e limites; a integração com o RPC foi compilada, mas não foi exercitada contra produção para evitar gravar contadores artificiais.
- As variáveis locais do Gemini, do bot Telegram e do chat administrativo estão configuradas; consultas somente de leitura `getMe` e `getChat` confirmaram que o bot e o chat respondem. Nenhuma mensagem foi enviada. O `CRON_SECRET` local tem menos de 16 caracteres. A produção precisa de validação e rotação coordenada no Vercel e no GitHub antes de publicar as mudanças.
- A autenticação de todas as rotas cron passou a usar um helper único, exige segredo com pelo menos 16 caracteres e compara o cabeçalho em tempo constante. A checagem local foi atualizada para detectar segredos curtos e deixar explícito que não consulta as variáveis remotas do Vercel.
- O detector estático da skill Impeccable não encontrou anti-patterns em `src`. O modo navegador desse detector não pôde rodar porque Puppeteer não está instalado; Playwright e axe passaram em 61 testes de navegador na reverificação local.
- A leitura pública de `https://orange-brick.vercel.app/api/news?page=1` em 25/09/2026 retornou HTTP 200, 20 itens e o registro mais recente com `published_at = 2026-08-26T18:26:05.427+00:00`, cerca de 30 dias antes.
- As três migrações que compartilhavam `20260727000000` foram renomeadas localmente para versões únicas: `brickboard_progression` manteve `20260727000000`, `editorial_workflow` passou a `20260727000002` e `fix_release_radar_images` passou a `20260727000003`. A migração editorial agora remove as políticas com `DROP POLICY IF EXISTS` antes de criá-las. Evidência estrutural de leitura do banco: tabelas de progressão existem, enquanto `post_versions` e as colunas de fluxo editorial consultadas não existem. Isso sugere que a migração de progressão é a versão antiga já aplicada, mas não substitui a consulta ao ledger remoto `supabase_migrations.schema_migrations`; nenhuma migração foi aplicada remotamente.
- A revisão de ACLs confirmou que PostgreSQL concede `EXECUTE` em funções novas a `PUBLIC` por padrão. `apply_retention_policy()` podia ser chamado por qualquer role e `assert_community_participation_allowed(uuid)` podia revelar estado de suspensão de outro perfil. Também havia `current_user_is_admin()` revogada para `authenticated`, embora políticas RLS a chamem. A migração `20260925000000_restrict_security_definer_privileges.sql` agora restringe as RPCs por role, mantém `current_user_is_admin()` acessível apenas aos usuários autenticados que precisam avaliar essas políticas e altera os privilégios padrão para novas funções. Quatro testes estáticos cobrem as regras. O SQL ainda não foi aplicado nem executado em staging por falta de acesso ao histórico remoto. [Privilégios de funções do Supabase](https://supabase.com/docs/guides/database/functions), [privilégios de funções do PostgreSQL](https://www.postgresql.org/docs/18/sql-createfunction.html).
- Os workflows de GitHub Actions foram endurecidos localmente: `checkout` e `setup-node` estão fixados em SHA completos conferidos nos repositórios oficiais, o workflow de qualidade só recebe `contents: read`, e o gerador manual não recebe `GITHUB_TOKEN`, aceita execução apenas na branch `main` e passa segredo/slot por variáveis de ambiente. Os dois arquivos passaram pelo parser `js-yaml`.
- Microsoft Edge + axe-core 4.13.0: 12 rotas públicas da produção, em `1280×800` e `390×844`, encontraram falhas recorrentes de contraste. A varredura ampla local cobriu 20 rotas nos mesmos tamanhos; os dois problemas restantes foram corrigidos e rechecados em ambas as larguras nas rotas afetadas (`/institucional/anuncie` e `/brickboard/como-funciona`), além da home. A produção não recebeu as mudanças locais.
- E2E somente de leitura contra produção: os dois testes de destinos internos passaram; as 24 verificações de página falharam, sendo 21 por axe com `color-contrast`, quatro também por `link-in-text-block` e uma por `scrollable-region-focusable`. Os contrastes registrados foram `3,98:1`, `3,06:1`, `4,01:1` e `2,08:1`. `/privacidade` não expôs um `<main>` nas duas larguras; o código local já o contém. Uma leitura inicial de `/busca` encontrou dois elementos `<main>` por um instante; cinco leituras posteriores mostraram um caso transitório que se resolveu em menos de 500 ms. O teste local agora aguarda exatamente um marco `<main>`.
- `/entrar`, `/cadastro` e `/recuperar-senha` respondem com redirecionamento para `/` quando `EMAIL_AUTH_ENABLED` não está habilitada; o acesso Google continua disponível pelo modal. Isso corresponde à condição implementada no proxy, mas precisa coincidir com a política de autenticação desejada para produção.
- A checagem visual local encontrou largura de documento sem overflow em mobile nas 20 rotas. Foram conferidos 69 destinos internos renderizados, sem respostas 4xx. O teste não clicou nem enviou formulários que gravariam dados.
- A suíte E2E cobre navegação pública, responsividade, links e violações axe; ainda não cobre login com sessão, envio de contato, upload de arquivos, edição/publicação ou interações autenticadas no Brickboard. O axe não substitui teste completo de teclado, leitor de tela nem revisão manual WCAG; o relatório não declara conformidade WCAG completa.
- O Supabase CLI e um token de acesso/URL com senha de banco não estão disponíveis para listar e simular o histórico remoto. Nenhuma migração foi aplicada remotamente e nenhuma implantação foi feita.

## Top 20 achados priorizados

Os itens 1–7 e 10–12 continuam em aberto ou dependem de confirmação de ambiente. Os itens 8–9 e 13–20 foram corrigidos no workspace; o complemento #21 foi encontrado e parcialmente corrigido localmente; os itens #22–23 receberam migrações corretivas ainda não aplicadas; o #24 foi corrigido nos workflows locais, mas não publicado no repositório remoto. A colisão local descrita no item 2 foi removida, mas a reconciliação do histórico remoto continua pendente. Os achados que envolvem SQL ainda dependem de migração coordenada antes de chegar à produção.

### 1. Tabelas de produção ausentes

- **Categoria:** Estabilidade / Banco de dados
- **Severidade:** Alta
- **Localização:** `scripts/check-production-readiness.mjs:13`; migrações `20260803000001_reader_experience.sql`, `20260803000006_admin_operations.sql` e `20260803000007_quality_operations.sql`.
- **Descrição e impacto:** O check conectado ao Supabase recebeu `PGRST205` para `admin_audit_log`, `admin_trash`, `backup_runs`, `notification_preferences` e `user_follows`. Auditoria administrativa, lixeira, histórico de backups, preferências de notificação e seguir usuários podem falhar nesse ambiente.
- **Como reproduzir:** Execute `npm run production:check` com as credenciais do projeto que será publicado.
- **Correção recomendada:** Compare o histórico remoto conforme o item 2 e aplique em staging apenas as migrações realmente pendentes; confirme as cinco tabelas e repita o check.

### 2. Histórico remoto das migrações precisa ser reconciliado

- **Categoria:** DevOps / Banco de dados
- **Severidade:** Alta
- **Localização:** `supabase/migrations/20260727000000_brickboard_progression.sql`, `20260727000002_editorial_workflow.sql` e `20260727000003_fix_release_radar_images.sql`.
- **Descrição e impacto:** A colisão local foi corrigida: as 60 migrações agora têm versões únicas. O preflight também foi corrigido para não tratar isso como confirmação remota; `migrations.ready` permanece `false` até a confirmação manual do histórico remoto. Ainda falta verificar como a versão `20260727000000` está registrada no Supabase remoto antes de aplicar arquivos renomeados. As tabelas de progressão consultadas existem; `post_versions` e as colunas de fluxo editorial consultadas não existem. Isso é compatível com a migração de progressão sendo a versão já aplicada, mas apenas a lista remota confirma o estado. Aplicar uma migração já registrada sob uma versão diferente pode duplicar alterações ou falhar; omitir uma versão pendente deixa funcionalidades sem esquema.
- **Como reproduzir:** Execute `npm run production:check` para confirmar que as versões locais são únicas. Para o estado remoto, consulte `supabase migration list --linked` em ambiente autorizado; a CLI/token/URL de banco necessários não estão disponíveis nesta sessão.
- **Correção recomendada:** Compare a lista de migrações local e remota, confirme a versão registrada e valide o plano num projeto de staging antes de qualquer `db push`. Não renomeie nem repare registros remotos sem confirmar o conteúdo SQL correspondente. [Documentação do Supabase](https://supabase.com/docs/reference/cli/supabase-db-schema-declarative)

### 3. Backup local é parcial e ainda não comprova restauração

- **Categoria:** DevOps / Continuidade
- **Severidade:** Alta
- **Localização:** `scripts/backup-supabase.mjs`, `scripts/verify-backup.mjs` e `scripts/check-production-readiness.mjs`.
- **Descrição e impacto:** O script anterior listava só parte das tabelas e criava apenas um manifesto de Storage, sem baixar os arquivos. Ele foi corrigido para enumerar os recursos expostos pela API, baixar arquivos e criptografar dados. O snapshot atual contém 37 recursos, cinco usuários e 424 objetos (123.328.560 bytes), e passou pela verificação de integridade. Continua incompleto porque as tabelas `admin_audit_log`, `admin_trash`, `backup_runs`, `notification_preferences` e `user_follows` não estão expostas no projeto consultado. A exportação REST é sequencial, não um snapshot transacional do PostgreSQL; alterações durante os minutos de coleta podem deixar tabelas relacionadas em instantes diferentes. O snapshot está apenas nesta máquina, não houve teste de restauração em staging e a chave AES permanece no `.env.local` ignorado pelo Git.
- **Como reproduzir:** Execute `npm run backup:verify` e `npm run production:check`; o primeiro confirma integridade e reporta `complete: false`, e o segundo reporta `backup.reason = incomplete`.
- **Correção recomendada:** Após reconciliar e aplicar as migrações pendentes, gere novo snapshot, valide-o, restaure-o em ambiente isolado e armazene backup e chave em locais externos separados e protegidos. Confirme também a política de backup gerenciado do Supabase.

### 4. A produção está sem matéria recente há 30 dias

- **Categoria:** Bug / SEO / Operação
- **Severidade:** Alta
- **Localização:** endpoint público `/api/news?page=1`; agendamento em `vercel.json:20-29`; execução em `src/app/api/cron/generate-daily/route.ts`.
- **Descrição e impacto:** Em 25/09/2026 o endpoint respondeu HTTP 200, mas o primeiro registro continuava sendo de 26/08/2026. Isso não comprova a causa, porém demonstra que a cadência de publicação esperada não está refletida no conteúdo público. Afeta atualidade, tráfego recorrente e sinais editoriais de SEO.
- **Como reproduzir:** Consulte `/api/news?page=1` e leia `posts[0].published_at`.
- **Correção recomendada:** Verifique logs de execução dos três crons, a tabela `bot_state`, notificações de bloqueios editoriais e configuração de `CRON_SECRET`; confirme se os crons estão registrados no deployment atual.

### 5. A CSP permite scripts inline

- **Categoria:** Segurança
- **Severidade:** Média
- **Localização:** `src/proxy.ts:11`.
- **Descrição e impacto:** `script-src` inclui `'unsafe-inline'`. Isso reduz a proteção contra XSS caso uma entrada venha a chegar a um sink executável. A busca estática encontrou um `dangerouslySetInnerHTML` para JSON-LD, montado com dados do site e serializado com escape de `<`; não encontrou `eval` nem uso de `innerHTML`/`outerHTML`. Esse sink revisado não elimina o risco da política permissiva.
- **Como reproduzir:** Consulte o cabeçalho CSP do site público ou leia a função `contentSecurityPolicy()`.
- **Correção recomendada:** Planeje uma migração para nonce/hash validada em preview. A documentação do Next informa que nonce pode forçar renderização dinâmica; a mudança precisa preservar ISR/SEO e passar teste de hidratação antes de substituir a política atual. [Guia CSP do Next.js](https://nextjs.org/docs/app/guides/content-security-policy)

### 6. Push notifications não estão comprovadas como prontas

- **Categoria:** Bug / DevOps
- **Severidade:** Média
- **Localização:** `scripts/check-production-readiness.mjs:10-24, 67-80`.
- **Descrição e impacto:** A checagem local não encontra `NEXT_PUBLIC_VAPID_PUBLIC_KEY`; também não há confirmação de que a Edge Function `send-push-notification` esteja publicada e que `VAPID_PRIVATE_KEY` esteja configurada nos secrets do Supabase. Isso impede afirmar que notificações push funcionarão.
- **Como reproduzir:** Execute `npm run production:check`; confira os campos `missing_environment` e `external_checks`.
- **Correção recomendada:** Validar as variáveis nos ambientes Vercel e Supabase e fazer uma notificação de teste. A ausência em `.env.local` não prova ausência no ambiente de produção.

### 7. O tempo e a precisão dos crons dependem do plano Vercel

- **Categoria:** DevOps / Estabilidade
- **Severidade:** Média
- **Localização:** `src/app/api/cron/generate-daily/route.ts:11`; horários em `vercel.json:20-29`.
- **Descrição e impacto:** A função declara duração de 300 segundos, compatível com o limite atual do plano Hobby quando Fluid Compute está ativo. Cada uma das três entradas de cron roda uma vez por dia, frequência permitida no Hobby; nesse plano, porém, a chamada pode ocorrer em qualquer minuto dentro da hora agendada (±59 min), em vez de exatamente às 12h, 17h e 20h de São Paulo. O plano e o estado de Fluid Compute não foram confirmados. A Vercel também recomenda idempotência porque entregas podem se repetir ou falhar; o código já reclama cada slot por data e horário.
- **Como reproduzir:** Conferir o plano e logs do projeto Vercel; comparar duração das invocações com o limite de função.
- **Correção recomendada:** Confirmar o plano e Fluid Compute no projeto. Se os horários forem apenas aproximados, o Hobby comporta os três crons diários, mas pode atrasá-los em até 59 minutos; para precisão de minuto, usar Pro ou Enterprise. Confirmar também logs e crons registrados no deployment. [Limites de Cron da Vercel](https://vercel.com/docs/cron-jobs/usage-and-pricing), [duração de Functions](https://vercel.com/docs/functions/configuring-functions/duration), [entrega e idempotência](https://vercel.com/docs/cron-jobs/manage-cron-jobs)

### 8. Exportação de dados podia truncar ou exceder o limite da função — corrigido localmente

- **Categoria:** Estabilidade / Privacidade
- **Severidade:** Média
- **Localização:** `src/app/api/user/data/route.ts`.
- **Descrição e impacto:** Antes da correção, consultas sem paginação podiam parar no limite padrão do PostgREST, e a resposta completa podia ultrapassar 4,5 MB na Vercel.
- **Como reproduzir:** A API antiga falhava com uma conta que tivesse mais de mil registros ou uma resposta acima do limite de payload.
- **Correção aplicada:** A API agora entrega blocos de 100 registros com cursor por `id`; o navegador reúne os blocos no arquivo JSON. A exportação também omite hashes internos de IP. Cada resposta individual fica limitada; o arquivo final ainda ocupa memória do navegador, então contas excepcionalmente grandes precisam de validação com dados reais antes de definir um teto. [Limite de payload de Functions](https://vercel.com/docs/functions/limitations)

### 9. Buscas públicas únicas não tinham limite de tráfego — corrigido localmente

- **Categoria:** Segurança / Performance
- **Severidade:** Média
- **Localização:** `src/app/api/news/route.ts`, `src/lib/news-query.ts` e `src/lib/server/rate-limit.ts`.
- **Descrição e impacto:** A rota aceita até 500 páginas e consultas de busca com até 80 caracteres. O cache por URL reduz chamadas repetidas, mas termos únicos ainda podem causar cache misses e consultas ao Supabase. As rotas de contato, newsletter, engajamento e erros também usavam o primeiro valor de `x-forwarded-for`, que pode ser controlado pelo cliente em algumas configurações de proxy.
- **Como reproduzir:** Fazer chamadas variadas a `/api/news?page=1&q=<termo-diferente>` na versão publicada; o código local atual aplica o RPC `consume_rate_limit` antes da consulta.
- **Correção aplicada:** Feed limitado a 180 requisições por IP por minuto e buscas a 30 por minuto. O identificador agora usa o IP fornecido por `@vercel/functions` via `x-real-ip`, validado e armazenado somente como hash; a mudança foi aplicada também às rotas de contato, newsletter, eventos da home e erros. Respostas 429 não são armazenadas em cache. A produção ainda precisa receber o deploy.

### 10. Fluxos autenticados ainda não têm cobertura E2E

- **Categoria:** QA / Estabilidade
- **Severidade:** Média
- **Localização:** `e2e/public-site.spec.ts`, `playwright.config.ts`, `src/proxy.ts:42-43`.
- **Descrição e impacto:** Há 49 testes unitários e 61 verificações E2E aprovadas para 12 rotas públicas em cinco larguras, incluindo axe, overflow, link de salto e destinos internos. Quatro repetições do teste de links em outros viewports são puladas porque verificam os mesmos destinos. Ainda não há E2E com sessão real para login, edição/publicação, contato, upload ou Brickboard. Em produção, `/entrar`, `/cadastro` e `/recuperar-senha` redirecionam para `/` quando `EMAIL_AUTH_ENABLED` está desabilitada; o login Google pelo modal permanece disponível. O comportamento é intencional no código, mas a configuração deve coincidir com a política do produto.
- **Como reproduzir:** Execute `npm run check` e `npm run e2e`; os 49 testes unitários e os 61 testes E2E passam no workspace. Para o fluxo de autenticação, abra as três rotas em produção e confira o redirecionamento e o login Google.
- **Correção recomendada:** Confirmar se login por e-mail deve estar disponível e ajustar `EMAIL_AUTH_ENABLED`. Estender E2E para operações autenticadas com ambiente Supabase isolado, conta de teste e dados descartáveis.

### 11. Contraste insuficiente na produção e link de salto ausente em várias rotas

- **Categoria:** Acessibilidade / UX
- **Severidade:** Média
- **Localização:** `src/app/globals.css`, `src/lib/types/platform.ts`, `src/app/busca/page.tsx`, `src/app/termos/page.tsx`, `src/app/institucional/[slug]/InstitutionalClient.tsx` e `src/app/brickboard/como-funciona/page.tsx`.
- **Descrição e impacto:** A produção verificada por axe tinha texto `#6a7282` em `#0d0e12` com 3,98:1, branco sobre `#FF5E00` com 3,06:1 e links no meio do texto com 2,08:1 sem sublinhado persistente. O E2E também registrou `4,01:1`, links sem distinção textual e uma região rolável sem foco por teclado. Esses casos falham critérios WCAG 2.2 AA e dificultam leitura ou navegação assistiva. No código local antes desta revisão, o link global “Pular para o conteúdo” só encontrava o destino na home e no Brickboard; `/lancamentos` mantinha título, busca e filtros fora do único `<main>`, e `/profile/setup` não tinha landmark principal nem rótulos associados aos campos de nickname e usuário. A produção publicada também serviu `/privacidade` sem landmark `<main>` em desktop e mobile. As correções locais ainda não foram publicadas. Uma duplicação transitória do landmark em `/busca` sumiu em até 500 ms nas sondagens posteriores.
- **Como reproduzir:** Na versão publicada, abrir a home, Contato, Política de Privacidade, Lançamentos, Brickboard, Em Alta, Busca e Termos em desktop ou mobile e executar axe; ativar “Pular para o conteúdo” e confirmar que move o foco para o conteúdo principal. No workspace, `npm run e2e` verifica axe e esse fluxo nas 12 rotas e cinco larguras; testar também a tabela de XP com teclado.
- **Correção aplicada:** Texto em botões laranja passou a usar preto; cinzas e tons de plataforma foram clareados para atingir contraste; links de Termos ganharam sublinhado persistente; o formulário comercial, a tabela de XP, o H1 da home e os títulos repetidos foram corrigidos. Todas as rotas com `<main>` agora têm o destino focável; `/lancamentos` inclui hero e filtros dentro do landmark, `/profile/setup` tem landmark e labels ligados aos campos, o destino ganha margem contra o cabeçalho fixo e a busca não rouba foco inicial. Axe passou nas 12 rotas locais em cinco larguras. Ainda faltam publicação, validação de contraste em produção e teste integral com leitor de tela.

### 12. Alertas externos de erro não foram confirmados

- **Categoria:** Observabilidade
- **Severidade:** Baixa
- **Localização:** `src/app/api/errors/route.ts`, `src/app/error.tsx` e logs `console.*`.
- **Descrição e impacto:** Há gravação de erros no Supabase e logs estruturados em alguns fluxos, mas não foi confirmada integração de alertas/traces externos nem retenção e alarmes da produção. Se a gravação no banco falhar, o erro pode ficar só no log da função. Na suíte local, o Next imprimiu `The destination stream closed early` durante o fechamento de contextos Playwright; os testes passaram. Isso pode ser cancelamento de streams de prefetch, mas sem logs de produção não foi possível confirmar a causa.
- **Como reproduzir:** Provocar uma falha em preview e confirmar se existe alerta acionável, correlação por referência e painel de acompanhamento.
- **Correção recomendada:** Confirmar alarmes Vercel/Supabase e definir alerta para falha de cron, aumento de 5xx e falha de gravação em `record_app_error`.

### 13. Limite de upload ultrapassava o limite da plataforma — corrigido

- **Categoria:** Bug / Performance
- **Severidade original:** Alta
- **Localização:** `src/app/api/user/avatar/route.ts:7, 30`; `src/app/api/user/banner/route.ts:7, 39`.
- **Descrição e impacto:** Avatar e banner aceitavam 8 MB, mas Vercel Functions limita o corpo de entrada a 4,5 MB. Arquivos entre esses limites falhavam antes de chegar ao código.
- **Como reproduzir:** Enviar arquivo maior que 4,5 MB ao endpoint na Vercel.
- **Correção aplicada:** Limite ajustado para 4 MB; respostas agora distinguem falhas de armazenamento e perfil.

### 14. Erro ao atualizar o perfil podia deixar o avatar inconsistente — corrigido

- **Categoria:** Bug / Integridade
- **Severidade original:** Alta
- **Localização:** `src/app/api/user/avatar/route.ts` e `src/app/api/user/banner/route.ts`.
- **Descrição e impacto:** O avatar ignorava erro da gravação no perfil; ambas as rotas removiam arquivos anteriores sem confirmar que a nova URL ficou salva. Uma falha podia deixar link quebrado ou imagem órfã.
- **Como reproduzir:** Simular falha na atualização de `profiles` após upload.
- **Correção aplicada:** As rotas verificam a linha atualizada, removem o novo arquivo se a atualização falha e removem apenas o arquivo anterior identificado após sucesso.

### 15. Busca aceitava curinga `*` do filtro PostgREST — corrigido

- **Categoria:** Segurança / Performance
- **Severidade original:** Média
- **Localização:** `src/lib/news-query.ts:11`; `tests/news-query.test.ts`.
- **Descrição e impacto:** A normalização removia `%` e `_`, mas deixava `*`, que pode funcionar como curinga em filtros PostgREST e ampliar buscas públicas.
- **Como reproduzir:** Consultar busca com `q=*` antes da correção e observar a expressão `.or()` gerada.
- **Correção aplicada:** `*` passou a ser removido e o teste de normalização foi ampliado.

### 16. Auditoria de Storage ignorava itens após o primeiro milhar — corrigido

- **Categoria:** Bug / Operações
- **Severidade original:** Média
- **Localização:** `src/app/api/admin/storage-health/route.ts`.
- **Descrição e impacto:** `list(..., { limit: 1000 })` não paginava; totais e lista de órfãos podiam omitir arquivos em pastas grandes.
- **Como reproduzir:** Criar mais de 1.000 objetos numa pasta e comparar o painel com o inventário do bucket.
- **Correção aplicada:** A listagem agora avança por `offset` até carregar todas as páginas.

### 17. Verificação textual não detectava mojibake comum — corrigido

- **Categoria:** Código / Conteúdo
- **Severidade original:** Baixa
- **Localização:** `scripts/check-text-integrity.mjs:11`.
- **Descrição e impacto:** O detector cobria algumas sequências quebradas, mas não as formas comuns `Ã£`, `Ã©` e `Â...`; uma checagem aprovada podia deixar caracteres corrompidos passar.
- **Como reproduzir:** Aplicar a expressão antiga a uma amostra como `NÃ£o`.
- **Correção aplicada:** A regra agora detecta sequências comuns de UTF-8 interpretado como Latin-1; o check completo passou.

### 18. Preferência de histórico de temporadas não tinha efeito — corrigido no código

- **Categoria:** UX / Bug
- **Severidade original:** Média
- **Localização:** `src/app/configuracoes/perfil/page.tsx`, `src/app/profile/[nickname]/page.tsx`, `supabase/migrations/20260924000000_public_profile_view_and_access.sql`.
- **Descrição e impacto:** A opção `show_season_history` era gravada, mas o RPC `public_profile` não devolvia temporadas anteriores nem a tela as mostrava.
- **Como reproduzir:** Desmarcar a opção, abrir o perfil público e comparar a resposta do RPC.
- **Correção aplicada:** A migração retorna até 10 temporadas concluídas quando permitido, e o perfil mostra o histórico. A correção só chega à produção após a migração ser validada e aplicada.

### 19. Texto branco no laranja principal tinha contraste insuficiente — corrigido

- **Categoria:** Acessibilidade
- **Severidade original:** Média
- **Localização:** `src/app/globals.css` e `DESIGN.md`.
- **Descrição e impacto:** Branco sobre `#FF5E00` tem contraste aproximado de 3,06:1, abaixo de 4,5:1 para texto comum.
- **Como reproduzir:** Calcular o contraste WCAG entre as duas cores.
- **Correção aplicada:** Texto escuro agora cobre também os botões de busca e de contato comercial; o tom secundário laranja e as cores textuais das plataformas foram ajustados para contraste AA sobre superfícies escuras.

### 20. Controles touch menores que o padrão interno — corrigido

- **Categoria:** Acessibilidade / UX
- **Severidade original:** Baixa
- **Localização:** `src/app/globals.css:140-147` e seletores responsivos.
- **Descrição e impacto:** Alguns botões tinham 36 px de altura em classes Tailwind, abaixo do alvo de 44 px definido no guia do projeto. Em 320 px, “Ver todos” no Radar também ficava encoberto pelo cabeçalho fixo depois de navegar ao `<main>`, reduzindo a área acessível a 18,5 px.
- **Como reproduzir:** Inspecionar botões em dispositivo com `pointer: coarse`.
- **Correção aplicada:** Regras globais elevam alvos touch para 44 px; campos em telas estreitas recebem fonte de 16 px para evitar zoom automático no iOS. “Ver todos” recebeu 44 px de altura e o link de salto reserva espaço para o cabeçalho; o reteste WCAG em 320 px passou.

## Achado adicional da verificação final

### 21. Segredo local das rotas cron abaixo do mínimo recomendado

- **Categoria:** Segurança / DevOps
- **Severidade:** Alta
- **Localização:** `src/lib/server/cron-auth.ts`, `scripts/check-production-readiness.mjs`, rotas em `src/app/api/cron/*` e `/.github/workflows/news-generator.yml`.
- **Descrição e impacto:** O `CRON_SECRET` carregado no ambiente local tem menos de 16 caracteres. Se a produção reutilizar esse valor, terceiros podem tentar invocar geração/publicação, retenção e outras rotas cron. O valor de produção não pôde ser consultado. As rotas agora rejeitam segredos curtos e comparam o cabeçalho em tempo constante; isso também significa que um segredo curto ainda configurado no Vercel interromperá os crons após o deploy.
- **Como reproduzir:** Execute `npm run production:check` e consulte `blockers.weak_environment`; a saída não revela o valor.
- **Correção recomendada:** Gere um segredo aleatório de pelo menos 16 caracteres e atualize em conjunto as variáveis `CRON_SECRET` do Vercel, do GitHub Actions e do ambiente local antes de publicar a proteção nova. A recomendação mínima de 16 caracteres consta na [documentação da Vercel](https://vercel.com/docs/cron-jobs/manage-cron-jobs).

## Achados adicionais da revisão SQL

### 22. RPCs `SECURITY DEFINER` permitem execução pública indevida

- **Categoria:** Segurança / Privacidade
- **Severidade:** Média
- **Localização:** `supabase/migrations/20260728000009_moderation_controls.sql:28`, `supabase/migrations/20260803000007_quality_operations.sql:31-55` e correção em `supabase/migrations/20260925000000_restrict_security_definer_privileges.sql:4-21,28-29`.
- **Descrição e impacto:** PostgreSQL concede `EXECUTE` a `PUBLIC` por padrão quando uma função é criada. `assert_community_participation_allowed(uuid)` é `SECURITY DEFINER`, não tinha `REVOKE` e diferenciava usuário suspenso ou banido nas mensagens de erro; um chamador com um UUID conhecido podia consultar estado e prazo de moderação de terceiros pela RPC. `apply_retention_policy()` também não revogava `PUBLIC`; um chamador podia disparar antes do cron a remoção de lixeira expirada, notificações antigas e registros de auditoria elegíveis, além de obter a contagem removida.
- **Como reproduzir:** Em staging, consulte `has_function_privilege('anon', 'public.assert_community_participation_allowed(uuid)', 'EXECUTE')` e `has_function_privilege('anon', 'public.apply_retention_policy()', 'EXECUTE')` antes da correção; ambos podem retornar `true`. Não execute a rotina de retenção em produção como teste.
- **Solução aplicada localmente:** A nova migração percorre o catálogo e revoga permissões de todas as funções `SECURITY DEFINER` existentes, sem bloquear RPCs comuns; depois concede cada RPC de usuário apenas às roles necessárias. A rotina de retenção fica limitada a `service_role`. O padrão global de `EXECUTE` público é removido para funções futuras criadas pelo papel que aplicar a migração. Exemplo: `REVOKE ALL ON FUNCTION public.apply_retention_policy() FROM PUBLIC, anon, authenticated; GRANT EXECUTE ON FUNCTION public.apply_retention_policy() TO service_role;`. A migração ainda precisa ser reconciliada e aplicada em staging e produção. [Padrões de privilégios do PostgreSQL](https://www.postgresql.org/docs/18/sql-alterdefaultprivileges.html).

### 23. Políticas RLS chamam função sem privilégio de execução

- **Categoria:** Bug / Banco de dados / Controle de acesso
- **Severidade:** Média
- **Localização:** `supabase/migrations/20260723000003_harden_community_identity.sql:334`; políticas em `20260728000008_community_safety.sql:19-30`, `20260728000009_moderation_controls.sql:19-24` e `20260728000010_error_monitoring.sql:15-19`; correção em `20260925000000_restrict_security_definer_privileges.sql:23-24`.
- **Descrição e impacto:** A migração revoga `EXECUTE` de `public.current_user_is_admin()` para `PUBLIC`, `anon` e `authenticated`. Migrações posteriores chamam a função dentro de políticas RLS avaliadas por usuários autenticados. PostgreSQL verifica o privilégio de execução ao avaliar a chamada; essas consultas podem falhar com `permission denied for function current_user_is_admin`, afetando leitura e moderação de denúncias, ações de moderação e leitura dos registros de erro.
- **Como reproduzir:** Em staging, com JWT autenticado, consulte `has_function_privilege('authenticated', 'public.current_user_is_admin()', 'EXECUTE')` e tente ler uma linha autorizada em `community_reports` ou `app_error_events`. Antes da correção, a função não tem `EXECUTE` concedido ao papel.
- **Solução aplicada localmente:** A nova migração mantém a revogação de `PUBLIC` e `anon` e concede `EXECUTE` a `authenticated`, necessário para as políticas RLS. O resultado precisa ser confirmado com uma sessão autenticada em staging após aplicar a migração.

### 24. Workflows usavam referências mutáveis e permissões implícitas

- **Categoria:** Segurança / DevOps
- **Severidade:** Média
- **Localização:** `.github/workflows/deploy.yml:1-25` e `.github/workflows/news-generator.yml:1-25`.
- **Descrição e impacto:** O workflow de qualidade usava `actions/checkout@v4` e `actions/setup-node@v4`, referências a tags que podem mudar para outro código, e não limitava explicitamente as permissões do `GITHUB_TOKEN`. O workflow manual de geração inseria expressão/segredo diretamente no script shell e podia ser iniciado a partir de outra branch. Isso aumenta a superfície de supply chain e o risco de execução de workflow com permissões ou código diferentes do esperado.
- **Como reproduzir:** Inspecione os dois YAMLs antes da correção: as ações usavam tags móveis, o bloco `permissions` estava ausente e o comando interpolava `inputs.slot` e `secrets.CRON_SECRET` diretamente no `run`.
- **Solução aplicada localmente:** `checkout` e `setup-node` agora usam SHAs completos conferidos nas referências oficiais (`11d5960a326750d5838078e36cf38b85af677262` e `49933ea5288caeca8642d1e84afbd3f7d6820020`); o workflow de qualidade limita permissões a `contents: read`; o gerador desabilita permissões do token, aceita apenas a branch `main`, usa timeout e injeta segredo/horário via `env`. `js-yaml` validou a sintaxe. A alteração ainda precisa entrar no repositório remoto.

## Plano de correção

### Imediato — antes de publicar

1. Gerar e distribuir um `CRON_SECRET` aleatório com pelo menos 16 caracteres entre Vercel, GitHub Actions e ambiente local.
2. Obter e revisar o histórico remoto com `supabase migration list --linked`, validar o plano em staging e só então definir `PRODUCTION_MIGRATION_HISTORY_CONFIRMED=true`; os timestamps duplicados locais já foram resolvidos.
3. Aplicar as migrações pendentes em ambiente de staging e confirmar as cinco tabelas; repetir `npm run production:check`.
4. Depois das migrações, gerar backup completo de dados e Storage, testar restauração em ambiente isolado e guardar backup e chave AES fora desta máquina.
5. Investigar logs dos crons e estado editorial; explicar por que a última matéria pública é de 26/08.
6. Confirmar plano Vercel, duração permitida, crons registrados, chave VAPID e Edge Function.
7. Confirmar a política de login por e-mail e validar o fluxo Google e, se habilitado, cadastro, recuperação e logout.
8. Publicar os workflows com permissões mínimas, SHA fixos para actions e execução do cron limitada à branch `main`.

### Curto prazo

1. Estender E2E para login, contato, upload e edição/publicação em um ambiente Supabase isolado.
2. Publicar as correções locais de contraste e executar testes manuais de teclado/leitor de tela em mobile e desktop.
3. Avaliar proteção adicional no firewall da Vercel e monitorar tamanho de exportações pessoais grandes.
4. Confirmar alertas de erros e falhas de cron na observabilidade de produção.

### Médio prazo

1. Planejar CSP com nonce/hash, preservando ISR e revalidando hidratação.
2. Avaliar atualização para dotenv 18, ESLint 10 e TypeScript 7 em branch com build e CI próprios.
3. Criar ambiente Supabase de staging e validar todas as migrações com reset/replay antes de cada deploy de banco.

### Melhorias futuras

1. Estabelecer orçamento de bundle e monitoramento de Core Web Vitals.
2. Medir consultas e custos de Storage/Supabase com dados representativos.
3. Fazer revisão editorial completa de ortografia em conteúdo institucional e fluxos de interface; o check atual detecta integridade e CJK, não substitui revisão gramatical humana.
