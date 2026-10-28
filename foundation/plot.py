"""Tiny dependency-free SVG plots for the foundation report."""
from __future__ import annotations

import math
from pathlib import Path

FONT = "font-family='ui-monospace, SFMono-Regular, Menlo, monospace'"
INK = "#1b1b1b"
MUTED = "#777"
ACCENT = "#c0392b"
GRID = "#e6e6e6"


def _esc(s: str) -> str:
    return (
        s.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


def bar_chart_svg(
    data: dict[int, int],
    path: str | Path,
    title: str,
    logy: bool = True,
    width: int = 760,
    height: int = 380,
) -> None:
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    keys = sorted(data)
    vals = [data[k] for k in keys]
    if logy:
        vals = [math.log10(v) if v > 0 else 0.0 for v in vals]
    vmax = max(vals) if vals else 1.0
    ml, mr, mt, mb = 70, 20, 48, 48
    pw, ph = width - ml - mr, height - mt - mb
    n = max(1, len(keys))
    bw = pw / n * 0.7
    step = pw / n
    parts = [
        f"<svg xmlns='http://www.w3.org/2000/svg' width='{width}' height='{height}' viewBox='0 0 {width} {height}'>",
        f"<rect width='100%' height='100%' fill='white'/>",
        f"<text x='{ml}' y='28' {FONT} font-size='16' fill='{INK}'>{_esc(title)}</text>",
        f"<text x='{ml}' y='{height-12}' {FONT} font-size='11' fill='{MUTED}'>size (number of selected patterns)</text>",
    ]
    if logy:
        parts.append(
            f"<text x='12' y='{mt+ph/2}' {FONT} font-size='11' fill='{MUTED}' transform='rotate(-90 12 {mt+ph/2})'>log10(count)</text>"
        )
    # grid
    for i in range(5):
        y = mt + ph - ph * i / 4
        parts.append(f"<line x1='{ml}' y1='{y}' x2='{ml+pw}' y2='{y}' stroke='{GRID}'/>")
        if logy:
            label = f"{vmax*i/4:.1f}"
        else:
            label = f"{int(vmax*i/4)}"
        parts.append(f"<text x='{ml-8}' y='{y+4}' text-anchor='end' {FONT} font-size='10' fill='{MUTED}'>{label}</text>")
    for i, (k, v) in enumerate(zip(keys, vals)):
        x = ml + i * step + (step - bw) / 2
        h = 0 if vmax == 0 else ph * v / vmax
        y = mt + ph - h
        parts.append(
            f"<rect x='{x:.1f}' y='{y:.1f}' width='{bw:.1f}' height='{h:.1f}' fill='{ACCENT}' opacity='0.85'/>"
        )
        parts.append(
            f"<text x='{x+bw/2:.1f}' y='{height-mb+16}' text-anchor='middle' {FONT} font-size='10' fill='{INK}'>{k}</text>"
        )
        if data[k] and (len(keys) <= 20):
            parts.append(
                f"<text x='{x+bw/2:.1f}' y='{y-4:.1f}' text-anchor='middle' {FONT} font-size='9' fill='{MUTED}'>{data[k]}</text>"
            )
    parts.append("</svg>")
    path.write_text("\n".join(parts), encoding="utf-8")


def dot_plot_svg(
    families: dict[str, list[int]],
    path: str | Path,
    title: str,
    width: int = 820,
    height: int | None = None,
) -> None:
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    rows = list(families.items())
    height = height or 90 + 34 * len(rows)
    ml, mr, mt, mb = 230, 24, 48, 44
    pw, ph = width - ml - mr, height - mt - mb
    all_sizes = [s for _, xs in rows for s in xs] or [0]
    smin, smax = min(all_sizes), max(all_sizes)
    span = max(1, smax - smin)
    def xpos(s: int) -> float:
        return ml + pw * (s - smin) / span
    parts = [
        f"<svg xmlns='http://www.w3.org/2000/svg' width='{width}' height='{height}' viewBox='0 0 {width} {height}'>",
        "<rect width='100%' height='100%' fill='white'/>",
        f"<text x='{ml}' y='28' {FONT} font-size='16' fill='{INK}'>{_esc(title)}</text>",
    ]
    # x ticks at every integer if range small
    for s in range(smin, smax + 1):
        x = xpos(s)
        parts.append(f"<line x1='{x:.1f}' y1='{mt-6}' x2='{x:.1f}' y2='{mt+ph}' stroke='{GRID}'/>")
        if (smax - smin) <= 20 or s % 2 == 0:
            parts.append(f"<text x='{x:.1f}' y='{height-18}' text-anchor='middle' {FONT} font-size='10' fill='{MUTED}'>{s}</text>")
    for r, (name, xs) in enumerate(rows):
        y = mt + 18 + r * (ph / max(1, len(rows)))
        parts.append(f"<text x='{ml-12}' y='{y+4}' text-anchor='end' {FONT} font-size='11' fill='{INK}'>{_esc(name)}</text>")
        for s in xs:
            parts.append(f"<circle cx='{xpos(s):.1f}' cy='{y:.1f}' r='5' fill='{ACCENT}'/>")
    parts.append(
        f"<text x='{width-mr}' y='{height-18}' text-anchor='end' {FONT} font-size='11' fill='{MUTED}'>maximal-set size</text>"
    )
    parts.append("</svg>")
    path.write_text("\n".join(parts), encoding="utf-8")
