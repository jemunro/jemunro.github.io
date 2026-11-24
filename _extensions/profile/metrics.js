// Live author metrics from OpenAlex (keyless, CORS-enabled): h-index, i10-index and citations per
// year. Fetched on every page view; nothing is cached or stored. On any failure the block stays
// hidden and the rest of the page is unaffected.
(function () {
  var NS = "http://www.w3.org/2000/svg";
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function svg(tag, attrs) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }

  function chart(rows) {
    var W = 200, H = 64, gap = 2;
    var max = Math.max.apply(null, rows.map(function (r) { return r.n; })) || 1;
    var bw = (W - gap * (rows.length - 1)) / rows.length;
    var s = svg("svg", { viewBox: "0 0 " + W + " " + H, class: "metrics-chart", role: "img",
      "aria-label": "Citations per year, " + rows[0].year + " to " + rows[rows.length - 1].year });
    rows.forEach(function (r, i) {
      var h = Math.max(r.n ? 1 : 0, Math.round((r.n / max) * (H - 2)));
      var b = svg("rect", { x: i * (bw + gap), y: H - h, width: bw, height: h, class: "metrics-bar" });
      b.appendChild(svg("title", {})).textContent = r.year + ": " + r.n + " citation" + (r.n === 1 ? "" : "s");
      s.appendChild(b);
    });
    return s;
  }

  document.querySelectorAll(".author-metrics").forEach(function (box) {
    var id = box.getAttribute("data-openalex-author");
    var url = "https://api.openalex.org/authors/" + encodeURIComponent(id) +
      "?select=summary_stats,counts_by_year,cited_by_count";
    fetch(url).then(function (r) {
      if (!r.ok) throw new Error(r.status);
      return r.json();
    }).then(function (a) {
      var st = a.summary_stats || {};
      if (st.h_index == null || st.i10_index == null) return;

      var stats = el("dl", "metrics-stats");
      [["h-index", st.h_index], ["i10-index", st.i10_index], ["Citations", a.cited_by_count]]
        .forEach(function (p) {
          if (p[1] == null) return;
          var d = el("div");
          d.appendChild(el("dd", null, p[1]));
          d.appendChild(el("dt", null, p[0]));
          stats.appendChild(d);
        });
      box.appendChild(stats);

      // Citations per year for the last 10 years, ending this year (OpenAlex omits empty years).
      var by = {}, years = [];
      (a.counts_by_year || []).forEach(function (c) { by[c.year] = c.cited_by_count; years.push(c.year); });
      if (years.length) {
        var hi = Math.max(new Date().getFullYear(), Math.max.apply(null, years)), lo = hi - 9, rows = [];
        for (var y = lo; y <= hi; y++) rows.push({ year: y, n: by[y] || 0 });
        box.appendChild(chart(rows));
        var ax = el("div", "metrics-axis");
        ax.appendChild(el("span", null, lo));
        ax.appendChild(el("span", null, "citations per year"));
        ax.appendChild(el("span", null, hi));
        box.appendChild(ax);
      }
      var src = el("a", "metrics-source", "Source: OpenAlex");
      src.href = "https://openalex.org/authors/" + id.toLowerCase();
      box.appendChild(src);
      box.hidden = false;
    }).catch(function () { /* leave hidden */ });
  });
})();
