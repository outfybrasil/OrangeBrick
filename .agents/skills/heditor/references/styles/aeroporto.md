---
style: aeroporto
name: Aeroporto (control tower)
family: fixed-style
best_for: processes with a gate, approval or go/no-go decision (deploys, reviews, launches, checklists, risk calls)
reference: produced by PycodeBR (Felipe Azambuja), October 2026
---
# Aeroporto (control tower)

The whole Reel happens inside an airport control tower at night. The speaker is the controller: their camera lives in a CRT monitor on the tower console, their speech arrives as a radio transmission, and the topic is treated as a flight. Work in progress is traffic on a phosphor-green radar, a request is a paper flight strip, the risky step is a runway with a red stop bar, and the decision is a departure board whose letters flip from AWAITING to CLEARED. The viewer should feel the tension of a hold and the release of a take-off clearance. The core metaphor: **something automated prepares the move, a human gives (or refuses) clearance**.

## When to use / when not to

Use it when the speech contains:
- a pipeline with a human checkpoint (agent prepares, person approves; test → review → release);
- a "no" that is the point (I don't let it…, wait for authorization, hold);
- a risk that must be shown as a hypothesis ("what if it ships something broken?");
- a clear release moment you can sync to a music drop ("if you approve, it goes live").

Avoid it when:
- the talk is emotional/personal storytelling with no process (the cockpit UI feels cold);
- there is no decision or gate — radar + runway without a hold is decoration;
- the speech is under ~25 s (four worlds need room) or the speaker's frame must stay large the whole time;
- the brand palette forbids near-black + green + amber.

## Signature moves

1. **CRT console monitor as the camera frame**: graphite bezel, curved screen corners, scanlines, a slow rolling bright band, glass reflection, an LED and a small name plate on the "chin".
2. **Who acts sets the tint**: camera is **phosphor green** while the system/agent is acting (radar, flight strip, taxi) and **normal colour** when the human decides (cold open, veto, approval, wrap-up). Done by crossfading two synced videos.
3. **Split-flap departure board** for the hook, the decision and the CTA: tiles scramble through random glyphs and land on the final word, with a status lamp (amber blinking = waiting, red = denied, green = cleared).
4. **Radar world**: circular green scope with rings, crosshair and a continuously rotating sweep; blips pulse *when the sweep passes over them*; a target turns amber → red; corner brackets lock onto it.
5. **Runway from above** with a red **stop bar** that lights light-by-light on the "no", a red mandatory-style sign (AWAITING CLEARANCE), and later green centreline lights running up the runway as the plane takes off and its shadow separates.
6. **Radio-transmission captions**: black band with amber border and a tab "◉ TOWER · <SPEAKER>", monospaced teletype words, active word amber on pure black with an amber underline, a TX lamp lit while speaking, a static flicker at each phrase start, plus a synthesized squelch click in speech gaps.
7. **Channel-change transitions**: every world change is a CRT channel switch (static burst + scanline wipe + monitor moving to its new dock), never a generic slide.
8. **CRT power-off into the CTA**: the image collapses to a horizontal line, then to a dot, then the board flips to "NEXT FLIGHT: @handle".

## Frame and layout

Canvas 1080×1920, 30 fps. Coordinates are top-left px.

```
y 0–270     SAFE_TOP: tower windows only (dark gradient, black mullions, dim amber horizon lights at y≈262-279). No text.
y 300–360   world titles / definitions (centered, B612 Mono 38–62 px)
y 320–~700  departure board (x 60–1020, 960 wide) in board scenes
y 375–1095  radar scope (720×720 at x 180) in radar scenes
y 400–1290  runway (260 wide at x 520) + text column x 50–490
y 430–810   flight-strip bay (x 60–1020)
y 600–1275  CRT monitor (depends on dock state, see below)
y 1281–1330 radio tab;  y 1330–1530 radio caption band (x 50–990)
y 1560–1920 console desk (dim LEDs and knobs, decorative only)
```

- Monitor element: 696×568 (bezel), screen 640×476 at (28,28) inside it, chin row at y 510. `transform-origin: 0 0`, docked by `x/y/scale`:
  - `big`  {x:209, y:730, scale:.95} → under the departure board (hook, approval);
  - `console` {x:40, y:988, scale:.5} → bottom-left next to radar/runway;
  - `mid` {x:268.5, y:832, scale:.78} → under the flight-strip bay;
  - `center` {x:209, y:598, scale:.95} → over an enlarged faded radar for the wrap-up.
  Max on-screen video width ≈ 608 px. Never let the monitor cover the radio band (bottom edge ≤ 1275).
- Camera inside the screen: jump-cut zoom 1.0 ↔ 1.075 per `K.segments` centered on the tracked face + 1.5 % breathing (`rk.track_faces`, `rk.jump_segments`). Scanlines and glass sit above the video.
- Safe zones: nothing readable above y 270 (verify by pixels; first bright row in the reference landed at y≈304). The caption band ends at 1530, above the bottom ~350 px. For heavy-UI platforms keep long caption lines inside x ≤ 960 (right 120 px clear); the reference used x 50–990 with left-aligned text so line ends rarely reached the edge.
- The face must stay uncovered in every frame: labels next to the monitor, never on it.

## Palette and typography

| Role | Hex |
|---|---|
| Night background | `#010302`, `#020604`, radial `#07170e → #030a06` |
| Tower green panels | `#06120c`, `#0b120e`, borders `#1e2b23` / `#24372b` |
| Phosphor green (radar, live) | `#39ff6a`; soft text `#9dffb8`; pale text `#cfe9d8` |
| Radio amber (headings, active word, tabs) | `#ffb000` |
| Stop-bar red / warning text | `#ff2d2d` / `#ff5a5a` |
| Mandatory sign red | `#c8102e` (white text, 4 px white border) |
| Clearance green | `#0d7a3b` sign, `#4dff88` text |
| Flight-strip paper | `#efe6c8` with dark ink `#111`, stamp red `#b3001b` |
| Split-flap tile | gradient `#1d1f1e` / `#000` hinge line / `#151716`, glyph `#f4f1e6` |
| CRT bezel | `#2a2f2c → #161a18`, edge `#3a413d` |

Fonts (google/fonts, SIL OFL 1.1; ship the `OFL.txt` next to the files):
- **IBM Plex Mono** Bold (`ofl/ibmplexmono/IBMPlexMono-Bold.ttf`) — radio captions and the CTA question.
- **B612 Mono** Regular/Bold (`ofl/b612mono/`) — boards, radar labels, signs, strips, chin plate. B612 was designed for cockpit displays, which is why it reads "aviation" without any logo.
- Lucide (ISC), sparingly: `plane-takeoff`, `radio-tower`, `send`, `shield-check`, `triangle-alert`, `message-circle`, `check`.
Do not mix in a display sans (Anton etc.) — the style is all-monospace.

## Caption system

Look: fixed black band `left:50px; top:1330px; 940×200`, `border:3px solid #ffb000`; tab above it (`left:-3px; top:-49px; height:49px`, same border, no bottom border) reading `TOWER · <SPEAKER>` with a 16 px TX lamp. IBM Plex Mono Bold 66 px, line-height 1.18, left-aligned, up to 2 lines of ~22 characters.

Behaviour:
- Group words **by radio phrase by hand** (clause boundaries, 2–7 words), not by a fixed count. Assert that the phrases cover the token list exactly (`' '.join(shown) == phrase`, total == len(words)).
- Teletype: each word appears at its own start (−0.02 s). The **first word appears at the phrase start** so the band is never empty between phrases.
- Active word: `#ffb000` on pure black with a 6 px amber `border-bottom`; spoken words turn white `#ffffff`; unspoken words are invisible. No outline, no glow, no pill.
- Phrase start: amber scanline static flashes on the band (.75 → 0 in 0.16 s) and the TX lamp lights; lamp goes dark at phrase end.
- Phrase window: start = first word −0.06 s (not before previous end); end = last word +0.28 s, clipped to next phrase −0.06 s and to `voice_end`.
- Contrast check: enlarged crops at 5–6 times spread across the cut; ask explicitly whether the active word is bright on black and whether any word is dark on mid-tone.
- Censorship (if any) goes through `rk.load_words(..., censor={...})`; audio untouched.

```css
.capclip{left:50px;top:1330px;width:940px;height:200px;z-index:31;display:flex;align-items:center;padding:0 40px 0 30px}
.cap{width:870px;font-family:Plex;font-weight:700;font-size:66px;line-height:1.18;color:#fff;text-align:left}
.cap .w{display:inline-block;opacity:0;border-bottom:6px solid rgba(255,176,0,0);padding-bottom:1px}
#radio-static{position:absolute;inset:0;opacity:0;background:repeating-linear-gradient(0deg,rgba(255,176,0,.22) 0 2px,transparent 2px 7px)}
```

```python
def radio_captions_js(caps):
    on  = '{opacity:1,color:"#ffb000",borderBottomColor:"#ffb000"}'
    off = '{color:"#ffffff",borderBottomColor:"rgba(255,176,0,0)"}'
    js = []
    for c in caps:
        js.append(f'FT("#radio-static",{{opacity:.75}},{{opacity:0,duration:.16,ease:"power2.out"}},{c["start"]:.3f});')
        js.append(f'S("#tx-lamp",{{backgroundColor:"#ffb000",boxShadow:"0 0 14px #ffb000"}},{c["start"]:.3f});')
        js.append(f'S("#tx-lamp",{{backgroundColor:"#3a2a00",boxShadow:"0 0 0px #ffb000"}},{c["end"]:.3f});')
        ws = c["words"]
        for j, w in enumerate(ws):
            t = c["start"] if j == 0 else max(c["start"], w["start"] - .02)
            js.append(f'S("#{c["id"]}-w{j}",{on},{t:.3f});')
            if j + 1 < len(ws):
                js.append(f'S("#{c["id"]}-w{j}",{off},{max(t + .01, ws[j+1]["start"] - .02):.3f});')
    return "".join(js)
```
Each caption is its own clip (`class="clip capclip" data-start data-duration data-track-index="50"`) with one `<span id="cap-N-wJ" class="w">` per word.

## Scene grammar

Four worlds plus the board. Map speech beats to them; the camera dock and tint follow.

| Beat | World | Monitor | What happens (generic example: "an agent drafts a fix, I approve the release") |
|---|---|---|---|
| Hook / cold open (0–2.5 s) | Departure board | big, normal colour | Board flips a yes/no question ("WOULD YOU LET AI / SHIP TO PROD?"). Status row "AUTO-DEPLOY: READY" flips to **DENIED** (red lamp) on the spoken "no". One-line plain definition under the board. |
| Problem / the system works | Radar | console, green | Channel switch. An amber blip pulses with the sweep; label "SIGNAL" → "IS IT REAL?" → red "CONFIRMED". A console log ticks in at x 430, y 1120: `› TESTS IT`, `› READS THE CODE`, `› IS IT REAL?`. Jargon definitions at the top (one at a time). On "notifies me", a dashed amber radio line draws from the blip to the monitor + tag "ALERT TO TOWER". |
| Explanation (the request) | Flight-strip bay | mid, green | A cream strip slides in from the right (`x:980 → 0`, 0.42 s expo.out): amber call-sign block ("PR"), title, route ("PROJECT → PRODUCTION"), boxed status "REVIEW PENDING". A ✓ line appears on the verb. On "sends me the link" the strip flies toward the monitor and shrinks; "SENT TO TOWER". |
| Escalation (catch) | Radar | console, green | Title ("LIVE SYSTEM"), radar glow pulses, brackets lock onto a red blip on the capture verb, alarm + shake on the problem noun. |
| Turn (the human "no") | Runway | console, → normal on the "no" | Plane icon with an amber patch taxis up (1.25 s power2.out). On the refusal: stop-bar lights turn red one by one (35 ms apart), red sign "AWAITING CLEARANCE" pops, camera tint returns to normal. |
| Risk as hypothesis | Runway | console, normal | Dashed amber frame around the runway + label "HYPOTHESIS: WHAT IF IT SHIPS SOMETHING BROKEN?". Fault icon on the plane, light smoke, it lifts slightly, loses power and settles: "FAULTY — STAYS ON THE GROUND". No crash, no explosion. A rubber stamp for the disclaimer line. |
| Payoff (approval) | Departure board | big, normal | Rows flip to "REQUEST: FIX / DEST: PRODUCTION / AWAITING / CLEARANCE" (amber, lamp blinking). A physical **AUTHORIZE** button appears on the monitor chin; on the approval word it is pressed (scale .9 → 1, turns green) and rows flip to **CLEARED / FOR TAKEOFF** in green. Music drop here. |
| Release | Runway | console, normal | Stop bar goes dark in sequence, centreline lights run green, green sign "CLEARED FOR TAKEOFF", plane accelerates, shadow separates, plane scales up and exits through the top toward "PRODUCTION". |
| Wrap-up | Radar (faded 62 %, scaled 1.2) | center, normal | One outbound green blip with a trail; title "LIVE SYSTEM / WITH HUMAN REVIEW". |
| CTA (6 s) | Board | off | CRT power-off, then the CTA board (below). |

Rules: every label is a short paraphrase of the speech at that moment (no invented claims, no real data, no real screens or links). Definitions use the format `TERM = plain meaning`. Keep one world on screen at a time; never build an empty bay/runway — the main object enters with the layer.

## Transitions and motion vocabulary

- **Channel switch** (`chan(t)`): `#static` grain on the screen .95 → 0 in 0.2 s + full-frame green scanline sheet `#chswitch` opacity 1 → 0 while moving y −40 → 40 in 0.22 s; same moment the monitor moves (`mon(state,t,.36–.42)`, `expo.inOut`) and the old layer fades in 0.16 s.
- **Tint swap** (`green(on,t)`): crossfade the green video wrapper in 0.25 s `power1.inOut`; chin LED turns green (system) or amber (human).
- **Flap flip**: per tile 3 random glyphs 35 ms apart, final glyph at +0.105 s, tile scaleY .35 → 1 in 0.07 s; tiles staggered 16 ms. Finish the flip **before** the word it illustrates.
- **Show/hide**: `show(sel,t,from)` → opacity/x/y/scale to rest in 0.24 s `power3.out`; hide 0.16 s `power1.in`.
- **Radar**: sweep rotates `360*D/P` over the whole cut (`P = 3.0 s` per turn, `ease:none`); blip at angle `a` pulses at `t = (a/360 + n)*P` (opacity 1, scale 1.6 → .3/1 over 0.8 P).
- **Stamp**: from scale 1.9 rot −6° to 1, 0.16 s `power4.out`.
- **Takeoff**: y −430 in 1.25 s `power2.in`, then y −640 + scale 1.45 in 0.75 s linear, fade 0.35 s; shadow drifts x +90 and fades (separation = lift-off).
- **Ambient**: rolling bright band on the screen every 3.2 s; grain stepped at 12 fps; desk LEDs breathe with different periods. These keep low-motion stretches alive.
- **Power-off**: white flash .85 in 0.05 s; screen `scaleY .012` in 0.12 s `power3.in`; then `scaleX 0` in 0.12 s; dot fades in 0.35 s; monitor drops `y += 900` 0.45 s `power3.in`.

## Sound design

Voice first. All gains below are event `gain_db` values fed to `rk.mix` (which applies its own SFX offset and ducking).

| Action | Category | gain_db | length |
|---|---|---|---|
| Radio phrase start (only if ≥ 0.2 s silence before) | `radio_squelch` (synthesized, see below) | −22 | 0.17 |
| Board letters flipping | `slot_machine_reel` | −17 to −21 | 0.45–0.7 |
| Cold-open floor | `sub_drop` | −18 | 1.0 |
| Status / definition appears | `data_beep` | −21 | 0.35 |
| Channel switch | `swipe` | −17/−18 | 0.45 |
| Radar on / question / calm radar | `sonar_ping` | −18 to −21 | 0.9–1.2 |
| Agent analysing / preparing | `robot_processing` | −24/−25 | 1.2–1.3 |
| Target turns red | `retro_computer_beep` | −21 | 0.4 |
| Alert sent / request sent / request arrives | `message_sent` / `message_received` | −17/−19 | 0.4–0.5 |
| Strip slides in / ✓ line | `page_turn` / `pen_write` | −16 / −22 | 0.5 / 0.8 |
| Lock-on brackets, stop bar lights | `lock_click` | −19 / −15 | 0.5–0.6 |
| Problem detected | `alarm_short` | −16 | 0.6 |
| Hypothesis frame | `glitch` | −22 | 0.35 |
| Engine loses power / "stays on the ground" | `tape_stop` / `wrong_buzzer` | −18 / −23 | 1.3 / 0.5 |
| Disclaimer stamp | `stamp` | −16 | 0.42 |
| AUTHORIZE pressed / Follow pressed | `mouse_click` | −14 / −12 | 0.3 |
| Approval drop | `trailer_hit` | −15 | 2.0 |
| Takeoff roll / lift-off / vanishes | `cymbal_swell` / `sub_drop` / `success_chime` | −17 / −16 / −20 | 2.4 / 1.2 / 1.2 |
| CRT power-off | `glitch` | −17 | 0.4 |
| Following | `success_chime` | −16 | 1.2 |

**Radio squelch (original, synthesized in the build script, not from a library):** 0.17 s of seeded white noise, band-limited to 350–3400 Hz by zeroing FFT bins (telephone band), 4 ms linear attack, release ramp ending at 0.15 s, "crackle" by multiplying with a random gate in 5 ms blocks (level 0.65 or 1.0, ~65 % on), a 40-sample Hann click at 0.148 s for the squelch tail, peak-normalized to 0.8, stereo with the right channel at 0.96. Register it as a category before mixing:

```python
import numpy as np, wave
def make_squelch(path, sr=48000, seed=1234):
    rng = np.random.default_rng(seed); n = int(.17 * sr)
    spec = np.fft.rfft(rng.standard_normal(n)); f = np.fft.rfftfreq(n, 1 / sr)
    spec[(f < 350) | (f > 3400)] = 0
    x = np.fft.irfft(spec, n); t = np.arange(n) / sr
    env = np.minimum(1, t / .004) * np.clip((.15 - t) / .05, 0, 1)
    gate = .65 + .35 * (rng.random(n // 240 + 1).repeat(240)[:n] > .35)
    x = x * env * gate; c = int(.148 * sr); x[c:c + 40] += np.hanning(40) * 3.0
    x = x / np.abs(x).max() * .8; st = np.column_stack([x, x * .96])
    with wave.open(str(path), "wb") as o:
        o.setnchannels(2); o.setsampwidth(2); o.setframerate(sr)
        o.writeframes((st * 32767).astype("<i2").tobytes())

lib = rk.sfx_library()
make_squelch(assets / "sfx-radio-squelch.wav")
lib["radio_squelch"] = {"files": [str(assets / "sfx-radio-squelch.wav")], "trim": ("head", .17)}
rk.mix(work, plan, lib)
```
Place it at `first_word_start − 0.17`. Listen to it once — it must read as radio, not as a click artefact in the voice.

**Music**: dramatic percussion that can *hold its breath* before the approval.
- `music:677` (Epical Drums 02) — reference choice. Catalog `lift_s: 58`: the track decays by itself to near silence over ~56–58 s and re-enters full at 58.0 s. Play the section before the approval from `src = 58.0 − section_length` so the natural decay lands right before the approval word, then start the next section at `src 58.0` exactly on it.
- `music:597` (Vertigo, lift at 57 s) for a stealthier, investigative tone.
- `music:680` (Epical Drums 05) or `music:871` (Fright Night, lift at 21 s) for a darker risk-heavy talk.

Section plan (reference proportions):
```json
[{"start":0,"end":2.0,"mode":"full","gain_db":-2,"src":2.0,"fade_out":0.06},
 {"start":2.0,"end":17.1,"mode":"lowpass","gain_db":-4,"src":10.0},
 {"start":17.1,"end":24.0,"mode":"full","gain_db":-7,"src":20.0},
 {"start":24.0,"end":30.4,"mode":"muffled","gain_db":-5,"src":44.0},
 {"start":30.4,"end":"APPROVAL","mode":"full","gain_db":-3,"src":"58.0-len","fade_out":0.01},
 {"start":"APPROVAL","end":"DURATION","mode":"full","gain_db":-1,"src":58.0,"fade_in":0.005,"fade_out":1.5}]
```
i.e. full hook → lowpass while the system investigates → full but quieter for escalation/veto → muffled for the hypothesis → natural decay → full re-entry on the approval word, through takeoff and CTA. Set `"music_ref": [approval_t, voice_end]` and `"cta_boost_db": 4`. Targets: music body ≈ −21.5 dB under voice median, background p95 ≥ 12 dB under voice; the reference only just met them, so do not raise section gains.

## CTA design inside the style

6 s after `voice_end`, built as the next departure:
1. Last word + 0.12 s: CRT power-off (see motion); radio band fades at `C+0.1`.
2. `C+0.3`: CTA board drops in (y −30 → 0, 0.3 s `expo.out`) with a header `PLANE-TAKEOFF · DEPARTURES` and the brand logo (`assets/logo.png`) at the right.
3. `C+0.45`: row 1 flips `NEXT FLIGHT:` (12 tiles, 66×84, 58 px); `C+0.75`: row 2 flips `@handle` from the brand config in amber (92×118 tiles, 84 px — size the tile count to the handle length, max ~10).
4. `C+0.9`: a final radio box "TOWER → YOU" (same amber-bordered black box, x 50, y 960, 940 wide) with the comment question in IBM Plex Mono 54 px, one key word amber; reveal the whole question at once (`C+1.0`), never a partial crop.
5. `C+1.2`: amber pill button **Follow** (440×104, radius 52, black text 50 px) pops with `back.out(2)`.
6. `C+1.9`: `message-circle` + "Tell me in the comments" at y 1350.
7. `C+2.62` press (scale .93), `C+2.7` → green `#39ff6a`, label swaps to `✓ Following`, radio box border blinks green once. SFX `mouse_click` + `success_chime`.
Hold until the end; music fades over the last 1.5 s.

## Implementation notes

Build a custom page (not `rk.page()`): `#world` (background, layers, monitor) → `#radio` band → caption clips → `#chswitch` → `#grain` → `<audio id="master">`. Use reelkit for words, phrase timing, face tracking, jump segments, camera prep, icons and the mix.

Camera variants:
```python
rk.prepare_camera(work, width=960)   # camera-hd.mp4 (normal colour)
rk.styled_camera(work, "radar",
    "hue=s=0,eq=contrast=1.2:brightness=0.03,colorchannelmixer=rr=0.30:gg=1.0:bb=0.42")
```
Both are clips with the same `data-start="0"` and `data-duration=voice_end` (track 0 and 1), stacked inside the screen; the green one sits in `#green-wrap` whose opacity is the tint.

Monitor markup:
```html
<div id="mon"><div id="mon-body">
 <div id="screen"><div id="scr-in">
  <div id="cam-zoom"><div id="cam-breath"><div id="cam-jump">
   <video id="cam-n" class="clip" data-start="0" data-duration="VOICE_END" data-track-index="0" src="assets/camera-hd.mp4" muted playsinline></video>
   <div id="green-wrap"><video id="cam-g" class="clip" data-start="0" data-duration="VOICE_END" data-track-index="1" src="assets/camera-radar.mp4" muted playsinline></video></div>
  </div></div></div>
  <div id="scan"></div><div id="roll"></div><div id="static"></div><div id="glass"></div><div id="crt-flash"></div>
 </div><div id="crt-dot"></div></div>
 <div id="chin"><i id="led"></i><span id="chin-label">NAME · ROLE</span>
  <div id="auth-btn"><span id="ab-a">AUTHORIZE</span><span id="ab-b">CLEARED</span></div></div>
</div></div>
```
```css
#mon{position:absolute;left:0;top:0;width:696px;height:568px;transform-origin:0 0;z-index:20}
#mon-body{position:absolute;inset:0;border-radius:30px;background:linear-gradient(180deg,#2a2f2c,#161a18);border:3px solid #3a413d;box-shadow:0 26px 60px rgba(0,0,0,.75),inset 0 2px 0 rgba(255,255,255,.08)}
#screen{position:absolute;left:28px;top:28px;width:640px;height:476px;border-radius:34px/28px;overflow:hidden;background:#000}
#scan{position:absolute;inset:0;background:repeating-linear-gradient(0deg,rgba(0,0,0,.26) 0 2px,transparent 2px 5px)}
#glass{position:absolute;inset:0;background:radial-gradient(ellipse 120% 90% at 30% 15%,rgba(255,255,255,.10),rgba(255,255,255,0) 45%),radial-gradient(ellipse at 50% 50%,rgba(0,0,0,0) 60%,rgba(0,0,0,.55) 100%)}
#sweep{position:absolute;inset:0;border-radius:50%;background:conic-gradient(from 0deg,rgba(57,255,106,0) 0deg 280deg,rgba(57,255,106,.10) 318deg,rgba(57,255,106,.42) 357deg,rgba(200,255,214,.95) 360deg)}
```

Page JS helpers (deterministic; seed `rnd()` from `K.seed`):
```js
const ST=K.monStates; gsap.set('#mon',ST.big);
function mon(s,t,d){TO('#mon',Object.assign({duration:d||.42,ease:'expo.inOut'},ST[s]),t);}
function green(on,t){TO('#green-wrap',{opacity:on?1:0,duration:.25,ease:'power1.inOut'},t);
  TO('#led',{backgroundColor:on?'#39ff6a':'#ffb000',duration:.2},t);}
function chan(t){FT('#static',{opacity:.95},{opacity:0,duration:.2,ease:'power2.out'},t);
  FT('#chswitch',{opacity:1,y:-40},{opacity:0,y:40,duration:.22,ease:'power1.out'},t);}
const GL='ABCDEFGHIJKLMNOPRSTUVXZ#@*+-';
function flip(row,text,t,color){document.querySelectorAll(row+' .t b').forEach((b,i)=>{const t0=t+i*.016;
  for(let k=0;k<3;k++)S(b,{textContent:GL[Math.floor(rnd()*GL.length)]},t0+k*.035);
  const ch=text[i]||' ';const fin={textContent:ch===' '?'\u00a0':ch};if(color)fin.color=color;S(b,fin,t0+.105);
  FT(b.parentNode,{scaleY:.35},{scaleY:1,duration:.07,ease:'power1.out'},t0+.105);});}
function pulses(sel,ang,t0,t1){for(let n=0;n<400;n++){const t=(ang/360+n)*K.P;if(t>t1)break;
  if(t>=t0)FT(sel,{opacity:1,scale:1.6},{opacity:.3,scale:1,duration:K.P*.8,ease:'power2.out'},t);}}
TO('#sweep',{rotation:360*D/K.P,duration:D,ease:'none'},0);
```
Board rows are generated in Python as fixed-width tile rows: center the text to `cols` with spaces, one `<span class="t"><b>X</b></span>` per char (`&nbsp;` for spaces). Pre-center flip targets in Python (`K.boards`) so JS only indexes characters. Plane, radar, runway, signs and strips are inline SVG/CSS — no airline, airport or aircraft-maker marks.

Key times come from `rk.finder(words)` (`f("no")`, `f("approve")`, `f("deploy", 34.0)`…); every scene time is `key ± small offset`, so the same build re-syncs to new speech.

## Pitfalls found in production

- **Frame 0 must be complete**: layers visible at t=0 (hook board, radio band, chin label) need `opacity:1` in CSS, not only in the timeline, or the first frame/thumbnail is blank.
- **No placeholder-looking states**: a status of dashes reads as broken; start from a real word (READY) and flip to the verdict.
- **Never show an empty container**: the strip must enter with the bay; an empty bay for ~1 s looked like a bug.
- **Flips finish before the word**: letters still scrambling while the word is spoken feel late. Start flips ≥ 0.1 s before the key.
- **Empty caption band between phrases** looks dead: show the phrase's first word at phrase start.
- **Stop bar after clearance**: turn its lights off visibly in sequence and dim the bar to .35; otherwise viewers read "still red" during takeoff.
- **Typography orphans**: break definition lines by hand (`<br>`), never leave a two-letter word alone on a line.
- **Tab alignment**: tab `left:-3px; top:-49px` must match the 3 px band border or the join looks off.
- **Seek safety**: split-flap text set via `tl.set` must restore correctly when seeking backwards; test seek to the end and back to 4–5 earlier times, and make sure the CTA board is empty before the CTA.
- **Freeze detector false positives**: the small console dock and intentionally still cards trigger it; review those frames instead of adding motion noise.
- **Low-res webcams**: at `console` (scale .5, screen ~320 px wide) a small source looks soft under scanlines; keep the face recognizable, use `big`/`mid` for longer human moments.
- **Squelch masking**: placing the squelch on every phrase stepped on words; only use it where there is ≥ 0.2 s of silence.
- **Hypothesis vs fact**: the failure scene must be visibly framed (dashed amber frame + HYPOTHESIS tag) and must not crash/explode — it illustrates a risk, not an event.
- **Drop alignment**: verify the track's lift by RMS (50 ms windows) before trusting the catalog value; a 0.1 s miss on the approval word is audible.
- **Lint**: one `nested_structure_needs_subcomposition` warning per caption clip is expected; 0 errors is the gate.

## Variations

- **Ground stop / incident**: for postmortems, run it backwards — cleared traffic on radar, then a conflict, stop bar, all departures flip to DELAYED; payoff is the checklist that reopens the runway. Music `music:871`, less green, more red.
- **Checklist pre-flight**: replace the radar world with a cockpit checklist on cream strips (one item ticked per spoken step, `pen_write` per tick); good for "5 things before you ship".
- **Arrivals board**: for results/announcements, use ARRIVALS instead of DEPARTURES and land the plane (reverse takeoff, shadow converges) on the payoff; music `music:686` (epic reveal) or `music:187`.
- **Daylight tower**: same grammar with a dusk palette (`#0b1a24` sky, amber kept, phosphor swapped for a cyan scope `#5ce1ff`) for lighter topics; keep the monospace fonts and the radio captions so it stays recognizable.
