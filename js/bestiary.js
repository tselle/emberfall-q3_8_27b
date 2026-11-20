/* ============================================================
   EMBERFALL — bestiary.js
   The monster codex: every creature the company has met, with
   its stats and a field note. Fills in as you encounter foes.
   ============================================================ */
'use strict';

var Bestiary = (function () {
  function open() {
    var Gg = Campaign.G;
    var seen = Gg.bestiary || {};
    var ids = Object.keys(seen);
    var h = '<div class="panel best"><div class="panel-h">The Bestiary <span class="dim">' + ids.length + ' of ' + MONSTER_LIST.length + ' entries</span></div>';
    if (!ids.length) {
      h += '<div class="dim">No creatures recorded yet. Meet something, and it will be written down here.</div>';
    } else {
      ids.sort(function (a, b) { return MONSTERS[a].n.localeCompare(MONSTERS[b].n); });
      ids.forEach(function (id) {
        var m = MONSTERS[id];
        var e = seen[id];
        h += '<div class="best-entry"><canvas class="best-ic" width="32" height="48" data-id="' + id + '"></canvas>';
        h += '<div class="best-main"><b>' + UI.esc(m.n) + '</b> <span class="dim">seen ' + e.n + '× · first day ' + e.day + '</span>';
        h += '<div class="best-stats">HD ' + m.hd + ' · AC ' + m.ac + ' · ' + m.dmg + ' · XP ' + m.xp + (m.turn ? ' · undead (turn ' + m.turn + ')' : '') + '</div>';
        h += '<div class="dim-sm">' + UI.esc(m.desc) + '</div></div></div>';
      });
    }
    h += '<div class="sheet-actions"><button class="btn" data-act="close">Close</button></div></div>';
    UI.open(h, 'best-open');
    UI.root().querySelectorAll('canvas.best-ic').forEach(function (c) {
      c.getContext('2d').drawImage(Fig.monster(c.dataset.id), 0, 0);
    });
  }
  return { open: open };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = { Bestiary: Bestiary };
