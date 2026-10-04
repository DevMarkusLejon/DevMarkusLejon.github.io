#!/usr/bin/env python3
"""Check the static portfolio's local links and assets without network access."""

import ipaddress
import re
import sys
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit
from xml.etree import ElementTree


ROOT = Path(__file__).resolve().parents[1]
SITE_HOST = "devmarkuslejon.github.io"


class Page(HTMLParser):
    def __init__(self, path):
        super().__init__(convert_charrefs=True)
        self.path = path
        self.ids = set()
        self.references = []
        self.errors = []
        self.feed(path.read_text(encoding="utf-8"))

    def handle_starttag(self, tag, attrs):
        values = dict(attrs)
        if values.get("id"):
            identifier = values["id"]
            if identifier in self.ids:
                self.errors.append(f"duplicate id #{identifier}")
            self.ids.add(identifier)
        for attribute in ("href", "src", "poster"):
            if values.get(attribute):
                self.references.append((values[attribute], f"{tag}[{attribute}]"))
        if tag == "meta" and (values.get("property") or values.get("name")) in ("og:image", "twitter:image"):
            if values.get("content"):
                self.references.append((values["content"], "social image"))
        if values.get("srcset"):
            for candidate in values["srcset"].split(","):
                parts = candidate.strip().split()
                if parts:
                    self.references.append((parts[0], f"{tag}[srcset]"))

    handle_startendtag = handle_starttag


def local_host(host):
    if host == "localhost" or host.endswith(".localhost"):
        return True
    try:
        address = ipaddress.ip_address(host)
        return address.is_loopback or address.is_unspecified
    except ValueError:
        return False


def main():
    errors = []
    cache = {}
    paths = [ROOT / "index.html", *sorted((ROOT / "projects").glob("*.html"))]

    def describe(path):
        return path.relative_to(ROOT).as_posix()

    def read_page(path):
        if path not in cache:
            cache[path] = Page(path)
        return cache[path]

    def check_reference(source, reference, context):
        try:
            url = urlsplit(reference.strip())
            host = (url.hostname or "").lower().rstrip(".")
        except ValueError:
            errors.append(f"{describe(source)}: malformed {context}: {reference}")
            return
        if host and local_host(host):
            errors.append(f"{describe(source)}: non-public localhost URL: {reference}")
            return
        if url.scheme == "javascript":
            errors.append(f"{describe(source)}: javascript URL: {reference}")
            return
        if (host and host != SITE_HOST) or (url.scheme and url.scheme not in ("http", "https")):
            return
        if url.path.startswith("/") or host:
            target = ROOT / unquote(url.path).lstrip("/")
        else:
            target = source.parent / unquote(url.path) if url.path else source
        target = target.resolve()
        if not target.is_relative_to(ROOT):
            errors.append(f"{describe(source)}: link escapes site root: {reference}")
            return
        if target.is_dir():
            target /= "index.html"
        if not target.is_file():
            errors.append(f"{describe(source)}: missing {context}: {reference}")
            return
        # ReLion has its own validator; only verify portfolio links to it resolve.
        if url.fragment and target.suffix.lower() == ".html" and "relion" not in target.relative_to(ROOT).parts:
            if unquote(url.fragment) not in read_page(target).ids:
                errors.append(f"{describe(source)}: missing fragment: {reference}")

    for path in paths:
        if not path.is_file():
            errors.append(f"missing page: {describe(path)}")
            continue
        try:
            page = read_page(path)
            errors.extend(f"{describe(path)}: {error}" for error in page.errors)
            for reference, context in page.references:
                check_reference(path, reference, context)
        except (OSError, UnicodeError) as error:
            errors.append(f"{describe(path)}: {error}")

    stylesheet = ROOT / "styles.css"
    if stylesheet.is_file():
        css = stylesheet.read_text(encoding="utf-8")
        for reference in re.findall(r"url\(\s*['\"]?([^'\")]+)['\"]?\s*\)", css):
            check_reference(stylesheet, reference.strip(), "CSS asset")

    sitemap = ROOT / "sitemap.xml"
    if sitemap.is_file():
        try:
            for location in ElementTree.parse(sitemap).iter("{http://www.sitemaps.org/schemas/sitemap/0.9}loc"):
                check_reference(sitemap, location.text or "", "sitemap page")
        except (OSError, ElementTree.ParseError) as error:
            errors.append(f"sitemap.xml: {error}")

    if errors:
        print(f"Portfolio check failed ({len(errors)} issues):")
        for error in errors:
            print(f"  - {error}")
        return 1
    print(f"Portfolio check passed: {len(paths)} HTML page(s), local assets and fragments verified. No remote requests.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
