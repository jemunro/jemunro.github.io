-- {{< profile-links >}}: renders a list of profile links from _variables.yml.
-- Only keys that are present and non-empty are shown; nothing else is emitted.
-- Icons come from Bootstrap Icons (bundled with Quarto); ORCID has no glyph there, so CSS draws it.
local links = {
  { key = "github",   label = "GitHub",         icon = "bi bi-github" },
  { key = "orcid",    label = "ORCID",          icon = "pl-orcid" },
  { key = "scholar",  label = "Google Scholar", icon = "bi bi-mortarboard" },
  { key = "openalex", label = "OpenAlex",       icon = "bi bi-graph-up" },
  { key = "wehi",     label = "WEHI profile",   icon = "bi bi-building" },
  { key = "linkedin", label = "LinkedIn",       icon = "bi bi-linkedin" },
  { key = "email",    label = "Email",          icon = "bi bi-envelope", prefix = "mailto:" },
  { key = "cv",       label = "CV",             icon = "bi bi-file-earmark-text" },
}

local function icon(cls)
  return pandoc.RawInline("html", '<i class="pl-icon ' .. cls .. '" aria-hidden="true"></i>')
end

-- Plain string value of a profile variable, or nil if absent/empty.
local function var(key)
  local v = quarto.variables.get(key)
  local s = v and pandoc.utils.stringify(v) or ""
  return s ~= "" and s or nil
end

return {
  ["profile-links"] = function()
    local items = {}
    for _, l in ipairs(links) do
      local v = quarto.variables.get(l.key)
      local url = v and pandoc.utils.stringify(v) or ""
      if url ~= "" then
        items[#items + 1] = { pandoc.Plain({
          pandoc.Link({ icon(l.icon), pandoc.Str(l.label) }, (l.prefix or "") .. url)
        }) }
      end
    end
    if #items == 0 then return pandoc.Null() end
    return pandoc.Div({ pandoc.BulletList(items) }, pandoc.Attr("", { "profile-links" }))
  end,

  -- {{< sidebar-keywords >}}: every keyword in content/keywords.yml (the shared vocabulary), in
  -- file order, as keyword chips. They are the same kind of button as the keywords on entries
  -- (data-tag), so catalogue.js makes them filter the catalogue on the current page and fills in
  -- the count of matching entries.
  ["sidebar-keywords"] = function()
    local root = quarto.project.directory or "."
    local fh = io.open(pandoc.path.join({ root, "content", "keywords.yml" }), "r")
    if not fh then return pandoc.Null() end
    local text = fh:read("a"); fh:close()
    local meta = pandoc.read("---\n" .. text .. "\n---\n", "markdown").meta
    local tags = {}
    for _, g in ipairs(meta.groups or {}) do
      for _, kw in ipairs(g.keywords or {}) do
        local esc = pandoc.utils.stringify(kw):gsub("&", "&amp;"):gsub("<", "&lt;"):gsub(">", "&gt;"):gsub('"', "&quot;")
        tags[#tags + 1] = '<button type="button" class="tag tag-kw" data-tag="' .. esc .. '">' .. esc
          .. '<span class="tag-count"></span></button>'
      end
    end
    if #tags == 0 then return pandoc.Null() end
    return pandoc.RawBlock("html", '<div class="focus-tags">' .. table.concat(tags, " ") .. '</div>')
  end,

  -- {{< person-jsonld >}}: schema.org Person structured data (JSON-LD) injected into the page head,
  -- built only from _variables.yml (name, position, affiliation, bio, photo and the profile links),
  -- so it cannot drift from what the page shows. Nothing is emitted without a site-url.
  ["person-jsonld"] = function()
    -- Shortcodes cannot see project metadata, so read site-url from _quarto.yml (single source of truth).
    local site
    local root = quarto.project.directory or "."
    local fh = io.open(pandoc.path.join({ root, "_quarto.yml" }), "r")
    if fh then
      local m = pandoc.read("---\n" .. fh:read("a") .. "\n---\n", "markdown").meta
      fh:close()
      site = m.website and m.website["site-url"] and pandoc.utils.stringify(m.website["site-url"]) or nil
    end
    local name = var("name")
    if not site or not name then return pandoc.Null() end
    site = site:gsub("/+$", "")
    local same = {}
    for _, k in ipairs({ "github", "orcid", "scholar", "openalex", "wehi", "linkedin" }) do
      same[#same + 1] = var(k)
    end
    local person = {
      ["@context"] = "https://schema.org", ["@type"] = "Person",
      name = name, url = site .. "/", description = var("bio"), jobTitle = var("position"),
      image = var("photo") and (site .. "/" .. var("photo")) or nil,
      worksFor = var("affiliation") and { ["@type"] = "Organization", name = var("affiliation") } or nil,
      sameAs = #same > 0 and same or nil,
    }
    quarto.doc.include_text("in-header",
      '<script type="application/ld+json">' .. pandoc.json.encode(person) .. "</script>")
    return pandoc.Null()
  end
}
