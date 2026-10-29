/* Übungs-Engine NT 5 · Temperatur und Wärme. Daten: window.PAGE */
(function () {
  "use strict";
  var P = window.PAGE;
  if (!P || window.NT5_LOCKED) return;
  var store = {
    get: function (k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  };
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function strip(h) { var d = document.createElement("div"); d.innerHTML = h; return d.textContent || ""; }
  function speak(text) {
    try {
      speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(text.replace(/°C/g, " Grad Celsius").replace(/−/g, "minus "));
      u.lang = "de-DE"; u.rate = 0.9; speechSynthesis.speak(u);
    } catch (e) {}
  }

  /* ---------- Thermometer-SVG ---------- */
  function thermoSVG(val, lo, hi, show, col) {
    col = col || "#C9553A";
    var top = 20, bot = 250;
    function y(v) { return bot - (v - lo) / (hi - lo) * (bot - top); }
    var s = '<svg viewBox="0 0 120 300"><rect x="30" y="5" width="60" height="290" rx="10" fill="#fff" stroke="#3B342C" stroke-width="2"/>' +
      '<rect x="54" y="' + (top - 6) + '" width="12" height="' + (bot - top + 18) + '" rx="6" fill="#EEF3F6" stroke="#3B342C" stroke-width="1.6"/>';
    for (var v = lo; v <= hi; v += 2) {
      var big = v % 10 === 0;
      s += '<line x1="66" x2="' + (66 + (big ? 12 : 6)) + '" y1="' + y(v) + '" y2="' + y(v) + '" stroke="#3B342C" stroke-width="' + (big ? 1.6 : 1) + '"/>';
      if (big) s += '<text x="50" y="' + (y(v) + 4) + '" font-size="12" font-weight="700" text-anchor="end" fill="#3B342C">' + String(v).replace("-", "−") + '</text>';
    }
    var vv = show ? val : lo;
    s += '<rect class="col" x="57" y="' + y(vv) + '" width="6" height="' + (bot + 14 - y(vv)) + '" fill="' + col + '"/>';
    s += '<circle cx="60" cy="268" r="12" fill="' + col + '" stroke="#3B342C" stroke-width="1.6"/>';
    s += '<text x="80" y="18" font-size="12" font-weight="700" fill="#3B342C">°C</text></svg>';
    return s;
  }
  function fmt(v) { return String(v).replace("-", "−") + " °C"; }

  /* ---------- Aufgaben-Renderer ---------- */
  var R = {};

  R.mc = function (t, body, api) {
    if (t.img) body.appendChild(el("div", "fig", P.img[t.img]));
    var hasImg = t.opts.some(function (o) { return o.img; });
    var box = el("div", "opts" + (hasImg ? " img" : ""));
    var order = shuffle(t.opts.map(function (_, i) { return i; }));
    var sel = null, btns = [];
    order.forEach(function (i) {
      var o = t.opts[i]; var b = el("button", "opt");
      b.innerHTML = (o.img ? P.img[o.img] : "") + "<span>" + (o.t || o) + "</span>";
      b.onclick = function () { if (api.locked()) return; btns.forEach(function (x) { x.classList.remove("sel"); }); b.classList.add("sel"); sel = i; api.ready(true); };
      b.dataset.i = i; btns.push(b); box.appendChild(b);
    });
    body.appendChild(box);
    api.max = 1;
    api.check = function () {
      btns.forEach(function (b) { var i = +b.dataset.i; if (i === t.a) b.classList.add("ok"); else if (i === sel) b.classList.add("bad"); });
      return sel === t.a ? 1 : 0;
    };
  };

  R.multi = function (t, body, api) {
    var box = el("div", "opts img"); var chosen = {}; var btns = [];
    t.opts.forEach(function (o, i) {
      var b = el("button", "opt"); b.innerHTML = (o.img ? P.img[o.img] : "") + "<span>" + o.t + "</span>";
      b.onclick = function () { if (api.locked()) return; chosen[i] = !chosen[i]; b.classList.toggle("sel", chosen[i]); api.ready(true); };
      btns.push(b); box.appendChild(b);
    });
    body.appendChild(box); api.max = t.opts.length;
    api.check = function () {
      var p = 0;
      btns.forEach(function (b, i) { var should = t.a.indexOf(i) >= 0; var ok = !!chosen[i] === should; if (ok) p++; if (should) b.classList.add(ok ? "ok" : "bad"); else if (chosen[i]) b.classList.add("bad"); });
      return p;
    };
  };

  R.tf = function (t, body, api) {
    if (t.img) body.appendChild(el("div", "fig", P.img[t.img]));
    var box = el("div", "tf"); var ans = []; var rows = [];
    t.items.forEach(function (it, i) {
      var r = el("div", "tfrow"); r.appendChild(el("span", "t", it[0]));
      [["richtig", true], ["falsch", false]].forEach(function (o) {
        var b = el("button", "", o[0]);
        b.onclick = function () { if (api.locked()) return; ans[i] = o[1]; r.querySelectorAll("button").forEach(function (x) { x.classList.remove("sel"); }); b.classList.add("sel"); api.ready(ans.filter(function (x) { return x !== undefined; }).length === t.items.length); };
        r.appendChild(b);
      });
      rows.push(r); box.appendChild(r);
    });
    body.appendChild(box); api.max = t.items.length;
    api.check = function () { var p = 0; t.items.forEach(function (it, i) { var ok = ans[i] === it[1]; if (ok) p++; rows[i].classList.add(ok ? "ok" : "bad"); }); return p; };
  };

  R.match = function (t, body, api) {
    var m = el("div", "match"); var L = el("div", "col"), Rr = el("div", "col");
    var pairs = {}, active = null, n = 0; var lb = [], rb = [];
    t.left.forEach(function (x, i) {
      var b = el("button", "mitem", x); b.dataset.i = i;
      b.onclick = function () { if (api.locked()) return; lb.forEach(function (y) { y.classList.remove("active"); }); active = i; b.classList.add("active"); };
      lb.push(b); L.appendChild(b);
    });
    shuffle(t.right.map(function (_, i) { return i; })).forEach(function (j) {
      var b = el("button", "mitem", t.right[j]); b.dataset.j = j;
      b.onclick = function () {
        if (api.locked() || active === null) return;
        Object.keys(pairs).forEach(function (k) { if (pairs[k] === j) delete pairs[k]; });
        pairs[active] = j; redraw(); active = null; lb.forEach(function (y) { y.classList.remove("active"); });
        api.ready(Object.keys(pairs).length === t.left.length);
      };
      rb.push(b); Rr.appendChild(b);
    });
    function redraw() {
      rb.forEach(function (b) { var tg = b.querySelector(".tag"); if (tg) tg.remove(); });
      lb.forEach(function (b) { var tg = b.querySelector(".tag"); if (tg) tg.remove(); });
      Object.keys(pairs).forEach(function (k) {
        var letter = String.fromCharCode(65 + (+k));
        lb[k].appendChild(el("span", "tag", letter));
        rb.forEach(function (b) { if (+b.dataset.j === pairs[k]) b.appendChild(el("span", "tag", letter)); });
      });
    }
    m.appendChild(L); m.appendChild(Rr); body.appendChild(el("p", "sub", "Tippe links, dann rechts.")); body.appendChild(m);
    api.max = t.left.length;
    api.check = function () { var p = 0; lb.forEach(function (b, i) { var ok = pairs[i] === i; if (ok) p++; b.classList.add(ok ? "ok" : "bad"); }); return p; };
  };

  R.cloze = function (t, body, api) {
    var parts = t.text.split(/\{(.+?)\}/); var answers = [], gaps = [], fill = [];
    var p = el("p", "cloze"); var active = null;
    parts.forEach(function (s, i) {
      if (i % 2 === 0) { p.appendChild(document.createTextNode(s)); return; }
      var k = answers.length; answers.push(s);
      var g = el("button", "gap", "&nbsp;"); g.onclick = function () { if (api.locked()) return; if (fill[k]) { release(k); } gaps.forEach(function (x) { x.classList.remove("active"); }); active = k; g.classList.add("active"); };
      gaps.push(g); p.appendChild(g);
    });
    var bank = el("div", "bank"); var chips = [];
    shuffle(answers.concat(t.extra || [])).forEach(function (w) {
      var c = el("button", "chip", w);
      c.onclick = function () {
        if (api.locked() || c.classList.contains("used")) return;
        if (active === null) { active = fill.findIndex ? firstEmpty() : 0; }
        if (active === null || active < 0) return;
        if (fill[active]) release(active);
        fill[active] = c; c.classList.add("used"); gaps[active].textContent = w; gaps[active].classList.remove("active");
        active = firstEmpty(); if (active >= 0) gaps[active].classList.add("active"); else active = null;
        api.ready(firstEmpty() < 0);
      };
      chips.push(c); bank.appendChild(c);
    });
    function firstEmpty() { for (var i = 0; i < answers.length; i++) if (!fill[i]) return i; return -1; }
    function release(k) { if (fill[k]) { fill[k].classList.remove("used"); fill[k] = null; gaps[k].innerHTML = "&nbsp;"; api.ready(false); } }
    active = 0; gaps[0] && gaps[0].classList.add("active");
    body.appendChild(p); body.appendChild(bank); api.max = answers.length;
    api.check = function () { var pt = 0; answers.forEach(function (a, i) { var ok = fill[i] && fill[i].textContent === a; if (ok) pt++; gaps[i].classList.add(ok ? "ok" : "bad"); if (!ok) gaps[i].title = a; }); return pt; };
    api.solution = function () { answers.forEach(function (a, i) { if (!gaps[i].classList.contains("ok")) gaps[i].innerHTML = "<s>" + (fill[i] ? fill[i].textContent : "") + "</s> " + a; }); };
  };

  R.order = function (t, body, api) {
    var box = el("div", "olist"); var seq = []; var cards = [];
    body.appendChild(el("p", "sub", "Tippe die Sätze in der richtigen Reihenfolge an."));
    shuffle(t.items.map(function (_, i) { return i; })).forEach(function (i) {
      var c = el("button", "ocard", '<span class="n"></span><span>' + t.items[i] + "</span>"); c.dataset.i = i;
      c.onclick = function () {
        if (api.locked()) return;
        var pos = seq.indexOf(i);
        if (pos >= 0) seq.splice(pos, 1); else seq.push(i);
        cards.forEach(function (x) { var k = seq.indexOf(+x.dataset.i); x.classList.toggle("sel", k >= 0); x.querySelector(".n").textContent = k >= 0 ? k + 1 : ""; });
        api.ready(seq.length === t.items.length);
      };
      cards.push(c); box.appendChild(c);
    });
    body.appendChild(box); api.max = t.items.length;
    api.check = function () { var p = 0; cards.forEach(function (c) { var i = +c.dataset.i; var ok = seq.indexOf(i) === i; if (ok) p++; c.classList.add(ok ? "ok" : "bad"); }); return p; };
  };

  R.sort = function (t, body, api) {
    var pool = el("div", "pool"); var buckets = el("div", "buckets"); var where = {}; var active = null; var chips = [];
    var bEls = t.buckets.map(function (name, bi) {
      var b = el("div", "bucket"); b.appendChild(el("h4", "", name));
      b.onclick = function (e) { if (api.locked() || active === null || e.target.classList.contains("chip")) return; place(active, bi); };
      buckets.appendChild(b); return b;
    });
    shuffle(t.items.map(function (_, i) { return i; })).forEach(function (i) {
      var c = el("button", "chip", t.items[i][0]); c.dataset.i = i;
      c.onclick = function (e) { e.stopPropagation(); if (api.locked()) return; chips.forEach(function (x) { x.classList.remove("active"); }); active = i; c.classList.add("active"); bEls.forEach(function (b) { b.classList.add("hl"); }); };
      chips.push(c); pool.appendChild(c);
    });
    function place(i, bi) {
      var c = chips.filter(function (x) { return +x.dataset.i === i; })[0];
      bEls[bi].appendChild(c); where[i] = bi; c.classList.remove("active"); active = null; bEls.forEach(function (b) { b.classList.remove("hl"); });
      api.ready(Object.keys(where).length === t.items.length);
    }
    body.appendChild(el("p", "sub", "Tippe ein Kärtchen an, dann den passenden Kasten.")); body.appendChild(pool); body.appendChild(buckets);
    api.max = t.items.length;
    api.check = function () { var p = 0; chips.forEach(function (c) { var i = +c.dataset.i; var ok = where[i] === t.items[i][1]; if (ok) p++; c.classList.add(ok ? "ok" : "bad"); }); return p; };
  };

  R.thermo = function (t, body, api) {
    var lo = t.lo, hi = t.hi; var box = el("div", "thermos"); var vals = [], ths = [];
    t.values.forEach(function (v, i) {
      var th = el("div", "th", thermoSVG(v, lo, hi, true)); var st = el("div", "stepper");
      var cur = t.start != null ? t.start : 20; vals[i] = null;
      var vEl = el("span", "v", "?");
      var mk = function (d, lab) { var b = el("button", "", lab); b.onclick = function () { if (api.locked()) return; cur = Math.max(lo, Math.min(hi, (vals[i] == null ? cur : vals[i]) + d)); vals[i] = cur; vEl.textContent = fmt(cur); api.ready(vals.every(function (x) { return x != null; })); }; return b; };
      st.appendChild(mk(-5, "−5")); st.appendChild(mk(-1, "−")); st.appendChild(vEl); st.appendChild(mk(1, "+")); st.appendChild(mk(5, "+5"));
      th.appendChild(st); ths.push(th); box.appendChild(th);
    });
    body.appendChild(el("p", "sub", "Stelle mit + und − die abgelesene Temperatur ein.")); body.appendChild(box);
    api.max = t.values.length;
    api.check = function () { var p = 0; t.values.forEach(function (v, i) { var ok = vals[i] === v; if (ok) p++; ths[i].classList.add(ok ? "ok" : "bad"); if (!ok) ths[i].appendChild(el("div", "badge2", "richtig: " + fmt(v))); }); return p; };
  };

  R.setthermo = function (t, body, api) {
    var lo = t.lo, hi = t.hi; var wrap = el("div", "setth"); var vals = [], boxes = [];
    t.targets.forEach(function (target, i) {
      var th = el("div", "th"); th.appendChild(el("div", "badge2", "Stelle ein: " + fmt(target)));
      var holder = el("div", "", thermoSVG(lo, lo, hi, true, t.col || "#C9553A")); th.appendChild(holder);
      var r = el("input"); r.type = "range"; r.min = lo; r.max = hi; r.step = 1; r.value = lo; r.style.width = "140px";
      var out = el("div", "badge2", fmt(lo));
      r.oninput = function () { if (api.locked()) return; vals[i] = +r.value; holder.innerHTML = thermoSVG(+r.value, lo, hi, true, t.col); out.textContent = fmt(+r.value); api.ready(vals.filter(function (x) { return x != null; }).length === t.targets.length); };
      r.setAttribute("aria-label", "Temperatur einstellen");
      th.appendChild(r); th.appendChild(out); boxes.push(th); wrap.appendChild(th);
    });
    body.appendChild(el("p", "sub", "Ziehe den Regler, bis die rote Säule bei der richtigen Zahl steht.")); body.appendChild(wrap);
    api.max = t.targets.length;
    api.check = function () { var p = 0; t.targets.forEach(function (v, i) { var ok = Math.abs((vals[i] == null ? 999 : vals[i]) - v) <= (t.tol || 0); if (ok) p++; boxes[i].classList.add(ok ? "ok" : "bad"); }); return p; };
  };

  /* Teilchen-Simulation (ohne Punkte) */
  R.sim = function (t, body, api) {
    var box = el("div", "sim"); var cv = el("canvas"); cv.width = 760; cv.height = 360; box.appendChild(cv);
    var ctl = el("div", "simctl", '<span>❄ kalt</span>'); var r = el("input"); r.type = "range"; r.min = 0; r.max = 100; r.value = 20; r.setAttribute("aria-label", "Temperatur");
    ctl.appendChild(r); ctl.appendChild(el("span", "", "🔥 warm")); box.appendChild(ctl);
    var info = el("p", "sub", ""); box.appendChild(info); body.appendChild(box);
    var ctx = cv.getContext("2d"); var N = 30; var ps = [];
    for (var i = 0; i < N; i++) ps.push({ x: 0, y: 0, vx: Math.random() - .5, vy: Math.random() - .5, hx: (i % 6), hy: Math.floor(i / 6) });
    function frame() {
      var T = +r.value / 100; var W = 220 + T * 480; var H = 150 + T * 180; var x0 = (760 - W) / 2, y0 = 360 - H - 6;
      var speed = 0.3 + T * 4.5;
      ctx.clearRect(0, 0, 760, 360);
      ctx.fillStyle = "#FFF7E8"; ctx.fillRect(x0, y0, W, H);
      ctx.setLineDash([8, 6]); ctx.strokeStyle = "#3B342C"; ctx.lineWidth = 2; ctx.strokeRect(x0, y0, W, H); ctx.setLineDash([]);
      var col = "rgb(" + Math.round(91 + T * 137) + "," + Math.round(155 - T * 68) + "," + Math.round(213 - T * 152) + ")";
      ps.forEach(function (p) {
        var gx = x0 + 18 + p.hx * (W - 36) / 5, gy = y0 + 16 + p.hy * (H - 32) / 4;
        p.vx += (Math.random() - .5) * speed * .6; p.vy += (Math.random() - .5) * speed * .6;
        p.vx *= .8; p.vy *= .8; p.x += p.vx; p.y += p.vy;
        var lim = 2 + T * 26; p.x = Math.max(-lim, Math.min(lim, p.x)); p.y = Math.max(-lim, Math.min(lim, p.y));
        ctx.beginPath(); ctx.arc(gx + p.x, gy + p.y, 12, 0, 6.283); ctx.fillStyle = col; ctx.fill(); ctx.strokeStyle = "#3B342C"; ctx.lineWidth = 1.6; ctx.stroke();
      });
      info.textContent = T < .33 ? "Kalt: Die Teilchen zittern nur wenig und liegen eng beieinander." : T < .66 ? "Wärmer: Die Teilchen bewegen sich stärker und brauchen mehr Platz." : "Heiß: Die Teilchen bewegen sich heftig – der Stoff dehnt sich aus!";
      requestAnimationFrame(frame);
    }
    frame(); api.max = 0; api.noscore = true;
  };

  /* ---------- Seite aufbauen ---------- */
  var root = document.getElementById("app");
  var key = "nt5tw_" + P.no;
  var state = store.get(key) || {};
  var total = 0, got = 0, checked = 0, scorable = 0, results = {};

  var head = el("header", "top"); head.innerHTML = '<a class="pill" href="index.html">← Übersicht</a><span class="pill" style="background:' + (P.color || "#3B342C") + '">' + P.no + "</span>";
  root.appendChild(head);
  root.appendChild(el("h1", "", P.title));
  root.appendChild(el("p", "sub", P.sub || ""));

  var intro = el("div", "card"); intro.innerHTML = '<div class="intro"><label for="nm"><b>Dein Name:</b></label></div>';
  var nm = el("input"); nm.id = "nm"; nm.placeholder = "Vorname"; nm.value = store.get("nt5tw_name") || "";
  nm.oninput = function () { store.set("nt5tw_name", nm.value); };
  intro.firstChild.appendChild(nm);
  intro.appendChild(el("p", "sub", '<span style="color:var(--sun)">★</span> Grundlagen · <span style="color:var(--cold)">★★</span> Üben · <span style="color:#8E44AD">★★★</span> Knobeln. 🔊 liest die Aufgabe vor.'));
  root.appendChild(intro);

  if (P.film) {
    var f = el("div", "card"); f.innerHTML = '<a class="film" href="' + P.film.url + '" target="_blank" rel="noopener"><span class="play">▶</span><span><b>Film-Tipp: ' + P.film.t + '</b>' + P.film.d + '<br><small>planet-schule.de · öffnet in neuem Fenster</small></span></a>';
    root.appendChild(f);
  }

  P.tasks.forEach(function (t, idx) {
    var card = el("section", "card s" + t.stars);
    var qh = el("div", "qhead");
    qh.appendChild(el("span", "qnum", idx + 1));
    qh.appendChild(el("div", "q", t.q));
    qh.appendChild(el("span", "stars", "★★★".slice(0, t.stars)));
    var sp = el("button", "speak", "🔊"); sp.title = "Vorlesen"; sp.onclick = function () { speak(strip(t.q) + (t.read ? ". " + t.read : "")); };
    qh.appendChild(sp); card.appendChild(qh);
    var body = el("div"); card.appendChild(body);
    var locked = false;
    var actions = el("div", "actions");
    var chk = el("button", "btn", "Prüfen"); chk.disabled = true;
    var api = { locked: function () { return locked; }, ready: function (b) { chk.disabled = !b; } };
    R[t.type](t, body, api);
    var fb = el("div", "fb"); var tip = el("div", "tip", "💡 " + (t.tip || ""));
    if (!api.noscore) {
      scorable++; total += api.max;
      actions.appendChild(chk);
      if (t.tip) { var tb = el("button", "btn sec", "💡 Tipp"); tb.onclick = function () { tip.classList.toggle("show"); }; actions.appendChild(tb); }
      chk.onclick = function () {
        if (locked) return; locked = true; chk.disabled = true;
        var p = api.check(); got += p; checked++; results[idx] = [p, api.max];
        if (api.solution && p < api.max) api.solution();
        fb.className = "fb " + (p === api.max ? "ok" : "bad");
        fb.innerHTML = (p === api.max ? "Super! Alles richtig. " : "Du hast " + p + " von " + api.max + " Punkten. ") + (t.why ? "<br><span style='font-weight:600'>" + t.why + "</span>" : "");
        if (p === api.max) card.classList.add("done-ok");
        updateResult();
      };
      card.appendChild(actions); card.appendChild(tip); card.appendChild(fb);
    }
    root.appendChild(card);
  });

  var res = el("section", "card result"); root.appendChild(res);
  function updateResult() {
    if (checked < scorable) { res.innerHTML = "<p class='sub'>Noch " + (scorable - checked) + " Aufgabe(n) bis zum Ergebnis.</p>"; return; }
    var pct = total ? got / total : 0;
    var suns = pct >= .9 ? 3 : pct >= .6 ? 2 : pct >= .3 ? 1 : 0;
    res.innerHTML = '<div class="big">' + "☀️".repeat(suns) + "🌥️".repeat(3 - suns) + '</div><div class="score">' + got + " / " + total + " Punkte</div>" +
      "<p><b>" + (nm.value || "Ohne Namen") + "</b> · " + P.no + " " + P.title + " · " + new Date().toLocaleDateString("de-DE") + "</p>" +
      "<p class='sub'>Mach einen Screenshot und zeige ihn deiner Lehrkraft.</p>" +
      '<div class="actions" style="justify-content:center"><button class="btn" onclick="location.reload()">Nochmal üben</button><a class="btn sec" href="index.html" style="text-decoration:none">Zur Übersicht</a></div>';
    var best = state.best || 0; if (got > best) { state.best = got; state.total = total; store.set(key, state); }
  }
  updateResult();
  root.appendChild(el("p", "foot", "NT 5 · Kapitel 2 Temperatur und Wärme · Buch " + (P.book || "")));
  window.__thermoSVG = thermoSVG;
})();
