#!/usr/bin/env python3
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import json

root = Path(__file__).resolve().parent.parent
version = json.loads((root / "manifest.json").read_text())["version"]
out = root / "dist" / f"rutorrent-quick-add-{version}-unsigned.zip"
out.parent.mkdir(exist_ok=True)
files = [
    "manifest.json", "common.js", "background.js", "capture.js",
    "launcher.js", "launcher.html", "options.js", "options.html",
    "style.css", "icon.svg", "icon-16.png", "icon-32.png",
    "icon-48.png", "icon-96.png"
]
files += [str(p.relative_to(root)) for p in sorted((root / "destination-icons").glob("*.svg"))]
with ZipFile(out, "w", ZIP_DEFLATED) as archive:
    for name in files:
        archive.write(root / name, name)
print(out)
