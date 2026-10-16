---
style: stories
name: Stories (behind the scenes, story by story)
family: fixed-style
best_for: paid-traffic ads with a "Learn more" CTA that promise to show "what it is like inside" (a programme, a community, a routine, a team) and walk through daily rituals before an offer; native to Reels/Stories placements
reference: produced by the PycodeBR team with heditor, Oct 2026
---
# Stories (behind the scenes, story by story)

The whole Reel is a sequence of 15–20 vertical stories from the brand's own account. Segmented progress bars run along the top (just below the safe margin), the header shows the brand avatar inside a gradient ring and a chapter label, and every spoken idea becomes a new story with its own saturated background and hand-made stickers: a calendar with days circled in pen, a "LIVE SESSION" tag with a red dot, a quiz sticker whose options light up as they are said, a question box receiving checks, stacked notifications, a static deadline sticker, a link sticker that gets tapped. Inside a chapter the stories advance with a **tap** (ring + click); between chapters the deck turns with a **3D cube swipe**. The speaker is cut out over the backgrounds and becomes a "LIVE" bubble when a story shows a shared screen. The core metaphor: **"let me show you the day-to-day" told in the native language of the placement where the ad runs**.

It is a generic redraw of story conventions. Never use a real platform's logo, name, icons, fonts or exact UI.

## When to use / when not to

Use it when the speech:
- promises a look inside ("let me show you how it works", "this is the routine of…");
- describes recurring rituals (meetings, live sessions, a group that talks every day, Q&A);
- turns into an offer or invitation with a spoken deadline;
- runs as a Reels/Stories ad with "Learn more".

Avoid it when:
- the speech is an argument or a technical explanation without rituals (stickers become decoration);
- the brand is formal or the topic is serious (health, money advice, grief);
- the batch already has a messaging-app world (`chat`) or a sticker-heavy world (`album`);
- the matte cannot be made clean and the source background is busy (fallback: a rounded story card holding the camera).

## Signature moves

1. **Frame 0 opens from the avatar ring**: the first story expands from the header ring as a circle that grows to full screen with the speaker already talking, and a big sticker ("INSIDE <PROGRAMME>") slaps in under the first syllable.
2. **Progress bars that fill in real time**, one per story, the current one filling with the story's duration; all bars full on the end card.
3. **Tap to advance** inside a chapter: a ring flashes on the right edge (tap zone), a short click, the background swaps.
4. **Cube swipe between chapters** (meetings → community → offer): the deck rotates −88° around its right edge, snaps to +88° around the left edge, then settles to 0 (`rotationY`, 0.17 s in + 0.26 s out), with a whoosh.
5. **Sticker vocabulary drawn in CSS**: calendar with pen circles, live tag, quiz with options lighting on the spoken word and a "TODAY'S TOPIC" stamp, question box with blurred questions getting ✓, weekday row lighting on "every day", stacked notifications, emoji-free rounded labels, static deadline sticker (no timer), link sticker "LEARN MORE ›".
6. **Shared-screen story**: the background becomes a slide or diagram from the real content, the speaker shrinks to a circular "LIVE" bubble, a cursor draws a highlight.
7. **Highlights payoff**: near the end, story highlight rings (one per ritual) pay off the "day-to-day" promise made in the hook.
8. **Colour by chapter, not by decoration**: warm coral, violet and lime stories for the routine; the offer chapter switches to near-black with lime/coral accents.

## Frame and layout

Canvas 1080×1920, 30 fps, Paid-ad variant (`../captions-and-layout.md`).

```
y 0–270      background colour only (no text, no bars)
y 280–288    progress bars: x 24–1056, 8 px, gap 6, radius 4, rgba(255,255,255,.38) track, white fill
y 302–364    header: avatar 60 px in a conic ring (#ffd23f → #ff3d6e → #c13cff), brand name Geist 800 31 px, chapter label
y 372–1030   stickers (one column beside the face) and the speaker cutout
y 1046–1150  caption band (white story-text box)
y > 1152     background and the speaker's body fading out
```

- Speaker cutout states: `hero` (face large and centred), `right` / `left` (opens a sticker column on the other side), `bubble` (circle inside a shared-screen story, "● LIVE" tag), `out` (CTA). Jump-cut zoom 1.0 ↔ 1.03 per EDL segment, 1 % breathing.
- Measure the face box (`rk.track_faces`) and keep every sticker, ring and tap marker off eyes and mouth; the avatar ring of the hook must not cover the face once the story is open.
- Fade the cutout base and sides with a CSS mask so the source frame edge never shows; hide the one-pixel line that can appear at the matte base.

## Palette and typography

| Role | Hex |
|---|---|
| Coral story | `#ff4d6d → #ff9f43` |
| Violet story | `#5b2bff → #c13cff → #ff4fd8` |
| Lime story | `#d7ff3a → #5dffa0` |
| Offer chapter | `#0c0c12` with lime `#d7ff3a` / coral accents |
| Sticker paper | `#ffffff`, ink `#111111` |
| Active word | black on lime `#d7ff3a` |
| Live dot | `#ff3040` |

Fonts (OFL, in the kit): **Fredoka** 700 for stickers (rounded, friendly), **Geist** 800/900 for header and captions, **Anton** only for big numerals (a spoken "2×", a spoken date). Icons: Lucide (`eye`, `sun`, `calendar`, `circle-dot`, `message-circle`, `check`, `clock`, `bell`, `link`, `pointer`, `footprints`, `gauge`).

Messaging-group glyphs or platform logos: only if the user owns them or has written permission and the trademark guidelines allow it; otherwise a generic `message-circle` sticker with the spoken group name in text.

## Caption system

"Story text": white box, radius 12, padding `10px 20px 8px`, Geist 900 uppercase, black text, `font-size: var(--fs, 64px)`, line-height 1.1, one line, max 1000 px (keep the visible text ≤ 800 px).

- Grouping: ≤ 3 words / 20 characters.
- Active word: **black on lime `#d7ff3a`** (≈ 17:1) with radius 10 and `0 .12em` padding.
- The box sits on top of every background colour, so contrast never depends on the story.

```css
.capwrap{left:0;top:1046px;width:1080px;height:106px;z-index:40;display:flex;align-items:center;justify-content:center}
.cap{display:inline-block;max-width:1000px;background:#fff;padding:10px 20px 8px;font-family:Geist;font-weight:900;
  font-size:var(--fs,64px);line-height:1.1;text-transform:uppercase;color:#111;white-space:nowrap;border-radius:12px}
.cap .w{display:inline-block;padding:0 .12em;border-radius:10px}
```

## Scene grammar

Generic example: a host showing the routine of a mentoring community and inviting existing customers to join.

| Beat | Story | Speaker | What happens |
|---|---|---|---|
| Hook "let me show you…" | S1 coral | `hero` | Ring expands into the story; "INSIDE <PROGRAMME>" sticker; eye and "DAY TO DAY" stickers on the words; emblem glows on the brand name. |
| Recurring meetings | S2 violet (tap) | `right` | Month calendar, two days circled in pen on "twice a month", "2× A MONTH" in Anton; "● LIVE SESSION" on "live". |
| Session content | S3 lime | `left` | Real topic cards dealt like a deck on "class / materials". |
| Topics | S4 coral | `right` | Quiz sticker "SESSION TOPIC"; each spoken topic lights; the last gets "TODAY'S TOPIC" stamp. |
| Practice | S5 violet | `bubble` | Shared-screen story with a real diagram, cursor highlight, music goes low-pass ("inside the class"). |
| Questions | S6 lime | `right` | Question box, blurred questions receive ✓ on "I answer every question". |
| Between meetings (chapter 2) | cube swipe → S7 | `left` | Line "MEETING — • • • — MEETING", weekdays light on "every day". |
| Group | S8–S11 | alternate | Phone with blurred bubbles and neutral avatars; clock and stacked notifications on "several times a day"; stickers pile up for each activity said. |
| Offer (chapter 3) | silence + tape stop → cube swipe → S12 dark | `right` | "ONLY FOR <AUDIENCE>" with a lock, "SPECIAL CONDITION" huge in lime with glow; steps "NEXT STEP", speed lines on "accelerate". |
| Deadline | S14 coral | `left` | Static sticker "AVAILABLE UNTIL <SPOKEN DATE>" with the day circled. No countdown. |
| Spoken CTA | S15 violet | `right` | Link sticker "LEARN MORE ›" tapped on "learn"; phone scrolling the real page without price. |
| Sign up / start | S16 lime | `left` | Checklist SIGN UP ✓ → START TODAY. |
| Payoff | S17 coral | `right` | Highlight rings (MEETINGS / GROUP / CLASSES) + "DAY-TO-DAY SUPPORT" (closes the hook's promise). |
| Goodbye | S18 violet | `hero` | "SEE YOU IN CLASS". |
| End card (4 s) | S19 | `out` | Emblem, product name, big white "LEARN MORE ›" with a link icon, "TAP LEARN MORE", down arrows, three taps; all bars full. |

Rules: one sticker per spoken idea; a sticker never says more than the speech; message bubbles and group screens are blurred or abstract (no legible names, numbers or real conversations); content cards come from the advertiser's own material.

## Transitions and motion vocabulary

- **Story open** (frame 0): `clip-path: circle(30px at <avatar>) → circle(150% at 50% 50%)` in 0.45 s `expo.out`.
- **Tap**: ring at x ≈ 980 scales 0.6 → 1.4 with opacity 0.8 → 0 in 0.25 s; background crossfade 0.12 s; the bar of the finished story snaps full.
- **Cube swipe**: on `#deck`, `rotationY 0 → −88` (0.17 s `power2.in`, origin right), set `+88` (origin left), then `→ 0` (0.26 s `power3.out`); `perspective: 2200px` on the stage.
- **Sticker slap**: from `scale 1.6, rotation ±8, opacity 0` to `scale 1, rotation ±3` in 0.22 s `back.out(2.4)`.
- **Pen circle**: SVG ellipse with `stroke-dashoffset` drawn in 0.35 s, slightly overshooting.
- **Notifications stack**: each card from y −40 with `back.out(1.6)`, previous cards push down 12 px and dim.

## Sound design

| Action | Category | gain_db | length |
|---|---|---|---|
| Frame-0 sticker (under the first syllable) | `pop` | −26 | 0.2 |
| Taps between stories | `click` (vary rate .95–1.1) | −24 | 0.12 |
| Stickers | `pop` (vary variant) | −27 to −18 | 0.15 |
| Short swipes / cube swipe | `swipe` / `whoosh` | −27 / −26 to −21 | 0.3 / 0.45 |
| Pen circles | `pen_write` | −26 | 0.35 |
| Stamps (in gaps) | `stamp` | −26 to −20 | 0.3 |
| Cards dealt | `page_turn` | −26 | 0.25 |
| Quiz options | `data_beep` | −29 | 0.2 |
| Checks | `success` | −27 | 0.4 |
| Group / notifications | `message_received`, `message_sent`, `notify` | −29 | 0.3 |
| Clock | `clock_tick` | −29 | 0.6 |
| Chapter change to offer | `tape_stop` + `riser` + `bass_impact` | −24 / −26 / −24 | 0.4 / 0.8 / 0.6 |
| Lock | `lock_click` | −28 | 0.3 |
| Next step | `footsteps` | −27 | 0.5 |
| Link tap / end taps | `mouse_click` | −28 to −19 | 0.15 |
| End card | `success_chime` | −17 | 0.8 |

UI over words stays at −26 to −29 dB and 0.12–0.15 s; impacts in gaps.

**Music:** `music:623` (Deep Urban, hypnotic tech house: a feed pulse without a melody that fights the voice) — reference. From 13.5 s of the file (full around 2–3 s in), low-pass on the shared-screen story, 0.3 s silence with `tape_stop` before the offer chapter, back from 116 s of the file (the full section after the break) on the offer, `cta_boost_db` 4, 1.2 s fade. Alternatives: `music:282` (lo-fi, calmer community), `music:187` (uplifting build) for a warmer brand.

```json
[{"start":0,"end":"SCREEN","mode":"full","track":"A","src":13.5,"fade_in":0.01,"fade_out":0.06},
 {"start":"SCREEN","end":"SCREEN_END","mode":"lowpass","track":"A","src":"t+13.5","fade_in":0.05,"fade_out":0.06},
 {"start":"SCREEN_END","end":"OFFER-0.33","mode":"full","track":"A","src":"t+13.5","fade_in":0.06,"fade_out":0.25},
 {"start":"OFFER","end":"DURATION","mode":"full","track":"A","src":116.0,"fade_in":0.03,"fade_out":1.2}]
```

## CTA design inside the style

The CTA is the last story (Paid-ad variant): emblem, product name, a big white "LEARN MORE ›" button with a Lucide `link` icon, a "TAP LEARN MORE" strip and down arrows, three taps (ring + click), all progress bars full. No speech, 4 s, music rises and resolves.

## Implementation notes

- Structure: `#stage` (perspective) → `#deck` (rotates in cube swipes) → `#bgs` (one `.bg` per story, crossfaded), cutout `<video>` (alpha WebM), sticker layers; outside the deck: `#bars`, `#hdr`, captions, tap rings and flash, so UI chrome never rotates.
- Progress: one `.bar > i` per story; `TO(i,{width:'100%',duration:story_len,ease:'none'},story_start)`; set previous bars to 100 % at each tap.
- Story timings come from `rk.finder(words)`; each story starts on the first word of its idea, the tap 0.05 s before it.
- Spoken numbers and dates go in `plan["allowed_numbers"]`; draw calendar day numbers with CSS counters.

## Pitfalls found in production

- **Recording ≠ script**: the script promised items the speaker never said (recordings, a weekday, a record claim); the screen followed the recording.
- **Matte around a mesh chair**: neither of two matting tools was perfect; small semi-transparent wisps near the ears showed when the hands moved near the head. Plate cleanup + protected ellipse + checking enlarged previews kept it acceptable.
- **Stickers on the face** and the hook ring over the face: measure the face box and offset everything.
- **Notifications over the caption band**: cap the stack height above y 1030.
- **Clipped stickers** at the edges: Fredoka is wide; shrink text before moving the sticker.
- **Top margin false negative**: lime and coral backgrounds reach the top, so the pixel check reports 0; confirm visually that bars start at ≥ 280 and titles at ≥ 370.
- **Redundant sentence**: a summary sentence with a doubled word was removed at clean valleys; the edit felt faster without losing meaning.

## Variations

- **Day in the life**: chapters by time of day (morning, afternoon, night) with a sun/moon sticker; for founders, routines, teams.
- **Event recap**: stories become venue moments (arrival, talk, Q&A, after); swap the calendar for a ticket sticker.
- **Product onboarding**: each story is a screen of the product with a "tap here" sticker; for app launches. Music `music:623`.
- **Organic version**: replace the end card with a Follow → Following story and a question sticker for comments (standard CTA).
