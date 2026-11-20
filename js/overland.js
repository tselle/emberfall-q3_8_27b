/* ============================================================
   EMBERFALL — overland.js
   The wilderness scene: a 2D tile map (fog of war), terrain
   movement with time costs, sites (town, dungeon entrances,
   hamlets, healers, holy sites, lairs, safe camps), random
   encounters and travellers.
   ============================================================ */
'use strict';

var Overland = (function () {
  var TILE = 26;

  function enter(advId) {
    var a = ADV.get(advId);
    var w = Campaign.advWorld(advId);
    if (!w.wilds.x && !w.wilds.y) {
      var t = a.wilds.sites.find(function (s) { return s.kind === 'town'; });
      w.wilds.x = t.x; w.wilds.y = t.y;
    }
    Overland._lastSite = null;
    Campaign.setPhase('overland', { kind: 'overland', adv: advId, x: w.wilds.x, y: w.wilds.y });
    visit(w.wilds.x, w.wilds.y);
    Game.dirty();
    UI.setBar([
      { id: 'map', label: 'Map', icon: 'map' },
      { id: 'site', label: 'Site', icon: 'site' },
      { id: 'journal', label: 'Journal', icon: 'book' },
      { id: 'party', label: 'Party', icon: 'party' }
    ]);
  }

  function visit(x, y) {
    var a = ADV.get(G.loc ? G.loc.adv : Campaign.G.activeAdv);
    var w = Campaign.advWorld(a.id);
    for (var dy = -1; dy <= 1; dy++) for (var dx = -1; dx <= 1; dx++) {
      var nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= a.wilds.w || ny >= a.wilds.h) continue;
      var idx = ny * a.wilds.w + nx;
      if (w.wilds.visited.indexOf(idx) < 0) w.wilds.visited.push(idx);
    }
  }

  function siteAt(x, y) {
    var a = ADV.get(G.loc.adv);
    for (var i = 0; i < a.wilds.sites.length; i++) {
      var s = a.wilds.sites[i];
      if (s.x === x && s.y === y) return s;
    }
    return null;
  }

  function canStep(nx, ny) {
    var a = ADV.get(G.loc.adv);
    if (nx < 0 || ny < 0 || nx >= a.wilds.w || ny >= a.wilds.h) return { ok: false, why: 'The edge of the map.' };
    var t = a.wilds.terrain[ny * a.wilds.w + nx];
    if (t === WILDS.T.RIVER) return { ok: false, why: 'The river is too deep here. Find a bridge or ford.' };
    return { ok: true };
  }

  function step(dx, dy) {
    if (G.phase !== 'overland') return;
    var Gg = Campaign.G;
    var nx = Gg.loc.x + dx, ny = Gg.loc.y + dy;
    var c = canStep(nx, ny);
    if (!c.ok) { Toast(c.why, 'warn'); return; }
    var a = ADV.get(Gg.loc.adv);
    var w = Campaign.advWorld(a.id);
    var t = a.wilds.terrain[ny * a.wilds.w + nx];
    var hasWander = !!Campaign.partyItem('b_wanderer');
    var cost = WILDS.terrainCost(t, hasWander);
    var p = Campaign.activeChar();
    if (p.fatigue >= 1) cost *= 1.5;
    p.fatigue = Math.min(1.2, (p.fatigue || 0) + cost / 30);
    Gg.loc.x = nx; Gg.loc.y = ny;
    w.wilds.x = nx; w.wilds.y = ny;
    Campaign.addMinutes(Math.round(cost * 15));
    visit(nx, ny);

    // site?
    var s = siteAt(nx, ny);
    // encounter roll
    var chance = WILDS.encounterChance(t, Campaign.isNight(), p.fatigue || 0);
    if (!s && M.chance(chance)) {
      rollEncounter();
      return;
    }
    if (!s && M.chance(5)) {
      meetTraveller();
      return;
    }
    if (s) {
      Game.dirty();
      // show site prompt once per arrival
      if (!Overland._lastSite || Overland._lastSite !== (s.kind + s.x + ',' + s.y)) {
        Overland._lastSite = s.kind + s.x + ',' + s.y;
        siteDialog(s);
      }
    } else {
      Game.dirty();
    }
  }

  function rollEncounter() {
    var a = ADV.get(G.loc.adv);
    var w = Campaign.advWorld(a.id);
    var table = a.wilds.table;
    var total = 0;
    table.forEach(function (e) { total += e[1]; });
    var roll = Math.random() * total, pick = table[0];
    for (var i = 0; i < table.length; i++) {
      roll -= table[i][1];
      if (roll <= 0) { pick = table[i]; break; }
    }
    var n = 1 + (M.d20() < 5 ? 1 : 0) + (M.d20() < 3 ? 1 : 0);
    var mobs = [];
    for (var j = 0; j < n; j++) mobs.push({ id: pick[0] });
    Campaign.log('Wilderness encounter: ' + n + ' × ' + MONSTERS[pick[0]].n + '.');
    Combat.start('overland', { adv: a.id, seed: a.id + ':' + G.loc.x + ',' + G.loc.y + ':' + Campaign.G.day, mobs: mobs, ambush: Math.random() < 0.25 });
  }

  function meetTraveller() {
    var a = ADV.get(G.loc.adv);
    var rum = a.wilds.rumours;
    var line = rum[Math.floor(Math.random() * rum.length)];
    UI.dialog({
      title: 'Travellers on the road',
      text: 'A band of traders shares the road an hour. They hear you out, trade news, and part ways.',
      lines: ['“' + line + '”', 'They press ' + M.fmtGold(3 + Math.floor(Math.random() * 6)) + ' into your hand for safe passage and vanish into the mist.'],
      actions: [{ label: 'Onward', act: 'close' }]
    });
  }

  function siteDialog(s) {
    var a = ADV.get(G.loc.adv);
    var w = Campaign.advWorld(a.id);
    var Gg = Campaign.G;
    var title = s.name || WILDS.SITES[s.kind].name;
    var actions = [];
    var text;
    if (s.kind === 'town') {
      text = 'The gates of ' + (s.name || a.townName) + ' stand open. ' + a.townName + ' keeps its shops, its chapel and its guild hall.';
      actions.push({ label: 'Enter ' + a.townName, act: 'enter-town' });
    } else if (s.kind === 'dungeon') {
      if (s.sealed && Campaign.questStatus(Gg.activeAdv, 'q_' + Gg.activeAdv + '_main') !== 'done') {
        text = 'A seal holds the entrance. Something about this door is bound to a deed not yet done — a quest the town keeper will not name outright.';
      } else {
        var targetAdv = s.advId || Gg.activeAdv;
        var ta = ADV.get(targetAdv);
        text = 'The entrance to ' + ta.dungeonName + '. ' + MONSTERS[ta.floors[ta.floors.length - 1].boss.id].n + ' is said to keep the deepest floor.';
        actions.push({ label: 'Descend', act: 'enter-dungeon', adv: targetAdv });
      }
    } else if (s.kind === 'hamlet') {
      text = 'A cluster of homesteads around a shared well. The folk here will let you sleep, and sell what they have.';
      actions.push({ label: 'Rest until dawn', act: 'rest' });
      actions.push({ label: 'Rest until healed', act: 'resthealed' });
      actions.push({ label: 'Trade (simple)', act: 'hamlet-shop' });
    } else if (s.kind === 'healer') {
      text = 'A small hut, smoke in the eaves. The healer will set any wound for twenty gold a head.';
      actions.push({ label: 'Heal the party (20g ea.)', act: 'heal' });
    } else if (s.kind === 'holy') {
      text = 'An old stone with a carving of the dawn. The folk say prayer here is not wasted. (Once a day, a small grant of experience.)';
      var holyDay = w.wilds.holyDay || 0;
      if (holyDay < Gg.day) actions.push({ label: 'Pray', act: 'pray' });
    } else if (s.kind === 'lair') {
      if (w.wilds.lairCleared) text = 'The lair is cleared. The place lies quiet, and safe enough for a rest.';
      else {
        text = 'Something is living here, and it is not friendly. The local folk would not pass this way after dark.';
        actions.push({ label: 'Enter the lair', act: 'lair' });
      }
      actions.push({ label: 'Rest until dawn', act: 'rest' });
      actions.push({ label: 'Rest until healed', act: 'resthealed' });
    } else if (s.kind === 'camp') {
      text = 'An old hunting camp, dry and defensible. A good place to sleep with your armour on.';
      actions.push({ label: 'Rest until dawn', act: 'rest' });
      actions.push({ label: 'Rest until healed', act: 'resthealed' });
    }
    actions.push({ label: 'Leave', act: 'close' });
    UI.dialog({
      title: title,
      text: text,
      actions: actions,
      site: s,
      adv: Gg.activeAdv
    });
  }

  function siteAction(act, data) {
    var Gg = Campaign.G;
    var a = ADV.get(data.adv);
    var w = Campaign.advWorld(data.adv);
    var s = data.site;
    switch (act) {
      case 'enter-town':
        Campaign.autosave();
        Town.enter(data.adv);
        break;
      case 'enter-dungeon':
        Campaign.autosave();
        Dungeon.enter(s.advId || data.adv, 0);
        break;
      case 'rest':
        Campaign.restUntilDawn(true, 'The party rests until dawn at ' + s.name + '.');
        Gg.party.forEach(function (p) { p.fatigue = 0; });
        Campaign.autosave();
        Toast('Rested until dawn. Day ' + Gg.day, 'info');
        Game.dirty();
        break;
      case 'resthealed':
        Dungeon.restUntilHealed();
        Gg.party.forEach(function (p) { p.fatigue = 0; });
        Campaign.autosave();
        Game.dirty();
        break;
      case 'heal': {
        var cost = 20 * Gg.party.length;
        if (Gg.gold < cost) { Toast('You need ' + M.fmtGold(cost) + '.', 'warn'); return; }
        Gg.gold -= cost;
        Gg.party.forEach(function (p) { p.hp = Campaign.mhp(p); p.dead = 0; });
        Campaign.log('The healer tends the party. ' + M.fmtGold(cost) + ' paid.');
        Toast('The party is healed.', 'good');
        Game.dirty();
        break;
      }
      case 'pray': {
        w.wilds.holyDay = Gg.day;
        var gain = 100 * a.band;
        Campaign.grantXp(gain, 'Prayer at the holy site');
        break;
      }
      case 'lair': {
        var mons = s.mons || ['goblin'];
        var mobs = [];
        mons.forEach(function (mid) {
          var n = 2 + Math.floor(Math.random() * 2);
          for (var i = 0; i < n; i++) mobs.push({ id: mid });
        });
        Combat.start('overland', { adv: data.adv, lair: true, seed: 'lair:' + data.adv, mobs: mobs, ambush: false });
        break;
      }
      case 'hamlet-shop': {
        var hstr = new Streams('hamlet:' + data.adv + ':' + s.x + ',' + s.y).rng('r');
        Shop.open({ title: (s.name || 'Hamlet') + ' store', stock: TREASURE.shopStock(hstr, 'general', a.band), kind: 'general' });
        break;
      }
      case 'close':
        UI.close();
        break;
    }
  }

  /* ---------------- rendering ---------------- */
  function render(cv) {
    var g = cv.getContext('2d');
    var Gg = Campaign.G;
    var a = ADV.get(Gg.loc.adv);
    var w = Campaign.advWorld(a.id);
    var W = a.wilds.w, H = a.wilds.h;
    var tile = Math.min(TILE, Math.floor(Math.min(cv.width / W, cv.height / H)));
    var ox = Math.floor((cv.width - W * tile) / 2), oy = Math.floor((cv.height - H * tile) / 2);
    g.fillStyle = '#101408';
    g.fillRect(0, 0, cv.width, cv.height);
    for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) {
      var idx = y * W + x;
      var seen = w.wilds.visited.indexOf(idx) >= 0;
      var px = ox + x * tile, py = oy + y * tile;
      var t = a.wilds.terrain[idx];
      var col = WILDS.TERRAIN_INFO[t].color;
      if (!seen) { g.fillStyle = '#0c0f08'; g.fillRect(px, py, tile, tile); continue; }
      g.fillStyle = col;
      g.fillRect(px, py, tile, tile);
      // texture hint
      var rr = (x * 7 + y * 13) % 5;
      if (t === WILDS.T.FOREST || t === WILDS.T.GRASS) {
        g.fillStyle = t === WILDS.T.FOREST ? '#1f3018' : '#55683f';
        g.fillRect(px + (rr % 3) * (tile / 3) + 2, py + (rr % 2) * (tile / 2) + 2, 3, 3);
      }
      if (t === WILDS.T.MOUNTAIN) {
        g.fillStyle = '#3d3833';
        g.beginPath(); g.moveTo(px + 3, py + tile - 4); g.lineTo(px + tile / 2, py + 4); g.lineTo(px + tile - 3, py + tile - 4); g.closePath(); g.fill();
      }
      if (t === WILDS.T.RIVER) {
        g.fillStyle = '#3a6480';
        g.fillRect(px + 2, py + tile / 2 - 2, tile - 4, 4);
      }
      if (t === WILDS.T.ROAD || t === WILDS.T.BRIDGE) {
        g.fillStyle = t === WILDS.T.BRIDGE ? '#5d4a2a' : '#7a6a48';
        g.fillRect(px + tile / 4, py + tile / 4, tile / 2, tile / 2);
      }
    }
    // sites
    a.wilds.sites.forEach(function (s) {
      var idx = s.y * W + s.x;
      if (w.wilds.visited.indexOf(idx) < 0) return;
      var px = ox + s.x * tile + tile / 2, py = oy + s.y * tile + tile / 2;
      var img = Fig.site(s.kind);
      g.drawImage(img, px - tile / 2 + 1, py - tile / 2 + 1, tile - 2, tile - 2);
      if (s.sealed) {
        g.fillStyle = 'rgba(180,40,40,0.9)';
        g.fillRect(px - 3, py - 3, 6, 6);
      }
    });
    // party marker
    var ppx = ox + Gg.loc.x * tile + tile / 2, ppy = oy + Gg.loc.y * tile + tile / 2;
    g.fillStyle = '#ffd860';
    g.beginPath(); g.arc(ppx, ppy, tile / 3, 0, 7); g.fill();
    g.strokeStyle = '#2a2010'; g.lineWidth = 2; g.stroke();
    // day/night tint
    if (Campaign.isNight()) {
      g.fillStyle = 'rgba(10,10,30,0.45)';
      g.fillRect(0, 0, cv.width, cv.height);
    }
    return { ox: ox, oy: oy, tile: tile, W: W, H: H };
  }

  // tap handling: tap an adjacent tile to step; tap a site to open it
  function tap(px, py, layout) {
    var x = Math.floor((px - layout.ox) / layout.tile);
    var y = Math.floor((py - layout.oy) / layout.tile);
    var Gg = Campaign.G;
    if (x === Gg.loc.x && y === Gg.loc.y) {
      var s = siteAt(x, y);
      if (s) siteDialog(s);
      return;
    }
    var dx = x - Gg.loc.x, dy = y - Gg.loc.y;
    if (Math.abs(dx) + Math.abs(dy) === 1) step(dx, dy);
    else if (Math.abs(dx) <= 1 && Math.abs(dy) <= 1) {
      // diagonal: pick one axis
      if (dx) step(Math.sign(dx), 0); else step(0, Math.sign(dy));
    }
  }

  function stepSiteButton() {
    var Gg = Campaign.G;
    var s = siteAt(Gg.loc.x, Gg.loc.y);
    if (s) siteDialog(s);
    else Toast('Nothing of note here.', 'info');
  }

  // camp in the open wilds (R key)
  function campDialog() {
    var Gg = Campaign.G;
    if (Gg.phase !== 'overland') return;
    UI.dialog({
      title: 'Camp',
      text: 'The party makes a camp in the open wilds. Rest until dawn, or until every wound is closed? (Healers will cast and re-memorise between rests.)',
      actions: [
        { label: 'Rest until dawn', act: 'camp-rest' },
        { label: 'Rest until healed', act: 'camp-resthealed' },
        { label: 'Cancel', act: 'close' }
      ]
    });
  }

  return {
    enter: enter, step: step, render: render, tap: tap,
    siteAction: siteAction, siteAt: siteAt, stepSiteButton: stepSiteButton,
    campDialog: campDialog
  };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = { Overland: Overland };
