"""Convert a lecture-supplement PDF (python-docx → PDF layout) into an SPD Lab HTML lecture page.

Usage:  python3 tools/pdf2lecture.py <source.pdf> <slug> [--course "공공안전디자인"] [--course-en "Public Safety Design"]
Output: lectures/<slug>.html, lectures/img/<slug>/*.jpg, lectures/pdf/<slug>.pdf

The parser keys on the typography used by the course handouts:
  30B title · 16B subtitle · 20B PART heading · 14B section · 11.5 accent sub-heading
  10.5 body · 11 quote (brown) + 9 cite · ※ note box · "쉽게 말하면" box · ✓ check box
  12.5B accent label + x≈303 text = definition cards · white 9.5 = table header · images + 9 captions
"""
import fitz, html, io, os, re, sys, shutil, argparse
from PIL import Image

ACCENT = 13208064      # gold labels / sub-headings
QUOTE = 6044928        # brown quote text
EASY = 9067008         # "쉽게 말하면" title
CHECK = 3038784        # "체크 포인트" title
GRAY = 5855063
INK = 2236962
WHITE = 16777215
BULLET_GLYPHS = "•·"


def esc(s):
    return html.escape(s, quote=False)


def join(lines):
    """Join wrapped Korean lines: PDF keeps the trailing space where the wrap happened."""
    out = ""
    for t in lines:
        if not out:
            out = t
        elif out.endswith(" ") or t.startswith(" "):
            out += t
        else:
            out += " " + t
    return re.sub(r"\s+", " ", out).strip()


def unpad(s):
    """Drop zero-padding on ordinal labels: 01 → 1, 06~10 → 6~10, PART 01 → Part 1."""
    s = re.sub(r"\bPART\s+0?(\d+)", lambda m: "Part " + m.group(1), s)
    return re.sub(r"(?<![\d.])0(\d)(?![\d.])", r"\1", s)


def lines_of(doc):
    """Flatten the document into styled lines, skipping running header/footer."""
    items = []
    for pn, page in enumerate(doc):
        for b in page.get_text("dict")["blocks"]:
            if b["type"] == 1:
                items.append({"k": "img", "pn": pn, "y": b["bbox"][1], "img": b["image"]})
                continue
            for l in b["lines"]:
                spans = [s for s in l["spans"] if s["text"]]
                if not spans:
                    continue
                t = "".join(s["text"] for s in spans)
                if not t.strip():
                    continue
                s0 = spans[0]
                size = round(s0["size"], 1)
                if size == 8.0 and l["bbox"][1] < 50:
                    continue                       # running header
                if re.fullmatch(r"—\s*\d+\s*—", t.strip()):
                    continue                       # page number
                items.append({
                    "k": "txt", "pn": pn, "t": t, "size": size, "bold": bool(s0["flags"] & 16),
                    "color": s0["color"], "x": round(l["bbox"][0]), "y": l["bbox"][1],
                    "spans": [(s["text"], bool(s["flags"] & 16)) for s in spans],
                })
    # merge fragments that share a baseline (fully-justified lines are emitted word by word)
    merged = []
    for it in items:
        prev = merged[-1] if merged else None
        if (prev and it["k"] == "txt" and prev["k"] == "txt" and prev["pn"] == it["pn"]
                and abs(prev["y"] - it["y"]) < 1.5 and prev["size"] == it["size"] and prev["color"] == it["color"]
                and it["x"] > prev["x"]):
            prev["t"] = prev["t"].rstrip() + " " + it["t"].lstrip()
            prev["spans"] += it["spans"]
            continue
        merged.append(it)
    return merged


def build(pdf, slug, course, course_en):
    doc = fitz.open(pdf)
    items = lines_of(doc)
    imgdir = f"lectures/img/{slug}"
    os.makedirs(imgdir, exist_ok=True)
    # Lecture originals are never published (view-only policy): no copy of the PDF goes into the site.

    # ---- cover (page 1) ----
    cover = [i for i in items if i["pn"] == 0]
    rest = [i for i in items if i["pn"] > 0]
    kicker = next((i["t"] for i in cover if i["k"] == "txt" and i["size"] == 11.0 and i["color"] == ACCENT), "")
    title = next((i["t"] for i in cover if i["k"] == "txt" and i["size"] >= 24), "")
    subtitle = next((i["t"] for i in cover if i["k"] == "txt" and i["size"] == 16.0), "")
    deck = next((i["t"] for i in cover if i["k"] == "txt" and i["size"] == 11.0 and i["color"] == GRAY), "")
    author = next((i["t"] for i in cover if i["k"] == "txt" and "@" in i["t"]), "")
    cover_img = next((i for i in cover if i["k"] == "img"), None)

    nimg = 0

    def save_img(raw):
        nonlocal nimg
        nimg += 1
        im = Image.open(io.BytesIO(raw)).convert("RGB")
        im.thumbnail((1600, 1600))
        name = f"s{nimg}.jpg"
        im.save(f"{imgdir}/{name}", quality=84, optimize=True, progressive=True)
        return f"img/{slug}/{name}", im.size

    if cover_img:
        cover_src, cover_size = save_img(cover_img["img"])

    out, toc = [], []
    i, n = 0, len(rest)
    sec_id = 0
    para, para_last = [], None

    def flush_para():
        nonlocal para
        if para:
            out.append(f"<p>{esc(join(para))}</p>")
            para = []

    def is_body(it):
        return it["k"] == "txt" and it["size"] == 10.5 and it["color"] == INK and it["x"] <= 66 \
            and it["t"].strip() not in BULLET_GLYPHS

    while i < n:
        it = rest[i]
        # ---------------- images ----------------
        if it["k"] == "img":
            flush_para()
            src, (w, h) = save_img(it["img"])
            cap = ""
            if i + 1 < n and rest[i + 1]["k"] == "txt" and rest[i + 1]["size"] == 9.0 and rest[i + 1]["color"] == GRAY:
                cap = rest[i + 1]["t"].strip()
                i += 1
            out.append(f'<figure class="lx-fig"><img src="{src}" alt="{esc(cap or "강의 슬라이드")}" width="{w}" height="{h}" loading="lazy" draggable="false">'
                       + (f"<figcaption>{esc(cap)}</figcaption>" if cap else "") + "</figure>")
            i += 1
            continue

        t, size, color, x = it["t"], it["size"], it["color"], it["x"]
        s = t.strip()

        # ---------------- body paragraphs (merge wrapped lines, also across pages) ----------------
        if is_body(it):
            if para and para_last is not None:
                same_page = para_last["pn"] == it["pn"]
                gap = it["y"] - para_last["y"]
                ended = re.search(r"[.!?”」)]\s*$|다\.?\s*$", join(para))
                if (same_page and gap > 31) or (not same_page and ended):
                    flush_para()
            para.append(t)
            para_last = it
            i += 1
            continue
        flush_para()
        para_last = None

        # ---------------- headings ----------------
        if size == 20.0 and it["bold"]:
            sec_id += 1
            label = unpad(s)
            m = re.match(r"(Part \d+)\s*·\s*(.*)", label)
            kick, head = (m.group(1), m.group(2)) if m else ("", label)
            sub = ""
            if i + 1 < n and rest[i + 1]["k"] == "txt" and rest[i + 1]["size"] == 11.0 and rest[i + 1]["color"] == GRAY:
                sub = rest[i + 1]["t"].strip(); i += 1
            aid = f"part-{sec_id}"
            toc.append(("part", aid, kick, head))
            out.append(f'<header class="lx-part" id="{aid}">' + (f'<p class="lx-kicker">{esc(kick)}</p>' if kick else "")
                       + f"<h2>{esc(head)}</h2>" + (f'<p class="lx-lead">{esc(sub)}</p>' if sub else "") + "</header>")
            i += 1
            continue
        if size == 14.0 and it["bold"]:
            sec_id += 1
            aid = f"sec-{sec_id}"
            toc.append(("sec", aid, "", s))
            out.append(f'<h3 id="{aid}">{esc(s)}</h3>')
            if i + 1 < n and rest[i + 1]["k"] == "txt" and rest[i + 1]["size"] == 9.5 and rest[i + 1]["color"] == GRAY and rest[i + 1]["x"] <= 66:
                out.append(f'<p class="lx-src">{esc(rest[i + 1]["t"].strip())}</p>'); i += 1
            i += 1
            continue
        if size == 11.5 and color == ACCENT:
            out.append(f"<h4>{esc(s)}</h4>"); i += 1; continue

        # ---------------- quote ----------------
        if size == 11.0 and color == QUOTE:
            q = [t]; i += 1
            while i < n and rest[i]["k"] == "txt" and rest[i]["size"] == 11.0 and rest[i]["color"] == QUOTE:
                q.append(rest[i]["t"]); i += 1
            cite = ""
            if i < n and rest[i]["k"] == "txt" and rest[i]["size"] == 9.0 and rest[i]["t"].strip().startswith("—"):
                cite = rest[i]["t"].strip(); i += 1
            out.append(f'<blockquote class="lx-quote"><p>{esc(join(q))}</p>' + (f"<cite>{esc(cite)}</cite>" if cite else "") + "</blockquote>")
            continue

        # ---------------- boxes: ※ note / 쉽게 말하면 / 체크 포인트 ----------------
        if size == 10.5 and x >= 68 and (s.startswith("※") or color in (EASY, CHECK)):
            kind = "note" if s.startswith("※") else ("easy" if color == EASY else "check")
            head = re.sub(r"^[※✓\s]+", "", s)
            bullets = []
            i += 1
            while i < n and rest[i]["k"] == "txt" and rest[i]["size"] in (9.5, 10.0) and rest[i]["x"] >= 68 and rest[i]["x"] < 120 and rest[i]["color"] == INK:
                bt = rest[i]["t"].strip()
                if re.match(r"^[•☐□\-]\s*", bt) or not bullets:
                    bullets.append([re.sub(r"^[•☐□\-]\s*", "", bt)])
                else:
                    bullets[-1].append(rest[i]["t"])
                i += 1
            lis = "".join(f"<li>{esc(join(b))}</li>" for b in bullets)
            label = {"note": "Note", "easy": "쉽게 말하면", "check": "Check point"}[kind]
            title_html = "" if kind == "easy" and head == "쉽게 말하면" else f"<b>{esc(head)}</b>"
            out.append(f'<aside class="lx-box lx-{kind}"><span class="lx-box-k">{label}</span>{title_html}<ul>{lis}</ul></aside>')
            continue

        # ---------------- glyph bullet list ----------------
        if s in BULLET_GLYPHS and size >= 10:
            items_ = []
            while i < n and rest[i]["k"] == "txt" and rest[i]["t"].strip() in BULLET_GLYPHS:
                i += 1
                li = []
                while i < n and rest[i]["k"] == "txt" and rest[i]["x"] >= 80 and rest[i]["size"] == 10.0 and rest[i]["t"].strip() not in BULLET_GLYPHS:
                    li.append(rest[i]["t"]); i += 1
                items_.append(join(li))
            out.append('<ul class="lx-list">' + "".join(f"<li>{esc(unpad(x_))}</li>" for x_ in items_) + "</ul>")
            continue

        # ---------------- definition cards (accent label | title + description) ----------------
        if size == 12.5 and color == ACCENT:
            cards = []
            while i < n and rest[i]["k"] == "txt" and rest[i]["size"] == 12.5 and rest[i]["color"] == ACCENT:
                label = unpad(rest[i]["t"].strip()); i += 1
                ttl, desc = "", []
                while i < n and rest[i]["k"] == "txt" and rest[i]["x"] >= 290 and rest[i]["size"] in (10.5, 9.5, 10.0):
                    if rest[i]["size"] == 10.5 and not ttl and not desc:
                        ttl = rest[i]["t"].strip()
                    else:
                        desc.append(rest[i]["t"])
                    i += 1
                cards.append((label, ttl, join(desc)))
            out.append('<dl class="lx-cards">' + "".join(
                f'<div><dt>{esc(a)}</dt><dd><b>{esc(b)}</b>' + (f"<span>{esc(c)}</span>" if c else "") + "</dd></div>" for a, b, c in cards) + "</dl>")
            continue

        # ---------------- data tables (white header, rows may span pages) ----------------
        if size == 9.5 and color == WHITE:
            hdr, cols = [], []
            while i < n and rest[i]["k"] == "txt" and rest[i]["color"] == WHITE:
                hdr.append(rest[i]["t"].strip()); cols.append(rest[i]["x"]); i += 1
            rows = []
            while i < n and rest[i]["k"] == "txt" and rest[i]["size"] == 9.5 and rest[i]["color"] in (INK, WHITE):
                r = rest[i]
                if r["color"] == WHITE:          # header repeated on the next page
                    i += 1; continue
                ci = min(range(len(cols)), key=lambda k: abs(cols[k] - r["x"]))
                if ci == 0:
                    rows.append([[] for _ in cols])
                if rows:
                    rows[-1][ci].append(r["t"])
                i += 1
            th = "".join(f"<th>{esc(h)}</th>" for h in hdr)
            trs = "".join("<tr>" + "".join(f"<td>{esc(join(c))}</td>" for c in row) + "</tr>" for row in rows)
            out.append(f'<div class="lx-table"><table><thead><tr>{th}</tr></thead><tbody>{trs}</tbody></table></div>')
            continue

        # ---------------- references (hanging indent) ----------------
        if size == 9.5 and color == INK and x <= 66:
            refs = []
            while i < n and rest[i]["k"] == "txt" and rest[i]["size"] == 9.5 and rest[i]["color"] == INK:
                if rest[i]["x"] <= 66:
                    refs.append([rest[i]["t"]])
                elif refs:
                    refs[-1].append(rest[i]["t"])
                i += 1
            out.append('<ul class="lx-refs">' + "".join(f"<li>{esc(join(r))}</li>" for r in refs) + "</ul>")
            continue

        # ---------------- small source line / misc ----------------
        if size in (9.0, 9.5) and color == GRAY:
            out.append(f'<p class="lx-src">{esc(s)}</p>'); i += 1; continue

        print(f"  ! unclassified p{it['pn'] + 1} {size} {color} x{x}: {s[:70]}", file=sys.stderr)
        out.append(f"<p>{esc(s)}</p>")
        i += 1
    flush_para()

    return dict(kicker=kicker, title=title, subtitle=subtitle, deck=deck, author=author,
                cover=(cover_src, cover_size) if cover_img else None, body="\n".join(out), toc=toc,
                pages=len(doc), nimg=nimg, course=course, course_en=course_en, slug=slug)


PAGE = """<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{subtitle} — {course} 강의 보조교재 | SPD Lab</title>
  <meta name="description" content="{course} {subtitle} 강의 보조교재. {deck}">
  <link rel="canonical" href="https://www.armula.com/lectures/{slug}.html">
  <meta property="og:type" content="article">
  <meta property="og:site_name" content="SPD Lab">
  <meta property="og:title" content="{subtitle} — {course} 강의 보조교재">
  <meta property="og:description" content="{deck}">
  <meta property="og:image" content="{og_image}">
  <meta name="robots" content="noindex, nofollow, noarchive">
  <meta name="theme-color" content="#0a0a0b">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@100;200;300;400;500;600;700;800;900&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="../assets/css/style.css?v={ver}">
  <link rel="stylesheet" href="lecture.css?v={ver}">
</head>
<body class="lecture-page lx-protected">

<header class="site-header scrolled" id="top">
  <div class="wrap">
    <a href="../index.html" class="brand notranslate" translate="no" aria-label="SPD Lab 홈"><b>SPD Lab</b><span>Socio-Public Design Lab</span></a>
    <nav class="nav" aria-label="주 메뉴">
      <a href="../index.html#board">Courses</a>
      <a href="../index.html#professor">Professor</a>
      <a href="../gallery.html">Gallery</a>
      <span class="lang notranslate" translate="no" role="group" aria-label="사이트 번역"><button type="button" data-lang="ko" title="한국어">KO</button><button type="button" data-lang="en" title="English">EN</button><button type="button" data-lang="ja" title="日本語">JP</button><button type="button" data-lang="zh-CN" title="中文">CN</button></span>
      <a href="../hipd.html" class="nav-hipd"><i></i>HIPD</a>
    </nav>
  </div>
</header>
<div id="google_translate_element" class="gt-host" aria-hidden="true"></div>
<div class="lx-progress" aria-hidden="true"><i id="lxProgress"></i></div>

<main>
  <section class="lx-cover">
    <div class="wrap lx-cover-grid{cover_mod}">
      <div>
        <p class="eyebrow">{course_en} · Lecture Note</p>
        <p class="lx-course">{kicker}</p>
{series_html}        <h1>{subtitle}</h1>
{deck_html}        <p class="lx-author">{author_html}</p>
        <div class="lx-actions">
          <a class="lx-back" href="../index.html#board">강의 목록으로</a>
        </div>
      </div>
{cover_fig}    </div>
  </section>

  <div class="wrap lx-layout">
    <nav class="lx-toc" aria-label="목차">
      <p class="lx-toc-k">Contents</p>
      {toc}
    </nav>
    <article class="lx-body">
{body}
      <footer class="lx-end">
        <p>{course} · {subtitle}</p>
        <a class="lx-back" href="../index.html#board">강의 목록으로</a>
      </footer>
    </article>
  </div>
</main>

<footer class="site-footer">
  <div class="wrap">
    <div class="footer-bottom">
      <span>© 2026 SPD Lab, Hongik University. 강의 자료의 저작권은 이현성 교수에게 있습니다.</span>
      <a href="#top">Back to top ↑</a>
    </div>
  </div>
</footer>

<script src="../assets/js/main.js?v={ver}"></script>
<script src="lecture.js?v={ver}"></script>
<script src="../assets/js/protect.js?v={ver}"></script>
</body>
</html>
"""


def render(d, ver):
    toc = []
    for kind, aid, kick, head in d["toc"]:
        if kind == "part":
            toc.append(f'<a class="lx-toc-part" href="#{aid}">' + (f"<small>{esc(kick)}</small>" if kick else "") + f"{esc(head)}</a>")
        else:
            toc.append(f'<a href="#{aid}">{esc(head)}</a>')
    au = d["author"]
    m = re.match(r"(.+?)\s*_\s*(\S+@\S+)", au)
    author_html = (f'{esc(m.group(1).replace(" ", "") if len(m.group(1).replace(" ", "")) <= 4 else m.group(1))} <a href="mailto:{m.group(2)}">{m.group(2)}</a>') if m else esc(au)
    if d.get("cover"):
        cover_src, (cw, ch) = d["cover"]
        cover_fig = f'      <figure class="lx-cover-fig"><img src="{cover_src}" draggable="false" alt="{esc(d["title"] or d["subtitle"])} 표지 슬라이드" width="{cw}" height="{ch}"></figure>\n'
        og_image, cover_mod = f"https://www.armula.com/lectures/{cover_src}", ""
    else:
        cover_fig, og_image, cover_mod = "", "https://www.armula.com/assets/img/hero-01.jpg", " lx-cover-text"
    series_html = f'        <p class="lx-series">{esc(d["title"])}</p>\n' if d.get("title") else ""
    deck_html = f'        <p class="lx-deck">{esc(d["deck"])}</p>\n' if d.get("deck") else ""
    d["body"] = re.sub(r">([^<]+)<", lambda m: ">" + unpad(m.group(1)) + "<", d["body"])   # no zero-padded ordinals in text
    return PAGE.format(subtitle=esc(d["subtitle"]), course=esc(d["course"]), course_en=esc(d["course_en"]), deck=esc(d.get("deck") or d.get("meta") or ""),
                       kicker=esc(d["kicker"]), slug=d["slug"], og_image=og_image, cover_fig=cover_fig, cover_mod=cover_mod,
                       series_html=series_html, deck_html=deck_html, src_label=d.get("src_label", "PDF 원본"),
                       author_html=author_html, toc="\n      ".join(toc), body=d["body"], pages=d["pages"], ver=ver)


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("pdf"); ap.add_argument("slug")
    ap.add_argument("--course", default="공공안전디자인"); ap.add_argument("--course-en", default="Public Safety Design")
    ap.add_argument("--ver", default="1")
    a = ap.parse_args()
    d = build(a.pdf, a.slug, a.course, a.course_en)
    with open(f"lectures/{a.slug}.html", "w", encoding="utf-8") as f:
        f.write(render(d, a.ver))
    print(f"lectures/{a.slug}.html · {d['nimg']} images · {len(d['toc'])} toc entries · {d['pages']} pages")
