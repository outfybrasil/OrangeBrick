---
style: predio-24h
name: Prédio 24h (isometric company, day and night)
family: fixed-style
best_for: paid-traffic ads with a "Learn more" CTA about automation, AI agents or infrastructure that runs a whole operation around the clock (departments, servers, shared data, "24 hours"); the company becomes an isometric scale model with a day/night cycle
reference: produced by the PycodeBR team with heditor, Oct 2026
---
# Prédio 24h (isometric company, day and night)

The Reel is a scale model of a company on the speaker's desk. An isometric building in SVG, with one floor per department, a server room cut open in the thick base, trees, a lawn and a street, sits under a sky that runs a full day/night cycle. The speaker stands behind the model (presenter cutout, body dissolving into an indigo desk). Every item of the speech becomes a physical event in the model: a phone at 3 a.m. flies into the customer-service floor, data lines run from the database to every floor, an "agent pulse" visits each department as it is named, the camera (the whole model) climbs floor by floor, sun and moon orbit on "24 hours", the building turns into a line blueprint on "build and deploy", the camera pulls back to a neighbourhood of models on "for companies", and a second tower rises for the offer. The core metaphor: **the operation is a building that never switches its lights off**.

## When to use / when not to

Use it when the speech:
- lists areas, teams or departments that one system or agent serves;
- says "24 hours", "all day", "while you sleep", "on a server/VPS", "same database";
- moves from "this is what it does" to "you can build this" or "this is taught/offered here";
- ends on "Learn more" (ad) or an invitation.

Avoid it when:
- the speech is about one person, a feeling or a career story (the model is impersonal);
- there is no list of areas and no time idea (the building has nothing to light);
- the brand forbids pastel/teal palettes or the batch already has a city/map world;
- the cut is under ~30 s (the cycle needs room).

## Signature moves

1. **Frame-0 night proof**: night sky with a moon, a wall clock at 03:00, a coral seal "24 HOURS A DAY", a phone with a customer writing at night and "typing…", the model blurred behind, the speaker large on the right. The agent's reply arrives on the word "agent".
2. **Phone flies into the building**: on "integrated", the phone shrinks into the customer-service floor while the camera pulls back to reveal the whole night model.
3. **End-to-end spine**: a yellow data line climbs from the server room to the roof on "end to end"; the agent pulse (mint bubble with a robot icon) rides it.
4. **Floor by floor**: each spoken area lights its floor (sign with icon), the pulse visits it, the camera climbs one floor per item; dawn breaks during the list.
5. **24-hour orbit**: on "24 hours", the camera opens, a 24 h clock spins, sun and moon complete one turn, the sky blinks night/day.
6. **Cutaway to the server room**: the camera dives into the base: racks with LEDs, a coral database, a "VPS" tag, a real architecture diagram from the advertiser's material.
7. **Shared data**: database pulses, mint lines light every floor, a robot appears on each floor, a checklist builds ("SAME DATABASE / SAME AGENT / FOR EVERY TEAM").
8. **Payoff plaque**: after 0.3 s of music silence, the whole building lights up and the model's plaque reads the thesis in the speaker's words; flash + short shake; music enters full.
9. **Blueprint → neighbourhood**: the building turns into coral line drawing with a "LIVE" seal, then the camera pulls back to three models with a "CUSTOM-BUILT" stamp.
10. **Second tower** for the offer: a tower with the brand emblem rises, a neon sign lights, the door glows and a tiny figure walks in; floors light in sequence for a spoken number.

## Frame and layout

Canvas 1080×1920, 30 fps, Paid-ad variant (`../captions-and-layout.md`).

```
y 0–270     sky only (gradient, stars, sun/moon on their orbit): no text
y 290–1040  model + chips/plaques; signs and checklists in the column opposite the face
y 1040–1180 indigo desk edge (the speaker's body dissolves into it)
y 1046–1150 caption band (cream plate)
y > 1152    desk, soft shadow: no information
```

- `#city` (the model and its sky) is the camera: tween its `scale/x/y` to frame a floor, the base or the neighbourhood. The speaker cutout is independent.
- Speaker states: `hook` (large, right), `right`, `left`, `small`, `cta`; face always free; body base dissolves with a mask gradient and a soft shadow on the desk.
- The model is generated SVG (`world.py` in the reference): isometric projection `P(x, y, z) = (OX + (x − y)·0.866·k, OY + ((x + y)·0.5 − z)·k)`, visible faces top, left (plane y = D) and right (plane x = W). Day and night are two SVG layers with the **same geometry**, crossfaded; lit windows (with tiny people silhouettes) are a third layer per floor.

## Palette and typography

| Role | Day | Night |
|---|---|---|
| Building left / right / top | `#2a9d8f` / `#7fd6c4` / `#fff1d6` | `#2c2e7c` / `#3f43a6` / `#565bc8` |
| Edges | `#17635b` | `#17184a` |
| Base, lawn, road | `#f7e6c4`, `#a6e3cf`, `#e9d2a8` | `#2f3180`, `#2b5f7a`, `#3a3c8c` |
| Roof, accent trees | `#ff7a5c` | `#c9496a` |
| Lit windows | — | `#ffd84d` with glow |
| Data lines / agent pulse | mint `#7fd6c4` | mint |
| Seals | coral `#ff7a5c` | coral |
| Desk / caption border | indigo `#1d1b4f` | |

Fonts (OFL, in the kit): **Fredoka** 700 for plaques, chips and captions (toy-model friendliness), **Geist** for the phone UI, **JetBrains Mono** for technical tags (VPS, DB). Icons: Lucide (`headset`, `clapperboard`, `pen-line`, `lightbulb`, `megaphone`, `server`, `database`, `bot`, `clock`, `sun`, `moon`, `door-open`, `check`).

## Caption system

"Model plaque": cream plate `#fff1d6`, 5 px indigo border `#1d1b4f`, radius 14, padding `6px 18px 4px`, Fredoka 700 uppercase, ink `#1d1b4f`, `font-size: var(--fs, 60px)` fitted, one line, ≤ 800 px.

- Grouping: ≤ 3 words / 20 characters.
- Active word: **black on `#ffd84d`** (≈ 13:1), padding `0 .08em`, radius 10.

```css
.capwrap{left:0;top:1046px;width:1080px;height:106px;z-index:40;display:flex;align-items:center;justify-content:center}
.cap{display:inline-block;max-width:800px;background:#fff1d6;border:5px solid #1d1b4f;border-radius:14px;padding:6px 18px 4px;
  font-family:Fredoka;font-weight:700;font-size:var(--fs,60px);line-height:1.12;text-transform:uppercase;color:#1d1b4f;white-space:nowrap}
.cap .w{display:inline-block;padding:0 .08em;border-radius:10px}
```

## Scene grammar

Generic example: a speaker showing that one AI agent runs support, content and marketing for a company, and that building it is part of a course.

| Beat | Scene | What happens |
|---|---|---|
| Hook | Night proof | Phone at 03:00, customer question, typing dots, "24 HOURS A DAY" seal; reply + "DATABASE" card on "agent"; chip "AUTONOMOUS AGENT". |
| Integration | Pull-back | Phone flies into the support floor; night model revealed; spine "END TO END" climbs. |
| Areas | Floor by floor | Each area lights its floor with sign + icon; pulse visits; camera climbs; dawn. `lightbulb_ding`/`click` + `swipe` per floor, `cymbal_swell` at sunrise. |
| Always on | Orbit | 24 h clock spins, sun and moon turn, sky blinks; "24 HOURS A DAY" stamp. |
| Where it runs | Server cutaway | Camera into the base; racks, database, "VPS" tag; real architecture diagram slides in. |
| Shared data | Lines | Data lines to every floor, robots on floors, checklist builds. |
| Thesis | Plaque | 0.3 s music silence → building fully lit → plaque with the thesis; flash, shake, music full. |
| You can build it | Blueprint | Building becomes line drawing, floors light bottom-up, "LIVE" seal; pull back to three models, "CUSTOM-BUILT" stamp. |
| Where it is taught | Library | The model becomes one card among real course cards ("JUST ONE OF THE THINGS"). |
| Offer | Second tower | Tower with the emblem rises, neon "SPECIAL CONDITION", audience chip; door lights and a figure walks in; floors light for a spoken number. |
| Deadline | Night again | Calendar page flips to the spoken day; tower blinks. |
| CTA | Button + site | White "LEARN MORE ›" tapped on "learn", down arrows, site window scrolling the real page (no price), "SIGN UP ✓", whole tower lit. |
| End card (4 s) | Card | Emblem, product name, spoken condition line, button, "TAP LEARN MORE ↓", three pulses. |

Rules: only spoken numbers (the hook clock time is the only invented-looking number; keep it if the speech says "24 hours" or "at night"; otherwise draw the clock without digits); conversations in the hook phone are generic, with no names or results; third-party products shown as studied content, never as the speaker's creation.

## Transitions and motion vocabulary

- **Camera = model**: `TO('#city',{scale,x,y,duration:.6,ease:'expo.inOut'})`; one floor per spoken area (~0.6 s each).
- **Day/night**: crossfade the two SVG layers (0.8–1.2 s); sky gradient tween; stars twinkle with seeded delays.
- **Orbit**: sun and moon on a 1000 px circle centred below the model, `rotation 0 → 360` in 1.6 s on "24 hours".
- **Data lines**: `stroke-dashoffset` draws (0.4 s each, staggered 0.08 s); the pulse follows the path with `MotionPath`-free keyframes (x/y arrays) to avoid plugins.
- **Blueprint**: model opacity → 0 while a coral-stroke copy draws itself (`stroke-dasharray` on every polygon, 0.9 s).
- **Stamp**: `scale 1.6 → 1`, `rotation −8 → −4`, 0.18 s `back.out(3)` + 4 px shake.

## Sound design

| Action | Category | gain_db | length |
|---|---|---|---|
| Hook messages | `message_received` / `message_sent` | −28 | 0.3 |
| Data cards / chips | `data_beep` / `pop` | −29 / −28 | 0.2 |
| Phone into the building, pull-back | `whoosh` + `magic_transition` | −25 / −25 to −21 | 0.5 |
| Spine | `riser` | −27 | 0.8 |
| Floors | `lightbulb_ding`, `click`, `swipe` | −28 / −28 / −30 | 0.2–0.3 |
| Sunrise | `cymbal_swell` | −30 | 1.0 |
| 24 h cycle | `clock_tick` + `fast_forward` | −27 / −30 | 0.8 |
| Stamps | `stamp` | −24 to −22 | 0.3 |
| Server room | `power_up`, `page_turn`, `scan`, `robot_processing` | −27 / −29 / −30 / −30 | 0.4–0.8 |
| Thesis / best condition (gaps) | `trailer_hit` | −19 | 1.0 |
| Blueprint | `pen_write` + `success` | −29 / −26 | 0.4 |
| Library | `reverse_impact` | −25 | 0.6 |
| Tower | `spotlight_on`, `key_turn`, `door_open` | −26 / −28 / −28 | 0.4 |
| Floors counting | `slot_machine_reel` | −31 | 0.8 |
| Offer celebration | `crowd_cheer_short` | −34 | 0.8 |
| CTA | `mouse_click`, `level_up`, `success_chime` | −22 / −29 / −18 | 0.2–0.8 |

The click over the spoken "learn more" was removed in the reference to avoid masking the words.

**Music:** `music:187` (Mountains, hopeful electronic that grows) — reference. From 3 s of the file in `lowpass` (+8 dB to compensate the filter) through the first act, 0.3 s silence before the thesis, full from the payoff to the end (−5 and −6.5 dB on the loudest parts of the file to keep the distance to the voice stable), `cta_boost_db` 6, 1.2 s fade. Alternatives: `music:167` (mechanical electronic) for a cooler tech feel, `music:623` (tech house) for a night-shift mood.

```json
[{"start":0,"end":"THESIS-0.3","mode":"lowpass","track":"A","src":3.0,"gain_db":8,"fade_in":0.01,"fade_out":0.05},
 {"start":"THESIS","end":"BUILD","mode":"full","track":"A","src":"t+3.0","fade_in":0.02,"fade_out":0.1},
 {"start":"BUILD","end":"OFFER","mode":"full","track":"A","src":"t+3.0","gain_db":-5,"fade_in":0.05,"fade_out":0.1},
 {"start":"OFFER","end":"DURATION","mode":"full","track":"A","src":"t+3.0","gain_db":-6.5,"fade_in":0.05,"fade_out":1.2}]
```

## CTA design inside the style

Spoken CTA: white "LEARN MORE ›" button pressed by a finger on "learn", down arrows, a browser window scrolling the real page, "SIGN UP ✓", the tower fully lit, "TODAY". End card (4 s): emblem, product name, the spoken condition and deadline line, button, "TAP LEARN MORE ↓", three pulses; music rises and resolves.

## Implementation notes

- Generate the model in Python (an `Iso` class with `p`, `poly` and `box(x, y, z, w, d, h, left, right, top)` helpers) and emit two complete SVGs (day, night) plus window layers per floor. Keep polygon counts modest; the reference rendered fine with ~600 polygons per layer.
- The speaker cutout is an alpha WebM above the model and below captions; the indigo desk is a plain div with a top highlight.
- Store floor y-positions in `K.floors` so camera moves and pulse stops use the same numbers.
- Real proofs (architecture diagram, course cards, product page) are cropped stills; record their provenance in DESIGN.md.

## Pitfalls found in production

- **Matte**: a black chair behind the ears survived one matting tool; the other (with a background plate) worked better on this source. Test both on a short window.
- **Tiny text in the hook phone**: messages at 25 px minimum and the essential (seal, chip) large.
- **Top margin**: the bright sky and stars trip the pixel check (first bright row 0); inspect frames and keep text below 290.
- **Junction outside a valley**: one sentence restart had no silent valley (−32 dBFS); a 30 ms fade on that exit only, then a windowed ASR confirmed the joined phrase.
- **Repeated phrase removed**: the speaker said "end to end" twice; the second occurrence was cut at clean valleys and the sentence still flowed.
- **Recording ≠ script**: the script promised a messaging use case; the recording described a whole operation. The world was rebuilt for what was said.

## Variations

- **Factory floor**: floors become production lines, the agent pulse becomes a robot arm; for manufacturing or "assembly line of tasks". Music `music:167`.
- **Night shift only**: keep the model at night, windows light one by one as tasks finish; for "while you sleep" automation. Music `music:568`.
- **Neighbourhood**: start wide with several company models and zoom into one; for agencies serving many clients.
- **Organic version**: replace the offer tower with a "which floor would you automate first?" question and a Follow card.
