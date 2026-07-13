# File Tree: spotlab_

**Generated:** 7/13/2026, 9:27:24 PM
**Root Path:** `/home/lucas/spotlab_`

```
├── .claude
│   └── settings.local.json
├── docs
│   └── INDEX.md
├── prisma
│   ├── migrations
│   │   ├── 20260702173553_init
│   │   │   └── migration.sql
│   │   ├── 20260702183700_add_auth
│   │   │   └── migration.sql
│   │   ├── 20260705173650_add_liked_tracks
│   │   │   └── migration.sql
│   │   ├── 20260705182706_add_roles_and_settings
│   │   │   └── migration.sql
│   │   ├── 20260706161543_add_playlists
│   │   │   └── migration.sql
│   │   ├── 20260711144346_add_devices
│   │   │   └── migration.sql
│   │   └── migration_lock.toml
│   ├── prisma_db
│   │   ├── internal
│   │   │   ├── class.ts
│   │   │   ├── prismaNamespace.ts
│   │   │   └── prismaNamespaceBrowser.ts
│   │   ├── models
│   │   │   └── User.ts
│   │   ├── runtime
│   │   │   ├── client.d.ts
│   │   │   ├── client.js
│   │   │   ├── index-browser.d.ts
│   │   │   ├── index-browser.js
│   │   │   └── wasm-compiler-edge.js
│   │   ├── browser.ts
│   │   ├── client.d.ts
│   │   ├── client.js
│   │   ├── client.ts
│   │   ├── commonInputTypes.ts
│   │   ├── default.d.ts
│   │   ├── default.js
│   │   ├── edge.d.ts
│   │   ├── edge.js
│   │   ├── enums.ts
│   │   ├── index-browser.js
│   │   ├── index.d.ts
│   │   ├── index.js
│   │   ├── models.ts
│   │   ├── package.json
│   │   ├── query_compiler_fast_bg.js
│   │   ├── query_compiler_fast_bg.wasm
│   │   ├── query_compiler_fast_bg.wasm-base64.js
│   │   ├── schema.prisma
│   │   ├── wasm-edge-light-loader.mjs
│   │   └── wasm-worker-loader.mjs
│   ├── schema.prisma
│   └── seed.mts
├── public
│   ├── file.svg
│   ├── globe.svg
│   ├── next.svg
│   ├── sw.js
│   ├── vercel.svg
│   └── window.svg
├── rip
│   ├── API.md
│   ├── README.md
│   ├── app.py
│   ├── config.template.toml
│   └── requirements.txt
├── src
│   ├── app
│   │   ├── (app)
│   │   │   ├── admin
│   │   │   │   ├── settings
│   │   │   │   │   └── page.tsx
│   │   │   │   └── users
│   │   │   │       └── page.tsx
│   │   │   ├── album
│   │   │   │   └── [id]
│   │   │   │       └── page.tsx
│   │   │   ├── artist
│   │   │   │   └── [id]
│   │   │   │       └── page.tsx
│   │   │   ├── library
│   │   │   │   └── page.tsx
│   │   │   ├── playlists
│   │   │   │   ├── [id]
│   │   │   │   │   └── page.tsx
│   │   │   │   └── page.tsx
│   │   │   ├── search
│   │   │   │   └── page.tsx
│   │   │   ├── settings
│   │   │   │   └── page.tsx
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx
│   │   ├── api
│   │   │   ├── devices
│   │   │   │   ├── [deviceId]
│   │   │   │   │   └── route.ts
│   │   │   │   ├── register
│   │   │   │   │   └── route.ts
│   │   │   │   └── route.ts
│   │   │   ├── lyrics
│   │   │   │   └── route.ts
│   │   │   ├── playlists
│   │   │   │   └── import
│   │   │   │       └── route.ts
│   │   │   ├── prefetch
│   │   │   │   └── [id]
│   │   │   │       └── route.ts
│   │   │   ├── search
│   │   │   │   └── route.ts
│   │   │   ├── stream
│   │   │   │   └── [id]
│   │   │   │       └── route.ts
│   │   │   └── sync
│   │   │       ├── command
│   │   │       │   └── route.ts
│   │   │       └── stream
│   │   │           └── route.ts
│   │   ├── login
│   │   │   └── page.tsx
│   │   ├── register
│   │   │   └── page.tsx
│   │   ├── favicon.ico
│   │   ├── globals.css
│   │   ├── icon.tsx
│   │   ├── layout.tsx
│   │   └── manifest.ts
│   ├── components
│   │   ├── app-shell.tsx
│   │   ├── icons.tsx
│   │   ├── nav-items.tsx
│   │   ├── resizable-sidebar.tsx
│   │   ├── service-worker-register.tsx
│   │   └── track-list.tsx
│   ├── config
│   │   └── settings.ts
│   ├── features
│   │   ├── Admin
│   │   │   ├── Settings
│   │   │   │   └── pages.tsx
│   │   │   ├── Users
│   │   │   │   └── pages.tsx
│   │   │   ├── components
│   │   │   │   └── admin-tabs.tsx
│   │   │   └── actions.ts
│   │   ├── Album
│   │   │   └── pages.tsx
│   │   ├── Artist
│   │   │   └── pages.tsx
│   │   ├── Auth
│   │   │   ├── Login
│   │   │   │   └── pages.tsx
│   │   │   ├── Register
│   │   │   │   └── pages.tsx
│   │   │   └── actions.ts
│   │   ├── Home
│   │   │   └── pages.tsx
│   │   ├── Library
│   │   │   ├── actions.ts
│   │   │   └── pages.tsx
│   │   ├── Player
│   │   │   ├── components
│   │   │   │   ├── context-play-controls.tsx
│   │   │   │   ├── devices-panel.tsx
│   │   │   │   ├── lyrics-view.tsx
│   │   │   │   ├── now-playing.tsx
│   │   │   │   ├── player-bar.tsx
│   │   │   │   ├── queue-panel.tsx
│   │   │   │   ├── track-play-button.tsx
│   │   │   │   └── track-queue-menu.tsx
│   │   │   ├── download-track.ts
│   │   │   ├── player-context.tsx
│   │   │   ├── queue-reducer.ts
│   │   │   ├── use-device-id.ts
│   │   │   ├── use-lyrics.ts
│   │   │   ├── use-media-session.ts
│   │   │   └── use-playback-sync.ts
│   │   ├── Playlists
│   │   │   ├── Detail
│   │   │   │   └── pages.tsx
│   │   │   ├── List
│   │   │   │   └── pages.tsx
│   │   │   ├── components
│   │   │   │   └── add-to-playlist-menu.tsx
│   │   │   ├── actions.ts
│   │   │   └── import-deezer-playlist.ts
│   │   ├── Search
│   │   │   └── pages.tsx
│   │   ├── Settings
│   │   │   ├── components
│   │   │   │   ├── import-playlist-form.tsx
│   │   │   │   ├── password-form.tsx
│   │   │   │   ├── preferences-form.tsx
│   │   │   │   └── profile-form.tsx
│   │   │   ├── actions.ts
│   │   │   └── pages.tsx
│   │   └── shared
│   │       └── use-like-toggle.ts
│   ├── lib
│   │   ├── deezer.ts
│   │   ├── device-label.ts
│   │   ├── lrc.ts
│   │   ├── password.ts
│   │   ├── playback-position.ts
│   │   ├── playback-sync.ts
│   │   ├── prisma.ts
│   │   ├── rbac.ts
│   │   ├── session.ts
│   │   ├── settings.ts
│   │   ├── stream.ts
│   │   ├── sync-types.ts
│   │   ├── use-resizable-width.ts
│   │   └── validation.ts
│   └── proxy.ts
├── .claudeignore
├── .gitignore
├── CLAUDE.md
├── README.md
├── architecture.md
├── biome.json
├── dev.db
├── next.config.ts
├── package-lock.json
├── package.json
├── postcss.config.mjs
├── prisma.config.ts
├── tsconfig.json
└── yarn.lock
```

---
*Generated by FileTree Pro Extension*