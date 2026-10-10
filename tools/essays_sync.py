"""Copy the online book (에세이 글모음) into the site as essays/ and remove personal data.

Usage:  python3 tools/essays_sync.py "<.../09_온라인단행본/dist>"
Removes from every html/txt/js file of the copy (the Drive original is never changed):
  주민등록번호, 은행 계좌번호, 원고료 지급·도서 수령지 메모(집 주소 포함), 개인 이메일
Fails loudly if anything sensitive is left, so nothing is published by accident.
"""
import glob, os, re, shutil, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DST = os.path.join(ROOT, "essays")
SENS = r"(도서\s*수령지|효자워너빌|망우로\s*67|계좌번호|우리은행|국민은행|신한은행|하나은행|농협|주민번호|\d{6}-[1-4]\d{6}|\(03920\))"
PERSONAL_EMAILS = ["goodsalad@naver.com", "fallinsy@g.hongik.ac.kr", "cmpark125@g.hongik.ac.kr", "zhangcho@g.hongik.ac.kr"]
CHECK = re.compile(r"\d{6}-[1-4]\d{6}|계좌번호|도서\s*수령지|효자워너빌|" + "|".join(re.escape(e) for e in PERSONAL_EMAILS))


def scrub(path):
    s = open(path, encoding="utf-8", errors="ignore").read()
    o = s
    if path.endswith(".html"):
        s = re.sub(r"<(p|h[1-6]|li)\b[^>]*>(?:(?!</\1>).)*?" + SENS + r"(?:(?!</\1>).)*?</\1>\s*", "", s, flags=re.S)
    elif path.endswith(".txt"):
        s = "\n".join(l for l in s.split("\n") if not re.search(SENS, l))
    else:  # search index (js/json): drop the sensitive phrases themselves
        for pat in [r"-?\s*주소\s*\(도서\s*수령지\)\s*:\s*\d곳", r"\.?[가-힣]{2,4}\s*:\s*\(\d{5}\)[^\"\\]*?\d+호",
                    r"-?은행/계좌번호\(주민번호\)[^\"\\]*?총\s*[\d,]+원\.?", r"\.?[가-힣]{2,4}\s*:\s*[가-힣]+은행[^\"\\]*?\d{6}-[1-4]\d{6}\)",
                    r"\d{6}-[1-4]\d{6}", r"\b\d{3,6}-\d{2,6}-\d{2,6}-\d{3}\b"]:
            s = re.sub(pat, "", s)
    for e in PERSONAL_EMAILS:
        s = re.sub(r"\(\s*" + re.escape(e) + r"\s*\)|<span>\s*" + re.escape(e) + r"\s*</span>|" + re.escape(e), "", s)
    if s != o:
        open(path, "w", encoding="utf-8").write(s)
        return True
    return False


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    src = sys.argv[1]
    if os.path.exists(DST):
        shutil.rmtree(DST)
    shutil.copytree(src, DST)
    files = [f for f in glob.glob(DST + "/**/*", recursive=True) if os.path.isfile(f) and f.endswith((".html", ".txt", ".js", ".json"))]
    changed = sum(scrub(f) for f in files)
    left = [f for f in files if CHECK.search(open(f, encoding="utf-8", errors="ignore").read())]
    if left:
        sys.exit("개인정보가 남아 있어 중단합니다 (게시하지 마세요):\n  " + "\n  ".join(left))
    print(f"essays/ 갱신: 파일 {len(files)}개, 개인정보 정리 {changed}개 파일, 남은 개인정보 0건")


if __name__ == "__main__":
    main()
