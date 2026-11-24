-- {{< catalogue publications >}} / {{< catalogue software >}}
-- Renders content/<kind>/*.md (YAML front matter + Markdown body) as the compact catalogue list.
-- Layout/markup lives here and in styles.scss; entries are data only. Adding, editing or
-- removing an entry means editing files in content/ - never this file.
-- (Why not a native Quarto listing: it cannot show the Markdown body as the description and
-- would generate an unwanted detail page per entry. See PLAN.md, Stage 3.)

local ROLE_LABELS = {
  first = "First author", senior = "Senior author",
  corresponding = "Corresponding author", coauthor = nil,  -- coauthor: no badge (default)
}
local VALID_ROLES = { first = true, senior = true, corresponding = true, coauthor = true }
local VALID_STATUS = { preprint = true, published = true }

local function esc(s)
  return (tostring(s):gsub("&", "&amp;"):gsub("<", "&lt;"):gsub(">", "&gt;"):gsub('"', "&quot;"))
end

-- Metadata helpers (pandoc gives MetaInlines/MetaList/booleans)
local function str(v)
  if v == nil then return nil end
  if type(v) == "boolean" then return tostring(v) end
  return pandoc.utils.stringify(v)
end
local function list(v)
  local out = {}
  if v == nil then return out end
  if type(v) == "table" and v.t == nil then
    for _, x in ipairs(v) do out[#out + 1] = str(x) end
  else
    out[1] = str(v)
  end
  return out
end
local function flag(v)
  return v == true or (type(v) ~= "nil" and str(v) == "true")
end

local function fail(file, msg)
  error(string.format("catalogue: %s: %s", file, msg), 0)
end

-- Sort key: "YYYY[-MM[-DD]]"; a missing month/day sorts as the latest of that period.
local function date_key(d)
  local y, m, day = (d or ""):match("^(%d%d%d%d)-?(%d*)-?(%d*)")
  if not y then return "0000-00-00" end
  return string.format("%s-%s-%s", y, m ~= "" and m or "99", day ~= "" and day or "99")
end

local function load_entries(kind)
  local root = quarto.project.directory or "."
  local dir = pandoc.path.join({ root, "content", kind })
  local names = pandoc.system.list_directory(dir)
  table.sort(names)
  local entries, seen = {}, {}
  for _, name in ipairs(names) do
    if name:match("%.md$") and not name:match("^[_.]") then
      local path = pandoc.path.join({ dir, name })
      local fh = assert(io.open(path, "r"))
      local text = fh:read("a"); fh:close()
      local doc = pandoc.read(text, "markdown")
      local m = doc.meta
      local e = {
        file = "content/" .. kind .. "/" .. name,
        id = str(m.id), title = str(m.title), date = str(m.date),
        featured = flag(m.featured), exclude = flag(m.exclude),
        tags = list(m.tags), body = doc.blocks, meta = m,
      }
      if not e.id then fail(e.file, "missing required field 'id'") end
      if seen[e.id] then fail(e.file, "duplicate id '" .. e.id .. "'") end
      seen[e.id] = true
      if not e.title then fail(e.file, "missing required field 'title'") end
      e.sort = date_key(e.date)
      entries[#entries + 1] = e
    end
  end
  return entries
end

local function by_id(entries)
  local t = {}
  for _, e in ipairs(entries) do t[e.id] = e end
  return t
end

-- Default order (also the no-JavaScript order): featured first, then newest first when by_date
-- (publications) or alphabetical (software). catalogue.js can re-sort on request; authorship
-- roles never affect order.
local function sort_entries(entries, by_date)
  table.sort(entries, function(a, b)
    if a.featured ~= b.featured then return a.featured end
    if by_date and a.sort ~= b.sort then return a.sort > b.sort end
    return a.title:lower() < b.title:lower()
  end)
end

local function description_html(e)
  local out = {}
  for _, b in ipairs(e.body) do
    if b.t == "Para" or b.t == "Plain" then
      local h = pandoc.write(pandoc.Pandoc({ pandoc.Plain(b.content) }), "html"):gsub("%s+$", "")
      out[#out + 1] = '<p class="entry-desc">' .. h .. '</p>'
    else
      out[#out + 1] = pandoc.write(pandoc.Pandoc({ b }), "html"):gsub("%s+$", "")
    end
  end
  return table.concat(out, "\n")
end

-- Author lists. The site owner is recognised by surname + first initial, both taken from the
-- `name` variable in _variables.yml (e.g. "Jacob E Munro" -> surname "munro", initial "j"), so
-- publisher variants such as "Jacob Munro" / "J. E. Munro" all match. Two-word surnames and
-- other people with the same surname and initial are not distinguished.
local function owner_key()
  local v = quarto.variables.get("name")
  local name = v and pandoc.utils.stringify(v) or ""
  local words = {}
  for w in name:gmatch("%S+") do words[#words + 1] = w end
  if #words < 2 then return nil end
  return { surname = words[#words]:lower(), initial = words[1]:sub(1, 1):lower() }
end
local OWNER, owner_loaded = nil, false  -- read lazily: variables are not available when the filter loads

local function is_owner(author)
  if not owner_loaded then OWNER, owner_loaded = owner_key(), true end
  if not OWNER then return false end
  local words = {}
  for w in author:gmatch("%S+") do words[#words + 1] = w end
  if #words < 2 then return false end
  return words[#words]:lower() == OWNER.surname and words[1]:sub(1, 1):lower() == OWNER.initial
end

-- Returns the full list and the collapsed list as HTML. Collapsed: first author, last author
-- and the owner (always, in bold), with "…" wherever authors are left out; lists of three or
-- fewer are never shortened. The owner is bold in both.
local function authors_html(authors)
  local n = #authors
  local function item(i)
    local a = esc(authors[i])
    return is_owner(authors[i]) and ("<strong>" .. a .. "</strong>") or a
  end
  local full, short, skipped = {}, {}, false
  for i = 1, n do
    full[#full + 1] = item(i)
    if n <= 3 or i == 1 or i == n or is_owner(authors[i]) then
      short[#short + 1] = item(i)
      skipped = false
    elseif not skipped then
      short[#short + 1] = "…"
      skipped = true
    end
  end
  return table.concat(full, ", "), table.concat(short, ", ")
end

local function render_entry(prefix, e, title_url, meta_html, links, collapsible)
  local tags = {}
  -- Role chips use the same data-tag mechanism as keywords, so catalogue.js filters on them too
  for _, label in ipairs(e.role_chips or {}) do
    tags[#tags + 1] = '<button type="button" class="tag tag-kw tag-role" data-tag="' .. esc(label) .. '">' .. esc(label) .. '</button>'
  end
  for _, t in ipairs(e.tags) do
    tags[#tags + 1] = '<button type="button" class="tag tag-kw" data-tag="' .. esc(t) .. '">' .. esc(t) .. '</button>'
  end
  local lk = {}
  for _, l in ipairs(links) do lk[#lk + 1] = '<a href="' .. esc(l.url) .. '">' .. esc(l.label) .. '</a>' end
  -- Collapsible (publication) cards: the title is plain text, because clicking it toggles the
  -- card; the link to the paper is the venue in the meta line instead.
  local title_text = collapsible and esc(e.title) or ('<a href="' .. esc(title_url) .. '">' .. esc(e.title) .. '</a>')
  local title_html = '<div class="entry-title">' .. (e.featured and '<span class="tag tag-featured">Featured</span> ' or "")
    .. title_text .. '</div>'
  local meta_div = '<div class="entry-meta">' .. meta_html .. '</div>'
  local foot = '<div class="entry-foot"><span class="entry-tags">' .. table.concat(tags, " ") .. '</span>'
    .. '<span class="entry-links">' .. table.concat(lk, " · ") .. '</span></div>'
  local open = string.format('<li class="entry%s%s" id="%s-%s" data-featured="%s" data-date="%s" data-title="%s">',
    e.featured and " featured" or "", collapsible and " entry-collapsible" or "", prefix, esc(e.id),
    tostring(e.featured), esc(e.sort), esc(e.title))
  if collapsible then
    -- Native <details>: starts collapsed, works without JavaScript. Title, authors, keywords and
    -- links stay visible; only the description is folded away. The description stays in the
    -- DOM, so search still finds it.
    return table.concat({
      open,
      '<details class="entry-card">',
      '<summary class="entry-summary"><span class="entry-head">' .. title_html .. meta_div .. '</span></summary>',
      description_html(e),
      '</details>',
      foot,
      '</li>',
    }, "\n")
  end
  return table.concat({ open, title_html, meta_div, description_html(e), foot, '</li>' }, "\n")
end

local function doi_url(doi) return "https://doi.org/" .. doi end

local function build(kind)
  local pubs = load_entries("publications")
  local sws = load_entries("software")
  local pub_by, sw_by = by_id(pubs), by_id(sws)

  -- Validate and read type-specific fields
  for _, p in ipairs(pubs) do
    local m = p.meta
    p.doi, p.venue = str(m.doi), str(m.venue)
    p.authors = list(m.authors)
    p.status = str(m.status) or "published"
    p.roles = list(m.roles)
    p.related = list(m["related-software"])
    if not p.doi then fail(p.file, "missing required field 'doi'") end
    if not VALID_STATUS[p.status] then fail(p.file, "status must be preprint or published") end
    for _, r in ipairs(p.roles) do
      if not VALID_ROLES[r] then fail(p.file, "unknown role '" .. r .. "'") end
    end
    for _, id in ipairs(p.related) do
      if not sw_by[id] then quarto.log.warning(p.file .. ": related-software '" .. id .. "' not found") end
    end
  end
  for _, s in ipairs(sws) do
    s.github = str(s.meta.github)
    s.related = list(s.meta["related-publications"])
    if not s.github then fail(s.file, "missing required field 'github'") end
    for _, id in ipairs(s.related) do
      if not pub_by[id] then quarto.log.warning(s.file .. ": related-publications '" .. id .. "' not found") end
    end
  end

  local out = {}
  if kind == "publications" then
    sort_entries(pubs, true)
    for _, p in ipairs(pubs) do
      if not p.exclude then
        local meta = {}
        if #p.authors > 0 then
          local full, short = authors_html(p.authors)
          if full == short then
            meta[#meta + 1] = '<span class="authors">' .. full .. '</span>'
          else
            -- collapsed card shows `short`, an open card shows `full` (CSS swaps them)
            meta[#meta + 1] = '<span class="authors authors-short">' .. short .. '</span>'
              .. '<span class="authors authors-full">' .. full .. '</span>'
          end
        end
        if p.date then meta[#meta + 1] = esc(p.date:sub(1, 4)) end
        -- The venue (e.g. "arXiv preprint", "iScience") is the link to the paper; "DOI" if no venue
        local venue = p.venue and (p.status == "preprint" and p.venue .. " preprint" or p.venue)
          or (p.status == "preprint" and "Preprint" or "DOI")
        meta[#meta + 1] = '<a class="entry-ext" href="' .. esc(doi_url(p.doi)) .. '">' .. esc(venue) .. '</a>'
        -- Related software links sit right after the venue link
        for _, id in ipairs(p.related) do
          local s = sw_by[id]
          if s and not s.exclude then
            meta[#meta + 1] = '<a class="entry-ext" href="' .. esc(s.github) .. '">GitHub</a>'
          end
        end
        local mh = table.concat(meta, " · ")
        -- Authorship roles are shown as clickable chips at the start of the keyword row
        p.role_chips = {}
        for _, r in ipairs(p.roles) do
          if ROLE_LABELS[r] then p.role_chips[#p.role_chips + 1] = ROLE_LABELS[r] end
        end
        -- All external links are in the meta line, so the foot row holds keywords only
        out[#out + 1] = render_entry("pub", p, doi_url(p.doi), mh, {}, true)
      end
    end
  else
    sort_entries(sws, false)
    for _, s in ipairs(sws) do
      if not s.exclude then
        local links = { { label = "GitHub", url = s.github } }
        for _, id in ipairs(s.related) do
          local p = pub_by[id]
          if p and not p.exclude then links[#links + 1] = { label = p.venue or "DOI", url = doi_url(p.doi) } end
        end
        out[#out + 1] = render_entry("sw", s, s.github, "GitHub repository", links)
      end
    end
  end
  return '<div class="catalogue-app" data-kind="' .. kind .. '">\n<ul class="catalogue">\n'
    .. table.concat(out, "\n") .. '\n</ul>\n</div>'
end

return {
  ["catalogue"] = function(args)
    local kind = pandoc.utils.stringify(args[1] or "")
    if kind ~= "publications" and kind ~= "software" then
      error("catalogue: argument must be 'publications' or 'software'", 0)
    end
    quarto.doc.add_html_dependency({
      name = "catalogue", version = "1.0.0",
      scripts = { { path = "catalogue.js", afterBody = true } },
    })
    return pandoc.RawBlock("html", build(kind))
  end
}
