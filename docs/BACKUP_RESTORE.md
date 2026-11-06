# Backup and restore

## Three separate things to preserve

1. **Source code/assets** — the source ZIP or private GitHub repository.
2. **PostgreSQL data** — runs, check-ins, suggestions, saved locations; separate
   encrypted database backups are required.
3. **Configuration/browser preferences** — keep host environment configuration in
   a secure password/secret manager. Names, role choice, and recurring-day
   preferences are browser localStorage and are not part of a database dump.

The package contains no export of current development or live records, no
environment secret values, and no previous Git history. It does preserve the
existing prototype password literals in app source, as described in the README.

## Back up PostgreSQL outside the app

Use PostgreSQL 16 client tools for a PostgreSQL 16 server. A `pg_dump` client
cannot dump a newer major server; use a matching/newer client if you upgrade.

The examples use PostgreSQL's connection flags and an interactive password
prompt, avoiding a password in shell history. Replace uppercase placeholders.
For managed databases use the provider's documented TLS parameters and trusted
CA setup; do not turn certificate verification off.

```sh
mkdir -p backups
pg_dump --host=SOURCE_HOST --port=5432 --username=SOURCE_USER \
  --dbname=SOURCE_DATABASE --password --format=custom \
  --no-owner --no-acl --file=backups/clubbnubb.dump
pg_restore --list backups/clubbnubb.dump
```

PowerShell: create the folder with
`New-Item -ItemType Directory -Force backups`, then put each `pg_dump` /
`pg_restore` command on one line (the backslash continuation above is POSIX).

`pg_dump` takes a consistent snapshot; changes made after it starts are not in
that backup. For a final move, stop writes to the old app, take the final dump,
restore/verify, then move users to the new instance. Avoid running two active
instances against independently changing copies of the database.

Backups contain member data. Encrypt them, restrict access, and keep them
outside Git and the source archive. Test restoration periodically. The
`backups/`, `*.dump`, and `*.sql` ignore rules are extra safeguards, not a
substitute for reviewing uploads.

## Restore into a NEW empty database

1. Create a new PostgreSQL database owned by the destination application login.
   Do not start the app against it yet.
2. Restore the custom-format dump:

```sh
pg_restore --host=DESTINATION_HOST --port=5432 --username=DESTINATION_USER \
  --dbname=NEW_EMPTY_DATABASE --password --no-owner --no-acl \
  --exit-on-error --single-transaction backups/clubbnubb.dump
```

3. Inspect record counts using `psql` before starting the app:

```sql
SELECT count(*) FROM runs;
SELECT count(*) FROM checkins;
SELECT count(*) FROM suggestions;
SELECT count(*) FROM saved_locations;
```

4. Point the new instance's `DATABASE_URL` at that database securely. If the
   source schema and this code match, restoration already created the tables;
   do **not** initialize them again first.
5. If the code schema changed, back up the restored database before reviewing
   `npm run db:push`. Do not force destructive prompts.
6. Read the startup warnings below, then start the app and verify runs/check-ins
   and assets through the new URL. Compare historical counts in the database;
   the UI only shows an upcoming date range.

These commands intentionally omit `--clean`/`DROP`: they must not overwrite a
live database. A restore should fail if the destination isn't empty. Global
database roles/host configuration are not included by this `pg_dump` command.
Create the destination login separately.

## Startup side effects

The existing app does more than read the database on launch:

- It creates missing weekday runs for the next 14 calendar days at 05:30 at
  Short Sands Beach.
- It runs a legacy sample-runner cleanup, deleting check-ins whose runner names
  match four sample literals in `server/storage.ts` (`clearSeedRunners`).
  A real member using one of those names would also be affected. Review that
  function privately before starting a restored instance. This package does
  not change that behavior or copy those names into the guide.

Therefore a database can change immediately after the app starts. Verify a
restore **before** launch. If the cleanup is unsuitable for your data, have it
removed or made an explicit one-off maintenance action before launch.

## Regenerate the source package

With Python 3.9+ installed, from the project root:

```sh
python3 script/package-source.py
```

On Windows, use `py -3 script/package-source.py`. Output:

- `generated-artifacts/clubb-nubb-source.zip`
- `generated-artifacts/clubb-nubb-source.sha256`

The script includes allowlisted app/config/documentation files and required
public assets, not the database, `.env`, old uploads, `node_modules`, builds,
caches, workspace metadata, or Git history. It refuses unexpected source file
extensions/symlinks rather than silently including them. Review the allowlist
when adding new required asset locations. Do not put private data into source
files: packaging cannot distinguish sensitive content intentionally put in code.

To verify a downloaded ZIP's checksum:

```sh
sha256sum clubb-nubb-source.zip
# macOS alternative:
shasum -a 256 clubb-nubb-source.zip
```

PowerShell: `Get-FileHash clubb-nubb-source.zip -Algorithm SHA256`.
Compare with the supplied checksum file. A checksum detects accidental
corruption; it is not a digital signature.
