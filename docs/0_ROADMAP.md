# Roadmap

Goal in one line: **an open, layout-parametric foundation for occlusion-tolerant
segmented displays, with exact combinatorics, a calibratable recognisability
model, and a playable explanation.**

Budget: default ¥100 of model spend unless the user sets another bound.  The
work so far is local computation; no paid API is required.

## Route revision log

### 2026-10-28 — M1 becomes the universal foundation

- **Before:** M1 was “verify the 7-segment claims”; M2 was the first lab/game;
  extensions were later.
- **Changed:** the user asked that the grid and character-set extensions be part
  of M1, and that M2 not start until the foundation is solid.  The foundation now
  includes the general layout model, the mixed-Hamming family, the capacity
  corollary, the pixel-grid example, and the visible+occluded recognisability
  baseline.
- **Fact that forced it:** a 7-segment-only foundation would be rewritten for
  every new grid or character set; the user explicitly wants the base to survive
  the extension.
- **Cost:** M3 (lab/game) moves after M2; the 3×3 minimum and the 9-segment
  minimum stay open with explicit bounds.
- **Dropped:** nothing in the Goal; the extension work moved into M1.

## M1 — Foundation (current, shipped)

**Deliver a reproducible, layout-parametric base.**

- [x] Model: segments, covers, projections, conflict graph, validity.
- [x] 7-segment exact results: max 32, min 16, sizes `{16,19..32}`,
      counts, 9/10 gap.
- [x] Construction grammar: 4-cell matching model, hole-covering, feasible
      cell-size table.
- [x] Mixed-Hamming family `K₂ □ K₂ □ K_q □ K_q`: exact counts for small `q`;
      gap moves; well-covered cases.
- [x] General pixel-grid support: 3×3 max 64; minimum bounded (21 ≤ min ≤ 32,
      best feasible 32).
- [x] 7+4 diagonal layout: capacity 128 (CP-SAT optimal); minimum not settled.
- [x] Character-set capacity: 32; decimal/hex fit, alphanumeric/Base64 do not.
- [x] Recognisability baseline: visible + occluded weighted distance; provisional
      weights; baseline scores.
- [x] Docs: `docs/FOUNDATION.md`, implementation map, chain.
- [x] Plots and JSON results.
- [ ] Novelty search for the exact counts and the candidate well-covered
      criterion (carried into M2; not a blocker for the foundation).
- [ ] Exact 3×3 minimum and exact 9-segment minimum (open; recorded).

Acceptance: `python -m foundation.verify_sevenseg` and
`python -m foundation.experiments` pass; `docs/FOUNDATION.md` matches the JSON;
every headline claim has a script.

## M2 — Recognisability and proof

**Turn the baseline into a calibrated model and settle the mathematical claims.**

- Define the topological signature from geometry (holes, components, endpoints,
  junctions, symmetry).
- Run a small recognition quiz/game; collect a confusion matrix.
- Fit segment weights, `λ_vis`, `λ_occ`; report confidence.
- Re-rank the doc and min-flip fonts; produce a flips-vs-score Pareto front.
- Prove or disprove the refined well-covered criterion
  `max(q_i) ≥ Σ_{j≠i} q_j − (d−2)`; cite the known two-factor and
  Hamming-graph results.
- Novelty search: exact counts, 9/10 gap, candidate theorem.
- Deliverable: `docs/RECOGNITION.md`, `docs/MATH.md`, `foundation/score.py`,
  updated font tables.
- Review: the final font’s look is `need_user_review`; the scores are a delivery.

## M3 — Lab and game

**Make the conflict visible and collect recognition data.**

- Static HTML, no build: 2-digit countdown with a draggable occluder.
- Segment editor; four mask buttons; conflicting pairs outlined; hidden
  segments glow red; possible-readings list.
- Conflict matrix and font presets.
- Quiz/design game: guess the glyph, design a set, see the score.
- Deliverable: `index.html` + `docs/LAB.md`.
- Acceptance: a non-specialist can see why a pair collides in under a minute;
  the quiz exports a confusion matrix.

## M4 — Extensions

**Prove that the foundation survives the extension.**

- Character sets: decimal point, minus, `E`, hex, alphanumeric; explicit
  segment budgets.
- Segment spaces: 7+4 diagonals, 14-segment, 3×3 / 3×4 grids, custom layouts.
- Algorithmic design engine: layout + covers + charset + weights → valid fonts,
  capacity, scores.
- Deliverable: `docs/EXTENSIONS.md`, layout data files, `foundation/design.py`,
  a gallery.
- Acceptance: adding a layout is data-only; the 7-segment tests still pass.

## M5 — Release

- Public repo / static site, README, LICENSE, results, plots.
- Release pass: no stray artifacts, every link resolves, commands run.
- Report what is done, what is open, who owns it.
