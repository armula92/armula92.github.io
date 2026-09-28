"""Convert a lecture handout (.docx: Title / Heading 1 / Heading 2 / Normal / tables) into an SPD Lab lecture page.

Usage:  python3 tools/docx2lecture.py <source.docx> <slug> --course "공공거버넌스와 리더십" --course-en "Public Governance & Leadership" [--ver X]
Output: lectures/<slug>.html (+ lectures/pdf/<slug>.docx as the downloadable original)

Mapping:
  Title → page title · 2nd/3rd paragraph → course line / author line
  Heading 1 "N 제목" → Part header with "Chapter N" kicker · Heading 2 → section (TOC)
  Normal → paragraph · "1. …" runs → question list · bare URL → link on previous item
  Paragraphs under "원자료"/"보완자료" style headings or starting with "[…]" → reference list
  Tables → first row as header · paragraph right after a table starting "표" → caption
"""
import argparse, html, os, re, shutil, sys
import docx
from docx.table import Table
from docx.text.paragraph import Paragraph

sys.path.insert(0, os.path.dirname(__file__))
from pdf2lecture import render, esc  # shared page template

URL = re.compile(r"^https?://\S+$")


def link(text):
    return f'<a href="{html.escape(text)}" target="_blank" rel="noopener">{esc(text)}</a>'


def build(src, slug, course, course_en):
    d = docx.Document(src)
    # view-only policy: the original document is never copied into the site

    blocks = []
    for el in d.element.body.iterchildren():
        tag = el.tag.split("}")[1]
        if tag == "p":
            p = Paragraph(el, d)
            t = p.text.strip()
            if t:
                blocks.append(("p", p.style.name, t))
        elif tag == "tbl":
            tb = Table(el, d)
            blocks.append(("t", None, [[c.text.strip() for c in r.cells] for r in tb.rows]))

    # ---- front matter ----
    title = next(t for k, s, t in blocks if k == "p" and s == "Title")
    ti = next(i for i, b in enumerate(blocks) if b[0] == "p" and b[1] == "Title")
    front = [b[2] for b in blocks[ti + 1:] if b[0] == "p"][:4]
    first_h = next(i for i, b in enumerate(blocks) if b[0] == "p" and b[1].startswith("Heading"))
    front = [b[2] for b in blocks[ti + 1:first_h] if b[0] == "p"]
    kicker = front[0] if front else ""
    author = front[1] if len(front) > 1 else ""

    out, toc, meta = [], [], ""
    part_n = sec_n = 0
    i = first_h
    in_refs = False
    while i < len(blocks):
        kind, style, val = blocks[i]
        if kind == "t":
            hdr, rows = val[0], val[1:]
            th = "".join(f"<th>{esc(h)}</th>" for h in hdr)
            trs = "".join("<tr>" + "".join(f"<td>{esc(c)}</td>" for c in r) + "</tr>" for r in rows)
            out.append(f'<div class="lx-table"><table><thead><tr>{th}</tr></thead><tbody>{trs}</tbody></table></div>')
            if i + 1 < len(blocks) and blocks[i + 1][0] == "p" and blocks[i + 1][1] == "Normal" and blocks[i + 1][2].startswith("표"):
                out.append(f'<p class="lx-src">{esc(blocks[i + 1][2])}</p>')
                i += 1
            i += 1
            continue

        t = val
        if style == "Heading 1":
            part_n += 1
            m = re.match(r"^(\d+)\s+(.*)$", t)
            kick, head = (f"Chapter {m.group(1)}", m.group(2)) if m else ("", t)
            if head.startswith("부록"):
                kick, head = "Appendix", t
            aid = f"part-{part_n}"
            toc.append(("part", aid, kick, head))
            out.append(f'<header class="lx-part" id="{aid}">' + (f'<p class="lx-kicker">{esc(kick)}</p>' if kick else "") + f"<h2>{esc(head)}</h2></header>")
            in_refs = False
            i += 1
            continue
        if style == "Heading 2":
            sec_n += 1
            aid = f"sec-{sec_n}"
            toc.append(("sec", aid, "", t))
            out.append(f'<h3 id="{aid}">{esc(t)}</h3>')
            in_refs = bool(re.search(r"원자료|보완자료|참고문헌|출처", t))
            i += 1
            continue

        # numbered questions "1. …"
        if re.match(r"^\d+\.\s", t):
            qs = []
            while i < len(blocks) and blocks[i][0] == "p" and blocks[i][1] == "Normal" and re.match(r"^\d+\.\s", blocks[i][2]):
                qs.append(re.sub(r"^\d+\.\s*", "", blocks[i][2])); i += 1
            out.append('<ol class="lx-qs">' + "".join(f"<li>{esc(q)}</li>" for q in qs) + "</ol>")
            continue

        # reference lists (with following bare URLs)
        if in_refs or t.startswith("["):
            refs = []
            while i < len(blocks) and blocks[i][0] == "p" and blocks[i][1] == "Normal" and (in_refs or blocks[i][2].startswith("[") or URL.match(blocks[i][2])):
                x = blocks[i][2]
                if URL.match(x) and refs:
                    refs[-1] += " " + link(x)
                else:
                    refs.append(esc(x))
                i += 1
            out.append('<ul class="lx-refs">' + "".join(f"<li>{r}</li>" for r in refs) + "</ul>")
            continue

        if URL.match(t):
            out.append(f'<p class="lx-src">{link(t)}</p>'); i += 1; continue

        if not meta:
            meta = t[:150]
        out.append(f"<p>{esc(t)}</p>")
        i += 1

    return dict(kicker=kicker, title="", subtitle=title, deck="", meta=meta, author=author, cover=None,
                body="\n".join(out), toc=toc, pages=0, course=course, course_en=course_en, slug=slug)


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("src"); ap.add_argument("slug")
    ap.add_argument("--course", required=True); ap.add_argument("--course-en", required=True)
    ap.add_argument("--ver", default="1")
    a = ap.parse_args()
    data = build(a.src, a.slug, a.course, a.course_en)
    with open(f"lectures/{a.slug}.html", "w", encoding="utf-8") as f:
        f.write(render(data, a.ver))
    print(f"lectures/{a.slug}.html · {len(data['toc'])} toc entries")
