---
style: nativo
name: Nativo (clean native edit)
family: native
best_for: any talking head when the user wants a simple, clean edit; daily posts, quick tips, opinions, repurposed class or live excerpts, and as the neutral baseline before a creative version
reference: produced by the PycodeBR team with heditor, Oct 2026
---
# Nativo (clean native edit)

The opposite of the creative styles: the edit disappears and the person speaking carries the video. It looks like
a Reel recorded and edited on the phone by someone who knows what they are doing. Only three things happen:

1. **Cuts.** The speech is cut at clean word boundaries and joined without dead air (`prepare.py`, `heditor gaps`).
2. **Jump cuts that read as new shots.** Each join alternates the framing between 1.0 and 1.075 zoom, centred on
   the median face of that segment, with a 1.5 % breathing zoom inside it (the kit does this from `K.segments`).
3. **Animated captions.** Word-by-word captions synced to the speech; each group pops in, the active word lights
   up. This is the only graphic layer and it is what keeps the video dynamic.

No music, no sound effects, no motion graphics, no titles, no stickers, no end card, no colour look beyond a light
clean-up. If the user asks for one of them, add exactly that and nothing else.

## When to use / when not to

Use it when the user says "nativo", "edição simples", "só corta e legenda", "edição limpa", or wants the video to
look like an organic post rather than a produced piece. Good for daily content where speed matters, for speakers
with strong delivery, and for a neutral version to compare with a creative one.

Avoid it when the speech is weak on its own (long setup, no hook in the first sentence): a clean edit exposes it.
Choose a better cut, or suggest a creative style.

## Implementation (reference build, runs as-is)

```bash
heditor new <work> <video> --style nativo     # build.py comes from templates/styles/nativo/
# fill prepare.py (BLOCKS, CROP), then:
heditor prepare <work> && heditor gaps <work> && heditor words <work>   # review words-reviewed.json
heditor produce <work> none 0                 # no music track
heditor lint <work> && heditor preview <work> <times> && heditor test <work>
heditor render <work> && heditor finalize <work> <name>-1080x1920.mp4 && heditor asr-check <work>
```

`templates/styles/nativo/build.py` settings:

| Setting | Default | Meaning |
|---|---|---|
| `MODE` | `auto` | `full`: the camera fills 1080×1920 (vertical recordings, or a sharp landscape speaker cropped to 9:16 around the median face from the full-resolution source). `fit`: the camera fitted to the width, between the safe top and the caption band, over a blurred, darkened copy of itself (small or wide sources such as meeting tiles). `auto` picks `full` when the speaker crop is portrait or at least 1080 px tall. |
| `CAPTION_MODE` | `pill` | `pill`: active word in pure black on a light-yellow pill; `text`: active word in yellow. |
| `USE_MUSIC` | `False` | Only if the user asks: one soft bed under the whole video (`heditor produce <work> music:<id> <src_s>`), still voice-first (≈ 21.5 dB under). |
| `MAX_DURATION` | `None` | Declare (≤ 180 s) for cuts longer than 70 s. |

The plan sets `"end_card": false`: the video ends with the last word (`heditor test` accepts a Reel without CTA
screen only when this flag is present).

## Frame and layout (9:16)

- **full**: camera edge to edge, no card, no border; a faint bottom gradient (0 → 35 % black from 55 % of the height)
  only behind the captions.
- **fit**: card 1080 px wide with 34 px radius and a soft shadow, vertically centred between y = 300 and y = 1192;
  background is the same footage blurred (boxblur 28) and darkened (−12 % brightness), frame for frame.
- Captions in the default band (y 1222–1472). Nothing else on screen.

## Captions

- Inter 900, sentence case as spoken (no forced uppercase), 82 px (72 px for long groups), 11 px black stroke
  painted under the fill, soft shadow.
- Groups of up to 3 words / 17 characters, broken at punctuation, never overlapping (`rk.captions`).
- Group enters with scale .86 → 1 and y 16 → 0 in 0.12 s (`back.out`); the active word switches 0.02 s before it
  is spoken (pill mode: black on `#ffd84d`, contrast ≈ 15:1).
- Fix spelling and brand names in `words-reviewed.json`; never change what was said.

## Sound

Voice only, through the kit voice chain (`rk.prepare_voice`) and the two-pass loudnorm (−14 LUFS, true peak
≤ −1.5 dBTP). No SFX on cuts or captions.

## QA notes

- The jump-cut zoom is the only camera move; if two consecutive segments have very different face positions the
  zoom origin follows each one (never smoothed across a cut), which is intended.
- `top_margin_first_bright_row` measures the footage itself (the camera in `full`, the blurred copy in `fit`); the
  top safe-zone rule applies to overlays, and there are none.
- `camera_sync_check` checks `camera-blur` by frame count only (a blurred frame has no detail to match); the card
  camera is checked frame by frame as usual.
- Render cost is low: a 35 s cut rendered in about 4 minutes with 2 workers on a 4-core VPS.
- `fit` with a small source (e.g. a 320 px meeting tile) is soft at 1080 px: say so when delivering. Prefer the
  highest-resolution recording available.
- The freeze detector may flag nothing; there is no CTA hold.

## Variations (only when the user asks)

- A soft music bed (`USE_MUSIC = True`).
- A short end card with the handle and Follow → Following (borrow it from `templates/build.py`, ≥ 4 s, and remove
  `"end_card": false`).
- One on-screen hook title in the first 2 s, taken verbatim from the first sentence.
- Captions in `text` mode or another kit font for a different account identity.
