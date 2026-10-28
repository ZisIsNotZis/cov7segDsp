# Why it exists

A seven-segment numeral is read at a glance.  When a thin object — a leaf, a
truck, a sign, a pole — covers one side of the display, the outermost line on
that side disappears.  The remaining pattern can be a valid pattern of a
different digit: a partially covered countdown becomes ambiguous exactly when
the driver is making a time-critical decision.  The phenomenon is documented
in perception research: occluded traffic-countdown numerals can bistably read
as 6 or 8 (Luo et al., *Journal of Vision*, 2024).

Today the common “fixes” are physical (clean the display, move the sign) or
acceptance of the risk.  The font side is under-explored: seven-segment fonts
are not designed for occlusion, and the question “which set of glyphs stays
unambiguous when any one side is covered?” is a clean combinatorial problem
with a practical edge.

The project exists to make that problem precise, general, and useful:

- exact combinatorial facts, not folklore;
- a layout-parametric engine that survives a change of grid or character set;
- a recognisability model that is reproducible and can be calibrated;
- an interactive explanation that a non-mathematician can play with.

The pain is not only the traffic light.  Anyone who designs or reads a
segmented display — clocks, meters, countdowns, instrument panels — can meet
the same failure.  The project is a foundation for that whole family, with the
traffic countdown as the motivating case.
