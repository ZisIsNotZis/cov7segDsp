"""Font tables used in the research notes.

Pattern strings are in segment order a,b,c,d,e,f,g (1 = lit).
"""
from __future__ import annotations

from .layouts import seven_seg
from .model import patterns_from_strings

STANDARD = {
    "0": "1111110",
    "1": "0110000",
    "2": "1101101",
    "3": "1111001",
    "4": "0110011",
    "5": "1011011",
    "6": "1011111",
    "7": "1110000",
    "8": "1111111",
    "9": "1111011",
    "A": "1110111",
    "b": "0011111",
    "C": "1001110",
    "d": "0111101",
    "E": "1001111",
    "F": "1000111",
}

# The decimal/hex sets from the source note, corrected to the tables (not the
# ASCII figures).
DOC_DEC = {
    "0": "1111110",
    "1": "0111000",  # + d
    "2": "1101101",
    "3": "1110001",  # - d
    "4": "0110011",
    "5": "0011011",  # - a
    "6": "1001111",  # - c
    "7": "1110000",
    "8": "0111111",  # - a
    "9": "1111011",
}

DOC_HEX = {
    "0": "1111110",
    "1": "0111000",  # + d
    "2": "1101101",
    "3": "1111001",
    "4": "0110011",
    "5": "1011011",
    "6": "1010001",  # - d,e,f
    "7": "1110000",
    "8": "0100111",  # - a,c,d
    "9": "1100011",  # - c,d
    "A": "1110111",
    "b": "0011111",
    "C": "0001110",  # - a
    "d": "0111101",
    "E": "1001111",
    "F": "1000101",  # - f
}

# Exact minimum-total-flip sets found by the z3 optimisation (see
# foundation/verify_sevenseg.py).  They are valid but less recognisable.
MIN_DEC = {
    "0": "1111110",
    "1": "0110000",
    "2": "1101101",
    "3": "0111001",  # - a
    "4": "0110011",
    "5": "1010011",  # - d
    "6": "1011111",
    "7": "1010000",  # - b
    "8": "1110111",  # - d
    "9": "1111011",
}

MIN_HEX = {
    "0": "0111110",  # - a
    "1": "0110000",
    "2": "1101101",
    "3": "1111001",
    "4": "0110011",
    "5": "1011011",
    "6": "1011110",  # - g
    "7": "1100000",  # - c
    "8": "1110111",  # - d
    "9": "1111010",  # - g
    "A": "1110110",  # - g
    "b": "0011111",
    "C": "1001100",  # - f
    "d": "0111101",
    "E": "1001111",
    "F": "0000111",  # - a
}

# CP-SAT candidates from foundation/font_opt.py.  OPT_DEC is the
# minimum weighted visible+occluded distance (4 flips, one visible topology
# mismatch).  MIN_FLIP_DEC is a different 4-flip optimum; it is kept as a
# warning about degenerate shapes (1 = b only).  TOP0_DEC preserves every
# visible topology signature but is unreadable; it is a counterexample.
OPT_DEC = {
    "0": "1111110",
    "1": "0111000",
    "2": "1101101",
    "3": "1110001",
    "4": "0110011",
    "5": "1010011",
    "6": "1011111",
    "7": "1110000",
    "8": "0111111",
    "9": "1111011",
}

MIN_FLIP_DEC = {
    "0": "1111110",
    "1": "0100000",
    "2": "1101101",
    "3": "1110001",
    "4": "0110011",
    "5": "1011010",
    "6": "1011111",
    "7": "1110000",
    "8": "0111111",
    "9": "1111011",
}

MIN_MISMATCH_DEC = {
    "0": "0011101",
    "1": "0000010",
    "2": "1110001",
    "3": "0000001",
    "4": "1110010",
    "5": "0001100",
    "6": "1100011",
    "7": "0011000",
    "8": "1111111",
    "9": "1111110",
}

TOP0_DEC = {
    "0": "1111110",
    "1": "0110000",
    "2": "1101101",
    "3": "0111001",
    "4": "0110111",
    "5": "1011011",
    "6": "0011111",
    "7": "1100000",
    "8": "1111111",
    "9": "1110011",
}


def as_patterns(table: dict[str, str]) -> dict[str, int]:
    layout = seven_seg()
    pats = patterns_from_strings(layout, list(table.values()))
    return dict(zip(table, pats))


def flips_from_standard(table: dict[str, str]) -> dict[str, int]:
    return {
        k: sum(a != b for a, b in zip(v, STANDARD[k]))
        for k, v in table.items()
    }
