---
style: camadas
name: Camadas (concept layers behind the speaker)
family: fixed-style
best_for: explanations where almost every sentence has a concept that can be drawn (a tool, a number, a comparison, a property such as depth or speed); dark studio talking heads with some room visible behind the speaker
reference: technique study of creator Reels about AI tools and editing, Oct 2026; depthkit validated in render tests, not yet used in a delivered edit
---
# Camadas (concept layers behind the speaker)

The room becomes a stage with depth. The speaker stays locked off and centred, and every spoken concept is drawn **in the space between the speaker and the wall**: giant words behind the head, a question mark that the hair covers, a percentage that climbs behind the shoulders, guide lines that follow the shelves, floating cards tilted towards the speaker. The viewer keeps seeing something new every 1–2 s, and because the graphics sit *behind* the person, the edit looks shot in camera rather than pasted on top. The core metaphor: **the ideas live in the room with the speaker**.

Requires the depthkit outputs (`heditor matte`, `heditor depth`, `heditor look <work> fog`). Read `../depth-and-3d.md` first.

## When to use / when not to

Use it when:
- the speech names many concrete concepts in a row (tools, numbers, properties, steps);
- the source shows the speaker from the chest up with free space around the head (shelves, wall, set);
- the edit should feel premium and "how did they do that" without changing the setting.

Avoid it when:
- the matte fails on the source (very low resolution, busy background touching the hair, a headset or chair the segmenter keeps) and cannot be fixed with `keep_classes`/`erode`;
- the speaker moves a lot in depth or walks (the layers would need tracking for every beat);
- the speech is abstract and emotional with few drawable nouns (use `documentario` or `cinema`).

## Signature moves

1. **Raw → edited hook**: frame 0 shows the speaker on a transparency checkerboard inside a dashed selection box with handles and a "RAW" tag; on the first beat a wipe uncovers the graded room and the tag flips to "✓ EDITED" (`depth-and-3d.md` §12).
2. **Giant word behind the head** on the key noun: condensed caps, 80 % of the width, white or the accent colour, the hair covering the lower edge; small tilted sticker tags (coral rounded rectangles, rotated −3°, black caps, typed letter by letter) beside it.
3. **Giant "?"** behind the head when the speaker asks a question; it collapses into the answer word.
4. **Concept cards around the head**: four dark rounded cards with violet outlines at the corners (chart, map, image, wireframe icons); each label appears as its word is said; then the set collapses into one icon + two-word title.
5. **Scoreboard** with two badges and percentages counting up exactly as spoken, bars in the two accent colours, a "2.4×" style badge only if the speech says it.
6. **Guide lines on the set**: thin orange lines, nodes, a halo around the head, perspective rays to a vanishing point, all drawn on behind the speaker on words such as near / far / depth / perspective, each with a giant word.
7. **Glass phone slab**: the whole frame turns into a tilted glass slab over a grid floor with an extruded "3D" (or the spoken property), then returns.
8. **Floating perspective cards** above the head with cyan corner brackets and label pills.
9. **Big stat behind the hair** that steps up with the speech, segmented meter bars at both frame edges.
10. **Comment-to-DM CTA**: comment bar typed with the keyword, bubble, DM notification at the top (`../technique-catalogue.md`, CTAs) — only when the user really sends the material by DM.

## Frame and layout

Canvas 1080×1920, 30 fps. The camera box is large and central; all layers live inside it.

```
y 0–270      atmosphere only (top of the room, vignette)
y 280–520    graphics above the head: sticker tags, titles, floating cards, scoreboard header
y 300–1300   camera box #cam (x 0–1080, the speaker centred, head top ≈ y 520–620)
y 420–900    BEHIND layer: giant words, "?", stats, guide lines, cards (the head covers part of them)
y 1240–1420  captions (front layer)
y > 1570     no information
```

- Plate: `camera-fog.mp4` (far parts −20 % brightness, slight blur) so behind-layer graphics pop; switch to the plain plate for breathers.
- Behind-layer graphics may cover the room, never the face; check the matte sheet for the head outline per beat.
- Jump-cut zoom 1.0 ↔ 1.06 on the camera box (all layers inside it move together); one hard punch-in (1.15×) on the payoff line.

## Palette and typography

| Role | Hex |
|---|---|
| Night set (plate graded) | room as shot, far parts darkened; vignette `#07060c` |
| Primary accent (keyword, bars) | coral `#ff7a59` |
| Secondary accent | lavender `#b9a6ff` / violet outline `#7c5cff` |
| Guide lines | orange `#ff9a3c` at 70 % |
| Corner brackets / pills | cyan `#6ef0ff` |
| Text | white `#ffffff`, shadow `rgba(0,0,0,.55)` |

Fonts (kit): **Anton** or **Bebas Neue** for the giant words; **Geist** 800 for captions and cards; **JetBrains Mono** for tiny labels and counters. Icons: Lucide (`bar-chart-3`, `map`, `image`, `box`, `eye`, `scan`, `layers`, `sparkles`).

## Caption system

Accent-word captions (`../technique-catalogue.md`, system 1): Geist 800, sentence case, 1–3 words, 64–76 px, white with a soft shadow, **the keyword in coral `#ff7a59`** (≈ 8:1 against near-black, lower over a lit shirt: keep the 2 px dark stroke and check enlarged crops). Centred at y ≈ 1330. When a giant word behind the head repeats the caption word, hide the caption for that word (the giant word carries it) but keep the timing of the next group.

```css
.cap{position:absolute;left:90px;width:900px;top:1280px;text-align:center;font-family:Geist;font-weight:800;
  font-size:72px;line-height:1.05;color:#fff;text-shadow:0 4px 18px rgba(0,0,0,.55);-webkit-text-stroke:2px rgba(0,0,0,.35);paint-order:stroke fill}
.cap .k{color:#ff7a59}
```

## Scene grammar

Generic example: a speaker comparing two AI tools that edit videos.

| Beat | Layer | What happens |
|---|---|---|
| Hook (0–3 s) | front + plate | Raw box and checkerboard, wipe to the room, tag flips to EDITED. |
| "the best video editor" | behind | Giant EDITOR behind the head, two coral stickers type in. |
| Question | behind | Giant "?" pops behind the hair. |
| The test | above | Dark top panel with a TEST badge, the task name typing on. |
| "charts, maps, images, 3D" | around | Four concept cards, labels on each word. |
| Result | above + behind | Scoreboard counting to the spoken percentages; caption giant "MORE THAN DOUBLE". |
| "it understood depth" | behind | Guide lines on the shelves, halo, vanishing point rays; giant NEAR / FAR / DEPTH / PERSPECTIVE. |
| "3D" | whole frame | Glass phone slab with an extruded "3D", back to full frame. |
| How it was made | above | Floating cards (3D room, portrait, UI) with brackets. |
| Proof | front | The video shrinks into an editing-app mockup with a progress card counting to 100 %; hard cut back with a punch-in. |
| Accuracy | behind | Big stat 66 → 80 → 99 % behind the hair with meter bars. |
| CTA | front | Comment bar, keyword typed, DM notification. |

Rules: every graphic is born from a spoken word; only spoken numbers; one behind-layer element at a time (two behind elements fight with the hair outline).

## Transitions and motion vocabulary

- Behind-layer entrance: `scale 1.12 → 1`, `opacity 0 → 1`, 0.18 s `power3.out`; exit `opacity → 0` 0.12 s or a downward motion-blur slide (`y +120`, `filter: blur(8px)`).
- Stickers: rotate −3°, characters staggered 0.03 s.
- Concept cards: `y 10 → 0`, `opacity`, stagger by word times; outline glow pulse on the active card.
- Count-ups: GSAP text tween with integer `snap`, 0.6–0.9 s, ending exactly on the spoken word.
- Guide lines: `stroke-dashoffset` draw-on 0.4 s each, nodes popping at the ends.
- Slab: wrapper `perspective: 1400px`, `scale 1 → .7`, `rotateY 0 → 18deg` 0.45 s `expo.inOut`, hold, reverse.

## Sound design

| Action | Category | gain_db | length |
|---|---|---|---|
| Raw → edited wipe | `magic_transition` + `swipe` | −24 / −28 | 0.6 / 0.3 |
| Giant word behind the head | `bass_impact` (in a gap) or `pop` (over speech) | −24 / −30 | 0.5 / 0.2 |
| Sticker typing | `typing_fast` | −32 | 0.4 |
| Concept card labels | `click` (vary variants) | −30 | 0.15 |
| Count-up | `data_beep` ticks + `success` at the end | −32 / −26 | 0.6 / 0.5 |
| Guide lines | `scan` | −30 | 0.6 |
| Glass slab | `whoosh` + `reverse_impact` | −25 / −27 | 0.4 / 0.6 |
| App mockup progress | `robot_processing` → `progress_complete` | −32 / −24 | 1.0 / 0.6 |
| CTA typing / sent / DM | `keyboard`, `message_sent`, `phone_notification` | −30 / −26 / −24 | 0.6 / 0.3 / 0.5 |

**Music:** `music:82` (Keeping Fit, quirky futuristic synth) with a low-pass in the hook and the full track from the first giant word; alternatives `music:167` (Brainiac, mechanical/investigative) for analytical comparisons, `music:623` (Deep Urban) for a sleeker tone. Silence 0.25 s before the main result, full track again on the count-up.

## CTA design inside the style

The CTA stays in the room: the comment bar slides up over the torso, the keyword is typed letter by letter, the send button pulses, a bubble pops and the DM notification lands at the top (y ≈ 300) with the keyword in coral. If the user does not send material by DM, swap it for a Follow pill above the head or the briefing's action.

## Implementation notes

- Order in `#cam`: plate video → behind layer (`#behind`, `#guides` SVG, `#cards-back`) → `camera-alpha.webm` → front layer (cards in front, captions, CTA).
- Build `#guides` from points read on `depth-still.png` (shelf edges, a vanishing point) in video pixels converted with `dk.to_stage`.
- Keep a list of behind-layer beats in DESIGN.md with the head outline at each time (from the matte sheet or a preview) and the word position chosen for it.

## Pitfalls (from the depthkit tests and the reference study)

- **Fast hands smear in the matte** (semi-transparent, soft edge): never put a behind-layer word where a gesture happens on that beat.
- **Two behind elements at once** make the hair edge visible twice; one at a time.
- **Third-party marks**: the reference used real app logos on tiles; heditor uses typed names on generic tiles unless the user supplies the marks and has the right to use them.
- **Invented numbers**: scoreboards and stats only with the figures the speaker says.

## Variations

- **Light set**: cream wall, black giant words, a single blue accent; for calmer explanations.
- **Monochrome scan**: replace the fog plate with `look edges` for the whole middle act, back to colour on the conclusion.
- **One giant word per sentence** (minimal): no cards or HUDs, only the behind-the-head word, captions and sound; for 20–30 s opinion cuts.
- **Product tour**: floating cards become screenshots of the user's own product, tilted towards the speaker, with brackets on the feature named.
