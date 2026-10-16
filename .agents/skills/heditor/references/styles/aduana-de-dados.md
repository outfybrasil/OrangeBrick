---
style: aduana-de-dados
name: Aduana de dados (night border checkpoint for your data)
family: fixed-style
best_for: authority family (serious tone, the speaker as the expert); talks about what leaves your machine, privacy, sensitive data, cloud providers and what "local" really means, terms of use, compliance and permissions; organic Reels with a comment question and Follow
reference: produced by the PycodeBR team with heditor, Oct 2026
---
# Aduana de dados (night border checkpoint for your data)

The Reel is a land border checkpoint at night between two territories: **YOUR COMPUTER** and **INTERNET**. The expert is the **exit-control officer** in a glass **booth** (petrol-blue steel frame, diagonal reflection, a true name plate in the upper corner of the glass). A **gantry sign** over the lane names each act. The question of the speech arrives as an **exit declaration** form, already stamped in frame 0; the baggage is inspected on a monochrome **X-ray monitor** that shows what runs inside the laptop and what sits outside; a **route map** shows the "PROMPT + DATA" sheet crossing a striped **barrier** to a data centre; an alternative route imports the model into the laptop and the barrier comes down; the **regulations** (terms of use) are accepted without reading, then opened and underlined item by item; and the rule lands as an official **stamp**. A baggage **belt with an X-ray tunnel** runs along the bottom the whole time, and sheets only cross it when the speech sends data out. The core metaphor: **a border answers two questions, what is leaving and which rule applies on the other side**.

## When to use / when not to

Use it when the speech:
- separates what stays on your machine from what leaves it ("the tool is local, the model is not");
- has an exception that keeps everything inside (running it yourself, offline, self-hosted);
- ends with "read the terms / the policy says what they do with your data".

Avoid it when:
- there is no inside/outside boundary;
- the topic is travel, immigration or real customs (the metaphor would read literally and can be sensitive);
- the batch already has an airport (`aeroporto`), order tracking (`entrega`) or another stamp-heavy paper world (`tribunal`, `arquivo-cofre`): keep only one stamp world per batch.

## Signature moves

1. **Frame 0 declaration**: a paper form at the top ("DATA EXIT DECLARATION · CONTROL") with the question in three lines on the left and YES/NO boxes on the right; the booth below; the belt stopped; low impact.
2. **Hook stamp**: a red "NOT LOCAL" stamp hits under the boxes on the negation (never over the question), the product word gets a red pen underline, the NO box gets an X.
3. **Inspection**: the declaration slides out, the gantry drops "INSPECTION", the booth moves left; the X-ray monitor scans the laptop outline and the tool lights inside; the MODEL slot stays dashed and empty, with the model chip outside ("processed outside your machine").
4. **Route**: "DATA ROUTE" page: YOUR COMPUTER → barrier (BORDER) → DATA CENTRE; on "internet" the **barrier rises**, the sheet crosses, gets an "EXIT" stamp; the server lights and its name is typed; on the belt the sheets pass through the tunnel.
5. **Echo stamp**: a smaller "NOT LOCAL" lands on YOUR COMPUTER when the speaker repeats the conclusion.
6. **Alternative route**: "ALTERNATIVE ROUTE"; the model chip (download icon) arcs back into the laptop, the X-ray shows the slot filled, the **barrier comes down and locks**, scissors cut the route, a red lock sits on the tunnel, "EVERYTHING ON YOUR MACHINE"; the belt stops.
7. **Border rule**: the model returns to the server, a 0.34 s music silence + riser, the booth goes large (EXPERT), the thesis in two lines ("ONLY THE TOOL IS LOCAL." / "THE REST IS ON THE INTERNET."); the belt separates the sheets: the tool stays on the left, the rest crosses.
8. **Regulations**: a closed document "TERMS OF USE · provider guidelines"; an acceptance line "☐ I have read and accept" ticks itself fast, an "ACCEPTED WITHOUT READING" seal drops; the document opens on "SECTION · YOUR DATA" with one item per spoken clause, each underlined with a red pen when said; a short caveat note in the side column.
9. **Payoff stamp**: a large "READ THE TERMS" stamp on the regulations at the end of the last word; punch 1.08, flash; the booth goes dark; the intercom shows "✓ CONTROL CLOSED".

## Frame and layout

Canvas 1080×1920, 30 fps. Organic safe zones.

```
y 0–290      checkpoint canopy: smooth petrol ceiling with ribs and one strip of light (luma < 120, no text)
y 300–368    GANTRY SIGN: Big Shoulders 800, 40 px, uppercase paper white (text top ≥ 306); hidden behind the declaration in the hook
             booth states (camera inside a petrol-steel frame, name plate top-left of the glass, never near the chin):
             DECLARATION  x 173, y 660, 734×546  (form above at y 306–640)
             INSPECTION   x 60,  y 400, 560×416  (right column x 640–1020: X-ray, regulations, note; bottom panel y 836–1206)
             EXPERT       x 160, y 400, 760×565  (bottom panel y 985–1206: thesis or stamp)
y 1222–1436  INTERCOM (caption)
y 1458–1560  BELT with rollers and the X-ray tunnel (lead-strip curtain) at x 440–600; "YOUR COMPUTER" at x 70, "INTERNET" ending ≤ x 940
y > 1570     lane floor in perspective with a dashed line and a physical barrier that rises at the end; right edge atmosphere only
```

The speaker's face may sit low in a webcam tile (chin near the bottom edge): keep the bottom centre of the booth free and put graphics beside or outside it. Camera movements: alternating 1.0/1.05 zoom on pause cuts (centred on the face of that block), slow push-in (1.0 → 1.05) on the alternative route, dry punch-in (1.08) on the thesis and the payoff. The booth goes dark after the last word.

## Palette and typography

| Role | Hex |
|---|---|
| Night / panels / surfaces / borders | `#061418` / `#0a1f25` / `#0f2a31` / `#1b3b44` |
| Live lines / secondary text | `#3f7f8c` / `#8fb3ba` |
| Paper / ink on paper | `#ece6d6` / `#10262c` |
| Single accent: stamp red | `#c8102e`; caption cell `#a50e24` |
| X-ray monitor | stroke `#cfe6e8` on `#031014` |

Red appears only on what is a stamp, a cut or an alert: no amber, no green, no coloured gradients. Fonts (OFL, google/fonts, not in the kit: ship each `OFL.txt`): **Big Shoulders Display** variable (signage, titles, captions: condensed public signage, firm without looking military), **Courier Prime** Regular/Bold (form fields, labels, name plate), **Source Serif 4** variable (the regulations text). Icons: Lucide (`laptop`, `server`, `cpu`, `download`, `scissors`, `lock`, `check`, `file-text`, `message-circle`).

## Caption system

"Booth intercom": a band `#08191e` at x 60, y 1222, 960 × 214, radius 6, 2 px border `#12313a` with a 3 px top filament `#1b3b44`, and a discreet speaker grille (slots) on the left, outside the text area. Text in **Big Shoulders Display ExtraBold 84 px** uppercase, paper white `#ece6d6`, line-height 1.14, up to 2 lines, groups of up to 4 words / 22 characters, usable width x 110–950, `text-wrap: balance`.

- Active word: a **stamp cell**: pure white on red `#a50e24` (≈ 7.6:1), radius 4, padding `4px 8px 0` so accented capitals stay inside the cell; punctuation outside.
- When the gap to the next group is < 0.7 s, keep the current group on screen (a stretched connective left the intercom empty).

```css
#icom{position:absolute;left:60px;top:1222px;width:960px;height:214px;z-index:7;border-radius:6px;background:#08191e;
  border:2px solid #12313a;border-top:3px solid #1b3b44}
#grille{position:absolute;left:18px;top:52px;width:16px;height:110px;border-radius:3px;
  background:repeating-linear-gradient(180deg,#1b3b44 0 6px,rgba(0,0,0,0) 6px 14px)}
.capw{position:absolute;left:60px;top:1222px;width:960px;height:214px;z-index:8;display:flex;align-items:center;justify-content:center;padding:0 50px 0 60px}
.cap{width:840px;text-align:center;font-family:BSD;font-weight:800;font-size:84px;line-height:1.14;text-transform:uppercase;
  letter-spacing:.01em;color:#ece6d6;text-wrap:balance}
.cap .w{display:inline-block;padding:4px 8px 0;margin:0 1px;border-radius:4px}   /* active: #a50e24, color #fff */
```

## Scene grammar

Generic example: a speaker explaining that a note-taking app installed on your laptop does not keep your notes local when its cloud sync is on (the notes travel to the vendor's servers), that only a self-hosted or offline setup keeps everything on the machine, and that the vendor's privacy policy is where you learn what they read and keep.

| Beat | Gantry | What happens |
|---|---|---|
| Hook | (hidden) | Declaration already on screen with the question; NOT LOCAL stamp on the negation; product word underlined; X on NO. |
| Tool vs model | INSPECTION | X-ray scan; the tool lights inside; the model slot is empty and the model chip sits outside; definitions typed for each jargon word. |
| It goes out | DATA ROUTE | Barrier rises on "internet"; the sheet crosses with an EXIT stamp; server lights; sheets cross the tunnel on the belt. |
| Conclusion | — | Echo NOT LOCAL stamp on YOUR COMPUTER. |
| Exception | ALTERNATIVE ROUTE | Slow push-in; the model arcs back into the laptop; barrier down, scissors, lock; "EVERYTHING ON YOUR MACHINE". |
| "Otherwise" | — | Model returns, barrier reopens; music silence + riser. |
| Thesis | BORDER RULE | Booth large; two-line thesis; punch 1.08, flash; trailer hit + sub drop; music drop; belt separates tool and rest. |
| Terms | REGULATIONS | Closed document; acceptance ticks itself; ACCEPTED WITHOUT READING seal. |
| What they say | REGULATIONS | Document opens; one item per spoken clause, underlined in red when said; caveat note in the side column. |
| Payoff | — | READ THE TERMS stamp; booth dark; "✓ CONTROL CLOSED" on the intercom. |
| CTA (6 s) | EXIT DECLARATION → PASSAGE CLEARED | The hook form returns as the CTA: question, "Tell us in the comments", logo + handle, a stamp presses Follow → "✓ Following"; the floor barrier rises; the belt runs again. |

Rules: product and provider names only as text when spoken, never as logos; the audience question appears only as text, without the asker's name; short definitions are labels, not quotes; plan caveats ("terms differ per plan: API and business accounts have their own retention and training rules; read, do not assume") go on screen as a note and in the post caption; no digits on screen.

## Transitions and motion vocabulary

- **Page wipe**: a vertical `clip-path` wipe (0.18–0.32 s) between gantry acts.
- **Stamp slam**: `scale 1.7 → 1` in 0.11 s with rotation −6°, a 4 px shake for the hook only; ink texture via a deterministic PNG mask (`mask-image`) generated in numpy, `mix-blend-mode: multiply` on paper.
- **Booth move**: `left/top/width/height` in `expo.inOut` 0.42 s between DECLARATION, INSPECTION and EXPERT.
- **Barrier**: the boom rotates 80° up (0.5 s `power2.out`) and comes down with a 3° bounce; the floor barrier in the CTA rises vertically (a 55° stop looked like a glitch).
- **X-ray scan**: a bright line sweeping the monitor (0.6 s linear) with outlines revealed behind it.
- **Pen underline**: an SVG stroke drawn by `stroke-dashoffset` per clause; items not yet spoken at 50 % opacity (32 % looked disabled).
- **Belt**: sheets move with a linear `x` tween while the belt texture scrolls; they stop when the route is cut.

## Sound design

| Action | Category | gain_db | length |
|---|---|---|---|
| Frame 0 / payoff | `bass_impact` | −13 | 0.6 |
| Stamps | `stamp` | −22 to −11 | 0.3 |
| Pen underline | `pen_write` | −27 to −26 | 0.3–0.35 |
| Boxes, chips | `click`, `pop` | −26 to −23 / −25 to −21 | 0.2 |
| Moves | `whoosh`, `swipe` | −21 to −18 / −21 | 0.4–0.5 |
| Page change | `cage_or_metal_slam` (low) | −22 | 0.5 |
| X-ray / data | `scan`, `data_beep` | −23 / −27 to −25 | 0.8 / 0.3 |
| Belt | `belt` (synth) | −29 to −27 | 1.0–1.4 |
| Barrier | `barrier` (synth) | −21 to −20 | 0.75 |
| Server name / reader | `typewriter`, `scanner` (synth) | −26 / −27 | 0.7 / 0.26 |
| Model returns / lock | `reverse_impact`, `lock_click` | −22 / −22 | 0.5 / 0.3 |
| Thesis | `riser`, `trailer_hit`, `sub_drop` | −21 / −12 / −16 | 0.4 / 1.2 / 0.9 |
| Regulations | `page_turn`, `mouse_click` | −22 to −18 / −19 | 0.4–0.6 / 0.2 |
| CTA | `spotlight_on`, `success_chime` | −24 / −17 | 0.4 / 0.9 |

Synthesised (numpy, deterministic): **barrier** = a motor hum rising from 70 to 130 Hz with 2nd/3rd harmonics, low-passed, then a metallic end-of-travel clunk (90 Hz + 1240 Hz + a noise click); **belt** = low-passed rumble at 180 Hz + 58/116 Hz tones with periodic roller knocks; **scanner** = two short tones (1480 then 2220 Hz).

**Music:** `music:871` (Fright Night, dark dramatic suspense that grows and pulses without sounding like a trailer; energy rises around 41–51 s of the file, the biggest jump at 49–51 s) — reference. `full −2 dB` from src 43 for the hook; `lowpass 0 dB` from src 8 under the explanation (a −4 dB dip on a long weak vowel); **silence** + riser before the thesis; `full −1 dB` from src 49.5 (the drop) on the thesis, −5 dB on its second line; `lowpass −2 dB` from src 22 (a calm stretch) under the regulations, with −6 / −3.5 dB dips at the end; `full −1 dB` from src 62 for the payoff and CTA, 1 s fade, `cta_boost_db` 5. The regulations first continued the dense stretch of the file and pinned the background p95 at −12 dB; the calm stretch plus dips brought it to about −13.5 dB. Alternative: `music:293` (serious trap, drop at 11 s).

```json
[{"start":0,"end":"INSPECT-0.1","mode":"full","gain_db":-2,"track":"A","src":43.0,"fade_in":0.02,"fade_out":0.12},
 {"start":"INSPECT-0.1","end":"THESIS-0.34","mode":"lowpass","gain_db":0,"track":"A","src":8.0,"fade_in":0.2,"fade_out":0.08},
 {"start":"THESIS","end":"REST","mode":"full","gain_db":-1,"track":"A","src":49.5,"fade_in":0.02},
 {"start":"REST","end":"TERMS-0.1","mode":"full","gain_db":-5,"track":"A","src":"t+(49.5-THESIS)","fade_out":0.2},
 {"start":"TERMS-0.1","end":"VOICE_END","mode":"lowpass","gain_db":-2,"track":"A","src":22.0,"fade_in":0.25},
 {"start":"VOICE_END+0.1","end":"DURATION","mode":"full","gain_db":-1,"track":"A","src":62.0,"fade_in":0.02,"fade_out":1.0}]
```

## CTA design inside the style

"EXIT DECLARATION" takes the middle of the screen, drawn like the hook form (it closes the loop opened in frame 0): the thematic question ("Have you read the terms of the tool you use with sensitive data?"), "Tell us in the comments", logo + handle, and a Follow button pressed by a descending stamp that turns into "✓ Following". The intercom shows "✓ CONTROL CLOSED", the gantry reads "PASSAGE CLEARED" and the floor barrier rises. ≥ 6 s after the last word. Button words exactly as in `brand.json`; upper case only through CSS.

## Implementation notes

- Camera grade (sober, cold, petrol shadows):
  ```python
  GRADE_VF = ("eq=contrast=1.08:saturation=0.80:brightness=-0.015:gamma=0.97,"
              "colorbalance=rs=-0.03:gs=0.01:bs=0.045:rm=-0.02:bm=0.02:rh=0.01,unsharp=5:5:0.3")
  rk.styled_camera(work, "grade", GRADE_VF)
  ```
- One camera video, a PNG stamp mask and light grain: no blur or `backdrop-filter`, so the render stays light.
- Reveal typed names with `clip-path`, not by animating `width` (the width animation clipped the last letters).
- Check text overflow in the DOM with Playwright at ~30 times (ink box of every text against its container, the top line at 300, x 60–1020, the right edge and y 1570).
- Spoken colloquial forms and short tags ("right?") that the medium ASR drops can be added back from a small-model pass on the cut, adjusting only the neighbours' timings.

## Pitfalls found in production

- **Boxed ceiling lamps** read as empty placeholder panels: a smooth ribbed ceiling with one light strip.
- **The stamp covered the question** in the hook: smaller one-line stamp below the boxes, question in three lines on the left.
- **Satirical-looking stamps**: a less worn mask, a smaller shake, a smaller hook stamp.
- **Ambiguous route direction**: arrowhead at the end; the route fades when the barrier comes down.
- **The thesis touched the right edge** at 90 px: 78 px.
- **An empty definitions panel** for a second: the first definition enters with the first jargon word.
- **The CTA question typed by `clip-path`** read as fragments: enter it whole with a fade.
- **Vision still found "a bit of night control room"** in a dark UI with labels: a perspective lane floor with a dashed line and a physical barrier made the border literal.

## Variations

- **Port customs with a manifest**: for supply chains of dependencies (what enters your project); avoid containers if the batch has `entrega`.
- **Embassy visa desk**: a passport stamped page by page; for "what you are allowed to bring in" (permissions, scopes).
- **Clean-room airlock**: two doors that never open together; for isolation and sandboxing talks.
- **Paid-ad version**: the exit declaration ends on a "Learn more" button (Paid-ad variant).
