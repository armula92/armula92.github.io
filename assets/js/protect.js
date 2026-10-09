/* 강의 자료 · 공공디자인 실험실 보호: 오른쪽 클릭 · 복사 · 잘라내기 · 글자 선택 · 끌기 · 저장 · 소스 보기 차단 (인쇄는 허용) */
(function () {
  "use strict";
  var css = "html,body{-webkit-user-select:none;-ms-user-select:none;user-select:none;-webkit-touch-callout:none}" +
            "img,svg,video{-webkit-user-drag:none;user-drag:none}" +
            "input,textarea,[contenteditable]{-webkit-user-select:text;user-select:text}";
  var st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);
  function editable(t) { return t && (t.closest ? t.closest("input,textarea,[contenteditable]") : null); }
  ["contextmenu", "copy", "cut", "dragstart", "selectstart"].forEach(function (ev) {
    document.addEventListener(ev, function (e) { if (!editable(e.target)) e.preventDefault(); }, true);
  });
  document.addEventListener("keydown", function (e) {
    if (!(e.ctrlKey || e.metaKey)) return;
    var k = (e.key || "").toLowerCase();
    if ("cxsua".indexOf(k) > -1 && k.length === 1 && !editable(e.target)) { e.preventDefault(); e.stopPropagation(); }
  }, true);
})();
