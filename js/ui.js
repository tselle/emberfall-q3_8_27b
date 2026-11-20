/* ============================================================
   EMBERFALL — ui.js
   The DOM panel layer: title, character creation, character
   sheets, inventory, spellbook, dialogs, shops, save/load,
   options, adventure selection, and the command bar. Panels
   are plain HTML strings; interaction is event-delegated via
   data-act attributes. All touch targets are generous.
   ============================================================ */
'use strict';

var UI = (function () {
  var rootId = '#ui';
  var barId = '#bar';

  function root() { return document.querySelector(rootId); }
  function bar() { return document.querySelector(barId); }

  function open(html, cls) {
    var r = root();
    r.innerHTML = html;
    r.className = 'open' + (cls ? ' ' + cls : '');
  }
  function close() {
    var r = root();
    r.className = '';
    r.innerHTML = '';
  }
  function isOpen() { return root().classList.contains('open'); }

  function setBar(buttons) {
    var b = bar();
    b.innerHTML = '';
    buttons.forEach(function (btn) {
      var el = document.createElement('button');
      el.className = 'bar-btn' + (btn.primary ? ' primary' : '');
      el.textContent = btn.label;
      el.dataset.act = btn.id;
      b.appendChild(el);
    });
  }
  function clearBar() { bar().innerHTML = ''; }

  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

  /* ---------------- toast (via M.Toast) ---------------- */
  function toast(msg, kind) { Toast(msg, kind); }

  /* ---------------- dialogs ---------------- */
  function dialog(o) {
    var h = '<div class="panel dlg">';
    h += '<div class="panel-h">' + esc(o.title) + '</div>';
    h += '<div class="dlg-body"><div class="dlg-text">' + esc(o.text) + '</div>';
    (o.lines || []).forEach(function (l) { h += '<div class="dlg-line">' + esc(l) + '</div>'; });
    h += '<div class="dlg-actions">';
    (o.actions || [{ label: 'Close', act: 'close' }]).forEach(function (a) {
      h += '<button class="btn" data-act="dlg.' + esc(a.act) + '" data-site="' + (o.site ? JSON.stringify(o.site).replace(/"/g, '&quot;') : '') + '" data-adv="' + (o.adv || '') + '" data-data="' + (a.data ? JSON.stringify(a.data).replace(/"/g, '&quot;') : '') + '">' + esc(a.label) + '</button>';
    });
    h += '</div></div></div>';
    open(h, 'dlg-open');
  }

  /* ============================================================
     TITLE
     ============================================================ */
  function title() {
    var h = '<div class="panel title">';
    h += '<div class="title-crest"></div>';
    h += '<h1>EMBERFALL</h1><h2>The Emberwild Saga</h2>';
    h += '<div class="title-sub">a gold-box rpg in your browser</div>';
    h += '<div class="title-actions">';
    h += '<button class="btn big" data-act="new">New Game</button>';
    h += '<button class="btn big" data-act="ready">Ready Company</button>';
    h += '<button class="btn big" data-act="load">Load Game</button>';
    h += '<button class="btn" data-act="help">How to Play</button>';
    h += '</div>';
    h += '<div class="title-foot">all art drawn in code · saves in your browser</div>';
    h += '</div>';
    open(h, 'title-open');
  }

  function howTo() {
    dialog({
      title: 'How to Play',
      text: 'You are a small company in the Emberwild. Towns are seen in first person (3D); the wilds and combat are tactical maps.',
      lines: [
        'Move with the on-screen pad or WASD / arrows. Q / E sidestep, Space or the action button interacts: doors, people, loot, stairs. F searches, R camps, 1–6 open character sheets, M map, J journal, B bestiary, Esc menu.',
        'A Ready Company starts at once; or build your own party of up to six.',
        'Time matters. Town and dungeon moves cost minutes; the wilds cost more. Night brings bolder monsters.',
        'Combat is turn-based. Move, attack, defend, cast, drink, or turn undead. Roll d20 + bonus against THAC0 to hit. Saves use the five second-edition categories. Foes with low morale may break and run. Switch on Auto in the combat bar to let the company fight itself.',
        'Quests are given in the guild hall. Main quest XP is a quarter of the listed reward, and is granted on completion. Training at the yard buys levels for 100 gold per level.',
        'Rest at inns, camps and healers — rest until dawn, or until every wound is closed. Pray at temples (once a day). The map shows explored ground.',
        'Mages copy wizard scrolls into their spellbook (Learn). Items dropped in dungeons stay on the ground. Thieves creep, listen and pick trap mechanisms; dwarves and thieves search best. The party cannot walk through a known monster.',
        'Save any time from the bar. Four slots plus an autosave. All saves live in this browser.'
      ],
      actions: [{ label: 'Understood', act: 'close' }]
    });
  }

  /* ============================================================
     CHARACTER CREATION
     ============================================================ */
  var create = { step: 0, idx: 0, draft: null, count: 3 };

  function createStart() {
    create.step = 0; create.idx = 0; create.draft = null;
    create.count = 3;
    createScreen();
  }
  function createScreen() {
    var Gg = Campaign.G;
    var h = '<div class="panel create">';
    h += '<div class="panel-h">New Company — character ' + (create.idx + 1) + ' of ' + create.count + '</div>';
    if (create.step === 0) {
      // party size + race
      h += '<div class="create-row">Party size: ';
      for (var n = 1; n <= 6; n++) h += '<button class="btn sm' + (create.count === n ? ' on' : '') + '" data-act="create.size" data-n="' + n + '">' + n + '</button>';
      h += '</div><div class="create-label">Race</div><div class="create-grid">';
      Object.keys(RULES.RACES).forEach(function (r) {
        var R = RULES.RACES[r];
        h += '<button class="card" data-act="create.race" data-r="' + r + '"><b>' + R.name + '</b><span>move ' + R.move + '</span></button>';
      });
      h += '</div>';
    } else if (create.step === 1) {
      var race = create.draft.race;
      h += '<div class="create-label">Class <span class="dim">(demi-humans may be capped by race)</span></div><div class="create-grid">';
      Object.keys(RULES.CLASSES).forEach(function (c) {
        var C = RULES.CLASSES[c];
        var cap = RULES.RACES[race].classes[c] || 20;
        h += '<button class="card" data-act="create.class" data-c="' + c + '"><b>' + C.name + '</b><span>HD ' + C.hd + ' · to lvl ' + cap + '</span></button>';
      });
      h += '</div>';
    } else if (create.step === 2) {
      var race2 = create.draft.race;
      var cls = create.draft.cls;
      h += '<div class="create-label">Alignment</div><div class="create-grid">';
      RULES.ALIGNMENTS.forEach(function (al) {
        var ok = RULES.classAllowsAlign(cls, al.id);
        h += '<button class="card' + (ok ? '' : ' off') + '" data-act="create.align" data-a="' + al.id + '"' + (ok ? '' : ' disabled') + '><b>' + al.name + '</b></button>';
      });
      h += '</div>';
    } else if (create.step === 3) {
      var d = create.draft;
      h += '<div class="create-label">Ability Scores <button class="btn sm" data-act="create.roll">Reroll (3d6 each)</button></div>';
      h += '<table class="stat-tbl"><tr><th>Score</th><th>Mod</th></tr>';
      ['str', 'int', 'wis', 'dex', 'con', 'cha'].forEach(function (k) {
        h += '<tr><td>' + RULES.ABILITY_NAMES[k] + '</td><td><b>' + d.attrs[k] + '</b> (' + (RULES.abilityMod(d.attrs[k]) >= 0 ? '+' : '') + RULES.abilityMod(d.attrs[k]) + ')</td></tr>';
      });
      h += '</table>';
    } else if (create.step === 4) {
      var d2 = create.draft;
      h += '<div class="create-label">Name</div>';
      h += '<div class="create-row"><input class="input" id="charName" value="' + esc(d2.name) + '" maxlength="18"> <button class="btn sm" data-act="create.rname">Random</button></div>';
      if (d2.cls === 'mage' || d2.cls === 'cleric') {
        var who = d2.cls === 'mage' ? 'wizard' : 'priest';
        var l1 = RULES.spellList(d2.cls === 'mage' ? 'mage' : 'cleric', 1).filter(function (id) { return RULES.SPELLS[who][id].lvl === 1; });
        h += '<div class="create-label">Choose 2 level-1 spells</div><div class="create-grid">';
        l1.forEach(function (sid) {
          var sel = d2.known.indexOf(sid) >= 0;
          h += '<button class="card sm' + (sel ? ' on' : '') + '" data-act="create.spell" data-s="' + sid + '"><b>' + RULES.SPELLS[who][sid].n + '</b></button>';
        });
        h += '</div>';
      }
    }
    h += '<div class="create-nav">';
    h += (create.step > 0 ? '<button class="btn" data-act="create.back">Back</button>' : '<button class="btn" data-act="create.size-1">- Party</button><button class="btn" data-act="create.size+1">+ Party</button>');
    if (create.step < 4) h += '<button class="btn primary" data-act="create.next">Next</button>';
    else h += '<button class="btn primary" data-act="create.finish">' + (create.idx + 1 < create.count ? 'Add to Party' : 'Set Out') + '</button>';
    h += '</div></div>';
    open(h, 'create-open');
  }

  function rollAttrs() {
    create.draft.attrs = { str: M.dice(6, 3), int: M.dice(6, 3), wis: M.dice(6, 3), dex: M.dice(6, 3), con: M.dice(6, 3), cha: M.dice(6, 3) };
  }

  function starterKit(cls) {
    var kit = { items: [], gold: 0, known: [] };
    kit.gold = M.dice(1, 6) * 10;
    if (cls === 'fighter') { kit.items.push({ id: 'short_sword', qty: 1 }, { id: 'leather', qty: 1 }, { id: 'rations', qty: 3 }, { id: 'torch', qty: 2 }); kit.gold += M.dice(1, 6) * 10; }
    if (cls === 'paladin') { kit.items.push({ id: 'long_sword', qty: 1 }, { id: 'chain', qty: 1 }, { id: 'buckler', qty: 1 }, { id: 'rations', qty: 3 }); }
    if (cls === 'ranger') { kit.items.push({ id: 'long_bow', qty: 1 }, { id: 'arrows', qty: 2 }, { id: 'short_sword', qty: 1 }, { id: 'studded', qty: 1 }, { id: 'rations', qty: 3 }); kit.gold += M.dice(1, 6) * 10; }
    if (cls === 'mage') { kit.items.push({ id: 'dagger', qty: 1 }, { id: 'leather', qty: 1 }, { id: 'rations', qty: 2 }); }
    if (cls === 'cleric') { kit.items.push({ id: 'mace', qty: 1 }, { id: 'chain', qty: 1 }, { id: 'rations', qty: 2 }); }
    if (cls === 'thief') { kit.items.push({ id: 'dagger', qty: 1 }, { id: 'leather', qty: 1 }, { id: 'lockpicks', qty: 1 }, { id: 'rations', qty: 2 }); }
    if (cls === 'mage' || cls === 'cleric') {
      var who = cls === 'mage' ? 'wizard' : 'priest';
      var l1 = RULES.spellList(cls === 'mage' ? 'mage' : 'cleric', 1).filter(function (id) { return RULES.SPELLS[who][id].lvl === 1; });
      // default first two; user can change
      kit.known = l1.slice(0, 2);
    }
    return kit;
  }

  function finishChar() {
    var Gg = Campaign.G;
    var d = create.draft;
    var name = (document.getElementById('charName') || {}).value || d.name;
    var kit = starterKit(d.cls);
    kit.known = d.known && d.known.length === 2 ? d.known : kit.known;
    var p = Campaign.makeChar({ name: name || d.name, race: d.race, cls: d.cls, align: d.align, attrs: d.attrs, items: kit.items, known: kit.known });
    Gg.gold += kit.gold;
    Gg.party.push(p);
    if (d.cls === 'mage' || d.cls === 'cleric') p.known = kit.known;
    create.idx++;
    create.draft = null;
    create.step = 0;
    if (create.idx >= create.count) {
      // set out
      Campaign.log('The company of ' + Gg.party.map(function (p) { return p.name; }).join(', ') + ' sets out. Starting gold: ' + M.fmtGold(Gg.gold) + '.');
      Campaign.setPhase('overland');
      Overland.enter('E0');
      UI.close();
    } else {
      createScreen();
    }
  }

  /* ============================================================
     CHARACTER SHEET
     ============================================================ */
  function sheet(idx) {
    var Gg = Campaign.G;
    var p = Gg.party[idx];
    if (!p) return;
    var s = Campaign.sheet(p);
    var h = '<div class="panel sheet"><div class="panel-h"><b>' + esc(p.name) + '</b> <span class="dim">' + RULES.RACES[p.race].name + ' ' + RULES.CLASSES[p.cls].name + ' · ' + RULES.alignmentName(p.align) + '</span></div>';
    h += '<div class="sheet-top"><canvas class="port" width="48" height="48"></canvas>';
    h += '<div class="sheet-vitals">';
    h += '<div>Level <b>' + p.level + '</b> / 20' + (p.cls && RULES.RACES[p.race].classes[p.cls] ? ' <span class="dim">(cap ' + RULES.RACES[p.race].classes[p.cls] + ')</span>' : '') + '</div>';
    h += '<div>HP <b>' + Math.max(0, p.hp) + ' / ' + s.mhp + '</b></div>';
    h += '<div>XP <b>' + M.fmtNum(p.xp) + '</b> / ' + M.fmtNum(Campaign.xpNext(p)) + '</div>';
    h += '</div></div>';
    h += '<div class="sheet-grid">';
    h += '<div class="stat">AC <b>' + s.ac + '</b> <span class="dim">(descending)</span></div>';
    h += '<div class="stat">THAC0 <b>' + s.thac0 + '</b></div>';
    h += '<div class="stat">Move <b>' + s.mv + '</b></div>';
    h += '<div class="stat">Hit <b>' + (Campaign.hitBonus(p, false) >= 0 ? '+' : '') + Campaign.hitBonus(p, false) + '</b> melee</div>';
    var wi = p.equip.weapon ? ITEMS[p.equip.weapon] : null;
    if (wi && wi.c === 'ranged') h += '<div class="stat">Hit <b>' + (Campaign.hitBonus(p, true) >= 0 ? '+' : '') + Campaign.hitBonus(p, true) + '</b> ranged</div>';
    h += '</div>';
    h += '<div class="panel-h">Saves <span class="dim">(need d20 ≥)</span></div><div class="sheet-grid">';
    RULES.SAVE_NAMES.forEach(function (n, i) { h += '<div class="stat">' + n.split(' / ')[0] + ' <b>' + s.saves[i] + '</b></div>'; });
    h += '</div>';
    // abilities
    h += '<div class="panel-h">Abilities</div><div class="sheet-grid">';
    ['str', 'int', 'wis', 'dex', 'con', 'cha'].forEach(function (k) {
      h += '<div class="stat">' + k.toUpperCase() + ' <b>' + p.attrs[k] + '</b></div>';
    });
    h += '</div>';
    // spells
    if (s.who) {
      h += '<div class="panel-h">Spells</div>';
      for (var lv in s.slots) {
        var used = 0;
        (p.known || []).forEach(function (sid) { if (RULES.SPELLS[s.who][sid].lvl == lv) used += (p.casts[sid] || 0); });
        h += '<div class="slotline">Level ' + lv + ': <b>' + used + ' / ' + s.slots[lv] + '</b> cast today</div>';
      }
      h += '<div class="known">';
      (p.known || []).forEach(function (sid) {
        var sp = RULES.SPELLS[s.who][sid];
        h += '<div class="known-line">' + sp.n + ' <span class="dim">L' + sp.lvl + '</span> — <span class="dim-sm">' + esc(sp.text) + '</span></div>';
      });
      h += '</div>';
    }
    // thief skills
    if (p.cls === 'thief') {
      h += '<div class="panel-h">Thief Skills</div><div class="sheet-grid">';
      RULES.THIEF_SKILLS.forEach(function (sk) {
        h += '<div class="stat">' + sk.name + ' <b>' + RULES.thiefChance(sk.id, p.level) + '%</b></div>';
      });
      h += '</div>';
    }
    // equipment
    h += '<div class="panel-h">Equipment</div><div class="equip">';
    [['weapon', 'Weapon'], ['armor', 'Armour'], ['shield', 'Shield'], ['ring1', 'Ring I'], ['ring2', 'Ring II'], ['cloak', 'Cloak'], ['amulet', 'Amulet'], ['boots', 'Boots'], ['belt', 'Belt'], ['gloves', 'Gloves']].forEach(function (e) {
      var id = p.equip[e[0]];
      var it = id ? ITEMS[id] : null;
      h += '<div class="equip-line"><span class="dim">' + e[1] + '</span> <b>' + (it ? esc(it.n) : '—') + '</b>' + (it ? ' <button class="btn sm" data-act="sheet.unequip" data-idx="' + idx + '" data-slot="' + e[0] + '">remove</button>' : '');
      if (e[0] === 'weapon' && p.cls === 'fighter') {
        h += p.spec === id ? ' <span class="good">★ specialized</span>' : (id ? ' <button class="btn sm" data-act="sheet.spec" data-idx="' + idx + '">specialize</button>' : '');
      }
      h += '</div>';
    });
    h += '</div>';
    h += '<div class="sheet-actions"><button class="btn" data-act="sheet.items" data-idx="' + idx + '">Inventory</button><button class="btn" data-act="sheet.close">Close</button></div>';
    h += '</div>';
    open(h, 'sheet-open');
    // draw portrait
    var c = root().querySelector('.port');
    if (c) c.getContext('2d').drawImage(Fig.portrait(p.race, p.cls), 0, 0);
  }

  /* ============================================================
     INVENTORY
     ============================================================ */
  var invChar = 0;
  function inventory() {
    var Gg = Campaign.G;
    invChar = Math.min(invChar, Gg.party.length - 1);
    var p = Gg.party[invChar];
    var h = '<div class="panel inv"><div class="panel-h">Inventory <span class="dim">party gold: ' + M.fmtGold(Gg.gold) + '</span></div>';
    h += '<div class="inv-tabs">';
    Gg.party.forEach(function (q, i) { h += '<button class="btn sm' + (i === invChar ? ' on' : '') + '" data-act="inv.tab" data-idx="' + i + '">' + esc(q.name) + '</button>'; });
    h += '</div><div class="inv-list">';
    var sorted = p.items.slice().sort(function (a, b) { return (ITEMS[b.id] && ITEMS[b.id].n || b.id).localeCompare(ITEMS[a.id] && ITEMS[a.id].n || a.id); });
    if (!sorted.length) h += '<div class="dim">Empty pack.</div>';
    sorted.forEach(function (e) {
      var it = ADV.itemOf(e.id);
      if (!it) return;
      h += '<div class="inv-row"><canvas class="inv-ic" width="24" height="24" data-ic="' + e.id + '"></canvas><div class="inv-main"><b>' + esc(it.n) + '</b>' + (e.qty > 1 ? ' ×' + e.qty : '') + '<div class="dim-sm">' + descOf(it) + '</div></div><div class="inv-acts">';
      if (usable(it)) h += '<button class="btn sm" data-act="inv.use" data-idx="' + invChar + '" data-id="' + e.id + '">use</button>';
      if (it.c === 'scroll' && it.sc && it.sc.who === 'wizard' && p.cls === 'mage') {
        var known = (p.known || []).indexOf(it.sc.spell) >= 0;
        h += '<button class="btn sm' + (known ? ' disabled' : '') + '" data-act="inv.learn" data-idx="' + invChar + '" data-id="' + e.id + '"' + (known ? ' disabled' : '') + '>' + (known ? 'learned' : 'learn') + '</button>';
      }
      if (equipable(it)) h += '<button class="btn sm" data-act="inv.equip" data-idx="' + invChar + '" data-id="' + e.id + '">equip</button>';
      h += '<button class="btn sm" data-act="inv.drop" data-idx="' + invChar + '" data-id="' + e.id + '">drop</button>';
      h += '</div></div>';
    });
    h += '</div><div class="sheet-actions"><button class="btn" data-act="inv.close">Close</button></div></div>';
    open(h, 'inv-open');
    root().querySelectorAll('canvas.inv-ic').forEach(function (c) {
      c.getContext('2d').drawImage(Fig.icon(ADV.itemOf(c.dataset.ic) || { id: c.dataset.ic, c: 'gear' }), 0, 0);
    });
  }
  function descOf(it) {
    if (it.desc) return it.desc;
    var bits = [];
    if (it.d) bits.push('dmg ' + it.d);
    if (it.ac) bits.push('AC ' + it.ac);
    if (it.rng) bits.push('range ' + it.rng);
    if (it.p && it.p.heal) bits.push('heals ' + it.p.heal);
    return bits.join(' · ') || 'A fine piece of work.';
  }
  function usable(it) { return it.c === 'potion' || it.c === 'scroll' || it.c === 'wand'; }
  function equipable(it) { return ['weapon', 'ranged', 'armor', 'shield', 'ring', 'cloak', 'amulet', 'boots', 'belt', 'gloves', 'staff'].indexOf(it.c) >= 0; }

  /* ============================================================
     SHOP
     ============================================================ */
  var Shop = {
    cur: null,
    open: function (o) {
      Shop.cur = o; // {title, stock:[{id,qty,price}], kind}
      shopScreen();
    },
    buy: function (i) {
      var Gg = Campaign.G;
      var e = Shop.cur.stock[i];
      if (!e || e.qty <= 0) return;
      if (Gg.gold < e.price) { Toast('Not enough gold.', 'warn'); return; }
      Gg.gold -= e.price;
      var p = Gg.party[0];
      for (var k = 0; k < Gg.party.length; k++) { if (!Gg.party[k].dead) { p = Gg.party[k]; break; } }
      Campaign.addItem(p, e.id, 1);
      e.qty--;
      Toast('Bought ' + ADV.itemOf(e.id).n, 'good');
      shopScreen();
    },
    sell: function (itemId) {
      var Gg = Campaign.G;
      var p = null;
      for (var k = 0; k < Gg.party.length; k++) if (Campaign.countItem(Gg.party[k], itemId)) { p = Gg.party[k]; break; }
      if (!p) return;
      var it = ADV.itemOf(itemId);
      var price = Math.max(1, Math.round(it.price * 0.5));
      Campaign.removeItem(p, itemId);
      Gg.gold += price;
      Toast('Sold ' + it.n + ' for ' + M.fmtGold(price), 'good');
      shopScreen();
    }
  };
  function shopScreen() {
    var Gg = Campaign.G;
    var o = Shop.cur;
    var h = '<div class="panel shop"><div class="panel-h">' + esc(o.title) + ' <span class="dim">gold: ' + M.fmtGold(Gg.gold) + '</span></div>';
    h += '<div class="shop-cols"><div class="shop-col"><div class="panel-h">For Sale</div>';
    o.stock.forEach(function (e, i) {
      var it = ADV.itemOf(e.id);
      if (!it) return;
      h += '<div class="inv-row"><canvas class="inv-ic" width="24" height="24" data-ic="' + e.id + '"></canvas><div class="inv-main"><b>' + esc(it.n) + '</b> <span class="dim">×' + e.qty + '</span><div class="dim-sm">' + descOf(it) + '</div></div><button class="btn sm" data-act="shop.buy" data-i="' + i + '">' + M.fmtGold(e.price) + '</button></div>';
    });
    h += '</div><div class="shop-col"><div class="panel-h">Your Goods <span class="dim">(sell at half)</span></div>';
    var shown = {};
    Gg.party.forEach(function (p) {
      p.items.forEach(function (e) {
        var it = ADV.itemOf(e.id);
        if (!it || !it.price) return;
        var key = e.id;
        if (!shown[key]) { shown[key] = 1; h += '<div class="inv-row"><b>' + esc(it.n) + '</b><button class="btn sm" data-act="shop.sell" data-id="' + e.id + '">' + M.fmtGold(Math.max(1, Math.round(it.price * 0.5))) + '</button></div>'; }
      });
    });
    h += '</div></div><div class="sheet-actions"><button class="btn" data-act="shop.close">Leave</button></div></div>';
    open(h, 'shop-open');
    root().querySelectorAll('canvas.inv-ic').forEach(function (c) {
      c.getContext('2d').drawImage(Fig.icon(ADV.itemOf(c.dataset.ic) || { id: c.dataset.ic, c: 'gear' }), 0, 0);
    });
  }

  /* ============================================================
     SAVE / LOAD
     ============================================================ */
  var _lastLoadMode = false;
  function saveLoad(loadMode) {
    _lastLoadMode = !!loadMode;
    var h = '<div class="panel save"><div class="panel-h">' + (loadMode ? 'Load Game' : 'Save Game') + '</div>';
    Campaign.slotsList().forEach(function (slot) {
      var meta = Campaign.saveMeta(slot);
      var has = Campaign.hasSave(slot);
      h += '<div class="slotline"><div><b>' + Campaign.slotLabel(slot) + '</b>' + (has && meta ? ' <span class="dim">day ' + (meta.day || '?') + ' · ' + (meta.party || []).map(function (p) { return p.name + ' L' + p.level; }).join(', ') : ' <span class="dim">empty</span>') + '</div>';
      h += '<div class="slot-acts"><button class="btn sm" data-act="save.act" data-mode="' + (loadMode ? 'load' : 'save') + '" data-slot="' + slot + '">' + (loadMode ? 'Load' : 'Save') + '</button>';
      if (has && slot !== 'autosave') h += '<button class="btn sm" data-act="save.erase" data-slot="' + slot + '">Erase</button>';
      h += '</div></div>';
    });
    h += '</div></div>';
    open(h, 'save-open');
  }

  /* ============================================================
     ADVENTURE SELECT
     ============================================================ */
  function select() {
    var Gg = Campaign.G;
    var h = '<div class="panel select"><div class="panel-h">The Emberwild — choose a venture</div>';
    h += '<div class="select-list">';
    ADV.ORDER.forEach(function (id) {
      var a = ADV.get(id);
      var w = Campaign.advWorld(id);
      var done = w.quests[a.mainQuest] && w.quests[a.mainQuest].status === 'done';
      h += '<button class="adv-card' + (Gg.activeAdv === id ? ' on' : '') + '" data-act="select.adv" data-id="' + id + '"><b>' + esc(a.name) + '</b><span class="dim">L' + a.levels + ' · ' + a.size + (done ? ' · ★ complete' : '') + '</span><span class="dim-sm">' + esc(a.desc) + '</span></button>';
    });
    h += '</div><div class="sheet-actions"><button class="btn" data-act="select.close">Close</button></div></div>';
    open(h, 'select-open');
  }

  /* ============================================================
     OPTIONS
     ============================================================ */
  function options() {
    var Gg = Campaign.G;
    var h = '<div class="panel opts"><div class="panel-h">Options</div>';
    h += '<div class="slotline"><span>Low effects (for old tablets)</span><button class="btn sm' + (Gg.options.lowFx ? ' on' : '') + '" data-act="opts.lowfx">' + (Gg.options.lowFx ? 'On' : 'Off') + '</button></div>';
    h += '<div class="sheet-actions"><button class="btn" data-act="opts.close">Close</button></div></div>';
    open(h, 'opts-open');
  }

  return {
    open: open, close: close, isOpen: isOpen, setBar: setBar, clearBar: clearBar, esc: esc,
    root: function () { return document.querySelector(rootId); },
    title: title, howTo: howTo, dialog: dialog,
    createStart: createStart, createScreen: createScreen, rollAttrs: rollAttrs, finishChar: finishChar, starterKit: starterKit,
    sheet: sheet, inventory: inventory, saveLoad: saveLoad, select: select, options: options,
    setInvTab: function (i) { invChar = i; },
    isLoadMode: function () { return _lastLoadMode; },
    Shop: Shop, shopScreen: shopScreen,
    _create: create
  };
})();

// Shop is referenced by other modules before UI is fully used; expose it
var Shop = UI.Shop;

if (typeof module !== 'undefined' && module.exports) module.exports = { UI: UI, Shop: Shop };
