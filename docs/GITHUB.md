# Store the app in GitHub

Use a **private repository**, given the current prototype passwords and identity
model described in the README. Do not upload a `.env`, database backup, log,
`node_modules/`, `dist/`, workspace metadata, or the source ZIP itself.

## Option A: Upload in the browser

1. Download `clubb-nubb-source.zip` and extract it. Open its `clubb-nubb` folder.
2. In GitHub create a new **private** repository, for example `clubb-nubb`.
3. Use the repository's **upload existing files / Add file → Upload files** flow.
4. Upload the **contents** of the extracted folder, not the ZIP. Preserve folder
   names. Include `.env.example`, `.gitignore`, and `.replitignore`; your file
   picker may hide dotfiles, so enable showing hidden files.
5. Review the file list, then commit. The README should appear on the repository
   home page. If browser folder upload skips hidden files, use Option B.

The archive is small enough for normal source upload; no large-file tooling is
needed. Do not upload the original workspace indiscriminately.

## Option B: Push the extracted source using Git

Install Git first, create an **empty private** GitHub repository without an
initial README, and run these commands from the extracted `clubb-nubb` folder.
Replace `YOUR_ACCOUNT` and repository name with your actual values:

```sh
git init
git branch -M main
git add .
git status --short
git diff --cached --stat
git commit -m "Store Clubb Nubb source and standalone setup guide"
git remote add origin https://github.com/YOUR_ACCOUNT/clubb-nubb.git
git push -u origin main
```

Before committing, review staged files. Only `.env.example`, not `.env`, should
appear. Git may ask you to configure your name/email if you have not used it
before. Authenticate through your Git client or GitHub's supported sign-in
flow; never embed an access token in a repository URL or commit.

The extracted ZIP intentionally has no previous Git history. These instructions
start a new history; they do not erase or replace the original workspace history.

## Resume work later

```sh
git clone https://github.com/YOUR_ACCOUNT/clubb-nubb.git
cd clubb-nubb
npm ci
```

Then follow [Standalone setup](STANDALONE_SETUP.md). After future edits, review
changes and use `git add`, `git commit`, and `git push` again.

## What GitHub does and does not preserve

GitHub preserves committed source, documentation, dependency versions, and app
assets. It does **not** preserve PostgreSQL data, host configuration/secrets,
your browser's display name/role/recurring choices, or installed dependencies.
See [Backup and restore](BACKUP_RESTORE.md).

If a secret is accidentally committed, deleting it in a later commit is not
enough: rotate/revoke it and remove it from history using GitHub's documented
sensitive-data removal process. Private repositories still need safe handling.
