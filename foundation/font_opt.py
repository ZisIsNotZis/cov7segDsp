"""Optional font search with CP-SAT.

Run:
    uv run --with ortools python -m foundation.font_opt

Objectives:
  * minimise visible topology mismatches,
  * minimise total segment flips,
  * minimise the weighted visible + occluded distance.

The search is a small assignment problem with the no-conflict constraints; it
produces concrete fonts and a Pareto table.  It is a design aid, not a
perceptual ground truth.  In particular, a 0-visible-mismatch font exists but
is not automatically recognisable: topology is necessary, not sufficient.
"""
from __future__ import annotations

import json
from pathlib import Path

from . import recognize
from .fonts import STANDARD, as_patterns
from .layouts import seven_seg
from .topology import standard_signatures, signature

ROOT = Path(__file__).resolve().parent
RES = ROOT / "results"
DIGITS = list("0123456789")
PATTERNS = list(range(128))


def _scaled_weights() -> dict[str, int]:
    return {"a": 10, "b": 10, "c": 10, "d": 6, "e": 10, "f": 12, "g": 11}


def _distances(layout):
    std = as_patterns(STANDARD)
    w = _scaled_weights()
    vis = {}
    occ = {}
    for d in DIGITS:
        for p in PATTERNS:
            vis[d, p] = sum(
                w[layout.segments[i]]
                for i in range(layout.n_segments)
                if ((p >> i) & 1) != ((std[d] >> i) & 1)
            )
            total = 0
            for cover in layout.covers.values():
                total += sum(
                    w[layout.segments[i]]
                    for i in range(layout.n_segments)
                    if (((p & ~cover) >> i) & 1) != (((std[d] & ~cover) >> i) & 1)
                )
            occ[d, p] = total
    return vis, occ


def _topology_mismatch(layout):
    std_sigs = standard_signatures()
    sig = {p: signature(layout, p) for p in PATTERNS}
    return {
        (d, p): int(sig[p] != std_sigs[d])
        for d in DIGITS
        for p in PATTERNS
    }


def solve(
    objective: str = "mismatch",
    max_mismatch: int | None = None,
    max_flips: int | None = None,
    timeout: float = 120.0,
) -> dict:
    from ortools.sat.python import cp_model

    layout = seven_seg()
    std = as_patterns(STANDARD)
    model = cp_model.CpModel()
    x = {(d, p): model.NewBoolVar(f"x_{d}_{p}") for d in DIGITS for p in PATTERNS}
    for d in DIGITS:
        model.Add(sum(x[d, p] for p in PATTERNS) == 1)
    for cover in layout.covers.values():
        groups: dict[int, list[int]] = {}
        for p in PATTERNS:
            groups.setdefault(p & ~cover, []).append(p)
        for plist in groups.values():
            terms = [x[d, p] for d in DIGITS for p in plist]
            if len(terms) > 1:
                model.Add(sum(terms) <= 1)

    flips = {
        (d, p): sum(
            ((p >> i) & 1) != ((std[d] >> i) & 1)
            for i in range(layout.n_segments)
        )
        for d in DIGITS
        for p in PATTERNS
    }
    mism = _topology_mismatch(layout)
    vis, occ = _distances(layout)

    if max_mismatch is not None:
        model.Add(sum(mism[d, p] * x[d, p] for d in DIGITS for p in PATTERNS) <= max_mismatch)
    if max_flips is not None:
        model.Add(sum(flips[d, p] * x[d, p] for d in DIGITS for p in PATTERNS) <= max_flips)

    if objective == "mismatch":
        model.Minimize(sum(mism[d, p] * x[d, p] for d in DIGITS for p in PATTERNS))
    elif objective == "flips":
        model.Minimize(sum(flips[d, p] * x[d, p] for d in DIGITS for p in PATTERNS))
    elif objective == "distance":
        # 10 * visible + 3 * occluded, matching lambda_occ = 0.3.
        model.Minimize(
            sum((10 * vis[d, p] + 3 * occ[d, p]) * x[d, p] for d in DIGITS for p in PATTERNS)
        )
    else:
        raise ValueError(objective)

    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = timeout
    solver.parameters.num_search_workers = 8
    status = solver.Solve(model)
    name = solver.StatusName(status)
    if status not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        return {"objective": objective, "status": name}
    chosen = {}
    for d in DIGITS:
        for p in PATTERNS:
            if solver.Value(x[d, p]):
                chosen[d] = p
    table = {
        d: "".join(str((chosen[d] >> i) & 1) for i in range(layout.n_segments))
        for d in DIGITS
    }
    return {
        "objective": objective,
        "status": name,
        "table": table,
        "flips": sum(flips[d, chosen[d]] for d in DIGITS),
        "visible_mismatches": sum(mism[d, chosen[d]] for d in DIGITS),
        "distance": sum(10 * vis[d, chosen[d]] + 3 * occ[d, chosen[d]] for d in DIGITS),
        "mismatch_digits": [d for d in DIGITS if mism[d, chosen[d]]],
        "score": recognize.set_score(table),
    }


def main() -> None:
    RES.mkdir(parents=True, exist_ok=True)
    out = {
        "min_mismatch": solve("mismatch"),
        "min_flips": solve("flips"),
        "min_distance": solve("distance"),
        "min_flips_zero_mismatch": solve("flips", max_mismatch=0),
        "pareto": [],
    }
    for budget in range(0, 6):
        r = solve("flips", max_mismatch=budget)
        out["pareto"].append(
            {
                "max_mismatch": budget,
                "flips": r.get("flips"),
                "status": r.get("status"),
                "table": r.get("table"),
                "mismatch_digits": r.get("mismatch_digits"),
            }
        )
    (RES / "font_opt.json").write_text(json.dumps(out, indent=2), encoding="utf-8")
    for key in ("min_mismatch", "min_flips", "min_distance", "min_flips_zero_mismatch"):
        r = out[key]
        print(key, r.get("status"), "flips", r.get("flips"), "mism", r.get("visible_mismatches"), r.get("mismatch_digits"))
        print(" ", r.get("table"))
    print("pareto:")
    for p in out["pareto"]:
        print(" ", p["max_mismatch"], p["status"], p["flips"], p["mismatch_digits"])
    print("wrote", RES / "font_opt.json")


if __name__ == "__main__":
    main()
