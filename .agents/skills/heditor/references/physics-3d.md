# Physics in 3D layers (physkit): baked rigid bodies, bloom and depth of field

Use real rigid-body physics when the speech is about *weight, collapse, accumulation or impact*: a pile of tasks
that an idea knocks over, a stack of tools that falls into place, a wall of keys that a heavy truth scatters, coins
filling a jar, blocks that build the product. Physics reads as expensive because nothing is keyframed by hand; every
bounce is plausible.

## Why the simulation is baked

HyperFrames renders frames out of order in parallel workers, and seeks backwards during previews. A physics engine
inside the page would depend on the order of the frames it was asked for. physkit runs Rapier (Apache-2.0) **once**
in Node at a fixed step (`fps × substeps`), stores position + quaternion of every body for every video frame, and
the page only interpolates that table at the HyperFrames time. Same scene → byte-identical bake (tested), and every
worker draws the same frame.

## Toolkit

```bash
heditor physics <work> <scene.json> [name]   # bake -> composition/assets/physics-<name>.js (+ qa/physics-<name>.json)
```

```python
import physkit as pk                     # next to reelkit / depthkit in build.py
pk.setup(work)                           # three.js module+core, post-processing addons, physics_player.js
sc = pk.scene(duration=8, walls=(1.6, 1.2), wall_height=0.7)       # floor top at y=0, open tray of walls
sc["bodies"] += pk.rain(36, area=(1.05, 0.75), height=(4.5, 9.5), size=(0.5, 0.26, 0.5),
                        t=(0.15, 2.2), tags=list("PYCODEBR{}<>"), seed=11)      # seeded drops over a time window
sc["bodies"].append({"id": "orb", "shape": "ball", "radius": 0.5, "pos": [0, 6.4, 0], "spawn": 3.05,
                     "vel": [0, -4, 0], "density": 10, "restitution": 0.12})
sc["impulses"].append(pk.blast(t=impact, center=(0, 0, 0), radius=2.6, strength=4.4, lift=0.75,
                               exclude=["orb"]))
stats = pk.bake(work, sc, "keys")        # {'bodies', 'frames', 'steps', 'max_speed_end', 'module', ...}
head = pk.importmap()                    # importmap for "three" and "three/addons/" (local files)
```

Scene format (`scene.json`): `duration`, `fps` (30), `substeps` (4), `gravity` ([0, -9.81, 0]); `static` bodies and
dynamic `bodies` with `shape` = `box` | `roundbox` (`size` [w, h, d], `radius`) | `ball` (`radius`) | `capsule` /
`cylinder` (`halfHeight`, `radius`), `pos`, `rot` (XYZ Euler degrees, as `THREE.Euler`), `vel`, `angvel`,
`density`, `friction`, `restitution`, `spawn` (seconds; the body does not exist before and the player hides it),
`tag` (free data for the page, e.g. the glyph on a key); `impulses` as `{t, id, impulse}` (one body) or
`{t, center, radius, strength, lift, exclude}` (radial blast, scaled by each body's mass). Units are metres and
seconds; a key cap is about 0.5 × 0.26 × 0.5.

Body options for readable, art-directed physics: `"lock": "rotation"` (falls and slides but never turns: labels
stay facing the camera), `"lock": "vertical"` (no rotation and no sideways motion: perfectly straight stacks that
later impacts cannot topple), `"lockRotationAxes": [x, y, z]` (e.g. `[true, true, false]`: tumbles only in the
screen plane), `linearDamping` / `angularDamping`. An impulse with `"unlock"` (`pk.blast(..., unlock=[False, False,
True])`) releases the locked rotations of every existing body at that moment: blocks that piled up readable tumble
after the blast.

**Land on the word.** `stats, err = pk.land_on(work, scene, {"b3": 6.6, ...}, name)` bakes, measures the first
contact of each body (`pk.landings(bake)`: a sudden drop of the falling speed) and shifts its spawn until it lands
on its target time; three passes reach ≤ 1 frame. Bodies falling onto a pile land earlier than onto the floor, and
every change of one body moves the others, so never compute fall times by hand.

**Find event times from the bake, never by guessing.** Bake once, read `qa/physics-<name>.json`, and take the first
frame where the falling body reaches the pile (`tracks[id][f*7+1] < top_of_pile`). Use that time for the blast, the
SFX hit, the flash and the camera shake; re-bake with the blast. Tracks are flat arrays of 7 numbers per frame
(`x y z qx qy qz qw`).

## The page

```html
<script src="assets/gsap.min.js"></script>          <!-- the GSAP timeline still defines duration and overlays -->
<!-- pk.importmap() here -->
<canvas id="three" width="1080" height="1920"></canvas>
<script type="module">
import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { BokehPass } from "three/addons/postprocessing/BokehPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import bake from "./assets/physics-keys.js";
import { applyBake } from "./assets/physics_player.js";
window.__hf = window.__hf || {}; window.__hf.buildReady = window.__hf.buildReady || {};
window.__hf.buildReady.physics = (async () => {
  await document.fonts.load("800 96px JB");        // canvas textures need the font before drawing
  // renderer (pixel ratio 1, fixed size), scene, lights, meshes keyed by body id …
  const composer = new EffectComposer(renderer);    // RenderPass → UnrealBloomPass → BokehPass → OutputPass
  function renderAt(t) {
    applyBake(bake, meshes, t);                     // position, quaternion, visible (spawn)
    // camera, bloom strength, light pulses: pure functions of t
    composer.render();
  }
  window.addEventListener("hf-seek", (e) => renderAt(e.detail.time));
  renderAt(window.__hfThreeTime || 0);
})();
</script>
```

Keep the GSAP timeline (`window.__timelines.main`) for titles, captions, icons and the flash; pad it to the full
length with `tl.set({}, {}, D)`. `data-duration` on the root is mandatory with a three.js layer. A complete working
page is the pilot `templates/physics/pilot_build.py` (keys + orb + blast, bloom, depth of field, SplitText title,
deterministic scramble, DrawSVG icon on the impact).

## Look: values that survived QA

- **Bloom** (`UnrealBloomPass(size, strength, radius, threshold)`): base `0.75, 0.5, 0.72`. The threshold keeps
  glyphs and the hero object glowing without lifting the whole frame. On impact add at most `+0.3 × e^(−3.2 Δt)`:
  a stronger spike, a bright point light next to the object or a high `emissiveIntensity` blow the hero into a
  flat white disc exactly on the most important frame.
- **Hero object material:** metallic and lit (`metalness 0.75`, `roughness 0.22`, `emissiveIntensity ≤ 0.5`), so it
  keeps shading and colour; let bloom add the glow.
- **Impact flash:** a DOM radial gradient centred on the impact's screen position, warm, `mix-blend-mode: screen`,
  peak ≈ 0.9 for 1 frame, out in 0.3 s. A flat full-frame white/grey layer reads as an exposure glitch.
- **Depth of field** (`BokehPass`): `aperture ≈ 0.0016`, `maxblur ≈ 0.006`, focus = camera-to-target distance every
  frame. Subtle; more makes the glyphs unreadable.
- **Glyph labels on bodies:** a 256 px canvas per glyph (`CanvasTexture`, sRGB) on planes above the top and below the
  bottom face, `AdditiveBlending`, mid-bright colours (`#e8b45a`, `#5b8fe6`); pure white or very light colours bloom
  into blank squares.
- **Lights:** hemisphere fill + white key + a coloured rim; fog from ~9 to 22 units hides the floor edge.

## Framing (9:16)

- The vertical frustum is narrow: at fov 50 the visible width at distance d is about `0.52 × d`. A tray 3.7 units
  wide needs the camera ~9.5 units away. Check both walls in the **first and last** frames with margins of at least
  60 px; a slow orbit ends off-centre, so end the yaw at 0 (`ang: -0.16 → 0`) and keep the push-in small.
- Aim the camera above the pile (`lookAt(0, 1.75, 0)`) to put the tray in the lower middle and keep the top third
  for the title; the bottom ~350 px stays free for the platform UI.
- Bodies that drop from above pass behind the title (the DOM is on top). Spawn the hero low enough that it is seen
  falling for 0.5–0.7 s before the impact instead of popping in.
- Final caption: above the tray, in the gap the hero left, with a dark backing; never across the tray walls.
- Contain the scatter: tray walls as tall as the visual walls, blast `strength` 3–5 with `lift` ≤ 0.8 (mass-scaled),
  rain `area` ≈ 65 % of the tray's inner size so few keys land outside.

## Lessons from the `gravidade` reference build

- **Heavy body + rotation-locked bodies needs 8 substeps**: with 4, the solver launched a 9× heavier block 4 m up
  out of the frame when it landed on the heap.
- **A weight resting on a heap pins it**: friction under a heavy body stops any blast; land the weight beside the
  heap and blast from its contact point, centred a little to the side you want the debris to fly away from.
- **Free space is not where you planned it**: debris slides anywhere. Choose lanes from the bake (positions at the
  time the next element falls) and clear the lane with a small shockwave just before the element lands.
- **Labels**: label only the faces that face the camera (front/back); a top-face label shows mirrored copies.
- **Seams**: ACES tone mapping darkens the 3D background; match the page background to the *rendered* colour and
  fade the canvas edges with a CSS mask.

## Cost and QA

- Bake: ~3 s for 37 bodies × 8 s on 4 CPU cores; the module is ~0.4 MB.
- Render: software GL with bloom + bokeh at 1080 × 1920 costs about 85 s per second of video with 2 workers on
  this class of machine (the 8 s pilot: 11 min 16 s, encode 19 s). Measure with a snapshot pass first
  (`npx hyperframes snapshot --at …`), keep the 3D layer to the beats that need it, and drop `BokehPass` first when
  render time matters.
- QA with vision on a contact sheet at the key beats (drops, pre-impact, impact, +0.1 s, +0.5 s, rest, last frame):
  hero readable at impact, both walls in frame, no text over the pile, no body floating, glyphs readable.
- `pytest -q scripts/reelkit/test_motion.py` covers bake determinism, spawn visibility and interpolation.
