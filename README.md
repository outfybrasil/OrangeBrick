# Orange Brick

Portal editorial em Next.js 16 com Supabase para dados, autenticação, armazenamento e Edge Functions.

## Arquitetura

- Next.js hospedado em um servidor compatível, preferencialmente Vercel, para SSR, rotas canônicas e metadados por matéria.
- Supabase Postgres e Auth para posts e comentários com RLS.
- Supabase Edge Functions para reações, visualizações, estatísticas, contato, push e geração de imagens.
- Supabase Storage para manter as imagens geradas em um bucket público e durável.

GitHub Pages não é compatível com esta arquitetura porque entrega apenas arquivos estáticos. O workflow do repositório executa a validação; o deploy do aplicativo deve ser configurado no provedor do Next.js.

## Desenvolvimento

Copie `.env.example` para `.env.local`, preencha as variáveis e execute:

```bash
npm ci
npm run dev
```

A validação completa é:

```bash
npm run check
```

## Supabase

Instale ou use a CLI via `npx`, conecte o projeto e aplique a migração:

```bash
npx supabase login
npx supabase link --project-ref PROJECT_REF
npx supabase db push
```

Configure os provedores de autenticação usados pelo site. Bricks, comentários, votos e reações exigem uma conta autenticada. Depois configure os segredos das Functions:

```bash
npx supabase secrets set SITE_URL=https://seu-dominio.com RATE_LIMIT_SALT=valor-aleatorio VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=... VAPID_SUBJECT=mailto:contato@seu-dominio.com
```

Caso um navegador use outro provedor de push, adicione os domínios permitidos em `PUSH_ENDPOINT_HOSTS`, separados por vírgula.

Publique todas as Functions com a configuração de JWT definida em `supabase/config.toml`:

```bash
npx supabase functions deploy --project-ref PROJECT_REF --use-api
```

Crie ou atualize o administrador com uma senha forte:

```bash
npm run admin:create
```

## Produção

Configure `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` para clientes públicos e `SUPABASE_SECRET_KEY` somente no servidor, além do domínio definitivo em `NEXT_PUBLIC_SITE_URL`. As chaves `NEXT_PUBLIC_SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY` continuam como compatibilidade durante a migração; nunca exponha uma chave secreta no navegador ou em variável com prefixo `NEXT_PUBLIC_`.

Também configure `CRON_SECRET` com um valor aleatório forte para autorizar a limpeza mensal do Radar.

Antes da divulgação pública:

1. Adicione `orangebrick.blog` e `www.orangebrick.blog` ao projeto `orange-brick` na Vercel. Mantenha os nameservers atuais da Hostinger, configure os registros A/CNAME exatos exibidos pela Vercel e redirecione `www` para o domínio raiz.
2. Defina `NEXT_PUBLIC_SITE_URL=https://orangebrick.blog` em Production e faça um novo deploy depois que o DNS e o HTTPS forem validados.
3. Cadastre o domínio no Google Search Console.
4. Envie `/sitemap.xml` e `/news-sitemap.xml` no Search Console.
5. Verifique `/robots.txt`, `/feed.xml` e os dados estruturados das matérias.
6. Teste cadastro, login, perfil, Brick, comentário, denúncia, ranking e exclusão de conta.
7. Revise a fila de denúncias em `/admin/community`.
8. Execute `npm run check` e `npx supabase db lint --linked --level warning`.
