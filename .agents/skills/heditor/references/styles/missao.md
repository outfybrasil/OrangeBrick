---
style: missao
name: Missão (open-world game homage)
family: fixed-style
best_for: life/career talks with a journey, a "what it is vs what people think it is" turn and a list of earned attributes (goals, routines, priorities, definitions of success)
reference: produced by PycodeBR (Felipe Azambuja), October 2026
---
# Missão (open-world game homage)

The Reel plays like the trailer and HUD of an open-world crime/action game set in an invented coastal city at sunset. The speaker is the protagonist. The cut opens on a viral vertical clip inside an in-world phone with a breaking-news chyron, slams into a freeze-frame character intro (big condensed name, script nickname, slanted colour band), then turns the argument into gameplay: a mission card with objectives, a GPS minimap whose route is driven by the dates and verbs of the speech, a money/inventory HUD that gets struck out at the turn, a character stats screen whose bars fill as the speaker lists what matters, a radio-station card when the music changes, and a gold mission-complete banner on the last line. The CTA comes back on the same phone, now a dark messaging app. Everything lives under a supersaturated sunset that keeps descending until the payoff. The viewer should feel they are watching a character's story arc, not a lecture. The core metaphor: **the speaker's argument is a mission, and the payoff is completing it**.

It is an **homage to modern open-world crime/action games**: sunset neon palette, in-world phone and social-video UI, character intro freeze-frames, mission cards, GPS/minimap, stats screen, mission-complete banner. It never uses a real game's name, logo, typeface, characters, map, screenshots or music.

### Using it as the base for "creative mode + open-world game reference"
When a user asks for creative mode with an open-world game as the reference ("in the style of <open-world game>"), start from this file instead of from zero: keep the five layers (sunset palette and grade, condensed + script typography, phone/HUD UI, freeze-frame and wipe motion, trap/house radio music), then re-invent the scenes for the new speech and change at least two of: city/time of day, HUD set (inventory, heat meter, stats, map), camera role, CTA screen. Run the research step of `../creative-mode.md` for the specific reference and write the reference brief, but map every finding to original equivalents: no logos, no game or studio name on screen, no game font or lookalike commercial font, no characters, maps, screenshots, real platform names or soundtrack, no claim of affiliation. Invent the city, the app and the radio station names in the user's language.

## When to use / when not to

Use it when the speech has:
- a **journey** with markers you can put on a map (years, stages, "I started… kept going… built…");
- a **misconception vs definition** turn ("it's not about X, it's about Y") that can strike out a HUD element;
- a **list of 3–6 attributes** (time, health, learning, family…) for the stats screen;
- a warm, confident or grateful ending that deserves a "mission complete".

Avoid it when:
- the topic is grief, health, violence or a real crime (the game frame trivialises it);
- the speech is a technical walkthrough or a screen recording (HUD fights the content);
- the clip is under ~25 s (intro + mission + turn + stats need room);
- the speaker would object to being styled as a game character, or the brand forbids a magenta/orange palette.

## Signature moves

1. **Viral clip in an in-world phone** at frame 0: the camera fills a phone (rounded 64 px, black 14 px bezel, notch, invented app name in a script font, a "trending" pill, the brand handle, side icons heart/comment/send/bookmark **without counters**, a progress bar), and a two-line **breaking-news chyron** (red tag + white band) paraphrasing the hook as a headline about "the person from <invented city>".
2. **Zoom slam → freeze-frame character intro**: the phone scales out (1.75×) while the camera card jumps to a wide state; white flash; a still frame (saturated + contrast) with a slanted magenta→orange→yellow band, the speaker's name in Anton 178 px rotated −5°, a script nickname in cyan, and a small brand tag.
3. **Mission card + GPS minimap**: dark-glass card "MISSION · <GOAL>" with checkbox objectives ticked on the spoken verbs; a 900×640 SVG city map with a magenta route that draws itself and a player arrow that travels between stops timed to spoken years/stages; chips pop on each marker; destination flag on "today".
4. **Money / inventory HUD that is never a number**: a wallet panel with a giant green currency symbol and a pulsing **"?"**, banknote icons that fill on "I have money", and a progress bar. At the turn the whole HUD goes red, glitches, and a red slash crosses it.
5. **Drop title "X ≠ Y"**: Anton title with a CSS-drawn ≠ and the second word struck through; a dashed cut line with a scissors icon separates the two words when the speech says "let's separate".
6. **Stats screen**: "STATUS · <DEFINITION>" with 4–6 icon rows; segmented bars fill on each spoken attribute, then shimmer together.
7. **Radio-station card** when the music changes: "now playing" + an invented station name in script, plus a two-frame hue glitch on the camera.
8. **Mission-complete banner**: dark band across the frame, gold gradient Anton title, script subtitle with the last spoken phrase, five stars popping one by one. The sun touches the horizon at this moment.
9. **Sunset world that moves on its own**: banded sun descending, drifting cloud streaks, birds, swaying palms, sea shimmer, so even talking-head stretches never freeze.

## Frame and layout

Canvas 1080×1920, 30 fps. Top-left px.

```
y 0–270     night sky only (#07031a → #0d0526), faint stars. No text, no bright pixels.
y 300–720   top slot: chyron-free titles, mission card (600,300 420×404), notification (110,300 840×100),
            radio card (60,300 540×86), drop title block (0,300 1080×420)
y 300–1360  phone (250,300 580×1060) in the hook; CTA phone (200,300 680×960)
y 724–1364  GPS map (60,724 900×640) / stats screen (90,874 870×490) / wallet (110,1100 840×220)
y 930–1320  mission-complete banner (0,930 1080×390)
y 1092–1292 skyline silhouette;  y 1290–1920 sea, sun road, shimmer
y 1385–1565 caption plate (90,1385 900×180)
y > 1570    atmosphere only (sea). x > 960 in y 1000–1700: palm/sea only.
```

Camera card `#cam` (rounded, `overflow:hidden`, inset 3 px white hairline) moves between states with `left/top/width/height/borderRadius` tweens (keep the source aspect, ≈ 1.34 for a 4:3 crop):

| State | left, top, w × h, radius | Used for |
|---|---|---|
| `phone` | 264, 314, 552 × 1032, 50 | inside the hook phone |
| `intro` | 40, 330, 1000 × 744, 28 | freeze-frame character intro |
| `map` | 60, 300, 520 × 387, 22 | small, top-left, beside the mission card |
| `hero` | 110, 420, 860 × 640, 26 | talking-head breather + wallet HUD |
| `low` | 180, 730, 720 × 535, 24 | under the drop title |
| `stats` | 230, 396, 620 × 461, 24 | above the stats screen |

- Find the face with `rk.track_faces`; put HUD panels on the opposite side and never over eyes/mouth. Jump-cut zoom 1.0 ↔ 1.07 per `K.segments` + 1.5 % breathing, transform-origin = segment face centre.
- First text row must sit at y ≥ 300. Flash and wipe layers are masked above 290 px (see snippets).
- The phone chyron (y 1150–1300) covers the lower part of the phone image: frame the source so the face is in the upper 60 % of the phone.

## Palette and typography

| Role | Hex |
|---|---|
| Sky gradient (top → horizon) | `#07031a` 0 · `#0d0526` 220 · `#1d0a3e` 300 · `#4a1262` 520 · `#9c1f6e` 760 · `#e8365f` 930 · `#ff6a45` 1060 · `#ffa24a` 1180 · `#ffd27a` 1290 |
| Sea | `#2bb7b0 → #13808d → #0a4d63 → #062a3d → #04121f` |
| Sun core | `#fff2b0 → #ffc35a → #ff7a3d` (banded by a stripe mask) |
| Silhouettes (palms, skyline, birds) | `#12051f`, `#1b0a2f`; lit windows `#ff8fb8` at .55 |
| HUD glass | `linear-gradient(160deg, rgba(18,8,46,.96), rgba(8,4,26,.95))`, 2 px border `rgba(255,255,255,.22)`, radius 26 |
| Route / accents | magenta `#ff2bd6`, ghost route `#ff8ae6`, map ground `#0b1430`, roads `#1d2b55` |
| Gold (mission, chips, banner) | `#ffc94a`, `#ffd24a`, banner text gradient `#fff6c8 → #ffd24a → #ff9a2e` |
| Money HUD | `#39ff88`, label `#9fffc4`; turn state `#ff2747` |
| Cyan nickname / icons | `#5ff7ea` |
| Breaking-news tag | `#d4002f` on white band, ink `#0b0b12`, sub-line `#c2006b` |
| Caption active block | `#c2006b` with `0 6px 0 #5c0033` shadow |

Fonts (google/fonts, SIL OFL 1.1):
- **Anton** (`Anton-Regular.ttf`, in the kit) — names, mission titles, chips, drop title, banner. Condensed and heavy = "trailer title" without any game typeface.
- **Inter** (`Inter-VF.ttf`, in the kit) weight 800 — captions, HUD labels, phone UI.
- **Pacifico** — script for the nickname, app name, radio station and banner subtitle. Not in the kit: download `Pacifico-Regular.ttf` from google/fonts `ofl/pacifico` into `composition/assets` and ship its `OFL.txt`. Fallback already in the kit: **Caveat** (`Caveat-VF.ttf`, weight 700), less neon-sign but acceptable.
- **Bebas Neue** (`BebasNeue-Regular.ttf`) is a valid alternative for chips if Anton feels too heavy.
- Lucide (ISC): `target`, `check`, `flag`, `navigation`, `message-circle`, `briefcase`, `banknote`, `scissors`, `radio`, `heart-pulse`, `sun`, `heart`, `presentation`, `cpu`, `star`, `flame`, `send`, `bookmark`, `signal`, `wifi`, `battery-full`, `chevron-left`, `pointer`, `sparkles`.

Check glyphs before relying on them: Anton has no `≠` (it renders as `=`), so draw it (snippet below).

## Caption system

"Cutscene subtitles": sentence case (not uppercase), Inter 800, 70 px, line-height 1.12, white with `text-shadow:0 4px 0 #07031a`, centred, `text-wrap:balance`, on a dark plate `rgba(10,4,30,.80)` with radius 22 and a 5 px magenta bottom rule `#ff2bd6`.

- Grouping: `rk.captions(words, voice_end, max_words=4, max_chars=20)`; 1–2 lines. `plan["captions"]` = what is shown.
- Active word: **white on a dark magenta block `#c2006b`** (≈ 5.9:1) with a 6 px darker drop `#5c0033`; switches at `word.start − 0.02`. Other words stay white (no dim state) so a sunset behind never lowers contrast.
- Phrase entry: `y 10 → 0, scale .97 → 1` in 0.1 s `power2.out`.
- The plate exists only while a caption is on screen. Merge plate spans when the gap between captions is < 0.35 s; in that case **extend the previous caption's end to the next start** so the plate is never empty (an empty plate read as a missing caption in review).
- Contrast check: enlarged crops over the brightest sky/sun frames and the drop flash.

```css
#capbar{position:absolute;left:90px;top:1385px;width:900px;height:180px;border-radius:22px;background:rgba(10,4,30,.80);border-bottom:5px solid #ff2bd6;z-index:29;opacity:0}
.capg{left:100px;top:1385px;width:880px;height:180px;z-index:30;display:flex;align-items:center;justify-content:center}
.sub{width:880px;text-align:center;font-family:Inter;font-weight:800;font-size:70px;line-height:1.12;color:#fff;text-shadow:0 4px 0 #07031a;opacity:0;visibility:hidden;text-wrap:balance}
.sub .w{display:inline-block;padding:0 .12em;border-radius:12px;margin:0 .02em}
```
```python
def cutscene_captions_js(caps):
    on  = '{backgroundColor:"#c2006b",boxShadow:"0px 6px 0px #5c0033"}'
    off = '{backgroundColor:"rgba(194,0,107,0)",boxShadow:"0px 0px 0px rgba(92,0,51,0)"}'
    js, spans = [], []
    for c in caps:
        cid = f'#{c["id"]}-c'
        js.append(f'S("{cid}",{{visibility:"visible",opacity:1}},{c["start"]:.3f});'
                  f'FT("{cid}",{{y:10,scale:.97}},{{y:0,scale:1,duration:.1,ease:"power2.out"}},{c["start"]:.3f});')
        for j, w in enumerate(c["words"]):
            t = max(c["start"], w["start"] - .02)
            js.append(f'S("#{c["id"]}-w{j}",{on},{t:.3f});')
            if j + 1 < len(c["words"]):
                js.append(f'S("#{c["id"]}-w{j}",{off},{c["words"][j+1]["start"] - .02:.3f});')
        js.append(f'S("{cid}",{{visibility:"hidden",opacity:0}},{c["end"]:.3f});')
        if spans and c["start"] - spans[-1][1] < .35: spans[-1][1] = c["end"]
        else: spans.append([c["start"], c["end"]])
    for a, b in spans:
        js.append(f'FT("#capbar",{{opacity:0,scaleX:.94}},{{opacity:1,scaleX:1,duration:.08}},{a:.3f});'
                  f'TO("#capbar",{{opacity:0,duration:.05}},{max(a + .1, b - .05):.3f});')
    return "".join(js)
```
(Before calling it, set `caps[i]["end"] = caps[i+1]["start"]` when that gap is < 0.35 s.) No captions in the CTA (no speech).

## Scene grammar

Generic example: a speaker arguing that being busy is not the same as being productive.

| Beat | Scene | Camera | What happens |
|---|---|---|---|
| Hook / cold open (0–~2.5 s) | Viral clip in the phone | `phone` | Strongest line as cold open. Phone rises (y 120 → 0, rot −4 → 0, 0.5 s `expo.out`) already visible in frame 0; chyron slides in at 0.12 s: "BREAKING · PERSON FROM <CITY>" / "redefines what 'productive' means" (a loop opened here, closed by the stats screen and banner). Heart icon taps red at ~1.2 s. |
| Context starts | Freeze-frame intro | `intro` | On the first word of the context: zoom slam, flash, freeze (~1.5 s while the voice continues), slanted band, NAME / nickname / brand tag. |
| Journey | Mission + GPS | `map` | Diagonal wipe. "MISSION · <GOAL>"; first objective ticks. Route draws stop by stop on spoken markers (years, "started", "kept going", "built"); chips pop on markers; a gold bracket names a span ("A DECADE"); destination flag + green "✓ <PAYOFF WORD>" chip on "today". |
| Breather | Talking head | `hero` | Wipe; camera big for 1–2 s. Breathing room after the dense map. |
| The misconception | Inventory HUD | `hero` | Wallet/inventory ("HOURS", "TASKS", "WALLET") with symbol + **"?"** pulsing; an in-world notification echoes the question the speaker asks; icons fill on the concession ("yes, I'm busy"). |
| Turn / drop | X ≠ Y | `low` | Music cuts 0.25 s before; on the key word the HUD turns red, glitches (6 alternating x/skew sets over 0.3 s), red slash draws; flash magenta + shake 16 + punch 1.1. HUD drops out; "BUSY" / "≠ PRODUCTIVE" title, strike on the second word; "let's separate" → scissors run a dashed line and the two words drift apart. |
| Definition | Stats screen | `stats` | "STATUS · <TERM>" rows, empty; the first bar fills half on the first mention, a script stamp ("my case") when the speaker personalises it. |
| Second wind | Radio change | `stats` | Radio card "now playing · <invented station>" + hue glitch on the camera at the music change. |
| List | Stats fill | `stats` | One bar fills per spoken attribute (0.45 s `power2.out`, row nudges, icon pops), then all shimmer on the summary verb. |
| Payoff | Mission complete | free (170, 380, 740 × 550) | Stats exit; gold banner + last phrase in script + 5 stars; sun meets the horizon. |
| CTA (6 s) | Phone again | out | Same phone object closes the loop (below). |

Rules: every label is a paraphrase of what is said at that moment; numbers only when spoken (years are fine); money never gets a value; one HUD system on screen at a time; never show an empty container (each panel enters with its first content).

## Transitions and motion vocabulary

- **Diagonal wipe** (scene change): full-height bar skewed −18°, gradient magenta → orange → gold, `x 0 → 3000` in 0.55 s `power2.inOut`, masked above 290 px. Fire it in speech gaps when possible; it covers the captions for ~0.2 s.
- **Zoom slam**: phone `scale 1.75, opacity 0` in 0.26 s `power3.in`; camera to `intro` in 0.26 s `power4.out`; flash .85/0.25 s; freeze image `scale 1.12 → 1.04` over 1.5 s `power2.out`.
- **Intro type**: band from x +500 (0.3 s `expo.out`), name from x +260 scale 1.4 (0.28 s `power4.out`), nickname from x −80 (`back.out(1.6)`), tag y 30 → 0. Exit all x +300 in 0.2 s.
- **Camera dock**: `cam(state,t,.42–.45,'expo.inOut')`.
- **Route**: per leg, tween `#player` x/y and `#route strokeDashoffset` linearly; set arrow rotation at each leg start; destination ring pulses (scale 1 → 1.5, opacity .2, 0.6 s × 5).
- **Tick**: checkbox fills gold in 0.12 s, `scale 1.5 → 1` `back.out(3)`, label turns white.
- **Pop**: chips `opacity 0, scale .4 → 1` in 0.3 s `back.out(2)`.
- **Drop**: flash `#ff2bd6` .7/0.25 s, `shake(t,16)` (5 steps × 35 ms), `punch(t,1.1,.3)`; ≠ spins in from scale 2.2 rot −30° (`back.out(2.4)`); strike width 0 → 106 % in 0.2 s.
- **Radio glitch**: camera `filter:hue-rotate(40deg) saturate(1.8)` toggled 4 times 50 ms apart.
- **Banner**: `scaleY .1 → 1` 0.22 s `power4.out`; title `scale 1.5 → 1`; stars 0.1 s apart `back.out(3)`; gold flash .6.
- **Ambient (whole cut)**: sun `y +150` until the payoff (`sine.inOut`), dusk overlay to .55, clouds drift ±120–140 px, birds cross and flap (`scaleY .4` yoyo 0.28–0.37 s), palms sway ±1.5° (3.2/3.7 s yoyo), sea shimmer scrolls, grain stepped at 15 fps.

## Sound design

Voice first. `gain_db` values as fed to `rk.mix`.

| Action | Category | gain_db | length |
|---|---|---|---|
| Frame 0 hit | `trailer_hit` | −18 | 0.9 |
| Phone clip / chyron | `phone_notification` / `swipe` | −24 / −24 | 0.5 / 0.35 |
| Zoom slam / freeze impact / freeze | `whoosh` / `sub_drop` / `camera_shutter` | −16 / −17 / −20 | 0.45 / 0.8 / 0.35 |
| Name enters | `swipe` | −24 | 0.3 |
| Wipe | `whoosh` | −17 to −20 | 0.45 |
| Map on / markers | `data_beep` | −27 / −26 (rate 1.08 on the second) | 0.25–0.3 |
| Span bracket | `scan` | −27 | 0.5 |
| Objective ticks | `click` ×2, last one `power_up` | −26 | 0.2 / 0.6 |
| Destination | `success` | −23 | 0.6 |
| Currency symbol blinks / icons fill / full | `coins` / `coins` / `game_coin` | −27 / −22 / −25 | 0.35 / 0.6 / 0.3 |
| In-world notification | `message_received` | −23 | 0.4 |
| Music stops before drop | `tape_stop` | −21 | 0.4 |
| **Drop** | `trailer_hit` + `glitch` | −14 / −23 | 1.0 / 0.4 |
| ≠ lands / strike | `stamp` / `pen_write` | −24 | 0.3 / 0.35 |
| Scissors | `swipe` | −21 | 0.5 |
| Stats open / first bar | `data_beep` / `progress_complete` | −27 / −26 | 0.3 / 0.4 |
| Radio change | `glitch` | −19 | 0.3 |
| Each bar | `pop` (vary variant, rate .95–1.1) | −25 | 0.25 |
| Bars shimmer | `power_up` | −27 | 0.6 |
| Pre-banner rise / banner / stars (after last word) | `cymbal_swell` / `trailer_hit` / `level_up` | −25 / −16 / −17 | 0.9 / 1.0 / 1.0 |
| CTA phone / question / reply hint / card | `whoosh` / `message_received` / `message_sent` / `swipe` | −18 / −18 / −21 / −22 | 0.35–0.45 |
| Follow tap / Following | `mouse_click` / `success_chime` | −15 / −17 | 0.2 / 0.7 |

**Music: two "radio stations".** Station A carries hook → drop, station B the second half.
- A: `music:369` (Need for Speed, determined trap) — reference. No catalog drop value: find it by RMS (50 ms windows); the reference used the first full kick after a short breath at **13.70 s** of the track. Alternatives: `music:293` (Lord Knows, drop/lift at 11 s), `music:126` for a more aggressive cut.
- B: `music:623` (Deep Urban, hypnotic tech house, "sunset drive") — reference, from src 16 s. Alternatives: `music:167` (Brainiac) or `music:187` (Mountains) for a softer, uplifting second half.

Section plan (reference proportions; `X` = drop word − 0.05, `R` = radio change):
```json
[{"start":0,"end":"INTRO-0.14","mode":"radio","gain_db":-2,"track":"A","src":30.0,"fade_out":0.04},
 {"start":"INTRO-0.14","end":"BREATHER-0.37","mode":"lowpass","gain_db":-3,"track":"A","src":34.0,"fade_in":0.03,"fade_out":0.15},
 {"start":"BREATHER-0.37","end":"X-0.25","mode":"radio","gain_db":-2,"track":"A","src":"t+(drop_s-X)","fade_in":0.2,"fade_out":0.06},
 {"start":"X-0.25","end":"X","mode":"silence"},
 {"start":"X","end":"R","mode":"full","gain_db":-2,"track":"A","src":13.70,"fade_in":0.008,"fade_out":0.06},
 {"start":"R","end":"R+0.2","mode":"silence"},
 {"start":"R+0.2","end":"R+0.7","mode":"radio","gain_db":-3,"track":"B","src":16.0,"fade_in":0.03,"fade_out":0.03},
 {"start":"R+0.7","end":"DURATION","mode":"full","gain_db":-2,"track":"B","src":16.5,"fade_in":0.03,"fade_out":1.0}]
```
Hook in `radio` mode = sound from the phone speaker; the journey in `lowpass`; the money part runs the track's sparse intro in `radio` so it builds into the drop; silence; full drop; a 0.2 s tuning gap + 0.5 s `radio` = changing stations. `"music_ref": [drop_t, last_word_end]`, `"cta_boost_db": 5`. Reference balance: music −21.5 dB under voice median, background p95 −13.5 dB, 0 % of windows within 10 dB.

## CTA design inside the style

6 s after `voice_end` (`C`), the phone from the hook returns as a **dark** messaging app (night-blue gradient `#160b38 → #0a0520` with a magenta glow at the bottom, 16 px bezel, 680×960 at 200,300). No captions.
1. `C+0.2`: camera card drops (y +260, fade 0.35 s); `C+0.25` banner exits up.
2. `C+0.45`: phone rises from y +1300, rot 6° → 0 (0.55 s `expo.out`). Header: back chevron, round avatar with `assets/logo.png`, handle from `rk.load_brand(work)["handle"]`, "now".
3. `C+0.55–0.95`: typing dots bounce; reply field "Write your answer…" fades in.
4. `C+1.0`: white bubble with the comment question (Inter 800, 50 px, ≤ 3 lines), grows from its tail (`back.out(1.8)`).
5. `C+1.8`: yellow `#ffe14d` bubble with a Lucide `message-circle` icon + "Reply in the comments" (36 px).
6. `C+2.3`: profile card (gradient `#2a0f55 → #45135f`, magenta hairline) with avatar, handle and a `#c2006b` **Follow** button.
7. `C+2.85`: Lucide `pointer` finger enters; `C+3.3` presses (scale .9), button .94 → 1 and turns white with "✓ Following" in ink at `C+3.43`, ripple ring expands ×3 in 0.45 s. Labels from `brand["follow"]` / `brand["following"]`.
8. `C+4.1` finger leaves; `C+4.6` / `C+5.1` the bubbles nudge once (scale 1.03–1.05 yoyo) so the hold never freezes. Music +5 dB, 1 s fade.

## Implementation notes

Write your own page (not `rk.page()`). Use reelkit for words, captions grouping, keys (`rk.finder`), face tracking, jump segments, camera prep, icons and the mix. Layer order inside `#world`: sky, dusk, stars, sun, clouds, haze, birds, skyline, sea, sun road, shimmer, palms (z 3), HUD glass panels, title, radio, stats, banner (z 14), `#cam` (z 10), hook phone (z 11), chyron (z 12), intro (z 13), CTA phone (z 20); then `#capbar` (29), caption clips (30), `#wipe` (40), `#grain` (41), `#flash` (45).

Camera grade ("sunset": warm highlights, teal shadows, saturation, vignette) and the freeze still:
```python
SUNSET_VF = ("colorbalance=rs=-.05:gs=.01:bs=.09:rm=.04:gm=-.02:bm=-.03:rh=.13:gh=.04:bh=-.10,"
             "eq=saturation=1.32:contrast=1.07,vignette=PI/5")
rk.prepare_camera(work, width=960); rk.styled_camera(work, "sunset", SUNSET_VF)
subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", f"{k['intro'] + .06:.3f}", "-i", str(assets / "camera-sunset.mp4"),
                "-frames:v", "1", "-q:v", "2", str(assets / "freeze.jpg")], check=True)
```
The freeze is an `<img id="freeze">` over the video inside the same zoom wrappers (`filter:saturate(1.55) contrast(1.18) brightness(1.04)`), with a `mix-blend-mode:soft-light` magenta→orange tint; set both to opacity 1 at the slam and 0 at the wipe.

Sky, sun and masks (top stays dark, flash/wipe never reach the top band):
```css
#sky{position:absolute;left:0;top:0;width:1080px;height:1300px;background:linear-gradient(180deg,#07031a 0px,#0d0526 220px,#1d0a3e 300px,#4a1262 520px,#9c1f6e 760px,#e8365f 930px,#ff6a45 1060px,#ffa24a 1180px,#ffd27a 1290px)}
#sun-core{position:absolute;left:90px;top:90px;width:240px;height:240px;border-radius:50%;background:linear-gradient(180deg,#fff2b0,#ffc35a 45%,#ff7a3d);
  mask-image:linear-gradient(180deg,#000 0 52%,transparent 52% 57%,#000 57% 66%,transparent 66% 71%,#000 71% 79%,transparent 79% 85%,#000 85%)}
#wipe{position:absolute;left:-1400px;top:0;width:1100px;height:1920px;z-index:40;transform:skewX(-18deg);opacity:0;
  background:linear-gradient(90deg,rgba(255,43,140,0),#ff2b8c 22%,#ff7a3d 55%,#ffd24a 80%,rgba(255,210,74,0));
  mask-image:linear-gradient(180deg,transparent 0 290px,#000 340px)}
#flash{position:absolute;inset:0;background:#fff;opacity:0;z-index:45;mask-image:linear-gradient(180deg,transparent 0 290px,#000 340px)}
```
Drawn ≠ (three bars, no glyph dependency):
```html
<span id="neq" style="position:relative;display:inline-block;width:112px;height:104px;vertical-align:-6px;margin-right:30px">
 <i class="eq" style="top:30px"></i><i class="eq" style="top:62px"></i>
 <i class="eq" style="left:46px;top:-2px;width:18px;height:110px;transform:rotate(30deg)"></i></span>
<style>.eq{position:absolute;left:4px;width:104px;height:17px;background:#ff2bd6;box-shadow:4px 5px 0 #12051f;border-radius:3px}</style>
```
GPS route driven by speech (Python → `K.route.legs`):
```python
def route_legs(pts, arrive):            # pts: polyline in map coords; arrive: {point_index: spoken_time}
    cum = [0.0]
    for a, b in zip(pts, pts[1:]): cum.append(cum[-1] + math.dist(a, b))
    legs, idx = [], sorted(arrive)
    for a, b in zip(idx, idx[1:]):
        t0 = max(arrive[a] + .02, arrive[b] - 2.4); span = arrive[b] - t0; t = t0
        for i in range(a, b):
            dur = span * (cum[i+1] - cum[i]) / (cum[b] - cum[a]); (x0, y0), (x1, y1) = pts[i], pts[i+1]
            legs.append(dict(t=round(t, 3), dur=round(dur, 3), x=x1, y=y1, off=round(cum[-1] - cum[i+1], 1),
                             rot=round(math.degrees(math.atan2(y1 - y0, x1 - x0)) + 90, 1)))
            t += dur
    return legs
```
```js
K.route.legs.forEach(l=>{TO('#player',{x:l.x,y:l.y,duration:l.dur,ease:'none'},l.t);S('#player-rot',{rotation:l.rot},l.t);
  TO('#route',{strokeDashoffset:l.off,duration:l.dur,ease:'none'},l.t);});
function cam(st,t,d,e){TO('#cam',Object.assign({duration:d||.42,ease:e||'expo.inOut'},K.camStates[st]),t);}
function wipe(t){FT('#wipe',{x:0,opacity:1},{x:3000,duration:.55,ease:'power2.inOut'},t);S('#wipe',{opacity:0},t+.56);}
function tick(id,t){TO(id+' .box',{backgroundColor:'#ffd24a',borderColor:'#ffd24a',duration:.12},t);S(id+' .box .ic',{opacity:1},t);
  TO(id,{color:'#ffffff',duration:.12},t);FT(id+' .box',{scale:1.5},{scale:1,duration:.25,ease:'back.out(3)'},t);}
```
The map is one inline SVG (900×640): dark ground, 4 horizontal + 7 vertical roads (22 px) and minor streets (8 px), park/block rects chosen deterministically (`(i*3 + j*5) % 7`), a coast with a sand line, a dashed ghost route under a 14 px magenta route (`stroke-dasharray = stroke-dashoffset = total length`, `drop-shadow` glow), a gold destination ring and a white arrow player. Palms, skyline and birds are generated SVG paths (seeded by index arithmetic, no `Math.random`). Every key time comes from `rk.finder(words)` chained with `after` (`f("today", f("built"))`) so the build re-syncs to new speech.

## Pitfalls found in production

- **Slow render and encode timeouts.** Many full-canvas gradients, masks, `filter` on SVG and blur made this the slowest style in its batch; the first render died with an ffmpeg encode timeout while the machine was under heavy load, and a preview once crashed the browser at the RAM limit. For this style render with `PRODUCER_ENABLE_CHUNKED_ENCODE=true FFMPEG_ENCODE_TIMEOUT_MS=7200000`, keep `blur()` to a few small elements (cloud streaks only), avoid `backdrop-filter` entirely (the glass is an opaque gradient), and prefer one drop-shadow filter on the route over many.
- **ASR false alarm.** The small Whisper model heard a common two-word phrase as one brand-like word, in the clean voice *and* in the master, so `asr-check` reported a −0.038 delta that was not masking. Before touching the mix, re-transcribe the flagged window with the medium model for both voice and master; identical text = false alarm.
- **Never invent amounts.** A money HUD tempts you to show a value; the speech never gives one. Use the currency symbol, banknote icons and **"?"**. Empty banknote slots looked like a broken placeholder; the pulsing "?" turned into the question of the video. Only spoken numbers (years) may appear.
- **Sunset vs top margin.** A realistic bright sky trips the pixel check instantly. Keep the band 0–270 night-dark (luma < 150 everywhere, the gradient only lightens below 300), mask flash and wipe above 290 px, and keep stars dim. Reference: first bright row at y 300.
- **Missing glyphs.** Anton has no `≠`; it silently rendered `=` and inverted the message. Draw symbols in CSS or check every non-ASCII glyph in the font.
- **Chyron ticker** got clipped at the band edge; a static two-line chyron reads better in 2.5 s.
- **CTA phone** first came out light, empty and alien to the world; make it dark, compact, with typing dots and a reply field.
- **Empty caption plate** between close captions and a one-frame blink on caption swaps: extend captions across short gaps and hide the plate only on real pauses (> 0.35 s).
- **Freeze-frame while the voice continues** (~1.5 s) is intentional; the freeze detector may flag it, treat as advisory. A low-res webcam (≈ 320 px wide) upscaled into the phone looks soft; that is coherent with a "viral clip" but keep longer talking moments in `hero`/`intro`.
- **Cold open boundaries**: a filler word glued to the end of the hook line (no clean energy valley) produced a garbled word in ASR; start/end the cold open at the clean valley (≤ −40 dB) even if it drops a word.
- **Palette drift toward other warm styles**: realistic gradient sky, turquoise sea, thin hairline HUD and sentence-case captions keep it distinct from pop/halftone looks; compare sheets with previous edits.
- **Lint**: one structure warning per caption clip is expected; 0 errors is the gate.

## Variations

- **Night heist**: same grammar after dark (`#050816` sky, neon cyan `#2ee6ff` + magenta signage, rain streaks), mission card becomes a planning board, the inventory HUD becomes a "heat" meter of five stars that fills as risk rises. Music `music:597` or `music:293`. For risk, security or "what could go wrong" talks.
- **Character build**: skip the map, make the stats screen the main world (skill tree, perks unlocking with `level_up`), the turn strikes out a "wrong" perk. For learning, habits and skill topics. Music `music:369` → `music:167`.
- **Road trip**: daytime coast (`#7fd3ff` sky, low orange sun at the end), the GPS route is the whole video with turn-by-turn cards per stage, CTA as "next destination". For career journeys and timelines. Music `music:187` → `music:1117`.
- **Side quest**: a short single-scene variant for 20–30 s clips: phone hook → one mission card with 3 objectives → mission complete. Keep the freeze-frame intro; drop the stats screen.
