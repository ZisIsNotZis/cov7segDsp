# The product

## Current product — 2026-11-13

`index.html` is the context-free learning experience; `legacy.html` preserves the
original expert lab. [LAB](LAB.md) describes the user path; [CHANNELS](CHANNELS.md)
is authoritative for the new unified cover/fault model and results. The release
includes a finite-channel verifier and geometry-driven editable fonts, not a
certified font or a validated human-recognition model.

M1/M2 descriptions below are historical implementation context. Topology, the quiz
and calibration harness were implemented; human calibration remains unverified.
Larger-layout optimal capacities are not a prerequisite to this release.

## Current release (M1)

A small, dependency-free Python foundation plus a reproducible note.

- **Layout model** (`foundation/model.py`): arbitrary segments and covers;
  projections, conflicts, conflict graph, validity, capacity bound.
- **Layouts** (`foundation/layouts.py`): standard 7-segment, the per-`g`
  mixed Hamming graph, mixed-Hamming `K₂ □ K₂ □ K_q □ K_q`, and 3×3 / 3×4
  pixel grids.
- **Exact mixed-Hamming solver** (`foundation/block.py` +
  `foundation/count_mixed.cpp`): maximal-set counts by size, the 4-cell
  matching grammar, existence sets.
- **General small-layout solver** (`foundation/exact.py`): conflict graph,
  maximum independent set with colour-bound branch and bound, domination lower
  bound, optional CP-SAT minimum/existence queries.
- **Character sets** (`foundation/charset.py`): validity, conflict reporting,
  capacity table for decimal / hex / alphanumeric / Base64.
- **Recognisability baseline** (`foundation/recognize.py`): weighted visible
  distance plus smaller-weight occluded distance; per-glyph and set scores.
- **Font tables** (`foundation/fonts.py`): standard, the source note’s decimal
  and hex sets, and the exact min-flip sets for comparison.
- **Experiments and plots** (`foundation/experiments.py`,
  `foundation/plot.py`): JSON results and SVG count/existence charts.
- **Docs**: this chain plus `docs/FOUNDATION.md`.

## M2 additions (in progress)

- **Well-covered theorem** with a short proof and a verification probe.
- **Topology module** (`foundation/topology.py`): geometry-based components and
  holes; visible and per-cover comparison.
- **Font search** (`foundation/font_opt.py`): CP-SAT over the 128 patterns for
  min mismatch, min flips, min distance and a topology-budget Pareto.
- **Candidate fonts**: `OPT_DEC` (4 flips, one visible mismatch), `TOP0_DEC`
  and `MIN_MISMATCH_DEC` (topology-only counterexamples), `MIN_FLIP_DEC` (a
  degenerate 4-flip warning).
- **Recognition note** (`docs/RECOGNITION.md`): the 6/8 structural conflict,
  the topology tables, and the limits of the model.

## The shape of the product

The product is a **foundation plus a set of views**:

1. **The exact truth** — counts, gaps, capacity, construction grammar.  This is
   the part a mathematician or engineer can check.
2. **The design trade-off** — flips vs recognisability, with the visible and
   occluded terms.  This is the part a font designer uses.
3. **The playable explanation** (M3) — an interactive lab where the conflict is
   shown directly on the segments, and a quiz that turns “looks like” into data.
4. **The extension engine** (M4) — a new grid or character set is a new data
   file, not a new project.

## Decisions with rejected branches

- **Chosen: layout-parametric engine.**  Rejected: a one-off 7-segment script.
  The user explicitly asked for the grid and character-set extensions to be part
  of the foundation; a one-off would have to be redone.
- **Chosen: exact enumeration where feasible, explicit bounds where not.**
  Rejected: claiming a general closed form.  The family already shows gaps that
  move with the alphabet sizes; a single formula would be false.
- **Chosen: visible + occluded recognisability.**  Rejected: visible-only
  distance.  The user’s point is that the occluded appearance is also part of
  the reader’s expectation, with a smaller weight.
- **Chosen: provisional weights, calibration later.**  Rejected: presenting the
  baseline ranking as objective truth.  It flips under small weight changes.
- **Chosen: min-flip fonts as labelled comparison.**  Rejected: making them the
  default.  They win on flips but turn 6 into 0 and 7 into `a,c` in the hex case.
- **Chosen: the 9/10 gap is structural, not a sequence.**  Rejected: looking for
  a periodic formula.  The cell-size table explains it; the generalised family
  shows the gap moving and disappearing.

## What is deliberately not done yet

- The topological signature (holes, components, endpoints) is described but not
  hard-coded; it needs a geometry-aware definition.
- The recognition quiz is M3; until then the score is a model.
- The 3×3 minimum and the 9-segment minimum are open; the engine reports bounds.
- No production traffic-light font, no hardware claim.
