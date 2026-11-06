# Clubb Nubb

A mobile-first running-group check-in app. Members can see upcoming runs,
check in or skip, suggest changes, save locations, and view weather and tides.
Creator/admin controls manage custom runs and visibility.

## Important security notice

**Store this source in a private GitHub repository.** The current app has
hardcoded role passwords in both server and browser code and trusts
browser-local identity/roles. These are prototype controls, not secure user
authentication. A private repository does **not** secure a publicly reachable
app: bundled browser code is visible to visitors. Do not expose a new instance
to untrusted users until authentication and server-side authorization are
replaced. This package preserves existing behavior rather than redesigning it.

No environment secrets or existing database records are included in the source
package. Existing prototype passwords remain in source because the app uses them;
they are deliberately not repeated in these instructions.

## Start here

- **[Standalone setup and hosting](docs/STANDALONE_SETUP.md)** — fresh installation,
  environment variables, PostgreSQL, development, production, and troubleshooting.
- **[GitHub storage instructions](docs/GITHUB.md)** — upload or push the extracted
  source to your own private repository.
- **[Backup and restore](docs/BACKUP_RESTORE.md)** — preserve actual runs and
  check-ins separately from the code.
- **[Package verification](docs/VERIFICATION.md)** — what was tested and limitations.

## Requirements

- Node.js **20.19+ in the 20.x line, or 22.12+** with npm; use a currently
  maintained LTS release for a new deployment. Node 20.20 was used for package verification.
- PostgreSQL **16** (the tested baseline), running locally or as a managed service.
- Git for cloning/pushing. Python **3.9+** only if regenerating the source ZIP.
- Internet access for dependency installation and external weather/tide/geocoding/fonts.

The app is not a static-only site. It needs a running Node server and PostgreSQL.
GitHub stores the source; GitHub Pages alone cannot run this backend.

## Quick start (after installing PostgreSQL)

Run from the extracted `clubb-nubb` folder or a clone of your repository:

```sh
npm ci
cp .env.example .env
# Edit .env with credentials for your own EMPTY PostgreSQL database.
npm run db:push
npm run dev
```

Open <http://localhost:5000>. On Windows PowerShell use
`Copy-Item .env.example .env` instead of `cp`. See the standalone guide for
database creation and production commands.

**Startup writes to the database:** it creates missing weekday runs for the next
14 days and removes check-ins matching legacy sample names. Read the
[backup/restore warnings](docs/BACKUP_RESTORE.md#startup-side-effects) before
connecting a restored database.

## Commands

| Command | Purpose |
| --- | --- |
| `npm ci` | Install exact locked dependency versions (including build tools) |
| `npm run db:push` | Compare/apply schema to the configured database; review prompts |
| `npm run dev` | Development server plus Vite, same port |
| `npm run check` | TypeScript check |
| `npm run build` | Build browser assets and Node server into `dist/` |
| `npm start` | Start the built production server |
| `python3 script/package-source.py` | Create source ZIP and SHA-256 checksum |

`dev`, `start`, and `db:push` load a root `.env` automatically using Node's
built-in loader. Existing host environment values take precedence. No `.env` is
needed when your host supplies the variables. These commands work without POSIX
environment-assignment syntax on Windows.

## Architecture and contents

- `client/`: React 18, Vite, Tailwind, shadcn/ui, wouter; bundled public assets.
- `server/`: Express 5, REST API, PostgreSQL access through Drizzle.
- `shared/`: database schema, validation, and shared types.
- `script/`: build, environment-aware launch, and source packaging tools.
- `docs/`: setup, GitHub, backups, and verification.
- `.replit`, `replit.md`, `scripts/post-merge.sh`: optional existing Replit
  configuration/context, not required for independent operation. The post-merge
  script changes the configured database schema; do not run it as a backup tool.

Production Express serves `dist/public/` and `/api` on the same port.
All required logos, weather sprites, manifest, and icons are in `client/public/`.
Historical uploads in `attached_assets/` are not required by this version and are
excluded from the package, along with workspace metadata and Git history.

The ZIP is a source snapshot, not an offline dependency bundle, a compiled
installer, or a database backup. Its packaging script uses an explicit allowlist
and deterministic ZIP metadata; identical source produces the same checksum.
