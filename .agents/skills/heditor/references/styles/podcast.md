---
style: podcast
name: Podcast (talk show with karaoke captions)
family: fixed-style
best_for: opinion, advice and soft-skill clips where one speaker talks straight to camera and the speech has 2–4 listable points
reference: produced by PycodeBR (Felipe Azambuja), October 2026
---
# Podcast (talk show with karaoke captions)

The whole Reel is staged as one episode of a pop studio show. The speaker is the host, the clip is "the episode", and the edit is the show's graphics package: a glowing ON AIR sign, a drawn podcast microphone next to the camera, a headline slot at the top, segment bumpers that repaint the set, a guest card, an APPLAUSE sign and a "next episode" closer. Below the camera, a big waveform moves with the speaker's real voice. Under it, giant karaoke captions light up word by word. The feeling is a late-night set crossed with a videocast studio and a pop magazine layout: warm solid colours, hard offset shadows, halftone dots, tilted cut-out cards. The core metaphor: **talking is the show**. When the speech describes failing to communicate, the mic switches off and the wave goes flat. When it describes communicating well, the wave comes back full and the crowd claps.

## When to use / when not to

Use it when:
- the speech is about talking, explaining, selling, negotiating, teaching, presenting or any "people skill";
- the clip has a clear problem → turn → 2–4 points → payoff shape that maps onto show segments;
- the speaker is a single person looking at the camera with a stable, reasonably lit background (shelves, wall, studio).

Avoid it when:
- the clip is a screen recording, a code walkthrough or a data-heavy explanation (graphics would fight the screen);
- the tone is grief, a serious incident, health or anything where applause and pop colours feel flippant;
- the camera source is very low resolution (< 320 px of useful width) and would need to fill the whole canvas;
- there are no pauses at all: applause and stings need breaths in the speech.

## Signature moves

1. **Tilted camera print**: the webcam sits in a hard-edged rectangle rotated −3°, with an 8 px black border and a 26 px offset plum shadow. No rounded corners and no glow.
2. **ON AIR sign** that flickers on at 0 s. It goes dark when the speech names the failure, relights at the payoff, and becomes **APPLAUSE** after the last word.
3. **Real-voice waveform**: 30 bars driven by low/mid/high band energy of the actual voice track, precomputed per frame in Python. It goes flat ("mic off") on the problem word and turns colourful at the payoff.
4. **Drawn podcast mic** (SVG) at the left edge of the camera, with an LED that turns red and a red slash when the "mic is off".
5. **Giant karaoke**: Bebas Neue at 136 px. Each word pops in on its attack, and the active word is black on a light colour block. The block colour rotates yellow → cyan → pink per phrase.
6. **Segment bumpers**: a stripe wipe plus a full background repaint (coral → purple → magenta → amber). Each segment card in the top slot reads `SEGMENT · <TOPIC>` with progress dots ●○○ / ●●○ / ●●●.
7. **Magazine cut-out turn**: on the "it's not about X" line, the music stops under a record scratch. The camera shrinks to a pasted photo and a torn-paper collage appears, with ransom-note letters crossed out by a red pen and a handwritten note.
8. **Guest two-shot**: the camera slides left and a `GUEST · <ROLE>` card enters on the right for the beat about the other person (client, user, boss, audience).
9. **"Next episode" CTA**: a poll card with two answer buttons and a show plaque. The plaque holds the brand logo, the handle and a red REC-style **Follow → Following** button.

## Frame and layout

Canvas 1080×1920, 30 fps. All y values are absolute canvas pixels.

| Zone | Box (x, y, w × h) | Content |
|---|---|---|
| Ceiling band | 0, 0, 1080 × 330 | dark plum gradient, **above every full-bleed layer** (see Pitfalls) |
| ON AIR sign | 60, 318, 250 × 104, rot −2° | sign / APPLAUSE |
| Headline slot | 340, 318, 680 × 150 | hook card, headline, segment cards, payoff stamp |
| Camera card (`main`) | 160, 470, 760 × 565, rot −3° | webcam, `object-fit:cover` |
| Sticker shelf | x 600–1000, y 515–900 | stickers over the background shelves, right of the face |
| Mic | 30, 782, 240 × 440 | SVG mic overlapping the card's lower-left corner |
| Waveform | 272, 1062, 726 × 160 | 30 bars, 15 px wide |
| Captions | 80, 1236, 880 × 312 | karaoke, max 2 lines |
| Free | y > 1570, x > 960 for y 1000–1700 | nothing critical (platform UI) |

- Keep the face in the **left half** of the card (source framing around x 0.23–0.50, y 0.24–0.85). Stickers then sit on the right half without touching eyes, nose, mouth or forehead. If your speaker is centred, shift the card left by 60–80 px or crop with `object-position`.
- Camera states (GSAP transforms on `#cam`, origin at the card centre):
  - `main {x:0, y:0, scale:1, rotation:-3}`
  - `aside {x:-262, y:-135, scale:.56, rotation:-6}` (pasted photo)
  - `guest {x:-204, y:-8, scale:.78, rotation:-3}` (two-shot)
  - `out {y:1500, rotation:14, opacity:0}`.
- **Talk-show camera cuts**: at every phrase or scene change, cut hard between a wide (scale 1.0) and a tight (1.16) frame. Centre each cut on the median tracked face position in that span, with y clamped to ≤ 62% so the forehead never leaves the frame. Each span also gets a 1.5% breathing zoom (`sine.inOut`). This replaces the kit's default 1.0 ↔ 1.075 jump-cut segments.
- Camera source: `rk.prepare_camera(work, width=960)`, then a CSS `filter:saturate(1.12) contrast(1.05)`. The "mic off" desaturation is a plum `mix-blend-mode:color` overlay at opacity 0.75, which is cheaper than a second video. Alternative: `rk.styled_camera(work, "mute", "eq=saturation=0.25:contrast=1.06")` and crossfade.

## Palette and typography

| Role | Hex |
|---|---|
| Home set (coral) | `#ff5b35` |
| Segment 1 / CTA (purple) | `#7a2ff0` |
| Segment 2 (magenta) | `#e8287f` |
| Segment 3 (amber) | `#ff9a1f` |
| Plum (shadows, ceiling, bars, halftone) | `#2a0838` |
| Ink | `#111111`, pure black `#000000` for text on light blocks |
| Phrase colours (karaoke, stickers) | yellow `#ffe14d`, cyan `#5ff3ff`, pink `#ff9be6` |
| Mint (positive) | `#3dff8f` |
| ON AIR red / pen red | `#ff2d3d` / `#e1001f` |
| Paper | `#f4ead7` |

Set texture: a slowly rotating sunburst (`repeating-conic-gradient`, cream `#fff4d6` rays at 16% opacity, +42° over the whole clip) and plum halftone dots (2.3 px every 22 px, 22% opacity, masked to the top and bottom thirds).

Fonts (google/fonts, OFL; download them, keep the OFL text next to each file, and check that the speech's glyphs exist, e.g. accents and `?`; none of these has `→`):
- **Bebas Neue** (`ofl/bebasneue/BebasNeue-Regular.ttf`): karaoke.
- **Anton** (kit): signs, slot cards, stickers, CTA.
- **DM Serif Display** (`ofl/dmserifdisplay/DMSerifDisplay-Regular.ttf`): magazine letters.
- **Caveat** (`ofl/caveat/Caveat-VF.ttf`): handwritten pen note.
- **Geist** (kit): small UI text (handle, "answer in the comments").

## Caption system

- Grouping: `rk.captions(words, voice_end, max_words=4, max_chars=18)`. Trim each group's end to the next group's start. Groups over 15 characters drop to 122 px.
- Every word is in the DOM from the group's start but stays invisible until its attack (`word.start − 0.03 s`). It reserves its space, so the line never reflows.
- **Attack**: pop from `scale .25, y 34` to `scale 1.06, y 0` in 0.16 s, `back.out(3)`.
- **Active word**: pure black text on a block of the phrase colour. The stroke takes the block colour, so it disappears into the block. Add an 8 px hard black box-shadow, rotation −2° and scale 1.06.
- **Spoken words**: phrase-colour fill with an 11 px `#111` stroke (`paint-order: stroke fill`) and a 7 px hard black text-shadow.
- Contrast spec: active word = black (#000) on L ≥ 85% blocks (yellow, cyan, pink only, never coral or magenta). Spoken words = light fill plus a dark stroke on any set colour. Check enlarged native-resolution crops on every background (coral, purple, magenta, amber) and ask vision explicitly about the active word.
- Word spacing: `margin: 0 .15em`. Tighter spacing made blocks touch on short words.

```css
.capg{left:80px;top:1236px;width:880px;height:312px;z-index:30;display:flex;align-items:center;justify-content:center}
.kar{width:880px;text-align:center;font-family:Bebas;font-size:136px;line-height:1;letter-spacing:1px;opacity:0;visibility:hidden}
.kar.long{font-size:122px}
.kar .w{display:inline-block;color:var(--pc);-webkit-text-stroke:11px #111;paint-order:stroke fill;
  text-shadow:7px 7px 0 #111;padding:.06em .10em 0;margin:0 .15em .08em;opacity:0;transform-origin:50% 60%}
```

```python
PHRASE = ["#ffe14d", "#5ff3ff", "#ff9be6"]
def karaoke_js(caps):
    on = lambda pc: ('{opacity:1,color:"#000000",backgroundColor:"%s",webkitTextStrokeColor:"%s",'
                     'textShadow:"0px 0px 0px rgba(0,0,0,0)",boxShadow:"8px 8px 0px #111111",rotation:-2,scale:1.06}' % (pc, pc))
    off = lambda pc: ('{color:"%s",backgroundColor:"rgba(0,0,0,0)",webkitTextStrokeColor:"#111111",'
                      'textShadow:"7px 7px 0px #111111",boxShadow:"0px 0px 0px rgba(0,0,0,0)",rotation:0,scale:1}' % pc)
    js = []
    for i, c in enumerate(caps):
        pc, cid = PHRASE[i % 3], f'#{c["id"]}-c'
        js.append(f'S("{cid}",{{visibility:"visible",opacity:1}},{c["start"]:.4f});')
        for j, w in enumerate(c["words"]):
            wid, t = f'#{c["id"]}-w{j}', max(c["start"], w["start"] - 0.03)
            js.append(f'S("{wid}",{on(pc)},{t:.4f});')
            js.append(f'FT("{wid}",{{scale:.25,y:34}},{{scale:1.06,y:0,duration:.16,ease:"back.out(3)"}},{t:.4f});')
            if j + 1 < len(c["words"]) and c["words"][j + 1]["start"] - 0.03 > t + 0.05:
                js.append(f'S("{wid}",{off(pc)},{c["words"][j + 1]["start"] - 0.03:.4f});')
        js.append(f'S("{cid}",{{visibility:"hidden",opacity:0}},{c["end"]:.4f});')
    return "".join(js)
```
The HTML is one `.clip.capg` per group holding `<div class="kar" style="--pc:…">` with one `<span class="w">` per token (uppercase `shown`). Tokens must equal the reviewed word list. Never add words.

## Scene grammar

Find every key time with `f = rk.finder(words)` and chain each lookup from the previous key (`f("word", after)`). Never hard-code seconds. Example speech: "a speaker explaining why backups matter, and why owning a backup tool is not the same as being able to restore".

| Beat | Scene | Typical length |
|---|---|---|
| Cold open (strongest line, can be a preview taken from later in the clip) | ON AIR flickers on, the camera slams in tilted (`y 900, rot 12 → 0, −3`, 0.42 s `back.out(1.3)`), the mic slides in from the left, and a yellow hook card in the slot asks the cover question. A drum roll leads into the show open. | 3–5 s |
| Headline (the problem stated) | Stripe wipe in the breath, then `HEADLINE · <PROBLEM IN 3–5 WORDS>`: white card, red tab, flips into the slot. Cut to the tight shot. | 2–3 s |
| Problem | Stickers stack on the shelf (`HAS BACKUPS ✓` mint, `EVER TESTED A RESTORE? ✗` black/red). On the failure word: wave `--live` → 0, bars turn black, a `MIC OFF` tag appears, the mic gets a red slash and red LED, ON AIR goes dark and the camera desaturates. | 3–4 s |
| Turn ("it's not about being X") | Record scratch over silent music. The camera goes to `aside` and the collage enters (paper, halftone spotlight, mic stand). Ransom letters spell X (e.g. "EXPENSIVE TOOLS"), a red pen scribbles over them and the note reads "not that!". | 3–4 s |
| Explanation (2–4 points) | One segment per point (e.g. SCHEDULE / OFFSITE COPY / RESTORE TEST): wipe, background repaint, segment card with dots, and 1–2 stickers or a mini-metaphor (two speech bubbles meeting → handshake; a fan of icon cards for "many options"). Wave back at `--live .6`. | 1.5–5 s each |
| Payoff | Coral set returns, ON AIR relights, and the wave goes `--live 1, --boost 1` with coloured bars. Cyan payoff card, music drop, short applause in the next breath. | 2–3 s |
| Application (the other person) | Camera `guest` plus a `GUEST · <ROLE>` card (e.g. `GUEST · YOUR CUSTOMER`). A bubble travels from the host to the guest, and a mint "MATCH" bar with a puzzle icon locks in. | 2–4 s |
| Closing line | Back to `main`. A red-bordered stamp card in the slot, with punch-ins (1.08, then 1.10 on a repetition). After the last word ON AIR becomes APPLAUSE and pulses 4×. | 2–4 s |
| CTA (no speech) | "Next episode" poll plus plaque (see CTA). | 5–6 s |

Rules: one slot card at a time, and each new card flips the previous one out. Keep at most 2 stickers on the shelf at once. Every scene clears its own props with `out()`, and the next scene sets its state explicitly so seeking stays correct.

## Transitions and motion vocabulary

- **Camera cut**: an instant `tl.set` of scale and origin, with no tween.
- **Slot flip**: the outgoing card goes `rotationX 80, y −14` in 0.14 s `power2.in`. The incoming card goes from `rotationX −85, y 18` to 0 in 0.26 s `back.out(1.8)`, `transformPerspective 800`.
- **Stripe wipe**: 108° black/yellow stripes (70 px each), revealed and hidden by a moving `clip-path` on a full-canvas layer that starts at y 300, 0.46 s total. Start it 0.2–0.3 s before the segment's first word so it lands in a breath.
- **Set repaint**: `#bg` `backgroundColor` tween, 0.22 s `none`, timed at the wipe's midpoint.
- **Sticker pop**: from `opacity 0, scale .3, rotation −8, x 60–80` to rest in 0.30 s `back.out(2.2)`. Exit: `opacity 0` in 0.18 s `power2.in`, optionally with `x 80`.
- **Camera state moves**: 0.42 s `expo.inOut`. Exit to the CTA: 0.42 s `power3.in`.
- **Punch-in** on `#cam-breath`: up to 1.07–1.10 in 0.12 s `power4.out`, hold 0.3 s, back in 0.4 s `power3.inOut`.
- **Accent pulses**: `scale 1.04–1.12` yoyo with repeat 1, 0.10–0.18 s, on the stressed word.
- **Rays**: continuous rotation, with an extra +25° in 0.6 s on the final stamp.

## Sound design

Voice first: mix with `rk.mix(work, plan, rk.sfx_library())`. Applause, stings and scratches go **only in speech gaps** or after the last word, never over a syllable. Gains below are the event `gain_db` values from the reference (the kit adds its own SFX offset).

| Action | Category | gain_db |
|---|---|---|
| ON AIR lights | `spotlight_on` | −19 |
| Camera slams in / any wipe | `swipe` | −17 to −22 |
| Sticker / card / option appears | `pop` (alternate variants) | −20 to −26 |
| Cold open → show open | `drum_roll` (1.2 s, ends at the headline) | −21 |
| Headline bumper (in a breath) | `tv_news_sting` | −15 |
| Headline word / payoff stamp | `stamp` | −22 to −25 |
| Mic dies / wave flattens | `tape_stop` | −21 |
| The turn | `record_scratch` (music silent) | −15 |
| Collage enters / pen crosses out | `page_turn` / `pen_write` | −19 / −20 |
| Chat stickers | `message_sent`, `message_received` | −24 |
| Agreement / match | `success_chime` / `lock_click` | −21 / −23 |
| Build to payoff | `cymbal_swell` (0.9 s before) → `bass_impact` on the word | −23 / −20 |
| Breath after payoff, APPLAUSE sign | `applause_short` | −15 to −17 |
| Back to centre | `whoosh` | −22 |
| Follow tap / Following | `mouse_click` / `success_chime`, then `applause_short` | −15 / −17 / −21 |

Music: confident and warm, not trap or cinematic.
- `music:1117` (Proud of You, confident rock ~92 bpm): reference choice.
- `music:33` (Motivating Mornings): lighter morning-show feel.
- `music:282` (Sweet September, lo-fi): calmer, late-night radio version.

Section plan (keys from the finder; `src` offsets chosen so the track's drop lands on the payoff word):

```python
def music_plan(k, track, drop_s, accent_src=1.34):
    off = drop_s - k["payoff"]                      # drop exactly on the payoff word
    return [
      dict(start=0, end=k["headline"]-.06, mode="full", gain_db=-3, track=track, src=36.0, fade_out=.05),  # preview: body of the track
      dict(start=k["headline"]-.06, end=k["fail"]+.15, mode="radio", gain_db=-4, track=track, src=accent_src, fade_in=.05),
      dict(start=k["fail"]+.15, end=k["fail_end"]+.05, mode="muffled", gain_db=-8, track=track, src=accent_src+(k["fail"]+.21-k["headline"])),
      dict(start=k["fail_end"]+.05, end=k["turn"]-.05, mode="silence"),                       # record scratch lives here
      dict(start=k["turn"]-.05, end=k["seg1"]-.12, mode="muffled", gain_db=-7, track=track, src=k["turn"]-.05+off, fade_in=.15),
      dict(start=k["seg1"]-.12, end=k["payoff"]-.05, mode="full", gain_db=-6, track=track, src=k["seg1"]-.12+off, fade_in=.05),
      dict(start=k["payoff"]-.05, end=k["last_end"]+.1, mode="full", gain_db=-1, track=track, src=k["payoff"]-.05+off),
      dict(start=k["last_end"]+.1, end=k["duration"], mode="full", gain_db=0, track=track, src=k["last_end"]+.1+off, fade_out=1.0),
    ]
```
Put `cta_boost_db=5` in the plan (music lifts in the speech-free CTA) and `music_ref=[payoff, last_end]`. Find `drop_s` by energy analysis of the track and, if possible, listen to it. Reference balance: music −22.9 dB under the voice median, bed p95 exactly −12.0 dB, which is at the limit. If you add more applause, lower it before lowering the voice.

## CTA design inside the style

Starts at `C = voice_end`, lasts 5.5 s, on the purple set. The camera drops out (`out` state), the mic exits left, and a wipe runs at `C − 0.25`.
- `C + 0`: yellow tape **NEXT EPISODE** (50, 326, 980 × 110, rot −2°, Anton 66) slides in from the left (`expo.out`, 0.3 s).
- `C + 0.25`: white question card (80, 488, 900 wide, Anton 76) with a comment question in two-answer form. Example: "WHICH ONE DO YOU SKIP:" → "THE BACKUP" / "THE RESTORE TEST".
- `C + 0.55 / 0.8 / 0.95`: option A (cyan, y 740, rot −1°), black "OR" chip (y 868), option B (pink, y 940, rot 1°). Each is 840 × 120 with a Lucide icon, sliding from opposite sides with `back.out(1.4)`.
- `C + 1.25`: "Answer in the comments" (Geist 700, 42 px, white with a hard shadow), at y 1092.
- `C + 1.5`: black plaque (130, 1180, 800 × 240) holding `assets/logo.png` on a white rounded tile, the handle from `rk.load_brand(work)["handle"]` (Geist 64), and a red REC button (440 × 74) reading "● Follow".
- `C + 2.3`: a Lucide `pointer` hand enters. At `C + 2.88` it presses: the button scales to 0.94, a ripple expands, and at `C + 2.97` the button turns white with "✓ Following" in ink. Aim the fingertip at the button's right end so it never covers the handle. Labels come from `brand["follow"]` / `brand["following"]`.
- `C + 3.8 / 4.1`: the options wiggle ±2.5° once each, so the hold does not freeze completely.

## Implementation notes

Write the page yourself (`rk.page` skeleton not needed). Use the kit for words, captions grouping, assets, icons, camera, face tracking and mix. Layer order inside `#world`: `#bg`, `#rays`, `#halftone`, `#wipe`, **`#ceiling` (z above all of these)**, `#desk`, `#wave`, collage, guest, `#cam` (z 10), stickers (z 12), `#mic` (z 13), `#onair` / `#slot` (z 14), CTA (z 20), captions (z 30).

**Waveform from the real voice** (Python, deterministic; one set of CSS variables per frame):
```python
def voice_bands(wav_path, voice_end, fps=30):
    with wave.open(str(wav_path)) as src:
        sr = src.getframerate(); x = np.frombuffer(src.readframes(src.getnframes()), "<i2") / 32768.0
    hop, win = sr // fps, 2 * (sr // fps); n = int(np.ceil(voice_end * fps))
    x = np.pad(x, (win, win + n * hop)); freqs = np.fft.rfftfreq(win, 1 / sr); hann = np.hanning(win)
    bands = [(80, 320), (320, 1600), (1600, 5500)]; raw = np.zeros((n, 3))
    for i in range(n):
        c = win + i * hop; spec = np.abs(np.fft.rfft(x[c - win // 2:c + win // 2] * hann)) ** 2
        raw[i] = [10 * np.log10(spec[(freqs >= lo) & (freqs < hi)].sum() + 1e-12) for lo, hi in bands]
    out = np.zeros_like(raw)
    for b in range(3):
        lo, hi = np.percentile(raw[:, b], 12), np.percentile(raw[:, b], 98)
        v = np.clip((raw[:, b] - lo) / max(hi - lo, 1e-6), 0, 1) ** 1.35; lvl = 0.0
        for i, t in enumerate(v):
            lvl += (t - lvl) * (0.65 if t > lvl else 0.28); out[i, b] = lvl   # fast attack, slow release
    return [[round(float(a), 2) for a in row] for row in out]
```
Per-bar weights: lows peak in the centre, mids form a ring, highs sit at the edges. Multiply by a seeded jitter (`0.72 + 0.5 * frac(sin(i*12.9898)*43758.5453)`) and normalise so the strongest bar reaches 1.05. Emit `style="--lw:…;--mw:…;--hw:…"` on each bar.

```css
#wave{position:absolute;left:272px;top:1062px;width:726px;height:160px;display:flex;align-items:center;justify-content:space-between;
  --l:0;--m:0;--h:0;--live:1;--boost:0}
.bar{display:block;width:15px;height:160px;border-radius:8px;background:#2a0838;
  transform:scaleY(min(1,calc(.07 + var(--live)*(1 + var(--boost)*.45)*(var(--l)*var(--lw) + var(--m)*var(--mw) + var(--h)*var(--hw)))))}
```
```js
K.amp.forEach((v,i)=>S('#wave',{'--l':v[0],'--m':v[1],'--h':v[2]},i/30));
S('#wave',{'--l':0,'--m':0,'--h':0},K.voice_end);
TO('#wave',{'--live':0,duration:.28,ease:'power2.in'},K.fail+.05);          // mic off
TO('#wave',{'--live':1,'--boost':1,duration:.22,ease:'power3.out'},K.payoff-.05);
S('.bar',{backgroundColor:i=>['#ffe14d','#5ff3ff','#ff9be6'][i%3],boxShadow:'4px 4px 0px #111111'},K.payoff-.05);
```

**Safe stripe wipe** (full-canvas layer, no rotated rectangle, never above the ceiling):
```css
#wipe{position:absolute;left:0;top:300px;width:1080px;height:1620px;opacity:0;
  background:repeating-linear-gradient(108deg,#111 0 70px,#ffe14d 70px 140px)}
```
```js
function wipe(t){
  S('#wipe',{opacity:1,clipPath:'polygon(0% 0%,0% 0%,-20% 100%,-20% 100%)'},t);
  TO('#wipe',{clipPath:'polygon(0% 0%,120% 0%,100% 100%,-20% 100%)',duration:.23,ease:'power2.in'},t);
  TO('#wipe',{clipPath:'polygon(120% 0%,120% 0%,100% 100%,100% 100%)',duration:.23,ease:'power2.out'},t+.23);
  S('#wipe',{opacity:0},t+.47);
}
function slotIn(sel,t,prev){ if(prev) TO(prev,{opacity:0,rotationX:80,y:-14,duration:.14,ease:'power2.in'},t-.14);
  FT(sel,{opacity:0,rotationX:-85,y:18,transformPerspective:800},{opacity:1,rotationX:0,y:0,duration:.26,ease:'back.out(1.8)'},t); }
function onAir(on,t){ TO('#onair',{backgroundColor:on?'#ff2d3d':'#5b2a33',
  boxShadow:on?'0 0 46px rgba(255,45,61,.85),10px 10px 0 #111':'0 0 0px rgba(255,45,61,0),10px 10px 0 #111',duration:on?.12:.18},t);
  TO('#onair b',{color:on?'#ffffff':'#c79aa2',duration:.15},t); }
```

**Camera cuts** from `rk.track_faces(work)`:
```python
def camera_cuts(times, voice_end, faces):
    cuts = []
    for i, a in enumerate(times):
        b = times[i + 1] if i + 1 < len(times) else voice_end
        pts = [p for p in faces if a <= p["t"] < b]
        x = float(np.median([p["x"] for p in pts])) if pts else 0.37
        y = float(np.median([p["y"] for p in pts])) if pts else 0.58
        cuts.append(dict(start=a, end=b, x=round(x*100, 1), y=round(min(y, .62)*100, 1), s=1.0 if i % 2 == 0 else 1.16))
    return cuts
```
```js
K.cuts.forEach(c=>{const o=c.x+'% '+c.y+'%';S(['#cam-jump','#cam-breath'],{transformOrigin:o},c.start);S('#cam-jump',{scale:c.s},c.start);
  FT('#cam-breath',{scale:1},{scale:1.015,duration:Math.max(.2,c.end-c.start-.05),ease:'sine.inOut'},c.start);});
```

- **Mic SVG** (240 × 440): a boom arm path, a rounded capsule body `#1b1b24` with grille lines `#5a5a6c`, a ring mount, an LED `<circle id="mic-led">` (green `#3dff8f`, red when off, yellow in segments) and `<line id="mic-slash">` (red, 22 px, starts at opacity 0). Add `filter: drop-shadow(12px 12px 0 rgba(42,8,56,.55))`.
- **Ransom letters**: one `<span>` per letter. Cycle the font (Anton / DM Serif / Bebas) and the bg/fg pair (ink/white, white/ink, red/white, yellow/ink, cyan/ink) by `(i*5 + row*2) % 6`. Rotation is `((i*37 + row*11) % 15) − 7` degrees and the y offset is `((i*23 + row*7) % 13) − 6` px. This is deterministic and needs no `Math.random`. Letters pop in 0.035–0.05 s apart.
- **Pen scribble**: a zig-zag SVG path, `stroke-dasharray:1500; stroke-dashoffset:1500` → 0 in 0.42 s `power2.inOut`, 0.25 s after the crossed-out word.
- **Torn paper**: a `clip-path` polygon with 24 jagged points plus an 18 px hard plum shadow. **Halftone spotlight**: a trapezoid `clip-path` with orange dots on yellow, `scaleY` .1 → 1 from the top.
- Use `rk.ensure_icons([...])` for every Lucide icon before building, e.g. `mic-off`, `mic-vocal`, `check`, `x`, `messages-square`, `handshake`, `layers`, `sparkles`, `user-round`, `puzzle`, `message-circle`, `megaphone`, `pointer`.
- Every scene sets its starting state with `S()` at its own start time (LED colour, slash opacity, bar colour, gray overlay). Then a seek into the middle of the clip renders the right state.

## Pitfalls found in production

1. **The stripe wipe broke the pixel top-margin check after render.** The previews passed, but in the final MP4 the yellow stripes crossed y 0–270. Fix: keep the plum ceiling band above every full-bleed layer, start the wipe layer at y 300, and include wipe frames in the top-margin sample. Reference after the fix: first bright row ≥ 309 px.
2. **The rotated-rectangle wipe left a black/yellow triangle** in the bottom-right corner for a few frames, because the rectangle's corner trailed the sweep. Use the `clip-path` wipe above, and review the corners of transition frames specifically, not only mid-scene frames.
3. **Light sets (amber, yellow) count as bright pixels at the top.** The dark ceiling gradient (opaque to y ~200, fading out by y 330) is mandatory for every set colour, not decoration.
4. **A sticker touched the top of the head.** Keep shelf stickers at x ≥ 600, use 2-line stickers instead of wide ones, and check face clearance in every sheet.
5. **State leaked between scenes** (the mic slash survived into the segments). Reset each prop explicitly at its scene start. Do not rely on the previous tween having run.
6. **The camera exit left a black shape over the CTA** (border and shadow still visible). Animate `opacity:0` along with the `y` drop.
7. **The pointer covered the handle.** Aim it at the button's far end.
8. **Karaoke blocks touched on short words** ("OS", "A"). Use `margin 0 .15em`.
9. **The wave looked almost flat in a breath.** That is the real amplitude in silence, so keep the 0.07 floor and never fake motion. Put the applause in that gap so the frame still has life.
10. **Applause over speech hurts ASR and feels canned.** Place it only in gaps ≥ 0.4 s or after the last word. Verify with ASR of the final mix against the clean voice (reference: 0.925 vs 0.947).
11. **The freeze detector flags CTA holds** and the small pasted-photo camera. Treat it as advisory and confirm frame by frame.
12. **Low-res webcams**: do not shrink the camera below scale ~0.55 in the pasted-photo state, or the face turns to mush.

## Variations

- **Late-night radio**: navy `#0c1030` set, amber VU-meter bars instead of the coral pop wave, a single desk lamp cone instead of the sunburst, `music:282`, and `crowd_murmur` instead of applause. Good for reflective or story clips.
- **Call-in show**: segments become "caller lines" (`LINE 1 · <QUESTION>`) with a phone sticker and a `phone_notification` ring in the breaths. The guest card becomes the caller. Good for FAQ or myth-busting speeches.
- **Morning show**: pastel set (mint, sky, butter), a rounded camera print without tilt, a sunrise gradient behind the waveform, `music:33`, and a `success_chime` sign-off. Good for upbeat tips.
- **Debate panel**: two sticker columns (FOR / AGAINST) that fill as the speaker lists arguments, plus a scoreboard in the slot that flips per point. The CTA poll asks which side the viewer is on.
