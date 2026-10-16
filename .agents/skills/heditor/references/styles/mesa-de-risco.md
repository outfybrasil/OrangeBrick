---
style: mesa-de-risco
name: Mesa de risco (trading desk on a crash day)
family: fixed-style
best_for: authority family (serious tone, the speaker as the expert); talks where a limited resource (credit, quota, budget, deadline, battery) is burned by a bad choice and saved by a strategy, told as risk management; organic Reels with a comment question and Follow
reference: produced by the PycodeBR team with heditor, Oct 2026
---
# Mesa de risco (trading desk on a crash day)

The Reel is a professional market terminal on a crash day. The resource the speech is about (a monthly limit, a budget, a deadline) is treated as an **asset**, and every turn of the argument is a **market event**: the asset crashes to zero in the cold open, the operation is **replayed** to show which order caused it, a false guarantee gets a dashed "safe" seal that collapses under two red candles, a **circuit breaker** blacks out the screen for 0.1 s with total silence, and the strategy turns the screen green: the rule becomes the terminal's title until the end and a green curve lasts the whole month. The speaker is the **desk's live feed**: a large window always at the top, a sober grade and a discreet true name strip. The caption is the **desk speakerphone**, with the active word as a quote cell (white on red in the crisis, white on green after the thesis). The core metaphor: **you are not out of luck, you are running a position that burns your balance**.

## When to use / when not to

Use it when the speech:
- describes a resource running out fast ("it ran out in an hour", "the budget was gone");
- blames a specific choice (the heavy option, the wrong plan) and names a safer strategy;
- has a "but it is included, I should be able to use it" objection that can be shown as false safety;
- ends with a practical rule.

Avoid it when:
- the topic is real investing, trading or financial advice (the metaphor would read as a recommendation);
- the speech needs exact numbers you do not have (charts here never show axes or values);
- the tone is light or celebratory;
- the batch already has a control-room world (`turno-da-madrugada`) or another dark terminal.

## Signature moves

1. **Cold-open crash**: frame 0 shows the header "▼ <RESOURCE>", a hook strip "YOUR <RESOURCE> RAN OUT" with the key word highlighted, a full gauge with a one-line definition and a high plateau line; on the verb the line crashes to zero, the gauge empties and turns red, a marker carries the spoken time with an honesty note ("estimate · depends on use"); a red "DEPLETED" slam, the camera tinted red.
2. **REPLAY**: scan lines over the camera, the curve un-draws, the gauge refills, the window grows, the live chip becomes "REPLAY"; the instrument (the product discussed) gets green ▲ chips for the speaker's praise.
3. **Order ticket**: "THE ORDER" with PLAN / MODEL fields typed when said, a small "HIGH RISK" seal, EXECUTE → EXECUTED in red with a notification.
4. **The same crash in context** closes the hook loop.
5. **Plan list** with red weight bars per heavy option and an "I WOULD NOT USE" stamp over the bars.
6. **False safety**: a green dashed seal "✓ IT IS IN THE PLAN", the gauge rising in green, then the seal loses strength and **two red candles** knock the curve down; "IT RAN OUT" label.
7. **Circuit breaker**: 0.1 s blackout, panel and gauge drop, music silent; then **STRATEGY**: header ▲, borders green, camera to hero size.
8. **The rule becomes the title**: "✓ <RULE>" strip, pulsing when repeated, then promoted to the header until the end.
9. **Recommendation panel** "RECOMMENDATION · AT THE TIME OF RECORDING", rows typed with definitions for jargon; the **green curve that lasts the month**; payoff strip on the final line.

## Frame and layout

Canvas 1080×1920, 30 fps. Organic safe zones.

```
y 0–270      dark grid and a slow, dark candle tape: no text
y 300–376    terminal header: Plex Sans Condensed Bold 46 px (accents ≥ 300) + "● LIVE"/"REPLAY" chip on the right
y 400–…      camera window, base 960×720 at x 60:
             crash 0.625 → 600×450 (to y 850) with the gauge at x 690–1020, hook strip y 866–990, chart y 1005–1217
             desk  0.8125 → 780×585 (to y 985) with a narrow gauge x 864–1020
             hero  1.0 → 960×720 (to y 1120) with the rule strip y 1130–1218
             CTA   780×585 centred (x 150)
y 1005–1217  panel (x 60–1020, critical info to x 950): tab in mono + view (chart, instrument, ticket, list, objection, recommendation)
y 1236–1452  speakerphone caption
y > 1470     dark candle tape and order book: no text
```

The face (~55 % × 60 % of the camera frame) is never covered: graphics live below the window or in the gauge column. The name strip ("Name · Brand") sits on the chest area of the window.

## Palette and typography

| Role | Hex |
|---|---|
| Background / panels / borders | `#050608` / `#0a0c0f` / `#232a33` |
| Labels / text | `#8d97a3` / `#e8ecf1` (caption words `#d9dee5`) |
| Crash | `#ff3b4f` / `#c4122f` |
| Recovery | `#2fd27a` / `#0a7a43` |

No amber, no coloured gradients, no boxed HUD look. Fonts (OFL): **IBM Plex Sans Condensed** 700/600/500 (titles, data; google/fonts, not in the kit: ship its OFL.txt) and **IBM Plex Mono** (status, tabs; in the kit). Tabs in lower case. Icons: Lucide (`triangle-alert`, `check`, `rewind`, `message-circle`, `pointer`).

## Caption system

"Desk speakerphone": black box `#0a0c0f` at x 60, y 1236, 960 × 216, inset top highlight, an 8 px left border in the state colour (`--acc`: red, then green after the thesis), a tab "Desk speakerphone" with a dot that pulses with the **real voice amplitude**. Text: IBM Plex Sans Condensed Bold 70 px uppercase, letter-spacing 0.4 px, up to 2 lines, `text-wrap: balance`, usable area x 100–950; groups of up to 6 words / 30 characters.

- Active word: a **quote cell**: pure white on `#c4122f` (crisis, ≈ 5.9:1) or on `#0a7a43` (strategy, ≈ 5.6:1), radius 3; punctuation stays outside the cell.

```css
#capbox{position:absolute;left:60px;top:1236px;width:960px;height:216px;background:#0a0c0f;box-shadow:inset 0 1px 0 #1c2229;
  border-left:8px solid var(--acc,#c4122f);z-index:30}
.capw{left:60px;top:1236px;width:960px;height:216px;z-index:31;display:flex;align-items:center;justify-content:center;padding:34px 70px 10px 40px}
.cap{width:850px;text-align:center;font-family:PSC;font-weight:700;font-size:70px;line-height:1.12;text-transform:uppercase;
  letter-spacing:.4px;color:#d9dee5;text-wrap:balance}
.cap .w{display:inline-block;padding:0 .1em;margin:0 .02em;border-radius:3px}
```
Voice dot: sample the RMS of `voice-master.wav` at ~15 fps into `K.vu` and set a CSS variable per frame (`S('#capbox',{'--l':v},i/fps)`), scaling the dot.

## Scene grammar

Generic example: a speaker warning that running the heaviest model on a cheap subscription burns the monthly quota in very little time, and recommending lighter frontier models with good limits for daily work.

| Beat | Header | Window | What happens |
|---|---|---|---|
| Cold open | ▼ <RESOURCE> | crash | Plateau → crash on the verb; gauge empties red; time marker with honesty note; DEPLETED slam (shake 10 px, red flash, punch). |
| Context | REPLAY · <PRODUCT> | desk | Rewind visual 0.4 s; window grows; product card; green ▲ chips for each spoken praise. |
| Warning | ▼ THE ORDER | desk | "ATTENTION" stamp; ticket with PLAN/MODEL typed when said; HIGH RISK seal; EXECUTE → EXECUTED. |
| Consequence | ▼ <RESOURCE> | crash | The same crash in context (closes the hook). |
| Which options | ▼ IN THE PLAN | desk | List with red weight bars; "I WOULD NOT USE" stamp. |
| Objection | IN THE PLAN? | desk | Green dashed seal, gauge up in green, quote of the objection. |
| Rebuttal | — | desk | Seal fades; two red candles; "IT RAN OUT". |
| Breaker | — | — | 0.1 s blackout, total silence. |
| Thesis | ▲ STRATEGY | hero | Green borders, trailer hit, music drop; rule strip; pulse on repetition. |
| Recommendation | ▲ <RULE> | desk | Panel "AT THE TIME OF RECORDING"; rows + jargon definitions; green ✓; green curve across the month; "WITH GOOD LIMITS". |
| Payoff | ▲ <RULE> | hero | Payoff strip on the last line; green flash at the end of the voice (no SFX over the line). |
| CTA (5 s) | ▲ DESK QUESTION | CTA, frozen and desaturated | Question with the key phrase in a green cell; "Tell us in the comments"; card with logo, handle and Follow → "✓ Following" in green like an executed order. |

Rules: no values, percentages or numeric axes; chart labels use spoken words only; short on-screen caveats when the speech exaggerates ("estimate · depends on use", "at the time of recording"); product and model names as text only, no logos.

## Transitions and motion vocabulary

- Dry cuts and slams (`scale 1.5 → 1` in 0.16 s) on central words; window layout changes in `expo.inOut` 0.42 s.
- **Rewind**: horizontal scan lines over the camera (repeating-linear-gradient moving), chart path reversed via `stroke-dashoffset`, 0.4 s.
- **Breaker**: a black layer at opacity 1 for 0.1 s, panels jump to their dropped state.
- **Crash line**: `power3.in`; plateau with seeded quote noise; volume bars jump on the crash.
- **Typing** in the ticket by `clip-path` steps; a blinking cursor.
- **Camera tint**: a red multiply layer at 0.3 during crashes.

## Sound design

| Action | Category | gain_db | length |
|---|---|---|---|
| Frame 0 | `sub_drop` + `tick` (synth) | −18 / −27 | 0.8 / 0.06 |
| Crash | `reverse_impact` | −24 | 0.6 |
| Depleted | `trailer_hit` + `term_alert` (synth) | −13 / −23 | 1.0 / 0.6 |
| Replay | `rewind` | −17 | 0.6 |
| Chips | `tick` (synth) | −27 to −22 | 0.06 |
| Attention | `error_ding` | −26 | 0.4 |
| Stamps | `stamp` | −18 to −15 | 0.3 |
| Typing | `typing_fast` (low) | −27 | 0.5 |
| Execute | `mouse_click` + `notify` | −16 / −24 | 0.2 / 0.4 |
| Moves | `whoosh`, `swipe` | −22 to −17 / −24 to −19 | 0.4 |
| List bars / rows | `data_beep` | −26 to −25 | 0.2 |
| False safety | `success` (low) | −22 | 0.4 |
| Seal fails | `tape_stop` | −24 | 0.4 |
| Candles | `bass_impact` ×2 | −17 to −13 | 0.5 |
| Breaker | `breaker` (synth) | −12 | 0.7 |
| Recommendation ✓ / curve | `success_chime`, `pop`, `progress_complete` | −22 / −25 / −27 | 0.3–0.8 |
| Follow | `mouse_click`, `success_chime` | −12 / −16 | 0.2 / 0.8 |

Synthesised (numpy): **term_alert** = four dry beeps alternating 988/740 Hz (soft-clipped sines, 110 ms each, 35 ms gaps); **breaker** = a 6 ms metallic click + a falling 70 → 40 Hz thump + a 120 Hz hum collapsing; **tick** = a 2.6 kHz + 1.3 kHz ping, 60 ms.

**Music:** `music:680` (Epical Drums 05, restless contained cinematic percussion) — reference. `full −1 dB` from 72 s of the file (densest part) for the cold open; `lowpass −4 dB` from 10 s under the explanation; `full −2 dB` from 50.5 s for the two candles; **silence** at the breaker; `full −1 dB` from 65 s (the file's energy rise) as the drop on the rule; 1 s fade; `cta_boost_db` 5. Add 3–5 dB dips (with continuous `src`) on weak-voice windows to keep the background p95 comfortably below −12 dB. Alternatives: `music:568` (tense electronic), `music:677` (dramatic trailer drums).

```json
[{"start":0,"end":"REPLAY-0.2","mode":"full","gain_db":-1,"track":"A","src":72.0,"fade_in":0.03,"fade_out":0.15},
 {"start":"REPLAY-0.2","end":"CANDLES","mode":"lowpass","gain_db":-4,"track":"A","src":10.0,"fade_in":0.35},
 {"start":"CANDLES","end":"BREAKER","mode":"full","gain_db":-2,"track":"A","src":50.5},
 {"start":"BREAKER","end":"BREAKER+0.11","mode":"silence"},
 {"start":"BREAKER+0.11","end":"DURATION","mode":"full","gain_db":-1,"track":"A","src":65.0,"fade_out":1.0}]
```

## CTA design inside the style

"▲ DESK QUESTION" in the header; a large question with the key phrase in a green cell; "Tell us in the comments"; a card with the brand logo, the handle and a Follow button tapped on its right side (the finger must not cover the word) that turns into "✓ Following" in green, like an executed order. The camera freezes on its last frame, desaturated. ≥ 5 s.

## Implementation notes

- Camera grade (sober, cool shadows):
  ```python
  GRADE_VF = ("eq=contrast=1.09:saturation=0.80:brightness=-0.012:gamma=0.97,"
              "colorbalance=rs=-0.025:gs=-0.005:bs=0.045:rh=0.02:bh=-0.01,unsharp=5:5:0.35")
  rk.styled_camera(work, "grade", GRADE_VF)
  ```
- The gauge is an instrument, not a bar: a side ruler, a dashed previous level, a pointer following the level, a brushed-steel fill with grooves.
- Charts are SVG paths with qualitative shapes (plateau with seeded noise, crash, dashed zero line, volume bars); no axes.
- After re-running `prepare`, regenerate `words-reviewed.json` (the CLI does not overwrite it). Confirm doubtful jargon with a medium model **without** an initial prompt (a prompt with the term biases the result).
- Check overflow in the DOM with Playwright: reduced contact sheets hid a clipped word in the rule strip.

## Pitfalls found in production

- **Empty-looking gauge** read as a placeholder: make it an instrument (ruler, pointer, previous level).
- **A joking stamp** over the ticket ("NONSENSE") felt flippant: a small "HIGH RISK" seal instead.
- **Empty ticket and empty recommendation panel**: fields appear with a blinking cursor and get typed; titles enter on the word.
- **"LIVE" during the replay** was contradictory: switch the chip to REPLAY.
- **Frame 0 already at zero** contradicted the full gauge: start on the plateau and crash on the verb.
- **Too many boxed panels** looked like a game HUD: remove outlines, keep a top filament, lower-case tabs.
- **Punctuation inside the cell** ("READY,"): keep it outside.
- **Finger covering Follow**: tap on the right edge.

## Variations

- **Energy grid**: the resource is power load; the breaker is literal; for infrastructure costs.
- **Fuel gauge on a long drive**: a calmer variant for budgets and planning.
- **Portfolio rebalance**: two assets compared side by side, the strategy moves weight between them; for "use A for this, B for that" advice.
- **Paid-ad version**: the CTA becomes an order ticket with a "Learn more" button (Paid-ad variant).
