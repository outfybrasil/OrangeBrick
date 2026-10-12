# Segurança do Orange Brick — revisão de 10/10/2026

Referência: [vídeo de Murilo Miguel](https://www.instagram.com/reel/DeSF5M1ujEp/). O vídeo público de aproximadamente 114 segundos foi baixado, suas legendas foram inspecionadas e o áudio foi transcrito localmente. A transcrição automática contém erros de reconhecimento; os termos SQL injection, Cloudflare, rate limiting, WAF e autenticação de dois fatores foram conferidos com o contexto do vídeo.

## Recomendações e aplicação

| Recomendação | Situação |
| --- | --- |
| Política de cookies e privacidade | Já existem política, consentimento e analytics condicionados à aceitação. Acrescentada a explicação sobre contas salvas neste dispositivo. |
| Trocar URL de login e atualizar plugins do WordPress | O projeto usa Next.js e Supabase. As recomendações específicas de WordPress não se aplicam. Ocultar a URL de login não substitui autenticação. |
| Atualizar dependências | Next.js atualizado para 16.3.8; Sharp e seu override para 0.35.5. Atualizados MCP SDK e source-map-js no lockfile; ferramentas de desenvolvimento e brace-expansion também receberam atualizações compatíveis. Auditoria de produção passou de quatro alertas altos para zero alertas conhecidos. |
| SQL injection e sanitização | As consultas usam o cliente Supabase e parâmetros de RPC, sem concatenar SQL recebido pelo usuário. Reforçada a autorização administrativa nas APIs e no banco; também bloqueadas URLs perigosas nos conteúdos e escapado JSON-LD dinâmico. Isso não equivale a certificar todo o banco de produção. |
| Rate limiting e WAF | Limites por IP/usuário já existem para notícias, contato, newsletter, telemetria, uploads e interações. Uploads agora limitam os bytes efetivamente lidos antes de interpretar multipart, inclusive sem Content-Length. O WAF externo ainda requer acesso à hospedagem. |
| Arquivos sensíveis fora do diretório público | Não foram encontrados arquivos .env, chaves, dumps SQL ou backups ZIP em public/. O proxy bloqueia caminhos conhecidos de configuração, repositório e backups. |
| Dois fatores no painel administrativo | Criado /admin/seguranca para cadastrar e confirmar um autenticador TOTP. Páginas administrativas e APIs administrativas exigem sessão AAL2. A migração abaixo reforça isso nas políticas RLS e funções administrativas. |

## Ativação de dois fatores

A implementação está no código local. Não foi publicada e a migração não foi aplicada ao banco de produção.

1. Implantar o código em ambiente de teste e aplicar `supabase/migrations/20261010021625_admin_mfa_security.sql` nesse banco.
2. Entrar com uma conta administrativa. O painel direciona para `/admin/seguranca`, onde a pessoa cadastra um autenticador e confirma o código de seis dígitos. Nenhum segredo TOTP é gravado em localStorage pela página.
3. Confirmar que uma sessão sem segundo fator recebe 403 nas APIs administrativas e não consegue consultar ou alterar dados diretamente pelo Supabase. Confirmar acesso com AAL2 e testar operações editoriais e crons.
4. Implantar código e migração na produção de forma coordenada, com uma conta administrativa e o autenticador disponíveis para validar o acesso.

A migração adiciona uma política **restritiva** às tabelas públicas com RLS: contas administrativas precisam de AAL2 para acessá-las. As políticas existentes continuam determinando quais dados cada pessoa pode acessar. Usuários comuns continuam sujeitos às políticas anteriores; o segundo fator não é obrigatório para leitores. O acesso de serviço usado pelos jobs permanece disponível. Novas tabelas com RLS deverão receber a mesma proteção quando forem criadas.

O helper `isVerifiedAdminSession` deve ser usado apenas depois de validar o token com `auth.getUser(token)`, como fazem as APIs alteradas. Ele lê a claim AAL do token já validado; não valida a assinatura sozinho.

O cadastro TOTP é realizado pelo titular da conta, com Google Authenticator, Microsoft Authenticator ou outro aplicativo compatível. Não foi criado nem ativado um fator em nome do usuário. Guarde o acesso ao autenticador; em caso de perda, a recuperação exige um operador autorizado do projeto Supabase, com confirmação de identidade. Habilite também dois fatores nas contas de Vercel, Supabase, GitHub e no registrador do domínio.

## Regras de hospedagem prontas para configurar

A resposta pública do site contém identificadores de deployment da Vercel. Não há credenciais de Vercel, Cloudflare ou do banco de produção disponíveis neste ambiente, e nenhuma regra externa foi ativada.

Na Vercel, abrir o projeto → Firewall:

- Conferir a proteção contra DDoS da plataforma. Ativar o conjunto gerenciado de regras para ataques comuns disponível no plano, incluindo SQL injection e XSS. Examinar logs em teste antes de ativar bloqueio permanente, para preservar o editor e os uploads legítimos.
- Bloquear os caminhos `.env`, `.git`, `.svn`, `.aws`, `.codex`, `.agents`, `node_modules`, `backup` e `backups`. O código local já bloqueia esses caminhos; aplicar também na borda evita executar a aplicação para responder a sondagens.
- Limitar por IP os POSTs a `/api/contact` e `/api/newsletter` a 10 por minuto, bloqueando excedentes por 60 segundos. Os limites mais estritos de envio continuam no backend.
- Limitar por IP os POSTs a `/api/user/avatar`, `/api/user/banner` e `/api/community/media` a 20 por minuto, bloqueando excedentes por 60 segundos. Manter o limite de 10 envios por hora por usuário já existente no servidor.
- Monitorar acessos excessivos a `/admin/login` e `/admin/seguranca`. O login e TOTP são processados diretamente pelo Supabase; conferir os limites de Auth no painel Supabase, pois um limite apenas na Vercel não cobre tentativas diretas contra Auth.
- Não aplicar desafios de navegador a APIs JSON, crons ou ao webhook Telegram. Crons e webhook mantêm sua validação de segredo. Bloqueios e limites devem preservar esses fluxos.

Se o domínio já passar pelo Cloudflare, aplicar também as regras gerenciadas e os limites na zona do domínio; conferir que o DNS está com proxy ativo e que a origem na Vercel também está protegida. Não há necessidade de mudar DNS ou adicionar Cloudflare para concluir as alterações locais. Países ou IPs não devem ser bloqueados sem evidência nos logs.

Os valores de limite acima são uma configuração inicial para revisão; acompanhe os registros e ajuste quando houver acessos legítimos compartilhando o mesmo IP. Um bloqueio na aplicação não substitui mitigação volumétrica na borda.

## Validação e limites

Há testes executáveis para rejeição de sessão administrativa sem AAL2, bloqueio de RLS em Postgres, leitura multipart limitada sem Content-Length, URLs perigosas e proteção do proxy. A migração foi testada em Postgres local incorporado (PGlite), não no banco remoto. Build, lint, auditoria de dependências e testes devem ser conferidos antes de implantar. Testes autenticados com Supabase real, recuperação de TOTP e a ativação do WAF dependem do ambiente remoto.

O percentual de “99% protegido” citado no vídeo não é uma medida verificável. Estas alterações reduzem riscos concretos; não permitem atribuir um percentual de proteção ao site.

A auditoria completa ainda aponta nove alertas altos na cadeia de dependências de desenvolvimento (`braces`/`micromatch`/`fast-glob`, usados por ESLint e shadcn). A versão mais recente de `braces` disponível na revisão, 3.0.3, também está afetada. Não foi aplicada a sugestão automática de rebaixar Next/ESLint ou shadcn para versões antigas incompatíveis. Essa pendência deve ser acompanhada; o resultado de zero alertas se refere às dependências de produção.

Na suíte completa, 116 de 122 testes passaram. As seis falhas restantes são as mesmas já confirmadas na versão original: quatro expectativas antigas de SQL em `security-definer-privileges.test.ts` e duas em `editorial-images.test.ts`. Os 11 testes específicos de segurança passaram, assim como build, lint e verificação textual.

O fluxo TOTP também passou no Chromium em viewport mobile de 390 px, usando Supabase simulado localmente: sessão AAL1 bloqueada na API, redirecionamento para cadastro, QR de teste exibido, código inválido recusado e sessão AAL2 liberada no painel e na API. Esse teste não usou contas nem segredos reais e não substitui a validação em staging. A CSP foi desabilitada apenas no contexto desse navegador de teste porque o backend simulado usa HTTP localhost; a política da aplicação não foi alterada para permitir esse backend.
