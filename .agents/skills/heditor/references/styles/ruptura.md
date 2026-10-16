---
style: ruptura
name: Ruptura
family: fixed-style
best_for: thesis-driven talking heads with one punchline sentence, a "you vs. everyone else" contrast, or a two-to-three-word conclusion
reference: produced by PycodeBR (Felipe Azambuja), October 2026
---
# Ruptura

Ruptura ("rupture") breaks the expected order of a talking-head clip. It opens on the strongest sentence of the speech, before any context. Then the speaker's own camera becomes the metaphor: it gets cloned, split, frozen, isolated or erased, depending on what is being said. The argument plays out in panels that come in one after another like chapters. It closes on giant typography, with the camera shrunk to a small picture-in-picture (PiP). The viewer should feel tension and a hard snap back to the main idea, as if someone had pulled the handbrake on the speech. The core metaphor: the speaker is not only on camera, the camera is part of the idea.

## When to use / when not to

Use it when:
- the speech contains one sentence that sums up the thesis and works out of context (e.g. "everyone has the same tools now");
- there is a contrast between "you" and "the others", "before" and "after", "the product" and "the process";
- the conclusion fits in 2–4 strong words that can fill the screen;
- the clip is 30–70 s and the argument goes thesis → explanation → conclusion.

Avoid it when:
- the clip is a long, calm explanation with no punchline (use a calmer explainer style);
- the strongest sentence only makes sense after the context (a cold open would confuse viewers);
- the topic is sensitive or emotional, where shakes and stamps would feel disrespectful;
- you are producing a batch: apply Ruptura as a *principle* to at most one or two clips of a batch and give the others their own formats (see Pitfalls).

## Signature moves

1. **Cold open with the strongest line (2–5 s).** The clip starts on a sentence that really exists in the speech, even if it was said later, and then jumps back to the start of the reasoning. Never build a sentence out of fragments. A short hook title sits at the top during the cold open.
2. **The camera becomes the metaphor.** When the speaker says "your competitor", the camera card turns into a 3×3 grid of tinted and mirrored clones. On "it's not just you" it becomes a 6×6 grey crowd where only one tile keeps its colour. On other topics, invent the transformation from the speech: split, duplicate, freeze, drain, rotate, crop into an object, turn into a terminal window.
3. **Live background made from the camera itself.** The same camera, enlarged, blurred, darkened and vignetted, fills the frame behind the card. This replaces abstract floors and grids, so the clip reads as one continuous scene.
4. **Pill captions.** Uppercase Anton captions in a fixed band. The spoken word gets a light-yellow pill with pure black text.
5. **Panels as chapters.** Each step of the argument enters in its own dark panel that slides up and out (e.g. "MARKET", "ANYONE LAUNCHES", "THE COMPANY", "PROCESS"). Inside, small diagrams draw themselves as the words are spoken.
6. **Stamps on the punch words.** Words like FLOP, YES, NEXT and "?" crash in (scale 2.4–2.8 → 1, `power4.in`, 0.14 s) with a stamp or impact SFX and a world shake.
7. **Typographic close.** On the closing sentence the camera shrinks to a PiP under the safe top. The 2–3 keywords fill the centre at 190 px, each one landing on its own syllable attack with a shake. The captions for that span are hidden so the text is not shown twice.
8. **Jump-cut zoom.** Every pause cut alternates 1.0 ↔ 1.075 zoom centred on the tracked face, with a 1.5 % breathing push inside each segment.
9. **The CTA reuses the metaphor.** The comment question echoes the topic. The follow card reuses the video's image (e.g. the clone grid dims when the brand tile gets Follow → Following).

## Frame and layout

Canvas 1080×1920, 30 fps. Coordinates are the top-left corner of each element's box.

| Zone | Box | Notes |
|---|---|---|
| Safe top | y 0–270 | nothing important; titles with accents start at **y ≥ 300** |
| Hook title (cold open) | x 0–1080, y 300–~520 | two lines, 84 px + 120 px Anton |
| Camera card, `hero` | ~941×700 at x 70, y 500 | source card 960×714, scale 0.98, ends at y 1200 |
| Camera card, `top` | 480×357 at x 300, y 280 | scale 0.5, used while panels are on screen |
| Camera card, `pip` | 384×286 at x 348, y 286 | scale 0.4, used during the typographic close |
| Chapter panel | 900×520 at x 90, y 670 | ends at y 1190, `overflow:hidden` |
| Giant type block | x 0–1080, y 660–~1140 | 190 / 110 / 190 px lines, line-height 0.95 |
| Caption band | 940×250 at x 70, y 1222 | fixed, never moves |
| Bottom UI zone | y 1570–1920 | no critical info |
| Right UI rail | x 960–1080, y 1000–1700 | no critical info |

The camera card is a rounded frame (radius 44 px, 5 px gold border `#edc580`, shadow `0 34px 90px rgba(0,0,0,.65)`) with a light bottom tint gradient. Keep the camera at 960 px wide or less. Webcam sources are often tiny, and upscaling adds no detail. Never stretch the camera to a full-screen vertical shot. Background: the ambient video stretched to 1080×1920 at opacity 0.55, under a navy radial gradient and a second vignette.

Use `rk.rig_states(960, 714)` for `hero` and `top`, then add `pip`:

```python
st = rk.rig_states(card_w, card_h)
st["pip"] = {"x": (1080 - card_w * 0.4) / 2, "y": rk.SAFE_TOP + 16, "scale": 0.4}
k["rigStates"] = st
k["rig"] = [[0.0, "hero"], [k["panels_in"] - 0.25, "top"],
            [k["strategy"] - 0.3, "hero"], [k["close_word1"] - 0.3, "pip", 0.45]]
```

## Palette and typography

| Role | Hex |
|---|---|
| Deep navy (stage) | `#050a14` |
| Navy (panels, button text) | `#081626`, panel fill `rgba(6,14,24,.9)` |
| Slate / muted icons | `#5b6b7d`, `#1b2a3b`, `#2b3c52` |
| Gold (borders, titles, key word) | `#edc580`, gold shadow `#9a7a3c` |
| Cyan (secondary, connectors) | `#7dd3fc` |
| Alarm red (FLOP, errors) | `#ff3d57`, soft pink "?" `#ff8fa3` |
| Mint (done, YES) | `#7dffb0` |
| Caption pill | `#ffd84d` with text `#000000` |

Fonts (google/fonts, OFL): **Anton** for every display word (hook, panel titles, stamps, giant type, captions) and **Geist** 300/700 for UI text (handle, follow button, comment line). Icons: Lucide, stroke width 1.5–2, often with a 25 % gold fill on the hero object.

## Caption system

- Anton 96 px, uppercase, `letter-spacing:1px`, white, 8 px navy stroke (`-webkit-text-stroke:8px #050a14; paint-order:stroke fill`), soft drop shadow. Captions longer than 18 characters drop to 84 px. Group with `rk.captions(words, voice_end, max_words=3, max_chars=17)`.
- Each caption pops in (scale 0.86, y +16 → 1, 0.12 s, `back.out(2.5)`). Inactive words sit at opacity 0.86.
- The active word turns on 0.02 s before its start: pill `#ffd84d`, text `#000000`, **stroke colour set to the pill colour**, scale 1.06, radius 0.14 em, padding 0 0.1 em. When the next word starts it goes back to white with a navy stroke and a transparent pill.
- Contrast spec: black on `#ffd84d` is about 15:1. Check at least three enlarged crops of active words with vision and ask about the active-word contrast directly. Dark text inside a dark outline fails even if its ratio looks fine on paper.
- Hide the captions that overlap the giant-type close (the type already shows the words).

`rk.captions_js(caps, mode="pill")` already produces this behaviour. Here is the equivalent if you write your own page:

```css
.cap.pill .w{border-radius:.14em;padding:0 .1em}
```
```js
const ON ={opacity:1,color:'#000000',backgroundColor:'#ffd84d',webkitTextStrokeColor:'#ffd84d',scale:1.06};
const OFF={color:'#ffffff',backgroundColor:'rgba(255,216,77,0)',webkitTextStrokeColor:'#050a14',scale:1};
captionData.forEach(c=>{const box='#'+c.id+'-c';
  tl.set(box,{visibility:'visible',opacity:1},c.start);
  tl.fromTo(box,{scale:.86,y:16},{scale:1,y:0,duration:.12,ease:'back.out(2.5)',immediateRender:false},c.start);
  c.words.forEach((w,j)=>{const t=Math.max(c.start,w.start-.02);tl.set('#'+c.id+'-w'+j,ON,t);
    if(c.words[j+1]){const n=c.words[j+1].start-.02;if(n>t)tl.set('#'+c.id+'-w'+j,OFF,n);}});
  tl.set(box,{visibility:'hidden',opacity:0},c.end);});
```
```python
hidden = [c["id"] for c in caps if k["close_word1"] - 0.1 <= c["start"] < k["close_word2"] + 0.1]
css += "".join(f"#{h}{{opacity:0 !important}}" for h in hidden)
```

## Scene grammar

Turn the speech into 5–8 beats. Something should change on screen every 1.5–2 s without covering the face.

| Beat | Typical length | Treatment (generic example: "a speaker arguing that easy tools mean more competition") |
|---|---|---|
| Cold open | 2–5 s | strongest line; hook title at the top; camera `hero`; camera metaphor on the key nouns (clones on "competitor", crowd on "everyone") |
| Restart | cut | white flash 0.4 / 0.18 s, metaphor layers drop to 0, hook leaves upward, music switches to its filtered mode |
| Problem | 5–10 s | camera stays `hero`; small props above the card in y 282–492 (a "BUILD" pill button that gets pressed, a product icon that pops, identical boxes falling) |
| Explanation chapters | 15–30 s | camera goes `top`; one panel per idea: a "you" dot swarmed by 40+ grey dots, rockets that launch and fall under a FLOP stamp, a 2×2 company map where only one room is lit and the others show dashed borders and "?", a conveyor belt where clients pass at each repeated "next" |
| Turn | 3–8 s | the drop lands here; a spotlight moves from the obvious thing (the product) to the overlooked one (the process); stamps such as YES and "?" |
| Payoff | 3–6 s | camera back to `hero`, one icon + word above it (e.g. a crosshair + STRATEGY) with a `punch(t,1.12,.4)` |
| Typographic close | 2–4 s | camera `pip`; 2–3 giant words, one per syllable attack |
| CTA | 4.5 s | camera flies out; question + follow card built from the metaphor |

Panel content rules: a short gold title at y +18 (50 px Anton). Each label appears on the spoken word, never earlier. Diagrams use only spoken words or neutral labels. Never invent numbers.

## Transitions and motion vocabulary

- **Metaphor in:** `FT(layer,{opacity:0,scale:1.25},{opacity:1,scale:1,duration:.18,ease:'power3.out'},t-.02)` + `shake(t,12)` + `flash(t,.3,.15)`. A crowd comes in harder: from scale 1.6, 0.35 s `expo.out`.
- **Metaphor out / restart:** `S(layers,{opacity:0},t-.06)` + `flash(t-.06,.4,.18)`, a hard cut with no fade.
- **Panel in / out:** from y +100, 0.35 s `expo.out`; out 0.25–0.35 s before the next beat with `out(sel,t,{y:100})`. Panels hand over and never stack.
- **Stamp:** from scale 2.4–2.8, 0.14–0.16 s `power4.in`, then `shake(t+.06..+.14, 10–14)`.
- **Press:** a button drops 8 px and its 10 px under-shadow shrinks to 2 px for 0.06 s, then returns over 0.12 s.
- **Swarm:** dots enter from radius 700 px to random radius 120–450 px (y squashed 0.62), 0.5 s `power3.out`, staggered by 0.02 s. Use `rnd()` only.
- **Rig moves:** `rig(state,t,.45–.5)` with `expo.inOut`; CTA exit `TO('#rig',{scale:.16,x:470,y:980,opacity:0,duration:.32,ease:'expo.in'},C-.2)`.
- **Giant word:** `FT(w,{opacity:0,scale:2.2},{opacity:1,scale:1,duration:.16,ease:'power4.in'},t-.04)`, then the block drifts `{y:-20,scale:1.04,duration:.6,ease:'sine.out'}`.
- **Jump cuts:** `K.segments` (zoom alternates 1.0/1.075 on the face origin + 1.5 % breath) runs the whole time under everything else.

## Sound design

Voice comes first: the music bed sits about 21.5 dB under the voice median, the whole background p95 stays at least 12 dB under the voice, and fewer than 5 % of windows have the bed within 10 dB of the voice. Every SFX is tied to a visible action.

| Action | Category | gain_db | Offset |
|---|---|---|---|
| First frame | `bass_impact` | −12 | 0.00 |
| Camera clones / splits | `glitch` | −13 | −0.04 |
| Crowd / multiplication | `copy_paste_multiply` (length 0.6–0.9) | −15 | −0.07 |
| Restart, panel in, rig move | `whoosh` | −14 to −16 | −0.08 |
| Button press | `click` | −12 | −0.02 |
| Object appears | `pop` | −14 to −16 | −0.05 |
| Swarm of others | `crowd_murmur` (length 1.6) | −24 | −0.04 |
| Big label lands | `bass_impact` | −14 | −0.02 |
| Stamp (FLOP, YES, NEXT) | `stamp` | −11 to −14 | −0.06 to −0.10 |
| Something falls / fails | `error`, `error_ding` | −18 / −19 | +0.6 after the rise |
| Idea / solution | `lightbulb_ding` | −15 | −0.07 |
| Step completes | `success` | −15 / −16 | −0.03 |
| Repeated beat ("next, next, next") | `stamp`, rate 1.00 / 1.08 / 1.16, gain −14 / −15 / −16 | | −0.04 |
| Growth | `level_up` | −16 | −0.10 |
| Spotlight | `spotlight_on` | −13 | −0.12 |
| Machine starts | `power_up` | −16 | −0.04 |
| Target / strategy | `sonar_ping` | −15 | −0.08 |
| Giant words | `bass_impact` variants 0/1 | −11 / −12 | −0.06 / −0.04 |
| Pre-drop | `riser` | −18 | −0.32 before the drop |

Music: tense, driving and not melodic-sweet. Options: `music:568` (Focus on Yourself, tense electronic, the reference choice), `music:597` (Vertigo, stealthy), `music:369` (Need for Speed, determined trap). Pick a different one per clip in a batch.

Section plan (mode, gain):
1. Cold open: `full`, −2 dB.
2. Restart → first chapters: `radio`, −5 dB, fade_in 0.4.
3. Problem chapters: `lowpass`, −8 dB, fade_in 0.6.
4. **0.33 s `silence`** just before the turn word.
5. Turn: `full`, 0 dB, `src` = the track's drop (pass `drop_s`), with a `riser` and a `bass_impact` on the word.
6. Reflective beat: `muffled`, −7 dB, fade 0.5 / 0.6.
7. Payoff → end of CTA: `full`, 0 dB, `src = drop_s + 30`, fade_in 0.8, fade_out 1.0 (start it 0.3 s before the payoff so it overlaps the muffled tail). Use `cta_boost_db: 5` in the plan so the music swells after the voice ends.

## CTA design inside the style

Duration: voice end + 4.5 s. Timeline from `C = K.voice_end`:
- `C−0.2`: the camera flies out (see the rig exit above); giant type leaves upward; `flash(C,.3,.25)`; `whoosh` −12.
- `C+0.08`: question line 1 (110 px Anton, gold) pops from scale 1.8. `C+0.4`: line 2 (96 px, white). `C+0.7`: a Lucide `message-circle` + "Comment below" (42 px Geist, `#cfe0ee`). The question echoes the metaphor (e.g. "AND IN YOUR BUSINESS, WHAT'S STILL MISSING?"). `pop` −12.
- `C+0.95`: the metaphor card rises from y +200 at x 240, y 760. Reference version: a 3×3 grid of 180 px tiles (grey user icons at 0.6 opacity), with the brand logo `assets/logo.png` in the centre tile (gold 6 px border, glow), the handle `@yourhandle` (Geist 700, 44 px, gold) and a 420×100 gold **Follow** button. `copy_paste_multiply` −17.
- `C+1.6`: a pointer finger slides in; it taps at `C+2.3` (scale 0.85 for 0.06 s, white ripple 0.3 → 3 over 0.45 s). `click` −9.
- `C+2.38`: the button flips to an outline (`background` transparent, `inset 0 0 0 4px #edc580`) with a check + **Following** in gold; the other tiles dim to 0.15; the brand tile scales to 1.1 `back.out(3)`. `level_up` −13.
- `D−0.25`: everything fades.

Rebuild the follow card from each clip's own metaphor (the conveyor stops at your brand, the spotlight lands on the handle, the frozen camera thaws). Do not reuse the grid on a topic that is not about multiplication.

## Implementation notes

reelkit covers most of this: `rk.page(..., world_back=ambient_html, caption_mode="pill")`, `rig_states`, `track_faces` + `jump_segments`, `captions`, `mix`. Write the panels, the camera-metaphor layers and the CTA yourself. Keep the seed fixed (`k["seed"] = 20261008` or any constant) and use only `rnd()`.

Camera variants (`rk.styled_camera(work, name, vf)` writes `assets/camera-<name>.mp4` from `camera-hd.mp4`, so every variant keeps lip sync with the main card):

```python
# 3×3 clones: tinted and mirrored copies (960×714 card → 320×238 tiles)
CLONES = ("scale=320:238,split=9[a][b][c][d][e][f][g][h][i];[a]hue=h=25[t0];[b]hflip,hue=s=0.35[t1];"
  "[c]hue=h=-30,eq=brightness=-0.06[t2];[d]hflip,hue=h=60[t3];[e]null[t4];[f]hflip,eq=contrast=1.2:saturation=1.4[t5];"
  "[g]hue=h=-70[t6];[h]hflip,hue=s=0[t7];[i]hue=h=120,eq=brightness=-0.05[t8];"
  "[t0][t1][t2][t3][t4][t5][t6][t7][t8]xstack=inputs=9:layout=0_0|w0_0|w0+w1_0|0_h0|w0_h0|w0+w1_h0|0_h0+h1|w0_h0+h1|w0+w1_h0+h1")
# 6×6 grey crowd, one tile keeps its colour (tile col 2,row 2)
CROWD = ("scale=160:119,split=2[c][g];[g]hue=s=0,eq=brightness=-0.10,split=6[g0][g1][g2][g3][g4][g5];"
  "[g0][g1][g2][g3][g4][g5]hstack=6,split=6[r0][r1][r2][r3][r4][r5];[r0][r1][r2][r3][r4][r5]vstack=6[grid];[grid][c]overlay=320:238")
# live background: small, blurred, darkened (it is stretched to 1080×1920, so blur hides the low resolution)
AMBIENT = "scale=270:480:force_original_aspect_ratio=increase,crop=270:480,gblur=sigma=14,eq=brightness=-0.18:saturation=0.6"
for name, vf in (("clones", CLONES), ("crowd", CROWD), ("ambient", AMBIENT)):
    rk.styled_camera(work, name, vf)
```

Insert the metaphor layers inside the card, above the main video and below the tint, so they inherit the frame, border, zoom and breathing:

```python
layer = lambda n, track, dur: (f'<div id="cam-{n}-w" style="position:absolute;inset:0;opacity:0"><video id="cam-{n}" class="clip" '
    f'data-start="0" data-duration="{dur:.3f}" data-track-index="{track}" src="assets/camera-{n}.mp4" '
    f'style="width:960px;height:714px" muted playsinline></video></div>')
extra = layer("clones", 1, k["restart"]) + layer("crowd", 2, k["restart"])
ambient = (f'<div id="ambient-wrap"><video id="ambient" class="clip" data-start="0" data-duration="{k["voice_end"]:.3f}" '
           'data-track-index="3" src="assets/camera-ambient.mp4" muted playsinline></video></div><div id="vignette2"></div>')
html = rk.page(..., world_back=ambient, caption_mode="pill")
html = html.replace('<div id="cam-tint"></div>', extra + '<div id="cam-tint"></div>', 1)
```

```css
#ambient-wrap{position:absolute;inset:0;opacity:.55}
#ambient-wrap video{position:absolute;left:0;top:0;width:1080px;height:1920px;object-fit:cover}
.floor,#horizon{display:none}
#bg{background:radial-gradient(ellipse 80% 60% at 50% 35%,rgba(16,48,74,.55) 0%,rgba(5,10,20,.85) 70%)}
#vignette2{position:absolute;inset:0;background:radial-gradient(ellipse 75% 60% at 50% 45%,transparent 40%,rgba(3,6,12,.85))}
.panel{left:90px;top:670px;height:520px;background:rgba(6,14,24,.9);border:2px solid rgba(237,197,128,.35);overflow:hidden}
.atitle{position:absolute;left:0;top:18px;width:900px;text-align:center;font-family:Anton;font-size:50px;letter-spacing:3px;color:#edc580}
.stamp{position:absolute;font-family:Anton;font-size:140px;color:#ff3d57;border:12px solid #ff3d57;border-radius:20px;transform:rotate(-10deg);opacity:0}
#mega{position:absolute;left:0;top:660px;width:1080px;text-align:center;z-index:14;font-family:Anton;line-height:.95}
#mega div{opacity:0}#w1{font-size:190px;color:#fff}#w-and{font-size:110px;color:#7dd3fc}
#w2{font-size:190px;color:#edc580;text-shadow:0 0 50px rgba(237,197,128,.6)}
```

Cold-open JS skeleton:

```js
gsap.set('#hook',{opacity:1});
TO('#hook em',{scale:1.2,duration:.08},.12);TO('#hook em',{scale:1,duration:.3,ease:'back.out(3)'},.2);
FT('#cam-clones-w',{opacity:0,scale:1.25},{opacity:1,scale:1,duration:.18,ease:'power3.out'},K.competitor-.02);
shake(K.competitor,12);flash(K.competitor,.3,.15);
FT('#cam-crowd-w',{opacity:0,scale:1.6},{opacity:1,scale:1,duration:.35,ease:'expo.out'},K.everyone-.05);
S(['#cam-clones-w','#cam-crowd-w'],{opacity:0},K.restart-.06);flash(K.restart-.06,.4,.18);
out('#hook',K.restart-.1,{y:-50});
```

Get keys with `f = rk.finder(words)` and `f("word", after_seconds)` for repeated words. Store every key in `K`, plus `voice_end` and `duration = voice_end + 4.5`.

## Pitfalls found in production

- **Monotony across a batch.** In the reference batch, Ruptura was applied the same way to seven clips (same gold card on a blurred background, same dark panels, same pill captions, same PiP close, same grid CTA). The feedback was that they all looked alike and felt monotonous; changing only the metaphor was not enough. In a batch, keep only the principle (strong opening, camera taking part in the metaphor, impact close) and change the *whole format* for each video: layout, camera shape, caption system, palette, transitions, music and CTA. Compare contact sheets side by side and ask vision "do these come from the same mould?". If yes, change more.
- **Dark-on-gold caption contrast.** The first version used a gold pill (`#edc580`) with dark navy text that kept the 8 px navy outline. The letters merged into the outline and read as a dark, muddy blob on mobile. Fix: pill `#ffd84d`, text `#000000`, stroke set to the pill colour (or removed). Never put dark text inside a dark outline, and never put dark text on a mid-tone colour.
- **Accents break the safe top.** Anton accents and diacritics rise above the line box. Hook and CTA titles at `top:270px` put light pixels at y 263–265. Start titles at `top:300px`, then measure by pixels: no row above y 270 should have more than 8 px with luminance > 150.
- **Metaphor layers must keep lip sync.** Build clones and crowds from the same camera file with the same `data-start` as the main card. A variant cut to a different in-point drifts away from the voice.
- **The webcam is small.** Meeting-recording webcams can be ~320 px wide. The clone and crowd tiles are small on purpose, but the highlighted tile and the `hero` card must still read clearly. Do not upscale past 960 px, and blur the ambient layer heavily so its low resolution is hidden.
- **The cold open repeats a sentence.** Make the restart obvious (flash + layers cut + music changing from `full` to `radio`). Otherwise the viewer thinks the clip skipped.
- **The cold-open line must be real.** Use one continuous sentence from the speech, never stitched fragments. ASR can merge a short interjection into the next word at the cold-open boundary. Re-run ASR on a short window of the opening and fix the caption tokens only, never the audio.
- **Double text at the close.** Without the hidden-caption CSS, the giant words and the caption band show the same words at once.
- **Panels must not stack.** Schedule each `out()` 0.25–0.35 s before the next panel's entry. Keep `overflow:hidden` so swarms and rockets do not spill onto the captions band.

## Variations

- **Split instead of clone** (topic: "one person doing two jobs"): the camera card cuts down the middle on the key word. The halves slide apart 120 px with `glass_crack` and get different grades (`hue=s=0` on one side, warm on the other). The close stacks the two job titles as giant type.
- **Freeze** (topic: "a team that stopped shipping"): grab a still with `ffmpeg -ss <t> -i assets/camera-hd.mp4 -frames:v 1 -vf "hue=s=0.2,eq=brightness=-0.1" assets/freeze.jpg` and lay it over the card on the key word with an icy cyan tint and `tape_stop`. Chapter panels thaw one by one. In the CTA the card warms back to colour on Follow.
- **Isolate** (topic: "the one thing everyone ignores"): the ambient background goes to full grey and only the card keeps its colour. A spotlight cone sweeps panels instead of sliding them. The music is `music:597` with longer `muffled` sections and the drop on the ignored word.
- **Terminal** (technical topics): the card becomes a terminal window (title bar, VT323 or JetBrains Mono labels). Panels are command outputs printed with `typing_fast`, and the close is the command name in giant monospace. Keep the pill captions, but switch the pill to white `#ffffff` with black text so it fits the palette.
