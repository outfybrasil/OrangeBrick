---
style: bancada
name: Bancada (proof on the workbench)
family: fixed-style
best_for: demonstrations with proof: "look what this tool produced", results shown on a real screen, tutorials where the screen matters more than the face; the user supplies screen footage or a screen recording
reference: technique study of creator Reels that demo AI-made edits on a monitor, Oct 2026; not yet used in a delivered edit
---
# Bancada (proof on the workbench)

The Reel opens on the speaker with a label sticker over the head and a provocation, then **whips to the workbench**: a monitor or laptop filmed (or simulated) at an angle, a finger pointing at the timeline, the result playing on the screen. From then on the screen is the protagonist and the speaker returns only for the punchline and the CTA. The outer captions never stop. It feels like a friend showing you something on their computer, which is why it convinces. The core metaphor: **the proof is on the bench, come and see**.

Two ways to build it:
- **Filmed**: the user records the screen with the phone (handheld, slightly angled, finger pointing). heditor cuts it, captions it, adds the label, whips, punch-ins and sound.
- **Simulated**: a clean screen recording placed on a CSS 3D panel with perspective, slow handheld drift, light moiré and a hand plate (`../technique-catalogue.md`, Camera moves).

## When to use / when not to

Use it when:
- the speech refers to something on a screen (a result, an interface, a timeline, a page);
- proof matters more than presence;
- you have the screen material (or can record it).

Avoid it when:
- there is no screen material: do not invent interfaces of real products;
- the speech is personal or emotional (the bench feels cold);
- the screen content shows prices, private data or third-party faces without consent (crop or blur).

## Signature moves

1. **Label sticker hook**: a white rounded label at the top of the face shot, two lines of heavy black caps ("[TOOL] / EDITING REELS") and a small icon; it disappears on the first cut.
2. **Two-line caps headline** variant for a darker set: white caps at y 300–420 above the head.
3. **Punch-in on the reveal phrase** (1.2–1.3×) just before leaving the face.
4. **Whip pan to the bench**: 0.5 s horizontal blur from face to screen (real or synthetic), again whenever the speech jumps to another screen.
5. **Pointing finger** on the timeline or the part being explained; a thin accent circle drawn around the target on the spoken word.
6. **Screen-in-screen punch-ins** on the detail being discussed (2× crop of the screen, 0.3 s ease), back out on the next sentence.
7. **Result inserts**: when the result itself is the point, cut to it full-bleed for 2–4 s (the actual exported video), then back to the bench.
8. **Return to the speaker** for the opinion line, with a giant title over or behind them (`../depth-and-3d.md` §1 if matted).
9. **Promo micro-card** bottom-right when the speech mentions an extra resource ("free class · link in bio"), only if it exists.

## Frame and layout

```
y 0–270      atmosphere
y 300–520    label sticker / headline (hook only)
y 0–1920     bench footage full-bleed (screen centred between y 420 and 1300)
y 1240–1420  captions (outer, always)
y > 1570     no information
```

- Keep the screen's key area between y 420 and 1300 (crop and position the bench footage accordingly); the lower part of the frame shows the keyboard/desk.
- Speaker shots: medium close-up, face between y 500 and 1000.

## Palette and typography

| Role | Hex |
|---|---|
| Label sticker | `#ffffff` card, `#0b0b0f` text, radius 24, shadow `0 10px 30px rgba(0,0,0,.35)` |
| Captions | white, 6 px black stroke |
| Accent (circle, arrows, micro-card dot) | the brand accent, default `#ff5a36` |
| Grade | keep the room; screens slightly cooler, a touch of contrast |

Fonts (kit): **Geist** 900 for the label and captions; **Inter** 600 for the micro-card. Icons: Lucide (`mouse-pointer-2`, `circle`, `arrow-down-right`, `play`, `link`).

## Caption system

Outline captions (`../technique-catalogue.md`, system 2): lowercase Geist 900, 1–4 words, 64–72 px, white with a 6 px black stroke (`paint-order: stroke fill`) and a soft shadow, centred at y ≈ 1330, hard swap per phrase, a stressed word set in caps. They stay identical on face shots and bench shots so the voice feels continuous over the cuts.

## Scene grammar

Generic example: a speaker showing an AI-made edit on his computer.

| Beat | Shot | What happens |
|---|---|---|
| Hook (0–6 s) | Face | Label sticker, provocation line, punch-in on the reveal phrase. |
| "look at this" | Whip → bench | Monitor at an angle, finger on the timeline. |
| What it did | Bench | Screen punch-ins on each feature as it is named; accent circle on the target. |
| The result | Full-bleed | The exported video plays 2–4 s. |
| Second demo | Whip → bench | Another screen (editor, browser). |
| Opinion | Face | Giant title over or behind the speaker. |
| Extra resource | Face | Promo micro-card (if real). |
| CTA | Face | Pointing down at the comment field; the briefing's action. |

## Transitions and motion vocabulary

- **Whip**: `x 0 → −120 %` with a horizontal blur (`feGaussianBlur stdDeviation="30 0"`), cut at mid-blur, the bench enters from `x +120 % → 0` with the same blur, 0.5 s total.
- **Simulated bench**: panel `perspective(1200px) rotateY(-8deg) rotateX(4deg)`, drift `x/y ±10 px` with `yoyo` 3–5 s, `opacity .06` moiré overlay.
- **Screen punch-in**: `scale 1 → 2` with the origin on the detail, 0.3 s `power3.out`; out 0.25 s.
- **Accent circle**: SVG ellipse drawn with `stroke-dashoffset` 0.4 s, slightly hand-drawn (rough path).

## Sound design

| Action | Category | gain_db | length |
|---|---|---|---|
| Label sticker | `pop` | −28 | 0.2 |
| Punch-in | `bass_impact` (gap) | −26 | 0.4 |
| Whip | `whoosh` | −23 | 0.4 |
| Screen punch-in | `swipe` | −30 | 0.3 |
| Accent circle | `pen_write` | −32 | 0.4 |
| Result insert | `tv_news_sting` (short, low) | −30 | 0.6 |
| Mouse/keyboard on screen | `mouse_click`, `keyboard` | −32 | 0.2–0.5 |

**Music:** `music:282` (Sweet September, chill hip hop) for a relaxed demo, `music:623` for a sleek tech one; duck hard under the screen explanations; lift slightly on the result insert.

## CTA design inside the style

Back on the face: the speaker points down, the caption carries the keyword in caps, and a small white comment card appears on the chest ("Comment / WORD") for the last 3 s, or the briefing's action.

## Implementation notes

- Cut the bench footage like any source (`prepare.py` blocks); when it has its own audio, keep only the speaker's voice track.
- If the user records the screen, ask for 4K or at least 1080p, the phone close to the screen and steady; punch-ins need resolution.
- For the simulated bench, export the screen recording at 1080 px wide and place it in a 3D panel inside a dark desk scene with a soft reflection.

## Pitfalls

- **Unreadable screen text**: the screen is proof texture; the caption and the punch-ins carry the message, never small UI text.
- **Moiré and flicker** on filmed monitors: shoot at the monitor's refresh rate or add a slight blur; avoid long holds on fine patterns.
- **Third-party interfaces**: show only what the user has the right to show; blur names, faces and prices.

## Variations

- **Desk tour**: the bench is a physical setup (camera, mic, lights) instead of a screen; finger points at objects; labels pinned with `dk.track_points`.
- **Phone in hand**: the bench is a phone held to the camera showing the result; slight tilt, thumb scrolling.
- **Split bench**: face top, screen bottom (two bands) for fast back-and-forth explanations.
