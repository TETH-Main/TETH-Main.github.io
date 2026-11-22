#!/usr/bin/env python3
"""Regenerate the "Latest Posts" cards in index.html from the YouTube RSS feed.
Runs in GitHub Actions (see update-posts.yml). Only the block between
<!-- POSTS:START --> and <!-- POSTS:END --> in index.html is rewritten."""
import html
import re
import sys
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta, timezone

CHANNEL_ID = "UCTTG4vvEe1KZhIy7DgwnxzA"
FEED_URL = f"https://www.youtube.com/feeds/videos.xml?channel_id={CHANNEL_ID}"
COUNT = 7
JST = timezone(timedelta(hours=9))
NS = {"yt": "http://www.youtube.com/xml/schemas/2015",
      "atom": "http://www.w3.org/2005/Atom"}


def clean_title(t: str) -> str:
    t = re.sub(r"#\S+", "", t)          # drop hashtags
    t = re.sub(r"\s+", " ", t).strip()
    return t


def fetch_posts():
    req = urllib.request.Request(FEED_URL, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=30) as r:
        root = ET.fromstring(r.read())
    posts = []
    for e in root.findall("atom:entry", NS)[:COUNT]:
        vid = e.find("yt:videoId", NS).text
        title = clean_title(e.find("atom:title", NS).text)
        pub = datetime.fromisoformat(
            e.find("atom:published", NS).text.replace("Z", "+00:00"))
        date = pub.astimezone(JST).strftime("%m.%d")
        posts.append((vid, date, title))
    return posts


def card(i, vid, date, title):
    cls = "work s6 vfeat vid reveal" if i == 0 else "work s2 vid reveal"
    t = html.escape(title, quote=True)
    return f'''      <a class="{cls}" href="https://www.youtube.com/watch?v={vid}" target="_blank" rel="noopener">
        <span class="media a169"><img src="https://i.ytimg.com/vi/{vid}/maxresdefault.jpg" alt="{t}" loading="lazy"></span>
        <span class="cap"><b><span class="idx">{date}</span>{t}</b><span class="go">YOUTUBE &#8599;</span></span>
      </a>'''


def main(path="index.html"):
    posts = fetch_posts()
    if not posts:
        print("no posts fetched; aborting", file=sys.stderr)
        return 1
    block = "\n" + "\n".join(card(i, *p) for i, p in enumerate(posts)) + "\n      "
    src = open(path, encoding="utf-8").read()
    new, n = re.subn(r"(<!-- POSTS:START -->).*?(<!-- POSTS:END -->)",
                     lambda m: m.group(1) + block + m.group(2), src, flags=re.S)
    if n != 1:
        print("POSTS markers not found in index.html", file=sys.stderr)
        return 1
    if new != src:
        open(path, "w", encoding="utf-8").write(new)
        print(f"updated {len(posts)} posts")
    else:
        print("already up to date")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1] if len(sys.argv) > 1 else "index.html"))
