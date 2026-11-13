# Implementation

## Release and hosting

`python -m foundation.build_site` embeds CSS, ordered scripts, data and SVG
images into `dist/index.html` and the portable `dist/cov7seg.html`. Source stays
modular. Project-document links point to GitHub; detailed documents/history need
network, but the main experiment and embedded research library do not. The build
is deterministic and emits sizes and SHA-256 hashes in `dist/manifest.json`.
`tests/test_build_site.py` parses every output page to reject external runtime
assets or accidental local links and checks reproducibility.

`.github/workflows/pages.yml` tests Python and JavaScript, builds the single-file
artifacts and publishes `dist/` on `master` pushes. Pull requests do not deploy.
GitHub Pages serves the public app; a user needs only a browser. The public repo
remains the source home. `dist/` is ignored rather than maintained as a second source.

## Current entry points (2026-11-13)

### Custom designer revision

The initial report redesign listed below is preserved as `workshop-v1.html`.
Current `index.html` uses `lab/designer-ui.js` / `.css`, with a single custom
design state covering available geometry, labels, independent expected glyphs,
multiple per-side rules, weights and actual glyphs. `lab/designer-core.js` provides
BigInt geometry/clipping, hard checks, per-glyph metrics and bounded live search.
`lab/expectations.js` contains independent geometric targets, not response data.
`foundation/build_archive_data.py` generates `lab/archive-data.js`; `archive-ui.js`
renders the original evidence and lets a research font enter the current verifier.
`lab/designer-oracle.test.js` independently checks geometry, >32-bit masks,
physical faults, legacy metric regression, full glyph-error coverage and search.

Revision checks: original Python foundation and all eight channel cases still pass;
all six Node test files pass, including independent shape/archive and designer oracles.
Browser QA exercised individual diagonal/point switches, uppercase/lowercase inventory
merging (36 labels), an undefined custom symbol warning, two simultaneous requirement
rows, left recovery 12% / right detection 30% with three unknown faults, independent
target editing, v2 save/export/import, research-font loading, clearing actual glyphs,
live search and loading/revalidating the found 0.711 decimal candidate. No page JS errors
were observed. A numeric-field synchronisation defect and narrow-screen table overflow
were found and fixed; the 390px page no longer overflows horizontally. These checks do
not establish fresh-user usability or real perceptual accuracy.

Boundary clarification: the physical grid now spans [0,1], with SVG display
padding outside that range. Positive-depth covers include their leading edge;
zero means no cover. `lab/boundary.test.js` checks every positive depth removing
the outer edge, the exact 50% middle-line equality, points, surviving diagonal
pieces, 100%, and unknown-depth critical states. Arbitrary epsilon offsets are
not used to classify these boundaries.

### Initial report redesign (historical file map)

- `index.html`, `lab/experience.css`, `lab/experience.js`: story, design challenges,
  reference solutions, scene configuration, design import/export.
- `lab/catalog.js`: renderable geometry, exact masks, six character inventories
  and labelled reference/coding fonts.
- `lab/channel.js`: finite observation sets, fault/cover composition, detection
  and correction with concrete collision witnesses.
- `foundation/build_channel_data.py` generates `lab/research.js` from canonical
  results; the workshop uses it to explain hardware impossibility during editing.
- `foundation/channels.py`: Python model and bounded exact capacity search.
- `foundation/channel_experiments.py`, `foundation/results/channels.json`:
  reproducible scenario results and constructive witnesses.
- `docs/CHANNELS.md`: research definitions, claims, proofs, sources and limits.
- `legacy.html`, original `lab/ui.js`: expert lab. Quiz v2 masks covered segments
  identically, records actual glyph snapshots and separates ambiguity from error;
  `calibrate.py` consumes the snapshot. Old exports remain unverified.
- `lab/channel.test.js`, `tests/test_channels.py`, `tests/test_calibration_snapshot.py`:
  channel semantics, independent physical-fault oracles and data integrity.

The original map below is retained; its old `index.html` lab entry now means `legacy.html`.

### Verification of this release

On 2026-11-13: original foundation tests and seven-segment assertions passed;
8 channel unit tests and 2 edited-font calibration tests passed. The JavaScript
suite independently enumerated physical faults, validated witnesses and compared
all 144 published Python scenarios and their capacity constructions. Browser
capacity summaries are generated from the same JSON and checked for agreement.

Browser checks exercised guess/reveal, the 6/8 repair (changing a resolves that
pair while other pairs remain), loading the four-flip candidate, adding faults,
the 15-segment protected Hamming construction with 16 labels under all-sides
simultaneous erasure plus one flip, local save/reload/restore, and JSON
export/import. The seven-segment single-off/LR case displayed its capacity-6
impossibility guidance. The 390px layout had no horizontal page overflow;
the desktop homepage and narrow-screen references were visually inspected.
No page JavaScript errors were observed in the inspected flows. This is not a
fresh-user usability study, a perceptual experiment, or exhaustive browser coverage.

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
  font_opt.py       optional CP-SAT font search / Pareto / nearest
  charset.py        character-set validity and capacity
  calibrate.py      quiz-export weight fit (optional scipy)
  build_lab_data.py writes lab/data.js from the topology module
  recognize.py      visible + occluded distance, nearest-standard check
  experiments.py    runs everything, writes JSON + SVG
  verify_sevenseg.py asserts the headline claims
  plot.py           dependency-free SVG charts
  results/          foundation.json, sat.json, font_opt.json, compiled helper
  plots/            SVG charts
docs/
  FOUNDATION.md     the math/results note
  RECOGNITION.md    topology, the 6/8 conflict, the font Pareto
  LAB.md            the static lab, quiz format, calibration
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
uv run --with scipy python -m foundation.calibrate --synthetic
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
- `index.html` + `lab/`: the M3 static lab (core logic, data, UI, EN/中文).
- `font_opt.json`: the CP-SAT font search (min mismatch, min flips, min
  distance, topology-budget Pareto, nearest-constrained decimal/hex).  `OPT_DEC`
  in `fonts.py` is the min-distance candidate; `TOP0_DEC`/`MIN_MISMATCH_DEC`
  are the topology-only examples; `MIN_FLIP_DEC` is a degenerate 4-flip
  optimum.  The hex nearest constraint is infeasible; the min violation is 1.
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
- the nearest-standard mismatches (OPT_DEC none; doc hex 6,8; the 30-flip
  counterexample 9 of 10 digits);
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
