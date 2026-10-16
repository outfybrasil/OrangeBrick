"""Command-line front end for depthkit (layered / 2.5D edits).

    heditor matte <work> [multiclass|selfie]            camera-alpha.webm + matte-person.mp4 + qa/matte-sheet.jpg
    heditor depth <work> [fps]                          depth.mp4 + depth-still.png + qa/depth-sheet.jpg
    heditor look <work> fog|edges|edges-rgb|dots [color] depth-graded / scanned camera variants
    heditor hands <work> [t0] [t1]                      qa/hands-<t0>.json (21 landmarks per hand)
    heditor plane <w> <h> x1,y1 x2,y2 x3,y3 x4,y4        CSS matrix3d that pins a w x h element onto 4 points

All outputs are derived from <work>/composition/assets/camera-hd.mp4 and are rebuilt when it is newer.
"""

import json
import sys

import depthkit as dk


def main(argv):
    if len(argv) < 2:
        print(__doc__)
        return 2
    cmd, args = argv[0], argv[1:]
    if cmd == "matte":
        print(json.dumps(dk.person_matte(args[0], model=args[1] if len(args) > 1 else "multiclass"), indent=1))
    elif cmd == "depth":
        print(dk.depth_map(args[0], fps=int(args[1]) if len(args) > 1 else 10))
    elif cmd == "look":
        work, kind = args[0], args[1]
        color = args[2] if len(args) > 2 else None
        if kind == "fog":
            print(dk.depth_look(work, "fog", "eq=brightness=-0.22:saturation=0.35,gblur=sigma=5"))
        elif kind in ("edges", "edges-rgb"):
            src = "rgb" if kind == "edges-rgb" else "depth"
            print(dk.edge_look(work, name=kind, source=src, **({"color": color} if color else {})))
        elif kind == "dots":
            print(json.dumps(dk.dots_look(work, **({"color": color} if color else {}))))
        else:
            print(f"unknown look {kind!r} (fog, edges, edges-rgb, dots)")
            return 2
    elif cmd == "hands":
        t0 = float(args[1]) if len(args) > 1 else 0.0
        t1 = float(args[2]) if len(args) > 2 else None
        res = dk.track_hands(args[0], t0, t1)
        seen = sum(1 for r in res if r["hands"])
        print(f"{len(res)} samples, hands in {seen}; qa/hands-{t0:.2f}.json")
    elif cmd == "plane":
        w, h = float(args[0]), float(args[1])
        quad = [tuple(float(v) for v in p.split(",")) for p in args[2:6]]
        print(dk.plane_matrix3d(w, h, quad))
    else:
        print(__doc__)
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
