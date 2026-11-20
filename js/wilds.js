/* ============================================================
   EMBERFALL — wilds.js
   Wilderness maps: terrain grid (grass, forest, hills, mountains,
   fen, river, road, bridge), travel costs, sites (town, dungeon
   entrances, hamlets, healers, holy sites, lairs, camps),
   encounter tables and rumours. Deterministic per adventure seed
   with separate RNG streams.
   ============================================================ */
'use strict';

var WILDS = (function () {
  var T = {
    GRASS: 0, FOREST: 1, HILLS: 2, MOUNTAIN: 3, FEN: 4, RIVER: 5, ROAD: 6, BRIDGE: 7
  };
  var TERRAIN_INFO = [
    { name:'grass', cost:1, color:'#4a5d3a' },
    { name:'forest', cost:1.5, color:'#2f4527' },
    { name:'hills', cost:2, color:'#5d5540' },
    { name:'mountain', cost:3, color:'#57504a' },
    { name:'fen', cost:2, color:'#3c4a33' },
    { name:'river', cost:4, color:'#2c4a5d' },
    { name:'road', cost:0.5, color:'#6b5b3d' },
    { name:'bridge', cost:0.5, color:'#4d3d26' }
  ];

  var SITES = {
    town: { icon:'T', name:'Home Town' },
    dungeon: { icon:'D', name:'Dungeon Entrance' },
    hamlet: { icon:'H', name:'Hamlet' },
    healer: { icon:'+', name:'Healer\u2019s Hut' },
    holy: { icon:'*', name:'Holy Site' },
    lair: { icon:'X', name:'Monster Lair' },
    camp: { icon:'^', name:'Safe Camp' }
  };

  function terrainCost(t, hasWanderer) {
    var c = TERRAIN_INFO[t].cost;
    if (hasWanderer && (t === T.HILLS || t === T.FEN || t === T.MOUNTAIN)) c = Math.max(1, c - 1);
    return c;
  }

  // value-noise-ish terrain from a stream
  function genTerrain(str, w, h) {
    var r = str.rng('terrain');
    var t = new Array(w * h);
    // base blobs
    var blobs = 6 + Math.floor(r() * 4);
    var cx = [], cy = [], ct = [], cr = [];
    for (var i = 0; i < blobs; i++) {
      cx.push(Math.floor(r() * w));
      cy.push(Math.floor(r() * h));
      var roll = r();
      ct.push(roll < 0.35 ? T.FOREST : roll < 0.55 ? T.HILLS : roll < 0.75 ? T.FEN : T.MOUNTAIN);
      cr.push(2 + Math.floor(r() * 4));
    }
    for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) {
      var val = 0;
      for (i = 0; i < blobs; i++) {
        var d = M.dist(x, y, cx[i], cy[i]);
        if (d < cr[i]) val = Math.max(val, 1 - d / cr[i]);
      }
      var base = T.GRASS;
      if (val > 0.72) base = M.pick([T.MOUNTAIN, T.FOREST]);
      else if (val > 0.5) base = M.pick([T.HILLS, T.FOREST, T.FEN]);
      else if (val > 0.3) base = M.pick([T.FOREST, T.FEN, T.GRASS]);
      t[y * w + x] = base;
    }
    // rivers
    var rivers = 1 + (r() < 0.4 ? 1 : 0);
    for (i = 0; i < rivers; i++) {
      var yy = Math.floor(r() * h), xx = 0;
      var horiz = r() < 0.5;
      if (horiz) {
        while (xx < w) {
          t[yy * w + xx] = T.RIVER;
          if (r() < 0.5) t[Math.max(0, yy - 1) * w + xx] = T.RIVER;
          yy = M.clamp(yy + (r() < 0.5 ? -1 : 1), 0, h - 1);
          xx++;
        }
      } else {
        xx = Math.floor(r() * w);
        while (yy < h) {
          t[yy * w + xx] = T.RIVER;
          if (r() < 0.5) t[yy * w + Math.min(w - 1, xx + 1)] = T.RIVER;
          xx = M.clamp(xx + (r() < 0.5 ? -1 : 1), 0, w - 1);
          yy++;
        }
      }
    }
    return t;
  }

  function isRiver(t, idx, w) { return t[idx] === T.RIVER; }

  // carve a road between two sites (simple greedy path), placing bridges over rivers
  function carveRoad(t, w, h, x1, y1, x2, y2) {
    var x = x1, y = y1, guard = w * h * 4;
    t[y * w + x] = T.ROAD;
    while ((x !== x2 || y !== y2) && guard-- > 0) {
      var dx = Math.sign(x2 - x), dy = Math.sign(y2 - y);
      var nextX = x, nextY = y;
      // prefer the axis with bigger delta; avoid entering river unless it is a crossing
      if (Math.abs(x2 - x) >= Math.abs(y2 - y)) {
        if (dx !== 0 && t[y * w + x + dx] !== T.RIVER) nextX = x + dx;
        else if (dy !== 0) nextY = y + dy;
      } else {
        if (dy !== 0 && t[(y + dy) * w + x] !== T.RIVER) nextY = y + dy;
        else if (dx !== 0) nextX = x + dx;
      }
      if (nextX === x && nextY === y) { // stuck: step anywhere dry
        var opts = [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]].filter(function (p) {
          return p[0] >= 0 && p[0] < w && p[1] >= 0 && p[1] < h && t[p[1] * w + p[0]] !== T.RIVER;
        });
        if (!opts.length) break;
        var o = M.pick(opts); nextX = o[0]; nextY = o[1];
      }
      x = nextX; y = nextY;
      t[y * w + x] = t[y * w + x] === T.RIVER ? T.BRIDGE : T.ROAD;
    }
    return t;
  }

  // place sites without overlap; returns site objects
  function placeSites(str, t, w, h, spec) {
    var used = {}, sites = [];
    function clear(x, y) {
      for (var dy = -1; dy <= 1; dy++) for (var dx = -1; dx <= 1; dx++) {
        var nx = x + dx, ny = y + dy;
        if (nx < 1 || ny < 1 || nx >= w - 1 || ny >= h - 1) return false;
        if (t[ny * w + nx] === T.RIVER) return false;
      }
      if (used[x + ',' + y]) return false;
      return true;
    }
    function stamp(x, y) { used[x + ',' + y] = 1; }
    function put(kind, x, y, data) {
      if (x == null || !clear(x, y)) return null;
      stamp(x, y);
      var s = { kind:kind, x:x, y:y };
      for (var k in (data || {})) s[k] = data[k];
      sites.push(s);
      return s;
    }
    var r = str.rng('sites');
    // home town near a corner (retry corners, then random spots)
    var corners = [[2, 2], [w - 3, 2], [2, h - 3], [w - 3, h - 3]];
    var town = null;
    for (var ci = 0; ci < corners.length && !town; ci++) {
      town = put('town', corners[ci][0], corners[ci][1], { name: spec.townName });
    }
    if (!town) {
      for (var ti = 0; ti < 300 && !town; ti++) {
        town = put('town', 2 + Math.floor(r() * (w - 4)), 2 + Math.floor(r() * (h - 4)), { name: spec.townName });
      }
    }
    // dungeon entrance(s)
    var nD = spec.dungeons || 1;
    for (var i = 0; i < nD; i++) {
      var x, y, tries = 0;
      do {
        x = 1 + Math.floor(r() * (w - 2));
        y = 1 + Math.floor(r() * (h - 2));
        tries++;
      } while (!clear(x, y) && tries < 200);
      put('dungeon', x, y, { name: spec.dungeonName, advId: spec.dungeonAdv || spec.id });
    }
    // extra dungeon entrances (other adventures; optionally sealed until a quest)
    (spec.extraDungeons || []).forEach(function (ed, ei) {
      var x, y, tries = 0;
      do {
        x = 1 + Math.floor(r() * (w - 2));
        y = 1 + Math.floor(r() * (h - 2));
        tries++;
      } while (!clear(x, y) && tries < 200);
      put('dungeon', x, y, { name: ed.name, advId: ed.advId, sealed: !!ed.sealed, sealedBy: ed.sealedBy || null, ei: ei });
    });
    // hamlets
    var nH = 1 + (r() < 0.6 ? 1 : 0);
    for (i = 0; i < nH; i++) {
      var x2, y2, t2 = 0;
      do {
        x2 = 2 + Math.floor(r() * (w - 4));
        y2 = 2 + Math.floor(r() * (h - 4));
        t2++;
      } while (!clear(x2, y2) && t2 < 200);
      put('hamlet', x2, y2, { name: spec.hamletNames ? spec.hamletNames[i] || WILDS.genName(str, 'hamlet', i) : WILDS.genName(str, 'hamlet', i) });
    }
    // healer
    var xh, yh, th = 0;
    do { xh = 2 + Math.floor(r() * (w - 4)); yh = 2 + Math.floor(r() * (h - 4)); th++; }
    while (!clear(xh, yh) && th < 200);
    put('healer', xh, yh, { name:'Healer\u2019s Hut' });
    // holy site
    var xg, yg, tg = 0;
    do { xg = 2 + Math.floor(r() * (w - 4)); yg = 2 + Math.floor(r() * (h - 4)); tg++; }
    while (!clear(xg, yg) && tg < 200);
    put('holy', xg, yg, { name:'Holy Site' });
    // lair
    var xl, yl, tl = 0;
    do { xl = 2 + Math.floor(r() * (w - 4)); yl = 2 + Math.floor(r() * (h - 4)); tl++; }
    while (!clear(xl, yl) && tl < 200);
    put('lair', xl, yl, { name:'Monster Lair', mons: spec.lairMons || ['orc', 'orc'] });
    // safe camp
    var xc, yc, tc = 0;
    do { xc = 2 + Math.floor(r() * (w - 4)); yc = 2 + Math.floor(r() * (h - 4)); tc++; }
    while (!clear(xc, yc) && tc < 200);
    put('camp', xc, yc, { name:'Safe Camp' });
    // roads: town->dungeon(s)->hamlets
    if (town) {
      var ds = sites.filter(function (s) { return s.kind === 'dungeon'; });
      var last = town;
      for (i = 0; i < ds.length; i++) {
        carveRoad(t, w, h, last.x, last.y, ds[i].x, ds[i].y);
        last = ds[i];
      }
      var hs = sites.filter(function (s) { return s.kind === 'hamlet'; });
      for (i = 0; i < hs.length; i++) {
        carveRoad(t, w, h, town.x, town.y, hs[i].x, hs[i].y);
      }
    }
    return sites;
  }

  // encounter table per band
  var BAND_TABLES = [
    // band 1 (L1-4)
    [['goblin',20],['kobold',15],['giant_rat',10],['rat',8],['wolf',10],['dire wolf',6],['skeleton',12],['zombie',10],['ghoul',5],['giant spider',5],['giant beetle',5],['cave_bug',6],['giant centipede',4],['bandit',8],['human thief',5]],
    // band 2 (L5-8)
    [['orc',18],['hobgoblin',14],['gnoll',10],['werewolf',6],['troll',6],['ogre',8],['skeleton warrior',10],['wight',6],['wraith',5],['shadow',5],['drow',6],['assassin',5],['bandit chief',4],['giant scorpion',5],['manticore',4],['wererat',4]],
    // band 3 (L9-12)
    [['hobgoblin captain',12],['ogre',10],['troll',10],['troll warlord',6],['wight elder',6],['wraith',8],['mummy',6],['mind flayer',6],['young beholder',4],['skeleton dragon',4],['giant ant',5],['giant mantis',4],['cyclops',6],['lizardman shaman',5],['human wizard',5],['cult leader',5]],
    // band 4 (L13-16)
    [['hill giant',12],['stone giant',10],['cloud giant',6],['lich apprentice',6],['wraith lord',6],['vampire',6],['vampire spawn',6],['elder mind flayer',5],['young beholder',5],['ochre jelly',5],['giant squid',4],['red demon',5],['horned devil',5],['elder displacer',5],['golem stone',5],['troll wight',5]],
    // band 5 (L17-20)
    [['frost giant',10],['fire giant',10],['cloud giant',10],['white giant elder',6],['red giant',6],['lich',6],['vampire mummy',6],['reaper',5],['skeleton dragon',6],['beholder',5],['elder umber hulk',5],['black puddle',4],['balor',4],['pit fiend',5],['archdevil',4],['greater barbed devil',4],['golem iron',5],['kraken',3]]
  ];
  function bandTable(band) {
    return BAND_TABLES[M.clamp(band - 1, 0, 4)];
  }

  // rumours: templates filled from local names
  var RUMOUR_TEMPLATES = [
    'They say {mon} have been taking cattle from the roads east of {place}.',
    'An old trader swore he saw {mon} in {place}, and he was no drinker.',
    'The folk of {place} pay a toll to a thing that answers to {mon}.',
    'A party from Thornwick did not come home from {place}. Their tracks ended at a {mon}.',
    'The shrine-keepers say the ground hums near {place}. They will not say why.',
    'Wolves keep to the fens now. The {mon} did something to them.',
    'A miner came out of {place} with gold teeth and no memory. Ask him nothing about {mon}.',
    'The river runs red after dark near {place}. The {mon} are blamed, and rightly, say some.'
  ];
  function genRumours(str, sites, mons) {
    var r = str.rng('rumours');
    var places = sites.map(function (s) { return s.name; });
    var out = [];
    for (var i = 0; i < 6; i++) {
      var tpl = RUMOUR_TEMPLATES[Math.floor(r() * RUMOUR_TEMPLATES.length)];
      var m = mons[Math.floor(r() * mons.length)];
      out.push(tpl.replace('{mon}', m ? m.toLowerCase() : 'creatures').replace('{place}', M.pick(places) || 'the wilds'));
    }
    return out;
  }

  var SYL = {
    a:['Em','Thar','Mor','Raven','Ash','Wol','Grave','Fen','Iron','Pale','Wych','Hollow','Storm','Briar','Gloom','Eld','Vex','Cairn','Dun','Mire'],
    b:['wick','moor','hall','gate','ford','deep','march','keep','wick','stead','barrow','fen','moor','fell','wood','mere','cliff','dene','hollow','reach']
  };
  function genName(str, kind, salt) {
    var r = str.rng('name:' + kind + ':' + salt);
    return SYL.a[Math.floor(r() * SYL.a.length)] + SYL.b[Math.floor(r() * SYL.b.length)];
  }

  return {
    T: T, TERRAIN_INFO: TERRAIN_INFO, SITES: SITES,
    genTerrain: genTerrain, carveRoad: carveRoad, placeSites: placeSites,
    bandTable: bandTable, genRumours: genRumours, genName: genName,
    terrainCost: terrainCost,
    encounterChance: function (terrain, night, fatigue) {
      var base = { 0:8, 1:12, 2:10, 3:12, 4:14, 5:4, 6:5, 7:5 }[terrain] || 8;
      if (night) base += 6;
      if (fatigue > 0.5) base += 4;
      return Math.min(60, base);
    }
  };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = { WILDS: WILDS };
