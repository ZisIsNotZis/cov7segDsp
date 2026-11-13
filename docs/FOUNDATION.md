# Foundation: occlusion-tolerant segmented displays

Status: **M1 — foundation, open for extension**.  
This note records the model, the exact results, the construction rule, the
generalised experiments, and the first recognisability model.  Every number in
the tables is reproducible with the scripts in `foundation/`; see
[Reproduction](#reproduction).

The short version:

- In the 7-segment model, the maximum unambiguous set is **32**; the minimum
  maximal set is **16**.
- The attainable maximal-set sizes are **16 and 19–32**.  **17 and 18 do not
  exist.**  Per one value of the never-covered middle segment, the sizes are
  **8 and 11–16**; 9 and 10 do not exist.
- There are **604,008** maximal sets per `g` copy and
  **364,825,664,064** globally.  The size distribution peaks at 13 (per copy)
  and 26 (global), not at the maximum.
- The gap is not a mysterious periodic sequence.  It is the set of feasible
  cell-size patterns in a 4-cell matching model.  In a generalised family the
  gaps move and can disappear; some members are *well-covered* and have only
  one maximal size.
- The 7-segment space can hold at most **32** characters under the four-side
  cover model.  Decimal (10) and hex (16) fit; 36-letter alphanumeric and
  Base64 (64) do not.
- “Looks like the digit” is modelled as a weighted visible-shape distance plus
  a **smaller-weight occluded-shape distance**, with provisional weights.  The
  model is a baseline, not ground truth; it needs calibration by a recognition
  quiz.

---

## 1. Model

A **layout** is a finite set of binary segments plus a family of **covers**.
Covering side `c` removes the segment set `covers[c]`.  A pattern is a bitmask
of lit segments.  Two distinct patterns **conflict** iff some cover makes their
projections equal:

```
conflict(p, q)  ⇔  ∃ c :  (p & ~c) == (q & ~c)
```

This is the idealisation of “a thin occlusion covers only the outermost line”:
top removes `a`, bottom removes `d`, left removes `e,f`, right removes `b,c`;
the middle `g` is never covered.  It is exactly the source note’s model.

For the standard 7-segment display (`a,b,c,d,e,f,g`):

| cover | removed | size |
|---|---|---:|
| top | `a` | 1 |
| bottom | `d` | 1 |
| left | `e,f` | 2 |
| right | `b,c` | 2 |

The never-covered `g` gives two independent copies of the 64-pattern graph.
Within one fixed `g`, group the coordinates as

```
a ∈ {0,1},  d ∈ {0,1},  L=(e,f) ∈ {0,1}²,  R=(b,c) ∈ {0,1}².
```

Two patterns conflict iff they differ in exactly one of these four coordinate
groups.  Therefore the per-`g` conflict graph is the mixed Hamming graph

```
K₂ □ K₂ □ K₄ □ K₄.        (1)
```

This is the key structural fact.  The full 7-segment graph is two disjoint
copies of (1), because `g` is never removed.

A **maximal** unambiguous set is a maximal independent set of the conflict
graph; an independent set is unambiguous, and maximal means no further glyph
can be added without creating a collision.  The **maximum** is the capacity.

### 1.1 Adding a layout is data, not code

A new layout is a dictionary:

```python
from foundation.model import Layout

layout = Layout.from_dict({
    "name": "my display",
    "segments": ["s0", "s1", "s2", "s3"],
    "covers": {
        "top": ["s0"],
        "bottom": ["s3"],
        "left": ["s1"],
        "right": ["s2"],
    },
    "free": [],          # segments no cover can remove
})
```

The engine then computes projections, conflicts, capacity and (where feasible)
maximal-set counts without a new code path.  The 7-segment, mixed-Hamming,
pixel-grid and 7+4 layouts are all instances of this data shape.

---

## 2. Exact 7-segment results

### 2.1 Sizes

| quantity | per `g` (64 patterns) | global (128 patterns) |
|---|---:|---:|
| minimum maximal set | 8 | 16 |
| maximum maximal set | 16 | 32 |
| attainable maximal sizes | 8, 11–16 | 16, 19–32 |
| missing sizes | 9, 10 | 17, 18 |
| total maximal sets | 604,008 | 364,825,664,064 |
| number of minimum maximal sets | 144 | 20,736 |
| number of maximum sets | 7,704 | 59,351,616 |

The global numbers are the convolution of two per-`g` distributions, because
the two `g` copies are disjoint and have no cross edges.  In particular
`604,008² = 364,825,664,064`.

### 2.2 Counts by size

Per `g`:

| size | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| count | 144 | 0 | 0 | 4,608 | 149,184 | 213,120 | 178,560 | 50,688 | 7,704 |

Global:

| size | 16 | 17 | 18 | 19 | 20 | 21 | 22 | 23 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| count | 20,736 | 0 | 0 | 1,327,104 | 42,964,992 | 61,378,560 | 72,658,944 | 1,389,477,888 |

| size | 24 | 25 | 26 | 27 | 28 | 29 | 30 | 31 | 32 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| count | 24,222,198,528 | 65,233,797,120 | 99,163,865,088 | 91,304,091,648 | 55,787,553,792 | 21,385,451,520 | 5,320,525,824 | 781,000,704 | 59,351,616 |

The distribution is unimodal for 7-segment: per `g` the peak is at 13, global
at 26.  The global curve rises from 16 to the peak at 26, then falls to 32; it
is not monotone.  The peak is not at the maximum.  The minimum and maximum sizes
are rare.  The counts are exact, not sampled.  In the generalised family the
curve can be multi-modal, so there is no universal slope, peak or period.

### 2.3 Capacity

**Theorem (7-segment capacity).**  Under the four-side cover model, at most
**32** patterns can be pairwise unambiguous.

*Proof.*  Fix `g`.  Group patterns by `(a,d,R)`.  There are
`2·2·4 = 16` groups, and each group contains four values of `L`; two patterns
with the same `(a,d,R)` differ only in `L`, so covering the left side makes
them equal.  Hence at most one per group, i.e. at most 16 per `g`.  Two `g`
values give at most 32.  The bound is attained, for example by
`L = (a + 2d + R) mod 4`; different `a`, `d`, or `R` force a different `L`, so
no two chosen patterns differ in exactly one group.  ∎

**Corollary (character-set capacity).**  A 7-segment display under this model
cannot carry more than 32 distinct characters.  Decimal 0–9 and hex 0–F fit;
26 letters + 10 digits (36) and Base64 (64) do not.  A decimal point or minus
sign needs a separate segment or consumes one of the 32 slots; it cannot be
added for free.

The 7+4 diagonal model in §3.4 has capacity 128, so it is not ruled out by
capacity for a 64-character set.  Whether the glyphs are recognisable is a
separate design problem (M4).

### 2.4 Minimum maximal set

**Theorem (minimum).**  Every maximal unambiguous set has size at least 16;
16 is attained.

*Proof sketch.*  Fix `g`.  A selected pattern dominates itself and every
pattern that differs in exactly one coordinate group.  The closed neighbourhood
has size

```
1 + (2−1) + (2−1) + (4−1) + (4−1) = 9.
```

There are 64 patterns, so any dominating set — in particular any maximal
independent set — has size at least `⌈64/9⌉ = 8`.  Two copies give 16.  The
bound is attained; an explicit 8-set per `g` is produced by the enumeration in
`foundation/block.py`.  ∎

### 2.4.1 Explicit extremal examples

A minimum global set of 16 (8 per `g`).  In segment order `a,b,c,d,e,f,g`,
the `g=0` half is:

```
0000010  0011000  0101110  0110100
1001100  1010110  1100000  1111010
```

and the `g=1` half is the same eight patterns with the last bit set.  There are
144 such 8-sets per `g`, hence 20,736 global minimum sets.

A maximum set of 32.  For each `a,d ∈ {0,1}`, `R ∈ {0,1,2,3}`, and `g ∈ {0,1}`,
choose the unique `L = (a + 2d + R) mod 4`, where `L` encodes `(e,f)` and `R`
encodes `(b,c)`.  That is 16 patterns per `g`, 32 globally.  There are 7,704
maximum sets per `g`, hence 59,351,616 global maximum sets.

### 2.5 Construction grammar

The 9/10 gap has a precise structural explanation.  Partition by `(a,d)` into
four cells.  Inside one cell, the selected `(L,R)` pairs must form a **matching**
of `K₄,₄` (no shared `L`, no shared `R`); otherwise two patterns differ only in
`L` or only in `R` and collide.

Two cells that share one of `a,d` may not use the same `(L,R)` edge; diagonal
cells may.  Finally, for maximality, every **hole** of a cell — an unused `L`
value times an unused `R` value — must be covered by an edge in one of the two
adjacent cells.

There are only 209 matchings of `K₄,₄`.  Enumerating the four cells under those
rules produces exactly the 604,008 maximal sets.  The feasible cell-size
patterns are:

| total size | sorted `(m00,m01,m10,m11)` | count |
|---:|---|---:|
| 8 | (2,2,2,2) | 144 |
| 11 | (2,3,3,3) | 4,608 |
| 12 | (2,2,4,4) | 288 |
| 12 | (3,3,3,3) | 148,896 |
| 13 | (2,3,4,4) | 4,608 |
| 13 | (3,3,3,4) | 208,512 |
| 14 | (2,4,4,4) | 2,304 |
| 14 | (3,3,4,4) | 176,256 |
| 15 | (3,4,4,4) | 50,688 |
| 16 | (4,4,4,4) | 7,704 |

No row sums to 9 or 10.  The gap is therefore not a parity accident: it is the
absence of a feasible cell-size pattern.  The minimum (2,2,2,2) and maximum
(4,4,4,4) are the extreme points of this grammar.

**A complete generator.**  Enumerate the 209 matchings per cell, keep 4-tuples
satisfying (i) cross-cell edge-disjointness for adjacent cells and (ii)
hole-covering for every cell.  The C++ program `foundation/count_mixed.cpp`
does exactly this and reproduces all counts above in under a second.

### 2.6 Verification of the source note

The source note’s core claims were re-derived.  Verdicts:

| source claim | verdict |
|---|---|
| conflict rule (differ in exactly one of `a`, `d`, `L`, `R`) | correct |
| maximum unambiguous set = 32 | correct; proof in §2.3 |
| minimum maximal set = 16 | correct; proof sketch in §2.4 |
| maximal sizes 16–32 | bounds correct, but **17 and 18 do not exist**; the exact set is `{16} ∪ {19..32}` |
| per-`g` maximum 16, minimum 8 | correct |
| local-optimum trap: a maximal set of size 16 exists | correct; there are 20,736 of them globally |
| hex table 0–F is unambiguous | correct as a table |
| decimal table 0–9 is unambiguous | correct as a table |
| hex = 11 flips, decimal = 5 flips | correct counts |
| hex “not strictly optimal” | correct; the minimum total flips is 8 |
| decimal “5 flips” | not optimal; the minimum is 4 |
| hex ASCII figure | two errors: the drawn 9 has `d` lit (conflicts with 2 and 5), and the drawn F has `f` lit (conflicts with A and E); the **tables** are right |
| reduction 128 → 32, 96 removed, 75% | arithmetic correct |

The 9/10 gap is the substantive correction: the source’s “16 ≤ |S| ≤ 32” is a
true min/max statement but reads like a continuous range.  The exact attainable
set is `{16} ∪ {19..32}`.

---

## 3. Generalised family: `K₂ □ K₂ □ K_q □ K_q`

The 7-segment per-`g` graph is the member `q=4`.  Replacing the `L,R`
alphabets by size `q` gives a one-parameter family.  Exact counts (via
`foundation/block.py`) for small `q`:

| graph | patterns | attainable maximal sizes | total maximal sets |
|---|---:|---|---:|
| `(2,2)` = Q₄ | 16 | 4, 5, 8 | 42 |
| `(2,3)` | 24 | 6, 8 | 210 |
| `(2,4)` | 32 | 8 | 2,652 |
| `(2,8)` | 64 | 8 | 3,440,024 |
| `(3,3)` | 36 | 6, 7, 8, 9, 10, 11, 12 | 2,052 |
| `(3,4)` | 48 | 8, 10, 11, 12 | 32,328 |
| `(4,4)` = 7-seg per `g` | 64 | 8, 11–16 | 604,008 |

### 3.1 What the gap looks like

- The gap is **not** a fixed sequence and **not** periodic.  It moves with the
  alphabet sizes: Q₄ misses 6,7; `(2,3)` misses 7; `(2,4)` and `(2,8)` miss
  everything except 8; `(3,3)` has no gap at all; `(3,4)` misses 9; 7-segment
  misses 9,10.
- The counts are not always unimodal.  For `(3,3)`:
  6:36, 7:288, 8:144, 9:144, 10:1,260, 11:144, 12:36 — a two-peak curve.
  Q₄ is 4:24, 5:16, 8:2 — it drops then rises.  The smooth unimodal shape of
  7-segment is a special case, not a general law.
- The missing sizes are exactly the unattainable cell-size patterns, as in
  §2.5.  The construction grammar is the explanation.
- It is **not a known named sequence** and it has no fixed period.  “9 and 10
  are missing” is a statement about the feasible cell-size patterns, not about
  a recurrence.

### 3.2 Well-covered members: the exact criterion

A graph is **well-covered** if every maximal independent set is maximum.
The family is completely characterised by the following elementary theorem.

**Theorem.**  Let `G = K_{q1} □ … □ K_{qd}` with `q1 ≥ q2 ≥ … ≥ qd ≥ 2`.
Then `G` is well-covered iff

```
q1 > Σ_{i=2..d} (q_i − 1),
```

equivalently `2·q1 > Σ_i q_i − d + 1`.  In particular, for two factors
(`d=2`) the condition is always true, recovering the known fact that
`K_n □ K_m` is well-covered.

**Proof.**

*(Sufficiency, condition ⇒ well-covered.)*  Suppose
`q1 > Σ_{i≥2}(q_i − 1)`.  Let `S` be a maximal independent set and suppose it
misses a line `L` in coordinate 1; write the other coordinates of `L` as `y`.
There are `q1` vertices on `L`, one for each value of coordinate 1.  Since `S`
is maximal, each of those vertices must be adjacent to a selected vertex.  A
selected vertex adjacent to a vertex of `L` cannot differ in coordinate 1 (it
would be on `L`), so it must have the same coordinate 1 and differ in exactly
one of the other coordinates.  Thus, for each of the `q1` values of
coordinate 1, `S` contains a vertex `(x, y_x)` with `y_x` a neighbour of `y`
in `K_{q2} □ … □ K_{qd}`.  The `y_x` must be distinct: two vertices with the
same `y_x` and different `x` differ only in coordinate 1 and would be
adjacent, contradicting independence.  But `y` has only
`Σ_{i≥2}(q_i − 1)` neighbours, fewer than `q1`.  Contradiction.  Hence `S`
meets every line in coordinate 1, so `|S| = N/q1 = α(G)`.

*(Necessity, by contraposition.)*  Suppose
`q1 ≤ Σ_{i≥2}(q_i − 1)`.  Choose a vertex `y` in the product of coordinates
`2..d` and `q1` distinct neighbours `y_1,…,y_{q1}` of `y` (possible because
the degree is `Σ_{i≥2}(q_i − 1)`).  The set
`S0 = {(x, y_x) : x = 1..q1}` is independent: two vertices differ in
coordinate 1, and their other coordinates are distinct, so their Hamming
distance is at least 2.  It also dominates every vertex of the line `L` over
`y`, since `(x, y)` is adjacent to `(x, y_x)`.  Extend `S0` to a maximal
independent set `S`.  No vertex of `L` can be added to `S` (each is adjacent
to a member of `S0`), so `S` still misses `L`.  A set that misses a line in
coordinate 1 has at most `N/q1 − 1` vertices, because each selected vertex
occupies exactly one such line and the lines are disjoint.  Hence
`|S| < N/q1 = α(G)`, and `G` is not well-covered.  ∎

For 7-segment, `q=(2,2,4,4)`, so `q1=4` and
`Σ_{i≥2}(q_i − 1) = 1+1+3 = 5`; `4 > 5` is false, so the graph is not
well-covered, so maximal sets need not all have the same size. The specific
9/10 gap is established by the construction grammar and exact enumeration;
non-well-coveredness alone does not imply that particular gap.

Verification against the exact/CP-SAT data:

| alphabet sizes | q1 | Σ others (q_i−1) | criterion | observed |
|---|---:|---:|---|---|
| 2,2,2,2 | 2 | 3 | not WC | 4,5,8 |
| 2,2,2,3 | 3 | 3 | not WC | 6,8 |
| 2,2,2,4 | 4 | 3 | WC | 8 |
| 2,2,2,5 | 5 | 3 | WC | 8 |
| 2,2,3,4 | 4 | 4 | not WC | min 8, max 12 |
| 2,2,3,5 | 5 | 4 | WC | 12 |
| 2,2,4,4 | 4 | 5 | not WC | 8, 11–16 |
| 2,2,4,6 | 6 | 5 | WC | 16 |
| 3,3,3,3 | 3 | 6 | not WC | min 9, max 27 |

The exact statement was not found in the literature search; the proof above is
elementary and is included because it explains the family data.  Treat the
novelty as **pending**: if the statement is known, it is a short re-proof of a
known well-covered/Hamming-graph result, and the contribution is the exact
enumeration and the application, not the criterion itself.  The background is
Plummer (well-covered graphs), Topp–Volkmann and Hartnell–Rall (Cartesian
products), and the independent-domination literature on Hamming graphs.

### 3.3 The 9-segment continuation

For `K₂ □ K₂ □ K₈ □ K₈` (a 9-segment analogue) there are 256 patterns per
copy; the maximum is 32 (CP-SAT, optimal).  CP-SAT finds feasible maximal sets
for every size **24–32**; sizes 20–23 were not settled within the time limit.
So the gap appears to shrink or vanish as the alphabet grows, but this is a
**bound**, not an exact result.  The exact minimum is still open in our runs.

### 3.4 The 7+4 diagonal layout

`foundation/layouts.py` defines an 11-segment model: the seven standard
segments plus four diagonals from the corners to the centre.  A side cover also
removes the diagonals meeting that side, so the covers overlap.  This is a
model, not a claim about a specific commercial package.

| quantity | value |
|---|---:|
| segments / patterns | 11 / 2,048 |
| maximum unambiguous set | **128** (CP-SAT optimal) |
| minimum maximal set | not settled (CP-SAT finds feasible sets, no optimality proof) |
| exact enumeration of all maximal sets | not attempted in M1 |

This is the first extension case: the same layout model, conflict graph and
solver run unchanged.  The capacity grows from 32 to 128, which is why a larger
segment space is the route to 36-letter alphanumeric or Base64 (128 > 64, so
capacity alone no longer blocks Base64; recognisability and glyph design do).
The exact minimum and the full count are carried into M2/M4; they are not
needed for the capacity claim.

---

## 4. Overlapping covers: the 3×3 pixel grid

The mixed-Hamming family assumes disjoint cover groups.  A pixel grid has
overlapping covers: in a 3×3 grid, the top row and left column share the
top-left pixel.  The engine handles this through the general conflict graph.

Model: 9 pixels; top/bottom remove a complete row; left/right remove a complete
column; corners belong to two covers.

| quantity | value |
|---|---:|
| patterns | 512 |
| conflict edges | 6,144 |
| closed neighbourhood size | 25 (every vertex) |
| domination lower bound | 21 |
| maximum independent set | **64** (exact) |
| best feasible minimum maximal set | **32** (CP-SAT) |
| proven range for the minimum | 21 ≤ min ≤ 32 |

The minimum is not settled.  This is a deliberate open case: it shows that
overlapping covers break the product structure and that exact enumeration is
much harder.  The general engine (`foundation/exact.py`) computes the maximum
and the lower bound; CP-SAT or a dedicated search is needed for the minimum.

The point is not the specific 3×3 number.  The point is that the foundation is
**layout-parametric**: the same conflict graph, validation, capacity and
maximal-set machinery runs on 7-segment, pixel grids, and custom cover masks.

---

## 5. Recognisability: from “looks like” to a model

### 5.1 What the literature gives us

Bouma and van Nes separate three notions: **acceptability** (resemblance to the
reader’s internal notion of the character), **identifiability** (clear
details), and **distinctiveness** (difference from other characters).  Van Nes
and Bouma (1980) measured perceptual confusions between seven-segment numerals
and derived **perceptual weights** for the segments: F is the most distinctive
segment, D the least.  Structural digit-recognition work uses holes, connected
components, endpoints, junctions, curvature and symmetry as features.

### 5.2 The baseline model

For a candidate glyph `g` and the standard glyph `s` of the intended digit:

```
d_vis(g,s) = Σ_i w_i · [g_i ≠ s_i]                       (visible shape)
d_occ(g,s) = Σ_c Σ_i w_i · [proj_c(g)_i ≠ proj_c(s)_i]   (occluded shape)
R(g,s)     = exp( −(λ_vis · d_vis + λ_occ · d_occ) )
```

The second term is the user’s added requirement: the glyph should also match
what a viewer expects the digit to look like **after the same side is covered**.
Its weight is lower (`λ_occ = 0.3 · λ_vis` by default) because the visible
shape is the primary cue.

Default segment weights (provisional): `a=1.0, b=1.0, c=1.0, d=0.6, e=1.0,
f=1.2, g=1.1`; `λ_vis=1.0`, `λ_occ=0.3`.  They encode the qualitative ordering
from van Nes–Bouma, not measured values for this font.

Baseline scores (higher is better; see `foundation/results/foundation.json`):

| font | mean | min | total flips | visible topology mismatches |
|---|---:|---:|---:|---|
| doc decimal | 0.609 | 0.150 | 5 | 6, 8 |
| min-flip decimal (`MIN_DEC`) | 0.694 | 0.150 | 4 | 7, 8 |
| min-distance decimal (`OPT_DEC`) | **0.711** | 0.150 | 4 | 8 |
| doc hex | 0.665 | 0.005 | 11 | 6, 8, F |
| min-flip hex | 0.571 | 0.089 | 8 | 0, 6, 8, 9, A, C |

`MIN_DEC` is one 4-flip optimum; `MIN_FLIP_DEC` (CP-SAT) is another 4-flip
optimum with a degenerate `1 = b` only, kept as a warning.  These numbers are
**not** a verdict.  The min-distance candidate `OPT_DEC`
scores above the source note’s decimal set, but its 5/8 forms still need a
human eye.  The min-flip CP-SAT font (`1 = b` only) is a warning: a low flip
count can hide a degenerate glyph.  The 30-flip zero-mismatch font is a second
warning: topology alone is gameable.  The weights need calibration; a ranking
that flips under a small weight change is not yet a standard.  See
`docs/RECOGNITION.md` for the full Pareto table.

### 5.3 Topological signature (implemented)

The topological signature is now computed from the rasterised geometry in
`foundation/topology.py`: `(components, holes)`, with a small dilation that
closes standard segment gaps.  The standard table is 0/6/9 = one hole, 8 = two
holes, 1/2/3/4/5/7 = none.  The signature is an objective **necessary**
condition, not a sufficient one: a 30-flip font with zero visible topology
mismatches exists and scores 0.105, i.e. it is unreadable.  The full analysis,
the font Pareto table and the 6/8 structural conflict are in
`docs/RECOGNITION.md`.

A **nearest-standard** (segment-fault) check is also implemented: the intended
digit should be the unique closest standard in the chosen character set, using
the weighted distance.  For decimal, `OPT_DEC` passes (the unweighted 3/7 tie
is broken by the weights).  For hex, the check is **infeasible for all 16
glyphs**; the minimum number of nearest violations is one (8), and the source
note’s hex font has two (6 and 8).  Details in `docs/RECOGNITION.md`.

The next step is calibration, not another hand rule:

1. Run a small recognition quiz/game: show a glyph (possibly occluded), ask for
   the digit, record the confusion matrix.
2. Fit `w_i`, `λ_vis`, `λ_occ` to that data and report confidence intervals.
3. Re-rank the font sets on the fitted model, and only then call one “better”.
4. Put the model-optimised 4-flip decimal font in front of a human eye; it
   changes 1/3/5/8, keeps 6 standard, and has one visible topology mismatch.

Until step 2, the model is a transparent baseline, not an objective truth.

---

## 6. What is new, what is known

Known background:

- The per-`g` graph is a mixed Hamming graph; Hamming-graph independence and
  independent domination are studied.
- `K_n □ K_m` is well-covered for all `n,m`; the multi-factor well-covered
  question is part of a larger literature.
- Van Nes–Bouma, Bouma, and the structural-feature literature cover the
  perceptual side.
- The 2024 *Journal of Vision* paper on bistable perception of occluded
  traffic-countdown numerals documents the motivating phenomenon.

New in this foundation (pending a more thorough novelty search):

- Exact counts and the 9/10 gap for `K₂ □ K₂ □ K₄ □ K₄`, including the
  cell-size grammar and the 604,008 / 364,825,664,064 totals.
- The one-parameter family table and the observation that the gap is not
  periodic; the exact well-covered criterion `q1 > Σ(q_i−1)` with a short
  proof (novelty check pending).
- The 32-character capacity corollary applied to the character-set extensions.
- The visible-plus-occluded recognisability model and its baseline scores.

We will not claim the mixed-Hamming or well-covered framework as new.  Before
publishing, search the exact numbers and the candidate theorem again; the
foundation note records that check as part of M2.

---

## 7. Reproduction

```bash
# Everything in this note except the optional SAT queries:
python -m foundation.verify_sevenseg
python -m foundation.experiments

# Optional CP-SAT queries (3x3 grid, 9-seg sizes):
uv run --with ortools python -m foundation.exact
```

Outputs:

- `foundation/results/foundation.json` — all tables and font checks.
- `foundation/plots/sevenseg_per_g_counts.svg` — per-`g` count curve.
- `foundation/plots/sevenseg_global_counts.svg` — global count curve.
- `foundation/plots/family_existence.svg` — attainable sizes for the family.
- `foundation/plots/family_33_counts.svg` — non-unimodal `(3,3)` counts.

The C++ helper `foundation/count_mixed.cpp` is compiled on first use.  The
Python paths are dependency-free; CP-SAT is optional.

---

## 8. Open questions carried into M2

1. Search for prior art on the well-covered criterion
   `q1 > Σ_{i≥2}(q_i−1)`; the proof is in §3.2 and the novelty is pending.
2. Settle the exact minimum maximal size for the 3×3 pixel grid (currently
   21 ≤ min ≤ 32, best feasible 32).
3. Settle the exact minimum for `K₂ □ K₂ □ K₈ □ K₈` (currently feasible from
   24; 20–23 unknown).
4. Extend the topological signature with endpoints, junctions and symmetry
   (holes + components are implemented in `foundation/topology.py`).
5. Calibrate the recognisability weights with a quiz and re-rank the fonts.
6. Human review of the min-distance 4-flip decimal font (`OPT_DEC`).
7. Search the exact counts and the criterion for prior art before publishing.
