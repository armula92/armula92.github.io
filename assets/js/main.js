(function () {
  "use strict";
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ---------- Header / mobile menu ---------- */
  var header = $(".site-header");
  var onScroll = function () { header && header.classList.toggle("scrolled", window.scrollY > 40); };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  var menuBtn = $(".menu-btn");
  if (menuBtn) {
    var setMenu = function (open) {
      document.body.classList.toggle("menu-open", open);
      menuBtn.setAttribute("aria-expanded", open);
      document.body.style.overflow = open ? "hidden" : "";
    };
    menuBtn.addEventListener("click", function () { setMenu(!document.body.classList.contains("menu-open")); });
    $$(".mobile-menu a").forEach(function (a) { a.addEventListener("click", function () { setMenu(false); }); });
  }

  /* ---------- Active nav ---------- */
  var navLinks = $$('.nav a[href^="#"]');
  if (navLinks.length && "IntersectionObserver" in window) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        navLinks.forEach(function (a) { a.classList.toggle("active", a.getAttribute("href") === "#" + e.target.id); });
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    navLinks.forEach(function (a) { var t = $(a.getAttribute("href")); if (t) spy.observe(t); });
  }

  /* ---------- Reveal ---------- */
  var observeReveal = function (els) {
    if (!("IntersectionObserver" in window)) { els.forEach(function (el) { el.classList.add("in"); }); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.05 });
    els.forEach(function (el) { io.observe(el); });
  };
  observeReveal($$(".rv"));

  /* ---------- Hero slideshow ---------- */
  var slides = $$(".hero-slides figure");
  if (slides.length > 1) {
    var cur = 0, idxEl = $("#heroIdx"), bar = $(".hero-count .bar i");
    var runBar = function () { if (!bar) return; bar.classList.remove("run"); void bar.offsetWidth; bar.classList.add("run"); };
    runBar();
    setInterval(function () {
      slides[cur].classList.remove("on");
      cur = (cur + 1) % slides.length;
      slides[cur].classList.add("on");
      if (idxEl) idxEl.textContent = ("0" + (cur + 1)).slice(-2);
      runBar();
    }, 6000);
  }

  /* ---------- Members ---------- */
  var M = window.SPD_MEMBERS;
  var roster = $("#roster");
  if (M && roster) {
    var phd = M.current.filter(function (m) { return m.d === "박사"; });
    var ms = M.current.filter(function (m) { return m.d === "석사"; });
    var groups = {
      phd: phd.map(function (m) { return { n: m.n, sub: "박사과정", st: m.s }; }),
      ms: ms.map(function (m) { return { n: m.n, sub: "석사과정", st: m.s }; }),
      alumni: M.alumni.map(function (m) { return { n: m.n, sub: m.d + " 졸업", st: "Alumni" }; })
    };
    groups.all = groups.phd.concat(groups.ms, groups.alumni);

    var stats = $("#memberStats");
    if (stats) {
      var alumPhd = M.alumni.filter(function (m) { return m.d === "박사"; }).length;
      stats.innerHTML = [
        [phd.length, "박사과정 Doctoral"],
        [ms.length, "석사과정 Master"],
        [M.alumni.length - alumPhd, "석사 졸업 Alumni"],
        [alumPhd, "박사 졸업 Ph.D."],
        ["9%", "외국인 연구자"]
      ].map(function (s) { return '<div class="rv"><b>' + s[0] + "</b><span>" + s[1] + "</span></div>"; }).join("");
      observeReveal($$(".rv", stats));
    }

    var tabBtns = $$("#memberTabs button");
    tabBtns.forEach(function (b) {
      var n = groups[b.dataset.g].length;
      b.insertAdjacentHTML("beforeend", "<sup>" + n + "</sup>");
    });
    var renderRoster = function (g) {
      roster.innerHTML = groups[g].map(function (m, i) {
        return '<li style="animation-delay:' + Math.min(i * 18, 600) + 'ms"><em>' + m.sub + "</em><b>" + m.n + "</b><span>" + m.st + "</span></li>";
      }).join("");
    };
    tabBtns.forEach(function (b) {
      b.addEventListener("click", function () {
        tabBtns.forEach(function (x) { x.classList.toggle("on", x === b); });
        renderRoster(b.dataset.g);
      });
    });
    renderRoster("all");
  }

  /* ---------- Publications ---------- */
  var P = window.SPD_PUBS;
  var list = $("#pubList");
  if (P && list) {
    var state = { k: "all", c: "all", q: "", limit: 15 };
    var catName = { gov: "거버넌스·참여", esg: "공공가치·ESG", place: "장소성·데이터", safety: "안전·웰빙" };
    var moreBtn = $("#pubMore"), moreLabel = $("#pubMoreLabel");
    var esc = function (s) { return s.replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };
    var render = function () {
      var q = state.q.trim().toLowerCase();
      var rows = P.filter(function (p) {
        return (state.k === "all" || p.k === state.k) &&
          (state.c === "all" || p.c.indexOf(state.c) > -1) &&
          (!q || p.t.toLowerCase().indexOf(q) > -1);
      });
      var shown = rows.slice(0, state.limit);
      if (!rows.length) {
        list.innerHTML = '<li class="pub-empty">검색 결과가 없습니다.</li>';
      } else {
        list.innerHTML = shown.map(function (p, i) {
          var t = esc(p.t);
          if (q) {
            var at = p.t.toLowerCase().indexOf(q);
            t = esc(p.t.slice(0, at)) + "<mark>" + esc(p.t.slice(at, at + q.length)) + "</mark>" + esc(p.t.slice(at + q.length));
          }
          return '<li><span class="idx">' + ("00" + (i + 1)).slice(-3) + '</span><span class="t">' + t +
            '</span><span class="k">' + (p.k === "journal" ? "학술논문" : "학위논문") + " · " + catName[p.c[0]] + "</span></li>";
        }).join("");
      }
      var rest = rows.length - shown.length;
      moreBtn.style.display = rows.length > 15 ? "" : "none";
      moreLabel.textContent = rest > 0 ? "더 보기 (" + rest + ")" : "접기";
    };
    $$("#pubKind button").forEach(function (b, _, all) {
      b.addEventListener("click", function () {
        all.forEach(function (x) { x.classList.toggle("on", x === b); });
        state.k = b.dataset.k; state.limit = 15; render();
      });
    });
    $$("#pubCat button").forEach(function (b, _, all) {
      b.addEventListener("click", function () {
        all.forEach(function (x) { x.classList.toggle("on", x === b); });
        state.c = b.dataset.c; state.limit = 15; render();
      });
    });
    $("#pubSearch").addEventListener("input", function (e) { state.q = e.target.value; state.limit = 15; render(); });
    moreBtn.addEventListener("click", function () {
      if (moreLabel.textContent === "접기") { state.limit = 15; render(); $("#publications").scrollIntoView(); }
      else { state.limit += 30; render(); }
    });
    render();
  }

  /* ---------- Gallery: index marquee ---------- */
  var G = window.SPD_GALLERY;
  var marquee = $("#marquee");
  if (G && marquee) {
    var picks = G.filter(function (_, i) { return i % 2 === 0; }).slice(0, 18);
    var html = picks.map(function (g) {
      return '<img src="' + g.thumb + '" alt="" loading="lazy" style="aspect-ratio:' + g.w + "/" + g.h + '">';
    }).join("");
    marquee.innerHTML = html + html; // duplicated for a seamless loop
  }

  /* ---------- Gallery: page viewer ---------- */
  var stage = $("#gStage");
  if (G && stage) {
    var img = $("#gImg"), strip = $("#gStrip"), grid = $("#gGrid");
    var curEl = $("#gCur"), prog = $("#gProg"), playBtn = $("#gPlay");
    var pad = function (n) { return ("0" + n).slice(-2); };
    var i = 0, timer = null, playing = true, DELAY = 4500;
    $("#gTotal").textContent = pad(G.length);

    strip.innerHTML = G.map(function (g, n) {
      return '<button role="tab" aria-label="사진 ' + (n + 1) + '" data-i="' + n + '"><img src="' + g.thumb + '" alt="" loading="lazy"></button>';
    }).join("");
    grid.innerHTML = G.map(function (g, n) {
      return '<button class="g-cell" data-i="' + n + '" aria-label="사진 ' + (n + 1) + ' 크게 보기"><img src="' + g.thumb +
        '" alt="SPD Lab 활동 사진 ' + (n + 1) + '" loading="lazy" width="' + g.w + '" height="' + g.h + '"></button>';
    }).join("");
    var thumbs = $$("button", strip);

    var show = function (n) {
      i = (n + G.length) % G.length;
      img.classList.remove("on");
      var next = new Image();
      next.onload = function () { img.src = G[i].src; img.alt = "SPD Lab 활동 사진 " + (i + 1); img.classList.add("on"); };
      next.src = G[i].src;
      curEl.textContent = pad(i + 1);
      thumbs.forEach(function (t, k) { t.classList.toggle("on", k === i); t.setAttribute("aria-selected", k === i); });
      var t = thumbs[i];
      strip.scrollTo({ left: t.offsetLeft - strip.clientWidth / 2 + t.clientWidth / 2, behavior: "smooth" });
      // preload neighbour
      new Image().src = G[(i + 1) % G.length].src;
      restart();
    };
    var restart = function () {
      clearTimeout(timer);
      prog.classList.remove("run"); void prog.offsetWidth;
      if (!playing) return;
      prog.style.animationDuration = DELAY + "ms";
      prog.classList.add("run");
      timer = setTimeout(function () { show(i + 1); }, DELAY);
    };

    $("#gPrev").addEventListener("click", function () { show(i - 1); });
    $("#gNext").addEventListener("click", function () { show(i + 1); });
    thumbs.forEach(function (t) { t.addEventListener("click", function () { show(+t.dataset.i); }); });
    $$(".g-cell", grid).forEach(function (c) {
      c.addEventListener("click", function () { show(+c.dataset.i); stage.scrollIntoView({ behavior: "smooth", block: "center" }); });
    });
    playBtn.addEventListener("click", function () {
      playing = !playing;
      playBtn.textContent = playing ? "Pause" : "Play";
      playBtn.setAttribute("aria-pressed", playing);
      restart();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "ArrowLeft") show(i - 1);
      if (e.key === "ArrowRight") show(i + 1);
    });
    var sx = null;
    stage.addEventListener("touchstart", function (e) { sx = e.touches[0].clientX; }, { passive: true });
    stage.addEventListener("touchend", function (e) {
      if (sx === null) return;
      var dx = e.changedTouches[0].clientX - sx;
      if (Math.abs(dx) > 40) show(dx < 0 ? i + 1 : i - 1);
      sx = null;
    });
    show(0);
  }
  /* ---------- Professor CV sheet ---------- */
  var sheet = $("#cvSheet"), openBtn = $("#cvOpen");
  if (sheet && openBtn) {
    var closeBtn = $("#cvClose");
    var openCV = function () {
      sheet.hidden = false;
      document.body.classList.add("cv-lock");
      requestAnimationFrame(function () { sheet.classList.add("open"); });
      sheet.scrollTop = 0;
      closeBtn.focus();
    };
    var closeCV = function () {
      sheet.classList.remove("open");
      document.body.classList.remove("cv-lock");
      setTimeout(function () { sheet.hidden = true; openBtn.focus(); }, 400);
    };
    openBtn.addEventListener("click", openCV);
    closeBtn.addEventListener("click", closeCV);
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !sheet.hidden) closeCV(); });
    var idxLinks = $$(".cv-index a", sheet);
    idxLinks.forEach(function (a) {
      a.addEventListener("click", function (e) {
        e.preventDefault();
        var t = $(a.getAttribute("href"), sheet);
        if (t) sheet.scrollTo({ top: t.offsetTop - 150, behavior: "smooth" });
      });
    });
    if ("IntersectionObserver" in window) {
      var cvSpy = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (!e.isIntersecting) return;
          idxLinks.forEach(function (a) { a.classList.toggle("on", a.getAttribute("href") === "#" + e.target.id); });
        });
      }, { root: sheet, rootMargin: "-30% 0px -60% 0px" });
      $$(".cv-sec", sheet).forEach(function (s) { cvSpy.observe(s); });
    }
  }
})();
