const C = { dark: "#15110d", paper: "#f3ead6", ink: "#1b1712", yellow: "#ffd23f", red: "#e8402a", orange: "#ff7a2f", blue: "#2d5bd7", green: "#2eb85c" };

const filled = (value) => typeof value === "string" && value.trim().length > 0;

export function creatorFonts(anton, marker) {
  return `@font-face{font-family:Anton;src:url(data:font/ttf;base64,${anton.toString("base64")})}@font-face{font-family:Marker;src:url(data:font/ttf;base64,${marker.toString("base64")})}`;
}

function rich(text, escape) {
  return escape(text).replace(/==(.+?)==/g, '<mark>$1</mark>');
}

function hot(text, escape) {
  return escape(text).replace(/==(.+?)==/g, '<span class="hot">$1<svg class="ring" viewBox="0 0 400 140" preserveAspectRatio="none"><path class="ink-path" d="M20 75C30 25 160 8 260 14S395 40 388 78 300 132 190 130 12 118 20 75Z" pathLength="1"/></svg></span>');
}

const checkSvg = '<svg class="mark-icon" viewBox="0 0 100 100"><path class="ink-path ok" d="M12 55L40 82L90 16" pathLength="1"/></svg>';
const crossSvg = '<svg class="mark-icon" viewBox="0 0 100 100"><path class="ink-path no" d="M15 15L85 85M85 15L15 85" pathLength="1"/></svg>';
const arrowSvg = (cls) => `<svg class="hand-arrow ${cls}" viewBox="0 0 300 160"><path class="ink-path" d="M10 20C60 140 190 150 270 95M270 95L228 92M270 95L255 135" pathLength="1"/></svg>`;

export function generateCreatorSceneHtml(scene, layout, { image, mediaSrc, fonts, gsapSource, duration, identity, captions, helpers }) {
  const { escape, revealTimes, countMarkup, captionMarkup, captionCss } = helpers;
  const paper = Boolean(scene.paper);
  const ink = paper ? C.ink : "#ffffff";
  const accent = paper ? C.blue : C.yellow;
  const tilt = Number(scene.tilt ?? (paper ? -2.5 : 2.5));
  const polaroid = (cls = "") => `<figure class="polaroid reveal ${cls}" style="--r:${tilt}deg"><i class="tape t1"></i><i class="tape t2"></i><img src="${mediaSrc}" alt="${escape(scene.imageCaption)}"/>${filled(scene.mediaLabel) ? `<figcaption>${escape(scene.mediaLabel)}</figcaption>` : ""}</figure>`;
  const hand = (text, cls = "") => filled(text) ? `<p class="hand reveal ${cls}">${escape(text)}</p>` : "";
  const sticker = (text, cls = "") => filled(text) ? `<div class="sticker reveal ${cls}">${escape(text)}</div>` : "";
  const stamp = (text, cls = "") => filled(text) ? `<div class="stamp ${cls}">${escape(text)}</div>` : "";
  const deck = filled(scene.highlight) ? `<p class="deck reveal">${rich(scene.highlight, escape)}</p>` : "";
  const h1 = (cls = "") => `<h1 class="${cls}">${hot(scene.headline, escape)}</h1>`;
  let body;
  if (layout === "hero") {
    body = `${polaroid("hero-photo")}<div class="hero-copy">${hand(scene.eyebrow)}${h1("mega")}${deck}</div>${sticker(scene.note, "hero-note")}`;
  } else if (layout === "image") {
    body = `${polaroid("left-photo")}<div class="side-copy">${hand(scene.eyebrow)}${h1()}${deck}</div>${filled(scene.note) ? `<div class="pointer reveal">${arrowSvg("to-left")}<span>${escape(scene.note)}</span></div>` : ""}`;
  } else if (layout === "evidence") {
    body = `<div class="top-copy">${hand(scene.eyebrow)}${h1()}</div>${polaroid("right-photo")}${stamp(scene.stamp, "photo-stamp")}<div class="note-card reveal">${rich(scene.highlight || "", escape)}</div>`;
  } else if (layout === "metrics") {
    const metrics = scene.metrics || [];
    body = metrics.length > 1
      ? `<div class="top-copy">${hand(scene.eyebrow)}${h1("small")}</div><div class="cards">${metrics.map((metric, index) => `<div class="index-card reveal" style="--r:${index % 2 ? 2 : -2}deg"><span>${escape(metric.label)}</span><strong>${countMarkup(metric.value)}</strong><p>${escape(metric.detail || "")}</p></div>${index < metrics.length - 1 ? `<b class="vs reveal">→</b>` : ""}`).join("")}</div>${deck ? `<div class="bottom-deck">${deck}</div>` : ""}`
      : `${hand(scene.eyebrow, "metric-hand")}<div class="giant reveal">${countMarkup(metrics[0]?.value || "")}</div>${sticker(metrics[0]?.detail, "giant-note")}<p class="giant-label reveal">${escape(metrics[0]?.label || "")}</p><div class="metric-copy">${h1("small")}${deck}</div>`;
  } else if (layout === "timeline") {
    body = `<div class="top-copy">${hand(scene.eyebrow)}${h1("small")}</div><svg class="wave" viewBox="0 0 1500 120" preserveAspectRatio="none"><path class="ink-path" d="M10 70C200 20 330 110 520 60S860 20 1040 70 1340 100 1490 50" pathLength="1"/></svg><div class="posts">${(scene.events || []).map((event, index) => `<div class="post-it reveal" style="--r:${index % 2 ? 3 : -3}deg"><i class="pin"></i><strong>${escape(event.date)}</strong><span>${escape(event.label)}</span></div>`).join("")}</div>${deck ? `<div class="bottom-deck">${deck}</div>` : ""}`;
  } else if (layout === "comparison") {
    const [a, b] = scene.steps || [];
    body = `<div class="top-copy">${hand(scene.eyebrow)}${h1("small")}</div><div class="cards"><div class="index-card wide reveal" style="--r:-2.5deg"><strong class="txt">${escape(a || "")}</strong></div><b class="vs hand-vs reveal">vs</b><div class="index-card wide reveal" style="--r:2deg"><strong class="txt">${escape(b || "")}</strong></div></div>${deck ? `<div class="bottom-deck">${deck}</div>` : ""}`;
  } else if (layout === "process") {
    const marks = scene.marks || [];
    body = `<div class="top-copy">${hand(scene.eyebrow)}${h1("small")}</div><ul class="checklist">${scene.steps.map((step, index) => `<li class="reveal"><span>${escape(step)}</span>${marks[index] === "no" ? crossSvg : checkSvg}</li>`).join("")}</ul>${filled(scene.highlight) ? `<div class="note-card low reveal">${rich(scene.highlight, escape)}</div>` : ""}`;
  } else if (layout === "handoff") {
    body = `<div class="top-copy">${hand(scene.eyebrow)}${h1("small")}</div><div class="chain">${scene.steps.map((step, index) => `<div class="post-it chain-it reveal" style="--r:${[-3, 2, -1.5][index]}deg${index === 2 ? ";background:" + C.orange : ""}"><strong class="txt">${escape(step)}</strong></div>${index < 2 ? arrowSvg("chain-arrow") : ""}`).join("")}</div>${stamp(scene.stamp, "chain-stamp")}${deck ? `<div class="bottom-deck">${deck}</div>` : ""}`;
  } else if (layout === "takeaway") {
    body = `${polaroid("left-photo small-photo")}<div class="side-copy">${hand(scene.eyebrow)}${h1()}${deck}</div>${stamp(scene.stamp, "side-stamp")}`;
  } else if (layout === "bars") {
    body = `<div class="top-copy">${hand(scene.eyebrow)}${h1("small")}</div><div class="marker-bars">${(scene.bars || []).map((bar) => `<div class="mbar reveal"><span>${escape(bar.label)}</span><div class="mtrack"><div class="mfill" style="width:${Math.max(0.04, Math.min(1, Number(bar.ratio))) * 100}%"></div></div><strong>${countMarkup(bar.value)}</strong></div>`).join("")}</div>`;
  } else if (layout === "quote") {
    body = `${hand(scene.quoteAttribution || scene.eyebrow)}<div class="quote-box">${h1("quote")}${deck}</div>`;
  } else if (layout === "cta") {
    body = `<div class="cta-wrap">${h1("mega center")}${hand(scene.highlight, "center")}<div class="subscribe reveal">${escape(scene.action || "SE INSCREVE NO OB LABS")} ↗</div></div>${identity.logoSrc ? `<img class="brand-logo reveal" src="${identity.logoSrc}" alt=""/>` : ""}`;
  } else {
    body = `${polaroid("left-photo")}<div class="side-copy">${hand(scene.eyebrow)}${h1()}${deck}</div>`;
  }
  const css = `${fonts}
*{box-sizing:border-box}html,body{margin:0;width:1920px;height:1080px;overflow:hidden;font-family:Outfit,Arial,sans-serif;color:${ink}}
body{position:relative;background:${paper ? `${C.paper}` : `radial-gradient(ellipse at 50% 40%,#2a2119 0%,${C.dark} 70%)`}}
${paper ? `body:before{content:"";position:absolute;inset:0;background:repeating-linear-gradient(to bottom,transparent 0 70px,rgba(70,110,170,.22) 70px 72px)}body:after{content:"";position:absolute;top:0;bottom:0;left:150px;width:3px;background:rgba(220,80,70,.45)}` : `body:before{content:"";position:absolute;inset:0;background:repeating-radial-gradient(circle at 30% 20%,rgba(255,255,255,.012) 0 2px,transparent 2px 5px)}`}
header{position:absolute;left:190px;right:96px;top:56px;height:52px;display:flex;align-items:center;justify-content:space-between;z-index:20}
.badge{background:${C.orange};color:#fff;font-family:Anton;font-size:24px;letter-spacing:2px;padding:6px 16px;transform:rotate(-2deg)}
.chap{font-family:Marker;font-size:30px;color:${paper ? "#7a6a58" : "#a79684"}}
.stage{position:absolute;inset:150px 110px 200px 200px}
.source{position:absolute;left:200px;bottom:156px;font-size:18px;letter-spacing:2px;color:${paper ? "#8a7a68" : "#8f8070"};font-weight:600;text-transform:uppercase}
h1{font-family:Anton;font-weight:400;text-transform:uppercase;font-size:104px;line-height:1.02;margin:0;letter-spacing:.5px;color:${ink}}
h1.mega{font-size:150px;line-height:.98}h1.small{font-size:84px}h1.center{text-align:center}h1.quote{font-size:96px}
.hot{position:relative;color:${paper ? C.ink : C.yellow};white-space:nowrap}
.ring{position:absolute;left:-6%;top:-12%;width:112%;height:124%;overflow:visible}
.ink-path{fill:none;stroke:${accent};stroke-width:7;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:1;stroke-dashoffset:1}
.ring .ink-path{stroke:${C.yellow};stroke-width:6}
.ok{stroke:${C.green};stroke-width:12}.no{stroke:${C.red};stroke-width:12}
.hand{font-family:Marker;color:${accent};font-size:44px;margin:0 0 22px;transform:rotate(-2.5deg);transform-origin:left}
.hand.center{text-align:center;transform:rotate(-1.5deg);transform-origin:center;margin-top:26px}
.deck{font-size:40px;line-height:1.38;font-weight:800;margin:32px 0 0;max-width:820px}
mark{background:linear-gradient(${C.yellow},${C.yellow}) no-repeat 0 60%/100% 78%;color:${C.ink};padding:0 6px}
.polaroid{position:absolute;margin:0;background:#fbf8f2;padding:20px 20px 74px;box-shadow:0 22px 50px rgba(0,0,0,.38);transform:rotate(var(--r))}
.polaroid img{display:block;width:100%;height:100%;object-fit:cover}
.polaroid figcaption{position:absolute;left:0;right:0;bottom:16px;text-align:center;font-family:Marker;font-size:30px;color:${C.ink}}
.tape{position:absolute;width:150px;height:44px;background:rgba(222,205,160,.82);top:-20px;z-index:2}.t1{left:-30px;transform:rotate(-24deg)}.t2{right:-30px;transform:rotate(22deg)}
.hero-photo{right:0;top:-20px;width:860px;height:600px}
.hero-copy{position:absolute;left:0;top:110px;width:820px}
.hero-note{right:120px;bottom:10px}
.left-photo{left:0;top:40px;width:820px;height:580px}.small-photo{width:640px;height:520px;top:60px}
.side-copy{position:absolute;right:0;top:70px;width:760px}
.top-copy{position:absolute;left:0;top:0;right:0}
.right-photo{right:20px;top:200px;width:820px;height:470px}
.photo-stamp{right:520px;top:520px}
.note-card{position:absolute;left:0;top:330px;width:740px;background:#fff;color:${C.ink};font-size:38px;line-height:1.35;font-weight:800;padding:30px 36px;box-shadow:0 14px 30px rgba(0,0,0,.25);transform:rotate(-1.5deg)}
.note-card.low{top:auto;bottom:10px;left:auto;right:0;width:660px}
.sticker{position:absolute;background:${C.yellow};color:${C.ink};font-family:Marker;font-size:40px;padding:16px 28px;box-shadow:0 10px 24px rgba(0,0,0,.3);transform:rotate(4deg)}
.stamp{position:absolute;z-index:9;border:9px solid ${C.red};color:${C.red};font-family:Anton;font-size:96px;line-height:1;padding:10px 30px;transform:rotate(-12deg);text-transform:uppercase;background:${paper ? "rgba(243,234,214,.6)" : "rgba(21,17,13,.55)"};z-index:5;opacity:0}
.side-stamp{right:30px;bottom:20px}.chain-stamp{right:40px;top:120px;font-size:70px}
.giant{position:absolute;left:0;top:70px;font-family:Anton;font-size:290px;white-space:nowrap;line-height:1;color:${ink};letter-spacing:-4px}
.giant .count{font:inherit;letter-spacing:inherit}
.metric-hand{position:absolute;left:0;top:0}
.giant-note{left:430px;top:450px}
.giant-label{position:absolute;left:8px;top:400px;margin:0;font-family:Anton;font-size:46px;color:${C.red};text-transform:uppercase}
.metric-copy{position:absolute;right:0;top:90px;width:560px}.metric-copy h1{font-size:72px}.metric-copy .deck{font-size:34px}
.cards{position:absolute;left:0;right:0;top:250px;display:flex;align-items:center;justify-content:center;gap:50px}
.index-card{background:#fff;color:${C.ink};padding:34px 44px;min-width:520px;box-shadow:0 18px 36px rgba(0,0,0,.3);transform:rotate(var(--r));text-align:center}
.index-card.wide{min-width:600px;max-width:680px}
.index-card span{font-size:28px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:#6d5f50}
.index-card strong{display:block;font-family:Anton;font-weight:400;font-size:150px;line-height:1.1;margin:8px 0}
.index-card strong.txt{font-size:66px;line-height:1.1}
.index-card strong .count{font:inherit}
.index-card p{font-size:28px;font-weight:600;margin:0;color:#6d5f50}
.vs{font-family:Anton;font-size:90px;color:${accent}}.hand-vs{font-family:Marker;font-weight:400;font-size:70px}
.bottom-deck{position:absolute;left:0;right:0;bottom:0}.bottom-deck .deck{max-width:1500px;font-size:36px}
.wave{position:absolute;left:0;right:0;top:330px;width:100%;height:120px}
.posts{position:absolute;left:60px;right:60px;top:250px;display:flex;justify-content:space-between}
.post-it{position:relative;width:420px;background:${C.yellow};color:${C.ink};padding:46px 30px 30px;box-shadow:0 14px 28px rgba(0,0,0,.3);transform:rotate(var(--r));text-align:center}
.post-it strong{display:block;font-family:Anton;font-weight:400;font-size:84px;line-height:1.05}
.post-it span{font-family:Marker;font-size:36px}
.pin{position:absolute;left:50%;top:12px;width:24px;height:24px;margin-left:-12px;border-radius:50%;background:${C.red};box-shadow:0 3px 6px rgba(0,0,0,.35)}
.checklist{position:absolute;left:0;top:220px;margin:0;padding:0;list-style:none;width:1150px}
.checklist li{display:flex;align-items:center;justify-content:space-between;font-size:76px;font-weight:900;padding:26px 0;border-bottom:3px dashed ${paper ? "rgba(27,23,18,.25)" : "rgba(255,255,255,.18)"}}
.mark-icon{width:96px;height:96px;flex-shrink:0;margin-left:40px}
.chain{position:absolute;left:0;right:0;top:250px;display:flex;align-items:center;justify-content:space-between}
.chain-it{width:420px;padding:44px 26px}.chain-it strong.txt{font-size:58px}
.chain-arrow{width:170px;height:100px}
.hand-arrow .ink-path{stroke:${accent}}
.pointer{position:absolute;left:760px;top:520px;display:flex;align-items:center;gap:10px}
.pointer svg{width:220px;height:120px;transform:scaleX(-1)}
.pointer span{font-family:Marker;font-size:38px;color:${accent};transform:rotate(-4deg)}
.marker-bars{position:absolute;left:0;right:0;top:250px}
.mbar{display:flex;align-items:center;gap:36px;margin-bottom:46px}.mbar>span{width:300px;font-family:Marker;font-size:40px}
.mtrack{flex:1;height:64px}.mfill{height:100%;background:${C.orange};border-radius:6px 30px 8px 24px;transform:scaleX(0);transform-origin:left}
.mbar strong{width:260px;font-family:Anton;font-weight:400;font-size:60px}
.quote-box{position:absolute;left:0;top:120px;right:80px}
.cta-wrap{position:absolute;left:0;right:0;top:120px;text-align:center}
.subscribe{display:inline-block;margin-top:46px;background:${C.orange};color:#fff;font-family:Anton;font-size:44px;padding:20px 40px;transform:rotate(-1.5deg);box-shadow:0 12px 26px rgba(0,0,0,.35)}
.brand-logo{position:absolute;right:20px;bottom:10px;width:150px}
.reveal{opacity:0}
${captionCss}
.caption span{background:${paper ? "rgba(27,23,18,.9)" : "rgba(6,9,17,.82)"}}`;
  const reveals = (body.match(/\breveal\b/g) || []).length;
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"/><style>${css}</style></head><body><header data-fixed><span class="badge">OB LABS</span><span class="chap">${escape(scene.chapterLabel || "")}</span></header><main class="stage" data-fixed data-layout="${layout}">${body}</main><div class="source" data-fixed>${escape(scene.evidenceSource || "")}</div>${captionMarkup(captions)}<script>${gsapSource}</script><script>
(()=>{const tl=gsap.timeline({paused:true});
const revealAt=${JSON.stringify(revealTimes(reveals, scene.beats || []))};
const fmt=(value,decimals,style)=>style==="dot"?value.toFixed(decimals):value.toLocaleString("pt-BR",{minimumFractionDigits:decimals,maximumFractionDigits:decimals});
document.querySelectorAll('.reveal').forEach((element,index)=>{
  const at=revealAt[index];
  if(element.classList.contains('polaroid'))tl.fromTo(element,{opacity:0,y:-70,rotation:'+=7'},{opacity:1,y:0,rotation:'-=7',duration:.7,ease:'back.out(1.4)',immediateRender:false},at);
  else if(element.classList.contains('sticker')||element.classList.contains('post-it')||element.classList.contains('index-card'))tl.fromTo(element,{opacity:0,scale:.6},{opacity:1,scale:1,duration:.5,ease:'back.out(2)',immediateRender:false},at);
  else tl.fromTo(element,{opacity:0,y:18},{opacity:1,y:0,duration:.5,ease:'power2.out',immediateRender:false},at);
  element.querySelectorAll('.ink-path').forEach(p=>tl.to(p,{strokeDashoffset:0,duration:.6,ease:'power2.inOut'},at+.3));
  element.querySelectorAll('mark').forEach((m,i)=>tl.fromTo(m,{backgroundSize:'0% 78%'},{backgroundSize:'100% 78%',duration:.6,ease:'power2.inOut',immediateRender:false},at+.45+i*.35));
  const fill=element.querySelector('.mfill');if(fill)tl.fromTo(fill,{scaleX:0},{scaleX:1,duration:1.1,ease:'power2.inOut',immediateRender:false},at);
  element.querySelectorAll('[data-count]').forEach(counter=>{const to=Number(counter.dataset.count),decimals=Number(counter.dataset.decimals),style=counter.dataset.style,steps=27;for(let step=0;step<=steps;step++){const progress=step/steps;tl.set(counter,{textContent:fmt(to*(1-Math.pow(1-progress,3)),decimals,style)},at+progress*.9);}});
});
document.querySelectorAll('h1 .ink-path, .wave .ink-path, .chain > .hand-arrow .ink-path').forEach((p,i)=>tl.to(p,{strokeDashoffset:0,duration:.8,ease:'power2.inOut'},.7+i*.35));
const lastReveal=revealAt.length?Math.max(...revealAt):0;
document.querySelectorAll('.stamp').forEach(s=>tl.fromTo(s,{opacity:0,scale:2.4},{opacity:.92,scale:1,duration:.32,ease:'power4.in',immediateRender:false},Math.min(${Number(duration)}-1,lastReveal+.9)));
window.__motionEnd=tl.duration();
const captions=${JSON.stringify(captions.map(({ start, end }) => ({ start, end })))};
captions.forEach((caption,index)=>{tl.set('#caption-'+index,{visibility:'visible'},Math.max(0,caption.start));tl.set('#caption-'+index,{visibility:'hidden'},Math.min(${Number(duration)},caption.end));});
window.__captionTimes=[...new Set(captions.flatMap(caption=>[Math.max(0,caption.start),Math.min(${Number(duration)},caption.end)]))];
window.__sceneTimeline=tl;window.__sceneDuration=${Number(duration)};})();
</script></body></html>`;
}
