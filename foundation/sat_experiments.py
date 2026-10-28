"""Optional CP-SAT experiments for cases outside the exact combinatorics.

Run:
    uv run --with ortools python -m foundation.sat_experiments

Results are written to foundation/results/sat.json.  A status other than
OPTIMAL is recorded as-is; nothing is silently turned into a theorem.
"""
from __future__ import annotations

import json
import itertools
from pathlib import Path

from .layouts import grid_pixels, seg11_diagonals
from .model import conflict_graph

ROOT = Path(__file__).resolve().parent
RES = ROOT / "results"


def mixed_graph(qs: tuple[int, ...]):
    verts = list(itertools.product(*[range(q) for q in qs]))
    idx = {v: i for i, v in enumerate(verts)}
    n = len(verts)
    adj = [1 << i for i in range(n)]
    for i, v in enumerate(verts):
        for j in range(i + 1, n):
            if sum(a != b for a, b in zip(v, verts[j])) == 1:
                adj[i] |= 1 << j
                adj[j] |= 1 << i
    return adj


def _solver(timeout: float):
    from ortools.sat.python import cp_model

    model = cp_model.CpModel()
    return model, cp_model


def cp_max(adj: list[int], timeout: float = 120.0):
    model, cp_model = _solver(timeout)
    n = len(adj)
    x = [model.NewBoolVar(f"x{i}") for i in range(n)]
    for i in range(n):
        for j in range(i + 1, n):
            if (adj[i] >> j) & 1:
                model.Add(x[i] + x[j] <= 1)
    model.Maximize(sum(x))
    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = timeout
    solver.parameters.num_search_workers = 8
    status = solver.Solve(model)
    name = solver.StatusName(status)
    value = None
    if status in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        value = int(solver.ObjectiveValue())
    return {"status": name, "value": value}


def _bits(mask: int):
    while mask:
        b = mask & -mask
        yield b.bit_length() - 1
        mask ^= b


def cp_min(adj: list[int], timeout: float = 120.0):
    model, cp_model = _solver(timeout)
    n = len(adj)
    x = [model.NewBoolVar(f"x{i}") for i in range(n)]
    for i in range(n):
        for j in _bits(adj[i]):
            if i < j:
                model.Add(x[i] + x[j] <= 1)
    for i in range(n):
        model.Add(x[i] + sum(x[j] for j in _bits(adj[i])) >= 1)
    model.Minimize(sum(x))
    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = timeout
    solver.parameters.num_search_workers = 8
    status = solver.Solve(model)
    name = solver.StatusName(status)
    value = None
    if status in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        value = int(solver.ObjectiveValue())
    return {"status": name, "value": value}


def cp_feasible(adj: list[int], k: int, timeout: float = 60.0):
    model, cp_model = _solver(timeout)
    n = len(adj)
    x = [model.NewBoolVar(f"x{i}") for i in range(n)]
    for i in range(n):
        for j in _bits(adj[i]):
            if i < j:
                model.Add(x[i] + x[j] <= 1)
    for i in range(n):
        model.Add(x[i] + sum(x[j] for j in _bits(adj[i])) >= 1)
    model.Add(sum(x) == k)
    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = timeout
    solver.parameters.num_search_workers = 8
    status = solver.Solve(model)
    return solver.StatusName(status)


WELL_COVERED_CASES = [
    (2, 2, 2, 2),
    (2, 2, 2, 3),
    (2, 2, 2, 4),
    (2, 2, 2, 5),
    (2, 2, 3, 4),
    (2, 2, 3, 5),
    (2, 2, 4, 4),
    (2, 2, 4, 6),
    (3, 3, 3, 3),
    (2, 2, 3),
    (2, 2, 4),
    (2, 3, 3),
    (2, 3, 4),
    (3, 3, 3),
    (2, 4, 4),
    (3, 4, 4),
]


def probe_well_covered() -> dict[str, object]:
    out = {}
    for qs in WELL_COVERED_CASES:
        adj = mixed_graph(qs)
        n = len(adj)
        alpha = n // max(qs)
        r = cp_min(adj, 60)
        out[str(qs)] = {
            "n": n,
            "alpha": alpha,
            "min_maximal": r,
            "well_covered": r["value"] == alpha,
            "threshold": max(qs) >= sum(qs) - max(qs) - (len(qs) - 2),
        }
        print("wc", qs, out[str(qs)], flush=True)
    return out


def main() -> None:
    RES.mkdir(parents=True, exist_ok=True)
    out: dict[str, object] = {}

    # 11-segment: 7 + 4 diagonals, overlapping covers.
    lay11 = seg11_diagonals()
    adj11 = conflict_graph(lay11)
    out["seg11"] = {
        "segments": lay11.n_segments,
        "patterns": lay11.n_patterns,
        "max_independent": cp_max(adj11, 120),
        "min_maximal": cp_min(adj11, 60),
    }
    print("seg11", out["seg11"], flush=True)

    # 3x3 pixel grid.
    adj33 = conflict_graph(grid_pixels(3, 3))
    out["grid_3x3"] = {
        "max_independent": cp_max(adj33, 120),
        "min_maximal": cp_min(adj33, 120),
    }
    print("grid_3x3", out["grid_3x3"], flush=True)

    # 9-segment analogue K2 K2 K8 K8.
    adj9 = mixed_graph((2, 2, 8, 8))
    out["k2k2k8k8"] = {
        "patterns": len(adj9),
        "max_independent": cp_max(adj9, 120),
        "min_maximal": cp_min(adj9, 120),
        "feasible_20_32": {k: cp_feasible(adj9, k, 20) for k in range(20, 33)},
    }
    print("k2k2k8k8", out["k2k2k8k8"], flush=True)

    out["well_covered_probe"] = probe_well_covered()
    (RES / "sat.json").write_text(json.dumps(out, indent=2), encoding="utf-8")
    print("wrote", RES / "sat.json")


if __name__ == "__main__":
    main()
