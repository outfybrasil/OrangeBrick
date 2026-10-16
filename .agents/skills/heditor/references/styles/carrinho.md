---
style: carrinho
name: Carrinho (forgotten cart, shopping app)
family: fixed-style
best_for: remarketing ads with a "Learn more" CTA for people who visited a page and did not sign up ("you looked at the page and did not finish?", "there is still time", "you still take…", bonuses, limited time); the offer becomes a shopping app with an abandoned cart, gifts and a checkout
reference: produced by the PycodeBR team with heditor, Oct 2026
---
# Carrinho (forgotten cart, shopping app)

The Reel is a shopping app speaking to someone who left items in the cart. At frame 0 a push notification already says "you forgot something in your cart"; the speaker's opening question becomes status pills ("PAGE VISITED", "SIGN-UP PENDING"); "there is still time" flips the notification to an hourglass card. Then every item the speaker lists drops into "YOUR CART" with a check and a real proof window beside it; the bonuses arrive as three wrapped gifts that open one by one; "limited time" becomes a round gold seal with an hourglass whose sand falls (no number); the spoken CTA is the checkout, with a big white "LEARN MORE ›" button and a "FINISH SIGN-UP" summary. The speaker is a presenter cutout over a dark aubergine background with a coral glow. The core metaphor: **you left this in your cart, and it is still waiting for you**.

## When to use / when not to

Use it when the speech:
- addresses someone who saw the offer and did not act (remarketing);
- lists what is included (classes, templates, materials, source code…), ideally with bonuses;
- has a spoken time limit and a checkout-like call ("finish your sign-up").

Avoid it when:
- the audience has never seen the offer (cold traffic: the forgotten-cart premise makes no sense);
- the speech has no list (the cart stays empty);
- the topic is not commercial;
- the batch already has a delivery/tracking world (`entrega`) or a sticker album (`album`) — siblings in the same remarketing family.

## Signature moves

1. **Push notification at frame 0** with a cart icon, the brand and "now", text "You forgot something in your cart", entering with a spring. No SFX on the very first word.
2. **The question as status**: "PAGE VISITED" (eye icon) and "SIGN-UP PENDING" (pulsing coral dot) pop on the spoken words; a coral frame lights at the end of the question.
3. **Notification flip**: "THERE IS STILL TIME" with a gold hourglass, a little swing on the spoken interjection.
4. **Items fall into the cart**: "YOUR CART" card enters from the left; each spoken item drops in with a spring and a check, while a real proof window swaps beside it (class list, files explorer, a document, a materials page, code).
5. **Product spotlight**: a proof window of the main product (menu sharp, data panel frosted) with yellow chips repeating its spoken description.
6. **Three gifts**: wrapped boxes drawn in CSS fall at the top on "three exclusive bonuses"; each lid pops on its spoken name, revealing a card with the bonus title and a chip with its spoken qualifier.
7. **Limited-time seal**: the gifts regroup, a round gold seal with an hourglass stamps on "time"; sand keeps falling; music goes low-pass and a soft tick runs.
8. **Checkout**: brand, big white "LEARN MORE ›" tapped on "learn", a "FINISH SIGN-UP" summary card with ticked items and the gifts; "SIGN-UP" gets its check on the spoken word.

## Frame and layout

Canvas 1080×1920, 30 fps, Paid-ad variant (`../captions-and-layout.md`).

```
y 0–270     background only (aubergine, dot grid, faint outline shop icons at 6 %)
y 290–470   notification / windows / gifts
y 470–1030  cart card (x 40–470) or gift card (x 490–1040) beside the speaker
y 1046–1150 caption tag
y > 1152    body fading out and background
```

Speaker cutout states (scale on the 1080×1920 source, origin top-left; the face box is listed so graphics can avoid it):

| State | Scale | Face box (x, y) | Used for |
|---|---|---|---|
| `hero` | 0.74 | 294–771, 560–1039 | hook |
| `right` | 0.66 | 584–1010, 600–1027 | cart on the left |
| `left` | 0.60 | 70–457, 640–1029 | gifts on the right |
| `centre` | 0.64 | 328–741, 610–1024 | limited time |
| `cta` | 0.50 | 635–957, 700–1023 | checkout |

The speaker sits *above* the windows in the stack, so nothing ever covers the face; a coral glow (radial `rgba(255,106,77,.35)`) behind the cutout separates it from the background.

## Palette and typography

| Role | Hex |
|---|---|
| Background | aubergine `#2a1030` → `#12070f` |
| Action / cart | coral `#ff6a4d` |
| Gifts / seal | gold `#ffc94d` |
| Cards | cream `#fff4ea` |
| Check / "24 h" style live state | mint `#3ddc97` |
| Text on cards | `#1d0d18` |
| Active word | black on `#ffd84d` |

Fonts (OFL, in the kit): **Anton** (titles, captions), **Geist** (app UI), **JetBrains Mono** (window title bars). Icons: Lucide (`shopping-cart`, `eye`, `hourglass`, `gift`, `check`, `book-open`, `file-text`, `code`, `package`, `pointer`, `chevron-down`, `bell`). Third-party logos (frameworks, tools) only with a licence and the owner's permission; otherwise a typographic label.

## Caption system

"App tag": dark box `#1d0d18`, 3 px coral border, radius 14, padding `6px 20px 2px`, Anton uppercase white, one line, ≤ 800 px; font size `min(80, 740 / (0.47 · characters))` px.

- Grouping: ≤ 3 words.
- Active word: **black on `#ffd84d`** (≈ 13:1), radius 8, `padding:.2em .08em 0; line-height:1` so the highlight hugs Anton's cap height.

```css
.capwrap{left:0;top:1046px;width:1080px;height:106px;z-index:40;display:flex;align-items:center;justify-content:center}
.cap{display:inline-block;max-width:800px;background:#1d0d18;border:3px solid #ff6a4d;border-radius:14px;padding:6px 20px 2px;
  font-family:Anton;font-size:var(--fs,80px);line-height:1.12;color:#fff;text-transform:uppercase;white-space:nowrap}
.cap .w{display:inline-block;border-radius:8px;padding:.2em .08em 0;margin:0 .02em;line-height:1}
```

## Scene grammar

Generic example: a speaker addressing people who visited a course page without signing up, listing what is included and three bonuses available for a limited time.

| Beat | Scene | Speaker | What happens |
|---|---|---|---|
| Hook question | Notification | `hero` | Push on frame 0; "PAGE VISITED", "SIGN-UP PENDING" pills; coral frame at the end of the question; jump 1.03. |
| Still time | Flip | `hero` | Notification becomes "THERE IS STILL TIME" + hourglass; swipe in the gap; light stamp. |
| You still take | Cart | `right` | "YOUR CART" enters (0.5 s `expo.inOut`). |
| Items | Cart + proofs | `right` | Each item drops with a check; proof window swaps per item. |
| Main product | Spotlight | `right` | Product window with frosted data; yellow chips with its spoken description. |
| Bonuses | Gifts | `left` | Music silence 0.22 s, transition in the gap; three gifts fall; "+ THREE EXCLUSIVE BONUSES". |
| Bonus 1–3 | Gift opens | `left` | Lid pops on each name; bonus card + chips (spoken qualifiers only). |
| Limited time | Seal | `centre` | Gifts regroup; gold hourglass seal stamps on "time"; low-pass music + soft tick; punch 1.04 on "look". |
| Spoken CTA | Checkout | `cta` | Brand, white "LEARN MORE ›" tapped on "learn", summary card; "SIGN-UP" ✓; "CLASSES" lights on "see you in class". |
| End card (4 s) | Card | out | Brand, button, chevrons, "TAP LEARN MORE", taps. |

Rules: only spoken items, bonuses and qualifiers (a word from the script that was not said, such as "lifetime", never reaches the screen); no prices, counters or numbers not spoken; proofs cropped without OS bars, durations covered, values frosted.

## Transitions and motion vocabulary

- **Notification spring**: from `y −160, scale .9` to rest with `elastic.out(1, .6)` 0.6 s.
- **Item drop**: from the top of the cart card, `y −120 → 0` 0.35 s `back.out(1.8)`, check pops 0.1 s later; the cart icon nudges.
- **Gift open**: lid `y −60, rotation −18` 0.25 s `back.out(2)`, a gold sparkle burst (seeded particles), card rises from the box.
- **Seal stamp**: `scale 1.7 → 1`, rotation −12 → −6, 0.18 s; sand = a small clip-path animation looping 1.2 s.
- **Speaker moves**: cutout `x/scale` 0.5 s `expo.inOut`; windows leave first, enter after.

## Sound design

| Action | Category | gain_db | length |
|---|---|---|---|
| Notification (not on the first word) | `phone_notification` | −22 | 0.4 |
| Pills / items / chips | `pop` (vary) | −28 to −27 | 0.15 |
| Gaps / scene moves | `swipe`, `whoosh` | −27 to −19 / −25 to −20 | 0.35 |
| Items alternating | `click`, `data_beep` | −28 / −29 | 0.15 |
| Bonuses arrive | `magic_transition` (gap) | −19 | 0.6 |
| Gift lids | `magic_sparkle`, `success_chime` | −33 to −28 (or none) | 0.3 |
| Limited time | `clock_tick` + `stamp` | −30 to −28 / −24 | 0.6 / 0.3 |
| Emphasis | `reverse_impact` | −24 | 0.5 |
| Button | `mouse_click` | −27 to −18 | 0.2 |
| End | `success` + `success_chime` | −29 / −16 | 0.6 / 0.8 |

**Masking lesson**: a soft word spoken ~5 dB lower than the rest was misheard by ASR under a gift-opening sparkle (−26 dB, starting 80 ms before the word). Fix: no SFX on that gift, gift sounds at −33 dB and 0.3 s, and a −6 dB music dip on that phrase. Check gift sounds with a medium-model window.

**Music:** `music:282` (Sweet September, light lo-fi hip hop, "shop" mood) — reference. Full from frame 0 (from 12 s of the file), 0.22 s silence before the bonuses, `lowpass` on the limited-time line, full again at the checkout (re-entry from ~75 s of the file), 1 s fade. Alternatives: `music:623` (tech house) for a sleeker store, `music:82` (quirky groove) for a playful brand.

```json
[{"start":0,"end":"BONUS-0.22","mode":"full","track":"A","src":12.0,"fade_in":0.01,"fade_out":0.05},
 {"start":"BONUS","end":"WEAK","mode":"full","track":"A","src":"t+12","fade_in":0.04,"fade_out":0.12},
 {"start":"WEAK","end":"WEAK_END","mode":"full","track":"A","src":"t+12","gain_db":-6,"fade_in":0.12,"fade_out":0.15},
 {"start":"WEAK_END","end":"LIMITED","mode":"full","track":"A","src":"t+12","fade_in":0.15,"fade_out":0.06},
 {"start":"LIMITED","end":"CHECKOUT","mode":"lowpass","track":"A","src":"t+12","fade_in":0.05,"fade_out":0.05},
 {"start":"CHECKOUT","end":"DURATION","mode":"full","track":"A","src":75.0,"fade_in":0.05,"fade_out":1.0}]
```

## CTA design inside the style

Checkout: brand + product, big white "LEARN MORE ›" pressed on "learn", the summary card "FINISH SIGN-UP" with ticked items and the three gifts, then the end card (brand, button, chevrons, "TAP LEARN MORE", taps) for 4 s.

## Implementation notes

- Gifts are pure CSS: box (gold gradient), ribbon (two crossing bars), bow (two rotated rounded squares), lid as a separate element for the pop.
- Proof windows: one component with a mono title bar and three traffic-light dots, content = cropped still or a short muted clip.
- Pauses: end each sentence ~0.12 s inside the silence so pauses between sentences are 0.25–0.29 s instead of ~0.13 s; protect voiced tails (a word's tail at −50 to −59 dB was being trimmed by the automatic shortening).
- If only the audio changes and `index.html` is identical, reuse `render.mp4` and re-run `finalize`.

## Pitfalls found in production

- **ASR masking under gift sounds** (above): the most important lesson of this style.
- **Script words not spoken** ("lifetime", a different bonus topic): the screen follows the recording.
- **Matte**: the matte alone kept the chair back; a semantic gate on the whole frame made a black T-shirt semi-transparent. Gate only the chair zone.
- **UI SFX very discreet** (p95 −45 dB under the voice): if the client wants more presence, raise gap SFX 3–4 dB, never the ones over words.

## Variations

- **Wishlist**: items move from a wishlist to the cart as the speaker convinces; for longer considered purchases.
- **Grocery run**: a supermarket receipt prints the items (no prices, only names); for bundles.
- **Subscription box**: the cart becomes a monthly box; for memberships.
- **Organic version**: the checkout becomes "what would you put in your cart?" with a Follow card.
