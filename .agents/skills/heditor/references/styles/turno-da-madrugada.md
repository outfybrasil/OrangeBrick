---
style: turno-da-madrugada
name: Turno da madrugada (night shift in a control room)
family: fixed-style
best_for: authority family (serious tone, the speaker as the expert); talks about long-running processes, reliability, automation that must not stop, monitoring, on-call work or "leave it running overnight"; organic Reels with a comment question and Follow
reference: produced by the PycodeBR team with heditor, Oct 2026
---
# Turno da madrugada (night shift in a control room)

The Reel is the wall of a critical-infrastructure operations room during the night shift. The expert is on the **main monitor** (dark steel frame, sober grade, a discreet true name strip with an LED). Below it: an analogue **wall clock without numerals** (elapsed-time arcs, a moon or sun icon), an **annunciator panel** of engraved windows (off = normal, flashing = new alarm, steady = acknowledged), a **process line** with nine valves where a desaturated cyan flow advances, locks amber when it stops and closes green at the end, and a tall window at the top where the sky runs from night to dawn. Colour is used only with meaning (high-performance HMI principle, ISA-101): greys everywhere, amber for attention as the single accent, cyan for live data, green for done, red only for "outside the protocol". The process stops in the hook (a two-step blackout, an amber beacon sweeping the wall), the command that fixes it lights a "CONTINUOUS MODE" window, a time-lapse runs through the night, and at dawn the line reaches the end in green: "TASK COMPLETE". The CTA is the **shift handover**. The core metaphor: **the work keeps running while everyone sleeps, and the shift ends with the job done**.

## When to use / when not to

Use it when the speech:
- is about something that stops in the middle and a way to keep it running (long tasks, background jobs, retries, persistence);
- mentions night, sleep, leaving it running, coming back later;
- has an honest limit ("unless the power goes down") that can be an out-of-protocol alarm.

Avoid it when:
- the topic is fast, playful or visual (the control room is deliberately austere);
- there is no process or time idea;
- the batch already has a dark terminal (`mesa-de-risco`), a control tower (`aeroporto`), CCTV (`thriller`) or a code editor (`ide`): avoid radar, flights, tickers, REC, scanlines and code comments here.

## Signature moves

1. **Frame-0 hook on the panel**: a question-like headline already assembled ("YOUR AGENT STOPPED AGAIN?"), the process line running, the night window; a low impact.
2. **Elapsed-time arc**: the clock draws a short amber arc for a spoken duration ("5 MIN" label that disappears when the hands start running).
3. **Process interrupted**: the flow freezes with an amber lock, room lights drop in two steps, an amber beacon sweeps the wall twice, the "PROCESS STOPPED" window flashes; music cuts; a synthesised power-down and a muffled low siren; a breaker brings the lights back.
4. **Console page**: the command typed in lower-case mono with a short didactic definition ("persistent goal: the agent works across several turns until it reaches it"); the process line stretches ("LONG TASK"); the clock spins on "hours running"; a prompt block fills line by line.
5. **Continuous mode**: silence, then the window "CONTINUOUS MODE <command>" lights steady; an impact strip over the torso states the rule in the speaker's words; a padlock on the window on "no way".
6. **Automatic resume**: the flow chokes (a valve flashes amber), then "AUTOMATIC RESUME" lights and the flow continues.
7. **Night mode**: the room darkens, the image cools, a "NIGHT" label on the monitor, the window shows the moon; a phone icon sends "demand" to the console; the rule assembles from chips ("<command> + prompt · IN THIS ORDER").
8. **Time-lapse to dawn**: hands race, the sky turns pre-dawn blue, valves light in sequence.
9. **Flashback**: the monitor switches to a monochrome variant, "PROCESS STOPPED" flashes with "WITHOUT <command>" (closes the hook).
10. **Payoff at dawn**: impact strip with the rule; warm sky, "DAWN" label, the line reaches the end in green, "TASK COMPLETE", the clock shows a sun.
11. **The only red**: the honest limits the speaker names (power, internet) light red windows, plus a short note "OUTSIDE THE PROTOCOL · also <other limits>".

## Frame and layout

Canvas 1080×1920, 30 fps. Organic safe zones.

```
y 0–270      tall window with vertical mullions; night → pre-dawn → dawn sky: no text
y 300–1000   MAIN MONITOR: dark steel frame 908×700 (x 86–994), screen 880×654 (y 312–966) with the camera; name strip + LED on the frame
y 836–952    impact strip over the torso (only on the central lines; zebra for the alarm, dark with an amber filament for theses)
y 1016–1190  panel: wall clock (x 64–234) + page area (x 252–960): HOOK · ANNUNCIATOR (6 windows) · CONSOLE
y 1206–1420  message line (caption)
y 1440–1545  process line x 70–950 (9 valves), labels "TASK" and "END"
y > 1570     console desk edge with tiny LEDs; right edge (x > 960, y 1000–1700) atmosphere only
```

Camera movements: cut zoom 1.0/1.05 on pause cuts, slow push-in on explanations and the night, dry punch-ins (1.07) on the two central lines; the face always clear (impact strips stay on the torso, y ≥ 846). Two ffmpeg variants of the camera: sober grade and monochrome for the flashback. In the CTA the monitor redraws itself into the handover screen.

## Palette and typography

| Role | Hex |
|---|---|
| Room greys | `#07090c` (background), `#0e1216` (wall), `#151a1f` (surfaces), `#232a31` (borders) |
| Text / secondary | `#e8ecef` / `#8b949c` |
| Attention (single accent) | amber `#ffb21c`; active word block `#ffcf4a` |
| Live data (flow only) | desaturated cyan `#5fb8c6` |
| Done | green `#39d98a` |
| Outside the protocol | red `#ff4d3d` |

No decorative gradients, no 3D, no gratuitous motion; state is never conveyed by colour alone (always text + shape). Fonts (OFL): **Barlow Condensed** ExtraBold/Bold/SemiBold/Medium and **Barlow** Medium (DIN-like industrial signage; google/fonts, not in the kit: ship the OFL.txt), **IBM Plex Mono** Bold only for commands. Icons: Lucide (`moon`, `sun`, `smartphone`, `lock`, `zap-off`, `wifi-off`, `check`, `pointer`, `message-circle`, `rotate-cw`, `power`).

## Caption system

"Message line": panel `#0a0d11` at x 60, y 1210, 900 × 212, radius 8, 2 px border `#1d242b`, a tiny engraved label at the top-left; text in **Barlow Condensed ExtraBold 80 px** uppercase, `#e8ecef`, line-height 1.16, up to 2 lines, groups of up to 4 words.

- Active word: **a lit annunciator window**: black text on `#ffcf4a` with a soft glow, radius 7, padding `2px 10px 0`.
- Commands keep their real form: lower case, IBM Plex Mono, 0.8 em.
- At the end of the CTA the line shows "✓ SHIFT CLOSED" in grey with a green check.

```css
#msg{position:absolute;left:60px;top:1210px;width:900px;height:212px;z-index:7;border-radius:8px;background:#0a0d11;border:2px solid #1d242b}
.capw{position:absolute;left:60px;top:1210px;width:900px;height:212px;z-index:8;display:flex;align-items:center;justify-content:center}
.cap{width:860px;text-align:center;font-family:BCX;font-size:80px;line-height:1.16;text-transform:uppercase;color:#e8ecef}
.cap .w{display:inline-block;padding:2px 10px 0;margin:0 1px;border-radius:7px}   /* active: #ffcf4a + glow, color #000 */
.cap .w.cmd{font-size:.8em;padding-top:6px;text-transform:none;font-family:Plex}
```

## Scene grammar

Generic example: a speaker explaining a command that keeps an AI agent working across turns until the task is done, how they use it before going to sleep, and the honest limits (power or network loss, provider limits).

| Beat | Panel page | What happens |
|---|---|---|
| Hook | HOOK | Headline already assembled; flow running; night window; low impact + music pulse. |
| Spoken duration | — | Clock arc + "5 MIN"-style label (only the spoken number). |
| "It stopped" | ANNUNCIATOR | Freeze + amber lock; two-step blackout; beacon; PROCESS STOPPED flashes; music cut; power-down + siren. |
| Pause | CONSOLE | Breaker: lights back. |
| What the command is | CONSOLE | Command typed + definition; line stretches; clock spins; prompt block fills. |
| Build-up | ANNUNCIATOR | Slow push-in; riser into a 0.5 s music silence. |
| The command | — | CONTINUOUS MODE window steady; music back full. |
| Central line | impact strip | Rule in the speaker's words; punch 1.07; sub drop in the pause; padlock. |
| Interruption handled | — | Valve flashes; AUTOMATIC RESUME; flow continues; power-up. |
| How they use it | CONSOLE (night) | Night mode; phone sends the demand; rule chips assemble "IN THIS ORDER". |
| Overnight | — | Time-lapse: hands race, sky to pre-dawn, valves light. |
| Flashback | — | Monochrome monitor; PROCESS STOPPED flashes; "WITHOUT <command>"; music low-passed; tape stop. |
| Payoff | impact strip | Silence + riser → rule strip, flash; epic track drops; dawn; TASK COMPLETE; sun. |
| Honest limit | ANNUNCIATOR | Two red windows for the spoken failures (flash, then steady) + the out-of-protocol note. |
| CTA (6 s) | monitor redraw | SHIFT HANDOVER: question, "Tell us in the comments", logo + handle, an industrial amber button that sinks and lights green (Following); message line "✓ SHIFT CLOSED". |

Rules: no unspoken numbers (the clock has no numerals; a spoken duration may appear); no third-party logos; the command is shown as the speaker uses it, with a note in the post caption that other tools name it differently; simplifications ("it never stops") keep the speaker's own caveat on screen.

## Transitions and motion vocabulary

- **Relay page cut**: a vertical `clip-path` wipe of 0.16 s with a relay click.
- **Two-step blackout**: room brightness 1 → .45 → .15 (0.08 s each), back with the breaker.
- **Amber beacon**: a 620 px soft amber cone sweeping the wall (`x 0 → 1500` in 0.36 s, linear, twice), above the background and below the monitor.
- **Impact strip**: slides in from the left (0.18 s `power3.out`); zebra (amber/black diagonal stripes) for the alarm, dark with an amber filament for theses.
- **Time-lapse**: clock hands rotate several turns (1.6 s `power2.inOut`), sky gradient tween, valves light with 0.08 s stagger.
- **CTA redraw**: the monitor content wipes out top-to-bottom and the handover screen draws in (borders by `stroke-dashoffset`).

## Sound design

| Action | Category | gain_db | length |
|---|---|---|---|
| Frame 0 | `bass_impact` | −13 | 0.6 |
| Relays (page cuts, windows) | `relay` (synth) | −24 to −21 | 0.12 |
| Clock | `clock_tick` | −29 to −24 | 0.3–0.6 |
| Stop | `power_down` (synth) + `siren` (synth, muffled) | −15 / −22 | 1.0 / 1.4 |
| Annunciator alarms | `ann_alarm` (synth) | −27 to −24 | 0.42 |
| Lights back | `breaker` (synth) | −21 to −13 | 0.6 |
| Typing | `keyboard`, `typing_fast` | −25 / −28 | 0.5 |
| Definition / data | `data_beep` | −28 | 0.2 |
| Moves | `whoosh` | −22 to −18 | 0.4 |
| Time-lapse | `fast_forward` | −25 to −23 | 0.8 |
| Build-ups | `riser` | −21 | 0.8 |
| Central lines (gaps) | `trailer_hit`, `sub_drop` | −13 to −11 / −15 | 1.0 / 0.8 |
| Padlock | `lock_click` | −18 | 0.3 |
| Choke / resume | `glitch` (low) / `power_up` | −25 / −22 | 0.4 |
| Phone send / chips | `message_sent`, `click` | −24 / −26 to −22 | 0.2–0.3 |
| Flashback | `tape_stop` | −22 | 0.4 |
| Task complete | `progress_complete` + `success_chime` | −19 / −21 to −15 | 0.6 / 0.8 |
| CTA button | `mouse_click`, `pop` | −21 to −14 / −21 | 0.2 |

Synthesised (numpy, deterministic): **power_down** = a hum falling from 152 Hz to 32 Hz with 2nd/3rd harmonics + a low-passed click; **breaker** = a 62 Hz thump + a short metallic ring (1830/2710 Hz) + a double click; **siren** = two slow tones (520/392 Hz, square-ish) low-passed twice at 900 Hz (muffled, behind a wall); **relay** = two 5 kHz-filtered clicks 18 ms apart + a 900 Hz ping; **ann_alarm** = a double 740 Hz beep with an octave, low-passed at 2.4 kHz.

**Music:** two tracks. Body: `music:568` (Focus on Yourself, tense pulsing electronic that grows slowly, "the process that runs all night") — `full` from 2 s, **silence** at the blackout, `lowpass` from 8 s under the explanation, a short silence before the command, `full` from 120 s of the file (its densest stretch), `lowpass` for the flashback, silence before the payoff. Payoff and CTA: `music:686` (Epical Drums 06) from its drop at 28 s of the file, −3 dB, 1 s fade, `cta_boost_db` 5. Alternatives: `music:597` (stealthy tension) for the body, `music:677` for the payoff.

```json
[{"start":0,"end":"STOP","mode":"full","gain_db":-2,"track":"A","src":2.0,"fade_in":0.02,"fade_out":0.05},
 {"start":"STOP+0.5","end":"COMMAND-0.6","mode":"lowpass","gain_db":0,"track":"A","src":8.0,"fade_in":0.25,"fade_out":0.08},
 {"start":"COMMAND","end":"FLASHBACK","mode":"full","gain_db":-1,"track":"A","src":120.0,"fade_in":0.02,"fade_out":0.15},
 {"start":"FLASHBACK","end":"PAYOFF-0.25","mode":"lowpass","gain_db":-3,"track":"A","src":"t+(120-COMMAND)","fade_in":0.1,"fade_out":0.08},
 {"start":"PAYOFF","end":"DURATION","mode":"full","gain_db":-3,"track":"B","src":28.0,"fade_in":0.02,"fade_out":1.0}]
```

## CTA design inside the style

The monitor redraws itself into "SHIFT HANDOVER": the question, "Tell us in the comments", the brand logo and handle, and an industrial amber Follow button that is pressed (a pressure ring, the button sinks, no hand icon) and lights green as "Following ✓". The message line closes with "✓ SHIFT CLOSED". ≥ 6 s after the last word. Button words come from `brand.json` as written; upper case only via CSS.

## Implementation notes

- Camera variants:
  ```python
  GRADE_VF = "eq=contrast=1.07:saturation=0.86:brightness=-0.012,colorbalance=bs=0.035:bm=0.015:rh=0.015:rm=0.01"
  MONO_VF = "format=gray,eq=contrast=1.12:brightness=-0.03,format=yuv420p"
  rk.styled_camera(work, "grade", GRADE_VF); rk.styled_camera(work, "mono", MONO_VF)
  ```
- Annunciator windows: a 3 × 2 grid of engraved rectangles (Barlow Condensed SemiBold, letter-spaced); states via classes `off`, `flash` (steps opacity loop), `on`; amber, green or red fill only when lit.
- Process line: an SVG path with 9 valve symbols; the flow is a dashed cyan stroke animated by `stroke-dashoffset`; the lock is an amber badge on the stuck valve.
- Run `asr_window`-style helper scripts with the heditor Python (`$HEDITOR_PY`), not the system Python (faster-whisper is in the venv).

## Pitfalls found in production

- **HUD look**: too many decorative labels ("MAIN MONITOR", "MESSAGES") made vision call it a generic game HUD; remove them and make the speaker's name strip clearer.
- **The moon lit pixels in the top margin**: darken it.
- **A label stayed on screen the whole video** ("5 MIN"): remove it when the hands start running.
- **The last valve went past x 960**: shorten the line to ~866 px.
- **Upper-cased button text** failed the CTA test: keep `brand.json` text in the HTML.
- **ASR hears commands as words** (a slash command heard as a football "goal"): not masking; note it for review.
- **Large contact sheets time out the vision model**: review two-frame strips (432 × 768).
- **Synthesised siren under speech**: keep it at −22 dB or lower and list it for listening.

## Variations

- **Server room at noon**: same grammar in daylight greys for "monitoring" talks without the night idea.
- **Hospital night ward**: monitors and rounds; only for non-medical metaphors (avoid real health topics).
- **Lighthouse keeper**: a lamp that must never go out; for reliability talks with a softer tone. Music `music:568` → `music:31`.
- **Paid-ad version**: the handover screen carries a "Learn more" button (Paid-ad variant).
