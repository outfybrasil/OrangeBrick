---
style: impacto
name: Impacto
family: fixed-style
best_for: opinionated explainers and arguments where one or two key words carry the whole point (a speaker who wants a "punch" without losing a calm, readable layout)
reference: produced by PycodeBR (Felipe Azambuja), October 2026
---
# Impacto

The frame is split into two zones: a **board** on top where the argument is drawn as cards and a **camera window** below where the speaker stays real and fully visible. Captions sit on the **seam** between the two. Most of the video is calm and readable: navy surfaces, white text, and gold and cyan used to label ideas. Two or three times per video, on the words the whole argument depends on, everything hits together. The camera steps in, the word lands as large type with a gold ring that flashes and fades, a cyan underline shoots out, and a short riser resolves into a low slam exactly on the spoken syllable. Then the frame settles again. The core metaphor is **a punctuation mark in the argument**. The impact means something because it is rare.

## When to use / when not to

Use it for:
- Opinion or contrast pieces ("you pay for the result, not for the tool"), myth vs. fact, objection handling, offers framed as a question.
- Screen-share or webinar recordings, where a shared screen or a diagram sits above and the speaker below. It also works for a plain talking head when the board is drawn entirely with motion graphics.
- Speakers with a steady cadence, where two clear peak words can be found in the transcript.

Avoid it for:
- Emotional storytelling or vulnerable confessions. The slams read as aggressive. Use a softer style.
- Clips with no clear peak word. If everything is emphasised, nothing is. Pick a flatter style instead.
- Very low-resolution cameras (below ~540 px wide). The 1.12× lens zoom will show the softness.
- Pure screen tutorials where the screen needs the full height. The board is only ~640 px tall.

## Signature moves

1. **Board / seam / camera split.** The graphics board is on top, the captions sit on a gold seam, and the camera fills the full width below. The layout never changes during the body. Only the content on the board changes.
2. **Lens ladder on peak words.** The camera scales in steps (1.025 → 1.045 → 1.085 → **1.12**) on the build-up words and peaks *on* the key word. It eases back to 1.055, then to 1.0. Captions never ride the zoom.
3. **Micro-jolt at the peak.** A 7 px / 2 px offset that resolves in ~0.20 s, inside a fixed crop window. It is a nudge, not a shake.
4. **Ring + streak resolve.** The key word enters at 1.19× scale and settles. On the exact word time, a gold rounded outline flashes (opacity 0.82 → 0 over 0.60 s) and a cyan streak shoots under it. The outline never stays as a permanent frame.
5. **Focal question card.** For the central question or claim, a temporary card replaces the board. Its lines are revealed word by word with the speech, in a 4-line type hierarchy (small / BIG / small / BIGGEST in gold). Then the previous board content returns. The two texts are never mixed.
6. **Semantic two-accent colour.** Gold = result, delivery, the finished thing. Cyan = tools, actions, connections. Colour tells the viewer which side of the argument a word belongs to.
7. **Riser → slam sound grammar.** A 0.38–0.42 s riser ends exactly on the peak syllable, where a short low bass impact hits. Lighter "attack" and "snap" hits mark the build-up words. These are the only loud SFX in the video.
8. **Purposeful in-board transitions.** Veil pushes (with a cyan edge and a gold edge), a whip for the objection, an iris zoom into the solution and a paper wipe into deliverables. Each one is centred on the cut, and the sound peaks on the cut.

## Frame and layout

Canvas 1080×1920, 30 fps. Coordinates are absolute in px.

```
y    0–270   SAFE TOP: background #03090e only. No logo, name, text or face.
y  290–930   BOARD  x 0–1080, content column x 84–996 (padding 84)
             screen-share mode: shared screen backdrop x 46–1034, y 300–790,
             radius 22, border 1px #2a576f, plus a shade gradient to #03090e
y  944–1096  CAPTION SEAM  text box x 120–960 (centred on 540), 152 tall
y 1106–1109  seam rule  x 84–996, 3 px, #edc58088
y 1124–1920  CAMERA WINDOW  1080×796, overflow hidden, fixed
             inner #camera-lens carries every zoom/jolt, transform-origin 50% 38%
y 1570–1920  bottom 350 px: camera pixels only, no text
x  960–1080, y 1000–1700: no critical text (platform buttons)
```

- **Camera treatment.** Crop to the face and re-centre it. Frame head and shoulders so the eyes land ~35–40 % down the window (≈ y 1400). Use `object-fit: cover` and never stretch. Apply only a natural, light grade. The lens wrapper is the *only* element that scales. The window (`.camera-shell`) stays fixed, so the crop edge never moves.
- **Screen-share mode.** Crop the shared screen to remove menus, tabs, the dock and participant names. Place it as a dimmed backdrop at the top of the board. Cards overlay it. Only show it when it is relevant to the speech. Otherwise use the plain navy board.
- **Talking-head mode.** No screen source. The board is pure motion graphics on `#03090e` with `#0e283a` cards. Take the camera from the same source, cropped to the face.
- **CTA** is the only full-frame scene (see below).
- The board content area is ~912×640. Cards use `#0e283a`, a 1–2 px `#2a576f` border and a radius of 20–28 px.

## Palette and typography

| Role | Hex |
|---|---|
| Background (near-black navy) | `#03090e` |
| Surface / cards | `#0e283a` |
| Surface highlight (iris centre) | `#163e56` |
| Window bar | `#061724` |
| Hairline border | `#2a576f` |
| Primary text | `#f3f9fc` |
| Secondary text | `#b9cbd6` |
| Gold: result, delivery, emphasis | `#edc580` |
| Ink on gold buttons | `#302515` |
| Cyan: tools, actions, links | `#7dd3fc` |
| Paper document / ink | `#f2f5ef` / `#102836` |

- **Font:** **Geist** (google/fonts, OFL). Use only weights 300 and 700. 300 for set-up lines and labels, 700 for captions and key words. Set letter-spacing tight on large type: −2 px at 66 px, −4/−5 px at 100+ px.
- **Scale:** board headings 61–80 px (300), key titles 101–139 px (700), card rows 32–43 px, captions 64–78 px.
- **Icons:** Lucide (ISC), stroke 1.45, 50–100 px, coloured cyan (tools) or gold (results).
- Never more than two accent colours. Do not use gold and cyan on the same word.

## Caption system

- **Look.** Geist 700, 68 px, line-height 1.13, letter-spacing −1.8 px, centred. Shadow `0 3px 4px #000a`. Up to 2 lines. No box by default.
- **Per act.** The hook uses 78 px with ≤3 words per group. Explanation uses 68 px with ≤4 words. The objection group uses 73 px inside a `#0e283a` capsule (radius 14) and drops *down* into place (y −12 → 0) instead of rising. Dense lists use 64 px.
- **Grouping.** Use `rk.captions(words, voice_end, max_words=4, max_chars=17)` for the body and `max_words=3` in the hook. Break after `.` or `?` when the group already has ≥2 words. Caption tokens must equal spoken words: no word duplicated or dropped across group boundaries.
- **Group entry.** opacity .92, y 14, scale .96 (.91 in the hook) → 1 in **0.10 s** `power3.out`. Groups end 0.045 s after the last word, or 0.025 s before the next group, whichever is earlier. Only one group is ever on screen.
- **Per word (progressive fill).** Unspoken words are `#f3f9fc`. At each word's start the colour switches to the act accent and stays there: gold for the hook, payoff and conclusion, cyan for explanation. Pre-pick 10–15 *important* words; these also get a scale pulse of 1.09 → 1 over 0.14 s `power3.out`.
- **Active-word contrast spec.** On `#03090e`, white ≈ 19:1, gold ≈ 12:1 and cyan ≈ 12:1, so every state is legible. The spoken/unspoken boundary relies on the hue shift. Check it in 2× crops of the seam. If gold and white blur together for a given encode, set unspoken words to `#c9d6de` rather than lowering the accent.
- **Never** place captions over the face. Never put them inside the lens wrapper. Never scale a whole group above 1.0 during a lens peak.

```python
# Python side: per-word fill JS for one caption group (cap = rk.captions(...) item)
IMPORTANT = {"result", "tool", "ready"}           # chosen per video
def caption_js(cap, accent):
    js = [f'S("#{cap["id"]}",{{visibility:"visible"}},{cap["start"]:.3f});',
          f'FT("#{cap["id"]}",{{opacity:.92,y:14,scale:.96}},'
          f'{{opacity:1,y:0,scale:1,duration:.10,ease:"power3.out",immediateRender:false}},{cap["start"]:.3f});']
    for j, w in enumerate(cap["words"]):
        sel = f'#{cap["id"]}-w{j}'
        js.append(f'S("{sel}",{{color:"{accent}"}},{w["start"]:.3f});')
        if w["word"].strip(".,?!").lower() in IMPORTANT:
            js.append(f'FT("{sel}",{{scale:1.09}},{{scale:1,duration:.14,ease:"power3.out",immediateRender:false}},{w["start"]:.3f});')
    js.append(f'S("#{cap["id"]}",{{opacity:0,visibility:"hidden"}},{cap["end"]:.3f});')
    return "".join(js)
```

## Scene grammar

Split the speech into 6–8 beats. Give each beat **one** board layout. The emphasis budget is **two focal moments per ~60 s**: the hook and the turn or central question. Add 4–6 lighter markers in total. Everything else gets small UI sounds and clean reveals.

| Beat | Board | Example (speaker on why backups matter) |
|---|---|---|
| **Hook / cold open** | No intro before the first word. A small set-up line (55 px, 300) plus a key title (134 px gold 700) inside a ring container, then a contrast line (46 px, `#b9cbd6`) on the negation word. Lens ladder plus ring/streak on the key word. | "You don't pay for storage. You pay for **RECOVERY**." |
| **Problem** | A window card (`#061724` bar, three dots, label) with 2–3 icon rows. Each row appears 0.08 s before its trigger word (y 28 → 0, 0.28 s `power3.out`). | "copy files" / "hope the drive works" / "find out too late" |
| **What's left** | Heading (80 px) plus task chips that slide in from opposite sides, with a gold arrow `→` at the right. | "You still restore by hand" |
| **Objection** | A circle with `?` (gold ring, pops from scale .6, rotation −20), then a 101 px two-line question with the key word in caps. | "Another **TOOL**?" |
| **Turn** | A flow: provider card → drawn arrow (stroke-dashoffset, 0.45 s) → client card with a gold border, then a gold badge with an icon. | "it's handled for you" |
| **Central question (focal card)** | A 4-line card is revealed word by word. Ring plus cyan rule on the final word. | "Want your files **SAFE**?" |
| **Proof / deliverables** | 2–3 paper documents (`#f2f5ef`, 290×320, gold check bubble). Each lands on its word: y 50, rotation ±5, scale .9 → `back.out(1.1)`. | "daily snapshot", "test restore", "report" |
| **Conclusion** | A gray set-up line plus a 108 px gold result line plus a navy chip. | "Sell the **result**" |
| **CTA** | Full-frame card (see CTA). | |

Rules: only use real facts from the speech. Never invent metrics, dashboards or client names. Do not add "illustrative" tags. Use stock/mockup visuals only if they are relevant, and keep their provenance in internal notes.

## Transitions and motion vocabulary

- **In-board transitions only.** The veil layer covers the board region (y 290–930), not the camera. Duration is 0.36 s (whip 0.28, paper 0.40). The transition is centred on the cut: `start = cut − d/2`.
  - **push ±1:** veil `#0e283a` with an 8 px cyan left border and an 8 px gold right border. It moves from x `−1180·dir` to 0 (`power3.in`), then to `+1180·dir` (`power3.out`).
  - **whip:** same as push but shorter. Use it for the objection beat.
  - **iris (zoom):** radial gradient `#163e56 → #0e283a → #03090e`. `clip-path: circle(0% → 100% → 0% at 50% 48%)`. Use it for the turn and the CTA (CTA version is full frame).
  - **paper:** a 100° gradient ending in gold with a 10 px gold edge. Use it to go into the deliverables beat.
  - Incoming content: x `150·dir` (iris: scale 1.12), blur 4–5 px, opacity .85 → clean in 0.32 s `power3.out`.
  - Do not repeat the same transition on consecutive cuts. Example sequence: push+, push−, whip, iris, paper, push+, iris.
- **Lens vocabulary** (on `#camera-lens`):
  - **base:** 1.025 at t 0, then 1.045 at 0.08 s (0.22 s).
  - **build:** 1.085 on the first stressed word (start 0.06 s before, 0.13 s `power3.out`).
  - **peak:** **1.12** (start 0.045 s before the word, 0.09 s `power4.out`).
  - **release:** 1.055 at peak + 0.22 s (0.45 s), then 1.0 over 0.62 s after the contrast word.
  - **cut settle:** 1.025 → 1 in 0.28 s `power2.out` on scene cuts. Use 0.34 s on silence-trim joins (skip joins within 0.5 s of a scene cut or inside a focal moment).
  - **jolt** (peaks only): x 7, y 2 in 0.04 s `power4.out` → x −4, y −1 in 0.05 s → 0, 0 in 0.10 s.
- **Board reveals:** `power3.out` for rows, `back.out(1.1–1.2)` for icons, chips and documents, `power4.out` for anything landing on a peak word.
- **Do not use** full-screen white flashes, recurring flicker, heavy rotation, face distortion, generic light sweeps on every scene, or `speedlines`/`confetti`. These kit helpers belong to louder styles.

## Sound design

The voice comes first, always. Build with `rk.mix(work, plan, rk.sfx_library())`. All SFX are ducked under speech. The two slams are the loudest events, and nothing else comes close.

| Action | Category | Gain (dB, rel.) | Notes |
|---|---|---|---|
| Peak-word slam | `bass_impact` (+ optional `trailer_hit` at −10) | −4 | exactly on the word start |
| Riser into a peak | `riser` (or `cymbal_swell`), length 0.38–0.42 | −16 | ends on the peak |
| Build-up word ("attack") | `pop` at rate 0.8 | −12 | 0.14–0.16 s |
| Negation / snap | `click` or `camera_shutter` | −12 | 0.16 s |
| Push / whip transition | `whoosh`, `swipe` | −12 / −10 | peak on the cut |
| Iris transition | `reverse_impact` | −11 | symmetric, peak on the cut |
| Paper transition / document lands | `page_turn` / `stamp` | −13 | 0.05 s before the word |
| UI row / software appears | `mouse_click`, `click` | −16 | |
| Task done / delivered | `success_chime`, `progress_complete` | −14 | |
| Objection beat | `error_ding` (soft) | −14 | no buzzer |
| CTA logo / Follow click / resolve | `magic_sparkle` / `mouse_click` / `success_chime` | −13 | |

- **Music direction.** Music is optional. The reference ran with **no music**: SFX only, plus a quiet sustained pad under the CTA. If the brief asks for music, use a restrained, tense, modern bed:
  - `music:568` (Focus on Yourself): tense electronic, the default.
  - `music:167` (Brainiac): futuristic tech topics.
  - `music:623` (Deep Urban): hypnotic, calmer explainers.
- **Section plan.**
  - Hook: `lowpass`, fade_in 0.3.
  - Body: `full`.
  - **Drop-out 0.25 s before each slam:** a `silence` section of ~0.25 s, then back to `full` on the slam. The gap makes the hit read.
  - Focal question card: `muffled`.
  - Payoff onwards: `full`.
  - CTA: `radio` with fade_out 0.65.
- **Drop placement:** the musical drop goes on the second focal moment (the turn or central question), never on the hook.

## CTA design inside the style

The CTA is a full-frame card with a `radial-gradient(ellipse at 50% 40%, #0e283a 0%, #03090e 68%)` background. Content padding is 290 top and 350 bottom. It enters through a full-frame iris. Adapt the length to the brief (typically 3–4 s). The wording and target come from the brief: follow, "learn more", or logo-only.

- Logo `assets/logo.png` 300×300 in a frame with a 1 px `#2a576f` border and radius 36. Enters at +0.08 s (scale .86, rotation −4 → 0, 0.48 s `back.out(1.1)`) with `magic_sparkle`.
- Comment question, 52 px 300 white, ≤ 2 lines, at +0.36 s. Example: "Tool or result: which would you pay for?"
- "Follow" 64 px 300, then the brand handle `@handle` at 96 px 700 (`#f3f9fc`), then a gold rule 620×4 (scaleX 0 → 1, 0.38 s).
- **Button:** at +1.45 s it pops from `scale .86, opacity .95` (not 0, so it passes contrast checks while scaling). It shows **Follow** on gold (`#edc580` bg, `#302515` ink, 51 px 700, radius 20, padding 22×80). At +2.05 s it gets `mouse_click`, a 0.92 → 1 squash, and switches to the **Following** state: transparent background, 3 px gold border, gold text, Lucide `check` icon. `success_chime` resolves it.
- Fade the content out over the last 0.45 s (`sine.in`).

## Implementation notes

Use reelkit for the plumbing (`setup_assets`, `prepare_camera`, `prepare_voice`, `load_words`/`finder`/`captions`, `ensure_icons`/`icon`, `mix`). Write the page HTML **yourself**: Impacto does not use `rk.page()`'s camera-card rig, and it does not use `K.segments` zoom. The lens ladder is the single owner of camera transforms.

```html
<div id="board" class="clip" style="left:0;top:290px;width:1080px;height:640px;overflow:hidden">
  <!-- optional screen backdrop + shade, then one <section class="scene"> per beat -->
</div>
<div class="caption" id="cap-0" style="left:120px;top:944px;width:840px;height:152px">…</div>
<div class="seam" style="position:absolute;left:84px;top:1106px;width:912px;height:3px;background:#edc58088"></div>
<div class="camera-shell" style="position:absolute;left:0;top:1124px;width:1080px;height:796px;overflow:hidden">
  <div id="camera-lens" style="position:absolute;inset:0;transform-origin:50% 38%">
    <video class="clip" src="camera-hd.mp4" muted playsinline
           style="width:1080px;height:796px;object-fit:cover"></video>
  </div>
</div>
```

```python
# Lens ladder for a focal moment (f = rk.finder(words))
def lens_focus(build_word_t, peak_t, release_after=0.22):
    TOs = [(1.085, build_word_t - .06, .13, "power3.out"),
           (1.12,  peak_t - .045,       .09, "power4.out"),
           (1.055, peak_t + release_after, .45, "power3.out")]
    js = [f'TO("#camera-lens",{{scale:{s},duration:{d},ease:"{e}"}},{t:.3f});' for s, t, d, e in TOs]
    js += [f'TO("#camera-lens",{{x:7,y:2,duration:.04,ease:"power4.out"}},{peak_t:.3f});',
           f'TO("#camera-lens",{{x:-4,y:-1,duration:.05,ease:"power2.inOut"}},{peak_t+.045:.3f});',
           f'TO("#camera-lens",{{x:0,y:0,duration:.10,ease:"power2.out"}},{peak_t+.10:.3f});']
    return "".join(js)
```

```css
#focus{position:relative;width:912px;min-height:190px;display:flex;align-items:center;justify-content:center}
#focus-title{font:700 134px/1 Geist;letter-spacing:-5px;color:#edc580;position:relative;z-index:2}
#focus-ring{position:absolute;inset:6px 10px;border:3px solid #edc580;border-radius:22px;opacity:0;box-shadow:0 0 38px #edc58044}
#focus-streak{position:absolute;left:22px;right:22px;bottom:4px;height:4px;background:#7dd3fc;opacity:0}
```

```js
// at peak word time P (title already in DOM, CSS opacity 0)
FT("#focus-title",{opacity:.94,scale:1.19,y:16},{opacity:1,scale:1,y:0,duration:.22,ease:"power4.out",immediateRender:false},P-.045);
FT("#focus-ring",{opacity:.82,scale:.99},{opacity:0,scale:1.012,duration:.60,ease:"power3.out",immediateRender:false},P);
FT("#focus-streak",{opacity:.95,scaleX:.2},{opacity:0,scaleX:1,duration:.48,ease:"power3.out",immediateRender:false},P);
```

**Focal question card.** It sits inside the board at x 84–996 and lives from `first_word − 0.15` to `peak + 1.55`.
- Fade the board scene out (0.12 s), then enter the card (scale .94, y 16 → 1, 0.20 s `power4.out`).
- Each line appears at its word − 0.02 s, from a scale of 1.08 / 1.12 / 1.04 / **1.19** and y 10, settling in 0.20 s `power4.out`.
- Line styles: lead 60/300 white, key 91/700 white, connector 60/300 `#b9cbd6`, final 139/700 gold.
- On the peak, flash an inner ring (`inset 22px`, .9 → 0 over 0.55 s) and draw a cyan rule 630×6 (scaleX 0 → 1, 0.25 s).
- Exit: opacity → 0 over 0.25 s `power2.in`, then `visibility:hidden`, and only *then* bring the board back (0.18 s).

**Camera grade.**
```python
rk.prepare_camera(work, width=1080)          # ≥ 960; the 1.12× peak needs the pixels
rk.styled_camera(work, "impacto", "eq=contrast=1.04:saturation=1.03,unsharp=5:5:0.35:5:5:0")
# screen-share backdrop: crop chrome first, then dim
# ffmpeg -i screen.mp4 -vf "crop=iw:ih-110:0:70,scale=988:-2,eq=brightness=-0.06:saturation=0.8" screen.mp4
```

**Determinism.** Do not use `Math.random`. If you need jitter, use the kit's seeded `rnd()`. Every `fromTo` placed after t = 0 needs `immediateRender:false`. Each transform property must have exactly one owner element: zoom goes on `#camera-lens` only, and nothing touches `.camera-shell`. Keep a small gap (≥ 1 frame) between consecutive tweens on the same property. Test reverse seeks: render the frames at the peak, peak + 0.5 s and peak − 0.5 s in random order, and compare.

## Pitfalls found in production

- **The title outgrew its ring at peak scale.** The first ring was sized to the settled title, but at 1.19× entry the letters crossed it. Size the ring container to the *scaled* bounds and verify the exact frame at the peak.
- **Sub-millisecond overlap of lens tweens.** Older scene punches still targeted the shell while the new ladder targeted the lens, and the tweens fought each other. Remove legacy camera tweens before adding the ladder, keep one owner, and separate curves by a frame.
- **Card exit overlapped the returning board text.** For ~0.2 s two texts were mixed. Return the board only after the card is fully hidden.
- **Generic sweeps on every scene looked like a template.** The reference removed a per-scene light wipe and replaced it with transitions chosen for the meaning of each cut.
- **Captions straddling a section boundary duplicated tokens.** After splitting, assert that the set of `(word, start, end)` equals the transcript exactly.
- **CTA button from opacity 0 failed contrast checks mid-scale.** Start it at opacity .95.
- **Branding in the top 270 px.** The first reference put the logo and the speaker name at y ≈ 50. That violates the safe top. Keep brand marks on the board or in the CTA.
- **Digital zoom has limits.** A webcam source looks soft at 1.12×. Cap the peak by source quality (1.08–1.10 for sources narrower than 720 px), not by habit.
- **Over-emphasis.** Treating every keyword as a slam flattened the contrast. Six markers and two slams in ~55 s was the approved density.
- **Lint warnings** about track density and nested structure are acceptable. Errors are not. Consider sub-compositions per beat for long videos.

## Variations

1. **Talking head, no screen.** The board is a pure graphic stage: the navy background plus a faint 1 px `#2a576f` grid at 8 % opacity. Use bigger icons (100 px) and one card per beat. Everything else is identical.
2. **Product demo.** The board shows a real screen recording at full brightness, with no shade. Focal cards appear only at the two peaks and cover the screen briefly. Cyan marks UI actions with `mouse_click`, gold marks outcomes.
3. **Palette swap by topic.** Keep the two-role logic (result vs. tool) and swap the hexes. Example for health and lifestyle: background `#0b0f0d`, surface `#16302a`, result coral `#ff9e7a`, tool mint `#8fe3c8`. The slam grammar stays the same.
4. **Podcast / camera-on-top.** Camera window at y 290–1000 with the eyes around y 560. Captions on a seam at y 1010–1160. Board at y 1180–1560 with compact cards, and the bottom 350 px left empty. Use this when the speaker's face is the selling point and the graphics are secondary.
