---
style: porta-de-aco
name: Porta de aço (steel shutter at midnight)
family: fixed-style
best_for: paid-traffic ads with a "Learn more" CTA for last-day or closing-time messages ("today is the last day", "it closes tonight at…", "if you get in before that, you take…") with a list of what the viewer takes; the offer is a shop front whose steel roller shutter is coming down
reference: produced by the PycodeBR team with heditor, Oct 2026
---
# Porta de aço (steel shutter at midnight)

The Reel is a shop front on a wet street at night. A neon sign on the canopy flickers the urgency line in magenta, a wall clock and a big clock in the window both point at the spoken closing time, and the steel roller shutter is already coming down at frame 0, in jolts, with a metallic rattle. The speaker stands on the threshold (presenter cutout) with the warm shop light behind; the shutter descends *behind* the speaker at every turn of the speech, so the light shrinks without ever covering the face. On "if you get in before that", the shutter goes **up**, the window lights again and the music opens. "You take" becomes a dark glass shop window with neon plaques that light one by one, each with a proof. In the CTA the shutter comes down for good; on the closed shutter: the brand, the button and the spoken deadline, with "TAP LEARN MORE" shining through the lit gap at the bottom. The core metaphor: **the door is closing; you can still slip in**.

## When to use / when not to

Use it when the speech:
- has a real, spoken closing moment (last day, closes tonight, ends at a time);
- has a "before that" turn and a list of what the viewer takes;
- runs as an ad with "Learn more" (or a closing invitation).

Avoid it when:
- the urgency is not spoken (never invent a closing time or a countdown);
- the speech is educational or reflective;
- the batch already has a night-neon world or the brand's palette clashes with magenta/cyan;
- the clip has no list (the window has nothing to show) or is under ~25 s.

## Signature moves

1. **Frame 0 in motion**: canopy neon ("LAST DAY") flickering on with `steps`, a line with the product and the audience in cyan, wall clock and window clock at the spoken time, a "TODAY" neon, and the shutter already descending in jolts with a synthesised roller sound under the first word.
2. **Shutter as a timeline**: every pause between ideas brings a jolt (metal slam in the gap + short world shake); the warm light behind the speaker shrinks.
3. **Sign swap**: "OPEN" dies on "goes offline" and "CLOSES TODAY" lights; the digital spoken time appears on the word.
4. **Shutter goes up** on "if you get in before that": window relit, music leaves the low-pass and opens on the track's build.
5. **"You take" window**: a smoked-glass panel with 4 neon lines that light on each spoken item; each line opens a proof card (emblem + spoken frequency; a community card with generic bubbles; a spoken number with real session posters cycling; a ticket with a "ON ME" stamp).
6. **Hanging enamel sign** that swings for exclusivity ("EXCLUSIVE ENTRY · ONLY FOR <AUDIENCE>").
7. **Closing CTA**: the shutter descends continuously during the spoken CTA (music low-passes again, "behind the door"), lights blink, the speaker leaves, the shutter closes to the threshold; brand, button and deadline printed on the slats; "TAP LEARN MORE ↓" in the lit gap.

## Frame and layout

Canvas 1080×1920, 30 fps, Paid-ad variant (`../captions-and-layout.md`).

```
y 0–282     night facade above the canopy: atmosphere
y 282–424   canopy: neon line (Tilt Neon 96 px) + product/audience line (35 px); wall clock centre (958,352) r 72
y 420–1160  shop opening x 40–1040: shutter track, warm window, smoked-glass panel x 48–508 y 432–1036
y 1046–1150 caption plate
y 1160+     steel threshold with a cyan filament, wet pavement and asphalt with the inverted, blurred sign reflection, light rain
```

- Speaker cutout: `hero` (scale 0.64, face centre x ≈ 736, panel on the left) and `cta` (scale 0.56, x ≈ 790). Source frame edges hide under the smoked panel and the right pillar; body cut by the threshold at y 1160; face bottom (p95) ≤ 1040.
- The shutter is *behind* the speaker (z-order: window light < shutter < cutout < panel). Shutter edge positions in the reference: 455 → 548 at frame 0, 600, 700, 760, back up to 500, 640, then 860 → 930 → 1040 at the close.
- Jump-cut zoom 1.0 ↔ 1.03, 1.2 % breathing, punch 1.05 on the key urgency word.

## Palette and typography

| Role | Hex |
|---|---|
| Wet night | `#07060c` → `#140b1c` |
| Neon magenta (core) | `#ff2bd6` (`#ffd6f4`) |
| Neon cyan (core) | `#29f0ff` (`#e6fdff`) |
| Warm shop light | `#fff1d6` → `#f2b878` |
| Brushed steel | `#23272f` / `#3a404b` / `#555d6b`, cyan reflections |
| Active word | black on light cyan `#bff9ff` |

No flat navy, no amber (that is an elevator), gold only on the brand emblem.

Fonts (OFL): **Tilt Neon** (google/fonts, not in the kit: download with its OFL.txt) for tube signs; **Anton** for captions and the button; **Geist** for plaque text. Icons: Lucide (`clock`, `lock`, `key`, `ticket`, `play`, `message-circle`, `pointer`, `chevron-down`).

## Caption system

"Shop plaque": dark glass `rgba(8,6,12,.9)`, 3 px cyan border `#29f0ff`, radius 14, padding `8px 22px 6px`, Anton uppercase white, `font-size: var(--fs, …)` fitted, one line, ≤ 800 px.

- Grouping: ≤ 3 words / 20 characters.
- Active word: **black on `#bff9ff`** (≈ 18:1), radius 8.

```css
.capwrap{left:0;top:1046px;width:1080px;height:104px;z-index:40;display:flex;align-items:center;justify-content:center}
.cap{display:inline-block;max-width:800px;background:rgba(8,6,12,.9);padding:8px 22px 6px;border-radius:14px;border:3px solid #29f0ff;
  font-family:Anton;font-size:var(--fs,70px);line-height:1.12;color:#fff;text-transform:uppercase;white-space:nowrap;
  box-shadow:0 0 18px rgba(41,240,255,.35)}
.cap .w{display:inline-block;padding:0 .08em;border-radius:8px}
```

## Scene grammar

Generic example: a speaker announcing the last day of a special condition for existing customers, the spoken closing time, and four things the viewer takes by joining before it.

| Beat | Scene | What happens |
|---|---|---|
| Hook | Façade at night | Neon "LAST DAY", clocks at the spoken time, shutter descending; punch on "last". |
| Best condition | Window column | Big clock flies back to the wall; column lights "THE BEST / CONDITION"; emblem pops; `spotlight_on`. |
| Pause | Jolt | Shutter jolts (metal slam in the gap). |
| Exclusivity | Enamel sign | Sign swings in: "EXCLUSIVE ENTRY · ONLY FOR <AUDIENCE>"; `key_turn`. |
| Closing time | Clock + sign swap | Clock grows in the column; shutter lower on "closes"; "OPEN" dies on "goes offline", "CLOSES TODAY" lights; digital time on the word. |
| Pause | Strong jolt | Metal slam + sub drop. |
| Turn | Shutter up | "If you get in before that": shutter rises, window relit, music opens; clock pulses on "before". |
| List | Neon window | "YOU TAKE" + 4 dark lines; each spoken item lights its line and shows its proof card (emblem + frequency; community card with blank bubbles; spoken number + real posters cycling + "TODAY" stamp; ticket + "ON ME" stamp). |
| Pause | Glow + jolt | The whole list glows; metal slam. |
| Spoken CTA | Closing | "Keeping an eye on it?" headline; shutter descends continuously; white "LEARN MORE ›" + finger on "learn"; "FINISH YOUR SIGN-UP" chip. |
| End card (4.5 s) | Closed shutter | Light blinks, speaker leaves, shutter to the threshold; on it: emblem, product, "LEARN MORE ›", "STILL TODAY · UNTIL <TIME>"; "TAP LEARN MORE" + chevrons in the lit gap; final slam, chime. |

Rules: the clocks show the spoken time without a countdown (analogue hands, no ticking digits); only spoken numbers; proof cards use the advertiser's own posters and emblem; community bubbles are blank.

## Transitions and motion vocabulary

- **Shutter jolt**: `TO('#shutter',{y:edge,duration:.35,ease:'power2.in'})` then a settle (`y −6 → 0`, 0.12 s `power1.out`); world shake 4–6 px for 0.12 s; slats are a repeating-linear-gradient with a darker groove every 46 px and a bottom bar with a handle.
- **Neon flicker**: opacity sequence 0, .8, .2, 1, .5, 1 in `steps(1)` over 0.35 s; dying sign = the reverse ending at .08.
- **Reflection**: a flipped, blurred (`blur(6px)`) and squashed copy of the canopy on the asphalt, opacity .35, following every flicker.
- **Rain**: 40 seeded thin streaks (1 × 60 px) translating diagonally, 0.6 s loops.
- **Proof cards** slide from the panel edge (x −40 → 0, 0.25 s `power3.out`); posters swap every ~0.8 s.

## Sound design

| Action | Category | gain_db | length |
|---|---|---|---|
| Shutter descending | `shutter_down` (synth) / long variant at the close | −30 to −24 | 0.6 / 3.0 |
| Shutter rising | `shutter_up` (synth) | −25 | 0.8 |
| Neon tube strikes | `neon_tick` (synth) | −32 to −24 | 0.1 |
| Neon sign on | `neon_on` (synth) | −29 to −21 | 0.5 |
| Jolts (in gaps) | `cage_or_metal_slam` | −17 to −13 | 0.6 |
| Strong jolt / close | + `sub_drop` | −20 to −17 | 0.8 |
| Column / clock moves | `whoosh` | −26 to −22 | 0.4 |
| Emblem / window light | `spotlight_on` | −28 to −27 | 0.4 |
| Enamel sign | `key_turn`, `pop` | −25 / −29 | 0.3 |
| Clock | `clock_tick` | −28 | 0.6 |
| Community card | `message_received` | −29 | 0.3 |
| Posters | `page_turn` | −30 to −29 | 0.25 |
| Stamps | `stamp` | −27 | 0.3 |
| Ticket | `typewriter` | −30 | 0.4 |
| Button / taps | `mouse_click` | −28 to −21 | 0.2 |
| End | `success_chime` | −18 | 0.8 |

Synthesised sounds (numpy, no third-party licence): roller shutter = resonant metallic clicks per slat (two-pole band-pass resonators around 1.5–3 kHz) over a low modulated rumble and a faint motor hum; neon = crackles plus a 120 Hz hum with harmonics; neon tick = one short crackle.

**Music:** `music:623` (Deep Urban, nocturnal tech house) — reference. `lowpass` ("muffled behind the door") until "before that", full where the shutter rises (the file's 15 s build lands on the turn word: start the file at turn − 12.4 s), `lowpass −4 dB` again while the shutter descends in the CTA, full with `cta_boost_db` 4 and a 1.2 s fade on the end card. Alternatives: `music:597` (Vertigo, tense stealth) for a darker take, `music:293` (serious trap).

```json
[{"start":0,"end":"TURN","mode":"lowpass","track":"A","src":"15-TURN","fade_in":0.01,"fade_out":0.08},
 {"start":"TURN","end":"CTA","mode":"full","track":"A","src":"t+(15-TURN)","gain_db":-0.5,"fade_in":0.25,"fade_out":0.4},
 {"start":"CTA","end":"VOICE_END","mode":"lowpass","track":"A","src":"t+(15-TURN)","gain_db":-4,"fade_in":0.3,"fade_out":0.05},
 {"start":"VOICE_END","end":"DURATION","mode":"full","track":"A","src":"t+(15-TURN)","fade_in":0.15,"fade_out":1.2}]
```

## CTA design inside the style

The door closes on the brand. White "LEARN MORE ›" during the spoken CTA; after the voice: light blinks, the speaker disappears, the shutter reaches the threshold with a final slam and sub drop; on the slats: emblem, product name, button, "STILL TODAY · UNTIL <SPOKEN TIME>"; in the lit gap under the door: "TAP LEARN MORE" + chevrons; the button pulses 3×. 4–4.5 s, music full.

## Implementation notes

- Rebuild the voice master whenever the EDL changes: in the reference, the first render was mixed with a stale voice (before a retake fix) and drifted out of sync after 17 s; only the master ASR caught it. Make `build.py` regenerate the voice from the current EDL every time.
- When the composition HTML is byte-identical (`cmp`) to the reviewed one, an audio-only fix needs only `finalize`, not a new render.
- Matte fixes: an opaque floor on the face class (multiclass segmenter), closed and eroded interior, hole filling; despill the wall colour in an 8 px edge band only.

## Pitfalls found in production

- **A retake hidden by full-file ASR**: the first take ended without two words; full-file ASR "glued" them from the retake. A large-model ASR of the assembly showed the gap; the cut now uses the first take up to the last full word plus the whole retake (cut at the silent sample between the final syllable and the next plosive).
- **Panel over the face during camera moves**: graphics leave before the cutout moves.
- **"CONDITION" overflowing the panel** and a cut-off stamp: shrink type to the panel, check overflow in the DOM.
- **Empty end card during the transition**: build the shutter print before the speaker leaves.
- **asr-check borderline** (0.898 vs 0.90): all differences were spelling/contractions; normalised text matched 0.996. Record it as a justified exception, not as a pass.

## Variations

- **Last train**: a station platform with doors closing at the spoken time; for deadlines with a journey idea (avoid departure boards: that is `aeroporto`).
- **Gallery closing**: museum lights switching off room by room; for premium or cultural brands. Music `music:31`.
- **Pharmacy-style 24 h door** (the reverse): a door that never closes, for "always available" messages.
- **Organic version**: the closed shutter carries a question and a Follow button instead of "Learn more".
