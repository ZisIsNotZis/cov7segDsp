"""Release artifacts must work with no neighbouring script/style/image assets."""
from html.parser import HTMLParser
from pathlib import Path
import tempfile
import unittest
from urllib.parse import urlsplit

from foundation.build_site import build


class Assets(HTMLParser):
    def __init__(self):
        super().__init__()
        self.external_runtime = []
        self.anchors = []
        self.scripts = 0

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'script':
            self.scripts += 1
        if tag in ('script', 'img', 'link'):
            url = attrs.get('src') or attrs.get('href')
            if url and not url.startswith('data:'):
                self.external_runtime.append(url)
        if tag == 'a':
            self.anchors.append(attrs.get('href', ''))


class ReleaseTests(unittest.TestCase):
    def test_all_pages_are_self_contained_and_links_are_explicit(self):
        with tempfile.TemporaryDirectory() as folder:
            output = Path(folder)
            manifest = build(output)
            for name in manifest['files']:
                page = Assets()
                content = (output / name).read_text(encoding='utf-8')
                page.feed(content)
                self.assertFalse(page.external_runtime, (name, page.external_runtime))
                self.assertGreater(page.scripts, 0)
                for href in page.anchors:
                    self.assertTrue(not href or href.startswith('#') or urlsplit(href).scheme == 'https'
                                    or (name == 'index.html' and href == 'cov7seg.html'), (name, href))
                self.assertIn('AGPL-3.0', content)
                self.assertNotIn(r'href=\"docs/', content, 'Translated runtime links must not point to missing local docs')
            main = (output / 'cov7seg.html').read_text(encoding='utf-8')
            self.assertIn('这一次，规则由你来定。', main)
            self.assertIn('function buildLayout', main)
            self.assertIn('async function search', main)

    def test_build_is_deterministic(self):
        with tempfile.TemporaryDirectory() as one, tempfile.TemporaryDirectory() as two:
            self.assertEqual(build(Path(one)), build(Path(two)))


if __name__ == '__main__':
    unittest.main()
