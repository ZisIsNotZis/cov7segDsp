# The product

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
