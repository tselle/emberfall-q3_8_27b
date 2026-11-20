/* ============================================================
   EMBERFALL — journal.js
   The company journal: quest tracking for the active venture
   plus the running event log.
   ============================================================ */
'use strict';

var Journal = (function () {
  function open() {
    var Gg = Campaign.G;
    var a = ADV.get(Gg.activeAdv);
    var w = Campaign.advWorld(a.id);
    var h = '<div class="panel journal"><div class="panel-h">The Journal</div>';
    h += '<div class="panel-h">Deeds of ' + UI.esc(a.name) + '</div>';
    a.quests.forEach(function (q) {
      var st = w.quests[q.id] && w.quests[q.id].status === 'done' ? 'done' : 'open';
      h += '<div class="quest-line"><b>' + UI.esc(q.name) + '</b> <span class="' + (st === 'done' ? 'good' : 'dim') + '">' + (st === 'done' ? ('— done, day ' + w.quests[q.id].day) : '— open · ' + M.fmtGold(q.gold) + ' · ' + q.xp + ' xp listed') + '</span>';
      h += '<div class="dim-sm">' + UI.esc(q.text) + '</div></div>';
    });
    // rumours of the current wilds
    h += '<div class="panel-h">Rumours of the Wilds</div>';
    (a.wilds.rumours || []).forEach(function (r) { h += '<div class="dim-sm">· ' + UI.esc(r) + '</div>'; });
    h += '<div class="panel-h">The Log</div><div class="log">';
    var entries = Gg.journal.slice(-60).reverse();
    if (!entries.length) h += '<div class="dim">Nothing recorded yet.</div>';
    entries.forEach(function (e) {
      h += '<div class="log-line"><span class="dim">d' + e.day + '</span> ' + UI.esc(e.text) + '</div>';
    });
    h += '</div><div class="sheet-actions"><button class="btn" data-act="close">Close</button></div></div>';
    UI.open(h, 'journal-open');
  }
  return { open: open };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = { Journal: Journal };
