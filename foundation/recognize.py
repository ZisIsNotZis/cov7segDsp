"""A first objective model of "looks like the digit".

This is not a claim about human perception.  It is a reproducible baseline
with two terms:

* the weighted distance to the standard glyph (visible shape), and
* the weighted distance to the standard glyph *after each cover* (the
  occluded shape the viewer expects to see), with a smaller weight.

The weights are provisional.  The phase-2 plan is to calibrate them with a
small recognition quiz; until then the score is a model, not ground truth.

Topological features (holes, components, endpoints, junctions) are deliberately
not hard-coded here: they need a geometry-aware definition before they can be
used as a hard constraint.  The doc records that as the next step.
"""
from __future__ import annotations

import math

from .fonts import STANDARD, as_patterns
from .layouts import seven_seg
from .model import Layout
from .topology import signature, standard_signatures

# Segment weights.  The qualitative ordering follows van Nes & Bouma (1980):
# F is the most distinctive segment, D the least distinctive.  The exact
# numbers are a placeholder until the quiz calibration.
DEFAULT_WEIGHTS = {
    "a": 1.0,
    "b": 1.0,
    "c": 1.0,
    "d": 0.6,
    "e": 1.0,
    "f": 1.2,
    "g": 1.1,
}

DEFAULT_LAMBDA_VISIBLE = 1.0
DEFAULT_LAMBDA_COVER = 0.3


def weighted_distance(layout: Layout, p: int, q: int, weights: dict[str, float] | None = None) -> float:
    weights = weights or DEFAULT_WEIGHTS
    return sum(
        weights.get(layout.segments[i], 1.0)
        for i in range(layout.n_segments)
        if ((p >> i) & 1) != ((q >> i) & 1)
    )


def occluded_distance(
    layout: Layout,
    p: int,
    q: int,
    weights: dict[str, float] | None = None,
) -> float:
    total = 0.0
    for cover in layout.covers.values():
        total += weighted_distance(layout, p & ~cover, q & ~cover, weights)
    return total


def glyph_score(
    layout: Layout,
    pattern: int,
    standard: int,
    weights: dict[str, float] | None = None,
    lambda_visible: float = DEFAULT_LAMBDA_VISIBLE,
    lambda_cover: float = DEFAULT_LAMBDA_COVER,
) -> float:
    d0 = weighted_distance(layout, pattern, standard, weights)
    dc = occluded_distance(layout, pattern, standard, weights)
    return math.exp(-(lambda_visible * d0 + lambda_cover * dc))


def topology_details(table: dict[str, str]) -> dict[str, dict]:
    """Visible and per-cover topological match against the standard glyph."""
    layout = seven_seg()
    pats = as_patterns(table)
    std = as_patterns(STANDARD)
    std_sigs = standard_signatures()
    out = {}
    for label, p in pats.items():
        s0 = std[label]
        visible = signature(layout, p) == std_sigs[label]
        occluded = {}
        for name, cover in layout.covers.items():
            occluded[name] = signature(layout, p & ~cover) == signature(
                layout, s0 & ~cover
            )
        out[label] = {
            "visible": visible,
            "occluded": occluded,
            "all_match": visible and all(occluded.values()),
        }
    return out


def table_scores(
    table: dict[str, str],
    weights: dict[str, float] | None = None,
    lambda_visible: float = DEFAULT_LAMBDA_VISIBLE,
    lambda_cover: float = DEFAULT_LAMBDA_COVER,
) -> dict[str, dict[str, float]]:
    layout = seven_seg()
    pats = as_patterns(table)
    std = as_patterns(STANDARD)
    topo = topology_details(table)
    out = {}
    for label, p in pats.items():
        out[label] = {
            "flips": sum(
                ((p >> i) & 1) != ((std[label] >> i) & 1)
                for i in range(layout.n_segments)
            ),
            "visible_distance": weighted_distance(layout, p, std[label], weights),
            "occluded_distance": occluded_distance(layout, p, std[label], weights),
            "score": glyph_score(
                layout,
                p,
                std[label],
                weights,
                lambda_visible,
                lambda_cover,
            ),
            "topology": topo[label],
        }
    return out


def possible_readings(
    layout: Layout,
    pattern: int,
    table: dict[str, str],
) -> dict[str, list[str]]:
    """For each cover, which labels in ``table`` are indistinguishable."""
    pats = as_patterns(table)
    out: dict[str, list[str]] = {}
    for name, cover in layout.covers.items():
        target = pattern & ~cover
        out[name] = [
            label for label, p in pats.items() if (p & ~cover) == target
        ]
    return out


def set_score(table: dict[str, str], **kw) -> dict[str, object]:
    scores = table_scores(table, **kw)
    values = [v["score"] for v in scores.values()]
    return {
        "mean": sum(values) / len(values) if values else 0.0,
        "min": min(values) if values else 0.0,
        "per_glyph": scores,
        "topology_mismatches": [
            label for label, v in scores.items() if not v["topology"]["visible"]
        ],
        "occluded_topology_mismatches": [
            label
            for label, v in scores.items()
            if not all(v["topology"]["occluded"].values())
        ],
    }


if __name__ == "__main__":
    from .fonts import DOC_DEC, DOC_HEX, MIN_DEC, MIN_HEX

    for name, table in [
        ("doc_dec", DOC_DEC),
        ("min_dec", MIN_DEC),
        ("doc_hex", DOC_HEX),
        ("min_hex", MIN_HEX),
    ]:
        s = set_score(table)
        print(name, "mean", round(s["mean"], 4), "min", round(s["min"], 4))
