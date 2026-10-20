import type { ReelScriptData } from "./reel-script.ts";
import { CATEGORY_CONFIG, type PostCategory } from "../types/database.ts";

export type ReelVisualStyle = "cinema" | "ruptura" | "game" | "manchete" | "neon_minimal";

export const REEL_VISUAL_STYLES: ReelVisualStyle[] = [
  "cinema",
  "ruptura",
  "game",
  "manchete",
  "neon_minimal"
];

export interface CompositionOptions {
  script: ReelScriptData;
  category: PostCategory;
  duration: number;
  variation?: number;
  style?: ReelVisualStyle | "random";
  sentences: Array<{ text: string; start: number; end: number; duration: number }>;
  imagePaths: string[];
}

export function getReelSceneStarts(duration: number, variation = 0): number[] {
  const profiles = [
    [0.18, 0.22, 0.22, 0.20, 0.18],
    [0.16, 0.24, 0.20, 0.22, 0.18],
    [0.20, 0.20, 0.24, 0.18, 0.18],
    [0.17, 0.23, 0.21, 0.23, 0.16],
  ];
  const weights = profiles[Math.abs(variation) % profiles.length];
  const contentTime = duration - Math.min(Math.max(duration * 0.16, 4.5), duration * 0.3, 6.5);
  const starts = [0];
  for (const weight of weights) {
    starts.push(Math.round((starts[starts.length - 1] + contentTime * weight) * 10) / 10);
  }
  return starts;
}

export function resolveVisualStyle(variation: number, requestedStyle?: ReelVisualStyle | "random"): ReelVisualStyle {
  if (requestedStyle && requestedStyle !== "random" && REEL_VISUAL_STYLES.includes(requestedStyle)) {
    return requestedStyle;
  }
  return REEL_VISUAL_STYLES[Math.abs(variation) % REEL_VISUAL_STYLES.length];
}

interface StyleConfig {
  name: string;
  badgeLabel: string;
  css: string;
  extraHtml: string;
  captionClass: string;
  transitionType: string;
}

function getStyleConfig(style: ReelVisualStyle, brandColor: string): StyleConfig {
  switch (style) {
    case "cinema":
      return {
        name: "Cinema",
        badgeLabel: "CINEMATIC DIRECT",
        css: `
          :root {
            --bg-void: #050608;
            --accent: #E5A93C;
            --card-border: rgba(229, 169, 60, 0.4);
            --font-head: 'Playfair Display', serif;
          }
          #root {
            background: radial-gradient(circle at 50% 40%, #15120c 0%, #050608 85%);
          }
          .cinema-bar {
            position: absolute; left: 0; width: 1080px; height: 90px;
            background: #000; z-index: 55;
          }
          .cinema-bar.top { top: 0; border-bottom: 2px solid rgba(229, 169, 60, 0.3); }
          .cinema-bar.bottom { bottom: 0; border-top: 2px solid rgba(229, 169, 60, 0.3); }
          .visual-card {
            border-radius: 20px; box-shadow: 0 30px 100px rgba(0,0,0,0.9), 0 0 0 2px var(--card-border);
          }
          .big-headline {
            font-family: 'Outfit', sans-serif; font-weight: 900; letter-spacing: -0.02em;
          }
          .caption-bubble {
            background: rgba(5, 6, 8, 0.92); border: 2px solid rgba(229, 169, 60, 0.5);
            color: #fff; box-shadow: 0 20px 60px rgba(0,0,0,0.8);
          }
        `,
        extraHtml: `
          <div class="cinema-bar top"></div>
          <div class="cinema-bar bottom"></div>
        `,
        captionClass: "caption-bubble-cinema",
        transitionType: "smooth_zoom",
      };

    case "ruptura":
      return {
        name: "Ruptura",
        badgeLabel: "SYS.BREAKING // 4K",
        css: `
          :root {
            --bg-void: #07090e;
            --accent: #00FFCC;
            --card-border: #FF5E00;
            --font-head: 'Anton', sans-serif;
          }
          #root {
            background: linear-gradient(180deg, #0b0e17 0%, #05060a 100%);
          }
          .cyber-grid {
            position: absolute; inset: 0; background-size: 40px 40px;
            background-image: 
              linear-gradient(to right, rgba(0, 255, 204, 0.05) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(255, 94, 0, 0.05) 1px, transparent 1px);
            z-index: 2;
          }
          .neon-bracket {
            position: absolute; width: 60px; height: 60px; z-index: 52;
            border-color: #00FFCC; border-style: solid;
          }
          .neon-bracket.tl { top: 70px; left: 50px; border-width: 4px 0 0 4px; }
          .neon-bracket.tr { top: 70px; right: 50px; border-width: 4px 4px 0 0; }
          .neon-bracket.bl { bottom: 70px; left: 50px; border-width: 0 0 4px 4px; }
          .neon-bracket.br { bottom: 70px; right: 50px; border-width: 0 4px 4px 0; }
          .visual-card {
            border-radius: 8px; box-shadow: 0 0 40px rgba(255, 94, 0, 0.35), 0 0 0 3px #FF5E00;
          }
          .big-headline {
            font-family: 'Anton', sans-serif; text-transform: uppercase; letter-spacing: 0.03em;
          }
          .caption-bubble {
            background: #090c14; border: 3px solid #00FFCC; color: #fff;
            border-radius: 8px; box-shadow: 0 0 30px rgba(0, 255, 204, 0.3);
          }
        `,
        extraHtml: `
          <div class="cyber-grid"></div>
          <div class="neon-bracket tl"></div>
          <div class="neon-bracket tr"></div>
          <div class="neon-bracket bl"></div>
          <div class="neon-bracket br"></div>
        `,
        captionClass: "caption-bubble-ruptura",
        transitionType: "kinetic_snap",
      };

    case "game":
      return {
        name: "Retro Game",
        badgeLabel: "QUEST // LVL 99",
        css: `
          :root {
            --bg-void: #090514;
            --accent: #FF007F;
            --card-border: #00E5FF;
            --font-head: 'Outfit', sans-serif;
          }
          #root {
            background: radial-gradient(circle at 50% 50%, #1a0933 0%, #090514 90%);
          }
          .scanlines {
            position: absolute; inset: 0; pointer-events: none; z-index: 54;
            background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%);
            background-size: 100% 6px;
          }
          .visual-card {
            border-radius: 28px; box-shadow: 0 0 50px rgba(0, 229, 255, 0.3), 0 0 0 4px #00E5FF;
          }
          .big-headline {
            font-family: 'Outfit', sans-serif; font-weight: 900;
          }
          .caption-bubble {
            background: #110724; border: 3px solid #FF007F; color: #fff;
            border-radius: 20px; box-shadow: 0 0 40px rgba(255, 0, 127, 0.4);
          }
        `,
        extraHtml: `
          <div class="scanlines"></div>
        `,
        captionClass: "caption-bubble-game",
        transitionType: "pixel_pop",
      };

    case "manchete":
      return {
        name: "Manchete TV",
        badgeLabel: "AO VIVO • PLANTÃO",
        css: `
          :root {
            --bg-void: #08090d;
            --accent: #FF3B30;
            --card-border: rgba(255, 255, 255, 0.2);
            --font-head: 'Anton', sans-serif;
          }
          #root {
            background: #08090d;
          }
          .broadcast-strip {
            position: absolute; top: 0; left: 0; width: 1080px; height: 18px;
            background: #FF3B30; z-index: 55;
          }
          .visual-card {
            border-radius: 16px; box-shadow: 0 20px 80px rgba(0,0,0,0.9), 0 0 0 2px rgba(255,255,255,0.25);
          }
          .big-headline {
            font-family: 'Anton', sans-serif; letter-spacing: 0.02em;
          }
          .caption-bubble {
            background: #000; border: 2px solid #fff; color: #fff;
            border-radius: 12px; box-shadow: 0 16px 50px rgba(0,0,0,0.8);
          }
        `,
        extraHtml: `
          <div class="broadcast-strip"></div>
        `,
        captionClass: "caption-bubble-manchete",
        transitionType: "slide_up",
      };

    case "neon_minimal":
    default:
      return {
        name: "Neon Minimal",
        badgeLabel: "RADAR // EXCLUSIVO",
        css: `
          :root {
            --bg-void: #06070a;
            --accent: ${brandColor};
            --card-border: rgba(255, 255, 255, 0.15);
            --font-head: 'Outfit', sans-serif;
          }
          #root {
            background: #06070a;
          }
          .ambient-orb {
            position: absolute; width: 800px; height: 800px; border-radius: 50%;
            filter: blur(120px); pointer-events: none; opacity: 0.25; z-index: 2;
          }
          .ambient-orb.one { top: -200px; left: -200px; background: ${brandColor}; }
          .ambient-orb.two { bottom: -200px; right: -200px; background: #6366f1; }
          .visual-card {
            border-radius: 40px; box-shadow: 0 30px 100px rgba(0,0,0,0.9), 0 0 0 1px rgba(255,255,255,0.15);
            backdrop-filter: blur(20px);
          }
          .big-headline {
            font-family: 'Outfit', sans-serif; font-weight: 900; letter-spacing: -0.03em;
          }
          .caption-bubble {
            background: rgba(18, 20, 29, 0.88); border: 1px solid rgba(255, 255, 255, 0.2);
            color: #fff; border-radius: 32px; backdrop-filter: blur(24px);
            box-shadow: 0 20px 60px rgba(0,0,0,0.7);
          }
        `,
        extraHtml: `
          <div class="ambient-orb one"></div>
          <div class="ambient-orb two"></div>
        `,
        captionClass: "caption-bubble-minimal",
        transitionType: "spring_float",
      };
  }
}

function escapeHtml(value: string) {
  const escapes: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;",
  };
  return value.replace(/[&<>"']/g, (character) => escapes[character]);
}

export function generateCompositionHtml(options: CompositionOptions): string {
  const { script, category, duration, sentences, imagePaths } = options;
  const catConfig = CATEGORY_CONFIG[category] || { label: "Plantão", color: "#FF5E00" };
  const brandColor = catConfig.color;

  const coverImg = imagePaths[0] || "assets/cover.webp";
  const body1Img = imagePaths[1] || coverImg;
  const body2Img = imagePaths[2] || coverImg;

  const variation = options.variation ?? 0;
  const visualStyle = resolveVisualStyle(variation, options.style);
  const styleConfig = getStyleConfig(visualStyle, brandColor);

  const [t0, t1, t2, t3, t4, t5] = getReelSceneStarts(duration, variation);

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
    <title>${escapeHtml(script.headline || script.hook || "Orange Brick")} - Orange Brick</title>
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Anton&family=Outfit:wght@600;800;900&family=Space+Grotesk:wght@600;700;800&family=Playfair+Display:ital,wght@0,900;1,700&display=swap" rel="stylesheet">
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body {
        width: 1080px; height: 1920px; overflow: hidden;
        background: #000; color: #fff;
        font-family: 'Space Grotesk', sans-serif;
      }
      #root {
        width: 1080px; height: 1920px; position: relative; overflow: hidden;
      }
      .header-bar {
        position: absolute; top: 90px; left: 60px; right: 60px; height: 80px;
        display: flex; align-items: center; justify-content: space-between; z-index: 50;
      }
      .brand-tag {
        display: flex; align-items: center; gap: 16px;
        background: rgba(18, 20, 28, 0.9); border: 2px solid rgba(255, 94, 0, 0.35);
        border-radius: 999px; padding: 12px 28px; backdrop-filter: blur(16px);
      }
      .brand-dot { width: 16px; height: 16px; border-radius: 50%; background: ${brandColor}; box-shadow: 0 0 16px ${brandColor}; }
      .brand-name { font-family: 'Outfit', sans-serif; font-weight: 900; font-size: 30px; letter-spacing: 0.08em; color: #fff; }
      .brand-name span { color: ${brandColor}; }
      .news-badge {
        background: ${brandColor}; color: #000; font-family: 'Anton', sans-serif;
        font-size: 26px; letter-spacing: 0.05em; padding: 10px 24px; border-radius: 999px; text-transform: uppercase;
      }
      .scenes-container { position: absolute; inset: 0; z-index: 10; }
      .scene {
        position: absolute; inset: 0; opacity: 0; pointer-events: none;
        display: flex; flex-direction: column; align-items: center; justify-content: center;
        padding: 180px 60px 380px 60px;
      }
      .visual-card {
        width: 960px; height: 640px; overflow: hidden; position: relative;
        background: #000; margin-bottom: 50px;
      }
      .visual-card img { width: 100%; height: 100%; object-fit: cover; }
      .card-overlay { position: absolute; inset: 0; background: linear-gradient(180deg, transparent 40%, rgba(7, 8, 12, 0.95) 100%); }
      .card-label {
        position: absolute; bottom: 24px; left: 32px; font-family: 'Outfit', sans-serif;
        font-weight: 800; font-size: 26px; color: #FFD000; text-transform: uppercase;
        letter-spacing: 0.05em; background: rgba(0,0,0,0.7); padding: 8px 20px; border-radius: 12px;
      }
      .big-headline {
        font-size: 92px; line-height: 1.05; text-align: center;
        color: #fff; text-shadow: 0 8px 30px rgba(0,0,0,0.8);
      }
      .highlight-accent { color: ${brandColor}; }
      .sub-badge {
        margin-top: 24px; display: inline-flex; align-items: center; gap: 14px;
        background: rgba(255, 255, 255, 0.08); border: 2px solid rgba(255, 255, 255, 0.15);
        padding: 16px 36px; border-radius: 24px; font-family: 'Outfit', sans-serif;
        font-weight: 800; font-size: 34px; color: #fff; backdrop-filter: blur(12px);
      }
      .feature-pills { display: flex; flex-wrap: wrap; gap: 20px; justify-content: center; margin-top: 36px; max-width: 940px; }
      .pill {
        background: #141724; border: 2px solid ${brandColor}; border-radius: 20px;
        padding: 18px 32px; font-size: 32px; font-weight: 800; color: #fff;
      }
      .cta-box {
        background: linear-gradient(135deg, rgba(255, 94, 0, 0.15) 0%, rgba(20, 23, 36, 0.9) 100%);
        border: 3px solid ${brandColor}; border-radius: 36px; padding: 48px;
        width: 940px; text-align: center; margin-top: 30px; box-shadow: 0 16px 60px rgba(255, 94, 0, 0.25);
      }
      .cta-btn {
        margin: 32px auto 0; background: ${brandColor}; color: #000;
        font-family: 'Outfit', sans-serif; font-weight: 900; font-size: 38px;
        padding: 22px 50px; border-radius: 999px; display: inline-flex; align-items: center; gap: 18px;
      }
      .caption-container {
        position: absolute; bottom: 300px; left: 100px; right: 180px; height: 170px;
        display: flex; align-items: center; justify-content: center; text-align: center;
        z-index: 60; pointer-events: none;
      }
      .caption-bubble {
        padding: 16px 28px; font-family: 'Outfit', sans-serif;
        font-weight: 800; font-size: 40px; line-height: 1.2;
        text-shadow: 0 2px 10px rgba(0,0,0,0.9); max-width: 800px;
        backdrop-filter: blur(12px);
      }
      ${styleConfig.css}
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="${duration}" data-width="1080" data-height="1920">
      ${styleConfig.extraHtml}

      <div class="header-bar">
        <div class="brand-tag">
          <div class="brand-dot"></div>
          <div class="brand-name">ORANGE<span>BRICK</span></div>
        </div>
        <div class="news-badge">${escapeHtml(script.badge || catConfig.label || styleConfig.badgeLabel)}</div>
      </div>

      <div class="scenes-container">
        <div id="scene1" class="scene clip" data-start="${sceneDurations[0].start}" data-duration="${sceneDurations[0].dur}">
          <div class="visual-card">
            <img src="${escapeHtml(sceneDurations[0].img)}" alt="Cover" />
            <div class="card-overlay"></div>
            <div class="card-label">${escapeHtml(script.scenes[0]?.tag || script.badge || catConfig.label)}</div>
          </div>
          <h1 class="big-headline">${escapeHtml(script.headline || script.hook || "")}</h1>
          <div class="sub-badge">${escapeHtml(script.subHeadline || "")}</div>
        </div>

        <div id="scene2" class="scene clip" data-start="${sceneDurations[1].start}" data-duration="${sceneDurations[1].dur}">
          <div class="visual-card">
            <img src="${escapeHtml(sceneDurations[1].img)}" alt="Scene 2" />
            <div class="card-overlay"></div>
            <div class="card-label">${escapeHtml(script.scenes[1]?.tag || "")}</div>
          </div>
          <h2 class="big-headline">${escapeHtml(script.scenes[1]?.headline || "")}</h2>
          <div class="sub-badge highlight-accent">${escapeHtml(script.scenes[1]?.highlight || "")}</div>
        </div>

        <div id="scene3" class="scene clip" data-start="${sceneDurations[2].start}" data-duration="${sceneDurations[2].dur}">
          <div class="visual-card">
            <img src="${escapeHtml(sceneDurations[2].img)}" alt="Scene 3" />
            <div class="card-overlay"></div>
            <div class="card-label">${escapeHtml(script.scenes[2]?.tag || "")}</div>
          </div>
          <h2 class="big-headline">${escapeHtml(script.scenes[2]?.headline || "")}</h2>
          <div class="feature-pills">
            ${(script.scenes[2]?.pills || []).map(p => `<div class="pill">✨ ${escapeHtml(p)}</div>`).join("")}
          </div>
        </div>

        <div id="scene4" class="scene clip" data-start="${sceneDurations[3].start}" data-duration="${sceneDurations[3].dur}">
          <div class="visual-card">
            <img src="${escapeHtml(sceneDurations[3].img)}" alt="Scene 4" />
            <div class="card-overlay"></div>
            <div class="card-label">${escapeHtml(script.scenes[3]?.tag || "")}</div>
          </div>
          <h2 class="big-headline">${escapeHtml(script.scenes[3]?.headline || "")}</h2>
          <div class="feature-pills">
            ${(script.scenes[3]?.pills || []).map(p => `<div class="pill">🎮 ${escapeHtml(p)}</div>`).join("")}
          </div>
        </div>

        <div id="scene5" class="scene clip" data-start="${sceneDurations[4].start}" data-duration="${sceneDurations[4].dur}">
          <div class="sub-badge highlight-accent" style="margin-bottom: 24px;">
            🗓️ ${escapeHtml(script.scenes[4]?.tag || "")}
          </div>
          <h2 class="big-headline">${escapeHtml(script.scenes[4]?.headline || "")}</h2>
          <div class="feature-pills">
            ${(script.scenes[4]?.pills || []).map(p => `<div class="pill">🕹️ ${escapeHtml(p)}</div>`).join("")}
          </div>
        </div>

        <div id="scene6" class="scene clip" data-start="${sceneDurations[5].start}" data-duration="${sceneDurations[5].dur}">
          <div class="cta-box">
            <h2 class="big-headline" style="font-size: 78px;">
              ${escapeHtml(script.ctaQuestion || "O que você acha?")}
            </h2>
            <p style="font-size: 34px; color: #a1a1aa; margin-top: 20px;">
              💬 ${escapeHtml(script.ctaAction || "Comente sua resposta para continuar a conversa")}
            </p>
            <div class="cta-btn">
              <span>🟠 ${escapeHtml(script.ctaButton || "COMENTE ABAIXO")}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="caption-container">
        <div id="captionBox" class="caption-bubble ${styleConfig.captionClass}">${escapeHtml(script.hook || script.headline || "")}</div>
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
          if (el) el.textContent = s.text;
        }, null, s.start);
      });

      const scenes = ${JSON.stringify(sceneDurations)};
      const variation = ${variation};
      const entries = [
        { x: 0, y: 36, scale: 1 },
        { x: 38, y: 0, scale: 1 },
        { x: -38, y: 0, scale: 1 },
        { x: 0, y: 0, scale: 0.96 },
      ];
      scenes.forEach((scene, index) => {
        const selector = "#" + scene.id;
        const entry = entries[(variation + index) % entries.length];
        const transition = Math.min((index === 0 ? 0.16 : 0.24) + (variation % 3) * 0.035, scene.dur / 4);
        tl.fromTo(selector, { opacity: index === 0 ? 0.55 : 0 }, { opacity: 1, duration: transition }, scene.start);
        tl.fromTo(selector + " > *", entry, {
          x: 0, y: 0, scale: 1, duration: transition, ease: "power2.out",
        }, scene.start);
        if (index < scenes.length - 1) {
          tl.to(selector, { opacity: 0, duration: transition }, scene.start + scene.dur - transition);
        }
        if (index < 4) {
          const direction = (variation + index) % 2 ? 1 : -1;
          tl.fromTo(selector + " img", {
            scale: direction === 1 ? 1.02 : 1.10, xPercent: -direction,
          }, {
            scale: direction === 1 ? 1.10 : 1.02, xPercent: direction,
            duration: scene.dur, ease: "none",
          }, scene.start);
        }
      });
      tl.fromTo(".cta-btn", { scale: 0.96 }, {
        scale: 1, duration: 0.6, ease: "power2.out",
      }, ${t5 + 0.4});

      tl.seek(0);
    </script>
  </body>
</html>`;
}
