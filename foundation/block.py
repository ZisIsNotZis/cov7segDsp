"""Exact enumeration for the mixed Hamming family K2 x K2 x Kq3 x Kq4.

The implementation groups the first two coordinates into four cells.  Inside
each cell the selected (coordinate3, coordinate4) pairs form a matching of
K_{q3,q4}.  Adjacent cells may not share an edge; the holes of a cell (unused
row x unused column) must be covered by the two adjacent cells.

The C++ helper is the fast path.  A pure-Python path is kept for environments
without g++ and for small cross-checks.
"""
from __future__ import annotations

import json
import shutil
import subprocess
from dataclasses import dataclass
from pathlib import Path

ROOT = Path(__file__).resolve().parent
RESULTS = ROOT / "results"
CPP = ROOT / "count_mixed.cpp"
BIN = RESULTS / "count_mixed"


@dataclass(frozen=True)
class Matching:
    edges: int
    holes: int
    size: int


def matchings(qL: int, qR: int) -> list[Matching]:
    out: dict[int, Matching] = {}

    def rec(l: int, used_r: int, used_l: int, edges: int, size: int):
        if l == qL:
            holes = 0
            for a in range(qL):
                if used_l >> a & 1:
                    continue
                for b in range(qR):
                    if not (used_r >> b & 1):
                        holes |= 1 << (a * qR + b)
            out[edges] = Matching(edges, holes, size)
            return
        rec(l + 1, used_r, used_l, edges, size)
        for b in range(qR):
            if not (used_r >> b & 1):
                rec(
                    l + 1,
                    used_r | (1 << b),
                    used_l | (1 << l),
                    edges | (1 << (l * qR + b)),
                    size + 1,
                )

    rec(0, 0, 0, 0, 0)
    return [out[k] for k in sorted(out)]


def count_py(q3: int, q4: int) -> dict[str, object]:
    ms = matchings(q3, q4)
    m = len(ms)
    counts: dict[int, int] = {}
    total = 0
    for A in range(m):
        for B in range(m):
            if ms[A].edges & ms[B].edges:
                continue
            for C in range(m):
                if ms[A].edges & ms[C].edges:
                    continue
                eBC = ms[B].edges | ms[C].edges
                if ms[A].holes & ~eBC:
                    continue
                for D in range(m):
                    if ms[B].edges & ms[D].edges:
                        continue
                    if ms[C].edges & ms[D].edges:
                        continue
                    eAD = ms[A].edges | ms[D].edges
                    if ms[B].holes & ~eAD:
                        continue
                    if ms[C].holes & ~eAD:
                        continue
                    if ms[D].holes & ~eBC:
                        continue
                    k = ms[A].size + ms[B].size + ms[C].size + ms[D].size
                    counts[k] = counts.get(k, 0) + 1
                    total += 1
    return {
        "q1": 2,
        "q2": 2,
        "q3": q3,
        "q4": q4,
        "matchings": m,
        "total": total,
        "counts": {str(k): v for k, v in sorted(counts.items())},
    }


def _ensure_binary() -> bool:
    if BIN.exists():
        return True
    if shutil.which("g++") is None:
        return False
    RESULTS.mkdir(parents=True, exist_ok=True)
    subprocess.run(
        ["g++", "-O3", "-march=native", "-o", str(BIN), str(CPP)],
        check=True,
    )
    return True


def count(q3: int, q4: int, force_python: bool = False) -> dict[str, object]:
    if not force_python and _ensure_binary():
        out = subprocess.check_output([str(BIN), str(q3), str(q4)], text=True)
        return json.loads(out)
    return count_py(q3, q4)


def counts_by_size(q3: int, q4: int, **kw) -> dict[int, int]:
    return {int(k): int(v) for k, v in count(q3, q4, **kw)["counts"].items()}


def existence_set(q3: int, q4: int, **kw) -> list[int]:
    return sorted(counts_by_size(q3, q4, **kw))


def convolve(counts: dict[int, int]) -> dict[int, int]:
    """Add one free binary coordinate (e.g. the 7-seg middle segment g)."""
    out: dict[int, int] = {}
    for i, a in counts.items():
        for j, b in counts.items():
            out[i + j] = out.get(i + j, 0) + a * b
    return dict(sorted(out.items()))
