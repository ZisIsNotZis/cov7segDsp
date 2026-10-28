"""Exact and bounded solvers for small general layouts.

The mixed-Hamming family has a much faster dedicated solver in ``block.py``.
This module is for layouts with overlapping covers (pixel grids, custom masks)
where the conflict graph is not a Cartesian product.
"""
from __future__ import annotations

import math
import sys
from collections import Counter

from .model import Layout, conflict_graph


def _popcount(x: int) -> int:
    return x.bit_count()


def closed_neighborhoods(adj: list[int]) -> list[int]:
    return adj[:]


def max_closed_neighborhood(adj: list[int]) -> int:
    return max(a.bit_count() for a in adj)


def domination_lower_bound(adj: list[int]) -> int:
    """Ceiling of N / max closed-neighborhood size."""
    n = len(adj)
    return math.ceil(n / max_closed_neighborhood(adj))


def greedy_maximal_set(adj: list[int], order: list[int] | None = None) -> list[int]:
    n = len(adj)
    allmask = (1 << n) - 1
    undominated = allmask
    available = allmask
    chosen: list[int] = []
    order = order or list(range(n))
    while undominated:
        best = -1
        best_cov = -1
        for v in order:
            if not (available >> v) & 1:
                continue
            cov = (adj[v] & undominated).bit_count()
            if cov > best_cov:
                best_cov = cov
                best = v
        if best < 0:
            break
        chosen.append(best)
        undominated &= ~adj[best]
        available &= ~adj[best]
    return chosen


def max_independent_set(adj: list[int]) -> list[int]:
    """Exact maximum independent set via branch and bound with greedy coloring.

    We find a maximum clique in the complement graph.  ``comp[v]`` is the set
    of vertices that can coexist with ``v`` (non-neighbours in the conflict
    graph).
    """
    n = len(adj)
    allmask = (1 << n) - 1
    comp = [allmask & ~adj[v] for v in range(n)]
    best: list[int] = []
    best_size = 0

    def color_sort(p: int):
        """Greedy colouring of the complement; returns (order, colour bound)."""
        order: list[int] = []
        bounds: list[int] = []
        colour = 0
        while p:
            colour += 1
            q = p
            while q:
                b = q & -q
                v = b.bit_length() - 1
                p &= ~b
                q &= ~b
                q &= ~comp[v]
                order.append(v)
                bounds.append(colour)
        return order, bounds

    def expand(r: int, p: int, size: int):
        nonlocal best, best_size
        if p == 0:
            if size > best_size:
                best_size = size
                best = [i for i in range(n) if (r >> i) & 1]
            return
        order, bounds = color_sort(p)
        for idx in range(len(order) - 1, -1, -1):
            if size + bounds[idx] <= best_size:
                return
            v = order[idx]
            b = 1 << v
            expand(r | b, p & comp[v], size + 1)
            p &= ~b

    expand(0, allmask, 0)
    return best


def count_maximal_sets(adj: list[int], limit: int | None = None) -> Counter:
    """Enumerate maximal independent sets by size (Bron-Kerbosch on complement)."""
    n = len(adj)
    allmask = (1 << n) - 1
    comp = [allmask & ~adj[v] for v in range(n)]
    counts: Counter = Counter()
    sys.setrecursionlimit(max(10000, n * 4 + 100))

    def bk(r: int, p: int, x: int):
        if limit is not None and sum(counts.values()) >= limit:
            return
        if p == 0 and x == 0:
            counts[r.bit_count()] += 1
            return
        u = p | x
        pivot = -1
        pivot_score = -1
        t = u
        while t:
            b = t & -t
            v = b.bit_length() - 1
            t ^= b
            score = _popcount(p & comp[v])
            if score > pivot_score:
                pivot_score = score
                pivot = v
        candidates = p & ~comp[pivot] if pivot >= 0 else p
        t = candidates
        while t:
            b = t & -t
            v = b.bit_length() - 1
            t ^= b
            bk(r | b, p & comp[v], x & comp[v])
            p &= ~b
            x |= b

    bk(0, allmask, 0)
    return counts


def _cp_model(adj: list[int], k: int | None):
    try:
        from ortools.sat.python import cp_model
    except ImportError as exc:  # pragma: no cover
        raise RuntimeError(
            "ortools is required for SAT queries; run "
            "`uv run --with ortools python ...`"
        ) from exc

    n = len(adj)
    model = cp_model.CpModel()
    x = [model.NewBoolVar(f"x{i}") for i in range(n)]
    for i in range(n):
        for j in adj[i]:
            if i < j:
                model.Add(x[i] + x[j] <= 1)
    for i in range(n):
        model.Add(x[i] + sum(x[j] for j in adj[i]) >= 1)
    if k is not None:
        model.Add(sum(x) == k)
    else:
        model.Minimize(sum(x))
    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = 120
    solver.parameters.num_search_workers = 8
    status = solver.Solve(model)
    name = solver.StatusName(status)
    if status in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        chosen = [i for i in range(n) if solver.Value(x[i])]
        return name, chosen
    return name, None


def min_maximal_set(adj: list[int]) -> tuple[str, list[int] | None]:
    return _cp_model(adj, None)


def exists_maximal_set_of_size(adj: list[int], k: int) -> str:
    return _cp_model(adj, k)[0]


def existence_sizes(adj: list[int], kmin: int, kmax: int) -> dict[int, str]:
    return {k: exists_maximal_set_of_size(adj, k) for k in range(kmin, kmax + 1)}


def layout_graph(layout: Layout) -> list[int]:
    return conflict_graph(layout)


if __name__ == "__main__":
    from .layouts import grid_pixels

    lay = grid_pixels(3, 3)
    adj = layout_graph(lay)
    print("layout", lay.name, "patterns", len(adj), "max closed", max_closed_neighborhood(adj))
    print("max independent", len(max_independent_set(adj)))
    print("greedy maximal", len(greedy_maximal_set(adj)))
    print("domination lower bound", domination_lower_bound(adj))
    print("min maximal (CP-SAT)", min_maximal_set(adj)[0])
