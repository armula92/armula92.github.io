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
})();
