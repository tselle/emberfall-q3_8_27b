/* ============================================================
   EMBERFALL — map.js
   The map screen: the wilderness (fog of war, sites, roads)
   and the current dungeon floor (explored cells, doors, traps,
   stairs, the party). A legend explains the marks.
   ============================================================ */
'use strict';

var MapView = (function () {
  var mode = 'overland';
  var cv = null;

  function open(forced) {
    var Gg = Campaign.G;
    var inDungeon = Gg.phase === 'dungeon';
    mode = forced === 'dungeon' ? 'dungeon' : forced === 'overland' ? 'overland' : (inDungeon ? 'dungeon' : 'overland');
    if (mode === 'dungeon' && !inDungeon) mode = 'overland';
    var h = '<div class="panel map"><div class="panel-h">The Map</div>';
    h += '<div class="map-tabs">';
    h += '<button class="btn sm' + (mode === 'overland' ? ' on' : '') + '" data-act="map.mode" data-m="overland">Wilderness</button>';
    if (inDungeon) {
      var a = ADV.get(Gg.loc.adv);
      h += '<button class="btn sm' + (mode === 'dungeon' ? ' on' : '') + '" data-act="map.mode" data-m="dungeon">' + UI.esc(a.floors[Gg.loc.floor].name) + '</button>';
    }
    h += '</div>';
    h += '<div class="map-cvwrap"><canvas id="mapcv" width="480" height="420"></canvas></div>';
    h += '<div class="map-legend dim-sm">■ explored · ▲ party · T town · D dungeon · H hamlet · + healer · * holy · X lair · ^ camp · <i>doors, traps and stairs shown when found</i></div>';
    h += '<div class="sheet-actions"><button class="btn" data-act="close">Close</button></div></div>';
    UI.open(h, 'map-open');
    cv = document.getElementById('mapcv');
    draw();
  }

  function draw() {
    if (!cv) return;
    var g = cv.getContext('2d');
    if (mode === 'overland') drawOverland(g);
    else drawDungeon(g);
  }

  function drawOverland(g) {
    var Gg = Campaign.G;
    var a = ADV.get(Gg.activeAdv);
    var w = Campaign.advWorld(a.id);
    var W = a.wilds.w, H = a.wilds.h;
    var ts = Math.min(20, Math.floor(Math.min(cv.width / W, (cv.height - 20) / H)));
    var ox = Math.floor((cv.width - W * ts) / 2), oy = 10 + Math.floor((cv.height - 20 - H * ts) / 2);
    g.fillStyle = '#0c0f08'; g.fillRect(0, 0, cv.width, cv.height);
    for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) {
      var idx = y * W + x;
      var seen = w.wilds.visited.indexOf(idx) >= 0;
      var t = a.wilds.terrain[idx];
      g.fillStyle = seen ? WILDS.TERRAIN_INFO[t].color : '#0c0f08';
      g.fillRect(ox + x * ts, oy + y * ts, ts, ts);
    }
    a.wilds.sites.forEach(function (s) {
      if (w.wilds.visited.indexOf(s.y * W + s.x) < 0) return;
      var img = Fig.site(s.kind);
      g.drawImage(img, ox + s.x * ts + ts / 2 - 9, oy + s.y * ts + ts / 2 - 9, 18, 18);
    });
    var px = ox + Gg.loc.x * ts + ts / 2, py = oy + Gg.loc.y * ts + ts / 2;
    g.fillStyle = '#ffd860';
    g.beginPath(); g.moveTo(px, py - 6); g.lineTo(px + 5, py + 4); g.lineTo(px - 5, py + 4); g.closePath(); g.fill();
    g.strokeStyle = '#2a2010'; g.stroke();
  }

  function drawDungeon(g) {
    var Gg = Campaign.G;
    var a = ADV.get(Gg.loc.adv);
    var f = a.floors[Gg.loc.floor];
    var st = Campaign.advWorld(a.id).dungeon.floors[Gg.loc.floor];
    var ts = Math.min(24, Math.floor(Math.min(cv.width / f.w, (cv.height - 10) / f.h)));
    var ox = Math.floor((cv.width - f.w * ts) / 2), oy = 5 + Math.floor((cv.height - 10 - f.h * ts) / 2);
    g.fillStyle = '#101010'; g.fillRect(0, 0, cv.width, cv.height);
    for (var y = 0; y < f.h; y++) for (var x = 0; x < f.w; x++) {
      var idx = y * f.w + x;
      if (st.visited.indexOf(idx) < 0) continue;
      var px = ox + x * ts, py = oy + y * ts;
      if (f.solid[idx]) {
        var d = f.doors[idx];
        if (d && d.kind === 'secret' && st.doorsFound.indexOf(idx) < 0) { g.fillStyle = '#2a2620'; }
        else if (d && d.kind === 'locked') { g.fillStyle = d.open ? '#3a3630' : '#5a3a2a'; }
        else if (d) { g.fillStyle = '#4a4030'; }
        else { g.fillStyle = '#3a3630'; }
        g.fillRect(px, py, ts, ts);
      } else {
        g.fillStyle = '#242018';
        g.fillRect(px, py, ts, ts);
        // trap marks
        var t = f.traps[idx];
        if (t && st.trapsFound.indexOf(idx) >= 0) {
          g.strokeStyle = st.trapsSprung.indexOf(idx) >= 0 ? '#7a6a48' : '#c04040';
          g.lineWidth = 2;
          g.beginPath(); g.moveTo(px + 3, py + 3); g.lineTo(px + ts - 3, py + ts - 3); g.moveTo(px + ts - 3, py + 3); g.lineTo(px + 3, py + ts - 3); g.stroke();
        }
        if (f.loot[idx] && st.lootTaken.indexOf(idx) < 0 && st.visited.indexOf(idx) >= 0) {
          g.fillStyle = '#e8b830'; g.fillRect(px + ts / 2 - 2, py + ts / 2 - 2, 4, 4);
        }
      }
    }
    // stairs
    function mark(x, y, ch, col) {
      g.fillStyle = col;
      g.font = 'bold ' + Math.floor(ts * 0.7) + 'px monospace';
      g.fillText(ch, ox + x * ts + ts / 2 - 3, oy + y * ts + ts / 2 + 4);
    }
    if (st.visited.indexOf(f.up.y * f.w + f.up.x) >= 0) mark(f.up.x, f.up.y, 'U', '#8ad0ff');
    if (st.visited.indexOf(f.down.y * f.w + f.down.x) >= 0) mark(f.down.x, f.down.y, 'D', '#ffd080');
    // party
    var px = ox + Gg.loc.x * ts + ts / 2, py = oy + Gg.loc.y * ts + ts / 2;
    g.fillStyle = '#ffd860';
    g.beginPath(); g.arc(px, py, ts / 3, 0, 7); g.fill();
    g.strokeStyle = '#2a2010'; g.stroke();
  }

  return { open: open };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = { MapView: MapView };
