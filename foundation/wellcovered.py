"""The well-covered criterion for Cartesian products of complete graphs.

Theorem.  Let G = K_{n1} □ ... □ K_{nd} with n1 >= n2 >= ... >= nd >= 2.
Then G is well-covered iff

    n1 > sum_{i=2..d} (n_i - 1),

equivalently 2*n1 > sum(n_i) - d + 1.

Proof sketch (the full proof is in docs/FOUNDATION.md §3.2):

* If n1 > sum_{i>=2}(n_i-1), suppose a maximal independent set S misses a
  line L in coordinate 1.  For each of the n1 values of coordinate 1,
  maximality needs a selected vertex on a distinct neighbour of L's other
  coordinates.  But that vertex has only sum_{i>=2}(n_i-1) neighbours, fewer
  than n1 -- contradiction.  So every line is met and |S| = N/n1.

* If n1 <= sum_{i>=2}(n_i-1), choose a vertex y in the product of the other
  coordinates and n1 distinct neighbours y_1,...,y_{n1}.  The set
  {(x, y_x) : x=1..n1} is independent and dominates the line over y.  Extend
  it to a maximal independent set; it still misses that line, so it has size
  at most N/n1 - 1 < alpha(G).  Hence G is not well-covered.
"""
from __future__ import annotations

from pathlib import Path


def criterion(qs: tuple[int, ...]) -> bool:
    """True iff K_{q1} □ ... □ K_{qd} is well-covered."""
    qs = tuple(sorted(qs, reverse=True))
    n1 = qs[0]
    return n1 > sum(q - 1 for q in qs[1:])


def threshold(qs: tuple[int, ...]) -> str:
    qs = tuple(sorted(qs, reverse=True))
    return f"{qs[0]} > {sum(q - 1 for q in qs[1:])}  (sum of other q_i - 1)"


def verify_block_cases() -> list[tuple[tuple[int, ...], bool, bool]]:
    """Compare the criterion with the exact existence set for K2 K2 Kq3 Kq4."""
    from . import block

    rows = []
    for q3, q4 in [(2, 2), (2, 3), (2, 4), (3, 3), (3, 4), (4, 4)]:
        qs = (2, 2, q3, q4)
        exact = len(block.existence_set(q3, q4)) == 1
        rows.append((qs, criterion(qs), exact))
    return rows


def verify_sat_probe(path: str | Path | None = None) -> list[tuple[str, bool, bool]]:
    """Compare the criterion with the CP-SAT well-covered probe, if present."""
    import ast
    import json

    if path is None:
        path = Path(__file__).resolve().parent / "results" / "sat.json"
    path = Path(path)
    if not path.exists():
        return []
    data = json.loads(path.read_text(encoding="utf-8"))
    rows = []
    for key, value in data.get("well_covered_probe", {}).items():
        qs = ast.literal_eval(key)
        rows.append((key, criterion(qs), bool(value["well_covered"])))
    return rows


if __name__ == "__main__":
    for qs, c, e in verify_block_cases():
        print(qs, "criterion", c, "exact", e)
    for qs, c, e in verify_sat_probe():
        print(qs, "criterion", c, "sat", e)
