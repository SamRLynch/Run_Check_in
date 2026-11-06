# Package verification

Verified on November 6, 2026, on Linux with Node.js 20.20.0 and PostgreSQL 16.10.
This records package checks, not a claim that every app feature or every
hosting provider has been tested.

## Scope

- Verify a clean source extraction with locked dependencies.
- Check TypeScript and build production assets/server.
- Initialize a new isolated PostgreSQL 16 database, not the existing app database.
- Smoke-check development/production server, API/database access, local assets,
  and `.env` loading/host environment precedence.
- Check archive allowlist and deterministic checksum.

## Results

| Check | Result |
| --- | --- |
| Source ZIP inspection/extraction | Passed; required source/docs/assets present, no database, `.env`, old uploads, dependency/build folders, or workspace/Git metadata |
| Clean `npm ci` | Passed in extracted source, without existing node_modules or Replit environment variables |
| `npm run check` | Passed in workspace and clean extraction |
| `npm run build` | Passed in clean extraction |
| `.env`-only schema setup | Passed; `npm run db:push` initialized all four tables in a separate empty PostgreSQL database |
| Development server | Passed; API returned generated runs, root/deep-link HTML and public assets returned HTTP 200 |
| Production server | Passed after `npm prune --omit=dev`; no build/schema tools required to start |
| Host environment precedence | Passed; supplied `PORT` overrode `.env` while database settings came from `.env` |
| Backup/restore procedure | Passed using only generated test runs; restored into another empty database with matching table counts |
| Existing app preview | Visually checked after workflow restart; home screen rendered normally |
| Reproducible archive | Repeated packaging compared by SHA-256 |

Build emitted non-fatal warnings about old Browserslist data, a PostCSS plugin's
missing `from` option, and server bundle size. These did not block compilation.
No dependency upgrades were performed as part of this packaging task.

The original weather response had a TypeScript definition missing its already
returned humidity field; that definition was corrected without changing behavior.

One test initially lost the temporary PostgreSQL process between test commands.
The complete isolated database/server checks subsequently passed with PostgreSQL
kept alive for the duration of the test. No existing app data was used.

## Limitations

- No existing development or production records are exported or restored.
- Windows/macOS and a real external hosting provider are not exercised here.
- External API uptime, quotas, and end-to-end browser interactions are not a
  guarantee of this source package.
- Prototype authentication is unchanged and is not a secure production login.
