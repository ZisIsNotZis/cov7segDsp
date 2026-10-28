"""Plain-assert test suite; run with `python tests/test_foundation.py`."""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from foundation import block, charset, recognize  # noqa: E402
from foundation.exact import layout_graph, max_independent_set  # noqa: E402
from foundation.fonts import DOC_DEC, DOC_HEX, MIN_DEC, MIN_HEX  # noqa: E402
from foundation.layouts import grid_pixels, seven_seg, seven_seg_per_g  # noqa: E402
from foundation.topology import signature, standard_signatures  # noqa: E402
from foundation.wellcovered import criterion, verify_block_cases, verify_sat_probe  # noqa: E402
from foundation.model import is_valid_set  # noqa: E402


def test_seven_seg():
    per_g = block.counts_by_size(4, 4)
    glob = block.convolve(per_g)
    assert sorted(per_g) == [8, 11, 12, 13, 14, 15, 16]
    assert sorted(glob) == [16] + list(range(19, 33))
    assert per_g[8] == 144 and per_g[16] == 7704
    assert sum(per_g.values()) == 604008
    assert glob[16] == 144**2 and glob[32] == 7704**2
    assert sum(glob.values()) == 604008**2


def test_fonts():
    checks = charset.all_font_checks()
    for name in ("doc_dec", "doc_hex", "min_dec", "min_hex"):
        assert checks[name]["ok"], name
        assert all(checks[name]["projections_unique"].values()), name
    assert not checks["standard"]["ok"]
    assert charset.seven_seg_capacity() == 32


def test_family():
    assert block.counts_by_size(2, 2) == {4: 24, 5: 16, 8: 2}
    assert block.counts_by_size(2, 3) == {6: 96, 8: 114}
    assert block.counts_by_size(2, 4) == {8: 2652}
    assert block.counts_by_size(3, 3) == {
        6: 36, 7: 288, 8: 144, 9: 144, 10: 1260, 11: 144, 12: 36
    }


def test_mis():
    adj = layout_graph(seven_seg_per_g())
    assert len(max_independent_set(adj)) == 16
    # Round-trip a layout through the JSON-friendly form.
    lay = seven_seg()
    assert lay.to_dict()["segments"] == list(lay.segments)
    assert lay.from_dict(lay.to_dict()).covers == lay.covers


def test_wellcovered():
    assert criterion((2, 2, 2, 4)) is True
    assert criterion((2, 2, 2, 3)) is False
    assert criterion((2, 2, 4, 4)) is False
    assert criterion((2, 2, 2, 5)) is True
    assert all(c == e for _, c, e in verify_block_cases())
    assert all(c == e for _, c, e in verify_sat_probe())


def test_topology():
    std = standard_signatures()
    for d in "069":
        assert std[d].holes == 1, (d, std[d])
    assert std["8"].holes == 2
    for d in "123457":
        assert std[d].holes == 0, (d, std[d])
    assert signature(seven_seg(), 0x7F).holes == 2
    from foundation.fonts import DOC_DEC, OPT_DEC, TOP0_DEC, MIN_MISMATCH_DEC
    from foundation.recognize import set_score

    assert set_score(DOC_DEC)["topology_mismatches"] == ["6", "8"]
    assert set_score(OPT_DEC)["topology_mismatches"] == ["8"]
    assert set_score(TOP0_DEC)["topology_mismatches"] == []
    assert set_score(MIN_MISMATCH_DEC)["topology_mismatches"] == []
    assert set_score(MIN_MISMATCH_DEC)["mean"] < 0.2


def test_grid():
    adj = layout_graph(grid_pixels(3, 3))
    assert len(max_independent_set(adj)) == 64


def test_recognition():
    for table in (DOC_DEC, DOC_HEX, MIN_DEC, MIN_HEX):
        s = recognize.set_score(table)
        assert 0.0 <= s["min"] <= s["mean"] <= 1.0
        assert len(s["per_glyph"]) == len(table)


def test_valid_set():
    layout = seven_seg()
    from foundation.fonts import as_patterns

    ok, bad = is_valid_set(layout, as_patterns(DOC_DEC).values())
    assert ok and not bad


if __name__ == "__main__":
    test_seven_seg()
    test_fonts()
    test_family()
    test_mis()
    test_wellcovered()
    test_topology()
    test_grid()
    test_recognition()
    test_valid_set()
    print("all tests passed")
