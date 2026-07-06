# Streamrip API — integration reference

A small Flask service in `rip/` (this repo) that wraps the `rip`
(streamrip) CLI. Not part of the Next.js app — call it from server-side
code only (Route Handler / Server Action), never from the browser.

- Base URL: `http://localhost:8081` (host/port configurable via `HOST` /
  `PORT` in `rip/.env`; default port is 8081)
- Content type: JSON body on all requests (form/query params also work,
  but JSON is the primary contract)
- Run with `python rip/app.py`; it must be running for these endpoints
  to respond.

## POST /config

Sets the Deezer ARL cookie used for all downloads. Gated by a TOTP code
(6-digit, from an authenticator app enrolled against the secret in
`rip/.env` — see `rip/README.md` for enrollment). There is no other auth
on this endpoint.

Request body:
```json
{ "arl": "the-deezer-arl-cookie", "totp": "123456" }
```

Responses:
| status | body | meaning |
| --- | --- | --- |
| 200 | `{"success": true, "config_path": "..."}` | ARL saved |
| 400 | `{"error": "arl and totp are required"}` | missing field |
| 401 | `{"error": "invalid totp code"}` | bad/expired code |
| 500 | `{"error": "failed to update config: ..."}` | disk/write error |

## POST /download

Downloads a single Deezer track by ID and returns the path to the saved
file. Synchronous — the request blocks until the download finishes
(a few seconds per track). No auth on this endpoint; treat network
access to port 8081 as the only boundary.

Request body:
```json
{ "id": "618526932" }
```
`id` must be a numeric Deezer track ID (string or number both accepted).

Responses:
| status | body | meaning |
| --- | --- | --- |
| 200 | `{"success": true, "file": "<abs path>", "already_downloaded": false}` | freshly downloaded |
| 200 | `{"success": true, "file": "<abs path>", "already_downloaded": true}` | file already existed, skipped re-download |
| 400 | `{"error": "id is required"}` / `{"error": "id must be numeric"}` | bad input |
| 500 | `{"error": "<rip's stderr/stdout, or 'rip did not produce an audio file'>"}` | download failed (bad/missing ARL, invalid ID, network error, etc.) |

Behavior notes:
- The saved filename is always `<track_id>.<ext>` (e.g. `618526932.mp3`)
  in the download folder — the extension depends on streamrip's quality
  config, not something the caller picks. **The Next.js side can predict
  the exact filename from the track ID alone**, without parsing the
  `file` field, as long as it knows the download folder.
- Any extra file `rip` produces alongside the track (e.g. `cover.jpg`
  artwork) is deleted automatically — only the renamed audio file
  remains.
- `file` is an **absolute path on the machine running the Python
  process**. If Next.js runs on a different host/container, it can't
  read this path directly — you'd need a shared volume or a follow-up
  endpoint to stream bytes (not implemented yet).

## Download folder

Resolved once at process startup:
- `FOLDER` in `rip/.env`, if set, else
- `rip/songs` (relative to the API's own folder)

There's no per-request override — it's fixed for the life of the
running process.

## Known gaps to design around

- `/download` has no auth at all.
- No batch/queue endpoint — one HTTP call per track ID, and each blocks
  until done. For bulk downloads, the caller (Next.js) needs its own
  sequencing/concurrency handling and loading UI.
- No progress reporting mid-download (`--no-progress` is passed to
  `rip`).

## Related existing code (not part of this API, just context)

- `src/config/settings.ts` already declares an `arl_token` app setting
  (currently a placeholder default) — likely where a "Deezer ARL" admin
  UI already hooks in, and a natural place to wire up calls to
  `POST /config`.
