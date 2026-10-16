---
style: cinema
name: Cinema
family: fixed-style
best_for: argument-driven talking heads (myth vs. reality, then vs. now, problem → shift) that need one visual metaphor per beat
reference: produced by PycodeBR (Felipe Azambuja), October 2026
---
# Cinema

Cinema turns a talking head into a short film in which every beat of the argument gets an object with an action the viewer recognises in under a second: comments piling up, a scanner sweeping profiles, a form getting an X, a tape rewinding to another year, a rubber stamp, slots filling like a game inventory, a badge that gets upgraded, a chat with someone who knows more. The speaker stays visible the whole time as a live camera card with a gold border. When the card steps aside, the graphic takes centre stage. The core metaphor is **the edit as a director cutting between the speaker and the thing he is describing**. When the speech changes era or thesis, the whole world changes with it: palette, texture, grid, typography, camera grade and music section. Sound is welded to the picture. Every visible action has a sound, and the voice always stays in front.

## When to use / when not to

Use it when:
- the speech is an argument with clear beats: hook question, common belief, "but actually", a contrast between two periods or two profiles, a resolution;
- the script contains concrete nouns and verbs that can become objects (lists, steps, tools, people asking, things being approved or rejected);
- there is a time or mindset switch ("back then… now…", "before… after…") that can carry a world change;
- the brand wants a polished, premium feel without hiding the speaker.

Avoid it when:
- the clip is a calm, intimate story or emotional testimony (the motion density fights the tone);
- the speech is abstract with no nameable objects. Forced metaphors read as noise, so choose a typographic style instead;
- the source camera is unusable and the speaker cannot stay on screen;
- several clips in one batch would all get Cinema. Treat it as a quality baseline, not a mould. See *Variations*.

Content limits that are part of the style: no on-screen tags such as "illustrative scene"; simulated comments and chats stay anonymous and only paraphrase what the speech says; no invented numbers, metrics, names, testimonials or promises; never speed up, cut words from or invent speech.

## Signature moves

1. **Frame-0 hook.** The thesis or question is already on screen in frame 0, large Anton type with the key word in gold and the speaker visible below it. There is no intro or logo sting. The hook exits at about 0.8 s, when the first metaphor arrives.
2. **Live camera card with two states.** A rounded card with a 5 px gold border moves between `hero` (centred, large) and `top` (half size, under the safe top) with a 0.5 s `expo.inOut` move whenever a graphic needs the centre.
3. **One metaphor per beat, with an action.** Objects *do* something on the spoken word: they stack, scan, tick, cross out, stamp, fill, upgrade or reply. Static icons do not count.
4. **World switch on a change of era or thesis.** The flashback gets a magenta/amber synthwave grid, scanlines, tracking bar, VHS on-screen display (OSD) in VT323, a graded camera variant and a filtered music section. The return to the present uses fast-forward + white flash + music drop on the turn word.
5. **Freeze before the key question.** Camera and overlays go grayscale for about 0.35 s with a record scratch and the music cut. Then everything is thrown off screen and a sticker (a "?" badge) slaps onto the card with a punch-in.
6. **Kinetic captions.** Anton uppercase, 1–3 words, in a fixed band under the card. The active word turns gold (or a yellow pill in pill mode).
7. **Living background.** A navy radial gradient, a cyan perspective floor grid scrolling forward, two drifting glows and stepped film grain at 7 %.
8. **Hits on the stressed words only.** Punch-in (1.12–1.2), squash ("pressure" compresses the card), 35 ms-step shake and flash land on 6–10 words per minute, not on every line.
9. **Social CTA as a mini-scene.** "AND YOU?" plus a comment question, then a profile card rises, a pointer taps **Follow**, a ripple plays and the button flips to **Following**.

## Frame and layout

Canvas: 1080×1920 at 30 fps. Coordinates are in px from the top left.

```
y 0–270      SAFE TOP (14 %). No text, face, logo or key graphic. A 9 px progress bar at y 0 is the only allowed decoration.
y 300–500    Hook / headline / big words ("NOW", badges, A ≠ B). Keep it ≤ 200 px tall.
y 280–652    Camera card in `top` state (scale 0.5, centred, ≈ 480×372)
y 500–1200   Camera card in `hero` state (scale = min(1, 700/card_h), centred)
y 670–1190   Centre panels when the card is `top` (x 90–990, 900 wide, radius 36)
y 1222–1472  Caption band (x 70–1010)
y 1570–1920  Keep clear (Reels UI). Right edge x 960–1080, y 1000–1700: nothing critical.
```

- Camera: `rk.prepare_camera(work, width=960)` scales with Lanczos, applies a light unsharp and `eq=contrast=1.04:saturation=1.06`. The card is 960×(source aspect) and is usually 960×714–744 for a webcam. Use `rk.rig_states(card_w, card_h)` for `hero`/`top`.
- The card stack is `#rig > #squeeze > #frame(radius 44, overflow hidden) > #cam-zoom > #cam-breath > #cam-jump > video`, with `#border` on top. Punch-ins act on `#cam-zoom`, the squash on `#squeeze`, jump cuts on `#cam-jump` and breathing on `#cam-breath`, so these effects never fight each other.
- Pause cuts: `rk.track_faces(work)` + `rk.jump_segments(...)` → `K.segments`. Zoom alternates between 1.0 and 1.075 on each cut, centred on that segment's median face, with 1.5 % `sine.inOut` breathing inside each segment.
- Every punch-in keeps forehead, eyes and mouth in the frame and never moves the captions.

## Palette and typography

| Role | Present world | Flashback world |
|---|---|---|
| Base / deep | `#050a14`, `#081626` | `#0b0610`, `#1d0b22` |
| Background glow | `#10304a` (radial at 50 % 32 %) | `#3a1236` |
| Grid lines | `rgba(125,211,252,.20)` 2 px, 120 px cells | `rgba(255,120,200,.30)` / `rgba(255,170,90,.30)` 3 px |
| Brand gold (border, accents) | `#edc580` | `#ffb35c` amber |
| Caption active (text mode) | `#f5c66b` | same |
| Caption active (pill mode) | pill `#ffd84d`, text `#000000` | same |
| Cyan accent | `#7dd3fc` | `#2ee6ff` (chromatic offset) |
| Text / muted | `#f4f8fb` / `#9fb3c8` | `#ffe3b8` CRT text, `#ffd08a` years |
| Negative / stamp | `#ff3d57`, `#ff4d5e` | same |
| Positive | `#34d399`, `#7dffb0` | `#7dffb0` |

Fonts (google/fonts, OFL): **Anton** for headlines, captions, stamps and badges; **Geist** 300/700 for UI text inside panels, chats and the profile card; **VT323** only inside the flashback (OSD, terminal checklist, year counter). Icons: Lucide (ISC) through `rk.ensure_icons([...])`, for example `user-round, heart, check, x, database, workflow, layers, bot, message-circle, thumbs-up, equal-not, pointer, trophy, crown, flag`.

## Caption system

- Grouping: `rk.captions(words, voice_end, max_words=3, max_chars=17)` breaks on `. , ?`. It moves trailing function words to the next group and merges groups shorter than about 0.42 s (up to 26 characters) so nothing flashes by unread. Groups start 40 ms before the first word and end 100 ms after the last, never overlapping.
- Look: Anton 96 px (84 px when longer than 18 characters), uppercase, `letter-spacing:1px`, line-height 1.06, white, an 8 px `#050a14` stroke painted under the fill, a soft drop shadow and `text-wrap:balance`, centred in the 940×250 band.
- Behaviour: each group enters with scale 0.86→1 and y 16→0 over 0.12 s `back.out(2.5)`. Each word becomes active 20 ms before it is spoken and returns to white when the next word starts. Inactive words sit at 0.86 opacity.
- **Active-word contrast:**
  - *Text mode* (the Cinema default): gold `#f5c66b`, scale 1.08, keeping the dark stroke.
  - *Pill mode*: a `#ffd84d` pill, **pure black** text, and the stroke recoloured to the pill colour (`#ffd84d`), scale 1.06.

  Never put dark-blue text with a dark stroke on a gold pill. It reads muddy at phone size. Check the active word in enlarged crops of real frames.

```css
.caption{left:70px;top:1222px;width:940px;height:250px;z-index:30;display:flex;align-items:center;justify-content:center}
.cap{width:940px;text-align:center;font-family:Anton;font-size:96px;line-height:1.06;text-transform:uppercase;
  letter-spacing:1px;color:#fff;-webkit-text-stroke:8px #050a14;paint-order:stroke fill;
  text-shadow:0 6px 18px rgba(0,0,0,.6);opacity:0;visibility:hidden;text-wrap:balance}
.cap .w{display:inline-block;opacity:.86;transform-origin:50% 70%;margin:0 .06em}
.cap.long{font-size:84px}
.cap.pill .w{border-radius:.14em;padding:0 .1em}
```

```python
caps = rk.captions(words, voice_end)
js_caps = rk.captions_js(caps, mode="text")   # or mode="pill" → #ffd84d pill, #000 text, stroke = pill colour
# rk.page(..., caption_mode="text")          # the same switch when using the default skeleton
```

## Scene grammar

Read the whole assembled speech without graphics first. Then list the beats and give each one an object and a verb. Build a single timing plan from word times (`f = rk.finder(words)`; `k["turn"] = f("now", 20.0)`). Animation, captions and SFX all read from that one plan, so picture and sound cannot drift apart.

| Beat | Treatment | Example (a speaker explaining why backups matter) |
|---|---|---|
| Hook (0–1 s) | Thesis/question at y 300 in Anton, key word gold and pulsing 1.15→1 at 0.12 s; card `hero` | "YOUR FILES ARE SAFE?" with **SAFE?** in gold |
| Common belief | Social evidence stacks: 3–4 anonymous comment pills fly in alternately from left and right every 0.36 s (`back.out(2.2)`), with shake and a gold flash on the subject word | anonymous comments paraphrasing "the cloud handles it" |
| The real question | Freeze (grayscale, scratch, music silence), overlays thrown off screen, "?" sticker slaps on the card with a 1.2 punch-in | "which files, exactly?" |
| Diagnosis | Card goes `top`; a panel enters (y 120→0, scale 0.9→1, 0.4 s `expo.out`); its rows tick on the spoken words; a glitch and a big red X land on the negation | a checklist of "where your files live" gets crossed out |
| Era / thesis switch | The world changes: flashback grid, VHS OSD, graded camera, year counter stepping back, terminal checklist, stamps | "back in the day you kept one copy…": a stamp reads **LOST** |
| Turn | Fast-forward OSD, white flash at 1.0 peak, giant word (250 px, cyan glow) on the turn word, music drop, 1.14 punch | **NOW** |
| Payoff / build | Dashed slots fill left to right (`scaleX` 0→1, 0.22 s) one per spoken item, each with `power_up` at a rising pitch | 3-2-1 backup: COPY, OFFSITE, AUTOMATED |
| Upgrade | A badge pops and a second badge slams in (scale 2.2→1), with a gold aura behind the card, a border glow and speed lines | BACKUP **+ TEST** |
| Nuance / pressure | The card squashes (scaleX 1.06, scaleY 0.86, `elastic.out(1,.4)` back) with a red vignette, then a chat bubble exchange with typing dots and a reply | "when it breaks, ask someone": message sent, reply received |
| Final contrast | A ≠ B with badges and a Lucide `equal-not` icon slammed in at scale 3→1 | COPY ≠ BACKUP |
| CTA | See *CTA design* | |

Use a rig state change for every new panel. Go `top` about 0.2 s before the word that introduces the panel and back to `hero` 0.5–0.7 s before the next speaker-led beat. Panels exit 0.25–0.42 s before the next beat (`power3.in`, 0.22–0.3 s).

## Transitions and motion vocabulary

- **Rig move:** `rig("top", t)` and `rig("hero", t)`, 0.5 s `expo.inOut`. The aura layer moves with it.
- **Punch:** `punch(t, 1.12–1.2, hold 0.3–0.95)`. The attack lasts 0.13 s `power4.out` starting at t−0.04; the return lasts 0.42 s `power3.inOut`.
- **Shake:** `shake(t, amp)`, five 35 ms steps on `#world`. Use amplitude 10–16 for accents and 22–26 for stamps and the turn.
- **Flash:** `flash(t, peak, dur)` uses peak 0.12–0.35 for accents, 0.6 to enter the flashback and 1.0 with 0.38 s decay for the return.
- **Stamp:** `FT(sel,{opacity:0,scale:3.2},{opacity:1,scale:1,duration:.12,ease:'power4.in'},t-.1)` + `shake(t,26)` + `flash(t,.25,.15)`. Rotate stamps −12° and +7°. A second stamp dims the first to 0.35.
- **Glitch hit on a panel:** x −14 → +18 with `skewX(-8)` → 0 over 3 steps of 30–50 ms, plus `grayscale(.9)`.
- **Scanner sweep:** a 14 px cyan bar with a 30 px glow travels x 80→1000 in 0.9 s `sine.inOut`.
- **Year counter:** stepped years swap with `S()` (no tweening, like a tape counter). The final year slams in at scale 1.3→1 in 0.18 s `power4.out`.
- **World switch:** hard cuts with `S()` (opacity 0/1) hidden under a flash. Never crossfade two grids.
- **Throw-off:** overlays exit at ±1300 px x, −120 px y, ±25° over 0.35 s `power3.in`, staggered 30 ms.
- **Confetti** (`confetti(t,x,y)`) only on a "success" word, once or twice per video. **Speed lines** (`speedlines(t)`) on speed or productivity words.
- **Background:** the floor `backgroundPosition` scrolls continuously (`ease:'none'`), rewinds fast (−900 px in 1.3 s) during the flashback and accelerates on the fast-forward. Grain moves with `steps(D*15)`.
- **Determinism:** all randomness goes through `rnd()`, seeded by `K.seed`, and there is no `Math.random`, so re-renders are identical.

## Sound design

Every visual action has one sound and every sound has a visual cause. Gains below are the `gain_db` values passed to `rk.mix` (the kit adds +3 dB to normalised peaks and then applies `sfx_offset_db=-7`, so these are relative values).

| Action | Category | gain_db | Notes |
|---|---|---|---|
| Comment / notification pops in | `notify` | −11 / −13 | alternate variants |
| Hit on the subject word | `bass_impact` | −9 … −12 | 20 ms before the word |
| Freeze | `record_scratch` | −10 | ≈ 0.34 s before the question |
| Things fly / panel opens / rig move | `whoosh` | −12 … −17 | 0.2 s before the move |
| Item appears, sticker, badge | `pop` | −12 … −17 | `rate` 1.0 + 0.08·i for sequences |
| Scanner | `scan` | −14 | |
| Row tick / selection | `click` | −12 … −16 | |
| Panel glitch / era exit | `glitch` | −13 … −15 | |
| Rejection X | `error` | −18 … −21 | keep it subtle |
| Rewind into the flashback | `rewind` | −14 | in the gap **before** the speech resumes; trim to 0.62 s |
| Counter locks on a year | `tape_stop` or `camera_shutter` | −11 | |
| Terminal ticks | `keyboard` / `typewriter` | −19 | short (0.42 s); the last tick goes **after** a multi-word term |
| Before a stamp | `riser` | −15 … −18 | tail-trimmed so it ends on the hit |
| Stamp | `stamp` + `bass_impact` layer | −7 / −8 | the loudest SFX allowed; only in or right before gaps |
| Success / joins the team | `success` | −12 | |
| Return to the present | `fast_forward` → `glitch` → `bass_impact` | −11 / −14 / −6 | the impact lands on the drop |
| Slot fills | `power_up` | −17 | rate 1.0 + 0.06·i |
| Badge upgrade | `riser` → `level_up` | −17 / −11 | |
| Chat | `keyboard`, `message_sent`, `message_received`, `success` | −17 / −11 / −12 / −12 | |
| CTA | `whoosh`, `pop`, `pop`, `whoosh`, `click`, `level_up`, `bass_impact` | −12 / −12 / −14 / −15 / −9 / −12 / −14 | |

**Music direction.** Pick a beat-driven, serious bed that survives filtering.
- `music:369` Need for Speed (determined trap) is the reference choice. Its strong re-entry sits near 12 s in the source; confirm it with onset analysis because the catalog leaves `drop_s` unset.
- `music:293` Lord Knows (serious trap, `drop_s` 11).
- `music:686` Epical Drums 06 (trailer, `drop_s` 28) suits a more cinematic turn.

Section plan (times from the word plan):

```python
MUSIC = "<local file for music:369 from setup>"
music = [
  {"start": 0, "end": k["freeze"]-.30, "mode": "full", "gain_db": -2, "track": MUSIC, "src": 20.0},
  {"start": k["freeze"]-.30, "end": k["freeze"]+.25, "mode": "silence"},
  {"start": k["freeze"]+.25, "end": k["era"]-.25, "mode": "lowpass", "gain_db": -9, "track": MUSIC, "src": 23.0},
  {"start": k["era"]-.25, "end": k["turn"]-.62, "mode": "vhs", "gain_db": 0, "track": MUSIC, "src": 0.4},
  {"start": k["turn"]-.62, "end": k["turn"], "mode": "silence"},          # the fast-forward SFX lives here
  {"start": k["turn"], "end": D, "mode": "full", "gain_db": 0, "track": MUSIC,
   "src": DROP_S - 0.02, "fade_out": 1.2},                               # drop lands on the turn word
]
plan = {"duration": D, "voice_end": VE, "music": music, "sound_events": events,
        "music_ref": [k["turn"], VE], "cta_boost_db": 5}
rk.mix(work, plan, rk.sfx_library())
```

**Voice-first rules (non-negotiable):**
- `rk.prepare_voice(work)` starts from the raw recording: declip, high-pass at 85 Hz, adaptive denoise, −2.5 dB at 250 Hz, +2.5 dB at 3.2 kHz, de-esser, 3:1 compressor and limiter. Speed stays at 1×.
- Ducking uses about 120 ms look-ahead and about 650 ms hold, so the bed stays down for the whole phrase and never pumps up between words. Multiband ducking: the speech band (above 200 Hz) ducks 80 %, the bass only 55 %. SFX duck 85 %.
- Targets in 400 ms voiced windows: music ≈ −21 dB under the voice (median); total bed (music + SFX) ≤ −20 dB median and ≤ −12 dB at p95; fewer than 5 % of windows have the bed within 10 dB of the voice.
- Put loud hits (stamps, drop, risers) in speech gaps or just before the word. SFX that overlap words get lower gain.
- Music and SFX may rise only in gaps and in the CTA (`cta_boost_db` 5).
- Master with two-pass loudnorm to −14 LUFS and a true peak ≤ −1.5 dBTP, measured on the MP4 after AAC encoding.
- Run ASR on the final master and compare it with ASR of the clean voice. Any word that fails only in the mix is masked: move, shorten or lower the offending sound.

## CTA design inside the style

CTA lasts 4.5 s after `voice_end` (`C`). Use the brand handle from the brand config (`@{handle}`) and the brand logo from `assets/logo.png`.

- **C−0.2:** neq/badges exit. The camera card shrinks into the follow card position (`scale .18`, 0.32 s `expo.in`, fading out). Whoosh. At **C** a 0.35 flash.
- **C+0.1:** "AND YOU?" in gold Anton 150–170 px (scale 2→1, `back.out(2)`) at y about 300. **C+0.5:** the comment question in white Anton 88–92 px, balanced, built from the video's topic (e.g. "WHERE IS YOUR LAST BACKUP?"). **C+0.8:** Geist 42 px "Answer in the comments" with the Lucide `message-circle` icon.
- **C+1.0–1.4:** the profile card rises (y +260 → 0, 0.45 s `expo.out`) at x 100–980, y about 880–1400: round logo with a 6 px gold ring, Geist name, `@{handle}`, one-line description, and a 420×110 gold **Follow** button.
- **C+1.8:** a Lucide `pointer` finger flies in, then moves onto the button centre (0.3 s). **C+2.33:** the finger presses (scale 0.85), a ripple runs (0.3→3, 0.45 s) and the button squashes to 0.94. **C+2.41:** the button turns into an outline (`inset 0 0 0 4px` gold) and the label swaps to ✓ **Following**. Sounds: click (−9), then level_up (−12). The logo spins 360° over 0.6 s.
- **C+3.95:** a final pulse of the card (1.03) with a soft `bass_impact`. **D−0.25:** everything fades out.

## Implementation notes

Build with reelkit for everything shared: words, captions, assets, camera, rig, jump cuts, motion helpers and mix. Write custom HTML/CSS only for the scene objects and the flashback world. `rk.page(..., world_back=..., overlays=...)` accepts the extra layers; write a full page only when the layout departs from the card + world skeleton.

```python
import reelkit as rk
words = rk.load_words(work / "words-reviewed.json"); f = rk.finder(words)
rk.setup_assets(work); rk.ensure_icons(["user-round","check","x","equal-not","message-circle","pointer"])
cw, ch = rk.prepare_camera(work, width=960)
vhs = rk.styled_camera(work, "vhs",
  "gblur=sigma=1.1,rgbashift=rh=-4:bh=4,eq=contrast=1.08:saturation=1.35:gamma=1.04,"
  "colorbalance=rs=.08:bs=.06,noise=alls=14:allf=t")       # starting point; tune per source
k = {...}; k["rigStates"] = rk.rig_states(cw, ch); k["seed"] = 20261012
k["segments"] = rk.jump_segments(work, rk.track_faces(work), VE)
videos = [{"id":"cam-hd","start":0,"duration":VE,"track":0,"src":"camera-hd.mp4"},
          {"id":"cam-vhs","start":a,"media_start":a,"duration":b-a,"track":1,"src":vhs}]  # media_start == start keeps lip sync
```

Flashback layer (inside `world_back`, overlays above the panels):

```html
<div class="layer" id="bg-retro"></div><div id="sun"></div><div class="floor" id="floor-b"></div>
<div id="vhs"><div class="tint"></div><div class="lines"></div><div id="track"></div></div>
```
```css
#bg-retro{background:radial-gradient(ellipse 85% 60% at 50% 30%,#3a1236 0%,#1d0b22 50%,#0b0610 80%)}
#floor-b{opacity:0;background-image:linear-gradient(rgba(255,120,200,.30) 3px,transparent 3px),linear-gradient(90deg,rgba(255,170,90,.30) 3px,transparent 3px)}
#sun{position:absolute;left:290px;top:880px;width:500px;height:300px;border-radius:250px 250px 0 0;opacity:0;
  background:repeating-linear-gradient(180deg,#ffb35c 0 26px,#ff5fa2 26px 34px);-webkit-mask-image:linear-gradient(#000 40%,transparent)}
#vhs{position:absolute;inset:0;z-index:20;pointer-events:none;opacity:0}
#vhs .lines{position:absolute;inset:0;background:repeating-linear-gradient(0deg,rgba(0,0,0,.13) 0 2px,transparent 2px 5px)}
#vhs .tint{position:absolute;inset:0;background:radial-gradient(ellipse at 50% 40%,rgba(255,140,60,.08),rgba(120,0,90,.28));mix-blend-mode:screen}
#track{position:absolute;left:0;top:0;width:1080px;height:90px;mix-blend-mode:screen;
  background:linear-gradient(180deg,transparent,rgba(255,255,255,.10) 40%,rgba(255,255,255,.03) 60%,transparent)}
.year{font-family:VT;color:#ffd08a;text-shadow:5px 5px 0 #ff2e88,-3px -3px 0 #2ee6ff}
.panel{background:rgba(12,26,42,.95)}  /* opaque enough that the grid never shows through */
```
```js
const IN=K.era-.34, OUTT=K.turn-.02, RETRO=['#vhs','#bg-retro','#floor-b','#cam-scan','#osd'];
flash(IN,.6,.18); S(RETRO,{opacity:1},IN); S('#floor-a',{opacity:0},IN);
TO('#track',{y:1920,duration:.9,ease:'none',repeat:10},IN);
TO('.floor',{backgroundPosition:'0px -900px',duration:1.3,ease:'power2.inOut'},IN+.04);   // rewind
S('#osd-rew',{opacity:0},K.turn-.65); S('#osd-ff',{opacity:1},K.turn-.65);               // fast-forward
TO('.floor',{backgroundPosition:'0px 1700px',duration:.62,ease:'power2.in'},K.turn-.62);
flash(K.turn-.03,1,.38); S(RETRO,{opacity:0},OUTT); S('#floor-a',{opacity:1},OUTT);
FT('#bigword',{opacity:0,scale:1.8},{opacity:1,scale:1,duration:.22,ease:'power4.out'},OUTT);
shake(K.turn,22); punch(K.turn,1.14,.55);
// freeze before the question
TO(['#cam-zoom','.note'],{filter:'grayscale(1) contrast(1.15)',duration:.05},K.q-.36);
TO('#cam-zoom',{filter:'grayscale(0) contrast(1)',duration:.08},K.q-.02);
```

Render with HyperFrames (`--fps 30 --quality high`, strict mode). Then replace the audio with the kit master **without re-encoding the video** and let finalize apply the AAC true-peak guard.

## Pitfalls found in production

- **Glyphs:** Anton has no proper `≠`. It rendered as `=` and inverted the meaning. Use the Lucide `equal-not` icon, and check every meaningful symbol in an enlarged crop.
- **Grid through panels:** the perspective floor crossed a semi-transparent panel. Give panels ≥ 0.94 opacity backgrounds and a z-index above the floor.
- **CTA pointer missed the button:** place the finger target from the button's actual box and check a frame at the tap time.
- **Long-span loudness lies:** measured over whole sections, the music sat about 10 dB under the voice, yet in 400 ms voiced windows the bed was within 10 dB in about 44 % of them, and listeners heard a buried voice. Deeper ducking (120 ms look-ahead, 650 ms hold), music −5 dB and SFX −7 dB brought the median to −20.8 dB, p95 to −12.1 dB and the windows within 10 dB to 3.8 %. Always measure in short windows.
- **SFX masking words:** rewind, keyboard and power-up sounds swallowed specific words, and the ASR of the final master caught it. Shorten (trim heads), move them into gaps, and fire the tick for a multi-word term *after* the term.
- **Renderer audio:** the renderer's internal mix came out about 1.7 LU under the master. Always remux the kit master onto the rendered video.
- **Low-resolution webcam:** AI super-resolution changed the face, so it was rejected. Use Lanczos, a light unsharp and grain only.
- **ASR token merges:** a spoken pair of years separated by a comma arrived as one token. Derive sub-times (for example +0.55 s) and verify them against the waveform before hanging an animation on them.
- **Safe top:** the hook originally started at y 150 and moved below 270 px. Recheck the top margin in pixels on rendered frames.
- **Caption pill contrast:** dark-blue text with a dark stroke on a gold pill read poorly. The fix is a `#ffd84d` pill with pure black text and the stroke set to the pill colour, or text mode in gold.
- **Template fatigue:** a batch built on the same skeleton (gold card over a background, boxed panels, pill captions, PiP close, grid follow card) felt monotonous even with different metaphors. A different metaphor on the same skeleton does not count as variation.

## Variations

1. **Era switch (reference):** past vs. present with a VHS/synthwave flashback, tape counter, CRT terminal and stamps, then a fast-forward back to a clean navy present. Use it for "it used to be like this, now it's like this".
2. **Test-drive lab:** no era switch. The world is a workbench: a leaderboard whose crown falls, a compass and route map for "where to start", three cards running the same task with progress bars, a gear shift on a "shift gears" phrase (the knob snaps on the word, with drop and speed lines), a balance tipping between "global opinion" and "your test", and a bell curve with a "starting point" flag. The music uses `radio` mode for the middle section and drops on the gear shift. The CTA becomes a ranking row with the brand at #1 and the Follow button.
3. **Case file / investigation:** a cold desaturated-teal grade instead of navy, evidence cards pinned with string lines, a magnifier scan, redaction bars lifting on key words, `music:597` Vertigo in `muffled` mode until the reveal and `camera_shutter`/`stamp` for evidence. The flash on the reveal is cold white with no confetti.
4. **Inventory / RPG build:** for skill or stack talks, the slots become a character sheet with XP bars, rarity colours on the slots and a level-up on the conclusion. Use `music:82` Keeping Fit sparingly or a trap bed, plus `game_coin` and `level_up`. Keep the captions in text mode and switch the gold accent to the rarity colour of each slot.

When producing several clips, change at least the camera framing, layout, caption treatment, palette and grade, transition type, music and CTA design between them. Cinema sets the technical bar, not the look of every clip.
