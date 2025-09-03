#!/usr/bin/env python3
from PIL import Image
import sys
import os
from typing import Tuple

# Crop rectangle for TradingView 1920x1080 charts
# Remove UI: left 40, right 440, top 130, bottom 100 -> 1440x850
CROP = {
    'left': 40,
    'top': 130,
    'right': 440,
    'bottom': 100,
}

EXPECTED_SIZE: Tuple[int, int] = (1920, 1080)


def crop_file(src_path: str) -> str:
    base, ext = os.path.splitext(src_path)
    out_path = f"{base}_cropped.png"
    try:
        with Image.open(src_path) as img:
            if img.size != EXPECTED_SIZE:
                # Proceed but warn; upstream capture should enforce 1920x1080
                print(f"WARN: {os.path.basename(src_path)} expected {EXPECTED_SIZE}, got {img.size}")
            left = CROP['left']
            top = CROP['top']
            width = img.width - CROP['left'] - CROP['right']
            height = img.height - CROP['top'] - CROP['bottom']
            out = img.crop((left, top, left + width, top + height))
            out.save(out_path)
        print(f"CROPPED {os.path.basename(src_path)} -> {os.path.basename(out_path)}")
        return out_path
    except Exception as e:
        print(f"ERROR: {os.path.basename(src_path)} failed: {e}")
        return ""


def main():
    target = sys.argv[1] if len(sys.argv) > 1 else "."
    if not os.path.isdir(target):
        print(f"ERROR: target is not a directory: {target}")
        sys.exit(1)

    files = [
        f for f in os.listdir(target)
        if f.lower().endswith('.png') and not f.lower().endswith('_cropped.png')
    ]
    if not files:
        print("INFO: No PNG files to process in target directory.")
        sys.exit(0)

    processed = 0
    for f in sorted(files):
        src = os.path.join(target, f)
        out = crop_file(src)
        if out:
            processed += 1

    print(f"DONE: {processed}/{len(files)} images cropped in {os.path.abspath(target)}")


if __name__ == '__main__':
    main()
