# Sincronização de Matérias — Google Drive → Supabase (rascunhos)

Documento de execução para o Codex. O objetivo final: toda matéria criada no Google Drive (pasta `16caMOo-TpZe-2WY3AwYxvI5_ql1do9tV`, acessível por link público) vira **rascunho** no Supabase automaticamente, sem depender de um agente escrever conteúdo.

## Estado atual do repositório

A tarefa já foi **implementada e testada em dry-run**. Faltam apenas passos de infraestrutura/externa e o commit. O que existe:

| Arquivo | Função |
|---|---|
| `scripts/pull-drive.mjs` | Script manual: `npm run pull-drive` importa na hora; flags `--dry-run`, `--file=<id>`, `--force`, `--folder=<id>` |
| `src/app/api/cron/drive-sync/route.ts` | Endpoint GET protegido por `CRON_SECRET`; lista a pasta, exporta markdown, converte em blocos e insere como rascunho (`is_published: false`) |
| `vercel.json` | Cron diário às 8h: `/api/cron/drive-sync` |
| `.github/workflows/drive-sync.yml` | GitHub Action que chama o endpoint a cada 30 min com `Authorization: Bearer ${{ secrets.CRON_SECRET }}` |
| `.env.example` | Novas vars: `GOOGLE_DRIVE_FOLDER_ID`, `GOOGLE_DRIVE_API_KEY`, `GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON` |
| `package.json` | Script `"pull-drive": "node --env-file=.env.local scripts/pull-drive.mjs"` |

## Como funciona o fluxo

1. A pasta do Drive está com permissão "qualquer pessoa com o link" (pública), acessível via **API key** do Google Cloud (`GOOGLE_DRIVE_API_KEY`)
2. O endpoint (ou script local) lista os arquivos da pasta com `files.list`, exporta cada Google Doc como **markdown** e converte para os blocos do post (text/image)
3. Assim que o documento é identificado, começa a busca da capa oficial e de duas imagens internas diferentes. A importação só pode ser considerada concluída depois de validar HTTP 200, dimensões mínimas, alt text e legenda e salvar os arquivos no Storage do Orange Brick.
4. Se a busca de imagens não puder ser concluída, o conteúdo permanece um rascunho incompleto, sem ser entregue para revisão editorial. Nunca deixar a busca de fotos como tarefa manual posterior.
5. A matéria é inserida na tabela `posts` com `is_published: false`, autor "The Brick" (ou o `Por:`/`Autor:` do doc), categoria a partir do campo `Categoria:`
6. **Dedupe:** se o slug já existir no banco, pula (sem duplicar). O script local guarda estado em `scripts/.drive-sync-state.json`; o endpoint consulta o slug no Supabase

## Formato esperado de cada Google Doc

```
# Titulo da materia

Categoria: industry
Resumo: Uma frase resumindo a noticia. (opcional — sobe o primeiro paragrafo se ausente)

*Por: The Brick (Editor-Chefe)*

## Primeiro subtitulo

Texto com **negrito**, [links](https://exemplo.com) e listas.

![Descricao da imagem](https://url-da-imagem.jpg)

## Segundo subtitulo

Mais texto.
```

- Metadados opcionais no topo: `Categoria:` (breaking/hardware/industry/modding/review/opinion — default `industry`), `Resumo:`, `Autor:`, `Capa:` (URL da imagem de capa), `Alt:` (alt text da capa)
- `# ` → título (normalizado em UPPERCASE, sem `**`), `## `/`### ` → subtítulos dentro de blocos de texto, `![alt](url)` → bloco de imagem
- Autor: linha `Por: ...` ou `Autor: ...` é removida do corpo e vira `author_name`
- Resumo: campo `Resumo:` ou primeiro parágrafo com ≥ 20 caracteres, cortado em ~150

## Variáveis de ambiente necessárias

No `.env.local` (já configurado):

```
GOOGLE_DRIVE_FOLDER_ID=16caMOo-TpZe-2WY3AwYxvI5_ql1do9tV
GOOGLE_DRIVE_API_KEY=AIzaSyAhtqCt9M4yCNw_CtE3_h-0j8C18bg72Vg
```

**Importante:** a API key só enxerga arquivos **públicos** ("qualquer pessoa com o link"). Para pasta privada seria preciso um service account (`GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON` com e-mail da conta compartilhado como Leitor na pasta) — implementado no script, pendente de credencial caso queira migrar.

## Passos pendentes (o que o Codex precisa entregar)

1. **Secret no GitHub Actions:** repositório `outfybrasil/OrangeBrick` → Settings → Secrets and variables → Actions → criar `CRON_SECRET` com o **mesmo valor** do `CRON_SECRET` do `.env.local` (projeto Next). Sem ele, o workflow `drive-sync.yml` falha com 403
2. **Env vars na Vercel** (produção): `GOOGLE_DRIVE_API_KEY` e `GOOGLE_DRIVE_FOLDER_ID` no Project Settings → Environment Variables. **Já configuradas pelo usuário** — conferir se o `CRON_SECRET` também existe lá (necessário para o cron diário e para o GitHub Action autenticar)
3. **Commit das mudanças:** arquivos novos/alterados listados acima, seguindo o padrão `chore:`/`feat:` do repo, com `npm run build` passando antes

## Regras extraídas do AGENTS.md que o fluxo deve respeitar

- Matéria sempre **rascunho** (`is_published: false`) — nunca publicar direto
- Nomes de jogos originais, sem tradução; meses traduzidos no texto
- Capas: arte oficial, screenshot ou IA fotorrealista; testar URL com HTTP 200; sem repetir imagem
- Toda importação começa imediatamente a procura da capa e de duas imagens internas; sem as três imagens válidas, o rascunho é incompleto e não segue para revisão
- Corpo entre **700 e 1.000 palavras** com fato, contexto, impacto e fala verificada de alguém ligado ao caso
- Reescrever 100% o texto das fontes (nunca copiar); citar **Fonte:** no final
- Sem caracteres CJK, sem `?`/`�` corrompidos
- Fonte citada ao final no formato `**Fonte:** [Nome](url)`

## Limitações conhecidas

- Plano Hobby do Vercel: cron roda 1x/dia (por isso o GitHub Actions de 30 min como disparador principal)
- GitHub Actions: o agendamento é o mapa de 30 min (não garante execução exata no minuto), roda só na branch main
- Editor de imagem do corpo: o `alt` do Google Docs vira `alt` do bloco; caption fica vazio (preencher no admin depois)
- Docs com título duplicado na pasta → segundo doc é ignorado (slug repetido); usar `--force` no script local ou renomear o título

## Verificação final

- `npm run typecheck` e `npm run build` sem erros
- Teste manual: `npm run pull-drive -- --dry-run` lista os docs da pasta com parsing correto
- Teste pós-deploy: `curl -H "Authorization: Bearer $CRON_SECRET" https://orange-brick.vercel.app/api/cron/drive-sync` retorna JSON `{ imported, skipped, failed }`
- Novo doc na pasta + execução → post em rascunho no painel admin `/admin`
