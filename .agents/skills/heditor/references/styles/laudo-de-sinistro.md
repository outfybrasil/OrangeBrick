---
style: laudo-de-sinistro
name: Laudo de sinistro (insurance claim forensic report)
family: fixed-style
best_for: authority family (serious tone, the speaker as the expert); risk and prevention talks (backups, data loss, security, "if it goes down you lose everything") where the expert examines the case and concludes the report; organic Reels with a comment question and Follow
reference: produced by the PycodeBR team with heditor, Oct 2026
---
# Laudo de sinistro (insurance claim forensic report)

The Reel is the **forensic folder of a data loss claim**, open on a graphite desk. An off-white sheet with folder tabs (SCENE · CAUSE · COVERAGE · REPORT) and a status (UNDER ANALYSIS → CONCLUDED). The expert appears large in the report's **technical photograph**: a printed photo with a white border and a printed line "Technical analysis · Name · Brand", framed by an L-shaped forensic **reference scale** (bars only, no numerals). A small **scene photo** pinned on the shoulder of the big photo shows the object of the claim with a yellow **evidence tent** (letters, never numbers). Below the photo, a **report zone** changes page at every turn (headline, coverage field, cause diagram, coverage clause filled as each item is said, route to a vault outside the building, insured asset redacted, rule), then a **TRANSCRIPT** strip (the caption) and the **CLAIM CLASSIFICATION** boxes marked by pen. Every record gets a **forensic flash**: a 0.1 s white flash and the photo turns high-contrast black and white for 0.45 s. The verdict is a pen mark: TOTAL LOSS gets an X in the hook, and at the end it is struck through and RECOVERABLE is ticked in yellow. The core metaphor: **a routine is an insurance policy, and it only pays if it existed before the accident**.

## When to use / when not to

Use it when the speech:
- opens with a loss ("if the machine goes down, your data goes with it");
- names the cause (a single copy, a single place, no plan);
- describes a preventive routine that can be read as a coverage clause (schedule, action, destination);
- ends with a short rule.

Avoid it when:
- the topic is real insurance, health or legal claims (the metaphor would read as advice);
- the speech has no loss or risk event;
- the batch already uses a CCTV or recovery-boot world (`thriller`), a courtroom (`tribunal`) or another stamp-based paper world (`arquivo-cofre`, `aduana-de-dados`): this style has **no stamps**, keep it that way.

## Signature moves

1. **Frame 0 assembled**: SCENE tab, "CLAIM REPORT · UNDER ANALYSIS" header, the expert's photo, the scene photo (object working, tent A), a two-line headline question ("IF IT GOES DOWN, / DOES YOUR DATA GO WITH IT?") without a line break inside a line; empty classification boxes; headline slam 1.06 → 1.
2. **The incident**: on the verb, the object in the scene photo tips over and its LEDs die; forensic flash + B&W photo; the headline gives way to a field "<ASSET> · COPY OUTSIDE: NONE"; the pen marks **X on TOTAL LOSS**; tent B lands next to "NONE".
3. **Cause** (CAUSE tab): a line diagram: the machine box with the asset inside labelled "ONLY COPY"; a dashed outline of a second copy outside, "TO BE CONFIGURED", drawn on the word "backup".
4. **Thesis strip**: a short music silence + riser, then an impact strip at the **top of the photo** with the speaker's words ("DO NOT KEEP IT ONLY ON THE MACHINE") and a yellow arrow "OUTSIDE THE MACHINE" reaching the dashed copy; punch-in 1.07.
5. **Coverage clause** (COVERAGE tab): fields filled as they are said: ROUTINE (scheduled job + one-line definition), ☒ DAILY, ACTION (full copy + definition), TIME (a clock without numerals turning to the spoken hour), VIA (the spoken tools as plain text, "connected account").
6. **Route**: the file chip leaves the machine along a dashed line to a **VAULT OUTSIDE THE MACHINE**; the handle turns and it locks; "✓ COPY OUTSIDE".
7. **Insured asset** (REPORT tab): "INSURED ASSET · CONTENT NOT SHOWN" with redaction bars swept line by line (one every 0.36 s) and a note on access control for personal data.
8. **Rule**: riser + silence, then "REPORT RULE: <RULE>," / "<SECOND HALF>." at 92 px with the second line highlighted; punch-in, short flash, music turn.
9. **Retest**: the scene photo returns, the object falls again (flash + B&W), but the pen **strikes TOTAL LOSS** and **ticks RECOVERABLE** on a yellow fill; the header turns **CONCLUDED**.

## Frame and layout

Canvas 1080×1920, 30 fps. Organic safe zones.

```
y 0–270      graphite desk (desk light, folder edge): atmosphere only, luma < 150
y 286–338    folder tabs: SCENE · CAUSE · COVERAGE · REPORT (active tab yellow with black text; text ≥ 300)
y 336–1572   off-white SHEET (x 36–1044) with a ruled margin
  y 356–420    header: "CLAIM REPORT" + "TECHNICAL EXAMINATION · <ASSET>" + status
  y 440–1000   TECHNICAL PHOTOGRAPH: camera 860×560 (x 112–972), white photo border, L scale left (x 80–104) and below (y 1008–1032),
               printed name line at the base; scene photo pinned bottom-right (over the shoulder/background only)
               impact strip at the TOP of the photo (y 450–528) when the face sits low in the frame
  y 1048–1312  REPORT ZONE (x 80–950): one page per turn
  y 1318–1452  TRANSCRIPT strip (caption)
  y 1460–1550  CLAIM CLASSIFICATION: ☐ TOTAL LOSS  ☐ RECOVERABLE (pen marks)
y > 1590     graphite desk (atmosphere); right edge x > 960, y 1000–1700 without information (text ends ≤ x 952)
```

The camera is a large, stable photograph (authority): cut zoom 1.0/1.05 on pause cuts (median face of the block), slow push-in on the coverage explanation, dry punch-in 1.07 on the two central lines. Measure the face position (`qa/face-track.json`) before placing strips: with a webcam tile where the face centre sits at ~70 % of the height, a strip "over the torso" hits the chin, so the strip goes on top, over the background. In the CTA the photo becomes the **last frame in B&W**, filed (the camera clip ends with the voice; without a still the photo went black).

## Palette and typography

| Role | Hex |
|---|---|
| Desk (graphite) | `#111315` / `#191c1f` / `#24282c` |
| Sheet (off-white) / shadow / ruling | `#ebe6db` / `#ddd6c8` / `#cfc7b7` |
| Ink / secondary / faded | `#1a1d20` / `#4f545a` / `#8b9095` |
| Single accent: evidence-marker yellow | `#f5c400`; active word and highlighter `#ffd84d` |
| Impact strip | graphite `#15181b` at 92 % with a yellow filament |

No red, green or blue. State is never colour alone: always text + shape (X, strike, ✓). Fonts: **Archivo** variable (OFL, google/fonts, not in the kit: ship the `OFL.txt`): width 62 / weight 900 for titles and captions, width 88 / weight 600 letter-spaced small caps for form labels; **IBM Plex Mono** Bold (kit) only for commands and file names. Icons: Lucide (`database`, `file-archive`, `lock`, `check`, `link`, `message-circle`, `x`).

## Caption system

"Transcript strip": a band of darker paper `#e2dccf` at x 66, y 1318, 948 × 134, a 2 px graphite top rule and a ruled bottom edge, a tiny "TRANSCRIPT" label top-left. One line only, **Archivo width 62 / weight 900, up to 88 px**, uppercase, graphite `#1a1d20`; the body shrinks per group to fit 840 px (measure with the real fonts in Python, PIL `getlength` with the variation axes set). Groups of up to 3 words / 18 characters.

- Active word: an **evidence label**: pure black on light yellow `#ffd84d`, square corners, padding `3px 12px 0` (≈ 15:1).
- Commands and file names in IBM Plex Mono lower case at 0.8 em inside the caption.

```css
#cap-strip{position:absolute;left:66px;top:1318px;width:948px;height:134px;z-index:8;background:#e2dccf;
  border-top:2px solid #1a1d20;border-bottom:2px solid #cfc7b7}
.capw{position:absolute;left:80px;top:1338px;width:870px;height:108px;z-index:9;display:flex;align-items:center;justify-content:center}
.cap{white-space:nowrap;text-align:center;line-height:1.1;color:#1a1d20;font-family:ARC;
  font-variation-settings:"wdth" 62,"wght" 900;text-transform:uppercase}       /* font-size set per group (≤ 88 px) */
.cap .w{display:inline-block;padding:3px 12px 0;margin:0 1px}                    /* active: #ffd84d, color #000 */
.cap .w.mono{font-family:PLEX;font-size:.80em;padding-top:8px;text-transform:none}
```

```python
def cap_size(ws, arc, plex, base=88, maxw=840):
    w = sum((plex.getlength(x["shown"]) * .8 if is_mono(x) else arc.getlength(x["shown"].upper())) + 24 + arc.getlength(" ") for x in ws)
    w *= base / 100.0                       # fonts loaded at 100 px; arc.set_variation_by_axes([900, 62])
    return min(base, int(base * maxw / w)) if w > maxw else base
```

## Scene grammar

Generic example: a speaker warning that family photos kept only on one phone are lost when the phone breaks, and describing a nightly automatic copy of the photo library to a separate cloud folder, so the loss becomes recoverable.

| Beat | Tab | What happens |
|---|---|---|
| Hook | SCENE | Assembled frame; the object tips over on the verb (flash + B&W); "COPY OUTSIDE: NONE"; X on TOTAL LOSS; tent B. |
| Cause | CAUSE | Line diagram: machine box with the ONLY COPY inside; dashed second copy outside on "backup"; label for the spoken technology. |
| Thesis | — | Music silence + riser; top strip with the speaker's words; yellow arrow OUTSIDE THE MACHINE; punch 1.07; trailer hit + sub drop. |
| The routine | COVERAGE | Clause slides up from below; fields filled when said (routine, ☒ daily, action, clock to the spoken hour, via). |
| Route | COVERAGE | File chip travels the dashed line to the outside vault; handle turns, it locks; ✓ COPY OUTSIDE. |
| What is protected | REPORT | INSURED ASSET · CONTENT NOT SHOWN, redaction bars line by line; personal-data note. |
| Rule | REPORT | Riser + silence → two-line rule, second line highlighted; punch; music turn. |
| Retest | REPORT | Scene photo back, the object falls again; pen strikes TOTAL LOSS and ticks RECOVERABLE; header CONCLUDED. |
| CTA (6 s) | — | Final record flash; the photo becomes the last frame in B&W; a CASE CLOSURE sheet rises over the zone and the transcript, leaving RECOVERABLE visible: question (second line highlighted), "Tell us in the comments", logo + handle, a signature field where the pen ticks Follow → ☒ Following in yellow. |

Rules: numbers only if spoken (a spoken hour may appear; the scale and the tents never carry digits); the insured content is never shown (redaction bars, no names, no counts); the rule title may join two literal phrases of the speech, but say so in the handoff; tools and destinations only as plain text when spoken, no logos; recommendations the speaker did not make ("test the restore") go in the post caption, not on screen as his words.

## Transitions and motion vocabulary

- **Tab change**: the report page rises with a vertical `clip-path` (0.18–0.22 s) and a paper slide.
- **Forensic flash**: a white layer restricted to the photo (opacity 0.9 → 0 in 0.1 s) and a crossfade to the `foto` camera variant for 0.45 s; keep it inside the photo so the top-margin detector stays quiet.
- **The fall**: the scene object rotates 80° around its base corner (0.3 s `power2.in`) and its LEDs switch off.
- **Pen marks**: X, strike and tick as SVG strokes drawn by `stroke-dashoffset` (0.18–0.3 s); a yellow fill behind RECOVERABLE.
- **Redaction**: black bars grow from the left (`scaleX`, 0.2 s) one line every 0.36 s, each on a ruled guide with a bullet.
- **Route**: the chip moves along the dashed path (`motionPath`-like `x/y` tween), arrowhead at the end; the vault handle turns 90° and locks.
- **CTA sheet**: rises from below (0.45 s `power3.out`) and stops above the classification.

## Sound design

| Action | Category | gain_db | length |
|---|---|---|---|
| Frame 0 / gaps | `bass_impact` | −18 to −16 | 0.6 |
| The fall | `server_down` (synth) + `cage_or_metal_slam` | −26 to −18 / −23 to −17 | 0.9–1.1 / 0.6–0.8 |
| Forensic flash | `camera_shutter`, `camera_flash`, `flash_charge` (synth) | −22 to −17 / −22 / −30 | 0.5 / 0.4 / 0.6 |
| Pen marks | `pen_write`, `pen_tick` (synth) | −23 to −16 / −30 to −22 | 0.3–0.35 / 0.16 |
| Pages | `paper_slide` (synth), `page_turn` | −29 to −16 / −20 | 0.45 / 0.6 |
| Tents, chips | `pop`, `click` | −24 to −21 / −27 | 0.2 |
| Build-ups / central lines | `riser`, `trailer_hit`, `sub_drop` | −22 to −21 / −13 to −11 / −19 to −17 | 0.62 / 1.2–1.4 / 0.6–0.7 |
| Moves / route | `whoosh`, `swipe` | −24 to −21 / −27 | 0.5–0.8 / 0.5 |
| Clock | `clock_tick` | −26 to −24 | 0.4–0.5 |
| Vault / note | `vault_lock` (synth), `lock_click` | −16 / −24 | 0.8 / 0.3 |
| Recoverable / Following | `success_chime` | −22 to −16 | 0.9–1.0 |

Synthesised (numpy, deterministic): **server_down** = a fan slowing down (180 Hz decaying exponentially to 28 Hz, with the 2nd harmonic) + hiss + a relay click; **paper_slide** = band-passed noise (600–3800 Hz) in a sine envelope; **pen_tick** = a 12 ms high-passed tap + a short scratch; **vault_lock** = a 55 Hz thump + a metallic ring (980/1570/2330 Hz) + a double latch click 70 ms apart; **flash_charge** = a faint sine sweep 1.8 → 6 kHz.

**Music:** `music:369` (Need for speed, serious and determined trap; the beat enters at 12 s of the file) — reference. `full −2 dB` from src 13 for the hook; `lowpass −3 dB` (continuous `src`) for the cause; a 0.3 s **silence** before the thesis; `full 0 dB` continuous through the coverage and the report, with 4 dB dips on weak-voice windows; riser + 0.5 s **silence**; `full −7 dB` from src 72 (the dense stretch) for the rule, the retest and the CTA, 1 s fade, `cta_boost_db` 5. Alternative: `music:871` (dark piano and percussion suspense, the original choice: hook from src 5, rule and CTA from src 50; changed only to avoid repeating a track inside the batch), `music:293` (serious trap, drop at 11 s).

```json
[{"start":0,"end":"CAUSE","mode":"full","gain_db":-2,"track":"A","src":13.0,"fade_in":0.02,"fade_out":0.08},
 {"start":"CAUSE","end":"THESIS-0.32","mode":"lowpass","gain_db":-3,"track":"A","src":"t+13","fade_in":0.08,"fade_out":0.06},
 {"start":"THESIS-0.01","end":"RULE-0.6","mode":"full","gain_db":0,"track":"A","src":"t+13","fade_in":0.03,"fade_out":0.12},
 {"start":"RULE-0.1","end":"DURATION","mode":"full","gain_db":-7,"track":"A","src":72.0,"fade_in":0.02,"fade_out":1.0}]
```

## CTA design inside the style

A **CASE CLOSURE** sheet rises over the report zone and the transcript and stops above the classification, so RECOVERABLE stays visible to the end. The thematic question ("Does your <asset> have a copy outside the machine?", second line highlighted), "Tell us in the comments", logo + handle, and a **signature field**: the pen ticks the Follow box, which turns into ☒ Following in yellow. The photo is the last camera frame in B&W after a final record flash. ≥ 6 s after the last word. Button words exactly as in `brand.json`; upper case only through CSS.

## Implementation notes

- Two camera variants and a still for the CTA:
  ```python
  GRADE_VF = "eq=contrast=1.06:saturation=0.80:brightness=-0.012,colorbalance=rs=-0.025:rm=-0.02:bs=0.02:bm=0.01"
  FOTO_VF = "format=gray,eq=contrast=1.38:brightness=0.035,unsharp=5:5:0.6,format=yuv420p"
  rk.styled_camera(work, "grade", GRADE_VF); rk.styled_camera(work, "foto", FOTO_VF)
  # last frame of the B&W variant, shown in the CTA
  subprocess.run(["ffmpeg", "-v", "error", "-y", "-sseof", "-0.2", "-i", str(a / "camera-foto.mp4"),
                  "-frames:v", "1", "-q:v", "3", str(a / "photo-final.jpg")], check=True)
  ```
- The reference scale is an object (a light plate with a border and a soft `feDropShadow`, bars on the inner edge, an 18 % grey field, two distortion circles), with no inscription: tiny text in a decorative SVG reads as broken text.
- Paper texture via a grain PNG with `mix-blend-mode: multiply`; keep the composition to one blend layer and light grain.
- When a cold-open line comes from right after the next block in the source, cut it from its own silence and let the reasoning restart from the earlier block without repeating the hook.

## Pitfalls found in production

- **The hook headline wrapped into three lines** and touched the caption, reading as one sentence with it: 84 px without wrap and a separate transcript strip.
- **The impact strip hit the chin** (face low in the tile): move it to the top of the photo, ~20 px above the hair, checked on a native crop.
- **The scale's circle read as a stray letter** and its bars as crop marks: redraw it as a physical object, no inscription.
- **An empty circle at the end of the name line** looked like a dead control: removed. **A decorative pencil** at the top read as a grey bar: removed.
- **Tent B floating far from its text**: glue it to the word it marks; tent A on the photo border so it does not turn grey in the B&W flash.
- **Redacted lines empty for 3 s** looked like placeholders: sweep the bars one by one from the first word of the beat.
- **The TOTAL LOSS → RECOVERABLE swap lasted 1.4 s** and the CTA covered it: move the retest earlier and stop the CTA sheet above the classification.
- **The photo went black in the CTA**: use the last frame as a still.
- **Reduced sheets** made vision misread small capitals (a "B" as "R", "_" as "."): confirm on native crops before "fixing" text.

## Variations

- **Fire inspection after the fact**: a building plan with exits checked; for incident-response talks.
- **Vehicle accident report**: a sketch of the crossing with arrows; for "who caused it" post-mortems.
- **Warranty claim desk**: a product with a serial plate and a covered / not covered table; for terms and limits of a service.
- **Paid-ad version**: the case closure sheet carries a "Learn more" button (Paid-ad variant).
