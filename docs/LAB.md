# The lab

`index.html` is a static, dependency-free playground for the occlusion problem.
It uses the M1/M2 results and adds three ways to meet them:

- **Lab** — edit one glyph, apply a cover, see the projection, the conflicts,
  the conflict matrix and the glyph scorecard.
- **Countdown** — a two-digit countdown with a draggable leaf.  The leaf snaps
  to a side; both digits lose that side; the page lists every digit that could
  still be read.
- **Quiz** — a random glyph, optionally occluded, with digit buttons.  Responses
  are stored in `localStorage` and exported as JSON.  This is the human
  calibration harness.
- **Math** — the exact results and the count plots, in one screen.

## Open it

```bash
cd cov7segDsp
python3 -m http.server 8000
# then open http://localhost:8000/
```

Opening `index.html` directly also works in most browsers; a local server is
recommended because some browsers restrict `localStorage` on `file://`.

No build step, no framework, no network.  The only files loaded are:

```
index.html
lab/data.js      precomputed topology signatures for the 128 patterns
lab/core.js      conflict, projection, score, nearest, topology logic
lab/i18n.js      English/Chinese strings and the language switch
lab/ui.js        DOM wiring
assets/logo.svg
foundation/plots/*.svg
```

## Language

The header has an **EN / 中文** switch.  The whole lab UI (static labels,
dynamic conflict lines, scorecard, quiz feedback, math notes) follows it, and
the choice is stored in `localStorage` under `cov7seg_lang`.  The source notes
under `docs/` remain English; the quiz export is language-neutral (font keys,
labels, covers, patterns, responses).

## Lab

- Click a segment in the big display to toggle it.
- Pick **no cover / top / right / bottom / left** to see the visible projection.
- The line under the display says which slots in the current font are still
  possible after the cover.  A red chip means more than one.
- **Apply glyph to slot** writes the edited pattern into the current font.
- The right panel shows the font scorecard: conflicts, mean/min score, flips,
  topology mismatches, nearest-standard mismatches, minimum nearest margin.
- The conflict list and the matrix are two views of the same relation.  A cell
  letter `T/R/B/L` means the pair collides under top/right/bottom/left.  Click a
  cell to see the two glyphs with the hidden segments in red and the shared
  projection.
- Presets: Standard 0–9, Source note 0–9, **Optimised 0–9** (4 flips), Min-flip
  0–9, Topology-only 0–9, the unreadable counterexample, Standard 0–F, Source
  note 0–F, Min-flip 0–F.

## Countdown

- Drag the leaf.  On release it snaps to the nearest side; the middle is “no
  cover”.
- The countdown runs 99 → 0 and wraps.
- The two lists under the display show the possible readings for the tens and
  ones digit.  With **Standard 0–9**, cover the right side and wait for 68/86 to
  see the 6/8 ambiguity.  With **Optimised 0–9**, the same cover should keep a
  unique reading (the 5/9 and 6/8 collisions were changed).
- The leaf is a model of a thin occlusion: a full side line is removed.  It is
  not a partial-segment simulation.

## Quiz

- Choose a font, optionally enable random occlusion, and click **New glyph**.
- Click the digit you read.  The feedback says whether it was right and whether
  the view was ambiguous.
- Responses are appended to `localStorage` under `cov7seg_quiz_v1`.  **Export
  JSON** downloads:

```json
{
  "font": "opt-dec",
  "shown": "6",
  "cover": "right",
  "response": "8",
  "correct": false,
  "possible": ["6", "8"],
  "ts": "2026-10-28T..."
}
```

- The stats panel shows trials, accuracy, per-stem counts and a confusion matrix
  for the current font.  The raw export is the input for weight calibration.

## What the lab is for

The lab is the bridge between the exact model and the human eye:

1. It makes the conflict **visible** (red hidden segments) instead of asking the
   reader to decode a segment table.
2. It makes the 6/8 case concrete: standard 6 and 8 collide under the right
   cover; the optimised font changes 8 (and 5) to break it.
3. It collects the data that the current weights lack.  The M2 weights are
   provisional; the quiz is how they get replaced.

## Limits

- The occlusion model is the ideal “one outer line” model, not a geometric
  partial cover.
- The topology signature is `(components, holes)` only; endpoints, junctions and
  symmetry are still open.
- The quiz stores data locally; there is no server.  The exported JSON is the
  input for `foundation/calibrate.py` (below).
- The lab defaults to the optimised decimal font; its 5 and 8 were reviewed and
  accepted as readable, but the weights are still provisional.
- The Chinese UI is a written translation, not machine-translated at runtime.
  The source notes remain English for now.

## Calibrating the weights

The quiz export is the input to a visible-evidence conditional-logit fit:

```bash
uv run --with scipy python -m foundation.calibrate --data cov7seg-quiz.json
```

The model is

```
P(response = r | shown g, cover c)
  ∝ exp( − Σ_{i visible under c} w_i · [g_i ≠ standard[r]_i] )
```

Only the segments the viewer can see enter the likelihood; the hidden segments
are the viewer's prior, not observed evidence.  The design score’s `λ_occ` is a
separate design weight and is not identifiable from these responses alone.  The
script prints the fitted `w_i` and the accuracy of the default vs fitted
weights.

A synthetic self-test checks the estimator:

```bash
uv run --with scipy python -m foundation.calibrate --synthetic
```

It generates responses from known weights and recovers them (RMSE ≈ 0.04 at
4,000 trials).  Real quiz data replaces the synthetic set.

## Regenerating the topology table

```bash
python -m foundation.build_lab_data
```

This writes `lab/data.js` from `foundation/topology.py`; rerun it after changing
the raster parameters or the segment geometry.
