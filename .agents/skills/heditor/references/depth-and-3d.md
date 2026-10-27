# Depth layers and 3D (depthkit)

Layered edits make the room part of the graphics: a title that sits *behind* the speaker, a caption painted on the wall, an object that passes between the speaker and the shelf, labels pinned to things in the room, a background that turns into a scan or a point cloud while the person stays real. They read as expensive and "impossible" and they are cheap once the speaker has an alpha matte.

Everything here is built from one camera file (`composition/assets/camera-hd.mp4`). Every derived file is frame-for-frame with it and is rebuilt automatically when the camera is newer (after an EDL change), so picture, matte and depth never drift apart.

## Toolkit

```bash
heditor matte <work>                 # camera-alpha.webm (camera RGB untouched + alpha) + matte-person.mp4 + qa/matte-sheet.jpg
heditor depth <work> [fps=10]        # depth.mp4 (near = white) + depth-still.png + qa/depth-sheet.jpg
heditor look <work> fog              # camera-fog.mp4: far parts darkened/blurred, the speaker untouched
heditor look <work> edges [#hex]     # camera-edges.mp4: room as glowing iso-depth contours, speaker in colour
heditor look <work> edges-rgb [#hex] # camera-edges-rgb.mp4: room as edge lines (Canny), busier, more detail
heditor look <work> dots [#hex]      # camera-dots.mp4: background as a point cloud, speaker solid (prints points/frame)
heditor hands <work> [t0] [t1]       # qa/hands-<t0>.json: 21 landmarks per hand, palm centre and hand size
heditor plane <w> <h> x1,y1 x2,y2 x3,y3 x4,y4   # CSS matrix3d that pins a w×h element onto 4 points
```

Python (inside `build.py`): `import depthkit as dk` next to `import reelkit as rk`.

| Function | Output | Notes |
|---|---|---|
| `dk.person_matte(work, model="multiclass", keep_classes=None, erode=1, ema=0.4)` | `camera-alpha.webm`, `matte-person.mp4`, `qa/matte-stats.json` | MediaPipe multiclass segmenter (hair, skin, clothes, accessories), temporal smoothing, guided filter on the RGB edge. `keep_classes={1,2,3,4}` drops accessories (a mic arm). Read `coverage_jumps_s` in the stats: a jump is a frame where the matte gained or lost a large area. |
| `dk.depth_map(work, fps=10)` | `depth.mp4`, `depth-still.png` | Depth Anything V2 Small (relative depth, not metres). Sampled at `fps` and held; levels normalised with running percentiles so they do not pump. 10 fps is enough for a seated speaker; use 15–30 when the camera moves. |
| `dk.depth_look(work, name, vf_bg, vf_depth="")` | `camera-<name>.mp4` | Any ffmpeg chain applied to the far parts only (fog, blur, desaturation, a colour cast). `vf_depth` reshapes the depth curve (protect only the speaker with `curves=all='0/0 0.55/0.2 1/1'`). |
| `dk.edge_look(work, name, color, source="depth"|"rgb", dim=0.12, glow=3)` | `camera-<name>.mp4` | Contour/edge scan of the room; speaker kept in colour with the matte. |
| `dk.dots_look(work, name, color, step=9)` | (`camera-<name>.mp4`, points per frame) | Point cloud; dot size and brightness by depth. `step` 12–16 is calmer; the returned count is a real number for a HUD. |
| `dk.plane_matrix3d(w, h, quad)` | CSS `matrix3d(...)` | Maps an element (transform-origin `0 0`) onto four stage points: top-left, top-right, bottom-right, bottom-left. |
| `dk.track_points(work, t0, points, t1)` | list + `qa/track-<t0>.json` | Lucas–Kanade tracking of chosen video pixels (labels pinned to objects, a moving plane quad). Check `ok`. |
| `dk.track_hands(work, t0, t1, step=1/15)` | list + `qa/hands-<t0>.json` | MediaPipe Hand Landmarker; `palm` and `size` per hand for objects that float over the palm. |
| `dk.to_stage(pt, video_size, box)` | stage px | Converts a video pixel to stage pixels for a video drawn with `object-fit: cover` in `box`. |
| `dk.setup_three(work)` | assets | Copies three.js (module + core, MIT) into the cut for offline 3D. For bloom, depth of field and rigid-body physics use `physkit.setup(work)` instead (adds the post-processing addons and an importmap); see `physics-3d.md`. |
| `dk.still_layers(src, out_dir, cut=0.52, soft=0.2, blur=6)` | `<stem>.jpg`, `<stem>-front.webp`, `<stem>-depth.png` | 2.5D parallax for a still (a generated painting, a photo): background + a soft RGBA front layer of the near planes (`dk.front_alpha`). Move the front 60–90 px more than the back and scale it ≤ 4 % more; ≈ 10 s per 1536×1024 image on CPU. Recipe in `styles/documentario-narrado.md`. |

Models are Apache-2.0 and download into `~/.heditor/assets/models` (setup fetches the segmenter and the hand model; `setup.sh --depth` also pre-fetches the 99 MB depth model, otherwise it downloads on first use). CPU cost on 4 cores: matte ≈ 1× real time at 960 px, depth ≈ 2–4× real time at 10 fps, looks ≈ 0.5–1×.

## The layer stack

Put every layer inside **one container** that holds the camera, so punch-ins, shakes and magic moves move all layers together:

```
#cam (the camera box; transforms go here)
├── video  camera-hd.mp4 | camera-fog.mp4 | camera-edges.mp4   (plate, track 1)
├── back graphics    (titles behind the speaker, wall captions, 3D canvas, guide lines, floating cards)
├── video  camera-alpha.webm                                    (speaker, same data-start/duration/media-start)
└── front graphics   (captions, cards over the chest, hand objects, HUD)
```

```html
<div id="cam">
  <video class="clip" data-start="0" data-duration="D" data-track-index="1" src="assets/camera-fog.mp4" muted playsinline></video>
  <div id="behind">EDITOR</div>
  <div id="wall">PROFUNDIDADE</div>
  <canvas id="three"></canvas>
  <video class="clip" data-start="0" data-duration="D" data-track-index="2" src="assets/camera-alpha.webm" muted playsinline></video>
</div>
<script>document.getElementById('wall').style.transform = "MATRIX_FROM_dk.plane_matrix3d";</script>
```

- Both videos use the same `data-start`, `data-duration` and `data-media-start`. Swapping the plate (fog → edges → dots) is just another clip on its own track with the same media offset.
- The plate and the alpha video must have the same box and `object-fit`; never scale one of them alone.
- Keep the camera RGB untouched in the alpha video. Grade the plate instead.
- Render time grows with alpha video and WebGL (software GL in headless Chrome): a 6 s test with both took ~75 s on 4 cores. Budget it, or switch the alpha layer on only where it is used.

## Technique recipes

### 1. Title behind the speaker
Giant condensed caps (Anton / Bebas Neue), 70–90 % of the frame width, at head or upper-chest height so the hair and shoulders cover part of the letters. The word is the key noun of the sentence (the tool, the number, the result). Entrance: `scale 1.12 → 1`, `opacity 0 → 1`, 0.15–0.3 s, or rising from behind the shoulders (`y +220 → 0`, `expo.out`). Hold 1.5–3 s. Variations: a giant `?` behind the head on a question; a percentage that steps up (66 → 80 → 99 %) behind the hair with segmented meter bars at the frame edges; a two-colour stacked headline whose last line is covered by the head; extruded type (stacked `text-shadow` layers, 1 px apart, darker each step, or three.js `TextGeometry`).
- Readability: at least ~60 % of each letter must stay visible; place the word where the head is narrowest (above the shoulders) and test with the matte sheet. If the speaker leans into the word, move or shrink it on that beat.

### 2. Caption or title painted on the room
Pick a wall, a shelf front, a desk top or a monitor in `depth-still.png` / a probe frame; read the four corners in video pixels, convert with `dk.to_stage` and get the matrix with `dk.plane_matrix3d`. Use `mix-blend-mode: screen` (light text on a dark wall) or `multiply` (dark ink on a light wall), a soft `text-shadow` in the wall colour and 85–90 % opacity so the text looks lit by the room. If the camera moves, track the four corners with `dk.track_points` and update the matrix per sample (GSAP `set` on each sample time). Put the element *under* the alpha video so the speaker covers it.

### 3. Objects behind the head
Logos, icons, a controller outline, a halo ring, an orbit ring, a wireframe cube, a giant badge: animate them up from the shoulders into the head area so the hair covers their lower part, or let them orbit around the head (`rotateY` on a wrapper with `perspective: 900px`, half of the orbit under the alpha video, half above it: two copies, one per layer, cross-faded at the sides).

### 4. A 3D object that passes behind the speaker
three.js on a transparent canvas in the back layer (`dk.setup_three(work)`, then `import * as THREE from "./assets/three.module.min.js"`). Render only on `hf-seek` (`window.addEventListener('hf-seek', e => at(e.detail.time))` and `at(window.__hfThreeTime || 0)`), never with `requestAnimationFrame`. Light it with a hemisphere light plus one key light in the scene's accent colour. For an object that goes *around* the speaker, render it twice (front and back canvases) and switch which canvas draws it by the sign of its z. Keep geometry modest (≤ 50 k triangles) for software GL.

### 5. Depth-graded background
`look fog` darkens and softens the room while the speaker stays crisp: a cheap "studio" upgrade and the base for any title behind the speaker. Variants with `depth_look`: far parts desaturated and cooled (`eq=saturation=0.2,colorbalance=bs=.15`), far parts blurred only (`gblur=sigma=8`), a colour wash in the accent colour (`colorchannelmixer` or `lutrgb`).

### 6. Room scans (edge map, contour map, point cloud)
For "how the machine sees the scene" beats: `look edges` (iso-depth contours, the cleanest), `look edges-rgb` (more detail), `look dots` (point cloud with a real point count). Cut into them on the spoken word (depth, recognises, environment, scan) with a 0.2 s flash or a horizontal scan line that wipes from top to bottom (`clip-path: inset(0 0 X% 0)` on the scan clip over the normal plate). Add a vertical ruler at the left edge labelled `PERTO` / `LONGE` (near / far) with leader lines to two points in the room; values must be relative labels, never invented metres.

### 7. Exploded layer view
The frame shrinks to a card in a dark void (`scale 1 → .62`, radius 28, 0.4 s), then splits into three translucent planes: background plate, graphics, speaker (the alpha video). Wrapper `perspective: 1400px`; planes at `translateZ(-260px / 0 / 260px)` and a group `rotateY(0 → 62deg)` over 1.2 s, held 1–2 s with small label tags per plane (PLATE / GRAPHICS / SPEAKER in the user's language), then back to flat and to full frame. Glass look: 1 px light edge, `backdrop-filter: blur(6px)` on a 6 % white fill, a faint glow in the accent colour. Use it when the speech explains layers, separation, "what goes in front and what goes behind".

### 8. Virtual stage orbit
Speaker cutout on a vertical plane in front, background plate on another plane 2–3× further back, a perspective grid floor under both, distance labels (relative), and the group orbiting ~60° and back in ~3 s. Same CSS 3D as the exploded view, but the planes keep their full-frame size and the floor is an SVG grid with `rotateX(75deg)`.

### 9. Labels pinned to things in the room
Corner brackets, a dot, a leader line and a small label (dark pill, condensed caps, a confidence-like tag only if the speech gives one). Place on objects found in a probe frame, track with `dk.track_points` when anything moves. Stagger 0.12 s per label, a short `data_beep` each. Never label people other than the speaker; never fake a detection score.

### 10. Hand-anchored objects
`heditor hands <work> t0 t1`, then for each sample put the object at `palm − (0, 1.2 × size)` scaled by `size / size_at_first_sample`, with a glowing ellipse under the palm (`radial-gradient`, `mix-blend-mode: screen`). Smooth positions with a 3-sample moving average; when a hand disappears, hold the last position for ≤ 0.3 s and fade out. Good for "I have two options in my hands", "this tool here and this one here", weighing two things. A skeleton overlay (lines between landmarks 0-1-2-3-4, 0-5-6-7-8, …, plus fading trails of the fingertips) works for "it recognises your hands" beats.

### 11. Floating panels and cards in perspective
UI panels, screenshots, portrait video cards and app tiles with `rotateY(±12–20deg)` facing the speaker, a thin bezel, a soft shadow and a slow drift (`x ±12 px`, `yoyo`, 4–6 s). Put the far cards behind the speaker (the body hides the middle one) and the near ones in front. Corner brackets in a cool accent mark the "selected" card.

### 12. Background reveal hook (raw → edited)
Frame 0: the speaker on a transparency checkerboard (CSS `conic-gradient` 32 px squares) inside a dashed selection box with handles and a small "RAW" tag. On the first beat a mask wipe uncovers the real (graded) room under the alpha video, the box disappears and the tag flips to "✓ EDITED". It opens a loop ("how was this made?") that the video pays off.

### 13. Background rebuild
Black → perspective grid floor drawn on (`stroke-dashoffset`) → line-art room (`edges` scan) → the graded room (`fog` plate) cross-fading in, about 0.5 s per step, with the speaker on top the whole time. For "it removed the background and rebuilt the set".

### 14. Glass phone slab
The whole frame scales to ~70 % and turns `rotateY(15–20deg)` over a dark perspective floor, with a light edge and an extruded word next to it; it returns to full frame after ~1.5 s. A strong punctuation for "3D", "perspective", "depth".

## QA for layered shots

1. `qa/matte-sheet.jpg` with vision: hair, glasses, hands, shoulders, chair and mic. Fix with `keep_classes`, `erode`, a dark disc behind the speaker or by avoiding the frames (plan text behind the speaker on beats where the hands are low).
2. `qa/matte-stats.json`: `coverage_jumps_s` lists frames where the matte jumped; check those times in previews.
3. Previews at every layered beat: ask vision "is the text behind the person (occluded by head/body)? any double edge or ghosting? is every letter still readable?".
4. Fast hands blur into a semi-transparent smear in the matte: keep important layered text away from gesture zones, or switch the beat to a front graphic.
5. Changing the EDL rebuilds `camera-hd.mp4`; re-run `heditor matte/depth/look` (they rebuild only what is stale) and `camera_sync_check.py`.
