"""General segmented-display model.

A layout is a set of binary segments plus a family of *covers*.  Covering
side c removes the segment set ``covers[c]`` from the visible pattern.
Two patterns conflict iff some cover makes their projections equal.

This module is deliberately independent of any particular display.  The
7-segment geometry and the mixed-Hamming family are data in ``layouts.py``.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Iterable, Mapping, Sequence


@dataclass(frozen=True)
class Layout:
    name: str
    segments: tuple[str, ...]
    covers: Mapping[str, int]
    # Segments that are never removed by any cover.  They are not needed for
    # conflict detection, but are useful when explaining the product structure.
    free: int = 0
    # Optional rendering geometry: segment -> (x1, y1, x2, y2) in a 0..1 box.
    geometry: Mapping[str, tuple[float, float, float, float]] = field(
        default_factory=dict
    )

    @property
    def n_segments(self) -> int:
        return len(self.segments)

    @property
    def n_patterns(self) -> int:
        return 1 << self.n_segments

    def index(self, segment: str) -> int:
        return self.segments.index(segment)

    def mask(self, names: Iterable[str]) -> int:
        m = 0
        for name in names:
            m |= 1 << self.index(name)
        return m

    def project(self, pattern: int, cover: str) -> int:
        return pattern & ~self.covers[cover]

    def conflict(self, p: int, q: int) -> bool:
        if p == q:
            return True
        return any(
            (p & ~c) == (q & ~c) for c in self.covers.values()
        )

    def projection_map(self, cover: str) -> dict[int, int]:
        """Map each pattern to its visible projection under ``cover``."""
        return {p: p & ~self.covers[cover] for p in range(self.n_patterns)}

    def literal(self, pattern: int) -> tuple[int, ...]:
        return tuple((pattern >> i) & 1 for i in range(self.n_segments))

    @classmethod
    def from_dict(cls, data: dict) -> "Layout":
        """Build a layout from JSON-friendly data.

        ``covers`` maps a cover name to a list of segment names (or an integer
        bitmask).  ``free`` is a list of segment names or an integer mask.
        """
        segments = tuple(data["segments"])
        index = {s: i for i, s in enumerate(segments)}

        def to_mask(value) -> int:
            if isinstance(value, int):
                return value
            m = 0
            for name in value:
                m |= 1 << index[name]
            return m

        covers = {name: to_mask(value) for name, value in data["covers"].items()}
        free = to_mask(data.get("free", []))
        return cls(data.get("name", "layout"), segments, covers, free=free)

    def to_dict(self) -> dict:
        def names(mask: int) -> list[str]:
            return [s for i, s in enumerate(self.segments) if (mask >> i) & 1]

        return {
            "name": self.name,
            "segments": list(self.segments),
            "covers": {k: names(v) for k, v in self.covers.items()},
            "free": names(self.free),
        }


def conflict_graph(layout: Layout) -> list[int]:
    """Adjacency bitmasks of the conflict graph (including self-loops)."""
    n = layout.n_patterns
    adj = [1 << i for i in range(n)]
    for p in range(n):
        for q in range(p + 1, n):
            if layout.conflict(p, q):
                adj[p] |= 1 << q
                adj[q] |= 1 << p
    return adj


def is_valid_set(layout: Layout, patterns: Iterable[int]) -> tuple[bool, list[tuple[int, int, str]]]:
    """Check the hard no-conflict condition.

    Returns ``(ok, conflicts)``.  A conflict is ``(p, q, cover)`` where the two
    distinct patterns have the same projection under ``cover``.
    """
    pats = list(dict.fromkeys(patterns))
    bad: list[tuple[int, int, str]] = []
    for i, p in enumerate(pats):
        for q in pats[i + 1 :]:
            for name, c in layout.covers.items():
                if (p & ~c) == (q & ~c):
                    bad.append((p, q, name))
    return (not bad, bad)


def projection_classes(layout: Layout, cover: str) -> dict[int, list[int]]:
    """All pattern classes that become equal when ``cover`` is applied."""
    classes: dict[int, list[int]] = {}
    for p in range(layout.n_patterns):
        classes.setdefault(p & ~layout.covers[cover], []).append(p)
    return classes


def capacity_upper_bound(layout: Layout) -> int:
    """Pigeonhole upper bound from the largest cover class.

    For every cover, each projection class may contribute at most one chosen
    pattern.  The smallest number of classes over the covers is an upper bound.
    """
    n = layout.n_patterns
    best = n
    for name in layout.covers:
        classes = projection_classes(layout, name)
        best = min(best, len(classes))
    return best


def describe_pattern(layout: Layout, pattern: int) -> str:
    return "".join(
        "1" if (pattern >> i) & 1 else "0" for i in range(layout.n_segments)
    )


def patterns_from_strings(layout: Layout, strings: Sequence[str]) -> list[int]:
    out = []
    for s in strings:
        if len(s) != layout.n_segments:
            raise ValueError(f"{s!r} has length {len(s)}, expected {layout.n_segments}")
        v = 0
        for i, ch in enumerate(s):
            if ch not in "01":
                raise ValueError(f"{s!r} is not binary")
            if ch == "1":
                v |= 1 << i
        out.append(v)
    return out
