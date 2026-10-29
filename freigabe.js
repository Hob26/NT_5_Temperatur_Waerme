/* Freigabe der Übungen durch die Lehrkraft.
   Zustand liegt im Gerät (localStorage) und kann per Link/QR an alle iPads verteilt werden:
   index.html?frei=2.1,2.2&t=<Zeitstempel>   (frei=- bedeutet: alles gesperrt)  */
(function () {
  var ALL = ["2.1", "2.2", "2.3", "2.4", "2.5", "2.6", "2.7"];
  var KEY = "nt5tw_freigabe", PIN = "5555";
  function load() {
    try { var s = JSON.parse(localStorage.getItem(KEY)); if (s && s.open) return s; } catch (e) {}
    return { open: ALL.slice(), t: 0 };            // Standard: alles offen
  }
  function save(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} }
  var st = load();

  // Freigabe-Link übernehmen (nur wenn neuer als der gespeicherte Stand)
  var q = new URLSearchParams(location.search);
  if (q.has("frei")) {
    var t = parseInt(q.get("t") || "0", 10);
    if (t >= (st.t || 0)) {
      var f = q.get("frei");
      st = { open: f === "-" ? [] : f.split(",").filter(function (x) { return ALL.indexOf(x) >= 0; }), t: t };
      save(st);
    }
    history.replaceState(null, "", location.pathname);
  }
  var isOpen = function (no) { return st.open.indexOf(no) >= 0; };
  window.NT5_FREI = { isOpen: isOpen };

  // ---------- Übungsseite: gesperrt? ----------
  var page = document.body.getAttribute("data-uebung");
  if (page) {
    if (!isOpen(page)) {
      window.NT5_LOCKED = true;
      document.body.innerHTML = '<main class="wrap"><div class="card lockpage"><div style="font-size:64px">🔒</div>' +
        '<h1>Übung ' + page + ' ist noch gesperrt</h1><p class="sub">Deine Lehrkraft schaltet sie frei, wenn ihr das Thema besprochen habt.</p>' +
        '<a class="pill" href="index.html">← Zur Übersicht</a></div></main>';
    }
    return;
  }

  // ---------- Startseite ----------
  function paint() {
    document.querySelectorAll(".tile[data-no]").forEach(function (a) {
      var no = a.getAttribute("data-no"), o = isOpen(no);
      a.classList.toggle("locked", !o);
      a.querySelector(".lockbadge").textContent = o ? "" : "🔒 gesperrt";
    });
    var n = st.open.length;
    var info = document.getElementById("freiinfo");
    if (info) info.textContent = n === ALL.length ? "" : n === 0 ? "Alle Übungen sind gerade gesperrt." : "Freigegeben: " + st.open.join(", ");
  }
  document.querySelectorAll(".tile[data-no]").forEach(function (a) {
    a.addEventListener("click", function (e) {
      if (!isOpen(a.getAttribute("data-no"))) { e.preventDefault(); a.classList.remove("shake"); void a.offsetWidth; a.classList.add("shake"); }
    });
  });
  paint();

  // ---------- Lehrkraft-Bereich ----------
  var dlg = document.getElementById("teacher");
  if (!dlg) return;
  var pinBox = document.getElementById("pinbox"), panel = document.getElementById("tpanel");
  document.getElementById("tbtn").onclick = function () {
    dlg.hidden = false; pinBox.hidden = false; panel.hidden = true;
    var inp = document.getElementById("pin"); inp.value = ""; document.getElementById("pinerr").textContent = ""; inp.focus();
  };
  document.getElementById("tclose").onclick = function () { dlg.hidden = true; };
  dlg.addEventListener("click", function (e) { if (e.target === dlg) dlg.hidden = true; });
  function tryPin() {
    if (document.getElementById("pin").value.trim() === PIN) { pinBox.hidden = true; panel.hidden = false; buildList(); }
    else document.getElementById("pinerr").textContent = "Falscher Code.";
  }
  document.getElementById("pinok").onclick = tryPin;
  document.getElementById("pin").addEventListener("keydown", function (e) { if (e.key === "Enter") tryPin(); });

  function link() {
    var base = location.href.split("?")[0].split("#")[0];
    return base + "?frei=" + (st.open.length ? st.open.join(",") : "-") + "&t=" + st.t;
  }
  function update() {
    st.t = Date.now(); save(st); paint();
    var l = link(); document.getElementById("tlink").value = l;
    var qr = document.getElementById("qr"); qr.innerHTML = "";
    if (window.QRCode) new QRCode(qr, { text: l, width: 220, height: 220, correctLevel: QRCode.CorrectLevel.M });
    else qr.textContent = "(QR-Code braucht Internet)";
  }
  function buildList() {
    var box = document.getElementById("tlist"); box.innerHTML = "";
    document.querySelectorAll(".tile[data-no]").forEach(function (a) {
      var no = a.getAttribute("data-no"), title = a.getAttribute("data-title");
      var row = document.createElement("label"); row.className = "trow";
      row.innerHTML = '<span class="no" style="background:' + a.getAttribute("data-col") + '">' + no + '</span><span class="tt">' + title +
        '</span><input type="checkbox" class="sw"' + (isOpen(no) ? " checked" : "") + '><span class="swl"></span>';
      row.querySelector("input").onchange = function () {
        var on = this.checked;
        st.open = ALL.filter(function (x) { return x === no ? on : isOpen(x); });
        update();
      };
      box.appendChild(row);
    });
    update();
  }
  document.getElementById("allon").onclick = function () { st.open = ALL.slice(); buildList(); };
  document.getElementById("alloff").onclick = function () { st.open = []; buildList(); };
  document.getElementById("copy").onclick = function () {
    var i = document.getElementById("tlink"); i.select();
    (navigator.clipboard ? navigator.clipboard.writeText(i.value) : Promise.reject()).then(function () {
      document.getElementById("copy").textContent = "✓ Kopiert";
    }, function () { document.execCommand("copy"); document.getElementById("copy").textContent = "✓ Kopiert"; });
    setTimeout(function () { document.getElementById("copy").textContent = "Link kopieren"; }, 1800);
  };
})();
