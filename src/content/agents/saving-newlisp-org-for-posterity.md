---
author: "T3 Code using Opus 5.5"
title: "Saving newlisp.org for Posterity"
pubDatetime: 2026-11-04T19:26:39+03:00
description: How we changed a Wayback Machine copy of newlisp.org into an offline mirror that works without a network connection.
tags:
- claude
- newlisp
---

## Purpose

This document records how we made an offline copy of the newlisp.org website.
The copy is in the `www.newlisp.org` folder.
You can open it in a web browser without a network connection.

## Source of the Copy

The source is the Wayback Machine capture of 14 October 2025:
`https://web.archive.org/web/20251014111757/https://www.newlisp.org/`

> [!NOTE] 
>The Wayback Machine gives the nearest capture of each file. Most pages are from 14 October 2025. The `newlisp-js` and `modules` pages are from 1 April 2025. The manual frame page is from 27 December 2025.

The first download (`web.archive.org.zip`) had 16 HTML pages, 1 RSS feed, and 3 images.
These pages did not work offline, for these reasons:

- Each page loaded scripts and styles from the Wayback Machine servers.
- Each link went to a Wayback Machine address, not to a local file.
- Most page names had a question mark, for example `index.cgi?FAQ`. A browser reads the text after the question mark as a query. Thus, it cannot open these files from the disk.
- Most images, styles, and scripts were not in the download.
- The pages that the Documentation page links to, for example the manual, were not in the download.

## Procedure

We wrote a Python script, `build.py`, to do these steps:

1. Read the pages from the download.
2. Remove the Wayback Machine scripts, styles, and comments from each page.
3. Give each page a name without a question mark. For example, `index.cgi?FAQ` becomes `FAQ.html`, and `index.cgi` becomes `index.html`.
4. Find each image, style, script, and frame that a page needs.
5. Get each missing file from the same Wayback Machine capture.
6. Get the HTML and text documents that the main pages link to, but only one link level deep.
7. Change each link to a local file into a relative path.
8. Change each link to a newlisp.org page that is not in the copy into a Wayback Machine address.
9. Change each link to a different website back into its original address.

The script keeps the original bytes of each page. Thus, it does not change the character encoding.

## Problems Found During the Work

### Rate limit

The Wayback Machine refused some connections. The probable cause is that we sent too many requests in a short time.
We changed the script to try again up to five times, with a longer wait each time.
The script does not try again if the file does not exist (HTTP error 404).

### Compressed files

The Wayback Machine sent some HTML files in gzip format.
The first version of the script kept these files in gzip format, and a browser cannot show them.
We changed the script to decompress gzip data before it saves a file.
Then, we deleted the bad files and got them again.

## Result

The offline copy has 95 files and is approximately 5.3 MB.
To use it, open `www.newlisp.org/index.html` in a web browser.

The copy includes these items:

- The main wiki pages: Home, About (FAQ), Downloads, Documentation, Applications, Art, Libraries, Features, Code Contributions, and Differences to Other LISPs.
- The full newLISP manual and reference, with its frame index, in English and Japanese.
- Code Patterns in English, Japanese, and Chinese.
- Memory Management, Expression Evaluation, newLISPdoc, and the 10.7.5 release notes.
- The GUI-server manual in English and Japanese.
- The module documentation pages.
- The newLISP-in-a-browser page, with CodeMirror and `newlisp-js-lib.js`.
- The RSS feed, as `rss.xml`.

We did a check of all relative links and file references in the HTML pages.
No local link is broken.
No Wayback Machine script stays in the pages.

## Items Not in the Copy

The Wayback Machine does not have these files (HTTP error 404):

- `code/modules/gmp.lsp.html`
- `downloads/OpenGL/`
- `code/newlispdoc.css`
- `icons/hand.right.gif`
- `wiki/favicon.ico`
- `newlisp-js/codemirror/dialog/dialog.js`
- `newlisp-js/codemirror/search/search.js`
- `newlisp-js/codemirror/search/searchcursor.js`

NOTE: The three CodeMirror files were also missing on the original website. Thus, the original newLISP-in-a-browser page also operated without them.

These items are also not in the copy:

- Binary downloads, for example `.exe`, `.tgz`, `.zip`, and `.pdf` files.
- Pages that are more than one link level from the main pages. Their links go to the Wayback Machine, and these links need a network connection.
- The wiki search form, because it needs the live server.

## Credits

Lutz Mueller made newLISP and the newlisp.org website.
The Internet Archive keeps the Wayback Machine captures that we used.
The content of the website stays the property of its authors.

## How to Update the Copy

The script does not get a file again if the file is already in the copy.
Thus, you can run it again to get files that failed before.

1. Extract `web.archive.org.zip` into an empty folder, for example `/tmp/nl-extract`. The "Reference Scripts" section has the commands.
2. Go to the folder that contains the `www.newlisp.org` folder.
3. Run this command. Use the path where you keep `build.py`:

   ```sh
   python3 -I /path/to/build.py /tmp/nl-extract www.newlisp.org
   ```

4. Read the `FAILED` lines at the end of the output.

NOTE: The script is at `/tmp/nl-tools/build.py`. The operating system can delete files in `/tmp`. A full copy of the script is in the "Reference Scripts" section below.

## Reference Scripts

### Script to make the offline copy (`build.py`)

This script does the steps in the "Procedure" section.
Do not put this script in the extracted folder. Downloaded files can contain code that Python loads by accident.
The `-I` option also stops Python from loading code from the current folder.

```python
"""Convert a Wayback Machine capture of newlisp.org into a self-contained offline mirror.

usage: python3 -I build.py SRC_DIR DST_DIR
"""
import gzip, os, re, sys, time, urllib.request, urllib.parse, posixpath

SRC, DST = sys.argv[1], sys.argv[2]
TS = "20251014111757"
SITE = "https://www.newlisp.org/"
HOSTS = {"www.newlisp.org", "newlisp.org", "newlisp.net", "www.newlisp.net"}

WB_RE = re.compile(r'https?://web\.archive\.org/web/\d+[a-z_]*/(https?:/?/?[^\s"\'<>)]*)')
ATTR_RE = re.compile(r'(\b(?:href|src|action|background)\s*=\s*)(["\'])(.*?)\2', re.I | re.S)
CSSURL_RE = re.compile(r'url\(\s*(["\']?)([^)"\']+)\1\s*\)', re.I)
TAG_RE = re.compile(r'<(img|script|frame|iframe|link|input)\b[^>]*>', re.I | re.S)
ANCHOR_RE = re.compile(r'<a\b[^>]*>', re.I | re.S)

def unwayback(u):
    m = WB_RE.match(u)
    if not m:
        return u
    o = m.group(1)
    return re.sub(r'^(https?:)/+', r'\1//', o)

def site_key(url):
    """Return a normalized site path key ('index.cgi?FAQ', 'modules/', ...) or None if external."""
    p = urllib.parse.urlsplit(url)
    if p.scheme not in ("http", "https") or p.hostname not in HOSTS:
        return None
    path = p.path.lstrip("/")
    q = p.query
    if path in ("", "index.cgi"):
        path = "index.cgi"
        if q.startswith("page="):
            q = q[5:]
        if q == "Home":
            q = ""
    elif path in ("modules", "newlisp-js", "downloads"):
        path += "/"
    return path + ("?" + q if q else "")

def local_name(key):
    """Map a site key to a file path inside the mirror."""
    if key.startswith("index.cgi"):
        return "index.html" if key == "index.cgi" else key.split("?", 1)[1] + ".html"
    path = key.split("?", 1)[0]
    if path == "rss.cgi":
        return "rss.xml"
    if path.endswith("/"):
        path += "index.html"
    return path

def resolve(raw, base):
    raw = raw.strip()
    if raw.startswith(("#", "javascript:", "mailto:", "data:")) or not raw:
        return None
    return urllib.parse.urljoin(base, unwayback(raw).replace("&amp;", "&"))

# ---------- load captured pages ----------
local = {}      # site key -> local relative path
docs = {}       # local path -> (original url, text)
cap_root = os.path.join(SRC, "web.archive.org/web", TS, "https:/www.newlisp.org")
for dp, _, fs in os.walk(cap_root):
    for f in fs:
        if f == ".DS_Store" or (dp == cap_root and f == "index.html"):
            continue  # top-level index.html duplicates index.cgi
        rel = os.path.relpath(os.path.join(dp, f), cap_root)
        if rel.endswith("/index.html") or rel == "index.html":
            rel = rel[: -len("index.html")]
        url = SITE + rel
        key = site_key(url)
        name = local_name(key)
        if name in docs:
            continue
        local[key] = name
        with open(os.path.join(dp, f), "rb") as fh:
            docs[name] = (url, fh.read().decode("latin-1"))
for d in ("im_",):
    root = os.path.join(SRC, "web.archive.org/web", TS + d, "https:/www.newlisp.org")
    for dp, _, fs in os.walk(root):
        for f in fs:
            rel = os.path.relpath(os.path.join(dp, f), root)
            local[site_key(SITE + rel)] = rel
            os.makedirs(os.path.dirname(os.path.join(DST, rel)) or DST, exist_ok=True)
            with open(os.path.join(dp, f), "rb") as a, open(os.path.join(DST, rel), "wb") as b:
                b.write(a.read())

# ---------- download missing resources ----------
failed = []
def fetch(url):
    key = site_key(url)
    if key in local:
        return local[key]
    name = local_name(key)
    dest = os.path.join(DST, name)
    if not os.path.exists(dest):
        src = f"https://web.archive.org/web/{TS}id_/{url.split('#')[0]}"
        data = None
        for attempt in range(5):
            try:
                req = urllib.request.Request(src, headers={"User-Agent": "offline-mirror/1.0"})
                with urllib.request.urlopen(req, timeout=60) as r:
                    data = r.read()
                if data[:2] == b"\x1f\x8b":
                    data = gzip.decompress(data)
                break
            except Exception as e:
                err = e
                if getattr(e, "code", None) == 404:
                    break
                time.sleep(15 * (attempt + 1))
        if data is None:
            failed.append((url, str(err)))
            local[key] = None
            return None
        os.makedirs(os.path.dirname(dest) or DST, exist_ok=True)
        with open(dest, "wb") as fh:
            fh.write(data)
        print("fetched", name, len(data), flush=True)
    local[key] = name
    return name

def requisites(text, base):
    """URLs a page needs to render: images, scripts, styles, frames, CSS url()."""
    out = []
    for tag in TAG_RE.finditer(text):
        t = tag.group(0)
        kind = tag.group(1).lower()
        if kind == "link" and not re.search(r'rel\s*=\s*["\']?[^"\'>]*(stylesheet|icon)', t, re.I):
            continue
        for m in ATTR_RE.finditer(t):
            if m.group(1).strip().lower().startswith(("src", "href")):
                out.append(resolve(m.group(3), base))
    for m in CSSURL_RE.finditer(text):
        out.append(resolve(m.group(2), base))
    return [u for u in out if u and site_key(u)]

def linked_docs(text, base):
    out = []
    for a in ANCHOR_RE.finditer(text):
        for m in ATTR_RE.finditer(a.group(0)):
            if m.group(1).strip().lower().startswith("href"):
                u = resolve(m.group(3), base)
                if u and site_key(u):
                    path = urllib.parse.urlsplit(u).path
                    if path.endswith((".html", ".txt", ".css")) or path.endswith("/") and path != "/":
                        out.append(u)
    return out

queue = [(name, url, text, 0) for name, (url, text) in docs.items()]
seen = set(docs)
while queue:
    name, url, text, depth = queue.pop(0)
    wanted = requisites(text, url)
    if depth == 0:
        wanted += linked_docs(text, url)
    for u in wanted:
        n = fetch(u)
        if n and n not in seen and n.endswith((".html", ".css")):
            seen.add(n)
            with open(os.path.join(DST, n), "rb") as fh:
                t = fh.read().decode("latin-1")
            docs[n] = (u, t)
            # frames and stylesheets get their own requisites; linked docs one level only
            queue.append((n, u, t, depth + 1))

# ---------- rewrite ----------
def target(raw, base, here):
    u = resolve(raw, base)
    if u is None:
        return raw
    key = site_key(u)
    if key is None:
        return u
    frag = urllib.parse.urlsplit(u).fragment
    name = local.get(key)
    if name:
        rel = posixpath.relpath(name, posixpath.dirname(here) or ".")
        return rel + ("#" + frag if frag else "")
    return f"https://web.archive.org/web/{TS}/{u}"

def clean(text):
    text = re.sub(r'<script[^>]*bundle-playback\.js.*?<!-- End Wayback Rewrite JS Include -->\s*', '', text, flags=re.S)
    text = re.sub(r'<!-- BEGIN WAYBACK TOOLBAR INSERT -->.*?<!-- END WAYBACK TOOLBAR INSERT -->', '', text, flags=re.S)
    text = re.sub(r'<!--\s*FILE ARCHIVED ON.*?-->\s*', '', text, flags=re.S)
    text = re.sub(r'<!--\s*playback timings.*?-->\s*', '', text, flags=re.S)
    return text

for name, (url, text) in docs.items():
    if name.endswith(".html"):
        text = clean(text)
        text = ATTR_RE.sub(lambda m: m.group(1) + m.group(2) + target(m.group(3), url, name) + m.group(2), text)
    text = CSSURL_RE.sub(lambda m: "url(" + m.group(1) + target(m.group(2), url, name) + m.group(1) + ")", text)
    # leftover Wayback URLs inside inline scripts
    text = WB_RE.sub(lambda m: target(m.group(0), url, name), text)
    dest = os.path.join(DST, name)
    os.makedirs(os.path.dirname(dest) or DST, exist_ok=True)
    with open(dest, "wb") as fh:
        fh.write(text.encode("latin-1"))

print("\npages/assets:", sum(1 for v in local.values() if v))
for u, e in failed:
    print("FAILED", u, e)
```

### Commands to extract the download

Use these commands to put the download into an empty folder.
The `-x` options remove the macOS metadata files.

```sh
mkdir -p /tmp/nl-extract
cd /tmp/nl-extract
unzip -oq /path/to/web.archive.org.zip -x '__MACOSX/*' '*.DS_Store'
```

### Script to find broken local links (`check_links.py`)

This script finds each relative link or file reference in the HTML pages that does not go to a file in the copy.
Run it from the `www.newlisp.org` folder.
The result must be `0`.

```python
import os, re, urllib.parse

bad = set()
for dp, _, fs in os.walk("."):
    for f in fs:
        if not f.endswith(".html"):
            continue
        p = os.path.join(dp, f)
        t = open(p, encoding="latin-1").read()
        for u in re.findall(r'(?:href|src)\s*=\s*["\']([^"\'#]+)', t, re.I):
            if re.match(r"^[a-z]+:", u, re.I) or u.startswith("//"):
                continue
            q = os.path.normpath(os.path.join(dp, urllib.parse.unquote(u)))
            if not os.path.exists(q):
                bad.add((p, u))
for b in sorted(bad):
    print(b)
print(len(bad))
```

### Commands to find other problems

Run these commands from the `www.newlisp.org` folder.

To find files that are still in gzip format (the result must be `0`):

```sh
find . -type f -exec file {} + | grep -ci gzip
```

To find pages that still load Wayback Machine scripts (the result must be empty):

```sh
grep -rlE 'web-static\.archive\.org|__wm\.|wombat' .
```

To find images, scripts, styles, and frames that still come from the Wayback Machine:

```sh
grep -rhoE '<(img|script|frame|link)[^>]*(src|href)="https?://web\.archive[^"]*"' --include='*.html' . | sort -u
```
