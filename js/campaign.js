/* ============================================================
   EMBERFALL — campaign.js
   Core game state: the party, character sheets, ability
   scores, levels & XP, time of day, the world state per
   adventure (wilderness position, dungeon floor progress,
   quests), save/load to localStorage (4 slots + autosave),
   and scene transitions. G is the single global game object.
   ============================================================ */
'use strict';

var Campaign = (function () {
  var G = null;

  /* ---------------- new game ---------------- */
  function newGame() {
    G = {
      version: 1,
      phase: 'create',
      party: [],
      gold: 0,
      day: 1,
      minute: 8 * 60,
      activeAdv: 'E0',
      loc: null,
      world: {},
      bestiary: {},
      journal: [],
      seen: {},
      options: { lowFx: 0 }
    };
    log('A new company sets out into the Emberwild.');
  }

  /* ---------------- journal ---------------- */
  function log(text) {
    if (!G) return;
    G.journal.push({ day: G.day, minute: G.minute, text: text });
    if (G.journal.length > 300) G.journal.splice(0, G.journal.length - 300);
  }

  /* ---------------- time ---------------- */
  function isNight() { return G.minute >= 20 * 60 || G.minute < 6 * 60; }
  function addMinutes(n) {
    G.minute += n;
    while (G.minute >= 1440) {
      G.minute -= 1440;
      G.day++;
      onDawn();
    }
  }
  function onDawn() {
    // spell slots reset
    G.party.forEach(function (p) { p.casts = {}; });
    log('Dawn. Day ' + G.day + '.');
  }
  // rest until dawn: advance clock, heal, reset spell slots
  function restUntilDawn(fullHeal, note) {
    var toNext = 1440 - G.minute;
    if (G.minute >= 6 * 60 && G.minute < 20 * 60) toNext = (24 * 60 - G.minute); // to next dawn
    G.minute += toNext;
    while (G.minute >= 1440) { G.minute -= 1440; G.day++; }
    G.party.forEach(function (p) {
      p.casts = {};
      if (fullHeal) p.hp = mhp(p);
      if (p.hp <= 0) p.hp = 1;
    });
    if (note) log(note);
  }

  /* ---------------- characters ---------------- */
  function makeChar(o) {
    var p = {
      id: 'c' + (G.party.length + 1),
      name: o.name, race: o.race, cls: o.cls, align: o.align,
      attrs: o.attrs, level: 1, xp: 0,
      hp: 1, gold: 0,
      items: o.items || [],
      equip: { weapon: null, armor: null, shield: null, ring1: null, ring2: null, cloak: null, amulet: null, boots: null, belt: null, gloves: null },
      spec: null,
      known: o.known || [],
      casts: {},
      _base: 0,
      dead: 0,
      prayedDay: 0,
      fatigue: 0
    };
    // auto-equip starter gear
    autoEquip(p);
    var s = sheet(p);
    p._base = Math.round(RULES.parseDice(RULES.hitDice(p.race, p.cls)).avg);
    p.hp = sheet(p).mhp;
    return p;
  }

  function autoEquip(p) {
    var it = p.items;
    function find(cat, pred) {
      for (var i = 0; i < it.length; i++) {
        var e = ITEMS[it[i].id];
        if (e && e.c === cat && (!pred || pred(e))) return it[i].id;
      }
      return null;
    }
    p.equip.weapon = find('weapon', function (e) { return e.h === 1; }) || find('weapon') || find('ranged');
    p.equip.armor = find('armor');
    p.equip.shield = find('shield');
    if (!p.equip.weapon) p.equip.weapon = find('ranged');
  }

  // derived sheet
  function sheet(p) {
    var R = RULES;
    var a = p.attrs;
    var strM = R.abilityMod(a.str), intM = R.abilityMod(a.int), wisM = R.abilityMod(a.wis);
    var dexM = R.abilityMod(a.dex), conM = R.abilityMod(a.con);
    // AC (descending)
    var ac = 9;
    var armor = p.equip.armor ? ITEMS[p.equip.armor] : null;
    var shield = p.equip.shield ? ITEMS[p.equip.shield] : null;
    if (armor && armor.c === 'armor') ac = armor.ac;
    if (shield && shield.c === 'shield') ac -= shield.ac;
    ac -= dexM; // higher dexterity improves (lowers) AC
    // magic fx on AC
    ['ring1','ring2','cloak','amulet','boots','belt','gloves','armor','shield'].forEach(function (slot) {
      var id = p.equip[slot];
      if (!id) return;
      var e = ITEMS[id];
      if (e && e.fx && e.fx.ac) ac -= e.fx.ac;
    });
    ac = Math.max(1, ac);
    var thac0 = R.THAC0[p.cls][p.level - 1];
    // hit bonus = (19 - thac0) + str (melee) / dex (ranged)
    var mv = R.RACES[p.race].move;
    // max hp: base (rolled) + con
    var hd = R.hitDice(p.race, p.cls);
    if (!p._base) p._base = Math.round(R.parseDice(hd).avg);
    var mhp = Math.max(1, p._base + conM);
    // saves
    var saves = {};
    for (var i = 0; i < R.SAVE_NAMES.length; i++) {
      saves[i] = R.saveValue(p.cls, p.level, i, p.race);
    }
    // spell slots
    var slots = {};
    var who = p.cls === 'mage' ? 'wizard' : p.cls === 'cleric' ? 'priest' : null;
    if (who && R.SPELL_SLOTS[who][p.level]) {
      for (var lv in R.SPELL_SLOTS[who][p.level]) slots[lv] = R.SPELL_SLOTS[who][p.level][lv];
    }
    return { ac: ac, thac0: thac0, mv: mv, mhp: mhp, strM: strM, dexM: dexM, wisM: wisM, intM: intM, saves: saves, slots: slots, who: who, hd: hd };
  }

  function hitBonus(p, ranged) {
    var s = sheet(p);
    var b = 19 - s.thac0;
    b += ranged ? s.dexM : s.strM;
    var w = p.equip.weapon ? ITEMS[p.equip.weapon] : null;
    if (w && p.spec === w.id) b += 1;
    return b;
  }
  function dmgBonus(p) {
    var s = sheet(p);
    var b = s.strM;
    var w = p.equip.weapon ? ITEMS[p.equip.weapon] : null;
    if (w && p.spec === w.id) b += 2;
    return b;
  }

  /* ---------------- items ---------------- */
  function countItem(p, id) {
    var n = 0;
    for (var i = 0; i < p.items.length; i++) if (p.items[i].id === id) n += p.items[i].qty;
    return n;
  }
  function addItem(p, id, qty) {
    qty = qty || 1;
    for (var i = 0; i < p.items.length; i++) if (p.items[i].id === id) { p.items[i].qty += qty; return; }
    p.items.push({ id: id, qty: qty });
  }
  function removeItem(p, id, qty) {
    qty = qty || 1;
    for (var i = 0; i < p.items.length; i++) {
      if (p.items[i].id === id) {
        p.items[i].qty -= qty;
        if (p.items[i].qty <= 0) p.items.splice(i, 1);
        return;
      }
    }
  }
  function partyItem(id, qty) {
    for (var i = 0; i < G.party.length; i++) if (countItem(G.party[i], id) >= (qty || 1)) return G.party[i];
    return null;
  }

  // equip an item on a character (finds the slot by category)
  function equipItem(p, id) {
    var e = ITEMS[id];
    if (!e) return;
    var slot = null;
    if (e.c === 'weapon' || e.c === 'ranged') slot = 'weapon';
    else if (e.c === 'armor') slot = 'armor';
    else if (e.c === 'shield') slot = 'shield';
    else if (e.c === 'ring') slot = (p.equip.ring1 === id || !p.equip.ring1) ? 'ring1' : (p.equip.ring2 === id || !p.equip.ring2) ? 'ring2' : 'ring1';
    else if (e.c === 'cloak') slot = 'cloak';
    else if (e.c === 'amulet') slot = 'amulet';
    else if (e.c === 'boots') slot = 'boots';
    else if (e.c === 'belt') slot = 'belt';
    else if (e.c === 'gloves') slot = 'gloves';
    else if (e.c === 'staff') slot = 'weapon';
    if (!slot) return;
    p.equip[slot] = id;
    if (slot === 'weapon') {
      // weapon specialization: a fighter may specialize in one weapon
      if (p.cls === 'fighter' && p.spec !== id) { /* set via UI */ }
    }
  }
  function unequip(p, slot) { p.equip[slot] = null; }

  /* ---------------- XP & levels ---------------- */
  function xpNext(p) { return RULES.XP[p.cls][p.level]; } // xp to reach level+1 (index level)
  function grantXp(xp, reason) {
    var survivors = G.party.filter(function (p) { return !p.dead; });
    if (!survivors.length) return;
    // experience is split equally among the survivors
    var share = Math.floor(xp / survivors.length);
    survivors.forEach(function (p) {
      p.xp += share;
      while (p.level < 20 && p.xp >= RULES.XP[p.cls][p.level]) {
        p.level++;
        levelUp(p);
      }
    });
    if (reason) log(reason + ' +' + xp + ' experience (' + share + ' each).');
  }
  function levelUp(p) {
    var s = sheet(p);
    var d = RULES.parseDice(s.hd);
    var roll = M.dice(d.sides, d.n);
    p._base += roll;
    p.hp = sheet(p).mhp;
    log(p.name + ' is now level ' + p.level + '!');
    Toast(p.name + ' reached level ' + p.level, 'levelup');
    G.dirty = true;
  }

  // training hall: buy the next level for 100gp per level
  function train(p) {
    if (p.level >= 20) return 'Level 20 is the limit.';
    var cost = RULES.trainCost(p.level + 1);
    if (G.gold < cost) return 'You need ' + M.fmtGold(cost) + '.';
    G.gold -= cost;
    p.xp = RULES.XP[p.cls][p.level]; // exactly the threshold
    p.level++;
    levelUp(p);
    log(p.name + ' trained to level ' + p.level + ' for ' + M.fmtGold(cost) + '.');
    G.dirty = true;
    return null;
  }

  /* ---------------- quests ---------------- */
  function advWorld(id) {
    if (!G.world[id]) G.world[id] = { wilds: { x: 0, y: 0, visited: [], lairCleared: 0, holyDay: 0 }, dungeon: { floors: [] }, quests: {}, flags: {} };
    var w = G.world[id];
    var a = ADV.get(id);
    while (w.dungeon.floors.length < a.floors.length) {
      w.dungeon.floors.push({ visited: [], doorsOpen: [], doorsFound: [], trapsFound: [], trapsSprung: [], lootTaken: [], goldTaken: [], keysTaken: [], shrineUsed: 0, killed: [], bossDead: 0 });
    }
    return w;
  }
  function questStatus(id, qid) {
    var w = advWorld(id);
    return w.quests[qid] ? w.quests[qid].status : 'open';
  }
  function completeQuest(id, qid) {
    var a = ADV.get(id);
    var w = advWorld(id);
    if (w.quests[qid] && w.quests[qid].status === 'done') return;
    var q = null;
    for (var i = 0; i < a.quests.length; i++) if (a.quests[i].id === qid) q = a.quests[i];
    if (!q) return;
    w.quests[qid] = { status: 'done', day: G.day };
    G.gold += q.gold;
    // quest XP is a quarter of the listed value
    grantXp(Math.floor(q.xp / 4), 'Quest complete: ' + q.name);
    log('Quest complete: ' + q.name + '. Reward: ' + M.fmtGold(q.gold) + '.');
    Toast('Quest complete: ' + q.name, 'quest');
    G.dirty = true;
  }

  /* ---------------- save / load ---------------- */
  function saveGame(slot) {
    var data = JSON.stringify(G);
    SaveSys.save(slot, data);
    Toast('Saved to ' + slotLabel(slot), 'save');
  }
  function loadGame(slot) {
    var data = SaveSys.load(slot);
    if (!data) return false;
    try {
      G = JSON.parse(data.state);
      G.dirty = true;
      return true;
    } catch (e) { return false; }
  }
  function hasSave(slot) { return SaveSys.load(slot) != null; }
  function saveMeta(slot) { return SaveSys.meta(slot); }
  function eraseSave(slot) { SaveSys.erase(slot); }
  function slotLabel(slot) { return slot === 'autosave' ? 'Autosave' : 'Slot ' + slot.replace('slot', ''); }
  function slotsList() { return ['slot1', 'slot2', 'slot3', 'slot4', 'autosave']; }

  // autosave triggers
  function autosave() {
    try { saveGameSilent(); } catch (e) { /* ignore */ }
  }
  function saveGameSilent() { SaveSys.save('autosave', JSON.stringify(G)); }

  /* ---------------- bestiary ---------------- */
  function seenMonster(id) {
    if (!G.bestiary[id]) {
      G.bestiary[id] = { n: 0, day: G.day };
      log('A ' + MONSTERS[id].n.toLowerCase() + ' joins your bestiary.');
    }
    G.bestiary[id].n++;
  }

  /* ---------------- scene helpers ---------------- */
  function setPhase(phase, loc) {
    G.phase = phase;
    if (loc) G.loc = loc;
    G.dirty = true;
  }

  /* ---------------- misc ---------------- */
  function mhp(p) { return sheet(p).mhp; }
  function activeChar() { return G.party[0] && !G.party[0].dead ? G.party[0] : G.party.find(function (p) { return !p.dead; }); }

  return {
    newGame: newGame, log: log, isNight: isNight, addMinutes: addMinutes, restUntilDawn: restUntilDawn,
    makeChar: makeChar, autoEquip: autoEquip, sheet: sheet, hitBonus: hitBonus, dmgBonus: dmgBonus,
    mhp: mhp, activeChar: activeChar,
    countItem: countItem, addItem: addItem, removeItem: removeItem, partyItem: partyItem,
    equipItem: equipItem, unequip: unequip,
    xpNext: xpNext, grantXp: grantXp, levelUp: levelUp, train: train,
    advWorld: advWorld, questStatus: questStatus, completeQuest: completeQuest,
    saveGame: saveGame, loadGame: loadGame, hasSave: hasSave, saveMeta: saveMeta, eraseSave: eraseSave,
    slotLabel: slotLabel, slotsList: slotsList, autosave: autosave,
    seenMonster: seenMonster, setPhase: setPhase,
    get G() { return G; },
    setG: function (g) { G = g; }
  };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = { Campaign: Campaign };


/* ============================================================
   TOWN SCENE (3D first person)
   ============================================================ */
var Town = (function () {
  var cur = null; // {adv, bld: null|bldId, doorIdx}

  function enter(advId) {
    var a = ADV.get(advId);
    var t = a.town;
    cur = { adv: advId, bld: null, doorIdx: null };
    View.map = townMap(a, null);
    View.dark = false; View.light = 14;
    View.setPos(t.gate.x + 0.5, t.gate.y + 0.5, -Math.PI / 2);
    Campaign.setPhase('town', { kind: 'town', adv: advId, x: t.gate.x, y: t.gate.y });
    Campaign.log('The company enters ' + a.townName + '.');
    UI.close(); // entering the town dismisses any open dialog (e.g. 'Enter {town}')
    UI.setBar([
      { id: 'town.interact', label: 'Action', primary: true },
      { id: 'map.open', label: 'Map' },
      { id: 'town.out', label: 'Leave Town' },
      { id: 'save.menu', label: 'Save' }
    ]);
    Game.dirty();
  }

  function townMap(a, bldId) {
    var t = a.town;
    var sprites = [];
    // doors (floor cells with events): draw a door sprite
    for (var k in t.doors) {
      sprites.push({ x: (+k % t.w) + 0.5, y: (Math.floor(+k / t.w)) + 0.5, img: Fig.texture(11), scale: 0.55, h: 1.1, floor: 0 });
    }
    // npcs
    Object.keys(t.npcs).forEach(function (id) {
      var n = t.npcs[id];
      if (n.bld) return; // interior npcs drawn there
      sprites.push({ x: n.x + 0.5, y: n.y + 0.5, img: Fig.figure('human', 'fighter'), scale: 1.0 });
    });
    // well
    if (t.events) {
      for (var ek in t.events) {
        if (t.events[ek].kind === 'well') {
          sprites.push({ x: (+ek % t.w) + 0.5, y: (Math.floor(+ek / t.w)) + 0.5, img: wellSprite(), scale: 0.7, h: 0.9, floor: 0 });
        }
      }
    }
    return { w: t.w, h: t.h, solid: t.solid, tex: t.tex, doors: t.doors, sprites: sprites };
  }

  var _well = null;
  function wellSprite() {
    if (_well) return _well;
    var c = document.createElement('canvas'); c.width = 16; c.height = 16;
    var g = c.getContext('2d');
    g.fillStyle = '#6a6a62'; g.fillRect(3, 6, 10, 8);
    g.fillStyle = '#4a4a44'; g.fillRect(4, 7, 8, 6);
    g.fillStyle = '#3a5a70'; g.fillRect(6, 8, 4, 4);
    g.fillStyle = '#5d4a2a'; g.fillRect(2, 2, 2, 4); g.fillRect(12, 2, 2, 4);
    g.fillRect(2, 2, 12, 2);
    _well = c;
    return c;
  }

  function enterInterior(bldId) {
    var a = ADV.get(cur.adv);
    var t = a.town;
    var b = t.buildingsById[bldId];
    // build interior 7x6
    var w = 7, h = 6;
    var solid = new Uint8Array(w * h);
    var tex = new Uint8Array(w * h);
    for (var i = 0; i < w * h; i++) { solid[i] = 1; tex[i] = 8; }
    for (var y = 1; y < h - 1; y++) for (var x = 1; x < w - 1; x++) solid[y * w + x] = 0;
    // exit cell at bottom centre
    var ex = 3, ey = h - 1;
    solid[ey * w + ex] = 0;
    var doors = {};
    var sprites = [{ x: ex + 0.5, y: ey + 0.5 - 0.4, img: Fig.texture(11), scale: 0.55, h: 1.1, floor: 0 }];
    // counter sprite
    var counter = counterSprite(b.kind);
    sprites.push({ x: 3.5, y: 1.5, img: counter, scale: 0.8, h: 0.7, floor: 0 });
    // npc
    var npc = null;
    Object.keys(t.npcs).forEach(function (id) {
      var n = t.npcs[id];
      if (n.bld === bldId) { npc = n; sprites.push({ x: 3.5, y: 3.5, img: Fig.figure('human', n.role === 'priest' ? 'cleric' : 'fighter'), scale: 1.0 }); }
    });
    var ev = {};
    ev[3 * w + 1] = { kind: 'counter', bld: bldId };
    ev[ey * w + ex] = { kind: 'exit' };
    ev[3 * w + 3] = { kind: npc ? 'npc' : 'counter', bld: bldId, npc: npc ? npc.id : null };
    // remember which town door we came through
    var townDoor = null;
    for (var k2 in t.doors) if (t.doors[k2].bld === bldId) townDoor = +k2;
    cur.bld = bldId;
    cur.doorIdx = townDoor;
    View.map = { w: w, h: h, solid: solid, tex: tex, doors: doors, sprites: sprites, events: ev };
    View.dark = true; View.light = 6;
    View.setPos(ex + 0.5, ey - 0.5, -Math.PI / 2);
    Campaign.setPhase('building', { kind: 'building', adv: cur.adv, bld: bldId, x: ex, y: ey - 1 });
    Campaign.addMinutes(1);
    UI.setBar([
      { id: 'town.interact', label: 'Action', primary: true },
      { id: 'building.exit', label: 'Exit' },
      { id: 'save.menu', label: 'Save' }
    ]);
    Game.dirty();
  }

  var _counters = {};
  function counterSprite(kind) {
    if (_counters[kind]) return _counters[kind];
    var c = document.createElement('canvas'); c.width = 32; c.height = 16;
    var g = c.getContext('2d');
    g.fillStyle = '#5d4a2a'; g.fillRect(2, 4, 28, 10);
    g.fillStyle = '#6b5636'; g.fillRect(2, 2, 28, 4);
    g.fillStyle = '#4a3a20'; g.fillRect(4, 8, 6, 4); g.fillRect(22, 8, 6, 4);
    if (kind === 'temple') { g.fillStyle = '#e8c850'; g.fillRect(15, 0, 2, 8); g.fillRect(12, 3, 8, 2); }
    if (kind === 'hall') { g.fillStyle = '#8a6a30'; g.fillRect(10, 6, 12, 3); }
    if (kind === 'inn') { g.fillStyle = '#7a4a3a'; g.fillRect(6, 6, 8, 4); g.fillRect(20, 6, 6, 4); }
    _counters[kind] = c;
    return c;
  }

  function exitInterior() {
    var a = ADV.get(cur.adv);
    var t = a.town;
    var idx = cur.doorIdx;
    cur.bld = null;
    View.map = townMap(a, null);
    View.dark = false; View.light = 14;
    var x = idx % t.w, y = Math.floor(idx / t.w);
    View.setPos(x + 0.5, y + 0.9, Math.PI / 2);
    Campaign.setPhase('town', { kind: 'town', adv: cur.adv, x: x, y: y });
    Game.dirty();
  }

  function canStep(nx, ny) {
    if (View.map.solid[ny * View.map.w + nx]) return false;
    return true;
  }

  function step(dx, dy) {
    if (G.phase !== 'town' && G.phase !== 'building') return;
    var Gg = Campaign.G;
    var nx = Gg.loc.x + dx, ny = Gg.loc.y + dy;
    if (nx < 0 || ny < 0 || nx >= View.map.w || ny >= View.map.h) { Game.dirty(); return; }
    if (!canStep(nx, ny)) return;
    Gg.loc.x = nx; Gg.loc.y = ny;
    View.glide(nx + 0.5, ny + 0.5);
    Campaign.addMinutes(1);
    // events
    var ev = View.map.events && View.map.events[ny * View.map.w + nx];
    if (ev && ev.kind === 'exit') { exitInterior(); return; }
    if (View.map.doors[ny * View.map.w + nx] && Gg.phase === 'town') {
      // stepping on a town door cell: walk through to interior (door is a floor cell)
      var d = View.map.doors[ny * View.map.w + nx];
      if (d.kind === 'building') { enterInterior(d.bld); return; }
    }
    // gate
    if (Gg.phase === 'town') {
      var a = ADV.get(Gg.loc.adv);
      if (nx === a.town.gate.x && ny === a.town.gate.y) {
        // gate: offer to leave
        leaveTown();
        return;
      }
    }
    Game.dirty();
  }

  function leaveTown() {
    var Gg = Campaign.G;
    var a = ADV.get(Gg.loc.adv);
    var w = Campaign.advWorld(a.id);
    var site = a.wilds.sites.find(function (s) { return s.kind === 'town'; });
    w.wilds.x = site.x; w.wilds.y = site.y;
    Overland.enter(a.id);
  }

  function facingCell() {
    var Gg = Campaign.G;
    var vx = ((Math.round(View.dir / (Math.PI / 2)) % 4) + 4) % 4;
    // dir 0 = east, PI/2 = south, -PI/2 = north (matches the raycaster)
    var dx = [1, 0, -1, 0][vx], dy = [0, 1, 0, -1][vx];
    return { x: Gg.loc.x + dx, y: Gg.loc.y + dy };
  }

  function interact() {
    var Gg = Campaign.G;
    if (Gg.phase === 'building') {
      var b = View.map.events && (View.map.events[Gg.loc.y * View.map.w + Gg.loc.x] || View.map.events[Gg.loc.y * View.map.w + Gg.loc.x + 0]);
      // try current cell events first, then facing
      var ev = View.map.events ? View.map.events[Gg.loc.y * View.map.w + Gg.loc.x] : null;
      if (!ev) { var fc = facingCell(); ev = View.map.events[fc.y * View.map.w + fc.x]; }
      if (ev && ev.kind === 'counter') return counterAction(ev.bld);
      if (ev && ev.kind === 'npc') return npcDialog(Gg.loc.adv, ev.npc);
      if (ev && ev.kind === 'exit') { exitInterior(); return; }
      return;
    }
    // town
    var G = Campaign.G;
    var map = View.map;
    var fc = facingCell();
    var here = G.loc.y * map.w + G.loc.x;
    var there = fc.y * map.w + fc.x;
    // npc on our cell or facing
    var npc = null;
    var a = ADV.get(G.loc.adv);
    Object.keys(a.town.npcs).forEach(function (id) {
      var n = a.town.npcs[id];
      if (n.bld) return;
      if ((n.x === fc.x && n.y === fc.y) || (n.x === G.loc.x && n.y === G.loc.y)) npc = n;
    });
    if (npc) { npcDialog(a.id, npc.id); return; }
    // well
    var evHere = a.town.events[here], evThere = a.town.events[there];
    if (evHere && evHere.kind === 'well') { UI.dialog({ title: 'The Old Well', text: 'The water is cold and honest. Something small and bright is caught in the bucket rope. The folk of ' + a.townName + ' leave it there, on purpose, as a sign that the well still works.', actions: [{ label: 'Close', act: 'close' }] }); return; }
    if (evThere && evThere.kind === 'well') { UI.dialog({ title: 'The Old Well', text: 'The water is cold and honest. A sign by the lip: no washing before the chapel bell.', actions: [{ label: 'Close', act: 'close' }] }); return; }
    // door
    var d = a.town.doors[there];
    if (d) { UI.dialog({ title: a.town.buildingsById[d.bld].name, text: 'The door is ' + (d.open !== false ? 'open.' : 'shut.') + ' Step through to go in.', actions: [{ label: 'Go in', act: 'town.enter-door', data: { bld: d.bld } }, { label: 'Not now', act: 'close' }] }); return; }
    // gate
    if (fc.x === a.town.gate.x && fc.y === a.town.gate.y) {
      UI.dialog({ title: 'The Gate', text: 'Beyond the gate the wilds spread out in every direction.', actions: [{ label: 'Leave Town', act: 'leave-town' }, { label: 'Stay', act: 'close' }] });
      return;
    }
    Toast('Nothing to interact with here.', 'info');
  }

  // what can we interact with where we stand / face? (for the on-screen prompt)
  function prompt() {
    var Gg = Campaign.G;
    if (Gg.phase === 'building') {
      var aB = ADV.get(Gg.loc.adv);
      var ev = View.map.events ? View.map.events[Gg.loc.y * View.map.w + Gg.loc.x] : null;
      if (!ev) { var fcB = facingCell(); ev = View.map.events[fcB.y * View.map.w + fcB.x]; }
      if (!ev) return null;
      if (ev.kind === 'counter') { var bB = aB.town.buildingsById[ev.bld]; return '<b>Talk at the counter</b> — ' + bB.name + ' (◙ / Space)'; }
      if (ev.kind === 'npc') { var nB = aB.town.npcs[ev.npc]; return '<b>Talk to ' + nB.name + '</b> (◙ / Space)'; }
      if (ev.kind === 'exit') return '<b>Leave</b> ' + aB.town.buildingsById[cur.bld].name + ' (◙ / Space)';
      return null;
    }
    if (Gg.phase !== 'town') return null;
    var a = ADV.get(Gg.loc.adv);
    var map = View.map;
    var fc = facingCell();
    var here = Gg.loc.y * map.w + Gg.loc.x, there = fc.y * map.w + fc.x;
    var npc = null;
    Object.keys(a.town.npcs).forEach(function (id) {
      var n = a.town.npcs[id];
      if (n.bld) return;
      if ((n.x === fc.x && n.y === fc.y) || (n.x === Gg.loc.x && n.y === Gg.loc.y)) npc = n;
    });
    if (npc) return '<b>Talk to ' + npc.name + '</b> (◙ / Space)';
    var d = a.town.doors[there];
    if (d) return '<b>Enter</b> ' + a.town.buildingsById[d.bld].name + ' (◙ / Space)';
    if (fc.x === a.town.gate.x && fc.y === a.town.gate.y) return '<b>Leave town</b> through the gate (◙ / Space)';
    var evHere = a.town.events[here], evThere = a.town.events[there];
    if ((evHere && evHere.kind === 'well') || (evThere && evThere.kind === 'well')) return '<b>The old well</b> (◙ / Space)';
    return null;
  }

  function counterAction(bldId) {
    var a = ADV.get(G.loc.adv);
    var b = a.town.buildingsById[bldId];
    switch (b.kind) {
      case 'general': case 'apothecary': case 'scribe': case 'magic': {
        var shop = a.town.shops[bldId];
        Shop.open({ title: b.name, stock: shop.stock, kind: shop.kind, bld: bldId, adv: G.loc.adv });
        break;
      }
      case 'inn': {
        var cost = 10 * G.party.length;
        if (G.gold < cost) { Toast('You need ' + M.fmtGold(cost) + ' (10g a head).', 'warn'); return; }
        G.gold -= cost;
        Campaign.restUntilDawn(true, 'The party sleeps at ' + b.name + '.');
        G.party.forEach(function (p) { p.fatigue = 0; });
        Campaign.autosave();
        Toast('Rested until dawn. Day ' + G.day, 'info');
        Game.dirty();
        break;
      }
      case 'temple': {
        var done = G.party.every(function (p) { return p.prayedDay >= G.day; });
        if (done) { Toast('You have prayed already today.', 'info'); return; }
        G.party.forEach(function (p) {
          if (p.prayedDay < G.day) {
            p.prayedDay = G.day;
            p.hp = Campaign.mhp(p);
            p.dead = 0;
          }
        });
        Campaign.log('The party prays at ' + b.name + ' and is made whole.');
        Toast('The party is healed by prayer.', 'good');
        Campaign.autosave();
        Game.dirty();
        break;
      }
      case 'yard': {
        // training: pick a character
        var h = '<div class="panel opts"><div class="panel-h">The Training Yard</div>';
        h += '<div class="dim">A master of arms will train a character to the next level for 100 gold per level.</div>';
        G.party.forEach(function (p, i) {
          if (p.level >= 20) return;
          var cost = RULES.trainCost(p.level + 1);
          h += '<div class="slotline"><span>' + UI.esc(p.name) + ' — level ' + p.level + '</span><button class="btn sm" data-act="yard.train" data-idx="' + i + '" data-cost="' + cost + '">Train (' + M.fmtGold(cost) + ')</button></div>';
        });
        h += '<div class="sheet-actions"><button class="btn" data-act="close">Close</button></div></div>';
        UI.open(h, 'opts-open');
        break;
      }
      case 'hall': {
        hallDialog(a.id);
        break;
      }
    }
  }

  function hallDialog(advId) {
    var a = ADV.get(advId);
    var w = Campaign.advWorld(advId);
    var giver = null;
    Object.keys(a.town.npcs).forEach(function (id) {
      var n = a.town.npcs[id];
      if (n.role === 'giver' && n.bld === 'hall') giver = n;
    });
    var h = '<div class="panel dlg"><div class="panel-h">' + UI.esc(giver ? giver.name : 'The Guild Hall') + '</div><div class="dlg-body">';
    h += '<div class="dlg-text">“The wilds keep their accounts, and so do I. Take what you can carry, pay what you owe, and mind the hour.”</div>';
    a.quests.forEach(function (q) {
      var st = w.quests[q.id] && w.quests[q.id].status === 'done' ? 'done' : 'open';
      h += '<div class="quest-line"><b>' + UI.esc(q.name) + '</b> <span class="' + (st === 'done' ? 'good' : 'dim') + '">' + (st === 'done' ? '— complete' : '— ' + M.fmtGold(q.gold) + ' · ' + q.xp + ' xp listed') + '</span>';
      if (st === 'open') h += '<div class="dim-sm">' + UI.esc(q.text) + '</div>';
      h += '</div>';
    });
    // two-half keys quest (E2)
    if (a.keyHalves) {
      var hasA = Campaign.partyItem(a.keyHalves.a), hasB = Campaign.partyItem(a.keyHalves.b);
      if (hasA && hasB && w.quests[a.keyHalves.quest] && w.quests[a.keyHalves.quest].status !== 'done') {
        h += '<div class="dlg-actions"><button class="btn" data-act="key.join" data-adv="' + advId + '">Present both half-keys</button></div>';
      } else {
        h += '<div class="dlg-line dim-sm">“Two half-keys, kept by the cantor and by a merchant. Both can be had, if asked plainly.”</div>';
        h += '<div class="dlg-actions"><button class="btn sm" data-act="key.ask" data-adv="' + advId + '">Ask for the half-keys</button></div>';
      }
    }
    h += '<div class="dlg-actions"><button class="btn" data-act="select.open">The Ventures (map)</button><button class="btn" data-act="close">Leave</button></div>';
    h += '</div></div>';
    UI.open(h, 'dlg-open');
  }

  function npcDialog(advId, npcId) {
    var a = ADV.get(advId);
    var n = a.town.npcs[npcId];
    if (!n) return;
    if (n.role === 'giver') { hallDialog(advId); return; }
    if (n.role === 'innkeep') {
      var b = a.town.buildingsById[n.bld || 'inn'];
      UI.dialog({ title: n.name, text: 'The beds are clean and the fire is banked. Ten gold a head, and you wake with the bells.', actions: [{ label: 'Rest (10g ea.)', act: 'rest-inn' }, { label: 'Later', act: 'close' }] });
      return;
    }
    if (n.role === 'priest') {
      UI.dialog({ title: n.name, text: '“Come. The dawn is patient, and so is its mercy. Prayer here is free, once a day.”', actions: [{ label: 'Pray (heal party)', act: 'pray-temple' }, { label: 'Not now', act: 'close' }] });
      return;
    }
    // E2 half-keepers
    var a2 = ADV.get(advId);
    if (a2.keyHalves && npcId === 'priest') {
      UI.dialog({ title: n.name, text: '“The cantor keeps one half of the barrow key. A hundred years, and it has opened nothing. It is yours, if the wardenship sends for it.”', actions: [{ label: 'Receive the half-key', act: 'key.take-a' }, { label: 'Leave it', act: 'close' }] });
      return;
    }
    if (a2.keyHalves && npcId === 'innkeep') {
      UI.dialog({ title: n.name, text: '“My grandfather bought the other half of the barrow key from the last steward of the Iron King. Sell it I will not. Give it? For the wardenship, yes.”', actions: [{ label: 'Receive the half-key', act: 'key.take-b' }, { label: 'Leave it', act: 'close' }] });
      return;
    }
    // street characters: watchman and road-wearied traveller pass the day's word
    if (n.role === 'watchman' || n.role === 'traveller') {
      var aR = ADV.get(advId);
      var rs = aR.wilds.rumours || [];
      var line = rs.length ? rs[((Campaign.G.day - 1) + (n.role === 'traveller' ? 3 : 0)) % rs.length] : 'Nothing new but wind and rain.';
      var intro = n.role === 'watchman'
        ? 'The watchman leans on the pike and speaks low, the way people do when the street is empty.'
        : 'The traveller squints at the horizon and shakes road-dust from a worn map.';
      UI.dialog({ title: n.name, text: intro + ' “' + line + '”', actions: [{ label: 'Nod and move on', act: 'close' }] });
      return;
    }
    UI.dialog({ title: n.name, text: '“' + M.pick(['Mind the hour, travellers.', 'The wilds are thick with eyes these weeks.', 'Gold opens doors; steel opens the rest.', 'Ride well, and ride back.']) + '”', actions: [{ label: 'Close', act: 'close' }] });
  }

  return {
    enter: enter, step: step, interact: interact,
    enterInterior: enterInterior, exitInterior: exitInterior,
    leaveTown: leaveTown, counterAction: counterAction, prompt: prompt,
    npcDialog: npcDialog, hallDialog: hallDialog,
    get cur() { return cur; },
    townMap: townMap
  };
})();

/* ============================================================
   DUNGEON SCENE (3D first person, torch-lit)
   ============================================================ */
var Dungeon = (function () {
  var cur = null; // {adv, floor, st, mobs:[]}

  function enter(advId, floorIdx, at) {
    var a = ADV.get(advId);
    var f = a.floors[floorIdx];
    var w = Campaign.advWorld(advId);
    var st = w.dungeon.floors[floorIdx];
    // rebuild runtime mobs
    var mobs = [];
    f.mobs.forEach(function (m) {
      var key = m.id + ':' + m.x + ',' + m.y;
      if (st.killed.indexOf(key) >= 0) return;
      mobs.push({ id: m.id, x: m.x, y: m.y, name: m.name, awake: false, dead: false });
    });
    if (f.boss && !st.bossDead) mobs.push({ id: f.boss.id, x: f.boss.x, y: f.boss.y, name: f.boss.name, awake: false, dead: false, boss: true });
    // remember whether we're already on this floor (to preserve facing)
    var wasHere = !!(cur && cur.adv === advId && cur.floor === floorIdx);
    cur = { adv: advId, floor: floorIdx, st: st, mobs: mobs };
    View.map = dungeonMap(a, f, st, mobs);
    View.dark = true; View.light = 7;
    var px = at ? at.x : f.start.x, py = at ? at.y : f.start.y;
    // preserve facing when re-entering the same floor (door, loot, search)
    var keepDir = (wasHere && Math.abs(View.x - (px + 0.5)) < 0.01 && Math.abs(View.y - (py + 0.5)) < 0.01) ? View.dir : 0;
    View.setPos(px + 0.5, py + 0.5, keepDir);
    Campaign.setPhase('dungeon', { kind: 'dungeon', adv: advId, floor: floorIdx, x: px, y: py });
    markVisited(px, py);
    UI.close(); // entering the dungeon dismisses any open dialog (e.g. 'Descend')
    UI.setBar([
      { id: 'dungeon.interact', label: 'Action', primary: true },
      { id: 'dungeon.search', label: 'Search' },
      { id: 'map.open', label: 'Map' },
      { id: 'save.menu', label: 'Save' }
    ]);
    Game.dirty();
    if (floorIdx === 0) Campaign.log('The party descends into ' + a.dungeonName + '.');
  }

  function dungeonMap(a, f, st, mobs) {
    var doors = {};
    for (var k in f.doors) {
      var d = f.doors[k];
      doors[k] = { kind: d.kind, open: st.doorsOpen.indexOf(+k) >= 0, found: st.doorsFound.indexOf(+k) >= 0, key: d.key };
    }
    var sprites = [];
    mobs.forEach(function (m) {
      sprites.push({ x: m.x + 0.5, y: m.y + 0.5, img: Fig.monster(m.id), scale: 1.0, mob: m });
    });
    for (var lk in f.loot) {
      var idx = +lk;
      if (st.lootTaken.indexOf(idx) >= 0) continue;
      var l = f.loot[idx];
      sprites.push({ x: idx % f.w + 0.5, y: Math.floor(idx / f.w) + 0.5, img: Fig.lootSprite(l.chest ? 'chest' : 'item'), scale: 0.5, h: 0.6, floor: 0 });
    }
    for (var gk in f.gold) {
      var gidx = +gk;
      if (st.goldTaken.indexOf(gidx) >= 0) continue;
      sprites.push({ x: gidx % f.w + 0.5, y: Math.floor(gidx / f.w) + 0.5, img: Fig.lootSprite('gold'), scale: 0.5, h: 0.5, floor: 0 });
    }
    for (var kk in f.keys) {
      var kidx = +kk;
      if (st.keysTaken.indexOf(kidx) >= 0) continue;
      sprites.push({ x: kidx % f.w + 0.5, y: Math.floor(kidx / f.w) + 0.5, img: Fig.lootSprite('key'), scale: 0.5, h: 0.5, floor: 0 });
    }
    if (f.shrine >= 0) {
      sprites.push({ x: f.shrine % f.w + 0.5, y: Math.floor(f.shrine / f.w) + 0.5, img: Fig.lootSprite('shrine'), scale: 0.6, h: 1.2, floor: 0 });
    }
    // dropped items stay on the ground
    if (st.dropped) st.dropped.forEach(function (dr) {
      sprites.push({ x: dr.x + 0.5, y: dr.y + 0.5, img: Fig.lootSprite('item'), scale: 0.5, h: 0.5, floor: 0, dropped: dr });
    });
    // stairs
    sprites.push({ x: f.up.x + 0.5, y: f.up.y + 0.5, img: stairsSprite(), scale: 0.6, h: 1.0, floor: 0 });
    if (floorHasDown(f, a)) sprites.push({ x: f.down.x + 0.5, y: f.down.y + 0.5, img: stairsSprite(), scale: 0.6, h: 1.0, floor: 0 });
    return { w: f.w, h: f.h, solid: f.solid, tex: f.tex, doors: doors, sprites: sprites, floor: f, st: st };
  }

  function floorHasDown(f, a) { return a.floors.indexOf(f) < a.floors.length - 1; }

  var _stairs = null;
  function stairsSprite() {
    if (_stairs) return _stairs;
    var c = document.createElement('canvas'); c.width = 16; c.height = 16;
    var g = c.getContext('2d');
    g.fillStyle = '#4a4438';
    g.fillRect(2, 10, 12, 4);
    g.fillRect(4, 6, 10, 4);
    g.fillRect(6, 2, 8, 4);
    _stairs = c;
    return c;
  }

  function markVisited(x, y) {
    var f = View.map.floor;
    var st = cur.st;
    for (var dy = -1; dy <= 1; dy++) for (var dx = -1; dx <= 1; dx++) {
      var nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= f.w || ny >= f.h) continue;
      var idx = ny * f.w + nx;
      if (st.visited.indexOf(idx) < 0) st.visited.push(idx);
    }
  }

  function canStep(nx, ny) {
    var f = View.map.floor;
    if (f.solid[ny * f.w + nx]) {
      var d = f.doors ? View.map.doors[ny * f.w + nx] : null;
      return !!(d && d.open);
    }
    // known monsters bar the way
    for (var i = 0; i < cur.mobs.length; i++) {
      var m = cur.mobs[i];
      if (!m.dead && m.x === nx && m.y === ny) return false;
    }
    return true;
  }

  function step(dx, dy) {
    if (G.phase !== 'dungeon') return;
    var Gg = Campaign.G;
    var f = View.map.floor;
    var nx = Gg.loc.x + dx, ny = Gg.loc.y + dy;
    if (nx < 0 || ny < 0 || nx >= f.w || ny >= f.h) { Game.dirty(); return; }
    if (!canStep(nx, ny)) return;
    var idx = ny * f.w + nx;
    // stairs
    if (nx === f.up.x && ny === f.up.y) { takeStairs(true); return; }
    if (nx === f.down.x && ny === f.down.y && floorHasDown(f, ADV.get(cur.adv))) { takeStairs(false); return; }
    Gg.loc.x = nx; Gg.loc.y = ny;
    View.glide(nx + 0.5, ny + 0.5);
    markVisited(nx, ny);
    Campaign.addMinutes(1);
    // pick up anything dropped here
    var st0 = cur.st;
    if (st0.dropped) {
      for (var di = st0.dropped.length - 1; di >= 0; di--) {
        var dr = st0.dropped[di];
        if (dr.x === nx && dr.y === ny) {
          var pp = Campaign.activeChar();
          dr.items.forEach(function (it) { Campaign.addItem(pp, it.id, it.qty); });
          Campaign.log(pp.name + ' picks up the ' + dr.n + '.');
          st0.dropped.splice(di, 1);
          enter(cur.adv, cur.floor, { x: nx, y: ny });
          return;
        }
      }
    }
    // trap
    var st = cur.st;
    var t = f.traps[idx];
    if (t && st.trapsSprung.indexOf(idx) < 0) {
      st.trapsSprung.push(idx);
      st.trapsFound.push(idx);
      var p = Campaign.activeChar();
      if (t.party) {
        Gg.party.forEach(function (pp) {
          if (pp.dead) return;
          var d = M.dice(6, 2);
          pp.hp = Math.max(0, pp.hp - d);
          if (pp.hp <= 0) { pp.dead = 1; Campaign.log(pp.name + ' falls to the trap!'); }
          else Campaign.log(pp.name + ' takes ' + d + ' from the trap.');
        });
      } else {
        var d2 = M.dice(1, 6);
        p.hp = Math.max(0, p.hp - d2);
        Campaign.log(p.name + ' springs a trap and takes ' + d2 + '.');
        if (p.hp <= 0) p.dead = 1;
      }
      UI.setBar([
        { id: 'dungeon.interact', label: 'Action', primary: true },
        { id: 'dungeon.search', label: 'Search' },
        { id: 'map.open', label: 'Map' },
        { id: 'save.menu', label: 'Save' }
      ]);
      Game.dirty();
      if (Gg.party.every(function (pp) { return pp.dead; })) { Campaign.log('The darkness closes over the company.'); CombatDefeat(); }
      return;
    }
    // loot
    var loot = f.loot[idx];
    if (loot && st.lootTaken.indexOf(idx) < 0) {
      st.lootTaken.push(idx);
      pickLoot(idx, loot, f);
    }
    var gold = f.gold[idx];
    if (gold && st.goldTaken.indexOf(idx) < 0) {
      st.goldTaken.push(idx);
      Gg.gold += gold.amt;
      Campaign.log('The company pockets ' + M.fmtGold(gold.amt) + '.');
      if (gold.quest) Campaign.completeQuest(cur.adv, gold.quest);
    }
    var key = f.keys[idx];
    if (key && st.keysTaken.indexOf(idx) < 0) {
      st.keysTaken.push(idx);
      var p2 = Gg.party[0];
      Campaign.addItem(p2, key.itemId, 1);
      Campaign.log(p2.name + ' picks up the ' + ADV.itemOf(key.itemId).n + '.');
    }
    // shrine
    if (f.shrine === idx && !st.shrineUsed) {
      st.shrineUsed = 1;
      var gain = 50 * ADV.get(cur.adv).band;
      Campaign.grantXp(gain, 'The shrine answers the party’s quiet asking');
    }
    // monsters
    checkMonsters();
    Game.dirty();
  }

  function pickLoot(idx, loot, f) {
    var Gg = Campaign.G;
    if (loot.chest) {
      var t = TREASURE.rollChest(new Streams('chest:' + cur.adv + ':' + idx).rng('r'), loot.chest.level, loot.chest.type);
      Gg.gold += t.gold;
      var p = null;
      for (var k = 0; k < Gg.party.length; k++) if (!Gg.party[k].dead) { p = Gg.party[k]; break; }
      t.items.forEach(function (e) {
        if (e.id === '_gold') { Gg.gold += e.qty; return; }
        Campaign.addItem(p, e.id, e.qty);
      });
      Campaign.log('The chest holds ' + M.fmtGold(t.gold) + ' and ' + t.items.filter(function (e) { return e.id !== '_gold'; }).map(function (e) { return ADV.itemOf(e.id).n; }).join(', ') + '.');
      if (loot.chest.boss) {
        // boss treasure also closes the main quest if the boss is dead
      }
    } else if (loot.items) {
      var p2 = null;
      for (var k2 = 0; k2 < Gg.party.length; k2++) if (!Gg.party[k2].dead) { p2 = Gg.party[k2]; break; }
      loot.items.forEach(function (e) {
        if (e.id === '_gold') { Gg.gold += e.qty; return; }
        Campaign.addItem(p2, e.id, e.qty);
        Campaign.log(p2.name + ' takes the ' + ADV.itemOf(e.id).n + '.');
      });
      if (loot.quest) Campaign.completeQuest(cur.adv, loot.quest);
    }
  }

  function takeStairs(up) {
    var a = ADV.get(cur.adv);
    Campaign.addMinutes(2);
    if (up) {
      if (cur.floor === 0) {
        // out to the wilds
        var w = Campaign.advWorld(a.id);
        var site = a.wilds.sites.find(function (s) { return s.kind === 'dungeon' && (s.advId === a.id || !s.advId); });
        w.wilds.x = site.x; w.wilds.y = site.y;
        Campaign.log('The party climbs out of ' + a.dungeonName + '.');
        Overland.enter(a.id);
        return;
      }
      var prev = a.floors[cur.floor - 1];
      Campaign.log('The party climbs up to ' + prev.name + '.');
      enter(a.id, cur.floor - 1, { x: prev.down.x, y: prev.down.y });
    } else {
      var next = a.floors[cur.floor + 1];
      Campaign.log('The party descends to ' + next.name + '.');
      enter(a.id, cur.floor + 1, null);
      Campaign.autosave();
    }
  }

  function checkMonsters() {
    var Gg = Campaign.G;
    var f = View.map.floor;
    var range = Campaign.isNight() ? 4 : 2;
    // thief stealth: a creeping party may slip past notice
    var thiefLvl = 0;
    Gg.party.forEach(function (p) { if (p.cls === 'thief' && !p.dead) thiefLvl = Math.max(thiefLvl, p.lvl); });
    var stealth = thiefLvl > 0 && M.d20() + thiefLvl >= 17;
    var started = false;
    cur.mobs.forEach(function (m) {
      if (m.dead || started) return;
      var d = Math.max(Math.abs(m.x - Gg.loc.x), Math.abs(m.y - Gg.loc.y));
      var mon = MONSTERS[m.id];
      var r = (mon && mon.ambush) ? 1 : range; // ambushers strike only at arm's length
      if (!m.awake && d <= r && Combat.los(Gg.loc.x, Gg.loc.y, m.x, m.y)) {
        if (stealth && !((mon && mon.ambush) && d <= 1)) return; // unseen, this step
        m.awake = true;
        wakeRoom(m);
        Campaign.log((mon && mon.ambush ? 'The dark erupts — ' : 'A ') + (mon ? mon.n.toLowerCase() : 'creature') + ' attacks from the shadows!');
      }
      if (m.awake && d <= 3 && !m.dead) {
        started = true;
        startCombat(stealth);
      }
    });
  }

  function wakeRoom(m) {
    var f = View.map.floor;
    var seen = {}, q = [[m.x, m.y]];
    seen[m.y * f.w + m.x] = 1;
    var guard = 60;
    while (q.length && guard-- > 0) {
      var c = q.shift();
      for (var i = 0; i < 4; i++) {
        var nx = c[0] + [1, -1, 0, 0][i], ny = c[1] + [0, 0, 1, -1][i];
        if (nx < 0 || ny < 0 || nx >= f.w || ny >= f.h) continue;
        if (f.solid[ny * f.w + nx]) continue;
        var idx = ny * f.w + nx;
        if (seen[idx]) continue;
        seen[idx] = 1;
        q.push([nx, ny]);
      }
    }
    cur.mobs.forEach(function (o) {
      if (!o.dead && seen[o.y * f.w + o.x]) o.awake = true;
    });
  }

  function startCombat(surprise) {
    var Gg = Campaign.G;
    var mobs = cur.mobs.filter(function (m) { return m.awake && !m.dead; }).map(function (m) { return { id: m.id, x: m.x, y: m.y, name: m.name }; });
    Campaign.autosave();
    Combat.start('dungeon', { adv: cur.adv, floor: cur.floor, mobs: mobs, seed: cur.adv + ':' + cur.floor, surprise: !!surprise });
  }

  function facingCell() {
    var Gg = Campaign.G;
    var v = ((Math.round(View.dir / (Math.PI / 2)) % 4) + 4) % 4;
    // dir 0 = east, PI/2 = south, -PI/2 = north (matches the raycaster)
    var dx = [1, 0, -1, 0][v], dy = [0, 1, 0, -1][v];
    return { x: Gg.loc.x + dx, y: Gg.loc.y + dy };
  }

  function interact() {
    var Gg = Campaign.G;
    var f = View.map.floor;
    var st = cur.st;
    var fc = facingCell();
    var idx = fc.y * f.w + fc.x;
    var d = f.doors ? f.doors[idx] : null;
    if (!d) {
      // stairs on our cell
      if (Gg.loc.x === f.up.x && Gg.loc.y === f.up.y) { takeStairs(true); return; }
      if (Gg.loc.x === f.down.x && Gg.loc.y === f.down.y && floorHasDown(f, ADV.get(cur.adv))) { takeStairs(false); return; }
      // a found trap on the facing cell — a thief may disarm it
      var t = f.traps[idx];
      if (t && st.trapsFound.indexOf(idx) >= 0) { disarm(idx); return; }
      Toast('Nothing to interact with there.', 'info');
      return;
    }
    if (d.kind === 'locked') {
      if (d.open) return;
      // find a key in the party
      var hasKey = null;
      for (var k = 0; k < Gg.party.length; k++) {
        if (Campaign.countItem(Gg.party[k], d.key) > 0) { hasKey = Gg.party[k]; break; }
      }
      if (hasKey) {
        Campaign.removeItem(hasKey, d.key);
        st.doorsOpen.push(idx);
        d.open = true;
        Campaign.log(hasKey.name + ' uses the ' + ADV.itemOf(d.key).n + '. The lock gives.');
        Campaign.addMinutes(1);
        // rebuild map sprites (door now open)
        enter(cur.adv, cur.floor, { x: Gg.loc.x, y: Gg.loc.y });
        return;
      }
      UI.dialog({ title: 'A Locked Door', text: 'The lock is old and particular. It wants a key the party does not carry.', actions: [{ label: 'Close', act: 'close' }] });
      return;
    }
    if (d.kind === 'secret') {
      if (!d.found) { UI.dialog({ title: 'Stone', text: 'Solid stone. Or is it?', actions: [{ label: 'Close', act: 'close' }, { label: 'Search', act: 'dungeon.search' }] }); return; }
      d.open = true;
      st.doorsOpen.push(idx);
      Campaign.log('The secret door swings inward.');
      Campaign.addMinutes(1);
      enter(cur.adv, cur.floor, { x: Gg.loc.x, y: Gg.loc.y });
      return;
    }
    // normal door
    if (!d.open) {
      UI.dialog({ title: 'A Closed Door', text: 'The ' + (f.doors[idx] ? 'door' : 'door') + ' stands shut.', actions: [{ label: 'Open', act: 'dungeon.open', data: { idx: String(idx) } }, { label: 'Listen', act: 'dungeon.listen' }, { label: 'Cancel', act: 'close' }] });
      return;
    }
    d.open = !d.open;
    if (d.open) st.doorsOpen.push(idx);
    else { var oi = st.doorsOpen.indexOf(idx); if (oi >= 0) st.doorsOpen.splice(oi, 1); }
    Campaign.addMinutes(1);
    enter(cur.adv, cur.floor, { x: Gg.loc.x, y: Gg.loc.y });
  }

  function openDoor(idx) {
    var f = View.map.floor;
    var st = cur.st;
    var d = f.doors[idx];
    if (!d || d.kind !== 'normal') return;
    d.open = true;
    if (st.doorsOpen.indexOf(idx) < 0) st.doorsOpen.push(idx);
    Campaign.log('The door swings open.');
    Campaign.addMinutes(1);
    enter(cur.adv, cur.floor, { x: Campaign.G.loc.x, y: Campaign.G.loc.y });
  }

  // what can we interact with where we stand / face? (for the on-screen prompt)
  function prompt() {
    var Gg = Campaign.G;
    if (Gg.phase !== 'dungeon') return null;
    var f = View.map.floor;
    var st = cur.st;
    var fc = facingCell();
    var idx = fc.y * f.w + fc.x;
    var d = f.doors ? f.doors[idx] : null;
    if (d) {
      if (d.kind === 'secret' && !d.found) return null;
      if (d.kind === 'locked') return d.open ? '<b>A locked door</b>, standing open (◙ / Space)' : '<b>A locked door</b> — needs its key (◙ / Space)';
      if (d.kind === 'secret') return '<b>A secret door</b> (◙ / Space)';
      return d.open ? '<b>An open door</b> — close it (◙ / Space)' : '<b>A door</b> — open, or listen (◙ / Space)';
    }
    if (fc.x === f.up.x && fc.y === f.up.y) return '<b>The stairs up</b> (◙ / Space)';
    if (fc.x === f.down.x && fc.y === f.down.y && floorHasDown(f, ADV.get(cur.adv))) return '<b>The stairs down</b> (◙ / Space)';
    // found trap on the facing cell
    var t = f.traps[idx];
    if (t && st.trapsFound.indexOf(idx) >= 0 && disarmingThief()) return '<b>A ' + t.kind + ' trap</b> — disarm? (◙ / Space)';
    return null;
  }

  function listen() {
    var Gg = Campaign.G;
    var f = View.map.floor;
    var p = Campaign.activeChar();
    Campaign.addMinutes(2);
    var roll = M.d20() + RULES.abilityMod(p.attrs.wis);
    if (roll >= 15) {
      UI.dialog({ title: 'Listening', text: p.name + ' presses an ear to the wood. The other side is still and silent.', actions: [{ label: 'Close', act: 'close' }] });
      return;
    }
    // any dormant monsters on the floor at all?
    var any = f.mobs.length > 0;
    if (any && roll >= 11) {
      UI.dialog({ title: 'Listening', text: p.name + ' hears movement behind the door — ' + (M.dice(6) > 3 ? 'more than one shape, moving fast.' : 'a single low scrape of claws.') + ' Get ready.', actions: [{ label: 'Close', act: 'close' }] });
    } else {
      UI.dialog({ title: 'Listening', text: p.name + ' hears ' + (any ? 'a faint shuffling somewhere in the dark beyond.' : 'distant dripping and nothing living.') , actions: [{ label: 'Close', act: 'close' }] });
    }
  }

  function disarmingThief() {
    var Gg = Campaign.G;
    for (var i = 0; i < Gg.party.length; i++) { if (Gg.party[i].cls === 'thief') return Gg.party[i]; }
    return null;
  }

  function disarm(idx) {
    var Gg = Campaign.G;
    var f = View.map.floor;
    var st = cur.st;
    var t = f.traps[idx];
    if (!t) return;
    var th = disarmingThief();
    if (!th) { UI.dialog({ title: 'Trap', text: 'There is no one in the party skilled enough to pick this mechanism. A thief might try.', actions: [{ label: 'Close', act: 'close' }] }); return; }
    var chance = RULES.thiefChance('remove', th.lvl);
    var roll = M.chance(chance);
    if (roll) {
      // remove the trap for good
      f.traps.splice(f.traps.indexOf(t), 1);
      Campaign.log(th.name + ' works at the mechanism for a long minute... and the trap is dead.');
      Campaign.addMinutes(10);
      enter(cur.adv, cur.floor, { x: Gg.loc.x, y: Gg.loc.y });
    } else {
      springTrap(t);
    }
  }

  function dropItem(k, charIdx) {
    var Gg = Campaign.G;
    var p = (charIdx != null && Gg.party[charIdx]) ? Gg.party[charIdx] : Campaign.activeChar();
    if (Campaign.countItem(p, k) < 1) return;
    Campaign.removeItem(p, k);
    var it = ADV.itemOf(k);
    var st = cur.st;
    var idx = Gg.loc.y * View.map.floor.w + Gg.loc.x;
    if (st.dropped == null) st.dropped = [];
    st.dropped.push({ x: Gg.loc.x, y: Gg.loc.y, items: [{ id: it.id, qty: 1 }], n: ADV.itemOf(k).n });
    Campaign.log(p.name + ' sets down the ' + ADV.itemOf(k).n + '.');
    enter(cur.adv, cur.floor, { x: Gg.loc.x, y: Gg.loc.y });
  }

  function restUntilHealed() {
    var nights = 0;
    while (nights < 5) {
      var all = true;
      for (var i = 0; i < Campaign.G.party.length; i++) {
        var p = Campaign.G.party[i];
        var hp = p.hp != null ? p.hp : 0, max = Campaign.mhp(p);
        if (hp < max) all = false;
      }
      if (all) break;
      Campaign.restUntilDawn(true, nights === 0 ? 'The party rests until every wound is closed.' : null);
      nights++;
    }
    Campaign.log('The party wakes rested and unharmed (' + nights + ' night' + (nights === 1 ? '' : 's') + ').');
  }

  function search() {
    var Gg = Campaign.G;
    var f = View.map.floor;
    var st = cur.st;
    Campaign.addMinutes(3);
    // best searcher: int + dwarf/thief bonuses
    var p = Campaign.activeChar(), bonus = RULES.abilityMod(p.attrs.int);
    for (var i = 0; i < Gg.party.length; i++) {
      var q = Gg.party[i];
      var b = RULES.abilityMod(q.attrs.int) + (q.race === 'dwarf' ? 2 : 0) + (q.cls === 'thief' ? 2 : 0);
      if (b > bonus) { bonus = b; p = q; }
    }
    var roll = M.d20() + bonus;
    // look at the 8 surrounding cells
    var found = false;
    for (var dy = -1; dy <= 1 && !found; dy++) for (var dx = -1; dx <= 1 && !found; dx++) {
      var nx = Gg.loc.x + dx, ny = Gg.loc.y + dy;
      if (nx < 0 || ny < 0 || nx >= f.w || ny >= f.h) continue;
      var idx = ny * f.w + nx;
      var d = f.doors && f.doors[idx];
      if (d && d.kind === 'secret' && !d.found && roll >= 10) {
        d.found = true;
        st.doorsFound.push(idx);
        Campaign.log(p.name + ' finds a secret door' + (d.open ? '.' : ', hidden in plain sight.') + ' A soft click opens it.');
        d.open = true;
        st.doorsOpen.push(idx);
        found = true;
        enter(cur.adv, cur.floor, { x: Gg.loc.x, y: Gg.loc.y });
        return;
      }
      var t = f.traps[idx];
      if (t && st.trapsFound.indexOf(idx) < 0 && roll >= 12) {
        st.trapsFound.push(idx);
        Campaign.log(p.name + ' notices a ' + t.kind + ' trap set in the ' + (dx < 0 ? 'west' : dx > 0 ? 'east' : dy < 0 ? 'north' : 'south') + '.');
        found = true;
        UI.dialog({
          title: 'A Trap',
          text: p.name + ' sees the ' + t.kind + ' trap ' + (t.party ? 'aimed at the whole party.' : 'set for a single walker.') + ' ' + (disarmingThief() ? 'A thief might try to disarm it.' : 'No one in the party is skilled enough to disarm it.') ,
          actions: (disarmingThief() ? [{ label: 'Disarm', act: 'dungeon.disarm', data: { idx: String(idx) } }, { label: 'Leave it', act: 'close' }] : [{ label: 'Leave it', act: 'close' }])
        });
        break;
      }
    }
    if (!found) Campaign.log(p.name + ' finds nothing new. (rolled ' + roll + ')');
    Game.dirty();
  }

  // defeat from 3D (all dead via trap)
  function CombatDefeat() {
    var Gg = Campaign.G;
    Gg.gold = Math.floor(Gg.gold / 2);
    Gg.party.forEach(function (p) { p.dead = 0; p.hp = 1; });
    Campaign.log('Defeat in the deep. The surviving company crawls back to ' + ADV.get(Gg.activeAdv).townName + ', half its gold gone.');
    var a = ADV.get(Gg.activeAdv);
    var w = Campaign.advWorld(a.id);
    var site = a.wilds.sites.find(function (s) { return s.kind === 'town'; });
    w.wilds.x = site.x; w.wilds.y = site.y;
    Overland.enter(a.id);
  }

  return {
    enter: enter, step: step, interact: interact, search: search,
    listen: listen, openDoor: openDoor, disarm: disarm, dropItem: dropItem, restUntilHealed: restUntilHealed, prompt: prompt,
    markVisited: markVisited, takeStairs: takeStairs,
    get cur() { return cur; },
    dungeonMap: dungeonMap
  };
})();
