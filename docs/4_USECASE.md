# Who does what

## Story 1 — the researcher

As a researcher, I want to reproduce the exact enumeration and inspect the
construction rule, so that I can trust the numbers and extend them.

Acceptance:

- `python -m foundation.verify_sevenseg` passes.
- `python -m foundation.experiments` writes `foundation/results/foundation.json`.
- The JSON contains the per-`g` and global counts, the family table, the grid
  bounds and the font checks.
- `docs/FOUNDATION.md` explains the 4-cell matching grammar and names the open
  cases.

## Story 2 — the font designer

As a designer, I want to check a candidate glyph table, so that I know whether
it is unambiguous and which pairs collide.

Acceptance:

- `foundation.charset.check_table(table)` returns `ok`, the conflicting pairs
  and per-cover uniqueness.
- The doc’s decimal and hex tables pass; the standard tables fail where the
  original ambiguity exists.
- The flip count and the visible/occluded score are reported for each glyph.
- The min-flip and doc sets are both shown, labelled, so the trade-off is
  visible rather than hidden.

## Story 3 — the reader of the public note

As a curious reader, I want to understand why 9 and 10 are impossible in the
7-segment model, so that the result feels explainable rather than magical.

Acceptance:

- The construction grammar and the feasible cell-size table are in the note.
- The generalised family shows that the gap moves and can disappear.
- The plots show the count curve and the attainable-size dot plot.
- The note says plainly which parts are proved and which are computational or
  open.

## Story 4 — the player (M3)

As a player, I want to design a glyph set and see immediately what breaks, so
that I learn the constraint by playing.

Acceptance (later milestone):

- Toggle segments and covers; conflicting pairs are outlined and the hidden
  segments are highlighted red.
- A quiz measures whether a glyph is recognised as the intended digit; the
  results can calibrate the recognisability weights.
- The game runs in a static HTML file with no server.

## Story 5 — the extension builder (M4)

As a builder, I want a new segment layout or character set to be data, not a
rewrite, so that the foundation survives the extension.

Acceptance:

- A layout is a segment list plus cover masks; the engine runs unchanged.
- A character set is a mapping label → pattern; capacity and conflicts are
  computed from the layout.
- The docs state which layouts/covers are supported and which are open.
