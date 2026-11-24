// Client-side search, keyword filter and sorting for the catalogue lists.
// Everything is derived from the rendered entries (title, description, keyword buttons and
// data-* attributes written by catalogue.lua); nothing here lists entries or keywords.
// Without JavaScript the plain list is shown in its default order.
(function () {
  var norm = function (s) { return (s || "").toLowerCase().replace(/\s+/g, " ").trim(); };
  var SORTS = {
    publications: [
      ["default", "Featured first, then newest"], ["newest", "Newest first"],
      ["oldest", "Oldest first"], ["title", "Title A–Z"]],
    software: [
      ["default", "Featured first, then A–Z"], ["title", "A–Z"],
      ["title-desc", "Z–A"], ["newest", "Newest first"]],
  };

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  document.querySelectorAll(".catalogue-app").forEach(function (app) {
    var kind = app.getAttribute("data-kind");
    var list = app.querySelector(".catalogue");
    var items = Array.prototype.slice.call(list.children).map(function (li) {
      var d = li.querySelector(".entry-desc");
      return {
        li: li,
        text: norm(li.getAttribute("data-title") + " " + (d ? d.textContent : "") + " " +
          Array.prototype.map.call(li.querySelectorAll("[data-tag]"), function (b) { return b.getAttribute("data-tag"); }).join(" ")),
        title: norm(li.getAttribute("data-title")),
        date: li.getAttribute("data-date") || "0000-00-00",
        featured: li.getAttribute("data-featured") === "true",
        tags: Array.prototype.map.call(li.querySelectorAll("[data-tag]"), function (b) {
          return norm(b.getAttribute("data-tag"));
        }),
      };
    });

    var state = { q: "", tags: [], sort: "default" };

    // Sidebar keyword chips (outside the list): show how many entries on this page carry each
    // keyword, and act as the same filter as the keywords on the entries.
    var sideChips = Array.prototype.slice.call(document.querySelectorAll(".focus-tags [data-tag]"));
    // Chips with no entries on this page are hidden; the rest are ordered by count (highest
    // first), keeping the vocabulary order (keywords.yml) between equal counts.
    var counted = sideChips.map(function (b, i) {
      var k = norm(b.getAttribute("data-tag"));
      var n = items.filter(function (it) { return it.tags.indexOf(k) >= 0; }).length;
      var c = b.querySelector(".tag-count");
      if (c) c.textContent = n;
      b.hidden = n === 0;
      b.addEventListener("click", function () { toggle(k); });
      return { b: b, n: n, i: i };
    });
    counted.sort(function (a, b) { return (b.n - a.n) || (a.i - b.i); });
    counted.forEach(function (x) { x.b.parentNode.appendChild(x.b); });

    // ---- Toolbar ----
    var bar = el("div", "catalogue-bar");
    bar.setAttribute("role", "search");
    var row = el("div", "catalogue-row");
    var search = el("input", "form-control catalogue-search");
    search.type = "search";
    search.placeholder = "Search titles, descriptions and keywords";
    search.setAttribute("aria-label", "Search " + kind);
    var sort = el("select", "form-select catalogue-sort");
    sort.setAttribute("aria-label", "Sort " + kind);
    (SORTS[kind] || SORTS.publications).forEach(function (o) {
      var op = el("option", null, o[1]); op.value = o[0]; sort.appendChild(op);
    });
    var clear = el("button", "btn btn-sm catalogue-clear", "Clear");
    clear.type = "button";
    clear.title = "Clear search and filters";
    row.appendChild(search); row.appendChild(sort); row.appendChild(clear);
    // Sit in the tab bar (right of the tabs) to save vertical space; wraps below on narrow screens
    var tabs = document.querySelector(".site-tabs");
    if (tabs) { row.classList.add("in-tabs"); tabs.appendChild(row); } else { bar.appendChild(row); }

    var status = el("div", "catalogue-status");
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");
    bar.appendChild(status);
    var empty = el("div", "catalogue-empty");
    empty.hidden = true;
    empty.appendChild(el("p", null, "No entries match your search or filters."));
    var clear2 = el("button", "btn btn-sm catalogue-clear-inline", "Clear search and filters");
    clear2.type = "button";
    empty.appendChild(clear2);
    app.insertBefore(bar, list);
    app.appendChild(empty);

    function toggle(k) {
      var i = state.tags.indexOf(k);
      if (i < 0) state.tags.push(k); else state.tags.splice(i, 1);
      update();
    }
    function reset() {
      state.q = ""; state.tags = []; state.sort = "default";
      search.value = ""; sort.value = "default"; update();
    }

    function compare(a, b) {
      var t = a.title < b.title ? -1 : a.title > b.title ? 1 : 0;
      switch (state.sort) {
        case "newest": return (b.date < a.date ? -1 : b.date > a.date ? 1 : 0) || t;
        case "oldest": return (a.date < b.date ? -1 : a.date > b.date ? 1 : 0) || t;
        case "title": return t;
        case "title-desc": return -t;
        default:
          if (a.featured !== b.featured) return a.featured ? -1 : 1;
          if (kind === "publications" && a.date !== b.date) return a.date < b.date ? 1 : -1;
          return t;
      }
    }

    function update() {
      var words = norm(state.q).split(" ").filter(Boolean);
      var shown = 0;
      items.forEach(function (it) {
        it.show = words.every(function (w) { return it.text.indexOf(w) >= 0; }) &&
          state.tags.every(function (k) { return it.tags.indexOf(k) >= 0; });
      });
      items.slice().sort(compare).forEach(function (it) {
        list.appendChild(it.li);
        it.li.hidden = !it.show;
        if (it.show) shown++;
      });
      // Keep each entry's own keyword buttons in step with the active filter
      Array.prototype.concat.call(
        Array.prototype.slice.call(app.querySelectorAll(".catalogue [data-tag]")), sideChips
      ).forEach(function (b) {
        var on = state.tags.indexOf(norm(b.getAttribute("data-tag"))) >= 0;
        b.classList.toggle("active", on);
        b.setAttribute("aria-pressed", on ? "true" : "false");
      });
      var active = !!(words.length || state.tags.length || state.sort !== "default");
      clear.hidden = !active;
      empty.hidden = shown > 0;
      list.hidden = shown === 0;
      var names = state.tags.map(function (k) {
        var l = k;
        app.querySelectorAll(".catalogue [data-tag]").forEach(function (x) { if (norm(x.getAttribute("data-tag")) === k) l = x.getAttribute("data-tag"); });
        return l;
      });
      status.textContent = (words.length || state.tags.length)
        ? shown + " of " + items.length + (items.length === 1 ? " entry" : " entries") +
          (names.length ? " · keyword: " + names.join(" + ") : "") : "";
    }

    search.addEventListener("input", function () { state.q = search.value; update(); });
    sort.addEventListener("change", function () { state.sort = sort.value; update(); });
    clear.addEventListener("click", reset);
    clear2.addEventListener("click", reset);
    // A publication card toggles when clicked anywhere on it (the header already does, natively).
    // Links, keyword buttons and the header itself keep their own behaviour, and selecting text
    // does not toggle. Without JavaScript only the header toggles.
    list.addEventListener("click", function (e) {
      var card = e.target.closest && e.target.closest(".entry-collapsible");
      if (!card || e.target.closest("a, button, summary")) return;
      var sel = window.getSelection && window.getSelection();
      if (sel && !sel.isCollapsed && card.contains(sel.anchorNode)) return;
      var d = card.querySelector("details");
      if (d) d.open = !d.open;
    });
    // Clicking a keyword on an entry toggles that filter
    list.addEventListener("click", function (e) {
      var b = e.target.closest && e.target.closest("[data-tag]");
      if (b) toggle(norm(b.getAttribute("data-tag")));
    });
    update();
  });
})();
