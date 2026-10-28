# Recognisability: topology, distance, and the font Pareto

Status: **M2 working note**.  The weights are provisional; this note records
what is objective and what still needs people.

## 1. The topological signature

A glyph's **topological signature** is `(components, holes)` computed from the
rasterised segment geometry, not hand-assigned.  A small dilation closes the
gaps between standard segments, matching how a viewer sees a closed numeral.
Defaults: 120×120 grid, 10-pixel stroke.

Standard 7-segment signatures:

| glyph | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 |
|---|---|---|---|---|---|---|---|---|---|---|
| signature | 1c/1h | 1c/0h | 1c/0h | 1c/0h | 1c/0h | 1c/0h | 1c/1h | 1c/0h | 1c/2h | 1c/1h |

`A` and `b` have one hole; `C`, `E`, `F` have none; `d` has one.  The standard
0/6/9/8 loop structure is recovered exactly, which is the point of using the
geometry instead of a hand-written table.

## 2. What the candidate fonts do to the topology

Visible mismatches (the glyph no longer has the standard's hole count):

| font | flips | visible mismatches | occluded mismatches | mean score |
|---|---:|---|---|---:|
| doc decimal | 5 | 6, 8 | 1, 3, 5, 6, 8 | 0.609 |
| min-flip decimal (CP-SAT) | 4 | 8 | 3, 5, 8 | 0.694 |
| min-distance decimal (CP-SAT) | 4 | 8 | 1, 3, 5, 8 | **0.711** |
| doc hex | 11 | 6, 8, F | 1, 6, 8, 9, C, F | 0.665 |
| min-flip hex | 8 | 0, 6, 8, 9, A, C | 0, 6, 8, 9, A, C, F | 0.571 |
| topology-only, 5 flips | 5 | none | 1, 3, 6, 9 | 0.609 |
| topology-only, 30 flips | 30 | none | 0,1,2,3,4,5,6,9 | **0.105** |

The last row is the warning: **topology is necessary, not sufficient**.  A
font can preserve every hole count and still be unreadable.  The 30-flip
"topology-only" solution is a valid unambiguous font but scores 0.105; it is a
counterexample to optimizing topology alone.

The min-distance decimal font is the first concrete candidate:

```
0 1111110   1 0111000   2 1101101   3 1110001   4 0110011
5 1010011   6 1011111   7 1110000   8 0111111   9 1111011
```

It changes only 1, 3, 5, 8 (four flips), keeps 6 standard (one hole), and
changes 8 to a one-hole form.  Under the provisional score it dominates the
source note's five-flip decimal set on flips, visible topology mismatches and
mean score.  It still changes 8's topology, and its 5/8 shapes need a human
eye; it is a candidate for review, not a verdict.

The min-flip CP-SAT font is a different warning: it also has four flips, but
it chooses `7 = a,b` only (a 7 missing its lower half) and a 5 without the
bottom segment.  The weighted score still averages above the doc decimal set
because nine glyphs are standard or close, so the mean hides the degenerate 7;
per-glyph review is necessary.  "Minimum flips" alone is not a design
objective.

## 2.1 Nearest-standard (segment-fault) check

A viewer who assumes a display fault reads a glyph as the known digit that
needs the fewest segment changes.  For a candidate `g` and the intended digit
`d`, the **nearest-standard** check asks: is `d` the unique closest standard in
the chosen character set, and by how much?  The distance is weighted, so a
missing bottom segment (`d`, weight 0.6) is a smaller fault than an extra middle
segment (`g`, weight 1.1).  The implementation is
`foundation/recognize.py:nearest_info`.

Results:

| font | nearest mismatches | min margin | note |
|---|---|---:|---|
| `OPT_DEC` | none | 0.5 | passes; 3 vs 7 is broken by the weights |
| doc decimal | none | 0.5 | but its 6 is exactly standard **E**; harmless in decimal, a hex hazard |
| `MIN_FLIP_DEC` | none | 0.5 | passes, yet its `1 = c` is degenerate; nearest alone is not enough |
| doc hex | **6, 8** | −1.2 | 6 is nearest to 3; 8 is nearest to 4 |
| min-flip hex | **6, 8, 9, A** | −0.6 | 8 is nearest to A; several others are not close |
| topology-only 30-flip | **9 of 10 digits** | −2.2 | rejected by nearest as well as by score |

The 3/7 case is instructive: **unweighted**, `3` without bottom is at distance
1 from both 3 and 7 (a tie).  With the perceptual weights it is at 0.6 from 3
and 1.1 from 7, so 3 wins.  This is why the nearest check must use weights, not
raw segment counts.

### A hex impossibility

There is **no** 16-glyph nearest-preserving 0–F font under the 7-segment
four-cover model.  CP-SAT with the nearest constraint is infeasible; the
minimum number of nearest violations is **1** (the digit 8 cannot be made
nearest to its own standard).  A 1-violation font exists, but the min-distance
search produces shapes that are worse than the source note’s.  The source
note’s hex font has **2** nearest violations (6 and 8), so it is valid as a
code but not as a set of “known digit plus a fault” shapes.  This is a real
limitation of the 7-segment space, not a failure of one font.

## 3. The 6/8 conflict is structural

Standard 6 and 8 differ only in segment `b`, which is in the right cover.  If
both keep their standard hole counts, they collide when the right side is
covered.  Resolving the pair forces at least one of them to lose a hole (or
to become a different one-hole/two-hole shape).  This is why every serious
decimal font changes 6 or 8; the choice is **which topology to sacrifice**, not
whether to sacrifice one.

The source note changes both 6 and 8.  The min-distance candidate changes only
8.  The doc's hex font changes both and also F; the min-flip hex font changes
six glyphs.  The trade-off is real, and the topology table makes it visible.

## 4. The score

For a candidate `g` and the standard `s` of the intended digit:

```
d_vis(g,s) = Σ_i w_i · [g_i ≠ s_i]
d_occ(g,s) = Σ_c Σ_i w_i · [proj_c(g)_i ≠ proj_c(s)_i]
R(g,s)     = exp( −(λ_vis · d_vis + λ_occ · d_occ) )
```

Default weights: `a=1.0, b=1.0, c=1.0, d=0.6, e=1.0, f=1.2, g=1.1`;
`λ_vis=1.0`, `λ_occ=0.3`.  The occluded term is the user's added requirement:
the glyph should also match what the viewer expects the digit to look like
after the same side is covered.  The weight is lower because the visible shape
is the primary cue.

The weights are **provisional**.  They encode the qualitative van Nes–Bouma
ordering (F most distinctive, D least), not measured values.  The min-flip
font's degenerate 1 is an example of a shape the current score fails to
penalise enough.

## 5. Font search

`foundation/font_opt.py` solves the assignment problem with CP-SAT:

- minimum visible topology mismatches (0),
- minimum total flips (4),
- minimum weighted visible+occluded distance (4 flips, mean 0.711),
- minimum flips subject to 0 topology mismatches (5),
- a nearest-standard constrained search (`solve_nearest`), including the
  infeasible 0–F case and the minimum-violation 0–F case,
- a small Pareto table over mismatch budgets.

Run:

```bash
uv run --with ortools python -m foundation.font_opt
```

The output is `foundation/results/font_opt.json`.  The nearest keys are
`dec_nearest_min_distance`, `hex_nearest` (infeasible), and
`hex_min_nearest_violations` (one violation, 22 flips).  The search is a design
aid; it does not replace a human review.

## 6. What is still needed

1. **Calibrate the weights.**  The quiz (show a glyph, ask for the digit) and
   the fit of `w_i`, `λ_vis`, `λ_occ` are part of M3, because they need the
   interactive interface and human responses.
2. **Add more features.**  Endpoints, junctions, symmetry, and the number of
   connected components of the occluded projection.  The current topology is
   only holes + components.
3. **Human review of the min-distance font.**  The 1/3/5/8 forms and the
   one-hole 8 are the first thing to put in front of a person.
4. **Do not ship a font from the model alone.**  The 0-mismatch counterexample
   is the proof that a single objective can be gamed.
