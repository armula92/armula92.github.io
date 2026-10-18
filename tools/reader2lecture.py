"""Convert a student reader built from content.js (읽기자료_제작파일) into an SPD Lab lecture page.

Usage:  python3 tools/reader2lecture.py <읽기자료_제작파일 dir> <slug> --course "공공거버넌스와 리더십" --course-en "Public Governance & Leadership" --lecture "제7강" [--ver X]
Output: lectures/<slug>.html, lectures/img/<slug>/*.png (diagrams from fig/*.png, resized for the web)

content.js keys used: cover, intro(lead, readme, goals), parts[no, title, en, desc, sections[title, en, lead, blocks]],
glossary[[en, ko, def]], refs[[group, [items]]], colophon.
Blocks: {h, body:[p|list|quote|note]} · {fig, cap} · {wtable:{headers, rows}}
The original PDF/Word is never copied into the site (view-only policy).
"""
import argparse, json, os, subprocess, sys
from PIL import Image

sys.path.insert(0, os.path.dirname(__file__))
from pdf2lecture import render, esc

FIG_W = 1600


def load(src):
    js = "process.stdout.write(JSON.stringify(require(process.argv[1])))"
    out = subprocess.run(["node", "-e", js, os.path.join(src, "content.js")], capture_output=True, text=True, check=True)
    return json.loads(out.stdout)


def cell(t):
    lines = str(t).split("\n")
    return esc(lines[0]) + "".join(f"<br><small>{esc(x)}</small>" for x in lines[1:])


def body_units(items):
    out = []
    for b in items:
        k = b["k"]
        if k == "p":
            out.append(f"<p>{esc(b['t'])}</p>")
        elif k == "list":
            out.append('<ul class="lx-list">' + "".join(f"<li>{esc(x)}</li>" for x in b["items"]) + "</ul>")
        elif k == "quote":
            cite = f"<cite>{esc(b['src'])}</cite>" if b.get("src") else ""
            out.append(f'<blockquote class="lx-quote"><p>{esc(b["t"])}</p>{cite}</blockquote>')
        elif k == "note":
            out.append(f'<aside class="lx-box lx-note"><span class="lx-box-k">해석의 범위</span><p>{esc(b["t"])}</p></aside>')
        else:
            raise ValueError(f"unknown block kind: {k}")
    return out


def build(src, slug, course, course_en, lecture):
    c = load(src)
    img_dir = f"lectures/img/{slug}"
    os.makedirs(img_dir, exist_ok=True)
    out, toc = [], []

    # ---- introduction
    I = c["intro"]
    toc.append(("part", "intro", "Introduction", "이 자료에 대하여"))
    out.append('<header class="lx-part" id="intro"><p class="lx-kicker">Introduction</p><h2>이 자료에 대하여</h2></header>')
    out += [f"<p>{esc(t)}</p>" for t in I["lead"]]
    out += [f'<p class="lx-src">{esc(t)}</p>' for t in I.get("readme", [])]
    toc.append(("sec", "goals", "", "이번 강의 주요 핵심"))
    out.append('<h3 id="goals">이번 강의 주요 핵심</h3>')
    out.append('<ul class="lx-list">' + "".join(f"<li>{esc(g)}</li>" for g in I["goals"]) + "</ul>")

    # ---- parts
    nfig = sec_n = 0
    for pi, p in enumerate(c["parts"], 1):
        aid = f"part-{pi}"
        toc.append(("part", aid, p["no"], p["title"]))
        out.append(f'<header class="lx-part" id="{aid}"><p class="lx-kicker">{esc(p["no"])} / {esc(p["en"])}</p>'
                   f'<h2>{esc(p["title"])}</h2><p class="lx-lead">{esc(p["desc"])}</p></header>')
        for s in p["sections"]:
            sec_n += 1
            sid = f"sec-{sec_n}"
            toc.append(("sec", sid, "", s["title"]))
            out.append(f'<h3 id="{sid}">{esc(s["title"])}</h3>')
            if s.get("en"):
                out.append(f'<p class="lx-src">{esc(s["en"])}</p>')
            if s.get("lead"):
                out.append(f'<p class="lx-lead lx-sec-lead">{esc(s["lead"])}</p>')
            for b in s["blocks"]:
                if "h" in b:
                    out.append(f"<h4>{esc(b['h'])}</h4>")
                    out += body_units(b["body"])
                elif "fig" in b:
                    nfig += 1
                    im = Image.open(os.path.join(src, "fig", b["fig"] + ".png")).convert("RGB")
                    if im.width > FIG_W:
                        im = im.resize((FIG_W, round(im.height * FIG_W / im.width)), Image.LANCZOS)
                    name = f"{b['fig']}.png"
                    im.save(os.path.join(img_dir, name), optimize=True)
                    alt = b["cap"].split(".")[0]
                    out.append(f'<figure class="lx-fig"><img src="img/{slug}/{name}" alt="{esc(alt)}" width="{im.width}" height="{im.height}" '
                               f'loading="lazy" draggable="false"><figcaption>{esc(b["cap"])}</figcaption></figure>')
                elif "wtable" in b:
                    t = b["wtable"]
                    th = "".join(f"<th>{esc(h)}</th>" for h in t["headers"])
                    trs = "".join("<tr>" + "".join(f"<td>{cell(x)}</td>" for x in r) + "</tr>" for r in t["rows"])
                    out.append(f'<div class="lx-table"><table><thead><tr>{th}</tr></thead><tbody>{trs}</tbody></table></div>')
                else:
                    raise ValueError(f"unknown block: {list(b)}")

    # ---- glossary, references
    toc.append(("part", "reference", "Reference", "참고"))
    out.append('<header class="lx-part" id="reference"><p class="lx-kicker">Reference / Glossary &amp; Reading</p><h2>참고</h2><p class="lx-lead">용어와 문헌</p></header>')
    toc.append(("sec", "glossary", "", "핵심 용어"))
    out.append('<h3 id="glossary">핵심 용어</h3>')
    out.append('<p class="lx-src">이 자료에서 쓴 주요 용어를 영어와 함께 정리했습니다. 거버넌스 문헌을 읽을 때 길잡이로 쓰세요.</p>')
    out.append('<dl class="lx-cards">' + "".join(
        f"<div><dt>{esc(ko)}</dt><dd><b>{esc(en)}</b><span>{esc(d)}</span></dd></div>" for en, ko, d in c["glossary"]) + "</dl>")
    toc.append(("sec", "further", "", "추가 문헌"))
    out.append('<h3 id="further">추가 문헌</h3>')
    for g, items in c["refs"]:
        out.append(f"<h4>{esc(g)}</h4>")
        out.append('<ul class="lx-refs">' + "".join(f"<li>{esc(x)}</li>" for x in items) + "</ul>")
    out.append(f'<p class="lx-src lx-colophon">{esc(c["colophon"])}</p>')

    cv = c["cover"]
    return dict(kicker=f"{course} 학생용 읽기자료", title="", subtitle=f"{lecture} {' '.join(cv['title'])}",
                deck=f"{cv['en']}. {' '.join(cv['sub'])}", author=cv["foot2"], cover=None,
                body="\n".join(out), toc=toc, pages=0, nimg=nfig, course=course, course_en=course_en, slug=slug)


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("src"); ap.add_argument("slug")
    ap.add_argument("--course", required=True); ap.add_argument("--course-en", required=True)
    ap.add_argument("--lecture", required=True, help='예: "제7강"')
    ap.add_argument("--ver", default="1")
    a = ap.parse_args()
    d = build(a.src, a.slug, a.course, a.course_en, a.lecture)
    with open(f"lectures/{a.slug}.html", "w", encoding="utf-8") as f:
        f.write(render(d, a.ver))
    print(f"lectures/{a.slug}.html · {d['nimg']} figures · {len(d['toc'])} toc entries")
