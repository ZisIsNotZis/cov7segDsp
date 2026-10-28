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
| min-flip decimal (CP-SAT) | 4 | 5, 8 | 3, 5, 8 | 0.671 |
| min-distance decimal (CP-SAT) | 4 | 8 | 1, 3, 5, 8 | **0.711** |
| doc hex | 11 | 6, 8, F | 1, 6, 8, 9, C, F | 0.665 |
| min-flip hex | 8 | 0, 6, 8, 9, A, C | 0, 6, 8, 9, A, C, F | 0.571 |
| topology-only, 5 flips | 5 | none | 3, 6, 9 | 0.592 |
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
it chooses `1 = b` only (one vertical bar) and a 5 without the middle segment.
The weighted distance does not punish the degenerate 1 enough, so "minimum
flips" alone is not a design objective.

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
- a small Pareto table over mismatch budgets.

Run:

```bash
uv run --with ortools python -m foundation.font_opt
```

The output is `foundation/results/font_opt.json`.  The search is a design aid;
it does not replace a human review.

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
