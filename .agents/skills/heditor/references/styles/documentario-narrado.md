---
style: documentario-narrado
name: Documentário narrado (atlas · large-scale narrated documentary)
family: fixed-style
best_for: stories with dates and an arc (rise → euphoria → turn → fall → lesson) told by the speaker; history of a technology, a market, a company or an idea; "this already happened before" lessons; 60–100 s Reels with `max_duration`, and history chapters in long form
reference: produced by the PycodeBR team with heditor, Oct 2026
---
# Documentário narrado (atlas · large-scale narrated documentary)

Alias: **atlas**. The speaker's voice is the **narration of a big-budget historical documentary**, and the picture is a living atlas. A **night globe** is the spine of the video: the subject becomes territory, the things that spread become lights that switch on at the spoken word, money, ideas and decisions become golden routes, and the climax happens on the planet itself. Between the globe flights come **generated period paintings** in one constant style, moving in **2.5D parallax**; the turns are **dated chapter cards** preceded by a **hard music silence → low impact → reveal → amber flash**. The narrator appears in **three states**: a testimony plate with a film treatment, a gold-ringed medallion resting on the map, and voice-over (most of the time). The picture changes every **~1.5 s**, nothing is ever still, the music is a tree of sections with hard silences, and the end loops back to the first shot of the globe with "next chapter".

The core metaphor: **the speaker is narrating history while it happens on a map**. The language comes from long-form narrated history documentaries (100 % b-roll, maps as the spine, cards read aloud, silence before every turn), compressed into a vertical Reel.

**Status:** named at the channel owner's request after its first production (Oct 2026); visual approval of the style is pending. Reuse the language and rebuild the map, the paintings and the cards for each new story.

## How it differs from `documentario`

| `documentario` | `documentario-narrado` (atlas) |
|---|---|
| letterboxed cinema band, the camera always on screen | full-bleed; the narrator is ~60 % voice-over, ~25 % medallion, ~15 % testimony plate |
| a personal story in three chapters, the speaker is the subject | a historical story with dates, the speaker is the narrator; the subject is the world |
| Playfair Display / Fraunces, underlined active word, rolling credits | Cinzel + Cormorant Garamond Italic + Barlow Condensed, black on a gold pill, "next chapter" loop |
| slow push-ins, soft fades, no impacts | a globe with a virtual camera, paintings in parallax, hard silence → impact → reveal on every card |
| music bed under the whole talk | music tree in sections: era radio, filtered, full with the lift on the climax, synthesized drone, silences, a single trailer hit on the payoff |

If the speech is a personal journey with no dates, no places and no "the world changed" scale, use `documentario`. If it is a history with a calendar and a scale, use this one.

## When to use / when not to

Use it when the speech:
- tells a story with **spoken dates or eras** (a year, "by the end of that year", "in 2000") and a turn;
- has a **scale** that can live on a map: "around the world", "global", a spread, a flow between places, a network;
- has an arc that sustains 60–100 s: context → tension (something inflates, spreads, accelerates) → turn → payoff → one-line lesson;
- ideally opens with a line that sounds like today and is revealed as the past ("I am talking about 1858 here"): the strongest retention device of the style.

Avoid it when:
- the speech is an opinion, a tutorial or a list with nothing that happens in time (`impacto`, `revista`, `lousa-de-aula`);
- there are no places and no flows: the map would be decoration (use an abstract "territory of the subject" only if routes really act out the verbs, see Variations);
- the facts cannot be checked: the style lives on dates and numbers and every one on screen must be spoken or verified;
- the batch already has a cinematic documentary (`documentario`) or a market-crash world (`mesa-de-risco`); this style has **no letterbox, no trading desk and no rolling credits**.

## Signature moves

1. **Frame 0 in a burst**: a period painting already in push-in and an era object (a newspaper that spins in and lands, a typed telegram) on the first word; the music in `radio` mode ("the voice of the era"); captions of the quoted era voice wrapped in gold « ». A new picture every 0.6–3 s through the cold open.
2. **The reveal spoken dry**: on the line that reveals the year, the music stops (silence of the music only), the testimony plate enters over the darkened painting, and a stamp of the year hits on the word with a low impact and a short shake.
3. **The main title**: after the cold open, the title in Cinzel with wide tracking and a gold sheen sweeping the letters, the year range under it, a soft light leak and a sub drop; the music enters filtered.
4. **Dated cards**: "I · 1858" or a roman numeral + italic title ("II · The euphoria"); a year odometer that rolls through the years and lands on the spoken year on its word.
5. **Whip into the globe**: horizontal streaks + a horizontal globe offset that settles (0.32 s) and an ocean whoosh; the globe opens in close-up on the region of the story; the first light switches on with a sonar ping; the medallion lands on the map.
6. **Lights at the word**: the lights multiply with acceleration and a counter climbs and lands **exactly on the spoken number at the spoken word**; a network of short arcs connects neighbours on "connected".
7. **Routes that act out the verb**: each repetition of the verb ("send", "invest", "take my money") fires a volley of golden great-circle routes from a node to the lights, with a glowing head and a fading trail; when the flow stops ("it ran out"), the routes retract and turn red.
8. **Paintings in parallax**: one generated oil painting per sentence turn (a room, a hall, a crowd, an empty office), full-bleed with Ken Burns and a depth front layer that moves 60–90 px more than the background; the same painting may return reframed tighter, like a wide shot followed by a close-up.
9. **Documentary notes**: short verified facts in a note with a gold left rule ("IN AUGUST 1858 THE FIRST CABLE CARRIED ITS FIRST MESSAGE"), ≥ 2 s on screen, source recorded in the design file.
10. **Silence → impact → reveal** at every card and before the payoff: the largest silence comes right before the climax.
11. **The payoff on the planet**: the climax is a world-scale event (a bubble around the globe that bursts, the lights dying in red waves from one coast, a cable that goes dark across the ocean); the only trailer hit of the video lands there.
12. **The lesson**: one word in Cinzel ("PATTERN.") + the testimony plate + a small timeline that repeats the event several times ("it happened several times").
13. **The loop**: the CTA flies back to the very first close-up of the globe, the first light switches on again and others follow (the cycle restarts), "NEXT CHAPTER", the question in italic serif, "Tell us in the comments", the logo with a gold ring, @handle, Follow → Following tapped by a finger.

## Frame and layout

Canvas 1080×1920, 30 fps. Organic safe zones. Everything is full-bleed; the layers stack as `#world` (paintings, globe canvas, era objects) → plate/medallion → labels and notes → card / flash / whip → caption band → top fade, vignette and grain.

```
y 0–270      picture only (painting, globe, vignette); a soft top fade (#topfade 0–325 px) keeps bright lights out
y 300–560    title band: cards, map labels, chapter marks, counters (Cinzel / Barlow Condensed 800)
y 300–1300   STAGE: globe, full-bleed paintings, testimony plate (1080×810 at y 300–1110), era objects, charts
y 990–1290   medallion Ø 300 at x 60 (bottom-left, above the captions), only over the globe
y 1240–1760  dark caption band (soft vertical gradient)
y 1330–1570  CAPTIONS (x 90–990, up to two lines)
y > 1570     atmosphere only; right edge x > 960, y 1000–1700 without information
```

### The narrator in three states (never sharp full screen)

| State | Box | Treatment | Share of the time |
|---|---|---|---|
| Testimony plate | 1080×810 at y 300 (a 4:3 webcam tile scaled), `transform-origin: 50% 0`; smaller variants with `scale .83–.89` and `y +30…+170` | film grade (below), grain overlay 0.16, inner vignette, warm wash, double gold frame (3 px `#ca995c` + an inner 1 px line at 12 px); the name strip **below** the plate (Barlow Condensed 800 54 px + italic role in gold) | ~15 % |
| Medallion | Ø 300 at x 60, y 990, gold ring 6 px `#ca995c` with glow; the video is 600×446 inside the circle, positioned on the median face | sepia-ish edge tone, flies with the map, enters `scale .6 → 1, rotation −20 → 0, back.out(1.7)` | ~25 % |
| Voice-over | — | the voice over paintings, era objects, cards and charts | ~60 % |

The plate enters on the key sentences (the reveal, the accusation, "they had no value at all", the lesson); routes or lights may pass **behind** it (the plate is above the globe layer) so the world keeps moving. A low-resolution webcam reads as archive testimony with the film treatment; the grain hides the upscale.

```python
FILM_VF = ("eq=saturation=0.80:contrast=1.08:brightness=0.01,"
           "colorbalance=rs=.05:gs=.01:bs=-.06:rm=.04:bm=-.05,noise=alls=7:allf=t")
camfile = rk.styled_camera(work, "pelicula", FILM_VF)          # same file for the plate and the medallion
faces = rk.track_faces(work)
fx = float(np.median([p["x"] for p in faces])); fy = float(np.median([p["y"] for p in faces]))
mw, mh = 600, 446                                                # medallion video box inside the 300 px circle
medal_video = [round(150 - fx * mw), round(150 - fy * mh + 18), mw, mh]   # left, top, width, height
```

## Palette and typography

| Role | Hex |
|---|---|
| Ocean / cold background | `#041117`, `#07191f`, `#0c3039`, highlight `#1a4d5a` |
| Land on the globe | `#33473b` → `#22322b` → `#141f1b`; coast `rgba(200,236,240,.42)`; atmosphere `rgba(90,190,205,.38)` |
| Lights and gold (rings, routes, numerals) | `#f2cf60`, `#e5ab42`, `#ca995c` |
| Amber flash | `#fff3c8` → `#f2cf60` → `#e5ab42` → `#c2661b` |
| Ivory (titles, captions) | `#f3ead7` |
| Conflict (stamps, retracted routes, crash) | `#952e2f`, `#c4423a`, `#ff6b5b` |
| Paper and ink (era objects) | `#e9dfc9` / `#1b1712` |

The colour signature is **warm past against cold map**: amber oil paintings and paper against the petrol-blue globe. Grade the paintings by mood with a tint layer (`warm`, `cool`, `storm`, `cold`), never by changing the painting style.

Fonts (OFL, google/fonts; not in the kit: download the TTFs with their `OFL.txt` into the cut and copy them to `composition/assets/`):
- **Cinzel 700**: years, roman numerals, main title, gold labels (engraved Roman capitals);
- **Cormorant Garamond Italic 600**: card titles, the CTA question, poetic labels ("economic");
- **Barlow Condensed 600/800**: captions (600), map labels in upper case and fact notes (800);
- an era display face for period objects only (e.g. **Abril Fatface** for newspaper headlines) and **IBM Plex Mono** (kit) for typed documents.

No Playfair Display and no Fraunces (they belong to `documentario`).

## Caption system

"Documentary subtitle on a dark band": Barlow Condensed SemiBold **46–60 px**, ivory `#f3ead7`, heavy shadow `0 3px 12px rgba(0,0,0,.95), 0 0 3px rgba(0,0,0,.9)`, on a soft dark band (`#capbg`, y 1240–1760, `rgba(0,0,0,.55–.62)` in the middle). Box x 90, y 1330, 900 × 240, centred, up to **two balanced lines** (`flex-wrap`, `column-gap: .22em`). Groups of up to 5 words / 30 characters; a group stays until the next when the gap is < 0.7 s.

- Active word: **black `#0b0906` on a gold pill `#f2cf60`** (≈ 13:1), padding `2px 8px 0`, radius 8 px, shadow removed while active; switched with `tl.set` 0.02 s before the word.
- **Era voice**: captions of quoted period speech get gold « » via CSS (`.cap.q:before{content:"«"}`, `.cap.q:after{content:"»"}`, colour `#ca995c`) so a line that sounds like today is marked as a quotation.
- Size per group with the real TTF: one line at 60 px if it fits 900 px, otherwise two lines scaled to ≤ 92 % of 2 × 900 px, never below 46 px.

```python
def cap_size(cap, CAP_W=900):
    w = sum(text_w(x["shown"], 60) for x in cap["words"]) + 22 * len(cap["words"])   # Barlow Condensed 600 at 60 px
    if w <= CAP_W or w <= 2 * CAP_W * 0.92:
        return 60
    return max(46, int(60 * 2 * CAP_W * 0.92 / w))
```

## Scene grammar

Generic example: a speaker tells the story of the first transatlantic telegraph cable. Cold open in the voice of the era: "every message will cross the ocean in minutes; whoever does not invest in this is out of the game"; reveal: "I am talking about 1858 here"; context: a cable laid across the Atlantic, the first message, the celebrations; tension: investors pour money, everyone wants a line, the operators push the signal harder and harder; turn: "after a few weeks the cable went silent"; payoff: the line dies across the ocean and the money sunk into it is lost; lesson: "pattern: the first version almost always breaks". (Dates and facts in the example are what the speaker says; fact notes come only from a cited source.)

| Beat | World | What happens |
|---|---|---|
| Cold open (0–12 s) | painting of a harbour at night + era newspapers | Frame 0 already moving; each sentence spins in a new paper (rotation −560 → ±3°, scale .06 → 1 in 0.5 s, the previous one slides aside and darkens); a key word turns red; a stamp on the threatening word. Music in `radio` mode. |
| Reveal | testimony plate | Music silence from the tail of the last era sentence; the plate enters over the darkened painting; the year stamp hits on the year with a low impact and a 10 px shake; the same year appears on the newspaper dates. |
| Title | dark + light leak | "THE CABLE" in Cinzel with a gold sheen, "1858 — 1866" below, an outlined bubble or ring motif of the story; sub drop; music filtered. |
| Card I | calendar sheet | "I · 1858" + a calendar sheet that flips in (`rotationX −70 → 0`, `back.out(1.6)`); a pen circles the spoken day. |
| Context | painting → globe | A typed document on the spoken fact; whip into the globe in close-up on the ocean; the cable route draws itself coast to coast on "across"; the first light (the first message) switches on; the medallion lands. |
| Spread | globe pulls back | Lights on both coasts accelerate; a counter climbs to the spoken number on its word; a network of short arcs on "connected"; a fact note. |
| Card II | darkened globe | Hard silence (0.3–0.45 s) → impact → "II · The euphoria" → amber flash. |
| Euphoria | paintings + globe volleys | Celebration hall, investors' office, a crowd (paintings, 1.6–3 s each); on every repeated verb ("invest", "take") a volley of routes; the climax word lands on the track's lift; big words ("MILLIONS") in Barlow 800. |
| Card III | odometer | Silence → impact → roman numeral with a year odometer rolling to the spoken year → flash; the music switches to a synthesized drone with an accelerating pulse. |
| The turn | globe + plate | The route flickers and shakes on "went silent"; a stepped chart or a sequence of marks on each spoken step (one tick per step); the plate for the key accusation; a stamp on "no value at all". |
| Largest silence | globe | The camera pulls back so the whole event fits; the music stops 0.5 s. |
| Payoff | globe | The cable goes dark across the ocean in a red wave, embers where the lights were, a shock ring; the only trailer hit; a word that splits in two on the second repetition ("BREAKING"). |
| Aftermath | painting (cold grade) + chart | An empty office at dawn; a chart that falls with a sub drop and one verified number. |
| Lesson | plate + timeline | "PATTERN." + a small timeline of four events that fill and break, leaving marks on "several times"; the end of the track returns. |
| CTA (5 s) | globe, first shot | The loop described in Signature moves; ≥ 5 s after the last word. |

Rules: on-screen text, places, dates and numbers come from the speech or from a verified fact with a source; the map shows **no place the speech does not imply** (lights and nodes without names are illustration); names of institutions only as plain text in fact notes, never logos; the era voice is always marked as a quotation; the lesson stays the speaker's words (no new claim such as "it will happen again").

## Transitions and motion vocabulary

- **Hard cut** (most of them), often by **reframing** the same painting (wide → tight).
- **Whip into or out of the map**: `#whip` (repeating horizontal streaks, `opacity .9 → 0`, `backgroundPositionY 0 → 240`, 0.32 s) + the globe canvas `x −260 → 0, scaleX 1.25 → 1` (0.34 s `power3.out`) + `ocean_wave_whoosh`.
- **Amber flash** on the exit of every card: `#flash` radial gradient, peak 0.7–0.9, decay 0.45–0.5 s `power2.out`.
- **Darkening** of the globe under plates and cards (`#gdim`, black at 0.72 in 0.3 s).
- **Shake** on impacts: 6 steps of 35 ms on `#world`, amplitude 10 (stamps) to 18 (payoff).
- **Light leaks**: two large radial amber blobs crossing the frame at 0.55 opacity (title, lesson only).
- **Everything moves**: Ken Burns on every painting, the globe camera always travelling, the medallion breathing (`y 0 → −24` over the whole video), grain stepping 8 times per second.
- **Labels at the word**: `opacity 0, scale .86 → 1` in 0.34 s `power3.out` on the word, out in 0.22 s before the next movement; slams for stamps (`scale 2.3 → 1` in 0.15 s `power4.in`).

## Sound design

| Action | Category | gain_db | length |
|---|---|---|---|
| Frame 0 | `bass_impact` | −17 | — |
| Era object spins in / lands | `whoosh` / `newspaper`, `page_turn` | −25…−24 / −26…−24 | 0.5 / 0.6 |
| Red key word, stamps | `stamp` | −24…−21 | — |
| Suction before the reveal | `reverse_impact` | −25 | 0.55 |
| Year stamp (reveal) | `bass_impact` + `stamp` | −19 / −22 | — |
| Main title | `sub_drop` + `cymbal_swell` to the flash | −19 / −27 | — / 1.0 |
| Calendar, pen circle, typed document | `page_turn`, `pen_write`, `typewriter` | −24, −26, −27…−25 | —, 0.6, 1.6 |
| Whip into the globe | `ocean_wave_whoosh` | −26…−22 | 0.6–0.8 |
| First light | `sonar_ping` | −27 (−24 in the CTA) | 0.9 |
| Lights accelerating / counter lands | `retro_computer_beep` / `bass_impact` (rate 1.1) | −31…−30 / −22 | 0.25 |
| Network of arcs, big words | `swipe` | −28…−27 | — |
| Card in (after the silence) | `bass_impact` | −19 | — |
| Swell to the card's flash | `cymbal_swell` | −28…−27 | 0.5–1.0 |
| Year odometer | `slot_machine_reel` | −30 | 0.2 |
| Route volleys | `coins` (variants alternated, rate 0.94–1.09) | −28…−25 | 0.5 |
| Steps of a chart | `clock_tick` | −27 | 0.3 |
| The flow stops | `tape_stop` | −24 | 0.7 |
| Something cracks | `glass_crack` | −28 | 0.6 |
| Payoff | `trailer_hit` (**once per video**) + `glass_break` + `sub_drop` | −15 / −22 / −23 | — / 0.9 / — |
| A word splits | `cage_or_metal_slam` | −27 | 0.5 |
| Chart falls | `sub_drop` (rate 0.9) | −23 | — |
| Timeline events | `pop` | −29 | — |
| CTA: flight back / next chapter / question / tap / done | `ocean_wave_whoosh` / `page_turn` / `swipe` / `mouse_click` / `success_chime` | −22 / −24 / −26 / −18 / −22 | 0.8 / — / — / — / 0.9 |

Every SFX is tied to a visible action (the reference production had 89 events in 92 s). No reverse or riser **inside** a card silence: the reference language is silence → impact, not a sweep.

**Music tree.** Reference: `music:31` (Dreaming Big, cinematic piano and strings that build to a lift near 72 s of the file), produced with `heditor produce <work> music:31 56`: the `drop_s` is only the CLI argument, every section has a fixed `src`. Alternatives: `music:686` (epic trailer drums, reveal) when the payoff is near the end, `music:955` (emotional piano) for a sober history, `music:871` only for a mystery act. Sections (times from `rk.finder` keys):

| Section | mode | gain | src | Notes |
|---|---|---|---|---|
| Cold open | `radio` | −1 | 2.0 | the "voice of the era"; ends on the tail of the last era word (+0.02) |
| Reveal | `silence` | | | the reveal is spoken dry |
| Title → globe | `lowpass` | −1 | 14.0 | enters on the title |
| Globe | `full` | −2 | continuous from the lowpass section | |
| Card II | `silence` | | | starts 0.30 s before the next block's first word |
| Euphoria | `full` | 0 | `lift − (climax_word − section_start)` | puts the track's lift exactly on the climax word |
| Card III | `silence` | | | 0.30 s before the turn |
| The turn | `full` | −5 | 0 of `sfx-synth/drone-tension.wav` | synthesized drone with an accelerating pulse |
| Before the payoff | `silence` | | | the largest silence (0.5 s), from the tail of the last word of the turn |
| Aftermath | `full` | −10 | 0 of `sfx-synth/drone-aftermath.wav` | |
| Lesson + CTA | `full` | −2 | near the end of the track (94.5 s for `music:31`) | fade-in 0.4, fade-out 1.4, `cta_boost_db` 4 |
| Dips | `silence` with `gain_db` −3…−4.5 | | untouched | on the weak-voice windows `balance` points to |

Hard silences are **in the music only**: the voice never stops, every pause stays < 0.45 s (`heditor gaps`; the reference production peaked at 0.36 s) and the silence starts on the tail of the last word so the cut feels like the room holding its breath. Document each silence in DESIGN.md. Reference balance: music −21.50 dB median, background p95 −15.12 dB, 0 % windows within 10 dB, SFX p95 −30.45 dB.

Drone synthesis (numpy, fixed seed): **tension** = 55 / 82.41 / 110.3 / 164.8 Hz sines with slow amplitude wobble, wind = Gaussian noise low-passed at 420 Hz, a swell from 0.55 to 1 over 14 s, and a low pulse every 0.9 s that shortens by 0.025 s per beat down to 0.5 s (each pulse a 48 Hz sine with a 20 Hz pitch drop, `exp(−9t)`); **aftermath** = 41.2 / 61.7 / 123.5 Hz decaying over 6 s with breathy noise low-passed at 300 Hz.

## CTA design inside the style

The CTA is the loop: a whip back to the **first close-up of the globe** (the same camera keyframe as the first globe shot), the first light switches on again 0.35 s later and 25 more follow one by one (the cycle restarts), then "NEXT CHAPTER" in Cinzel 64 px gold with tracking and a rule, the thematic question in Cormorant Italic 92 px ("Could this story repeat itself?"), "Tell us in the comments" (exact `brand.json` text, Barlow 600 50 px with a Lucide `message-circle`), the logo in a circle with a gold ring, the @handle in Barlow 800 66 px, and a pill **Follow** button (dark fill, gold 5 px border, glow) that a finger (Lucide `pointer`) taps: the gold fill sweeps from the left and "✓ Following" appears in black. The medallion shows the last camera frame as a still. ≥ 5 s after the last word; "Next chapter" only as a promise of the channel's next story, never a fake episode title.

## Implementation notes

The globe, the lights, the routes and the bubble are **one canvas drawn by a pure function of time**, `render(t)`, called by a single tween (`tl.to(clock,{t:D,duration:D,ease:'none',onUpdate:()=>render(clock.t)},0)`), so every frame seeks deterministically. Everything else is GSAP on the same timeline. All times come from `words-reviewed.json` via `rk.finder`; assert that every key exists and that the keys are in speech order.

### 1. The map: Natural Earth on an orthographic globe

Use **Natural Earth 1:50m land** (public domain, naturalearthdata.com), simplified once in Python and shipped as `assets/atlas.json`:

```python
def land_rings(geojson, eps=0.18, min_pts=4):
    rings = []
    for f in geojson["features"]:
        g = f["geometry"]
        for poly in (g["coordinates"] if g["type"] == "MultiPolygon" else [g["coordinates"]]):
            ring = poly[0]
            if max(p[1] for p in ring) < -58:          # Antarctica: out of frame in every shot
                continue
            r = douglas_peucker([tuple(p) for p in ring], eps)   # degrees
            if len(r) >= min_pts:
                rings.append([[round(x, 2), round(y, 2)] for x, y in r])
    return rings
```

The canvas draws, per frame: a radial background (`#0a2129 → #020709`), the atmosphere (a ring from `0.96 R` to `1.16 R`), the ocean (radial gradient lit from the top-left), a graticule every 20° at 7 % opacity, the land as one path filled with a radial gradient and stroked twice (a wide 10 % halo and a 1.3 px coast line), a limb darkening, then additive layers (`globalCompositeOperation='lighter'`) for the network, the lights and the routes.

```js
function pj(lon,lat){ // orthographic projection around the camera centre (CC.c.lon, CC.c.lat), radius CC.R
  const l=(lon-CC.c.lon)*RAD, p=lat*RAD, cp=Math.cos(p), sp=Math.sin(p), cl=Math.cos(l);
  const cosc=CC.sl*sp+CC.cl*cp*cl;                 // > 0 = visible hemisphere
  const x=cp*Math.sin(l), y=CC.cl*sp-CC.sl*cp*cl;
  return [CC.x+CC.R*x, CC.y-CC.R*y, cosc]; }
```

Points of a ring on the far side are clamped to the limb (`x = 540 + dx/d·R`) so continents close cleanly at the horizon; rings with no visible point are skipped.

### 2. Virtual camera flight

The camera is a list of keyframes `(t, lon, lat, R, centre_y)` written in `build.py` from the speech keys (close-up radius 2300 px on the first light, 1500 → 820 as the spread grows, 420–520 for the whole planet inside the frame). Interpolate with smoothstep, **lon/lat and centre linearly, the radius geometrically** (a zoom at constant perceived speed):

```js
function cam(t){ for(let i=0;i<GK.length-1;i++){ const p=GK[i],q=GK[i+1];
  if(t<q[0]){ const f=sm((t-p[0])/(q[0]-p[0]));
    return {lon:p[1]+(q[1]-p[1])*f, lat:p[2]+(q[2]-p[2])*f, R:p[3]*Math.pow(q[3]/p[3],f), cy:p[4]+(q[4]-p[4])*f}; } }
  const z=GK[GK.length-1]; return {lon:z[1],lat:z[2],R:z[3],cy:z[4]}; }
```

Hold the radius so the whole event fits **before** the payoff (see Pitfalls). Draw the canvas only inside the globe windows (`gwin`, the intervals when no painting covers it) and return early otherwise: the paintings hide it and the render gets much cheaper.

### 3. Lights, counters and routes synced to the words

- **Lights** are additive sprites (a 64 px canvas with a radial gradient `#fff6d6 → #ffe08c → #f2be50 → transparent`) drawn at the projected point, faded by `cosc` near the limb. Generate the positions once in Python (rejection sampling inside the land rings, weighted regions that match the story, fixed seed) and order them by distance from the first light with a little noise, so the spread grows outward.
- **Ignition with acceleration** between the word that starts the spread and the word of the number: `IG[i] = t_start + (t_number − t_start) · sqrt(i/(N−1))`; each light flashes on ignition (`1 + 1.6·(1 − age/0.45)`). A counter in Cinzel counts the lit lights (`n = #{IG[i] ≤ t}`), so it lands **on the spoken number at the spoken word**. N is the spoken number (or a neutral illustration of it; never a different figure).
- **Network**: for the first ~160 lights, an arc to the nearest neighbour under 25°, drawn in 0.45 s from random starts after "connected".
- **Routes**: great circles by `slerp` between unit vectors, lifted with `h = 1 + lift·sin(πf)` (lift 0.10–0.16 depending on the radius), drawn twice (9 px at 12 % = glow, 3 px at 95 % = core) with a sprite head; `volley(t, from, n)` fires n routes 0.05 s apart (+ up to 0.12 s jitter, 0.55–0.9 s each) **on each repetition of the verb**. A route can retract (`p · (1 − k)`) and turn `#ff6b5b` when the flow stops.
- **Deaths**: on the payoff each light gets a death time ordered by distance from an origin (`burst + 0.06 + 1.7·rank/N + 0.25·rnd`), fades in 0.3 s into a red ember sprite that lasts 1.8 s; ~6 % survive dimmed (the world does not end).
- **Determinism**: one Park–Miller generator seeded in `K.cfg.seed` for every random choice in the page.

### 4. A world-scale object around the planet (the bubble)

The reference payoff was a bubble that wraps the globe: radius `1.22 R`, a radial fill almost transparent with a cyan rim, an iridescent ring stroked with a **conic gradient** that rotates (`createConicGradient(t·0.25, 0, 0)`, pink → cyan → green → gold → violet), two specular ellipses; it grows with an ease-out cubic on "global", wobbles on "did not hold" (`sx = 1 + 0.05·sin(18τ)·(1 − τ/1.4)`), trembles during the largest silence, and bursts: scale +35 % with alpha → 0 in 0.25 s, a shock ring to `2.6 Rb` and 26 short iridescent arcs flying outward for 1.2 s. Other stories need their own object (a cable that glows and goes dark, a network that splits, a border that closes): keep the same rules (grows on its word, trembles in the silence, the payoff after the silence).

### 5. Generated paintings in one constant style

Generate 8–12 period scenes with the image generator available to the agent, all with **the same style sentence** and only the scene changing:

```
Cinematic oil painting, amber light, chiaroscuro, visible brush strokes, period atmosphere of <era>.
<generic scene: a newspaper printing room at night with paper rolls and tied stacks, no people>.
No text, no letters, no logos, no brands, no identifiable faces, no real people.
```

- Scenes are **generic and metaphorical** (rooms, halls, machines, a crowd seen from behind and blurred, an empty office at dawn), never real people, real buildings with signage, brands or readable text. Documents, headlines, charts and numbers are always HTML/SVG, never asked to the image.
- **Check the size of every result**: the reference generator ignored the requested portrait ratio and returned 1536×1024 (one 1672×941). Design for landscape: scale to the canvas height (2880×1920) and pan horizontally (`x` 140–760 px over the shot), or crop on purpose. Never stretch.
- Review every image with vision: legible text, pseudo-text, logos, faces. Cover pseudo-text with an object (a chart over a trading-board painting) or regenerate.
- One new painting per sentence turn; a painting may return reframed (`x` and `scale` change: 1.06 → 1.15 wide, 1.30 → 1.38 tight). Each shot holds 1.6–3 s in the body, 0.6–1 s in bursts.

### 6. 2.5D parallax from a still (depthkit)

Split each painting into a background and a soft front layer with Depth Anything V2 Small (the depthkit model), then move the front more than the back:

```python
import depthkit as dk
dk.still_layers("gen/harbour.png", "composition/assets/img")   # harbour.jpg + harbour-front.webp (+ harbour-depth.png)
```

`still_layers` normalises the relative depth by its 2nd/98th percentiles, keeps the near planes with `alpha = clip((depth − 0.52) / 0.2, 0, 1)` blurred by σ 6 px (soft edges, no cut-out look) and saves the front as RGBA WebP. In the page each shot is two `<img>` (back `.bk`, front `.fr`) in a `.pnt` div with a mood tint on top:

```js
// shot = [id, t0, t1, x0, x1, s0, s1, fx]   (fx = extra front travel in px, 60–90)
FT('#'+id+' .bk',{x:x0,scale:s0},{x:x1,scale:s1,duration:t1-t0,ease:'none'},t0);
FT('#'+id+' .fr',{x:x0-fx/2,scale:s0},{x:x1+fx/2,scale:s1*1.035,duration:t1-t0,ease:'none'},t0);
```

Keep the front travel ≤ 90 px and the extra scale ≤ 4 %: more than that tears the soft edge. Look at the halo of the front layer on native frames; lower `soft` or raise `blur` if a seam shows.

### 7. Cards (silence → impact → reveal → flash)

```
last word tail ── music silence 0.30–0.45 s ── card in + bass_impact ── title / odometer ── cymbal_swell ── amber flash out
```

- The card sits on the darkened globe (or black): radial vignette background, roman numeral in Cinzel 150 px gold with a glow, a 520 px gold rule (transparent at both ends), the title in Cormorant Italic 116 px ivory.
- **Year odometer**: a strip of years (Cinzel 200 px, line height 210 px) inside a 210 px window, translated in steps that accelerate and land on the spoken year on its word; intermediate years go to `allowed_numbers` with the reason.
- **Main title**: Cinzel 168 px with `letter-spacing .08em` fixed, a gold sheen by animating `background-position` of a `background-clip: text` gradient (300 % wide) from 100 % to 0 % in 1.1 s, and an entrance by `scale 1.14 → 1`. Never animate `letter-spacing` (lint error).
- Cards last 1.0–1.6 s (the reference documentary holds ~5 s; a Reel cannot). The narrator does not need to read the card; if the spoken line has the year, the card shows it on the word.

### 8. Documentary notes with verified facts

A note reinforces the narration with one checked fact: Barlow Condensed 600 34 px, upper case, `letter-spacing .06em`, a 4 px gold left rule, a dark gradient background, max 860 px wide, highlighted words in gold, **≥ 2 s on screen** (notes under 0.5 s were unreadable).

- Every fact comes from a primary or reputable source (the institution's own history page, an official statistics table, a major newspaper or wire service) and is listed in DESIGN.md with the URL and what exactly it supports.
- The note never contradicts the speech and never adds a new argument; a simplification the speaker made stays his, the note only states the narrower fact ("the cable carried its first official message that month", not "the ocean was connected for good").
- Numbers that are not spoken go to `plan["allowed_numbers"]` with the fact they belong to. A stylised chart states only its verified points (a peak date, a fall percentage); say in DESIGN.md that the curve between them is approximate.

### 9. Duration: `max_duration`

A narrated documentary Reel runs ~90 s: declare `plan["max_duration"] = 100` (never above 180 s) in `build.py` so `heditor test` accepts it, and justify it in DESIGN.md. The arc must earn the time: a retention device every 1.5–3 s (new picture, label, light, route, stamp, card) and an open loop in the first 15 s that the payoff closes.

### 10. Render cost

The globe canvas is redrawn on every frame inside its windows; with ~22 large images, two video elements (plate + medallion from the same file) and full-frame grain, the reference production (92 s, 2760 frames at 30 fps) captured every frame in about 9 min 15 s with 2 workers on a 4-core VPS (≈ 5 frames per second, ≈ 0.2 s per frame), plus the encode. Budget about 6× real time for capture alone. Keep it there: one canvas, no SVG filters, grain as a PNG tiled and moved in steps, `backdrop-filter` nowhere, the canvas idle outside its windows, images as JPEG/WebP at their used size. If the encode times out: `PRODUCER_ENABLE_CHUNKED_ENCODE=true FFMPEG_ENCODE_TIMEOUT_MS=7200000` and 2 workers. Run `camera_sync_check.py` after the last `produce` (both camera elements must report offset 0).

## Pitfalls found in production

- **The image generator ignored the requested aspect ratio**: every painting came back landscape (1536×1024, one 1672×941). Check sizes before designing the shots; use landscape full-bleed with horizontal pan.
- **Vision timed out on large contact sheets**: build sheets of 6–9 frames under ~1100 px and native strips of 3–4 frames; five review rounds (~120 frames) were needed.
- **Freeze detector false positives**: cards, the main title and the CTA built in steps read as freezes; extract the flagged frames and confirm with vision.
- **The payoff did not show**: the bubble was larger than the screen at the burst. Pull the camera back before the largest silence so the whole object and its shock ring fit.
- **A stamp rendered behind the plate**: give stamps and plate labels an explicit `z-index` above the plate.
- **Half-empty reveal frame**: keep the painting darkened behind the plate and put the name strip below the plate, larger, not over the shoulder.
- **Big words touched or crossed the edges** (a two-word institution name, the title, a word that splits in two): measure with the real TTF and size to ≤ 960 px.
- **Labels that "fell" onto the lights looked like loose stickers** and were removed; a domain-like placeholder with block glyphs looked unfinished: write a plausible generic word instead.
- **Repeated era objects looked like a template**: change size, position and layout (a large-photo newspaper) between the four cold-open papers.
- **A typed date appeared half-typed** on the frame where it is read: the date line enters already complete; only the body types.
- **The lesson timeline was hard to read**: larger bubbles with a gold rim, leaving marks after they break.
- **The Follow button had low contrast** over the globe: dark fill, light text, gold border and glow.
- **Fact notes were small and short**: 30 → 34 px and ≥ 2 s.
- **Bright pixels above 270 px** (lights, routes, lamps in paintings): a soft top gradient (`#topfade`, black 0.9 at 0 px → 0 at 325 px) above the world, under the captions.
- **Animated `letter-spacing`** on the title failed lint: animate scale and `background-position` instead.
- **Lint warnings are expected** (~80: caption structure, the same painting used in two shots, large files, ~21 heavy overlays below the ~40 risk limit); errors must be 0.
- **A soft webcam next to crisp graphics** is the recurring vision remark: inherent to the source; the film grade, grain and the plate/medallion states are the treatment, never full-screen sharp.
- **Nobody listens in QA**: the junctions after cards, the music-only silences and the drone level must be listened to before delivery; ASR does not judge them.

## Variations

- **Engraving instead of oil**: hand-coloured copperplate prints (sepia, ochre `#c2a774`, paper `#f2daaa`) for older centuries; same parallax.
- **Daytime relief atlas**: petrol ocean `#08303b`, relief `#385848`, the territory in green `#548f41 → #76ba65` with a bright white outline, labels in heavy white sans with shadow; for geography stories with countries and borders (real outlines from Natural Earth admin-0).
- **Territory of the subject**: an abstract map whose regions are ideas (no real geography, no real names), when the speech has flows but no places; routes still act out the verbs.
- **Single-region map**: one country or one ocean in flat projection instead of the globe, with dashed routes (migrations, shipping lanes, a cable).
- **Archive desk opening**: a 0.5 s-per-shot montage of hands, pages, a magnifier and a ruler (generated or drawn in CSS) for the thesis line.
- **Long form**: chapters as dated cards with a globe flight between them, voice-over over paintings, testimony plates on the key lines, cruise pace 6–9 s per shot after a fast opening, slower on grave themes (see `../long-form.md`).
