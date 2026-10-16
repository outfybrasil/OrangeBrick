---
style: documentario
name: Documentário (cinematic mini-documentary)
family: fixed-style
best_for: personal stories, career or company journeys, "how I got here" testimonies and calm, reflective advice with a turn and a caveat
reference: produced by PycodeBR (Felipe Azambuja), October 2026
---
# Documentário (cinematic mini-documentary)

The talking head becomes a short biographical documentary in three chapters. The frame is a letterboxed cinema
shot: a pure black bar on top (where the chapter title lives), a wide warm-graded image band in the middle
(the camera, full width, no card, no border) and a black bar below (where documentary subtitles live). Overlays
are drawn *on the image itself*, the way a history documentary draws thin maps over archive footage: a big
date that resolves out of blur, blank paper sheets drifting down, two fine lines running in parallel, points of
light forming a network, an ink arc crossing a gap. The viewer should feel they are watching a quiet, honest
mini-series about a real decision, not an ad. Core metaphor: **a life told in chapters**.

## When to use / when not to

Use it when the speech:
- tells a personal or company story with a before/after (a job, a move, a first client, a long transition);
- has a natural three-act shape: context → what happened in parallel / in between → the next step;
- contains one sentence worth a pull quote (a caveat, a lesson, a thesis);
- benefits from calm credibility more than from energy (advice, reflection, "it took me years").

Avoid it when:
- the cut is a fast list, a tool demo or a hot take: the slow grammar kills momentum (use a high-energy style);
- the speech has no dated or concrete fact to open with and no line worth quoting;
- the cut is under ~25 s: three chapters will not breathe (see the two-chapter variation);
- the speaker's face sits at the very top of the source frame: the overlays need the space above the head.

## Signature moves

1. **Letterbox frame**: black bar 270–455 px, image band 455–1255 px (1080×800), black bar 1255–1920 px.
   Camera at full width, no rounded card, no border, no blurred background copy.
2. **Chapter system**: tracked gold small-caps label ("— CHAPTER I —", Roman numerals only) over an ivory
   Playfair italic title in the top bar; chapter II gets a full fade-to-black title card, chapter III a title
   that blurs in *over the image* and then settles into the bar.
3. **Documentary subtitles**: sentence-case Fraunces in the bottom black bar, hand-cut meaning units of up to
   two balanced lines; the active word turns pure white and an underline in aged gold draws itself under it.
4. **Two-camera grammar**: every jump cut swaps between a wide (1.00) and a tight (1.09) framing centred on
   the tracked face; inside each segment a slow 3.5 % push-in. No punch, shake or white flash, ever.
5. **Thin overlays on the image**: big date or number from the speech, blank paper sheets, fine-line maps,
   points of light, an ink arc. Only lines, paper and light: no icons, no boxes, no panels.
6. **Film texture**: warm desaturated grade, amber soft-light veil, inner vignette, animated grain, a seeded
   exposure flicker, and amber light leaks at the emotional turns.
7. **Pull-quote card**: the key sentence leaves the subtitle bar and is set word by word in large Playfair
   italic above the face, with a gold opening quote mark, while the image dims to 78 %.
8. **Rolling end credits as CTA**: the band fades to black and credits roll up: question, invitation, rule,
   logo, `@handle` and an outlined Follow button that fills with pale gold and becomes Following.
9. **Organic sound**: emotional piano/strings in sections, with a half-second silence on the chapter card;
   SFX only from paper, pen, clock, cymbal swell and a soft ding. No whooshes, impacts, pops or beeps.

## Frame and layout

Canvas 1080×1920, 30 fps. Absolute y unless noted ("band y" = y inside the image band, add 455).

| Zone | y (px) | Content |
|---|---|---|
| Safe top | 0–270 | black + grain only (`rk.SAFE_TOP`) |
| Top bar | 270–455 | chapter label at y 318 (30 px), title below it (70 px); first lit pixel must be ≥ 312 |
| Image band | 455–1255 | camera 1080×803 (`object-fit:cover`), overflow hidden |
| ↳ shelf zone | band y 30–210 | big date, line maps, horizon line, chapter III title: the area above the head |
| ↳ side columns | band x 50–320 and 730–935, band y 210–770 | falling paper, light points |
| ↳ face rectangle | from face track (reference: band x 360–700, band y > 170) | never covered |
| Bottom bar | 1255–1920 | subtitle box x 70, y 1292, 940×210; only black below 1560 (platform UI) |

- Prepare the camera with `rk.prepare_camera(work, width=960)` and scale it to 1080 wide in CSS. If the source
  is not ~4:3, keep the band at 800 px tall and let `object-fit:cover` crop; then recompute the face rectangle.
- Compute the face exclusion rectangle from `rk.track_faces` (median x/y × 1080/803, ± ~170 px horizontally),
  and place every overlay outside it. Re-check in previews: hands and hair move.
- Keep the right ~120 px of y 1000–1700 free of anything critical (Reels UI). In this style that region is
  black bar anyway; do not push the subtitle wider than 940 px.

## Palette and typography

| Role | Hex |
|---|---|
| Bars, stage | `#000000` |
| Aged gold (rules, underlines, labels, outline) | `#e2b866` |
| Pale gold (map label, arc, button fill, dot) | `#f7d993`, `#f0cf87`, `#f3d58e` |
| Ivory (titles, date, quote) | `#f6efe1`, map labels `#fbf6ec` |
| Paper | `#efe6d2`, grid `#c9bea8`, header strip oxblood `#7c3026`, rings `#2a1712` |
| Subtitle: upcoming / spoken / active | `#cdc6b9` / `#e8e2d6` / `#ffffff` |
| Light points | core `#fff3dc`, glow `rgba(255,196,110,.42)`; links `#f3dcaa` at 55 % |
| Credits sub-line | `#d9d2c5` |

Fonts (OFL, from the google/fonts repository; copy into `composition/assets/` with their OFL.txt):
- **Playfair Display**: `ofl/playfairdisplay/PlayfairDisplay-VF.ttf` and `PlayfairDisplay-Italic-VF.ttf`.
  Italic 500 for chapter titles, the big date, map labels, the quote and the credits question.
- **Fraunces**: `ofl/fraunces/Fraunces-VF.ttf` (+ Italic). Subtitles (430, `opsz 72`,
  `SOFT 30`), chapter labels (500, uppercase, `letter-spacing:.32em`), button text and credit sub-lines.

```css
@font-face{font-family:Playfair;src:url('assets/PlayfairDisplay-VF.ttf');font-weight:400 900;font-display:block}
@font-face{font-family:Playfair;src:url('assets/PlayfairDisplay-Italic-VF.ttf');font-weight:400 900;font-style:italic;font-display:block}
@font-face{font-family:Fraunces;src:url('assets/Fraunces-VF.ttf');font-weight:100 900;font-display:block}
.cn{font:500 30px/1 Fraunces,serif;letter-spacing:.32em;text-transform:uppercase;color:#e2b866}
.ct{font:italic 500 70px/1.12 Playfair,serif;color:#f6efe1;margin-top:12px}
.chap{position:absolute;left:0;top:318px;width:1080px;text-align:center;opacity:0}
```

## Caption system

Look: no pill, no outline, no uppercase. Fraunces 68 px / 1.24, centred, `text-wrap:balance`, up to two lines,
in a fixed 940×210 box at y 1292 on pure black. Each caption is a **meaning unit** (a clause, ~14–34 chars),
cut by hand from the reviewed words, not by the kit's 3-word grouper. Write them as a `PHRASES` list and
assert they join back to exactly the spoken tokens, in order, once.

Behaviour per caption: fade in 0.14 s `sine.out` at first word −0.06 s; fade out over the last 0.1 s; end at
last word +0.22 s or 0.07 s before the next caption. Per word:
- upcoming `#cdc6b9`; on its start (−0.02 s) it becomes `#ffffff` with a soft glow and a 5 px `#e2b866`
  underline that draws `scaleX 0→1` in `min(0.12, gap×0.45)` s `power2.out`;
- at the next word it becomes `#e8e2d6` and the underline retracts in 0.09 s `power1.in`.

Contrast spec: active word pure white on pure black (21:1) plus a gold underline as a second cue; upcoming
grey must still read "high" in enlarged crops (a darker `#a9a296` was rated only "medium"). Check crops of at
least four timestamps, including one in the quote card.

```python
PHRASES = ["A short sentence that opens the story.", "Then the second idea,", "..."]

def phrase_groups(words):
    groups, i = [], 0
    for p in PHRASES:
        n = len(p.split()); g = words[i:i + n]
        assert " ".join(w["shown"] for w in g) == p, (p, [w["shown"] for w in g])
        groups.append(g); i += n
    assert i == len(words)
    return groups

def word_js(sel, start, nxt):
    gap = (nxt - start) if nxt is not None else 1.0
    d = round(min(0.12, max(0.02, gap * 0.45)), 3)
    js = [f'tl.set("{sel}",{{color:"#ffffff",textShadow:"0 0 18px rgba(255,236,200,.45)"}},{start:.4f});',
          f'tl.fromTo("{sel} .u",{{scaleX:0}},{{scaleX:1,duration:{d},ease:"power2.out",immediateRender:false}},{start:.4f});']
    if nxt is not None and nxt > start:
        js += [f'tl.set("{sel}",{{color:"#e8e2d6",textShadow:"0 0 0 rgba(0,0,0,0)"}},{nxt:.4f});',
               f'tl.fromTo("{sel} .u",{{scaleX:1}},{{scaleX:0,duration:.09,ease:"power1.in",immediateRender:false}},{nxt:.4f});']
    return js
```

```css
#capzone{position:absolute;left:70px;top:1292px;width:940px;height:210px;z-index:10}
.caption{left:0;top:0;width:940px;height:210px;display:flex;align-items:center;justify-content:center}
.cap{width:940px;text-align:center;font:430 68px/1.24 Fraunces,serif;font-variation-settings:'opsz' 72,'SOFT' 30;
     color:#cdc6b9;opacity:0;visibility:hidden;text-wrap:balance}
.w{position:relative;display:inline-block;color:#cdc6b9}
.w .u{position:absolute;left:3%;right:3%;bottom:-3px;height:5px;border-radius:3px;background:#e2b866;
      transform-origin:0 50%;box-shadow:0 0 10px rgba(226,184,102,.6)}   /* scaleX set by gsap, not CSS */
```

Each word span is `<span id="cap-N-wJ" class="w">word<i class="u"></i></span>`. During the pull quote, the
subtitle groups covering that sentence are **hidden** and the same tokens animate inside the quote card with the
same `word_js`; record this in the plan (`caption_render.hidden_in_quote_card`) so token tests still pass.

## Scene grammar

Split the speech into three chapters at its two natural turns (a sentence end followed by a change of subject).
Title each chapter with 1–4 words that paraphrase it (e.g. "The day job", "In parallel", "The next step").
Use Roman numerals: no digit may appear on screen unless it was spoken.

| Beat | Treatment (generic example: a speaker explaining how they built a side project before quitting) |
|---|---|
| Cold open (0–3.3 s) | First frame already graded, chapter I in the bar. On the spoken date/number ("last spring"), it appears in Playfair italic 132 px across the shelf zone: letters stagger 0.025 s from `blur(12px)`, y +18 → sharp; ~1.1 s later they dissolve upward one by one (y −46…−74, blur 14 px, 0.7 s `power1.in`). |
| Context (chapter I) | Archive props: 6 blank calendar sheets (paper, oxblood strip, two rings, empty grid) fall slowly down the side columns, 1.12 s apart, 3.2–3.8 s each, rotating. A two-line map in the shelf zone: line A ("the job") draws from the first word of the story until the moment it ends (duration = speech span); line B ("the project") starts dotted when it is first named, turns solid and thickens 3 → 12 px with a gold glow when the speaker commits to it. A tick and a small date label mark where line A ends. |
| Chapter turn I → II | Fade the band to black in 0.32 s; centred card in the band: label 34 px, title 112 px, a 200 px gold rule drawing in 0.6 s; music silent 0.55 s. Card out at +0.95 s, camera back in 0.85 s, chapter II title enters the bar at +1.35 s. |
| Explanation (chapter II) | Let one plain sentence play on camera alone first. Then a constellation: ~24 light points appear outside the face rectangle on the words that describe accumulation (contacts, clients, small wins), each linked to its nearest earlier point by a fine line drawn in 0.6 s. On "one… and another" two lit points get gold halos. Clear everything 0.2 s after the next turn. |
| Turn → III | Amber light leak crosses the band; chapter III title blurs in over the shelf zone (0.6 s), holds 1.4 s, then the bar title appears at +1.8 s. |
| Payoff (chapter III) | A horizon line with a gap. A gold dot pulses on the hesitant word ("maybe"); on the decisive word ("leap", "bet") an ink arc draws across the gap and the dot rides it; on the commitment phrase the far line turns solid gold and thickens: an echo of line B. |
| Result line | Warm soft-light veil fades in over 1.2 s, second light leak, music starts its crescendo. |
| Pull quote | The caveat or thesis sentence: camera to 78 %, a dark gradient over the top 330 px of the band, gold quote mark 170 px and the sentence in two lines of Playfair italic 84 px at y 300–690, word by word. Face stays visible below it. Out 0.5 s before the next sentence. |
| Close | Last sentence back on camera, then a slow band fade to black ending exactly at voice end (start ≈ voice_end − 0.84 s). |
| CTA (7 s) | Rolling credits (see CTA design). |

Only animate what the speaker literally says or clearly implies; every overlay is anchored to a word time from
`rk.finder(words)`. One overlay family per chapter keeps the chapters distinct.

## Transitions and motion vocabulary

- **Hard cut** on every EDL cut: framing swap 1.00 ↔ 1.09, transform-origin = segment's median face.
- **Push-in**: `scale 1 → 1.035`, segment duration, `sine.inOut`.
- **Slow fades**: band to black 0.32 s `sine.in` at chapter II; 0.85 s back; final fade ~0.8 s `sine.inOut`.
- **Light leak**: a 1000×1300 elliptical amber radial gradient (`rgba(255,170,80,.36)` centre), `mix-blend-mode:screen`,
  travelling x 0 → 2100 over 1.9–2.4 s, opacity up in 40 % of it, down in the last 45 %.
- **Blur resolves**: titles and the date enter from `blur(8–12px)`; dissolves go back to blur.
- **Line drawing**: SVG `stroke-dasharray = length`, animate `strokeDashoffset length → 0`, `sine.inOut` or `none`.
- Easings allowed: `sine.*`, `power1/2.*`. Forbidden: `back`, `elastic`, `bounce`, `expo` snaps, `shake()`,
  `punch()`, `flash()`, confetti, speed lines.

## Sound design

Voice first (`rk.mix` defaults). About one SFX every 2.5 s at most, each tied to a visible action:

| Action | Category | Gain dB | Length s |
|---|---|---|---|
| Date/number resolves | `clock_tick` | −25 | 0.55 |
| Second time reference (optional, max 2 ticks, never a countdown) | `clock_tick` | −28 | 0.9 |
| Line starts drawing, arc, credits rule | `pen_write` | −24 … −27 (credits −21) | 0.7–1.3 |
| Paper sheet falls (every other sheet) | `page_turn` | −24 | — |
| Chapter card / chapter III title / credits start | `page_turn` | −19 … −21 | — |
| Gold halo appears | `lightbulb_ding` | −29 / −30 | 0.9 |
| 2.2 s before the pull quote and before the final fade | `cymbal_swell` | −27 / −25 | 2.2 |
| Follow tap | `mouse_click` | −18 | 0.25 |
| Following | `lightbulb_ding` | −21 | 1.0 |

Never: `whoosh`, `bass_impact`, `trailer_hit`, `pop`, `data_beep`, `glitch`, risers.

Music: emotional, piano-led, one track for the whole piece.
- `music:955` (I Believe 2), first choice: strings enter ~6 s into the file → align that on the cold-open fact;
  a valley around 28–29 s and a lift at ~30 s → land the lift on the first word of the pull quote.
- `music:31` (Dreaming Big): brighter, for a story with a clearly happy ending; lift around 73 s.
- `music:187` (Mountains): hopeful electronic build for tech or product journeys; lift around 47 s.

Section plan (times from the reference; adapt to the new speech):

| Section | Mode | Gain dB | Note |
|---|---|---|---|
| Cold open + chapter I | `full` | −4 | `src` chosen so the strings enter on the fact |
| Chapter card | `silence` | — | 0.55 s |
| Chapter II | `lowpass` | −5 | memory, intimate; fade in 0.6 s |
| Chapter III | `full` | −4 | opens up |
| Result line → quote | `full` | −5 | enter the valley so the lift comes next |
| Quote → voice end | `full` | −2.5 | lift lands on the quote |
| Credits | `full` | 0 | `cta_boost_db: 4`, `fade_out: 1.6` |

Set `music_ref` to the chapter II–III body so normalisation ignores the loud ending. The reference measured
music −23.6 dB under the voice median and background p95 −17.1 dB under the voice.

## CTA design inside the style

No grid card, no hand cursor, no ripple. At `voice_end + 0.15` a `#roll` layer becomes visible and slides from
y +1150 to 0 in 3.0 s `power2.out`, over black:

| Element | y | Spec |
|---|---|---|
| Question tied to the story ("Are you building something next to your job?") | 520 | Playfair italic 500, 74 px, `#f6efe1`, balanced, width 920 |
| Invitation ("Tell us how you organise it in the comments") | 822 | Fraunces 400, 46 px, `#d9d2c5` |
| Rule 120×2 | 912 | `#e2b866`, draws at +2.6 s with `pen_write` |
| Logo 96×96 | 950 | `assets/logo.png` from `rk.setup_assets` |
| `@handle` | 1060 | Playfair 500, 62 px, white, from `brand.json` |
| Button 360×84 | 1170 | 2 px `#e2b866` outline, radius 6; text Fraunces 40 px uppercase, `letter-spacing:.14em` |

At +4.35 s the fill (`#f3d58e`) wipes `scaleX 0→1` in 0.45 s (`mouse_click` at +4.32); the white label
(`brand.follow`) fades out at +4.4 and `✓ ` + `brand.following` in black fades in at +4.6 (`lightbulb_ding`),
with a soft glow. The roll fades out over the last 0.55 s. Total CTA: 7 s after the voice.

## Implementation notes

Build with reelkit: `load_words`, `finder`, `setup_assets`, `prepare_camera`, `track_faces`, `jump_segments`,
`prepare_voice`, `mix`, `sfx_library`, `music_path`. Write custom: the page HTML (do not use `rk.page`, its card
rig and Anton captions belong to other styles), phrase captions and their JS, scenes, quote card, credits.

Layer order inside `#stage`: `#band` (z 1: camera wrappers → `#grade` → `#warm` → `#band-vig` → `#flick` →
`#shade` → overlays → `#leak` → `#chapcard` → `#qdim`), `#topbar` (z 5), `#quote` (z 6), `#credits` (z 8),
`#capzone` (z 10), `#grain` (z 20). Register `window.__timelines.main = tl` (paused timeline).

```html
<div id="band"><div id="cam-fade"><div id="cam-zoom"><div id="cam-push">
  <video id="cam" class="clip" data-start="0" data-duration="VOICE_END" data-track-index="0"
         src="assets/camera-hd.mp4" muted playsinline></video></div></div></div>
  <div id="grade"></div><div id="warm"></div><div id="band-vig"></div><div id="flick"></div>
</div>
```

```css
#band{position:absolute;left:0;top:455px;width:1080px;height:800px;overflow:hidden;background:#000;z-index:1}
#cam-fade,#cam-zoom,#cam-push{position:absolute;left:0;top:0;width:1080px;height:803px}
#cam{left:0;top:0;width:1080px;height:803px;object-fit:cover;filter:sepia(.24) saturate(.7) contrast(1.07) brightness(.95)}
#grade{position:absolute;inset:0;mix-blend-mode:soft-light;
  background:linear-gradient(180deg,rgba(255,170,90,.16),rgba(120,70,30,.10) 60%,rgba(40,20,10,.25))}
#band-vig{position:absolute;inset:0;background:radial-gradient(ellipse 75% 70% at 44% 55%,rgba(0,0,0,0) 55%,rgba(0,0,0,.55) 100%)}
#flick{position:absolute;inset:0;background:#000;opacity:0}
#grain{position:absolute;left:-256px;top:-256px;width:1592px;height:2432px;background:url('assets/grain.png');
  opacity:.13;z-index:20;pointer-events:none;mix-blend-mode:screen}
```

```js
// after the S/TO/FT helpers (copy the first lines of rk.BASE_JS: tl, K, D, E, S, TO, FT, rnd)
TO('#grain',{x:256,y:256,duration:D,ease:'steps('+Math.round(D*12)+')'},0);
K.flicker.forEach(f=>S('#flick',{opacity:f[1]},f[0]));            // seeded in Python, 0–0.055 every 0.08–0.17 s
K.segments.forEach((sg,i)=>{const o=sg.x+'% '+sg.y+'%';
  S(['#cam-zoom','#cam-push'],{transformOrigin:o},sg.start);
  S('#cam-zoom',{scale:(i%2?1.09:1.0)},sg.start);
  FT('#cam-push',{scale:1},{scale:1.035,duration:Math.max(.3,sg.end-sg.start),ease:'sine.inOut'},sg.start);});
function leak(sel,t,d){FT(sel,{x:0,opacity:0},{x:2100,duration:d,ease:'sine.inOut'},t);
  FT(sel,{opacity:0},{opacity:1,duration:d*.4,ease:'sine.out'},t);TO(sel,{opacity:0,duration:d*.45,ease:'sine.in'},t+d*.55);}
// line drawn over the speech span between two anchor words
FT('#line-a',{strokeDashoffset:610},{strokeDashoffset:0,duration:K.endA-K.startA,ease:'none'},K.startA);
// dotted line revealed by a clip rect (animate the attribute, not a mask)
FT('#clip-r',{attr:{width:0}},{attr:{width:640},duration:K.endA-K.startB,ease:'none'},K.startB);
```

Deterministic randomness: compute positions and times in Python with `random.Random(SEED)` and pass them in
`window.K` (light points with a minimum spacing of 92 px, rejected inside the face rectangle and sorted from
top-centre outwards so the network "grows"; sheet x/rotation/drift; flicker sequence). Never call
`Math.random()` in the page.

Optional baked grade (faster render, approximately the CSS grade):
`rk.styled_camera(work, "doc", "colorchannelmixer=.854:.185:.045:0:.084:.925:.040:0:.065:.128:.791,eq=saturation=0.70:contrast=1.07:brightness=-0.03")`
then drop the CSS `filter` and point the video at `assets/camera-doc.mp4`. Compare a frame side by side first.

Light points: `16px` circles with `box-shadow:0 0 6px 2px rgba(255,236,200,.9),0 0 24px 9px rgba(255,196,110,.42)`;
halos 84 px with a 2 px gold border. Paper sheets: 150×184 px, radius 6, header strip 34 px, grid made with two
`repeating-linear-gradient`s, `box-shadow:0 18px 28px rgba(0,0,0,.45)`.

## Pitfalls found in production

- **Quote card covering the face.** The first version centred it on the band; move it above the face (y 300–690),
  dim the top of the band instead of blurring, keep the camera at 78 %.
- **SVG mask rendered as a black bar** over the date in the renderer. Reveal with a `clipPath` rect or opacity.
- **Overlapping chapter titles at turns.** Fade the old bar title out at the turn time; bring the new one in only
  after the card or the over-image title has left (+1.35 s / +1.8 s).
- **Map labels too small and low contrast** over the shelves: use 48 px Playfair italic with
  `text-shadow:0 2px 14px #000,0 0 4px #000`, pale ivory or pale gold.
- **Blank sheet did not read as a calendar** until it got the coloured header strip, two rings and a faint grid.
- **Light leak too strong** washes the face: keep the centre at ~.36 alpha with a screen blend.
- **Upcoming subtitle grey rated "medium"** in crops: lighten to `#cdc6b9`; the active word is white, not gold.
- **Numbers split letter by letter** failed the "numbers only from speech" test (loose digits): animate the
  words letter by letter but keep any number as a single span.
- **CSS transform vs GSAP**: a CSS `transform:scaleX(0)` on the underline produced ~90 lint conflicts; set the
  initial `scaleX` with `gsap.set` instead.
- **Heavy overlay warning**: ~40 radial-gradient elements were flagged and linked to black capture frames; use
  `box-shadow` for glows and linear gradients for paper.
- **Freeze detector** flags the deliberate holds (title card, credits on black); verify those frames by eye
  and do not "fix" them with motion.
- The camera clip ends at voice end; make the final fade finish before it to avoid a frozen last frame.
- A low-resolution webcam looks soft at full width; the grade, grain and vignette make that read as film
  rather than as a defect. Do not sharpen beyond `prepare_camera`.

## Variations

- **Case file** (investigations, debugging stories, post-mortems): paper sheets become index cards and the
  constellation becomes an evidence board joined by thin oxblood threads; `music:871` in `lowpass` for
  chapter II; `typewriter` replaces `pen_write`; chapter titles read like case headings.
- **Archive timeline** (history of a company, a technology, a career): the shelf zone carries a single long
  timeline with markers only for spoken dates; `newspaper` for chapter cards; `music:31`; the quote card becomes
  a "headline" in Playfair 700 roman instead of italic.
- **Field notes** (process, craft, growth): lines become branches or growth rings drawn in pale gold, light
  points become seeds; `music:187`; cooler grade (`sepia(.12) saturate(.8)` with a greener soft-light veil).
- **Two-chapter short** (under ~25 s): cold open + chapter I, skip the chapter II card, use the over-image title
  for the single turn, keep the pull quote and a 5 s credit roll.
