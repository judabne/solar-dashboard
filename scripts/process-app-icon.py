"""Remove outer white padding from app icon; export transparent PNG + PWA sizes."""

from __future__ import annotations

import sys
from collections import deque
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"
SOURCE = ROOT / "public" / "app-icon-source.jpg"


def is_outside_background(r: int, g: int, b: int, a: int) -> bool:
    if a < 20:
        return True
    # Near-white / light gray (JPEG fringe around the squircle)
    if min(r, g, b) >= 215 and max(r, g, b) - min(r, g, b) <= 30:
        return True
    return False


def flood_transparent_background(img: Image.Image) -> Image.Image:
    rgba = img.convert("RGBA")
    w, h = rgba.size
    pixels = rgba.load()
    visited = [[False] * w for _ in range(h)]
    q: deque[tuple[int, int]] = deque()

    for x in range(w):
        q.append((x, 0))
        q.append((x, h - 1))
    for y in range(h):
        q.append((0, y))
        q.append((w - 1, y))

    while q:
        x, y = q.popleft()
        if x < 0 or y < 0 or x >= w or y >= h or visited[y][x]:
            continue
        visited[y][x] = True
        r, g, b, a = pixels[x, y]
        if not is_outside_background(r, g, b, a):
            continue
        pixels[x, y] = (r, g, b, 0)
        q.append((x + 1, y))
        q.append((x - 1, y))
        q.append((x, y + 1))
        q.append((x, y - 1))

    return rgba


def peel_exterior_light_fringe(img: Image.Image, passes: int = 12) -> Image.Image:
    rgba = img.convert("RGBA")
    w, h = rgba.size
    pixels = rgba.load()

    for _ in range(passes):
        to_clear: list[tuple[int, int]] = []
        for y in range(h):
            for x in range(w):
                r, g, b, a = pixels[x, y]
                if a < 20:
                    continue
                if not is_outside_background(r, g, b, a):
                    continue
                neighbors = ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1))
                if any(
                    0 <= nx < w and 0 <= ny < h and pixels[nx, ny][3] < 20
                    for nx, ny in neighbors
                ):
                    to_clear.append((x, y))
        if not to_clear:
            break
        for x, y in to_clear:
            pixels[x, y] = (0, 0, 0, 0)

    return rgba


def trim_transparent(img: Image.Image, pad: int = 0) -> Image.Image:
    bbox = img.getbbox()
    if not bbox:
        return img
    left, top, right, bottom = bbox
    left = max(0, left - pad)
    top = max(0, top - pad)
    right = min(img.width, right + pad)
    bottom = min(img.height, bottom + pad)
    return img.crop((left, top, right, bottom))


def main() -> None:
    if not SOURCE.exists():
        print(f"Missing source image: {SOURCE}", file=sys.stderr)
        sys.exit(1)

    PUBLIC.mkdir(parents=True, exist_ok=True)
    img = Image.open(SOURCE)
    transparent = flood_transparent_background(img)
    transparent = peel_exterior_light_fringe(transparent)
    transparent = trim_transparent(transparent, pad=2)

    master_path = PUBLIC / "app-icon.png"
    transparent.save(master_path, "PNG")

    for size in (192, 512):
        resized = transparent.resize((size, size), Image.Resampling.LANCZOS)
        resized.save(PUBLIC / f"pwa-{size}x{size}.png", "PNG")

    print(f"Wrote {master_path}")
    print("Wrote public/pwa-192x192.png and public/pwa-512x512.png")


if __name__ == "__main__":
    main()
