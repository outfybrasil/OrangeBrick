# Reels e Redes Sociais — Documentação Completa

> Documento canônico do módulo de Reels e publicação social do Orange Brick.
>
> Última atualização: 22/10/2026<br>
> Commit de referência: `14619bb` (`fix: aprimora criação e publicação de reels`)<br>
> Regras editoriais: [`AGENTS.md`](../AGENTS.md)<br>
> Documentos históricos: [`REELS_AUTOMATION.md`](./REELS_AUTOMATION.md) e [`REELS_PRD.md`](./REELS_PRD.md)

Se este documento divergir do código, o código vence. Atualize o documento sempre que alterar o pipeline, as copys ou as regras de publicação.

---

## 1. Visão geral

O módulo transforma uma matéria publicada do Orange Brick em um vídeo vertical de 1080 × 1920, com:

- roteiro gerado por IA;
- narração em português brasileiro;
- legendas sincronizadas;
- trilha sonora e efeitos sonoros;
- motion graphics com a identidade visual da categoria;
- copys específicas para Instagram, TikTok e YouTube Shorts;
- publicação manual pelo painel ou automática pelo worker.

O objetivo editorial é informar sem clickbait, preservar o fato e o contexto, e usar as descrições para gerar conversa, clique na matéria e seguidores recorrentes.

### Princípios atuais

- Uma matéria publicada pode gerar um Reel automaticamente.
- O roteiro tem exatamente 5 cenas de conteúdo e uma cena final de CTA.
- A narração deve ter de 75 a 95 palavras, com no máximo 22 palavras por frase.
- A pergunta final deve ser específica ao assunto.
- O texto do vídeo não pede follow, like, save e share ao mesmo tempo.
- As CTAs de follow, inscrição e link ficam nas descrições por plataforma.
- Cada plataforma recebe uma copy nativa, não um copiar-e-colar.
- A publicação usa reservas atômicas para evitar duplicidade.
- Resultado de envio `unknown` nunca deve ser repetido às cegas.

---

## 2. Arquitetura

```text
Matéria publicada
      |
      v
triggerReelGeneration(slug)
      |
      +--> Local: fila em memória + scripts/generate-reel.mjs
      |
      +--> Remoto: enqueue_reel no Supabase + GitHub Actions
                    |
                    v
              scripts/reel-worker.mjs
                    |
                    v
        Gemini -> TTS -> mixagem -> composição -> MP4
                    |
                    v
        Supabase Storage: editorial-reels
                    |
                    v
             /admin/reels
                    |
                    v
        generateSocialCopys(post + script)
                    |
       +------------+------------+
       |            |            |
       v            v            v
  Instagram      TikTok       YouTube
```

### Componentes principais

| Componente | Responsabilidade |
|---|---|
| `src/lib/video/reel-service.ts` | Fila local, manifesto, disparo remoto, cópia social central |
| `src/lib/video/reel-script.ts` | Roteiro estruturado com Gemini e validação editorial |
| `src/lib/video/reel-tts.py` | Narração ElevenLabs ou edge-tts e timestamps |
| `src/lib/video/reel-mixer.py` | Mixagem de voz, BGM e SFX |
| `src/lib/video/reel-composition.ts` | Composição HTML/GSAP 1080 × 1920 |
| `scripts/generate-reel.mjs` | Pipeline local completo |
| `scripts/reel-worker.mjs` | Worker remoto do GitHub Actions |
| `.github/workflows/reel-generator.yml` | Execução remota sob demanda |
| `src/lib/video/reel-remote.ts` | Fila, Storage e dispatch remoto |
| `src/app/api/admin/reels/route.ts` | Lista, disparo e cancelamento no admin |
| `src/app/api/cron/reel-social/route.ts` | Publicação social automática e fallback |
| `src/app/api/cron/reel-metrics/route.ts` | Coleta diária de métricas e conferência de tags do YouTube |
| `src/lib/video/reel-social-delivery.ts` | Reserva atômica e status de entrega |
| `src/lib/video/reel-youtube.ts` | Integração YouTube via Composio |
| `src/app/admin/reels/page.tsx` | Central de Reels e assistente social |
| `src/components/admin/InstagramPublisher.tsx` | Publicação manual no Instagram |
| `src/components/admin/TikTokPublisher.tsx` | Envio manual para a inbox do TikTok |
| `src/components/admin/YouTubePublisher.tsx` | Upload manual para o YouTube |

---

## 3. Fluxo de geração

### 3.1 Gatilhos

O Reel pode ser solicitado por:

1. Publicação de uma matéria no editor ou em lote.
   - `src/app/api/admin/posts/publish/route.ts` chama `triggerReelGeneration(slug)` em `after(...)`, sem bloquear a resposta da publicação.
2. Botão “Gerar Reel” na Central de Reels.
   - `POST /api/admin/reels` com `{ "slug": "..." }`.
3. CLI local:
   - `npm run reel:generate -- <slug>`
   - `npm run reel:latest`
4. Geração de notícia com Reel:
   - `npm run news:generate -- --with-reel`

### 3.2 Fila e estados

#### Remoto

- `enqueue_reel(p_slug)` cria ou reutiliza um job em `public.reel_jobs`.
- Só aceita matéria publicada e não arquivada.
- Mantém no máximo um job ativo (`queued` ou `running`) por matéria.
- Jobs antigos são expirados:
  - `queued` há mais de 60 minutos;
  - `running` com lease vencido.
- `claim_reel(p_token)` reserva o próximo job:
  - lease de 30 minutos;
  - incrementa `attempts`;
  - usa `for update skip locked`.
- `finish_reel(...)` valida o resultado:
  - caminho exato `post_id/job_id.mp4`;
  - duração maior que 0 e no máximo 120 segundos;
  - tamanho entre 100 KB e 100 MB;
  - matéria ainda publicada, não arquivada e com `updated_at` igual ao `expected_updated_at`.
- Se a matéria mudou durante a renderização, o job vira `skipped` e precisa ser gerado novamente.

Status de `reel_jobs`:

| Status | Significado |
|---|---|
| `queued` | Aguardando worker |
| `running` | Reservado por um worker |
| `ready` | MP4 validado e armazenado |
| `failed` | Falha definitiva ou cancelamento |
| `skipped` | Matéria mudou ou saiu do ar durante a geração |

#### Local

- A fila fica em memória no processo do Next.js (`reelQueue`).
- Os jobs são processados em sequência, um por vez.
- O progresso e o resultado ficam em `public/reels/manifest.json`.
- `REELS_REMOTE=false` força o modo local no `triggerReelGeneration`.
- Na Vercel, o modo remoto é sempre usado.

### 3.3 Roteiro com Gemini

Arquivo: `src/lib/video/reel-script.ts`.

O modelo recebe título, categoria, resumo e corpo da matéria. A resposta é JSON com:

- `hook`;
- `headline`;
- `subHeadline`;
- `badge`;
- `narrationText`;
- exatamente 5 `scenes`;
- `ctaQuestion`;
- `ctaAction`;
- `ctaButton`.

Regras aplicadas antes de renderizar:

| Campo | Limite |
|---|---|
| Gancho | 55 caracteres |
| Título principal | 48 caracteres |
| Subtítulo | 64 caracteres |
| Selo | 24 caracteres |
| Título de cena | 36 caracteres |
| Destaque de cena | 48 caracteres |
| Tag de cena | 18 caracteres |
| Pílula | 18 caracteres |
| Pergunta de CTA | 56 caracteres |
| Narração | 1.200 caracteres |
| Narração | 75 a 95 palavras |
| Cada frase | no máximo 22 palavras |

Validações importantes:

- exatamente 5 cenas;
- nenhuma cena sem título, destaque ou tag;
- nenhum texto com reticências ou final incompleto;
- narração precisa terminar com `.`, `!` ou `?`;
- narração precisa conter a pergunta final;
- CTA fixo: `Comente sua resposta para continuar a conversa` e `COMENTE ABAIXO`;
- o roteiro passa por uma segunda chamada de revisão editorial com temperatura menor;
- modelos candidatos em `CANDIDATE_MODELS`, com até 3 rodadas e backoff de 8 segundos.

O prompt atual não pede follow, like, save ou share na narração. Ele concentra a fala em uma única CTA de conversa. As CTAs de follow e link ficam nas descrições.

### 3.4 Narração

Arquivo: `src/lib/video/reel-tts.py`.

Ordem de preferência:

1. ElevenLabs, se `ELEVENLABS_API_KEY` e `ELEVENLABS_VOICE_ID` estiverem configurados.
   - modelo `eleven_multilingual_v2`;
   - timestamps por caractere convertidos em frases.
2. edge-tts como fallback gratuito.
   - voz padrão `pt-BR-AntonioNeural`;
   - taxa padrão `+0%`.

O TTS valida se o texto sintetizado corresponde exatamente ao roteiro. Se a transcrição não bater, a renderização falha.

O provider usado é salvo em `ttsProvider` (`elevenlabs` ou `edge-tts`) no JSON do job. A copy usa esse campo para decidir se mostra a atribuição `Narração: elevenlabs.io`.

### 3.5 Áudio

Arquivo: `src/lib/video/reel-mixer.py`.

- Usa `assets/reels/audio/bgm*.mp3` como trilha.
- Escolhe uma faixa aleatória do grupo disponível.
- Usa SFX `impact.wav`, `whoosh.wav`, `coin.wav` e `powerup.wav` quando existirem.
- Aplica ducking na trilha enquanto a voz fala.
- Gera `master_audio.m4a`.

### 3.6 Composição visual

Arquivo: `src/lib/video/reel-composition.ts`.

| Item | Valor |
|---|---|
| Resolução | 1080 × 1920 |
| FPS | 30 |
| Cenas de conteúdo | 5 |
| Cena final | CTA |
| Estilos | `cinema`, `ruptura`, `game`, `manchete`, `neon_minimal` |
| Renderizador | `hyperframes@0.8.147` |
| Workers de render | 2 |

Cores por categoria:

| Categoria | Cor |
|---|---|
| `breaking` | `#FF5E00` |
| `hardware` | `#6EA8D8` |
| `industry` | `#8FBF8F` |
| `modding` | `#56BFB2` |
| `review` | `#D9B45B` |
| `opinion` | `#E5766B` |

O tempo da cena final de CTA é reservado dinamicamente: no mínimo 4,5 e no máximo 6,5 segundos. As cenas de conteúdo dividem o restante conforme o perfil de variação sorteado.

As legendas usam as frases e timestamps do TTS, com bolha na margem segura. O layout também exibe headline, destaque, pills, tag e CTA final.

### 3.7 Imagens

- A capa vem de `post.image_url`.
- As imagens internas vêm dos blocos `image` do corpo JSON.
- Se faltar imagem, a composição usa `assets/cover.webp` como fallback.
- O Reel não exige que a matéria tenha exatamente 3 imagens; ele usa o que estiver disponível.

### 3.8 Armazenamento e entrega

#### Remoto

- Bucket privado: `editorial-reels`.
- Caminho: `<post_id>/<reel_job_id>.mp4`.
- Limite do bucket: 100 MB.
- MIME permitido: `video/mp4`.
- O painel recebe URLs assinadas de 1 hora.
- O worker faz upload, chama `finish_reel` e remove o arquivo se o job não terminar como `ready`.

#### Local

- Vídeo: `public/reels/<slug>.mp4`.
- Manifesto: `public/reels/manifest.json`.
- Os MP4s são ignorados pelo Git. O `manifest.json` é versionado; evite commitar entradas de testes locais.

### 3.9 Worker remoto

Arquivo: `scripts/reel-worker.mjs`.

1. Chama `claim_reel` com um token aleatório.
2. Confere se a matéria continua publicada e inalterada.
3. Executa `scripts/generate-reel.mjs <slug>`.
4. Lê o manifesto local do runner.
5. Valida duração e tamanho.
6. Faz upload para o bucket.
7. Chama `finish_reel`.
8. Se o job ficou `ready`, chama a publicação social.
9. Se ainda houver jobs `queued`, dispara outro worker.
10. O worker tem deadline interno de 20 minutos; o workflow tem timeout de 55 minutos.

O workflow `.github/workflows/reel-generator.yml`:

- roda apenas em `workflow_dispatch`;
- exige branch `master`;
- instala Node 22, FFmpeg, `edge-tts==7.3.1` e Chromium;
- executa `scripts/reel-worker.mjs`;
- usa `GITHUB_TOKEN` para novo dispatch quando necessário;
- não envia Telegram no modo remoto.

---

## 4. Publicação social

### 4.1 Fluxo automático normal

O worker, após deixar o Reel `ready`, chama:

```text
/api/cron/reel-social?postId=<post_id>&jobId=<reel_job_id>
```

Essa chamada é repetida em loop:

- uma plataforma por chamada;
- ordem atual: YouTube → Instagram → TikTok;
- 2 segundos entre plataformas;
- se o TikTok ficar `submitted`, espera 30 segundos e consulta novamente;
- até 12 tentativas;
- se não houver mais pendências, encerra.

Isso faz o fluxo normal publicar nas três redes logo após a renderização.

### 4.2 Cron de fallback

`vercel.json` agenda o fallback para os mesmos três horários das matérias:

```text
0 14 * * * -> /api/cron/reel-social  (11h BRT)
0 20 * * * -> /api/cron/reel-social  (17h BRT)
0 23 * * * -> /api/cron/reel-social  (20h BRT)
```

Os horários do Vercel usam UTC. O cron é uma rede de segurança para jobs que o worker não conseguiu publicar. No modo `batchPublish`, a rota processa uma plataforma por invocação e retorna. O worker normal continua publicando logo após renderizar; o fallback avança até três entregas por dia.

`/api/cron/reel-metrics` roda às 20h de Brasília e grava um snapshot diário dos Reels publicados nos últimos 90 dias. Instagram fornece visualizações, alcance, média e tempo total assistidos, curtidas, comentários, compartilhamentos, salvamentos e interações. TikTok fornece visualizações, curtidas, comentários e compartilhamentos depois da finalização manual no aplicativo. YouTube fornece visualizações, curtidas e comentários pela Data API; retenção média, inscritos ganhos e compartilhamentos usam YouTube Analytics. Métricas indisponíveis pela plataforma aparecem vazias.

Os links sociais passam por `/reels/<slug>` antes de abrir a matéria, permitindo contar cliques sem armazenar identificadores pessoais. A rota `/reels` é uma opção para o link da bio e encaminha à matéria mais recente.

A automação só considera matérias publicadas depois de `reel_social_automation.activated_at`. A linha dessa tabela é criada pela migration `20261019190000_reel_social_automation.sql`. Se a linha não existir, a rota responde que a automação não está instalada.

### 4.3 Publicação manual

No painel `/admin/reels`:

1. Abra um Reel com status `ready`.
2. Clique em “Assistente Social”.
3. Escolha Instagram, TikTok ou YouTube.
4. Revise a copy.
5. Marque a confirmação.
6. Publique.

A publicação manual exige sessão administrativa verificada. O cron usa `CRON_SECRET` e `autoPublic: true` para dispensar a confirmação humana.

### 4.4 Idempotência e status

Arquivo: `src/lib/video/reel-social-delivery.ts`.

- `reel_social_publications` tem chave primária `(post_id, platform)`.
- `beginSocialDelivery` reserva o envio com status `processing`.
- Uma segunda tentativa simultânea recebe conflito.
- `finishSocialDelivery` só atualiza a reserva original, usando `updated_at` como compare-and-set.
- `unknown` significa que o resultado é incerto. Confira a plataforma antes de repetir.
- Retry manual só é permitido para `failed` ou para repost explícito de publicação já concluída.

Status:

| Status | Significado |
|---|---|
| `processing` | Envio em andamento |
| `submitted` | Aceito pela plataforma, aguardando confirmação ou revisão |
| `published` | Publicado |
| `failed` | Falha confirmada |
| `unknown` | Resultado incerto; exige conferência manual |

### 4.5 YouTube

- Integração via Composio.
- Variáveis: `COMPOSIO_API_KEY`, `COMPOSIO_YOUTUBE_AUTH_CONFIG`, `COMPOSIO_YOUTUBE_ACCOUNT`, `COMPOSIO_YOUTUBE_CHANNEL`.
- O canal é fixado por variável; se a conexão apontar para outro canal, o envio é bloqueado.
- Upload usa `YOUTUBE_MULTIPART_UPLOAD_VIDEO`.
- Título máximo na rota: 100 caracteres.
- Descrição máxima: 5.000 caracteres.
- Título e descrição não podem conter `<` ou `>`.
- Tags: até 15, strings não vazias.
- Visibilidade: `private`, `unlisted` ou `public`.
- No painel manual, o padrão é `private`.
- No fluxo automático, a visibilidade é `public`.
- Histórico detalhado em `reel_youtube_publications`.
- A tabela não tem coluna de tags; as tags são enviadas no upload, mas não ficam auditadas no banco.
- `DELETE /api/admin/reels/youtube?postId=...` redefine o histórico, mas é bloqueado se o status for `preparing`, `uploading` ou `unknown`.

### 4.6 Instagram

- Duas formas:
  - Composio, com `COMPOSIO_INSTAGRAM_ACCOUNT`;
  - token/account próprios, com `INSTAGRAM_ACCESS_TOKEN` e `INSTAGRAM_ACCOUNT_ID`.
- Cria container de Reels, consulta o processamento e publica.
- A API recebe apenas a legenda; as hashtags já estão dentro dela.
- Limite da legenda no painel: 2.200 caracteres.
- O envio manual exige confirmação.
- O cron usa `autoPublic` e publica direto quando as credenciais estão válidas.

### 4.7 TikTok

- Integração via Composio ou token próprio.
- O vídeo é enviado para a caixa de entrada/rascunho do TikTok.
- A publicação final depende de revisão e confirmação no app do TikTok.
- O painel avisa que a legenda e as hashtags devem ser conferidas/coladas ao finalizar.
- Status é consultado por `GET /api/admin/reels/tiktok?action=status&publishId=...`.
- Um `publishId` iniciado por `v_inbox_` indica rascunho na inbox.
- A API do TikTok pode devolver `ok` sem um ID confiável; nesse caso o status fica `unknown`.

---

## 5. Copys por plataforma

Função central: `generateSocialCopys` em `src/lib/video/reel-service.ts`.

Ela é chamada:

- no `GET /api/admin/reels`, para exibir as copys no painel;
- no `POST /api/admin/reels/:platform`, quando o painel envia o texto;
- no `/api/cron/reel-social`, para publicação automática.

As copys são recalculadas a cada leitura. Edições feitas no textarea do painel não são persistidas no banco. O cron sempre regenera a copy a partir da matéria e do script.

### 5.1 Entradas e normalização

Entradas:

- `title`;
- `summary`;
- `slug`;
- `category`;
- `script` do job (`hook`, `narrationText`, `ctaQuestion`, `ttsProvider`).

Normalizações:

- remove Markdown de links e negrito;
- compacta espaços;
- detecta títulos, resumos, ganchos e perguntas com final incompleto;
- se o título estiver incompleto, usa `Veja a matéria completa.`;
- se o resumo estiver incompleto, usa o título completo;
- se o gancho estiver incompleto, usa o título completo;
- remove do resumo o prefixo que já aparece no gancho;
- capitaliza a primeira letra do resumo de apoio.

### 5.2 Narração completa versus fallback

`narrationIsComplete` é verdadeiro quando:

- a narração tem entre 75 e 95 palavras;
- termina com `.`, `!` ou `?`;
- não tem reticências ou final incompleto.

Se verdadeiro:

- `coreCopy = [narration]`;
- não há `commentPrompt` separado, porque a pergunta já está na narração.

Se falso:

- `coreCopy = [hook, supportingSummary]`;
- `commentPrompt = "Responda nos comentários: <pergunta>"`.

Exemplo: o Reel mais recente da matéria `segunda-onda-de-outubro-do-xbox-game-pass-traz-final-fantasy-vii` tem 73 palavras na narração. Por isso ele usa gancho + resumo + pergunta, e não a narração completa.

### 5.3 Séries por categoria

| Categoria | Série | Hashtag |
|---|---|---|
| `breaking` | Plantão OB | `#PlantaoOB` |
| `hardware` | Hard News OB | `#HardNewsOB` |
| `industry` | Radar OB | `#RadarOB` |
| `modding` | Gambiarra OB | `#GambiarraOB` |
| `review` | Review OB | `#ReviewOB` |
| `opinion` | Opinião OB | `#OpiniaoOB` |

A linha de série aparece nas três descrições:

```text
Plantão OB — Orange Brick
```

### 5.4 Perguntas de fallback

| Categoria | Pergunta |
|---|---|
| `breaking` | O que essa notícia muda para você como jogador? |
| `hardware` | Esse hardware entra na sua lista de compras? |
| `industry` | Como essa decisão pode afetar os próximos jogos? |
| `modding` | Você levaria essa modificação a sério? |
| `review` | Você daria uma chance a esse jogo? |
| `opinion` | Você concorda com essa leitura? |

Antes do fallback, a função tenta usar a pergunta fornecida pelo roteiro. Se ela for genérica, incompleta ou não terminar em `?`, usa uma pergunta específica de lançamento ou a pergunta da categoria.

### 5.5 Links e UTM

As URLs diretas de Instagram e YouTube usam a matéria correspondente e incluem utm_source, utm_medium, utm_campaign e utm_content com o slug. TikTok mantém a orientação para abrir o link da bio.

A rota /reels redireciona para a matéria publicada mais recente. Os links da bio podem usar utm_source=instagram ou utm_source=tiktok e recebem utm_medium=bio, utm_campaign=reel e utm_content com o slug. A rota /reels/<slug> direciona para uma matéria específica e registra o clique da plataforma. O domínio principal orangebrick.blog já é suficiente para levar visitantes ao site; usar /reels com UTM é opcional e acrescenta o redirecionamento à matéria recente e a atribuição da origem.

Se quiser encaminhar quem clica na bio diretamente à matéria mais recente e medir a origem do tráfego, configure manualmente o link correspondente: https://orangebrick.blog/reels?utm_source=instagram no Instagram ou https://orangebrick.blog/reels?utm_source=tiktok no TikTok. O link base https://orangebrick.blog já atende ao direcionamento para o site.

### 5.6 Hashtags

A seleção dá prioridade às hashtags do jogo, franquia ou assunto antes das hashtags de plataforma. Depois entram a série, OrangeBrick, categoria e GamesBrasil, respeitando o limite de cinco hashtags por plataforma.

TikTok converte hashtags para minúsculas e duplicatas são removidas sem diferenciar maiúsculas de minúsculas. Não são usadas hashtags genéricas de algoritmo como #fyp ou #viral.

O mapa subjectHashtags contém assuntos como Saros, Cyberpunk2077, GTA6, PlayStation, Xbox, Nintendo, GamePass, EldenRing, Capcom, Konami e Valve. Quando não há assunto conhecido, o código usa a primeira palavra útil do slug.

### 5.7 YouTube: título e tags

Título:

- se o gancho tiver até 70 caracteres, usa o gancho;
- se passar, usa o título completo;
- se ainda passar, corta em 69 caracteres, remove a última palavra parcial e adiciona `…`;
- não inclui `| elevenlabs.io`;
- a atribuição de TTS fica apenas na descrição, e só quando o provider é ElevenLabs.

Tags:

- `Orange Brick`;
- `Shorts`;
- nome da série;
- tags da categoria;
- assuntos detectados;
- plataformas detectadas;
- máximo de 15.

### 5.8 Ordem final das descrições

Instagram:

```text
<coreCopy>

<commentPrompt, se houver>

Matéria completa no link da bio: <url com UTM>

Siga @ob.labs para acompanhar as próximas notícias.

<série> — Orange Brick

<atribuição, se ElevenLabs>

<5 hashtags>
```

TikTok:

```text
<coreCopy>

<commentPrompt, se houver>

Matéria completa no link da bio.

Siga para acompanhar as próximas notícias.

<série> — Orange Brick

<atribuição, se ElevenLabs>

<5 hashtags em minúsculas>
```

YouTube:

```text
<coreCopy>

<commentPrompt, se houver>

Leia a matéria completa: <url com UTM>

Inscreva-se no canal para acompanhar as próximas notícias.

<série> — Orange Brick

<atribuição, se ElevenLabs>

<#Shorts + 4 hashtags>
```

### 5.9 Exemplo real

Matéria: `segunda-onda-de-outubro-do-xbox-game-pass-traz-final-fantasy-vii`<br>
Categoria: `breaking`<br>
Narração: 73 palavras, portanto usa o fallback de gancho + resumo.

Instagram:

```text
Final Fantasy VII Remake chega ao Game Pass em outubro!

Microsoft confirma a segunda leva de outubro do Game Pass, com Final Fantasy VII Remake Intergrade e estreias de peso no catálogo.

Responda nos comentários: Qual desses lançamentos você vai jogar primeiro?

Matéria completa no link da bio: https://orangebrick.blog/posts/segunda-onda-de-outubro-do-xbox-game-pass-traz-final-fantasy-vii?utm_source=instagram&utm_medium=reel&utm_campaign=reel

Siga @ob.labs para acompanhar as próximas notícias.

Plantão OB — Orange Brick

#Xbox #PlantaoOB #OrangeBrick #NoticiasDeGames #GamesBrasil
```

TikTok:

```text
Final Fantasy VII Remake chega ao Game Pass em outubro!

Microsoft confirma a segunda leva de outubro do Game Pass, com Final Fantasy VII Remake Intergrade e estreias de peso no catálogo.

Responda nos comentários: Qual desses lançamentos você vai jogar primeiro?

Matéria completa no link da bio.

Siga para acompanhar as próximas notícias.

Plantão OB — Orange Brick

#xbox #plantaoob #orangebrick #noticiasdegames #gamesbrasil
```

YouTube:

```text
Título: Final Fantasy VII Remake chega ao Game Pass em outubro!

Final Fantasy VII Remake chega ao Game Pass em outubro!

Microsoft confirma a segunda leva de outubro do Game Pass, com Final Fantasy VII Remake Intergrade e estreias de peso no catálogo.

Responda nos comentários: Qual desses lançamentos você vai jogar primeiro?

Leia a matéria completa: https://orangebrick.blog/posts/segunda-onda-de-outubro-do-xbox-game-pass-traz-final-fantasy-vii?utm_source=youtube&utm_medium=short&utm_campaign=reel

Inscreva-se no canal para acompanhar as próximas notícias.

Plantão OB — Orange Brick

#Shorts #Xbox #PlantaoOB #OrangeBrick #NoticiasDeGames
```

Tags enviadas ao YouTube:

```text
Orange Brick
Shorts
Plantão OB
Notícias de games
Xbox
```

---

## 6. Banco de dados

Migrations relevantes:

- `20261014190000_reel_worker_integration.sql`
- `20261014190703_reel_youtube_publications.sql`
- `20261019190000_reel_social_automation.sql`
- `20261022220000_reel_social_metrics.sql`

### `reel_jobs`

| Coluna | Uso |
|---|---|
| `id` | UUID do job |
| `post_id` | Matéria |
| `expected_updated_at` | Detecta edição da matéria durante a geração |
| `status` | `queued`, `running`, `ready`, `failed`, `skipped` |
| `attempts` | Número de tentativas |
| `lock_token` | Reserva do worker |
| `lease_until` | Validade da reserva |
| `created_at`, `started_at`, `finished_at` | Auditoria |
| `storage_path` | Caminho no bucket |
| `duration` | Duração em segundos |
| `file_size` | Tamanho em bytes |
| `script` | JSON do roteiro + `ttsProvider` |
| `error` | Mensagem de falha |
| `telegram_status` | Campo legado/opcional |

### `reel_social_automation`

| Coluna | Uso |
|---|---|
| `id` | Sempre `true` |
| `activated_at` | Corte temporal: só publica matérias posteriores |

A presença da linha ativa a automação. Não existe flag `enabled` separada.

### `reel_social_publications`

| Coluna | Uso |
|---|---|
| `post_id` | Matéria |
| `platform` | `instagram`, `tiktok`, `youtube` |
| `reel_job_id` | Job do Reel |
| `status` | `processing`, `submitted`, `published`, `failed`, `unknown` |
| `external_id` | ID externo/mídia/publish ID |
| `platform_media_id` | ID público do vídeo TikTok depois da finalização no app |
| `error` | Erro |
| `created_at`, `updated_at` | Auditoria |

Chave primária: `(post_id, platform)`.

### `reel_social_metrics` e `reel_social_clicks`

`reel_social_metrics` guarda snapshots por Reel, plataforma e dia de Brasília. Mantém visualizações, alcance, tempo assistido, curtidas, comentários, compartilhamentos, salvamentos, seguidores ganhos, interações e erro da coleta. `reel_social_clicks` conta acessos aos links com UTM que passam pelos redirecionamentos próprios do Orange Brick.

### `reel_youtube_publications`

| Coluna | Uso |
|---|---|
| `id` | UUID |
| `post_id` | Matéria |
| `reel_job_id` | Job |
| `channel_id` | Canal de destino |
| `status` | `preparing`, `uploading`, `uploaded`, `unknown`, `failed` |
| `title` | Título enviado |
| `description` | Descrição enviada |
| `tags` | Tags enviadas no upload |
| `verified_tags` | Tags lidas do vídeo publicado |
| `tags_verified_at`, `tags_match` | Auditoria da conferência em produção |
| `visibility` | `public`, `unlisted`, `private` |
| `video_id` | ID no YouTube |
| `error` | Erro |
| `created_at`, `updated_at` | Auditoria |

Unique: `(post_id, channel_id)`. A migration `20261022220000_reel_social_metrics.sql` adiciona e persiste `tags`, `verified_tags`, `tags_verified_at` e `tags_match`.

### Storage

- Bucket: `editorial-reels`
- Privado
- Limite: 100 MB
- MIME: `video/mp4`

### Segurança

- Tabelas com RLS habilitado.
- `public`, `anon` e `authenticated` não têm acesso direto.
- `service_role` é usado apenas no servidor.
- A API admin exige sessão administrativa verificada e MFA/AAL2.
- O cron exige `CRON_SECRET` no header `Authorization`.

---

## 7. API e painel

### Rotas

| Rota | Método | Uso |
|---|---|---|
| `/api/admin/reels` | `GET` | Lista últimas 80 matérias com status, copy e publicações |
| `/api/admin/reels` | `POST` | Dispara geração por `{ slug }` |
| `/api/admin/reels` | `DELETE` | Cancela geração por `{ slug }` |
| `/api/admin/reels/instagram` | `POST` | Publica Reel no Instagram |
| `/api/admin/reels/tiktok` | `POST` | Envia Reel para a inbox do TikTok |
| `/api/admin/reels/tiktok?action=status&publishId=...` | `GET` | Consulta status do TikTok |
| `/api/admin/reels/youtube` | `GET` | Consulta canal e histórico |
| `/api/admin/reels/youtube` | `POST` | Faz upload no YouTube |
| `/api/admin/reels/youtube?postId=...` | `DELETE` | Redefine histórico do YouTube |
| `/api/cron/reel-social` | `GET` | Publicação automática/fallback |
| `/api/cron/reel-metrics` | `GET` | Snapshot diário e auditoria das tags do YouTube |

### Painel

`/admin/reels` oferece:

- filtros por status: todos, prontos, gerando, pendentes;
- filtro por categoria;
- busca por título/slug;
- player vertical;
- download do MP4;
- geração, cancelamento e retry;
- posição na fila e ETA estimado;
- assistente social com três abas;
- status de publicação por rede;
- possibilidade de repost quando permitido.

Comportamentos importantes:

- A lista recarrega estados sociais periodicamente.
- O ETA remoto usa a mediana das últimas 15 renderizações concluídas.
- A fila remota mostra jobs `queued` e `running`.
- As copys são recalculadas no `GET`; edições no textarea não são salvas no banco.
- O YouTube manual começa em `private`.
- O TikTok manual envia para a inbox; a finalização é no app.
- O Instagram manual exige marcar a confirmação.

---

## 8. Configuração e ambiente

### Requisitos locais

- Node.js 22 a 24;
- Python 3;
- FFmpeg no `PATH`;
- `edge-tts==7.3.1`;
- Chromium via Playwright;
- acesso ao Supabase;
- chave do Gemini para gerar roteiro.

### Variáveis principais

| Variável | Uso |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL do Supabase |
| `SUPABASE_SECRET_KEY` | Chave server-side preferencial |
| `SUPABASE_SERVICE_ROLE_KEY` | Compatibilidade server-side |
| `GEMINI_API_KEY` | Roteiro |
| `ELEVENLABS_API_KEY` | TTS premium, opcional |
| `ELEVENLABS_VOICE_ID` | Voz ElevenLabs, opcional |
| `REELS_REMOTE` | `false` força modo local |
| `REELS_GITHUB_TOKEN` | Disparo do GitHub Actions |
| `REELS_GITHUB_REPOSITORY` | Padrão `outfybrasil/OrangeBrick` |
| `REELS_GITHUB_REF` | Padrão `master` |
| `REELS_SITE_URL` | URL usada pelo worker para chamar a publicação social |
| `CRON_SECRET` | Autoriza cron e worker |
| `COMPOSIO_API_KEY` | Composio |
| `COMPOSIO_YOUTUBE_AUTH_CONFIG` | App OAuth do YouTube |
| `COMPOSIO_YOUTUBE_ACCOUNT` | Conexão YouTube |
| `COMPOSIO_YOUTUBE_CHANNEL` | Canal de destino |
| `COMPOSIO_INSTAGRAM_ACCOUNT` | Conexão Instagram |
| `COMPOSIO_TIKTOK_AUTH_CONFIG` | App OAuth do TikTok |
| `COMPOSIO_TIKTOK_ACCOUNT` | Conexão TikTok |
| `INSTAGRAM_ACCESS_TOKEN` | Alternativa própria ao Composio |
| `INSTAGRAM_ACCOUNT_ID` | Alternativa própria ao Composio |
| `TIKTOK_ACCESS_TOKEN` | Alternativa própria ao Composio |
| `TELEGRAM_BOT_TOKEN` | Envio opcional local |
| `TELEGRAM_ADMIN_CHAT_ID` | Envio opcional local |

Nunca use prefixo `NEXT_PUBLIC_` em chaves secretas.

### GitHub Actions

Secrets:

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GEMINI_API_KEY`
- `ELEVENLABS_API_KEY` (opcional)
- `ELEVENLABS_VOICE_ID` (opcional)
- `CRON_SECRET`

Variável:

- `REELS_SITE_URL` (opcional; padrão `https://orangebrick.blog`)

O workflow só roda em `master`. Se o branch principal mudar, atualize `REELS_GITHUB_REF` e o `if` do workflow.

### Vercel

- `REELS_GITHUB_TOKEN` com permissão de Actions write.
- `REELS_GITHUB_REPOSITORY`.
- `REELS_GITHUB_REF=master`.
- `CRON_SECRET`.
- Credenciais do Composio.
- `NEXT_PUBLIC_SITE_URL` com o domínio definitivo.

### Migrations

Antes do deploy:

```bash
npx supabase link --project-ref PROJECT_REF
npx supabase db push
```

---

## 9. Operação manual

### Gerar localmente

```bash
npm ci
npm run dev
```

Em outro terminal:

```bash
npm run reel:latest
# ou
npm run reel:generate -- <slug>
```

Forçar estilo:

```bash
npm run reel:generate -- <slug> --style=game
```

Estilos: `cinema`, `ruptura`, `game`, `manchete`, `neon_minimal`.

O CLI local não publica nas redes automaticamente. Ele gera o MP4, atualiza o manifesto e, com `--telegram`, pode enviar o vídeo ao Telegram.

### Publicar pelo painel

1. Abra `/admin/reels`.
2. Escolha um Reel `ready`.
3. Revise o vídeo.
4. Abra o Assistente Social.
5. Revise a copy da plataforma.
6. Confirme.
7. Publique.

### Checklist antes de publicar

- [ ] O vídeo tem 1080 × 1920 e 30 fps.
- [ ] A narração está completa e termina com a pergunta.
- [ ] O texto na tela está legível e dentro da margem segura.
- [ ] A capa identifica o assunto.
- [ ] A copy não repete a mesma imagem/frase de outro Reel recente.
- [ ] O link da matéria abre.
- [ ] As hashtags fazem sentido para o assunto.
- [ ] O título do YouTube tem até 70 caracteres.
- [ ] A visibilidade do YouTube está correta.
- [ ] O TikTok será finalizado no app.
- [ ] O status da rede foi registrado.

---

## 10. Testes e validação

### Comandos

```bash
npm run typecheck
npm run lint
npm run build
npm run reel:verify-youtube-tags
npm test
node --test --experimental-strip-types tests/reel-social-copy.test.ts
node --test --experimental-strip-types tests/reel-social-delivery.test.ts
```

### Estado em 22/10/2026

| Verificação | Resultado |
|---|---|
| `npm run typecheck` | Passou |
| `npm run lint` | Passou |
| `npm run build` | Passou |
| `tests/reel-social-copy.test.ts` | 4/4 passaram |
| `npm test` | 179/188 passaram; 9 falhas conhecidas |

Falhas conhecidas fora do escopo imediato de Reels:

- `tests/admin-publication-route.test.ts`: dependência inesperada `@/lib/video/reel-service`.
- `tests/editorial-cover-rules.test.ts`: 3 falhas sobre alt text, duas imagens internas e simulação e2e.
- `tests/editorial-publication.test.ts`: mensagem de contagem de palavras desatualizada.
- `tests/security-definer-privileges.test.ts`: 4 falhas de regex contra a migration atual de privilégios.

`npm run check` falha enquanto essas 9 falhas existirem. O build de produção não é afetado por elas.

### Cobertura social

Os testes de `reel-social-copy` cobrem:

- CTA, link e hashtags por plataforma;
- hashtags por categoria e série;
- título do YouTube sem atribuição de TTS;
- pergunta contextual e prompt de comentário.

Os testes de `reel-social-delivery` cobrem:

- reserva concorrente;
- retry e status `unknown`;
- Instagram uma vez;
- TikTok apenas inbox;
- YouTube uma vez;
- ordem de automação;
- Storage compartilhado local/Vercel.

---

## 11. Problemas conhecidos e riscos

O código desta continuação prepara cron, redirects, snapshots de métricas, contagem de cliques e auditoria das tags do YouTube. As migrations locais `20261014190000`, `20261019190000` e `20261022220000` foram aplicadas e conferidas no histórico remoto. O deploy de produção Vercel está `READY` em `orangebrick.blog`, e os crons do `vercel.json` foram aceitos. O time Vercel é Hobby, cuja execução pode variar até 59 minutos dentro da hora programada. A conexão PostgreSQL direta do Supabase CLI recebe resets, por isso o histórico e a aplicação foram feitos pela Management API autenticada. O deploy isolado deixou de fora os arquivos locais ignorados, incluindo o manifest e os vídeos preexistentes. O vídeo apagado `4qts9h5TUOY` foi substituído pelo repost `JFgzkN0ROlc`, confirmado no canal correto e associado à matéria. As tags foram aplicadas e a auditoria confirmou 17/17 vídeos, sem divergências. Um snapshot do novo vídeo registrou 112 visualizações, 2 curtidas e 0 comentários em 22/10. No TikTok, a listagem e a consulta pública confirmaram os IDs reais dos seis vídeos mais recentes e de Faraway; os sete IDs foram associados às matérias e as métricas de 22/10 foram salvas. O status do envio antigo de Faraway ainda retorna `SEND_TO_USER_INBOX`, mas o vídeo público correspondente está confirmado pela listagem e pela consulta.

### Alta prioridade

1. Opcional: trocar o link da bio pelas URLs da seção 5.5 para encaminhar à matéria mais recente e atribuir o tráfego por plataforma; o domínio orangebrick.blog já está na bio.
2. Testar uma chamada para seguir no encerramento do Reel e comparar retenção e seguidores ganhos quando as métricas estiverem disponíveis.

### Média prioridade

4. Os seis TikToks mais recentes e Faraway estão publicados. Os IDs públicos foram reconciliados pela descrição/título dos vídeos, e as métricas de visualizações, curtidas, comentários e compartilhamentos foram salvas. O status antigo de envio de Faraway pode continuar mostrando `SEND_TO_USER_INBOX`; a publicação pública está confirmada pelos endpoints de listagem e consulta.
5. Edições de copy no painel não persistem; o cron regenera a copy a partir da matéria e do roteiro.
6. Publicações com status unknown devem ser conferidas manualmente antes de qualquer nova tentativa.
7. REELS_AUTOMATION.md e REELS_PRD.md preservam detalhes históricos; este documento é a referência atual.

### Baixa prioridade

9. reel_jobs.telegram_status não é usado pelo worker remoto; o envio do Telegram é opcional e local.
10. public/reels/manifest.json é versionado; evite incluir entradas geradas por testes locais.
11. A automação é controlada pela linha em reel_social_automation. Para pausá-la, ajuste o cron ou remova a linha com cuidado.

## 12. Roadmap sugerido

### P0 - ativação e aprendizado

| Item | Por quê | Esforço |
|---|---|---|
| Migrations e crons de fallback/métricas | Aplicados e ativos nos horários editoriais | Concluído |
| Conferir tags no YouTube | Repost associado; 17/17 vídeos conferem, sem divergências | Concluído |
| Opcional: apontar as bios para `/reels` com UTM | Direciona para a matéria mais recente com atribuição; o domínio base já está na bio | Baixo |
| Testar CTA de follow com dados de retenção | Mede conversão sem prejudicar a permanência | Médio |

### P1 - crescimento

- Testes A/B de gancho e capa.
- Playlists no YouTube/TikTok e coleções no Instagram.
- Stories com link, carrossel-resumo e community post.
- Respostas a comentários e vídeo-resposta no TikTok.
- Comentário fixado com pergunta.
- Colaborações, duets e stitches.

### P2 - escala

- Thumbnails específicas por plataforma.
- Persistência de copies customizadas.
- Corrigir as nove falhas antigas do suite.
- Rotina de retry com confirmação humana para status unknown.

## 13. Runbook

### Reel preso em `queued`

1. Confira o GitHub Actions `reel-generator`.
2. Confirme `REELS_GITHUB_TOKEN`, `REELS_GITHUB_REPOSITORY` e `REELS_GITHUB_REF`.
3. Veja `reel_jobs` e o `lease_until`.
4. Cancele pelo painel e gere novamente.

### Reel falhou na renderização

1. Leia `reel_jobs.error`.
2. Causas comuns:
   - roteiro fora de 75–95 palavras;
   - frase com mais de 22 palavras;
   - texto de cena acima do limite;
   - TTS não corresponde ao roteiro;
   - FFmpeg/Python/Chromium ausente;
   - matéria editada durante a geração.
3. Corrija a matéria ou o ambiente e gere novamente.

### Vídeo `ready`, mas sem URL

1. Confira o bucket `editorial-reels`.
2. Confirme as chaves do Supabase no servidor.
3. Verifique o `storage_path`.
4. Gere novamente se o arquivo não existir.

### Publicação social 409

- Já existe uma reserva `processing` ou uma publicação anterior.
- Consulte `reel_social_publications`.
- Não force outra reserva sem conferir a rede.

### Status `unknown`

- Confira manualmente a plataforma.
- Se publicou, não repita.
- Se não publicou, use o fluxo de repost/retry apropriado.
- No YouTube, o histórico só pode ser resetado após conferência.

### TikTok na inbox

1. Abra o app do TikTok.
2. Vá em notificações/inbox.
3. Revise o vídeo.
4. Cole a legenda e as hashtags se necessário.
5. Publique manualmente.

### YouTube com erro de cota/permissão

- Cota diária esgotada: aguarde a renovação.
- Permissão: reconecte o YouTube no Composio.
- Canal errado: atualize `COMPOSIO_YOUTUBE_CHANNEL`.

### Instagram não cria container

- Confirme que a URL do vídeo é pública e acessível.
- Confirme token, conta e permissões.
- Verifique se o vídeo atende aos requisitos do Reels.

### Cron não roda

- Confirme `CRON_SECRET`.
- Confirme a linha em `reel_social_automation`.
- Confirme o cron no `vercel.json`.
- Verifique os logs da Vercel.

---

## 14. Referências

### Código

- `src/lib/video/reel-service.ts`
- `src/lib/video/reel-script.ts`
- `src/lib/video/reel-tts.py`
- `src/lib/video/reel-mixer.py`
- `src/lib/video/reel-composition.ts`
- `src/lib/video/reel-remote.ts`
- `src/lib/video/reel-social-delivery.ts`
- `src/lib/video/reel-youtube.ts`
- `scripts/generate-reel.mjs`
- `scripts/reel-worker.mjs`
- `.github/workflows/reel-generator.yml`

### Rotas

- `src/app/api/admin/reels/route.ts`
- `src/app/api/admin/reels/instagram/route.ts`
- `src/app/api/admin/reels/tiktok/route.ts`
- `src/app/api/admin/reels/youtube/route.ts`
- `src/app/api/cron/reel-social/route.ts`
- `src/app/api/admin/posts/publish/route.ts`

### Painel

- `src/app/admin/reels/page.tsx`
- `src/components/admin/InstagramPublisher.tsx`
- `src/components/admin/TikTokPublisher.tsx`
- `src/components/admin/YouTubePublisher.tsx`

### Banco

- `supabase/migrations/20261014190000_reel_worker_integration.sql`
- `supabase/migrations/20261014190703_reel_youtube_publications.sql`
- `supabase/migrations/20261019190000_reel_social_automation.sql`
- `supabase/migrations/20261022220000_reel_social_metrics.sql`

### Testes

- `tests/reel-social-copy.test.ts`
- `tests/reel-social-delivery.test.ts`

### Documentos

- [`AGENTS.md`](../AGENTS.md)
- [`README.md`](../README.md)
- [`REELS_AUTOMATION.md`](./REELS_AUTOMATION.md) — histórico
- [`REELS_PRD.md`](./REELS_PRD.md) — histórico
- [`HANDOFF_2026-10-22.md`](./HANDOFF_2026-10-22.md)
