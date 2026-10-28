"""Concrete layouts used by the foundation experiments."""
from __future__ import annotations

from itertools import product

from .model import Layout


def seven_seg() -> Layout:
    """Standard 7-segment display.

    Segment order is a,b,c,d,e,f,g.  A cover removes the entire outermost
    line on that side: top={a}, bottom={d}, left={e,f}, right={b,c}.  The
    middle segment g is never covered.
    """
    segs = ("a", "b", "c", "d", "e", "f", "g")
    # Segment bit i corresponds to segs[i].
    covers = {
        "top": 1 << 0,                 # a
        "right": (1 << 1) | (1 << 2),  # b,c
        "bottom": 1 << 3,              # d
        "left": (1 << 4) | (1 << 5),   # e,f
    }
    free = 1 << 6  # g
    geom = {
        "a": (0.08, 0.02, 0.92, 0.02),
        "b": (0.98, 0.08, 0.98, 0.48),
        "c": (0.98, 0.52, 0.98, 0.92),
        "d": (0.08, 0.98, 0.92, 0.98),
        "e": (0.02, 0.52, 0.02, 0.92),
        "f": (0.02, 0.08, 0.02, 0.48),
        "g": (0.08, 0.50, 0.92, 0.50),
    }
    return Layout("7-seg", segs, covers, free=free, geometry=geom)


def seven_seg_per_g() -> Layout:
    """The 64-pattern graph behind one value of g.

    This is the mixed Hamming graph K2 x K2 x K4 x K4.  It is *not* a
    physical display; it is the quotient by the never-covered segment g.
    """
    return mixed_hamming((2, 2, 4, 4), name="7-seg per-g")


def mixed_hamming(qs: tuple[int, ...], name: str | None = None) -> Layout:
    """Cartesian product of complete graphs K_{q1} x ... x K_{qd}.

    Each coordinate is a group of ``ceil(log2(q))`` bits; the group's
    alphabet size is ``q``.  Covering coordinate i removes the whole group.
    Patterns that differ in exactly one coordinate are adjacent, which is
    exactly the conflict graph of the display model.
    """
    import math

    qs = tuple(qs)
    nbits = [max(1, math.ceil(math.log2(q))) for q in qs]
    segs: list[str] = []
    group_masks: list[int] = []
    offset = 0
    for i, (q, nb) in enumerate(zip(qs, nbits)):
        if (1 << nb) != q:
            raise ValueError(
                f"mixed_hamming expects powers of two, got q={q}"
            )
        mask = 0
        for j in range(nb):
            segs.append(f"c{i}_{j}")
            mask |= 1 << (offset + j)
        group_masks.append(mask)
        offset += nb
    covers = {}
    for i in range(len(qs)):
        covers[f"c{i}"] = group_masks[i]
    return Layout(name or f"K{qs}", tuple(segs), covers, free=0)


def grid_pixels(rows: int, cols: int, name: str | None = None) -> Layout:
    """A rows x cols pixel grid.

    Each pixel is a segment.  Covering a side removes the outermost row or
    column.  Corners belong to two covers; this is the minimal overlapping
    cover model, and it is why this layout is not a plain mixed Hamming graph.
    """
    segs = tuple(f"r{r}c{c}" for r in range(rows) for c in range(cols))
    idx = {s: i for i, s in enumerate(segs)}

    def m(cells):
        v = 0
        for r, c in cells:
            v |= 1 << idx[f"r{r}c{c}"]
        return v

    covers = {
        "top": m([(0, c) for c in range(cols)]),
        "bottom": m([(rows - 1, c) for c in range(cols)]),
        "left": m([(r, 0) for r in range(rows)]),
        "right": m([(r, cols - 1) for r in range(rows)]),
    }
    all_covered = 0
    for v in covers.values():
        all_covered |= v
    free = ((1 << len(segs)) - 1) & ~all_covered
    return Layout(name or f"{rows}x{cols} pixel grid", segs, covers, free=free)


def seg11_diagonals() -> Layout:
    """7 segments plus four diagonals from the corners to the centre.

    This is a model, not a claim about a particular commercial 11-segment
    package.  A side cover also removes the diagonals that meet that side, so
    the covers overlap.  The middle segment g stays free.
    """
    segs = ("a", "b", "c", "d", "e", "f", "g", "h1", "h2", "h3", "h4")
    covers = {
        "top": ("a", "h1", "h2"),
        "bottom": ("d", "h3", "h4"),
        "left": ("e", "f", "h1", "h3"),
        "right": ("b", "c", "h2", "h4"),
    }
    return Layout.from_dict(
        {
            "name": "11-seg (7 + 4 diagonals)",
            "segments": list(segs),
            "covers": {k: list(v) for k, v in covers.items()},
            "free": ["g"],
        }
    )


def all_layouts() -> dict[str, Layout]:
    return {
        "7-seg (full, g free)": seven_seg(),
        "7-seg per-g (K2 K2 K4 K4)": seven_seg_per_g(),
        "3x3 pixel grid": grid_pixels(3, 3),
        "3x4 pixel grid": grid_pixels(3, 4),
        "2x2 pixel grid": grid_pixels(2, 2),
        "11-seg (7 + 4 diagonals)": seg11_diagonals(),
    }
