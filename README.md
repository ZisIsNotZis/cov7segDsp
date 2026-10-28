<p align="center">
  <img src="assets/logo.svg" alt="cov7seg" width="360">
</p>

# cov7seg

**Which glyph sets stay unambiguous when any one side of a seven-segment display is covered?** This repository answers that exactly, then generalizes the answer to other grids and character sets.

Status: **M1 — foundation**.  The exact combinatorics, the general engine, the capacity bound and the first recognisability model are here.  The interactive lab is the next milestone.

The motivating case: a thin object covers one side of a traffic countdown.  The outermost line disappears, and the remaining pattern can be a different valid digit.  The 2024 *Journal of Vision* study of occluded countdown numerals documents the resulting 6/8 bistability.

## What the foundation found

| result | value |
|---|---|
| maximum unambiguous 7-segment set | **32** |
| minimum maximal set | **16** |
| attainable maximal sizes | **16, 19–32** (17 and 18 do not exist) |
| per-`g` sizes (64 patterns) | **8, 11–16** (9 and 10 do not exist) |
| maximal sets per `g` / globally | **604,008** / **364,825,664,064** |
| 7-segment character capacity | **32** (decimal and hex fit; 36-letter alphanumeric and Base64 do not) |
| construction rule | 4 cells × a matching of `K₄,₄`, plus cross-cell disjointness and hole-covering |

The 9/10 gap is not a mysterious sequence.  The feasible cell-size patterns are a finite grammar; 9 and 10 are simply absent.  A one-parameter family `K₂ □ K₂ □ K_q □ K_q` shows the gap moving and sometimes disappearing (some members are well-covered).  See [docs/FOUNDATION.md](docs/FOUNDATION.md) for the tables, proofs sketches, and open questions.

<p align="center">
  <img src="foundation/plots/sevenseg_global_counts.svg" alt="7-segment global maximal-set counts by size" width="720">
</p>

## Quick start

```bash
git clone <this repo>
cd cov7segDsp
python -m foundation.verify_sevenseg
python -m foundation.experiments
```

No third-party package is needed for these two commands.  The exact mixed-Hamming counts use a small C++ helper that is compiled on first use; the Python fallback handles small alphabets.  For the hard SAT cases:

```bash
uv run --with ortools python -m foundation.exact
```

## What it can do now

- **Exact 7-segment enumeration.**  Counts of maximal unambiguous sets by size, the min/max, the 9/10 gap, and the construction grammar.
- **General layouts.**  Mixed Hamming `K₂ □ K₂ □ K_q □ K_q`, overlapping-cover pixel grids (`3×3`, `3×4`), and a 7+4 diagonal layout (capacity 128).
- **Character-set capacity.**  Check a glyph table, list conflicts and the offending cover, and compare a set size with the layout capacity.
- **Font comparison.**  The source note’s decimal/hex tables, the exact minimum-flip tables, flip counts, and a visible+occluded recognisability baseline.
- **Reproducible results.**  `foundation/results/foundation.json` and SVG count/existence plots.
- **An honest record of open cases.**  The 3×3 minimum is bounded (21 ≤ min ≤ 32, best feasible 32); the 9-segment minimum is open.

## Architecture

```
foundation/model.py       segments, covers, projections, conflicts
foundation/layouts.py     7-seg, mixed Hamming, pixel grids
foundation/block.py       exact K2 K2 Kq Kq enumeration
foundation/exact.py       general conflict graph + MIS + optional CP-SAT
foundation/charset.py     character-set validity and capacity
foundation/recognize.py   visible + occluded weighted-distance baseline
foundation/experiments.py results JSON + SVG plots
docs/                     problem, Goal, requirements, product, roadmap, foundation note
```

The foundation is deliberately **layout-parametric**: a new grid or character set is data (a segment list, cover masks, a label→pattern table), not a rewrite.  That is the requirement that keeps M2/M3 from redoing the base.

## How to develop

- The headline claims are guarded by `python -m foundation.verify_sevenseg`.
- Regenerate results and plots with `python -m foundation.experiments`.
- The fast exact counts are in `foundation/count_mixed.cpp`; the C++ helper is built on demand.
- Optional sat queries use `uv run --with ortools`.
- The docs are the source of truth; if a number changes, change the script and the doc in the same commit.

## Implemented vs planned

| area | status |
|---|---|
| 7-segment exact combinatorics + construction grammar | done |
| General mixed-Hamming family (small alphabets) | done |
| Pixel-grid support / exact max + bounds | done |
| Character-set capacity | done |
| Visible+occluded recognisability baseline | done (weights provisional) |
| Calibrated recognisability (quiz, topological signature) | planned — M2 |
| Interactive occlusion lab + design quiz | planned — M3 |
| 14-segment / larger grids / algorithmic design engine | planned — M4 |
| Release site / public demo | planned — M5 |

## License

AGPL-3.0-or-later.  See [LICENSE](LICENSE).

## References

- Luo et al., *Bistable perception of symbolic numbers*, Journal of Vision 24(9):12, 2024 — [DOI](https://doi.org/10.1167/jov.24.9.12).
- van Nes & Bouma, *On the Legibility of Segmented Numerals*, Human Factors 22(4), 1980 — [Semantic Scholar](https://www.semanticscholar.org/paper/On-the-Legibility-of-Segmented-Numerals-Nes-Bouma/a693a1d8748b71c00e3b66322cee8bcdbf30fa1e).
- Thimbleby, *Reasons to Question Seven Segment Displays* — [PDF](https://harold.thimbleby.net/cv/files/digitsCHI.pdf).
- Well-covered graphs and Hamming-graph independent domination are the known graph-theory background; see `docs/FOUNDATION.md` for the discussion and the novelty caveat.
