"""Sync the latest Facebook Page posts into the site (assets/js/fb-data.js + assets/img/fb/).

Runs in GitHub Actions (.github/workflows/facebook-sync.yml) every few hours.
Needs two repository secrets: FB_PAGE_ID, FB_PAGE_TOKEN (a Page access token).
Usage (local test):  FB_PAGE_ID=… FB_PAGE_TOKEN=… python3 tools/fb_sync.py
"""
import io, json, os, re, sys, urllib.parse, urllib.request
from datetime import datetime, timezone, timedelta
from PIL import Image, ImageOps

COUNT = 6
API = "https://graph.facebook.com/v21.0"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IMG_DIR = os.path.join(ROOT, "assets/img/fb")
DATA = os.path.join(ROOT, "assets/js/fb-data.js")
KST = timezone(timedelta(hours=9))
PAGE_NAME = ""
GENERIC = re.compile(r"님이 게시한 사진|님의 사진|게시물|Photos from|Timeline photos|Mobile uploads|님이 .*공유", re.I)
COVER = re.compile(r"커버 사진|프로필 사진|cover photo|profile picture", re.I)


def get(url):
    try:
        with urllib.request.urlopen(url, timeout=30) as r:
            return r.read()
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", "replace")
        try:
            msg = json.loads(body)["error"]["message"]
        except Exception:
            msg = body[:300]
        sys.exit(f"Facebook API error ({e.code}): {msg}\n"
                 "→ 페이지 토큰이 만료되었거나 권한이 바뀌었을 수 있습니다. 관리 노트의 'Facebook 토큰 갱신' 순서대로 새 토큰을 FB_PAGE_TOKEN에 등록하세요.")


def title_of(p):
    msg = (p.get("message") or "").strip()
    if msg:
        line = next((l for l in msg.splitlines() if re.sub(r"[#\s]", "", l)), "")
        line = re.sub(r"https?://\S+", "", line)
        line = re.sub(r"#\S+", "", line).strip(" -–—·:|\"'“”")
        if line:
            return line if len(line) <= 34 else line[:33].rstrip() + "…"
    for a in (p.get("attachments") or {}).get("data", []):
        t = (a.get("title") or "").strip()
        if t and not GENERIC.search(t) and t != PAGE_NAME:
            return t if len(t) <= 34 else t[:33].rstrip() + "…"
    d = datetime.fromisoformat(p["created_time"].replace("+0000", "+00:00")).astimezone(KST)
    return "사진 소식"


def is_profile_change(p):
    """Cover/profile picture updates are not news — skip them."""
    return any(COVER.search(a.get("title") or "") for a in (p.get("attachments") or {}).get("data", []))


def square_gray(raw, size=640):
    im = ImageOps.exif_transpose(Image.open(io.BytesIO(raw))).convert("L")
    im = ImageOps.autocontrast(im, cutoff=0.5)
    return ImageOps.fit(im, (size, size), Image.LANCZOS, centering=(0.5, 0.45))


def main():
    page, token = os.environ.get("FB_PAGE_ID"), os.environ.get("FB_PAGE_TOKEN")
    if not page or not token:
        sys.exit("FB_PAGE_ID / FB_PAGE_TOKEN secrets are missing.")
    q = urllib.parse.urlencode({
        "fields": "id,created_time,message,permalink_url,full_picture,attachments{title,type}",
        "limit": 25, "access_token": token})
    global PAGE_NAME
    PAGE_NAME = json.loads(get(f"{API}/{page}?" + urllib.parse.urlencode({"fields": "name", "access_token": token}))).get("name", "")
    data = json.loads(get(f"{API}/{page}/posts?{q}")).get("data", [])
    posts = [p for p in data if p.get("permalink_url") and not is_profile_change(p)][:COUNT]

    os.makedirs(IMG_DIR, exist_ok=True)
    keep, items = set(), []
    for p in posts:
        pid = p["id"].replace("_", "-")
        img = None
        if p.get("full_picture"):
            name = f"fb-{pid}.jpg"
            path = os.path.join(IMG_DIR, name)
            if not os.path.exists(path):
                square_gray(get(p["full_picture"])).save(path, quality=80, optimize=True, progressive=True)
            keep.add(name)
            img = name
        d = datetime.fromisoformat(p["created_time"].replace("+0000", "+00:00")).astimezone(KST)
        items.append({"t": title_of(p), "d": f"{d:%Y.%m.%d}", "u": p["permalink_url"], "i": img})
    for f in os.listdir(IMG_DIR):                      # drop images of posts no longer in the latest six
        if f not in keep:
            os.remove(os.path.join(IMG_DIR, f))

    payload = {"page": f"https://www.facebook.com/{page}", "posts": items}
    new = "/* 자동 생성 — tools/fb_sync.py (Facebook 페이지 최근 게시물). 직접 고치지 마세요. */\nwindow.SPD_FB = " + \
          json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + ";\n"
    old = open(DATA, encoding="utf-8").read() if os.path.exists(DATA) else ""
    if new != old:
        open(DATA, "w", encoding="utf-8").write(new)
        print(f"updated: {len(items)} posts")
    else:
        print("no change")


if __name__ == "__main__":
    main()
