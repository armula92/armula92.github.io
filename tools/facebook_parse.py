"""Parse the two Facebook book PDFs into posts.json (reading order aware, both layouts)."""
import fitz, re, json, collections, sys

SRC = "/Users/armula/Library/CloudStorage/GoogleDrive-armula@gmail.com/내 드라이브/이현성교수 연구실/armula facebook/"
OUT = "./"  # posts.json is written to the current folder
DATE = re.compile(r"^(\d{4})/(\d{2})/(\d{2})$")
DOMAIN = re.compile(r"^(?:https?://)?(?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)+(?:/\S*)?$", re.I)
ACTION = re.compile(r"^이현성님이 .*(했습니다|공유했습니다|업로드했습니다)\.?$")
GRAY = 5790043


def items_of(page, two_col):
    out = []
    for b in page.get_text("dict")["blocks"]:
        if b["type"] == 1:
            out.append({"k": "img", "bb": b["bbox"], "w": b["width"], "h": b["height"], "xref": None, "blk": b})
            continue
        for l in b["lines"]:
            t = "".join(s["text"] for s in l["spans"]).replace("\x01", " ").strip()
            if t:
                s = l["spans"][0]
                out.append({"k": "txt", "bb": l["bbox"], "t": t, "size": round(s["size"], 1), "color": s["color"]})
    # Column boundary per page: left and right pages have different margins (left column at x≈46 or x≈73),
    # and the right column always starts ≈214pt to the right of the left margin.
    xs = [i["bb"][0] for i in out if i["k"] == "txt" and i["color"] != 3342336 and i["size"] >= 6]
    left = min(xs) if xs else 46
    mid = left + 200
    def key(it):
        x0, y0 = it["bb"][0], it["bb"][1]
        col = (1 if x0 >= mid else 0) if two_col else 0
        return (col, round(y0), x0)
    out.sort(key=key)
    return out


def parse(book, fname, two_col):
    d = fitz.open(SRC + fname)
    posts, cur, skip = [], None, False
    for pn in range(len(d)):
        page = d[pn]
        its = items_of(page, two_col)
        alltxt = " ".join(i["t"] for i in its if i["k"] == "txt")
        if "CHAPTER" in alltxt and "TOTAL" in alltxt:
            continue                                  # chapter summary pages
        for it in its:
            if it["k"] == "txt":
                t, size, color = it["t"], it["size"], it["color"]
                # chapter-end "best of chapter" box (a reprinted top post) and "MY LOG" chapter headers are
                # book furniture, not part of the preceding post: skip everything until the next real post.
                if re.match(r"^(best of|MY LOG\b|To more see)", t, re.I):
                    skip = True; continue
                if DATE.match(t) and color == 0 and size >= 9.5:
                    skip = False
                    cur = {"book": book, "date": t, "page": pn + 1, "time": "", "action": "", "text": [], "title": [],
                           "domain": "", "desc": [], "counts": [], "imgs": [], "_after_domain": False}
                    posts.append(cur); continue
                if cur is None or skip:
                    continue
                if color == 3342336 or (size == 8.0 and color == 0 and it["bb"][1] < 25):
                    continue                          # page number / running month header
                if size == 6.5 and color == 0:
                    cur["time"] = t; continue
                if re.fullmatch(r"\d+", t) and size <= 6.0:
                    cur["counts"].append(int(t)); continue
                if ACTION.match(t):
                    cur["action"] = t; continue
                if "게시한 사진" in t and t.startswith("["):
                    continue
                if cur["title"] and not cur["title"][-1].endswith("]"):
                    cur["title"].append(t); continue
                if t.startswith("[") and size <= 8.0:
                    cur["title"].append(t); continue
                if DOMAIN.match(t) and size <= 9.0 and " " not in t:
                    cur["domain"] = t; cur["_after_domain"] = True; continue
                if cur["_after_domain"] and size <= 8.0:
                    cur["desc"].append(t); continue
                cur["text"].append(t)
            else:
                if cur is None or skip:
                    continue
                x0, y0, x1, y1 = it["bb"]
                if min(it["w"], it["h"]) < 120 or (x1 - x0) < 45:
                    continue                          # reaction icons, avatars, favicons
                cur["imgs"].append({"page": pn + 1, "bbox": [round(v, 1) for v in it["bb"]], "w": it["w"], "h": it["h"]})
    for p in posts:
        p["text"] = re.sub(r"[ \t]+", " ", "\n".join(p["text"])).strip()
        p["title"] = re.sub(r"\s+", " ", " ".join(p["title"])).strip().strip("[]").strip()
        p["desc"] = re.sub(r"\s+", " ", " ".join(p["desc"])).strip()
        c = p.pop("counts")
        p["likes"], p["comments"], p["shares"] = (c + [0, 0, 0])[:3]
        p.pop("_after_domain")
    return posts


if __name__ == "__main__":
    posts = parse("I", "Socio-Public Design I (armula).pdf", True) + parse("II", "Socio-Public Design II (armula).pdf", False)
    for i, p in enumerate(posts):
        p["id"] = i + 1
    json.dump(posts, open(OUT + "posts.json", "w"), ensure_ascii=False, indent=0)
    print("posts", len(posts), collections.Counter(p["book"] for p in posts))
    print("years", sorted(collections.Counter(p["date"][:4] for p in posts).items()))
    print("link", sum(1 for p in posts if p["title"]), "imgs", sum(1 for p in posts if p["imgs"]),
          "empty", sum(1 for p in posts if not p["text"] and not p["title"]), "total imgs", sum(len(p["imgs"]) for p in posts))
    print(collections.Counter(p["action"] for p in posts).most_common(8))
