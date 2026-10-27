---
style: circuito
name: Circuito (the explanation is a circuit board)
family: fixed-style
best_for: didactic explanations of where things run and how data travels (local vs cloud, client → server → database, tool → model → provider, what leaves your machine), architecture talks, integrations, pipelines; any speech that names components and the paths between them
reference: built by the PycodeBR team with heditor 2.4 (Oct 2026) as the reference style for the GSAP plugins (DrawSVG, MorphSVG, MotionPath, SplitText) and SVG preparation (svgkit)
---
# Circuito (the explanation is a circuit board)

The whole screen is a **printed circuit board** at night: dark solder mask, a grid of vias, dim copper traces that
run off the edges. The speaker is **the main chip** of the board: large during the hook, then the camera shrinks
into an IC package with gold pins, the designator `U1` and the @handle in silkscreen. Under the chip the speech is
**assembled as hardware, on the words**: zones are outlined on the board ("YOUR MACHINE" | "THE PROVIDER"),
each concept is a component whose outline and icon are drawn on its word (DrawSVG) while its silkscreen label
decodes, each relation is a copper trace drawn on its verb, data travels as glowing pulses along the traces
(MotionPath, green = expected, red = risk), an idea that changes nature morphs its icon (MorphSVG: cloud → chip
when a model is downloaded to the machine), status LEDs light green or red with a decoded flag under the
component, and the strongest lines land as silkscreen titles at the top (SplitText). The CTA is a tactile push
button with an LED.

**Status:** reference style for the motion plugins (no audience approval yet). Reuse the language and redesign the
board for each explanation.

## When to use / when not to

Use it when the speech:
- names parts of a system and says where each one runs or what talks to what;
- has a boundary to show (local vs internet, inside vs outside the company, your code vs a vendor);
- has a verdict per part (this one is local, this one is not; this one is safe, this one leaks).

Avoid it when:
- the parts do not relate (a list of tips): use `revista`, `album`;
- the explanation is a chain built from scratch with a recap ("what is a producer, a queue, a consumer"):
  `lousa-de-aula` teaches it better;
- the subject has no system at all (career, emotions): use `documentario`, `podcast`.

## Signature moves

1. **The chip**: hook with the speaker large (hero) and the hook line as the first silkscreen title; on the first
   breath the camera shrinks into the socket (`rig('chip')`, 0.6 s) and the pins fade in.
2. **Zones**: outline drawn (0.7 s, DrawSVG), 6 % fill, label decoded above the outline on the outer side (never
   under the chip's pins); neutral cyan for "yours", red for "theirs" when the speech frames it as a risk.
3. **Components on their words**: outline (0.42 s) → pins and notch → icon stroke drawn (0.5 s) → silkscreen label
   decoded (0.4 s, deterministic `scramble`) → LED off; a reference designator (`U2`, `U3`…) appears beside it.
4. **Traces on the verbs**: orthogonal copper routes with 45° corners and vias at both ends (0.55 s); the trace
   label ("INTERNET") sits on the free middle of the trace and decodes after it.
5. **Pulses**: 2–6 dots travel the trace (0.8 s each, 0.22 s apart) under the components; red when the speech says
   what leaves or what is at risk, reversed for downloads.
6. **Morph**: the component's icon becomes another one on the word that changes it (cloud → cpu: "you downloaded
   the model to your machine").
7. **LED + flag**: the LED lights (green/red with glow), the outline takes the colour and a flag decodes under the
   component ("NOT LOCAL", "LOCAL", "ONLY THE TOOL"); one flag per component at a time.
8. **Silkscreen titles**: the thesis lines appear at the top, character by character (words kept, 0.022 s
   stagger, back-out), replacing the previous title.
9. **Push-button CTA**: scrim, board faded, question in upper-case mono, logo, @handle, a tactile button pressed
   by the finger: cap goes down, turns green, LED lights, "Following".

## Frame and layout

Canvas 1080×1920, 30 fps.

```
y 0–270      safe top (nothing)
y 290–400    silkscreen title band (JetBrains Mono 800, 50 px, balanced, max 2 lines)
y 410–767    speaker chip 480×357 at x 300 (rig state "chip", scale 0.5); pins to y ~791; U1 / @handle above
y 797        zone labels (above the zone outlines, outer side)
y 809–1235   BOARD: 4 columns (x 165, 405, 675, 915) × 2 rows (y 925, 1115); components 216×140
             flags under each component (216×38); row-1 flags stay inside the zone
y 1262–1512  caption band (mono, pill mode: dark on #7dffb0)
y > 1570     platform UI: dim decorative traces only
```

Hero state (hook): the camera card 960×714 at y 430 covers the board, which is still empty.

## Palette and typography

| Role | Hex |
|---|---|
| Solder mask (background gradient) | `#08261c` → `#051710` → `#020a07`, via grid `#0f3a2b` |
| Decorative traces | `#164a37` |
| Component body / outline | `#0a110e` / `#3b6a57` |
| Silkscreen text and icons | `#e6f1ea` (reference designators `#8fb7a5`) |
| Copper (traces, trace labels) | `#d9a441` with a soft glow |
| OK / risk / neutral | `#7dffb0` / `#ff5c6c` / `#9fd2ee` |
| Pins | `#c9a14a` |

Typeface: **JetBrains Mono** (kit) everywhere: silkscreen 22–27 px with letter spacing, titles 50 px 800,
captions 66 px 800 upper case. Icons: Lucide merged into one path per icon (`svgkit.single_path`), stroke 2 px.

## Caption system

Mono caption band at y 1262 (`.caption{top:1262px}`), groups of 3 words / 16 characters, active word in pill mode
with `caption_pill=("#03100b", "#7dffb0")` (dark on LED green, ≈ 13:1), white words with a dark stroke.

## Scene grammar (beats.json)

```json
[{"word": "local,", "after": 2.0, "do": "zone", "id": "local", "label": "SUA MÁQUINA", "cols": [0, 1], "tone": "neutral"},
 {"word": "ferramenta", "do": "node", "id": "tool", "label": "CLAUDE", "icon": "terminal", "slot": [0, 0]},
 {"word": "modelo", "after": 5.0, "do": "node", "id": "model", "label": "MODELO", "icon": "bot", "slot": [3, 0]},
 {"word": "anthropic", "after": 5.3, "do": "zone", "id": "cloud", "label": "ANTHROPIC", "cols": [2, 3], "tone": "alert"},
 {"word": "comunicando", "do": "trace", "id": "net", "from": "tool", "to": "model", "label": "INTERNET"},
 {"word": "internet", "after": 7.8, "do": "pulse", "trace": "net", "n": 3, "tone": "ok"},
 {"word": "não", "after": 11.6, "do": "led", "node": "tool", "tone": "alert", "flag": "NÃO TÁ LOCAL"},
 {"word": "máquina", "do": "morph", "node": "llm", "icon": "cpu"},
 {"word": "local", "after": 19.5, "do": "title", "text": "O LOCAL TÁ SÓ A FERRAMENTA"}]
```

Rules: steps in speech order (the build asserts it); labels, flags and titles are spoken words (short: labels
≤ 12 characters, flags ≤ 16, titles ≤ 28); one zone per side; at most 7 components (8 slots); a trace starts at a
component or at `cam` (the chip); `delay` shifts a step after its word (a trace that follows the component it
connects). Product names only as plain silkscreen text when spoken, never logos.

## Transitions and motion vocabulary

- DrawSVG for every outline, icon and trace: `fromTo({drawSVG:'0% 0%'},{drawSVG:'0% 100%'})`; the initial state of
  every board element is set at build time (`gsap.set`) so frame 0 and backward seeks show an empty board.
- MotionPath pulses: `fromTo(dot,{motionPath:{path:'#t-net',start:0,end:0}},{motionPath:{path,start:0,end:1}})`.
- MorphSVG: `type: 'rotational'`, 0.55 s, on single-path icons.
- SplitText titles: `type: 'words,chars'` on an inner span (in a flex container the spaces between words vanish).
- Labels and flags: the kit's deterministic `scramble()` (never ScrambleTextPlugin, which calls `Math.random`).

## Sound design

| Action | Category | gain_db |
|---|---|---|
| Board powers on (0 s) | `power_up` | −15 |
| Zone | `swipe` | −20 |
| Component | `data_beep` | −17 |
| Trace | `scan` | −21 |
| Pulses | `message_sent` | −19 |
| Morph | `magic_transition` | −19 |
| LED green / red | `success` / `error` | −18 |
| Title | `click` | −18 |
| CTA | `whoosh`, `click`, `success_chime` | −14, −9, −14 |

One sound per category per beat cluster (0.25 s). Music: `music:167` (Brainiac, mechanical futuristic electronic)
`drop_s 3`: lowpass until the first thesis title, 0.28 s silence, full from the title. Alternatives: `music:568`
(tense technology), `music:623` (hypnotic tech house) for a lighter tone.

## CTA design

Scrim 90 %, board faded to 15 %, titles out; question in upper-case mono (balanced), "Conta nos comentários",
logo, @handle and the push button (`brand.json` words): the finger presses, the cap sinks 8 px, fills green, the LED
beside it lights and "✓ Following" appears.

## Implementation notes

- Reference build: `templates/styles/circuito/build.py` (`heditor new <work> <video> --style circuito`), driven by
  `<work>/beats.json`; without it the build chains the longest words as components (baseline only).
- `rk.page(..., plugins=("SplitText", "DrawSVG", "MorphSVG", "MotionPath"), caption_pill=(...))`; the board is one
  SVG in `world_back` with layers zones → traces → pulses → components → flags.
- Icons: `rk.ensure_icons([...])` + `svgkit.single_path()` (rect with rx, circle, line, polyline → one `d`, first
  relative moveto rewritten); verified pixel-identical to the original icons.
- `plan["allowed_numbers"]` lists the reference designators so the numbers test accepts them.

## Pitfalls found in production

- **Titles without spaces**: SplitText words inside a `display:flex` title lose the whitespace → split an inner
  block span.
- **Gibberish everywhere at the start**: the decode effect writes its first random frame at build time and the
  board was visible behind the hero card → set every board element to its empty state with `gsap.set` and fade
  labels in only on their word.
- **Flags erased the zone names**: both lived above the components → zone labels above the outline, flags under the
  components, zone padded at the bottom for row-1 flags.
- **Trace label covered by a component**: the midpoint of a long trace is where a gate component sits → place the
  label on the first free fraction of the trace.
- **Pulses over components**: draw the pulse layer under the components (signals go through them).
- **CTA fonts**: the kit CTA uses the brand display font; override `.cta-q` with the mono face and upper case.

## Variations

- **Oscilloscope**: one zone becomes a scope screen where the pulse shape changes on the word (latency, noise).
- **Breadboard**: a white breadboard with jumper wires for beginner topics ("your first API").
- **Firewall**: a third zone in the middle as a gate component that blocks red pulses on the word "block".
- **Long form**: chapter cards as new boards (`chapter_card: "terminal"`), the chip as the camera pip.
