# Implementation

## Layout

```
foundation/
  model.py          layout, projections, conflicts, capacity bound
  layouts.py        7-seg, per-g K2 K2 K4 K4, mixed Hamming, pixel grids
  fonts.py          standard / doc / min-flip font tables
  block.py          exact K2 K2 Kq Kq enumeration (4-cell matching model)
  count_mixed.cpp   C++ helper for the exact counts (compiled on first use)
  exact.py          general conflict graph, MIS, lower bound, optional CP-SAT
  sat_experiments.py optional CP-SAT runs for 11-seg, 3x3 and 9-seg
  wellcovered.py    the well-covered criterion and its verification
  topology.py       geometry-based (components, holes) signature
  font_opt.py       optional CP-SAT font search / Pareto table
  charset.py        character-set validity and capacity
  recognize.py      visible + occluded weighted-distance baseline
  experiments.py    runs everything, writes JSON + SVG
  verify_sevenseg.py asserts the headline claims
  plot.py           dependency-free SVG charts
  results/          foundation.json, sat.json, font_opt.json, compiled helper
  plots/            SVG charts
docs/
  FOUNDATION.md     the math/results note
  RECOGNITION.md    topology, the 6/8 conflict, the font Pareto
  0_STAGING.md      inbox (empty)
  1_PROBLEM.md      the pain and why now
  2_GOAL.md         the Goal, priorities, mode
  3_REQUIREMENT.md  functional/non-functional constraints
  4_USECASE.md      stories and acceptance
  5_PRODUCT.md      product shape and decisions
  0_ROADMAP.md      milestones, route, revision log
  9_IMPLEMENTATION.md this file
```

## Commands

```bash
# Headline verification (dependency-free)
python -m foundation.verify_sevenseg

# All tables, JSON, and SVG plots (dependency-free; compiles the C++ helper)
python -m foundation.experiments

# Criterion and topology spot checks
python -m foundation.wellcovered
python -m foundation.topology

# Optional: CP-SAT queries for the hard cases
uv run --with ortools python -m foundation.exact
uv run --with ortools python -m foundation.sat_experiments
uv run --with ortools python -m foundation.font_opt
```

The C++ helper is built with:

```bash
g++ -O3 -march=native -o foundation/results/count_mixed foundation/count_mixed.cpp
```

## What the numbers are

- `foundation/results/foundation.json` is the machine-readable source of the
  tables in `docs/FOUNDATION.md`.
- `seven_seg.per_g` / `seven_seg.global`: counts of maximal independent sets by
  size.  The global table is the convolution of two per-`g` copies.
- `families`: exact counts for `K₂ □ K₂ □ K_q3 □ K_q4` for the listed pairs.
- `grid_3x3`: maximum independent set (64), domination lower bound (21), and the
  best feasible minimum (32) with the exact value left open.
- `sat.json`: CP-SAT status for the 11-seg layout, the 3x3 grid,
  `K₂ □ K₂ □ K₈ □ K₈`, and the well-covered probe.  Statuses are recorded
  as-is; a `FEASIBLE` value is not a proof of optimality.
- `font_opt.json`: the CP-SAT font search (min mismatch, min flips, min
  distance, topology-budget Pareto).  `OPT_DEC` in `fonts.py` is the
  min-distance candidate; `TOP0_DEC`/`MIN_MISMATCH_DEC` are the
  topology-only counterexamples.
- `fonts`: validity, flip counts, visible/occluded baseline scores.
- `capacity`: the character-set fit table.

## Verification

`foundation/verify_sevenseg.py` asserts:

- per-`g` sizes `[8,11,12,13,14,15,16]` and global sizes `[16,19..32]`;
- the per-`g` count table and the totals `604,008` / `364,825,664,064`;
- the doc decimal/hex tables are unambiguous under all four covers;
- the source note’s hex 9 ASCII figure conflicts with 2 and 5, and the standard
  F drawing conflicts with A and E; the table variants are valid;
- the flip counts 5 / 11 / 4 / 8 for the source and min-flip sets, and the
  new candidates (4 / 4 / 5 for OPT_DEC / MIN_FLIP_DEC / TOP0_DEC);
- the 7-segment capacity is 32;
- the topology mismatches (doc decimal 6,8; OPT_DEC 8; TOP0_DEC none);
- the well-covered criterion matches the exact and CP-SAT probes.

## Performance and limits

- 7-segment exact counts: about 0.4 s (C++), < 1 s including start-up.
- The full non-SAT experiment: about 2 s on a laptop.
- The pure-Python 3×3 maximum independent set uses a colour-bound branch and
  bound and is fast (milliseconds).
- The 3×3 minimum maximal set is hard: CP-SAT finds 32 feasible; the domination
  bound is 21; the exact value is open.
- `K₂ □ K₂ □ K₈ □ K₈`: CP-SAT finds sizes 24–32; 20–23 unknown; exact minimum
  open.
- 11-segment (7 + 4 diagonals): CP-SAT max 128 (optimal); exact minimum not
  settled; exact enumeration not attempted.  See `results/sat.json`.
- The pure-Python 4-tuple fallback in `block.py` is for small `q`; the C++ helper
  is the fast path.

## Doc / code consistency

If a number changes, change `foundation/experiments.py` or `count_mixed.cpp`,
rerun, and update `docs/FOUNDATION.md` in the same commit.  The verifier is the
guard: it fails before a stale number can be published.

## Dependencies

- Core: Python 3.10+ standard library only.
- Fast exact counts: `g++` (optional; the Python fallback works for small `q`).
- CP-SAT queries: `uv run --with ortools` (optional).
- No network access is needed to run the foundation.
