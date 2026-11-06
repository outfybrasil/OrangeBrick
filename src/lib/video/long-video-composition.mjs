import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { once } from "node:events";
import { spawn, execFileSync } from "node:child_process";
import { chromium } from "playwright";
import sharp from "sharp";

const require = createRequire(import.meta.url);
export const LONG_SCENE_LAYOUTS = ["hero", "evidence", "image", "comparison", "process", "storage", "insert", "offline", "handoff", "quote", "takeaway", "cta", "metrics", "timeline", "bars", "footage"];

function escape(value = "") {
  return String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
}

export function resolveLongLayout(scene, previousLayout) {
  if (scene.layout && !LONG_SCENE_LAYOUTS.includes(scene.layout)) throw new Error(`Composição desconhecida: ${scene.layout}`);
  const layout = scene.layout || (scene.steps?.length ? "process" : "image");
  if (layout === "process" && previousLayout === "process") throw new Error("Demonstrações consecutivas precisam de composições diferentes.");
  return layout;
}

const consoleSvg = (label, extra = "") => `<svg class="console ${extra}" viewBox="0 0 720 400" role="img" aria-label="${escape(label)}"><rect x="90" y="60" width="540" height="285" rx="30" fill="#26221e" stroke="#9f9489" stroke-width="4"/><rect x="132" y="84" width="456" height="238" rx="12" fill="#0c0b0a"/><path d="M90 96H64Q30 96 30 132V275Q30 310 64 310H90M630 96H657Q690 96 690 132V275Q690 310 657 310H630" fill="#302a25" stroke="#9f9489" stroke-width="4"/><circle cx="65" cy="172" r="15" fill="#ff752f"/><circle cx="657" cy="239" r="15" fill="#ff752f"/><text x="360" y="215" text-anchor="middle" fill="#f8f3eb" font-size="32" font-family="Outfit">${escape(label)}</text></svg>`;
const cardSvg = `<svg viewBox="0 0 120 155" aria-hidden="true"><path d="M15 5H88L115 32V145H15Z" fill="#e74735"/><path d="M27 36H101V120H27Z" fill="#211a17"/><circle cx="60" cy="68" r="13" stroke="#fff5ea" stroke-width="7" fill="none"/><path d="M68 77L90 99M81 90L89 82" stroke="#fff5ea" stroke-width="7"/><path d="M29 134H94" stroke="#ddbb7c" stroke-width="9"/></svg>`;
const wifiSvg = `<svg viewBox="0 0 140 110" aria-hidden="true"><path d="M15 35Q70 -8 125 35M35 60Q70 31 105 60M55 84Q70 71 85 84" fill="none" stroke="currentColor" stroke-width="9" stroke-linecap="round"/><circle cx="70" cy="102" r="6" fill="currentColor"/></svg>`;

export function generateLongSceneHtml(scene, { mediaSrc = "", gsapSource = "", fonts = "", duration = 6 } = {}) {
  const layout = resolveLongLayout(scene);
  const headline = escape(scene.headline);
  const highlight = escape(scene.highlight || "");
  const source = escape(scene.evidenceSource || "Fonte na descrição");
  const nativeStyle = scene.nativeDisplay ? ` style="width:${Number(scene.nativeDisplay.width)}px;height:${Number(scene.nativeDisplay.height)}px;max-width:100%;max-height:100%"` : "";
  const image = `<img class="official-media" src="${mediaSrc}" alt="${escape(scene.imageCaption)}"${nativeStyle}/>`;
  const smallPrint = `<p class="diagram-note">ANIMAÇÃO EXPLICATIVA · SEM ESCALA</p>`;
  let body;
  if (layout === "metrics") {
    body = `<p class="eyebrow">${escape(scene.eyebrow || "DADOS CONFIRMADOS")}</p><h1 class="wide-heading">${headline}</h1><div class="metrics-grid">${(scene.metrics || []).map((metric) => `<div class="metric reveal"><span>${escape(metric.label)}</span><strong>${escape(metric.value)}</strong><p>${escape(metric.detail || "")}</p></div>`).join("")}</div><p class="scene-footer reveal">${highlight}</p>`;
  } else if (layout === "timeline") {
    body = `<p class="eyebrow">${escape(scene.eyebrow || "CALENDÁRIO CONFIRMADO")}</p><h1 class="wide-heading">${headline}</h1><div class="timeline-track draw"></div><div class="timeline-events">${(scene.events || []).map((event) => `<div class="timeline-event reveal"><i></i><strong>${escape(event.date)}</strong><p>${escape(event.label)}</p></div>`).join("")}</div><p class="scene-footer reveal">${highlight}</p>`;
  } else if (layout === "bars") {
    body = `<p class="eyebrow">${escape(scene.eyebrow || "SIMULAÇÃO EXPLICATIVA")}</p><h1 class="wide-heading">${headline}</h1><div class="bar-chart">${(scene.bars || []).map((bar) => `<div class="bar-row"><span>${escape(bar.label)}</span><div class="bar-track"><div class="bar-fill" style="width:${Math.max(0, Math.min(1, Number(bar.ratio))) * 100}%"></div></div><strong>${escape(bar.value)}</strong></div>`).join("")}</div><p class="scene-footer reveal">${highlight}</p>`;
  } else if (layout === "hero") {
    body = `<div class="hero-copy"><p class="eyebrow">${escape(scene.eyebrow || "EM FOCO")}</p><h1>${headline}</h1><p class="deck reveal">${highlight}</p><div class="underline draw"></div></div><div class="hero-media${scene.mediaWide ? " wide-media" : ""}">${image}<span class="product-tag reveal">${escape(scene.mediaLabel || "MATERIAL OFICIAL")}</span></div>`;
  } else if (layout === "evidence") {
    body = `<p class="eyebrow">OLHE A EMBALAGEM</p><h1 class="wide-heading">${headline}</h1><div class="evidence-media">${image}<div class="evidence-mark draw"></div></div><p class="evidence-caption reveal">${highlight}</p>`;
  } else if (layout === "process") {
    const labels = scene.steps || ["Internet", "Dados do jogo", "Console"];
    body = scene.processKind === "download" ? `<h1 class="wide-heading">${headline}</h1><div class="network-origin reveal"><div class="wifi">${wifiSvg}</div><p>${escape(labels[0])}</p></div><div class="data-route"><div class="route-line draw"></div><i class="packet packet-a"></i><i class="packet packet-b"></i><i class="packet packet-c"></i><span>${escape(labels[1])}</span></div><div class="network-destination">${consoleSvg(labels[2])}<div class="download-track"><div class="download-fill"></div></div></div>${smallPrint}<p class="scene-footer reveal">${highlight}</p>` : `<h1 class="wide-heading">${headline}</h1><div class="process-flow">${labels.map((label, index) => `<div class="process-word reveal"><span>0${index + 1}</span><h2>${escape(label)}</h2></div>${index < labels.length - 1 ? `<b class="flow-arrow reveal">→</b>` : ""}`).join("")}</div><p class="scene-footer reveal">${highlight}</p>`;
  } else if (layout === "storage") {
    body = `<h1 class="wide-heading">${headline}</h1><div class="storage-drive reveal"><svg viewBox="0 0 400 230"><rect x="10" y="20" width="380" height="180" rx="28" fill="#29231f" stroke="#9f9489" stroke-width="4"/><path d="M10 147H390" stroke="#9f9489" stroke-width="3"/><circle cx="332" cy="171" r="8" fill="#ff752f"/></svg><h2>Memória do console</h2><div class="stored-files"><b></b><b></b><b></b><b></b></div></div><span class="storage-or reveal">OU</span><div class="memory-card reveal"><svg viewBox="0 0 200 260"><path d="M25 10H145L180 48V245H25Z" fill="#f8f3eb"/><path d="M51 35V78M77 35V78M103 35V78M129 48V78" stroke="#b29152" stroke-width="13"/><text x="100" y="155" text-anchor="middle" font-family="Outfit" font-size="24" fill="#181310">microSD</text><text x="100" y="187" text-anchor="middle" font-family="Outfit" font-size="28" font-weight="800" fill="#181310">EXPRESS</text></svg></div>${smallPrint}<p class="scene-footer reveal">${highlight}</p>`;
  } else if (layout === "insert") {
    body = `<div class="insert-media">${image}<svg class="slot-marker" viewBox="0 0 200 200"><circle cx="100" cy="100" r="90" fill="none" stroke="#ff752f" stroke-width="7" pathLength="1"/></svg></div><div class="insert-copy"><p class="eyebrow">DEPOIS DO DOWNLOAD</p><h1>${headline}</h1><p class="deck reveal">${highlight}</p></div>`;
  } else if (layout === "offline") {
    body = `<div class="offline-copy"><p class="eyebrow">NÃO CONFUNDA</p><h1>${headline}</h1><p class="deck reveal">${highlight}</p></div><div class="offline-symbol reveal">${wifiSvg}<svg class="offline-slash" viewBox="0 0 140 110"><path d="M12 105L130 5" stroke="#ff752f" stroke-width="11" stroke-linecap="round" pathLength="1"/></svg></div><div class="required-card reveal">${cardSvg}<p>O cartão continua necessário.</p></div>${smallPrint}`;
  } else if (layout === "handoff") {
    body = `<h1 class="wide-heading">${headline}</h1><div class="console-left">${consoleSvg("Console A")}</div><div class="console-right">${consoleSvg("Console B")}</div><div class="travelling-card">${cardSvg}</div><div class="handoff-route draw"></div><div class="second-download reveal"><div class="wifi">${wifiSvg}</div><span>Novo download neste console</span></div>${smallPrint}<p class="scene-footer reveal">${highlight}</p>`;
  } else if (layout === "quote") {
    body = `<p class="eyebrow">${escape(scene.quoteAttribution || "FONTE DA APURAÇÃO")}</p><div class="statement"><span class="quote-line draw"></span><h1>${headline}</h1><p class="deck reveal">${highlight}</p></div><p class="statement-credit reveal">${source}</p>`;
  } else if (layout === "takeaway") {
    body = `<div class="decision-media">${image}</div><div class="decision-copy"><p class="eyebrow">A DECISÃO NA LOJA</p><h1>${headline}</h1><p class="deck reveal">${highlight}</p><div class="decision-check reveal"><span>✓</span> Confira antes de levar.</div></div>`;
  } else if (layout === "cta") {
    body = `<div class="cta-copy"><p class="eyebrow">O QUE MUDA PARA QUEM JOGA</p><h1>${headline}</h1><p class="deck reveal">${highlight}</p><div class="subscribe reveal">${escape(scene.action || "INSCREVA-SE NO CANAL")}<span>↗</span></div></div>${scene.brandSrc ? `<img class="brand-mark" src="${scene.brandSrc}" alt=""/>` : ""}`;
  } else if (layout === "comparison") {
    const labels = scene.steps || [];
    body = `<h1 class="wide-heading">${headline}</h1><div class="comparison-a reveal">${image}<h2>${escape(labels[0] || "")}</h2></div><div class="comparison-rule draw"></div><div class="comparison-b reveal"><p>${escape(labels[1] || scene.highlight || "")}</p></div>`;
  } else {
    body = `<div class="image-copy"><p class="eyebrow">${escape(scene.tag || "ENTENDA O CONTEXTO")}</p><h1>${headline}</h1><p class="deck reveal">${highlight}</p><div class="underline draw"></div></div><div class="image-media">${image}</div>`;
  }
  if (scene.newsVisual && layout === "metrics") body = `<div class="news-metrics-media">${image}</div>${body}`;
  else if (scene.newsVisual && ["timeline", "bars", "process", "quote"].includes(layout)) body = `<div class="news-backdrop">${image}</div>${body}`;
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"/><style>${fonts}
*{box-sizing:border-box}html,body{margin:0;width:1920px;height:1080px;overflow:hidden;background:#141210;color:#f8f3eb;font-family:Outfit,Arial,sans-serif}body{position:relative}header{position:absolute;left:96px;right:96px;top:68px;height:42px;display:flex;align-items:center;justify-content:space-between;z-index:20}header strong{font-size:26px;letter-spacing:2px}header strong:before{content:"";display:inline-block;width:9px;height:28px;margin-right:15px;background:#ff752f;vertical-align:middle}header span{font-size:20px;color:#bbae9f;letter-spacing:2px}.stage{position:absolute;inset:158px 96px 198px;overflow:hidden}.source{position:absolute;left:96px;bottom:160px;font-size:19px;color:#9f9489;max-width:1700px}.eyebrow{margin:0 0 26px;font-size:21px;letter-spacing:4px;color:#ff975c;font-weight:600}h1{font-size:84px;line-height:1.06;letter-spacing:-2px;margin:0;font-weight:800;overflow-wrap:break-word}h2{font-size:32px;font-weight:600}.deck{font-size:34px;line-height:1.35;color:#cdbfb0;margin:30px 0 0;max-width:720px}.wide-heading{max-width:1550px;font-size:76px}.hero-copy,.image-copy{position:absolute;left:0;top:50px;width:790px}.hero-media{position:absolute;right:105px;top:0;width:600px;height:700px;display:flex;justify-content:center}.official-media{display:block;max-width:100%;max-height:100%;object-fit:contain}.hero-media img{height:655px;width:auto}.hero-media.wide-media{width:850px;right:0}.product-tag{position:absolute;bottom:0;background:#f8f3eb;color:#211a17;padding:13px 22px;font-size:20px;letter-spacing:2px}.underline{margin-top:38px;height:5px;width:160px;background:#ff752f;transform-origin:left center}.evidence-media{position:absolute;top:250px;left:0;width:1728px;height:320px;display:flex;align-items:center;justify-content:center}.evidence-mark{position:absolute;inset:22px 15px;border:5px solid #ff752f;transform-origin:left center}.evidence-caption{position:absolute;left:0;bottom:20px;font-size:32px;color:#cdbfb0}.console{width:100%;height:auto}.network-origin{position:absolute;left:70px;top:260px;width:260px;text-align:center;font-size:32px}.wifi{width:150px;color:#ff975c;margin:auto}.data-route{position:absolute;left:400px;top:390px;width:490px}.route-line{height:3px;background:#766859;transform-origin:left center}.data-route span{display:block;text-align:center;font-size:29px;color:#cdbfb0;margin-top:24px}.packet{position:absolute;top:-9px;left:0;width:20px;height:20px;background:#ff752f;border-radius:3px;opacity:0}.network-destination{position:absolute;right:0;top:220px;width:750px}.download-track{position:absolute;left:145px;right:145px;top:265px;height:9px;background:#3a3027}.download-fill{height:100%;background:#ff752f;transform:scaleX(0);transform-origin:left}.scene-footer{position:absolute;left:0;bottom:0;font-size:32px;color:#cdbfb0;max-width:1650px}.diagram-note{position:absolute;left:0;bottom:82px;font-size:17px;letter-spacing:2px;color:#938677}.storage-drive{position:absolute;left:145px;top:250px;width:570px;text-align:center}.storage-drive svg{width:450px}.storage-or{position:absolute;left:870px;top:360px;font-size:34px;color:#938677}.memory-card{position:absolute;right:260px;top:245px;width:220px}.stored-files{position:absolute;left:170px;top:102px;display:flex;gap:9px}.stored-files b{display:block;width:35px;height:41px;background:#ff752f;opacity:0}.insert-media{position:absolute;left:0;top:180px;width:760px;height:440px;display:flex;align-items:center;justify-content:center}.insert-media img{width:712px;height:400px}.slot-marker{position:absolute;right:70px;top:155px;width:200px;height:200px}.slot-marker circle{stroke-dasharray:1;stroke-dashoffset:1}.insert-copy{position:absolute;right:0;top:100px;width:790px}.offline-copy{position:absolute;left:0;top:80px;width:900px}.offline-symbol{position:absolute;right:180px;top:50px;width:270px;color:#f8f3eb}.offline-symbol svg{width:100%}.offline-slash{position:absolute;inset:0}.offline-slash path{stroke-dasharray:1;stroke-dashoffset:1}.required-card{position:absolute;right:80px;top:380px;display:flex;align-items:center;gap:40px;font-size:29px;max-width:650px}.required-card svg{width:110px;flex-shrink:0}.console-left,.console-right{position:absolute;top:260px;width:650px}.console-left{left:0}.console-right{right:0}.travelling-card{position:absolute;left:410px;top:165px;width:100px;z-index:3}.handoff-route{position:absolute;left:570px;right:390px;top:235px;height:2px;background:#766859;transform-origin:left}.second-download{position:absolute;right:165px;top:520px;display:flex;align-items:center;gap:25px;font-size:27px}.second-download .wifi{width:75px}.statement{position:absolute;top:125px;left:130px;max-width:1430px;padding-left:70px}.statement h1{font-size:82px}.statement .deck{max-width:1320px}.quote-line{position:absolute;left:0;top:0;height:330px;width:5px;background:#ff752f;transform-origin:top}.statement-credit{position:absolute;left:200px;bottom:30px;font-size:25px;color:#a99a8a}.decision-media{position:absolute;left:100px;top:10px;width:460px;height:690px;display:flex;justify-content:center}.decision-media img{height:680px}.decision-copy{position:absolute;right:0;top:80px;width:960px}.decision-check{font-size:30px;margin-top:50px;color:#f8f3eb}.decision-check span{color:#ff975c;font-size:42px;margin-right:18px}.cta-copy{position:absolute;left:0;top:65px;width:1130px}.cta-copy h1{font-size:94px}.subscribe{display:inline-flex;align-items:center;gap:75px;background:#ff752f;color:#17120f;font-size:26px;font-weight:800;padding:23px 32px;margin-top:50px;border-radius:5px}.subscribe span{font-size:35px}.brick-mark{position:absolute;right:55px;top:180px;width:350px;display:grid;grid-template-columns:1fr 1fr;gap:16px}.brick-mark i{height:145px;background:#ff752f;border-radius:7px}.image-media{position:absolute;right:0;top:20px;width:850px;height:660px;display:flex;align-items:center;justify-content:center}.image-copy{width:760px}.comparison-a{position:absolute;left:0;top:200px;width:780px;height:430px}.comparison-a img{max-height:370px;margin:auto}.comparison-a h2{text-align:center}.comparison-rule{position:absolute;left:855px;top:220px;width:3px;height:400px;background:#766859;transform-origin:top}.comparison-b{position:absolute;right:0;top:280px;width:760px;font-size:52px;line-height:1.2}.process-flow{position:absolute;left:0;right:0;top:280px;display:flex;align-items:center;gap:36px}.process-word{flex:1;max-width:480px}.process-word span{font-size:24px;letter-spacing:3px;color:#ff975c}.process-word h2{font-size:53px;line-height:1.15}.flow-arrow{color:#ff752f;font-size:70px}.metrics-grid{position:absolute;left:0;right:0;top:270px;display:flex;gap:110px}.metric{flex:1;max-width:790px}.metric span{font-size:26px;letter-spacing:2px;color:#cdbfb0}.metric strong{display:block;font-size:130px;line-height:1.2;color:#ff975c;letter-spacing:-4px;margin:20px 0}.metric p{font-size:30px;color:#cdbfb0}.timeline-track{position:absolute;left:75px;right:75px;top:335px;height:4px;background:#665345;transform-origin:left}.timeline-events{position:absolute;left:0;right:0;top:300px;display:flex;justify-content:space-between;gap:50px}.timeline-event{width:430px}.timeline-event i{display:block;width:26px;height:26px;background:#ff752f;border-radius:50%;margin:24px 0 36px}.timeline-event strong{font-size:70px}.timeline-event p{font-size:32px;color:#cdbfb0}.bar-chart{position:absolute;left:0;right:0;top:250px}.bar-row{display:flex;align-items:center;gap:40px;margin-bottom:55px}.bar-row>span{width:220px;font-size:35px}.bar-track{flex:1;background:#30261f;height:52px}.bar-fill{background:#ff752f;height:100%;transform:scaleX(0);transform-origin:left}.bar-row strong{width:260px;font-size:42px;color:#ffb186}.brand-mark{position:absolute;right:75px;top:170px;width:320px;height:320px;object-fit:contain}.reveal{opacity:0}
.stage:has(.news-metrics-media){isolation:isolate}.news-metrics-media{position:absolute;right:0;top:135px;width:760px;height:470px;display:flex;align-items:center;justify-content:center}.news-metrics-media img{width:100%;height:100%;object-fit:cover}.stage:has(.news-metrics-media) .wide-heading,.stage:has(.news-metrics-media) .scene-footer{max-width:850px}.stage:has(.news-metrics-media) .metrics-grid{right:840px}.stage:has(.news-metrics-media) .metric strong{font-size:110px}.stage:has(.news-backdrop){isolation:isolate}.news-backdrop{position:absolute;right:0;top:0;width:1080px;height:100%;opacity:.35;z-index:-1;mask-image:linear-gradient(to right,transparent,black 38%)}.news-backdrop img{width:100%;height:100%;object-fit:cover}
</style></head><body><header data-fixed><strong>ORANGE BRICK</strong><span>${escape(scene.tag || "O QUE MUDA PARA QUEM JOGA")}</span></header><main class="stage" data-fixed data-layout="${layout}">${body}</main><div class="source" data-fixed>${source}</div><script>${gsapSource}</script><script>
(()=>{const tl=gsap.timeline({paused:true});
document.querySelectorAll('.reveal').forEach((element,index)=>tl.fromTo(element,{opacity:0,y:16},{opacity:1,y:0,duration:.55,ease:'power2.out',immediateRender:false},.2+index*.28));
document.querySelectorAll('.draw').forEach((element,index)=>tl.fromTo(element,{scaleX:0,opacity:0},{scaleX:1,opacity:1,duration:.75,ease:'power2.inOut',immediateRender:false},.65+index*.12));
if(document.querySelector('.download-fill'))tl.to('.download-fill',{scaleX:1,duration:2.6,ease:'power2.inOut'},1.2);
['a','b','c'].forEach((letter,index)=>{if(document.querySelector('.packet-'+letter)){tl.fromTo('.packet-'+letter,{x:0,opacity:0},{x:450,opacity:1,duration:1.25,ease:'power1.inOut',immediateRender:false},1+index*.45);tl.to('.packet-'+letter,{opacity:0,duration:.16},2.25+index*.45);}});
if(document.querySelector('.slot-marker circle'))tl.to('.slot-marker circle',{strokeDashoffset:0,duration:.8,ease:'power2.inOut'},.75);
if(document.querySelector('.offline-slash path'))tl.to('.offline-slash path',{strokeDashoffset:0,duration:.7,ease:'power2.inOut'},1);
if(document.querySelector('.travelling-card'))tl.to('.travelling-card',{x:700,duration:1.8,ease:'power2.inOut'},.7);
document.querySelectorAll('.stored-files b').forEach((element,index)=>tl.fromTo(element,{y:-28,opacity:0},{y:0,opacity:1,duration:.5,ease:'power2.out',immediateRender:false},.8+index*.18));
document.querySelectorAll('.bar-fill').forEach((element,index)=>tl.to(element,{scaleX:1,duration:1.1,ease:'power2.inOut'},.5+index*.3));
window.__sceneTimeline=tl;window.__sceneDuration=${Number(duration)};})();
</script></body></html>`;
}

export async function createLongMotionRenderer(root, ffmpeg) {
  const rendererSource = await fs.readFile(fileURLToPath(import.meta.url), "utf8");
  const gsapSource = await fs.readFile(require.resolve("gsap/dist/gsap.min.js"), "utf8");
  const regular = await fs.readFile(path.join(root, "packages/brasa-motion/assets/fonts/outfit-regular.ttf"));
  const bold = await fs.readFile(path.join(root, "packages/brasa-motion/assets/fonts/outfit-extrabold.ttf"));
  const fonts = `@font-face{font-family:Outfit;src:url(data:font/ttf;base64,${regular.toString("base64")});font-weight:400 600}@font-face{font-family:Outfit;src:url(data:font/ttf;base64,${bold.toString("base64")});font-weight:700 900}`;
  const browser = await chromium.launch({ headless: true, args: ["--disable-dev-shm-usage"] });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  await page.route("**/*", (route) => route.abort());
  const brandSrc = `data:image/png;base64,${(await fs.readFile(path.join(root, "public/logos/orange-brick-mark.png"))).toString("base64")}`;
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  return {
    async render(scene, duration, output) {
      const fingerprint = createHash("sha256").update(JSON.stringify({ scene, duration, rendererSource })).digest("hex");
      try {
        const cached = JSON.parse(await fs.readFile(`${output}.render.json`, "utf8"));
        if (cached.fingerprint === fingerprint && (await fs.stat(output)).size === cached.bytes) return cached;
      } catch {}
      if (scene.layout === "footage") {
        const start = Number(scene.videoStart || 0);
        if (!scene.videoLocalPath || !Number.isFinite(start) || start < 0 || start + duration > scene.videoDuration) throw new Error("Trecho oficial insuficiente para a cena narrada.");
        const overlayPath = `${output}.overlay.png`;
        const overlay = `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080"><rect x="70" y="52" width="1780" height="66" rx="5" fill="#141210" fill-opacity=".85"/><rect x="96" y="72" width="9" height="27" fill="#ff752f"/><text x="125" y="97" font-family="DejaVu Sans" font-size="24" font-weight="bold" fill="#fff6ed">ORANGE BRICK</text><text x="1820" y="96" text-anchor="end" font-family="DejaVu Sans" font-size="20" fill="#f4ded0">${escape(scene.tag || "MATERIAL OFICIAL · ROCKSTAR GAMES")}</text><rect x="70" y="825" width="1780" height="50" rx="4" fill="#141210" fill-opacity=".82"/><text x="96" y="857" font-family="DejaVu Sans" font-size="21" fill="#fff6ed">${escape(scene.evidenceSource || "Rockstar Games · trailer oficial")}</text></svg>`;
        await sharp(Buffer.from(overlay)).png().toFile(overlayPath);
        const frames = Math.round(duration * 30);
        execFileSync(ffmpeg, ["-y", "-ss", String(start), "-i", scene.videoLocalPath, "-i", overlayPath, "-filter_complex", "[0:v]scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30[footage];[footage][1:v]overlay=0:0:format=auto,format=yuv420p[out]", "-map", "[out]", "-frames:v", String(frames), "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-an", output], { stdio: "pipe", maxBuffer: 8 * 1024 * 1024 });
        execFileSync(ffmpeg, ["-y", "-ss", String(Math.min(1, duration / 2)), "-i", output, "-frames:v", "1", `${output}.jpg`], { stdio: "pipe" });
        const verification = { fingerprint, bytes: (await fs.stat(output)).size, layout: "footage", fps: 30, frames, camera: "fixed-viewport/native-footage", fixed_frame_verified: true, source: scene.videoUrl, source_start: start, source_audio: "muted" };
        await fs.writeFile(`${output}.render.json`, JSON.stringify(verification, null, 2));
        return verification;
      }
      let media = sharp(scene.localRawPath);
      if (scene.crop) media = media.extract(scene.crop);
      const mediaSrc = `data:image/png;base64,${(await media.png().toBuffer()).toString("base64")}`;
      const html = generateLongSceneHtml({ ...scene, brandSrc }, { mediaSrc, fonts, gsapSource, duration });
      await fs.writeFile(`${output}.html`, html);
      await page.goto("about:blank");
      await page.setContent(html, { waitUntil: "load" });
      await page.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].map((image) => image.decode())); });
      const fixedBoxes = await page.locator("[data-fixed]").evaluateAll((elements) => elements.map((element) => ({ x: element.getBoundingClientRect().x, y: element.getBoundingClientRect().y })));
      const frameCount = Math.round(duration * 30);
      const motionDuration = await page.evaluate(() => window.__sceneTimeline.duration());
      const animatedFrames = Math.min(frameCount, Math.max(1, Math.ceil((motionDuration + 0.1) * 30)));
      const encoder = spawn(ffmpeg, ["-y", "-f", "image2pipe", "-vcodec", "mjpeg", "-framerate", "30", "-i", "pipe:0", "-vf", `tpad=stop_mode=clone:stop_duration=${Math.max(0, (frameCount - animatedFrames) / 30)}`, "-frames:v", String(frameCount), "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-pix_fmt", "yuv420p", "-an", output], { stdio: ["pipe", "ignore", "pipe"] });
      let log = "";
      encoder.stderr.on("data", (chunk) => { log = (log + chunk.toString()).slice(-5000); });
      encoder.stdin.on("error", () => {});
      const completion = new Promise((resolve, reject) => { encoder.on("error", reject); encoder.on("close", (code) => code === 0 ? resolve() : reject(new Error(log))); });
      completion.catch(() => {});
      try {
        for (let frame = 0; frame < animatedFrames; frame++) {
          await page.evaluate((time) => { window.__sceneTimeline.seek(time, false); }, frame / 30);
          const buffer = await page.screenshot({ type: "jpeg", quality: 88, animations: "allow", timeout: 15000 });
          if (!encoder.stdin.write(buffer)) await once(encoder.stdin, "drain");
        }
        encoder.stdin.end();
        await completion;
        const endingBoxes = await page.locator("[data-fixed]").evaluateAll((elements) => elements.map((element) => ({ x: element.getBoundingClientRect().x, y: element.getBoundingClientRect().y })));
        if (JSON.stringify(fixedBoxes) !== JSON.stringify(endingBoxes)) throw new Error("O enquadramento fixo foi deslocado durante a animação.");
        const overflow = await page.locator("h1,.deck,.scene-footer").evaluateAll((elements) => elements.filter((element) => element.getBoundingClientRect().right > 1824 || element.getBoundingClientRect().bottom > 884).map((element) => element.textContent));
        if (overflow.length) throw new Error(`Texto fora da área de leitura: ${overflow.join(" / ")}`);
        if (errors.length) throw new Error(errors.join("; "));
        await page.screenshot({ path: `${output}.jpg`, type: "jpeg", quality: 90 });
        const verification = { fingerprint, bytes: (await fs.stat(output)).size, layout: resolveLongLayout(scene), fps: 30, frames: frameCount, animated_frames: animatedFrames, camera: "fixed", fixed_frame_verified: true };
        await fs.writeFile(`${output}.render.json`, JSON.stringify(verification, null, 2));
        return verification;
      } finally {
        if (encoder.exitCode === null) {
          encoder.stdin.destroy();
          encoder.kill("SIGKILL");
        }
      }
    },
    close: () => browser.close(),
  };
}
