---
style: game
name: Game (retro RPG)
family: fixed-style
best_for: explainers about a process, a tool or a habit that can be told as quests, items, level-ups and combos
reference: produced by PycodeBR (Felipe Azambuja), October 2026
---
# Game (retro RPG)

The whole Reel is the screen of a 16-bit role-playing game. The speaker is the player character, shown in a
"character window" whose webcam image is deliberately pixelated; the tool or idea they talk about is a companion
sprite with its own status bar; a recurring chore is a daily quest that loops; learning something is a
**NEW SKILL UNLOCKED / LEVEL UP** pop-up; saving it is an item going into an inventory grid; using several things
together is a fighting-game **COMBO**; the ending is an arcade **CONTINUE?** screen with a **PLAYER II** follow
card. The viewer should feel they are watching someone play through the explanation: every spoken key word moves
a bar, opens a window, fills a slot or lands a hit. All motion is stepped (`steps()` eases), never smooth.

## When to use / when not to

Use it when the speech has a progression the viewer can "play": a problem that repeats, something gained
(a skill, a rule, a tool), a decision, a stored result reused later, an enumeration of ingredients that combine.
Good topics: automations, learning a workflow, building a habit, tool comparisons, "first time vs second time".

Avoid it for grief, health scares, layoffs, legal or financial losses, or any speech where gamifying would read as
mocking. Avoid it when the speaker is sarcastic about games, or when the cut has no progression at all (a single
opinion with no steps) — the HUD would be decoration without meaning. Do not use it twice in a row in a batch.

## Signature moves

- **Character window:** the webcam in a stepped white/royal-blue pixel frame with square notches at the corners,
  real source pixels enlarged with nearest-neighbour, light scanlines. Never full screen, never covered by text.
- **Party HUD:** two windows at the top (player: HP + XP; companion: MP + one skill slot) whose bars fill on the
  words that justify them.
- **Dialog-box captions:** RPG text box with a speaker nameplate; words type in on their onset; the active word is
  pure black on a yellow block; a blinking ▼ waits at the end of a page during pauses; a soft beep per page.
- **Achievement pop-up:** "NEW SKILL UNLOCKED!" with an item sprite, "LEVEL UP!" on the companion panel, yellow
  flash and 8-bit screen shake.
- **Choice window:** "DO IT? ▶ YES / NO", cursor blinking, YES confirmed on the spoken "yes" (or equivalent).
- **Inventory grid:** 6×2 slots; the item flies into a slot, a padlock lands on "permanent/forever", a SAVE bar fills
  in steps, "SAVED!" with a green check. In a second act a pointing hand scans the slots and finds it.
- **Combo counter:** enumerated words enter as chips with a hit pip and shake each, then fuse into a RESULT chip.
- **Block wipe + phase banner:** a checkerboard of 90 px blocks closes and opens diagonally, swapping the pixel-art
  world *behind* the camera, followed by "PHASE I · DAILY QUEST" / "PHASE II · NEW QUEST".
- **CONTINUE? / PLAYER II** CTA with a countdown made of blocks and a pixel hand pressing Follow.

## Frame and layout

Canvas 1080×1920, 30 fps. Coordinates are top-left of the stage.

| Element | Position / size | Notes |
|---|---|---|
| Sky darkening | y 0–250 | gradient `rgba(11,11,35,.6)` → 0 at 310 px so stars/clouds never read as content above the safe line |
| Hook title (title screen only) | y 304–460, centred | Press Start 2P 40 px line + 80 px key word |
| HUD player window | x 44–504, y 300–432 | name 26 px, HP/XP bars 330×24 |
| HUD companion window | x 560–1030, y 300–432 | sprite ×4, name, MP bar 190×24, 84 px skill slot (hidden until earned) |
| Character window, HERO | x 160, y 462, 800×596 at scale .95 → 760×566, ends y≈1028 | default state |
| Character window, MENU | x 64, y 462, scale .5 → 400×298 portrait | when a centre window needs the space |
| Companion side panel (MENU) | x 524–1000, y 462–760 | sprite ×9, status word ("LEVEL UP!", "SAVING", "EQUIPPED") |
| Centre window (pop-up / inventory) | x 50–1000, y 792–1192 | 950×400, padding 26/36 |
| Action strip (HERO) | x 50–960, y 1064–1200 | 910×136: phase banners, quest card, choice, combo |
| Dialog nameplate | x 74, y 1212, h 56 | "SPEAKER · role" |
| Dialog box (captions) | x 50–990, y 1250–1550 | caption text x 90–960, y 1280–1530 |
| CTA | see CTA section | |

Safe zones: nothing critical above y 270 (`rk.SAFE_TOP`) — measure the *outer* edge of stepped borders and hard
shadows, which extend 12–18 px beyond the declared box. Nothing critical below y 1570 or right of x 960 between
y 1000 and 1700 (the dialog box border may reach 990; its text may not). The camera is kept at 760 px wide on
purpose: at 880 px the strip, nameplate and dialog box collide.

Camera treatment: pixelate a copy of the camera and play it with `image-rendering:pixelated`.

```python
rk.styled_camera(work, "pixel",
    "scale=320:-2:flags=area,scale=960:-2:flags=neighbor,eq=saturation=1.2:contrast=1.06")
# -> assets/camera-pixel.mp4 ; for a 1080p source keep the 320 px step: blocks of 3 px read as "16-bit"
```

Pause cuts: `K.segments` alternate zoom **1.00 ↔ 1.06** centred on the tracked face, set with `tl.set` (a hard
cut, no tween). No slow breathing in this style — the world is stepped; idle life comes from sprite bobs and
background pans instead.

## Palette and typography

16-colour, SNES/PICO-like palette (single letters are used in sprite strings):

| Key | Hex | Role |
|---|---|---|
| K | `#0b0b23` | night, outlines, hard shadows |
| U | `#1d2b53` | navy, wipe blocks, dungeon walls |
| B | `#2038ec` | royal blue, camera frame ring |
| L | `#4f8bff` | blue, slot borders |
| C | `#7ee7ff` | cyan, MP, lit slots (never for small text on blue) |
| W | `#ffffff` | text, window borders |
| S | `#c2c3c7` | silver, controller and padlock sprites |
| M | `#5f574f` | grey, inactive slots |
| R | `#ff004d` | red, stamps, title shadows |
| P | `#ff77a8` | pink |
| O | `#ffa300` | orange, XP stripes |
| Y | `#ffd84d` | yellow, active word, headings, Follow button |
| G | `#00e436` | green, HP, success, "Following" check |
| D | `#008751` | dark green, bar stripes |
| V | `#7e2553` | purple, dusk sky, spellbook |
| N | `#ab5236` | brown, paths, shelves |

Window fill: `linear-gradient(180deg,#2a44ff 0%,#1d34d8 45%,#1424a8 100%)`.

Fonts (google/fonts, OFL): **Press Start 2P** (`ofl/pressstart2p/PressStart2P-Regular.ttf`) for titles, HUD,
pop-ups, buttons, CTA; **VT323** (`ofl/vt323/VT323-Regular.ttf`) for dialog text and descriptions. No other
families. Press Start 2P is roughly 1 em per glyph: at 26 px a 24-character label is ~620 px — keep strip labels
≤ 28 characters at 22–30 px and check overflow in the browser. Headings get stacked hard shadows
(`text-shadow:6px 6px 0 #ff004d,12px 12px 0 #0b0b23`), never blur.

## Caption system

A persistent RPG dialog box replaces the usual caption band.

- Paging: `caps = rk.captions(words, voice_end, max_words=6, max_chars=28)`; each page stays until the next one
  starts if the gap is < 1.4 s, otherwise until last word end + 0.9 s. Never overlap pages; the plan's
  `captions` must equal the pages shown. Avoid 1-word pages (they look broken in a dialog box) — merge them.
- Text: VT323 112 px, uppercase, line-height 100 px, max 2 lines in 870 px (cap height ≈ 63 px).
- Reveal: each word goes from `opacity:0` to 1 at `onset − 0.02 s` and stays (typewriter, no reflow because
  hidden words already occupy their space).
- Active word: **#000000 on a #ffd84d block** (≈ 15:1), no stroke. Spoken words: white on the blue gradient
  (≈ 8:1 at the lightest point). Check both in enlarged crops of at least three frames, including accented words.
- ▼ blinks (0.24 s period) at the bottom-right of the page from last word end + 0.15 s while the page holds.
- One `retro_computer_beep` per page at −30 dB, 0.09 s, rate 1.25.

```css
#dlg{position:absolute;left:50px;top:1250px;width:940px;height:300px;z-index:30}
#dlg-name{position:absolute;left:74px;top:1212px;height:56px;padding:0 20px;z-index:31;display:flex;align-items:center;gap:16px}
#dlg-name b{font:400 24px PS2P;color:#ffd84d}#dlg-name span{font:40px VT;color:#fff}
.cap{left:90px;top:1280px;width:870px;height:250px;z-index:32;font:112px/118px VT;text-transform:uppercase;color:#fff}
.w{display:inline-block;opacity:0;color:#fff;padding:12px 8px 0;line-height:100px;margin:0 -2px}
.more{position:absolute;right:6px;bottom:2px;opacity:0}
```

```python
def dialog_js(caps):
    on = '{opacity:1,color:"#000000",backgroundColor:"#ffd84d"}'
    off = '{color:"#ffffff",backgroundColor:"rgba(255,216,77,0)"}'
    js = []
    for c in caps:
        ws = c["words"]
        for j, w in enumerate(ws):
            t = max(c["start"], w["start"] - 0.02)
            js.append(f'tl.set("#{c["id"]}-w{j}",{on},{t:.4f});')
            nxt = ws[j+1]["start"] - 0.02 if j + 1 < len(ws) else min(c["end"] - 0.01, w["end"] + 0.12)
            if nxt > t:
                js.append(f'tl.set("#{c["id"]}-w{j}",{off},{nxt:.4f});')
        t0, i = ws[-1]["end"] + 0.15, 0
        while t0 + i * 0.24 < c["end"] - 0.05 and i < 12:
            js.append(f'tl.set("#{c["id"]}-m",{{opacity:{1 - i % 2}}},{t0 + i * 0.24:.4f});'); i += 1
    return "".join(js)
```

Each page is `<div id="cap-N" class="clip cap" data-start data-duration data-track-index="50">` holding the
`.w` spans and a `.more` ▼ sprite. Hide the box and nameplate during the CTA.

## Scene grammar

Map the speech beats to game screens; every element is triggered on the word that names it (`rk.finder`).

| Beat | Game screen | Generic example |
|---|---|---|
| Hook (0–3 s) | **Title screen** at night: the strongest line as a 2-line title, key word 80 px yellow; companion sprite hops in with its label in the strip; item sprite appears on the key noun | "a speaker explaining why backups matter": title "IT SAVES ITSELF!", a floppy-like original sprite pops on "backup" |
| Context / problem | Block wipe → day world; HUD drops in; **PHASE I · DAILY QUEST**; a quest card exits left and comes back from the right 2–3 times with "AGAIN!" and a day-sun pip per loop | the same chore repeated every week |
| Stamp of truth | Red rotated stamp ("TRUE STORY", "REAL CASE") on the matching word | |
| Explanation | Strip slots light up per concept (inactive grey border → cyan), MP bar fills; "!" alert over the companion + camera punch on a surprise word | "it reads the context", "it remembers" |
| Turn | Camera to MENU; **NEW SKILL UNLOCKED!** pop-up with the item and a 2-line definition in VT323; **LEVEL UP!** on the side panel; XP fills and blinks; flash + shake | the moment the tool learns the procedure |
| Decision | Choice window "CREATE IT? ▶ YES / NO", thinking dots before, YES highlighted on the spoken yes | |
| Process | Crafting: three small items converge and become one bigger item with sparkles | several requests become one rule |
| Storage | Dungeon/library world; inventory window; item flies into a slot; padlock on "permanent"; SAVE bar in 10 steps; "SAVED!"; the HUD skill slot appears only now | |
| Second act | Wipe → dusk world; **PHASE II · NEW QUEST**; same quest card + "SIMILAR" stamp | the chore comes back |
| Payoff | Inventory again: pointing hand scans slots with ticks, finds the item ("READY!"), item flies to the companion ("EQUIPPED"), prompt "FOUND? ▶ YES" | |
| Enumeration | **COMBO**: one chip per listed thing with a hit, pips fill, then fuse into a green **RESULT** chip, "▶ ANSWER" | "the rule + the files + the history" |
| Final blow | One huge stepped title ("USING THE SKILL!") with shake, yellow flash, punch | |
| CTA | CONTINUE? / PLAYER II (4.5 s, no speech) | |

Write on-screen labels from the speech's own words, short and uppercase. Name tools and characters only as the
speaker names them, and draw original sprites — never a product logo or a known game character.

## Transitions and motion vocabulary

Everything steps. Use these helpers (named to avoid clashing with the kit's smooth `pop/shake/flash/punch`):

```js
const E={immediateRender:false};
const S=(s,v,t)=>tl.set(s,v,t), TO=(s,v,t)=>tl.to(s,v,t), FT=(s,a,b,t)=>tl.fromTo(s,a,Object.assign({},E,b),t);
function winOn(sel,t,d){FT(sel,{opacity:0,scaleY:.1},{opacity:1,scaleY:1,duration:d||.16,ease:'steps(4)'},t);}
function pxPop(sel,t,s){FT(sel,{opacity:0,scale:s||1.8},{opacity:1,scale:1,duration:.15,ease:'steps(3)'},t);}
function pxOff(sel,t){TO(sel,{opacity:0,duration:.1,ease:'steps(2)'},t);}
function blink(sel,t,n,p){p=p||.2;for(let i=0;i<n;i++)S(sel,{opacity:i%2?1:0},t+i*p);S(sel,{opacity:1},t+n*p);}
function pxShake(t,a){[[a,0],[-a,a*.6],[a*.6,-a],[-a*.5,a*.5],[a*.3,0],[0,0]].forEach((p,i)=>S('#world',{x:p[0],y:p[1]},t+i*.04));}
function pxFlash(t,c,o){S('#flash',{backgroundColor:c||'#fff'},t-.001);FT('#flash',{opacity:o||.5},{opacity:0,duration:.2,ease:'steps(4)'},t);}
function pxPunch(t,s,h){TO('#cam-zoom',{scale:s,duration:.08,ease:'steps(2)'},t);TO('#cam-zoom',{scale:1,duration:.2,ease:'steps(3)'},t+h);}
function pxRig(st,t){TO('#rig',Object.assign({duration:.3,ease:'steps(5)'},K.rigStates[st]),t);}
function wipe(t,to){ // 12x22 blocks of 90 px, z-index below #rig so the face is never covered
  FT('.px',{scale:0},{scale:1,duration:.05,ease:'steps(2)',stagger:{grid:[22,12],from:'start',amount:.28}},t-.36);
  S('.bg',{opacity:0},t);S(to,{opacity:1},t);
  TO('.px',{scale:0,duration:.05,ease:'steps(2)',stagger:{grid:[22,12],from:'end',amount:.28}},t+.03);}
function pan(sel,t,d){FT(sel,{x:0},{x:-200,duration:d,ease:'steps('+Math.max(4,Math.round(d*3))+')'},t);}
```

Vocabulary and values:
- Window open `winOn` 0.16 s `steps(4)` (0.18 s for the big pop-up); close `pxOff` 0.1 s.
- Item/stamp/chip arrival `pxPop` from 1.7–2.4 to 1, 0.15 s; stamps rotated −6° / +5°.
- Shake amplitude: 6–8 px for hits, 12 px for a negation word, 14 px for LEVEL UP and the final blow.
- Flash: yellow `#ffd84d` .40–.45 for rewards, white .25–.30 for crafting/result, green `#00e436` .16 for "yes".
- Punch 1.07–1.09, hold .25–.40 s on surprise words and the final blow.
- Camera HERO ↔ MENU in 0.3 s `steps(5)`, started 0.2–0.3 s before the triggering word.
- Wipe pre-rolls 0.36 s, swaps the background at the cut, reopens from the opposite corner.
- Phase banner appears 0.04 s after the wipe and leaves after ~1.0 s.
- Idle life during holds > 1.5 s: sprite bob `y:-14, duration:.12, steps(2), yoyo, repeat 3–5`, blinking ▼ or
  cursor, star sparkles, background pan of 200 px over the scene in ~3 steps per second.
- Quest loop: card out `x:-80` 0.1 s, back from `x:90` 0.14 s `steps(3)`, "AGAIN!" for 0.4 s, sun pip per loop.

## Sound design

Voice first. SFX are short and pitched like a game; music goes through the kit's `retro` (8-bit bitcrusher) mode
for explanation and opens to `full` on rewards.

| Action | Category | gain_db | length / rate |
|---|---|---|---|
| Title screen boot, companion enters | power_up | −14 / −18 | .7 / .5 s, rate 1.2 for the companion |
| Item appears on key noun | game_coin | −16 | .5 |
| Block wipe | glitch (variant 0/1) | −20 (−16 before CTA) | .35, at wipe − .36 |
| Phase banner, choice window | retro_computer_beep | −18 | .1 |
| Stamp | stamp | −15 / −17 | .4 |
| Quest card loops back | pop | −18 | .3, rate 1.0 → 1.24 per loop |
| "Without command" / wrong path | wrong_buzzer | −22 | .35 |
| Slot lights up | data_beep | −20 | .25, second one rate 1.25 |
| "!" alert | alarm_short | −18 | .35 |
| NEW SKILL / LEVEL UP | level_up + bass_impact | −10 / −18 | 1.3 / .5 |
| Camera back to HERO, inventory opens | swipe | −22 | .35 |
| YES confirmed | success | −14 | .6 |
| Crafting / item forged | magic_transition / magic_sparkle | −20 / −16 | .9 / .8 |
| Item into slot, book opens | page_turn | −16 / −18 | .45 |
| Padlock | lock_click | −16 | .3 |
| SAVE bar / RESULT fused | progress_complete | −22 / −16 | 1.0 / .9 |
| SAVED / found / comments | success_chime | −14 / −18 | .8 / .6 |
| Cursor scanning slots | click | −18 | .2 each |
| Item equipped | power_up | −16 | .6, rate 1.1 |
| Combo hits | bass_impact | −19 → −16 | .3, rate +.06 per hit, alternate variants |
| Answer delivered | message_sent | −18 | .5 |
| Final blow | level_up | −14 | .7, rate 1.12 |
| CONTINUE? / countdown | magic_transition / retro_computer_beep | −14 / −24 | .9 / .08 every other block |
| Follow pressed / Following | mouse_click / game_coin | −10 / −12 | .25 / .7 |
| Dialog page | retro_computer_beep | −30 | .09, rate 1.25 |

Music: `music:82` (Keeping Fit, chiptune — first choice); `music:167` (Brainiac, futuristic electronic, for
sci-fi/tech worlds); `music:597` (Vertigo, stealthy, for a dungeon/security variation). Pick the drop by ear or
by energy analysis — the catalog's `drop_s` may only mark the end of the intro (the reference used 15.0 s).

Section plan (times from your keys; short silences sit right before rewards so the reward lands on a cut-in):

```python
music = [
  {"start": 0, "end": k["phase1"], "mode": "full", "gain_db": -2, "track": T, "src": 3.0, "fade_in": .02},
  {"start": k["phase1"], "end": k["unlock"] - .32, "mode": "retro", "gain_db": -6, "track": T, "src": 6.25, "fade_in": .2},
  {"start": k["unlock"] - .32, "end": k["unlock"] - .04, "mode": "silence"},
  {"start": k["unlock"] - .04, "end": k["choice"] - .26, "mode": "full", "gain_db": -3, "track": T, "src": drop_s, "fade_in": .02},
  {"start": k["choice"] - .26, "end": k["save"] - .3, "mode": "retro", "gain_db": -6, "track": T, "src": 30.0, "fade_in": .25},
  {"start": k["save"] - .3, "end": k["save"] - .06, "mode": "silence"},
  {"start": k["save"] - .06, "end": k["phase2"], "mode": "full", "gain_db": -4, "track": T, "src": 40.0, "fade_in": .02},
  {"start": k["phase2"], "end": k["found"] - .24, "mode": "lowpass", "gain_db": -6, "track": T, "src": 60.0, "fade_in": .25},
  {"start": k["found"] - .24, "end": k["found"] - .02, "mode": "silence"},
  {"start": k["found"] - .02, "end": duration, "mode": "full", "gain_db": -3, "track": T, "src": 66.0, "fade_in": .02, "fade_out": .9},
]
plan.update({"music": music, "music_ref": [0.0, voice_end], "cta_boost_db": 5})
rk.mix(work, plan, rk.sfx_library())
```

Silences are 0.22–0.28 s. Keep the shared targets (music ≈ 21.5 dB under voice median, background p95 ≥ 12 dB
under voice, −14 LUFS, true peak ≤ −1.5 dBTP after AAC).

## CTA design inside the style

4.5 s after the last spoken word, no speech. Wipe to the night world; hide HUD, character window, dialog box.

- `C+0.06`: **CONTINUE?** (Press Start 2P 80 px, yellow with red + navy hard shadows) at y 318, centred; blinks
  every 0.6 s.
- `C+0.5`: countdown of 10 green blocks (x 240–840, y 436, h 36) dimming to .12 one every 0.38 s.
- `C+0.16`: dialog window x 50–1000, y 540–850 with nameplate = brand name; the comment question types word by
  word every 0.1 s in VT323 86 px uppercase (e.g. "WHICH TASK DO YOU REPEAT EVERY WEEK?").
- `C+1.0`: **PLAYER II** window x 140–940, y 910–1290: cyan heading, `assets/logo.png` 118 px + `@handle` 42 px,
  Follow button 470×92 yellow with black uppercase text.
- `C+1.8`: pixel hand (sprite ×8) slides in from bottom-right in 0.3 s `steps(5)`; `C+2.26` hand dips;
  `C+2.28` button scales .94; `C+2.36` button turns `#0b0b23`, "Follow" hides, green check + "Following" shows,
  white flash .2; `C+2.6` "COMMENT BELOW" in VT323 64 px at y 1340; hand leaves at `C+2.9`.

Use the brand handle from the user's setup (the reference used the creator's own handle and logo).

## Implementation notes

Build a custom page rather than `rk.page`: the style owns the world, HUD and dialog box. Still use the kit for
words, captions paging, assets, camera, face tracking, jump segments and mix.

```python
rk.setup_assets(work)                      # GSAP, fonts, logo.png; add PressStart2P-Regular.ttf + OFL.txt if missing
rk.styled_camera(work, "pixel", VF)        # see Frame and layout
words = rk.load_words(work / "words.json"); f = rk.finder(words)
k = {"phase1": f("example"), "unlock": f("skill", 18.0), ...}   # every trigger is a spoken word
k["rigStates"] = {"hero": {"x": 160, "y": 462, "scale": .95}, "menu": {"x": 64, "y": 462, "scale": .5}}
k["segments"] = rk.jump_segments(work, rk.track_faces(work), voice_end)
```

Sprites are ASCII grids over the palette letters, rendered as crisp SVG (merge horizontal runs):

```python
def spr(rows, px, ident=""):
    h, w = len(rows), max(map(len, rows)); rects = []
    for y, row in enumerate(rows):
        x = 0
        while x < len(row):
            ch = row[x]
            if ch == ".": x += 1; continue
            n = 1
            while x + n < len(row) and row[x + n] == ch: n += 1
            rects.append(f'<rect x="{x}" y="{y}" width="{n}" height="1" fill="{PAL[ch]}"/>'); x += n
    return (f'<svg id="{ident}" class="spr" width="{w*px}" height="{h*px}" viewBox="0 0 {w} {h}" '
            f'shape-rendering="crispEdges">{"".join(rects)}</svg>')
```

Typical sprite set (12–16 px grids, drawn for the topic): companion, scroll/item, controller, ✕, "!" bubble,
thinking dots, map, crystal, book, pointing hand, sun, star, check, padlock, ▼, ▶ cursor. Use integer `px`
(3–9) so edges stay sharp.

Worlds: draw at 160×240 with Pillow (sky bands with 4-row checker dithering between colours, ridges from a seeded
`random.Random(seed)`, stars, clouds, trees, a moon/sun), then `resize((1280, 1920), Image.NEAREST)`; show as
`<img class="bg">` 1280 px wide with `image-rendering:pixelated` so the 200 px pan never shows an edge. Suggested
set: night (title/CTA), day village (phase I), library/dungeon (inventory), dusk castle (phase II). Fixed seeds
per world; JS uses only the seeded `rnd()`, never `Math.random()`.

Window chrome (stepped border, no radius):

```css
.win{background:linear-gradient(180deg,#2a44ff 0%,#1d34d8 45%,#1424a8 100%);border:6px solid #fff;
  box-shadow:0 0 0 6px #0b0b23,inset 0 0 0 4px #0b0b23,10px 10px 0 6px rgba(11,11,35,.55)}
#camframe{position:absolute;inset:-12px;border:6px solid #fff;pointer-events:none;
  box-shadow:0 0 0 6px #2038ec,0 0 0 12px #0b0b23,inset 0 0 0 6px #0b0b23,14px 14px 0 12px rgba(11,11,35,.5)}
.notch{position:absolute;width:18px;height:18px;background:#0b0b23} /* one per corner at -18px */
#cam{image-rendering:pixelated;object-fit:cover}
#cam-scan{position:absolute;inset:0;background:repeating-linear-gradient(0deg,rgba(0,0,0,.16) 0 2px,transparent 2px 5px)}
#scan{position:absolute;inset:0;z-index:50;background:repeating-linear-gradient(0deg,rgba(0,0,0,.06) 0 2px,transparent 2px 4px)}
```

Bars: `transform-origin:0 50%` and animate `scaleX` with `steps(n)`; striped fills
`repeating-linear-gradient(90deg,#00e436 0 18px,#008751 18px 22px)` (HP), yellow/orange (XP), cyan/blue (MP).
Layer order: backgrounds → wipe blocks (z 12) → character window (z 15) → strips/windows (z 18) → HUD/hook (z 20)
→ dialog (z 30–32) → CTA (z 40) → scanlines (z 50) → flash (z 55). Shake `#world`, never the stage.

## Pitfalls found in production

- A plain checkerboard ground looked like a missing-texture placeholder; give every world a horizon, a path or
  shelves and dithered sky bands. A flat dusk sky also read as unfinished — add cloud streaks.
- At 880 px the camera crushed the strip, nameplate and dialog box; 760 px fixed it.
- An empty "?" HUD slot from the first frame confused the story; reveal the slot only when the item is earned.
- Blinking YES with `opacity` made the answer invisible on half the frames; blink the cursor or the highlight
  colour, not the word.
- The scanning hand pointed at the wrong slot when positions were guessed; compute slot coordinates in Python
  from the same grid numbers as the CSS (columns, cell size, gap, padding, border) and pass them in `K`.
- When the item "loads" from the inventory, keep a copy in the slot; making it vanish implies it was consumed.
- Cyan labels on the blue window were low contrast; small text on blue is white or yellow only.
- 3-word pages produced 1-word dialog pages; 6 words / 28 characters gave 2-line pages throughout.
- A bright row at y 268 came from a window's outer border/shadow; place windows by their outer edge.
- The freeze detector flags held menus; that is expected for stepped UI, but keep idle motion in long holds.
- One beep per page adds up (dozens per minute); keep −30 dB under ducking and drop them if they clutter speech.
- `hyperframes check` can time out on software rendering; then measure caption lines, text overflow and top
  margin in a headless browser and review frames by vision before rendering.
- Redefining `pop`/`shake` with the same names as the kit's BASE_JS silently replaces them (function hoisting);
  use distinct names as above.

## Variations

- **Dungeon crawl** (security, risks, mistakes to avoid): library/dungeon world for most of the cut, torches,
  "TRAP DETECTED!" stamps, HP drains on each risk and refills on each fix, `music:597` in `lowpass`.
- **Boss fight** (beating a hard problem): an original enemy sprite with its own HP bar at the top; each argument
  is an attack chip that takes a step off the bar; final blow on the conclusion; `music:677` or `music:1117`.
- **Side-scroller stages** (a journey in steps): STAGE I/II/III banners, a coin counter that ticks with
  `game_coin` per tip, a goal flag of your own design at the end; parallax pan sped up to 6 steps/s.
- **Item shop** (comparing tools or options): merchant window with item cards, stat bars (speed, cost, effort) that
  fill on the spoken words, "BUY? ▶ YES / NO" decision; `music:82` in `retro` throughout, full on the purchase.
