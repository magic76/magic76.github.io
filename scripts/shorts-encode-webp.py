#!/usr/bin/env python3
"""Decode and resize one generated image to a true 3:4 ≤350 KiB WebP."""
import os, sys
from PIL import Image, ImageOps
if len(sys.argv) != 3:
    raise SystemExit('usage: shorts-encode-webp.py source destination')
source, destination = sys.argv[1:]
with Image.open(source) as original:
    original.verify()
with Image.open(source) as original:
    im = ImageOps.exif_transpose(original).convert('RGB')
    w, h = im.size
    if w < 512 or h < 640:
        raise ValueError('Generated photo too small')
    aspect = w / h
    if not 0.70 <= aspect <= 0.80:
        raise ValueError('Photo is not a single portrait 3:4 frame')
    # Crop only marginal aspect rounding (<5%), never from a mosaic or collage.
    im = ImageOps.fit(im, (900, 1200), method=Image.Resampling.LANCZOS)
    for quality in (78, 74, 70, 66, 62, 58, 54, 50, 46, 42):
        im.save(destination, 'WEBP', quality=quality, method=5)
        if os.stat(destination).st_size <= 200 * 1024:
            break
    if os.stat(destination).st_size > 350 * 1024:
        raise ValueError('WebP exceeds 350 KiB')
with Image.open(destination) as verify:
    verify.load()
    assert verify.format == 'WEBP' and verify.size == (900, 1200)