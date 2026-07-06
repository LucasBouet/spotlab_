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

## Endpoint

`POST /config`

Body (JSON, form, or query string):

| field  | description                          |
| ------ | ------------------------------------- |
| `arl`  | Deezer ARL cookie                     |
| `totp` | current 6-digit code from your app    |

Example:

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
