#!/usr/bin/env python3
"""Build installable-source ZIPs for Firefox (MV2) and Chrome (MV3)."""
import json, sys, zipfile
from pathlib import Path
ROOT=Path(__file__).resolve().parent.parent
SHARED=ROOT/'src'
BROWSERS={'firefox':['manifest.json','common.js','capture.js','background.js'],
          'chrome':['manifest.json','common.js','capture.js','background-core.js','background-worker.js']}

def build(browser):
    if browser not in BROWSERS: raise ValueError('Browser must be firefox or chrome')
    browser_dir=ROOT/'browsers'/browser
    manifest=json.loads((browser_dir/'manifest.json').read_text())
    version=manifest['version']
    out=ROOT/'dist'/f'rutorrent-quick-add-{browser}-{version}-unsigned.zip'
    out.parent.mkdir(exist_ok=True)
    with zipfile.ZipFile(out,'w',zipfile.ZIP_DEFLATED) as z:
        for f in sorted(SHARED.rglob('*')):
            if f.is_file(): z.write(f,f.relative_to(SHARED).as_posix())
        for name in BROWSERS[browser]: z.write(browser_dir/name,name)
    with zipfile.ZipFile(out) as z:
        assert z.testzip() is None
        assert 'manifest.json' in z.namelist()
        assert 'README.md' not in z.namelist()
    print(out)
    return out

if __name__=='__main__':
    args=sys.argv[1:] or ['firefox','chrome']
    for b in args: build(b)
