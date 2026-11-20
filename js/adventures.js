/* ============================================================
   EMBERFALL — adventures.js
   The campaign's four authored adventures (E0-E3) plus fifty
   generated ones (G01-G50) across five level bands. Each
   adventure carries: home town (procedural layout, authored
   content), wilderness map (terrain, sites, rumours, encounter
   table), dungeon floors (deterministic generation from the
   adventure seed: rooms, corridors, secret doors with loot
   alcoves, traps, keys, shrines), and quests with rewards.
   Dynamic one-off items (keys, letters) live in KEYITEMS.
   ============================================================ */
'use strict';

var ADV = (function () {
  var LIST = {}, ORDER = [];
  var KEYITEMS = {};
  var townDoors = null;

  function reg(a) { LIST[a.id] = a; ORDER.push(a.id); }
  function get(id) { return LIST[id]; }
  function itemOf(id) { return ITEMS[id] || KEYITEMS[id] || null; }

  /* ============ dungeon floor generation ============ */

  // spec: {w,h,rooms,tex,mobs:[[id,count]],loot:[{kind:'gold',amt}|{kind:'item',id}|{kind:'chest',type}],traps:[{kind,party}],secrets,locked,shrine,boss:{id,name},name,startMsg}
  function genFloor(str, spec, fIdx) {
    var w = spec.w, h = spec.h;
    var r = str.rng('f' + fIdx);
    var solid = new Uint8Array(w * h);
    var tex = new Uint8Array(w * h);
    var T = spec.tex || 1;
    for (var i = 0; i < w * h; i++) { solid[i] = 1; tex[i] = T; }

    // --- rooms
    var rooms = [];
    for (var ri = 0; ri < spec.rooms; ri++) {
      for (var tries = 0; tries < 400; tries++) {
        var rw = 4 + Math.floor(r() * Math.max(1, Math.min(8, w >> 1) - 4));
        var rh = 3 + Math.floor(r() * Math.max(1, Math.min(6, h >> 1) - 3));
        var rx = 1 + Math.floor(r() * Math.max(1, w - rw - 2));
        var ry = 1 + Math.floor(r() * Math.max(1, h - rh - 2));
        var hit = false;
        for (var oj = 0; oj < rooms.length; oj++) {
          var o = rooms[oj];
          if (rx < o.x + o.w + 1 && rx + rw + 1 > o.x && ry < o.y + o.h + 1 && ry + rh + 1 > o.y) { hit = true; break; }
        }
        if (!hit) { rooms.push({ x:rx, y:ry, w:rw, h:rh }); break; }
      }
    }
    rooms.sort(function (a, b) { return (a.x + a.y) - (b.x + b.y); });

    function carve(x, y) {
      if (x > 0 && y > 0 && x < w - 1 && y < h - 1) solid[y * w + x] = 0;
    }
    function center(rom) { return [rom.x + (rom.w >> 1), rom.y + (rom.h >> 1)]; }
    function inRoom(x, y) {
      for (var j = 0; j < rooms.length; j++) {
        var o = rooms[j];
        if (x >= o.x && x < o.x + o.w && y >= o.y && y < o.y + o.h) return j;
      }
      return -1;
    }

    for (ri = 0; ri < rooms.length; ri++) {
      var rom = rooms[ri];
      for (var y = rom.y; y < rom.y + rom.h; y++)
        for (var x = rom.x; x < rom.x + rom.w; x++) carve(x, y);
    }
    // corridors connecting consecutive rooms (L-shaped)
    function corridor(a, b) {
      var x = a[0], y = a[1];
      while (x !== b[0]) { carve(x, y); x += Math.sign(b[0] - x); }
      while (y !== b[1]) { carve(x, y); y += Math.sign(b[1] - y); }
      carve(b[0], b[1]);
    }
    for (ri = 0; ri + 1 < rooms.length; ri++) {
      corridor(center(rooms[ri]), center(rooms[ri + 1]));
    }
    // one extra loop corridor for variety
    if (rooms.length > 3 && r() < 0.8) {
      corridor(center(rooms[0]), center(rooms[rooms.length - 1]));
    }

    var startRoom = rooms[0];
    var exitRoom = rooms[rooms.length - 1];
    var s = center(startRoom), e = center(exitRoom);
    var start = { x:s[0], y:s[1] };
    // stairs up next to start (floor 1) or in start room
    var up = { x:s[0] + 1, y:s[1] };
    if (solid[up.y * w + up.x]) { up = { x:s[0] - 1, y:s[1] }; }
    if (solid[up.y * w + up.x]) { up = { x:s[0], y:s[1] + 1 }; }
    if (solid[up.y * w + up.x]) { up = { x:s[0], y:s[1] - 1 }; }
    var down = { x:e[0], y:e[1] };
    if (solid[down.y * w + down.x] || (spec.boss && down.x === e[0] && down.y === e[1])) {
      down = { x:e[0] + 1, y:e[1] };
      if (solid[down.y * w + down.x]) down = { x:e[0] - 1, y:e[1] };
    }

    var doors = {}, traps = {}, loot = {}, gold = {}, keys = {}, shrine = -1;
    var mobs = [];

    function freeCell(room, avoid) {
      for (var t = 0; t < 100; t++) {
        var x = room.x + Math.floor(r() * room.w);
        var y = room.y + Math.floor(r() * room.h);
        if (solid[y * w + x]) continue;
        if (x === start.x && y === start.y) continue;
        if (x === up.x && y === up.y) continue;
        if (x === down.x && y === down.y) continue;
        if (avoid && avoid.some(function (p) { return p[0] === x && p[1] === y; })) continue;
        return [x, y];
      }
      return null;
    }

    // --- mobs
    var usedCells = [[start.x, start.y], [up.x, up.y], [down.x, down.y]];
    var mobRooms = rooms.slice(1);
    if (spec.boss) mobRooms = mobRooms.slice(0, -1);
    if (!mobRooms.length) mobRooms = rooms.slice(1);
    (spec.mobs || []).forEach(function (mm) {
      var id = mm[0], n = mm[1];
      for (var k = 0; k < n; k++) {
        var rom = mobRooms.length ? mobRooms[Math.floor(r() * mobRooms.length)] : null;
        if (!rom) continue;
        var c = freeCell(rom, usedCells);
        if (!c) continue;
        usedCells.push(c);
        mobs.push({ id:id, x:c[0], y:c[1], name: mm[2] || null });
      }
    });

    // --- loot
    (spec.loot || []).forEach(function (L) {
      var rom = rooms.length > 1 ? rooms[1 + Math.floor(r() * (rooms.length - 1))] : rooms[0];
      var c = freeCell(rom, usedCells);
      if (!c) return;
      usedCells.push(c);
      if (L.kind === 'gold') gold[c[1] * w + c[0]] = { amt: L.amt, quest: L.quest || null, taken: false };
      else if (L.kind === 'item') loot[c[1] * w + c[0]] = { items: [{ id:L.id, qty:L.qty || 1 }], quest: L.quest || null };
      else if (L.kind === 'chest') loot[c[1] * w + c[0]] = { chest: { type: L.type || 'e', level: L.level || 1, opened: false } };
    });
    // boss chest
    if (spec.boss) {
      var bc = freeCell(exitRoom, usedCells);
      if (bc) loot[bc[1] * w + bc[0]] = { chest: { type:'f', level: spec.bossLevel || 1, opened:false, boss:true } };
    }

    // --- traps
    function corridorCell(avoidRoom) {
      var opts = [];
      for (var y = 1; y < h - 1; y++) for (var x = 1; x < w - 1; x++) {
        if (solid[y * w + x]) continue;
        if (inRoom(x, y) >= 0) continue;
        var hor = !solid[y * w + x - 1] && !solid[y * w + x + 1];
        var ver = !solid[(y - 1) * w + x] && !solid[(y + 1) * w + x];
        if ((hor && ver) || (hor ^ ver)) opts.push([x, y]);
      }
      return opts;
    }
    var trapSpots = corridorCell();
    (spec.traps || []).forEach(function (tp) {
      var c;
      if (tp.party) {
        var roms = rooms.slice(1, spec.boss ? -1 : rooms.length);
        var rom = roms.length ? roms[Math.floor(r() * roms.length)] : null;
        if (!rom) return;
        c = freeCell(rom, usedCells);
      } else {
        if (!trapSpots.length) return;
        c = trapSpots.splice(Math.floor(r() * trapSpots.length), 1)[0];
      }
      if (!c) return;
      usedCells.push(c);
      traps[c[1] * w + c[0]] = { kind: tp.kind, party: !!tp.party, found:false, sprung:false };
    });

    // --- secret doors: wall cell between a room cell and an otherwise wall pocket
    function makeSecret() {
      for (var t = 0; t < 200; t++) {
        var rom = rooms[1 + Math.floor(r() * Math.max(1, rooms.length - 1))];
        var cx = rom.x + Math.floor(r() * rom.w);
        var cy = rom.y + Math.floor(r() * rom.h);
        if (solid[cy * w + cx]) continue;
        var dirs = [[1,0],[-1,0],[0,1],[0,-1]];
        for (var d = 0; d < 4; d++) {
          var dx = dirs[d][0], dy = dirs[d][1];
          var wx = cx + dx, wy = cy + dy;      // wall cell (door)
          var qx = cx + 2 * dx, qy = cy + 2 * dy; // pocket
          if (wx < 1 || wy < 1 || wx >= w - 1 || wy >= h - 1) continue;
          if (qx < 1 || qy < 1 || qx >= w - 1 || qy >= h - 1) continue;
          if (!solid[wy * w + wx] || !solid[qy * w + qx]) continue;
          // carve pocket
          solid[qy * w + qx] = 0;
          var qx2 = qx + dx, qy2 = qy + dy;
          if (qx2 > 0 && qy2 > 0 && qx2 < w - 1 && qy2 < h - 1 && solid[qy2 * w + qx2]) {
            solid[qy2 * w + qx2] = 0;
            // loot in the deeper pocket
            loot[qy2 * w + qx2] = { items: lootRoll(str, fIdx, d), secret:true };
          } else {
            loot[qy * w + qx] = { items: lootRoll(str, fIdx, d), secret:true };
          }
          doors[wy * w + wx] = { kind:'secret', open:false, found:false };
          return;
        }
      }
      return false;
    }
    function lootRoll(str, fIdx, salt) {
      var rr = str.rng('f' + fIdx + 'sec' + salt);
      var band = 1 + Math.floor(fIdx / 2);
      var t = TREASURE.rollTreasure(rr, 'e', Math.min(20, 1 + band * 2));
      var items = t.items;
      if (!items.length) items = [{ id:'p_heal', qty:1 }];
      if (t.gold > 0) items.push({ id:'_gold', qty:t.gold });
      return items;
    }
    for (var si = 0; si < (spec.secrets || 1); si++) makeSecret();

    // --- locked door + key
    if (spec.locked) {
      var choke = corridorCell().filter(function (c) {
        var x = c[0], y = c[1];
        var hor = !solid[y * w + x - 1] && !solid[y * w + x + 1];
        var ver = !solid[(y - 1) * w + x] && !solid[(y + 1) * w + x];
        return (hor || ver) && !(hor && ver); // true chokepoint
      });
      if (choke.length) {
        var cc = choke[Math.floor(r() * choke.length)];
        doors[cc[1] * w + cc[0]] = { kind:'locked', open:false, found:true, key: spec.keyId || ('key_' + str.advId) };
        var kcell = freeCell(startRoom, usedCells);
        if (kcell) { keys[kcell[1] * w + kcell[0]] = { itemId: spec.keyId || ('key_' + str.advId) }; }
      }
    }

    // --- shrine
    if (spec.shrine) {
      var sr = rooms[1 + Math.floor(r() * Math.max(1, rooms.length - 1))];
      var sc = freeCell(sr, usedCells);
      if (sc) shrine = sc[1] * w + sc[0];
    }

    // boss stands adjacent to the down stairs
    var bossCell = [down.x + 1, down.y];
    if (solid[bossCell[1] * w + bossCell[0]] || bossCell[0] >= w - 1) {
      bossCell = [down.x - 1, down.y];
      if (solid[bossCell[1] * w + bossCell[0]] || bossCell[0] < 1) bossCell = [down.x, down.y + 1 < h ? down.y + 1 : down.y - 1];
    }
    if (solid[bossCell[1] * w + bossCell[0]]) bossCell = [down.x, down.y];
    return {
      name: spec.name, w:w, h:h, solid:solid, tex:tex,
      start:start, up:up, down:down,
      rooms:rooms,
      doors:doors, traps:traps, loot:loot, gold:gold, keys:keys,
      shrine:shrine, mobs:mobs,
      boss: spec.boss ? { id:spec.boss.id, name:spec.boss.name, x:bossCell[0], y:bossCell[1] } : null
    };
  }

  // quick loot for generator (used before TREASURE? no — TREASURE loads first)
  // (lootRoll defined above uses TREASURE)

  /* ============ town building ============ */

  function buildTown(str, spec) {
    townDoors = {};
    var w = 22, h = 22;
    var solid = new Uint8Array(w * h);
    var tex = new Uint8Array(w * h);
    var T = 9; // town wall texture
    for (var i = 0; i < w * h; i++) { solid[i] = 0; tex[i] = 0; }
    // perimeter wall
    for (var x = 0; x < w; x++) { solid[x] = 1; tex[x] = T; solid[(h - 1) * w + x] = 1; tex[(h - 1) * w + x] = T; }
    for (var y = 0; y < h; y++) { solid[y * w] = 1; tex[y * w] = T; solid[y * w + w - 1] = 1; tex[y * w + w - 1] = T; }
    // gate
    var gx = spec.gate[0], gy = spec.gate[1];
    solid[gy * w + gx] = 0; tex[gy * w + gx] = 0;
    var gate = { x:gx, y:gy };
    // buildings
    var events = {};
    var npcs = {};
    var buildingsById = {};
    (spec.buildings || []).forEach(function (b) {
      buildingsById[b.id] = b;
      var bx = b.x, by = b.y, bw = b.w, bh = b.h;
      for (var yy = by; yy < by + bh; yy++)
        for (var xx = bx; xx < bx + bw; xx++) {
          if (xx === bx || xx === bx + bw - 1 || yy === by || yy === by + bh - 1) {
            solid[yy * w + xx] = 1; tex[yy * w + xx] = 7; // building wall
          } else { solid[yy * w + xx] = 0; tex[yy * w + xx] = 0; }
        }
      // door on south wall centre
      var dx = bx + (bw >> 1), dy = by + bh - 1;
      solid[dy * w + dx] = 0;
      townDoors[dy * w + dx] = { kind:'building', bld:b.id };
      // interior: counter cell at north-centre
      var cxy = by + 1;
      events[cxy * w + dx] = { kind:'counter', bld:b.id };
    });
    // trees
    (spec.trees || []).forEach(function (p) { solid[p[1] * w + p[0]] = 1; tex[p[1] * w + p[0]] = 10; });
    // well
    if (spec.well) events[spec.well[1] * w + spec.well[0]] = { kind:'well' };
    // npcs
    (spec.npcs || []).forEach(function (n) {
      npcs[n.id] = { id:n.id, name:n.name, role:n.role, x:n.x, y:n.y, bld:n.bld || null };
    });
    return { w:w, h:h, solid:solid, tex:tex, gate:gate, events:events, npcs:npcs, doors:townDoors, buildingsById:buildingsById };
  }

  /* ============ wilderness build ============ */

  function buildWilds(str, spec) {
    var w = spec.w || 24, h = spec.h || 24;
    var t = WILDS.genTerrain(str, w, h);
    var sites = WILDS.placeSites(str, t, w, h, spec);
    var table = WILDS.bandTable(spec.band);
    var mons = table.map(function (e) { return MONSTERS[e[0]].n; });
    var rumours = WILDS.genRumours(str, sites, mons);
    return { w:w, h:h, terrain:t, sites:sites, table:table, rumours:rumours };
  }

  /* ============ adventure assembly ============ */

  function makeAdventure(a) {
    var str = new Streams('adv:' + a.seed);
    str.advId = a.id;
    a.seedStr = str;
    a.town = buildTown(str, a.townSpec);
    a.wilds = buildWilds(str, a.wildSpec);
    a.floors = a.floorSpecs.map(function (fs, i) { return genFloor(str, fs, i); });
    townDoors = null;
    reg(a);
    return a;
  }

  return {
    reg: reg, get: get, ORDER: ORDER,
    genFloor: genFloor, buildTown: buildTown, buildWilds: buildWilds,
    makeAdventure: makeAdventure, KEYITEMS: KEYITEMS, itemOf: itemOf
  };
})();


/* ============================================================
   EMBERFALL — adventure content
   Four authored adventures (E0-E3) and fifty generated ones
   (G01-G50) across five level bands.
   ============================================================ */

/* ---------- dynamic one-off items (keys, letters, keepsakes) ---------- */
ADV.KEYITEMS.key_e0_1 = { id:'key_e0_1', n:'Rusted Cellar Key', cat:'key', price:1, weight:1,
  desc:'A heavy rusted key, stamped with the Thornwick abbey mark. It opens the locked cellar door.' };
ADV.KEYITEMS.key_e1 = { id:'key_e1', n:'The Vault Key', cat:'key', price:1, weight:1,
  desc:'A green-bronze key, cold as the marsh. It opens the locked gallery door in the hollow vaults.' };
ADV.KEYITEMS.key_e2_a = { id:'key_e2_a', n:'The Cantor\u2019s Half-Key', cat:'key', price:1, weight:1,
  desc:'One half of a black key. The other half was sold out of the barrow before the road was cut.' };
ADV.KEYITEMS.key_e2_b = { id:'key_e2_b', n:'The Merchant\u2019s Half-Key', cat:'key', price:1, weight:1,
  desc:'One half of a black key. The cantor of Dunmere keeps the other, and will not trade it.' };
ADV.KEYITEMS.key_e2 = { id:'key_e2', n:'The Iron King\u2019s Barrow Key', cat:'key', price:1, weight:1,
  desc:'Two halves of a black key, joined. It takes the barrow door\u2019s twin wards.' };
ADV.KEYITEMS.key_e3 = { id:'key_e3', n:'The Barrow Gate Key', cat:'key', price:1, weight:1,
  desc:'A key of dark iron, warm to the touch. It opens the sealed door in the drow gallery.' };
ADV.KEYITEMS.letter_e1 = { id:'letter_e1', n:'A Letter from the Drowned', cat:'quest', price:80, weight:1,
  desc:'Wet, legible, and a hundred years old. A letter for a cousin in the country. Widow Pell will pay for it.' };
ADV.KEYITEMS.cloak_e3 = { id:'cloak_e3', n:'The Moth-Eaten Cloak', cat:'quest', price:300, weight:3,
  desc:'Old, moth-eaten, and irreplaceable. Elder Tomas\u2019s grandmother made it, and she will not sleep without it.' };

/* ---------- town builder (standard layout) ---------- */
function stdTown(opts) {
  var buildings = [
    { id:'hall', kind:'hall', name: opts.town + ' Guild Hall', x:3, y:3, w:5, h:4 },
    { id:'inn', kind:'inn', name: opts.inn, x:9, y:3, w:5, h:4 },
    { id:'temple', kind:'temple', name: opts.temple, x:15, y:3, w:5, h:4 },
    { id:'shop1', kind:'general', name: opts.shop1, x:3, y:9, w:5, h:4 },
    { id:'shop2', kind:'apothecary', name: opts.shop2, x:9, y:9, w:5, h:4 }
  ];
  if (opts.scribe) buildings.push({ id:'shop3', kind:'scribe', name: opts.scribe, x:15, y:9, w:5, h:4 });
  if (opts.magic) buildings.push({ id:'shop4', kind:'magic', name: opts.magic, x:3, y:15, w:5, h:4 });
  buildings.push({ id:'yard', kind:'yard', name: opts.yard, x:9, y:15, w:5, h:4 });
  return {
    gate: [11, 21], well: [12, 13],
    trees: [[5, 12], [16, 12], [18, 17], [5, 17]],
    buildings: buildings,
    npcs: [
      { id:'giver', name: opts.giver, role:'giver', x:5, y:5, bld:'hall' },
      { id:'innkeep', name: opts.innkeep, role:'innkeep', x:11, y:5, bld:'inn' },
      { id:'priest', name: opts.priest, role:'priest', x:17, y:5, bld:'temple' }
    ]
  };
}

/* ---------- shop stock attach (called after makeAdventure) ---------- */
function stockShops(a, band) {
  var str = new Streams('adv:' + a.seed);
  a.town.shops = {};
  var specs = {
    shop1: { kind:'general', b: Math.min(3, band) },
    shop2: { kind:'apothecary', b: band },
    shop3: { kind:'scribe', b: band },
    shop4: { kind:'magic', b: band }
  };
  for (var bld in specs) {
    var b = a.town.buildingsById[bld];
    if (!b) continue;
    var sp = specs[bld];
    a.town.shops[bld] = { kind: sp.kind, name: b.name, stock: TREASURE.shopStock(str.rng('stock:' + bld), sp.kind, sp.b, a.seed) };
  }
}

/* ============================================================
   E0 — The Cellars of Thornwick (levels 1-2)
   ============================================================ */
(function () {
  var a = {
    id:'E0', seed:'e0', name:'The Cellars of Thornwick',
    band:1, levels:'1-2', size:'small',
    townName:'Thornwick',
    desc:'A river town keeps its cellars dry and its goblins out. This spring both have failed.',
    townSpec: stdTown({
      town:'Thornwick', giver:'Master Aldric Vane', inn:'The Crooked Antler', innkeep:'Sela Marr',
      temple:'The Dawn Chapel', priest:'Brother Cwinn', shop1:'The Brass Kettle', shop2:'Wick & Mortar',
      yard:'The Yard'
    }),
    wildSpec: { w:24, h:24, band:1, townName:'Thornwick', dungeonName:'The Cellars', lairMons:['goblin','giant_rat'] },
    dungeonName:'The Cellars',
    floorSpecs: [
      { name:'The Top Step', w:20, h:14, rooms:5, tex:3,
        mobs:[['giant_rat',2],['goblin',3]],
        loot:[{kind:'gold',amt:40},{kind:'item',id:'p_heal'},{kind:'gold',amt:100,quest:'q_e0_cache'}],
        traps:[{kind:'dart'},{kind:'pit'}], secrets:1, locked:1 },
      { name:'The Deep Step', w:22, h:16, rooms:6, tex:1,
        mobs:[['goblin',4],['goblin shaman',1],['giant spider',1]],
        loot:[{kind:'item',id:'j_gold_ring',quest:'q_e0_ring'},{kind:'chest',type:'e',level:2}],
        traps:[{kind:'dart'},{kind:'block',party:true}], secrets:1,
        boss:{id:'cellar_king',name:'The Cellar King'}, bossLevel:2 }
    ],
    quests: [
      { id:'q_e0_main', kind:'main', name:'The Cellars of Thornwick', gold:300, xp:2000,
        text:'The old cellars beneath the abbey hill have gone quiet, and quiet is the wrong thing for a cellar to be. The goblins came in from the fen country and pay no tithe at all. Clear them out, and put down whatever now wears the old mayor\u2019s hat.' },
      { id:'q_e0_ring', kind:'side', name:'The Merchant\u2019s Ring', gold:100, xp:400,
        text:'My father\u2019s signet went out with the night the cellars went bad. It is nothing to me in gold. It is everything in the rest. Find the ring with the fen-mark on it.' },
      { id:'q_e0_cache', kind:'side', name:'The Goblins\u2019 Cache', gold:50, xp:200,
        text:'The goblins have been storing toll-money in the cellars. Bring up a hundred gold of it and the constable\u2019s office will pay you fifty, and set two hundred experience against the deed.' }
    ],
    mainQuest:'q_e0_main'
  };
  ADV.makeAdventure(a);
  stockShops(a, 1);
})();

/* ============================================================
   E1 — The Hollow Vaults (levels 1-3)
   ============================================================ */
(function () {
  var a = {
    id:'E1', seed:'e1', name:'The Hollow Vaults',
    band:1, levels:'1-3', size:'medium',
    townName:'Fenwick',
    desc:'The marsh gives back what it drowns, and lately it is giving back wrong.',
    townSpec: stdTown({
      town:'Fenwick', giver:'Bailiff Maren Holt', inn:'The Drowned Fox', innkeep:'Marit Foss',
      temple:'The Chapel of the Still Water', priest:'Sister Anneke', shop1:'The Silt & Scale',
      shop2:'The Marsh Pot', scribe:'The Fen Quill', yard:'The Causeway Yard'
    }),
    wildSpec: { w:24, h:24, band:1, townName:'Fenwick', dungeonName:'The Hollow Vaults', lairMons:['giant_rat','skeleton'] },
    dungeonName:'The Hollow Vaults',
    floorSpecs: [
      { name:'The Causeway Vaults', w:20, h:15, rooms:5, tex:2,
        mobs:[['giant_rat',3],['goblin',2],['kobold',2]],
        loot:[{kind:'gold',amt:30},{kind:'item',id:'p_heal'},{kind:'gold',amt:80,quest:'q_e1_toll'}],
        traps:[{kind:'dart'},{kind:'gas'}], secrets:1 },
      { name:'The Drowned Galleries', w:22, h:16, rooms:6, tex:1,
        mobs:[['skeleton',3],['zombie',2],['ghoul',1]],
        loot:[{kind:'item',id:'p_detect'},{kind:'gold',amt:50},{kind:'item',id:'letter_e1',quest:'q_e1_letter'}],
        traps:[{kind:'dart'},{kind:'pit'},{kind:'blade'}], secrets:1, locked:1 },
      { name:'The Hollow Deep', w:22, h:16, rooms:6, tex:1,
        mobs:[['skeleton',2],['ghoul',2],['drow',1]],
        loot:[{kind:'chest',type:'e',level:3}],
        traps:[{kind:'blade'},{kind:'block',party:true}], secrets:1,
        boss:{id:'hollow_troll',name:'The Hollow Troll'}, bossLevel:3 }
    ],
    quests: [
      { id:'q_e1_main', kind:'main', name:'The Hollow Vaults', gold:600, xp:4000,
        text:'The marsh is taking back what it drowned. The vaults under the old causeway hold the marsh-dead, and a troll is keeping the door. End the keeping, and the bailiffship will pay six hundred gold and set four thousand experience against the deed.' },
      { id:'q_e1_letter', kind:'side', name:'A Letter from the Drowned', gold:80, xp:300,
        text:'Widow Pell\u2019s brother went out on the marsh with a letter for a cousin in the country. The marsh gave him back in pieces, but not the letter. If it is still in the vaults, she will pay eighty gold and set three hundred experience against it.' },
      { id:'q_e1_toll', kind:'side', name:'The Marsh Toll', gold:40, xp:200,
        text:'The toll-takers under the causeway stowed eighty gold in the vaults. Bring it up and forty gold and two hundred experience will be set against the deed.' }
    ],
    mainQuest:'q_e1_main'
  };
  ADV.makeAdventure(a);
  stockShops(a, 1);
})();

/* ============================================================
   E2 — Barrow of the Iron King (levels 3-5)
   ============================================================ */
(function () {
  var a = {
    id:'E2', seed:'e2', name:'Barrow of the Iron King',
    band:2, levels:'3-5', size:'medium',
    townName:'Dunmere',
    desc:'The barrow on the hill was sealed before the road was cut. Something has opened it.',
    townSpec: stdTown({
      town:'Dunmere', giver:'Warden Torc Dun', inn:'The Iron Boar', innkeep:'Greta Maw',
      temple:'The Chapel of the Old Crown', priest:'Cantor Elswyth', shop1:'Dunmere Goods',
      shop2:'The Pale Mortar', scribe:'The Crow Quill', yard:'The Warden\u2019s Yard'
    }),
    wildSpec: { w:24, h:24, band:2, townName:'Dunmere', dungeonName:'The Iron Barrow', lairMons:['orc','wight'] },
    dungeonName:'The Iron Barrow',
    floorSpecs: [
      { name:'The King\u2019s Road', w:22, h:16, rooms:6, tex:2,
        mobs:[['orc',3],['skeleton',2]],
        loot:[{kind:'gold',amt:60},{kind:'item',id:'p_heal_great'},{kind:'chest',type:'e',level:4}],
        traps:[{kind:'dart'},{kind:'spear'}], secrets:1, locked:1 },
      { name:'The Rusted Court', w:22, h:16, rooms:6, tex:1,
        mobs:[['wight',2],['wraith',1],['hobgoblin',2]],
        loot:[{kind:'gold',amt:100},{kind:'item',id:'j_platinum_pin',quest:'q_e2_signet'},{kind:'chest',type:'e',level:4}],
        traps:[{kind:'dart'},{kind:'blade'},{kind:'gas'}], secrets:1, locked:1 },
      { name:'The Barrow Heart', w:24, h:18, rooms:7, tex:1,
        mobs:[['wight',2],['mummy',1]],
        loot:[{kind:'chest',type:'e',level:5}],
        traps:[{kind:'block',party:true},{kind:'blade'}], secrets:1,
        boss:{id:'iron_king',name:'The Iron King'}, bossLevel:5 }
    ],
    quests: [
      { id:'q_e2_main', kind:'main', name:'The Barrow of the Iron King', gold:1200, xp:8000,
        text:'The barrow on the hill was sealed before the road was cut. Something has opened it, and the old kings of Dunmere will not lie still. The iron crown is missing. End this, and the wardenship will pay twelve hundred gold and set eight thousand experience against the deed.' },
      { id:'q_e2_key', kind:'side', name:'The Two Half-Keys', gold:200, xp:600, twopart:true,
        text:'The barrow door takes a key in two halves. The cantor keeps one half; a merchant of Dunmere keeps the other. Bring both to the wardenship, and two hundred gold and six hundred experience will be set against the deed.' },
      { id:'q_e2_signet', kind:'side', name:'The King\u2019s Signet', gold:150, xp:500,
        text:'The old king\u2019s signet — a platinum pin with a raven on it — was seen in the barrow. Bring it to the wardenship and one hundred fifty gold and five hundred experience will be set against it.' }
    ],
    mainQuest:'q_e2_main',
    keyHalves: { a:'key_e2_a', b:'key_e2_b', joined:'key_e2', quest:'q_e2_key' }
  };
  ADV.makeAdventure(a);
  stockShops(a, 2);
})();

/* ============================================================
   E3 — The Witch-Queen of Ravenmoor (levels 5-7)
   ============================================================ */
(function () {
  var a = {
    id:'E3', seed:'e3', name:'The Witch-Queen of Ravenmoor',
    band:2, levels:'5-7', size:'large',
    townName:'Ravenmoor',
    desc:'The dead of the moor walk in a line now, and the line goes to the witch\u2019s barrow.',
    townSpec: stdTown({
      town:'Ravenmoor', giver:'Reeve Agatha Moss', inn:'The Perch', innkeep:'Old Bram',
      temple:'The Chapel of the Last Light', priest:'Deacon Yvaine', shop1:'The Moor\u2019s Purse',
      shop2:'The Black Mortar', scribe:'The Raven Quill', yard:'The Moorside Yard'
    }),
    wildSpec: { w:24, h:24, band:2, townName:'Ravenmoor', dungeonName:'The Witch\u2019s Barrow', lairMons:['gnoll','wight'] },
    dungeonName:'The Witch\u2019s Barrow',
    floorSpecs: [
      { name:'The Moorside Steps', w:20, h:14, rooms:5, tex:3,
        mobs:[['orc',3],['gnoll',2]],
        loot:[{kind:'gold',amt:50},{kind:'item',id:'p_heal'}],
        traps:[{kind:'dart'},{kind:'pit'}], secrets:1 },
      { name:'The Drow Gallery', w:22, h:16, rooms:6, tex:2,
        mobs:[['werewolf',2],['drow',2],['wight',1]],
        loot:[{kind:'item',id:'cloak_e3',quest:'q_e3_cloak'},{kind:'gold',amt:80}],
        traps:[{kind:'dart'},{kind:'blade'},{kind:'gas'}], secrets:1, locked:1 },
      { name:'The Line of the Dead', w:24, h:18, rooms:7, tex:1,
        mobs:[['assassin',2],['mind flayer',1],['wraith',2]],
        loot:[{kind:'gold',amt:200,quest:'q_e3_tithe'},{kind:'chest',type:'e',level:6}],
        traps:[{kind:'blade'},{kind:'block',party:true}], secrets:2, locked:1 },
      { name:'The Witch\u2019s Barrow', w:24, h:18, rooms:7, tex:1,
        mobs:[['wraith',2],['shadow',3]],
        loot:[{kind:'chest',type:'e',level:7}],
        traps:[{kind:'block',party:true},{kind:'gas'}], secrets:1,
        boss:{id:'witch_queen',name:'The Witch-Queen'}, bossLevel:7 }
    ],
    quests: [
      { id:'q_e3_main', kind:'main', name:'The Witch-Queen of Ravenmoor', gold:2400, xp:16000,
        text:'The dead of the moor walk in a line now, and the line goes to the witch\u2019s barrow. She is collecting the village\u2019s fear like a tithe, and the tithe is coming up short of everything. End it, and the reeve will pay twenty-four hundred gold and set sixteen thousand experience against the deed.' },
      { id:'q_e3_cloak', kind:'side', name:'The Moth-Eaten Cloak', gold:300, xp:800,
        text:'Elder Tomas\u2019s grandmother made a cloak, and a drow in the witch\u2019s service stole it. She will not sleep without it. Find it in the drow gallery.' },
      { id:'q_e3_tithe', kind:'side', name:'The Tithe of Fear', gold:100, xp:400,
        text:'The witch\u2019s hoard holds two hundred gold of the village\u2019s tithes. Recover it, and one hundred gold and four hundred experience will be set against the deed.' }
    ],
    mainQuest:'q_e3_main'
  };
  ADV.makeAdventure(a);
  stockShops(a, 2);
})();

/* ============================================================
   Generated adventures G01-G50 (five bands of ten)
   ============================================================ */
(function () {
  var POOLS = [
    ['goblin','kobold','giant_rat','rat','wolf','skeleton','zombie','ghoul','giant spider','bandit','human thief'],
    ['orc','hobgoblin','gnoll','werewolf','troll','ogre','skeleton warrior','wight','wraith','drow','bandit chief'],
    ['hobgoblin captain','ogre','troll','troll warlord','wight elder','wraith','mummy','mind flayer','young beholder','cyclops','lizardman shaman','cult leader'],
    ['hill giant','stone giant','cloud giant','lich apprentice','wraith lord','vampire','vampire spawn','elder mind flayer','ochre jelly','red demon','horned devil','elder displacer','golem stone'],
    ['frost giant','fire giant','cloud giant','white giant elder','red giant','lich','vampire mummy','reaper','skeleton dragon','beholder','elder umber hulk','black puddle','balor','pit fiend','archdevil','greater barbed devil','kraken']
  ];
  var BOSSES = [
    ['ogre','bugbear','troll'],
    ['troll','ogre','lich apprentice'],
    ['mummy','troll warlord','wight elder'],
    ['vampire','wraith lord','lich apprentice'],
    ['lich','vampire mummy','reaper']
  ];
  var ADJ = ['Ashen','Pale','Grim','Hollow','Rusted','Grave','Mire','Iron','Gloom','Briar','Wet','Quiet','Bare','Sable','Cold'];
  var NOUN = ['Maw','Lord','Queen','King','Warden','Mother','Father','Steward','Thief','Hermit','Screamer','Dredge','Shepherd','Herald','Keeper'];
  var DUNGEON_SUF = ['Vaults','Crypt','Halls','Barrow','Hollow','Steps','Deep','Gallery','Cellars','Moot','Stair','Warren'];
  var GIVER_RACE = ['human','elf','dwarf'];
  var PERSON_FIRST = ['Edda','Tomas','Bram','Ysolde','Corwin','Maren','Osric','Liana','Petra','Havel','Sigrid','Doran'];
  var PERSON_LAST = ['Fell','Marston','Ode','Renn','Vale','Wick','Hollis','Pryde','Stane','Brew','Moss','Tate'];
  var NOUNS2 = ['toll','tribute','tithe','ransom','wager','dowry','penance','levy'];
  var SIDES_ITEM = ['g_pearl','g_amber','g_bloodstone','g_crystal','g_topaz','g_sapphire','j_pin','j_comb','j_chain','j_tiara','t_silk','t_spice'];

  var SIZES = {
    small:  { floors:[{ w:18, h:14, rooms:4 },{ w:18, h:14, rooms:5 }], gold:100, xp:1500 },
    medium: { floors:[{ w:20, h:15, rooms:5 },{ w:20, h:15, rooms:6 }], gold:200, xp:3000 },
    large:  { floors:[{ w:20, h:15, rooms:5 },{ w:22, h:16, rooms:6 },{ w:22, h:16, rooms:7 }], gold:400, xp:6000 },
    huge:   { floors:[{ w:20, h:15, rooms:5 },{ w:22, h:16, rooms:6 },{ w:22, h:16, rooms:7 },{ w:24, h:18, rooms:8 }], gold:800, xp:12000 }
  };
  var LEVELS = ['1-4','5-8','9-12','13-16','17-20'];

  for (var band = 1; band <= 5; band++) {
    for (var i = 0; i < 10; i++) {
      var num = (band - 1) * 10 + i + 1;
      var id = 'G' + (num < 10 ? '0' + num : num);
      var size = i < 4 ? 'small' : i < 7 ? 'medium' : i < 9 ? 'large' : 'huge';
      var seed = 'g' + id.toLowerCase();
      var str = new Streams('adv:' + seed);
      var r = str.rng('gen');

      var townName = WILDS.genName(str, 'town', id);
      var dname = WILDS.genName(str, 'dname', id) + ' ' + DUNGEON_SUF[Math.floor(r() * DUNGEON_SUF.length)];
      var giverName = 'Keeper ' + randomName('human', []) + ' ' + PERSON_LAST[Math.floor(r() * PERSON_LAST.length)];
      var bossId = BOSSES[band - 1][Math.floor(r() * BOSSES[band - 1].length)];
      var bossName = 'The ' + ADJ[Math.floor(r() * ADJ.length)] + ' ' + NOUN[Math.floor(r() * NOUN.length)];

      // floors
      var S = SIZES[size];
      var pool = POOLS[band - 1];
      var floorSpecs = S.floors.map(function (f, fi) {
        var rr = str.rng('fgen:' + id + ':' + fi);
        var nTypes = 2 + (fi === S.floors.length - 1 ? 1 : 0);
        var types = [];
        for (var t = 0; t < nTypes; t++) {
          var mid = pool[Math.floor(rr() * pool.length)];
          if (types.indexOf(mid) < 0) types.push(mid);
        }
        var mobs = types.map(function (m) { return [m, 2 + Math.floor(rr() * 2)]; });
        var loot = [
          { kind:'gold', amt: 20 + Math.floor(rr() * 40) + band * 10 },
          { kind:'item', id: M.pick(['p_heal','p_cure_poison','p_detect','p_invis','p_heroism','g_pearl','g_amber']) }
        ];
        var traps = [{ kind: M.pick(['dart','pit','blade']) }, { kind: M.pick(['dart','blade','gas']) }];
        if (fi > 0 || rr() < 0.5) traps.push({ kind:'block', party:true });
        var spec = {
          name: dname + ' — Floor ' + (fi + 1), w:f.w, h:f.h, rooms:f.rooms,
          tex: M.pick([1,1,2,3]), mobs:mobs, loot:loot, traps:traps,
          secrets: 1 + (rr() < 0.4 ? 1 : 0), locked: (fi > 0 && rr() < 0.7) ? 1 : 0
        };
        if (fi === S.floors.length - 1) {
          spec.boss = { id:bossId, name:bossName };
          spec.bossLevel = 1 + (band - 1) * 4 + Math.floor(rr() * 3);
          spec.loot.push({ kind:'chest', type:'f', level: spec.bossLevel });
        }
        return spec;
      });

      // side-quest targets (placed as loot markers on random floors)
      var sideItem = SIDES_ITEM[Math.floor(r() * SIDES_ITEM.length)];
      var person = PERSON_FIRST[Math.floor(r() * PERSON_FIRST.length)] + ' ' + PERSON_LAST[Math.floor(r() * PERSON_LAST.length)];
      var sideFloor = Math.min(1 + Math.floor(r() * S.floors.length), S.floors.length - 1);
      var noun2 = NOUNS2[Math.floor(r() * NOUNS2.length)];
      var sideAmt = 40 * band;
      floorSpecs[sideFloor].loot.push({ kind:'item', id:sideItem, quest:'q_' + id + '_side1' });
      floorSpecs[S.floors.length - 1].loot.push({ kind:'gold', amt:sideAmt, quest:'q_' + id + '_side2' });

      // rewards
      var mainGold = S.gold * band, mainXp = S.xp * band;

      // wilderness: sometimes a second (sealed) dungeon entrance to a sibling adventure
      var extraD = null;
      if (r() < 0.5) {
        var sibBand = band;
        var sibs = ADV.ORDER.filter(function (x) {
          return x.indexOf('G') === 0 && x !== id && ADV.get(x) && ADV.get(x).band === sibBand;
        });
        if (sibs.length) {
          var sib = sibs[Math.floor(r() * sibs.length)];
          extraD = { name: ADV.get(sib).dungeonName, advId: sib, sealed:true, sealedBy: id + ':' + 'q_' + id + '_main' };
        }
      }

      var quests = [
        { id:'q_' + id + '_main', kind:'main', name:'The ' + bossName, gold:mainGold, xp:mainXp,
          text: bossName + ' keeps what the folk of ' + townName + ' dare not name, in the ' + dname + '. End it, and ' + giverName + ' will pay ' + mainGold + ' gold and set ' + mainXp + ' experience against the deed.' },
        { id:'q_' + id + '_side1', kind:'side', name:'The ' + ADV.itemOf(sideItem).n + ' of ' + person, gold:50 * band, xp:500 * band,
          text: person + ' of ' + townName + ' lost a ' + ADV.itemOf(sideItem).n.toLowerCase() + ' to the ' + dname + '. ' + (50 * band) + ' gold and ' + (500 * band) + ' experience will be set against the finding.' },
        { id:'q_' + id + '_side2', kind:'side', name:'The Stowed ' + titleCase(noun2), gold:30 * band, xp:300 * band,
          text: 'The folk of ' + townName + ' say the ' + dname + ' holds ' + sideAmt + ' gold of ' + noun2 + '. Recover it, and ' + (30 * band) + ' gold and ' + (300 * band) + ' experience will be set against the deed.' }
      ];

      var innN = M.pick(['The Tired Stag','The Crooked Lamp','The Quiet Boar','The Last Hearth','The Open Eye','The Salted Nail']);
      var templeN = M.pick(['The Dawn Chapel','The Still Water Chapel','The Lantern Chapel','The Chapel of Hours','The Ember Chapel']);
      var a = {
        id:id, seed:seed, name:dname,
        band:band, levels:LEVELS[band - 1], size:size,
        townName:townName,
        desc: 'A ' + size + ' piece of the wilds: ' + dname + ' beneath the country around ' + townName + '.',
        townSpec: stdTown({
          town:townName, giver:giverName, inn:innN,
          innkeep: randomName('human', []), temple:templeN,
          priest: randomName('elf', []),
          shop1: M.pick(['The Brass Ledger','The Iron Purse','The Honest Scale','The Two Carts','The Fair Weight']),
          shop2: M.pick(['The Green Mortar','The Pale Mortar','The Salted Pot','The Quiet Vial']),
          scribe: band >= 2 ? M.pick(['The Crow Quill','The Fen Quill','The Morning Quill','The Inkwell']) : null,
          magic: band >= 4 ? M.pick(['Arcana & Oddities','The Glass Cabinet','The Warded Shelf']) : null,
          yard: M.pick(['The Yard','The Training Yard','The Old Yard','The Stone Yard'])
        }),
        wildSpec: {
          w:24, h:24, band:band, townName:townName, dungeonName:dname,
          lairMons: [pool[Math.floor(r() * pool.length)], pool[Math.floor(r() * pool.length)]],
          extraDungeons: extraD ? [extraD] : null
        },
        dungeonName:dname,
        floorSpecs:floorSpecs,
        quests:quests,
        mainQuest:'q_' + id + '_main'
      };
      // stdTown with null scribe/magic: strip nulls (stdTown already skips nulls)
      ADV.makeAdventure(a);
      stockShops(a, band);
    }
  }
})();

if (typeof module !== 'undefined' && module.exports) module.exports = { ADV: ADV };
