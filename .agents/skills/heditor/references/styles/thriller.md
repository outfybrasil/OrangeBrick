---
style: thriller
name: Thriller (security-camera disaster tape)
family: fixed-style
best_for: cautionary talks about risk, failure and recovery (backups, security, outages, "what if it breaks") told as found footage of a disaster
reference: produced by PycodeBR (Felipe Azambuja), October 2026
---
# Thriller (security-camera disaster tape)

The whole Reel plays as a recording pulled from a security camera. At the start the image is cold, green-tinted and noisy, with chromatic fringing, scanlines and a blinking `● REC`. A heartbeat raises the tension. Then the disaster the speaker describes happens to the footage itself: the picture liquefies, shorts out, and cuts to total black and silence with **NO SIGNAL** on screen. Recovery is a green terminal boot sequence. The camera powers back on like a CRT, now warm, sharp and in full colour. The video closes on a black end-of-tape film card. The core metaphor is "this is the tape of the day it all went wrong, and of how the speaker came back". The viewer experiences the risk in the edit before hearing the fix.

## When to use / when not to

**Use when** the speech has a clear *threat → failure → recovery* arc. Good fits are a speaker explaining why backups matter, what happens when a server goes down, a leaked password, a deleted database, or "if your laptop died today…". The style works best when one concrete disaster is named in the speech, such as water, fire, theft, a crash or a deleted file.

**Do not use** for upbeat tutorials, product launches, celebrations, calm explainers without a failure moment, or any topic where faking an emergency would mislead (real incidents, health, money advice). Do not use it when the face must stay on screen for the whole Reel: by design the camera disappears for a few seconds.

## Signature moves

- **Edge-to-edge CCTV monitor on black.** The camera is never a rounded card, never a PiP and never shrinks. It is a full-width monitor band that can vanish (black, NO SIGNAL, terminal) and return whole.
- **Diegetic HUD.** Blinking red `● REC` top-left, a camera ID top-right, white viewfinder corner brackets, scanlines and a rolling VHS tracking band. Status labels are CCTV captions *inside* the image (top-left, under REC), not section headers outside it.
- **The disaster happens to the image.** The named event deforms the whole frame. For water: an animated SVG displacement makes the picture melt and flow downward while the music goes underwater. For fire or short circuit: slice glitches, sparks, critical-failure blinking, and a real **tape stop** on the music.
- **Hard cut to total black + true silence (~0.4 s)**, then `NO SIGNAL` blinking, with the ECG flatlining in red.
- **Terminal boot as recovery.** Typed green monospace lines `> restoring … OK` follow the speech, then the camera **powers on like a CRT** (a horizontal line expands to the full picture), graded warm.
- **ECG heartbeat line** at the bottom as atmosphere. It is synced to heartbeat SFX: it speeds up under tension, turns erratic in the failure, goes flat red at NO SIGNAL, and calms down after recovery.
- **Film subtitles.** Lowercase Inter with no pill, phrase by phrase. One keyword per phrase blinks red ↔ white during threat beats and amber ↔ white during recovery beats.
- **Threat flashback.** Near the end, when the speaker warns the viewer, the CCTV look (REC, scanlines, heartbeat, muffled music) returns for a few seconds. A warm flash then snaps it back for the advice.
- **End-of-tape film card CTA.** `■ end of recording` slate, a thin centred question, a red rule, and the handle credit with an outlined Follow box that fills to Following.

## Frame and layout

Canvas 1080×1920, 30 fps, background `#000` with a faint radial `#07130d → #020504 → #000` behind the monitor.

| Element | Position (px) | Notes |
|---|---|---|
| Top safe area | y 0–270 | nothing |
| Hook title | x 60–1020, y 300–~410 | only during the cold open (0 → first cut), 48 px, 2 lines max |
| Monitor (camera) | x 0–1080, y 430–1233 (1080×803) | `overflow:hidden`, no border, no radius |
| REC / camera ID | 34 px from the monitor top, 46 px from the sides | JetBrains Mono 700, 40 px |
| Viewfinder corners | 22 px inset, 74×74, 5 px strokes | must not touch REC / ID |
| Status label | monitor-relative left 40, top 92 (abs. y ≈ 522) | never near the chin |
| Diagnostic panel | x 604–1050, monitor-relative y 34–550 (abs. ≤ 982) | over the background shelves, never over the face |
| Captions | x 110–970, y 1276–1486 | always on black |
| ECG strip | x 0–1000, y 1612–1752, opacity .55 | decorative only, left edge masked |
| Full-screen layers | NO SIGNAL at y 300; terminal at x 58, y 70+92·i inside the monitor; CTA card | |

Camera treatment:
- Source is `camera-hd.mp4` at 960 px (`rk.prepare_camera(work, width=960)`), shown `object-fit:cover` at 1080×803. Keep the face roughly at x 21–52 %, y 34–88 % of the monitor. All HUD stays in the top corners.
- Two graded variants from the same timeline (`rk.styled_camera`): `camera-cctv.mp4` (threat) and `camera-warm.mp4` (recovery). Swap them as separate clips with `data-media-start` equal to their timeline start, so lips stay in sync.
- Zoom lives on `#cam-zoom` (transform-origin = median tracked face): a slow surveillance push 1.00 → 1.05 during the hook; each EDL cut becomes a zoom jump (1.06 → 1.10 creep); 1.00 → 1.07 `sine.inOut` after recovery; 1.04 → 1.09 for the closing advice.
- Safe zones: nothing critical in the right 120 px between y 1000–1700 or in the bottom 350 px. The ECG is the only element there, and it is decorative.

## Palette and typography

| Role | Hex |
|---|---|
| Black / deep green-black | `#000000`, `#030806`, `#07130d` |
| Phosphor green (terminal, OK, ECG calm) | `#39ff88` |
| Off-white text | `#f5f7f5` |
| Alert red (REC dot, threat keyword, ≠, flatline) | `#ff3d57` |
| Recovery amber (hope keyword, recovery status) | `#ffd84d` |
| OK badge background | `#0f7a3c` |
| Slate grey (CTA slate) | `#c9d2cc` |
| Water tint / water flash | `rgba(40,160,200,.15→.45)`, `#9ff3ff` |
| Spark / warm return flash | `#e9fff2`, `#fff4dc` |

Fonts (google/fonts, OFL):
- **Inter** (variable, `ofl/inter/Inter-VF.ttf`): captions 600, hook 700/800, CTA question 300/700, credit 500.
- **JetBrains Mono** (variable, `ofl/jetbrainsmono/JetBrainsMono-VF.ttf`): HUD, status labels, NO SIGNAL, terminal, panel.
- HUD text gets an RGB-split shadow: `text-shadow:-2px 0 rgba(255,61,87,.6), 2px 0 rgba(57,255,200,.5), 0 2px 6px #000`.

Icons (Lucide, ISC): `triangle-alert`, `check`, `circle-check` via `rk.ensure_icons([...])`.

## Caption system

- **Look:** Inter 600, 80 px, line-height 1.1, `text-transform: lowercase`, colour `#f5f7f5`, heavy black shadow, centred in an 860 px box, `text-wrap: balance`. There is no pill and no box; it reads like a film subtitle on black.
- **Unit:** editorial phrases of ≤ 34 characters (≤ 2 lines), split at natural breath points. Do not chunk by a fixed 3 words. Each phrase enters with `y:10 → 0, opacity 0 → 1` over 0.12 s `power2.out` and leaves with a hard cut.
- **Keyword:** at most one per phrase, chosen editorially (the noun or verb that carries the threat or the fix). At the word's start minus 0.03 s it goes colour → white (+0.10 s) → colour (+0.20 s) and stays coloured. Use **red `#ff3d57`** in threat, failure and flashback beats, and **amber `#ffd84d`** in recovery and advice beats.
- **Timing:** start = first word − 0.05 s, end = last word + 0.28 s, clipped to the next phrase start − 0.05 s. **No caption may cross the blackout cut**: clip it at the cut.
- **Contrast spec:** every caption sits on pure black, so white, red and amber all pass. Check enlarged crops of a red and an amber keyword anyway. Never put dark text on mid colours, and never use dark outlines on dark letters.
- Caption tokens must equal the spoken words (shared quality gate): mark keywords with `*` in the editorial phrase list and assert the tokens match.

```python
PHRASES = ['why does it matter', 'if you only had one *copy?', ...]   # editorial, * = keyword

def group_words(words, phrases, blackout, voice_end):
    out, i = [], 0
    for n, ph in enumerate(phrases):
        toks = ph.split(); g = words[i:i+len(toks)]
        assert [w['word'] for w in g] == [t.lstrip('*') for t in toks], ph
        key = next((j for j, t in enumerate(toks) if t.startswith('*')), None)
        out.append({'id': f'cap-{n}', 'words': g, 'key': key}); i += len(toks)
    assert i == len(words)
    for n, c in enumerate(out):
        s = max(0.0, c['words'][0]['start'] - .05, out[n-1]['end'] if n else 0)
        e = c['words'][-1]['end'] + .28
        if n + 1 < len(out): e = min(e, out[n+1]['words'][0]['start'] - .05)
        e = min(e, voice_end)
        if s < blackout < e: e = blackout
        c.update(start=round(s, 4), end=round(e, 4), text=' '.join(w['word'] for w in c['words']))
    return out
```

```js
// per caption c (id, start, end, key, keyword start ks, hope = recovery beat?)
if (c.start <= .05) gsap.set(sel, {opacity:1, visibility:'visible'});   // first frame
S(sel, {opacity:1, visibility:'visible'}, c.start);
if (c.start > .05) FT(sel, {y:10, opacity:0}, {y:0, opacity:1, duration:.12, ease:'power2.out'}, c.start);
const col = hope ? '#ffd84d' : '#ff3d57', t = Math.max(c.start, ks - .03);
S(kw, {color:'#f5f7f5'}, c.start); S(kw, {color:col}, t);
S(kw, {color:'#ffffff'}, t + .10); S(kw, {color:col}, t + .20);
S(sel, {opacity:0, visibility:'hidden'}, c.end);
```

## Scene grammar

Map the speech onto five acts. Timings come from the word finder (`f = rk.finder(words)`), never from fixed seconds.

1. **Cold open / hook (0 → first EDL cut, ~2–3 s).** CCTV look is visible on frame 0, with the caption already on screen, a `trailer_hit` and a heartbeat. The hook title restates the risk as a question (e.g. "your important file / has **only one copy?**"). It flickers (opacity 1 → .45 → 1 a few times) and shakes ±7 px on the risk word, then fades 0.14 s before the first cut.
2. **Problem / setup (named object).** A CCTV status label names the object at risk (`● work laptop`) in green, with a blinking dot. The viewfinder corners flash red on the object word. The heartbeat speeds up in pauses and a `cymbal_swell` builds toward the disaster word.
3. **Disaster (on the disaster word, 1–2.5 s).** The image suffers the event. Water liquefies the world (see Implementation), with a blue tint, `water_splash`, and muffled music. Fire, burn or crash triggers 3–4 glitch bursts of 5–6 slices, sparks at 0/+0.27/+0.58 s, a `critical failure` label blinking every 0.16 s, radio-filtered music, then a real tape stop over the last 0.45 s while the picture dims to `brightness(.55) contrast(1.4)`.
4. **Blackout → NO SIGNAL → boot (≤ ~6 s total).** A hard cut to `#000` at the end of the disaster sentence (+0.03 s). Leave **~0.4 s of complete silence**, then `NO SIGNAL / camera disconnected` with a `data_beep`, the ECG flat red, and blinking every 0.36 s. When the speaker starts describing the recovery, type terminal lines, one per spoken step (`> starting another machine…`, `> restoring projects… OK`, `> reinstalling tools… OK`, `> reconnecting camera… OK`). `OK` badges pop on the word that completes each step.
5. **Turn / explanation (camera returns warm).** CRT power-on, warm grade, music drop. If the speech makes a distinction (e.g. version control ≠ full backup), a translucent diagnostic panel slides in from the right over the background. Two headed columns are separated by a big red `≠`, and rows get a ✓ exactly when each item is spoken. The panel exits right (`expo.in`, 0.32 s) when the speaker moves on, followed by a status `✓ system restored`.
6. **Threat flashback (the warning sentence, ~3 s).** CCTV clip, scanlines, REC and tracking come back. Status `single copy = risk` in red, a heartbeat every 0.5 s, a glitch on the most negative word, and lowpassed music.
7. **Payoff / advice.** A warm flash (`#fff4dc`, peak .75, 0.35 s) plus `trailer_hit` returns to the warm camera. An amber status states the fix (`✓ another copy, off this machine`).
8. **CTA (4.5–5 s after the voice).** A hard cut to the film card.

## Transitions and motion vocabulary

- **Cut → zoom jump:** `S('#cam-zoom',{scale:1.06},cut)` plus a 2-slice glitch (amp .4) at cut − 0.03 s. In warm sections, hide awkward EDL cuts with the same short glitch.
- **Tracking band:** a 120 px gradient strip with `mix-blend-mode:screen` scrolls y 0 → 1080 over 1.5 s every 1.9 s. The loop is finite and only runs in CCTV sections.
- **REC blink:** every 0.5 s; status dots every 0.4 s; NO SIGNAL every 0.36 s; terminal cursor every 0.36 s.
- **Liquefy:** displacement scale 0 → 60 (0.32 s `power2.out`) → 26 (0.45 s `sine.inOut`) → 42 (0.4 s). Noise offset dy 0 → 520 over the disaster (`none`), so the picture *flows down*.
- **Slice glitch:** 5–6 steps of 0.034 s; the rig jumps x ±22·amp and skewX ±4.5°·amp, and 7 bars (invert/hue/red) reposition each step.
- **Blackout:** a single `set` with no fade. The opposite move is a **CRT on**: `scaleY .006 → 1` in 0.24 s `expo.out` from the centre, plus `brightness(2.1) saturate(0) → normal` in 0.45 s.
- **Panel:** in from x+470 in 0.3 s `expo.out`; `≠` scale 2.2 → 1 in 0.16 s `power4.out`; ✓ icons `back.out(3)`.
- **Flash:** water `#9ff3ff` .25/0.3 s; return `#fff4dc` .75/0.35 s.
- **Grain:** `grain.png` at opacity .09 with overlay blend, stepped at 15 fps (`steps(D*15)`).
- **Do not use** slides, wipes, bouncy pops on the camera, or confetti. Everything is either a cut or a "signal" event (glitch, CRT, flash).

## Sound design

Voice comes first. `rk.mix` targets music ≈ 21.5 dB under the voice median, background p95 ≥ 12 dB under the voice, and −14 LUFS. Silence is a feature here: protect the blackout gap from every bed and SFX tail.

| Action | Category | Gain (dB) | Length (s) |
|---|---|---|---|
| Frame 0 impact | `trailer_hit` | −12 | 1.2 |
| Heartbeat (hook, pauses, flashback, CTA) | `heartbeat` | −10 … −18 (rate 1.15 when racing) | 0.6–2.7 |
| Cut as surveillance jump | `camera_shutter` | −18 | 0.35 |
| Viewfinder locks on object / ✓ | `lock_click` | −18 … −20 | 0.4 |
| Build to disaster (starts −0.6 s) | `cymbal_swell` | −20 | 1.25 |
| Water hit / water flow | `water_splash` / `water_pour` | −11 / −19 | 1.45 / 1.0 |
| Short circuit, sparks, flashback | `glitch` | −13 … −16 | 0.3–0.45 |
| Tape slowing (−0.45 s before black) | `tape_stop` | −18 | 0.42 |
| Screen off (−0.06 s before black) | `click` | −13 | 0.08 |
| NO SIGNAL / OK lines | `data_beep` | −17 … −20 (rate .8 for NO SIGNAL) | 0.3 |
| Terminal typing | `typing_fast`, `keyboard` | −20 / −21 | 0.4–1.0 |
| CRT on / camera back | `magic_transition` | −15 | 1.0 |
| `≠` lands | `stamp` | −15 | 0.42 |
| Items ✓ | `success_chime`, `data_beep` | −17 … −19 | 0.35–0.6 |
| Thinking pause | `robot_processing` | −21 | 0.8 |
| System restored | `progress_complete` | −15 | 1.2 |
| Turn to conclusion | `whoosh` | −20 | 0.6 |
| Warm return / cut to CTA card | `trailer_hit` | −11/−12 | 1.1–1.6 |
| Credit / Follow click / confirm | `swipe`, `mouse_click`, `success_chime` | −20 / −14 / −17 | 0.3–0.8 |

**Music: two tracks, one per world.**
- Tension: `music:597` (Vertigo, stealthy), or `music:871` (Fright Night) or `music:568` (Focus on Yourself). Skip the silent intro of the file (`src` ≈ 5.0 s for 597).
- Recovery: `music:955` (I Believe 2, emotional piano), or `music:31` (Dreaming Big) or `music:187` (Mountains).

Section plan (times from the keys):

| Section | Mode | Gain |
|---|---|---|
| 0 → disaster word − 0.05 | tension `full` | −4.5 |
| water beat | tension `muffled` | −2 |
| fire / short beat | tension `radio` | −3 |
| last 0.45 s before black | generated tape-stop WAV `full` | −1 |
| blackout → boot start | `silence` | — |
| boot (first restore word − 0.45 s) → camera back | recovery `full`, fade_in 0.5 | −2 |
| camera back → flashback | recovery `full` | 0 |
| flashback | recovery `lowpass` | −2 |
| advice → end | recovery `full`, fade_out 1.2 | 0, `cta_boost_db: 4` |

**Drop placement:** choose the recovery track's `src` so its measured energy jump (`drop_s`) lands exactly on the CRT power-on: `src = drop_s − (camback − boot_start)`. If the first mix fails the p95 gate under loud tension passages, lower the tension sections (the reference needed −4.5/−2/−3).

## CTA design inside the style

A black end-of-tape card, cut in hard with `trailer_hit`. Duration 4.5–5 s.
- **Slate** at y 330: a red 24 px square followed by `end of recording` in JetBrains Mono 700, 34 px, letter-spacing 6, `#c9d2cc`. It flickers twice (+0.30/+0.62 s).
- **Question** at x 90–990, y 520: Inter 300, 66 px, line-height 1.24, 3 lines each fading up 0.28 s, 0.22 s apart. The last word is bold red (e.g. "could you recover your work / if you lost this machine / **today?**"). The whole block creeps scale 1 → 1.035.
- **Red rule** 140×3 at y 850, `scaleX 0 → 1` 0.4 s `power3.out` (+1.1 s).
- **Credit** at y 900: `assets/logo.png` at 92 px plus `@handle` in Inter 500, 58 px, letter-spacing animating 2 → 9 px over 1.2 s (+1.25 s).
- **Follow box** 420×100 at x 330, y 1060: a 3 px white outline with `FOLLOW` in Inter 600, letter-spacing 10. At +2.53 s it presses (scale .95); at +2.6 s a white fill wipes in (`scaleX`, 0.22 s) and the text swaps to black `✓ FOLLOWING`, with `mouse_click`, a final heartbeat and `success_chime`. The red word blinks white 3×.
- The ECG stays visible in white with one last beat.

## Implementation notes

Build with reelkit: `setup_assets`, `ensure_icons`, `prepare_camera`, `styled_camera`, `load_words`, `finder`, `track_faces` (face origin), `mix`. Write custom code for the page HTML/CSS/JS, the phrase captions, the ECG path and the tape-stop audio. The default `rk.page` skeleton (camera card) is the wrong shape for this style.

```python
CCTV_VF = ("eq=contrast=1.14:brightness=0.035:saturation=0.32,"
           "colorbalance=rs=-0.12:gs=0.07:bs=0.02:rm=-0.10:gm=0.08:bm=-0.02:rh=-0.05:gh=0.05,"
           "curves=green='0/0.05 0.5/0.57 1/0.97',rgbashift=rh=-5:bh=5:rv=1,noise=alls=14:allf=t,"
           "vignette=angle=PI/5")
WARM_VF = ("eq=contrast=1.06:brightness=0.03:saturation=1.22,"
           "colorbalance=rs=0.10:gs=0.03:bs=-0.10:rm=0.08:gm=0.02:bm=-0.08:rh=0.04:bh=-0.05,"
           "unsharp=5:5:0.6:5:5:0")
rk.styled_camera(work, 'cctv', CCTV_VF); rk.styled_camera(work, 'warm', WARM_VF)
```

```html
<!-- liquefy filter, applied to #world only during the water beat -->
<svg width="0" height="0" style="position:absolute"><defs>
 <filter id="liquid" x="-10%" y="-60%" width="120%" height="220%" color-interpolation-filters="sRGB">
  <feTurbulence id="liq-turb" type="fractalNoise" baseFrequency="0.004 0.018" numOctaves="2" seed="13" result="n"/>
  <feOffset id="liq-off" in="n" dx="0" dy="0" result="n2"/>
  <feDisplacementMap id="liq-disp" in="SourceGraphic" in2="n2" scale="0" xChannelSelector="R" yChannelSelector="G"/>
 </filter></defs></svg>
```

```js
S('#world',{filter:'url(#liquid)'},K.water-.03);
FT('#liq-disp',{attr:{scale:0}},{attr:{scale:60},duration:.32,ease:'power2.out'},K.water-.02);
TO('#liq-disp',{attr:{scale:26},duration:.45,ease:'sine.inOut'},K.water+.32);
FT('#liq-off',{attr:{dy:0}},{attr:{dy:520},duration:K.burn-K.water+.2,ease:'none'},K.water-.02);
FT('#liq-turb',{attr:{baseFrequency:'0.004 0.018'}},{attr:{baseFrequency:'0.009 0.04'},duration:K.burn-K.water},K.water);
TO('#liq-disp',{attr:{scale:0},duration:.12},K.burn); S('#world',{filter:'none'},K.burn+.13);

// slice glitch: seeded, bars only above the eyes / below the mouth
const bars=[...document.querySelectorAll('.gbar')];   // .inv{backdrop-filter:invert(1) hue-rotate(90deg)} .hue{…} .red{…}
function glitch(t,n,amp){for(let i=0;i<n;i++){const tt=t+i*.034;
  S('#cam-rig',{x:(rnd()-.5)*amp*44,skewX:(rnd()-.5)*amp*9},tt);
  bars.forEach(b=>{const r=rnd();S(b,{top:r<.5?r*400:K.belowFace+(r-.5)*280,height:6+rnd()*30,
    x:(rnd()-.5)*140,opacity:rnd()<.45?1:0},tt);});}
  S('#cam-rig',{x:0,skewX:0},t+n*.034);S('.gbar',{opacity:0},t+n*.034);}

// blackout and CRT power-on
S('#blackout',{opacity:1},K.blackout); S(['#scan','#hud','#track'],{opacity:0},K.blackout);
S('#blackout',{opacity:0},K.camback-.02);
S('#cam-rig',{scaleY:.006,transformOrigin:'50% 50%'},K.camback-.02);
TO('#cam-rig',{scaleY:1,duration:.24,ease:'expo.out'},K.camback);
FT('#cam-zoom',{filter:'brightness(2.1) saturate(0)'},{filter:'brightness(1) saturate(1)',duration:.45},K.camback);

// terminal line typed with steps(n) on a ch-width mask
FT('#t1 .tx',{width:0},{width:n+'ch',duration:.8,ease:'steps('+n+')'},t);
FT('#t1 .ok',{opacity:0,scale:1.4},{opacity:1,scale:1,duration:.12},tOk);
```

ECG: build one long SVG path in Python and translate it left at a constant 220 px/s (`TO('#ecg-path',{x:-220*D,duration:D,ease:'none'},0)`). Each beat at time t is drawn at `x = 960 + 220·t` with a P-QRS-T shape `[(-34,0),(-24,-6),(-16,0),(-6,7),(0,-52a),(6,22a),(12,0),(26,-9),(40,0)]` around a baseline at y 70. Beat spacing goes from 0.62 s down to 0.42 s during the hook, becomes irregular (amp 0.5–1.6) in the failure, 1.0 s during recovery, 0.5 s in the flashback and 0.9 s at the end. Swap the stroke colour: red in failure and flashback, green otherwise, white on the CTA. At NO SIGNAL, hide the path and show a 3 px red `#ecg-flat` line with glow.

Tape stop on the real music, as a generated WAV used as a `full` section:

```python
import subprocess, wave, numpy as np
def tape_stop(src_mp3, at, out, dur=.45, sr=48000):
    raw = subprocess.run(['ffmpeg','-v','error','-ss',str(at),'-t','1.2','-i',src_mp3,'-f','f32le',
                          '-ac','2','-ar',str(sr),'-'], capture_output=True, check=True).stdout
    x = np.frombuffer(raw, '<f4').reshape(-1, 2); n = round(dur*sr); tt = np.arange(n)/n
    pos = np.clip(np.cumsum((1-tt)**1.6*.92+.08), 0, len(x)-2)        # speed 1.0 → 0.08
    y = np.column_stack([np.interp(pos, np.arange(len(x)), x[:, c]) for c in (0, 1)])
    y *= np.linspace(1, .55, n)[:, None]
    with wave.open(out, 'wb') as o:
        o.setnchannels(2); o.setsampwidth(2); o.setframerate(sr)
        o.writeframes((np.clip(y, -1, 1)*32767).astype('<i2').tobytes())
```

Determinism: use only the seeded `rnd()` (LCG seeded from `K.seed`). Loops (tracking band, blinks) must be finite `for` loops of `set`/`fromTo`, never `repeat:-1`. Grain is a stepped tween. Expose every key time (`agua/burn`, `blackout`, `nosignal`, `camback`, `flash_in`, `flash_out`, `voice_end`) in `window.K` so the page JS and the audio plan share one source of truth.

## Pitfalls found in production

- **The first frame rendered dark.** Seeking to 0 did not apply timeline `set`s at t=0, so the hook title and first caption were invisible on frame 0. Add an explicit `gsap.set(...)` for everything visible at 0.
- **Glitch bars crossed the eyes.** Restrict bars to bands above the eyes and below the mouth, computed from the face track, and keep them thin (6–36 px).
- Viewfinder corners collided with REC and the camera ID. Status labels placed low touched the chin. Fix: keep all HUD in the top 15 % of the monitor.
- **A red alert label on dark green read poorly.** Alerts are white text on 88 % black with an 8 px red left bar; red is reserved for the icon and dot.
- The hook title sat flush against the monitor. Keep ≥ 20 px of black between them and the title's first bright pixel at y ≥ 300.
- **The first CCTV grade was too dark** for the face to read. Brighten the grade instead of lowering the overlays.
- **The template trap:** a reduced camera window with boxes underneath, plus section headers above, made the cut look like every other style. The camera must stay full width; information goes *on* the image (panel over the background, labels inside the CCTV) or onto full-screen black.
- A slow fade into the CTA killed the tension. Use a hard cut with an impact.
- **Silence leaks.** Check that no SFX tail or music fade enters the ~0.4 s blackout gap: end the screen-off click before the cut and start the NO SIGNAL beep after it.
- The first mix failed the background p95 gate under the tension bed. Lower the tension sections rather than raising the voice.
- **Render cost:** the SVG filter on `#world` and the `backdrop-filter` glitch bars are the most expensive frames and the most likely to differ between preview and render. Check them in the final MP4, not only in previews. Temporal noise baked into the CCTV clip makes it large; re-encode with a higher CRF if rendering is slow.
- The freeze detector flags the blackout, NO SIGNAL and terminal seconds. That is expected: verify those frames by vision and treat the flag as advisory.
- If a QA script rejects digits not present in the speech, render the decorative camera ID through CSS (`#camid::after{content:attr(data-label)}`) and keep every other on-screen number spoken.
- Lint reports `nested_structure_needs_subcomposition` once per caption clip. This is the same harmless pattern as the kit's captions, and lint still has 0 errors.

## Variations

- **Different disaster, different deformation:** fire → heat-haze displacement (horizontal `baseFrequency`, upward dy) with an orange tint and `glass_crack`; theft → a hand-held CCTV shake, then the camera *disappears* from the frame and leaves an empty chair; account hack → a red `glitch` takeover with the terminal typing on its own; server outage → rows of `CAM 01–04` tiles that go NO SIGNAL one by one.
- **Night-vision variant:** a monochrome green grade (`hue=s=0`, `colorchannelmixer` into green) for the threat, and a clean daylight grade for recovery. The keyword colour stays red/amber.
- **Countdown thriller:** when the speech gives a deadline, replace the ECG with a timecode / countdown strip in JetBrains Mono, and replace the tape stop with `clock_tick` → `alarm_short`.
- **Calm aftermath:** for reflective endings, skip the flashback. After the CRT return, keep a slow push and let the recovery piano carry the advice. The CTA card question can be amber instead of red.
