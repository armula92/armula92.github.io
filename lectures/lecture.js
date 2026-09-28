(function () {
  "use strict";
  var bar = document.getElementById("lxProgress");
  var body = document.querySelector(".lx-body");
  var onScroll = function () {
    if (!bar || !body) return;
    var r = body.getBoundingClientRect();
    var total = body.offsetHeight - window.innerHeight * 0.6;
    var done = Math.min(Math.max(-r.top + window.innerHeight * 0.2, 0), total);
    bar.style.width = (total > 0 ? (done / total) * 100 : 0) + "%";
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  var links = Array.prototype.slice.call(document.querySelectorAll(".lx-toc a"));
  if (links.length && "IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        links.forEach(function (a) { a.classList.toggle("on", a.getAttribute("href") === "#" + e.target.id); });
      });
    }, { rootMargin: "-20% 0px -70% 0px" });
    links.forEach(function (a) {
      var t = document.getElementById(a.getAttribute("href").slice(1));
      if (t) io.observe(t);
    });
  }
  /* ---------- view-only protection (lecture materials) ----------
     Deters casual copying/saving/printing. It cannot stop screenshots or developer tools. */
  if (document.body.classList.contains("lx-protected")) {
    var block = function (e) { e.preventDefault(); return false; };
    ["contextmenu", "copy", "cut", "dragstart", "selectstart"].forEach(function (ev) {
      document.addEventListener(ev, function (e) {
        if (ev === "selectstart" && e.target.closest && e.target.closest("input, textarea")) return;
        block(e);
      });
    });
    document.addEventListener("keydown", function (e) {
      var k = (e.key || "").toLowerCase();
      if ((e.ctrlKey || e.metaKey) && ["c", "x", "s", "p", "a", "u"].indexOf(k) > -1) block(e);
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && ["i", "j", "c", "s"].indexOf(k) > -1) block(e);
    });
    window.addEventListener("beforeprint", function () { document.body.classList.add("lx-printing"); });
    window.addEventListener("afterprint", function () { document.body.classList.remove("lx-printing"); });
  }
})();
