# Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Active caption word hard to read | dark text with dark outline on a mid-tone pill | `pill` mode (black on #ffd84d, outline = pill colour) or white on saturated dark; check enlarged crops |
| Accents of titles inside the top margin | Anton glyph ascenders exceed the line box | start titles at ≥ 300 px; confirm with the pixel check |
| Video looks like the previous ones | same skeleton (camera card + boxed panels + pill + PiP finale) reused | creative mode: pick a different world; change camera role, captions system, palette, transitions, CTA |
| Music or SFX cover the voice | short-release ducking, loud impacts on words | keep the kit's held ducking; move impacts into gaps; lower SFX on words to ≤ -20 dB |
| True peak > 0 dBTP in the MP4 although WAV was -2 dB | AAC overshoot from bright transients (beeps, clicks, shutters) | finalize re-limits automatically (`tp_guard`); avoid stacking many bright SFX |
| Freeze detector fails the video | small camera in a UI, intentional holds, planned blackouts | inspect frames; advisory unless the picture is really stuck |
| Pixel top-margin check fails on transitions | full-width stripe/flash wipes | inspect frames; add a dark top band if a world background is bright |
| `≠` or other glyph renders wrong | font lacks the glyph | use a Lucide icon (e.g. `equal-not`) or another font |
| Numbers test fails | unspoken digits on screen (dates, labels, "CAM 01", line numbers) | draw decorative digits with CSS `content`/counters, use words or roman numerals, or list them in `plan["allowed_numbers"]` if truly neutral |
| Caption hidden but still visible | GSAP sets `visibility` on the inner element | hide the outer caption wrapper with `#cap-N{opacity:0 !important}` |
| Preview shows blank video | camera file not ready or wrong `data-start` | wait for `readyState>=2` (preview does), check `data-media-start`/durations |
| Render dies with "FFmpeg killed after exceeding ffmpegEncodeTimeout" | heavy composition (gradients, filters) + loaded machine | re-render with `PRODUCER_ENABLE_CHUNKED_ENCODE=true FFMPEG_ENCODE_TIMEOUT_MS=7200000`; limit blur/backdrop-filter |
| asr-check delta below -0.03 but the voice is clear | the small Whisper model mishears a phrase in both files differently | re-check the flagged window with `HEDITOR_ASR_CHECK_MODEL=medium` (or a windowed medium transcription) before changing the mix |
| Render very slow or killed | low CPU/RAM, many workers | `heditor render <work> 1`; render cuts one at a time; close other heavy jobs |
| ASR misses words at block edges | cut inside a word | widen the block radius in prepare.py, prepare again, re-run `heditor words` |
| Whisper too slow | large model on CPU | `HEDITOR_ASR_MODEL=small`, transcribe windows instead of the full file |
| A tween lands at the very end of the timeline | a key used in the JS (`K.someword`) is undefined, so GSAP gets `NaN`/`undefined` as the position without any error | validate in build.py that every `K.x` referenced by the JS exists before writing the page |
| SVG arrowheads visible before the line is drawn | `marker-end` renders even when `stroke-dashoffset` hides the stroke | keep the path at opacity 0 until its stroke starts drawing |
| A gradient stroke does not paint on a straight line | `linearGradient` with `objectBoundingBox` on a path of zero height | use a solid colour or `gradientUnits="userSpaceOnUse"` |
| Captions keep timings of an older cut | `heditor words` does not overwrite an existing `words-reviewed.json` | after re-running prepare, regenerate `words-reviewed.json` from the new `words.json` and re-apply spelling fixes |
| CTA test fails although Follow is on screen | button text was upper-cased in Python | write the exact `brand.json` words in the HTML and upper-case with CSS `text-transform` |
| Background p95 stuck at exactly −12.0 dB | the mix calibration stops at the threshold when weak-voice windows (pauses, stretched vowels) dominate | add 3–5 dB music dips on those windows with sections that keep `src` continuous |
| Text clipped inside a box but the contact sheet looks fine | reduced sheets hide overflow | check overflow in the DOM (Playwright) and review native frames one by one; very large sheets can time out the vision model |
| Numbers test fails on an arrow | numeric HTML entities (`&#8627;`) count as digits | use the literal character or an icon |
| `asr-check` similarity drops on colloquial captions | the small model normalises spoken contractions to the formal word | expected; compare against the clean voice delta, not the absolute value |
| `heditor test` fails on duration | the Reel is longer than 70 s (default limit) | plan the speech for ≤ 66 s before cutting (the CTA needs ≥ 4 s); drop context lines, not the hook or the rule. For an intentional long-form cut (narrated documentary, story of ~90 s) set `plan["max_duration"]` (e.g. 100, never above 180, the Instagram Reels limit) in `build.py` and say why in the HANDOFF |
| Need a music dip without restarting the track | splitting a section restarts `src` and can land on another part of the file | append a section `{"mode":"silence","start":a,"end":b,"gain_db":host_gain-5}` after the section that plays there: `silence` is not decoded, but its `gain_db` (absolute, not relative) replaces the gain of that window |
| `test_key_moments_in_speech_order` fails although every beat is in the speech | numeric layout values (sizes, offsets) were stored in `plan["keys"]` and are read as times | keep only times in `keys`; put layout constants in a nested dict (e.g. `K.cfg`) |
| An animation fires on the wrong word after a re-cut | `rk.finder(token, after=t)` returns the first match after `t`; removing a passage moves the next occurrence earlier | re-validate every key against the transcript after each new prepare; prefer distinctive tokens |
| An impact strip "over the torso" covers the chin | the face sits low in a webcam tile (centre ≈ 70 % of the height) | measure the face (`qa/face-track.json`) before placing strips; put the strip at the top of the camera, over the background |
| Vision calls a decorative object broken text or a stray letter | tiny text (< 16 px) or lone glyphs inside a decorative SVG (scales, rulers) | draw decorative objects without inscriptions |
| The camera window goes black in the CTA | the camera clip ends with the last word | extract the last frame (`ffmpeg -sseof -0.2 … -frames:v 1`) and show it as a still (or freeze it graded) |
| The caption area is empty for a moment | a stretched word or connective leaves a gap between groups | keep the current group on screen until the next one when the gap is < 0.7 s |
| A one-line caption overflows its strip | long words at a fixed size | compute the font size per group with the real fonts (PIL `getlength`, variable axes set) and shrink to fit |
| Two cuts of a batch share the same soundtrack | each agent picked the best-matching track alone | record the music id of every cut in the batch brief and give each cut a different track before producing |
| mediapipe fails to install | Python version without wheels | use Python 3.10–3.13 (setup picks one) |
| Text "behind" the speaker shows on top of the hair, or a double edge appears | the plate and `camera-alpha.webm` have different boxes, `object-fit`, start or media offset, or one of them got a transform | put both videos and the behind layer in the same container; same `data-start`/`data-duration`/`data-media-start`; transform the container, never one video |
| Speaker's hands turn semi-transparent in layered shots | motion blur on fast gestures confuses the segmenter | keep behind-layer graphics away from gestures on that beat; check `coverage_jumps_s` in `qa/matte-stats.json`; `erode=0` keeps more edge |
| The matte keeps a mic arm, headset or chair | multiclass "accessories" class | `dk.person_matte(work, keep_classes={1, 2, 3, 4})` or hide it with a dark disc behind the speaker |
| Depth map levels pump between frames | per-frame normalisation | depthkit uses running percentiles (`ema`); raise `ema` to 0.7 or sample at a lower `fps` |
| Point cloud swallows the speaker | dots too dense or too bright near the face | `dots_look(step=12-16)`, darker colour, or `edge_look` instead |
| 3D object missing in the render | three.js loaded from a CDN offline, or rendered with `requestAnimationFrame` | `dk.setup_three(work)` and `import * as THREE from "./assets/three.module.min.js"`; render only on `hf-seek` |
| Layered compositions render slowly ("BeginFrame did not run", software GL) | alpha video + WebGL on CPU | expected (~11 s per second of video on 4 cores); switch the alpha layer and the 3D canvas on only where used, render with 2–3 workers |
| A drawn diagram renders very slowly or the encode times out | an SVG filter (`feTurbulence` + `feDisplacementMap` + blur) over a large layer is recomputed every frame | one filtered group limited with `filterUnits="userSpaceOnUse"` to the drawing area, no `backdrop-filter`, a static PNG grain mask for the texture; chunked encode if needed; drop the filter and keep the mask + jitter if still too heavy |
| Hand-drawn labels unreadable on a phone | handwriting below ~36 px with a texture mask on top | ≥ 36 px for labels, a lighter texture on text than on lines; check native crops |
| An arrow label reads as a grammar error | the label was written from the diagram's point of view ("uses") next to a first-person subject ("US") | label arrows from the subject that acts, in the speech's grammar ("we use", "we pay") |
| A wipe "does not look like erasing" | the erased band is wider than the eraser, or the motion is a diagonal blur | make the mask stroke width equal to the eraser's length, straight horizontal passes, leave a faint ghost and haze |
| Generated images come back in another aspect ratio | the image generator ignores the requested portrait size (landscape 1536×1024 returned for a 9:16 request) | read the size of every result before designing shots; use landscape images full-bleed at the canvas height with a horizontal pan, or crop on purpose; never stretch |
| A generated painting shows pseudo-text, a logo or a recognisable face | text and faces were not excluded in the prompt, or the model drew signage anyway | ask for "no text, no letters, no logos, no identifiable faces, no real people"; review every image with vision; cover pseudo-text with an on-screen object or regenerate; make documents and headlines in HTML/SVG |
| `heditor lint` errors on a title animation | `letterSpacing` (or another layout property) is tweened | keep the tracking fixed and animate `scale`, `x` or the `background-position` of a `background-clip:text` gradient |
| The vision model times out on a contact sheet | the sheet is too large (> ~1100 px) or has too many frames | sheets of 6–9 frames under ~1100 px and native strips of 3–4 frames; several small rounds instead of one big sheet |
| A dramatic pause before a card fails `heditor gaps` | the silence was made by stretching or keeping a voice pause | make the silence in the music only (`{"mode":"silence"}` from the tail of the last word to the next word) and keep every voice pause < 0.45 s; document each silence in DESIGN.md |
| Numbers test fails on a documentary fact note | a verified fact or a chart value is on screen but not spoken | keep only facts checked in a cited source, list their digits in `plan["allowed_numbers"]` and the source in DESIGN.md; never add a fact that extends the speaker's claim |
| A canvas world (globe, map, particles) makes the render slow | the canvas is redrawn on every frame even while a full-bleed image covers it | draw it only inside its visible windows and return early elsewhere; one canvas, no SVG filters, a seeded RNG so every frame seeks identically |
| `npx hyperframes` asks to install or cannot find Chrome | first run | `npx --yes hyperframes@0.8.147 browser ensure` |
| Long form: words disappear from the captions after `long apply` although they are in the audio | ASR word timings spill into a removed pause (short words like "O", "a", "e") | fixed since the long-form mode: only word-level cuts and exclusions drop words (`lf.word_drop_ranges`); re-map with `heditor long apply <work> --words-only` |
| Long form: `heditor gaps` reports > 0.6 s at an exclusion or at the start | manual `exclude` ranges and the range edges keep the silence around them | `heditor long edl` adds `edge` cuts (lead 0.12 s / tail 0.18 s); re-run `edl --force` after changing `exclude`, then `apply` |
| Long form: "um" removed as a filler in Portuguese | English filler list | fillers are per language (`asr.lang`); "um" is never a filler in `pt` |
| Long form: render fails with "asset(s) do not match their authored media element type" | a segment got a sub-frame slice of video at the end of the voice | fixed: segments with < 2 frames of voice get no video element; produce again |
| A short label stays on screen until the end of the Reel | its fade-in (e.g. 0.34 s) ends after its fade-out starts, so the later-ending tween wins and leaves `opacity:1` | clamp the timings so they never overlap: `out = min(.22, max(.06, (t1-t0)*.35))`, `in = max(.06, min(.34, t1-t0-out))`, fade-in from `t0`, fade-out from `t1-out`; check a preview frame a few seconds after every short label |
| Long form: a segment renders but looks different from the preview | stale segment folder or an edited `index.html` | never edit `segments/`: change `build.py`/JSON and `heditor long produce`; segment pages are regenerated and re-rendered by hash |
| Long form: the screen share is unreadable in 9:16/1:1 | a 16:9 screen in a narrow canvas | use `screen` layout with `zoom` on the region being discussed, or `callout` set pieces; keep 16:9 as the master |
| Long form: render very slow | 4K, heavy SVG filters, many workers on a shared machine | render 1080p, keep heavy graphics inside set pieces, ≤ 2 workers; segments resume after a failure |

## Picture and voice out of sync after changing the cut

**Symptom:** the first seconds are in sync, then the mouth runs seconds ahead of or behind the voice (often from the first sentence removed in a revision). Captions still match the voice.

**Cause:** the EDL changed (`heditor prepare` rewrote `camera-src.mp4` and the voice) but the derived camera variants (`camera-hd.mp4`, `camera-grade.mp4`, `camera-mono.mp4`…) were built from the previous `camera-src.mp4`. Up to 1.3.0 they were only built when missing. A frame-count mismatch between `camera-src.mp4` and the variants is the giveaway.

**Fix:** since 1.4.0 the kit rebuilds variants older than their source. Check with `python scripts/reelkit/camera_sync_check.py <work>` (every variant must report offset 0 and the same frame count), run `heditor produce` again and re-render. On a project made with an older kit, delete the stale `camera-*.mp4` variants (keep `camera-src.mp4`) or `touch composition/assets/camera-src.mp4` before producing.

## Recipe: drawing synced to speech

Use it whenever something is drawn or written on screen as the speaker says it (a chalkboard, a whiteboard, a sketch, a diagram that builds itself). Reference implementation: `styles/lousa-de-aula.md`.

1. **Keys from the reviewed words.** `f = rk.finder(rk.load_words(work / "words-reviewed.json"))`; one key per trigger, `f(token, after=t)` for repeated words. Assert every key is finite and that the keys are in speech order; re-validate them after every new `prepare` (a removed passage moves the next occurrence earlier).
2. **Offsets.** Main strokes start 0.04–0.06 s before the word (the hand anticipates; captions switch 0.02 s before). A label that completes a shape follows 0.1–0.5 s after it, in the same sentence. Marks that close an item already drawn (✓, complementary label, final underline) are **consequences**: allowed later, but still inside the sentence.
3. **One timeline driver.** Make the drawing a pure function of time, `render(t)`, called by a single tween (`tl.to(clock,{t:D,duration:D,ease:'none',onUpdate:()=>render(clock.t)},0)`), so seeking any frame gives the same picture. Strokes: `stroke-dasharray: L L+4`, `stroke-dashoffset: L·(1−p)`, opacity 0 until `p > 0`. Text: a `clipPath` rect whose width grows with `p`. Cache the last progress per element and skip unchanged ones.
4. **Log every action** (what, start, end) while building; use the log for the SFX (one scratch per stroke with `length` = stroke duration) and for the QA table.
5. **Gate.** Write `qa/sync-table.md` with one row per action: drawn element, trigger word, word time, stroke start, Δ. Every main stroke must be within ±0.15 s; when one is not, move it to a later occurrence of the same word rather than widening the tolerance. Review previews with strokes caught half-drawn.
