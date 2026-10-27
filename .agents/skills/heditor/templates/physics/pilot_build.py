"""Pilot (heditor 2.4): baked 3D physics (Rapier) + three.js with bloom and depth of field, GSAP overlay with
SplitText, DrawSVG (icon cleaned by svgkit) and the deterministic scramble. 8 s, 1080x1920, no audio.
Copy this file into an empty work directory and run: . ~/.heditor/env.sh && $HEDITOR_PY pilot_build.py
then `cd composition && $HEDITOR_HYPERFRAMES lint && $HEDITOR_HYPERFRAMES render ...` (see references/physics-3d.md)."""

import json
import os
import shutil
import sys
from pathlib import Path

sys.path.insert(0, os.environ.get("HEDITOR_KIT", str(Path("~/.heditor/kit").expanduser())))
import physkit as pk  # noqa: E402
import reelkit as rk  # noqa: E402
import svgkit as sk  # noqa: E402

W = Path(__file__).resolve().parent
DUR = 8.0
TAGS = list("PYCODEBR{}<>/=()#AI")

# ---------------------------------------------------------------- physics
pk.setup(W)
rk.setup_assets(W)
scene = pk.scene(duration=DUR, walls=(1.6, 1.2), wall_height=0.7)
scene["bodies"] += pk.rain(36, area=(1.05, 0.75), height=(4.5, 9.5), size=(0.5, 0.26, 0.5), t=(0.15, 2.2),
                           tags=TAGS, seed=11)
ORB = {"id": "orb", "shape": "ball", "radius": 0.5, "pos": [0.05, 6.4, 0.0], "spawn": 3.05,
       "vel": [0, -4.0, 0], "density": 10, "restitution": 0.12, "friction": 0.5}
scene["bodies"].append(ORB)
# impact time: first frame where the orb reaches the top of the pile (y < 1.05)
probe = pk.bake(W, scene, "keys")
bake = json.loads((W / "qa/physics-keys.json").read_text())
tr = bake["tracks"]["orb"]
impact = next(f / bake["fps"] for f in range(int(3.0 * bake["fps"]), bake["frames"]) if tr[f * 7 + 1] < 1.05)
scene["impulses"].append(pk.blast(t=impact + 1 / 60, center=(0, 0, 0), radius=2.6, strength=4.4, lift=0.75,
                                  exclude=["orb"]))
stats = pk.bake(W, scene, "keys")
print("bake", stats, "impact", impact)

# ---------------------------------------------------------------- svg (DrawSVG needs a clean single stroke path)
rk.ensure_icons(["zap"])
shutil.copy(rk.ICON_SRC / "zap.svg", W / "qa/zap.svg")
zap = sk.inline(W / "qa/zap.svg", cls="zap", mode="draw", out_dir=W / "qa")

keys = {"impact": impact, "dur": DUR,
        "tags": {b["id"]: b["tag"] for b in scene["bodies"] if b.get("tag")}}

HTML = f"""<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Piloto física 3D</title>
<script src="assets/gsap.min.js"></script>{rk.gsap_plugin_tags(["SplitText", "DrawSVG"])}
{pk.importmap()}
<style>
@font-face{{font-family:AN;src:url(assets/Anton-Regular.ttf)}}
@font-face{{font-family:JB;src:url(assets/JetBrainsMono-VF.ttf);font-weight:100 900}}
html,body{{margin:0;width:1080px;height:1920px;background:#070b16;overflow:hidden}}
#stage{{position:relative;width:1080px;height:1920px;overflow:hidden}}
#three{{position:absolute;inset:0;width:1080px;height:1920px;display:block}}
#title{{position:absolute;left:0;right:0;top:318px;text-align:center;font-family:AN;font-size:132px;letter-spacing:2px;
  color:#f4f6fb;line-height:1;perspective:900px;text-shadow:0 6px 40px rgba(79,140,255,.35)}}
#title .ch{{display:inline-block;transform-origin:50% 100%}}
#sub{{position:absolute;left:0;right:0;top:480px;text-align:center;font-family:JB;font-weight:600;font-size:34px;
  letter-spacing:6px;color:#a9c8ff}}
#end{{position:absolute;left:110px;right:110px;top:610px;text-align:center;font-family:JB;font-weight:500;font-size:40px;
  line-height:1.4;color:#eef2fb;opacity:0;padding:22px 26px;border-radius:18px;background:rgba(7,11,22,.78);
  box-shadow:0 0 0 1px rgba(79,140,255,.35)}}
#end b{{color:#f5c66b;font-weight:700}}
#zapw{{position:absolute;left:455px;top:770px;width:170px;height:170px;opacity:0}}
.zap{{width:170px;height:170px;color:#f5c66b;stroke-width:1.6;filter:drop-shadow(0 0 18px rgba(245,198,107,.9))}}
#flash{{position:absolute;inset:0;background:radial-gradient(circle at 50% 61%,rgba(255,196,96,.85) 0,rgba(255,160,60,.35) 22%,transparent 46%);opacity:0;mix-blend-mode:screen}}
#vig{{position:absolute;inset:0;background:radial-gradient(ellipse at 50% 55%,transparent 45%,rgba(3,5,12,.75) 100%)}}
</style></head><body>
<main id="stage" data-composition-id="main" data-start="0" data-duration="{DUR}" data-width="1080" data-height="1920" data-fps="30">
<canvas id="three" width="1080" height="1920"></canvas>
<div id="vig"></div>
<div id="title">SIMULAÇÃO FÍSICA</div>
<div id="sub">RAPIER · THREE.JS · BLOOM</div>
<div id="zapw">{zap}</div>
<div id="end">Simulação <b>calculada antes do render</b>, por isso todos os workers desenham a mesma cena.</div>
<div id="flash"></div>
</main>
<script>window.K={json.dumps(keys, ensure_ascii=False)};</script>
<script>
const K=window.K, I=K.impact;
const tl=gsap.timeline({{paused:true}});
const split=SplitText.create('#title',{{type:'chars',charsClass:'ch'}});
tl.fromTo(split.chars,{{yPercent:110,rotationX:-80,opacity:0}},{{yPercent:0,rotationX:0,opacity:1,duration:.55,
  ease:'back.out(1.6)',stagger:{{each:.035,from:'center'}},immediateRender:true}},.25);
// deterministic scramble (seeded, precomputed): ScrambleTextPlugin calls Math.random on every update
let seed=20261020;const rnd=()=>(seed=(seed*1664525+1013904223)%4294967296)/4294967296;
function scramble(sel,text,t,dur){{const C='ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*<>/',n=Math.round(dur*15),fr=[];
  for(let i=0;i<=n;i++){{const k=Math.floor(text.length*i/n);let s=text.slice(0,k);
    for(let j=k;j<text.length;j++)s+=/\\s|·/.test(text[j])?text[j]:C[Math.floor(rnd()*C.length)];fr.push(s);}}
  fr[n]=text;const el=document.querySelector(sel);el.textContent=fr[0];const o={{p:0}};
  tl.fromTo(o,{{p:0}},{{p:1,duration:dur,ease:'none',immediateRender:false,
    onUpdate:()=>{{el.textContent=fr[Math.min(n,Math.floor(o.p*n+1e-6))];}}}},t);}}
tl.fromTo('#sub',{{opacity:0}},{{opacity:1,duration:.2,immediateRender:true}},.7);
scramble('#sub','RAPIER · THREE.JS · BLOOM',.7,1.1);
tl.to(['#title','#sub'],{{opacity:.72,duration:.5,ease:'power2.out'}},I-.6);
tl.fromTo('#flash',{{opacity:0}},{{opacity:.9,duration:.03,immediateRender:true}},I);
tl.to('#flash',{{opacity:0,duration:.3,ease:'power2.out'}},I+.03);
tl.fromTo('#zapw',{{opacity:0,scale:.7}},{{opacity:1,scale:1,duration:.12,immediateRender:true}},I+.02);
tl.fromTo('.zap path',{{drawSVG:'0% 0%'}},{{drawSVG:'0% 100%',duration:.38,ease:'power3.out',immediateRender:true}},I+.02);
tl.to('#zapw',{{scale:1.4,opacity:0,duration:.45,ease:'power2.in'}},I+.7);
tl.to(['#title','#sub'],{{opacity:1,duration:.4}},I+1.0);
tl.fromTo('#end',{{opacity:0,y:30}},{{opacity:1,y:0,duration:.6,ease:'power3.out',immediateRender:true}},I+1.25);
tl.set({{}},{{}},K.dur);
window.__timelines=window.__timelines||{{}};window.__timelines.main=tl;
</script>
<script type="module">
import * as THREE from "three";
import {{ EffectComposer }} from "three/addons/postprocessing/EffectComposer.js";
import {{ RenderPass }} from "three/addons/postprocessing/RenderPass.js";
import {{ UnrealBloomPass }} from "three/addons/postprocessing/UnrealBloomPass.js";
import {{ BokehPass }} from "three/addons/postprocessing/BokehPass.js";
import {{ OutputPass }} from "three/addons/postprocessing/OutputPass.js";
import {{ RoundedBoxGeometry }} from "three/addons/geometries/RoundedBoxGeometry.js";
import bake from "./assets/physics-keys.js";
import {{ applyBake }} from "./assets/physics_player.js";
const K = window.K, I = K.impact;
window.__hf = window.__hf || {{}}; window.__hf.buildReady = window.__hf.buildReady || {{}};
window.__hf.buildReady.physics = (async () => {{
  await document.fonts.load('800 96px JB');
  const canvas = document.getElementById('three');
  const renderer = new THREE.WebGLRenderer({{ canvas, antialias: true, preserveDrawingBuffer: true }});
  renderer.setPixelRatio(1); renderer.setSize(1080, 1920, false);
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x070b16); scene.fog = new THREE.Fog(0x070b16, 9, 22);
  const camera = new THREE.PerspectiveCamera(50, 1080 / 1920, 0.1, 60);
  scene.add(new THREE.HemisphereLight(0x9cc0ff, 0x10131f, 1.1));
  const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(3, 8, 5); scene.add(key);
  const rim = new THREE.DirectionalLight(0x4f8cff, 1.6); rim.position.set(-4, 3, -6); scene.add(rim);
  const pulse = new THREE.PointLight(0xf5c66b, 0, 9, 1.6); pulse.position.set(0, 1.2, 0); scene.add(pulse);
  // floor + tray (visual height matches the physics walls)
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshStandardMaterial({{ color: 0x0b1224, roughness: .85 }}));
  floor.rotation.x = -Math.PI / 2; scene.add(floor);
  const grid = new THREE.GridHelper(40, 80, 0x1d3a7a, 0x12224a); grid.position.y = .002; scene.add(grid);
  const edgeMat = new THREE.LineBasicMaterial({{ color: 0x4f8cff }});
  const tray = [[[-1.85, .35, 0], [.5, .7, 3.4]], [[1.85, .35, 0], [.5, .7, 3.4]], [[0, .35, -1.45], [4.2, .7, .5]], [[0, .35, 1.45], [4.2, .7, .5]]];
  for (const [p, s] of tray) {{
    const g = new THREE.BoxGeometry(...s);
    const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({{ color: 0x0f1a36, roughness: .4, metalness: .2, transparent: true, opacity: .55 }}));
    m.position.set(...p); scene.add(m);
    const e = new THREE.LineSegments(new THREE.EdgesGeometry(g), edgeMat); e.position.set(...p); scene.add(e);
  }}
  // glyph textures
  const tex = {{}};
  function glyph(ch) {{
    if (tex[ch]) return tex[ch];
    const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d');
    x.fillStyle = '#000'; x.fillRect(0, 0, 256, 256);
    const gold = 'PYCODEBR'.includes(ch);
    x.fillStyle = gold ? '#e8b45a' : '#5b8fe6'; x.font = '800 168px JB'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText(ch, 128, 140);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
    return (tex[ch] = t);
  }}
  const keyGeo = new RoundedBoxGeometry(.5, .26, .5, 3, .07);
  const keyMat = new THREE.MeshStandardMaterial({{ color: 0x141d38, roughness: .42, metalness: .35 }});
  const capGeo = new THREE.PlaneGeometry(.4, .4);
  const meshes = {{}};
  for (const [id, b] of Object.entries(bake.bodies)) {{
    if (id === 'orb') {{
      const orb = new THREE.Mesh(new THREE.SphereGeometry(.5, 48, 32),
        new THREE.MeshStandardMaterial({{ color: 0xe9b04f, emissive: 0xff9d2e, emissiveIntensity: .45, roughness: .22, metalness: .75 }}));
      scene.add(orb); meshes[id] = orb; continue;
    }}
    const g = new THREE.Group(); g.add(new THREE.Mesh(keyGeo, keyMat));
    const t = glyph(K.tags[id] || '#');
    for (const sgn of [1, -1]) {{
      const cap = new THREE.Mesh(capGeo, new THREE.MeshBasicMaterial({{ map: t, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }}));
      cap.rotation.x = -sgn * Math.PI / 2; cap.position.y = sgn * .132; if (sgn < 0) cap.rotation.z = Math.PI;
      g.add(cap);
    }}
    scene.add(g); meshes[id] = g;
  }}
  const composer = new EffectComposer(renderer);
  composer.setPixelRatio(1); composer.setSize(1080, 1920);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(1080, 1920), .75, .5, .72); composer.addPass(bloom);
  const bokeh = new BokehPass(scene, camera, {{ focus: 6.5, aperture: .0016, maxblur: .006 }}); composer.addPass(bokeh);
  composer.addPass(new OutputPass());
  const target = new THREE.Vector3(0, 1.75, 0);
  function renderAt(t) {{
    applyBake(bake, meshes, t);
    const u = Math.min(1, t / K.dur), e = u * u * (3 - 2 * u);
    const ang = -.16 + .16 * e, r = 9.8 - .4 * e, h = 5.9 - .4 * e;
    let sx = 0, sy = 0;
    if (t > I) {{ const d = t - I, a = .16 * Math.exp(-d * 5.5); sx = a * Math.sin(d * 71); sy = a * Math.cos(d * 53); }}
    camera.position.set(Math.sin(ang) * r + sx, h + sy, Math.cos(ang) * r);
    camera.lookAt(target);
    const since = t - I, hit = since >= 0 ? Math.exp(-since * 3.2) : 0;
    bloom.strength = .75 + .3 * hit; pulse.intensity = 5 * hit + (t > 3.05 && t < I ? 2 : 0);
    bokeh.uniforms.focus.value = camera.position.distanceTo(target);
    composer.render();
  }}
  window.addEventListener('hf-seek', (ev) => renderAt(ev.detail.time));
  renderAt(window.__hfThreeTime || 0);
}})();
</script>
</body></html>"""

(W / "composition/index.html").write_text(HTML)
pkg = Path(os.environ["HEDITOR_SKILL"]) / "templates/composition-package.json"
if not (W / "composition/package.json").exists():
    shutil.copy(pkg, W / "composition/package.json")
print("ok", W / "composition/index.html")
