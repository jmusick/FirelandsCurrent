from __future__ import annotations

import json
import subprocess
import sys
import time
import uuid
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from project_library import campaign_directory, REPOSITORY_DIRECTORY

from PIL import Image


HERE = campaign_directory('2026-09')
REPO = REPOSITORY_DIRECTORY
BUCKET = "firelands-current-media"
MANIFEST = json.loads((HERE / "manifest.json").read_text(encoding="utf-8"))
STAMP_FILE = HERE / "deployment.json"


def quoted(value: object) -> str:
    if value is None:
        return "NULL"
    if isinstance(value, int):
        return str(value)
    return "'" + str(value).replace("'", "''") + "'"


def validate() -> None:
    assert len(MANIFEST) == 24
    assert len({row["object_key"] for row in MANIFEST}) == 24
    assert len({(row["ad_id"], row["size"]) for row in MANIFEST}) == 24
    for row in MANIFEST:
        path = Path(row["file"])
        assert path.is_file() and path.stat().st_size == row["bytes"] < 1024 * 1024
        with Image.open(path) as image:
            assert image.size == (row["width"], row["height"])
            assert image.format == "WEBP"


def stamp() -> int:
    if STAMP_FILE.exists():
        return json.loads(STAMP_FILE.read_text(encoding="utf-8"))["created_at"]
    now = int(datetime.now(timezone.utc).timestamp() * 1000)
    STAMP_FILE.write_text(json.dumps({"created_at": now}, indent=2), encoding="utf-8")
    return now


def make_sql(now: int) -> Path:
    statements = ["-- Idempotent media-library and ad-image links for the 24 creatives in manifest.json."]
    grouped: dict[str, list[dict]] = {}
    for row in MANIFEST:
        grouped.setdefault(row["ad_id"], []).append(row)
        filename = Path(row["file"]).name
        source = f"Original ad creative for Firelands Current using {row['brand']} brand assets; operator requested 2026-09-28."
        credit = f"{row['brand']} / Firelands Current"
        fields = [row["media_id"], row["object_key"], "image/webp", row["width"], row["height"], row["bytes"], filename, row["alt"], "", credit, source, None, now, now]
        statements.append(
            "INSERT OR IGNORE INTO media (id, object_key, content_type, width, height, bytes, filename, alt, caption, credit, source, uploaded_by, created_at, updated_at) "
            f"VALUES ({', '.join(map(quoted, fields))});"
        )
        ad_fields = [row["ad_id"], row["size"], row["object_key"], "image/webp", row["display_width"], row["display_height"], row["media_id"], now]
        statements.append(
            "INSERT INTO ad_images (ad_id, size, object_key, content_type, width, height, media_id, created_at) "
            f"VALUES ({', '.join(map(quoted, ad_fields))}) "
            "ON CONFLICT (ad_id, size) DO UPDATE SET object_key=excluded.object_key, content_type=excluded.content_type, "
            "width=excluded.width, height=excluded.height, media_id=excluded.media_id, created_at=excluded.created_at;"
        )
        audit_id = str(uuid.uuid5(uuid.NAMESPACE_URL, f"{row['media_id']}/media-audit"))
        audit_fields = [audit_id, None, "Codex (user-requested)", row["media_id"], filename, "media-upload", f"Generated {row['size']} banner for {row['brand']}", now]
        statements.append(
            "INSERT OR IGNORE INTO admin_audit_log (id, actor_id, actor_name, target_media_id, target_label, action, detail, created_at) "
            f"VALUES ({', '.join(map(quoted, audit_fields))});"
        )
    for ad_id, rows in grouped.items():
        statements.append(f"UPDATE ads SET updated_at={now} WHERE id={quoted(ad_id)};")
        audit_id = str(uuid.uuid5(uuid.NAMESPACE_URL, f"{ad_id}/2026-09/image-ad-audit"))
        statements.append(
            "INSERT OR IGNORE INTO admin_audit_log (id, actor_id, actor_name, target_business_id, target_ad_id, target_label, action, detail, created_at) "
            "SELECT " + ", ".join(map(quoted, [audit_id, None, "Codex (user-requested)"])) + ", a.business_id, a.id, b.name, "
            + ", ".join(map(quoted, ["ad-update", f"{rows[0]['slug']} — added all four image sizes", now]))
            + f" FROM ads a JOIN businesses b ON b.id=a.business_id WHERE a.id={quoted(ad_id)};"
        )
    path = HERE / "publish.sql"
    path.write_text("\n".join(statements) + "\n", encoding="utf-8")
    return path


def run(command: list[str], attempts: int = 3) -> None:
    for attempt in range(attempts):
        result = subprocess.run(command, cwd=REPO, capture_output=True, text=True, encoding="utf-8", errors="replace")
        if result.returncode == 0:
            return
        details = result.stderr + result.stdout
        if "7403" not in details and "statusCode = 500" not in details:
            raise RuntimeError(result.stderr or result.stdout)
        if attempt < attempts - 1:
            time.sleep(2 * (attempt + 1))
    raise RuntimeError(result.stderr or result.stdout)


def upload(row: dict, location: str) -> None:
    run([
        "npx.cmd", "wrangler", "r2", "object", "put", f"{BUCKET}/{row['object_key']}",
        "--file", row["file"], "--content-type", "image/webp", f"--{location}", "--force",
    ])


def main() -> None:
    validate()
    sql = make_sql(stamp())
    if sys.argv[1:] != ["--publish"]:
        print(f"Prepared {sql}; run with --publish to upload and link assets.")
        return
    for location in ("local", "remote"):
        with ThreadPoolExecutor(max_workers=1) as pool:
            futures = [pool.submit(upload, row, location) for row in MANIFEST]
            for future in as_completed(futures):
                future.result()
        print(f"Uploaded {len(MANIFEST)} {location} R2 objects", flush=True)
    for location in ("local", "remote"):
        run(["npx.cmd", "wrangler", "d1", "execute", "DB", f"--{location}", "--file", str(sql)])
        print(f"Linked {len(MANIFEST)} images in {location} D1", flush=True)


if __name__ == "__main__":
    main()
