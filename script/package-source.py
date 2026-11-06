#!/usr/bin/env python3
"""Create a deterministic source ZIP from an explicit allowlist, not git history."""
from pathlib import Path
import hashlib
import zipfile

ROOT = Path(__file__).resolve().parent.parent
OUTPUT = ROOT / "generated-artifacts"
ROOT_FILES = [
    ".env.example", ".gitignore", ".replit", ".replitignore",
    "README.md", "replit.md", "package.json", "package-lock.json",
    "components.json", "drizzle.config.ts", "vite.config.ts",
    "postcss.config.js", "tailwind.config.ts", "tsconfig.json",
    "client/index.html", "scripts/post-merge.sh",
]
TREES = ["client/src", "client/public", "server", "shared", "script", "docs"]
EXTENSIONS = {
    ".ts", ".tsx", ".js", ".mjs", ".cjs", ".css", ".html", ".json",
    ".md", ".py", ".svg", ".png", ".jpg", ".jpeg", ".webp", ".ico",
    ".woff", ".woff2", ".txt",
}


def source_files():
    files = set(ROOT_FILES)
    for tree in TREES:
        for path in (ROOT / tree).rglob("*"):
            relative = path.relative_to(ROOT)
            if path.is_symlink():
                raise ValueError(f"Refusing symlink: {relative}")
            if not path.is_file() or any(p.startswith(".") or p == "__pycache__" for p in relative.parts):
                continue
            if path.suffix not in EXTENSIONS:
                raise ValueError(f"Review unexpected source file before packaging: {relative}")
            files.add(relative.as_posix())
    return sorted(files)


def main():
    OUTPUT.mkdir(exist_ok=True)
    destination = OUTPUT / "clubb-nubb-source.zip"
    files = source_files()
    with zipfile.ZipFile(destination, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        for name in files:
            path = ROOT / name
            if path.is_symlink() or not path.is_file():
                raise ValueError(f"Required source file missing or unsafe: {name}")
            entry = zipfile.ZipInfo(f"clubb-nubb/{name}", date_time=(2026, 1, 1, 0, 0, 0))
            entry.compress_type = zipfile.ZIP_DEFLATED
            entry.external_attr = 0o100644 << 16
            archive.writestr(entry, path.read_bytes())
    digest = hashlib.sha256(destination.read_bytes()).hexdigest()
    (OUTPUT / "clubb-nubb-source.sha256").write_text(f"{digest}  {destination.name}\n")
    print(f"Created {destination.relative_to(ROOT)} ({len(files)} files, {destination.stat().st_size:,} bytes)")
    print(f"SHA-256: {digest}")


if __name__ == "__main__":
    main()
