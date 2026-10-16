"""Long-form composition (classes, lives, YouTube): runs as-is, then make it YOURS.

Edit long.json (format, style, kind, intro, cta), chapters.json and layouts.json, then fill the lists below.
All times are seconds of the EDITED voice timeline (words-reviewed.json), never of the source.
Run: heditor long produce <work> [music:<id>]          (see references/long-form.md)
"""
import os
import sys
from pathlib import Path

sys.path.insert(0, os.environ.get("HEDITOR_KIT", str(Path.home() / ".heditor/kit")))
import longkit as lk  # noqa: E402

WORK = Path(__file__).resolve().parent

# Name strip(s): who is speaking and why it matters. Only real, public information.
LOWER_THIRDS = [
    # {"start": 4.0, "duration": 5.0, "title": "Speaker name", "role": "What they do"},
]

# Creative set pieces at key moments only (hook, central concepts, turns, chapter close).
# kinds: title (spoken words as giant type), concept_map (nodes/arrows drawn on trigger words),
#        checklist (chapter recap), callout (zoom into a screen region + label), custom (your HTML/CSS/JS).
SET_PIECES = [
    # {"kind": "title", "start": 12.3, "end": 16.8, "emphasis": ["word"]},
    # {"kind": "concept_map", "start": 60.0, "end": 75.0, "heading": "...",
    #  "nodes": [{"id": "a", "label": "...", "t": 61.2, "x": 0.2, "y": 0.5}],
    #  "edges": [{"from": "a", "to": "b", "t": 63.0, "label": "..."}]},
]

# None = automatic retention plan (keyword chips at the kind's cadence); [] = none; or [{"t": s, "word": "..."}]
CALLOUTS = None


def build(track=None):
    return lk.build(WORK, lower_thirds=LOWER_THIRDS, set_pieces=SET_PIECES, callouts=CALLOUTS, track=track)
