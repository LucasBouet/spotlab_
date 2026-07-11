# File Tree: spotlab_

**Generated:** 7/11/2026, 11:23:25 AM
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
│   │   ├── admin
│   │   │   ├── settings
│   │   │   │   └── page.tsx
│   │   │   └── users
│   │   │       └── page.tsx
│   │   ├── album
│   │   │   └── [id]
│   │   │       └── page.tsx
│   │   ├── api
│   │   │   ├── prefetch
│   │   │   │   └── [id]
│   │   │   │       └── route.ts
│   │   │   ├── search
│   │   │   │   └── route.ts
│   │   │   └── stream
│   │   │       └── [id]
│   │   │           └── route.ts
│   │   ├── artist
│   │   │   └── [id]
│   │   │       └── page.tsx
│   │   ├── library
│   │   │   └── page.tsx
│   │   ├── login
│   │   │   └── page.tsx
│   │   ├── playlists
│   │   │   ├── [id]
│   │   │   │   └── page.tsx
│   │   │   └── page.tsx
│   │   ├── register
│   │   │   └── page.tsx
│   │   ├── search
│   │   │   └── page.tsx
│   │   ├── settings
│   │   │   └── page.tsx
│   │   ├── favicon.ico
│   │   ├── globals.css
│   │   ├── icon.tsx
│   │   ├── layout.tsx
│   │   ├── manifest.ts
│   │   └── page.tsx
│   ├── components
│   │   ├── app-shell.tsx
│   │   ├── icons.tsx
│   │   ├── nav-items.tsx
│   │   ├── resizable-sidebar.tsx
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
│   │   │   │   ├── player-bar.tsx
│   │   │   │   ├── queue-panel.tsx
│   │   │   │   ├── track-play-button.tsx
│   │   │   │   └── track-queue-menu.tsx
│   │   │   ├── download-track.ts
│   │   │   ├── player-context.tsx
│   │   │   └── use-media-session.ts
│   │   ├── Playlists
│   │   │   ├── Detail
│   │   │   │   └── pages.tsx
│   │   │   ├── List
│   │   │   │   └── pages.tsx
│   │   │   ├── components
│   │   │   │   └── add-to-playlist-menu.tsx
│   │   │   └── actions.ts
│   │   ├── Search
│   │   │   └── pages.tsx
│   │   ├── Settings
│   │   │   ├── components
│   │   │   │   ├── password-form.tsx
│   │   │   │   ├── preferences-form.tsx
│   │   │   │   └── profile-form.tsx
│   │   │   ├── actions.ts
│   │   │   └── pages.tsx
│   │   └── shared
│   │       └── use-like-toggle.ts
│   ├── lib
│   │   ├── deezer.ts
│   │   ├── password.ts
│   │   ├── prisma.ts
│   │   ├── rbac.ts
│   │   ├── session.ts
│   │   ├── settings.ts
│   │   ├── stream.ts
│   │   ├── use-resizable-width.ts
│   │   └── validation.ts
│   └── proxy.ts
├── .claudeignore
├── .gitignore
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