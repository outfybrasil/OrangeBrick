---
style: gravidade
name: Gravidade (the speech has weight)
family: fixed-style
best_for: speeches about accumulation, fragility and recovery (too many tools or tasks piling up, a single copy that a mistake destroys, technical debt, a stack of dependencies, a method built piece by piece); a list of problems answered by a list of parts of the solution; organic Reels with a clear turn
reference: built by the PycodeBR team with heditor 2.4 (Oct 2026) as the reference style for baked rigid-body physics (physkit)
---
# Gravidade (the speech has weight)

The concepts of the speech are **physical blocks with the spoken word printed on them**, and they fall into a 3D room
below the speaker, each one landing on its own word (±0.05 s; the landing is measured on the bake, not guessed).
Problems pile up as a heap of dark blocks with gold lettering. On the turn, a heavy red block (the risk, the mistake,
the hard truth) falls beside the heap and the shock throws the heap around: blocks that were locked upright while
they piled up are released and tumble. Then the answer is built as a **straight tower of bright blocks**, one block
per word that names a part of it, on the clearest spot of the floor. The speaker stays live in a card above the room;
captions sit in the band below. Nothing is keyframed by hand: every bounce is real physics, so the edit reads as
expensive and inevitable.

**Status:** reference style for physics (no audience approval yet); reuse the language and redesign the blocks,
colours and turn for each new speech.

## When to use / when not to

Use it when the speech:
- names several things that accumulate or depend on each other (copies, tools, tasks, files, steps) and then a
  moment that breaks them (a spill, a crash, a deadline, a ban);
- answers with a structure made of named parts said one after the other (Git, Drive, S3, database; plan, test,
  deploy);
- has 5–12 spoken nouns worth printing (short: one or two words each).

Avoid it when:
- nothing in the speech has weight or order (opinions, stories without objects): use `documentario`, `podcast`;
- the explanation is about relations between parts (who calls whom): use `circuito` or `lousa-de-aula`;
- the cut is longer than ~60 s: physics renders cost about 1 s of CPU per frame; keep the room to the key beats or
  use set pieces in another style.

## Signature moves

1. **Landing on the word**: every block is spawned high and falls; `physkit.land_on` bakes, measures the first
   contact of each block and shifts its spawn until it lands on its word (three passes, error ≤ 1 frame).
2. **The heap**: problem blocks fall with their rotation locked, so they stack like bricks with the word facing the
   camera; the heap grows one word at a time.
3. **The weight**: the impact block is heavy (density 9), falls straight down beside the heap (on top of it its
   weight would pin the blocks and nothing would fly) and stays where it lands, word readable; a radial blast at
   contact throws the heap left and up and releases the rotation of every block (they tumble); flash tinted with
   the impact colour, camera shake, punch-in.
4. **Silence before the weight**: the music cuts 0.3 s before the impact and enters full on it.
5. **The tower**: answer blocks are locked vertical (no rotation, no sideways motion) and land one on top of the
   other in the clearest lane of the floor (chosen from the bake); a short shockwave just before the first block
   lands clears any debris left in that lane. Fixed block height, uniform width range.
6. **The lone block**: a problem mentioned after the tower ("one single file") falls alone into the clearest lane
   left, contrasting with the tower.
7. **CTA**: the room fades out under a dark scrim; question, logo, @handle and the Follow button.

## Frame and layout

Canvas 1080×1920, 30 fps.

```
y 0–270      safe top (nothing)
y 296–520    hook (Anton 76 px, two lines max) above the hero camera card, first beat only
y 280–580    camera card in the top state (scale 0.42 of 960×714, centred) after the hook
y 520–1300   PHYSICS VIEWPORT (canvas 1080×780, edges faded with a CSS mask: no seam with the page)
y 1300–1550  caption band (pill mode)
y > 1570     platform UI: nothing
```

Hero state: the camera card (scale ≈ 0.9) covers the room during the hook; it moves to the top state ~0.9 s before
the first block lands and the room fades in.

World (metres): floor at y = 0, invisible walls at x = ±3.0 (just inside the view) and z = ±1.2; heap around
x = −1.5, impact x ≈ heap + 1.5, tower lane chosen at run time (preferred x = 1.9). Camera fov 36°, at
(−0.25 → 0.25, 2.7, 8.3 → 8.0), looking at (0, 1.45, 0); slow drift over the whole cut.

## Palette and typography

| Role | Hex |
|---|---|
| Page and 3D background | `#020308` (= `#0a0e18` after ACES tone mapping; keep them equal or a seam appears) |
| Floor / grid | `#0c1220` / `#1b2c4d`, `#111b30` |
| Problem block / lettering | `#161c2c` / `#f5c66b` |
| Impact block / lettering and flash | `#2a0f14` / `#ff6b6b` |
| Answer block / lettering | `#0d2a24` / `#7dffb0` |
| Light | hemisphere `#bcd4ff`/`#0b0f1a`, white key with soft shadows, cyan rim `#7dd3fc` |

Block lettering: Anton on a canvas texture per face (front and back only: a label on the top face shows as a
mirrored duplicate), fitted to 86 % of the face width, slight emissive so bloom catches it. Captions: the kit's
Anton band in pill mode (black on `#ffd84d`).

## Caption system

Default band moved to y 1300 (`.caption{top:1300px}`), 3 words / 17 characters per group, active word black on the
yellow pill. The block lettering repeats the key nouns, so keep the caption untouched (do not hide the word that is
landing).

## Scene grammar (beats.json)

```json
[{"word": "cópia?",  "after": 1.5,  "kind": "drop",   "label": "UMA CÓPIA"},
 {"word": "computador", "after": 2.5, "kind": "drop", "label": "COMPUTADOR"},
 {"word": "água",    "after": 6.0,  "kind": "impact", "label": "ÁGUA"},
 {"word": "clone",   "after": 11.0, "kind": "stack",  "label": "CLONE"},
 {"word": "Git,",    "after": 16.0, "kind": "stack",  "label": "GIT"},
 {"word": "arquivo", "after": 28.0, "kind": "drop",   "label": "UM ARQUIVO"}]
```

- `word` is matched case- and punctuation-insensitively (accents must match); `after` picks the right occurrence.
- `kind`: `drop` (problem, heap), `impact` (one per cut, two at most), `stack` (answer, tower), `rain` (n small
  anonymous cubes for "everything", "a lot of"; add `"n"`), optional `"x"` to force a position.
- Labels are the spoken words, upper case, ≤ 14 characters (longer labels get small).
- Order: problems → impact → answer reads best; a late problem after the tower is the "lone block".

## Transitions and motion vocabulary

- Camera card `hero → top` (0.55 s), room fade-in 0.35 s.
- Impact: flash (radial gradient at the impact's screen position, impact colour, 0.6 → 0 in 0.35 s), `shake(14)`,
  `punch(1.06)`, 3D camera shake decaying in ~0.5 s, bloom strength +0.35 for ~0.3 s.
- No cuts inside the room: time passes through the physics.

## Sound design

| Action | Category | gain_db |
|---|---|---|
| Opening | `bass_impact` | −13 |
| Problem block lands | `stamp` | −15 |
| Weight falling (0.35 s before) | `whoosh` | −16 |
| Impact | `trailer_hit` | −9 |
| Answer block stacks | `lock_click` | −13 |
| Rain of cubes | `pop` | −18 |
| CTA | `whoosh`, `click`, `level_up` | −13, −9, −13 |

Music: `music:680` (Epical Drums 05, restless hybrid percussion) `drop_s 3`: lowpass under the problems, 0.3 s of
silence before the impact, full from the impact to the end. Alternatives: `music:677` (escalation), `music:369`
(serious trap) for a colder speech.

## CTA design

At the last word the camera card shrinks away, a dark scrim (90 %) covers the room and the room fades out; the
question, "Conta nos comentários", logo, @handle and the Follow button come in (kit baseline). The tower is not
shown behind the CTA: text over physics reads as clutter.

## Implementation notes

- Reference build: `templates/styles/gravidade/build.py` (`heditor new <work> <video> --style gravidade`), driven
  by `<work>/beats.json`; it runs without it (automatic picks) but that is only a baseline.
- Physics: `physkit` (Rapier, baked; `heditor physics` for custom scenes). Bodies carry `tag` = kind; labels and
  colours go to the page in `K.labels` / `K.colors`. `qa/gravity-landings.json` records the landing error of every
  block; the build prints it: keep every error ≤ 0.05 s.
- 8 substeps: rotation-locked blocks hit by a heavy body need them (with 4 the solver launched the weight 4 m up).
- Lanes are chosen from the bake (`clear_lane`), never assumed: debris can slide anywhere.
- Render: canvas 1080×780 with bloom and soft shadows; budget ~1 s of CPU per frame on a 4-core VPS.

## Pitfalls found in production

- **Labels upside down or mirrored**: free rotation lands half the blocks label-down → lock rotation while the heap
  builds and release it only at the blast; never put the label on the top face.
- **The tower built on the wreck**: a fixed tower x collided with debris → choose the lane from the bake and clear it
  with a short shockwave before the first answer block.
- **The weight vanished**: a heavy body landing on rotation-locked blocks was launched out of the frame by the
  solver → 8 substeps and the weight falls straight down (vertical lock) beside the heap.
- **Heap did not move**: a weight resting on the heap pins it by friction → land beside it.
- **Seam between room and page**: ACES darkens the 3D background → page background = rendered colour + faded mask.
- **Late block hidden under the camera card**: a block landing on the tower top sat at the viewport edge → lanes.

## Variations

- **Jenga**: the tower is built first and the impact removes one block (the single point of failure).
- **Scale**: two pans of a balance (static plinths), blocks of the two options falling on each side; the heavier wins.
- **Snow globe**: rain of small cubes in slow gravity (`gravity: [0, -3, 0]`) for calm, reflective speeches.
- **Ad version**: the tower's last block is the offer name; "Learn more" end card (paid-ad safe area).
