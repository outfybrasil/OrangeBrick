---
style: raio-x
name: Raio-X (the machine's view)
family: fixed-style
best_for: explaining how an AI, an algorithm or a pipeline works step by step (what it sees, measures, recognises, decides); "behind the scenes of the machine" topics
reference: technique study of creator Reels about AI editing pipelines, Oct 2026; scans validated with depthkit render tests, not yet used in a delivered edit
---
# Raio-X (the machine's view)

The Reel is the machine's own monitor while it works on the speaker's video. A pipeline HUD runs at the top ("● EDITING LIVE 00:12" and a numbered stage tag), and each stage of the explanation switches the picture into what the machine sees at that step: the room as a depth scan, the background as a point cloud, the face and hands with tracking marks, the transcript becoming the prompt, the timeline being assembled. The speaker is always there, sharp and in colour, while everything around them is data. It ends with the finished edit and the stage tag turning green. The core metaphor: **an X-ray of the edit, stage by stage**.

Requires depthkit (`heditor matte`, `heditor depth`, `heditor look <work> edges|dots|fog`, optionally `heditor hands`). Read `../depth-and-3d.md`.

## When to use / when not to

Use it when:
- the speech walks through stages (first it…, then it…, finally…), ideally 3–6 of them;
- the topic is a machine perceiving or processing something (vision, transcription, analysis, generation);
- the source is a locked-off talking head with a visible room (the scans need a room to scan).

Avoid it when:
- the speech has no process, only an opinion (the HUD becomes decoration);
- the background is a flat wall (contours and dots have nothing to draw);
- the same batch already has a HUD-heavy world (`aeroporto`, `turno-da-madrugada`, `thriller`).

## Signature moves

1. **Hook title behind the head**: a three-line caps question in white and lavender behind the speaker ("WHY DOES AI EDIT LIKE A PRO?"), the last word in pink.
2. **Pipeline HUD**: dark pill at y ≈ 290: red dot + "EDITING LIVE" + timecode ticking with the video; right pill "01 DEPTH", "02 CUTOUT", "03 3D", "04 HANDS", "05 TRANSCRIPT", "06 ASSEMBLY" flipping on each stage; it turns green "✓ EDIT COMPLETE" at the end.
3. **Depth scan**: cut to `camera-edges.mp4` on the word depth/recognises; a vertical NEAR / FAR ruler at the left edge with leader lines to two objects.
4. **Exploded layers**: the frame shrinks to a card in a dark void and splits into plate / graphics / speaker planes that rotate almost edge-on, with labels, then re-stack (`depth-and-3d.md` §7).
5. **Virtual stage orbit** with a grid floor and relative distance labels (`depth-and-3d.md` §8), plus an extruded "3D", a halo ring and a wireframe cube behind the head.
6. **Point cloud**: background to `camera-dots.mp4` with a HUD card "POINT CLOUD · N points" where N is the real count returned by `dots_look`.
7. **Tracking overlay**: face brackets, a body polyline, then hand landmarks with fading fingertip trails and glowing ellipses under the palms; two icon cards float over the hands when the speech names two things.
8. **Transcript panel**: waveform across the top, the speaker's own words appearing timed with the active word in magenta, then "…became the prompt".
9. **Generation and assembly**: a "generating edit…" pill with a spinner, a row of analysis cards (one per earlier stage), then a timeline with labelled tracks (CUT / CAPTIONS / 3D / ANIMATION) and a red playhead.
10. **Kinetic conclusion**: stacked caps lines built as spoken, a strike-and-replace line, corner brackets around the speaker labelled with the format (9:16).

## Frame and layout

Canvas 1080×1920, 30 fps.

```
y 0–270      atmosphere (dark gradient, faint scanlines)
y 286–336    pipeline HUD: live pill (x 60–520) and stage tag (x 620–1020)
y 360–620    stage panels: transcript, analysis cards, timeline (never over the face)
y 300–1330   camera box #cam: speaker centred, head top ≈ y 560
y 1240–1420  captions (front)
y > 1570     no information
```

- The speaker never leaves the centre; stages change the plate (normal → edges → dots → fog) and the overlays, not the framing.
- One punch-in (1.3×, held 1.5 s) on the line that states the thesis.

## Palette and typography

| Role | Hex |
|---|---|
| Void / panels | `#06050b`, panels `rgba(14,10,28,.82)` with 1 px `#3b2a6b` border |
| Scan lines (edges) | violet `#b46cff` |
| Point cloud | magenta `#ff4fd8` |
| Active word / accents | lavender `#c9a8ff`, pink `#ff5fa2` |
| Live dot | red `#ff3b30` → green `#34d27b` at the end |
| HUD text | `#e9e4ff` |

Fonts (kit): **Geist** 800/900 for titles and captions; **JetBrains Mono** for HUD, counters, labels and the ruler; **Anton** only for the hook title behind the head. Icons: Lucide (`scan-face`, `hand`, `layers`, `audio-waveform`, `film`, `sparkles`, `check`).

## Caption system

Rounded heavy sans in lowercase (Geist 800), 1–3 words, white, **active word lavender `#c9a8ff`** with a purple glow (`text-shadow: 0 0 18px rgba(124,92,255,.6)`), 62–70 px, centred at y ≈ 1330. When the hands work low in frame (tracking stage), the caption moves up to y ≈ 470 for that stage.

## Scene grammar

Generic example: a speaker explaining how an AI produced a professional edit of his video.

| Beat | Stage tag | Plate | What happens |
|---|---|---|---|
| Hook | — | fog | Question title behind the head, HUD appears ticking. |
| "it learned to see" | 01 | normal | Labels pinned to objects in the room (only objects, never people). |
| Depth | 01 | edges | Scan cut with a top-to-bottom wipe, NEAR/FAR ruler. |
| Volume and cutout | 02 | edges → void | Exploded layers with labels, back to flat. |
| 3D | 03 | void | Stage orbit, extruded 3D, wireframe cube. |
| Point cloud | 03 | dots | Real point count card. |
| Body and hands | 04 | normal | Face/body brackets, hand landmarks with trails, objects on the palms. |
| Transcript | 05 | fog | Waveform panel, words timed, "…became the prompt". |
| Assembly | 06 | fog | Generating pill → analysis cards row → timeline with playhead. |
| Thesis | — | normal | Punch-in; stacked headline; strike "KNOW HOW TO EDIT" → "KNOW HOW TO DIRECT". |
| CTA | ✓ | normal | Stage tag green, brand lockup, the briefing's CTA. |

Rules: only the stages the speaker names; every label is a real object or a spoken word; the point count and timecode are real values.

## Transitions and motion vocabulary

- **Scan wipe**: the new plate revealed by `clip-path: inset(0 0 X% 0)` from top to bottom in 0.35 s with a 3 px bright line at the edge.
- **Stage flip**: the stage tag text flips (`rotateX 90 → 0`, 0.2 s) and its number increments.
- **Planes**: see `depth-and-3d.md` §7–8; ease `expo.inOut`, 1.2 s out, 1 s back.
- **Panels**: `y −16 → 0`, `opacity`, 0.25 s; glass fill, never over the face.
- **Tracking marks**: corner brackets draw in 0.2 s; trails are the last 6 positions fading 100 → 0 %.

## Sound design

| Action | Category | gain_db | length |
|---|---|---|---|
| HUD start | `retro_computer_beep` | −30 | 0.3 |
| Stage flip | `click` + `data_beep` | −30 / −32 | 0.15 / 0.2 |
| Scan wipe | `scan` | −27 | 0.6 |
| Planes split / re-stack | `whoosh`, `magic_transition` | −25 / −27 | 0.4 / 0.6 |
| Point cloud | `sonar_ping` | −29 | 0.8 |
| Tracking locks | `lock_click` | −30 | 0.2 |
| Transcript words | `typing_fast` (low) | −34 | 0.6 |
| Generating | `robot_processing` | −32 | 1.2 |
| Timeline built | `progress_complete` | −24 | 0.6 |
| Edit complete | `success_chime` | −20 | 0.8 |

**Music:** `music:167` (Brainiac, mechanical/investigative) for the whole pipeline with `lowpass` in the hook, full from stage 01; alternatives `music:568` (Focus on Yourself, tension/technology) for a darker take, `music:82` for a playful one. A 0.3 s silence before the thesis line, full track again on "edit complete".

## CTA design inside the style

The last stage turns the HUD green, the timeline collapses into the brand lockup and the CTA appears as the "export" of the pipeline (an EXPORT button pressed, then the briefing's action: comment keyword, Follow pill or "Learn more" for ads).

## Implementation notes

- Prepare all plates once: `heditor matte`, `heditor depth <work> 15` (the stage orbit and scans read better at 15 fps), `heditor look <work> edges`, `heditor look <work> dots #ff4fd8`, `heditor look <work> fog`.
- Plates are separate `.clip` videos on their own tracks with the same `data-media-start` as the camera; the alpha video is on top for the stages that need graphics behind the speaker.
- Object labels: pick 3–5 objects on a probe frame, convert with `dk.to_stage`, track with `dk.track_points` only if the camera moves.
- Hand stage: `heditor hands <work> t0 t1`, smooth positions, skeleton as SVG lines updated per sample.

## Pitfalls

- **Dense dots compete with the speaker**: use `step` 12–16 and a darker colour if the face loses contrast.
- **Hands in the matte** are soft on fast gestures: the tracking stage shows landmarks over the real picture (front layer), not behind-layer graphics.
- **Fake precision**: no invented metres, confidence scores or counts; use relative labels and real counts.
- **Render time**: alpha video + scans + WebGL is slow on software GL; render tests showed ~12 s per second of video on 4 cores.

## Variations

- **Security audit**: the machine scans for risks; red labels, the plate as `edges-rgb` in red, a final "SAFE" stage; music `music:597`.
- **Data lab**: charts and tables replace the room scans; the point cloud becomes a scatter plot of the spoken data; music `music:623`.
- **Minimal X-ray** (30 s): HUD + one scan + one tracking stage + conclusion.
