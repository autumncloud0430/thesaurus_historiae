/* THESAURUS HISTORIAE ― 全ページ横断検索の補助
   1) どのページにも右下に検索ボタン(search.html へ)を出す。「/」キーでも開く。
   2) search.html の結果から ?hl=語&c=前後の文脈(&p=勢力名) 付きで来たとき、
      該当箇所までスクロールして強調する(タブ・<details> は開き、年代地図では勢力のポップアップを開く)。 */
(function(){
  if (/(^|\/)search\.html$/.test(location.pathname)) return;
  var css = document.createElement('style');
  css.textContent =
    '.sj-btn{position:fixed;right:14px;bottom:14px;z-index:9000;width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;' +
    'background:var(--bg,#f1ecdf);border:1px solid rgba(var(--axr,139,111,78),.5);box-shadow:0 2px 10px rgba(0,0,0,.12);opacity:.88;transition:opacity .2s,transform .2s}' +
    '.sj-btn:hover{opacity:1;transform:scale(1.06)}.sj-btn svg{width:18px;height:18px;stroke:var(--gold,#8b6f4e)}' +
    '.sj-map .sj-btn{bottom:30px}' +
    'mark.sj-hit{background:rgba(162,51,30,.2);color:inherit;border-radius:2px;box-shadow:0 0 0 2px rgba(162,51,30,.2);animation:sjp 1.2s ease 2}' +
    '.sj-box{outline:2px solid rgba(162,51,30,.45);outline-offset:3px;border-radius:4px}' +
    '@keyframes sjp{50%{background:rgba(162,51,30,.42)}}' +
    '@media print{.sj-btn{display:none}}';
  document.head.appendChild(css);

  function addButton(){
    if (document.querySelector('.leaflet-container')) document.body.classList.add('sj-map');
    var a = document.createElement('a');
    a.className = 'sj-btn'; a.href = 'search.html'; a.title = '全ページ横断検索 ( / )'; a.setAttribute('aria-label', '全ページ横断検索');
    a.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke-width="2.2" stroke-linecap="round"><circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5L21 21"/></svg>';
    document.body.appendChild(a);
  }
  document.addEventListener('keydown', function(e){
    if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey) return;
    var t = e.target, tag = t && t.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (t && t.isContentEditable)) return;
    e.preventDefault(); location.href = 'search.html';
  });

  var IGN = /[\s　=＝・･·★☆]/g;
  function nz(s){ return s.normalize('NFKC').toLowerCase().replace(/[ぁ-ゖ]/g, function(c){ return String.fromCharCode(c.charCodeAt(0) + 96); }).replace(IGN, ''); }

  var IDX = null;
  function buildIndex(){
    var nodes = [], s = '', mp = [];
    var w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, { acceptNode: function(n){
      var p = n.parentNode;
      while (p && p !== document.body) { var t = p.nodeName; if (t === 'SCRIPT' || t === 'STYLE' || t === 'NOSCRIPT' || (p.classList && p.classList.contains('sj-btn'))) return NodeFilter.FILTER_REJECT; p = p.parentNode; }
      return NodeFilter.FILTER_ACCEPT; } });
    var n;
    while ((n = w.nextNode())) {
      var t = n.nodeValue, ni = nodes.length; nodes.push(n);
      for (var i = 0; i < t.length; i++) { var z = nz(t.charAt(i)); for (var k = 0; k < z.length; k++) { s += z.charAt(k); mp.push([ni, i]); } }
    }
    return { nodes: nodes, s: s, mp: mp };
  }
  function locate(str, from){
    if (!str) return null;
    var q = nz(str); if (!q) return null;
    var j = IDX.s.indexOf(q, from || 0); if (j < 0) return null;
    return { a: j, b: j + q.length };
  }
  function wrap(r){
    // wrap IDX.s[r.a, r.b) in <mark>, one piece per text node; returns first mark
    var first = null, pieces = [], cur = null;
    for (var k = r.a; k < r.b; k++) {
      var m = IDX.mp[k];
      if (!cur || cur.ni !== m[0]) { cur = { ni: m[0], s: m[1], e: m[1] + 1 }; pieces.push(cur); } else cur.e = m[1] + 1;
    }
    for (var i = pieces.length - 1; i >= 0; i--) {
      var p = pieces[i], node = IDX.nodes[p.ni];
      try {
        var mid = node.splitText(p.s); mid.splitText(p.e - p.s);
        var mk = document.createElement('mark'); mk.className = 'sj-hit';
        mid.parentNode.insertBefore(mk, mid); mk.appendChild(mid); first = mk;
      } catch (e) {}
    }
    return first;
  }
  function reveal(el){
    for (var p = el; p && p !== document.body; p = p.parentElement) {
      if (p.tagName === 'DETAILS') p.open = true;
      var m = p.id && p.id.match(/^content(\d+)$/);
      if (m && /\bhidden\b/.test(p.className) && typeof switchTab === 'function') { try { switchTab(+m[1]); } catch (e) {} }
    }
  }
  function visible(el){ return el && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden'; }

  function worldPopup(name){
    if (typeof map === 'undefined' || !map || !map.eachLayer) return false;
    var best = null;
    map.eachLayer(function(l){
      var f = l.feature; if (!f || !f.properties || !l.getBounds) return;
      var n = f.properties.NAME || '', j = (typeof ja === 'function') ? ja(n) : n;
      if (j !== name && n !== name) return;
      var c = l.getBounds().getCenter();
      if (!best || Math.abs(c.lng) < Math.abs(best.c.lng)) best = { l: l, c: c };
    });
    if (!best) return false;
    try { map.fitBounds(best.l.getBounds(), { maxZoom: 5, padding: [40, 40] }); } catch (e) {}
    setTimeout(function(){ try { best.l.openPopup(best.c); } catch (e) {} }, 450);
    return true;
  }

  function jump(){
    var u; try { u = new URL(location.href); } catch (e) { return; }
    var hl = u.searchParams.get('hl'), c = u.searchParams.get('c'), p = u.searchParams.get('p');
    if (!hl && !c && !p) return;
    if (p && worldPopup(p)) return;
    IDX = buildIndex();
    var r = locate(c) || locate(hl);
    if (!r) return;
    if (hl && c) { var h = locate(hl, r.a); if (h && h.a < r.b) r = h; }
    reveal(IDX.nodes[IDX.mp[r.a][0]].parentElement);
    var mk = wrap(r);
    if (!mk) return;
    var tgt = mk;
    while (tgt && tgt !== document.body && !visible(tgt)) tgt = tgt.parentElement;   // e.g. text inside a hidden tooltip
    if (tgt !== mk && tgt && tgt !== document.body) tgt.classList.add('sj-box');
    (tgt || mk).scrollIntoView({ block: 'center' });
  }

  function init(){ addButton(); setTimeout(jump, 120); }
  if (document.readyState === 'complete') init(); else window.addEventListener('load', init);
})();
