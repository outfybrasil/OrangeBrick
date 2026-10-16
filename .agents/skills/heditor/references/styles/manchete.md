---
style: manchete
name: Manchete (headline inset on top)
family: fixed-style
best_for: reacting to news, a viral clip, a post or a result; commentary where the viewer must see the subject and the speaker at the same time
reference: technique study of creator Reels reacting to AI news and showcasing results, Oct 2026; not yet used in a delivered edit
---
# Manchete (headline inset on top)

The top of the screen is a **news slot**: a permanent inset that plays the subject being discussed (a clip, a post, a screenshot, a result), with a heavy white headline banner bridging the inset and the speaker below. The speaker comments from the lower half like an anchor reacting live; the inset swaps its content every 2–4 s as the commentary moves (a new angle, a post card, a title card), and occasionally the subject takes the whole screen for the strongest moment. The core metaphor: **the headline is on top, the opinion is below**.

## When to use / when not to

Use it when:
- the speech reacts to something external the viewer must see (news, a release, a viral clip, a public post, a result);
- you have the subject material (clips, screenshots, images) with the right to show it, or the user's own result;
- the tone is commentary: surprise, analysis, a hot take.

Avoid it when:
- there is no subject material (an empty inset is worse than a full-frame speaker);
- the subject footage is copyrighted and not quoted for commentary, or shows private people;
- the speech is a tutorial (use `bancada` or `revista`).

## Signature moves

1. **Headline banner** on the hook: white rounded card overlapping the inset's bottom edge, heavy black caps, two lines ("THEY CUT ITS WINGS / THE MODEL WAS NERFED"), held 3–6 s.
2. **Persistent top inset**: ≈ 93 % wide, ≈ 29 % tall, 3 % from the top of the safe area, radius 16, its own small captions when it has audio.
3. **Content swaps in the inset** every 2–4 s: another angle, a post card (dark social post with avatar, name, text), a title card ("SAME VIDEO, TWO VIEWS"), a date card.
4. **Strongest footage first**: the hook can be the subject full-bleed for 2–3 s with the caption already running, then the layout settles.
5. **Full-bleed cutaway** for the peak of the story (3–8 s), captions continuing.
6. **Band splits** for enumerations: subject / speaker (two bands) or subject / speaker / subject (three bands, 2 px dark seams).
7. **Hard punch-in** on the speaker for the rhetorical line ("did you understand what just happened?").
8. **Inset title behind the inset's person** when the subject is the user's own result with a matte (`../depth-and-3d.md` §1), e.g. "12 AIs" behind the person in the inset.
9. **Question sticker** variant: a viewer question card at the top as the hook, removed at the answer.

## Frame and layout

```
y 0–270      atmosphere
y 290–850    top inset (x 38–1042, 1004×560, radius 16)
y 800–900    headline banner overlapping the inset bottom (hook) — white, 900 px max
y 860–1920   speaker (full width, face between y 1000 and 1350)
y 1430–1560  captions (over the speaker's chest)
y > 1600     no information
```

- The speaker is graded warm and natural; the inset keeps its own look (often cooler), the contrast separates them.
- When the inset goes full-bleed, captions stay at the same y.

## Palette and typography

| Role | Hex |
|---|---|
| Banner | `#ffffff`, text `#0b0b0f`, shadow `0 12px 30px rgba(0,0,0,.35)` |
| Inset frame | 2 px `rgba(255,255,255,.18)`, background `#0b0b0f` |
| Post card | `#000000` with `#e7e9ea` text, `#71767b` meta |
| Accent | red `#ff3b30` for BREAKING-like tags (only if the speech frames it as news) |

Fonts (kit): **Geist** 900 for the banner and captions; **Inter** for post cards; **Bebas Neue** for title cards inside the inset; **Playfair Display** italic for a second line ("in action.") on title cards.

## Caption system

Outline captions (system 2 in `../technique-catalogue.md`): lowercase Geist 800–900, white with a black stroke, 1–5 words, 58–66 px, centred at y ≈ 1490 (over the speaker), keeping the source punctuation, hard swap per phrase. The inset uses small white phrase subtitles at its own bottom when its audio matters.

## Scene grammar

Generic example: a speaker reacting to news that an AI model became worse.

| Beat | Inset | Speaker | What happens |
|---|---|---|---|
| Hook | subject clip | below | Headline banner across the seam, caption running. |
| Context | post card | below | The public post that started it (blurred handles if private). |
| Explanation | new angle | below | Inset swaps on each new fact. |
| Peak | full-bleed | — | The strongest footage takes the screen 3–6 s. |
| Enumeration | three bands | middle band | Subject / speaker / subject. |
| Rhetorical line | — | punch-in | Hard 1.6× crop for 1.5 s. |
| Opinion | title card | below | "WHO EDITED BETTER?" or the speaker's verdict as a title card. |
| CTA | brand card | below | The briefing's action; the inset shows the brand or the keyword. |

## Transitions and motion vocabulary

- Inset content: hard cuts only (news pace); a 1-frame white flash at most.
- Banner: `y −20 → 0`, `opacity`, 0.25 s on frame 0–3; leaves with `y −20`, 0.2 s.
- Full-bleed: the inset scales to full frame in 0.35 s `expo.inOut` and back.
- Bands: instant layout switch on the spoken enumeration, no tween.

## Sound design

| Action | Category | gain_db | length |
|---|---|---|---|
| Banner | `tv_news_sting` (short) or `pop` | −26 / −28 | 0.6 / 0.2 |
| Inset swap | `click` / `camera_shutter` | −32 | 0.15 |
| Full-bleed | `whoosh` + `sub_drop` (gap) | −26 / −22 | 0.4 / 0.8 |
| Punch-in | `bass_impact` | −26 | 0.4 |
| Post card | `notify` | −30 | 0.3 |

**Music:** `music:293` (Lord Knows, serious trap) for hot takes, `music:597` (Vertigo) for a mystery/news angle, `music:82` for a light reaction. Keep the subject's own audio under the voice or mute it; never let two voices overlap.

## CTA design inside the style

The inset becomes the CTA slot: the brand card or the keyword in big type, while the speaker says the action; for a debate CTA, the inset shows the two options and the banner says "WHAT DO YOU THINK?".

## Implementation notes

- Collect subject material first and list its source and licence in DESIGN.md (commentary quotes stay short).
- Inset videos are `.clip` elements inside `#inset` with their own `data-media-start`; title cards are HTML.
- Speaker: crop the source to 1080×1060 around the face for the lower half (use the face track).

## Pitfalls

- **Private people** in third-party footage or posts: blur faces and handles unless they are public figures in a public context.
- **Unverified claims**: the banner states what the speaker says, framed as the speaker's claim; never add numbers.
- **Inset too small for text**: post cards must be cropped to the relevant lines and enlarged.

## Variations

- **Showcase**: the inset shows the user's own result (an edit, an app), the banner asks the price question ("Would you pay X for this?"), title cards alternate condensed caps and italic serif lines.
- **Letterbox meme**: no speaker, a 16:9 clip centred on black with a two-line caption on top ("2037: you finally…"), for one-joke posts.
- **Q&A**: a viewer question sticker replaces the banner; the inset shows the answer material.
