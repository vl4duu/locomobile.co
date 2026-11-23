#!/usr/bin/env python3
"""Compare two directories of frame captures (from /?capture -> window.__disc).

Usage: python3 scripts/visual_diff.py BASELINE_DIR CANDIDATE_DIR [--max 2] [--heatmaps OUT_DIR]

For every PNG present in both directories prints max / mean / p99.9 absolute
per-channel difference (RGBA, 0-255). Exits non-zero if any frame's max diff
exceeds --max (default 2, i.e. GPU rounding noise). Requires Pillow.
"""
import argparse
import sys
from pathlib import Path

from PIL import Image, ImageChops


def stats(a: Image.Image, b: Image.Image):
    diff = ImageChops.difference(a, b)
    # Per-pixel max over channels -> single-band image.
    bands = diff.split()
    m = bands[0]
    for band in bands[1:]:
        m = ImageChops.lighter(m, band)
    hist = m.histogram()
    total = sum(hist)
    max_v = max((v for v, c in enumerate(hist) if c), default=0)
    mean = sum(v * c for v, c in enumerate(hist)) / total
    acc, p999 = 0, 0
    for v, c in enumerate(hist):
        acc += c
        if acc >= total * 0.999:
            p999 = v
            break
    changed = 1 - hist[0] / total
    return max_v, mean, p999, changed, m


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("baseline")
    ap.add_argument("candidate")
    ap.add_argument("--max", type=int, default=2, help="max allowed per-channel diff")
    ap.add_argument("--heatmaps", help="write amplified diff heatmaps here")
    args = ap.parse_args()

    base, cand = Path(args.baseline), Path(args.candidate)
    names = sorted(p.name for p in base.glob("*.png") if (cand / p.name).exists())
    if not names:
        sys.exit("no matching PNGs")
    if args.heatmaps:
        Path(args.heatmaps).mkdir(parents=True, exist_ok=True)

    worst, failed = 0, 0
    print(f"{'frame':44} {'max':>4} {'mean':>7} {'p99.9':>5} {'changed':>8}")
    for name in names:
        a = Image.open(base / name).convert("RGBA")
        b = Image.open(cand / name).convert("RGBA")
        if a.size != b.size:
            print(f"{name:44} SIZE MISMATCH {a.size} vs {b.size}")
            failed += 1
            continue
        max_v, mean, p999, changed, m = stats(a, b)
        worst = max(worst, max_v)
        flag = "" if max_v <= args.max else "  FAIL"
        failed += bool(flag)
        print(f"{name:44} {max_v:4d} {mean:7.3f} {p999:5d} {changed:8.2%}{flag}")
        if args.heatmaps and max_v:
            m.point(lambda v: min(255, v * 16)).save(Path(args.heatmaps) / name)

    print(f"\n{len(names)} frames, worst max diff {worst}, {failed} over threshold {args.max}")
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
