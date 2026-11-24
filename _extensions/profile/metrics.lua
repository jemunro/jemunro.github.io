-- {{< metrics >}}: placeholder for live OpenAlex author metrics (h-index, i10-index, citations per
-- year). Nothing is fetched at build time: metrics.js reads the author ID from the `openalex`
-- profile link in _variables.yml and queries the OpenAlex API in the browser. If there is no
-- OpenAlex link, nothing is emitted. Without JavaScript (or if the request fails) the block stays
-- hidden, so the site is unaffected.
return {
  ["metrics"] = function()
    local v = quarto.variables.get("openalex")
    local url = v and pandoc.utils.stringify(v) or ""
    local id = url:match("/(A%d+)$") or url:match("/(a%d+)$")
    if not id then return pandoc.Null() end
    quarto.doc.add_html_dependency({
      name = "metrics", version = "1.0.0",
      scripts = { { path = "metrics.js", afterBody = true } },
    })
    return pandoc.RawBlock("html",
      '<div class="author-metrics" data-openalex-author="' .. id:upper() .. '" hidden>\n<p><strong>Metrics</strong></p></div>')
  end
}
