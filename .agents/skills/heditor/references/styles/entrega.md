---
style: entrega
name: Entrega (order tracking, delivered right now)
family: fixed-style
best_for: remarketing ads with a "Learn more" CTA whose speech is about instant access ("what happens when you sign up?", "you get access right away", "everything is unlocked") followed by a list of what is included; the sign-up becomes an order tracked in a delivery app
reference: produced by the PycodeBR team with heditor, Oct 2026
---
# Entrega (order tracking, delivered right now)

The sign-up is an order in a tracking app. From frame 0 a "YOUR ORDER" card shows a truck moving along a dashed route on a night map in petrol green; each spoken step ticks a stage of the timeline (ORDER PLACED ✓, ACCESS ✓), and on "right away" the timeline jumps straight to DELIVERED, the ETA turns into "RIGHT NOW" and a lime stamp lands: "DELIVERED NOW". Then a kraft box drops, opens on "everything unlocked", and every included item flies out of the box *on its word* into a "YOU TAKE" checklist. Real proof windows (the members area player, the catalogue, a code editor, a workflow card) appear as the speech names them. The speaker is a presenter cutout in three positions with face stabilisation, so graphics never touch the face. The core metaphor: **you do not wait for delivery; the order arrives the moment you place it**.

## When to use / when not to

Use it when the speech:
- stresses immediacy ("as soon as you sign up", "right away", "today you can already…");
- has a list of included things to unpack;
- invites the viewer to take an action that is instantly rewarded.

Avoid it when:
- the product really has a waiting time (shipping, cohorts starting later): the metaphor would mislead;
- there is no list to unpack;
- the batch already has a shopping-app world (`carrinho`) or a map world in another style;
- the face fills the frame so tightly that no side column is free (fallback: a phone window holding the camera).

## Signature moves

1. **Tracking card at frame 0**: "YOUR ORDER" with a mini map, a moving truck, a timeline of 3–4 stages and an ETA field.
2. **Stages tick on spoken words**: "sign-up" ✓, the product name gives the card a lime frame, "access" ✓.
3. **Jump to delivered**: on "right away" the timeline fills to DELIVERED in one move, ETA flips to "RIGHT NOW", stamp "DELIVERED NOW".
4. **Proof windows**: the real player of a class (video area only, no account name, avatar or durations), the course catalogue sliding, a code editor, a workflow card with an "INCLUDED" badge; chips repeat the spoken qualifiers.
5. **Unboxing**: a kraft box drops, opens on "unlocked" (flaps), and items fly from the box into "YOU TAKE" exactly on each spoken word.
6. **Close shot blocks**: in a close position, side blocks stack the spoken "today / from paper / from your mind / project / system" ideas.
7. **Route that advances** in the background during the whole video (dashed lime line growing on the night map).

## Frame and layout

Canvas 1080×1920, 30 fps, Paid-ad variant (`../captions-and-layout.md`).

```
y 0–270     night map only (streets in a tilted grid)
y 284–1030  tracking card / proof windows / box and checklist, in the column opposite the face
y 1046–1150 caption pill
y > 1152    map and the speaker's body fading out
```

Speaker cutout positions (face stabilised to the median per EDL segment from `rk.track_faces`, never smoothed across a cut):

| Position | Scale | Face centre x | Used for |
|---|---|---|---|
| `R` | 0.66 | 860 | default (cards on the left) |
| `L` | 0.62 | 215 | unboxing on the right |
| `C` | 0.80 | 540 | close shot with side blocks |

Face bottom ≤ y 1015 (above the captions). A mask dissolves shoulders and base (15 % on the sides). On position changes, graphics leave 0.22 s before the speaker moves and new ones enter after the speaker lands.

## Palette and typography

| Role | Hex |
|---|---|
| Night map | petrol `#0c2a2c` → `#071618`, streets `#11393b`, panels `#0b1416` / `#10201f` |
| Highlight (delivered, active word, seals, route) | lime `#d8f44a` |
| App cards | `#f6f4ee`, labels `#5b6a67` |
| Delivered green (stage dots) | `#1a7f5a` |
| Kraft box | `#c9955b` |
| Window bars | traffic lights `#ff5f57` `#febc2e`, accent `#ffb547` |

Fonts (OFL, in the kit): **Anton** (titles, captions), **Geist** (app UI), **JetBrains Mono** (window bars). Icons: Lucide (`truck`, `map-pin`, `package`, `package-open`, `check`, `play`, `code`, `workflow`, `file-text`, `pointer`).

## Caption system

"Tracking pill": dark `rgba(6,18,20,.94)`, 3 px lime border, radius 16, padding `4px 20px 0`, Anton uppercase white, `font-size: var(--fs, 78px)`, one line, ≤ 800 px.

- Grouping: ≤ 3 words / 16 characters.
- Active word: **black on lime `#d8f44a`** (≈ 15:1), radius 10.

```css
.capwrap{left:0;top:1046px;width:1080px;height:104px;z-index:40;display:flex;align-items:center;justify-content:center}
.cap{display:inline-block;max-width:800px;background:rgba(6,18,20,.94);border:3px solid #d8f44a;border-radius:16px;padding:4px 20px 0;
  font-family:Anton;font-size:var(--fs,78px);line-height:1.14;color:#fff;text-transform:uppercase;white-space:nowrap}
.cap .w{display:inline-block;border-radius:10px;padding:0 .08em;margin:0 .02em}
```

## Scene grammar

Generic example: a speaker explaining that signing up gives immediate access to recorded classes, that the student can start the same day at their own pace, and listing the resources unlocked.

| Beat | Scene | Position | What happens |
|---|---|---|---|
| Hook question | Tracking card | `R` | Truck moving from frame 0; "SIGN-UP" ✓ on the word; lime frame on the product name; "ACCESS" ✓. |
| Instant | Delivered | `R` | Timeline jumps to DELIVERED, ETA "RIGHT NOW", stamp "DELIVERED NOW". |
| Where | Player | `R` | Real class player window + chips "INSTANT ACCESS / RECORDED / ON THE PLATFORM". |
| Pace | Catalogue | `R` | Real catalogue cards sliding + chips "WATCH / PRACTISE / TODAY / YOUR PACE". |
| Unlocked | Box | `L` | Kraft box drops; "EVERYTHING UNLOCKED"; box opens on "unlocked"; each item flies into "YOU TAKE" on its word; code window on "source code"; product seal on its name. |
| Method | Workflow card | `R` | Real workflow card with "INCLUDED"; stages PLAN → BUILD → DEPLOY light. |
| Today | Close | `C` | Side blocks for each spoken idea. |
| Spoken CTA | Button | `R` | Brand, white "LEARN MORE ›" tapped on "learn", chevrons, "FINISH YOUR SIGN-UP", "SEE YOU IN CLASS". |
| End card (4 s) | Card | out | Brand + button + "TAP LEARN MORE". |

Rules: items only from the speech (plus product facts the brief confirms, written as such in DESIGN.md); no numbers except stage indices; proof windows show no account names, avatars, durations or personal data.

## Transitions and motion vocabulary

- **Truck**: moves along the route polyline by x/y keyframes (linear), the dashed route draws ahead of it (`stroke-dashoffset`).
- **Stage tick**: dot fills lime 0.12 s, check scales 1.5 → 1 `back.out(3)`, connector line fills.
- **Jump**: all remaining stages fill with a 0.05 s stagger, then the stamp `scale 1.6 → 1` + 6 px shake.
- **Box**: drop from y −300 with `bounce.out` 0.5 s; flaps rotate open (`rotationX` with perspective) 0.3 s; items fly on a parabola (x/y keyframes) 0.4 s to their checklist slots.
- **Proof windows**: from `y 40, opacity 0` in 0.3 s `power3.out`; catalogue rows translate slowly.

## Sound design

| Action | Category | gain_db | length |
|---|---|---|---|
| Stage ticks / items | `click`, `pop` | −28 to −27 | 0.15 |
| Jump to delivered | `fast_forward` | −27 | 0.5 |
| Stamps | `stamp` | −26 to −22 | 0.3 |
| Windows / moves | `swipe`, `whoosh` | −25 / −22 to −21 | 0.35 |
| Box drop | `bass_impact` (gap) | −21 | 0.5 |
| Box opens | `padlock_unlock` + `magic_sparkle` | −24 / −26 | 0.4 |
| Code window | `typing_fast` | −29 | 0.5 |
| Workflow stages | `data_beep` | −28 | 0.2 |
| Catalogue | `page_turn` | −27 | 0.25 |
| Idea blocks | `lightbulb_ding`, `success` | −28 / −27 | 0.3 |
| Button / end | `mouse_click`, `success_chime` | −26 to −18 / −16 | 0.2 / 0.8 |

No SFX on the first word (the first one lands at ~1.8 s). UI over words at −26 to −29 dB and 0.15–0.4 s. Reference voice chain for a clean phone recording: high-pass 70 Hz, light 2:1 compressor and limiter, no colour EQ.

**Music:** `music:623` (Deep Urban, driving tech house) — reference. From 2 s of the file so the full kick lands with the box (~13 s into the cut), `lowpass` on the "in other words…" explanation, full again for the CTA, 1 s fade. Alternatives: `music:167` (mechanical) or `music:187` (hopeful build).

```json
[{"start":0,"end":"EXPLAIN","mode":"full","track":"A","src":2.0,"fade_in":0.01,"fade_out":0.08},
 {"start":"EXPLAIN","end":"CTA","mode":"lowpass","track":"A","src":"t+2","fade_in":0.08,"fade_out":0.06},
 {"start":"CTA","end":"DURATION","mode":"full","track":"A","src":"t+2","fade_in":0.05,"fade_out":1.0}]
```

## CTA design inside the style

Paid-ad variant: brand + product name, big white "LEARN MORE ›" tapped on "learn", chevrons, "FINISH YOUR SIGN-UP", "SEE YOU IN CLASS"; end card with only brand and button on an opaque background (a leftover of the CTA showed through a transparent card in the reference) for 4 s.

## Implementation notes

- Face stabilisation: from `qa/face-track.json` compute the median face centre per segment and translate the cutout so the face stays at the state's centre; this stops the face drifting into the card column when the speaker leans.
- Map: generated SVG streets (tilted grid, seeded), the route as a polyline, the truck as a Lucide icon in a lime circle.
- Proof assets: crop with ffmpeg from screen recordings (video area only), keep colour, store a `proof_assets.py` that documents every crop.

## Pitfalls found in production

- **Cards touching the head** when the speaker leans: stabilise by face.
- **Ear clipped** on the right edge: reduce the `R` scale (0.70 → 0.66).
- **Hard vertical edge of a hand** in the close shot: 15 % side mask.
- **Graphics over the face during position changes**: leave first, enter after.
- **CTA residue on the end card**: give the end card an opaque background.
- **Route and seal above y 270**: pull them down.
- **A short conjunction at a block edge**: windowed ASR disagreed on whether a final "and" survived; the waveform showed a smooth decay without release, so it stayed, but it is listed for human listening.
- **A low-confidence word** in the captions ("of AI" heard by one ASR, missed by others): list it in the delivery for listening rather than silently assuming.

## Variations

- **Food delivery**: the box is a delivery bag and items are dishes on a menu; for bundles with a playful brand. Music `music:82`.
- **Download progress**: a progress bar that completes instantly; for digital products (avoid if a countdown could be read).
- **Pick-up locker**: a locker opens with a code on "sign up"; for exclusive access messages.
- **Organic version**: "what would you unpack first?" + Follow card.
