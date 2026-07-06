"""Small local API that writes a Deezer ARL token into streamrip's config.toml,
and downloads tracks by ID via the `rip` CLI.

Runs on port 8081. A request to /config is only honored if it carries a
valid TOTP code, checked against TOTP_SECRET (see .env).
"""

import os
import subprocess
from pathlib import Path

import pyotp
import tomlkit
from flask import Flask, jsonify, request

BASE_DIR = Path(__file__).resolve().parent
TEMPLATE_PATH = BASE_DIR / "config.template.toml"
CONFIG_PATH = BASE_DIR / "config.toml"

AUDIO_EXTENSIONS = {".mp3", ".flac", ".m4a", ".aac", ".ogg", ".opus", ".wav"}


def load_env_file(path: Path) -> None:
    if not path.exists():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        os.environ.setdefault(key, value)


def ensure_config_exists(path: Path) -> None:
    if path.exists():
        return
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(TEMPLATE_PATH.read_text(encoding="utf-8"), encoding="utf-8")


def write_doc(path: Path, doc) -> None:
    tmp_path = path.with_suffix(".toml.tmp")
    tmp_path.write_text(tomlkit.dumps(doc), encoding="utf-8")
    os.replace(tmp_path, path)


def set_folder(doc, folder: Path) -> None:
    if "downloads" not in doc:
        doc["downloads"] = tomlkit.table()
    doc["downloads"]["folder"] = str(folder)

    # The template's database paths default to Linux-only locations
    # (e.g. /root/.config/streamrip/...). Keep them inside rip/ so the
    # database is always creatable, regardless of OS.
    if "database" not in doc:
        doc["database"] = tomlkit.table()
    doc["database"]["downloads_path"] = str(BASE_DIR / "downloads.db")
    doc["database"]["failed_downloads_path"] = str(BASE_DIR / "failed_downloads.db")


def apply_config(path: Path, arl: str, folder: Path) -> None:
    doc = tomlkit.parse(path.read_text(encoding="utf-8"))

    if "deezer" not in doc:
        doc["deezer"] = tomlkit.table()
    doc["deezer"]["arl"] = arl
    set_folder(doc, folder)

    write_doc(path, doc)


def sync_downloads_folder(path: Path, folder: Path) -> None:
    doc = tomlkit.parse(path.read_text(encoding="utf-8"))
    set_folder(doc, folder)
    write_doc(path, doc)


def find_existing_download(folder: Path, track_id: str) -> Path | None:
    matches = sorted(folder.glob(f"{track_id}.*"))
    return matches[0] if matches else None


def run_rip_download(track_id: str) -> None:
    cmd = [
        "rip",
        "--config-path", str(CONFIG_PATH),
        "-ndb",
        "--no-progress",
        "id", "deezer", "track", track_id,
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(
            result.stderr.strip() or result.stdout.strip() or "rip exited with an error"
        )


def find_new_audio_file(folder: Path, before: set[str]) -> Path:
    after = {p.name for p in folder.iterdir() if p.is_file()}
    new_files = [
        folder / name
        for name in (after - before)
        if Path(name).suffix.lower() in AUDIO_EXTENSIONS
    ]
    if not new_files:
        raise RuntimeError("rip did not produce an audio file")
    return max(new_files, key=lambda p: p.stat().st_mtime)


def cleanup_extra_files(folder: Path, before: set[str], keep: str) -> None:
    after = {p.name for p in folder.iterdir() if p.is_file()}
    for name in (after - before) - {keep}:
        try:
            (folder / name).unlink()
        except OSError:
            pass


load_env_file(BASE_DIR / ".env")

TOTP_SECRET = os.environ.get("TOTP_SECRET")
if not TOTP_SECRET:
    raise RuntimeError("TOTP_SECRET is not set. Add it to rip/.env")

FOLDER = os.environ.get("FOLDER")
DOWNLOAD_FOLDER = Path(FOLDER) if FOLDER else BASE_DIR / "songs"

ensure_config_exists(CONFIG_PATH)
sync_downloads_folder(CONFIG_PATH, DOWNLOAD_FOLDER)
DOWNLOAD_FOLDER.mkdir(parents=True, exist_ok=True)

app = Flask(__name__)


@app.post("/config")
def update_config():
    payload = request.get_json(silent=True) or {}
    arl = payload.get("arl") or request.values.get("arl")
    totp_code = payload.get("totp") or request.values.get("totp")

    if not arl or not totp_code:
        return jsonify(error="arl and totp are required"), 400

    if not pyotp.TOTP(TOTP_SECRET).verify(str(totp_code), valid_window=1):
        return jsonify(error="invalid totp code"), 401

    try:
        ensure_config_exists(CONFIG_PATH)
        apply_config(CONFIG_PATH, arl, DOWNLOAD_FOLDER)
    except OSError as exc:
        return jsonify(error=f"failed to update config: {exc}"), 500

    return jsonify(success=True, config_path=str(CONFIG_PATH))


@app.post("/download")
def download_track():
    payload = request.get_json(silent=True) or {}
    track_id = payload.get("id") or request.values.get("id")

    if not track_id:
        return jsonify(error="id is required"), 400
    track_id = str(track_id).strip()
    if not track_id.isdigit():
        return jsonify(error="id must be numeric"), 400

    existing = find_existing_download(DOWNLOAD_FOLDER, track_id)
    if existing:
        return jsonify(success=True, file=str(existing), already_downloaded=True)

    before = {p.name for p in DOWNLOAD_FOLDER.iterdir() if p.is_file()}

    try:
        run_rip_download(track_id)
        new_file = find_new_audio_file(DOWNLOAD_FOLDER, before)
    except RuntimeError as exc:
        return jsonify(error=str(exc)), 500

    cleanup_extra_files(DOWNLOAD_FOLDER, before, keep=new_file.name)

    target = DOWNLOAD_FOLDER / f"{track_id}{new_file.suffix}"
    os.replace(new_file, target)

    return jsonify(success=True, file=str(target), already_downloaded=False)


if __name__ == "__main__":
    host = os.environ.get("HOST", "0.0.0.0")
    port = int(os.environ.get("PORT", 8081))
    app.run(host=host, port=port)
