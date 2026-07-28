#!/usr/bin/env python3
"""Turn the supplied image atlases into production-ready game assets."""

from __future__ import annotations

import argparse
import math
from pathlib import Path

from PIL import Image, ImageOps


PROJECT_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SOURCES = {
    "walnut": Path(
        r"C:\Users\25444\AppData\Local\Temp\codex-clipboard-d5bef7b4-a580-4dd2-92fb-02ffda44821f.png"
    ),
    "maple": Path(
        r"C:\Users\25444\AppData\Local\Temp\codex-clipboard-e2ac767c-d245-4f44-8552-75684a4088ca.png"
    ),
    "ink": Path(
        r"C:\Users\25444\AppData\Local\Temp\codex-clipboard-0b2b7492-db22-4281-bd34-00e10bf6b4ab.png"
    ),
    "pieces": Path(
        r"C:\Users\25444\AppData\Local\Temp\codex-clipboard-2bdba839-455b-4177-9692-dc2cd9bcf811.png"
    ),
    "avatars": Path(
        r"C:\Users\25444\AppData\Local\Temp\codex-clipboard-6f46fb30-968a-4382-b258-7d2298ff5cb7.png"
    ),
}

TEXTURE_CROP_SIZE = 880
TEXTURE_OUTPUT_SIZE = 1024
PIECE_CROP_SIZE = 400
PIECE_CENTERS = ((270, 253), (750, 253))
AVATAR_CROP_SIZE = 240
# Refined from the visible circular boundaries in the supplied 1024x559 atlas.
AVATAR_CENTERS = (
    (134, 149),
    (386, 149),
    (638, 149),
    (890, 149),
    (134, 411),
    (386, 411),
    (638, 411),
    (890, 411),
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    for name, default in DEFAULT_SOURCES.items():
        parser.add_argument(
            f"--{name}",
            type=Path,
            default=default,
            help=f"Source {name} PNG (default: {default})",
        )
    parser.add_argument(
        "--output-root",
        type=Path,
        default=PROJECT_ROOT / "public" / "assets",
        help="Destination assets directory",
    )
    return parser.parse_args()


def load_source(path: Path, label: str) -> Image.Image:
    if not path.is_file():
        raise FileNotFoundError(f"{label} source not found: {path}")
    with Image.open(path) as source:
        return ImageOps.exif_transpose(source).convert("RGB")


def crop_center(
    image: Image.Image,
    center: tuple[int, int],
    size: int,
    label: str,
) -> Image.Image:
    half = size // 2
    left = center[0] - half
    top = center[1] - half
    box = (left, top, left + size, top + size)
    if left < 0 or top < 0 or box[2] > image.width or box[3] > image.height:
        raise ValueError(f"{label} crop {box} exceeds source size {image.size}")
    return image.crop(box)


def soft_circle_mask(size: int, inner_radius: float, outer_radius: float) -> Image.Image:
    """Create an inward-feathered circle without retaining baked backgrounds."""
    center = size / 2
    pixels: list[int] = []
    for y in range(size):
        for x in range(size):
            distance = math.hypot(x - center, y - center)
            if distance <= inner_radius:
                alpha = 255
            elif distance >= outer_radius:
                alpha = 0
            else:
                progress = (distance - inner_radius) / (outer_radius - inner_radius)
                smoothstep = progress * progress * (3 - 2 * progress)
                alpha = round(255 * (1 - smoothstep))
            pixels.append(alpha)

    mask = Image.new("L", (size, size))
    mask.putdata(pixels)
    return mask


def add_alpha(image: Image.Image, mask: Image.Image) -> Image.Image:
    result = image.convert("RGBA")
    result.putalpha(mask)
    return result


def process_textures(sources: dict[str, Path], output_dir: Path) -> list[Path]:
    output_dir.mkdir(parents=True, exist_ok=True)
    outputs: list[Path] = []
    for name in ("walnut", "maple", "ink"):
        image = load_source(sources[name], name)
        if image.width < TEXTURE_CROP_SIZE or image.height < TEXTURE_CROP_SIZE:
            raise ValueError(f"{name} source is too small: {image.size}")
        texture = image.crop((0, 0, TEXTURE_CROP_SIZE, TEXTURE_CROP_SIZE))
        texture = texture.resize(
            (TEXTURE_OUTPUT_SIZE, TEXTURE_OUTPUT_SIZE), Image.Resampling.LANCZOS
        )
        output = output_dir / f"{name}.webp"
        texture.save(output, "WEBP", quality=90, method=6)
        outputs.append(output)
    return outputs


def process_pieces(source_path: Path, output_dir: Path) -> list[Path]:
    output_dir.mkdir(parents=True, exist_ok=True)
    atlas = load_source(source_path, "pieces")
    mask = soft_circle_mask(PIECE_CROP_SIZE, inner_radius=176, outer_radius=180)
    outputs: list[Path] = []
    for name, center in zip(("obsidian-black", "obsidian-white"), PIECE_CENTERS):
        piece = crop_center(atlas, center, PIECE_CROP_SIZE, name)
        output = output_dir / f"{name}.png"
        add_alpha(piece, mask).save(output, "PNG", optimize=True)
        outputs.append(output)
    return outputs


def process_avatars(source_path: Path, output_dir: Path) -> list[Path]:
    output_dir.mkdir(parents=True, exist_ok=True)
    atlas = load_source(source_path, "avatars")
    mask = soft_circle_mask(AVATAR_CROP_SIZE, inner_radius=116, outer_radius=120)
    outputs: list[Path] = []
    for index, center in enumerate(AVATAR_CENTERS, start=1):
        avatar = crop_center(atlas, center, AVATAR_CROP_SIZE, f"avatar-{index:02d}")
        output = output_dir / f"avatar-{index:02d}.webp"
        add_alpha(avatar, mask).save(output, "WEBP", quality=92, method=6)
        outputs.append(output)
    return outputs


def main() -> None:
    args = parse_args()
    sources = {name: Path(getattr(args, name)).expanduser() for name in DEFAULT_SOURCES}
    output_root = args.output_root.expanduser()

    outputs = [
        *process_textures(sources, output_root / "boards"),
        *process_pieces(sources["pieces"], output_root / "pieces"),
        *process_avatars(sources["avatars"], output_root / "avatars"),
    ]
    for output in outputs:
        with Image.open(output) as image:
            print(f"{output}: {image.format} {image.mode} {image.size}")


if __name__ == "__main__":
    main()
