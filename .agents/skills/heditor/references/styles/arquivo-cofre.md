---
style: arquivo-cofre
name: Arquivo-cofre (archive reading table at night)
family: fixed-style
best_for: authority family (serious tone, the speaker as the expert); talks about backups, versions, history, audit trails, rollback, "keep every state and be able to go back", records and compliance; organic Reels with a comment question and Follow
reference: produced by the PycodeBR team with heditor, Oct 2026
---
# Arquivo-cofre (archive reading table at night)

The Reel is the reading table of a climate-controlled institutional archive at night. The expert is the **chief curator**: the camera is a photographic record mounted in an **archival passe-partout** (graphite board with a cream bevel and corner mounts), lit from above by the cold light of a **microfilm reader**. Below it, paper and steel objects pass across the table: typed **record cards** that get struck through and torn, a **steel drawer** with a label holder and hanging tabs that rise when named, an **accession entry** with a short definition, a **restricted-access protocol** card, a **time-stamp clock** (no numerals, a moon for the night) that punches the end of every day, and at the base a **microfilm reel** where every frame is one day. The caption is printed on a strip of **continuous copier paper** with tractor holes. At the rule, the reel **rewinds** to YESTERDAY and a cobalt **RESTORED** stamp lands on the good day's record. The core metaphor: **every day is an archived record, and going back is retrieving the record of the day it worked**.

## When to use / when not to

Use it when the speech:
- is about keeping dated states of something that changes every day (a project, a folder, a configuration, a database);
- recommends versioning, snapshots or a scheduled job that saves the state automatically;
- ends with a rollback rule ("it got worse? go back one version / to yesterday").

Avoid it when:
- there is no idea of time, history or going back;
- the tone is light or fast (the archive is deliberately slow, quiet and institutional);
- the batch already has a stamp-heavy paper world (`tribunal`, `aduana-de-dados`) or a forensic folder (`laudo-de-sinistro`): if so, drop the stamps and lean on the reel and the drawer.

## Signature moves

1. **Frame 0**: a record card "RECORD · TODAY" already on the table with a question headline ("DID IT GET WORSE AFTER ONE TASK?"), the reel showing a struck-through TODAY frame in the reader window; title slam 1.06 → 1, low impact and a dry stamp.
2. **Typed annotations** on the card for each thing the speech says changed ("+ new item", "+ new note"); on the pejorative word a graphite **scribble** covers them, the headline gets crossed out, a black **ALTERED** stamp hits, the card edge tears and the camera desaturates for 0.45 s.
3. **Steel drawer** rises and opens; hanging tabs rise one per spoken component (file type, folder, module); an "altered" pencil note in cobalt appears on each tab when the speech says they keep changing; the drawer shuts and the label gets a cobalt underline when the folder is named.
4. **Microfilming**: a cold flash, the drawer gets a white film border and shrinks in place to the size of a frame, which becomes the reel's first frame; a padlock label ("private") joins the reel and stays to the end.
5. **Accession entry**: "ARCHIVE ENTRY · <VERB>" with a one-line typed definition of the jargon; the reel gains a frame on each "it grows / it has versions" word; slow push-in.
6. **Thesis plate**: a 0.26 s music silence + riser, then the literal thesis line as a plate with the key verb lit in cobalt; punch-in 1.06, flash, shake.
7. **Restricted-access protocol** card: what stays private and what never enters the archive (secrets, keys), with a PRIVATE stamp. Use it only as a short didactic label.
8. **Time-stamp clock** for the scheduled job: hands run through the day, the machine thumps on "every day", a new day enters the reel; a "RECORD OF THE DAY" card fills with what was created; at "end of the day" the hand reaches the moon and a cobalt **ARCHIVED · END OF DAY** stamp lands; YESTERDAY enters the reel with a cobalt tick.
9. **The bad day returns**: the ALTERED card slides back, the struck TODAY frame enters the reel, camera 30 % desaturated, music filtered.
10. **Rewind**: a 0.47 s silence, then the camera switches to a scratched monochrome **microfilm** variant, the reel runs backwards with motion blur and stops on YESTERDAY; the reader window pulses.
11. **Restored**: colour returns, a "RECORD · YESTERDAY" card with the rule as its title and a short typed caveat (what restoring does and does not do), then the cobalt **RESTORED** stamp.

## Frame and layout

Canvas 1080×1920, 30 fps. Organic safe zones.

```
y 0–270      archive ceiling: three linear lamps with soft cones at half power, tops of rolling shelves (luma < 120, no text)
y 300–1012   PASSE-PARTOUT: graphite board #15181b (x 70–1010), 6 px cream bevel #d8cfbd around the window 872×648 (x 104–976, y 322–970)
y 978–1004   typed label on the board: "CURATOR · Name · Brand" (true and discreet, 26 px)
y 1030–1225  READING TABLE (x 70–950): record cards, drawer, entry, protocol, clock + day record, restored card
y 1236–1412  READING STRIP (caption): continuous copier paper with tractor holes
y 1432–1552  MICROFILM REEL (x 60–950): dark frames with a light mini page and the day written out; reader window in cobalt at x 552–696; padlock label on the right
y > 1570     a bank of steel drawers at 38 % opacity (atmosphere, no text); right edge (x > 960, y 1000–1700) atmosphere only
```

Nothing ever sits on the passe-partout window: the face is always free. Camera movements: cut zoom 1.0/1.05 on pause cuts, slow push-in on the thesis and the scheduled job, dry punch-ins (1.05–1.06) on the pejorative word, the thesis and the rollback verb. The reel hides while the drawer is open (an empty cobalt window read as unfinished) and comes back with the microfilming.

## Palette and typography

| Role | Hex |
|---|---|
| Room / wall and shelves | `#090b0d` / `#111418` |
| Steel / borders | `#171b1f` / `#262c32` |
| Secondary text / text | `#8b9299` / `#eef0f2` |
| Card paper (under the reader light) / ink / typing | `#e7e1d2` / `#16181b` / `#3d4247` |
| Single accent: protocol-ink cobalt | `#2f5bff`; active word block `#2343d6` |
| Reader light (light, not accent) | cold white `#dfe8f0` |

Corruption has no colour: graphite scribble, tear, desaturated image. Fonts (OFL, google/fonts, not in the kit: ship each `OFL.txt`): **Archivo** variable (width 62–125, weight 100–900): ExtraCondensed 900 for titles and stamps, Condensed ExtraBold for captions, SemiCondensed Medium for labels; **Courier Prime** Regular/Bold for typed fields and file names. Icons: Lucide (`lock`, `moon`, `rotate-ccw`, `check`, `clock`, `message-circle`).

## Caption system

"Reading strip": continuous copier paper (`#e3e5e1 → #d6d9d4`, faint grain, drop shadow) at x 70, y 1236, 880 × 176, with tractor-hole margins on both sides (36 px, dashed tear line). Text printed in **Archivo Condensed ExtraBold 68 px** uppercase, ink `#15171a`, line-height 1.14, up to 2 lines, groups of up to 4 words / 24 characters, `text-wrap: balance` (an orphan word on the second line was the first defect found).

- Active word: **pure white on a saturated cobalt block `#2343d6`**, radius 5, padding `3px 10px 0` (≈ 7.9:1).
- File and folder names keep their real form: Courier Prime Bold, lower case, 0.86 em.

```css
#capstrip{position:absolute;left:70px;top:1236px;width:880px;height:176px;z-index:8;border-radius:2px;
  background:linear-gradient(180deg,#e3e5e1,#d6d9d4);box-shadow:0 12px 26px rgba(0,0,0,.55)}
.trac{position:absolute;top:0;width:36px;height:176px;border-right:1px dashed #a9ada7;
  background:radial-gradient(circle at 18px 50%,#0b0d10 0 7px,rgba(0,0,0,0) 8px) 0 4px/36px 29px repeat-y}
.capw{position:absolute;left:110px;top:1240px;width:800px;height:168px;z-index:9;display:flex;align-items:center;justify-content:center}
.cap{width:790px;text-align:center;font-family:ARC;font-stretch:75%;font-weight:800;font-size:68px;line-height:1.14;
  text-transform:uppercase;color:#15171a;text-wrap:balance}
.cap .w{display:inline-block;padding:3px 10px 0;margin:0 1px;border-radius:5px}   /* active: #2343d6, color #fff */
.cap .w.cf{font-family:CPB;text-transform:none;font-size:.86em;padding-top:8px}
```

## Scene grammar

Generic example: a speaker explaining that a website's content folder (pages, images, settings) changes every day, so it should be kept in a private versioned repository with a nightly scheduled job that saves it, and that when a bad edit breaks the site you restore last night's version.

| Beat | Table | What happens |
|---|---|---|
| Hook | RECORD · TODAY | Card already assembled; struck TODAY frame in the reader; typed "+" annotations as the changes are named. |
| Pejorative word | ALTERED | Scribble, crossed headline, black stamp, torn edge, camera desaturates; punch 1.05 + shake. |
| What changes | Drawer | Drawer slides up and opens; one tab per spoken component; cobalt "altered" notes; drawer shuts on "where is it saved". |
| "I versioned it" | Microfilming | Flash; the drawer shrinks into the reel's first frame; padlock "private" label on the reel. |
| Why | Archive entry | Typed definition of the verb; the reel gains frames on each "it grows" word; slow push-in. |
| Thesis | Plate | 0.26 s silence + riser → literal thesis plate, verb in cobalt; stamp + trailer hit; music back on its rising stretch. |
| Caveat | Protocol | RESTRICTED ACCESS card (what stays private, what stays out); PRIVATE stamp. |
| Scheduled job | Time-stamp clock | Hands run; thump on "every day"; definition of the scheduled job; a day enters the reel. |
| The day | Day record | "RECORD OF THE DAY" fills; ARCHIVED · END OF DAY stamp; YESTERDAY enters the reel. |
| The bad day | ALTERED again | The hook card returns; struck TODAY frame enters the reel; music filtered. |
| Rule | Rewind | 0.47 s silence → monochrome microfilm camera, reel runs back and stops on YESTERDAY; reverse impact. |
| Payoff | RESTORED | Colour back; rule card with a typed caveat; cobalt RESTORED stamp + trailer hit. |
| CTA (≥ 4.4 s) | CONSULTATION SLIP | A paper slip rises: question, "Tell us in the comments", logo + handle, a steel Follow button that sinks and turns into "Following" in cobalt. |

Rules: no digits for dates or hours (days written out, clock without numerals, no commit hashes); opinions ("it keeps getting better") stay in the speech, without on-screen emphasis; private/secrets labels are didactic and never attributed to the speaker if said outside the cut; product names only as text when spoken, no logos.

## Transitions and motion vocabulary

- **Card slide**: cards enter and leave the table from below (0.32 s `power3.out`), never across the camera.
- **Drawer**: slides up 160 px and "opens" by revealing the tabs (`clip-path` from the top); tabs rise 26 px with a 0.06 s stagger; the drawer shuts with a 6 px bounce.
- **Stamps**: `scale 1.9 → 1` in 0.11 s with a small rotation (−6° to −10°), ink texture via an SVG `feTurbulence` + `feDisplacementMap` filter (`filter:url(#ink)`, a handful of elements only).
- **Microfilming**: a 0.12 s cold-white flash, the object gets a 10 px white border and scales down to the frame size in place (0.4 s `expo.inOut`).
- **Reel**: frames are flex items in `#reel`; advancing is `x −144` per frame (0.35 s `power2.out`); rewinding is a long `x` tween (0.9 s `power3.inOut`) with `filter: blur(3px)` on the reel only, then a 0.12 s settle.
- **Typing**: `clip-path: inset(0 100% 0 0) → inset(0)` with `steps(n)`, quick enough that a card never looks incomplete.

## Sound design

| Action | Category | gain_db | length |
|---|---|---|---|
| Frame 0 | `bass_impact` + `stamp` | −13 / −22 | 0.6 / 0.3 |
| Typed annotations, entries | `typewriter` | −30 to −27 | 0.4–0.7 |
| Scribble / tear | `paper_rip` (synth) | −23 to −20 | 0.45 |
| Pejorative word / gaps | `sub_drop` | −17 | 0.8 |
| Drawer opens / shuts | `drawer_slide`, `drawer_shut` (synth) | −21 to −17 / −15 | 0.6 / 0.4 |
| Cards, tabs | `page_turn` | −24 to −22 | 0.35 |
| Pencil note | `pen_write` | −25 | 0.5 |
| Microfilming / archive | `camera_shutter` | −20 to −17 | 0.4–0.5 |
| Reel advances | `film_advance` (synth) | −24 to −19 | 0.3 |
| Padlock | `key_turn` | −24 | 0.4 |
| Stamps (ALTERED, PRIVATE, ARCHIVED, RESTORED) | `stamp` | −22 to −12 | 0.3 |
| Build-up / thesis and payoff | `riser`, `trailer_hit` | −21 / −14 | 0.45 / 1.2–1.4 |
| Clock | `clock_tick`, `time_stamp` (synth) | −27 / −19 to −15 | 0.5 / 0.6 |
| Rewind | `reel_rewind` (synth) + `reverse_impact` | −14 / −18 | 1.0 / 0.6 |
| CTA | `whoosh`, `pop`, `mouse_click`, `success_chime` | −22 / −22 / −15 / −17 | 0.2–1.0 |

Synthesised (numpy, deterministic): **drawer_slide** = low-passed rumble modulated like ball bearings, accelerating then stopping, plus a metallic clank (410/1230 Hz); **drawer_shut** = a 70 Hz thump + a metal ring (620/1490/2310 Hz) + a short noise hit; **film_advance** = three perforation clicks + a short hiss; **reel_rewind** = a motor rising in pitch with fast perforation clicks that brake at the end; **time_stamp** = a two-blow "ka-chunk" (95 Hz + noise) and a short bell (1760/2640 Hz); **paper_rip** = band-passed noise gated at ~23 Hz with a fast decay.

**Music:** `music:167` (Brainiac, mechanical investigation electronic: the archive's machinery) — reference. RMS is flat at about −14 dB with two rising stretches (17–24 s and 66–79 s of the file). `full −2 dB` from src 0 for the hook; `lowpass −4.5 dB` from src 2 under the explanation; a short **silence** before the thesis; `full −4 dB` from src 17 (first rise) for the thesis and the scheduled job; `lowpass −6 dB` for the bad-day line; **silence** before the rollback verb; `full −2 dB` from src 66 (second rise) for the rule and the CTA, 1 s fade, `cta_boost_db` 5. About twenty 5 dB dips on weak-voice windows (see Implementation notes). Alternatives: `music:871` (dark suspense, the original choice, changed only to avoid repeating a track inside the batch), `music:597` (stealthy investigation).

```json
[{"start":0,"end":"DRAWER-0.1","mode":"full","gain_db":-2,"track":"A","src":0.0,"fade_in":0.02,"fade_out":0.25},
 {"start":"DRAWER-0.1","end":"THESIS-0.32","mode":"lowpass","gain_db":-4.5,"track":"A","src":2.0,"fade_in":0.3,"fade_out":0.06},
 {"start":"THESIS-0.06","end":"BADDAY","mode":"full","gain_db":-4,"track":"A","src":17.0,"fade_in":0.02,"fade_out":0.15},
 {"start":"BADDAY","end":"ROLLBACK-0.53","mode":"lowpass","gain_db":-6,"track":"A","src":"t+(17-THESIS+0.06)","fade_in":0.1,"fade_out":0.06},
 {"start":"ROLLBACK-0.06","end":"DURATION","mode":"full","gain_db":-2,"track":"A","src":66.0,"fade_in":0.02,"fade_out":1.0},
 {"start":3.1,"end":3.7,"mode":"silence","gain_db":-7,"dip":true}]
```

## CTA design inside the style

A "CONSULTATION SLIP" in paper rises over the table: the thematic question ("Do you version your <thing>?"), "Tell us in the comments", the brand logo placed directly on the paper (a black box behind it looked rough), the handle, and a steel Follow button that sinks when pressed and turns into "Following" in cobalt with a cobalt stamp. Button words exactly as in `brand.json`; upper case only through CSS. Enter 0.8 s after the last word; ≥ 4.4 s (keep the whole Reel ≤ 70 s).

## Implementation notes

- Two camera variants:
  ```python
  GRADE_VF = "eq=contrast=1.08:saturation=0.84:brightness=-0.01,colorbalance=bs=0.03:bm=0.012:rh=0.01"
  MONO_VF = "format=gray,eq=contrast=1.28:brightness=-0.02,colorchannelmixer=.92:0:0:0:0:.96:0:0:0:0:1.04:0,format=yuv420p"
  rk.styled_camera(work, "grade", GRADE_VF); rk.styled_camera(work, "mono", MONO_VF)
  ```
  Crossfade to `mono` with a scratches overlay (`repeating-linear-gradient` of thin vertical lines moving in `x`) during the rewind; add a cold radial light from the top and a stronger vignette when the speaker's room is domestic.
- Music dips without breaking `src`: append `{"mode":"silence","gain_db":<host gain − 5>,"dip":true}` sections **after** the section that plays there; the mixer skips decoding for `silence` but applies its `gain_db` (absolute, so subtract from the host section's gain) over that window. Measure the weak-voice windows (400 ms windows closest to the bed) before placing them.
- Keep layout constants out of `plan["keys"]` (put them in a nested dict such as `K.cfg`): numeric layout values among the timeline keys fail `test_key_moments_in_speech_order`.
- Plan the speech for ≤ 66 s before cutting: `heditor test` fails Reels over 70 s and the CTA needs at least 4 s.

## Pitfalls found in production

- **Stamps over titles**: an ALTERED stamp sat on the headline and RESTORED touched the rule; shrink the titles (84 → 72 px) and the stamps, and confirm the clearance on native crops.
- **A "flying" frame** for the microfilming looked like a placeholder and crossed the caption: shrink the drawer itself in place.
- **Film frames as generic tiles**: draw them as dark frames with a light mini page and the day written out.
- **Lamps read as HUD bars**: give them light cones.
- **An empty bottom band** made vision invent placeholder labels: a bank of steel drawers at 38 %, no text.
- **White captions on a dark plate** looked like the batch's previous control-room style: printed paper with dark text and a cobalt active word separated it.
- **A key resolved to the wrong occurrence** after a passage was removed (`rk.finder(token, after=…)` returns the first match after `after`): re-validate keys after every new prepare.
- **Intentional holds** (CTA built in steps, a still speaker) trigger the freeze detector; inspect before failing.

## Variations

- **Photo lab contact sheets**: negatives on a light table, the good frame circled with a grease pencil; for "pick the right version" talks.
- **Library card catalogue**: drawers of index cards and a due-date stamp; slower, for documentation and knowledge-base talks.
- **Bank safe-deposit boxes**: dated boxes and a key ritual; for security-of-backups talks (keep it away from heist imagery).
- **Paid-ad version**: the consultation slip carries a "Learn more" button (Paid-ad variant).
