# Technique catalogue: layouts, illustrations, hooks and CTAs

Building blocks observed in high-retention creator Reels about technology and AI, described generically so any style can borrow them. Depth and 3D techniques (text behind the speaker, scans, exploded layers, hand-anchored objects) live in `depth-and-3d.md`. Every number and name on screen must come from the speech.

## Pacing rules that hold across all of them

- The first frame already carries the hook graphic (title, question card, label sticker, phone mockup). Nothing fades in from black.
- **One illustration per spoken idea**, changing every 1–2 s; a layout change every 5–8 s; a short **breather** (≈ 1 s of clean footage) after a dense beat.
- The visual is triggered by the **verb or noun** in the speech, within 0.1–0.5 s of the word. When the speaker gives instructions ("zoom in", "put it behind me", "turn everything"), the instruction *is* the cue: the edit obeys the voice.
- Lists build one item per spoken item: items start dim (35 % opacity) and light up with a check or the accent colour when said.

## Layouts

| Layout | Look | When |
|---|---|---|
| **Stacked A/B page** | White or light page, heavy black caps heading at y 6–14 %, two rounded 16:9 panels (≈ 95 % wide, ≈ 30 % tall each, radius 14–24) with a label row above each (small icon tile + name). Both panels play the **same take** edited two ways, in sync. | Comparisons: two tools, two prices, cheap vs elaborate, before vs after. |
| **Inset morph** | The full frame scales to ≈ 60 % width pinned to one side in 0.5 s (`expo.out`), radius grows to 28; the free side becomes a text column (eyebrow + title + list). Reverse the same way. | Every new concept or test inside an explanation. |
| **Strip morph** | The frame narrows to a ≈ 30 % wide full-height strip reframed on the face (`clip-path: inset()` + `object-position` from the face track); the graphic fills the other 70 % 0.2 s later. | Diagrams, stacks of cards, curves, prices. |
| **Showcase inset on top** | A permanent inset (≈ 93 % wide, ≈ 29 % tall, 3 % from the top) plays the result/news/proof clip with its own small captions; the speaker below; a white banner with heavy black caps bridges both panels on the hook. | Reacting to a clip, showing the result while talking about it. |
| **Two-band and three-band splits** | B-roll top / speaker bottom with a hard seam; or B-roll / speaker / B-roll with 2 px dark gaps. | Enumerations, "everything you consume…". |
| **Full-bleed cutaway** | The speaker disappears for 3–12 s behind full-screen proof (screen recording, footage, AI still with a slow push); captions continue in the same place. | Proof, demonstrations, the strongest footage first. |
| **Letterbox meme frame** | A 16:9 clip centred on black (y 34–66 %), a static two-line caption in the top bar, lowercase, no box. | One-line scenario jokes ("2037: you finally…"), no talking head. |
| **Editorial slide** | Charcoal slide: condensed heavy keyword top-left, a small italic serif line under it, a rounded portrait inset (≈ 30 % wide) of the speaker on the right with its own mini caption; a pale-yellow variant with a giant number for dates. | Structured explanations, course modules, calendars. |
| **Side frame** | The speaker in a tall rounded frame on the right; the left is a blurred version of the room or a flat cream page that carries step-by-step motion graphics. | Recipes, procedures, how-tos. |

## Illustrations

- **Concept cards around the head**: 3–4 dark rounded cards with a violet outline at the corners around the head, an icon each, the label appearing under each card as its word is spoken.
- **Feature cards with connectors**: dark cards (icon + caps label) popping 0.4–0.5 s apart, linked by dotted curves that draw on (`stroke-dashoffset`).
- **Icon chips for a spoken list**: pastel rounded chips with an icon and caps label, each rotated ±4°, `from {scale:0, rotation:-10}` with `back.out(2)`.
- **Self-drawing curve**: an accent curve with a dot at the tip drawing left to right in 0.6 s, words added under it one by one in step with the speech.
- **Pseudo-3D card stack**: 3–4 cards skewed a few degrees and offset down-right; the front card solid accent, the rest outlined; builds card by card.
- **Coin stack / bar comparison**: one flat disc vs a tall stack (stacked CSS ellipses with gradients, `scaleY` stagger), the spoken figure in big accent numerals, a glow under it.
- **Scoreboard HUD**: translucent grid cells, a tiny header, two badges at the bottom and percentages counting up as they are spoken, with bars growing (`scaleY`).
- **Phone mockup with live counters**: a dark rounded phone, slightly tilted, showing an upload ("Posting…"), a post count and a like badge counting up; pill status label; soft shadow.
- **Editing-app mockup**: the video shrinks into a 9:16 preview over a fake multitrack timeline with a waveform and a red playhead; command buttons that tick to done; a progress percentage; a big green check; the preview then grows until it fills the frame (zoom-through exit).
- **Transcript panel**: waveform across the top, the words appearing timed with the active word in accent, "…became the prompt" as the payoff.
- **Pipeline HUD**: a persistent top pill with a red dot + "EDITING LIVE" + ticking timecode, and a numbered stage tag ("01 DEPTH", "02 CUTOUT", …) that flips on each section; it turns green ("DONE") at the end.
- **Strike and replace**: a grey line struck through (`scaleX` line, 0.25 s), then the accent replacement line beneath ("not X → only Y").
- **Kinetic headline build**: a small letter-spaced kicker, then big caps lines added as they are spoken, one accent word in a gradient.
- **Light burst**: white-lilac core, halo and conic rays above the head on the key concept word, 1–2 s, shrinking to a sparkle (`mix-blend-mode: screen`).
- **Hand-drawn stroke callout**: an SVG oval drawing around an object in 0.5 s with a bright leading tip.
- **Concept constellation**: numbered pills orbiting a centre badge, staggered in as a recap.
- **Documentary mode** (a section, not a whole video): desaturate/sepia, Ken Burns on a desk collage, a date title over a darkened photo, an animated map with a hatched area and drawn routes, grain and vignette, introduced by a tiny chapter label.
- **Exploded product/house model**: an object on a glowing ring plinth turns slowly, then its parts separate with numbered leader-line callouts and reassemble (three.js, see `depth-and-3d.md`).

## Camera moves

- **Hard punch-in**: 1.15–2× on a cut at the payoff word or a rhetorical address ("did you get what just happened?"), held 1.5–2 s, then back.
- **Slow digital zoom with a reticle**: 1.0 → 1.3 over ~1 s with thin corner brackets drawing in, on the word "zoom" / "closer".
- **Whip pan**: ≈ 0.5 s horizontal blur from face to a screen (or a synthetic one: `x −120 %` with a horizontal `feGaussianBlur stdDeviation="30 0"`, cut at mid-blur).
- **Phone-filmed screen as proof**: a handheld, angled view of a monitor or laptop with a finger pointing at the timeline; fake it with `perspective(1200px) rotateY(-8deg) rotateX(4deg)`, a slow drift, light moiré and a hand plate, or film it for real. Proof footage beats a clean screen capture for believability.

## Captions

Three systems recur; choose one per video and keep it consistent:
1. **Accent-word captions**: heavy rounded geometric sans (Montserrat/Poppins ExtraBold look), 1–3 words, sentence case, white with a soft dark shadow, the key word in the accent colour (lavender, coral or lime), around 65–75 % of the height over the chest; emphasis words jump to giant condensed caps (sometimes italic) for one beat.
2. **Outline captions**: lowercase heavy grotesk, white with a thick black stroke (`-webkit-text-stroke: 6px #000; paint-order: stroke fill`), 1–4 words, around 78–83 % of the height, no active-word colour; a word is stressed only by setting it in caps. Hard swap per phrase.
3. **Small phrase subtitles**: small white sans (≈ 3 % of the height), 3–7 words, at the bottom of a panel; used inside A/B panels and insets where the graphics carry the emphasis.

Captions never sit behind the speaker; keep them in the front layer. Move them up (y ≈ 22–25 %) when the hands work in the lower frame.

## Hooks (first 0–3 s)

- A question card styled like a platform "ask me a question" sticker (dark header, white body, the viewer's question) that disappears at the payoff.
- A white rounded label sticker at the top ("[TOOL] / EDITING REELS" with a small icon) held for the hook.
- The raw → edited background reveal (`depth-and-3d.md` §12).
- A phone mockup counting posts/likes up.
- A big two-line caps headline that asks the question of the video, partly behind the speaker.
- The strongest footage first, full screen, with the caption already running.
- A "year:" future-scenario caption over a strange image.

## CTAs

- **Comment-to-DM demo**: a fake comment bar pops over the torso, the keyword is typed and sent, a bubble pops, then a DM notification slides in at the top ("Here is your GUIDE", keyword in the accent colour). The speaker points at it.
- **Comment keyword card**: small caps "COMMENT" above a large accent keyword with an underline and a blinking cursor, then a dark link chip.
- **Choice card**: "A or B?" building left then right, asking the viewer to answer in the comments.
- **Follow pill**: a white profile pill (avatar, handle, tick, Follow) above the head.

Use the user's real handle and keyword; never promise a DM automation that does not exist. The CTA of a style follows the briefing (see `../SKILL.md`), not the reference.

## Formats that need material heditor does not generate

- **AI-simulated persona** (the speaker shown in another profession's set and outfit): needs a video-generation tool and consent; always keep a permanent disclosure pill ("AI simulation — not a real <profession>") on screen and never present it as real.
- **AI-generated UGC or cinematic inserts** (impossible animals, robot crowds): treat as B-roll the user supplies; label it as AI-generated when the platform or the context requires it.
