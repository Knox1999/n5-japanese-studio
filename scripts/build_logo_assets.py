"""Regenerate favicon/PWA logo PNGs from the circular source badge.

Crops the source image to its circular badge (making the surrounding square
canvas transparent) and writes the standard sizes the app already references.
Run manually after replacing public/assets/nihongo-vibes-logo-source.png.
"""
from pathlib import Path
from PIL import Image, ImageDraw

ASSETS = Path(__file__).resolve().parent.parent / "public" / "assets"
SOURCE = ASSETS / "nihongo-vibes-logo-source.png"

# The badge circle sits with a small margin inside the square canvas.
CIRCLE_MARGIN_RATIO = 0.012


def circular_rgba(src: Image.Image) -> Image.Image:
    src = src.convert("RGBA")
    w, h = src.size
    size = min(w, h)
    if w != h:
        left = (w - size) // 2
        top = (h - size) // 2
        src = src.crop((left, top, left + size, top + size))

    mask = Image.new("L", (size, size), 0)
    draw = ImageDraw.Draw(mask)
    margin = int(size * CIRCLE_MARGIN_RATIO)
    draw.ellipse((margin, margin, size - margin, size - margin), fill=255)

    out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    out.paste(src, (0, 0), mask)
    return out


def main():
    if not SOURCE.exists():
        raise SystemExit(f"missing {SOURCE}")
    badge = circular_rgba(Image.open(SOURCE))

    targets = {
        "nihongo-vibes-logo-96.png": 96,
        "nihongo-vibes-logo-192.png": 192,
        "nihongo-vibes-logo-512.png": 512,
    }
    for name, px in targets.items():
        resized = badge.resize((px, px), Image.LANCZOS)
        resized.save(ASSETS / name)
        print(f"wrote {name} ({px}x{px})")

    # Maskable icon: PWA safe-zone means the badge must stay inside the
    # inner ~80% circle, so pad it down before placing on a solid canvas.
    maskable_size = 512
    inner = int(maskable_size * 0.78)
    badge_small = badge.resize((inner, inner), Image.LANCZOS)
    canvas = Image.new("RGBA", (maskable_size, maskable_size), (10, 24, 43, 255))
    offset = ((maskable_size - inner) // 2, (maskable_size - inner) // 2)
    canvas.paste(badge_small, offset, badge_small)
    canvas.save(ASSETS / "nihongo-vibes-logo-maskable-512.png")
    print("wrote nihongo-vibes-logo-maskable-512.png (512x512)")


if __name__ == "__main__":
    main()
