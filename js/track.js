(function(){
  try{
    if(!window.DXB || DXB.SUPA_KEY.indexOf("__")===0) return;
    var path = location.pathname || "/";
    var slug = null;
    var m = path.match(/reviews\/([a-z0-9\-]+)\.html/i);
    if(m) slug = m[1];
    var qp = new URLSearchParams(location.search);
    if(!slug && path.indexOf("review.html") > -1) slug = qp.get("slug");
    var ref = document.referrer || "";
    var src = "direct";
    var utm = qp.get("utm_source");
    if(utm){ src = utm.toLowerCase(); }
    else if(/instagram\.com/i.test(ref)){ src = "instagram"; }
    else if(/tiktok\.com/i.test(ref)){ src = "tiktok"; }
    else if(/google\./i.test(ref)){ src = "google"; }
    else if(/bing\.|duckduckgo\./i.test(ref)){ src = "search"; }
    else if(ref){ src = "other"; }
    var k = "dxbpv_" + path + (slug||"");
    if(sessionStorage.getItem(k)) return;
    sessionStorage.setItem(k, "1");
    fetch(DXB.SUPA_URL + "/rest/v1/page_views", {
      method: "POST",
      headers: { "apikey": DXB.SUPA_KEY, "Authorization": "Bearer " + DXB.SUPA_KEY, "Content-Type": "application/json", "Prefer": "return=minimal" },
      body: JSON.stringify({ path: path, review_slug: slug, referrer: ref.slice(0,300), source: src })
    });
  }catch(e){}
})();
