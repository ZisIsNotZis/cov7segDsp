"""Finite, adversarial display channels: erasures plus unknown segment faults.

The channel enumerates observations, not probabilities. A segment is an
independently controlled binary light, not necessarily one physical IC pin.
At most k *effective visible* faults is equivalent to at most k arbitrary
physical segment faults for the one-frame observation sets (hidden and dormant
faults add no new observations). Temporal diagnosis is deliberately excluded.
"""
from __future__ import annotations

from dataclasses import dataclass
from itertools import combinations
from typing import Mapping

from .model import Layout


@dataclass(frozen=True)
class Channel:
    covers: tuple[tuple[str, int], ...] = (("none", 0),)
    fault: str = "off"
    budget: int = 0
    cover_known: bool = True

    def __post_init__(self):
        if not self.covers or self.fault not in ("off", "on", "flip"):
            raise ValueError("Need covers and an off/on/flip fault model")
        if not isinstance(self.budget, int) or self.budget < 0:
            raise ValueError("Fault budget must be a non-negative integer")
        if len({name for name, _ in self.covers}) != len(self.covers):
            raise ValueError("Cover names must be unique")
        if any(mask < 0 for _, mask in self.covers):
            raise ValueError("Cover masks must be non-negative")


def cover_family(layout: Layout, mode: str) -> tuple[tuple[str, int], ...]:
    """A named scenario; LR means either side, both-LR means both at once."""
    if mode == "none":
        return (("none", 0),)
    if mode == "lr":
        return tuple((s, layout.covers[s]) for s in ("left", "right"))
    if mode == "lrt":
        return tuple((s, layout.covers[s]) for s in ("left", "right", "top"))
    if mode == "all":
        return tuple((s, layout.covers[s]) for s in ("top", "right", "bottom", "left"))
    if mode == "both-lr":
        return (("left+right", layout.covers["left"] | layout.covers["right"]),)
    if mode == "all-simultaneous":
        mask = 0
        for c in layout.covers.values():
            mask |= c
        return (("all", mask),)
    raise ValueError(f"Unknown cover mode: {mode}")


def _submasks_at_most(mask: int, budget: int):
    bits = [1 << i for i in range(mask.bit_length()) if mask >> i & 1]
    for size in range(min(budget, len(bits)) + 1):
        for subset in combinations(bits, size):
            yield sum(subset)


def observations(layout: Layout, pattern: int, channel: Channel) -> dict[tuple[str, int], dict]:
    """Observation key -> one reproducible cover/fault witness.

    Known-cover observations retain the cover name. Unknown-cover observations
    omit it: hidden segments look dark and the viewer is not told the mask.
    The latter is not the same as a visible leaf whose position is known.
    """
    full = (1 << layout.n_segments) - 1
    if pattern < 0 or pattern & ~full:
        raise ValueError("Pattern outside layout")
    out = {}
    for name, cover in channel.covers:
        if cover & ~full:
            raise ValueError("Cover outside layout")
        visible = full & ~cover
        clean = pattern & visible
        eligible = clean if channel.fault == "off" else visible & ~clean if channel.fault == "on" else visible
        for changed in _submasks_at_most(eligible, channel.budget):
            received = clean ^ changed
            key = (name if channel.cover_known else "unknown", received)
            out.setdefault(key, {"cover": name, "cover_mask": cover, "fault_mask": changed,
                                 "fault_count": changed.bit_count(), "received": received})
    return out


def clean_observations(layout: Layout, pattern: int, channel: Channel):
    return observations(layout, pattern, Channel(channel.covers, channel.fault, 0, channel.cover_known))


def collision(layout: Layout, p: int, q: int, channel: Channel, task: str = "correction") -> dict | None:
    """Explain failure for two intended characters.

    correction: their possible received observations overlap.
    detection: a possible observation of either can impersonate a clean
    observation of the other. This means 'no silent substitution', not
    'every physical fault can be noticed'.
    """
    if task not in ("correction", "detection"):
        raise ValueError("Task must be correction or detection")
    op, oq = observations(layout, p, channel), observations(layout, q, channel)
    if task == "correction":
        shared = op.keys() & oq.keys()
    else:
        cp, cq = clean_observations(layout, p, channel), clean_observations(layout, q, channel)
        shared = (op.keys() & cq.keys()) | (cp.keys() & oq.keys())
    if not shared:
        return None
    key = min(shared)
    if task == "detection":
        # Choose a directed corrupted->clean explanation, rather than two
        # arbitrary corrupted witnesses with the same received value.
        if key in op and key in cq:
            oq = cq
        else:
            op = cp
    return {"observation": {"cover": key[0], "pattern": key[1]},
            "first": op[key], "second": oq[key]}


def check_font(layout: Layout, font: Mapping[str, int], channel: Channel, task="correction") -> dict:
    items = list(font.items())
    conflicts = []
    for i, (a, p) in enumerate(items):
        for b, q in items[i + 1:]:
            witness = collision(layout, p, q, channel, task)
            if witness is not None:
                conflicts.append({"a": a, "b": b, **witness})
    return {"ok": not conflicts, "task": task, "size": len(font),
            "conflict_count": len(conflicts), "conflicts": conflicts}


def channel_graph(layout: Layout, channel: Channel, task="correction") -> list[int]:
    """Confusability graph over all 2^n patterns, including self loops."""
    if layout.n_segments > 9:
        raise ValueError("Exact graph is deliberately limited to at most 9 segments")
    n = layout.n_patterns
    obs = [observations(layout, p, channel) for p in range(n)]
    clean = [clean_observations(layout, p, channel) for p in range(n)] if task == "detection" else obs
    if task not in ("correction", "detection"):
        raise ValueError("Task must be correction or detection")
    adj = [1 << p for p in range(n)]
    for p in range(n):
        for q in range(p + 1, n):
            shared = not obs[p].keys().isdisjoint(clean[q])
            if task == "detection":
                shared = shared or not clean[p].keys().isdisjoint(obs[q])
            if shared:
                adj[p] |= 1 << q
                adj[q] |= 1 << p
    return adj


def capacity(layout: Layout, channel: Channel, task="correction", timeout: float = 3.0) -> dict:
    """Maximum with a witness and an honest bound if the search times out.

    A greedy colouring of the compatibility graph bounds every clique. The
    root bound remains valid on interruption; the incumbent is always valid.
    """
    import time
    adj = channel_graph(layout, channel, task)
    n = len(adj)
    full = (1 << n) - 1
    comp = [full & ~a for a in adj]
    best = []
    deadline = time.monotonic() + timeout

    def color_sort(p):
        order, bounds, color = [], [], 0
        while p:
            color += 1
            q = p
            while q:
                b = q & -q
                v = b.bit_length() - 1
                p &= ~b
                q &= ~b
                q &= ~comp[v]
                order.append(v)
                bounds.append(color)
        return order, bounds

    _, root_bounds = color_sort(full)
    upper = root_bounds[-1]
    # Every single fixed cover is a necessary subproblem, even when its
    # identity is not supplied. Pigeonhole and binary sphere-packing bounds
    # can be substantially stronger than the greedy colouring.
    from math import comb
    for _, cover in channel.covers:
        m = layout.n_segments - cover.bit_count()
        bound = 1 << m
        if channel.budget:
            if channel.fault == "flip":
                radius = channel.budget if task == "correction" else channel.budget // 2
                bound //= sum(comb(m, j) for j in range(min(m, radius) + 1))
            if task == "detection" and channel.budget >= 1:
                # Adjacent hypercube words cannot coexist for any of the
                # three fault types; a perfect matching gives half the cube.
                bound = min(bound, 1 << max(0, m-1)) if m else 1
        upper = min(upper, bound)
    # A degree-ordered greedy seed avoids an empty result on short budgets.
    available = full
    while available:
        v = min((i for i in range(n) if available >> i & 1),
                key=lambda i: (adj[i] & available).bit_count())
        best.append(v)
        available &= ~adj[v]

    def expand(chosen, p):
        nonlocal best
        if len(best) >= upper:
            return
        if time.monotonic() > deadline:
            raise TimeoutError
        if not p:
            if len(chosen) > len(best):
                best = chosen
            return
        order, bounds = color_sort(p)
        for idx in range(len(order)-1, -1, -1):
            if len(chosen) + bounds[idx] <= len(best):
                return
            v = order[idx]
            expand(chosen+[v], p & comp[v])
            p &= ~(1 << v)
    try:
        expand([], full)
    except TimeoutError:
        return {"status": "bounded", "lower": len(best), "upper": upper,
                "patterns": sorted(best), "timeout_seconds": timeout}
    return {"status": "exact", "value": len(best), "patterns": sorted(best)}


def decode(layout: Layout, font: Mapping[str, int], received: int, channel: Channel,
           cover: str | None = None) -> list[str]:
    if channel.cover_known and cover is None:
        raise ValueError("Known-cover decoding requires a cover name")
    key = (cover if channel.cover_known else "unknown", received)
    return [label for label, p in font.items() if key in observations(layout, p, channel)]


def capacity_sat(layout: Layout, channel: Channel, task="correction", timeout=10.0) -> dict:
    """Optional CP-SAT cross-check; no implicit dependency installation."""
    from ortools.sat.python import cp_model
    import math
    graph = channel_graph(layout, channel, task)
    model = cp_model.CpModel()
    x = [model.NewBoolVar(f"p{i}") for i in range(len(graph))]
    for p, neighbors in enumerate(graph):
        for q in range(p+1, len(graph)):
            if neighbors >> q & 1:
                model.Add(x[p]+x[q] <= 1)
    model.Maximize(sum(x))
    seed = capacity(layout, channel, task, timeout=.1)
    for p in seed["patterns"]:
        model.AddHint(x[p],1)
    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = timeout
    solver.parameters.num_search_workers = 8
    status = solver.Solve(model)
    if status not in (cp_model.FEASIBLE, cp_model.OPTIMAL):
        return seed
    patterns = [p for p in range(len(graph)) if solver.Value(x[p])]
    if status == cp_model.OPTIMAL:
        return {"status":"exact", "value":len(patterns), "patterns":patterns, "method":"CP-SAT"}
    return {"status":"bounded", "lower":len(patterns),
            "upper":math.floor(solver.BestObjectiveBound()+1e-6),
            "patterns":patterns, "method":"CP-SAT", "timeout_seconds":timeout}


def extended_layouts() -> dict[str, Layout]:
    """Geometry is data. Names count independent strokes, not package pins."""
    from .layouts import seven_seg, grid_pixels
    base = seven_seg()
    result = {"seven": base, "pixels9": grid_pixels(3, 3)}
    # Put an X inside each of the two seven-segment cells. Full diagonals are
    # independent strokes; intersection does not create an electrical junction.
    diagonals = [(0.12, .10, .88, .44), (.88, .10, .12, .44),
                 (.12, .56, .88, .90), (.88, .56, .12, .90)]
    for split in (False, True):
        geom = dict(base.geometry)
        for i, (x1, y1, x2, y2) in enumerate(diagonals):
            if split:
                xm, ym = (x1+x2)/2, (y1+y2)/2
                geom[f"x{i}a"] = (x1, y1, xm, ym)
                geom[f"x{i}b"] = (xm, ym, x2, y2)
            else:
                geom[f"x{i}"] = (x1, y1, x2, y2)
        result["split-x15" if split else "cell-x11"] = Layout(
            "7 + two cell Xs (split halves)" if split else "7 + two cell Xs (whole strokes)",
            tuple(geom), dict(base.covers), geometry=geom)
    # 3x3 VERTICES: 12 orthogonal edges plus 4 corner-to-centre diagonals.
    geom = {}
    for r in range(3):
        for c in range(2):
            geom[f"h{r}{c}"] = (.05+.45*c, .05+.45*r, .05+.45*(c+1), .05+.45*r)
    for r in range(2):
        for c in range(3):
            geom[f"v{r}{c}"] = (.05+.45*c, .05+.45*r, .05+.45*c, .05+.45*(r+1))
    for i, (x, y) in enumerate(((.05,.05),(.95,.05),(.05,.95),(.95,.95))):
        geom[f"d{i}"] = (x,y,.5,.5)
    segs = tuple(geom)
    groups = {"top": ("h00", "h01"), "bottom": ("h20", "h21"),
              "left": ("v00", "v10"), "right": ("v02", "v12")}
    covers = {side: sum(1 << segs.index(s) for s in names) for side, names in groups.items()}
    result["grid16"] = Layout("3x3 vertices + four centre diagonals", segs, covers, geometry=geom)
    return result


def embed_standard(layout: Layout, table: Mapping[str, str]) -> dict[str, int]:
    """Reference drawing, not evidence that the glyph is perceptually good."""
    if all(s in layout.segments for s in "abcdefg"):
        return {label: sum(1 << layout.index(s) for s, on in zip("abcdefg", bits) if on == "1")
                for label, bits in table.items()}
    if layout.n_segments == 16:
        groups = {"a":("h00","h01"),"b":("v02",),"c":("v12",),
                  "d":("h20","h21"),"e":("v10",),"f":("v00",),"g":("h10","h11")}
    else:
        groups = {"a":("r0c0","r0c1","r0c2"),"b":("r0c2","r1c2"),
                  "c":("r1c2","r2c2"),"d":("r2c0","r2c1","r2c2"),
                  "e":("r1c0","r2c0"),"f":("r0c0","r1c0"),"g":("r1c0","r1c1","r1c2")}
    return {label: layout.mask({s for segment,on in zip("abcdefg", bits) if on == "1" for s in groups[segment]})
            for label,bits in table.items()}
