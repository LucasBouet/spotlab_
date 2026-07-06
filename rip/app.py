"""Small local API that writes a Deezer ARL token into streamrip's config.toml.

Runs on port 8081. A request to /config is only honored if it carries a
valid TOTP code, checked against TOTP_SECRET (see .env).
"""

import os
from pathlib import Path

import pyotp
import tomlkit
from flask import Flask, jsonify, request

BASE_DIR = Path(__file__).resolve().parent
TEMPLATE_PATH = BASE_DIR / "config.template.toml"
CONFIG_PATH = BASE_DIR / "config.toml"


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


def set_arl(path: Path, arl: str) -> None:
    doc = tomlkit.parse(path.read_text(encoding="utf-8"))
    if "deezer" not in doc:
        doc["deezer"] = tomlkit.table()
    doc["deezer"]["arl"] = arl

    tmp_path = path.with_suffix(".toml.tmp")
    tmp_path.write_text(tomlkit.dumps(doc), encoding="utf-8")
    os.replace(tmp_path, path)


load_env_file(BASE_DIR / ".env")

TOTP_SECRET = os.environ.get("TOTP_SECRET")
if not TOTP_SECRET:
    raise RuntimeError("TOTP_SECRET is not set. Add it to rip/.env")

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
        set_arl(CONFIG_PATH, arl)
    except OSError as exc:
        return jsonify(error=f"failed to update config: {exc}"), 500

    return jsonify(success=True, config_path=str(CONFIG_PATH))


if __name__ == "__main__":
    host = os.environ.get("HOST", "0.0.0.0")
    port = int(os.environ.get("PORT", 8081))
    app.run(host=host, port=port)
