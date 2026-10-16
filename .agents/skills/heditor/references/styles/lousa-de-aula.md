---
style: lousa-de-aula
name: Lousa de aula (interactive chalkboard lesson)
family: fixed-style
best_for: didactic family (the screen teaches what the speaker says, drawn live and synced to the words); conceptual explanations made of 3–6 pieces that connect (who calls whom, what feeds what, who pays whom), definitions, "what is X vs Y", architecture and flow talks; organic Reels with a homework question and Follow
reference: produced by the PycodeBR team with heditor, Oct 2026
---
# Lousa de aula (interactive chalkboard lesson)

The whole screen is a **classroom chalkboard**, and the board teaches while the speaker talks. A dark green slate with old eraser marks, an oak frame, a chalk tray with white, yellow, blue and pink sticks and a felt eraser, a dark classroom wall above with soft ceiling light. The speaker is the **teacher in a framed picture pinned to the board**: large in the hook, small in a corner while the board works, larger again for the closing. **Every stroke is drawn live, starting on the word that triggers it** (±0.15 s): the lesson title is already written in frame 0, a numbered syllabus of the questions is written as they are asked and each "?" turns into a ✓ when the item is explained, boxes, icons and arrows labelled with the spoken verb appear piece by piece, emphasis circles and double underlines land on the keywords, a chalk stick travels along the tip of every stroke and drops dust, the **eraser** wipes the diagram before the recap, and a **SUMMARY** board rebuilds the whole chain in one sentence. The core metaphor: **the speaker is giving a real lesson, and the board is the teacher's hand**.

**Status:** approved by the channel owner after its first production (Oct 2026) as a reusable style for technical explanations. Reuse the language as-is and redesign the drawings for each new explanation.

## When to use / when not to

Use it when the speech:
- explains a concept made of named parts that relate to each other (producer → queue → consumer; client → server → database; app → model → provider);
- names the parts one by one, with examples, before tying them together;
- has (or can end on) a recap sentence that restates the whole chain;
- is calm and didactic: a class, a tutorial, a "let me explain this simply".

Avoid it when:
- the speech is a story, an opinion or a hot take with nothing to draw (use `documentario`, `podcast`, `manchete`);
- the parts are not spoken: the board may only draw what is said, never a diagram the viewer has to read without narration;
- the content is mostly code or a screen demo (`ide`, `bancada`);
- the batch already uses a hand-drawn world: courtroom sketch (`tribunal`), blueprint sheets (`manual-de-montagem`, `raio-x`) or concepts drawn around the speaker (`camadas`). This style has **no paper, no grid, no charcoal figures and no slides**; keep it that way.

## Signature moves

1. **Frame 0 already teaching**: the lesson title is written top-left ("What is what in a queue?"), the teacher is large in the frame (`hero`), the chalk stick rests at the end of the title; a chalk tap on the first word.
2. **The syllabus**: a 2×2 numbered list of the questions in the hook, each word written in its own category colour on the word, number drawn 0.2 s before, a small circle around the number and a "?" after the word.
3. **The teacher steps back**: on the first breath after the hook, the camera frame slides to the top-right corner (0.55 s, `power3.inOut`) and the board takes the screen.
4. **Pieces drawn on their words**: an icon per part (terminal, app window, chip with pins, server rack, card, key, envelope, database cylinder), a labelled box, a brace `{` with the spoken examples as plain text, one at a time.
5. **The ✓ moment**: when an item of the syllabus has been explained, its "?" is struck through and a yellow ✓ is drawn next to it (a "consequence" stroke, 0.1–0.9 s after the triggering word, still inside the sentence).
6. **Arrows that speak**: each relation is an arrow drawn shaft first, head second, labelled with the spoken verb ("uses", "serves", "we pay"), in the colour of the part that acts.
7. **Emphasis**: an elliptical circle on the keyword when it is repeated, a double underline on the next repetition, a dot added to a chip for each example named.
8. **The eraser**: on a turning phrase ("it is a simple concept"), the felt eraser lifts from the tray, wipes the diagram in straight horizontal passes (2.0 s) leaving a 2 % ghost and chalk haze, and returns; title and syllabus stay.
9. **SUMMARY board**: "SUMMARY" in yellow with a double underline, a two-line subtitle, then the full chain rebuilt node by node and arrow by arrow on the recap sentence, music drop on its first word.
10. **The closing**: the camera grows again, circles land on each actor as "people" / "parties" are said, a short phrase goes in the middle of the chain, an ellipse surrounds the whole chain on the last word and a final double underline closes the lesson.
11. **Homework CTA**: the eraser clears the chain, "Homework:" and the question are written on the board, "Tell us in the comments", the logo in a chalk frame, the @handle and a chalk-drawn Follow button that the chalk taps and fills into "✓ Following".

## Frame and layout

Canvas 1080×1920, 30 fps. Organic safe zones.

```
y 0–240      dark classroom wall + top of the oak frame (frame from y 226): atmosphere only, luma < 150
y 246–1546   SLATE (x 40–1040), oak frame x 20–1060 / y 226–1566
  y 300–386    lesson title, pre-written, top-left (x 66–554, handwriting 52 px), single chalk underline
  y 400–1240   DIAGRAM AREA (text ends ≤ x 955; nothing drawn where the camera frame sits in any state)
  y 1250–1380  SYLLABUS: four numbered questions in a 2×2 grid (x 95 and x 555, baselines 1302 / 1366); stays to the end
  y 1390       a dashed chalk line separating the caption band
  y 1400–1532  CAPTION BAND (x 90–950), written in chalk on the board's bottom margin; never over the drawing
y 1544–1592  chalk tray with sticks, chalk dust and the eraser at rest (lying at the right end)
y > 1600     dark floor (atmosphere); right edge x > 960, y 1000–1700 without information
```

Camera (the teacher's framed picture): dark wood frame (9 px padding `#24180e`, inner bevel), soft shadow on the slate, a discreet name tag inside the frame (dark glass, yellow left rule, handwriting 19–26 px). Always above the chalk layer; **nothing is ever drawn behind it in any state**.

| State | Box | When |
|---|---|---|
| `hero` | 880×660 at x 100, y 405 | frame 0 → first breath after the hook |
| `work` | 316×237 at x 700, y 300 | the explanation (the board works) |
| `close` | 456×342 at x 560, y 300 | from the closing line ("simple as that") to the end |

Light warm grade, cut zoom 1.0/1.05 on pause cuts centred on the median face of each block (`K.segments`), 2.5 % breathing over the speech. In the CTA the frame shows the last camera frame as a still. A 9:16 webcam tile cropped to 4:3 works well (keep the crop above any on-screen meeting label).

## Palette and typography

| Role | Hex |
|---|---|
| Slate | `#1d2f27` → `#23372e`, eraser marks up to +6 % light |
| Oak frame / tray | `#6b4a2c` / `#4a321d` / `#7a5634` |
| Wall / floor | `#191a16` / `#10110f` / `#0b0b0a` |
| White chalk (general text, "us") | `#f1eee3` |
| Yellow chalk (emphasis, checks, SUMMARY, one category) | `#f4dc72` |
| Light-blue chalk (one category) | `#9fd2ee` |
| Pink chalk (one category) | `#f2a7bd` |
| Dark (text on the yellow fill) | `#13221b` / `#15241c` |

**One colour per category from start to end** (for example blue = producer, yellow = queue, pink = consumer, white = the viewer and money). The colour never carries meaning alone: every piece also has a written label. Contrast on the slate: white 12:1, yellow 10:1, blue 8.7:1, pink 7.4:1.

Font: **Kalam** Regular and Bold (OFL, google/fonts; not in the kit: download the TTFs with `OFL.txt` into the cut and copy them to `composition/assets/`), a legible teacher's handwriting. No other typeface on screen; the logo is the one in `brand.json`. Icons are drawn by hand in SVG (terminal `>_`, app window with three dots, chip with pins, server rack, card with a stripe, key, envelope), never Lucide or product logos.

## Caption system

"Chalk margin": the caption is written in chalk on the board's bottom margin, below a dashed chalk line at y 1390. Band x 90, y 1400, 860 × 132, centred, one line, `white-space: nowrap`. **Kalam Bold 40–60 px**, size per group so the line fits 820 px (measured with PIL `getlength` on the real TTF), chalk white `#f1eee3` with a faint glow `0 0 1px rgba(241,238,227,.35)` and a soft shadow. Groups of up to 4 words / 22 characters; a group stays on screen until the next one when the gap is < 0.7 s.

- Active word: **a smear of yellow chalk**: dark `#13221b` on `#f6dd6a` (≈ 12:1), padding `2px 10px 0`, irregular radius `7px 9px 6px 10px` so it reads hand-made; switched with `tl.set` 0.02 s before the word starts.
- No upper case: the handwriting is the voice of the board.

```css
.capw{position:absolute;left:90px;top:1400px;width:860px;height:132px;z-index:11;display:flex;align-items:center;justify-content:center}
.cap{width:860px;text-align:center;font-family:KalamB;line-height:1.18;color:#f1eee3;opacity:0;white-space:nowrap;
  text-shadow:0 0 1px rgba(241,238,227,.35),0 2px 3px rgba(0,0,0,.35)}
.cap .w{display:inline-block;padding:2px 10px 0;margin:0 1px;border-radius:7px 9px 6px 10px}  /* active: bg #f6dd6a, color #13221b */
```

```python
def cap_size(cap, maxw=820):
    w = sum(text_w(x["shown"], 60) for x in cap["words"]) + 26 * len(cap["words"])   # Kalam Bold at 60 px + padding
    return int(max(40, min(60, 60 * maxw / max(w, 1))))
```

## Scene grammar

Generic example: a speaker explaining a message queue: "what is a producer, a queue, a consumer and a broker"; the producer (a web app, a script, a cron job) publishes a message; the message waits in a queue; the queue is run by a broker, which is a service (examples named one by one); a consumer reads it and acknowledges it; recap: "your app publishes, the queue holds, the worker consumes, and the broker keeps it all running"; closing: "these are the parts of any asynchronous system".

| Beat | Board | What happens |
|---|---|---|
| Hook | title + syllabus | Frame 0 with the title written and the teacher large; the four questions written on their words (number → circle → word → "?"). |
| Step back | — | First breath: the camera frame slides to the corner; music filtered. |
| Part 1 | blue | Icon (terminal) on the first example word, the PRODUCER box on the part's name, label 0.3 s later; ✓ on the syllabus as a consequence; brace with the spoken examples one by one; a second icon (app window) on a repeated mention; circle on the third mention, double underline on the fourth. |
| Part 2 | yellow | Arrow "publishes" from the producer, the QUEUE drawn as a row of slots on its word; one dot per message or example named; ✓. |
| Part 3 | pink | Arrow "is run by" to a server rack, BROKER label, "= a service", the named examples one by one under a brace; underline on the next "this service". |
| Part 4 | white | The consumer (a gear or a worker box), "ACK" written, arrow "we read" back; ✓ on the last question. |
| Eraser | — | On the turning phrase: the eraser wipes the diagram in 7 horizontal passes (2.0 s); title and syllabus stay. |
| Summary | yellow + all | "SUMMARY" + two-line subtitle; 0.3 s music silence; drop on the first word of the recap; every node and arrow on its word (APP →publishes→ QUEUE ↓holds↓ … ←runs← BROKER). |
| Closing | — | Camera grows; circles on each actor as they are called "parts"; phrase in the middle of the chain; ellipse around the chain on the last word; double underline on the last syllable. |
| CTA (6 s) | — | Eraser clears the chain (1.0 s); "Homework:" + the question in three lines; "Tell us in the comments"; logo in a chalk frame; @handle; chalk Follow button tapped → "✓ Following" filled in yellow. |

Rules: the board draws only what is said, at the moment it is said; product, service and tool names only as plain text and only when spoken (no logos); names that date quickly (model versions, product releases) may stay in the caption but become neutral marks on the board (a dot per name and "several"); numbers on the board only if spoken (a neutral 1–4 syllabus can go in `plan["allowed_numbers"]`); simplifications the speaker did not qualify go in the post caption, not on the board as a note in his name; arrows are labelled from the point of view of the subject that acts (see Pitfalls).

## Transitions and motion vocabulary

There are no screen cuts. The turns are the chalk itself (a change of colour per part), the eraser and the camera frame changing size.

- **Progressive stroke**: `stroke-dasharray: L L+4; stroke-dashoffset: L·(1−p)`; opacity 0 until `p > 0` (so caps and joins do not show early). Cosine ease (`0.5 − 0.5·cos(πp)`) on long shapes, linear on short ticks.
- **Handwriting reveal**: each text is a `<text>` clipped by a `<rect>` whose width grows left to right with `p` (width = `(w + 16)·p + 6`).
- **Typical durations**: syllabus word 0.34 + 0.03 × letters; box 0.3–0.6 s; arrow shaft 0.22–0.30 s then head 0.08–0.10 s; tick 0.10 s strike + 0.18 s check; circle 0.26–0.34 s; ellipse around a chain 0.56 s; dots 0.03–0.08 s.
- **Chalk stick**: follows the tip during a stroke (`getPointAtLength`, or the reveal edge for text), glides along a small arc (`−26·sin(πu)`) to the next stroke's start when the gap is ≤ 1.25 s, otherwise lifts away (+14, −30 px) and fades in 0.32 s. A small wobble (`sin(9.3t)·3 + sin(23t)·2` while drawing) and a fixed 34° tilt; the stick takes the colour of the stroke.
- **Eraser**: lifts from the tray (0.3 s smoothstep, rotates from lying to standing), runs the zigzag path (rotation ±7° with a 14 Hz shimmer), returns in 0.35 s.
- **Camera**: `hero → work → close`, 0.55 s `power3.inOut`; the name tag size animates with it.
- **CTA button**: the yellow fill grows from the left (`scaleX` 0.2 → 1, 0.16 s), then "✓ Following" pops (`back.out(2)`, 1.12 → 1).

## Sound design

| Action | Category | gain_db | length |
|---|---|---|---|
| Frame 0 | `chalk_tap` (synth) | −17 | 0.16 |
| Every drawn stroke or written word | `chalk` (synth, 4 variants rotated, rate 0.94–1.06) | −23 during speech, −21 in the CTA | = stroke duration (0.12–1.0) |
| ✓ on the syllabus | `chalk_tap` | −21 | 0.16 |
| Emphasis taps, chain closed | `chalk_tap` | −22 / −21 | 0.16 |
| Final tap on the chain | `chalk_tap` (rate 0.92) | −19 | 0.16 |
| Picking up the eraser | `chalk_tap` (rate 0.9) | −24 | 0.16 |
| Eraser (diagram / CTA) | `eraser` (synth) | −24 / −21 | 2.0 / 1.0 |
| Camera frame moves | `whoosh` | −25 | 0.5 |
| Logo | `pop` | −24 | 0.2 |
| Chalk taps Follow / Following | `chalk_tap` / `success_chime` | −16 / −21 | 0.16 / 0.9 |

Synthesised (numpy, fixed seed): **chalk** = noise band-passed 1.6–7 kHz (one band per variant), gated by friction grains at 150–300 Hz (`sin(2π∫rate) > 0.15`), a slow segment envelope (7 per second, smoothed) and a quiet 300–900 Hz body, 12 ms attack; **chalk_tap** = a 4–6 ms high click (1.5–9 kHz) + a 150–190 Hz thud decaying in 35 ms; **eraser** = 250–2200 Hz noise with a back-and-forth envelope `|sin(2π·3.6t)|^0.6`. The chalk scratch is deliberately discreet (SFX p95 ≈ 36 dB under the voice with the kit's ducking); if it disappears on listening, raise the `chalk` events by 3 dB and re-check the balance.

**Music:** `music:282` (Sweet September, calm lo-fi hip hop) — reference. The catalog `drop_s` is 3, but the beat really enters at **12.45 s** of the file: produce with `heditor produce <work> music:282 12.45`. Sections: the keys intro (src 0) `full −3 dB` for the hook; `lowpass 0 dB` with continuous `src` through the explanation (the filtered beat enters by itself at src 12.45); a 0.26 s **silence** before the recap; `full −1 dB` from `drop_s − 0.04` on the first word of the recap through the CTA, 1.2 s fade, `cta_boost_db` 5. Add 4–7 dB dips with `silence` sections (absolute `gain_db`, `src` untouched) on the weak-voice windows (breaths, word tails) that `balance` points to. Reference balance: music −21.5 dB median, background −12.49 dB p95, 0 % windows within 10 dB. Alternatives: `music:31` (inspiring piano and strings) for a warmer class, `music:955` (emotional piano) for a reflective lesson.

```json
[{"start":0,"end":"STEP_BACK","mode":"full","gain_db":-3,"track":"A","src":0.0,"fade_in":0.02,"fade_out":0.05},
 {"start":"STEP_BACK","end":"RECAP_PREV_WORD+0.16","mode":"lowpass","gain_db":0,"track":"A","src":"STEP_BACK","fade_in":0.05,"fade_out":0.12},
 {"start":"RECAP_PREV_WORD+0.16","end":"RECAP-0.04","mode":"silence"},
 {"start":"RECAP-0.04","end":"DURATION","mode":"full","gain_db":-1,"track":"A","src":12.41,"fade_in":0.02,"fade_out":1.2},
 {"start":12.7,"end":13.3,"mode":"silence","gain_db":-4}]
```

## CTA design inside the style

The eraser clears the summary chain (1.0 s) and leaves the title, "SUMMARY" and the syllabus with every ✓, so the lesson stays visible. Then, all in chalk: "Homework:" in yellow with an underline, the thematic question in three lines at 58 px ("Which producer, queue / and broker do you / use today?"), "Tell us in the comments" (exact `brand.json` text) in yellow, the logo inside a hand-drawn chalk square, the @handle at 54 px, and a chalk-drawn **Follow** button: the chalk taps it, a grainy yellow fill (masked by the chalk grain) sweeps in and "✓ Following" appears in dark text. The camera shows its last frame as a still. ≥ 5.5 s after the last word. Button words exactly as in `brand.json`.

## Implementation notes

The whole board is **a pure function of time**: `render(t)` is called by a single tween (`tl.to(clock,{t:D,duration:D,ease:'none',onUpdate:()=>render(clock.t)},0)`), so it is deterministic and seeks correctly to any frame. Everything is generated by `build.py` from the reviewed words.

**1. Sync every stroke to its word.** Take every trigger from `words-reviewed.json` with `rk.finder` (`after=` disambiguates repeated words), assert that every key is finite and that the keys are in speech order, and start each main stroke 0.04–0.06 s before the word (the hand anticipates). Short labels that complete a shape follow 0.1–0.5 s after it, inside the same sentence; ✓ marks, complementary labels and closing underlines are "consequences". Re-validate the keys after every new `prepare`.

```python
f = rk.finder(rk.load_words(WORK / "words-reviewed.json"))
k = {"producer0": f("producer"), "queue0": f("queue"), "producer1": f("producer", 6.0), "publishes": f("publishes")}
for a, b in zip(order, order[1:]):
    assert k[a] < k[b], (a, k[a], b, k[b])
S("L1", B.rect(70, 408, 570, 392, over=14), "b", k["producer1"] - 0.05, 0.62, act="PRODUCER box")
```

**2. A board registry.** One `Board` collects the SVG of each layer (`L0` title + syllabus, never erased; `L1` explanation; `L2` summary; `L3` CTA) and a compact table per element `[id, kind(0 stroke | 1 text), t0, dur, length|width, x, y, size, colour index, tip?, ease]` passed to the page as `K.els`, plus an `actions` log (what, t0, end, kind) used for the SFX and for the sync table.

**3. Hand jitter.** Resample every polyline every 4 px and offset it along its normal by two low-frequency sines with random wavelengths (110–220 px and 28–55 px), amplitude 1.3–1.8 px, from a fixed-seed RNG. Box corners get ±3 px jitter and an overshoot at the end (the stroke closes past its start); circles get a 2.5 % radius wobble and a 350–375° sweep (they do not close exactly). Long strokes get a **double stroke**: a second, thinner (0.45 × width, 45 % opacity) copy offset by (1.3, −0.9) px and started 0.02 s later.

```python
def hand(self, pts, amp=1.3, step=4.0):
    p = resample(pts, step)                                   # points every `step` px
    d = np.r_[0, np.cumsum(np.hypot(*np.diff(p, axis=0).T))]
    tg = np.gradient(p, axis=0); nv = np.column_stack([-tg[:, 1], tg[:, 0]])
    nv /= np.linalg.norm(nv, axis=1)[:, None] + 1e-9
    l1, l2 = self.rng.uniform(110, 220), self.rng.uniform(28, 55); f1, f2 = self.rng.uniform(0, 6.283, 2)
    off = amp * (0.7 * np.sin(2 * np.pi * d / l1 + f1) + 0.3 * np.sin(2 * np.pi * d / l2 + f2))
    return p + nv * off[:, None]
```

Arrows are two strokes (shaft, then a two-segment head at ±0.5 rad, 20 px), never `marker-end`; braces are two cubic Béziers; checks are a three-point polyline.

**4. The render loop** (JS): cache the last progress of each element and skip it when unchanged (most elements are idle on most frames).

```js
function prog(e,t){let p=(t-e.t0)/e.d;p=p<0?0:(p>1?1:p);return e.ease?0.5-0.5*Math.cos(Math.PI*p):p;}
for(const e of EL){const p=prog(e,t);if(p===e.last)continue;e.last=p;
  if(e.kind===0){e.n.style.strokeDashoffset=(e.len*(1-p)).toFixed(2);e.n.style.opacity=p>0?1:0;}
  else{e.r.setAttribute('width',((e.len+16)*p+(p>0?6:0)).toFixed(1));e.n.style.opacity=p>0?1:0;}}
```

**5. Chalk texture.** One SVG filter on one group that holds every chalk layer, limited to the slate with `filterUnits="userSpaceOnUse"`, plus a grain mask on the whole SVG:

```html
<filter id="chalkf" filterUnits="userSpaceOnUse" x="40" y="246" width="1000" height="1300">
 <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="11" result="n"/>
 <feDisplacementMap in="SourceGraphic" in2="n" scale="3.4" xChannelSelector="R" yChannelSelector="G" result="d"/>
 <feGaussianBlur in="d" stdDeviation="3.2" result="h"/><feComponentTransfer in="h" result="h2"><feFuncA type="linear" slope="0.42"/></feComponentTransfer>
 <feGaussianBlur in="d" stdDeviation="0.3" result="c"/><feMerge><feMergeNode in="h2"/><feMergeNode in="c"/></feMerge></filter>
```

The halo (blur 3.2 at 42 %) is the chalk dust around the line; the 0.3 blur softens the core. The grain mask is a 512×512 alpha PNG generated with numpy (fine specks `^0.55`, low-frequency irregular deposits, a faint horizontal vein, 9 % near-empty holes), applied with CSS `mask-image` repeated at 512 px; it is fixed in space like the roughness of a real slate. The slate itself is a generated 500×650 PNG scaled ×2 (base colour, low-frequency blotches, 14 arcs of old eraser marks, fine noise) with a soft sheen and a vignette; no third-party textures.

**6. Chalk dust.** 16 circles; every 0.05 s a particle is born at the active tip (position from a hash of the birth time, so it is deterministic), falls with `y = tip + 5 + 26·age + 150·age²`, drifts sideways ±18 px, radius 0.9–2.6 px, opacity 0.6 → 0 over 0.75 s, colour of the stroke.

**7. Eraser by mask.** Each erasable layer has a `<mask>`: a white rect plus a near-black path of the eraser's zigzag (`stroke-width` 150 = the eraser's length, round caps) drawn progressively with the same dash technique; the eraser element is positioned with `getPointAtLength` on that path. A visible smudge (the same path at 1.6 % white + four thin offset passes at 2–3 %) is revealed with it: that is the ghost and the haze. Passes are straight horizontal rows 128 px apart, alternating direction, with a 4 px sine sag.

**8. Camera.** `rk.styled_camera(work, "class", GRADE_VF)` with a light warm grade (`eq=contrast=1.05:saturation=0.94:brightness=0.005,colorbalance=rs=0.02:bs=-0.025:rh=0.015:bh=-0.015,unsharp=5:5:0.25`), a still of the last frame for the CTA (`ffmpeg -sseof -0.15 … -frames:v 1`), the three box states in `K.cfg.cam` (not in `plan.keys`).

**9. Sync table (QA).** Map each action prefix to its trigger key and a `consequence` flag, compute Δ = stroke start − word start and write `qa/sync-table.md`; the gate is **every main stroke within ±0.15 s** of its word. See the troubleshooting recipe "Drawing synced to speech".

## Pitfalls found in production

- **Chalk looked "too clean, digital"**: displacement 2.6 → 3.4, add the dust halo, irregular low-frequency deposits and a horizontal vein in the grain mask, jitter the box corners, more tremor. Vision went from 6/10 to "convincingly chalk-like".
- **The eraser "did not read as erasing" and its band was wider than the eraser**: stand it upright so its length is the band (150 px eraser = 150 px mask), straight horizontal passes, 2.0 s instead of 1.7 s, a 2 % ghost and a lighter grainy trail. Result: "reads as erasing", no stroke left over.
- **The eraser rested over the caption band**: rest it lying at the right end of the tray.
- **A label touched its box border**: move the box (not the label) and redistribute the circle and underline drawn on it; check on a native crop.
- **Arrow labels with the wrong agreement**: an arrow leaving "US" labelled "uses" read as a grammar error. Label arrows from the point of view of the subject that acts ("we use", "we pay"), in the language of the speech.
- **Small chalk labels were hard to read on a phone**: 32 → 36 px minimum and a lighter grain mask on text than on lines.
- **The closing camera was too small**: 426×320 → 456×342; the hero went 840×630 → 880×660.
- **A stroke started 0.40 s from its word**: move it to a later occurrence of the same word in the sentence instead of widening the tolerance, and shift the dependent marks (underline, closing mark) after it.
- **Render cost**: the SVG filter on a 1000×1300 layer is the heaviest part (previews ≈ 2.3 s per frame on a 4-core VPS). Keep one filtered group, no `backdrop-filter`, one camera video, light grain; if the encode times out, render with `PRODUCER_ENABLE_CHUNKED_ENCODE=true FFMPEG_ENCODE_TIMEOUT_MS=7200000`. If it is still too heavy, keep only the grain mask and the tremor.
- **Vision timed out on large sheets** (> ~1100 px): review strips of 3–4 frames, including strokes caught half-drawn.
- **Expected gate noise**: `freezedetect` flags the CTA (camera still for 6 s and a question written in steps); the top margin measures ≈ 312 px because the wood frame above is dark (luma < 150).
- **Vision notes kept as choices**: the yellow-smear active word is "a bit generic" (a variation below changes it); the chalk stick has no hand on purpose, a drawn hand verges on caricature.

## Variations

- **Whiteboard with markers**: white board, four marker colours, a squeaky marker SFX; for corporate trainings (no texture filter, cheaper to render).
- **Teacher's notebook under a document camera**: squared paper seen from above, a pen and a ruler; for maths or step-by-step calculations.
- **Glass board in the dark**: neon strokes on glass in front of the speaker (needs `depthkit` for the matte); for "behind the scenes of a system" topics.
- **Different caption**: the active word underlined in yellow chalk instead of the smear, or the caption written live by the same chalk stick.
- **Paid-ad version**: the homework becomes "Learn more" written on the board and a chalk button (Paid-ad variant safe area).
