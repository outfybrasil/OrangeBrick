---
style: revista
name: Revista (editorial slides with the speaker inset)
family: fixed-style
best_for: structured explanations, course or product modules, step lists and calendars; when the content is the star and the speaker is the guide
reference: technique study of creator Reels built as editorial slide sequences, Oct 2026; not yet used in a delivered edit
---
# Revista (editorial slides with the speaker inset)

The Reel is a sequence of magazine spreads. Each idea gets a charcoal page with a big condensed keyword at the top left, a small italic serif line under it and a rounded portrait window of the speaker on the right; the page then fills with icon chips, cards or a drawing as the speech lists things. Between spreads, the speaker takes the full frame for a breath and an opinion, then shrinks back into the window. Dates and numbers get their own pale-yellow page with a giant figure. The core metaphor: **a well-designed magazine article that the author narrates**.

## When to use / when not to

Use it when:
- the speech has an explicit structure (three steps, a module list, a schedule, before/after);
- clarity matters more than spectacle (teaching, onboarding, offers explained item by item);
- the speaker's framing allows a portrait crop (face and shoulders).

Avoid it when:
- the speech is a story or a confrontation (use `cinema`, `ruptura`);
- the batch already has a slide-driven style (`keynote`, `impacto`);
- the source is a wide shot where a portrait crop loses the face.

## Signature moves

1. **Hook headline**: two-line white caps over the full-frame speaker ("[TOOL] / EDITS VIDEOS"), a punch-in on the reveal phrase, then the first spread.
2. **Editorial spread**: charcoal page, keyword in condensed caps (Bebas/Anton) at the top left, italic serif companion line, rounded portrait window (≈ 30 % wide) on the right with a mini caption.
3. **Icon chips per spoken item**: pastel rounded chips with an icon and a caps label, rotated ±4°, one per item.
4. **Inset morph** (full → window, 0.3 s) and **strip morph** for wider graphics (`../technique-catalogue.md`).
5. **Giant title over the full-frame speaker** with a sparkle on the key concept ("CREATIVITY / in action.").
6. **Self-drawing curve** or a node diagram for a process.
7. **Pale-yellow date page** with a giant number and a calendar icon for dates and deadlines the speech says.
8. **Breather**: about 1 s of clean full-frame speaker after each dense spread.
9. **Learn / create / repeat** style triplets: three words with line icons and an orbit line.
10. **Documentary insert**: a short sepia section (desk collage, date title, map) when the speech tells a historical fact.

## Frame and layout

```
y 0–270      atmosphere (page continues, no info)
y 300–470    keyword (condensed caps, 120–170 px) + serif line (44 px) — left column x 70–640
y 300–900    portrait window right: x 700–1010, 310×600, radius 28 (speaker face centred)
y 520–1180   content area left/full width: chips, cards, drawings
y 1240–1420  captions
y > 1570     no information
```

- Full-frame speaker shots between spreads: face between y 500 and 1000.
- On paid ads, compress the content to y ≤ 1040 and caption at y 1046–1150.

## Palette and typography

| Role | Hex |
|---|---|
| Page | charcoal `#17171b`, page grain 4 % |
| Keyword | off-white `#f3efe6` |
| Serif line | `#d9d4c7` italic |
| Chips | pastel lilac `#cdbcff`, mint `#bff5d8`, peach `#ffd2bd`, black text |
| Date page | pale yellow `#f6eda6`, black figure |
| Sparkle / accent | lime `#c6ff3d` |

Fonts (kit): **Bebas Neue** or **Anton** for keywords; **Playfair Display** italic (or **DM Serif Display**) for the serif line; **Geist** 700/800 for chips and captions. Icons: Lucide (`scissors`, `palette`, `type`, `sparkles`, `calendar`, `infinity`, `repeat`, `book-open`).

## Caption system

Accent-word captions (system 1): Geist 800, sentence case, 1–3 words, 64–70 px, white with a soft shadow, the keyword in lime `#c6ff3d` on charcoal (≈ 14:1), centred at y ≈ 1330. Inside the portrait window, a mini caption (Geist 700, 30 px, 1–2 words) mirrors the active word when the main caption is busy with a list.

## Scene grammar

Generic example: a speaker explaining what a course module covers.

| Beat | Page | What happens |
|---|---|---|
| Hook | full-frame speaker | Two-line caps headline, punch-in on the reveal. |
| Premise | spread "SAME / starting point." | Window on the right, chips for what is *not* done yet. |
| Opinion | full frame | Giant "CREATIVITY / in action." with a sparkle. |
| Items | spreads "INSERTS", "MOTION" | Tilted UI cards with a cursor; chips per item. |
| Method | spread "LEARN. / Create. Repeat." | Line icons on an orbit line. |
| Date | pale-yellow page | Giant day number and month, calendar icon. |
| Comparison | spread "SAME VIDEO. / TWO VIEWS." | Two tilted cards with labels. |
| CTA | full frame | White comment card or the briefing's action. |

## Transitions and motion vocabulary

- Spread in: page slides from `x 100 % → 0` in 0.35 s `expo.out` while the speaker morphs into the window (`scale 1 → .3`, radius 0 → 28) — one combined move.
- Spread out: the window grows back to full frame in 0.3 s; the page stays under it.
- Keyword: `clip-path: inset(0 100% 0 0) → inset(0 0 0 0)` 0.3 s; serif line fades in 0.2 s later.
- Chips: `from {scale:0, rotation:-10}`, `back.out(2)`, on each spoken item.
- Date page: the giant number counts from the previous date only if both are spoken; otherwise it slams in (`scale 1.3 → 1`).

## Sound design

| Action | Category | gain_db | length |
|---|---|---|---|
| Spread in/out | `page_turn` / `swipe` | −28 / −30 | 0.3 |
| Keyword | `typewriter` single or `click` | −30 | 0.15 |
| Chips | `pop` (vary variants) | −30 | 0.2 |
| Sparkle | `magic_sparkle` | −30 | 0.6 |
| Date slam | `stamp` | −26 | 0.3 |
| Curve drawing | `pen_write` | −32 | 0.6 |

**Music:** `music:187` (Mountains, hopeful electronica) for courses and offers, `music:282` for a calmer tutorial, `music:31` for an inspiring module presentation; lift on the date page and the CTA.

## CTA design inside the style

The last spread is the CTA page: keyword "COMMENT" with the word in lime and a cursor, a dark link chip, the speaker pointing from the window; or "LEARN MORE" for ads with the paid-ad layout.

## Implementation notes

- Keep one page component and fill it per beat from DESIGN.md (keyword, serif line, content type, items with their word times).
- The portrait window is the same camera video with `object-fit: cover` and `object-position` from the face track; never a second decode of a different crop.
- Pre-render long serif lines to check they fit (`white-space: nowrap`, fitted font size).

## Pitfalls

- **Template feel**: vary the content type per spread (chips, cards, drawing, number) and alternate with full-frame breathers; never three identical spreads in a row.
- **Tiny window**: the face must stay ≥ 220 px wide in the window.
- **Serif lines too long**: two to four words; longer lines belong in the caption.

## Variations

- **Light magazine**: cream pages, black type, one red accent; for lifestyle or career topics.
- **Recipe**: the left side carries step-by-step drawings (ingredients list, a blender filling, an oven glow) for procedures; speaker in a tall frame on the right.
- **Calendar run**: every spread is a day of a schedule, the date page dominates; for events and launches.
