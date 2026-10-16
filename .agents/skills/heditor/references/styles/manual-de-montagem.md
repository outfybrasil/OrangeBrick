---
style: manual-de-montagem
name: Manual de montagem (assembly manual, blueprint)
family: fixed-style
best_for: paid-traffic ads with a "Learn more" CTA (cold audiences) about systems, products or methods made of reusable parts ("every project needs the same pieces", "this one already has all of them"); the product becomes a numbered kit on a technical blueprint sheet
reference: produced by the PycodeBR team with heditor, Oct 2026
---
# Manual de montagem (assembly manual, blueprint)

The Reel is a page of an assembly manual drawn on a blue technical sheet. The product the speaker talks about is a kit of numbered parts (01, 02, 03…) that snap into a parts list as each one is named; dimension lines measure "end to end"; three project drawings (A, B, C) reveal that they all use the same parts; time and budget rulers get eaten by repeated work; at the turn the parts assemble with a metallic snap into "ASSEMBLED"; a technical title block identifies the product; diagrams explain how it works; a specification sheet ticks the spoken qualities; and the "kit box" shows what the viewer takes. The speaker is a presenter cutout integrated into the sheet, with a dark-blue drop shadow, changing size and side by section. The core metaphor: **what everybody builds from scratch is a kit of the same parts, and this one comes assembled**.

## When to use / when not to

Use it when the speech:
- enumerates components, modules or steps ("registration, permissions, dashboard, reports…");
- says that most projects need "the same pieces/bases" and that rebuilding them costs time and budget;
- turns to "this one already has all of that" and explains how it is put together;
- lists what comes in the box (materials, templates, scripts, a workflow in N steps).

Avoid it when:
- the speech is emotional or narrative (a manual is cold);
- there is nothing to enumerate;
- the batch already has a blue technical grid or another engineering world (e.g. the authority style `cassino-de-precisao` has a precision bench);
- the product screens cannot be shown without personal data (the proofs carry half of the credibility).

## Signature moves

1. **Exploded parts at frame 0**: the hook title in two lines, the numbered parts floating behind the speaker (hero size) while dimension lines draw themselves; on "this here" the parts fly into the parts list.
2. **Parts list with snap**: "PARTS LIST" panel; each spoken part snaps in (scale 1.08 → 1 with a lock click) with a small real screenshot as its thumbnail.
3. **Same parts, three projects**: three small drawings (PROJECT A/B/C) built with the same parts; on "the same parts" they light together and a stamp lands ("THE SAME PARTS").
4. **Rulers being consumed**: TIME and BUDGET rulers shrink as parts are re-drawn; a bracket labels "SAME BASES" and a "↻ EVERY TIME" tag.
5. **Assembly**: 0.3 s of music silence, then all parts converge with a metallic slam into "SYSTEM ASSEMBLED"; a window with the real dashboard opens; every part gets ✓.
6. **Title block stamp**: a technical drawing title block (TYPE / PROJECT) stamped with the product's spoken description.
7. **Diagrams in white line work**: one system → clients A/B/C each with a lock and its own database; agent ↔ database with a glowing line and "REAL TIME" (green dot).
8. **Specification sheet**: spoken qualities ticked (✓ PROFESSIONAL ✓ SCALABLE ✓ SECURE), a "100%" stamp only when spoken.
9. **Kit box**: "YOU TAKE" with a checklist, steps of a spoken workflow lighting in order, and the system replicating, one copy becoming "YOUR NICHE".

## Frame and layout

Canvas 1080×1920, 30 fps, Paid-ad variant (`../captions-and-layout.md`).

```
y 0–270     sheet and grid only
y 300–420   section title (Anton) + small B612 Mono annotation
y 420–1030  parts list / drawings / diagrams on the side opposite the face; speaker cutout on the other side
y 1046–1150 caption tag
y > 1152    sheet, grid, the speaker's body fading out
```

Speaker cutout states: `hero` (hook, centred, large), `right` (parts list, multi-client diagram, stack), `left` (rulers, agent, kit, CTA), `small` (assembly and title block with the system window). Decorative parts may pass *behind* the cutout (depth), never in front of the face, eyes or glasses. A dark-blue shadow (`drop-shadow(0 18px 30px rgba(4,18,52,.55))`) seats the cutout on the sheet.

## Palette and typography

| Role | Hex |
|---|---|
| Blueprint paper | `#0f3f95` → `#0a2c6e`, central glow `#1b5cc0` |
| Fine grid | white 6 %, every 30 px |
| Major grid | white 14 %, every 150 px |
| Lines, outlines, dimension arrows | white |
| Highlight | yellow `#ffd84d` |
| Real-time dot | green `#4ade80` |
| Caption tag | `#0a2c6e`, white border, yellow corner ticks |

Fonts (OFL, in the kit): **Anton** for titles and part labels, **B612 Mono** for technical annotations (cockpit-legible mono), **Inter** for supporting text. Icons: Lucide (`user-plus`, `shield`, `kanban`, `layout-dashboard`, `file-bar-chart`, `bot`, `lock`, `database`, `ruler`, `package`, `check`, `copy`).

## Caption system

"Drawing label": `#0a2c6e` box, 3 px white border, radius 8, yellow corner ticks (four 14 px L-shapes in pseudo-elements), padding `6px 22px 2px`, Anton uppercase white, `font-size: var(--fs, 78px)`, one line, ≤ 800 px.

- Grouping: ≤ 3 words / 18 characters (Anton at 78 px is wide).
- Active word: **black on `#ffd84d`** (≈ 13:1), radius 6.

```css
.capwrap{left:0;top:1046px;width:1080px;height:106px;z-index:40;display:flex;align-items:center;justify-content:center}
.cap{position:relative;display:inline-block;max-width:800px;background:#0a2c6e;border:3px solid #fff;border-radius:8px;
  padding:6px 22px 2px;font-family:Anton;font-size:var(--fs,78px);line-height:1.12;color:#fff;text-transform:uppercase;white-space:nowrap}
.cap:before,.cap:after{content:'';position:absolute;width:14px;height:14px;border:4px solid #ffd84d}
.cap:before{left:-9px;top:-9px;border-right:0;border-bottom:0}.cap:after{right:-9px;bottom:-9px;border-left:0;border-top:0}
.cap .w{display:inline-block;border-radius:6px;padding:0 .08em;margin:0 .02em}
```

## Scene grammar

Generic example: a speaker telling developers who build software for clients that most projects need the same handful of modules, showing a product that already has them and inviting the viewer to build it in a course.

| Beat | Scene | Speaker | What happens |
|---|---|---|---|
| Hook | Exploded kit | `hero` | Title on frame 0; parts float, dimension lines draw; parts fly to the list on "this here". |
| Parts | Parts list | `right` | 01–05 snap in on each spoken name, with real thumbnails. |
| Same pieces | Projects A/B/C | `right` | Three drawings with the same parts; stamp "THE SAME PARTS". |
| Cost | Rulers | `left` | TIME and BUDGET rulers consumed; "SAME BASES" bracket; "↻ EVERY TIME". |
| Turn | Assembly | `small` | Music silence 0.3 s; parts converge, metal slam, "SYSTEM ASSEMBLED", real dashboard window, ✓ on every part. |
| Identity | Title block | `small` | Stamp TYPE / PROJECT with the spoken description. |
| How it works | Multi-client diagram | `right` | One system → clients A/B/C, locks, separate databases; lines light on "the same system". |
| Agent | Part 06 | `left` | Part 06 snaps; real chat window; "END TO END" dimension across screens; AGENT ↔ DATABASE, "REAL TIME". |
| Qualities | Spec sheet | `right` | ✓ on each spoken quality; stamp only if a number is said. |
| Where | Seal | `right` | "BUILT TOGETHER" seal with the programme name. |
| What you take | Kit box | `left` | "YOU TAKE" checklist, N workflow steps lighting, the system replicates, one copy becomes "YOUR NICHE". |
| Spoken CTA | Button | `left` | Brand mark + white "LEARN MORE ›" on the word, chevrons, "TAP LEARN MORE". |
| End card (4 s) | Brand + button | out | Mark and button only. |

Rules: labels of the manual world ("PARTS LIST", "PROJECT A/B/C", "ASSEMBLED", "YOU TAKE") are allowed concept text; part numbers 01–06 and step indices are numbering, not claims (list them in `allowed_numbers`); no price, count or invented metric; product screens are demo data at small scale, blurred where a table could hold names.

## Transitions and motion vocabulary

- **Dimension line**: SVG line + two arrowheads drawn by `stroke-dashoffset` (0.35 s); keep arrowheads at opacity 0 until the stroke starts (markers render early otherwise).
- **Snap**: part from `scale 1.12, opacity 0, y −20` to rest in 0.16 s `back.out(3)`, plus a 2 px settle.
- **Assembly**: parts tween to a common centre with staggered 0.04 s, `power3.in` 0.32 s; flash 0.5; shake 8 px.
- **Stamp**: `scale 1.6 → 1`, rotation −7 → −4, 0.16 s.
- **Pen annotation**: B612 Mono text revealed with `clip-path` steps.
- **Rewind** for "every time": the drawings redraw backwards (`stroke-dashoffset` reverse) with a `rewind` SFX.

## Sound design

| Action | Category | gain_db | length |
|---|---|---|---|
| Part snaps | `lock_click`, `click` (alternate) | −26 to −22 / −28 to −26 | 0.15 |
| Dimension lines / annotations | `pen_write` | −30 to −25 | 0.35 |
| Panel changes | `whoosh`, `swipe` | −24 to −19 / −27 to −24 | 0.4 |
| Stamps (gaps) | `stamp` | −22 to −20 | 0.3 |
| Chips | `pop` | −28 to −24 | 0.15 |
| Scans / lines lighting | `scan`, `data_beep`, `sonar_ping` | −28 / −27 / −26 | 0.3–0.6 |
| "Every time" | `rewind` | −25 | 0.6 |
| Assembly (gap) | `cage_or_metal_slam` | −16 | 0.6 |
| Assembled | `success`, `power_up` | −26 | 0.5 |
| Pages | `page_turn` | −26 to −25 | 0.25 |
| Typing annotation | `typewriter` | −28 | 0.4 |
| Agent | `retro_computer_beep` | −28 | 0.3 |
| Replicate | `copy_paste_multiply` | −23 | 0.6 |
| Button / end | `mouse_click`, `success_chime` | −26 to −17 / −15 | 0.2 / 0.8 |

**Music:** `music:167` (Brainiac, mechanical futuristic electronic) — reference. Section 1 from the start of the file, 0.3 s silence before the assembly, section 2 from 16 s of the file (the track's rise) on the turn, 1 s fade. Alternatives: `music:623` (tech house) for a sleeker product, `music:568` (tense electronic) for a more serious build.

```json
[{"start":0,"end":"ASSEMBLY-0.3","mode":"full","track":"A","src":0.0,"fade_in":0.01,"fade_out":0.25},
 {"start":"ASSEMBLY","end":"DURATION","mode":"full","track":"A","src":16.0,"fade_in":0.02,"fade_out":1.0}]
```

## CTA design inside the style

Paid-ad variant: brand mark + product name and a big white "LEARN MORE ›" button pressed on "learn", chevrons and "TAP LEARN MORE"; end card with only mark and button for 4 s. Organic variant: a last manual page "STEP N: YOUR TURN" with a question and Follow.

## Implementation notes

- Grid: two stacked `repeating-linear-gradient` backgrounds (30 px fine, 150 px major) plus a radial glow; never an image, so it scales cleanly.
- Parts: one component (numbered tag, icon, label, optional thumbnail) reused in the exploded view, the list, the projects and the assembly; positions per state in `K.parts`.
- Real proofs come from screen recordings of the product: crop the app area (no OS bars, browser tabs or dock), keep original colour, scale small, blur tables; verify with vision that no name, e-mail or phone is legible.
- Long cut: the reference ran 79 s (cold-traffic ad matching a previously approved length), so `test_duration_and_cta` failed on duration as well as on the handle; document both.

## Pitfalls found in production

- **Chair residue**: a dark crescent of the chair back stuck to one shoulder in some frames, disguised by the drop shadow; a pose mask or rotoscoping would be needed to remove it fully. A thin glasses temple can also thin out where it touches the chair.
- **Hard vertical cuts of the matte** at the source frame edges: dissolve the sides with a mask.
- **Label crossed by lines**: dimension lines must route around labels.
- **Empty chat window**: proof windows enter with content already loaded.
- **Captions too long** at 78 px: cap groups at 18 characters.
- **Continuous words**: a removable phrase started without a valley ("…right now and also…"); cutting there would amputate a word, so the block ended earlier and the CTA entered cleanly.

## Variations

- **Flat-pack furniture**: white paper sheet, black line art, wordless steps; for simple products or onboarding. Music `music:82`.
- **Exploded view only**: one hero object that explodes and reassembles once; for a 20–30 s cut about a single feature.
- **Recipe card**: ingredients instead of parts, same snap grammar; for processes and frameworks.
- **Organic version**: Follow CTA and a comment question ("which part do you always rebuild?").
