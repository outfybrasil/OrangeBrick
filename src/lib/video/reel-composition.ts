import type { ReelScriptData } from "./reel-script.ts";
import { CATEGORY_CONFIG, type PostCategory } from "../types/database.ts";

export interface CompositionOptions {
  script: ReelScriptData;
  category: PostCategory;
  duration: number;
  sentences: Array<{ text: string; start: number; end: number; duration: number }>;
  imagePaths: string[]; // relative paths to images inside assets folder
}

export function generateCompositionHtml(options: CompositionOptions): string {
  const { script, category, duration, sentences, imagePaths } = options;
  const catConfig = CATEGORY_CONFIG[category] || { label: "Plantão", color: "#FF5E00" };
  const brandColor = catConfig.color;

  const coverImg = imagePaths[0] || "assets/cover.webp";
  const body1Img = imagePaths[1] || coverImg;
  const body2Img = imagePaths[2] || coverImg;

  // Dynamic scene calculation so every scene (especially CTA) always fits regardless of speech length
  const ctaDur = Math.max(Math.min(duration * 0.16, 6.5), 4.5);
  const contentTime = Math.max(duration - ctaDur, 15.0);
  const s1Dur = contentTime * 0.18;
  const s2Dur = contentTime * 0.22;
  const s3Dur = contentTime * 0.22;
  const s4Dur = contentTime * 0.20;
  const s5Dur = contentTime * 0.18;

  const t0 = 0;
  const t1 = Math.round(s1Dur * 10) / 10;
  const t2 = Math.round((t1 + s2Dur) * 10) / 10;
  const t3 = Math.round((t2 + s3Dur) * 10) / 10;
  const t4 = Math.round((t3 + s4Dur) * 10) / 10;
  const t5 = Math.round((t4 + s5Dur) * 10) / 10;

  const sceneDurations = [
    { id: "scene1", start: t0, dur: t1 - t0, img: coverImg },
    { id: "scene2", start: t1, dur: t2 - t1, img: body1Img },
    { id: "scene3", start: t2, dur: t3 - t2, img: coverImg },
    { id: "scene4", start: t3, dur: t4 - t3, img: body2Img },
    { id: "scene5", start: t4, dur: t5 - t4, img: body1Img },
    { id: "scene6", start: t5, dur: Math.max(duration - t5, 4.0), img: coverImg },
  ];

  const subtitlesJson = JSON.stringify(sentences);

  return `<!doctype html>
<html lang="pt-BR" data-resolution="portrait">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1080, height=1920" />
    <title>${script.headline} - Orange Brick</title>
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Anton&family=Outfit:wght@600;800;900&family=Space+Grotesk:wght@600;700;800&display=swap" rel="stylesheet">
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      :root {
        --brand-color: ${brandColor};
        --yellow: #FFD000;
        --bg-void: #07080c;
        --card-bg: #12141c;
      }
      html, body {
        width: 1080px; height: 1920px; overflow: hidden;
        background: var(--bg-void); color: #fff;
        font-family: 'Space Grotesk', sans-serif;
      }
      #root {
        width: 1080px; height: 1920px; position: relative; overflow: hidden;
        background: radial-gradient(circle at 50% 30%, #17130f 0%, #07080c 80%);
      }
      .bg-grid {
        position: absolute; inset: 0; background-size: 60px 60px;
        background-image: 
          linear-gradient(to right, rgba(255, 94, 0, 0.04) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(255, 94, 0, 0.04) 1px, transparent 1px);
        z-index: 1;
      }
      .header-bar {
        position: absolute; top: 80px; left: 60px; right: 60px; height: 80px;
        display: flex; align-items: center; justify-content: space-between; z-index: 50;
      }
      .brand-tag {
        display: flex; align-items: center; gap: 16px;
        background: rgba(18, 20, 28, 0.9); border: 2px solid rgba(255, 94, 0, 0.35);
        border-radius: 999px; padding: 12px 28px; backdrop-filter: blur(16px);
      }
      .brand-dot { width: 16px; height: 16px; border-radius: 50%; background: var(--brand-color); box-shadow: 0 0 16px var(--brand-color); }
      .brand-name { font-family: 'Outfit', sans-serif; font-weight: 900; font-size: 30px; letter-spacing: 0.08em; color: #fff; }
      .brand-name span { color: var(--brand-color); }
      .news-badge {
        background: var(--brand-color); color: #000; font-family: 'Anton', sans-serif;
        font-size: 28px; letter-spacing: 0.05em; padding: 10px 24px; border-radius: 999px; text-transform: uppercase;
      }
      .taxi-strip {
        position: absolute; left: 0; width: 1080px; height: 16px;
        background: repeating-linear-gradient(90deg, var(--yellow) 0px, var(--yellow) 24px, #000 24px, #000 48px);
        z-index: 40;
      }
      .taxi-strip.top { top: 0; }
      .taxi-strip.bottom { bottom: 0; }
      .scenes-container { position: absolute; inset: 0; z-index: 10; }
      .scene {
        position: absolute; inset: 0; opacity: 0; pointer-events: none;
        display: flex; flex-direction: column; align-items: center; justify-content: center;
        padding: 180px 60px 340px 60px;
      }
      .visual-card {
        width: 960px; height: 640px; border-radius: 36px; overflow: hidden; position: relative;
        box-shadow: 0 24px 80px rgba(0, 0, 0, 0.8), 0 0 0 3px rgba(255, 94, 0, 0.35);
        background: #000; margin-bottom: 50px;
      }
      .visual-card img { width: 100%; height: 100%; object-fit: cover; }
      .card-overlay { position: absolute; inset: 0; background: linear-gradient(180deg, transparent 40%, rgba(7, 8, 12, 0.95) 100%); }
      .card-label {
        position: absolute; bottom: 24px; left: 32px; font-family: 'Outfit', sans-serif;
        font-weight: 800; font-size: 26px; color: var(--yellow); text-transform: uppercase;
        letter-spacing: 0.05em; background: rgba(0,0,0,0.7); padding: 8px 20px; border-radius: 12px;
      }
      .big-headline {
        font-family: 'Anton', sans-serif; font-size: 96px; line-height: 1.05; text-align: center;
        text-transform: uppercase; letter-spacing: 0.02em; color: #fff; text-shadow: 0 8px 30px rgba(0,0,0,0.8);
      }
      .highlight-accent { color: var(--brand-color); }
      .highlight-yellow { color: var(--yellow); }
      .sub-badge {
        margin-top: 24px; display: inline-flex; align-items: center; gap: 14px;
        background: rgba(255, 255, 255, 0.08); border: 2px solid rgba(255, 255, 255, 0.15);
        padding: 16px 36px; border-radius: 24px; font-family: 'Outfit', sans-serif;
        font-weight: 800; font-size: 34px; color: #fff; backdrop-filter: blur(12px);
      }
      .feature-pills { display: flex; flex-wrap: wrap; gap: 20px; justify-content: center; margin-top: 36px; max-width: 940px; }
      .pill {
        background: #141724; border: 2px solid var(--brand-color); border-radius: 20px;
        padding: 18px 32px; font-size: 32px; font-weight: 800; color: #fff;
      }
      .cta-box {
        background: linear-gradient(135deg, rgba(255, 94, 0, 0.15) 0%, rgba(20, 23, 36, 0.9) 100%);
        border: 3px solid var(--brand-color); border-radius: 36px; padding: 48px;
        width: 940px; text-align: center; margin-top: 30px; box-shadow: 0 16px 60px rgba(255, 94, 0, 0.25);
      }
      .cta-btn {
        margin: 32px auto 0; background: var(--brand-color); color: #000;
        font-family: 'Outfit', sans-serif; font-weight: 900; font-size: 38px;
        padding: 22px 50px; border-radius: 999px; display: inline-flex; align-items: center; gap: 18px;
      }
      .caption-container {
        position: absolute; bottom: 150px; left: 60px; right: 60px; height: 160px;
        display: flex; align-items: center; justify-content: center; text-align: center;
        z-index: 60; pointer-events: none;
      }
      .caption-bubble {
        background: rgba(8, 10, 16, 0.9); border: 2px solid rgba(255, 208, 0, 0.4);
        border-radius: 24px; padding: 16px 40px; font-family: 'Outfit', sans-serif;
        font-weight: 800; font-size: 44px; line-height: 1.25; color: #ffffff;
        text-shadow: 0 2px 10px rgba(0,0,0,0.9); max-width: 960px; box-shadow: 0 16px 40px rgba(0,0,0,0.6);
        backdrop-filter: blur(12px);
      }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="${duration}" data-width="1080" data-height="1920">
      <div class="bg-grid"></div>
      <div class="taxi-strip top"></div>
      <div class="taxi-strip bottom"></div>

      <div class="header-bar">
        <div class="brand-tag">
          <div class="brand-dot"></div>
          <div class="brand-name">ORANGE<span>BRICK</span></div>
        </div>
        <div class="news-badge">${script.badge || catConfig.label}</div>
      </div>

      <div class="scenes-container">
        <!-- Scene 1: Hook -->
        <div id="scene1" class="scene clip" data-start="${sceneDurations[0].start}" data-duration="${sceneDurations[0].dur}">
          <div class="visual-card">
            <img src="${sceneDurations[0].img}" alt="Cover" />
            <div class="card-overlay"></div>
            <div class="card-label">${script.badge || "DESTAQUE"}</div>
          </div>
          <h1 class="big-headline">${script.headline}</h1>
          <div class="sub-badge">${script.subHeadline}</div>
        </div>

        <!-- Scene 2 -->
        <div id="scene2" class="scene clip" data-start="${sceneDurations[1].start}" data-duration="${sceneDurations[1].dur}">
          <div class="visual-card">
            <img src="${sceneDurations[1].img}" alt="Scene 2" />
            <div class="card-overlay"></div>
            <div class="card-label">${script.scenes[1]?.tag || "OFICIAL"}</div>
          </div>
          <h2 class="big-headline">${script.scenes[1]?.headline || script.headline}</h2>
          <div class="sub-badge highlight-accent">${script.scenes[1]?.highlight || ""}</div>
        </div>

        <!-- Scene 3 -->
        <div id="scene3" class="scene clip" data-start="${sceneDurations[2].start}" data-duration="${sceneDurations[2].dur}">
          <div class="visual-card">
            <img src="${sceneDurations[2].img}" alt="Scene 3" />
            <div class="card-overlay"></div>
            <div class="card-label">${script.scenes[2]?.tag || "DETALHES"}</div>
          </div>
          <h2 class="big-headline">${script.scenes[2]?.headline || ""}</h2>
          <div class="feature-pills">
            ${(script.scenes[2]?.pills || ["Destaque A", "Destaque B", "Destaque C"]).map(p => `<div class="pill">✨ ${p}</div>`).join("")}
          </div>
        </div>

        <!-- Scene 4 -->
        <div id="scene4" class="scene clip" data-start="${sceneDurations[3].start}" data-duration="${sceneDurations[3].dur}">
          <div class="visual-card">
            <img src="${sceneDurations[3].img}" alt="Scene 4" />
            <div class="card-overlay"></div>
            <div class="card-label">${script.scenes[3]?.tag || "ESPECIAL"}</div>
          </div>
          <h2 class="big-headline">${script.scenes[3]?.headline || ""}</h2>
          <div class="feature-pills">
            ${(script.scenes[3]?.pills || ["Novidade", "Recurso", "Jogabilidade"]).map(p => `<div class="pill">🎮 ${p}</div>`).join("")}
          </div>
        </div>

        <!-- Scene 5 -->
        <div id="scene5" class="scene clip" data-start="${sceneDurations[4].start}" data-duration="${sceneDurations[4].dur}">
          <div class="sub-badge highlight-yellow" style="margin-bottom: 24px;">
            🗓️ ${script.scenes[4]?.tag || "LANÇAMENTO"}
          </div>
          <h2 class="big-headline">${script.scenes[4]?.headline || "DISPONÍVEL EM BREVE"}</h2>
          <div class="feature-pills">
            ${(script.scenes[4]?.pills || ["PS5", "XBOX", "PC", "SWITCH"]).map(p => `<div class="pill">🕹️ ${p}</div>`).join("")}
          </div>
        </div>

        <!-- Scene 6: CTA -->
        <div id="scene6" class="scene clip" data-start="${sceneDurations[5].start}" data-duration="${sceneDurations[5].dur}">
          <div class="cta-box">
            <h2 class="big-headline" style="font-size: 78px;">
              ${script.ctaQuestion}
            </h2>
            <p style="font-size: 34px; color: #a1a1aa; margin-top: 20px;">
              💬 ${script.ctaAction}
            </p>
            <div class="cta-btn">
              <span>🟠 ${script.ctaButton || "SEGUIR @ORANGEBRICK"}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="caption-container">
        <div id="captionBox" class="caption-bubble">${script.hook}</div>
      </div>
    </div>

    <script>
      window.__timelines = window.__timelines || {};
      const tl = gsap.timeline({ paused: true });
      window.__timelines["main"] = tl;

      const subtitles = ${subtitlesJson};
      subtitles.forEach((s) => {
        tl.call(() => {
          const el = document.getElementById("captionBox");
          if (el) el.innerHTML = s.text;
        }, null, s.start);
      });

      // Animate Scenes
      tl.fromTo("#scene1", { opacity: 0, scale: 0.94 }, { opacity: 1, scale: 1, duration: 0.4 }, 0);
      tl.to("#scene1", { opacity: 0, duration: 0.35 }, ${sceneDurations[0].start + sceneDurations[0].dur - 0.35});

      tl.fromTo("#scene2", { opacity: 0, scale: 0.94 }, { opacity: 1, scale: 1, duration: 0.4 }, ${sceneDurations[1].start});
      tl.to("#scene2", { opacity: 0, duration: 0.35 }, ${sceneDurations[1].start + sceneDurations[1].dur - 0.35});

      tl.fromTo("#scene3", { opacity: 0, scale: 0.94 }, { opacity: 1, scale: 1, duration: 0.4 }, ${sceneDurations[2].start});
      tl.to("#scene3", { opacity: 0, duration: 0.35 }, ${sceneDurations[2].start + sceneDurations[2].dur - 0.35});

      tl.fromTo("#scene4", { opacity: 0, scale: 0.94 }, { opacity: 1, scale: 1, duration: 0.4 }, ${sceneDurations[3].start});
      tl.to("#scene4", { opacity: 0, duration: 0.35 }, ${sceneDurations[3].start + sceneDurations[3].dur - 0.35});

      tl.fromTo("#scene5", { opacity: 0, scale: 0.94 }, { opacity: 1, scale: 1, duration: 0.4 }, ${sceneDurations[4].start});
      tl.to("#scene5", { opacity: 0, duration: 0.35 }, ${sceneDurations[4].start + sceneDurations[4].dur - 0.35});

      tl.fromTo("#scene6", { opacity: 0, scale: 0.9 }, { opacity: 1, scale: 1, duration: 0.5, ease: "back.out(1.5)" }, ${sceneDurations[5].start});
      tl.fromTo(".cta-btn", { scale: 0.92 }, { scale: 1.05, repeat: 6, yoyo: true, duration: 0.8 }, ${sceneDurations[5].start + 0.4});

      tl.seek(0);
    </script>
  </body>
</html>`;
}
