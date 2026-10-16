---
style: cassino-de-precisao
name: Cassino de precisão (noir casino → precision bench)
family: fixed-style
best_for: authority family (serious tone, the speaker as the expert); talks that contrast luck/variation with method/pattern ("AI is a casino", "same input, different result", "use a reference and it stops being a gamble"); organic Reels with a comment question and Follow
reference: produced by the PycodeBR team with heditor, Oct 2026
---
# Cassino de precisão (noir casino → precision bench)

The Reel opens in a high-end noir casino: black room, deep green felt, aged brass as the only accent, a green-shaded gaming lamp at the top, slow smoke, a faint art-deco fan pattern on the wall. The speaker is the **croupier behind the table**: a large portrait without border or card, dissolved into the dark by a radial mask and lit warmly from above. On the felt, an SVG roulette (no numbers), a betting box with a chip holding the key term, cards turned face down that flip to different "answers", "≠" medallions, a fan of fifteen cards dealt from the wheel and the croupier's rake sweeping them away. At the **turn**, the lamp flickers, music cuts, and the table flips over (`rotationX`) into a **precision bench**: graphite surface, a golden ruler, registration marks, template corners, source cards, a reference folder tree, a typed specification, a mould that copies a structure, a caliper, "ADAPTED" tags, and a brass plate engraved with the rule. The camera shrinks to 84 % and cools down. The core metaphor: **without a reference you are betting; with one, it becomes engineering**.

## When to use / when not to

Use it when the speech:
- contrasts chance and control ("it never gives the same answer", "it is statistics", "one in a trillion");
- turns to a method, a pattern or a reference that removes the gamble;
- ends with a rule worth engraving (a prompt pattern, a checklist, "then review").

Avoid it when:
- the topic involves real gambling, betting addiction or money advice (the casino frame would glamorise it);
- there is no turn from luck to method;
- the tone is playful or the audience young (the noir is deliberately adult and sober);
- the batch already uses a dark-gold stage (`keynote`) or a blueprint (`manual-de-montagem`).

## Signature moves

1. **Frame 0**: dark room, lamp at half power, a two-line serif title (upright ivory + italic gold) already on screen, the camera dimmed; on the felt the wheel, the betting box with the key term and three face-down cards; title slam (1.07 → 1), a short shake, a gold filament opens.
2. **Lamp lights the croupier** on the word that names the casino: warm cone, the speaker lit, brass plate on the leather rail ("Name · Brand", true and discreet).
3. **Ball against the rotor** on the gamble word; cards flip, each showing a different abstract "answer"; two "≠" medallions slam on the negation.
4. **Statistics**: the box turns into a brass plate "STATISTICS"; the wheel subdivides (37 → 111 → 333 slots) and blurs; a fan of 15 different cards is dealt from it.
5. **Croupier's rake** (wooden handle, brass head) sweeps cards and chip off the table on "it will never happen".
6. **Turn**: the lamp flickers, music silence with a lamp hum, then the table flips (`rotationX`) and the bench rises; metal slam + trailer hit; the camera shrinks to 84 % and cools; the rail becomes brushed steel.
7. **Precision assembly**: golden template corners appear 0.15–0.4 s before each piece lands; cards "REPOSITORY LINK" and "CLONE ON YOUR MACHINE" (generic address), a folder tree "REFERENCE PROJECT", a golden arrow to an "AI" chip.
8. **Typed specification** (the prompt pattern, typed line by line with `clip-path steps()`), folder names lighting as they are mentioned, a dashed mould carrying the structure to "YOUR PROJECT", a caliper measuring, "ADAPTED" tags.
9. **Engraved rule**: the bench retracts and a plate rises with the rule in three lines; "THEN, REVIEW." enters, a magnifier sweeps the plate, a gold seal with ✓ is stamped; the light lowers over the croupier.

## Frame and layout

Canvas 1080×1920, 30 fps. Organic safe zones.

```
y 0–270      lamp cable and dark shade, smoke, deco pattern: atmosphere only, luma < 150 everywhere (the lit bulb sits at 279–295)
y 290–1010   camera: 960×720 at x 60 (casino); 806×605, y 290–895 after the turn (84 %)
y 318+       hook title over a dark gradient that covers only the top of the camera (the face, centre ≈ y 700, stays free)
y 1000–1046  leather rail with gold filaments and a brass plate (bench: 892–938, steel)
y 1044–1376  felt table (bench 936–1376): all objects between x 70 and 950
y 1388–1560  captions
y > 1570     dark carpet with faint lozenges: atmosphere
```

The camera has no frame: a radial mask dissolves its edges into the dark, a warm light falls from above and the edges stay in shadow. Slow 4.5 % push-in on the bench; punch-ins (1.05–1.08) only on the key words; alternating 1.0/1.06 zoom on pause cuts; the camera darkens at the end ("the light lowers over the croupier") and leaves in the CTA.

## Palette and typography

| Role | Hex |
|---|---|
| Dark room | `#060807` / `#050605`, wall `#16120d` |
| Felt | `#145440` → `#0c3528` → `#061a13` |
| Aged brass (single accent) | `#b8964f` / `#d4b26a` / `#d9b56a` / `#e2c487` |
| Ivory | `#efe6d2` / `#f1ead9` |
| Roulette red (slots and card backs only) | `#7a1717` |
| Leather | `#3a2216` |
| Bench graphite / steel | `#1d2124` → `#0e1011` / `#5b6266` |
| Lamp cone | `rgba(255,214,150,.2)` |
| Active word | black on light gold `#ffd970` |

Fonts (OFL): **Playfair Display** 900 and Italic (hook, turn line, CTA question, plate header: high-contrast noir serif, in the kit), **Bebas Neue** (captions, plates, labels, in the kit), **JetBrains Mono** (the specification and folder trees), **Geist** 700 for the handle (Bebas made it upper-case and low-contrast). Icons: Lucide (`equal-not`, `link`, `folder`, `git-branch`, `ruler`, `search`, `check`, `pointer`).

## Caption system

"Table plate": Bebas Neue 86 px uppercase, ivory `#efe6d2` with a soft shadow, no box; groups of up to 4 words / 20 characters, at most 2 lines, y 1388–1560.

- Active word: **black on a light-gold block `#ffd970`** with almost square corners (radius 3: a plate, not a pill), ≈ 14:1. Check accented capitals inside the block on native crops.
- Colloquial contractions in the captions (written as spoken) lower the small-model `asr-check` similarity; judge by the delta.

```css
.capw{left:70px;top:1388px;width:880px;height:172px;z-index:30}
.cap{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;opacity:0}
.cap .t{font-family:Bebas;font-size:86px;line-height:1.02;letter-spacing:1.5px;color:#efe6d2;text-align:center;text-transform:uppercase;
  text-shadow:0 4px 14px rgba(0,0,0,.85)}
.cap .w{display:inline-block;padding:4px .12em 0;margin:0 -.02em;border-radius:3px}   /* active: background #ffd970, color #000 */
```

## Scene grammar

Generic example: a speaker explaining that an AI model rarely returns the same answer to the same prompt, and that pointing it to a reference project (link or local clone) with a short instruction makes the result predictable, followed by a review.

| Beat | Scene | What happens |
|---|---|---|
| Hook | Dark casino | Title already on screen, wheel, betting box, face-down cards; title slam, low hit. |
| "It is a casino" | Lamp on | Cone of light, the croupier lit, plate on the rail; punch 1.05. |
| The gamble | Wheel + cards | Ball launched against the rotor; cards flip to different answers; "≠" medallions slam on the negation. |
| Why | Statistics | Box → plate "STATISTICS"; wheel subdivides and blurs; fan of 15 cards dealt; chip returns to the felt. |
| "Never" | Rake | Rake sweeps cards and chip off the table. |
| Turn | Flip | Lamp flicker + music silence + hum; table flips into the bench; slam + hit + new track on the hit. |
| Recommendation | Bench | Italic line with the recommended verb in gold; registration marks. |
| Steps | Assembly | Template corners → source cards → reference tree → arrow to "AI". |
| Thesis line | Specification | 0.24 s music gap; spec typed line by line; folders light; mould → "YOUR PROJECT"; caliper; "ADAPTED" tags. |
| Rule | Plate | Bench retracts; plate with the 3-line rule (wipes, shake, flash). |
| Review | Seal | "THEN, REVIEW."; magnifier sweep; gold ✓ seal (stamp + hit + chime) on the tail of the last word; light lowers. |
| CTA (5.5 s) | Table again | Big felt with a gold filament; question in Playfair; the two possible answers as two bets on the table; "Tell us in the comments"; logo in a black-lacquer medallion with a gold rim; handle; Follow → Following. |

Rules: rhetorical exaggerations ("one in a trillion") stay speech only, never a number or chart; the rule on the plate is a faithful paraphrase; the post caption carries the nuance (a reference reduces variation; it does not guarantee an identical result).

## Transitions and motion vocabulary

- Dry cuts and slams (title `scale 1.07 → 1` with a 5 px shake) on the central sentences only.
- **Table flip**: `#table rotationX 0 → 90` (0.22 s `power2.in`), swap, `#bench rotationX −90 → 0` (0.35 s `expo.out`), perspective 1600 px; flash 0.4; shake 8 px.
- **Card flip**: `scaleX 1 → 0 → 1` swapping faces at the midpoint (0.18 s).
- **Wheel**: slots as `stroke-dasharray` on a circle; rotor rotation linear; subdivision by changing the dash array; blur via `filter: blur(2px)` only on the wheel group.
- **Rake**: a linear sweep (0.7 s); each card leaves when the head reaches its x.
- **Typing**: `clip-path: inset(0 100% 0 0) → inset(0)` with `steps(n)` per line.
- **Wipes** on the plate lines: a gold bar crossing each line (0.3 s).

## Sound design

| Action | Category | gain_db | length |
|---|---|---|---|
| Frame 0 | `bass_impact` + `sub_drop` | −13 to −12 / −18 to −17 | 0.8 |
| Lamp on / failing | `flicker` (synth) + `spotlight_on` | −24 to −20 / −22 to −20 | 0.45 |
| Moves | `whoosh` | −24 to −16 | 0.4 |
| Roulette ball | `ball` (synth) | −27 to −24 | 2.6 |
| Chip | `chip` (synth) | −24 to −18 | 0.35 |
| Cards | `card` (synth) | −27 to −24 | 0.18 |
| "≠" / turn | `cage_or_metal_slam` | −19 / −13 | 0.6 |
| Statistics / swaps | `click`, `swipe` | −29 to −21 / −27 to −21 | 0.2–0.35 |
| Fan of cards | `riser` (low) | −27 | 0.8 |
| Turn | `reverse_impact` + `trailer_hit` | −20 / −14 to −12 | 0.6 / 1.0 |
| Pieces lock | `lock_click`, `ratchet` (synth caliper) | −25 to −21 / −28 to −25 | 0.3 / 0.5 |
| Cards / spec | `data_beep`, `page_turn`, `keyboard` (low) | −29 / −19 / −30 | 0.3–1.0 |
| Arrow | `pop`, `key_turn` | −26 / −25 | 0.3 |
| Rule / seal | `stamp`, `scan`, `success_chime` | −19 to −11 / −28 / −19 to −15 | 0.3–0.8 |
| Follow tap | `mouse_click` | −11 | 0.2 |

Synthesised (numpy, deterministic): **chip** = two or three short clicks (band 3.1–5.2 kHz, 12 ms decay, 34 ms apart); **ball** = rolling (band-passed noise, fading) with clicks whose spacing grows by ×1.22 until a final drop; **card** = a 40 ms high-passed noise puff + a soft 0.9–2.1 kHz tap; **ratchet** = seven dry clicks 55 ms apart; **flicker** = a 100 Hz square hum + 200 Hz, gated in irregular bursts with crackles.

**Music:** two tracks. Casino: `music:597` (Vertigo, tense and stealthy) from 5.2 s of the file, `full +1.5 dB` to ~3 s, then `lowpass +2.5 dB` under the explanation; **silence** during the lamp flicker; bench: `music:677` (Epical Drums 02) entering at 57.94 s of the file so the file's hit at 58.0 s lands on the turn word, −4 dB, a 0.24 s gap before the thesis line, −3 dB to the end, 1 s fade, `cta_boost_db` 5. Alternatives: `music:871` (suspense) for the casino, `music:680` (restless cinematic drums) for the bench.

```json
[{"start":0,"end":3.3,"mode":"full","gain_db":1.5,"track":"A","src":5.2,"fade_in":0.01},
 {"start":3.3,"end":"TURN-0.4","mode":"lowpass","gain_db":2.5,"track":"A","src":8.5,"fade_in":0.2,"fade_out":0.2},
 {"start":"TURN-0.06","end":"THESIS-0.25","mode":"full","gain_db":-4,"track":"B","src":57.94,"fade_in":0.02,"fade_out":0.08},
 {"start":"THESIS","end":"DURATION","mode":"full","gain_db":-3,"track":"B","src":"t+(57.94-TURN+0.06)","fade_in":0.02,"fade_out":1.0}]
```

## CTA design inside the style

The table returns whole (felt with a gold filament). The question in Playfair with the key phrase in gold; the two possible answers as two bets placed on the felt; "Tell us in the comments"; the brand logo in a black-lacquer medallion with a gold rim (no chip stripes, so it does not look like gambling); the handle in Geist 700 light gold; a Follow button with a gold filament, tapped, turning into "✓ Following" in light gold. 5.5 s after the last word.

## Implementation notes

- Two camera grades from the same source:
  ```python
  MESA_VF = "eq=contrast=1.06:brightness=0.06:saturation=0.86:gamma=1.10,colortemperature=temperature=4300:mix=0.5"
  BANCADA_VF = "eq=contrast=1.05:brightness=0.05:saturation=0.76:gamma=1.08,colortemperature=temperature=6000:mix=0.4"
  rk.styled_camera(work, "mesa", MESA_VF); rk.styled_camera(work, "bancada", BANCADA_VF)
  ```
  Crossfade them at the turn; the camera sits in `#cam-mask` (`mask-image: radial-gradient(ellipse 60% 66% at 50% 46%, #000 64%, transparent 100%)`) with a warm `#cam-light` (radial `rgba(255,206,140,.22)`, `screen`) and a `#cam-shade` vignette on top.
- Validate in build.py that every `K.x` used by the JS exists: an undefined key silently pushed a tween to the end of the timeline.
- `linearGradient` with `objectBoundingBox` on a horizontal path (zero height) does not paint: use a solid colour or `userSpaceOnUse` for the gold arrow.
- `heditor preview <work> <times> <name>` already writes into `qa/`: pass only the file name.
- Brand words for Follow come from `brand.json` as written; upper-case with CSS only (the CTA test checks the exact text).

## Pitfalls found in production

- **Top margin**: the lamp shade and bulb are atmosphere but bright pixels count; keep everything above 270 px at luma < 150 (worst preview frame: 274 px during the seal shake).
- **Handle in Bebas** became upper-case with low contrast: use Geist.
- **Splices inside a word** (a sibilant at −37 dB): list them for listening in the handoff.
- **Intentional holds** (CTA built in steps, plate with the speaker still) trigger the freeze detector; inspect before failing.

## Variations

- **Poker night**: cards and chips only, the turn reveals a hand built from a checklist; for decision frameworks.
- **Slot machine → assembly line**: three reels that never align until the method locks them; for automation talks. Music `music:568` → `music:677`.
- **Horse race → stopwatch**: odds board that becomes a training plan; for consistency vs luck in careers.
- **Paid-ad version**: the bench ends on a "Learn more" plate (Paid-ad variant); keep the noir sobriety.
