---
style: album
name: Álbum (sticker album)
family: fixed-style
best_for: remarketing ads with a "Learn more" CTA that answer "what do you use / what is inside?" with a long list of named items (tools, technologies, ingredients, modules); every named item becomes a sticker pasted into an album on its exact word
reference: produced by the PycodeBR team with heditor, Oct 2026
---
# Álbum (sticker album)

The Reel is a sticker album being completed while the speaker talks. A sealed sticker pack opens at the hook, and from then on every item the speaker names becomes a die-cut sticker (white border, holographic band) pasted into its dashed slot on the exact word. Pages are grouped by theme (tools, the special "method" page, the system, the stack, infrastructure, planning, what you take), a page-turn separates them, a holographic special sticker flips for the key idea, real photos of the work are taped in as proof, and a tray at the bottom ("MY COLLECTION") fills one slot per sticker until it lights up complete. In the CTA a dashed slot says "MISSING ONE!" and the white "LEARN MORE ›" sticker lands in it on the word. The speaker appears as a photo sticker card (white border, rounded corners, hard shadow, a small "TEACHER" label) that changes size and side per page. The core metaphor: **the stack is a collection, and the viewer is one sticker away from completing it**.

## When to use / when not to

Use it when the speech:
- lists many named items (8–15) that the viewer may not know ("we use X, Y and Z…");
- groups them naturally (tools, technologies, process steps, deliverables);
- has a "this is what matters" item that deserves a special sticker;
- ends with an action that "completes" something.

Avoid it when:
- there are only 2–3 items (the album looks empty);
- the items are brands whose logos you are not allowed to use and typographic stickers would be unreadable (very long names);
- the tone is serious or the audience senior and formal;
- the batch already has a sticker-heavy world (`stories`).

### Logos and trademarks
Do not paste third-party logos by default. Use **typographic stickers**: the item name in a bold condensed face on a coloured disc, or a monogram (initials) with a colour of your choice that does not imitate the brand. Use an official logo only when its licence and the trademark owner's guidelines allow that use **and** the user explicitly authorises it; record source, licence and authorisation in DESIGN.md. Never imply endorsement or partnership. (The reference production used logos authorised by the user; the public recipe defaults to typography.)

## Signature moves

1. **Sealed pack at frame 0**: the hook question as a one-line title, the speaker large in the centre (scale 1.3), a pack "STICKERS OF THE ? STACK"; the product seal on the product name; the pack bursts on the end of the question and three stickers jump out.
2. **Sticker on the word**: each named item pops into its slot at `word.start` (scale 1.25 → 1, slight rotation, white border, holographic sweep).
3. **Slots wobble** on "you can choose": empty dashed slots shake, inviting.
4. **Choice stamp**: "YOUR CHOICE" stamped when the speaker says the tool does not matter.
5. **Special holographic sticker** (★ slot) that flips on the key idea; the four items of the previous page reappear small below it on "any of them".
6. **Taped photos as proof**: real screenshots (code, architecture diagram, planning document, sprint checklist) taped onto the page with a camera shutter sound.
7. **Collection tray**: 12 slots at the bottom fill as stickers are pasted and light up on the "complete" word ("STACK COMPLETE" stamp).
8. **"MISSING ONE!"** slot in the CTA receiving the white "LEARN MORE ›" sticker.

## Frame and layout

Canvas 1080×1920, 30 fps, Paid-ad variant (`../captions-and-layout.md`).

```
y 0–270     background only (grape #392e58, dot pattern, dashed stitch seam)
y 300–420   header: Inter eyebrow + Fredoka title on one line
y 466–1156  camera sticker card 504×690 at x 540 (right) or x 36 (left); hook: scale 1.3, centred
y 466–1032  album page 470×566 in the opposite column
y 1046–1150 caption box
y 1196–1290 decorative tray "MY COLLECTION" (12 slots; below 1152 on purpose: not critical)
```

- Camera card: the original video (no grade), 12 px `#fffaf3` border, radius 28, hard offset shadow, holographic sheen only during changes, small label "TEACHER" (or the user's role) at the bottom.
- Pages and scenes that switch sides enter 0.3 s after the card starts moving, so nothing crosses the face.

## Palette and typography

| Role | Hex |
|---|---|
| Background grape | `#392e58` with a dot pattern and a dashed stitch seam |
| Album page | `#e8ddf1`, 8 px border `#fff5ef`, radius `12px 26px 26px 12px` (spine on the left) |
| Empty slots | 3 px dashed `#a597b3` on `rgba(255,255,255,.28)`, radius 14 |
| Sticker body | `#fffaf3`, 7 px white border, hard shadow `4px 6px 0 rgba(33,24,47,.35)` |
| Holographic special | 9 px white border, shadow `8px 11px 0 #1d1530`, iridescent sweep (pink `#ffd6f2`, mint `#bcead2`, lilac `#cdbbe6`) |
| Ink | `#30233f`, secondary `#5b4a6e` |
| Stamps | orange `#ffad65` with a 6 px white border |
| Camera card | 12 px border `#fffaf3`, radius 28 |
| Caption box | `#21182f`, border `#e1d5ec` |
| Active word | black on `#ffd84d` |

Fonts (OFL, in the kit): **Fredoka** 700 (page titles, sticker labels), **Anton** (captions, stamps), **Inter** (eyebrows, small text). Icons: Lucide (`package`, `star`, `camera`, `layers`, `server`, `cloud`, `database`, `file-text`, `list-checks`, `pointer`).

## Caption system

"Album label": `#21182f` box, 3 px `#e1d5ec` border, radius 12, Anton uppercase white, `font: var(--fs, 78px)/1.12 Anton`, one line, ≤ 800 px.

- Grouping: ≤ 3 words; item names keep their official spelling in the captions (fix them in `words-reviewed.json`).
- Active word: **black on `#ffd84d`** (≈ 13:1), active from the first frame of each caption.

```css
.capwrap{left:0;top:1046px;width:1080px;height:106px;z-index:30;display:flex;align-items:center;justify-content:center}
.cap{max-width:800px;font:var(--fs,78px)/1.12 Anton;text-transform:uppercase;white-space:nowrap;background:#21182f;
  border:3px solid #e1d5ec;border-radius:12px;padding:4px 20px 0;color:#fff}
.cap .w{display:inline-block;border-radius:8px;padding:0 .08em;margin:0 .02em}
```

## Scene grammar

Generic example: a speaker answering which tools a course uses: the coding assistant is the student's choice, the method is what matters, the course project uses a named stack from database to cloud, planning is done with AI, and the materials come included.

| Beat | Page | Card | What happens |
|---|---|---|---|
| Hook | Pack | centre 1.3 | Title, pack, product seal; pack opens on the end of the question; three stickers jump. |
| Tools | "AI TOOLS" | right | Slots wobble on "choose"; one sticker per spoken tool; "YOUR CHOICE" stamp. |
| Key idea | ★ special | left | Holographic "WORKFLOW" sticker flips on the word; previous stickers small below on "any". |
| The system | Photo | right | Taped photo of real code; chips with the spoken description. |
| Stack | "SYSTEM TECHNOLOGIES" | left | One sticker per spoken technology. |
| Infrastructure | "INFRA" | right | Database, deploy, server, cloud; architecture photo; tray lights on "cloud" + "STACK COMPLETE". |
| Planning | "METHOD" | left | Planning document photo → sprint checklist photo; stickers for each spoken artefact; tape "WELL-DESIGNED METHOD". |
| You take | "YOU TAKE" | right | Four stickers for the deliverables (spoken or confirmed product facts). |
| Spoken CTA | Last page | left | Brand, "MISSING ONE!" slot, white "LEARN MORE ›" sticker on "learn"; chips for "visit the site / secure your spot". |
| End card (4 s) | "ALBUM COMPLETE" | out | Brand, full collection, button, "TAP LEARN MORE". |

Rules: one sticker per spoken item, on its word; no numbers, prices or scarcity; photos cropped so no personal data or business numbers are legible.

## Transitions and motion vocabulary

- **Sticker paste**: from `scale 1.25, rotation ±10, opacity 0` to `scale 1, rotation ±3` in 0.14 s `back.out(2.6)`; holographic band sweeps across (`background-position`) 0.5 s.
- **Page turn**: the page `rotationY 0 → −90` (origin left) 0.2 s, new page `90 → 0` 0.25 s, perspective 1800 px.
- **Holographic flip**: `rotationY 180 → 0` with `backface-visibility: hidden`, 0.4 s `power3.out`.
- **Card move**: camera card tween `x/scale/rotation` 0.45 s `expo.inOut`; pages enter 0.3 s later.
- **Tray fill**: slot `background` from dashed to the sticker colour, tiny pop.

## Sound design

| Action | Category | gain_db | length |
|---|---|---|---|
| Each sticker | `pop` (vary rate .95–1.1) | −31 to −29 | 0.14 |
| Pack / holographic flip | `magic_sparkle` | −27 | 0.5 |
| Page turns | `page_turn` | −27 to −24 | 0.3 |
| Taped photos | `camera_shutter` | −29 | 0.2 |
| Stamps | `stamp` | −25 to −21 | 0.3 |
| Stack complete | `level_up` | −27 | 0.6 |
| Tape | `swipe` | −29 | 0.3 |
| Before "learn more" (not over it) | `whoosh` | −30 | 0.3 |
| End card | `success_chime` | −20 | 0.8 |

With 20+ stickers, keep pops short and quiet so the voice stays clear (SFX p95 ≈ −49 dB under the voice in the reference).

**Music:** `music:82` (Keeping Fit, quirky chiptune groove) — reference. Full on the hook and the tools page, `lowpass` through the development, full again on the CTA, fade on the end card. Alternatives: `music:282` (lo-fi) for a calmer collection, `music:623` for a techier one.

```json
[{"start":0,"end":"DEV","mode":"full","track":"A","src":5.0,"fade_in":0.1,"fade_out":0.25},
 {"start":"DEV","end":"CTA","mode":"lowpass","track":"A","src":"t+5","fade_in":0.25,"fade_out":0.25},
 {"start":"CTA","end":"DURATION","mode":"full","track":"A","src":"t+5","fade_in":0.25,"fade_out":1.0}]
```

## CTA design inside the style

Last page: brand mark, a dashed "MISSING ONE!" slot; on "learn" the white "LEARN MORE ›" sticker pastes into it; chips for the spoken steps. End card (4 s): "ALBUM COMPLETE", brand, the full collection, the button and "TAP LEARN MORE".

## Implementation notes

- Stickers: one component (white border via `outline`/padding, inner disc colour, label in Fredoka, optional icon or authorised logo), positioned by page slot coordinates in `K.pages`.
- Typographic stickers: initials or the short name in Anton on a colour disc; pick colours from your palette, not from the brand being named.
- The album was born from a matting failure: the person matte kept a chair stuck to the head and shoulder, and cleaning it bit the shoulder. The photo-sticker card turned the fallback into the style's identity.
- Item names are hard for ASR; expect a low absolute `asr-check` similarity on both clean voice and master and judge by the delta.

## Pitfalls found in production

- **Stamp outside the stickers** and **hook stickers overlapping**: lay out stamps inside the page bounds; separate the three hook stickers.
- **Pages over the card during side changes**: delay pages 0.3 s.
- **Empty pages** looked broken: draw the dashed slots before stickers arrive.
- **CTA hint low contrast**: raise it to white on dark.
- **Active word missing on the first frame** of a caption: set the first word active at the caption start.
- **Colloquial spelling**: "click here on learn more" was misheard in the source ASR; the caption follows what was said.

## Variations

- **Trading cards**: each item is a card with a short spoken stat on the back (only spoken stats); for comparisons.
- **Badge wall**: items as embroidered patches on a jacket; for skills and achievements.
- **Recipe album**: ingredients as stickers; for food or "formula" content. Music `music:282`.
- **Organic version**: "which sticker are you missing?" with a Follow card.
