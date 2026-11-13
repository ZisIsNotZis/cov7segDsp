"""Reproduce finite fault/cover results: python -m foundation.channel_experiments.

No external solver is needed. Hard capacities retain explicit bounds; every
reported construction and every exact capacity includes a witness.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

from .channels import Channel, capacity, capacity_sat, check_font, cover_family, extended_layouts, embed_standard
from .fonts import STANDARD, OPT_DEC, DOC_DEC


def hamming7() -> list[int]:
    """[7,4,3] binary code; parity-check columns are binary 1 through 7."""
    return [p for p in range(128) if _syndrome(p) == 0]


def _syndrome(p):
    x = 0
    for i in range(7):
        if p >> i & 1:
            x ^= i + 1
    return x


def protected_hex(layout):
    """Keep the standard outline, add seven protected Hamming check/data bits.

    A proof-of-capability, not a legibility-optimised font: geometry must leave
    these extra strokes outside every allowed cover.
    """
    extra = [i for i, s in enumerate(layout.segments) if s not in "abcdefg"]
    if len(extra) < 7:
        raise ValueError("Need seven protected independent inner strokes")
    font = embed_standard(layout, STANDARD)
    for (label, base), code in zip(font.copy().items(), hamming7()):
        font[label] = base | sum(1 << extra[i] for i in range(7) if code >> i & 1)
    return font


def run(timeout=.5, sat=False):
    import platform
    layouts = extended_layouts()
    seven = layouts["seven"]
    records, cache = [], {}
    for mode in ("none", "lr", "lrt", "all", "both-lr", "all-simultaneous"):
        for known in ((True, False) if mode in ("lr", "all") else (True,)):
            for fault in ("off", "on", "flip"):
                for k in (0, 1, 2):
                    for task in ("detection", "correction"):
                        # k=0 ignores the fault type; known/unknown has no
                        # difference for one fixed cover.
                        effective_fault = fault if k else "off"
                        key = (mode, known, effective_fault, k, task)
                        channel = Channel(cover_family(seven, mode), effective_fault, k, known)
                        if key not in cache:
                            cache[key] = capacity(seven, channel, task, timeout=timeout)
                            if sat and cache[key]["status"] != "exact":
                                cache[key] = capacity_sat(seven,channel,task,timeout=10)
                        c = cache[key]
                        standard = embed_standard(seven, {s: STANDARD[s] for s in "0123456789"})
                        candidate = embed_standard(seven, OPT_DEC)
                        comparisons = {}
                        for name, font in (("standard-dec", standard), ("opt-dec", candidate)):
                            check = check_font(seven, font, channel, task)
                            comparisons[name] = {**check, "conflicts": check["conflicts"][:4]}
                        records.append({"layout": "seven", "covers": mode,
                                        "cover_known": known, "fault": fault, "budget": k,
                                        "task": task, "capacity": c, "fonts": comparisons})
    layout_data = {}
    for key, layout in layouts.items():
        layout_data[key] = {"name": layout.name, "segments": list(layout.segments),
                            "geometry": layout.geometry, "covers": dict(layout.covers),
                            "n_segments": layout.n_segments,
                            "reference_hex": embed_standard(layout, STANDARD)}
    split = layouts["split-x15"]
    protected = protected_hex(split)
    checks = {}
    for mode in ("lr", "all", "both-lr", "all-simultaneous"):
        ch = Channel(cover_family(split, mode), "flip", 1)
        checks[mode] = check_font(split, protected, ch, "correction")
        assert checks[mode]["ok"]
    return {"schema_version": 1,
            "computation": {"generator":"foundation.channel_experiments", "python":platform.python_version(),
                            "search_timeout_seconds":timeout, "sat_refinement":sat,
                            "sat_timeout_seconds":10 if sat else None,
                            "reproduce":"uv run --no-project --python 3.14 --with ortools python -m foundation.channel_experiments --sat" if sat else "python -m foundation.channel_experiments"},
            "model": {"budget": "at most k faults, including zero", "faults": ["off", "on", "flip"],
                      "detection": "No possible corrupted character impersonates a different clean character",
                      "correction": "Possible observation sets of different characters are disjoint",
                      "capacity": "Maximum number of arbitrary binary glyphs; not a human legibility claim",
                      "cover_known": "Cover identity is supplied to the decoder",
                      "cover_unknown": "Cover identity absent; hidden positions appear dark",
                      "pin": "Independent binary segment, not a physical package pin"},
            "layouts": layout_data, "cases": records,
            "charset_sizes": {"decimal": 10, "scientific-token-inventory": 13,
                              "hex": 16, "alphanumeric-case-insensitive": 36,
                              "alphanumeric-case-sensitive": 62, "base64": 64},
            "charset_note": "Scientific notation is a multi-position grammar. Decimal point is often an independent light/attribute; 13 tokens is only an inventory comparison, not a display design.",
            "constructions": {"hamming7": {"patterns": hamming7(), "size": 16,
                                                  "minimum_distance": 3, "provenance": "Classical binary [7,4,3] Hamming code"},
                              "protected-hex15": {"layout": "split-x15", "glyphs": protected,
                                                   "checks": checks, "size": 16,
                                                   "claim": "A standard outline plus seven protected inner Hamming bits corrects one flip under every listed known cover. Not an optimised readable font."}},
            "sources": [{"title": "MIT 6.451 lecture notes: errors and erasures", "url": "https://ocw.mit.edu/courses/6-451-principles-of-digital-communication-ii-spring-2005/bb895c1dee9ce0b39d6846e0aa984981_MIT6_451S05_FullLecNotes.pdf"},
                        {"title": "Codes for the Z-channel", "url": "https://arxiv.org/abs/2105.01427"}]}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--timeout", type=float, default=.5, help="Seconds per finite capacity search")
    parser.add_argument("--sat", action="store_true", help="Refine unresolved cases with optional OR-Tools")
    parser.add_argument("--output", type=Path, help="Explicit result destination; default preserves a stronger canonical result")
    args = parser.parse_args()
    result = run(args.timeout,args.sat)
    canonical = Path(__file__).parent / "results" / "channels.json"
    out = args.output or canonical
    if args.output is None and canonical.exists():
        old = json.loads(canonical.read_text(encoding="utf-8"))
        old_exact = sum(c["capacity"]["status"] == "exact" for c in old["cases"])
        new_exact = sum(c["capacity"]["status"] == "exact" for c in result["cases"])
        if new_exact < old_exact:
            out = canonical.with_name("channels.partial.json")
            print("Search did not reproduce every prior exact optimum; canonical channels.json preserved. "
                  "Use --sat to close remaining bounds. Draft result is channels.partial.json.")
    out.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    exact = sum(c["capacity"]["status"] == "exact" for c in result["cases"])
    print(f"Wrote {out}: {exact}/{len(result['cases'])} exact capacities; others explicitly bounded.")


if __name__ == "__main__":
    main()
