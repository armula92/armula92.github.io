/* Design Trend Research — category filter, year filter, search, detail sheet */
(function () {
  "use strict";
  var CATS = [
    { k: "space", ko: "공공공간·도시재생", en: "Public Space & Urbanism",
      i: '<rect x="7" y="9" width="34" height="30"/><path d="M7 31h34M17 31V21M31 31V24"/><circle cx="17" cy="17" r="4"/><circle cx="31" cy="20" r="4"/>' },
    { k: "mobility", ko: "보행·모빌리티", en: "Mobility & Streets",
      i: '<circle cx="13" cy="32" r="7"/><circle cx="35" cy="32" r="7"/><path d="M13 32l7-13h11l4 13M20 19l6 13M28 14h5"/>' },
    { k: "safety", ko: "안전디자인", en: "Safety Design",
      i: '<path d="M24 6 43 40H5Z"/><path d="M24 18v11M24 33v2"/>' },
    { k: "social", ko: "사회혁신·거버넌스", en: "Social Innovation & Governance",
      i: '<circle cx="24" cy="11" r="4.5"/><circle cx="10" cy="35" r="4.5"/><circle cx="38" cy="35" r="4.5"/><path d="M24 15.5v8.5M24 24l-10.5 8M24 24l10.5 8"/>' },
    { k: "inclusive", ko: "포용·건강·웰빙", en: "Inclusion & Wellbeing",
      i: '<path d="M24 40 9.5 25.5a8.2 8.2 0 0 1 14.5-11.6 8.2 8.2 0 0 1 14.5 11.6Z"/><path d="M17 25h5l2-4 3 8 2-4h3"/>' },
    { k: "green", ko: "지속가능·기후", en: "Sustainability & Climate",
      i: '<path d="M9 39C9 19 21 9 40 8c0 19-10 31-31 31Z"/><path d="M9 39 29 19"/>' },
    { k: "object", ko: "공공시설물·정보디자인", en: "Street Furniture & Wayfinding",
      i: '<path d="M7 23h34M9 29h30M12 29v10M36 29v10M10 23v-9h28v9"/><path d="M24 14V8h9"/>' },
    { k: "art", ko: "공공미술·문화", en: "Public Art & Culture",
      i: '<rect x="8" y="8" width="32" height="25"/><path d="m8 29 10-9 8 7 5-4 9 8"/><circle cx="31" cy="15" r="3"/><path d="M18 33v7M30 33v7"/>' },
    { k: "digital", ko: "디지털·데이터·AI", en: "Digital, Data & AI",
      i: '<rect x="12" y="12" width="24" height="24"/><rect x="19" y="19" width="10" height="10"/><path d="M18 6v6M24 6v6M30 6v6M18 36v6M24 36v6M30 36v6M6 18h6M6 24h6M6 30h6M36 18h6M36 24h6M36 30h6"/>' }
  ];
  window.SPD_TREND_CATS = CATS;
  var D = window.SPD_TRENDS;
  var grid = document.getElementById("trGrid");
  if (!D || !grid) return;

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var esc = function (s) { return String(s || "").replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };
  var icon = function (k, cls) {
    var c = CATS.filter(function (x) { return x.k === k; })[0];
    return '<svg class="' + (cls || "") + '" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true">' + c.i + "</svg>";
  };
  var catOf = function (k) { return CATS.filter(function (x) { return x.k === k; })[0]; };
  var counts = {}; D.forEach(function (r) { counts[r.c] = (counts[r.c] || 0) + 1; });

  // ---- category bar ----
  var bar = document.getElementById("trCats");
  bar.innerHTML = '<button class="tr-cat on" data-c="all"><span class="tr-cat-all">All</span><b>전체</b><em>' + D.length + "</em></button>" +
    CATS.map(function (c) {
      return '<button class="tr-cat" data-c="' + c.k + '" title="' + esc(c.en) + '">' + icon(c.k) + "<b>" + esc(c.ko) + "</b><em>" + (counts[c.k] || 0) + "</em></button>";
    }).join("");

  // ---- years ----
  var years = []; D.forEach(function (r) { var y = r.d.slice(0, 4); if (years.indexOf(y) < 0) years.push(y); });
  years.sort().reverse();
  var yearBar = document.getElementById("trYears");
  yearBar.innerHTML = '<button class="on" data-y="all">전체 연도</button>' + years.map(function (y) { return '<button data-y="' + y + '">' + y + "</button>"; }).join("");

  var state = { c: "all", y: "all", q: "", n: 24 };
  var fromHash = (location.hash || "").replace("#", "");
  if (catOf(fromHash)) state.c = fromHash;

  var rows = [];
  var render = function () {
    var q = state.q.trim().toLowerCase();
    rows = D.filter(function (r) {
      return (state.c === "all" || r.c === state.c) && (state.y === "all" || r.d.indexOf(state.y) === 0) &&
        (!q || (r.t + " " + r.s + " " + r.x + " " + r.lt + " " + r.src).toLowerCase().indexOf(q) > -1);
    });
    var shown = rows.slice(0, state.n);
    grid.innerHTML = shown.length ? shown.map(function (r, i) {
      var c = catOf(r.c);
      return '<button class="tr-card" data-i="' + i + '">' +
        (r.i ? '<span class="tr-ph"><img src="assets/img/trends/' + r.i + '" alt="" loading="lazy" width="' + r.w + '" height="' + r.h + '"></span>'
             : '<span class="tr-ph tr-ph-empty">' + icon(r.c) + "</span>") +
        '<span class="tr-meta">' + icon(r.c, "tr-mi") + esc(c.ko) + "<time>" + r.d + "</time></span>" +
        "<b>" + esc(r.t) + "</b><span class=\"tr-sum\">" + esc(r.s) + "</span>" +
        (r.src ? '<span class="tr-src">' + esc(r.src) + "</span>" : "") + "</button>";
    }).join("") : '<p class="tr-empty">조건에 맞는 사례가 없습니다.</p>';
    var more = document.getElementById("trMore");
    var rest = rows.length - shown.length;
    more.style.display = rest > 0 ? "" : "none";
    document.getElementById("trMoreLabel").textContent = "더 보기 (" + rest + ")";
    document.getElementById("trCount").textContent = rows.length;
    var cc = catOf(state.c);
    document.getElementById("trNow").textContent = cc ? cc.ko + " · " + cc.en : "전체 카테고리";
    Array.prototype.forEach.call(bar.children, function (b) { b.classList.toggle("on", b.dataset.c === state.c); });
    Array.prototype.forEach.call(yearBar.children, function (b) { b.classList.toggle("on", b.dataset.y === state.y); });
  };

  bar.addEventListener("click", function (e) {
    var b = e.target.closest("button"); if (!b) return;
    state.c = b.dataset.c; state.n = 24; render();
    history.replaceState(null, "", state.c === "all" ? location.pathname : "#" + state.c);
  });
  yearBar.addEventListener("click", function (e) {
    var b = e.target.closest("button"); if (!b) return;
    state.y = b.dataset.y; state.n = 24; render();
  });
  document.getElementById("trSearch").addEventListener("input", function (e) { state.q = e.target.value; state.n = 24; render(); });
  document.getElementById("trMore").addEventListener("click", function () { state.n += 24; render(); });

  // ---- detail sheet ----
  var sheet = document.getElementById("trSheet"), body = document.getElementById("trSheetBody");
  var linkify = function (s) {
    return esc(s).replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');
  };
  var open = function (i) {
    var r = rows[i], c = catOf(r.c);
    body.innerHTML =
      '<p class="tr-s-cat">' + icon(r.c, "tr-mi") + esc(c.ko) + " <span>" + esc(c.en) + "</span></p>" +
      "<h2>" + esc(r.t) + "</h2>" +
      '<p class="tr-s-date">' + r.d + (r.src ? " · " + esc(r.src) : "") + "</p>" +
      (r.i ? '<figure class="tr-s-fig"><img src="assets/img/trends/' + r.i + '" alt="' + esc(r.t) + '" width="' + r.w + '" height="' + r.h + '"></figure>' : "") +
      '<p class="tr-s-sum">' + esc(r.s) + "</p>" +
      (r.x ? '<div class="tr-s-text"><p class="tr-s-k">Original note</p><p>' + linkify(r.x).replace(/\n/g, "<br>") + "</p></div>" : "") +
      (r.lt ? '<div class="tr-s-link"><p class="tr-s-k">Shared link</p><p>' + esc(r.lt) + (r.src ? "<span>" + esc(r.src) + "</span>" : "") + "</p></div>" : "");
    sheet.hidden = false;
    document.body.classList.add("cv-lock");
    requestAnimationFrame(function () { sheet.classList.add("open"); });
    sheet.scrollTop = 0;
    $("#trClose").focus();
  };
  var close = function () {
    sheet.classList.remove("open");
    document.body.classList.remove("cv-lock");
    setTimeout(function () { sheet.hidden = true; }, 350);
  };
  grid.addEventListener("click", function (e) { var b = e.target.closest(".tr-card"); if (b) open(+b.dataset.i); });
  $("#trClose").addEventListener("click", close);
  sheet.addEventListener("click", function (e) { if (e.target === sheet) close(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !sheet.hidden) close(); });

  render();
})();
