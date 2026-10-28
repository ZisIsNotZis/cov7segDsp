"""Reproduce the 7-segment claims in docs/FOUNDATION.md.

Run:
    python -m foundation.verify_sevenseg
"""
from __future__ import annotations

from . import block, charset
from .fonts import DOC_DEC, DOC_HEX, MIN_DEC, MIN_HEX, STANDARD
from .layouts import seven_seg
from .model import patterns_from_strings

PER_G_EXPECTED = [8, 11, 12, 13, 14, 15, 16]
GLOBAL_EXPECTED = [16] + list(range(19, 33))
PER_G_COUNTS = {
    8: 144,
    11: 4608,
    12: 149184,
    13: 213120,
    14: 178560,
    15: 50688,
    16: 7704,
}


def main() -> None:
    per_g = block.counts_by_size(4, 4)
    glob = block.convolve(per_g)
    assert sorted(per_g) == PER_G_EXPECTED, sorted(per_g)
    assert sorted(glob) == GLOBAL_EXPECTED, sorted(glob)
    assert per_g == PER_G_COUNTS, per_g
    assert sum(per_g.values()) == 604008
    assert sum(glob.values()) == 604008**2
    assert glob[16] == 144**2
    assert glob[32] == 7704**2
    print("7-seg sizes/counts: OK")

    checks = charset.all_font_checks()
    for name in ("doc_dec", "doc_hex", "min_dec", "min_hex"):
        assert checks[name]["ok"], (name, checks[name])
        assert all(checks[name]["projections_unique"].values()), name
    print("font tables valid: OK")

    layout = seven_seg()
    # The ASCII figure in the source note draws hex 9 with d lit.  That
    # pattern conflicts with 2 and 5; the table's 1100011 is the correct one.
    art9 = patterns_from_strings(layout, ["1101011"])[0]
    table = patterns_from_strings(layout, list(DOC_HEX.values()))
    labels = list(DOC_HEX)
    bad = []
    for label, p in zip(labels, table):
        if label == "9":
            continue
        for cname, c in layout.covers.items():
            if (art9 & ~c) == (p & ~c):
                bad.append((label, cname))
    assert bad, "expected the drawn 9 to conflict"
    print("hex 9 ASCII figure conflict:", bad)

    # Standard F (with f) conflicts with A and E; the table's F removes f.
    std_f = patterns_from_strings(layout, [STANDARD["F"]])[0]
    bad_f = []
    for label, p in zip(labels, table):
        if label == "F":
            continue
        for cname, c in layout.covers.items():
            if (std_f & ~c) == (p & ~c):
                bad_f.append((label, cname))
    assert bad_f, "expected standard F to conflict"
    print("hex F ASCII figure conflict:", bad_f)

    assert charset.seven_seg_capacity() == 32
    assert len(DOC_DEC) == 10 and len(DOC_HEX) == 16
    assert sum(sum(a != b for a, b in zip(v, STANDARD[k])) for k, v in DOC_DEC.items()) == 5
    assert sum(sum(a != b for a, b in zip(v, STANDARD[k])) for k, v in DOC_HEX.items()) == 11
    assert sum(sum(a != b for a, b in zip(v, STANDARD[k])) for k, v in MIN_DEC.items()) == 4
    assert sum(sum(a != b for a, b in zip(v, STANDARD[k])) for k, v in MIN_HEX.items()) == 8
    print("flip counts: OK")

    for row in charset.capacity_table():
        print(row)
    print("all 7-seg checks passed")


if __name__ == "__main__":
    main()
