---
style: chat
name: Chat (light messaging app)
family: fixed-style
best_for: explainers about instructions, assistants, support, habits or any "you said X, it answered Y" idea told as a live conversation
reference: produced by PycodeBR (Felipe Azambuja), October 2026
---
# Chat (light messaging app)

The whole Reel is the screen of a generic messenger app in light mode: a dark green app bar, a beige wallpaper with a dot pattern, mint "sent" bubbles and white "received" bubbles. The speaker is on a floating, borderless **video call** inside the app. **The captions are the speaker's messages**: every spoken sentence arrives as a mint bubble that fills in word by word, with a yellow highlighter on the active word. A counterpart (a bot, an assistant, a friend, a customer) replies in the pauses, so the argument plays out as a conversation the viewer already knows how to read. The feel is familiar, light and a little playful, the opposite of a dark, cinematic edit.

## When to use / when not to

Use it when:
- the speech has a natural counterpart: a tool that answers, a client who asks, a teammate who misunderstands, a "before vs after instructions" contrast;
- the topic is everyday and practical (setting up a bot, writing a brief, replying to customers, asking for help well);
- the speech has short pauses where a reply can land without covering the voice;
- you want a clearly different look from dark card-based styles in the same batch.

Avoid it when:
- the speech is a solemn story, a manifesto or a big emotional turn: chat UI makes it feel trivial;
- there is screen recording or B-roll that must fill the frame (the UI leaves only a 720×536 window for video);
- the speaker talks without pauses for 30 s: the counterpart has nowhere to reply and the chat becomes a wall of mint bubbles;
- the brand forbids light backgrounds, or the source camera is so low-res that even a 720 px wide window looks soft (consider a bigger camera style).

## Signature moves

1. **Captions are sent messages.** One bubble per spoken sentence, right-aligned, mint `#d9fdd3`, Inter 58 px. Unspoken words are `display:none`, so the bubble grows with the speech. After the sentence it stays in the history with read ticks (✓✓).
2. **Yellow highlighter on the active word.** Pure black `#000`, weight 800, on `#ffe14d`, rounded 12 px, no outline. The width of the bold glyphs is reserved so nothing jumps.
3. **A counterpart that replies in the pauses.** White bubbles on the left, with the app-bar status flipping `online` → `typing…` → `online` before each reply.
4. **Floating video call with states.** Big (720×536) → PiP in a secondary screen → medium (×0.70) in the example → collapses into the contact avatar at the payoff.
5. **Stickers for enumerations.** Three-word lists ("plan, test, ship") become three tilted sticker cards (Fredoka, Lucide icon) sent on the attack of each word; the active sticker turns yellow.
6. **System chips as story beats.** Centered pill chips (cream, red warning, green ok) name context ("Setting up an assistant"), the problem ("No instructions: same answer to everything") and progress ("Instructions saved").
7. **A second app screen for the explanation.** A settings/form/notes screen swipes in from the right; a field grows line by line on keywords; a Save button turns into **Saved ✓**.
8. **Ambient state changes.** Status changes (`away` with a moon icon), a subtle night tint on the wallpaper, verification badges on good replies, a big reaction sticker (thumbs-up) at the payoff.
9. **CTA is a new conversation.** The brand chat slides in with the comment question as a message, then a contact card with **Follow → Following ✓** tapped by a pointer.

## Frame and layout

Canvas 1080×1920, 30 fps. Coordinates are top-left.

| Zone | y range | Content |
|---|---|---|
| App bar | 0–410 | Gradient `#0a4337` → `#0f5a49` (luminance < 150). Nothing above y 300; header row at y 300–400: back arrow (50 px), avatar 84 px at x 104, name 42 px/700, status 31 px. Right icons: video, phone, menu (46 px, gap 34). Optional 6% white dot pattern in 0–290 so the bar does not look empty. |
| Pinned message | 410–480 | `#fbf8f3`, 2 px bottom border `#e3d9cb`, pin icon rotated 30°, 35 px/650: the cover question of the video. |
| Call window | big: x 180, y 490, 720×536 | Radius 34 px, no border, shadow `0 22px 44px rgba(30,25,15,.30)`, label chip bottom-left (`Name · context`), mic button top-right. |
| Chat viewport | top follows the call (1040 / 885) → bottom 1585 | List anchored to the bottom, grows upward; top 130 px faded with a mask. List padding `0 120px 12px 60px`, so sent bubbles end at x ≤ 960. |
| Composer | 1606–1710 | White pill input (sticker icon, placeholder, paperclip, camera) + 104 px green mic circle. Decorative only. |
| Below | 1710–1920 | Wallpaper only. |

Call states (GSAP `x, y, scale` with `transform-origin: 0 0` on a 720×536 box):

| State | x, y | scale | Size | When |
|---|---|---|---|---|
| big | 180, 490 | 1.00 | 720×536 | hook and problem |
| pip | 718, 424 | 0.42 | 302×225 | secondary screen (keep it below the app bar) |
| mid | 288, 490 | 0.70 | 504×375 | example / proof |
| gone | 74, 316 | 0.10, opacity 0 | into the avatar | 0.3 s before the voice ends |

Camera inside the window: `rk.prepare_camera(work)` → `camera-hd.mp4`, `object-fit: cover`. Jump-cut zoom 1.0 ↔ 1.075 per segment centred on the tracked face, 1.5% breathing, punch-in ×1.10–1.12 on one or two key words. No colour grade is needed; the light UI does the styling.

Safe zones: the top 270 px are dark bar only (the pixel test must find the first bright row at ≥ 268; the reference measured 308). The newest bubble's bottom sits at ~y 1570, right on the 350 px bottom guard; nothing critical goes into the composer. Right edge: sent bubbles stop at x 960, received bubbles at x ≤ 870.

## Palette and typography

| Role | Hex |
|---|---|
| Wallpaper / dots | `#efe6da` / `#e1d3c0`, `#e8dccc` |
| App bar / bar text / status | `#0f5a49` (top `#0a4337`) / `#ffffff` / `#c9eedf`, typing `#9ff0c9` italic 600 |
| Sent bubble (captions) | `#d9fdd3`, text `#111111` |
| Received bubble | `#ffffff`, text `#111111` |
| Accent green (buttons, badges, field border) | `#1f9d6b`, pressed `#0f5a49` |
| Highlighter (active word, active sticker, reaction) | `#ffe14d` with `#000000` text |
| Read ticks | `#53bdeb` |
| Chips | info `#fff7d6`/`#3d3420`, warning `#fde4e4`/`#8f1d1d`, ok `#dff5ea`/`#0f5a49` |
| Secondary screen | `#f4f6f8`, tab `#e9edf0`, placeholder `#8a949c` |
| Night tint | `linear-gradient(180deg, rgba(38,56,125,.22), rgba(38,56,125,.12))` |

Fonts (google/fonts, OFL): **Inter** variable (`ofl/inter`) for the whole UI and captions; **Fredoka** variable (`ofl/fredoka`) only for sticker labels. Copy each TTF plus its OFL text into `assets/`. Icons: Lucide (ISC) via `rk.ensure_icons`.

## Caption system

- Group words by **spoken sentence**, not by `max_words`. Build your own groups from `rk.load_words` (one group per sentence or clause of 3–10 words); a 14-sentence, 30 s speech gives 14 bubbles. `rk.captions()` is not used here.
- Each bubble enters 40 ms before its first word (`start = max(word0.start - 0.04, prev.start + 0.05)`); each word appears on its own attack (`w.start - 0.02`). Its active window in the plan is `start → next bubble start` (no overlap); the last ends at `min(voice_end, last.end + 0.3)`.
- Active word: weight 800, `#000`, background `#ffe14d`. Previous words go back to 500/`#111` with a transparent background. The first word of the hook is already visible and highlighted on frame 0.
- Enumerations become stickers (see Scene grammar); the sticker words are still the caption tokens, so token count = spoken words.
- Contrast check: enlarged crops of three frames (a long word mid-bubble, a short function word, an active sticker), asking explicitly for the active word.

```css
.bubble{position:relative;max-width:820px;padding:20px 30px 40px;border-radius:32px;font:500 58px/1.24 Inter,sans-serif;color:#111;box-shadow:0 3px 0 rgba(60,45,20,.10)}
.bubble.me{background:#d9fdd3;border-bottom-right-radius:8px}
.bubble.bot{background:#fff;border-bottom-left-radius:8px;font-size:50px;max-width:800px;padding-bottom:22px}
.w{display:none;vertical-align:baseline}
/* ghost of the bold word in the same grid cell: reserves the 800-weight width */
.w::before{content:attr(data-t);font-weight:800;visibility:hidden;grid-area:1/1;padding:0 .09em;height:0;overflow:hidden}
.w i{grid-area:1/1;font-style:normal;padding:0 .09em;border-radius:12px;justify-self:center;color:#111}
.tk{position:absolute;right:20px;bottom:8px}.tk svg{width:36px;height:36px;color:#53bdeb;stroke-width:2.6}
```

```js
// M.caps = [{id,start,end,layout,words:[{start,end}]}]; spans: #<id>-w<j> > i
const ON={backgroundColor:'#ffe14d',color:'#000000',fontWeight:800};
const OFF={backgroundColor:'rgba(255,225,77,0)',color:'#111111',fontWeight:500};
M.caps.forEach(c=>c.words.forEach((w,j)=>{
  const id='#'+c.id+'-w'+j, t=Math.max(c.start,w.start-.02);
  const tn=j+1<c.words.length?Math.max(c.start,c.words[j+1].start-.02):c.end;
  if(c.layout==='stickers'){
    FT(id,{opacity:0,scale:.3,rotation:-14},{opacity:1,scale:1,rotation:[-6,4,-3][j%3],duration:.3,ease:'back.out(2.4)'},t);
    S(id,{backgroundColor:'#ffe14d',borderColor:'#ffe14d'},t); S(id,{backgroundColor:'#fff',borderColor:'#fff'},tn);
  }else{ S(id,{display:'inline-grid'},t); S(id+' i',ON,t); if(tn>t) S(id+' i',OFF,tn); }
}));
```

Use `tl.set` (`S`) for the word switches, not tweens: hard switches are seek-safe and read crisply at 30 fps.

## Scene grammar

Example speech: a speaker explaining why an assistant needs written instructions (or why backups matter, why a brief beats a vague request).

1. **Cold open / hook (0–~5 s).** Frame 0 already shows a context chip ("Setting up an assistant"), the counterpart's greeting and the first bubble with its first word highlighted; the call is big. At the first pause the status shows `typing…` and the counterpart answers with something generic.
2. **Problem.** The counterpart repeats the *same* generic answer to everything (2–3 identical white bubbles), then a red warning chip states the problem in six words or fewer. If the speaker lists three verbs, send them as three stickers.
3. **Explanation (secondary screen).** A swipe (0.42 s `expo.out`) brings in a settings/notes/form screen (y 410–1030) over the chat; the header row swaps to the screen name; the call shrinks to PiP. A field grows one line per keyword of the speech (each line typed in ~0.7 s, with a check icon). The caption bubbles keep arriving in a "Conversation preview" tab below. In the next pause the Save button flips to **Saved ✓**.
4. **Turn / example.** Swipe back (0.38 s `expo.in` out). An ok chip ("Instructions saved"), call at mid size. On the word that sets the scene ("after hours", "on Sunday", "when the server crashes") the status changes (moon icon + `away`) and the night tint fades in over 0.6 s. The counterpart now types and sends specific, polite replies, the first one landing in the longest pause.
5. **Payoff.** Punch-in on the conclusion word; on the result phrase the good replies get green check badges (staggered 0.1 s), the tint fades out, a 230 px yellow thumbs-up reaction pops, and the call collapses into the avatar.
6. **CTA (5 s after the voice).** See CTA design.

Content rules: replies and field lines may only rephrase what the speaker says; show numbers, names, hours or prices only if they are spoken. Chips give context, they never add claims. No real contacts, phone numbers or channel names.

## Transitions and motion vocabulary

| Move | Recipe |
|---|---|
| New message | message wrapper `maxHeight 0 → 760` in 0.5 s `power2.out` (pushes the list up) + bubble `opacity 0, scale .8, y 26 → 1` in 0.26 s `back.out(1.8)`; origin bottom-right (sent) or bottom-left (received) |
| Screen swipe | panel `x 1080 → 0` 0.42 s `expo.out`; header rows cross-slide ±160 px with opacity (0.25 s `power2.in` out, 0.32 s `expo.out` in) |
| Call state change | explicit `fromTo` from the previous state, 0.45 s `expo.inOut`; viewport `top` follows in 0.4 s `expo.inOut` |
| Collapse to avatar | 0.28 s `power3.in` to scale 0.1, opacity 0 over the avatar |
| Status | `tl.set` opacity swaps between stacked spans (`online`, `typing…`, `away`) |
| Field line | height `+47 px` in 0.25 s `power2.out`; line `x -18 → 0` 0.18 s; characters via `textContent` sets |
| Save / Follow press | scale 1 → 1.08 (or 0.95) in 0.12 s, back with `back.out(2)` 0.25 s; label swap with `tl.set` |
| Badge / reaction | `scale .2 → 1` 0.28–0.36 s `back.out(2.4–2.6)`; thumbs icon yoyo ×1.14 |
| Punch-in | `#camzoom` 1 → 1.10–1.12 in 0.14–0.16 s `power4.out`, back in 0.4–0.5 s `power3.inOut` |

No flashes, shakes, speed lines or grain: this style borrows motion from real messaging UIs. Keep at most one heavy move per second.

## Sound design

Every UI action has a quiet, realistic sound; impacts go in pauses.

| Action | Category | Gain dB | Notes |
|---|---|---|---|
| sent bubble (hook, preview) | `message_sent` | −22 / −27 | length 0.35–0.5 s; not on every bubble, only at section starts |
| counterpart reply | `message_received` | −19 to −25 | the first good reply loudest, in a pause |
| sticker | `pop` | −20 | `rate` 1.0 / 1.12 / 0.9 for three stickers, alternate variants |
| warning chip | `wrong_buzzer` | −29 | 0.32 s, keep it low |
| screen swipe | `swipe` | −18 (CTA −16) | `rate` 1.1 on the way back, 0.92 for the CTA |
| field line typed / counterpart typing | `typing_fast` | −30 / −29 | length = typing time + 0.1, max 0.9 s |
| Saved / payoff / Following | `success_chime` | −21 / −21 / −16 | 0.6–0.8 s |
| "saved" chip | `lock_click` | −27 | |
| status → away | `clock_tick` | −29 | 0.55 s |
| reaction sticker | `pop` | −18 | |
| CTA question | `phone_notification` | −15 | |
| tap Follow | `mouse_click` | −13 | 0.08 s before the state flip |

Music direction: light, propulsive, "getting things done". Options: `music:33` (motivational, used in the reference), `music:282` (lo-fi, calmer topics), `music:187` (uplifting, for a warmer payoff). Section plan (`rk.mix`):

```python
plan["music"] = [
  {"start": 0,          "end": turn - .30, "mode": "full",    "src": 0,        "gain_db": 0,  "fade_out": .06},
  {"start": turn - .30, "end": turn - .02, "mode": "silence"},                 # 0.28 s gap before the swipe
  {"start": turn - .02, "end": back + .05, "mode": "full",    "src": drop_s,   "gain_db": 0,  "fade_in": .05},
  {"start": back + .05, "end": payoff,     "mode": "lowpass", "src": drop_s+20,"gain_db": -3, "fade_in": .25},
  {"start": payoff,     "end": duration,   "mode": "full",    "src": drop_s+36,"gain_db": 0,  "fade_in": .3, "fade_out": .9},
]
plan["cta_boost_db"] = 4
```

`turn` = the swipe into the secondary screen, `back` = the swipe back, `payoff` = start of the closing sentence. The drop (`src = drop_s`, the track's energy lift) lands exactly on the swipe. The lowpass section doubles as the "after hours / muffled" mood of the example. Voice first: let `rk.mix` duck the bed (music ≈ 21.5 dB under the voice median, background p95 ≥ 12 dB under). Pick the track from the catalog metadata, then **listen** to the seams before shipping.

## CTA design inside the style

Five seconds after the voice (`C = voice_end`):

- `C+0.02` the brand conversation slides in (`#cta` panel with the same wallpaper, `x 1080 → 0` 0.45 s `expo.out`); header row: brand avatar (`assets/logo.png` on white, as CSS background), brand name, `online`. Composer placeholder switches to a prompt like "Write your rule…" (green, 600).
- `C+0.35` big received bubble (64 px/800): the comment question tied to the topic ("Which rule do you always forget to give your assistant?").
- `C+1.0` small bubble with a `message-circle` icon: "Tell me in the comments."
- `C+1.6` contact card 840 px wide: logo 128 px, `@handle` 60 px/800, brand name 36 px, one-line promise 38 px, full-width **Follow** button (772×112, `#1f9d6b`, `user-plus` icon).
- `C+2.3` Lucide `pointer` (130 px, white fill, drop shadow) glides in from (+120, +160) in 0.4 s `power3.out`; `C+2.86` press (scale 0.86, button 0.95); `C+2.94` button turns white with a 5 px inset green ring and label **Following ✓** in `#0f5a49`; green ripple ring `scale .3 → 3.2` 0.45 s; `C+3.5` pointer leaves.
- The handle always comes from the brand config; never invent one.

## Implementation notes

Build with reelkit: `rk.load_words`, `rk.finder` (keyword times, use the `after` argument for repeated words), `rk.setup_assets` (GSAP, logo), `rk.ensure_icons`, `rk.icon`, `rk.prepare_camera`, `rk.track_faces` + `rk.jump_segments`, `rk.mix`. Write the page yourself: `rk.page()` is a card-on-world skeleton and does not fit a full-screen app.

Page skeleton (z-order bottom → top): `#chatbg`, `#night`, `#pin` (z5), `#vp > #list` (z6), `#settings` (z12), `#call` (z30), `#cta` (z40), `#comp` (z45), `#top` app bar (z50), `#finger`/`#ripple` (z60). Header rows (`.hrow`) for each screen are stacked inside `#top` and cross-faded.

```html
<div id="vp"><div id="list">
  <div class="msg out" id="m-cap-3"><div class="in">
    <div class="bubble me" id="cap-3-b">
      <span class="w" id="cap-3-w0" data-t="Backups"><i>Backups</i></span> …
      <span class="tk"><!-- rk.icon('check-check') --></span></div></div></div>
</div></div>
```

```css
#vp{position:absolute;left:0;top:1040px;width:1080px;bottom:335px;overflow:hidden;z-index:6;
  -webkit-mask-image:linear-gradient(180deg,transparent 0,#000 130px);mask-image:linear-gradient(180deg,transparent 0,#000 130px)}
#list{position:absolute;left:0;bottom:0;width:1080px;display:flex;flex-direction:column;padding:0 120px 12px 60px}
.msg{max-height:0;overflow:hidden;flex:none}.msg.pre{max-height:none}
.msg .in{display:flex;padding:22px 6px 6px}
.msg.out .in{justify-content:flex-end}.msg.inb .in{justify-content:flex-start}.msg.sys .in{justify-content:center}
#call{position:absolute;left:0;top:0;width:720px;height:536px;transform-origin:0 0;z-index:30}
#callclip{position:absolute;inset:0;border-radius:34px;overflow:hidden;background:#20262a;box-shadow:0 22px 44px rgba(30,25,15,.30)}
.stk{width:262px;height:250px;border-radius:44px;background:#fff;border:8px solid #fff;box-shadow:0 10px 22px rgba(60,45,20,.22);
  display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;opacity:0}
.stk b{font:700 47px/1 Fredoka,Inter,sans-serif;color:#000}
```

```js
// messages: one chronological list; t<0 means present on frame 0 (.pre)
M.msgs.forEach(m=>{ if(m.t<0) return;
  FT('#'+m.id,{maxHeight:0},{maxHeight:760,duration:.5,ease:'power2.out'},m.t);
  if(!m.ownAnim) FT('#'+m.id+' .in > *',{opacity:0,scale:.8,y:26},{opacity:1,scale:1,y:0,duration:.26,ease:'back.out(1.8)'},m.t);
});
// call window: every state is a fromTo from the previous one (seek-safe in any order)
const CS=M.callStates; gsap.set('#call',CS[0][1]);
for(let i=1;i<CS.length;i++) FT('#call',{...CS[i-1][1]},{...CS[i][1],duration:CS[i][2],ease:CS[i][3]||'expo.inOut'},CS[i][0]);
// status line: M.status = [[t,'on'|'ty'|'off'], …]
const ST={on:'#st-on',ty:'#st-ty',off:'#st-off'};
M.status.forEach(([t,s])=>Object.keys(ST).forEach(k=>S(ST[k],{opacity:k===s?1:0},t)));
```

Python side: keep one `messages()` list with `{id, t, side: out|inb|sys, html, ownAnim}` sorted by `(t, index)`; schedule counterpart replies at `finder()` times of the pause *before* the next sentence (e.g. `f("right") + 0.06`), and the "typing…" status 0.5–0.6 s earlier. Settings lines: `dict(t=f(keyword) - .02, text=…, h0, h1=max(96, 50 + 47*(i+1)), d=.7)`.

Optional camera variant for soft webcams in the small states (not needed in the reference): `rk.styled_camera(work, "camera-crisp", "eq=contrast=1.04:saturation=1.06,unsharp=5:5:0.5:5:5:0")`.

Determinism: no `Math.random`; sticker tilts are fixed (−6°, 4°, −3°); use `rnd()` (seeded, e.g. `K.seed = 20261013`) for any jitter. All words and state switches use `tl.set`; every multi-state element uses explicit `fromTo` so seeking backwards is exact.

## Pitfalls found in production

- **Pre-sized empty bubbles.** The first draft rendered each bubble at its final size and filled it in, so the frame showed empty mint boxes with only ticks. Fix: unspoken words `display:none`, wrapper `max-height` opening; the bubble grows with the speech.
- **Layout shift from the bold active word.** Switching 500 → 800 weight reflows the line. Fix: the `::before` ghost with `content:attr(data-t)` at 800 in the same grid cell.
- **Sticker label overflow.** In the first draft the longest sticker word spilled out of its card. Measure the longest label: the final 262 px cards with Fredoka 47 px fit ~9 uppercase letters; shorten or widen beyond that.
- **Cramped status line.** Early previews showed the status squeezed against the contact name. Fix: name 42 px, then a fixed 38 px status box (31 px text) with absolutely positioned spans swapped by opacity.
- **Two tweens on one `scale`.** The reaction sticker had the generic message pop *and* its own pop; seek round-trips diverged. Mark elements with their own animation (`ownAnim`) and skip the generic pop. Test seek forward/back at ~20 times (expect 0% pixel diff).
- **PiP under the app bar.** The reference parked the PiP at y 292 with the app bar on a higher z-index, so only its lower ~110 px showed below y 410; the face survived only because it sat low in the frame. Keep the PiP fully below the bar (y ≥ 420) as in the state table.
- **Small face in PiP.** A 320 px webcam at 302×225 is recognisable but small; keep PiP sections under ~9 s and return to mid size for the example.
- **Night tint too subtle.** The first tint did not read on the preview sheet; the final 0.22 → 0.12 blue gradient reads as "evening" without hurting caption contrast.
- **Invented facts in replies.** Counterpart replies are written by you: only show numbers and details the speaker says.
- **Freeze detector false positives.** Static UI with a small camera trips the freeze detector; inspect those frames instead of adding motion for its own sake.
- **Single-file lint warning.** A generated single-page composition (~800 lines) triggers `composition_file_too_large`; it is a warning, not an error.
- **Icon names drift.** One expected Lucide name was not found by the icon fetcher; check every name returned by `rk.ensure_icons` and substitute (`sticker` for the emoji-face icon).

## Variations

- **Customer support / sales chat:** the counterpart is a customer asking questions; the speaker's bubbles are the answers; the secondary screen is a saved-replies list; the payoff is a 5-star rating card instead of a thumbs-up.
- **Group chat:** two or three counterpart avatars with different colour names reacting to the speaker (emoji reactions under bubbles, "typing…" from several people); the secondary screen becomes a shared checklist.
- **Notes to self / dark mode:** a "saved messages" chat with the speaker's own past messages as the problem (old bad habits) and the new message as the fix; for late-night topics swap to a dark palette (`#0b141a` wallpaper, `#005c4b` sent bubbles, white text) keeping the yellow highlighter.
- **Voice-note twist:** at the turn, the counterpart sends a voice note (waveform bubble whose bars follow the speaker's voice envelope) instead of text, then the video call returns to big for the conclusion.
