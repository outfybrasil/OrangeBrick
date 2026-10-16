---
style: ide
name: IDE (code editor screencast)
family: fixed-style
best_for: technical explanations (code, automation, AI agents, tools) told as a live screencast inside a dark code editor
reference: produced by PycodeBR (Felipe Azambuja), October 2026
---
# IDE (code editor screencast)

The whole Reel is a screen recording of a dark code editor, and the speaker is the round webcam bubble that floats over it, like a Loom or OBS tutorial. Nothing is pasted on top as "motion graphics": every idea happens in the editor's own spaces. A definition becomes a hover tooltip, an obstacle becomes a red squiggle and an error peek, a list becomes terminal commands, a restart closes a tab, and emphasis is Ctrl + zoom. The captions are typed into the file as code comments, and the spoken word is shown as the editor's blue text selection. The viewer should feel they are watching someone build the idea live, one keystroke at a time.

## When to use / when not to

Use it for:
- Programming, scripting, automation, AI agents, CLI tools, data and DevOps topics, where the screen belongs to the subject.
- Speech with a problem → build → run → result arc (something fails, someone writes a fix, it runs).
- Speech that names concrete things (files, commands, tools, languages) that can become plausible code, filenames or terminal lines.

Avoid it for:
- Emotional, motivational or personal stories. The UI looks cold, so pick a cinematic style instead.
- Non-technical audiences who would read the code as noise.
- Clips with no "doing" verb (create, run, fix, search, save). Without actions the editor has nothing to animate.
- Very low-resolution webcams. Below about 300 px of useful face width, the 520 px HERO bubble gets too soft.

## Signature moves

1. **Full-screen editor window with a floating circular webcam.** The bubble moves between three positions (HERO center, terminal corner and editor corner) and changes size, so the code always has room.
2. **Captions typed as code comments** (`# like this`) in a monospaced font, revealed letter by letter with `steps()` easing and a block caret. The active word is the **editor selection**: solid `#264f78` behind pure white text. Past lines scroll up as dimmed file history.
3. **Native-space storytelling.** Use tabs, breadcrumb, explorer, hover tooltips, squiggles plus the error peek, the Problems badge, the integrated terminal, the status bar and editor notifications. Do not add floating cards or panels.
4. **Mouse cursor as editor.** A white pointer travels to a tab, file button or Follow button, then clicks (scale 0.82 for 50 ms) on the exact frame of the cut.
5. **Ctrl + as the punch.** On the payoff word, the code buffer zooms 1.14 → 1. On the closing keywords, the caption line itself scales 1.9× and the history disappears.
6. **Run → progress → OK.** Show `$ run …`, a segmented block progress bar (no percentage) and a green ✓ OK. The status bar turns orange while the command runs and returns to blue.
7. **Flash-forward cold open.** The hook line plays over the finished file, while the terminal types the cover question and the run that succeeds. Then the cursor closes that tab and the clip restarts.
8. **Silence + real drop.** Before the turn, a `tape_stop` leads into about 1.4 s with no music. The track's real bass attack lands on the payoff word.
9. **CTA as editor actions.** Ctrl+S saves, then a giant comment asks the question. The terminal types `$ follow @handle`, an editor notification shows the Follow button, and the cursor clicks it so it changes to **Following ✓**.

## Frame and layout

Canvas 1080×1920. All y values are in px.

| y band | Content |
|---|---|
| 0–188 | Dark wallpaper (atmosphere only) |
| 196–262 | Window title bar: muted traffic lights and a grey project name. Keep its luminance below 150 because it sits inside the top safe zone |
| 262–334 | Tab bar. The active tab is `#1e1e1e` with a 3 px top border `#0078d4`. Inactive tabs are `#2d2d2d` with text `#8f8f8f` |
| 334–372 | Breadcrumb (`project › file.py`, 21 px) |
| 372–962 | **Code zone**: line numbers come from CSS counters, code is 36 px on 58 px rows (48/84 for short "about" files) |
| 968–1236 | **Caption zone**: three 84 px comment rows. The active row is the bottom one (y≈1144–1228) on a current-line band |
| 1236–1742 | Integrated terminal: 50 px header (PROBLEMS · OUTPUT · TERMINAL · shell selector), then 50 px lines at 34 px. Keep critical text above y≈1560 |
| 1742–1786 | Status bar (branch, run state, save state, language item) |
| 1786–1920 | Wallpaper |

Horizontal layout: window x 14–1066 (14 px radius, deep shadow). Activity bar 14–70. Explorer 70–200, 130 px wide, 19 px names. Gutter 200–262. Code starts at x=276. Minimap 1000–1056. Do not put information past x=990 between y 1000 and 1700, where platform UI sits.

The style intentionally moves the caption band up from the kit default (~1222–1472) to the code-zone bottom. This keeps it clear of the bottom ~350 px and reads as part of the file.

**Webcam bubble.** Build it once as a 520 px circle (`clip-path:circle(50%)`) with a 9 px ring `#d0d0d0` and shadow `0 22px 60px rgba(0,0,0,.7)`. Move it with a transform only:

| State | Center | Diameter | Use |
|---|---|---|---|
| `hero` | (560, 655) | 520 | Cold open, closing keywords |
| `br` | (805, 1460) | 320 | Over the right side of the terminal while code fills the editor |
| `mr` | (840, 800) | 300 | Right side of the code zone when the terminal needs full width (errors) |

Camera inside the bubble: `camera-hd.mp4` from `rk.prepare_camera(work, width=960)`, displayed 910 px wide. Translate it so the tracked face (`rk.track_faces`) sits at 50% x / 57% y of the bubble, clamped so no black edge shows. Jump zoom alternates 1.0 ↔ 1.06 per segment, with 1.5% `sine.inOut` breathing. The face must never sit under text. Hide any code behind the HERO bubble.

## Palette and typography

Dark+-like palette. Evoke a generic dark editor: never show a real editor's logo, icon set or product name.

- Wallpaper: `linear-gradient(180deg,#0d0f17,#090b10)` + radial glows `rgba(64,48,120,.45)` (top-left) and `rgba(20,90,110,.4)` (bottom-right).
- Chrome: editor `#1e1e1e`, sidebar/tab bar `#252526`, activity bar `#333333` (icons `#858585`), terminal `#181818` (focused `#202020`), divider `#3a3a3a`, list selection `#37373d`.
- Status bar: `#007acc`; running `#cc6633`; status highlight `#ffd84d` with black text.
- Syntax: keyword `#c586c0`, `def`/storage `#569cd6`, function `#dcdcaa`, string `#ce9178`, variable `#9cdcfe`, class/module `#4ec9b0`, operator `#d4d4d4`, line numbers `#6e7681`.
- Captions: hash `#6a9955`, spoken/past words `#8cc47a` (brighter than the stock comment green so it reads on a phone), active word white on `#264f78`, current-line band `#2a2d2e`. CTA comments: `#a8e08f`.
- States: error `#f14c4c` (text `#ff6b6b`, peek detail `#f4a7a0`), success `#3fb950`, info cyan `#4fc1ff`.
- Fonts from google/fonts (OFL): **JetBrains Mono** variable (`ofl/jetbrainsmono`, wght 100–800) for code, captions, terminal, tabs and explorer. **Geist** (`ofl/geist`) for UI labels, status bar, tooltips and notification text. Turn ligatures off (`font-variant-ligatures:none; font-feature-settings:"liga" 0,"calt" 0`) so every glyph is exactly 0.6 em wide.
- Icons: Lucide `files, search, git-branch, play, blocks, file-code, file-plus, circle-x, circle-check, check, bell, mouse-pointer-2`.

## Caption system

- Each group is one comment line, `# ` plus up to **20 characters**, in JetBrains Mono 54 px / 700 on an 84 px row (32.4 px per character).
- Grouping rules:
  - Break on punctuation, on pauses > 0.5 s and before emphasis words.
  - Move a trailing function word ("the", "a", "of"…) to the next group when the next word follows within 0.3 s and the line still fits.
  - Tokens must equal the spoken words. Never add code-ish punctuation that was not said.
- Typing: at each word's start (−0.02 s), widen the line's `.ty` span by that word's columns using `steps(n)` easing. The duration is the minimum of 70% of the word's length, 0.06 s per char, 0.32 s and the time left before the next word, so typing never lags speech. A 5×62 px caret `#e8e8e8` follows the text.
- Active word: `background #264f78; color #fff; box-shadow: ±8px 0 0 #264f78` (padding without reflow), with no outline. Spoken words return to `#8cc47a`.
- New group: the row stack scrolls up one row (0.12 s `power2.out`). The previous row dims to 0.72 and the one before to 0.45, like file history.
- Emphasis words (the 1–2 closing keywords) get their own row, which scales 1.9× from `transform-origin:0% 85%` (0.16 s `back.out(1.8)`) while history fades to 0.
- Contrast spec: in enlarged crops of at least four frames (including the zoomed rows), the active word must read as white on saturated dark blue with no dark halo or clipping. The reference scored 9–10/10 for active words and 8/10 for inactive ones.

```css
.ty{display:inline-block;overflow:hidden;white-space:pre;vertical-align:top;width:0}
#capzone{position:absolute;left:200px;top:968px;width:800px;height:260px;overflow:hidden}
#capband{position:absolute;left:0;top:176px;width:800px;height:84px;background:#2a2d2e}
.cl{position:absolute;left:76px;height:84px;width:720px;opacity:0;counter-increment:cln}
.cl::before{content:counter(cln);position:absolute;left:-76px;width:56px;line-height:84px;text-align:right;font-size:24px;color:#8b949e}
.ci{position:absolute;left:0;top:0;white-space:nowrap;transform-origin:0% 85%;font:700 54px/84px JBM,monospace}
.hs{color:#6a9955}.w{color:#8cc47a;border-radius:3px}
.caret{display:inline-block;width:5px;height:62px;margin:11px 0 0 2px;vertical-align:top;background:#e8e8e8;opacity:0}
```

```js
// CAPS = [{start,end,words:[{shown,start,end}]}]; markup per row i:
// <div class="cl" id="cl{i}" style="top:{i*84}px"><div class="ci" id="ci{i}">
//   <span class="ty" id="ty{i}"><span class="hs"># </span><span class="w" id="w{i}-{j}">word</span> …</span>
//   <span class="caret" id="ca{i}"></span></div></div>
const SEL='#264f78',CMT='#8cc47a',ROW=84,FS=54,ADV=0.6;
const ON={backgroundColor:SEL,color:'#ffffff',boxShadow:`8px 0 0 ${SEL},-8px 0 0 ${SEL}`};
const OFF={backgroundColor:'rgba(38,79,120,0)',color:CMT,boxShadow:'8px 0 0 rgba(38,79,120,0),-8px 0 0 rgba(38,79,120,0)'};
CAPS.forEach((c,i)=>{
  TO('#caprows',{y:176-i*ROW,duration:.12,ease:'power2.out'},c.start);
  S(`#cl${i}`,{opacity:1},c.start); S(`#ca${i}`,{opacity:1},c.start);
  S(`#ty${i}`,{width:2*FS*ADV},c.start);                 // "# " appears at once
  if(i>0){S(`#ca${i-1}`,{opacity:0},c.start); TO(`#cl${i-1}`,{opacity:.72,duration:.12},c.start);}
  if(i>1) TO(`#cl${i-2}`,{opacity:.45,duration:.12},c.start);
  let col=2;
  c.words.forEach((w,j)=>{
    const tw=Math.max(c.start,w.start-.02);
    const nxt=j+1<c.words.length?c.words[j+1].start-.02:c.end;
    const n=[...w.shown].length+(j?1:0); col+=n;
    const d=Math.min(Math.max(.07,(w.end-w.start)*.7),.06*n,.32,Math.max(.02,nxt-tw-.005));
    TO(`#ty${i}`,{width:col*FS*ADV,duration:d,ease:`steps(${n})`},tw);
    S(`#w${i}-${j}`,ON,tw); if(nxt>tw) S(`#w${i}-${j}`,OFF,nxt);
  });
});
```

Normalize all text to NFC before counting characters. Otherwise accented letters break the width math.

## Scene grammar

Example speech: a speaker explaining why an agent writes a small script when no built-in tool exists. Map every beat to an editor action.

| Beat | Editor action | Bubble |
|---|---|---|
| **Cold open** (0–2.5 s, strongest spoken line) | Tab `task.py ●` is already open. The terminal types a two-line cover question (`› how does it handle…` / `  …without a tool?`, 40 px white). On the key noun, a flash-forward runs `$ python task.py`, the block bar fills and ✓ OK appears; the ring flashes `#3fb950` | `hero`, enters at scale 0.86 → 1 with `back.out(1.8)` |
| **Restart / thesis** | The cursor closes the tab (white flash at 0.22). A second tab such as `about.py` opens and short assignments are typed on the stressed words (`topic = "backups"`). Each named term gets a hover tooltip (term in teal JBM 34 px + one plain line). The terminal can show `$ whoami` with the brand line | `br`; pulse on the subject (1.1 yoyo), cyan ring on the key term |
| **Problem / condition** | The file scrolls out (y −420, 0.35 s). A request arrives in the terminal (`› request: …`) with an ASCII spinner (`| / - \` every 0.12 s). On the failure word, a red `✗ SomethingNotFound` appears with `elastic.out(1,.4)`, a squiggle grows under the call, a red peek widget opens (`back.out(1.6)`) and the Problems badge lights | `mr`, red ring, shake x 14/−12/9/−6/0 in 0.04 s steps |
| **Turn** | The cursor clicks *new file*. A new tab and a green explorer entry appear, then 1–1.5 s of musical silence | back to `br` |
| **Payoff (drop)** | On the payoff word, the buffer zooms 1.14 → 1 (0.35 s `expo.out`) with a 0.12 flash and a camera punch of 1.08. Generic, plausible code is typed line by line (0.008 s/char + 0.05, max 0.22 s per line) | punch |
| **Run** | Ctrl+L clears the terminal. Type `$ python task.py`, fill a 10-step block bar (0.75 s `steps(10)`), then show ✓ OK. The status bar is orange while it runs | — |
| **Comparison / contrast** | Focus switches: the editor dims to 0.3 and the terminal brightens. Each item from a spoken list becomes a short command. On the word naming the place, the terminal zooms 1.1, and the shell selector turns yellow when named | — |
| **Back to the point** | The editor returns to opacity 1 and the terminal dims to 0.35. Green change markers grow in the gutter, and the language item in the status bar lights yellow on its name | — |
| **Closing keywords** | The editor buffer fades. Each keyword gets its own caption row at 1.9× | grows to `hero`, flash 0.1, punch 1.07 on the last word |
| **CTA** (5 s, no voice) | See CTA section | closes at voice end − 0.12 s (scale 0.05, 0.26 s `power3.in`) |

Rules:
- Code, requests and outputs are **generic and plausible**. They are not real product code, data, metrics or claims.
- "OK" means it ran, not a measured outcome.
- Use no visible numbers that imply results.
- Never attribute authorship of a third-party tool on screen unless you have verified it.

## Transitions and motion vocabulary

- **Tab click:** the cursor fades in (0.12 s) and travels with `power2.inOut`, arriving 0.06 s before the click. The click is scale 0.82 (0.05 s) → 1 (0.08 s). The new tab enters with y 30 → 0 in 0.2 s `power2.out`. The old tab exits with y −20 and opacity 0 in 0.14 s.
- **Buffer scroll:** y ±420–560 over 0.35–0.4 s `power3.inOut`. Use it for chapter changes and for the CTA.
- **Ctrl +:** buffer scale 1.14 → 1 (0.35 s `expo.out`). Caption row scale 1.9 (0.16 s `back.out(1.8)`). Terminal content scale 1.1 (0.3 s `expo.out`), released 0.3 s `power2.inOut`.
- **Focus swap:** opacity 0.3 / 1 in 0.25 s, plus a terminal background change.
- **Ctrl+L:** terminal lines fade in 0.08 s.
- **Ctrl+S:** the tab `●` becomes `×`, and "✓ file saved" appears in the status bar.
- **Bubble moves:** 0.45 s `expo.inOut`. Ring colour changes take 0.12 s, with a 0.3 s return to `#d0d0d0`.
- **Flash:** a white overlay limited to the window area (y 262–1742). Use peak 0.22 on the restart and 0.10–0.12 on the drop and keywords.
- **Typing:** always use `steps(n)` with width tweens, never opacity fades for text.
- Avoid generic whoosh plus panel slides. A transition should be something an editor actually does.

## Sound design

Use voice-first metrics: `rk.mix(work, plan, rk.sfx_library())` with the kit targets. Typing, clicks and beeps are the texture, so keep each one short and quiet.

| Action | Category | Gain dB |
|---|---|---|
| Cold-open hit | `sub_drop` (0.9 s) | −19 |
| Text/code typed | `typing_fast` (length = typing span) | −26 to −31 |
| Enter / run | `keyboard`, then `click` | −24 / −22 |
| Tab or file click | `mouse_click` (0.25 s) | −20 |
| Tab/focus change, scroll | `swipe` (0.45 s) | −21 to −24 |
| Hover tooltip | `pop` / `data_beep` (0.4 s) | −24 / −26 |
| List commands, progress | `data_beep` (0.22 s), alternating | −27 / −28 |
| Request arrives | `message_received` | −21 |
| Searching | `robot_processing` (1.6 s) | −30 |
| Error | `wrong_buzzer` (0.6 s) + `glitch` (0.3 s) | −21 / −27 |
| Music cut before turn | `tape_stop` (0.6 s) | −25 |
| Payoff drop | `sub_drop` | −19 |
| Run succeeded | `success_chime` (0.9 s) | −22 |
| Terminal zoom / bubble grows | `whoosh` (0.45 s) | −23 / −24 |
| Status item / Ctrl+S | `lock_click` (0.4 s) | −19 to −23 |
| Closing keywords | `trailer_hit` (0.8 s), then `sub_drop` | −22 / −21 |
| Camera off | `camera_shutter` | −20 |
| Notification / Follow | `notify`, `mouse_click`, `success_chime` (1.2 s) | −19 / −14 / −17 |

Music: groovy and technical, never epic.
- `music:623` (hypnotic tech house) was used in the reference.
- `music:167` (futuristic electronic) suits AI and automation topics.
- `music:282` (lo-fi) suits calm, tutorial-like clips.

Measure the track's real bass attack (RMS in 20 ms windows) and use it as `drop_s`. Align it to the payoff word, then play the track continuously from there (`src = drop_s + (t − payoff)`).

Section plan, with times relative to the speech:

```python
plan["music"] = [
  {"start":0,           "end":restart,  "mode":"full",    "gain_db":-7, "src":drop_s+16, "fade_out":0.08},  # post-drop energy
  {"start":restart,     "end":problem,  "mode":"full",    "gain_db":0,  "src":0.4,       "fade_in":0.2},    # sparse intro
  {"start":problem,     "end":fail+0.6, "mode":"muffled", "gain_db":-2, "fade_in":0.2, "fade_out":0.35},
  {"start":fail+0.6,    "end":payoff,   "mode":"silence"},                                                    # tape_stop leads in
  {"start":payoff,      "end":compare,  "mode":"full",    "gain_db":-6, "src":drop_s,    "fade_in":0.006},  # real drop
  {"start":compare,     "end":back,     "mode":"radio",   "gain_db":-4, "fade_in":0.1},                      # "elsewhere" filter
  {"start":back,        "end":keywords, "mode":"full",    "gain_db":-9, "fade_in":0.1},
  {"start":keywords,    "end":duration, "mode":"full",    "gain_db":-6, "fade_in":0.02, "fade_out":1.2},
]
```

The reference also lifted the bed by +9 dB in the voiceless CTA. The voice always stays on top: SFX p95 sat about 33 dB under the voice, and music about 21.5 dB under the voice median.

## CTA design inside the style

The CTA runs from the voice end C for 5.0 s:
- **C + 0.08**: Ctrl+S. The tab `●` becomes `×` and the status bar shows "✓ task.py saved" (`lock_click`).
- **C + 0.2**: the buffer scrolls up 560 px and a new comment block scrolls in.
- **C + 0.62**: a giant comment is typed at 62 px on 86 px rows, 0.26 s per line with 0.3 s spacing, in `#a8e08f` bold. It holds the comment question split into ≤ 16-character lines (`# What would you` / `# automate first` / `# with a script?`). The last keyword is selected in `#264f78`. Below it, `# tell me in the comments` appears at 40 px.
- **C + 0.75**: the terminal types `$ follow @yourbrand` (40 px, 0.65 s) with a block caret.
- **C + 1.55**: an editor notification enters (y 50 → 0, 0.32 s `back.out(1.5)`, `notify`). It is a `#252526` card at (140, 996), 810×228, with a 2 px `#454545` border and 10 px radius. It holds the brand logo `assets/logo.png` at 136 px, the handle in JetBrains Mono 46 px/800 white, a one-line tagline in Geist 28 px `#c8c8c8`, and a bell icon.
- The **Follow** button is 300×62 at (196, 146) in the card, background `#0e639c`, white 32 px bold label.
- **C + 2.42**: the cursor clicks it. The button changes to a transparent background with a `#3fb950` border and green **Following ✓** (0.18 s `back.out(2)`). The terminal prints `Following ✓`.
- Aim the cursor tip at the button's left third so the pointer never covers the label.

## Implementation notes

Use reelkit for `load_words`, `finder` (all beat times come from spoken words), `setup_assets`, `ensure_icons`/`icon`, `prepare_camera`, `track_faces` + `jump_segments`, `mix` and `sfx_library`. Write a **custom page** instead of `rk.page()`, because the camera card, world layer and default caption band do not fit the screencast. Captions also need custom grouping and typing (above).

Typing helper (Python → timeline JS):

```python
ADV = 0.6  # JetBrains Mono advance (600/1000 em), ligatures off
def typing(js, sel, c0, c1, t, fs, dur=None, per=0.035):
    n = max(1, c1 - c0); d = dur if dur is not None else max(0.06, n * per)
    js.append(f'TO({json.dumps(sel)},{{width:{c1*fs*ADV:.2f},duration:{d:.3f},ease:"steps({n})"}},{t:.4f});')
```

Code lines are token spans with syntax classes inside a `.ty` span, positioned rows, and CSS counters for line numbers:

```css
.buf{position:absolute;left:0;top:0;width:800px;height:590px;opacity:0;counter-reset:ln;transform-origin:76px 30px}
.cr{position:absolute;left:76px;white-space:pre;counter-increment:ln}
.cr::before{content:counter(ln);position:absolute;left:-76px;width:56px;text-align:right;font-size:24px;color:#6e7681}
.k{color:#c586c0}.d{color:#569cd6}.f{color:#dcdcaa}.s{color:#ce9178}.v{color:#9cdcfe}.o{color:#d4d4d4}.c{color:#4ec9b0}
#squig{height:8px;background:repeating-linear-gradient(135deg,#f14c4c 0 4px,transparent 4px 8px);transform-origin:0 50%}
#prog-i{display:block;height:100%;background:repeating-linear-gradient(90deg,#3fb950 0 36px,transparent 36px 41px);transform-origin:0 50%}
```

Bubble rig and states:

```html
<div id="bub"><div id="bub-p"><div id="bub-in" style="clip-path:circle(50% at 50% 50%)">
  <div id="cam-punch"><div id="cam-jump"><div id="cam-breath">
    <video id="cam" class="clip" data-start="0" data-duration="{voice_end}" data-track-index="0"
           src="assets/camera-hd.mp4" muted playsinline></video></div></div></div></div>
  <div id="bub-ring"></div></div></div>
```

```js
const BUB={hero:[560,655,520],br:[805,1460,320],mr:[840,800,300]};
const bub=(n,t,d=.45)=>{const[cx,cy,dd]=BUB[n];TO('#bub',{x:cx-260,y:cy-260,scale:dd/520,duration:d,ease:'expo.inOut'},t);};
const ring=(c,t,back)=>{TO('#bub-ring',{borderColor:c,duration:.12},t);if(back)TO('#bub-ring',{borderColor:'#d0d0d0',duration:.3},back);};
```

Per jump segment, set `#cam-jump` x/y so the face lands at (0.50·520, 0.57·520), clamped to `[520−910, 0]`, with `scale` 1.0/1.06 alternating. Then `FT('#cam-breath',{scale:1},{scale:1.015,duration:seg,ease:'sine.inOut'},start)`.

Camera variants: the reference used the ungraded `camera-hd.mp4`, and a webcam should look like a webcam. If the source is warm or flat, a light grade fits:

```python
rk.styled_camera(work, "webcam", "eq=contrast=1.06:saturation=0.92:brightness=0.01,unsharp=5:5:0.5")
```

Determinism: there is no `Math.random`. Spinner frames are explicit `S()` sets every 0.12 s, and any jitter uses the seeded `rnd()`. Everything sits on one paused timeline registered as `window.__timelines.main`.

## Pitfalls found in production

- **AAC exceeded the WAV peak.** Short bright SFX (typing, beeps, clicks, the shutter) made the AAC encode overshoot the WAV master's peak by about 3.4 dB, reaching +1.4 dBTP, even though the WAV passed. `finalize` now guards this. It encodes a probe AAC and measures true peak, and if the result is above −1.5 dBTP it re-runs loudnorm at TP −4/−5/−6 until it passes; the reference ended at −3.1 dBTP and −14.8 LUFS. Keep transient SFX at −20 dB or below. Do not stack a click, beep and typing on the same frame. Always measure true peak **after** AAC.
- **Leftover output after Ctrl+L.** The run finished after the clear, so OK stayed on screen into the next beat. Shorten the typing and add a build-time assert: `ok_time < next_beat − 0.25`.
- **Bubble over terminal text.** In `br`, the bubble covers x≈645–965 / y≈1300–1620, so keep terminal lines short or move the bubble to `mr`.
- **Spinner jumped out of its line.** Put the frames in a fixed-width inline-block with absolutely positioned glyphs.
- **Active-tab border crossed the safe top.** Check by pixels: no row above y≈268 with more than 8 px brighter than luminance 150. The reference's first bright row was at y=287.
- **Hidden content.** The cursor covered the Follow label, and faint code showed behind the HERO bubble. Both were found only in vision previews; fix positions and hide buffers explicitly.
- **History contrast.** Stock comment green (`#6a9955`) at reduced opacity was unreadable on a phone. Use `#8cc47a` with 0.72/0.45 opacity.
- **Line numbers counted as caption tokens.** Generate them with CSS `::before` counters so the "caption tokens = spoken words" test only sees speech.
- **Ligatures and Unicode.** Ligatures and non-NFC accents break monospace width math. Disable ligatures and NFC-normalize everything.
- **The hook was weak** without a visible result. Adding the flash-forward run → OK to the cold open fixed it.
- **Soft webcam.** About 320 px of useful width is magnified 2.8× in HERO. That works but looks soft, so do not exceed 520 px.
- **Freeze at the end.** The camera video ends with the voice, so close the bubble at C − 0.12 s to avoid a frozen face in the CTA.
- **False freeze warnings.** The freeze detector flags 0.3–0.5 s still windows when the bubble is small and the UI is idle. Treat them as advisory and inspect those frames.
- **Batch sameness.** An earlier "camera card + panels + pill caption" version looked like every other clip in the batch. Compare side by side with vision against sibling cuts and change the whole format, not only colours.

## Variations

- **Other language or tool.** Use `//` comments with a JS/TS file and npm commands, `--` with SQL and a query result grid in the terminal area, or `#` with YAML/Dockerfile and `docker` logs. Keep the selection-blue active word, swap the syntax colours to that language's tokens and use `music:167` for a colder feel.
- **Light theme ("documentation day").** Editor `#ffffff`, sidebar `#f3f3f3`, status bar `#005fb8`, comments `#2f7d32`, selection `#add6ff` with **black** active text. Re-check contrast crops, because light themes clip active words differently.
- **Notebook cells.** Replace the terminal with notebook cells: each beat is a cell that runs (`[*]` → `[3]`) and prints its output below. Ctrl + zooms the output cell. This suits data or analysis topics.
- **Pull-request review.** The buffer is a diff (red `−` lines and green `+` lines). The problem beat is a review comment thread, and the payoff is a green "All checks passed" with Merge. For the CTA, "Approve" becomes "Following ✓". This fits team or process topics, with `music:282` for a calmer pace.
