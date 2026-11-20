/* ============================================================
   EMBERFALL — watch.js
   The HUD: top bar (location, clock, gold), the watch panel
   (party vitals chips + a live minimap of the current town /
   dungeon floor / wilderness).
   ============================================================ */
'use strict';

var Watch = (function () {
  var lastSig = '';
  var lastMini = '';

  function render() {
    var Gg = Campaign.G;
    if (!Gg) return;
    // top bar
    var locEl = document.getElementById('top-loc');
    var clockEl = document.getElementById('top-clock');
    var goldEl = document.getElementById('top-gold');
    var titleEl = document.getElementById('top-title');
    if (locEl) {
      var loc = '';
      if (Gg.loc) {
        var a = ADV.get(Gg.loc.adv || Gg.activeAdv);
        if (Gg.phase === 'overland') loc = 'Wilds of ' + a.townName;
        else if (Gg.phase === 'town' || Gg.phase === 'building') loc = a.townName;
        else if (Gg.phase === 'dungeon') loc = a.floors[Gg.loc.floor].name;
        else if (Gg.phase === 'combat') loc = 'Battle';
      }
      locEl.textContent = loc;
    }
    if (clockEl) {
      var hh = Math.floor(Gg.minute / 60), mm = Gg.minute % 60;
      clockEl.textContent = 'Day ' + Gg.day + ' · ' + (hh < 10 ? '0' : '') + hh + ':' + (mm < 10 ? '0' : '') + mm + (Campaign.isNight() ? ' ☾' : ' ☀');
    }
    if (goldEl) goldEl.textContent = M.fmtGold(Gg.gold);
    if (titleEl) titleEl.textContent = 'EMBERFALL';

    // vitals
    var vit = document.getElementById('vitals');
    if (vit) {
      var sig = Gg.party.map(function (p) { return p.hp + '/' + Campaign.mhp(p) + p.level + (p.dead ? 'd' : ''); }).join('|') + Gg.day + '' + Gg.minute;
      if (sig !== lastSig || !vit.dataset.built) {
        lastSig = sig;
        vit.dataset.built = 1;
        vit.innerHTML = '';
        Gg.party.forEach(function (p, i) {
          var mhp = Campaign.mhp(p);
          var pct = Math.max(0, Math.min(1, p.hp / mhp));
          var chip = document.createElement('div');
          chip.className = 'vital' + (p.dead ? ' dead' : '') + (i === 0 ? ' active' : '');
          chip.innerHTML = '<div class="vital-name">' + UI.esc(p.name) + ' <span class="dim">L' + p.level + '</span></div>' +
            '<div class="vital-bar"><div class="vital-fill' + (pct > 0.5 ? ' ok' : pct > 0.25 ? ' warn' : ' bad') + '" style="width:' + Math.round(pct * 100) + '%"></div></div>';
          chip.addEventListener('click', function () { UI.sheet(i); });
          vit.appendChild(chip);
        });
      }
    }
    // minimap
    var mm = document.getElementById('minimap');
    if (mm) {
      var miniSig = Gg.phase + '|' + (Gg.loc && Gg.loc.x) + ',' + (Gg.loc && Gg.loc.y) + '|' + (Gg.loc && Gg.loc.floor != null ? Gg.loc.floor : '') + '|' + (Gg.loc && Gg.loc.adv);
      if (miniSig !== lastMini) { lastMini = miniSig; drawMini(mm); }
    }
  }

  function drawMini(mm) {
    var g = mm.getContext('2d');
    var Gg = Campaign.G;
    g.fillStyle = '#0e0d0a';
    g.fillRect(0, 0, mm.width, mm.height);
    if (!Gg.loc) return;
    if ((Gg.phase === 'dungeon' || (Gg.phase === 'combat' && Gg.loc.kind === 'dungeon')) && Gg.loc.floor != null) {
      var a = ADV.get(Gg.loc.adv || Gg.activeAdv);
      var f = a.floors[Gg.loc.floor];
      var st = Campaign.advWorld(a.id).dungeon.floors[Gg.loc.floor];
      var ts = Math.min(10, Math.floor(Math.min(mm.width / f.w, mm.height / f.h)));
      var ox = Math.floor((mm.width - f.w * ts) / 2), oy = Math.floor((mm.height - f.h * ts) / 2);
      for (var y = 0; y < f.h; y++) for (var x = 0; x < f.w; x++) {
        var idx = y * f.w + x;
        if (st.visited.indexOf(idx) < 0) continue;
        g.fillStyle = f.solid[idx] ? '#4a4438' : '#241f16';
        g.fillRect(ox + x * ts, oy + y * ts, ts, ts);
      }
      if (st.visited.indexOf(f.up.y * f.w + f.up.x) >= 0) { g.fillStyle = '#8ad0ff'; g.fillRect(ox + f.up.x * ts, oy + f.up.y * ts, ts, ts); }
      if (st.visited.indexOf(f.down.y * f.w + f.down.x) >= 0) { g.fillStyle = '#ffd080'; g.fillRect(ox + f.down.x * ts, oy + f.down.y * ts, ts, ts); }
      var px = ox + Gg.loc.x * ts + ts / 2, py = oy + Gg.loc.y * ts + ts / 2;
      g.fillStyle = '#ffd860';
      g.beginPath(); g.arc(px, py, Math.max(2, ts / 2.4), 0, 7); g.fill();
    } else if (Gg.phase === 'town' || Gg.phase === 'building' || Gg.phase === 'overland') {
      // simple town/overland sketch: just show site layout for the active adv
      var a2 = ADV.get(Gg.loc.adv || Gg.activeAdv);
      var w = Campaign.advWorld(a2.id);
      if (Gg.phase === 'overland') {
        var W = a2.wilds.w, H = a2.wilds.h;
        var ts2 = Math.min(8, Math.floor(Math.min(mm.width / W, mm.height / H)));
        var ox2 = Math.floor((mm.width - W * ts2) / 2), oy2 = Math.floor((mm.height - H * ts2) / 2);
        for (var y2 = 0; y2 < H; y2++) for (var x2 = 0; x2 < W; x2++) {
          var i2 = y2 * W + x2;
          if (w.wilds.visited.indexOf(i2) < 0) continue;
          g.fillStyle = WILDS.TERRAIN_INFO[a2.wilds.terrain[i2]].color;
          g.fillRect(ox2 + x2 * ts2, oy2 + y2 * ts2, ts2, ts2);
        }
        a2.wilds.sites.forEach(function (s) {
          if (w.wilds.visited.indexOf(s.y * W + s.x) < 0) return;
          g.fillStyle = '#e8d8b0';
          g.fillRect(ox2 + s.x * ts2, oy2 + s.y * ts2, Math.max(2, ts2 - 1), Math.max(2, ts2 - 1));
        });
        g.fillStyle = '#ffd860';
        g.beginPath(); g.arc(ox2 + Gg.loc.x * ts2 + ts2 / 2, oy2 + Gg.loc.y * ts2 + ts2 / 2, Math.max(2, ts2 / 2.4), 0, 7); g.fill();
      } else {
        // town: show buildings
        var t = a2.town;
        var ts3 = Math.min(9, Math.floor(Math.min(mm.width / t.w, mm.height / t.h)));
        var ox3 = Math.floor((mm.width - t.w * ts3) / 2), oy3 = Math.floor((mm.height - t.h * ts3) / 2);
        g.fillStyle = '#242018';
        g.fillRect(ox3, oy3, t.w * ts3, t.h * ts3);
        Object.keys(t.buildingsById).forEach(function (id) {
          var b = t.buildingsById[id];
          g.fillStyle = '#5a5040';
          g.fillRect(ox3 + b.x * ts3, oy3 + b.y * ts3, b.w * ts3, b.h * ts3);
        });
        g.fillStyle = '#ffd860';
        g.beginPath(); g.arc(ox3 + Gg.loc.x * ts3 + ts3 / 2, oy3 + Gg.loc.y * ts3 + ts3 / 2, Math.max(2, ts3 / 2.4), 0, 7); g.fill();
      }
    }
  }

  return { render: render };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = { Watch: Watch };
