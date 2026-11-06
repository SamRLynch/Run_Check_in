# Standalone setup and hosting

These instructions run the same app outside Replit, using Node.js and PostgreSQL.
No Replit account, API, OAuth service, or proprietary storage is required at
runtime. Replit's optional development plugins only activate when `REPL_ID` is
present in development.

## 1. Install prerequisites

Install Node.js with npm: 20.19+ (20.x), or 22.12+. Prefer a maintained LTS line
for new hosting. Install PostgreSQL 16 server plus command-line tools, and Git
if cloning. Check:

```sh
node --version
npm --version
psql --version
```

Linux, macOS, or Windows with these prerequisites can use the npm commands.
Examples involving `export` are for a POSIX shell; PowerShell alternatives
appear below. Python is not needed to run the app.

## 2. Obtain the source

Extract the provided ZIP and open the inner `clubb-nubb` folder, or clone your
private repository:

```sh
git clone https://github.com/YOUR_ACCOUNT/clubb-nubb.git
cd clubb-nubb
npm ci
```

Use `npm ci`, not `npm install`, for a repeatable installation from the lockfile.
Keep development dependencies installed during building and schema setup.

## 3. Create an empty PostgreSQL database

Use a database you control, **not** the existing live database. With PostgreSQL
running, connect using its administrative account and create a dedicated login
and database. In `psql` (replace the example username if desired):

```sql
CREATE ROLE clubbnubb_app LOGIN;
\password clubbnubb_app
CREATE DATABASE clubbnubb OWNER clubbnubb_app;
```

`\password` prompts securely rather than putting a real password in this guide
or in SQL history. How you connect as the administrator depends on your OS and
PostgreSQL installer. A managed PostgreSQL provider can create the database and
login for you instead. Use its supplied connection URL, TLS settings, and network
allowlist. Do not disable certificate verification to fix connection errors.

## 4. Configure the environment

macOS/Linux:

```sh
cp .env.example .env
```

PowerShell:

```powershell
Copy-Item .env.example .env
```

Edit `.env` locally. Replace the placeholder database URL with your own:

```dotenv
DATABASE_URL=postgresql://YOUR_USER:YOUR_PASSWORD@127.0.0.1:5432/clubbnubb
PORT=5000
TZ=America/New_York
```

Do not paste a real URL into chat, screenshots, Git commits, or shared logs.
Percent-encode reserved characters in the username/password, such as `@` and
`#`. Follow your managed provider's connection-string instructions for TLS.

| Variable | Requirement |
| --- | --- |
| `DATABASE_URL` | Required by the server and schema command; PostgreSQL connection URL |
| `PORT` | Optional; defaults to 5000; server binds all interfaces (`0.0.0.0`) |
| `TZ` | Optional; recommended `America/New_York` to align startup weekday creation with the club |
| `NODE_ENV` | Set automatically: `development` for `npm run dev`, `production` for `npm start` |
| `REPL_ID` | Not needed outside Replit; leave unset |
| `SESSION_SECRET` | Not currently read by the application; setting it does not secure login |

The launch helper loads `.env` from the **current working directory** before
starting the server/schema tool. An already-set host environment variable wins
over the same variable in `.env`. Always run commands from the project root.
The build and type check do not need database credentials.

## 5. Initialize the database schema

```sh
npm run db:push
```

This uses the Drizzle schema in `shared/schema.ts` to create `runs`, `checkins`,
`suggestions`, and `saved_locations` in the selected database. Review any
prompts; do not force-accept destructive changes. This is a schema operation,
not an import of existing runs/check-ins.

Before doing this against a database containing real data, take a backup and
review the proposed changes. There are no versioned SQL migrations in this
snapshot; the current setup uses Drizzle's schema comparison/push.

## 6. Run in development

```sh
npm run check
npm run dev
```

Open <http://localhost:5000> (or your configured port). The same Node server
serves the frontend and `/api`; do not start a separate Vite server.
To stop, press Ctrl+C.

On startup the app inserts missing weekday runs over the next 14 calendar days
at 05:30 at Short Sands Beach, and runs a legacy sample-check-in cleanup.
Read [startup side effects](BACKUP_RESTORE.md#startup-side-effects) before using
restored data. Scheduling/API/weather logic assumes the club's New York timezone;
changing `TZ` alone does not relocate the app.

## 7. Run a production build

```sh
npm ci
npm run check
npm run build
# On a new external host/database, initialize schema separately:
npm run db:push
npm start
```

The output is `dist/index.cjs` and `dist/public/`. `npm start` loads `.env` and
runs Node in production. Do not run the TypeScript/Vite development server for
production. Keep the project root, `script/run.mjs`, package manifests, `dist/`,
and installed runtime dependencies on the host.

For a minimal runtime-only installation, build and apply any reviewed schema
changes first, then `npm prune --omit=dev`. Schema/build commands require
development dependencies; reinstall them with `npm ci` for the next build.

## 8. Hosting on a generic server or Node-capable service

1. Use a private staging instance until authentication is secured. Do not make
   a public launch solely because a build passes.
2. Provision PostgreSQL separately, allow the app to connect, and supply
   `DATABASE_URL` securely through the host's environment configuration.
3. Set `TZ=America/New_York` and the host's assigned `PORT`. Do not copy `REPL_ID`.
4. Build with `npm ci && npm run check && npm run build`.
5. Initialize/review schema explicitly against the intended external database,
   once before starting a new instance. Do not run schema changes on every request.
6. Use `npm start` as the run command, with the repository root as working
   directory. Use your host's process supervisor to restart on failure/reboot.
7. Configure HTTPS with the host or a reverse proxy forwarding `/` and `/api`
   to the same Node port. Serve the app at the domain root, not a subdirectory.
8. Keep PostgreSQL off the public internet where possible and schedule encrypted
   backups. Restrict logs: the current API logger includes response bodies,
   which may contain member names and other group data.

No static-only host can run this Express/PostgreSQL app. Persistent local disk
is not used for app records; the database must persist independently. Weather
and tide caches live in memory and refill after restarts.

### Network dependencies

| Caller | Service | Purpose |
| --- | --- | --- |
| Server | `api.open-meteo.com` | Forecast temperature, humidity, wind, precipitation |
| Server | `api.tidesandcurrents.noaa.gov` | NOAA tide predictions; station 8419317 |
| Browser | `nominatim.openstreetmap.org` | Location search, currently US-biased near York, Maine |
| Browser | `fonts.googleapis.com`, `fonts.gstatic.com` | Google Fonts including Inter/Fraunces |
| Installer | npm registry | Fetch locked dependencies |

No API keys are configured for these services. Availability, quotas, attribution,
and usage policies still apply. In particular, review Nominatim's public-service
policy before a wider rollout: public Nominatim is not suitable for client-side
autocomplete at scale. Adopt a compliant provider before expanding use.
Missing external access can affect forecasts, search, or font rendering even if
the app/database are healthy. Historical project notes mention Photon; the
current source actually calls Nominatim.

All local logos, icons, sprites, and manifest assets ship under `client/public/`.
The archive intentionally excludes old unrelated `attached_assets/` uploads.

## Troubleshooting

- **`DATABASE_URL must be set`**: run from the project root, ensure `.env` exists,
  and replace its placeholders. Host variables override `.env`.
- **Connection refused / password authentication failed**: confirm PostgreSQL is
  running, credentials/database name are correct, and the host/network allows
  access. Verify TLS requirements with the database provider.
- **`relation ... does not exist`**: initialize the intended empty database with
  `npm run db:push`. Do not point schema tools at an unverified live database.
- **`Could not find the build directory`**: run `npm run build` before `npm start`.
- **Old Node / `loadEnvFile` or Vite errors**: use the supported Node versions above.
- **Port already in use**: stop the other process or choose another `PORT`.
- **Blank page / missing assets**: deploy the complete `dist/public/` alongside
  `dist/index.cjs`; proxy both frontend and API; host at `/`.
- **New server shows no old check-ins**: code upload is not a database migration.
  Follow the backup/restore guide.
- **Name, role, or recurring choices reset on a new domain**: these use browser
  localStorage, scoped to the original site; users must re-enter them.

See [Verification](VERIFICATION.md) for actual checks performed on this snapshot.
