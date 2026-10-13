# 🎬 PRD & Documentação Técnica — Automação de Reels & Shorts
**Portal Orange Brick | Versão 1.2 — Outubro 2026**

Este documento detalha a arquitetura, o fluxo de automação, os endpoints de API e as opções de expansão do ecossistema de vídeos curtos verticais (1080×1920) do **Orange Brick**, formatado para consulta rápida no desktop ou via **Codex no celular**.

---

## 📌 Índice Rápido
1. [Visão Geral do Produto](#-visão-geral-do-produto)
2. [Arquitetura Atual Implementada](#-arquitetura-atual-implementada)
3. [Fluxo de Automação Contínua](#-fluxo-de-automação-contínua)
4. [Guia de Operação no Painel Admin](#-guia-de-operação-no-painel-admin)
5. [Endpoints da API & Estrutura de Dados](#-endpoints-da-api--estrutura-de-dados)
6. [Opções de Expansão e Roadmap (Backlog)](#-opções-de-expansão-e-roadmap-backlog)
7. [Comandos de Terminal Rápidos](#-comandos-de-terminal-rápidos)

---

## 🎯 1. Visão Geral do Produto

### Objetivo
Transformar 100% das notícias e pautas publicadas no portal Orange Brick em **vídeos verticais de alta conversão** (Reels, TikTok, Shorts), com narração neural em português brasileiro, trilha sonora dinâmica com efeitos sonoros sincronizados (SFX) e motion graphics na identidade visual de cada categoria, eliminando o trabalho manual de edição de vídeo e cópia de textos.

### Principais Benefícios
- **Automação Zero-Touch:** Publicou a matéria no portal, o vídeo é gerado em background.
- **Identidade Visual por Categoria:** Cada assunto herda sua cor e badge (Plantão `#FF5E00`, Hard News `#FF8C00`, Radar `#6EA8D8`, etc.).
- **Distribuição Multiplataforma Simplificada:** O painel entrega o arquivo `.mp4` pronto junto com as copys e hashtags formatadas individualmente para **Instagram Reels**, **TikTok** e **YouTube Shorts**.

---

## 🏗️ 2. Arquitetura Atual Implementada

```
                                [ Matéria Publicada no Admin / Script ]
                                                   │
                                                   ▼
                                       ┌───────────────────────┐
                                       │ triggerReelGeneration │
                                       │  (Fila em Background) │
                                       └───────────┬───────────┘
                                                   │
           ┌───────────────────────────────────────┼───────────────────────────────────────┐
           ▼                                       ▼                                       ▼
 ┌───────────────────┐                   ┌───────────────────┐                   ┌───────────────────┐
 │   reel-script.ts  │                   │    reel-tts.py    │                   │   reel-mixer.py   │
 │   Roteiro com IA  │                   │  Narração Neural  │                   │  Áudio, BGM & SFX │
 │ (Gemini 2.5 Flash)│                   │   pt-BR-Antonio   │                   │(FFmpeg + Ducking) │
 └─────────┬─────────┘                   └─────────┬─────────┘                   └─────────┬─────────┘
           │                                       │                                       │
           └───────────────────────────────────────┼───────────────────────────────────────┘
                                                   │
                                                   ▼
                                     ┌───────────────────────────┐
                                     │    reel-composition.ts    │
                                     │ Template HTML5 1080×1920  │
                                     │    (GSAP + Timelines)     │
                                     └─────────────┬─────────────┘
                                                   │
                                                   ▼
                                     ┌───────────────────────────┐
                                     │    hyperframes render     │
                                     │  (Headless Chrome a 30fps)│
                                     └─────────────┬─────────────┘
                                                   │
                                                   ▼
                                     ┌───────────────────────────┐
                                     │    Fusão Final (FFmpeg)   │
                                     │   public/reels/<slug>.mp4 │
                                     └─────────────┬─────────────┘
                                                   │
                                                   ▼
                                     ┌───────────────────────────┐
                                     │ Central Admin /admin/reels│
                                     │   + Copys Prontas de Redes│
                                     └───────────────────────────┘
```

### Arquivos Chave do Módulo:
- [`src/app/admin/reels/page.tsx`](file:///c:/Users/Gustavo/Documents/Projetos/OB/src/app/admin/reels/page.tsx): Painel administrativo central com player 9:16 e assistente de redes sociais.
- [`src/app/api/admin/reels/route.ts`](file:///c:/Users/Gustavo/Documents/Projetos/OB/src/app/api/admin/reels/route.ts): Endpoint de consulta e disparo de renderização.
- [`src/lib/video/reel-service.ts`](file:///c:/Users/Gustavo/Documents/Projetos/OB/src/lib/video/reel-service.ts): Gerenciador da fila de processos, manifesto de status e geração de copys.
- [`scripts/generate-reel.mjs`](file:///c:/Users/Gustavo/Documents/Projetos/OB/scripts/generate-reel.mjs): Pipeline CLI de produção e montagem de vídeo.
- [`src/lib/video/reel-script.ts`](file:///c:/Users/Gustavo/Documents/Projetos/OB/src/lib/video/reel-script.ts): Roteirização estruturada com Gemini.
- [`src/lib/video/reel-composition.ts`](file:///c:/Users/Gustavo/Documents/Projetos/OB/src/lib/video/reel-composition.ts): Composição visual e timing dinâmico de cenas.
- [`src/lib/video/reel-tts.py`](file:///c:/Users/Gustavo/Documents/Projetos/OB/src/lib/video/reel-tts.py): Síntese de áudio via `edge-tts` com marcas temporais.
- [`src/lib/video/reel-mixer.py`](file:///c:/Users/Gustavo/Documents/Projetos/OB/src/lib/video/reel-mixer.py): Sound design com trilha de fundo atenuada e efeitos sonoros.
- [`assets/reels/audio/`](file:///c:/Users/Gustavo/Documents/Projetos/OB/assets/reels/audio): Biblioteca de áudio (`bgm.mp3`, `impact.wav`, `whoosh.wav`, `coin.wav`, `powerup.wav`).
- [`public/reels/`](file:///c:/Users/Gustavo/Documents/Projetos/OB/public/reels): Diretório público onde os arquivos MP4 são salvos.

---

## ⚡ 3. Fluxo de Automação Contínua

### Quando uma matéria é publicada:
1. O usuário publica a matéria pelo editor (`/admin/edit`) ou em lote na revisão (`/admin`).
2. O endpoint [`/api/admin/posts/publish`](file:///c:/Users/Gustavo/Documents/Projetos/OB/src/app/api/admin/posts/publish/route.ts) salva o post no Supabase e aciona `triggerReelGeneration(slug)`.
3. A requisição HTTP responde de imediato, sem travar o navegador.
4. O processo em background:
   - Pesquisa a notícia e analisa títulos, resumo e imagens editoriais;
   - Solicita ao **Gemini 2.5 Flash** a criação de um roteiro de 5 momentos + gancho + CTA;
   - Baixa e otimiza as imagens do post;
   - Sintetiza a narração via `edge-tts` (`pt-BR-AntonioNeural` a +6% de velocidade);
   - Mixa a voz com a trilha sonora e os efeitos sonoros via FFmpeg;
   - Renderiza a composição visual em 1080×1920 a 30 FPS com o HyperFrames;
   - Junta vídeo e áudio tratado em `public/reels/<slug>.mp4`;
   - Registra o status `"ready"` com duração e tamanho no manifesto `manifest.json`.

---

## 📱 4. Guia de Operação no Painel Admin

Ao entrar em **`/admin/reels`**:

### Barra de Filtros e Busca
- **Abas de Status:**
  - **Todos:** Visualiza todo o acervo de matérias.
  - **Prontos:** Apenas matérias com vídeo MP4 1080×1920 finalizado.
  - **Gerando:** Matérias que estão na fila de renderização (com polling em tempo real).
  - **Pendentes:** Notícias que ainda não possuem vídeo gerado.
- **Filtro de Categoria:** Filtrar por Plantão, Radar, Hard News, Gambiarra, Review ou Opinião.

### Card da Matéria
- **Se Pronto:**
  - Clique em **"Assistente Social"** para abrir o modal de distribuição.
  - Clique no ícone de download para baixar o `.mp4` diretamente no seu dispositivo.
- **Se Pendente ou Falhou:**
  - Clique em **"Gerar Reel com IA"** para disparar a criação com 1 toque.

### Modal do Assistente de Redes Sociais
- **Visualizador Vertical:** Player 9:16 nativo para conferir som e imagem antes de postar.
- **Aba Instagram Reels:** Botão *"Copiar Legenda"* com emojis, gancho, resumo, link da bio e hashtags recomendadas.
- **Aba TikTok:** Botão *"Copiar Texto TikTok"* com copy provocativa e tags de algoritmo For You.
- **Aba YouTube Shorts:** Botões separados para *"Copiar Título"* (< 100 chars) e *"Copiar Descrição"* (com links do portal).

---

## 🔌 5. Endpoints da API & Estrutura de Dados

### `GET /api/admin/reels`
Retorna a lista das matérias mais recentes com status do reel e copys prontas.

**Headers necessários:**
```http
Authorization: Bearer <SUPABASE_SESSION_TOKEN>
```

**Exemplo de Resposta (JSON):**
```json
{
  "items": [
    {
      "id": "74cb55ee-4429-40b5-899e-3c4686adae02",
      "slug": "crazy-taxi-world-tour-revela-mapa-inspirado-no-rio-em-bgs-2026",
      "title": "CRAZY TAXI: WORLD TOUR REVELA MAPA INSPIRADO NO RIO EM BGS 2026",
      "summary": "Novo trailer divulgado pela SEGA confirma circuito no Rio de Janeiro...",
      "category": "breaking",
      "image_url": "https://.../capa.webp",
      "is_published": true,
      "status": "ready",
      "video_url": "/reels/crazy-taxi-world-tour-revela-mapa-inspirado-no-rio-em-bgs-2026.mp4",
      "duration": 34.5,
      "file_size": 7833678,
      "copys": {
        "instagram": { "caption": "...", "hashtags": ["#orangebrick", "#games"] },
        "tiktok": { "caption": "...", "hashtags": ["#fyp", "#games"] },
        "youtube": { "title": "CRAZY TAXI NO RIO! #Shorts", "description": "..." }
      }
    }
  ]
}
```

### `POST /api/admin/reels`
Inicia ou reinicia a renderização de um vídeo para uma matéria.

**Body (JSON):**
```json
{
  "slug": "gta-6-chega-ao-pc-antes-do-previsto-primeiros-tres-meses-de-2027"
}
```

---

## 🚀 6. Opções de Expansão e Roadmap (Backlog)

Aqui estão 5 caminhos de evolução que podemos implementar a seguir:

---

### 🟢 Opção A: Envio Automático para o Telegram do Administrador (Mais Rápido e Prático)
- **O que faz:** Assim que o vídeo terminar de renderizar em background, o bot do Telegram envia o arquivo `.mp4` em alta resolução direto para o seu chat privado com as copys já formatadas.
- **Vantagem:** Você recebe o vídeo no celular instantaneamente após publicar a matéria e posta direto nos apps do Instagram, TikTok e YouTube sem precisar abrir o painel.
- **Complexidade:** Baixa (já possui integração base em `generate-reel.mjs`).

---

### 🔵 Opção B: Feed Vertical de Reels no Site Público (`/reels` estilo TikTok)
- **O que faz:** Cria uma nova página no portal público (`orangebrick.blog/reels`) com navegação vertical em tela cheia por scroll (swipe up/down), permitindo que os visitantes assistam aos vídeos das matérias dentro do site.
- **Vantagem:** Aumenta dramaticamente o tempo de retenção no site, gera engajamento e atrai tráfego mobile.
- **Complexidade:** Média.

---

### 🟣 Opção C: Integração com APIs Oficiais de Postagem Direta (Zero Ação Manual)
- **O que faz:** Publicação programática sem intervenção humana:
  - **YouTube Data API v3:** Envia o vídeo como Short público ou não-listado direto no canal.
  - **Instagram Graph API (Content Publishing):** Publica diretamente na conta profissional do Instagram.
  - **TikTok Content Posting API:** Envia como rascunho ou vídeo público.
- **Vantagem:** Publicação automática simultânea em todas as plataformas sem precisar abrir os apps.
- **Complexidade:** Alta (exige criação de apps de desenvolvedor no Google Cloud, Meta for Developers e TikTok for Developers).

---

### 🟡 Opção D: Múltiplas Vozes e Estilos Visuais com Seletor
- **O que faz:** Permite escolher entre vozes neurais masculinas e femininas (`pt-BR-AntonioNeural`, `pt-BR-FranciscaNeural`, `pt-BR-ThalitaNeural`) e estilos de motion graphics (Tema Padrão Orange, Estilo Retro Arcade 16-bit, Cyberpunk ou Breaking News Urgente).
- **Vantagem:** Variedade nos formatos para testar quais estilos performam melhor nas redes.
- **Complexidade:** Baixa/Média.

---

### 🟠 Opção E: Gerador Automático de Capas/Thumbnails 9:16
- **O que faz:** Gera um arquivo de imagem estática (`cover.jpg` em 1080×1920) com tipografia de alto clique, logo do Orange Brick e a cena principal para servir como miniatura nos vídeos do Instagram e YouTube.
- **Vantagem:** Melhora a taxa de clique (CTR) nas capas dos vídeos.
- **Complexidade:** Baixa.

---

## 💻 7. Comandos de Terminal Rápidos

```bash
# Gerar Reel para a última matéria cadastrada:
npm run reel:latest

# Gerar Reel para uma matéria específica via slug:
npm run reel:generate <slug-da-materia>

# Gerar notícia com IA e criar o Reel automaticamente:
npm run news:generate -- --with-reel

# Rodar verificação e build de produção:
npm run build
```

---

*Documentação mantida pela equipe Orange Brick. Para suporte ou alterações, utilize este PRD como guia de referência técnica.*
