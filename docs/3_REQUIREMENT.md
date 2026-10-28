# What must be true

## Functional requirements

1. **Layout model.**  A layout is a segment set plus named covers (each a
   bitmask).  The engine computes projections, conflicts, conflict graphs and
   validity for arbitrary layouts.
2. **7-segment exact results.**  The engine reproduces:
   - maximum unambiguous set = 32 (16 per `g`);
   - minimum maximal set = 16 (8 per `g`);
   - attainable sizes `{16} ∪ {19..32}` globally and `{8, 11..16}` per `g`;
   - the counts in `docs/FOUNDATION.md` by size;
   - the construction grammar (4 cells, matchings, hole-covering).
3. **Generalised mixed-Hamming family.**  For `K₂ □ K₂ □ K_q3 □ K_q4`, the
   engine produces exact maximal-set counts for small alphabets and the
   attainable-size set.  It must not assume the 7-segment values.
4. **Overlapping-cover layouts.**  A pixel-grid layout (top/bottom rows,
   left/right columns) is supported through the general conflict graph.  Exact
   maximum independent set is required; the minimum maximal set may be reported
   as bounds when the exact search is not settled.
5. **Character-set capacity.**  The engine checks a table of glyphs, reports
   conflicts with the offending cover, and reports the capacity of a layout.
   For 7-segment the capacity is 32; 0–9 and 0–F fit, 36-letter alphanumeric
   and Base64 do not.
6. **Recognisability baseline.**  A reproducible score combines
   - weighted visible distance to the standard glyph, and
   - weighted distance after each cover (occluded appearance), with a smaller
     weight.
   The model’s weights are explicitly provisional until calibration.
7. **Documentation.**  `docs/FOUNDATION.md` contains the model, results,
   construction rule, generalisations, proof sketches, open questions and
   reproduction commands.  Every number points to the script that produces it.
8. **Plots.**  Count curves and the existence dot-plot are generated as SVG.
9. **Topological signature.**  A geometry-based `(components, holes)` signature
   is computed for a pattern and compared with the standard glyph, visibly and
   under each cover.  The raster parameters are explicit and reproducible.
10. **Font search.**  A CP-SAT assignment search produces fonts optimised for
    topology mismatches, flips, and weighted distance, plus a Pareto table.
    Candidates are labelled as model output, not as perceptual truth.
11. **Well-covered criterion.**  The theorem `q1 > Σ_{i≥2}(q_i−1)` is stated,
    proved, and checked against the exact/CP-SAT data.

## Non-functional requirements

- **Reproducible.**  No hidden state, no hard-coded result that is not also
  produced by a script.  The core runs on Python 3.10+ with no third-party
  dependency; the C++ helper and CP-SAT are optional accelerators.
- **Fast enough for iteration.**  7-segment exact counts < 1 s; the whole
  non-SAT experiment < 5 s on a laptop.
- **Portable.**  Linux/macOS; `g++` optional; `uv run --with ortools` for SAT.
- **Auditable.**  `foundation/verify_sevenseg.py` asserts every headline number
  and every font-table claim.
- **Licensed.**  AGPL-3.0-or-later unless the project records a different
  choice.

## Constraints

- The ideal cover model is explicit: a cover removes the whole outermost line
  on that side.  A different occlusion model is a new layout, not a silent edit.
- Recognisability is not called objective truth until it is calibrated against
  people.  Before that it is a model with named weights.
- Known graph theory is cited, not re-proved.  The novelty claim is limited to
  the exact enumeration, the gap, the capacity application and the design
  model, and is re-checked before publication.
- Docs are the single source of truth; a fact lives in one place and is linked,
  not copied.
