"""Style `circuito`: the explanation is a circuit board. Runs as-is; make it yours with beats.json.

The speaker is the chip at the top of a printed circuit board. Every concept becomes a component that is soldered
on its word (outline and icon drawn with DrawSVG, silkscreen label decoded), every relation is a copper trace drawn
on its verb, data travels as glowing pulses along the traces (MotionPath), an idea that changes nature morphs its
icon (MorphSVG on single-path Lucide icons), boundaries are drawn as board zones, status LEDs light green or red
with a decoded flag, and the strongest line lands as a silkscreen title (SplitText). The CTA is a push button.

    heditor new <work> <video> --style circuito
    # prepare, words, then write <work>/beats.json (format below)
    heditor produce <work> music:167 3

beats.json: a list of steps in speech order, each with "word" (+ optional "after") and "do":
  {"do": "zone",  "id": "local", "label": "SUA MÁQUINA", "cols": [0, 1], "tone": "ok"|"alert"|"neutral"}
  {"do": "node",  "id": "tool", "label": "FERRAMENTA", "icon": "terminal", "slot": [col 0-3, row 0-1]}
  {"do": "trace", "id": "net", "from": "tool"|"cam", "to": "model", "label": "INTERNET"}
  {"do": "pulse", "trace": "net", "n": 3, "tone": "ok"|"alert", "reverse": false}
  {"do": "morph", "node": "llm", "icon": "laptop"}
  {"do": "led",   "node": "tool", "tone": "ok"|"alert", "flag": "SÓ A FERRAMENTA"}
  {"do": "title", "text": "O RESTO TÁ NA INTERNET"}
Icons are Lucide names (rk.ensure_icons downloads them). Labels and titles must be spoken words (short).
Without beats.json the build turns the longest words into components chained by traces (a runnable baseline,
never a delivery). Recipe: references/styles/circuito.md.
"""
import html
import json
import os
import sys
from pathlib import Path

sys.path.insert(0, os.environ.get("HEDITOR_KIT", str(Path.home() / ".heditor/kit")))
import reelkit as rk  # noqa: E402
import svgkit as sk  # noqa: E402

WORK = Path(__file__).resolve().parent
CTA = 5.0
HOOK = ""            # silkscreen title for the hook (spoken words); empty = first caption
QUESTION = ""
SEED = 20261020
COLS = [165, 405, 675, 915]
ROWS = [925, 1115]
NODE_W, NODE_H = 216, 140
CHIP = {"x": 300, "y": 410, "w": 480, "h": 357}      # the speaker's chip (rig state "chip", scale 0.5)
CAPTION_TOP = 1262
TONES = {"ok": "#7dffb0", "alert": "#ff5c6c", "neutral": "#9fd2ee"}
COPPER = "#d9a441"


def load():
    words_file = WORK / "words-reviewed.json" if (WORK / "words-reviewed.json").exists() else WORK / "words.json"
    words = rk.load_words(words_file)
    edl = json.loads((WORK / "edl.json").read_text())
    return words, round(edl["voice_duration"], 3)


def auto_beats(words, voice_end):
    content = [w for w in words if len(rk.plain(w["word"])) >= 6 and 2.0 < w["start"] < voice_end - 1.5]
    picks = []
    for w in sorted(content, key=lambda x: -len(rk.plain(x["word"]))):
        if all(abs(w["start"] - p["start"]) > 2.5 for p in picks):
            picks.append(w)
        if len(picks) == 6:
            break
    picks.sort(key=lambda x: x["start"])
    icons = ["cpu", "server", "database", "globe", "file-text", "cloud"]
    beats, prev = [], "cam"
    for i, p in enumerate(picks):
        nid = f"n{i}"
        beats.append({"word": p["word"], "after": round(p["start"] - 0.05, 2), "do": "node", "id": nid,
                      "label": p["shown"].strip(".,?!:;").upper()[:12], "icon": icons[i % len(icons)],
                      "slot": [i % 4, (i // 4) % 2]})
        beats.append({"word": p["word"], "after": round(p["start"] - 0.05, 2), "do": "trace", "id": f"t{i}",
                      "from": prev, "to": nid, "delay": 0.35})
        prev = nid
    return beats


def resolve(words, voice_end):
    path = WORK / "beats.json"
    beats = json.loads(path.read_text()) if path.exists() else auto_beats(words, voice_end)
    f = rk.finder(words)
    last = -1.0
    for b in beats:
        b["t"] = round(f(rk.plain(b["word"]), b.get("after", 0.0)) - 0.04 + b.get("delay", 0.0), 3)
        assert b["t"] < voice_end, f"step after the speech: {b}"
        assert b["t"] >= last - 1e-6, f"steps out of speech order: {b}"
        last = b["t"]
    return beats


# ---------------------------------------------------------------- geometry

def node_xy(slot):
    return COLS[slot[0]], ROWS[slot[1]]


def pin(src, dst_xy, nodes):
    """Point on the edge of component `src` facing dst ("cam" = the bottom of the speaker's chip)."""
    if src == "cam":
        return (min(max(dst_xy[0], CHIP["x"] + 40), CHIP["x"] + CHIP["w"] - 40), CHIP["y"] + CHIP["h"] + 16)
    x, y = node_xy(nodes[src]["slot"])
    dx, dy = dst_xy[0] - x, dst_xy[1] - y
    if abs(dy) < 40:
        return (x + (NODE_W / 2 + 6) * (1 if dx > 0 else -1), y)
    return (x, y + (NODE_H / 2 + 6) * (1 if dy > 0 else -1))


def route(a, b):
    """Orthogonal copper route a → b (horizontal when level, else vertical-horizontal-vertical) with 45° corners."""
    (x1, y1), (x2, y2) = a, b
    if abs(y1 - y2) < 2:
        return f"M{x1:.0f} {y1:.0f}H{x2:.0f}"
    if abs(x1 - x2) < 2:
        return f"M{x1:.0f} {y1:.0f}V{y2:.0f}"
    ym = (y1 + y2) / 2
    c = min(18, abs(x2 - x1) / 2, abs(ym - y1))
    sx, sy = (1 if x2 > x1 else -1), (1 if y2 > y1 else -1)
    return (f"M{x1:.0f} {y1:.0f}V{ym - sy * c:.0f}L{x1 + sx * c:.0f} {ym:.0f}H{x2 - sx * c:.0f}"
            f"L{x2:.0f} {ym + sy * c:.0f}V{y2:.0f}")


def rect_path(x, y, w, h, r):
    return (f"M{x + r} {y}H{x + w - r}A{r} {r} 0 0 1 {x + w} {y + r}V{y + h - r}A{r} {r} 0 0 1 {x + w - r} {y + h}"
            f"H{x + r}A{r} {r} 0 0 1 {x} {y + h - r}V{y + r}A{r} {r} 0 0 1 {x + r} {y}Z")


def icon_d(name):
    rk.ensure_icons([name])
    return sk.single_path((rk.ICON_SRC / f"{name}.svg").read_text())


# ---------------------------------------------------------------- board markup + timeline

def board(beats, brand):
    nodes = {b["id"]: b for b in beats if b["do"] == "node"}
    svg, js, sfx = [], [], []
    # decorative background traces (seeded, dim), fixed in place: the board exists before the speech uses it
    import random
    rng = random.Random(SEED)
    deco = []
    for _ in range(26):
        x, y = rng.randrange(40, 1040, 20), rng.randrange(820, 1220, 20)
        dx = rng.choice([-1, 1]) * rng.randrange(60, 260, 20)
        deco.append(f'<path d="M{x} {y}h{dx}l{14 * (1 if dx > 0 else -1)} 14v{rng.randrange(20, 90, 10)}"/>')
        deco.append(f'<circle cx="{x}" cy="{y}" r="6"/>')
    for _ in range(14):     # traces running off the board edges and under the chip: the board continues
        x = rng.randrange(60, 1020, 20)
        deco.append(f'<path d="M{x} {rng.randrange(1500, 1700, 20)}v{rng.randrange(-120, -40, 20)}h{rng.choice([-1, 1]) * 40}"/>')
    svg.append(f'<g id="deco" fill="none" stroke="#164a37" stroke-width="5" stroke-linecap="round">{"".join(deco)}</g>')
    # chip socket around the speaker's chip state
    pins = []
    for i in range(7):
        y = CHIP["y"] + 34 + i * (CHIP["h"] - 68) / 6
        pins.append(f'<rect x="{CHIP["x"] - 26}" y="{y - 5:.0f}" width="22" height="10" rx="2"/>')
        pins.append(f'<rect x="{CHIP["x"] + CHIP["w"] + 4}" y="{y - 5:.0f}" width="22" height="10" rx="2"/>')
    for i in range(9):
        x = CHIP["x"] + 40 + i * (CHIP["w"] - 80) / 8
        pins.append(f'<rect x="{x - 5:.0f}" y="{CHIP["y"] + CHIP["h"] + 4}" width="10" height="20" rx="2"/>')
    svg.append(f'<g id="socket" fill="#c9a14a" opacity="0">{"".join(pins)}'
               f'<text x="{CHIP["x"] - 4}" y="{CHIP["y"] - 14}" class="silk sm">U1</text>'
               f'<text x="{CHIP["x"] + CHIP["w"]}" y="{CHIP["y"] - 14}" class="silk sm" text-anchor="end">'
               f'{html.escape(brand["handle"].upper())}</text></g>')
    layers = {"zones": [], "traces": [], "nodes": [], "pulses": [], "flags": []}
    titles, flags_at = [], {}
    for i, b in enumerate(beats):
        t, kind = b["t"], b["do"]
        if kind == "zone":
            c0, c1 = b["cols"]
            x0, x1 = COLS[c0] - NODE_W / 2 - 24, COLS[c1] + NODE_W / 2 + 24
            y0, y1 = ROWS[0] - NODE_H / 2 - 46, ROWS[1] + NODE_H / 2 + 50   # room for the flags under row 1
            col = TONES[b.get("tone", "neutral")]
            zid = f'z-{b["id"]}'
            layers["zones"].append(
                f'<g id="{zid}"><path class="zo" d="{rect_path(x0, y0, x1 - x0, y1 - y0, 18)}" stroke="{col}" '
                f'fill="{col}" fill-opacity="0"/><text id="{zid}-l" x="{(x0 + 14) if c0 < 2 else (x1 - 14)}" '
                f'y="{y0 - 12}" class="silk zl" text-anchor="{"start" if c0 < 2 else "end"}" '
                f'fill="{col}">{html.escape(b["label"])}</text></g>')
            js.append(f"FT('#{zid} .zo',{{drawSVG:'0% 0%'}},{{drawSVG:'0% 100%',duration:.7,ease:'power2.inOut'}},{t});"
                      f"TO('#{zid} .zo',{{fillOpacity:.06,duration:.4}},{t + .5});"
                      f"FT('#{zid}-l',{{opacity:0}},{{opacity:1,duration:.1}},{t + .1});"
                      f"scramble('#{zid}-l',{json.dumps(b['label'])},{t + .1},.5);")
            sfx.append((t, "swipe", -20, f"zone {b['id']}"))
        elif kind == "node":
            x, y = node_xy(b["slot"])
            nid = f'n-{b["id"]}'
            bx, by = x - NODE_W / 2, y - NODE_H / 2
            pinsn = "".join(f'<rect x="{bx - 12 if s < 0 else bx + NODE_W + 2}" y="{by + 26 + k * 32}" width="10" '
                            f'height="12" rx="2"/>' for s in (-1, 1) for k in range(4))
            layers["nodes"].append(
                f'<g id="{nid}" class="node"><g class="npins" fill="#c9a14a" opacity="0">{pinsn}</g>'
                f'<path class="nb" d="{rect_path(bx, by, NODE_W, NODE_H, 12)}"/>'
                f'<path class="notch" d="M{x - 16} {by}a16 16 0 0 0 32 0"/>'
                f'<path class="nic" d="{icon_d(b["icon"])}" transform="translate({x - 30} {by + 18}) scale(2.5)"/>'
                f'<text id="{nid}-l" x="{x}" y="{by + NODE_H - 20}" class="silk lbl" text-anchor="middle">'
                f'{html.escape(b["label"])}</text>'
                f'<text class="silk ref" x="{bx + 4}" y="{by - 8}">U{len(layers["nodes"]) + 2}</text>'
                f'<circle id="{nid}-led" class="led" cx="{bx + NODE_W - 16}" cy="{by + 16}" r="7"/></g>')
            js.append(f"FT('#{nid} .nb',{{drawSVG:'0% 0%',fillOpacity:0}},{{drawSVG:'0% 100%',duration:.42,ease:'power2.out'}},{t});"
                      f"TO('#{nid} .nb',{{fillOpacity:1,duration:.25}},{t + .3});"
                      f"FT('#{nid} .npins',{{opacity:0}},{{opacity:1,duration:.2}},{t + .25});"
                      f"FT('#{nid} .notch',{{opacity:0}},{{opacity:1,duration:.2}},{t + .25});"
                      f"FT('#{nid} .nic',{{drawSVG:'0% 0%'}},{{drawSVG:'0% 100%',duration:.5,ease:'power1.inOut'}},{t + .12});"
                      f"FT('#{nid} .led',{{opacity:0}},{{opacity:1,duration:.15}},{t + .3});"
                      f"FT('#{nid} .ref',{{opacity:0}},{{opacity:.7,duration:.15}},{t + .3});"
                      f"FT('#{nid}-l',{{opacity:0}},{{opacity:1,duration:.1}},{t + .08});"
                      f"scramble('#{nid}-l',{json.dumps(b['label'])},{t + .08},.4);")
            sfx.append((t, "data_beep", -17, f"node {b['label']}"))
        elif kind == "trace":
            dst = node_xy(nodes[b["to"]]["slot"])
            src_xy = pin(b["from"], dst, nodes) if b["from"] != "cam" else pin("cam", dst, nodes)
            a = src_xy
            bpt = pin(b["to"], a, nodes)
            d = route(a, bpt)
            tid = f't-{b["id"]}'
            lab = ""
            if b.get("label"):
                # the middle of the trace unless a component sits there
                def free(px, py):
                    return all(abs(px - node_xy(n["slot"])[0]) > NODE_W / 2 + 70 or
                               abs(py - node_xy(n["slot"])[1]) > NODE_H / 2 + 30 for n in nodes.values())
                frac = next((f for f in (0.5, 0.38, 0.62, 0.28, 0.72) if
                             free(a[0] + (bpt[0] - a[0]) * f, a[1] + (bpt[1] - a[1]) * f)), 0.5)
                mx, my = a[0] + (bpt[0] - a[0]) * frac, a[1] + (bpt[1] - a[1]) * frac
                lab = (f'<text id="{tid}-l" x="{mx:.0f}" y="{my - 16:.0f}" class="silk sm" text-anchor="middle" '
                       f'fill="{COPPER}">{html.escape(b["label"])}</text>')
            layers["traces"].append(f'<g id="{tid}g"><path id="{tid}" class="tr" d="{d}"/>'
                                    f'<circle class="via" cx="{a[0]:.0f}" cy="{a[1]:.0f}" r="7"/>'
                                    f'<circle class="via" cx="{bpt[0]:.0f}" cy="{bpt[1]:.0f}" r="7"/>{lab}</g>')
            js.append(f"FT('#{tid}',{{drawSVG:'0% 0%'}},{{drawSVG:'0% 100%',duration:.55,ease:'power2.inOut'}},{t});"
                      f"FT('#{tid}g .via',{{opacity:0}},{{opacity:1,duration:.15}},{t});")
            if b.get("label"):
                js.append(f"FT('#{tid}-l',{{opacity:0}},{{opacity:1,duration:.1}},{t + .3});"
                          f"scramble('#{tid}-l',{json.dumps(b['label'])},{t + .3},.45);")
            sfx.append((t, "scan", -21, f"trace {b['id']}"))
        elif kind == "pulse":
            tid = f't-{b["trace"]}'
            col = TONES[b.get("tone", "ok")]
            n, dur = int(b.get("n", 3)), float(b.get("dur", 0.8))
            for k in range(n):
                pid = f'p{i}-{k}'
                layers["pulses"].append(f'<circle id="{pid}" class="pulse" r="13" fill="{col}" '
                                        f'style="filter:drop-shadow(0 0 10px {col})"/>')
                t0 = t + k * 0.22
                st, en = (1, 0) if b.get("reverse") else (0, 1)
                js.append(f"S('#{pid}',{{opacity:1}},{t0:.3f});"
                          f"FT('#{pid}',{{motionPath:{{path:'#{tid}',start:{st},end:{st}}}}},"
                          f"{{motionPath:{{path:'#{tid}',start:{st},end:{en}}},duration:{dur},ease:'power1.inOut'}},{t0:.3f});"
                          f"S('#{pid}',{{opacity:0}},{t0 + dur:.3f});")
            sfx.append((t, "message_sent", -19, f"pulse on {b['trace']}"))
        elif kind == "morph":
            nid = f'n-{b["node"]}'
            js.append(f"TO('#{nid} .nic',{{morphSVG:{{shape:{json.dumps(icon_d(b['icon']))},type:'rotational'}},"
                      f"duration:.55,ease:'power2.inOut'}},{t});")
            sfx.append((t, "magic_transition", -19, f"morph {b['node']}"))
        elif kind == "led":
            nid = f'n-{b["node"]}'
            col = TONES[b.get("tone", "ok")]
            x, y = node_xy(nodes[b["node"]]["slot"])
            fid = f'f{i}'
            if b.get("flag"):
                fy = y + NODE_H / 2 + 8
                layers["flags"].append(f'<g id="{fid}" opacity="0"><rect x="{x - NODE_W / 2}" y="{fy}" width="{NODE_W}" '
                                       f'height="38" rx="7" fill="#04100b" stroke="{col}" stroke-width="2.5"/>'
                                       f'<text id="{fid}-t" x="{x}" y="{fy + 27}" class="silk fl" '
                                       f'text-anchor="middle" fill="{col}">{html.escape(b["flag"])}</text></g>')
                for prev in flags_at.get(b["node"], []):       # one flag per component at a time
                    js.append(f"TO('#{prev}',{{opacity:0,duration:.15}},{t - .15});")
                flags_at.setdefault(b["node"], []).append(fid)
                js.append(f"FT('#{fid}',{{opacity:0,y:8}},{{opacity:1,y:0,duration:.2}},{t});"
                          f"scramble('#{fid}-t',{json.dumps(b['flag'])},{t},.4);")
            js.append(f"S('#{nid}-led',{{fill:'{col}',filter:'drop-shadow(0 0 9px {col})'}},{t});"
                      f"TO('#{nid} .nb',{{stroke:'{col}',duration:.25}},{t});")
            sfx.append((t, "success" if b.get("tone", "ok") == "ok" else "error", -18, f"led {b['node']}"))
        elif kind == "title":
            titles.append((t, b["text"]))
    svg += [f'<g id="L-zones" fill="none" stroke-width="3">{"".join(layers["zones"])}</g>',
            f'<g id="L-traces">{"".join(layers["traces"])}</g>',
            f'<g id="L-pulses">{"".join(layers["pulses"])}</g>',     # under the components: signals go through them
            f'<g id="L-nodes">{"".join(layers["nodes"])}</g>',
            f'<g id="L-flags">{"".join(layers["flags"])}</g>']
    # initial state (frame 0): nothing of the explanation is on the board yet
    init = ("gsap.set('#L-zones .zo,#L-traces .tr,#L-nodes .nb,#L-nodes .nic',{drawSVG:'0% 0%'});"
            "gsap.set('#L-nodes .nb',{fillOpacity:0});"
            "gsap.set('#L-nodes .npins,#L-nodes .notch,#L-nodes .led,#L-nodes .ref,#L-traces .via',{opacity:0});")
    return "".join(svg), init + "".join(js), sfx, titles


def scenes(question, brand):
    return f"""
<div class="cta-q" id="ctaq"><div class="q2">{question}</div><div class="q3">{rk.icon("message-circle")}<span>{brand["comment"]}</span></div></div>
<div id="card"><img src="assets/logo.png" alt="logo"><div class="handle">{brand["handle"]}</div>
  <div id="pbtn"><div id="pcap"><span id="fb-a">{brand["follow"]}</span><span id="fb-b">{rk.icon("check")}{brand["following"]}</span></div><div id="pled"></div></div></div>
<div id="ripple"></div><div id="finger">{rk.icon("pointer")}</div>
"""


CSS = r"""
@font-face{font-family:JB;src:url('assets/JetBrainsMono-VF.ttf');font-weight:100 900;font-display:block}
.glow,#floor-a,#horizon,.speed{display:none}
#bg{background:radial-gradient(ellipse 85% 60% at 50% 48%,#08261c 0%,#051710 55%,#020a07 100%)}
#bgrid{position:absolute;inset:0;opacity:.5;background-image:radial-gradient(circle,#0f3a2b 2px,transparent 2.5px);background-size:40px 40px}
#board{position:absolute;left:0;top:0;width:1080px;height:1920px;overflow:visible}
.silk{font-family:JB;font-weight:700;font-size:25px;letter-spacing:2px;fill:#e6f1ea}
.silk.sm{font-size:22px;letter-spacing:2px}
.silk.lbl{font-size:27px}
.silk.zl{font-size:26px;letter-spacing:4px}
.silk.fl{font-size:21px;font-weight:800;letter-spacing:1px}
.tli{display:block;text-wrap:balance}
.silk.ref{font-size:17px;fill:#8fb7a5;opacity:0}
.node text.lbl,.zo+text,#L-traces text{opacity:0}
#border{border-color:#3b6a57;box-shadow:inset 0 0 0 2px rgba(2,10,7,.6),0 0 24px rgba(125,255,176,.18)}
.cta-q .q2{font-family:JB;font-weight:800;text-transform:uppercase;text-wrap:balance;font-size:72px}
.cta-q .q3{font-family:JB;text-transform:uppercase;letter-spacing:1px}
.nb{fill:#0a110e;stroke:#3b6a57;stroke-width:3}
.notch{fill:none;stroke:#3b6a57;stroke-width:2;opacity:0}
.nic{fill:none;stroke:#e6f1ea;stroke-width:.8;stroke-linecap:round;stroke-linejoin:round}
.led{fill:#14231d;stroke:#2d4a3e;stroke-width:2;opacity:0}
.tr{fill:none;stroke:#d9a441;stroke-width:6;stroke-linecap:round;stroke-linejoin:round;filter:drop-shadow(0 0 6px rgba(217,164,65,.55))}
.via{fill:#0a110e;stroke:#d9a441;stroke-width:4;opacity:0}
.pulse{opacity:0}
#ttl{position:absolute;left:60px;right:60px;top:290px;height:110px;z-index:12;text-align:center;font-family:JB;font-weight:800;
  font-size:50px;letter-spacing:3px;color:#e6f1ea;line-height:1.05;text-shadow:0 0 18px rgba(125,255,176,.25)}
.tl{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;opacity:0}
.tl .ch{display:inline-block}
.caption{top:__CAPTOP__px}
.cap{font-family:JB;font-weight:800;font-size:66px;letter-spacing:1px;-webkit-text-stroke:6px #03100b}
.cap.long{font-size:58px}
#ctascrim{position:absolute;inset:0;z-index:13;background:rgba(2,10,7,.9);opacity:0}
#ctaq,#card{z-index:14}
#card{position:absolute;left:240px;top:760px;width:600px;opacity:0;text-align:center}
#card img{width:170px;height:170px;object-fit:contain}
.handle{font-family:JB;font-weight:700;font-size:44px;margin-top:14px;color:#7dffb0}
#pbtn{position:relative;margin:26px auto 0;width:460px;height:120px;border-radius:22px;background:#1a1f1c;
  box-shadow:0 10px 0 #0b0e0c,inset 0 0 0 3px #3b6a57}
#pcap{position:absolute;inset:10px;border-radius:16px;background:linear-gradient(#2b332e,#171c19);display:flex;
  align-items:center;justify-content:center;font-family:JB;font-weight:800;font-size:46px;color:#e6f1ea}
#pcap span{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;gap:12px}
#fb-b{opacity:0;color:#03100b}#fb-b .ic{width:46px;height:46px;stroke-width:3}
#pled{position:absolute;right:-34px;top:46px;width:22px;height:22px;border-radius:50%;background:#14231d}
#finger{left:640px;top:1130px}#ripple{left:500px;top:1050px}
"""

JS_TAIL = r"""
const C=K.voice_end;
rig('chip',K.to_chip,.6);
FT('#socket',{opacity:0},{opacity:1,duration:.3},K.to_chip+.35);
TO('#rig',{scale:.2,x:430,y:300,opacity:0,duration:.3,ease:'expo.in'},C-.36);TO('#rig-aura',{opacity:0,duration:.2},C-.36);  // gone before the camera clip ends
FT('#ctascrim',{opacity:0},{opacity:1,duration:.4},C);TO('#board',{opacity:.15,duration:.4},C);
TO('.tl',{opacity:0,duration:.25},C);
FT('#ctaq .q2',{opacity:0,y:40},{opacity:1,y:0,duration:.3,ease:'back.out(2)'},C+.1);
FT('#ctaq .q3',{opacity:0,y:30},{opacity:1,y:0,duration:.25},C+.45);
FT('#card',{opacity:0,y:200},{opacity:1,y:0,duration:.45,ease:'expo.out'},C+.8);
FT('#finger',{opacity:0,x:120,y:160},{opacity:1,x:0,y:0,duration:.4,ease:'power3.out'},C+1.5);
TO('#finger',{x:-150,y:-90,duration:.3,ease:'power2.inOut'},C+1.9);
TO('#finger',{scale:.85,duration:.06},C+2.2);TO('#finger',{scale:1,duration:.12},C+2.28);
TO('#pcap',{y:8,duration:.06},C+2.2);TO('#pcap',{y:0,duration:.12},C+2.3);
FT('#ripple',{opacity:.9,scale:.3},{opacity:0,scale:3,duration:.45},C+2.22);
TO('#pcap',{background:'#7dffb0',duration:.15},C+2.28);
S('#pled',{backgroundColor:'#7dffb0',boxShadow:'0 0 16px #7dffb0'},C+2.28);
S('#fb-a',{opacity:0},C+2.28);S('#fb-b',{opacity:1},C+2.28);
TO('#finger',{opacity:0,duration:.2},C+2.7);
TO(['#ctaq','#card'],{opacity:0,duration:.25},D-.25);
"""


def titles_markup(titles):
    html_parts, js = [], []
    for i, (t, text) in enumerate(titles):
        html_parts.append(f'<div class="tl" id="tl{i}"><span class="tli">{html.escape(text)}</span></div>')
        nxt = titles[i + 1][0] if i + 1 < len(titles) else None
        # split the inner span: words inside a flex container would lose the spaces between them
        js.append(f"(()=>{{const s=SplitText.create('#tl{i} .tli',{{type:'words,chars',charsClass:'ch'}});"
                  f"S('#tl{i}',{{opacity:1}},{t});"
                  f"tl.fromTo(s.chars,{{opacity:0,yPercent:60}},{{opacity:1,yPercent:0,duration:.3,ease:'back.out(2)',"
                  f"stagger:{{each:.022}},immediateRender:true}},{t});"
                  + (f"TO('#tl{i}',{{opacity:0,duration:.2}},{nxt - .2});" if nxt else "") + "})();")
    return "".join(html_parts), "".join(js)


def sound_events(k, sfx):
    ev = [{"time": 0.0, "category": "power_up", "variant": 0, "gain_db": -15, "context": "board powers on"}]
    last = {}
    for t, cat, g, ctx in sorted(sfx):
        if t - last.get(cat, -9) < 0.25:       # one sound per category per beat cluster
            continue
        last[cat] = t
        ev.append({"time": round(max(0.0, t - 0.02), 3), "category": cat, "variant": 0, "gain_db": g, "context": ctx})
    for t in k["titles"]:
        if t > 0.3:                              # the hook title is already on screen at frame 0
            ev.append({"time": round(t - 0.02, 3), "category": "click", "variant": 0, "gain_db": -18, "context": "title"})
    c = k["voice_end"]
    ev += [{"time": c - 0.15, "category": "whoosh", "variant": 1, "gain_db": -14, "context": "to CTA"},
           {"time": c + 2.2, "category": "click", "variant": 0, "gain_db": -9, "context": "button press"},
           {"time": c + 2.3, "category": "success_chime", "variant": 0, "gain_db": -14, "context": "following"}]
    return sorted(ev, key=lambda x: x["time"])


def music_plan(k, track, drop_s):
    turn = k["titles"][1] if len(k["titles"]) > 1 else k["voice_end"] / 2
    return [
        {"start": 0.0, "end": turn - 0.3, "mode": "lowpass", "gain_db": -4, "track": track, "src": max(0.0, drop_s - turn)},
        {"start": turn - 0.3, "end": turn - 0.02, "mode": "silence"},
        {"start": turn - 0.02, "end": k["duration"], "mode": "full", "gain_db": -1, "track": track, "src": drop_s, "fade_out": 1.2},
    ]


def build(track, drop_s):
    brand = rk.load_brand(WORK)
    rk.setup_assets(WORK)
    rk.ensure_icons(["message-circle", "check", "pointer"])
    rk.prepare_camera(WORK)
    rk.prepare_voice(WORK)
    words, voice_end = load()
    caps = rk.captions(words, voice_end, max_words=3, max_chars=16)
    beats = resolve(words, voice_end)
    hook = HOOK or caps[0]["text"].upper()
    board_svg, board_js, sfx, titles = board(beats, brand)
    titles = [(0.0, hook)] + titles
    t_html, t_js = titles_markup(titles)
    duration = round(voice_end + CTA, 3)
    first_end = next((w["end"] for w in words if w["word"].endswith((".", "?", "!"))), min(3.0, voice_end))
    first_step = min([b["t"] for b in beats] + [voice_end])
    k = {"voice_end": voice_end, "duration": duration, "seed": SEED, "titles": [t for t, _ in titles],
         "to_chip": round(max(0.3, min(first_end + 0.1, first_step - 0.7)), 3)}
    card_w, card_h = 960, 714
    states = rk.rig_states(card_w, card_h, hero_y=430)
    states["chip"] = {"x": CHIP["x"], "y": CHIP["y"], "scale": round(CHIP["w"] / card_w, 4)}
    k["rigStates"] = states
    k["rig"] = [[0.0, "hero"]]
    k["segments"] = rk.jump_segments(WORK, rk.track_faces(WORK), voice_end)
    question = QUESTION or ("E você, o que acha?" if brand.get("lang", "pt") == "pt" else "What do you think?")
    world_back = (f'<div id="bgrid"></div><svg id="board" viewBox="0 0 1080 1920" width="1080" height="1920">'
                  f'{board_svg}</svg>')
    overlays = f'<div id="ttl">{t_html}</div><div id="ctascrim"></div>'
    videos = [{"id": "cam-hd", "start": 0, "duration": voice_end, "track": 0, "src": "camera-hd.mp4"}]
    markup = rk.page(title=f"{brand['name']} · circuito", duration=duration, card_w=card_w, card_h=card_h,
                     face_origin="50% 45%", videos=videos, scenes_html=scenes(question, brand),
                     css=CSS.replace("__CAPTOP__", str(CAPTION_TOP)), js=board_js + t_js + JS_TAIL, keys=k,
                     caps=caps, caption_mode="pill", brand_work=WORK, world_back=world_back, overlays=overlays,
                     plugins=("SplitText", "DrawSVG", "MorphSVG", "MotionPath"), caption_pill=("#03100b", "#7dffb0"))
    (WORK / "composition/index.html").write_text(markup)
    plan = {"duration": duration, "voice_end": voice_end, "keys": k, "captions": caps, "style": "circuito",
            "sound_events": sound_events(k, sfx), "music": music_plan(k, track, drop_s),
            # silkscreen reference designators (U1, U2…) are part of the board, not claims
            "allowed_numbers": [str(n) for n in range(1, 2 + sum(b["do"] == "node" for b in beats))],
            "music_ref": [k["titles"][1] if len(k["titles"]) > 1 else voice_end / 2, voice_end], "cta_boost_db": 5}
    (WORK / "plan.json").write_text(json.dumps(plan, ensure_ascii=False, indent=2))
    (WORK / "captions.json").write_text(json.dumps(caps, ensure_ascii=False, indent=2))
    return plan
