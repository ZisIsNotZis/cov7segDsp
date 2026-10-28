"""Geometry-based topological signature of a lit pattern.

The signature is the pair (number of lit connected components, number of holes).
It is computed by rasterising the segment geometry, not by hand-assigning a
shape class.  This makes "does it keep the loop of a 6?" a reproducible check.

The raster parameters are part of the model: a small dilation closes the tiny
gaps between standard segments, which is how a viewer sees a closed numeral.
The defaults were chosen so the standard 0/6/9 have one hole, 8 has two, and
1/2/3/4/5/7 have none.
"""
from __future__ import annotations

from dataclasses import dataclass
from functools import lru_cache

from .fonts import STANDARD
from .layouts import seven_seg
from .model import Layout


@dataclass(frozen=True)
class Topology:
    components: int
    holes: int

    def __str__(self) -> str:
        return f"{self.components}c/{self.holes}h"


def _render(layout: Layout, pattern: int, size: int, thickness: int) -> list[bytearray]:
    if not layout.geometry:
        raise ValueError(f"layout {layout.name!r} has no geometry")
    grid = [bytearray(size) for _ in range(size)]
    r = thickness // 2
    for i, name in enumerate(layout.segments):
        if not (pattern >> i) & 1:
            continue
        x1, y1, x2, y2 = layout.geometry[name]
        x1, y1, x2, y2 = (int(v * (size - 1)) for v in (x1, y1, x2, y2))
        n = max(abs(x2 - x1), abs(y2 - y1), 1)
        for k in range(n + 1):
            cx = x1 + (x2 - x1) * k // n
            cy = y1 + (y2 - y1) * k // n
            for yy in range(max(0, cy - r), min(size, cy + r + 1)):
                dy = yy - cy
                for xx in range(max(0, cx - r), min(size, cx + r + 1)):
                    dx = xx - cx
                    if dx * dx + dy * dy <= r * r:
                        grid[yy][xx] = 1
    return grid


def _components(grid: list[bytearray], target: int) -> int:
    size = len(grid)
    seen = [bytearray(size) for _ in range(size)]
    count = 0
    for y in range(size):
        for x in range(size):
            if grid[y][x] != target or seen[y][x]:
                continue
            count += 1
            stack = [(x, y)]
            seen[y][x] = 1
            while stack:
                cx, cy = stack.pop()
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nx, ny = cx + dx, cy + dy
                    if (
                        0 <= nx < size
                        and 0 <= ny < size
                        and grid[ny][nx] == target
                        and not seen[ny][nx]
                    ):
                        seen[ny][nx] = 1
                        stack.append((nx, ny))
    return count


def _holes(grid: list[bytearray]) -> int:
    size = len(grid)
    seen = [bytearray(size) for _ in range(size)]
    holes = 0
    for y in range(size):
        for x in range(size):
            if grid[y][x] or seen[y][x]:
                continue
            stack = [(x, y)]
            seen[y][x] = 1
            touches_border = False
            while stack:
                cx, cy = stack.pop()
                if cx in (0, size - 1) or cy in (0, size - 1):
                    touches_border = True
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nx, ny = cx + dx, cy + dy
                    if (
                        0 <= nx < size
                        and 0 <= ny < size
                        and not grid[ny][nx]
                        and not seen[ny][nx]
                    ):
                        seen[ny][nx] = 1
                        stack.append((nx, ny))
            if not touches_border:
                holes += 1
    return holes


@lru_cache(maxsize=4096)
def _signature_cached(layout_name: str, pattern: int, size: int, thickness: int) -> Topology:
    layout = _LAYOUTS[layout_name]
    grid = _render(layout, pattern, size, thickness)
    return Topology(_components(grid, 1), _holes(grid))


_LAYOUTS: dict[str, Layout] = {}


def _register(layout: Layout) -> None:
    _LAYOUTS[layout.name] = layout


def signature(
    layout: Layout,
    pattern: int,
    size: int = 120,
    thickness: int = 10,
) -> Topology:
    _register(layout)
    return _signature_cached(layout.name, pattern, size, thickness)


def standard_signatures(size: int = 120, thickness: int = 10) -> dict[str, Topology]:
    from .fonts import as_patterns

    layout = seven_seg()
    pats = as_patterns(STANDARD)
    return {
        label: signature(layout, p, size, thickness)
        for label, p in pats.items()
    }


def topology_table(table: dict[str, str], size: int = 120, thickness: int = 10):
    from .fonts import as_patterns

    layout = seven_seg()
    pats = as_patterns(table)
    std = standard_signatures(size, thickness)
    out = {}
    for label, p in pats.items():
        sig = signature(layout, p, size, thickness)
        out[label] = {
            "signature": str(sig),
            "standard": str(std[label]),
            "match": sig == std[label],
        }
    return out


def mismatches(table: dict[str, str], size: int = 120, thickness: int = 10) -> list[str]:
    return [k for k, v in topology_table(table, size, thickness).items() if not v["match"]]


if __name__ == "__main__":
    from .fonts import DOC_DEC, DOC_HEX, MIN_DEC, MIN_HEX

    print("standard:", {k: str(v) for k, v in standard_signatures().items()})
    for name, table in [
        ("doc_dec", DOC_DEC),
        ("doc_hex", DOC_HEX),
        ("min_dec", MIN_DEC),
        ("min_hex", MIN_HEX),
    ]:
        print(name, "mismatches:", mismatches(table))
