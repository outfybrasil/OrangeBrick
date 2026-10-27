"""Style `gravidade`: the speech has weight. Runs as-is; make it yours with beats.json.

Every key concept is a labelled block that falls and lands *on its word* (real rigid-body physics, baked with
physkit before render). Problems pile up in a messy heap, a heavy word lands on the turn and blows the heap apart,
and the answer is built as a clean tower, block by block, on the words that name it. The speaker stays in a live
card above the scene; captions sit in the band below.

    heditor new <work> <video> --style gravidade      # scaffolds this file + DESIGN.md
    # fill prepare.py, heditor prepare, heditor words, then write <work>/beats.json (format below)
    heditor produce <work> music:680 3

beats.json: a list of {"word": "água", "after": 6.0, "kind": "impact", "label": "ÁGUA"} where
  kind  "drop"   a dark block with the label falls into the heap (problems, weight, things that pile up)
        "impact" a heavy block lands and scatters the heap (the turn: a risk, a mistake, a hard truth)
        "stack"  a bright block falls straight onto the tower (the answer, the structure, each part of the method)
        "rain"   n small anonymous cubes spill in (\"everything\", \"a lot of\", \"all of them\"); add "n"
  word  the spoken token (case and punctuation ignored, accents must match); "after" disambiguates repeats
  label text on the block, exactly as spoken (upper case is fine); empty for rain
Without beats.json the build picks the longest words as drops/stacks and the middle one as the impact, so it always
renders; that automatic edit is a baseline, never a delivery. Recipe: references/styles/gravidade.md.
"""
import json
import os
import sys
from pathlib import Path

sys.path.insert(0, os.environ.get("HEDITOR_KIT", str(Path.home() / ".heditor/kit")))
import physkit as pk  # noqa: E402
import reelkit as rk  # noqa: E402

WORK = Path(__file__).resolve().parent
CTA = 5.0
HOOK = ""            # on-screen hook (must reflect the spoken hook); empty = first caption
QUESTION = ""        # CTA question; empty = brand default
SEED = 20261020
CANVAS_TOP, CANVAS_H = 520, 780      # physics viewport (below the top camera card, above the caption band)
CAPTION_TOP = 1300                   # caption band 1300-1550 (bottom UI area stays free)
PILE_X, TOWER_X = -1.5, 1.9          # heap x; preferred tower x (moved to the clearest lane after the blast)
HALF_W = 3.0                         # invisible walls just inside the edges of the view (world x)
FALL_H = 5.4                         # spawn height above the floor (world units)
COLORS = {"drop": ("#161c2c", "#f5c66b"), "impact": ("#2a0f14", "#ff6b6b"), "stack": ("#0d2a24", "#7dffb0")}


def load():
    words_file = WORK / "words-reviewed.json" if (WORK / "words-reviewed.json").exists() else WORK / "words.json"
    words = rk.load_words(words_file)
    edl = json.loads((WORK / "edl.json").read_text())
    return words, round(edl["voice_duration"], 3)


def auto_beats(words, voice_end):
    content = [w for w in words if len(rk.plain(w["word"])) >= 6 and 2.0 < w["start"] < voice_end - 1.5]
    picks = []
    for w in sorted(content, key=lambda x: -len(rk.plain(x["word"]))):
        if all(abs(w["start"] - p["start"]) > 2.2 for p in picks):
            picks.append(w)
        if len(picks) == 6:
            break
    picks.sort(key=lambda x: x["start"])
    mid = len(picks) // 2
    out = []
    for i, p in enumerate(picks):
        kind = "drop" if i < mid else ("impact" if i == mid else "stack")
        out.append({"word": p["word"], "after": round(p["start"] - 0.05, 2), "kind": kind,
                    "label": p["shown"].strip(".,?!:;").upper()})
    return out


def resolve_beats(words, voice_end):
    path = WORK / "beats.json"
    beats = json.loads(path.read_text()) if path.exists() else auto_beats(words, voice_end)
    f = rk.finder(words)
    for b in beats:
        b["t"] = round(f(rk.plain(b["word"]), b.get("after", 0.0)), 3)   # KeyError = word not spoken there
        assert b["t"] < voice_end, f"beat after the speech: {b}"
    last = -1
    for b in beats:
        assert b["t"] >= last, f"beats out of speech order: {b}"
        last = b["t"]
    assert sum(b["kind"] == "impact" for b in beats) <= 2, "one impact (two at most): it is the turn"
    return beats


def block_size(label, kind):
    if kind == "impact":
        return [max(1.2, min(1.7, 0.17 * len(label) + 0.5)), 0.85, 0.85]
    if kind == "stack":
        return [max(1.1, min(1.8, 0.12 * len(label) + 0.5)), 0.42, 0.7]
    return [max(0.9, min(1.7, 0.12 * len(label) + 0.45)), 0.46, 0.62]


def physics(beats, duration):
    """Scene: floor + invisible walls just outside the view; one body per beat, landing on its word."""
    # 8 substeps: rotation-locked blocks hit by a heavy body need them (with 4 the solver launches the weight)
    sc = pk.scene(duration=duration, walls=(HALF_W, 1.2), wall_height=6.0, friction=0.75, restitution=0.12,
                  substeps=8)
    targets, bodies, impacts = {}, [], []
    tower_n, drop_n = 0, 0
    for i, b in enumerate(beats):
        bid = f"b{i}"
        if b["kind"] == "rain":
            n = int(b.get("n", 14))
            rain = pk.rain(n, area=(1.1, 0.6), height=(FALL_H, FALL_H + 2.5), size=(0.24, 0.24, 0.24),
                           t=(max(0.0, b["t"] - 1.0), b["t"] - 0.6), prefix=f"r{i}_", seed=SEED + i, spin=8,
                           shape="box", restitution=0.2)
            for r in rain:
                r["pos"][0] += PILE_X
            bodies += rain
            continue
        size = block_size(b.get("label", ""), b["kind"])
        body = {"id": bid, "shape": "roundbox", "size": size, "radius": 0.06, "tag": b["kind"],
                "spawn": max(0.0, b["t"] - 0.9), "friction": 0.8, "restitution": 0.1, "density": 1.0}
        # rotation only around z (in the screen plane): bodies tumble, but the label always faces the camera
        planar = [True, True, False]
        if b["kind"] == "stack":
            body.update(pos=[b.get("x"), FALL_H + 0.5 * tower_n, 0.0], rot=[0, 0, 0], angvel=[0, 0, 0],
                        vel=[0, -3, 0], density=1.4, restitution=0.0, friction=1.0, lock="vertical")
            tower_n += 1
        elif b["kind"] == "impact":
            # The weight falls straight down beside the heap (on top of it, its weight would pin the blocks and
            # nothing would fly), stays where it lands and keeps its word readable.
            body.update(pos=[b.get("x", PILE_X + 1.5), FALL_H + 1.2, 0.0], rot=[0, 0, 0], angvel=[0, 0, 0],
                        vel=[0, -6, 0], density=9.0, restitution=0.02, friction=1.2, lock="vertical")
            impacts.append((bid, b["t"], body["pos"][0]))
        else:
            # labels stay upright while the heap builds (rotation locked); the blast releases the z rotation
            dx = [-0.55, 0.5, 0.0, 0.7, -0.75, 0.25][drop_n % 6]
            body.update(pos=[b.get("x", PILE_X + dx), FALL_H + 0.3 * (drop_n % 3), 0.0], rot=[0, 0, 0],
                        angvel=[0, 0, 0], vel=[0, -2.5, 0], lock="rotation", angularDamping=1.6)
            drop_n += 1
        bodies.append(body)
        targets[bid] = b["t"]
    sc["bodies"] = bodies
    for bid, t, x in impacts:
        # centre a little right of the weight: the wreck is thrown left and up, the right side stays clear
        sc["impulses"].append(pk.blast(t=t + 1 / 60, center=(x + 0.7, 0.2, 0), radius=3.6, strength=7.0, lift=0.4,
                                       exclude=[bid], unlock=[False, False, True]))
    stacks = [bb for bb in bodies if bb.get("tag") == "stack"]
    if stacks:
        # Debris can slide anywhere, so lanes are chosen from the bake: the tower goes where the floor is clear
        # when its first block falls, and drops that come after the tower fall into the clearest lane left.
        t_tower = min(s["spawn"] for s in stacks)
        late = [bb for bb in bodies if bb.get("lock") == "rotation" and bb["spawn"] > t_tower and "x" not in
                beats[int(bb["id"][1:])]]
        early = [bb for bb in bodies if bb not in stacks and bb not in late]
        sc["bodies"] = early
        pk.land_on(WORK, sc, {bb["id"]: targets[bb["id"]] for bb in early if bb["id"] in targets}, "gravity")
        half = max(s["size"][0] for s in stacks) / 2 + 0.15
        x = clear_lane(t_tower, half, TOWER_X)
        for st in stacks:
            if st["pos"][0] is None:
                st["pos"][0] = x
        # a short shockwave just before the first block of the answer lands clears any debris left in its lane
        first = min(stacks, key=lambda st: targets[st["id"]])
        sc["impulses"].append(pk.blast(t=targets[first["id"]] - 0.22, center=(x, -0.3, 0), radius=half + 1.0,
                                       strength=5.0, lift=0.35, exclude=[st["id"] for st in stacks] +
                                       [i for i, _, _ in impacts]))
        for bb in late:
            sc["bodies"] = early + stacks
            pk.land_on(WORK, sc, {i: targets[i] for i in targets if i in {b2["id"] for b2 in sc["bodies"]}}, "gravity")
            bb["pos"][0] = clear_lane(bb["spawn"], bb["size"][0] / 2 + 0.15, PILE_X)
            early.append(bb)
        sc["bodies"] = bodies
    stats, err = pk.land_on(WORK, sc, targets, "gravity")
    return stats, err, (impacts[0][2] if impacts else PILE_X)


def clear_lane(t0, half, prefer):
    """x centre of the clearest lane of half-width `half` on the floor at time t0 (bodies resting below y 3),
    close to `prefer`, with a margin from the walls; read from the last bake."""
    bk = json.loads((WORK / "qa/physics-gravity.json").read_text())
    f = min(bk["frames"] - 1, int(t0 * bk["fps"]))
    occupied = []
    for bid, tr in bk["tracks"].items():
        info = bk["bodies"][bid]
        if info.get("spawn", 0) > t0 or tr[f * 7 + 1] > 3.0:
            continue
        r = (max(info["size"][:2]) / 2) if info.get("size") else 0.3
        occupied.append((tr[f * 7] - r, tr[f * 7] + r, 10.0 if info.get("tag") == "stack" else 1.0))
    best, best_cost = prefer, 9e9
    lo, hi = -HALF_W + half + 0.25, HALF_W - half - 0.25
    for i in range(int((hi - lo) / 0.05) + 1):
        x = hi - i * 0.05
        cost = sum(w * max(0.0, min(x + half, b) - max(x - half, a)) for a, b, w in occupied) + 0.02 * abs(x - prefer)
        if cost < best_cost:
            best, best_cost = x, cost
    return round(best, 3)


def scenes(hook, question, brand):
    return f"""
<div class="hook" id="hook"><div class="h2">{hook}</div></div>
<div class="cta-q" id="ctaq"><div class="q2">{question}</div><div class="q3">{rk.icon("message-circle")}<span>{brand["comment"]}</span></div></div>
<div id="card"><img src="assets/logo.png" alt="logo"><div class="handle">{brand["handle"]}</div>
  <div id="fbtn"><span id="fb-a">{brand["follow"]}</span><span id="fb-b">{rk.icon("check")}{brand["following"]}</span></div></div>
<div id="ripple"></div><div id="finger">{rk.icon("pointer")}</div>
<div id="impactflash"></div><div id="ctascrim"></div>
"""


CSS = r"""
.glow,#floor-a,#horizon,.speed{display:none}
#bg{background:#020308}   /* = the 3D background after ACES tone mapping: no seam at the canvas edges */
#phys{position:absolute;left:0;top:__TOP__px;width:1080px;height:__H__px;opacity:0;
  -webkit-mask-image:linear-gradient(to bottom,transparent 0,#000 13%,#000 88%,transparent 100%);
  mask-image:linear-gradient(to bottom,transparent 0,#000 13%,#000 88%,transparent 100%)}
#impactflash{position:absolute;inset:0;z-index:13;opacity:0;pointer-events:none;mix-blend-mode:screen;
  background:radial-gradient(circle at __FX__% __FY__px,__FC__ 0,transparent 40%)}   /* tinted with the impact colour */
.hook .h2{font-size:76px;padding:0 100px;text-wrap:balance}
#ctascrim{position:absolute;inset:0;z-index:13;background:rgba(5,7,12,.9);opacity:0}
.caption{top:__CAPTOP__px}
#ctaq{z-index:14}
#card{position:absolute;left:240px;top:760px;width:600px;z-index:14;opacity:0;text-align:center}
#card img{width:180px;height:180px;object-fit:contain}
.handle{font-family:Geist;font-weight:700;font-size:48px;margin-top:16px;color:var(--accent)}
#fbtn{position:relative;margin:24px auto 0;width:440px;height:104px;border-radius:26px;background:var(--accent);color:#000;font-family:Geist;font-size:50px;font-weight:700}
#fbtn span{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;gap:12px}
#fb-b{opacity:0;color:var(--accent)}#fb-b .ic{width:50px;height:50px;stroke-width:3}
#finger{left:640px;top:1120px}#ripple{left:500px;top:1040px}
"""

JS = r"""
gsap.set('#hook',{opacity:1});
out('#hook',Math.max(.2,K.to_top-.3),{y:-40});   // the hook leaves before the card moves up
rig('top',K.to_top,.55);
FT('#phys',{opacity:0},{opacity:1,duration:.35},K.to_top+.15);
K.impacts.forEach(t=>{
  FT('#impactflash',{opacity:0},{opacity:.6,duration:.03},t);TO('#impactflash',{opacity:0,duration:.32,ease:'power2.out'},t+.03);
  shake(t+.02,14);punch(t,1.06,.25);});
const C=K.voice_end;
TO('#rig',{scale:.2,x:430,y:300,opacity:0,duration:.3,ease:'expo.in'},C-.36);TO('#rig-aura',{opacity:0,duration:.2},C-.36);  // gone before the camera clip ends
FT('#ctascrim',{opacity:0},{opacity:1,duration:.4},C);TO('#phys',{opacity:0,duration:.4},C);
FT('#ctaq .q2',{opacity:0,y:40},{opacity:1,y:0,duration:.3,ease:'back.out(2)'},C+.1);
FT('#ctaq .q3',{opacity:0,y:30},{opacity:1,y:0,duration:.25},C+.45);
FT('#card',{opacity:0,y:200},{opacity:1,y:0,duration:.45,ease:'expo.out'},C+.8);
FT('#finger',{opacity:0,x:120,y:160},{opacity:1,x:0,y:0,duration:.4,ease:'power3.out'},C+1.5);
TO('#finger',{x:-150,y:-100,duration:.3,ease:'power2.inOut'},C+1.9);
TO('#finger',{scale:.85,duration:.06},C+2.2);TO('#finger',{scale:1,duration:.12},C+2.28);
FT('#ripple',{opacity:.9,scale:.3},{opacity:0,scale:3,duration:.45},C+2.22);
TO('#fbtn',{backgroundColor:'rgba(0,0,0,0)',boxShadow:'inset 0 0 0 4px var(--accent)',duration:.2},C+2.28);
S('#fb-a',{opacity:0},C+2.28);S('#fb-b',{opacity:1},C+2.28);
TO('#finger',{opacity:0,duration:.2},C+2.7);
TO(['#ctaq','#card'],{opacity:0,duration:.25},D-.25);
"""

MODULE = r"""
<script type="module">
import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import bake from "./assets/physics-gravity.js";
import { applyBake } from "./assets/physics_player.js";
const K = window.K, W = 1080, H = __H__;
window.__hf = window.__hf || {}; window.__hf.buildReady = window.__hf.buildReady || {};
window.__hf.buildReady.gravidade = (async () => {
  await document.fonts.load('400 120px Anton');
  const canvas = document.getElementById('phys');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1); renderer.setSize(W, H, false);
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x0a0e18); scene.fog = new THREE.Fog(0x0a0e18, 11, 24);
  const camera = new THREE.PerspectiveCamera(36, W / H, 0.1, 80);
  scene.add(new THREE.HemisphereLight(0xbcd4ff, 0x0b0f1a, 1.0));
  const key = new THREE.DirectionalLight(0xffffff, 2.4); key.position.set(-3, 9, 6); key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024); Object.assign(key.shadow.camera, { left: -7, right: 7, top: 7, bottom: -7, near: 1, far: 30 });
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x7dd3fc, 1.2); rim.position.set(5, 3, -6); scene.add(rim);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 30), new THREE.MeshStandardMaterial({ color: 0x0c1220, roughness: .55, metalness: .2 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  const grid = new THREE.GridHelper(60, 120, 0x1b2c4d, 0x111b30); grid.position.y = .003; scene.add(grid);
  function faceTex(label, bg, fg, w, h) {
    const c = document.createElement('canvas'); c.width = 1024; c.height = Math.max(64, Math.round(1024 * h / w));
    const x = c.getContext('2d'); x.fillStyle = bg; x.fillRect(0, 0, c.width, c.height);
    if (label) {
      let px = c.height * .74; x.font = `400 ${px}px Anton`;
      const maxw = c.width * .86; const m = x.measureText(label).width; if (m > maxw) { px *= maxw / m; x.font = `400 ${px}px Anton`; }
      x.fillStyle = fg; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(label, c.width / 2, c.height * .54);
    }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
  }
  const meshes = {};
  for (const [id, b] of Object.entries(bake.bodies)) {
    const [w, h, d] = b.size;
    const kind = b.tag || 'rain';
    let mats;
    if (kind === 'rain') {
      mats = new THREE.MeshStandardMaterial({ color: 0x24324f, roughness: .5, metalness: .3 });
    } else {
      const [bg, fg] = K.colors[kind]; const label = K.labels[id] || '';
      const side = new THREE.MeshStandardMaterial({ color: bg, roughness: .45, metalness: .25 });
      const face = (fw, fh) => { const t = faceTex(label, bg, fg, fw, fh);
        return new THREE.MeshStandardMaterial({ map: t, emissiveMap: t, emissive: 0xffffff, emissiveIntensity: .35, roughness: .5, metalness: .1 }); };
      const front = face(w, h);   // label on the camera side (and the back) only: no mirrored copies
      mats = [side, side, side, side, front, front];
    }
    const geo = kind === 'rain' ? new THREE.BoxGeometry(w, h, d) : new RoundedBoxGeometry(w, h, d, 3, .06);
    const m = new THREE.Mesh(geo, mats); m.castShadow = true; m.receiveShadow = true;
    scene.add(m); meshes[id] = m;
  }
  const composer = new EffectComposer(renderer); composer.setPixelRatio(1); composer.setSize(W, H);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(W, H), .55, .45, .78); composer.addPass(bloom);
  composer.addPass(new OutputPass());
  const target = new THREE.Vector3(0, 1.45, 0);
  function renderAt(t) {
    applyBake(bake, meshes, t);
    const u = Math.min(1, t / K.duration);
    let sx = 0, sy = 0, hit = 0;
    for (const ti of K.impacts) if (t >= ti) { const dt = t - ti, a = .12 * Math.exp(-dt * 6); sx += a * Math.sin(dt * 67); sy += a * Math.cos(dt * 49); hit = Math.max(hit, Math.exp(-dt * 3)); }
    camera.position.set(-0.25 + 0.5 * u + sx, 2.7 + sy, 8.3 - 0.3 * u);
    camera.lookAt(target);
    bloom.strength = .55 + .35 * hit;
    composer.render();
  }
  window.addEventListener('hf-seek', (e) => renderAt(e.detail.time));
  renderAt(window.__hfThreeTime || 0);
})();
</script>
"""


def sound_events(k, beats):
    ev = [{"time": 0.0, "category": "bass_impact", "variant": 0, "gain_db": -13, "context": "opening"}]
    for b in beats:
        t = b["t"]
        if b["kind"] == "drop":
            ev.append({"time": round(t - 0.01, 3), "category": "stamp", "variant": 0, "gain_db": -15, "context": f"lands: {b.get('label')}"})
        elif b["kind"] == "stack":
            ev.append({"time": round(t - 0.01, 3), "category": "lock_click", "variant": 0, "gain_db": -13, "context": f"stacks: {b.get('label')}"})
        elif b["kind"] == "impact":
            ev.append({"time": round(t - 0.35, 3), "category": "whoosh", "variant": 1, "gain_db": -16, "context": "weight falling"})
            ev.append({"time": round(t - 0.01, 3), "category": "trailer_hit", "variant": 0, "gain_db": -9, "context": f"impact: {b.get('label')}"})
        elif b["kind"] == "rain":
            ev.append({"time": round(t - 0.3, 3), "category": "pop", "variant": 0, "gain_db": -18, "context": "cubes spill"})
    c = k["voice_end"]
    ev += [{"time": c - 0.15, "category": "whoosh", "variant": 1, "gain_db": -13, "context": "to CTA"},
           {"time": c + 2.2, "category": "click", "variant": 0, "gain_db": -9, "context": "follow tap"},
           {"time": c + 2.3, "category": "level_up", "variant": 0, "gain_db": -13, "context": "following"}]
    return sorted(ev, key=lambda x: x["time"])


def music_plan(k, track, drop_s):
    turn = k["impacts"][0] if k["impacts"] else k["voice_end"] / 2
    return [
        {"start": 0.0, "end": turn - 0.32, "mode": "lowpass", "gain_db": -5, "track": track, "src": max(0.0, drop_s - turn)},
        {"start": turn - 0.32, "end": turn - 0.02, "mode": "silence"},
        {"start": turn - 0.02, "end": k["duration"], "mode": "full", "gain_db": -1, "track": track, "src": drop_s, "fade_out": 1.2},
    ]


def build(track, drop_s):
    brand = rk.load_brand(WORK)
    rk.setup_assets(WORK)
    pk.setup(WORK)
    rk.ensure_icons(["message-circle", "check", "pointer"])
    rk.prepare_camera(WORK)
    rk.prepare_voice(WORK)
    words, voice_end = load()
    caps = rk.captions(words, voice_end)
    beats = resolve_beats(words, voice_end)
    duration = round(voice_end + CTA, 3)
    stats, err, impact_x = physics(beats, duration)
    (WORK / "qa/gravity-landings.json").write_text(json.dumps({"stats": stats, "beats": beats}, ensure_ascii=False, indent=2))
    first_end = next((w["end"] for w in words if w["word"].endswith((".", "?", "!"))), min(3.0, voice_end))
    k = {"hook_end": round(min(first_end, 4.0), 3), "voice_end": voice_end, "duration": duration, "seed": SEED,
         "impacts": [b["t"] for b in beats if b["kind"] == "impact"],
         "labels": {f"b{i}": b.get("label", "") for i, b in enumerate(beats)},
         "colors": COLORS}
    first_beat = min([b["t"] for b in beats] + [voice_end])
    k["to_top"] = round(max(0.3, min(k["hook_end"] + 0.15, first_beat - 0.9)), 3)
    card_w, card_h = 960, 714
    k["rigStates"] = rk.rig_states(card_w, card_h, hero_y=560, top_scale=0.42)
    k["rig"] = [[0.0, "hero"]]
    k["segments"] = rk.jump_segments(WORK, rk.track_faces(WORK), voice_end)
    hook = HOOK or caps[0]["text"].upper()
    question = QUESTION or ("E você, o que acha?" if brand.get("lang", "pt") == "pt" else "What do you think?")
    css = (CSS.replace("__TOP__", str(CANVAS_TOP)).replace("__H__", str(CANVAS_H)).replace("__CAPTOP__", str(CAPTION_TOP))
           .replace("__FY__", str(CANVAS_TOP + int(CANVAS_H * 0.62)))
           .replace("__FX__", str(round(50 + 50 * (impact_x / HALF_W))))
           .replace("__FC__", COLORS["impact"][1] + "cc"))
    module = pk.importmap() + MODULE.replace("__H__", str(CANVAS_H))
    videos = [{"id": "cam-hd", "start": 0, "duration": voice_end, "track": 0, "src": "camera-hd.mp4"}]
    markup = rk.page(title=f"{brand['name']} · gravidade", duration=duration, card_w=card_w, card_h=card_h,
                     face_origin="50% 45%", videos=videos, scenes_html=scenes(hook, question, brand), css=css, js=JS,
                     keys=k, caps=caps, caption_mode="pill", brand_work=WORK,
                     world_back=f'<canvas id="phys" width="1080" height="{CANVAS_H}"></canvas>', overlays=module)
    (WORK / "composition/index.html").write_text(markup)
    plan = {"duration": duration, "voice_end": voice_end, "keys": k, "captions": caps, "style": "gravidade",
            "sound_events": sound_events(k, beats), "music": music_plan(k, track, drop_s),
            "music_ref": [k["impacts"][0] if k["impacts"] else voice_end / 2, voice_end], "cta_boost_db": 5}
    (WORK / "plan.json").write_text(json.dumps(plan, ensure_ascii=False, indent=2))
    (WORK / "captions.json").write_text(json.dumps(caps, ensure_ascii=False, indent=2))
    print("landing error (s):", err)
    return plan
