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

Ative login anônimo em Authentication para permitir comentários sem cadastro. Depois configure os segredos das Functions:

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

Configure no provedor do Next.js as variáveis públicas, `SUPABASE_SERVICE_ROLE_KEY` somente no servidor e o domínio definitivo em `NEXT_PUBLIC_SITE_URL`. Nunca exponha a service role no navegador ou em variáveis com prefixo `NEXT_PUBLIC_`.
