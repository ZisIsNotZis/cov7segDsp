"""Fit per-segment perceptual weights from the lab quiz export.

Model (visible-evidence conditional logit):
  P(response = r | shown glyph g, cover c)
      ∝ exp( - Σ_{i visible under c} w_i · [g_i ≠ standard[r]_i] )

Only segments the viewer can see enter the likelihood.  The weights w_i are
fitted by maximum likelihood; the hidden segments are the viewer's prior, not
observed evidence.  The design score's λ_occ is a separate design weight, not
identifiable from these responses alone.

Usage:
    uv run --with scipy python -m foundation.calibrate --data quiz.json
    uv run --with scipy python -m foundation.calibrate --synthetic
"""
from __future__ import annotations

import argparse
import json
import math
import random
from pathlib import Path

from .fonts import (
    DOC_DEC,
    DOC_HEX,
    MIN_DEC,
    MIN_FLIP_DEC,
    MIN_HEX,
    MIN_MISMATCH_DEC,
    OPT_DEC,
    STANDARD,
    TOP0_DEC,
    as_patterns,
)
from .layouts import seven_seg

LAYOUT = seven_seg()
SEGMENTS = LAYOUT.segments
SEG_INDEX = {s: i for i, s in enumerate(SEGMENTS)}
COVER_NAMES = tuple(LAYOUT.covers)
COVER_MASKS = {name: mask for name, mask in LAYOUT.covers.items()}

DEFAULT = {"a": 1.0, "b": 1.0, "c": 1.0, "d": 0.6, "e": 1.0, "f": 1.2, "g": 1.1}
BOUNDS = {s: (0.05, 3.0) for s in SEGMENTS}

FONT_MAP = {
    "standard-dec": {k: STANDARD[k] for k in "0123456789"},
    "doc-dec": DOC_DEC,
    "opt-dec": OPT_DEC,
    "min-flip-dec": MIN_FLIP_DEC,
    "top0-dec": TOP0_DEC,
    "min-mismatch-dec": MIN_MISMATCH_DEC,
    "standard-hex": STANDARD,
    "doc-hex": DOC_HEX,
    "min-flip-hex": MIN_HEX,
}


def mask(pattern: str) -> int:
    v = 0
    for i, ch in enumerate(pattern):
        if ch == "1":
            v |= 1 << i
    return v


def visible_mask(cover: str | None) -> int:
    if cover is None:
        return (1 << len(SEGMENTS)) - 1
    return ((1 << len(SEGMENTS)) - 1) & ~COVER_MASKS[cover]


def distance(p: int, q: int, visible: int, weights: dict[str, float]) -> float:
    d = 0.0
    for i, s in enumerate(SEGMENTS):
        if (visible >> i) & 1 and ((p >> i) & 1) != ((q >> i) & 1):
            d += weights[s]
    return d


def trial_table(trial: dict) -> dict[str, str]:
    """Use the actual displayed font snapshot; v1 data is legacy/unverified."""
    if "glyphs" not in trial:
        return FONT_MAP[trial["font"]]
    table = trial["glyphs"]
    if not isinstance(table, dict) or not table:
        raise ValueError("empty or invalid trial glyph snapshot")
    for label, pattern in table.items():
        if label not in STANDARD or not isinstance(pattern, str) or len(pattern) != 7 or set(pattern) - {"0", "1"}:
            raise ValueError("calibration requires known labels and seven binary segments")
    return table


def logits(trial: dict, weights: dict[str, float]) -> dict[str, float]:
    table = trial_table(trial)
    p = mask(table[trial["shown"]])
    vis = visible_mask(trial.get("cover"))
    std = as_patterns(STANDARD)
    return {
        r: -distance(p, std[r], vis, weights)
        for r in table
    }


def nll(trials: list[dict], weights: dict[str, float]) -> float:
    total = 0.0
    for t in trials:
        table = trial_table(t)
        if t["shown"] not in table or t.get("response") not in table:
            continue
        z = logits(t, weights)
        m = max(z.values())
        denom = sum(math.exp(v - m) for v in z.values())
        total -= z[t["response"]] - m - math.log(denom)
    return total


def accuracy(trials: list[dict], weights: dict[str, float]) -> float:
    good = 0
    total = 0
    for t in trials:
        table = trial_table(t)
        if t["shown"] not in table or t.get("response") not in table:
            continue
        z = logits(t, weights)
        pred = max(z, key=z.get)
        good += pred == t["response"]
        total += 1
    return good / total if total else 0.0


def fit(trials: list[dict]):
    try:
        from scipy.optimize import minimize
    except ImportError as exc:  # pragma: no cover
        raise RuntimeError(
            "scipy is required for calibration; run "
            "`uv run --with scipy python -m foundation.calibrate ...`"
        ) from exc
    x0 = [DEFAULT[s] for s in SEGMENTS]
    bounds = [BOUNDS[s] for s in SEGMENTS]

    def objective(x):
        w = dict(zip(SEGMENTS, x))
        return nll(trials, w) + 1e-4 * sum((v - 1.0) ** 2 for v in x)

    res = minimize(objective, x0, method="L-BFGS-B", bounds=bounds)
    weights = dict(zip(SEGMENTS, res.x))
    return weights, res


def synthetic_trials(n: int, true_weights: dict[str, float], seed: int = 1) -> list[dict]:
    rng = random.Random(seed)
    fonts = [k for k in FONT_MAP if k.endswith("-dec") or k.endswith("-hex")]
    trials = []
    for _ in range(n):
        font = rng.choice(fonts)
        labels = list(FONT_MAP[font])
        shown = rng.choice(labels)
        cover = rng.choice([None, *COVER_NAMES])
        t = {"font": font, "shown": shown, "cover": cover}
        z = logits(t, true_weights)
        m = max(z.values())
        probs = {k: math.exp(v - m) for k, v in z.items()}
        total = sum(probs.values())
        r = rng.random() * total
        acc = 0.0
        response = labels[0]
        for k, v in probs.items():
            acc += v
            if r <= acc:
                response = k
                break
        t["response"] = response
        trials.append(t)
    return trials


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", type=str, help="quiz JSON export")
    ap.add_argument("--synthetic", action="store_true", help="run a self-test")
    ap.add_argument("--n", type=int, default=4000)
    args = ap.parse_args()
    if args.synthetic:
        true = {**DEFAULT, "f": 1.6, "d": 0.4, "g": 1.3}
        trials = synthetic_trials(args.n, true)
        weights, res = fit(trials)
        rmse = math.sqrt(sum((weights[s] - true[s]) ** 2 for s in SEGMENTS) / len(SEGMENTS))
        print("synthetic fit", res.success, res.message)
        print("true   ", {s: round(true[s], 3) for s in SEGMENTS})
        print("fitted ", {s: round(weights[s], 3) for s in SEGMENTS})
        print("rmse   ", round(rmse, 3))
        return
    if not args.data:
        ap.error("provide --data quiz.json or --synthetic")
    trials = json.loads(Path(args.data).read_text(encoding="utf-8"))
    if any(t.get("schema") != "cov7seg-trial-v2" for t in trials):
        print("WARNING: legacy responses may expose hidden segments or omit edited glyphs; do not treat this fit as validated perception evidence.")
    weights, res = fit(trials)
    print("fit", res.success, res.message)
    print("weights", {s: round(weights[s], 3) for s in SEGMENTS})
    print("accuracy default", round(accuracy(trials, DEFAULT), 3))
    print("accuracy fitted ", round(accuracy(trials, weights), 3))


if __name__ == "__main__":
    main()
