# 🎬 Automação de Vídeos Curtos (Reels / TikTok / Shorts) — Orange Brick

Este módulo permite transformar automaticamente qualquer matéria publicada ou rascunho do Orange Brick em um **vídeo vertical 1080×1920**, com motion graphics no padrão HyperFrames + GSAP, narração em português por IA (TTS), trilha sonora adaptativa, efeitos sonoros (SFX) e legendas sincronizadas.

---

## ⚡ Comandos Rápidos

### 1. Gerar Reel para uma matéria específica:
```bash
npm run reel:generate <slug-ou-id-da-materia>
```
*Exemplo:*
```bash
npm run reel:generate crazy-taxi-world-tour-revela-mapa-inspirado-no-rio-em-bgs-2026
```

### 2. Gerar Reel para a última matéria cadastrada:
```bash
npm run reel:latest
```

### 3. Gerar Notícia + Reel automaticamente:
```bash
npm run news:generate -- --with-reel
```
Ao adicionar `--with-reel`, o Orange Brick pesquisa/redige a notícia com Gemini, salva no Supabase e imediatamente cria e renderiza o vídeo do Reel.

---

## 🏗️ Como o Pipeline Funciona

1. **Roteiro e Destaques (Gemini 3.8 / 2.5 Flash):**
   - O módulo `src/lib/video/reel-script.ts` analisa o título, resumo, categoria e imagens do post no Supabase.
   - Gera um roteiro dinâmico de 30 a 45 segundos com:
     - **Hook:** Frase inicial de impacto;
     - **Cenas:** 5 transições visuais com títulos, badges e pills;
     - **CTA:** Pergunta provocativa para comentários + botão para seguir o perfil.

2. **Narração Neural (edge-tts):**
   - O script `src/lib/video/reel-tts.py` usa a voz `pt-BR-AntonioNeural` (acelerada a +6% para ritmo de redes sociais).
   - Extrai as durações e timestamps exatos de cada frase e palavra.

3. **Sound Design & Mixagem (FFmpeg):**
   - O script `src/lib/video/reel-mixer.py` combina a voz tratada com a trilha sonora de fundo (`assets/reels/audio/bgm.mp3`).
   - Aplica *ducking* automático (−18 dB enquanto a voz fala) e insere efeitos sonoros sincronizados (`impact.wav`, `whoosh.wav`, `coin.wav`, `powerup.wav`).

4. **Composição Visual (HyperFrames + GSAP):**
   - Renderiza a composição em HTML5 Canvas/GSAP em **1080×1920 (30 fps)**.
   - Aplica a identidade visual da categoria da matéria (`#FF5E00`, `#6EA8D8`, etc.), cartões dinâmicos com as imagens reais da matéria e legendas cinéticas na margem segura.

5. **Entrega Final:**
   - Salva o vídeo final em: `public/reels/<slug>.mp4`.
   - Pode ser servido diretamente no site em `https://orangebrick.blog/reels/<slug>.mp4`.
   - Pode ser enviado automaticamente para o Telegram do administrador adicionando a flag `--telegram`.

---

## 📁 Estrutura de Arquivos Criados

- `scripts/generate-reel.mjs`: Script CLI principal.
- `src/lib/video/reel-script.ts`: Integração com Gemini para roteirização.
- `src/lib/video/reel-composition.ts`: Gerador de templates visuais HTML/GSAP.
- `src/lib/video/reel-tts.py`: Síntese de voz e sincronia de legendas.
- `src/lib/video/reel-mixer.py`: Mixagem de áudio, trilha e efeitos sonoros.
- `assets/reels/audio/`: Banco de efeitos sonoros e trilhas.
- `public/reels/`: Diretório de saída dos vídeos prontos em MP4.
