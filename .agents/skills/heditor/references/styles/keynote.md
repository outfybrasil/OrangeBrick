---
style: keynote
name: Keynote (launch stage)
family: fixed-style
best_for: paid-traffic ads with a "Learn more" CTA that announce something (an offer opening, a programme, a launch) and list what the viewer gets; the speaker presents on a dark stage in front of a giant LED screen
reference: produced by the PycodeBR team with heditor, Oct 2026
---
# Keynote (launch stage)

The Reel is a product keynote. The speaker stands on a dark, warm stage in front of a giant LED screen, lit by two golden spotlight cones, with dust floating in the beams, a reflective floor and audience silhouettes at the bottom. Every sentence becomes a slide or a stage object: the title of the announcement is already on the screen at frame 0, an event badge drops on a lanyard when the speaker names who it is for, a giant phone shows the real product page scrolling, topic blocks light up word by word, a huge golden numeral counts up when a spoken number lands, and the deadline appears in a close shot with the date beside the speaker. The ad closes on a CTA slide with the brand emblem and a big white "LEARN MORE ›" button. The core metaphor: **the offer is being announced live, on stage, as a historic moment**.

The speaker is a presenter cutout (alpha-matted) standing *in front of* the screen, so the stage has depth: slides live behind the person, never on the face.

## When to use / when not to

Use it when the speech:
- opens with an announcement ("I just opened…", "this is the best … we ever had", "today we launch…");
- lists what the viewer receives (programme, sessions, topics, recordings, a spoken number worth a giant numeral);
- has a spoken deadline or exclusivity that deserves its own beat;
- is a paid ad that ends on "Learn more".

Avoid it when:
- the topic is intimate, sad or reflective (a stage feels like hype);
- the speech has no announcement and no list (the slides become generic);
- the matte fails badly on the source (busy background touching the hair, very low resolution) and you cannot fall back to a large screen window;
- the same batch already has a dark-and-gold world.

## Signature moves

1. **Frame-0 announcement**: spotlights already on, dust in the beams, the LED screen showing the title in two lines (one keyword in gold gradient), a small pill naming the audience, a 1.07 → 1 camera push and a light sweep across the title. The keyword turns gold on the spoken word; the brand emblem spins in when the brand is named; audience camera flashes pop around the stage.
2. **Event badge on a lanyard** when the speech says who it is for: it drops on its cord, swings once and gets a check stamp on the spoken word.
3. **Product reveal**: a 0.1 s blackout, then the emblem huge with light rays and the programme name entering word by word.
4. **Giant phone on the LED screen** with the advertiser's real page scrolling (cropped, no price), plus a chip naming the section the speech mentions.
5. **Topic slide**: 2–4 blocks with Lucide icons that start dim and light up on each spoken topic (never an empty slide).
6. **Giant word with strobe columns** for a one-word emphasis ("intensive", "complete").
7. **Keynote chart that draws itself** for an "always up to date" or "growing" idea, with labels only from the speech (no axes, no numbers).
8. **Giant golden numeral** that counts 0 → N when a quantity is spoken, between "YOU GET" and the noun.
9. **Deadline beat**: music silence, blackout, the speaker in a close shot on the left, the deadline lines on the right lighting up word by word, then a seal with the spoken condition.
10. **CTA slide**: emblem, product name, the white "LEARN MORE ›" button pressed on "learn", then the end card with "TAP LEARN MORE" and down chevrons.

## Frame and layout

Canvas 1080×1920, 30 fps, paid-ad safe area (see `../captions-and-layout.md`, Paid-ad variant).

```
y 0–270     stage ceiling: LED panels almost off, lamp housings (atmosphere only)
y 290–1030  LED screen: x 40–1040, radius 30, thin gold border, faint pixel texture; slides live here
y 300+      first title row (accents ≥ 300)
y 1030–1920 reflective floor with a gold glow pool that follows the speaker
y 1046–1150 caption band (one line, ≤ 800 px)
y > 1152    floor, audience silhouettes (y > 1600) and the speaker's torso fading out: no information
```

Presenter cutout states (scale relative to the 1080×1920 source, head always between y 460 and 1040):

| State | Scale | Position | Used for |
|---|---|---|---|
| `open` | 0.66 | centre | hook, title above |
| `right` | 0.62 | right third | content slides on the left |
| `left` | 0.62 | left third | content on the right |
| `low` | 0.55 | centre, lower | giant word above the head |
| `close` | 0.72 | left | deadline beat (a "magic move" into a close shot) |
| `exit` | — | walks out to the right | last line, before the end card |

- Cutout mask = bottom gradient + ellipse + side gradient (removes chair remnants and the straight source border). Add a 1 px erosion, despill on the edge band and a warm golden rim light so leftovers read as backlight.
- Push the "camera" (the whole stage) 1.8–3.5 % on every slide change; jump-cut zoom stays subtle (1.0 ↔ 1.03).
- Live IMAG (the speaker's live close-up on the LED screen) was tested and dropped: the original room inside the screen looked like a matting failure. Use the close-shot magic move instead.

## Palette and typography

| Role | Hex |
|---|---|
| Stage black (warm) | `#060403` → `#120c05`, floor `#0b0804` → `#030201` |
| Spotlight cones (additive) | `#ffcf7a` / `#ffcf6e` at low alpha |
| Gold gradient (keynote type) | `#fff3cf` → `#ffc54d` → `#c8871a` |
| Gold UI lines / labels | `#e2b04c`, `#ffd479`, `#b97a17` |
| Dust particles | `#ffe2a8` with `blur(1px)` |
| Active word | black on `#ffd84d` |
| Seal red (rare) | `#ff3b30` |

Fonts (OFL, in the kit): **Geist** 800/900 with tight tracking for every keynote title and caption; **JetBrains Mono** in gold for small labels and slide numbers. No Anton: condensed poster type breaks the keynote voice. Icons: Lucide (`repeat`, `code`, `brain`, `trending-up`, `briefcase`, `play`, `circle-dot`, `check`, `chevron-down`, `pointer`).

## Caption system

"Keynote lower third": dark glass plate `rgba(12,9,4,.88)`, 3 px gold top rule `#e2b04c`, radius 18, padding 8 × 18, Geist 900 uppercase, tracking −0.5 px, one line `nowrap`, font size `var(--fs, 62px)` fitted to the group, `box-shadow: 0 14px 30px rgba(0,0,0,.6)`.

- Grouping: ≤ 3 words / 20 characters per group (one line only).
- Active word: **black on `#ffd84d`** (≈ 13:1), padding `0 .12em`, radius 10, switch at `word.start − 0.02`.
- Words that open a block after a silence: snap their start to the measured waveform attack (Whisper tends to start them 0.2–0.5 s early).

```css
.capwrap{left:0;top:1046px;width:1080px;height:104px;z-index:40;display:flex;align-items:center;justify-content:center}
.cap{display:inline-flex;align-items:center;max-width:820px;background:rgba(12,9,4,.88);padding:8px 18px;border-radius:18px;
  border-top:3px solid #e2b04c;font-family:Geist;font-weight:900;font-size:var(--fs,62px);line-height:1.12;
  text-transform:uppercase;letter-spacing:-.5px;color:#fff;white-space:nowrap;box-shadow:0 14px 30px rgba(0,0,0,.6)}
.cap .w{display:inline-block;padding:0 .12em;border-radius:10px}
```

## Scene grammar

Generic example: a speaker announcing that a mentoring programme opened a special condition for existing customers.

| Beat | Scene | Speaker | What happens |
|---|---|---|---|
| Hook (0–3 s) | Title on the LED screen | `open` | "THE BEST CONDITION / IN THE HISTORY OF <PROGRAMME>", audience pill on the right, light sweep, keyword turns gold, emblem spins in, camera flashes. |
| Who it is for | Lanyard badge | `right` | Badge drops ("ONLY FOR <AUDIENCE>"), check stamp on the spoken audience word. |
| What it is | Product reveal | `low` | A 0.1 s blackout → emblem with rays → programme description word by word. |
| How it works | Giant phone | `right` | Real page scrolling to the section the speech names; chip with the spoken feature. |
| Topics | 4-block slide | `right` | Blocks start dim and light on each spoken topic. |
| Emphasis | Giant word | `low` | One word, strobe light columns, low impact in the gap. |
| Benefit | Self-drawing chart | `left` | Line draws "ALWAYS UP TO DATE"; label = spoken noun. |
| Proof | Library grid → numeral | `right` | Covers of real recordings with REC + play; then "YOU GET" + numeral counting to the spoken number. |
| Deadline | Close shot | `close` | Music silence 0.28 s, blackout, date lines on the right light word by word, seal. |
| Condition | Seal | `right` | Gold seal stamped with the spoken condition + badge check. |
| Spoken CTA | CTA slide | `right` | Emblem + name + white "LEARN MORE ›" pressed on "learn"; "take a look at the site" → phone scrolls again; "start today" line. |
| Goodbye | Exit | `exit` | The speaker walks off stage right; end card builds. |
| End card (4 s) | Final slide | out | Emblem, product name, seal, big white button, "TAP LEARN MORE", chevrons, short applause. |

Rules: a slide never enters empty (text starts dim and lights on the word); one stage object per idea; only spoken numbers and dates; slides shrink to fit the screen (long words: drop the size, never break the frame).

## Transitions and motion vocabulary

- **Light sweep**: a diagonal gold band crosses the title (`x −400 → 1400`, 0.7 s `power2.inOut`, `mix-blend-mode: screen`).
- **Cut to black**: 0.1 s of full black before a reveal.
- **Magic move**: the cutout changes scale/position with `expo.inOut` 0.45 s; the gold floor pool follows.
- **Slide change**: old slide fades 0.15 s, new slide from `scale .96, opacity 0` in 0.3 s `power3.out`, with a 1.8–3.5 % stage push.
- **Badge drop**: from y −400 with `back.out(1.4)`, then a damped swing (rotation 6° → 0 in 1.2 s).
- **Numeral count**: GSAP counter on a text node 0 → N in 0.8 s, `steps` to integers; a stamp on the last value.
- **Audience flashes**: radial white discs (150 px) popping 80 ms at random seeded positions around the stage.
- **Dust**: 60–80 seeded particles drifting slowly inside the cones; never `Math.random`.

## Sound design

| Action | Category | gain_db | length |
|---|---|---|---|
| Frame 0 | `cymbal_swell` (low) + `spotlight_on` | −30 / −30 | 1.2 / 0.6 |
| Audience flashes | `camera_shutter` | −31 to −30 | 0.2 |
| Emblem spin | `magic_sparkle` | −30 | 0.6 |
| Speaker moves / slide changes | `whoosh`, `swipe` | −25 to −23 / −30 | 0.4 |
| Badge locks | `lock_click` | −28 | 0.3 |
| Reveal / deadline drop (in gaps) | `sub_drop` + `trailer_hit` | −19 / −22 | 0.8 / 1.0 |
| Audience reacts | `crowd_murmur` | −34 | 1.0 |
| Topic blocks | `pop`, `click` (vary) | −30 / −28 | 0.2 |
| Chart / proof | `data_beep`, `riser`, `reverse_impact` | −30 / −31 / −26 | 0.3–0.8 |
| Giant word | `bass_impact` | −27 | 0.6 |
| Seals | `stamp` | −28 | 0.3 |
| Covers fanning | `page_turn` | −30 | 0.3 |
| Button press | `mouse_click` | −32 to −22 | 0.2 |
| End card | `applause_short` + `success_chime` | −24 / −18 | 1.0 / 0.8 |

Keep SFX over words at −28 to −32 dB and impacts in gaps. Check the ASR around the spoken CTA: a click on "click here on learn more" masked a word in the reference and had to move.

**Music:** `music:187` (Mountains, uplifting electronic with a launch-like build) — reference. Section 1 from 30 s of the file (earlier the track sat too low), 0.28 s silence before the deadline line, section 2 from 47 s (the main lift) on the deadline, `cta_boost_db` 4, 1.2 s fade. Alternatives: `music:31` (inspiring piano/strings) for a warmer launch, `music:623` (tech house) for a sleeker tech product.

```json
[{"start":0,"end":"DEADLINE-0.28","mode":"full","track":"A","src":30.0,"fade_in":0.01,"fade_out":0.12},
 {"start":"DEADLINE","end":"DURATION","mode":"full","track":"A","src":47.0,"fade_in":0.02,"fade_out":1.2}]
```

## CTA design inside the style

The CTA is the last slide of the keynote (Paid-ad variant):
1. On the spoken CTA: emblem + product name on the LED screen, white "LEARN MORE ›" button (Geist 900, black text, radius 28) pressed by a Lucide `pointer` on "learn" (scale .94 → 1, glow ring).
2. "Take a look at the site" → the giant phone scrolls the real page again; "start today" → a final line.
3. On the goodbye the speaker walks off stage right (a waving hand blurs in the matte; leaving the stage avoids it).
4. End card (4 s, after the last caption): emblem, name, seal, big white button, "TAP LEARN MORE" and down chevrons in gold, three button pulses, short applause and chime, music +4 dB.

## Implementation notes

- Write your own page; use reelkit for words, captions grouping, finder keys, mix and checks. Layer order: stage back (LED panels), screen, slides, spotlight cones (additive), dust, cutout video (`presenter.webm`), floor pool, audience, captions, grain (5 %, overlay), flash.
- Spotlight cones: two `clip-path: polygon()` divs with a vertical gradient `rgba(255,207,122,.22) → 0`, `mix-blend-mode: screen`, swaying ±2° over 6 s.
- The flash layer is a radial warm gradient with `mix-blend-mode: screen` (not a flat white), so it reads as stage light.
- Real product page: export one tall mobile screenshot, crop out prices, testimonials and FAQ, reduce to ~440 px wide and scroll it with `y` tweens inside a phone frame.

## Pitfalls found in production

- **Clipped word mistaken for a false start.** The first assembly removed the last word of the hook as a "false start"; full-cut ASR and the master check both misheard the line. A windowed large-model transcription plus the spectrogram proved the word was real. Re-check any suspected false start with an isolated window before cutting.
- **Live IMAG looked like a matting error**: the original room inside the screen. Use a magic move into a close shot.
- **Hand waves in the matte** turn grey with motion blur: plan exits or keep hands outside the key frames.
- **Empty slides**: slides must enter with their text dim and light on the word.
- **Lilac fringe** from the wall behind the speaker: despill only the edge band; the golden rim hides the rest.
- **Top-margin flag** from lamp housings and the spotlight sources is atmosphere; keep real text ≥ 300.
- **Script vs recording**: the script listed benefits the speaker never said; only spoken items reached the slides.
- **Small text inside the phone** is proof texture, not reading material; never rely on it to carry a message.

## Variations

- **Award night**: same stage, but the reveal is an envelope and a trophy; the numeral becomes a category card. For results, milestones, rankings the speaker actually states. Music `music:31`.
- **Product demo keynote**: the LED screen shows the product in motion for most of the cut; slides become feature callouts. For software launches. Music `music:623`.
- **Town hall**: lighter stage (`#f4ead6` backdrop, ink text), fewer flashes, a Q&A card per objection. For internal or community announcements. Music `music:187` filtered.
- **Short teaser (15–25 s)**: title, one reveal, deadline, button; skip the topic slide.
