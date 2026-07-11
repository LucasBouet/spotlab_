"""Small local API that writes a Deezer ARL token into streamrip's config.toml,
and downloads tracks by ID via the `rip` CLI.

Runs on port 8081. A request to /config is only honored if it carries a
valid TOTP code, checked against TOTP_SECRET (see .env).
"""

import os
import shutil
import subprocess
import tempfile
import threading
import time
from pathlib import Path

import pyotp
import tomlkit
from flask import Flask, jsonify, request

BASE_DIR = Path(__file__).resolve().parent
TEMPLATE_PATH = BASE_DIR / "config.template.toml"
CONFIG_PATH = BASE_DIR / "config.toml"
TMP_DIR = BASE_DIR / "tmp"

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


def run_rip_download(track_id: str, folder: Path) -> None:
    # --folder overrides the config file's downloads.folder for just this
    # invocation, so each call can be pointed at its own private scratch
    # directory instead of everyone writing into DOWNLOAD_FOLDER at once.
    cmd = [
        "rip",
        "--config-path", str(CONFIG_PATH),
        "--folder", str(folder),
        "-ndb",
        "--no-progress",
        "id", "deezer", "track", track_id,
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(
            result.stderr.strip() or result.stdout.strip() or "rip exited with an error"
        )


def find_audio_file(folder: Path) -> Path:
    candidates = [
        p
        for p in folder.rglob("*")
        if p.is_file() and p.suffix.lower() in AUDIO_EXTENSIONS
    ]
    if not candidates:
        raise RuntimeError("rip did not produce an audio file")
    return max(candidates, key=lambda p: p.stat().st_mtime)


def safe_replace(src: Path, dst: Path, attempts: int = 5, delay: float = 0.3) -> None:
    """os.replace, retrying briefly on Windows' transient "file in use" errors
    (antivirus/indexer scans routinely hold a just-written file open for a
    moment before it can be renamed)."""
    for attempt in range(1, attempts + 1):
        try:
            os.replace(src, dst)
            return
        except PermissionError:
            if attempt == attempts:
                raise
            time.sleep(delay)


# Each /download call now runs `rip` against its own private tmp subfolder
# (see run_rip_download), so different tracks can download concurrently
# without racing on shared directory state. We still serialize *same-track*
# requests (e.g. a prefetch racing the actual playback request) so we don't
# pay for the same download twice; each track id gets its own lock instead
# of one lock for the whole server.
_track_locks: dict[str, threading.Lock] = {}
_track_locks_guard = threading.Lock()


def get_track_lock(track_id: str) -> threading.Lock:
    with _track_locks_guard:
        lock = _track_locks.get(track_id)
        if lock is None:
            lock = threading.Lock()
            _track_locks[track_id] = lock
        return lock


load_env_file(BASE_DIR / ".env")

TOTP_SECRET = os.environ.get("TOTP_SECRET")
if not TOTP_SECRET:
    raise RuntimeError("TOTP_SECRET is not set. Add it to rip/.env")

FOLDER = os.environ.get("FOLDER")
DOWNLOAD_FOLDER = Path(FOLDER) if FOLDER else BASE_DIR / "songs"

ensure_config_exists(CONFIG_PATH)
sync_downloads_folder(CONFIG_PATH, DOWNLOAD_FOLDER)
DOWNLOAD_FOLDER.mkdir(parents=True, exist_ok=True)

# Wipe any scratch dirs left behind by a previous run that got killed
# mid-download, then start fresh.
shutil.rmtree(TMP_DIR, ignore_errors=True)
TMP_DIR.mkdir(parents=True, exist_ok=True)

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

    with get_track_lock(track_id):
        # Another request may have downloaded this exact track while we were
        # waiting for the lock (e.g. a prefetch racing the actual playback
        # request) — check again before starting a redundant download.
        existing = find_existing_download(DOWNLOAD_FOLDER, track_id)
        if existing:
            return jsonify(success=True, file=str(existing), already_downloaded=True)

        tmp_dir = Path(tempfile.mkdtemp(prefix=f"{track_id}-", dir=TMP_DIR))
        try:
            run_rip_download(track_id, tmp_dir)
            new_file = find_audio_file(tmp_dir)
            target = DOWNLOAD_FOLDER / f"{track_id}{new_file.suffix}"
            safe_replace(new_file, target)
        except RuntimeError as exc:
            return jsonify(error=str(exc)), 500
        finally:
            shutil.rmtree(tmp_dir, ignore_errors=True)

    return jsonify(success=True, file=str(target), already_downloaded=False)


if __name__ == "__main__":
    host = os.environ.get("HOST", "0.0.0.0")
    port = int(os.environ.get("PORT", 8081))
    # threaded=True lets independent requests (e.g. a fast "already
    # downloaded" check, or downloads of two different tracks) run
    # concurrently instead of queueing behind whichever request happened
    # to arrive first.
    app.run(host=host, port=port, threaded=True)
