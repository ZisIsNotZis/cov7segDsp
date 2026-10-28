"""Run the foundation experiments and write results + plots.

Usage:
    python -m foundation.experiments

The exact mixed-Hamming counts use the C++ helper compiled on first run.
The 3x3 pixel-grid maximum independent set uses the pure-Python branch and
bound; the minimum maximal set is left to the optional SAT script because it
is a hard case and is reported as a bound in the note.
"""
from __future__ import annotations

import json
from pathlib import Path

from . import block, charset, recognize
from .exact import (
    domination_lower_bound,
    layout_graph,
    max_closed_neighborhood,
    max_independent_set,
)
from .fonts import (
    DOC_DEC,
    DOC_HEX,
    MIN_DEC,
    MIN_FLIP_DEC,
    MIN_MISMATCH_DEC,
    MIN_HEX,
    OPT_DEC,
    STANDARD,
    TOP0_DEC,
    flips_from_standard,
)
from .layouts import grid_pixels
from .plot import bar_chart_svg, dot_plot_svg

ROOT = Path(__file__).resolve().parent
RES = ROOT / "results"
PLOTS = ROOT / "plots"

FAMILIES = [(2, 2), (2, 3), (2, 4), (2, 8), (3, 3), (3, 4), (4, 4)]


def seven_seg_results() -> dict[str, object]:
    per_g = block.counts_by_size(4, 4)
    glob = block.convolve(per_g)
    return {
        "per_g": {str(k): v for k, v in per_g.items()},
        "global": {str(k): v for k, v in glob.items()},
        "per_g_total": sum(per_g.values()),
        "global_total": sum(glob.values()),
        "per_g_min": min(per_g),
        "per_g_max": max(per_g),
        "global_min": min(glob),
        "global_max": max(glob),
        "per_g_existence": sorted(per_g),
        "global_existence": sorted(glob),
        "per_g_total_maximum_sets": per_g[max(per_g)],
        "global_total_maximum_sets": glob[max(glob)],
        "per_g_total_minimum_sets": per_g[min(per_g)],
        "global_total_minimum_sets": glob[min(glob)],
    }


def family_results() -> dict[str, object]:
    out = {}
    for q3, q4 in FAMILIES:
        c = block.count(q3, q4)
        counts = {int(k): int(v) for k, v in c["counts"].items()}
        out[f"({q3},{q4})"] = {
            "q3": q3,
            "q4": q4,
            "n_patterns": 4 * q3 * q4,
            "matchings": c["matchings"],
            "counts": {str(k): v for k, v in counts.items()},
            "existence": sorted(counts),
            "total": c["total"],
            "min": min(counts),
            "max": max(counts),
        }
    return out


def grid33_results() -> dict[str, object]:
    lay = grid_pixels(3, 3)
    adj = layout_graph(lay)
    mis = max_independent_set(adj)
    return {
        "n_patterns": lay.n_patterns,
        "n_covers": len(lay.covers),
        "max_closed_neighborhood": max_closed_neighborhood(adj),
        "domination_lower_bound": domination_lower_bound(adj),
        "max_independent": len(mis),
        "max_independent_example": [
            "".join(str((p >> i) & 1) for i in range(lay.n_segments))
            for p in mis[:8]
        ],
        "note": "minimum maximal set: best feasible 32 from CP-SAT; lower bound 21; exact not settled",
    }


def font_results() -> dict[str, object]:
    checks = charset.all_font_checks()
    flips = {
        "standard": flips_from_standard(STANDARD),
        "doc_dec": flips_from_standard(DOC_DEC),
        "doc_hex": flips_from_standard(DOC_HEX),
        "min_dec": flips_from_standard(MIN_DEC),
        "min_hex": flips_from_standard(MIN_HEX),
        "opt_dec": flips_from_standard(OPT_DEC),
        "min_flip_dec": flips_from_standard(MIN_FLIP_DEC),
        "top0_dec": flips_from_standard(TOP0_DEC),
        "min_mismatch_dec": flips_from_standard(MIN_MISMATCH_DEC),
    }
    scores = {
        "doc_dec": recognize.set_score(DOC_DEC),
        "doc_hex": recognize.set_score(DOC_HEX),
        "min_dec": recognize.set_score(MIN_DEC),
        "min_hex": recognize.set_score(MIN_HEX),
        "opt_dec": recognize.set_score(OPT_DEC),
        "min_flip_dec": recognize.set_score(MIN_FLIP_DEC),
        "top0_dec": recognize.set_score(TOP0_DEC),
        "min_mismatch_dec": recognize.set_score(MIN_MISMATCH_DEC),
    }
    return {
        "checks": checks,
        "flips": {k: sum(v.values()) for k, v in flips.items()},
        "flips_by_glyph": flips,
        "scores": {
            k: {
                "mean": v["mean"],
                "min": v["min"],
                "per_glyph": v["per_glyph"],
                "topology_mismatches": v["topology_mismatches"],
                "occluded_topology_mismatches": v["occluded_topology_mismatches"],
                "nearest_mismatches": v["nearest_mismatches"],
                "nearest_ties": v["nearest_ties"],
                "min_nearest_margin": v["min_nearest_margin"],
            }
            for k, v in scores.items()
        },
    }


def make_plots(seven: dict, families: dict) -> None:
    PLOTS.mkdir(parents=True, exist_ok=True)
    per_g = {int(k): v for k, v in seven["per_g"].items()}
    glob = {int(k): v for k, v in seven["global"].items()}
    bar_chart_svg(
        per_g,
        PLOTS / "sevenseg_per_g_counts.svg",
        "7-seg per-g maximal sets by size (K2 K2 K4 K4)",
    )
    bar_chart_svg(
        glob,
        PLOTS / "sevenseg_global_counts.svg",
        "7-seg global maximal sets by size (two g copies)",
    )
    dot_plot_svg(
        {name: data["existence"] for name, data in families.items()},
        PLOTS / "family_existence.svg",
        "Attainable maximal-set sizes: K2 x K2 x Kq3 x Kq4",
    )
    bar_chart_svg(
        {int(k): v for k, v in families["(3,3)"]["counts"].items()},
        PLOTS / "family_33_counts.svg",
        "K2 K2 K3 K3: counts are not unimodal",
        logy=False,
    )


def main() -> None:
    RES.mkdir(parents=True, exist_ok=True)
    seven = seven_seg_results()
    families = family_results()
    grid = grid33_results()
    fonts = font_results()
    caps = charset.capacity_table()
    data = {
        "seven_seg": seven,
        "families": families,
        "grid_3x3": grid,
        "fonts": fonts,
        "capacity": caps,
    }
    (RES / "foundation.json").write_text(
        json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8"
    )
    make_plots(seven, families)
    print("wrote", RES / "foundation.json")
    print("7-seg per-g sizes:", seven["per_g_existence"])
    print("7-seg global sizes:", seven["global_existence"])
    print("per-g total maximal sets:", seven["per_g_total"])
    print("global total maximal sets:", seven["global_total"])
    print("capacity:", charset.seven_seg_capacity())
    print("3x3 max independent:", grid["max_independent"])
    print("3x3 domination lower bound:", grid["domination_lower_bound"])
    for name, f in families.items():
        print(name, "sizes", f["existence"], "total", f["total"])


if __name__ == "__main__":
    main()
