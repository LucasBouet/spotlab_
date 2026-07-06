# rip-config-api

Small local API that writes a Deezer ARL token into streamrip's
`config.toml`, gated behind a TOTP code.

## Setup

```bash
cd rip
pip install -r requirements.txt
cp .env.example .env   # then fill in TOTP_SECRET
```

Generate a secret:

```bash
python -c "import pyotp; print(pyotp.random_base32())"
```

Add it to `.env` as `TOTP_SECRET=...`, then enroll it in an authenticator
app (Google Authenticator, Authy, etc.) using this URI shape, substituting
your secret:

```
otpauth://totp/Spotlab%20Rip:spotlab?secret=YOUR_SECRET&issuer=Spotlab%20Rip
```

## Run

```bash
python app.py
```

Listens on `0.0.0.0:8081` by default. Override with `HOST` / `PORT` in
`.env`.

## Config file location

The API always reads/writes `config.toml` next to `app.py` (i.e.
`rip/config.toml`), not streamrip's real per-user config path. Point
streamrip at this file (or copy/symlink it into place) however fits your
setup.

If `rip/config.toml` doesn't exist yet, it's created from
`config.template.toml` (streamrip's default config) before the ARL is
written in.

The effective download folder is `FOLDER` from `.env` if set, otherwise
`rip/songs`. It's written to `[downloads].folder` on startup and on every
`/config` call. The database paths (`[database].downloads_path` /
`failed_downloads_path`) are likewise always pinned to `rip/downloads.db`
and `rip/failed_downloads.db`, since the template's defaults
(`/root/.config/streamrip/...`) don't exist outside a Linux container.

## Endpoints

### `POST /config`

Body (JSON, form, or query string):

| field  | description                          |
| ------ | ------------------------------------- |
| `arl`  | Deezer ARL cookie                     |
| `totp` | current 6-digit code from your app    |

```bash
curl -X POST http://localhost:8081/config \
  -H "Content-Type: application/json" \
  -d '{"arl": "your-arl-cookie", "totp": "123456"}'
```

Responses:

- `200` `{"success": true, "config_path": "..."}`
- `400` missing `arl`/`totp`
- `401` invalid TOTP code
- `500` couldn't read/write the config file

### `POST /download`

Downloads a Deezer track by ID via `rip --config-path <config.toml> -ndb
--no-progress id deezer track <id>`, then renames the resulting audio
file to `<id>.<ext>` in the download folder. If a file named `<id>.*`
already exists there, the download is skipped and that file is returned.

Body (JSON, form, or query string):

| field | description        |
| ----- | ------------------- |
| `id`  | Deezer track ID      |

```bash
curl -X POST http://localhost:8081/download \
  -H "Content-Type: application/json" \
  -d '{"id": "618526932"}'
```

Responses:

- `200` `{"success": true, "file": "...", "already_downloaded": bool}`
- `400` missing/non-numeric `id`
- `500` `rip` failed, or produced no audio file
