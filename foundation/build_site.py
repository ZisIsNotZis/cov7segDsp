"""Build self-contained HTML files for offline use and GitHub Pages (stdlib only)."""
from __future__ import annotations

import argparse
import base64
import hashlib
import json
import mimetypes
import re
from pathlib import Path
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[1]
SOURCE = 'https://github.com/ZisIsNotZis/cov7segDsp/blob/master/'
SITE = 'https://ZisIsNotZis.github.io/cov7segDsp/'


def local_asset(url: str) -> Path:
    path = (ROOT / urlsplit(url).path).resolve()
    if not path.is_relative_to(ROOT) or not path.is_file():
        raise ValueError(f'Missing or out-of-project asset: {url}')
    return path


def bundle(source: Path) -> str:
    html = source.read_text(encoding='utf-8')

    def style(match):
        content = local_asset(match[1]).read_text(encoding='utf-8')
        return '<style>\n' + content + '\n</style>'

    def script(match):
        content = local_asset(match[1]).read_text(encoding='utf-8')
        # Prevent a literal HTML end tag inside JavaScript strings closing the element.
        content = re.sub(r'</script', r'<\\/script', content, flags=re.I)
        return '<script>\n' + content + '\n</script>'

    def image(match):
        tag, url = match[0], match[1]
        if urlsplit(url).scheme or url.startswith('//'):
            return tag
        path = local_asset(url)
        mime = mimetypes.guess_type(path.name)[0] or 'application/octet-stream'
        data = base64.b64encode(path.read_bytes()).decode('ascii')
        return tag.replace('src="' + url + '"', 'src="data:' + mime + ';base64,' + data + '"')

    def link(match):
        url = match[1]
        if url.startswith('#') or urlsplit(url).scheme or url.startswith('//'):
            return match[0]
        if url in ('legacy.html', 'workshop-v1.html'):
            target = SITE + url
        else:
            local_asset(url)  # Fail rather than publish a broken project-document link.
            target = SOURCE + url
        return 'href="' + target + '"'

    html = re.sub(r'<link\s+rel="stylesheet"\s+href="([^"]+)"\s*/?>', style, html, flags=re.I)
    html = re.sub(r'<script\s+src="([^"]+)"\s*>\s*</script>', script, html, flags=re.I)
    html = re.sub(r'<img\b[^>]*\bsrc="([^"]+)"[^>]*>', image, html, flags=re.I)
    # Rewrite navigation before inlining? Inlined scripts may contain href="..."
    # source strings, so rewrite only actual anchor start tags.
    html = re.sub(r'<a\b[^>]*>', lambda m: re.sub(r'href="([^"]+)"', link, m[0]), html, flags=re.I)
    html = html.replace('<head>', '<head>\n<!-- Self-contained build; AGPL-3.0-or-later; source: ' + SOURCE + ' -->', 1)
    return html


def build(output: Path) -> dict:
    output.mkdir(parents=True, exist_ok=True)
    files = {}
    for name in ('index.html', 'legacy.html', 'workshop-v1.html'):
        content = bundle(ROOT / name)
        if name == 'index.html':
            content = content.replace('<a href="' + SOURCE + 'README.md">项目说明</a>',
                                      '<a href="cov7seg.html" download>下载离线单文件</a><a href="' + SOURCE + 'README.md">项目说明</a>')
        target = output / name
        target.write_text(content, encoding='utf-8', newline='\n')
        files[name] = {'bytes': target.stat().st_size, 'sha256': hashlib.sha256(target.read_bytes()).hexdigest()}
    # The downloadable file has no dependence on a neighbouring copy of itself.
    offline = (output / 'index.html').read_text(encoding='utf-8').replace('<a href="cov7seg.html" download>下载离线单文件</a>', '')
    (output / 'cov7seg.html').write_text(offline, encoding='utf-8', newline='\n')
    files['cov7seg.html'] = {'bytes': (output / 'cov7seg.html').stat().st_size,
                           'sha256': hashlib.sha256((output / 'cov7seg.html').read_bytes()).hexdigest()}
    (output / '.nojekyll').write_text('', encoding='utf-8')
    manifest = {'format': 'cov7seg-single-html-v1', 'source': SOURCE, 'files': files}
    (output / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    return manifest


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, default=ROOT / 'dist')
    args = parser.parse_args()
    manifest = build(args.output.resolve())
    print(f'Built {args.output.resolve()}')
    for name, info in manifest['files'].items():
        print(f'  {name}: {info["bytes"]:,} bytes')


if __name__ == '__main__':
    main()
