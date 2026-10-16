---
style: bilheteria
name: Bilheteria (retro box office, numbered tickets)
family: fixed-style
best_for: paid-traffic ads with a "Learn more" CTA whose speech is about order of arrival or an extra granted to the first sign-ups ("the first N get…", "instead of X you get Y", a spoken deadline); the offer becomes a retro box office with numbered tickets
reference: produced by the PycodeBR team with heditor, Oct 2026
---
# Bilheteria (retro box office, numbered tickets)

The Reel is the façade of a retro box office: tomato-red walls with cream and gold trims, a marquee of chasing bulbs, an arched ticket window where the speaker works as the clerk, and a cream counter with a ticket slot from which the captions come out like printed tickets. At frame 0 the marquee already reads the hook, a ticket machine fires a golden ticket and a diagonal cascade of numbered tickets crosses the façade. Every idea becomes a ticket event: a ruler of unit tickets gains golden extras, punch holes mark each recurring session, stamps land on exclusivity, a turnstile spins on "accelerate", a giant golden ticket carries the turn, a "BOX OFFICE OPEN UNTIL…" sign shows the spoken deadline, the sign-up ticket slides out of the slot and the turnstile lets the viewer in. The core metaphor: **arriving first gets you the golden ticket**.

## When to use / when not to

Use it when the speech:
- talks about order of arrival or a reward for the first ones (and says the number);
- compares before/after quantities ("instead of X, you get Y");
- has exclusivity, a spoken deadline and a sign-up action;
- runs as an ad with "Learn more".

Avoid it when:
- the scarcity is not in the speech (never invent "first N" or remaining seats);
- the topic is serious or technical without an offer;
- the batch already has another warm retro world (cinema marquee, diner) or a queue/airport world (`aeroporto`);
- the brand cannot live with tomato red.

## Signature moves

1. **Frame 0 at full power**: marquee bulbs chasing, the hook in Bungee letters, a ticket machine printing a golden ticket with the spoken reward, and a diagonal band of numbered tickets (01…N) crossing the façade. The series is uniform: no ticket is marked as taken, there is no counter and no "X of N".
2. **The clerk's window is the camera**: an arched window (cream + gold rim) holding the speaker; it changes shape and place per beat (central counter → small porthole over the ruler → side window for topic tickets → back to centre for the golden ticket → left window for the deadline sign → porthole for the site → small window in the CTA).
3. **Unit ruler**: X cream tickets in a row (one per unit the speech counts: weeks, months, sessions); golden ones drop in on the spoken extra, a flip sign turns the old number into the new one, and a "+N" stamp lands.
4. **Punch holes**: when the speech gives a frequency ("a session every two weeks"), each unit ticket gets its holes punched in sequence.
5. **Attraction tickets**: each spoken topic is printed and slapped out of the machine.
6. **Turnstile** that spins on "accelerate" (speed lines) and finally releases on "start today" (green-gold light, "ENTRY RELEASED").
7. **Golden ticket** for the turn: music stops, tape stop, impact in the gap, a giant gold ticket with the emblem; the speaker appears as a cutout in front of a near-black velvet arch (the only moment with a matte, because the arch hides edge residues).
8. **Deadline sign**: "BOX OFFICE OPEN" with a desk calendar showing the spoken day directly (a flip from a blank page looked like a placeholder).
9. **Your ticket comes out of the slot** on "secure your spot", lighting the "LEARN MORE ›" button.

## Frame and layout

Canvas 1080×1920, 30 fps, Paid-ad variant (`../captions-and-layout.md`).

```
y 0–278     striped awning (tomato/cream) and roof: atmosphere only (keep it dark enough for the top check)
y 278–420   marquee: gold rim at 278, bulb letters from y 290
y 420–1030  façade: arched window (camera), ticket machine, ruler, signs, cascade band
y 1030–1160 cream counter with the ticket slot; captions print from here
y 1046–1150 caption ticket strip
y > 1160    striped base and floor: atmosphere only
```

- Keep the face free: measure it (e.g. x 240–760, y 870–1390 in the source) and size each window so graphics stay outside it.
- The cutout appears only on the golden ticket, over a velvet arch `#120608`; everywhere else the camera is a window (safer when the matte loses a dark shirt against a lilac wall).

## Palette and typography

| Role | Hex |
|---|---|
| Façade tomato / deep red | `#E0452B` / `#9C1C12` |
| Ticket cream | `#F7E8C9` |
| Gold / bright gold | `#F2B53A` / `#FFD45C` |
| Ink | `#2B160E` |
| Bulb | `#FFF2C2` with glow |
| Velvet arch | `#120608` |
| Group/community stamp (only if spoken) | green `#25D366` |

Fonts (google/fonts, OFL; Bungee and Alfa Slab One are not in the kit: download them with their OFL.txt into `composition/assets`):
- **Bungee** — marquee letters.
- **Alfa Slab One** — tickets, numbers, stamps (it has the "Nº" glyph).
- **Anton** (kit) — captions.
- **JetBrains Mono** (kit) — perforation labels and ticket footers.

Icons: Lucide (`ticket`, `stamp`, `calendar`, `rotate-cw`, `lock`, `check`, `pointer`, `chevron-down`). A messaging-group glyph only with permission; otherwise text.

## Caption system

"Printed ticket": cream strip `#F7E8C9` with a perforated edge on both sides (CSS radial-gradient notches), padding `8px 30px 6px`, Anton uppercase, ink `#2B160E`, `font-size: var(--fs, 64px)`, one line, ≤ 800 px, emerging from the counter slot.

- Grouping: ≤ 3 words / 20 characters.
- Active word: **white on deep red `#9C1C12`** (≈ 7:1), radius 6.
- Avoid radial masks on caption strips: lint warned about too many heavy overlay layers (> 40) and black-frame risk.

```css
.capwrap{left:0;top:1046px;width:1080px;height:106px;z-index:40;display:flex;align-items:center;justify-content:center}
.cap{display:inline-block;max-width:800px;background:#F7E8C9;padding:8px 30px 6px;font-family:Anton;font-size:var(--fs,64px);
  line-height:1.12;color:#2B160E;text-transform:uppercase;white-space:nowrap;
  -webkit-mask:radial-gradient(circle 9px at 0 50%,#0000 98%,#000) left/51% 100% no-repeat,
               radial-gradient(circle 9px at 100% 50%,#0000 98%,#000) right/51% 100% no-repeat}
.cap .w{display:inline-block;padding:0 .08em;border-radius:6px}
```
(If the per-strip mask counts as a heavy layer in lint, draw the notches with two small cream-coloured circles in the counter colour instead.)

## Scene grammar

Generic example: a speaker saying that the first N sign-ups get an extra period of a programme on top of the regular one, listing what the programme includes and a spoken deadline.

| Beat | Scene | Camera | What happens |
|---|---|---|---|
| Hook | Marquee + golden ticket | central window | Marquee lit, machine prints "Nº 01–N · +<SPOKEN EXTRA>", cascade band; emblem stamped on the product name; the extra pulses (punch 1.05). |
| Context | Ticket tear | central | Ticket torn along the perforation, drops to the counter. |
| Before/after | Unit ruler | porthole | Ticket guillotine transition; ruler of X units; gold tickets drop, flip sign X → Y, "+N" stamp, light shake. |
| Sessions | Punch holes | porthole | Holes punched in sequence on "every two weeks". |
| Community | Stamp | porthole | Group stamp + "DAY BY DAY" with perforations running. |
| Topics | Attraction tickets | side window | One ticket per spoken topic. |
| Programme | Stub + stamp | side window | Stub "SUPPORTED PROGRAMME" + "INTENSIVE" stamp. |
| Accelerate | Turnstile | side window | Turnstile spins fast, speed lines. |
| Turn | Golden ticket | cutout on velvet | Music silence 0.26 s in the real gap, tape stop, lamps dim, impact; giant golden ticket "BEST CONDITION …" with the emblem; "EXCLUSIVE" stamp; audience pass on a lanyard. |
| Deadline | Sign | left window | "BOX OFFICE OPEN · UNTIL <SPOKEN DAY>" with the calendar. |
| Spoken CTA | Your ticket | central | "YOUR SIGN-UP" ticket out of the slot; "LEARN MORE ›" lights; finger tap on "learn". |
| Site | Phone | porthole | Real page scrolling (no price). |
| Finish | Stamp + turnstile | central | "SIGN-UP ✓" stamp; turnstile releases "ENTRY · START STUDYING". |
| End card (4.5 s) | Marquee + button | emblem in the arch | Marquee shows the product name, emblem inside the arch in the same frame the camera ends, big cream "LEARN MORE ›" button, chevrons, "TAP LEARN MORE". |

Rules: numbers only as spoken (the reward, the before/after, the day); the decorative ticket series and unit indices are drawn with CSS counters and listed in `allowed_numbers`; no ticket is ever shown as sold out.

## Transitions and motion vocabulary

- **Ticket guillotine**: a band of tickets crosses the frame diagonally (x −1400 → 1400, 0.5 s `power2.inOut`) and swaps the scene behind it.
- **Bulb chase**: bulbs toggle in a 4-step cycle (`steps(4)`, 0.4 s loop); on the turn they all dim, then flash on.
- **Flip sign**: split-flap of the number (two halves, `rotationX` 0 → −90 / 90 → 0, 0.12 s each).
- **Window morph**: the arch window tweens `left/top/width/height/borderRadius` (0.45 s `expo.inOut`); graphics leave 0.2 s before and enter after it lands.
- **Ticket print**: `clip-path: inset(0 0 100% 0) → inset(0)` 0.3 s with a 4 px vertical jitter (`steps(6)`).
- **Stamp**: `scale 1.7 → 1`, rotation −10 → −6, 0.16 s + 3 px shake.

## Sound design

| Action | Category | gain_db | length |
|---|---|---|---|
| Ticket printer | `typewriter` | −28 | 0.6 |
| Ticket roll / flip sign | `slot_machine_reel` | −28 | 0.5 |
| Stamps | `stamp` | −28 (−24 when isolated) | 0.3 |
| Reward glints | `coins` | −28 | 0.5 |
| Punches | `click` | −28 | 0.12 |
| Scene changes | `whoosh` | −28 to −20 | 0.4 |
| Tear / paper | `page_turn`, `newspaper` | −28 | 0.3 |
| Group stamp | `message_received` | −28 | 0.3 |
| Turnstile | `fast_forward` | −28 | 0.6 |
| Before the turn (gap) | `tape_stop` | −28 | 0.4 |
| Turn (gap) | `trailer_hit` | −20 | 1.0 (end before the next word) |
| Pass | `lock_click` | −28 | 0.3 |
| Deadline | `clock_tick` + `chair_squeak` (sign swing) | −28 | 0.4 |
| Site / release | `scan`, `door_open`, `success` | −28 to −29 | 0.4 |
| Button | `mouse_click` | −28 to −19 | 0.2 |
| End card | `success_chime` + `lightbulb_ding` | −17 / −22 | 0.8 |

SFX over words at −28 dB and ≤ 0.15 s. In the reference the first master check misheard the word after the turn: impacts were shortened so they end before the next word.

**Music:** `music:33` (Motivating Mornings: propulsive bass, drums and brass, a natural fit for a retro box office) — reference. From 11.9 s of the file (its lift lands on frame 0), `lowpass` through the development, 0.26 s silence in the real gap before the turn with `tape_stop`, back full from 42 s of the file on the golden ticket, `cta_boost_db` 4, 1.2 s fade. Alternatives: `music:31` (warmer, cinematic), `music:369` (more serious drive).

```json
[{"start":0,"end":"RULER","mode":"full","track":"A","src":11.9,"fade_in":0.01,"fade_out":0.08},
 {"start":"RULER","end":"TURN-0.26","mode":"lowpass","track":"A","src":18.0,"fade_in":0.08,"fade_out":0.12},
 {"start":"TURN","end":"DURATION","mode":"full","track":"A","src":42.0,"fade_in":0.02,"fade_out":1.2}]
```

## CTA design inside the style

No Follow. The marquee switches to the product name, the emblem appears inside the arch the moment the camera ends (never an empty arch), a big cream/gold "LEARN MORE ›" button sits between y 760 and 900, down chevrons and a "TAP LEARN MORE" strip print in the caption band. ≥ 4 s without speech, music resolving.

## Implementation notes

- Build the façade in CSS: walls with subtle vertical grooves (repeating-linear-gradient), trims as bordered divs, bulbs as small radial-gradient circles positioned by Python.
- Tickets: one component (cream body, perforated stub, Nº in Alfa Slab One, footer in mono) reused for cascade, units and topics.
- Real product page: tall mobile screenshot cropped above any price or promotional banner, checked by vision.
- The cutout (alpha WebM) needs an edge fix when a dark shirt meets a coloured wall: a luminance key on the alpha only (`refine_alpha` pass), RGB untouched.

## Pitfalls found in production

- **Looking like a seat counter**: a uniform series with no ticket marked solves it; never show progress, "left" or "sold out".
- **Blank flip page** read as a placeholder: show the spoken day directly.
- **Empty arch in the CTA**: the emblem must appear in the arch on the same frame the camera leaves.
- **Matte on the shoulder**: the left shoulder vanished against the wall; a luminance key on the alpha restored it; the velvet arch hides the rest.
- **Heavy overlays**: radial masks on captions, cascade tickets and unit tickets triggered a lint warning; removing them cleared it.
- **Repeated CTA line**: the speaker said "click learn more" twice; the second was cut between two real −80 dBFS valleys and confirmed with a windowed ASR.
- **Small-model ASR** dropped short words after the turn; a large-model window on the master confirmed them.

## Variations

- **Cinema première**: same box office, but the golden ticket is a première pass and the turnstile becomes a red-carpet rope; for launches or events.
- **Fairground**: game booth with prize tickets; for playful brands and gamified offers. Music `music:82`.
- **Lottery-free version**: if the speech has no "first N", keep the box office for a sign-up flow (ticket = enrolment) and drop the cascade.
- **Organic version**: the last ticket asks a question ("which ticket would you take?") and the CTA becomes Follow.
