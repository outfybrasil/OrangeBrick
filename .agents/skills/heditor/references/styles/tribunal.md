---
style: tribunal
name: Tribunal (courtroom sketch)
family: fixed-style
best_for: talks whose argument already has the shape of a trial (something is "blamed", a defence explains it, two pieces of evidence are compared, a verdict closes it), e.g. "it is not the tool, it is how you use it"; organic Reels with a comment question and Follow
reference: produced by the PycodeBR team with heditor, Oct 2026
---
# Tribunal (courtroom sketch)

The Reel is a court session drawn as a **courtroom sketch**: pastel and charcoal on beige paper, mahogany wood, a burgundy curtain. The speaker testifies as an **expert witness by video link** on the courtroom monitor (true to a webcam recording), and the camera itself opens as a live drawing and turns into video with a pencil pass, then becomes a drawing again at the end, as the record of the session. The court clerk types the **testimony record**, which is the caption, word by word. Evidence enters the **case file** with coloured exhibit tags and rubber stamps, a red pen strikes the wrongly accused, a pencil diagram explains the defence, two phones become Exhibit A and Exhibit B, and the **sentence** rises on letterhead paper. The jury, seven charcoal silhouettes seen from behind, reacts at the bottom. In the CTA the jury turns to the viewer: "THE JURY IS YOU", with two ballots falling into an urn. The core metaphor: **the accused is innocent; the real culprit is the misuse**.

## When to use / when not to

Use it when the speech:
- blames or clears something ("it has nothing to do with X", "it depends on how you use it");
- contrasts two behaviours or cases that can be exhibits (reactive vs mass, right vs wrong use);
- ends on a rule or policy that can be read as a verdict.

Avoid it when:
- there is no accusation/defence structure (the court becomes decoration);
- the topic involves a real legal case, a real person accused, crime or tragedy;
- the batch has another paper world (`documentario` serif chapters, dossier/file formats) or the brand needs a dark, techy look;
- the speaker would object to a "judge" frame.

## Signature moves

1. **Session open at frame 0**: gavel strike, court plaque "CASE · <TOPIC>", an index card "DEFENDANT · ACCUSED OF <HARM> / <TOOL>" already in the file (visual hook), monitor with the speaker as a live drawing, the testimony record ready.
2. **Drawing → video**: at ~0.45 s a pencil pass wipes across the monitor (clip-path following a pencil stroke) and the sketch becomes live video.
3. **Red pen strike**: the accused card gets a red line left to right on the spoken name; a second card ("ANY TOOL") is struck and both fall.
4. **Open loop**: a new card "NEW DEFENDANT: who?" with a silhouette and the word circled by hand; it closes with the verdict.
5. **Defence in pencil**: a layered diagram (YOUR SYSTEM / <LAYER> / <PLATFORM>) draws itself; a blue "DEFENCE" tag; a messy scribble turns into straight arrows on "simplifies"; a branch shows the option not used.
6. **Clipped case note** for a technical definition (kept on screen ≥ 3.5 s): a short, correct definition of the term the speaker uses, as a note pinned with a paper clip.
7. **Exhibit A / B**: yellow and blue exhibit tags slapped on generic CSS devices; A shows the right use working calmly; B shows the misuse escalating (in a messaging case: dozens of envelopes fanning out to a contact grid, contacts turning red, report flags and block icons), then a red stamp with the consequence lands and the screen cracks; the jury gasps.
8. **Sentence**: letterhead paper rises, the rule written large with a highlighter; gavel in the internal pause; double stamp: THE TOOL → ACQUITTED (green), THE MISUSE → GUILTY (red); the session agenda gets "Sentence ✓".
9. **Jury as the audience** in the CTA, ballots and an urn.

## Frame and layout

Canvas 1080×1920, 30 fps. Organic safe zones.

```
y 0–270     ceiling wood, lamps, a faint drawn scale: no text
y 292–392   court plaque: mahogany bar, gold DM Serif 50 px (accents ≥ 300); changes per act
y 420–1005  monitor: tribune state 780×585 at x 150; testimony state 468×351 at x 60 with the session agenda at x 560–1010, y 420–771
y 800–1215  case file: cards, diagram, exhibits, sentence (x 60–950; nothing critical beyond x 950 between y 1000 and 1215)
y 1236–1452 testimony record (caption)
y > 1470    jury bench: wooden rail and seven silhouettes (atmosphere and reaction only)
```

- The monitor is never covered; cards and exhibits sit below it or in the agenda column. The monitor carries a strip "EXPERT · <NAME>" (true role: the speaker is the expert being heard).
- A low-resolution webcam (e.g. a 320×240 meeting tile upscaled to 960×720) should not exceed ~900 px wide.

## Palette and typography

| Role | Hex |
|---|---|
| Paper | `#e9dcc3`, variation `#dccbaa`, shadow `#c9b48c` |
| Charcoal ink | `#2b2522` |
| Mahogany | `#5b2c1a` / `#3f1d10`, trims `#8a5536` |
| Burgundy curtain | `#7a1f2b` |
| Plaque gold | `#edc580` |
| Defence blue (exhibit B tag) | `#8fb8d6` |
| Exhibit yellow (A tag) | `#f4d35e` |
| Acquitted green | `#5f9e6e` |
| Stamp red | `#c0322b` |
| Highlighter (active word) | `#ffd84d` |

Exhibit-tag colours follow real court practice (prosecution/plaintiff yellow, defence blue). Fonts (OFL, in the kit): **DM Serif Display** (plaques, case file, sentence), **IBM Plex Mono** Regular/Bold (testimony record), **Caveat** (sketch artist's handwritten notes), **Bebas Neue** (stamps and tags), **Geist** (monitor labels, CTA). Icons: Lucide (`gavel`, `scale`, `bot`, `flag`, `ban`, `paperclip`, `user`, `message-circle`, `mail`, `check`, `pointer`).

## Caption system

"Testimony record": white paper strip `#fbf7ee` at x 60, y 1236, 900 × 216, radius 4, a pink margin line at x 44, a header "TESTIMONY RECORD" in Plex Mono 22 px, letter-spacing 4 px, `#7a6c58`; the text in **IBM Plex Mono Bold 50 px**, `#111`, line-height 1.3, up to 2 lines. Words appear when spoken (synchronised typing).

- Active word: **pure black on highlighter `#ffd84d`** (≈ 15:1).
- Each line stays until the next one starts (no empty record between groups); the record leaves with the last word.

```css
#termo{position:absolute;left:60px;top:1236px;width:900px;height:216px;background:#fbf7ee;border-radius:4px;z-index:25;box-shadow:0 10px 24px rgba(43,37,34,.25)}
#termo:before{content:'';position:absolute;left:44px;top:0;width:2px;height:100%;background:#e0a9a9}
#termo .th{position:absolute;left:64px;top:12px;font-family:Plex;font-weight:400;font-size:22px;letter-spacing:4px;color:#7a6c58}
.capw{left:124px;top:1280px;width:820px;height:160px;z-index:30}
.cap .t{font-family:Plex;font-weight:700;font-size:50px;line-height:1.3;color:#111;letter-spacing:-.5px}
.cap .w{display:inline-block;opacity:0;padding:0 .1em;margin:0 -.04em;border-radius:6px;background:rgba(255,216,77,0)}
```

## Scene grammar

Generic example: a speaker arguing that an app is slow not because of the framework but because of how it is used: in their own project it loads only what each screen needs and stays fast, while loading everything everywhere makes any framework slow; the rule is the usage pattern.

| Beat | Act (plaque) | What happens |
|---|---|---|
| Hook | CASE · <TOPIC> | Gavel, accused card on frame 0, monitor drawing → video. |
| "Not the tool" | — | Red pen strikes the card; "ANY TOOL" struck; both fall. |
| "It is how you use it" | — | "NEW DEFENDANT: who?" card, word circled; jury murmur. |
| Explanation | THE DEFENCE SPEAKS | Monitor shrinks to testimony state; agenda appears; layer diagram draws; DEFENCE tag; scribble → arrows; branch "not used". |
| Technical term | — | Clipped note with a correct one-line definition (≥ 3.5 s). |
| Principle | IT ALL DEPENDS ON USE | "USE" underlined by hand; light gavel; agenda: Defence ✓. |
| Evidence A | EXHIBIT A | Yellow tag on a generic device; the right use plays out (only what is needed loads, a fast check mark); green stamp with the speaker's experience, marked as "expert's account"; arrows FIRST → THEN for the spoken order; jury nods. |
| Turn | EXHIBIT B | Music silence 0.45 s, impact + drop; blue tag; the misuse plays out on the second device (everything loading at once, warnings piling up); red stamp with the consequence the speaker names, cracked screen, gasp in the pause. |
| Any tool | — | Two tags ("WITH <TOOL A>", "WITH <TOOL B>") linked to the same red stamp: the consequence does not depend on the tool. |
| Verdict | SENTENCE | Silence of the court, short riser; sentence rises; rule highlighted; gavel; at the end of the voice: ACQUITTED / GUILTY stamps, agenda ✓, monitor back to drawing. |
| CTA (5–6 s) | THE JURY IS YOU | Question card, ballots for the two answers fall into the urn, "Tell us in the comments", brand seal, handle, Follow stamped "Following". |

Rules: technical nuance on screen (a definition, "expert's account" rather than a guarantee, ACQUITTED rather than "safe"); no third-party logos (platforms only as text); phones and bubbles generic, no numbers, names or real messages; no digits ("1st", folio numbers); order said as FIRST/THEN.

## Transitions and motion vocabulary

- Strokes that draw themselves (`stroke-dashoffset`); hide SVG paths with `marker-end` until their stroke starts (markers render early).
- Papers slide in with a slight rotation (±3°) and settle; flips for cards (`rotationY`).
- Stamps: `scale 1.6 → 1`, small shake; ink texture via an SVG filter (`feTurbulence` + `feDisplacementMap`) applied **only** to stamps (small elements) to keep rendering light.
- Pen strike: a red line `scaleX 0 → 1` from the left, 0.25 s.
- Gavel: 6–8 px screen shake, 0.12 s.
- Camera punch-in on key words; jury heads bob or turn (`rotation` ±4°, `y` 4 px).

## Sound design

| Action | Category | gain_db | length |
|---|---|---|---|
| Gavel (synth) | `gavel` hard / light | −15 (open) / −19 (light) / up to −11 at the verdict | 0.9 / 0.5 |
| Typing the record (start) | `typewriter` | −27 | 0.5 |
| Pen strikes, circles, writing | `pen_write` | −26 to −23 | 0.35 |
| Cards / papers | `swipe`, `page_turn` | −24 to −18 / −19 to −17 | 0.3 |
| Jury | `crowd_murmur` | −27 to −25 | 1.0 |
| Diagram pieces / tags | `pop`, `click` | −26 to −17 / −26 to −21 | 0.15 |
| Stamps | `stamp` | −24 to −10 (verdict) | 0.3 |
| Exhibit A | `data_beep`, `message_received`, `message_sent`, `success` | −26 to −25 | 0.3 |
| Exhibit B | `copy_paste_multiply`, `phone_notification`, `error_ding`, `lock_click` | −28 to −21 | 0.3–0.6 |
| Red stamp | `glass_crack` + `human_gasp` (in the pause) | −19 / −20 | 0.6 |
| Turn / verdict | `whoosh`, `trailer_hit`, `riser` | −16 / −12 / −22 | 0.5–1.0 |
| CTA | `mouse_click`, `success_chime` | −11 / −15 | 0.2 / 0.8 |

Strong impacts (gavel, red stamp, verdict) in pauses; SFX over words ≤ −20 dB.

Synthesised gavel (numpy, deterministic, no sample): wooden modes at 182, 415, 960 and 1730 Hz (amplitudes 1, .7, .45, .25; decays 90, 50, 25, 12 ms) + a 4 ms noise click + a short room tail (convolution with 50 ms decaying noise at 3.5 %), a rebound copy at +110 ms for the hard strike; 0.9 s hard, 0.5 s light.

**Music:** `music:871` (Fright Night, dramatic suspense with an escalation around 48–50 s of the file) — reference. 0 → defence `full −3.5 dB`; defence and Exhibit A `lowpass`; 0.45 s silence before the turn; Exhibit B and the verdict `full −1.5 dB` from 48 s of the file; a short "court silence" before the sentence; `cta_boost_db` 5, 1 s fade. Two extra −5 dB dips on weak-voice windows kept the background p95 below −12 dB. Alternatives: `music:597` (Vertigo, investigative), `music:680` (restless cinematic drums) for a harder verdict.

```json
[{"start":0,"end":"DEFENCE","mode":"full","gain_db":-3.5,"track":"A","src":4.0,"fade_in":0.05},
 {"start":"DEFENCE","end":"TURN-0.45","mode":"lowpass","gain_db":0,"track":"A","src":"t+4","fade_in":0.3},
 {"start":"TURN","end":"SENTENCE-0.5","mode":"full","gain_db":-1.5,"track":"A","src":48.0,"fade_in":0.02,"fade_out":0.12},
 {"start":"SENTENCE","end":"DURATION","mode":"full","gain_db":-1.5,"track":"A","src":"t+48","fade_in":0.02,"fade_out":1.0}]
```

## CTA design inside the style

"THE JURY IS YOU" on the plaque; a question card that asks the viewer which of the two behaviours they follow; two ballots with the two answers fall into an urn; the jury makes room for "YOU"; "Tell us in the comments"; a seal with the brand logo, the handle and a Follow button that gets stamped "✓ FOLLOWING" (finger leaves right after the tap so it never covers the word); closing gavel. 5–6 s after the last word.

## Implementation notes

- Live drawing of the camera with ffmpeg (`rk.styled_camera(work, "sketch", SKETCH_VF)`), crossfaded with the normal camera via a clip-path pencil wipe; keep the last sketch frame as a still for the ending:
  ```python
  SKETCH_VF = ("split[a][b];[a]format=gray,edgedetect=low=0.04:high=0.12:mode=wires,negate,erosion,format=rgb24[e];"
               "[b]hue=s=0.3,eq=contrast=1.35:brightness=0.18,colortemperature=temperature=4400,boxblur=4,"
               "lutrgb=r='val*0.95+12':g='val*0.9+10':b='val*0.8+6'[c];"
               "[c][e]blend=all_mode=multiply,noise=alls=10:allf=u")
  ```
- Jury silhouettes, curtain folds and the scale are generated SVG paths in charcoal with a slight jitter; paper grain overlay + warm vignette.
- Captions: build the record with one `<span>` per word at opacity 0; reveal at `word.start` and switch the highlight on/off.

## Pitfalls found in production

- **Placeholder look**: bubbles drawn as bars, envelopes as plain rectangles and "Defendant: ?" all read as unfinished. Use hand/robot icons in bubbles, real envelope icons, a sending list on Exhibit B, and "who?" in red handwriting.
- **Weak hook**: the accused card must be visible from frame 0.
- **Sketch not "drawn" enough**: stronger charcoal edges and warm paper in the filter.
- **Stamp misread** (a short red stamp over a busy phone read as another word): larger stamp with a paper background.
- **Collisions**: tags covering the file tab and the monitor, verdict stamps behind the sentence; recompose (sentence 84 px, stamps lower) and remove Exhibit B when the sentence rises.
- **Empty record** between groups and after the voice; the finger covering "FOLLOWING".
- **Numeric HTML entity** (`&#8627;`) failed the numbers test.
- **Background p95 stuck at −12.0 dB** (mix calibration): add music dips on weak-voice windows.
- **Vision timeouts** on big sheets: review native frames one by one.

## Variations

- **Appeal court**: the same case reviewed later ("I used to think… now…"); for changes of opinion.
- **Small claims**: a single exhibit and a quick verdict for 20–30 s cuts.
- **Debate tribunal**: two speakers as prosecution and defence (split monitors); for interviews.
- **Paid-ad version**: the verdict becomes the offer's promise and the CTA a "Learn more" ruling stamped on the sentence (follow the Paid-ad variant).
