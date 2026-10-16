---
style: auditorio
name: Auditório (TV quiz show)
family: fixed-style
best_for: remarketing ads with a "Learn more" CTA whose speech answers the most common objections or questions one by one ("three questions people ask about…", "first… second… third…"); each answer is a round of a TV quiz show with a scoreboard
reference: produced by the PycodeBR team with heditor, Oct 2026
---
# Auditório (TV quiz show)

The Reel is a Brazilian-style TV variety and quiz show. Crimson velvet curtains frame the stage, a bulb marquee shows the name of the show with a swinging bell and a three-bulb scoreboard (? ? ?), stage beams sweep behind the host, a golden podium and audience silhouettes fill the bottom. The speaker is the host and contestant at once: each spoken question becomes **ROUND 1, 2, 3** with a blue chamfered question card (the word being read lights up), two answer options in diamonds (A/B), and the spoken answer turning green with a check while the score goes 1/3 → 2/3 → 3/3. Real proofs appear on a framed stage screen. On the closing line, velvet doors behind the host open onto golden light and the "LEARN MORE ›" button lands on the host's chest. The core metaphor: **every doubt is a round, and every answer scores a point**.

## When to use / when not to

Use it when the speech:
- is literally a sequence of questions and answers (objections, FAQs, myths);
- has short, clear answers ("yes", "no, you don't need to…") that can light an option;
- benefits from a playful but trustworthy energy (remarketing, onboarding).

Avoid it when:
- the topic is serious or sensitive (a game show trivialises it);
- there is only one question (one round is not a show);
- the answers are nuanced "it depends" (A/B options would oversimplify);
- the batch already has a talk show (`podcast`) or a stage world (`keynote`).

## Signature moves

1. **Frame 0**: marquee lit with the show title ("3 QUESTIONS"), bell swinging, scoreboard "? ? ?", beams moving, the host already speaking in a large position. A ribbon "ABOUT <PRODUCT>" drops from the marquee on the product name.
2. **Round change**: marquee flips to "ROUND N", lights flash, a bell ding, the host slides to one side.
3. **Question card**: blue chamfered card with the whole question; each word lights yellow as it is read.
4. **A/B options**: two diamonds with short options; the option matching the spoken answer turns green with ✓, the other dims; a scoreboard bulb turns into ✓ and the score updates.
5. **Proof screen**: a 16:9 stage screen with a black frame and bulbs, a small LED label; real platform screens, diagrams, code and materials appear as the answer mentions them.
6. **✓ chips and a growing "YOU TAKE" checklist** in the last round, one chip at a time under the screen, a golden chip for the strongest promise said.
7. **Doors open for the CTA**: velvet doors behind the host part onto golden light; the marquee switches to the product name; the white button sits over the host's chest and is tapped on "learn".
8. **Dark disc with a bulb ring** behind the host, following every move: it hides matte residues (a dark mesh chair) and reads as a stage spotlight.

## Frame and layout

Canvas 1080×1920, 30 fps, Paid-ad variant (`../captions-and-layout.md`).

```
y 0–270     valance and curtain only (keep its gold trim dark enough for the top check)
y 288–420   marquee with bulbs (text ≥ 300)
y 424–488   ribbon under the marquee (hook)
y 436–540   question card (rounds)
y 590–850   A/B options column x 40–420
y 585–928   proof screen 16:9 x 440–1050 (bulb frame, LED label inside, bottom-left)
y 948–1028  one chip at a time under the screen
y 1046–1150 caption box
y > 1165    golden podium with LED strips, glossy floor; audience silhouettes y > 1380
```

Host cutout states (chin ≤ y 1030, base always behind the podium, side fades):

| State | Scale | Position | Used for |
|---|---|---|---|
| `hero` | 0.66 | centre | hook |
| `right` | 0.56 | right | options column on the left |
| `left` | 0.48 | left | proof screen on the right |
| `cta` | 0.50 | centre | button over the chest |

The proof screen enters only after the host has landed (a preview caught it crossing the face during a move).

## Palette and typography

| Role | Hex |
|---|---|
| Velvet | `#3a0610` → `#7c1022` |
| Gold / bulbs | `#ffc53d` / `#fff1b8`, trims `#e0a83a` |
| Question panels | electric blue `#0b22c9` → `#2f5bff`, border `#6fd7ff` |
| Correct | green `#18d26a` |
| Disc behind host | `#0a0407` |
| Caption box | `rgba(22,4,10,.95)` with gold top rule |

Fonts (OFL, in the kit): **Bebas Neue** (marquee, cards, chips), **Anton** (captions), **Inter** (micro text). Icons: Lucide (`bell`, `check`, `x`, `play`, `code`, `bot`, `folder`, `pointer`, `door-open`).

## Caption system

"TV lower third": dark crimson box `rgba(22,4,10,.95)`, 4 px gold top rule `#e0a83a`, radius 14, padding `4px 20px 0`, Anton uppercase white, one line, ≤ 800 px, size fitted.

- Grouping: ≤ 3 words.
- Active word: **black on `#ffd84d`** (≈ 13:1), radius 8.

```css
.capwrap{left:0;top:1046px;width:1080px;height:106px;z-index:40;display:flex;align-items:center;justify-content:center}
.cap{display:inline-block;max-width:800px;background:rgba(22,4,10,.95);border-radius:14px;border-top:4px solid #e0a83a;padding:4px 20px 0;
  font-family:Anton;font-size:var(--fs,76px);line-height:1.14;color:#fff;text-transform:uppercase;white-space:nowrap}
.cap .w{display:inline-block;border-radius:8px;padding:0 .08em;margin:0 .02em}
```

## Scene grammar

Generic example: a speaker answering the three questions prospects most often ask about a course (format of the classes, prerequisites, what the student keeps at the end).

| Beat | Scene | Host | What happens |
|---|---|---|---|
| Hook | Marquee "3 QUESTIONS" | `hero` | Bell swinging, "? ? ?", beams; ribbon "ABOUT <PRODUCT>" on the product name. No SFX on the first word. |
| Round 1 | Question card | `right` | "ROUND 1", bell ding; card with the question, words light as read; options A/B. |
| Answer 1 | Correct option | `right` → `left` | Spoken "yes" lights A green ✓, bulb 1 → ✓ (1/3); screen shows the real platform; chips for each spoken benefit. |
| Round 2 | Question card | `right` | Same grammar; a note for the nuance the speaker adds ("WHO ALREADY CODES"). |
| Answer 2 | Correct option | `left` | Spoken "no" lights B green ✓ (2/3); green card for the spoken reassurance; proof screen pans a workflow diagram, then the product. |
| Round 3 | Question card | `right` | Third question. |
| Answer 3 | Correct + finale | `left` | ✓ (3/3), marquee blinks green, low applause; "YOU TAKE" checklist grows; golden chip for the strongest promise; one chip at a time under the screen. |
| Spoken CTA | Doors | `cta` | Doors open on gold light, marquee shows the product, white "LEARN MORE ›" over the chest, finger tap on "learn". |
| End card (4 s) | Curtain | out | Curtain closes; brand, product, button, "TAP LEARN MORE"; hit and applause. |

Rules: numbers on screen only from the speech (three questions → rounds and score 1/3–3/3); no prize, money or counter; options are paraphrases of the spoken answer, never invented alternatives that put words in the speaker's mouth; keep long answers intact rather than cutting inside them (the reference ran 69 s for three full answers and dropped a whole digression instead).

## Transitions and motion vocabulary

- **Marquee flip**: letters swap with `rotationX` 0.12 s per half; bulbs chase in `steps(4)`.
- **Bell swing**: rotation ±12° damped over 1.2 s.
- **Question light-up**: each word's colour white → `#ffd84d` at `word.start`.
- **Correct answer**: option background → `#18d26a` 0.15 s, check `scale 1.6 → 1` `back.out(3)`, other option opacity .35.
- **Beams**: two `clip-path` cones rotating ±8° slowly (6 s yoyo), `mix-blend-mode: screen`.
- **Doors**: two velvet panels `x 0 → ∓560` in 0.6 s `power3.inOut`, gold radial light behind.
- **Curtain close**: panels back in 0.45 s.

## Sound design

| Action | Category | gain_db | length |
|---|---|---|---|
| Ribbon / chips | `pop` | −29 to −26 | 0.15 |
| Round bell | `lightbulb_ding` | −23 to −22 | 0.4 |
| Round change | `whoosh` | −25 to −24 | 0.4 |
| Question typing | `typewriter` | −30 | 0.5 |
| Correct answer | `success` + `game_coin` | −21 to −20 / −27 | 0.5 / 0.3 |
| Camera moves / screen swaps | `swipe` | −27 to −24 | 0.3 |
| Screen on | `spotlight_on` | −27 | 0.4 |
| Chips | `click` | −29 to −28 | 0.12 |
| Stamps | `stamp` | −26 to −24 | 0.3 |
| 3/3 | `level_up` + `applause_short` (low) | −25 / −31 | 1.0 |
| Doors | `door_open` + `cymbal_swell` | −24 / −28 | 0.8 |
| Button / end | `mouse_click`, `trailer_hit`, `applause_short` | −26 to −18 / −16 / −21 | 0.2–1.0 |

SFX over words at −26 to −31 dB.

**Music:** `music:33` (Motivating Mornings: brass, bass and drums, an audience-show drive) — reference. From 12 s of the file (full part, no intro), one continuous section to the CTA, then `cta_boost_db` 4 and a 1.2 s fade. Alternatives: `music:82` (quirky game groove) for a lighter show, `music:31` for a warmer finale.

```json
[{"start":0,"end":"VOICE_END","mode":"full","track":"A","src":12.0,"fade_in":0.01,"fade_out":0.06},
 {"start":"VOICE_END","end":"DURATION","mode":"full","track":"A","src":"t+12","fade_in":0.04,"fade_out":1.2}]
```

## CTA design inside the style

Spoken CTA: velvet doors open onto gold light, the marquee shows the product name, a big white "LEARN MORE ›" over the host's chest, tapped on "learn", glow pulsing. End card (4 s): the curtain closes; brand, product, button and "TAP LEARN MORE"; final hit and applause; music up.

## Implementation notes

- Chamfered cards: `clip-path: polygon(24px 0, calc(100% - 24px) 0, 100% 50%, calc(100% - 24px) 100%, 24px 100%, 0 50%)` with a 3 px border simulated by a slightly larger element behind.
- Diamonds: rotated squares (45°) with the letter counter-rotated.
- Proof screen: black frame with bulbs generated by Python, LED label in mono; content = cropped stills or muted clips from the advertiser's material.
- Matte: Apple Vision `.accurate` + background-plate cleanup + largest connected component, second pass for thin chair slivers and edge fringe; RGB untouched.

## Pitfalls found in production

- **Screen over the face during a move** (one preview frame): enter after the host lands.
- **Chair residues** beside an ear when the head turns: disguised by the dark disc; more aggressive removal cut glasses temples and shoulders, so it was rejected.
- **Length**: three full answers took 69 s (the script asked for 35–45 s). Keep the answers whole; drop a digression at a clean boundary instead, and flag the length for the client.
- **Top margin**: the valance gold trim sits around y 250; keep it dark so the pixel gate passes.

## Variations

- **Lightning round**: five quick yes/no questions, no proof screen, a buzzer per round; for short FAQ ads.
- **Myth or fact**: options become MYTH / FACT stamps; for debunking content (organic or ads).
- **Spelling-bee board**: a word-reveal board for definitions; for glossary content.
- **Organic version**: the last round asks the audience ("what is your question?") and the CTA becomes Follow.
