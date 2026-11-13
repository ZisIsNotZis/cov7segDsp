# Roadmap

## Current route — custom designer revision, 2026-11-13

The user corrected the first redesign: switching presets was not enough. They need
to specify the canvas and available strokes, combine character inventories, set
per-direction detection/recovery severities, and see independent expected-shape
matching, dynamic errors, scores and generated answers. The earlier route below
preserves that iteration's decisions; it is not acceptance of the current product.

The responsible framing error was treating a narrative plus preset switches as
the requested design capability. The durable correction is one editable design
specification (geometry, enabled hardware, labels/case policy, independent targets,
rules, weights) consumed by rendering, validation, search and persistence alike.
The research library is a separate chapter with generated evidence, not a substitute
for live computation in the workshop. Current user flow and limits: [LAB](LAB.md).

Acceptance for this revision: edit an individual hardware diagonal; combine and
case-fold labels; impose different left/right recovery and detection thresholds;
observe complete per-character hard errors and shape warnings; edit a target
independently; generate and reverify a candidate for the current requirements;
save/import all of the above; reload an original research font and inspect it.
Budget-limited or unsupported checks/searches must remain visibly unresolved.

## First report redesign — historical iteration, 2026-11-13

The milestone labels below are historical planning, not the current completion checklist.
The user judged the research mostly complete but the report confusing and unengaging,
then authorised systematic fault/cover extensions and a substantial learning redesign.

Current release scope:

1. **Unified channel research:** known/unknown cover, alternative/simultaneous masks,
   at-most 0–2 off/on/flip faults, detection versus correction, witnesses and exact/bounded capacities.
   Evidence: [CHANNELS](CHANNELS.md), `foundation/results/channels.json`, channel tests.
2. **Complete learning loop:** guess → reveal → edit → counterexample → compare
   reference → change assumptions. `index.html` is the first-visit local entry.
3. **Reusable exploration:** geometry-driven structures, six inventories, editable
   fonts, finite-channel validation, design save/import/export. Charset size is not legibility.
4. **Honest closure:** retain original results, distinguish proved/computed/bounded/modelled,
   and label human perception as unverified. Keep the legacy tool separately.

Acceptance: a visitor can explain the 6/8 ambiguity, change a glyph and see a concrete
consequence, compare detection/recovery, reproduce a result, and export/reload the
actual design. Automated/browser checks support this; no fresh-user study has yet
established that the experience meets every reader's needs.

Next useful checkpoint: feedback on the complete local experience. Then choose among
a legibility experiment, temporal/shared-fault model, richer glyph search, or a hard
larger-layout bound. No future autonomous run or external publication is scheduled.

## Historical route (2026-10-28)

The material below preserves why the original milestones were chosen. Its “current”,
“in progress” and “planned” labels describe that time and are superseded above.

Goal in one line: **an open, layout-parametric foundation for occlusion-tolerant
segmented displays, with exact combinatorics, a calibratable recognisability
model, and a playable explanation.**

Budget: default ¥100 of model spend unless the user sets another bound.  The
work so far is local computation; no paid API is required.

## Route revision log

### 2026-10-28 — M2 calibration/quiz moves to M3

- **Before:** M2 was “recognisability and proof” including the quiz and weight
  calibration.
- **Changed:** the quiz needs the interactive interface and human responses, so
  it moves to M3 (lab/game).  M2 ships the theorem, the topology signature, the
  6/8 structural result, the font Pareto, and the docs.
- **Fact that forced it:** calibration requires data that cannot be produced by
  the local solver; the interface that collects it is M3.
- **Cost:** M2 has no human-calibrated weights yet; the scores remain a model.
- **Dropped:** nothing; the work moved.

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

## M2 — Recognisability and proof (in progress)

**Turn the baseline into a calibrated model and settle the mathematical claims.**

- [x] Prove the well-covered criterion
      `q1 > Σ_{i≥2}(q_i − 1)`; verified against exact/CP-SAT data.
- [x] Define the topological signature from geometry (components, holes).
- [x] Show the 6/8 conflict is structural; topology is necessary, not
      sufficient.
- [x] Produce the font Pareto table and the min-distance 4-flip decimal
      candidate; identify the topology-only counterexamples.
- [x] Add the nearest-standard / segment-fault check; decimal candidate passes,
      doc hex fails 6/8, and no 16-glyph 0–F nearest-preserving font exists
      (minimum one violation).
- [ ] Add endpoints/junctions/symmetry to the signature.
- [x] Human review of the min-distance font: the user accepted the 5/8 shapes
      (“these looks fine to me”); `OPT_DEC` is the lab default.
- [ ] Novelty search for the well-covered criterion and the exact counts.
- Deliverable: `docs/RECOGNITION.md`, `foundation/topology.py`,
  `foundation/font_opt.py`, updated font tables.

The quiz/calibration is deferred to M3 (see the revision log); it needs the
interactive interface and human responses.

## M3 — Lab and game

**Make the conflict visible and collect recognition data.**

- Static HTML, no build: 2-digit countdown with a draggable occluder.
- Segment editor; four mask buttons; conflicting pairs outlined; hidden
  segments glow red; possible-readings list.
- Conflict matrix and font presets.
- Quiz/design game: guess the glyph, design a set, see the score; collect the
  confusion matrix and calibrate `w_i`, `λ_vis`, `λ_occ`.
- Deliverable: `index.html` + `docs/LAB.md` + `foundation/calibrate.py`.
- Status: **shipped MVP**; the lab is usable now, human data is the remaining
  input.
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
