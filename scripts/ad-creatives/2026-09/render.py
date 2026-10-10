from __future__ import annotations

import json
import uuid
from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from project_library import campaign_directory, REPOSITORY_DIRECTORY

from PIL import Image, ImageDraw, ImageFont


HERE = campaign_directory('2026-09')
OUT = HERE / "webp"
OUT.mkdir(exist_ok=True)
SCALE = 2
FONT_REGULAR = r"C:\Windows\Fonts\segoeui.ttf"
FONT_BOLD = r"C:\Windows\Fonts\segoeuib.ttf"
SIZES = {
    "leaderboard": (728, 90),
    "mobile": (320, 100),
    "rectangle": (300, 250),
    "billboard": (970, 250),
}

ADS = [
    {
        "id": "b5d72669-91c6-4fb6-ba79-5369bf86f489", "slug": "stone-web", "brand": "stone",
        "headline": "Sandusky web design for growing brands", "short": "Web design that works harder",
        "body": "Local websites, apps and hosting with a team you can call.",
        "cta": "Book a call", "bg": "#eaf4f8", "fg": "#143755", "accent": "#1f6b92",
    },
    {
        "id": "5cb65a9a-7d25-434d-a33d-4a50599ec3f8", "slug": "stone-apps", "brand": "stone",
        "headline": "Stop running your business on spreadsheets", "short": "Beyond spreadsheets",
        "body": "Portals, tools and automation built in Sandusky.",
        "cta": "See what we build", "bg": "#edf6ff", "fg": "#10263b", "accent": "#1f4f77",
    },
    {
        "id": "c3830c3f-816a-46cb-aead-851e2f20a2cd", "slug": "stone-marketing", "brand": "stone",
        "headline": "Get found by customers across Erie County", "short": "Get found locally",
        "body": "SEO, ads, social and email, with clear reporting.",
        "cta": "Start a project", "bg": "#eaf4f8", "fg": "#143755", "accent": "#1f6b92",
    },
    {
        "id": "7ea1035c-780d-4ea2-aa58-be12af5ac295", "slug": "tag-folders", "brand": "tag",
        "headline": "Outgrown your bookmark folders?", "short": "Outgrown folders?",
        "body": "Save with tags. Find any link from anywhere. Free for your first 50.",
        "cta": "Try it free", "bg": "#14142b", "fg": "#f2efff", "accent": "#a58dff",
    },
    {
        "id": "8a14f33b-1428-49c0-ae59-f4c49fc12c7b", "slug": "tag-find", "brand": "tag",
        "headline": "Find the link you saved last spring", "short": "Find that link again",
        "body": "Search and filter every bookmark. Save from Chrome or Firefox.",
        "cta": "Start saving", "bg": "#f5f4ff", "fg": "#0b0a33", "accent": "#5c31f5",
    },
    {
        "id": "c17af9a8-5dc7-413f-8b13-f0a0df161e89", "slug": "tag-research", "brand": "tag",
        "headline": "Research links, sorted by tag", "short": "Research, organized",
        "body": "Collect sources with tags, not folders. Pro is $3/month.",
        "cta": "Get organized", "bg": "#14142b", "fg": "#f2efff", "accent": "#a58dff",
    },
]


def rgb(hex_color: str) -> tuple[int, int, int]:
    return tuple(bytes.fromhex(hex_color.lstrip("#")))


def font(size: float, bold: bool = False) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(FONT_BOLD if bold else FONT_REGULAR, round(size * SCALE))


def text_width(draw: ImageDraw.ImageDraw, text: str, face: ImageFont.FreeTypeFont) -> int:
    return round(draw.textlength(text, font=face))


def fit_lines(draw: ImageDraw.ImageDraw, text: str, width: int, max_lines: int, start: int, minimum: int) -> tuple[list[str], ImageFont.FreeTypeFont]:
    for size in range(start, minimum - 1, -1):
        face = font(size, True)
        lines: list[str] = []
        line = ""
        for word in text.split():
            candidate = f"{line} {word}".strip()
            if text_width(draw, candidate, face) <= width:
                line = candidate
            else:
                if line:
                    lines.append(line)
                line = word
        if line:
            lines.append(line)
        if len(lines) <= max_lines and all(text_width(draw, line, face) <= width for line in lines):
            return lines, face
    raise ValueError(f"Cannot fit headline: {text}")


def logo_image(ad: dict, target_w: int, target_h: int) -> Image.Image:
    if ad["brand"] == "stone":
        source = HERE / "stone-dragon-logo.png"
        logo = Image.open(source).convert("RGBA").crop((52, 0, 720, 307))
    else:
        source = HERE / ("tagstash-logo-light.png" if ad["bg"] == "#f5f4ff" else "tagstash-logo-dark.png")
        logo = Image.open(source).convert("RGBA")
    logo.thumbnail((target_w * SCALE, target_h * SCALE), Image.Resampling.LANCZOS)
    return logo


def paste_logo(canvas: Image.Image, ad: dict, x: int, y: int, w: int, h: int) -> None:
    logo = logo_image(ad, w, h)
    canvas.alpha_composite(logo, (x * SCALE, y * SCALE + (h * SCALE - logo.height) // 2))


def tag_motif(draw: ImageDraw.ImageDraw, ad: dict, w: int, h: int) -> None:
    accent = rgb(ad["accent"])
    fg = rgb(ad["fg"])
    if w >= 970:
        # Faint nested loops suggest searchable tags and connected work.
        for offset, alpha in ((0, 31), (19, 20), (38, 13)):
            radius = (58 + offset) * SCALE
            cx, cy = (w - 28) * SCALE, 18 * SCALE
            draw.ellipse((cx - radius, cy - radius, cx + radius, cy + radius), outline=(*accent, alpha), width=2 * SCALE)
    draw.line((0, (h - 4) * SCALE, w * SCALE, (h - 4) * SCALE), fill=(*accent, 130), width=4 * SCALE)
    draw.ellipse(((w - 37) * SCALE, (h - 35) * SCALE, (w - 27) * SCALE, (h - 25) * SCALE), fill=(*fg, 20))


def headline(draw: ImageDraw.ImageDraw, ad: dict, text: str, x: int, y: int, width: int, max_lines: int, start: int, minimum: int, line_gap: float = 1.12) -> int:
    lines, face = fit_lines(draw, text, width * SCALE, max_lines, start, minimum)
    step = round(face.size * line_gap)
    for index, line in enumerate(lines):
        draw.text((x * SCALE, y * SCALE + index * step), line, font=face, fill=rgb(ad["fg"]))
    return y * SCALE + len(lines) * step


def button(draw: ImageDraw.ImageDraw, ad: dict, label: str, x: int, y: int, w: int, h: int, size: int) -> None:
    s = SCALE
    accent = rgb(ad["accent"])
    label_fg = rgb("#ffffff" if ad["brand"] == "stone" or ad["bg"] == "#f5f4ff" else "#14142b")
    draw.rounded_rectangle((x * s, y * s, (x + w) * s, (y + h) * s), radius=8 * s, fill=accent)
    face = font(size, True)
    tw = text_width(draw, label, face)
    box = draw.textbbox((0, 0), label, font=face)
    th = box[3] - box[1]
    draw.text(((x + w / 2) * s - tw / 2, (y + h / 2) * s - th / 2 - box[1]), label, font=face, fill=label_fg)


def render(ad: dict, kind: str) -> Path:
    w, h = SIZES[kind]
    canvas = Image.new("RGBA", (w * SCALE, h * SCALE), (*rgb(ad["bg"]), 255))
    draw = ImageDraw.Draw(canvas, "RGBA")
    tag_motif(draw, ad, w, h)
    if kind == "leaderboard":
        if ad["brand"] == "stone":
            paste_logo(canvas, ad, 12, 13, 160, 65)
        else:
            paste_logo(canvas, ad, 14, 3, 100, 80)
        headline(draw, ad, ad["short"], 184 if ad["brand"] == "stone" else 133, 24, 365 if ad["brand"] == "stone" else 415, 2, 23, 18)
        button(draw, ad, ad["cta"], 562, 26, 152, 38, 13)
    elif kind == "mobile":
        if ad["brand"] == "stone":
            paste_logo(canvas, ad, 8, 10, 105, 42)
        else:
            paste_logo(canvas, ad, 9, 3, 67, 53)
        headline(draw, ad, ad["short"], 120 if ad["brand"] == "stone" else 82, 12, 186 if ad["brand"] == "stone" else 224, 2, 17, 14)
        button(draw, ad, ad["cta"], 151, 60, 155, 30, 11)
    elif kind == "rectangle":
        if ad["brand"] == "stone":
            paste_logo(canvas, ad, 18, 16, 165, 65)
        else:
            paste_logo(canvas, ad, 18, 10, 130, 95)
        headline(draw, ad, ad["headline"], 22, 91 if ad["brand"] == "stone" else 102, 258, 3, 25, 19)
        button(draw, ad, ad["cta"], 22, 199, 256, 36, 13)
    else:
        if ad["brand"] == "stone":
            paste_logo(canvas, ad, 28, 57, 246, 110)
            x = 300
        else:
            paste_logo(canvas, ad, 25, 22, 220, 174)
            x = 265
        bottom = headline(draw, ad, ad["headline"], x, 47, 465, 3, 32, 25)
        face = font(15)
        lines = []
        line = ""
        for word in ad["body"].split():
            candidate = f"{line} {word}".strip()
            if text_width(draw, candidate, face) > 465 * SCALE:
                lines.append(line)
                line = word
            else:
                line = candidate
        if line:
            lines.append(line)
        for index, line in enumerate(lines):
            draw.text((x * SCALE, max(bottom + 6 * SCALE, 149 * SCALE) + index * 19 * SCALE), line, font=face, fill=(*rgb(ad["fg"]), 190))
        button(draw, ad, ad["cta"], 774, 95, 170, 48, 15)
    path = OUT / f"{ad['slug']}-{kind}.webp"
    canvas.convert("RGB").save(path, "WEBP", quality=91, method=6)
    return path


def main() -> None:
    manifest = []
    for ad in ADS:
        for kind, (w, h) in SIZES.items():
            path = render(ad, kind)
            identifier = str(uuid.uuid5(uuid.NAMESPACE_URL, f"firelands-current/ads/2026-09/{ad['id']}/{kind}"))
            manifest.append({
                "ad_id": ad["id"], "brand": "Stone Dragon Media" if ad["brand"] == "stone" else "Tagstash",
                "slug": ad["slug"], "size": kind, "width": w * SCALE, "height": h * SCALE,
                "display_width": w, "display_height": h, "media_id": identifier,
                "object_key": f"library/{identifier}.webp", "file": str(path), "bytes": path.stat().st_size,
                "alt": f"{'Stone Dragon Media' if ad['brand'] == 'stone' else 'Tagstash'}: {ad['headline']}",
            })
    (HERE / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(f"Rendered {len(manifest)} images; largest {max(row['bytes'] for row in manifest):,} bytes")


if __name__ == "__main__":
    main()
