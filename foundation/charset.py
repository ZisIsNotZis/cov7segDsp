"""Character-set capacity and validity checks."""
from __future__ import annotations

import math

from . import block
from .fonts import (
    DOC_DEC,
    DOC_HEX,
    MIN_DEC,
    MIN_HEX,
    STANDARD,
    as_patterns,
)
from .layouts import seven_seg, seven_seg_per_g
from .model import Layout, is_valid_set

# Alphabets that matter for the design-space discussion.
CHARSETS = {
    "decimal 0-9": list("0123456789"),
    "hex 0-9 A-F": list("0123456789AbCdEF"),
    "alphanumeric, case-insensitive": list("0123456789") + [chr(c) for c in range(ord("A"), ord("Z") + 1)],
    "alphanumeric, case-sensitive": list("0123456789") + [chr(c) for c in range(ord("A"), ord("Z") + 1)] + [chr(c) for c in range(ord("a"), ord("z") + 1)],
    "Base64": list("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"),
}


def seven_seg_capacity() -> int:
    """Maximum number of unambiguous patterns in the full 7-seg model."""
    per_g = max(block.existence_set(4, 4))
    return per_g * 2  # the never-covered g coordinate gives two copies


def per_g_capacity() -> int:
    return max(block.existence_set(4, 4))


def capacity_table() -> list[dict[str, object]]:
    cap = seven_seg_capacity()
    rows = []
    for name, labels in CHARSETS.items():
        rows.append(
            {
                "charset": name,
                "size": len(labels),
                "capacity": cap,
                "fits": len(labels) <= cap,
            }
        )
    return rows


def check_table(table: dict[str, str]) -> dict[str, object]:
    layout = seven_seg()
    pats = as_patterns(table)
    ok, bad = is_valid_set(layout, pats.values())
    return {
        "ok": ok,
        "size": len(pats),
        "conflicts": [
            {"a": a, "b": b, "cover": c}
            for a, b, c in bad
        ],
        "projections_unique": {
            name: len({p & ~m for p in pats.values()}) == len(pats)
            for name, m in layout.covers.items()
        },
    }


def all_font_checks() -> dict[str, object]:
    return {
        "standard": check_table(STANDARD),
        "doc_dec": check_table(DOC_DEC),
        "doc_hex": check_table(DOC_HEX),
        "min_dec": check_table(MIN_DEC),
        "min_hex": check_table(MIN_HEX),
    }


if __name__ == "__main__":
    print("7-seg capacity:", seven_seg_capacity())
    for row in capacity_table():
        print(row)
    for name, result in all_font_checks().items():
        print(name, result)
