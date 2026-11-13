# The lab

`index.html` is a static, dependency-free playground for the occlusion problem.
It uses the M1/M2 results and has four views: **Lab**, **Countdown**, **Quiz**,
**Math**.

There is one **global font selector** in the header.  It is the only mode
dropdown: changing it resets the working font and all views to that preset.
There are no per-tab font selectors, no slot dropdown, and no “apply” button:
click a digit to edit it, and every edit is saved immediately.

The **EN / 中文** switch is next to the font selector.  The choice is stored in
`localStorage` and the whole UI follows it; the source notes remain English.

## Open it

```bash
cd cov7segDsp
python3 -m http.server 8000
# then open http://localhost:8000/
```

Opening `index.html` directly also works in most browsers; a local server is
recommended because some browsers restrict `localStorage` on `file://`.

No build step, no framework, no network.  Files:

```
index.html
lab/data.js      precomputed topology signatures for the 128 patterns
lab/core.js      conflict, projection, score, nearest, topology logic
lab/i18n.js      English/Chinese strings and the language switch
lab/ui.js        DOM wiring
assets/logo.svg
foundation/plots/*.svg
```

## Lab

The Lab is designed to show everything at once:

- **Summary bar** — font name, number of conflicts, mean score, total flips,
  topology mismatches, nearest-standard mismatches.  No clicks.
- **All digits gallery** — every glyph in the font, as a card.  The selected
  cover is applied to every card, so you see all projections at the same time.
  Badges:
  - `T R B L` in red: the glyph participates in a conflict; the letters are
    the covers where it collides.
  - `ambiguous` in red: under the selected cover, more than one digit maps to
    the same projection.
  - `T` in amber: the glyph's topology differs from the standard.
  - `N` in amber: the intended digit is not the unique nearest standard.
  - the card footer gives flips from standard and weighted score.
- **Editor** — click a card to select it; click a segment in the big glyph to
  toggle it.  The edit is written into the working font immediately, and the
  gallery, countdown and score update.  **Reset digit** restores that one glyph
  from the preset; **Reset font** restores the whole preset.
- **Cover buttons** — no cover / top / right / bottom / left.  The projection
  line under the editor and every gallery card follow the selected cover.
- **Conflicts** — every conflicting pair is listed automatically, with the
  cover and the hidden segments.  Click a line to select that glyph and cover.
- **Conflict matrix** — optional, inside a `<details>`; cells show the covers
  where a pair collides.  Click a cell to select the pair's first glyph and that
  cover.

The old “slot + apply” flow is gone.  Editing a digit *is* selecting it.

## Countdown

- Uses the global font.
- Drag the leaf; it snaps to the nearest side (or “no cover” in the middle).
- Both digits lose that side; the tens/ones lists show every digit that could
  still be read.
- **Start/Pause** and **Reset** are the only controls; the countdown wraps
  99 → 0 → 99.
- Try **Standard 0–9** with the right cover and wait for 68/86; then switch to
  **Optimised 0–9** and repeat.

## Quiz

- Uses the global font.
- A random glyph is shown with a random cover (one in five is unoccluded).  The
  cover is stated above the glyph.
- Click the digit you read.  The feedback says correct/wrong and whether the
  view was ambiguous.
- The next glyph appears automatically after 1.2 s; there is no “new glyph”
  button.  Responses go to `localStorage` under `cov7seg_quiz_v1`.
- **Export JSON** downloads the raw responses:
  ```json
  {"font":"opt-dec","shown":"6","cover":"right","response":"8",
   "correct":false,"possible":["6","8"],"ts":"..."}
  ```
- **Clear data** wipes the responses.  The stats panel shows trials, accuracy,
  per-shown counts and a confusion matrix for the current font.

## Calibrating the weights

The quiz export feeds a visible-evidence conditional-logit fit:

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
separate design weight and is not identifiable from these responses alone.

Synthetic self-test:

```bash
uv run --with scipy python -m foundation.calibrate --synthetic
```

It recovers known weights with RMSE ≈ 0.04 at 2–4k trials.

## What the lab is for

1. It makes the conflict **visible**: all digits, all projections, hidden
   segments, no table decoding.
2. It makes the 6/8 case concrete: standard 6 and 8 collide under the right
   cover; the optimised font changes 8 (and 5) to break it.
3. It collects the data the current weights lack.  The M2 weights are
   provisional; the quiz is how they get replaced.

## Limits

- The occlusion model is the ideal “one outer line” model, not a geometric
  partial cover.
- The topology signature is `(components, holes)` only; endpoints, junctions and
  symmetry are still open.
- The quiz stores data locally; there is no server.  The exported JSON is the
  input for the calibration step.
- The lab defaults to the optimised decimal font; its 5 and 8 were reviewed and
  accepted as readable, but the weights are still provisional.
- The Chinese UI is a written translation, not machine-translated at runtime.

## Regenerating the topology table

```bash
python -m foundation.build_lab_data
```

This writes `lab/data.js` from `foundation/topology.py`; rerun it after changing
the raster parameters or the segment geometry.
