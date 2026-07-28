from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
RES = ROOT / "android" / "app" / "src" / "main" / "res"
INK = (13, 17, 16, 255)
WOOD = (174, 120, 66, 255)
WOOD_EDGE = (211, 165, 96, 255)
GRID = (79, 46, 23, 220)


def stone_layer(size: int, white: bool) -> Image.Image:
    layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    margin = max(2, size // 16)
    if white:
        colors = [(188, 187, 181, 255), (222, 221, 216, 255), (244, 244, 240, 255)]
    else:
        colors = [(4, 6, 6, 255), (24, 29, 28, 255), (70, 77, 74, 255)]
    draw.ellipse((margin, margin, size - margin, size - margin), fill=colors[0])
    draw.ellipse((margin * 2, margin * 2, size - margin * 2, size - margin * 2), fill=colors[1])
    draw.ellipse((margin * 3, margin * 3, size - margin * 2, size - margin * 2), fill=colors[2])
    highlight = max(2, size // 9)
    draw.ellipse((size * 0.28, size * 0.24, size * 0.28 + highlight, size * 0.24 + highlight), fill=(255, 255, 255, 155 if white else 85))
    return layer


def draw_mark(canvas: Image.Image, center: tuple[int, int], mark_size: int) -> None:
    cx, cy = center
    left = cx - mark_size // 2
    top = cy - mark_size // 2
    draw = ImageDraw.Draw(canvas)
    radius = max(5, mark_size // 13)
    draw.rounded_rectangle((left, top, left + mark_size, top + mark_size), radius=radius, fill=WOOD, outline=WOOD_EDGE, width=max(2, mark_size // 48))

    inset = mark_size * 0.14
    gap = (mark_size - inset * 2) / 5
    for index in range(6):
        offset = inset + gap * index
        draw.line((left + offset, top + inset, left + offset, top + mark_size - inset), fill=GRID, width=max(1, mark_size // 90))
        draw.line((left + inset, top + offset, left + mark_size - inset, top + offset), fill=GRID, width=max(1, mark_size // 90))

    stone_size = max(12, int(mark_size * 0.25))
    shadow = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    shadow_draw = ImageDraw.Draw(shadow)
    for sx, sy in ((left + mark_size * 0.38, top + mark_size * 0.38), (left + mark_size * 0.65, top + mark_size * 0.65)):
        shadow_draw.ellipse((sx - stone_size / 2, sy - stone_size / 2 + stone_size * 0.09, sx + stone_size / 2, sy + stone_size / 2 + stone_size * 0.09), fill=(0, 0, 0, 120))
    canvas.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(max(1, stone_size // 9))))

    for white, sx, sy in (
        (True, left + mark_size * 0.38, top + mark_size * 0.38),
        (False, left + mark_size * 0.65, top + mark_size * 0.65),
    ):
        stone = stone_layer(stone_size, white)
        canvas.alpha_composite(stone, (int(sx - stone_size / 2), int(sy - stone_size / 2)))


def make_launcher(size: int, foreground: bool = False, round_icon: bool = False) -> Image.Image:
    scale = 4
    full = size * scale
    image = Image.new("RGBA", (full, full), (0, 0, 0, 0) if foreground or round_icon else INK)
    if round_icon:
        draw = ImageDraw.Draw(image)
        draw.ellipse((0, 0, full - 1, full - 1), fill=INK)
    mark_size = int(full * (0.54 if foreground else 0.68))
    draw_mark(image, (full // 2, full // 2), mark_size)
    return image.resize((size, size), Image.Resampling.LANCZOS)


def make_splash(size: tuple[int, int]) -> Image.Image:
    width, height = size
    image = Image.new("RGBA", size, INK)
    shortest = min(width, height)
    mark_size = max(92, int(shortest * 0.28))
    draw_mark(image, (width // 2, height // 2 - int(shortest * 0.035)), mark_size)
    draw = ImageDraw.Draw(image)
    line_width = int(shortest * 0.16)
    line_y = height // 2 + mark_size // 2 + max(14, shortest // 28)
    draw.rounded_rectangle((width // 2 - line_width // 2, line_y, width // 2 + line_width // 2, line_y + max(2, shortest // 160)), radius=4, fill=(202, 166, 109, 150))
    return image


def main() -> None:
    for path in RES.rglob("splash.png"):
        with Image.open(path) as current:
            make_splash(current.size).convert("RGB").save(path, optimize=True)

    for path in RES.glob("mipmap-*dpi/ic_launcher.png"):
        with Image.open(path) as current:
            make_launcher(current.width).save(path, optimize=True)
    for path in RES.glob("mipmap-*dpi/ic_launcher_round.png"):
        with Image.open(path) as current:
            make_launcher(current.width, round_icon=True).save(path, optimize=True)
    for path in RES.glob("mipmap-*dpi/ic_launcher_foreground.png"):
        with Image.open(path) as current:
            make_launcher(current.width, foreground=True).save(path, optimize=True)


if __name__ == "__main__":
    main()
