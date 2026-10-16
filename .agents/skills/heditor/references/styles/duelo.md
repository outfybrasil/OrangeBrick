---
style: duelo
name: Duelo (A/B comparison page)
family: fixed-style
best_for: comparing two tools, two prices, two approaches or a before/after on the same take; "which one is better?" videos where the viewer decides
reference: technique study of creator Reels comparing AI editors and edit budgets, Oct 2026; not yet used in a delivered edit
---
# Duelo (A/B comparison page)

The whole Reel is a comparison page. A light canvas carries a fixed question at the top ("WHICH ONE IS BETTER?") and two stacked rounded panels, each with a label row (an icon tile in its own colour + the contender's name). **Both panels play the same take at the same time**, edited in two different ways, so the viewer compares decisions, not footage. Every spoken instruction or claim appears in both panels in each contender's own language: one answers with text lists, the other with icons and motion; one zooms smoothly, the other cuts hard. It ends with "who won?", a checklist of what each did and the viewer's vote. The core metaphor: **a match with two players and the viewer as the judge**.

The style needs two versions of each visual beat. The edit inside each panel is designed in heditor itself (two sub-timelines); nothing pretends to be the output of a real third-party product unless the user supplies those real outputs.

## When to use / when not to

Use it when:
- the speech compares two options on the same material (tool A vs B, cheap vs elaborate, beginner vs expert approach, before vs after);
- the speaker's instructions can be shown twice (zoom, put behind me, turn, add a title);
- the call to action is a vote or a choice.

Avoid it when:
- the two contenders are real brands and you cannot show their real output (never fake a competitor's result; rename them as "Option A / Option B" or use the user's own two edits);
- the speech has only one side;
- the source frame cannot be cropped to 16:9 around the speaker without losing the hands that matter.

## Signature moves

1. **Static header** at y 300–380: heavy black caps question (Geist 900), never moving.
2. **Label rows**: icon tile (rounded square, contender colour) + bold name and one fact the speech gives (price, time).
3. **Synchronised twin panels**: the same `camera-hd.mp4` in both panels with the same timing; each panel has its own overlays.
4. **Branch diagram** for the premise: "1 video → A / B" drawn with two arrows, the speaker shrunk to an inset at the side.
5. **Contrasting answers to one instruction**: panel A shows a short text checklist building line by line, panel B shows lime line icons drawing on; on "zoom", A cuts hard to 2× and B does a smooth 1.0 → 1.3 with a reticle.
6. **Inset and strip morphs** inside a panel to open space for graphics (`../technique-catalogue.md`, Layouts).
7. **Floating logo cards with a round VS badge** between them on the speaker's chest (typed names on generic tiles).
8. **Hand-anchored objects** in the elaborate panel (`../depth-and-3d.md` §10) and objects that rise behind the head (§3).
9. **"Who won?" checklist**: the commands the speaker gave, ticked per panel, with a count ("8/10") only from what was actually done.
10. **Vote card**: "A or B?" building left then right, the viewer answers in the comments.

## Frame and layout

Canvas 1080×1920, light page.

```
y 0–270      page background only (soft grey gradient)
y 300–380    header question (black caps, 72–84 px)
y 410–470    label row A: icon tile 56×56 + name + fact
y 480–1010   panel A: x 40–1040 (1000×530 ≈ 16:9 + 0.06), radius 24
y 1040–1100  label row B
y 1110–1640  panel B
y 1660–1760  shared captions (one line, both panels share the speech) — or captions inside each panel (small)
```

- Organic Reels can push panel B down to y 1640 because the captions live inside the panels; keep the right edge of panel B (x > 960, y 1000–1640) free of critical labels (platform buttons).
- For paid ads with "Learn more", shrink both panels (≈ 1000×470) so panel B ends at y 1150 and put the shared caption at y 1046–1150 above it: see `../captions-and-layout.md`.

## Palette and typography

| Role | Hex |
|---|---|
| Page | `#f4f4f6` → `#e9e9ee` |
| Header text | `#0b0b0f` |
| Panels | `#0d0d12` (letterbox fill), radius 24, shadow `0 18px 40px rgba(0,0,0,.18)` |
| Contender A | coral `#ff6b4a` |
| Contender B | mint/lime `#2fe39a` / `#c6ff3d` |
| VS badge | white on `#0b0b0f`, 2 px white ring |

Fonts (kit): **Geist** 900 for the header and labels; **Inter** 700 for the panel subtitles; **Bebas Neue** for the giant titles inside panel B; **JetBrains Mono** for counters. Icons: Lucide (`scissors`, `zoom-in`, `layers`, `sparkles`, `timer`, `coins`, `check`, `x`).

## Caption system

Two options, chosen per video:
1. **Shared caption** under both panels: Geist 900, 1–4 words, black on the page with the active word **black on `#ffd84d`** highlight (high contrast on light).
2. **Captions inside each panel**: panel A small white text on a black rounded pill (5–7 words per line, the cheap edit's look); panel B accent-word captions (white, keyword in the contender colour). Both are synced to the same words.

## Scene grammar

Generic example: a speaker giving the same editing instructions to two approaches.

| Beat | Panel A (simple) | Panel B (elaborate) |
|---|---|---|
| Hook "which edits better?" | Title over the footage, plain | Stacked condensed title with an icon, light burst |
| Premise | Branch diagram 1 → A/B | Same diagram, animated nodes |
| "remove the pauses" | Checklist line ✓ | Timeline with labelled segments being trimmed |
| "zoom in" | Hard 2× cut | Smooth 1.3× with reticle |
| "put the logos behind me" | Logos beside the speaker | Logos rise behind the head (matte) |
| "turn everything" | Small tilt | Exploded layers that rotate edge-on |
| Proof | Static list | Self-drawing curve, coin stacks for the prices said |
| Verdict | "Who won?" checklist with counts | same |
| CTA | Vote card A/B | same |

Rules: both panels always show the same moment of speech; the difference is the edit, not the content; no score that the speaker did not state.

## Transitions and motion vocabulary

- Panels never move; only their contents morph (inset 0.5 s `expo.out`, strip 0.8 s `power3.inOut`).
- Header and labels are static; the active panel can glow (2 px contender-colour ring, 0.2 s) when the speech talks about it.
- VS badge: `scale 0 → 1.15 → 1`, 0.35 s, a short shake.
- Checklist ticks: 0.12 s pop each, staggered on the spoken commands.

## Sound design

| Action | Category | gain_db | length |
|---|---|---|---|
| VS badge | `bass_impact` (gap) | −24 | 0.5 |
| Checklist ticks | `click` / `success` (last) | −30 / −26 | 0.15 / 0.5 |
| Hard zoom (A) | `glitch` short | −30 | 0.2 |
| Smooth zoom (B) | `riser` short | −31 | 0.6 |
| Logos behind the head | `magic_sparkle` | −30 | 0.6 |
| Layers turning | `whoosh` | −26 | 0.4 |
| Prices / coins | `coins` | −30 | 0.4 |
| Verdict | `drum_roll` → `success_chime` | −30 / −22 | 1.0 / 0.8 |

**Music:** `music:33` (Motivating Mornings, propulsive corporate) or `music:623` (Deep Urban) under the whole match; a 0.25 s silence before "who won?" and the full track on the verdict; `music:82` for a playful match.

## CTA design inside the style

The vote card is the CTA: "A or B? Answer in the comments" with the two tiles; then the briefing's action (keyword, Follow, "Learn more"). The header can change to "YOU DECIDE" on the last beat.

## Implementation notes

- Build two sub-timelines in one page: `#pA` and `#pB`, each with its own camera video (same src and `data-media-start`), overlays and caption layer; the shared header and labels are siblings.
- Each panel's camera is `object-fit: cover` on a 16:9 crop centred on the face (use the face track for `object-position`).
- Two videos decode in parallel: render with 2–3 workers and check sync with previews at fast moments (both panels must show the same mouth position).

## Pitfalls

- **Fake competitor output**: when the contenders are real products, either use their real outputs supplied by the user or anonymise them.
- **Desync between panels**: different `data-media-start` or a punch-in implemented as a different clip in one panel breaks the comparison; transform the video element, never re-cut it.
- **Too much on panel B**: the elaborate side must still be readable at phone size; one element per beat.

## Variations

- **Before / after**: panel A is the raw take (no edit), panel B the edit; the verdict is "the difference".
- **Price ladder**: three thin panels (BAD / GOOD / EXCELLENT) with portrait cards filling a top band one per verdict; for "what makes a good ad/thumbnail".
- **Side-by-side** (two vertical panels left/right) for very short 15–20 s comparisons.
