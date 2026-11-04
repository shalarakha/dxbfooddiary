// Server-renders guide pages (/g/:slug) so search engines see the full content without running JS.
const SUPA_URL = "https://hkvvbtvrpfjovxqglmdg.supabase.co";
const SUPA_KEY = "sb_publishable_hUfPOQznucWaOD8XDLeRXA_g81pDtCb";

function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}
function igUrl(v) {
  if (!v) return "";
  v = String(v).trim();
  return v.indexOf("http") === 0 ? v : "https://instagram.com/" + v.replace(/^@/, "");
}

module.exports = async (req, res) => {
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  const origin = "https://" + host;
  const slug = String((req.query && req.query.slug) || "").toLowerCase().replace(/[^a-z0-9-]/g, "");
  let tpl;
  try {
    tpl = await (await fetch(origin + "/guide")).text();
  } catch (e) {
    res.statusCode = 500; res.end("Error"); return;
  }
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  if (!slug) { res.statusCode = 404; res.end(tpl); return; }

  let c = null;
  try {
    const r = await fetch(SUPA_URL + "/rest/v1/collections?slug=eq." + encodeURIComponent(slug) + "&published=eq.true&select=*", {
      headers: { apikey: SUPA_KEY, Authorization: "Bearer " + SUPA_KEY }
    });
    const rows = await r.json();
    c = Array.isArray(rows) && rows[0] ? rows[0] : null;
  } catch (e) {
    res.setHeader("Cache-Control", "no-store");
    res.end(tpl); return; // fall back to client-side rendering
  }
  if (!c) { res.statusCode = 404; res.setHeader("Cache-Control", "s-maxage=60"); res.end(tpl); return; }

  const isArea = c.type === "area";
  const h1 = isArea ? "Where to eat in " + c.title : c.title;
  const title = c.seo_title || (h1 + " | DXB Food Diary");
  const introTxt = (c.intro || "").replace(/\s+/g, " ").trim();
  const desc = c.seo_description || (introTxt.length > 157 ? introTxt.slice(0, 157) + "..." : introTxt) || "Curated food guides from DXB Food Diary.";
  const canonical = origin + "/g/" + slug;
  const cover = c.cover_url ? (c.cover_url.indexOf("http") === 0 ? c.cover_url : origin + "/" + c.cover_url) : "";
  const items = Array.isArray(c.items) ? c.items : [];

  const head =
    '<title>' + esc(title) + '</title>\n' +
    '<meta name="description" content="' + esc(desc) + '">\n' +
    '<link rel="canonical" href="' + esc(canonical) + '">\n' +
    '<meta property="og:type" content="article">\n' +
    '<meta property="og:title" content="' + esc(title) + '">\n' +
    '<meta property="og:description" content="' + esc(desc) + '">\n' +
    '<meta property="og:url" content="' + esc(canonical) + '">\n' +
    (cover ? '<meta property="og:image" content="' + esc(cover) + '">\n' : "") +
    '<meta name="twitter:card" content="summary_large_image">\n' +
    '<script type="application/ld+json">' + JSON.stringify({
      "@context": "https://schema.org", "@type": "ItemList", name: h1, description: desc, url: canonical,
      numberOfItems: items.length,
      itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name || "" }))
    }).replace(/</g, "\\u003c") + '</script>';

  let html = tpl
    .replace(/<title>[\s\S]*?<\/title>/, "")
    .replace(/<meta name="description"[^>]*>/, head)
    .replace('<div class="pagehero" id="hero" style="display:none">', '<div class="pagehero" id="hero">')
    .replace('<h1 class="serif" id="cTitle"></h1>', '<h1 class="serif" id="cTitle">' + esc(h1) + '</h1>');

  if (c.intro) {
    const paras = c.intro.split(/\n\s*\n/).map(p => "<p>" + esc(p.trim()) + "</p>").join("");
    html = html.replace('<div class="intro" id="cIntro" style="display:none"></div>', '<div class="intro" id="cIntro" style="display:block">' + paras + '</div>');
  }
  if (!isArea && items.length) {
    const list = items.map((it, i) => {
      const links = [];
      if (it.menu) links.push('<a class="menupill" href="' + esc(it.menu) + '" target="_blank" rel="noopener">' + (slug === "marsa-boulevard" ? "Marsa Menu" : "Menu") + '</a>');
      if (it.instagram) links.push('<a href="' + esc(igUrl(it.instagram)) + '" target="_blank" rel="noopener" aria-label="Instagram">IG</a>');
      return '<article class="rank"><div class="num">' + (i + 1) + '</div><div><div class="trow"><h2 class="serif">' + esc(it.name) + '</h2>' +
        (links.length ? '<span class="tlinks">' + links.join("") + '</span>' : "") + '</div><p class="meta">' + esc(it.meta || "") + '</p>' +
        (it.blurb ? '<p class="blurb">' + esc(it.blurb) + '</p>' : "") + '</div></article>';
    }).join("");
    html = html.replace('<div class="rank-list" id="rankList"></div>', '<div class="rank-list" id="rankList">' + list + '</div>');
  }
  res.statusCode = 200;
  res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=86400");
  res.end(html);
};
