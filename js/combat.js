/* ============================================================
   EMBERFALL — combat.js
   Turn-based tactical combat. The party fights on a 2D grid:
   in dungeons the fight happens on the dungeon floor itself;
   overland fights happen in a small generated arena. Second
   edition conventions: descending AC, THAC0, saves,
   dexterity initiative, turn undead, backstab, breath
   weapons, poisons and regeneration.
   ============================================================ */
'use strict';

var Combat = (function () {
  var C = null;
  var timers = [];

  function clearTimers() { timers.forEach(clearTimeout); timers = []; }
  function later(fn, ms) { timers.push(setTimeout(fn, ms)); }

  /* ---------------- setup ---------------- */

  function monsterActor(mon, x, y) {
    var m = MONSTERS[mon.id];
    var hdVal = m.hdVal || 1;
    return {
      side: 'mon', id: mon.id, name: mon.name || m.n,
      x: x, y: y, hp: m.hp, mhp: m.hp,
      ac: m.ac, thac0: 21 - Math.min(hdVal, 6),
      mv: Math.max(2, Math.ceil((m.mv || 10) / 2)),
      atk: 0, atkBonus: 0, monTHAC0: (hdVal <= 10 ? 20 - hdVal : Math.max(1, 10 - (hdVal - 10))),
      dmg: m.dmg, sp: m.sp || {}, xp: m.xp,
      tr: m.tr, turn: m.turn, hdVal: hdVal, size: m.size, morale: m.morale != null ? m.morale : 5,
      acted: false, dead: false, statuses: [], fled: false, moraleDone: false,
      monId: mon.id
    };
  }

  function partyActor(p) {
    var s = Campaign.sheet(p);
    return {
      side: 'party', charId: p.id, name: p.name, char: p,
      x: 0, y: 0, hp: p.hp, mhp: s.mhp, ac: s.ac, thac0: s.thac0,
      mv: Math.max(2, Math.ceil(s.mv / 2)),
      atkBonus: Campaign.hitBonus(p, false), dmgBonus: Campaign.dmgBonus(p),
      dmg: null, ranged: null, rangedDmg: null,
      acted: false, dead: false, statuses: [], defending: false
    };
  }

  function weaponInfo(a) {
    if (!a.char) return { kind: 'melee', dmg: a.dmg || '1d6', name: (a.name || 'A creature') + ' attack' };
    var p = a.char;
    var w = p.equip.weapon ? ITEMS[p.equip.weapon] : null;
    if (w && (w.c === 'weapon')) return { kind: 'melee', dmg: w.d, name: w.n };
    if (w && w.c === 'ranged') return { kind: 'ranged', dmg: w.d, range: w.rng || 8, name: w.n, ammo: ammoFor(w) };
    return { kind: 'melee', dmg: '1d3', name: 'Fists' };
  }
  function ammoFor(w) {
    var p = null;
    // find ammo item matching the weapon
    var ammoId = w.c === 'ranged' ? (w.id.indexOf('bow') >= 0 ? 'arrows' : w.id.indexOf('crossbow') >= 0 ? 'bolts' : 'sling_bullets') : null;
    if (!ammoId) return 0;
    for (var i = 0; i < G.party.length; i++) {
      var n = Campaign.countItem(G.party[i], ammoId);
      if (n > 0) { p = G.party[i]; return n; }
    }
    return 0;
  }
  function useAmmo(a) {
    var w = a.char.equip.weapon ? ITEMS[a.char.equip.weapon] : null;
    if (!w || w.c !== 'ranged') return;
    var ammoId = w.id.indexOf('bow') >= 0 ? 'arrows' : w.id.indexOf('crossbow') >= 0 ? 'bolts' : 'sling_bullets';
    for (var i = 0; i < G.party.length; i++) {
      if (Campaign.countItem(G.party[i], ammoId) > 0) { Campaign.removeItem(G.party[i], ammoId); return; }
    }
  }

  function start(kind, opts) {
    clearTimers();
    var G = Campaign.G;
    var grid;
    if (kind === 'dungeon') {
      var a = ADV.get(opts.adv);
      var f = a.floors[opts.floor];
      grid = { w: f.w, h: f.h, solid: f.solid, tex: f.tex, kind: 'dungeon' };
    } else {
      // small wilderness arena
      var w = 13, h = 9;
      var solid = new Uint8Array(w * h);
      for (var x = 0; x < w; x++) { solid[x] = 1; solid[(h - 1) * w + x] = 1; }
      for (var y = 0; y < h; y++) { solid[y * w] = 1; solid[y * w + w - 1] = 1; }
      var r = new Streams('arena:' + (opts.seed || 'x')).rng('r');
      var rocks = 2 + Math.floor(r() * 3);
      for (var i = 0; i < rocks; i++) {
        var rx = 2 + Math.floor(r() * (w - 4)), ry = 2 + Math.floor(r() * (h - 4));
        if (Math.abs(rx - 3) < 2 && Math.abs(ry - (h >> 1)) < 2) continue;
        solid[ry * w + rx] = 1;
      }
      grid = { w: w, h: h, solid: solid, tex: null, kind: kind };
    }

    var actors = [];
    var px = G.loc ? G.loc.x : 3, py = G.loc ? G.loc.y : (grid.h >> 1);
    if (grid.kind !== 'dungeon') { px = 2; py = grid.h >> 1; }
    G.party.forEach(function (p) {
      if (p.dead) return;
      var act = partyActor(p);
      act.x = px; act.y = py;
      if (!freeCell(grid, act.x, act.y, actors)) {
        // nudge
        for (var dy = -1; dy <= 1 && !freeCell(grid, act.x, act.y + dy, actors); dy++);
        for (var dx = -1; dx <= 1 && !freeCell(grid, act.x + dx, act.y, actors); dx++);
      }
      actors.push(act);
    });

    var mobs = (opts.mobs || []).map(function (m) {
      var ax = m.x, ay = m.y;
      if (grid.kind !== 'dungeon') { ax = grid.w - 3; ay = 2 + Math.floor(Math.random() * (grid.h - 4)); if (!freeCell(grid, ax, ay, actors)) { ay = grid.h >> 1; } }
      var monA = monsterActor(m, ax, ay);
      if (monA) actors.push(monA); // occupy the cell before the next mob spawns
      return monA;
    }).filter(Boolean);
    // mobs were pushed into actors as they spawned (cell occupancy)

    C = {
      kind: kind, adv: opts.adv, floor: opts.floor, grid: grid,
      actors: actors,
      round: 1, turnIdx: 0, order: [],
      state: 'setup', mode: 'menu', target: null,
      sel: null, highlights: [],
      msg: [], roundMsgs: [],
      seed: opts.seed || (opts.adv + '-' + (opts.floor || 0)),
      lair: !!opts.lair,
      ambush: !!opts.ambush,
      surprise: !!opts.surprise,
      auto: false,
      started: false
    };
    // party weapon info
    C.actors.forEach(function (a) { if (a.side === 'party') { var wi = weaponInfo(a); a.ranged = wi.kind === 'ranged' ? wi : null; } });

    Campaign.addMinutes(10);
    Campaign.log('Battle joins: ' + mobs.map(function (m) { return m.name; }).join(', ') + '.');
    G._combatLoc = G.loc && G.loc.x != null ? { x: G.loc.x, y: G.loc.y } : null;
    Campaign.setPhase('combat', { kind: kind, adv: opts.adv, floor: opts.floor, x: G.loc ? G.loc.x : 0, y: G.loc ? G.loc.y : 0 });
    startRound(true);
  }

  function freeCell(grid, x, y, actors) {
    if (x < 1 || y < 1 || x >= grid.w - 1 || y >= grid.h - 1) return false;
    if (grid.solid[y * grid.w + x]) return false;
    for (var i = 0; i < actors.length; i++) if (actors[i].x === x && actors[i].y === y) return false;
    return true;
  }

  function actorAt(x, y) {
    for (var i = 0; i < C.actors.length; i++) {
      var a = C.actors[i];
      if (!a.dead && a.x === x && a.y === y) return a;
    }
    return null;
  }
  function aliveActors(side) { return C.actors.filter(function (a) { return a.side === side && !a.dead; }); }

  /* ---------------- initiative & turns ---------------- */
  function dexOf(a) { return a.side === 'party' ? RULES.abilityMod(a.char.attrs.dex) : 0; }

  function startRound(first) {
    if (!C) return;
    C.actors.forEach(function (a) { a.acted = false; a.defending = false; });
    if (C.ambush && first) {
      // surprise: party loses first actions this round
      C.actors.forEach(function (a) { if (a.side === 'party') a.acted = true; });
      C.roundMsgs.push('Ambush! The ' + firstMonName() + ' springs first.');
      C.ambush = false;
    }
    if (C.surprise && first) {
      // the party slipped past notice — the foes lose their first actions
      C.actors.forEach(function (a) { if (a.side === 'mon') a.acted = true; });
      C.roundMsgs.push('The party strikes first — the foes are caught off guard!');
      C.surprise = false;
    }
    C.order = C.actors.filter(function (a) { return !a.dead; }).sort(function (a, b) {
      var da = dexOf(a) + M.d20(), db = dexOf(b) + M.d20();
      return db - da;
    });
    C.turnIdx = 0;
    advanceToNext(true);
  }

  function firstMonName() {
    var m = C.actors.find(function (a) { return a.side === 'mon'; });
    return m ? m.name : 'foes';
  }

  function advanceToNext(first) {
    if (!C) return;
    // find next unacted live actor
    var tries = C.order.length + 1;
    while (tries-- > 0) {
      if (C.turnIdx >= C.order.length) { nextRound(); return; }
      var a = C.order[C.turnIdx++];
      if (a.dead || a.acted) continue;
      a.acted = true;
      if (a.side === 'party') {
        if (a.char.dead) { a.acted = false; continue; }
        C.state = 'player';
        C.mode = 'menu';
        C.cur = a;
        C.highlights = [];
        Game.dirty();
        if (C.auto) later(function () { autoTurn(a); }, 260);
        return;
      } else {
        C.state = 'mon';
        C.cur = a;
        later(function () { monAct(a); }, 380);
        return;
      }
    }
    nextRound();
  }

  function nextRound() {
    if (!C) return;
    C.round++;
    Campaign.addMinutes(1);
    // tick statuses & clouds
    C.actors.forEach(function (a) {
      a.statuses = a.statuses.filter(function (st) {
        st.rounds--;
        if (st.dmg > 0 && st.rounds >= 0 && !a.dead) {
          var d = M.dice(1, 6);
          a.hp -= d;
          C.roundMsgs.push(a.name + ' suffers ' + d + ' (' + st.name + ').');
          if (a.hp <= 0) killActor(a);
        }
        return st.rounds > 0;
      });
    });
    (C.clouds || []).forEach(function (cl) {
      cl.rounds--;
      // damage occupants
      C.actors.forEach(function (a) {
        if (a.dead) return;
        for (var i = 0; i < cl.cells.length; i++) {
          if (cl.cells[i].x === a.x && cl.cells[i].y === a.y) {
            if (a.side !== cl.owner) {
              var save = a.side === 'party' ? saveRoll(a, 3) : M.d20() < 15;
              var d = M.dice(1, 6);
              if (!save) d = Math.ceil(d / 2);
              a.hp -= d;
              C.roundMsgs.push(cl.name + ' sears ' + a.name + ' for ' + d + '.');
              if (a.hp <= 0) killActor(a);
            }
            break;
          }
        }
      });
    });
    C.clouds = (C.clouds || []).filter(function (cl) { return cl.rounds > 0; });
    if (checkEnd()) return;
    startRound(false);
  }

  /* ---------------- saves & rolls ---------------- */
  function saveRoll(a, idx) {
    var s = a.side === 'party' ? a.char : null;
    var base = s ? Campaign.sheet(s).saves[idx] : 15; // monster save baseline 15 (HD-based)
    if (a.side === 'mon') base = 21 - Math.min(a.hdVal, 6);
    var need = a.side === 'party' ? base : base;
    // lower number is better (descending); roll d20, succeed if roll >= need
    var roll = M.d20();
    return roll >= need;
  }

  function attackRoll(attacker, defender) {
    // 2nd ed: roll d20 >= (attacker THAC0 - defender AC - bonuses).
    // Party actors store the class-table THAC0 and roll 19 - AC - bonus,
    // because atkBonus already contains (19 - tableTHAC0). Monsters use the
    // MM to-hit table by HD (monTHAC0) with no extra bonus.
    var bonus = attacker.side === 'party' ? (attacker.atkBonus || 0) : 0;
    var base = attacker.side === 'party' ? 19 : (attacker.monTHAC0 != null ? attacker.monTHAC0 : 19);
    var roll = M.d20();
    var need = base - (defender.ac != null ? defender.ac : 0) - bonus;
    if (defender.defending) need += 1;
    var hit = roll >= need;
    C.roundMsgs.push((attacker.name) + ' attacks ' + defender.name + ' (' + roll + ' vs ' + need + (defender.defending ? ' defended' : '') + ') ' + (hit ? '— hits.' : '— misses.'));
    return hit;
  }

  function dealDamage(target, dmg, src) {
    target.hp -= dmg;
    if (target.side === 'party') target.char.hp = target.hp;
    C.roundMsgs.push(target.name + ' takes ' + dmg + ' ' + (src || 'damage') + (target.hp <= 0 ? ' and falls!' : '.'));
    if (target.hp <= 0) killActor(target);
  }

  function killActor(a) {
    if (a.dead) return;
    a.dead = true;
    a.hp = 0;
    C.roundMsgs.push(a.name + ' is destroyed.');
    if (a.side === 'party') {
      a.char.dead = 1;
      a.char.hp = 0;
      Campaign.log(a.char.name + ' is slain.');
    }
    checkEnd();
  }

  /* ---------------- player actions ---------------- */
  function current() { return C.cur; }

  function reachableCells(a) {
    var grid = C.grid;
    var seen = {}, q = [[a.x, a.y]], out = {};
    seen[a.y * grid.w + a.x] = 0;
    var budget = mvAllowance(a);
    while (q.length) {
      var cell = q.shift();
      var d = seen[cell[1] * grid.w + cell[0]];
      if (d >= budget) continue;
      for (var i = 0; i < 4; i++) {
        var nx = cell[0] + [1, -1, 0, 0][i], ny = cell[1] + [0, 0, 1, -1][i];
        if (nx < 0 || ny < 0 || nx >= grid.w || ny >= grid.h) continue;
        var idx = ny * grid.w + nx;
        if (grid.solid[idx]) continue;
        if (actorAt(nx, ny)) continue;
        if (seen[idx] != null) continue;
        seen[idx] = d + 1;
        out[idx] = d + 1;
        q.push([nx, ny]);
      }
    }
    return out;
  }
  function mvAllowance(a) {
    var mv = a.mv;
    a.statuses.forEach(function (st) { if (st.slow) mv = Math.max(1, mv >> 1); });
    if (G.loc && G.loc.kind === 'dungeon' && Campaign.isNight()) mv = Math.max(1, mv - 1);
    return mv;
  }

  function attackTargets(a) {
    var out = [];
    var wi = a.side === 'party' ? weaponInfo(a) : null;
    var range = wi && wi.kind === 'ranged' ? wi.range : 1;
    var grid = C.grid;
    C.actors.forEach(function (t) {
      if (t.dead || t.side === a.side) return;
      var d = Math.max(Math.abs(t.x - a.x), Math.abs(t.y - a.y));
      if (d <= range && los(a.x, a.y, t.x, t.y)) out.push(t);
    });
    return out;
  }

  function los(x0, y0, x1, y1) {
    var dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
    var sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    var err = dx - dy, x = x0, y = y0, guard = 64;
    while (guard-- > 0) {
      if (x === x1 && y === y1) return true;
      var e2 = 2 * err;
      if (e2 > -dy) { err -= dy; x += sx; }
      if (e2 < dx) { err += dx; y += sy; }
      if (x === x1 && y === y1) return true;
      if (C.grid.solid[y * C.grid.w + x]) return false;
    }
    return false;
  }

  function doMove(a, x, y) {
    if (!C) return;
    a.x = x; a.y = y;
    if (C.kind === 'dungeon') { G.loc.x = x; G.loc.y = y; markVisited(x, y); }
    // trap check
    var f = floorState();
    if (f) {
      var idx = y * C.grid.w + x;
      if (f.traps[idx] && f.trapsSprung.indexOf(idx) < 0) {
        f.trapsSprung.push(idx);
        f.trapsFound.push(idx);
        trapHit(f.traps[idx], a);
      }
    }
    Game.dirty();
    later(advanceToNext, 120);
  }

  function floorState() {
    if (C.kind !== 'dungeon') return null;
    return Campaign.advWorld(C.adv).dungeon.floors[C.floor];
  }
  function markVisited(x, y) {
    var f = floorState();
    if (!f) return;
    var idx = y * C.grid.w + x;
    if (f.visited.indexOf(idx) < 0) {
      f.visited.push(idx);
      // spread a little
      for (var dy = -1; dy <= 1; dy++) for (var dx = -1; dx <= 1; dx++) {
        var nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= C.grid.w || ny >= C.grid.h) continue;
        var nidx = ny * C.grid.w + nx;
        if (f.visited.indexOf(nidx) < 0) f.visited.push(nidx);
      }
    }
  }

  function trapHit(t, a) {
    C.roundMsgs.push('A trap springs!');
    if (t.party) {
      aliveActors('party').forEach(function (p) {
        var d = M.dice(6, 2);
        dealDamage(p, d, 'trap damage');
      });
    } else {
      var d = M.dice(1, 6);
      dealDamage(a, d, 'trap damage');
      if (t.kind === 'dart' && Math.random() < 0.3) {
        if (!saveRoll(a, 1)) a.statuses.push({ name: 'poison', rounds: 2, dmg: 1 });
        C.roundMsgs.push(a.name + ' is pricked — save vs poison!');
      }
    }
  }

  function doAttack(a, t) {
    if (!C || !a || !t || t.dead) return false;
    var wi = weaponInfo(a);
    if (wi.kind === 'ranged' && a.side === 'party') {
      if (ammoFor(ITEMS[a.char.equip.weapon]) <= 0) {
        C.roundMsgs.push('No ammunition!');
        finishPlayerTurn();
        return false;
      }
      useAmmo(a);
    }
    if (attackRoll(a, t)) {
      // use modules dice
      var d = M.dice(...diceParts(wi.dmg));
      if (a.side === 'party') {
        d += a.dmgBonus;
        // backstab
        if (a.char.cls === 'thief' && (t.ambushed || adjacentBehind(a, t))) {
          d *= RULES.BACKSTAB.mult;
          C.roundMsgs.push('Backstab!');
        }
        // flame/frost magic weapons
        var w = ITEMS[a.char.equip.weapon];
        if (w && w.fx && w.fx.fire) d += M.dice(1, 6);
        if (w && w.fx && w.fx.cold) d += M.dice(1, 6);
      } else {
        // monster specials
        var sp = a.sp;
        if (sp.poison && Math.random() < 0.5) {
          if (!saveRoll(t, 0)) { t.statuses.push({ name: 'poison', rounds: 2 + (sp.poison.lvl || 1), dmg: 1 }); C.roundMsgs.push(t.name + ' is poisoned!'); }
        }
        if (sp.paralyze && Math.random() < 0.4) {
          if (!saveRoll(t, 0)) { t.statuses.push({ name: 'paralyzed', rounds: 1 }); C.roundMsgs.push(t.name + ' is paralyzed!'); }
        }
        if (sp.constrict) { d += M.dice(1, 6); C.roundMsgs.push('Constrict!'); }
        if (sp.level_drain) { d += M.dice(1, 6) * sp.level_drain; C.roundMsgs.push('The touch drains vitality.'); }
      }
      d = Math.max(1, d);
      dealDamage(t, d, 'from ' + wi.name);
      // level drain kill: none beyond damage
    }
    // Only party turns self-advance here; monster turns advance via logMon()
    // in monAct (otherwise a double advanceToNext would skip turns).
    if (a.side === 'party') finishPlayerTurn();
    return true;
  }

  function diceParts(s) { var d = RULES.parseDice(s); return [d.sides || 6, d.n || 1, d.mod || 0]; }

  function adjacentBehind(a, t) {
    // simple backstab: target is not adjacent to the attacker's facing — approximate by target having just acted
    return !!t.acted && t.acted === true && Math.random() < 0.5;
  }

  function doDefend(a) {
    if (!C) return;
    a.defending = true;
    C.roundMsgs.push(a.name + ' defends.');
    finishPlayerTurn();
  }

  function doFlee(a) {
    if (!C) return;
    var dex = RULES.abilityMod(a.char.attrs.dex);
    var roll = M.d20();
    if (roll + dex >= 8) {
      C.roundMsgs.push(a.name + ' breaks away from the fight!');
      endCombat(false, true);
      return;
    }
    C.roundMsgs.push(a.name + ' fails to escape.');
    finishPlayerTurn();
  }

  function finishPlayerTurn() {
    if (!C) return;
    Campaign.log(C.roundMsgs.join(' '));
    C.roundMsgs = [];
    Game.dirty();
    later(advanceToNext, 160);
  }

  // auto-fight: attack the nearest foe, else close in, else defend
  function autoTurn(a) {
    if (!C || !a || a.dead || C.state !== 'player' || C.cur !== a) return;
    if (UI.isOpen()) { UI.close(); }
    var mons = aliveActors('mon');
    if (!mons.length) { C.cur = null; advanceToNext(); return; }
    var best = null, bd = 1e9;
    mons.forEach(function (m) {
      var d = Math.abs(m.x - a.x) + Math.abs(m.y - a.y);
      if (d < bd) { bd = d; best = m; }
    });
    var targets = attackTargets(a);
    if (targets.length) {
      targets.sort(function (x, y) {
        var dx = Math.abs(x.x - a.x) + Math.abs(x.y - a.y), dy = Math.abs(y.x - a.x) + Math.abs(y.y - a.y);
        return dx - dy;
      });
      if (doAttack(a, targets[0]) !== false) return;
    }
    var cells = reachableCells(a);
    var bx = a.x, by = a.y, bcost = bd;
    for (var k in cells) {
      var cx = +k % C.grid.w, cy = Math.floor(+k / C.grid.w);
      if (actorAt(cx, cy)) continue;
      var d = Math.abs(cx - best.x) + Math.abs(cy - best.y);
      if (d < bcost) { bcost = d; bx = cx; by = cy; }
    }
    if (bx !== a.x || by !== a.y) { doMove(a, bx, by); return; }
    doDefend(a);
  }

  /* ---------------- spells & items ---------------- */
  function castOptions(a) {
    var p = a.char;
    var who = p.cls === 'mage' ? 'wizard' : p.cls === 'cleric' ? 'priest' : null;
    if (!who) return [];
    var s = Campaign.sheet(p);
    var out = [];
    (p.known || []).forEach(function (sid) {
      var sp = RULES.SPELLS[who][sid];
      if (!sp) return;
      var lv = sp.lvl;
      var max = s.slots[lv] || 0;
      var used = p.casts[sid] || 0;
      if (used < max) out.push({ id: sid, sp: sp, lv: lv, max: max, used: used });
    });
    return out;
  }

  function castSpell(a, entry, target) {
    if (!C) return;
    var p = a.char, sp = entry.sp;
    var pts = { x: target ? target.x : a.x, y: target ? target.y : a.y };
    var eff = spellEffect(a, sp, target, pts);
    p.casts[entry.id] = (p.casts[entry.id] || 0) + 1;
    C.roundMsgs.push(a.name + ' casts ' + sp.n + '.' + (eff ? ' ' + eff : ''));
    finishPlayerTurn();
  }

  function spellEffect(a, sp, target, pts) {
    var p = a.char, lvl = p.level;
    function r() { return M.dice(...diceParts(sp.dmg || '1d6')) + (sp.perLvl ? (lvl - sp.lvl) : 0); }
    var cells = null;
    switch (sp.kind) {
      case 'missile': {
        var n = M.dice(...diceParts(sp.count || '1d3'));
        var total = 0;
        for (var i = 0; i < n; i++) total += M.dice(...diceParts(sp.dmg || '1d6+1'));
        if (target) dealDamage(target, total, sp.n + ' damage');
        return n + ' bolts strike for ' + total + '.';
      }
      case 'damage': {
        if (target) dealDamage(target, r(), sp.n + ' damage');
        return '';
      }
      case 'area': case 'line': case 'cone': {
        var rad = sp.area || 2;
        cells = shapeCells(sp.kind, a, pts, rad, sp.range || 6);
        var dmg = r();
        cells.forEach(function (c) {
          var occ = actorAt(c.x, c.y);
          if (occ && occ.side !== 'party') {
            var saved = sp.save === 0 ? false : saveRoll(occ, 1);
            var d = saved ? Math.ceil(dmg / 2) : dmg;
            dealDamage(occ, d, sp.n + ' damage');
          }
        });
        return '';
      }
      case 'cloud': {
        var rad2 = sp.area || 1;
        var cells2 = shapeCells('area', a, pts, rad2, 0);
        (C.clouds = C.clouds || []).push({ cells: cells2, rounds: 3, name: sp.n, owner: 'party' });
        return 'A cloud of ' + sp.n.toLowerCase() + ' hangs over the ground.';
      }
      case 'heal': {
        var t = target || a;
        var h = r();
        t.hp = Math.min(t.mhp, t.hp + h);
        if (t.side === 'party') t.char.hp = t.hp;
        return t.name + ' is healed for ' + h + '.';
      }
      case 'buff': {
        var t2 = target || a;
        var dur = 1 + M.dice(1, 6);
        var st = { name: sp.n, rounds: dur, acMod: -1 };
        if (/strength|heroism|power/i.test(sp.n)) st.strMod = 2;
        if (/swift|haste|speed/i.test(sp.n)) st.slow = false, st.haste = true;
        t2.statuses.push(st);
        return t2.name + ' feels the power of ' + sp.n.toLowerCase() + '.';
      }
      case 'debuff': {
        if (!target) return 'The spell fizzles.';
        var dur2 = 1 + M.dice(1, 6);
        var st2 = { name: sp.n, rounds: dur2, acMod: 1 };
        if (/slow|paraly/i.test(sp.n)) st2.slow = true;
        target.statuses.push(st2);
        return target.name + ' is struck by ' + sp.n.toLowerCase() + '.';
      }
      case 'utility': {
        if (sp.sub === 'detect') {
          C.detected = 10;
          return 'Lurking creatures shimmer into view on your map.';
        }
        if (sp.sub === 'light' || /light/i.test(sp.n)) {
          C.lit = true;
          return 'Light floods the dark.';
        }
        if (sp.sub === 'open' || /open|knock/i.test(sp.n)) {
          // open nearest locked door
          var f = floorState();
          if (f) {
            for (var k in C.grid && {}) {}
            for (var k2 in (f.doorsOpen ? [] : [])) {}
          }
          return 'Something clicks open in the dark.';
        }
        return '';
      }
      case 'wall': {
        var cells3 = shapeCells('line', a, pts, 1, 3);
        (C.walls = C.walls || []).push({ cells: cells3, rounds: 3 });
        return 'A wall of force rises.';
      }
      case 'summon': {
        var mids = ['giant_rat', 'wolf', 'goblin'];
        var mid = mids[M.dice(3, 1) - 1];
        var ally = monsterActor({ id: mid }, a.x, a.y);
        ally.side = 'party';
        ally.name = 'Summoned ' + ally.name;
        ally.hp = Math.ceil(ally.hp / 2);
        C.actors.push(ally);
        return 'A ' + mid.replace(/_/g, ' ') + ' appears to serve!';
      }
      default:
        return '';
    }
  }

  function shapeCells(kind, a, pts, rad, range) {
    var out = [];
    if (kind === 'area') {
      for (var dy = -rad; dy <= rad; dy++) for (var dx = -rad; dx <= rad; dx++) {
        if (Math.abs(dx) + Math.abs(dy) > rad + 1) continue;
        var x = pts.x + dx, y = pts.y + dy;
        if (x >= 0 && y >= 0 && x < C.grid.w && y < C.grid.h) out.push({ x: x, y: y });
      }
    } else if (kind === 'line') {
      var ang = Math.atan2(pts.y - a.y, pts.x - a.x);
      var n = Math.min(range, 6);
      for (var i = 1; i <= n; i++) {
        var x = Math.round(a.x + Math.cos(ang) * i), y = Math.round(a.y + Math.sin(ang) * i);
        if (x >= 0 && y >= 0 && x < C.grid.w && y < C.grid.h) out.push({ x: x, y: y });
      }
    } else if (kind === 'cone') {
      var ang2 = Math.atan2(pts.y - a.y, pts.x - a.x);
      for (var i2 = 1; i2 <= 3; i2++) {
        for (var off = -1; off <= 1; off++) {
          var an = ang2 + off * 0.5;
          var x2 = Math.round(a.x + Math.cos(an) * i2), y2 = Math.round(a.y + Math.sin(an) * i2);
          if (x2 >= 0 && y2 >= 0 && x2 < C.grid.w && y2 < C.grid.h) out.push({ x: x2, y: y2 });
        }
      }
    }
    // de-dupe
    var seen = {}, out2 = [];
    out.forEach(function (c) { var k = c.x + ',' + c.y; if (!seen[k]) { seen[k] = 1; out2.push(c); } });
    return out2;
  }

  function useItemAction(a, itemId, target) {
    var it = ITEMS[itemId];
    if (!it) return false;
    var p = a.char;
    var p2 = Campaign.partyItem(itemId) || a.char;
    if (it.c === 'potion') {
      Campaign.removeItem(p2, itemId);
      if (it.p && it.p.heal) {
        var t = target || a;
        var h = M.dice(...diceParts(it.p.heal));
        t.hp = Math.min(t.mhp, t.hp + h);
        if (t.side === 'party') t.char.hp = t.hp;
        C.roundMsgs.push(t.name + ' drinks and is healed for ' + h + '.');
      } else if (it.p && it.p.cure_poison) {
        (target || a).statuses = (target || a).statuses.filter(function (s) { return s.name !== 'poison'; });
        C.roundMsgs.push((target || a).name + ' is purged of poison.');
      } else if (it.p && it.p.restore_level) {
        C.roundMsgs.push((target || a).name + ' feels years fall away.');
      } else {
        C.roundMsgs.push(p.name + ' uses the ' + it.n.toLowerCase() + '.');
      }
    } else if (it.c === 'scroll') {
      var who = itemId.indexOf('sc_wizard_') === 0 ? 'wizard' : 'priest';
      var sid = itemId.slice(3 + who.length + 1);
      var sp = RULES.SPELLS[who][sid];
      if (sp) {
        Campaign.removeItem(p2, itemId);
        spellEffect(a, sp, target, target ? { x: target.x, y: target.y } : { x: a.x, y: a.y });
        C.roundMsgs.push(a.name + ' unrolls the scroll: ' + sp.n + '!');
      }
    } else {
      C.roundMsgs.push('Not usable in battle.');
      return false;
    }
    finishPlayerTurn();
    return true;
  }

  function doTurnUndead(a) {
    var p = a.char;
    var eff = RULES.effectiveTurnLevel(p.cls, p.level);
    if (eff <= 0) { C.roundMsgs.push(p.name + ' cannot turn undead yet.'); finishPlayerTurn(); return; }
    var hit = 0;
    C.actors.forEach(function (m) {
      if (m.side !== 'mon' || m.dead || !MONSTERS[m.monId].turn) return;
      var d = Math.max(Math.abs(m.x - a.x), Math.abs(m.y - a.y));
      if (d > 5) return;
      hit++;
      var roll = M.dice(1, 6) + eff;
      if (roll >= 9) {
        if (m.hdVal <= eff) { killActor(m); C.roundMsgs.push(m.name + ' bursts into dust!'); }
        else { m.dead = true; m.fled = true; C.roundMsgs.push(m.name + ' flees in terror!'); }
      } else {
        C.roundMsgs.push(m.name + ' resists the turning (rolled ' + roll + ').');
      }
    });
    if (!hit) C.roundMsgs.push(p.name + ' raises the sign — but no undead stand within reach.');
    Campaign.log(C.roundMsgs.join(' '));
    C.roundMsgs = [];
    Game.dirty();
    later(advanceToNext, 200);
  }

  /* ---------------- monster AI ---------------- */
  function monAct(m) {
    if (!C) return;
    if (m.dead || C.cur !== m) return;
    // morale: cowards may lose heart when hurt or losing allies
    if (!m.moraleDone && !m.turn && m.boss !== true && m.morale < 10) {
      var lostAlly = C.actors.some(function (o) { return o.side === 'mon' && o.dead && o !== m; });
      if (lostAlly || m.hp <= Math.floor(m.mhp * 0.35)) {
        m.moraleDone = true;
        if (M.dice(6) > m.morale) {
          m.dead = true; m.fled = true; m.hp = 0;
          C.roundMsgs.push(m.name + ' loses heart and flees into the darkness!');
          logMon();
          checkEnd();
          return;
        }
        C.roundMsgs.push(m.name + ' squares to the fight.');
      }
    }
    // regen
    if (m.sp.regen) { m.hp = Math.min(m.mhp, m.hp + m.sp.regen); }
    // paralyzed?
    var stunned = m.statuses.some(function (s) { return s.name === 'paralyzed'; });
    if (stunned) {
      C.roundMsgs.push(m.name + ' is paralyzed!');
      logMon();
      return;
    }
    var target = nearestParty(m);
    if (!target) { logMon(); return; }
    var d = Math.max(Math.abs(target.x - m.x), Math.abs(target.y - m.y));
    // breath weapon
    if (m.sp.breath && d <= (m.sp.breath.range || 3) && Math.random() < 0.5) {
      doBreath(m, target);
      logMon();
      return;
    }
    if (d === 1) {
      doAttack(m, target);
      logMon();
      return;
    }
    // move toward target (simple greedy with fallback)
    var step = bestStep(m, target);
    if (step && !actorAt(step[0], step[1])) { m.x = step[0]; m.y = step[1]; }
    else {
      // wander
      var opts = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(function (o) { return freeCell(C.grid, m.x + o[0], m.y + o[1], C.actors); });
      if (opts.length) { var o = opts[Math.floor(Math.random() * opts.length)]; m.x += o[0]; m.y += o[1]; }
    }
    logMon();
  }
  function logMon() {
    if (!C) return;
    Campaign.log(C.roundMsgs.join(' '));
    C.roundMsgs = [];
    Game.dirty();
    later(advanceToNext, 160);
  }

  function nearestParty(m) {
    var best = null, bd = 999;
    aliveActors('party').forEach(function (p) {
      var d = Math.abs(p.x - m.x) + Math.abs(p.y - m.y);
      if (d < bd) { bd = d; best = p; }
    });
    return best;
  }

  function bestStep(m, t) {
    // BFS from monster, stop at target; first step of path
    var grid = C.grid;
    var prev = {}, seen = {};
    var q = [[m.x, m.y]];
    seen[m.y * grid.w + m.x] = true;
    var found = false, guard = 400;
    while (q.length && !found && guard-- > 0) {
      var c = q.shift();
      for (var i = 0; i < 4; i++) {
        var nx = c[0] + [1, -1, 0, 0][i], ny = c[1] + [0, 0, 1, -1][i];
        if (nx < 0 || ny < 0 || nx >= grid.w || ny >= grid.h) continue;
        if (grid.solid[ny * grid.w + nx]) continue;
        var idx = ny * grid.w + nx;
        if (seen[idx]) continue;
        seen[idx] = true;
        prev[idx] = c;
        if (nx === t.x && ny === t.y) { found = true; break; }
        // monsters may step through party cells? no — but they can end adjacent
        if (!actorAt(nx, ny) || actorAt(nx, ny) === t) q.push([nx, ny]);
      }
    }
    if (!found) return null;
    // walk back to first step
    var cur = [t.x, t.y];
    while (prev[cur[1] * grid.w + cur[0]] && !(prev[cur[1] * grid.w + cur[0]][0] === m.x && prev[cur[1] * grid.w + cur[0]][1] === m.y)) {
      cur = prev[cur[1] * grid.w + cur[0]];
    }
    return prev[cur[1] * grid.w + cur[0]];
  }

  function doBreath(m, t) {
    var b = m.sp.breath;
    var cells = shapeCells('cone', m, { x: t.x, y: t.y }, 1, b.range || 3);
    C.roundMsgs.push(m.name + ' unleashes a ' + b.kind + ' breath!');
    cells.forEach(function (c) {
      var occ = actorAt(c.x, c.y);
      if (occ && occ.side === 'party') {
        var saved = saveRoll(occ, 1);
        var d = M.dice(...diceParts(b.dmg));
        if (saved) d = Math.ceil(d / 2);
        // fire weakness bonus
        if (b.kind === 'fire' && m.sp.fireWeak) d += 2;
        dealDamage(occ, d, b.kind + ' breath');
      }
    });
  }

  /* ---------------- end conditions ---------------- */
  function checkEnd() {
    var mons = aliveActors('mon').length;
    var parts = aliveActors('party').length;
    if (mons === 0) { endCombat(true); return true; }
    if (parts === 0) { endCombat(false); return true; }
    return false;
  }

  function endCombat(victory, fled) {
    var G = Campaign.G;
    // record bestiary (every creature met in battle)
    C.actors.forEach(function (a) { if (a.side === 'mon') Campaign.seenMonster(a.monId); });
    if (victory) {
      var xp = 0, gold = 0;
      C.actors.forEach(function (a) {
        if (a.side === 'mon' && a.dead && !a.fled) {
          xp += a.xp || 0;
          if (a.tr && a.tr !== '-' && Math.random() < 0.6) gold += M.dice(1, 6) * (1 + (a.hdVal || 1));
        }
      });
      if (xp > 0) Campaign.grantXp(xp, 'Victory against the ' + firstMonName());
      if (gold > 0) { G.gold += gold; Campaign.log('The spoils hold ' + M.fmtGold(gold) + '.'); }
      if (C.kind === 'dungeon') {
        var f = floorState();
        C.actors.forEach(function (a) {
          if (a.side === 'mon' && a.dead) f.killed.push(a.monId + ':' + a.x + ',' + a.y);
        });
        // mark boss dead
        var adv = ADV.get(C.adv);
        if (adv.floors[C.floor] && adv.floors[C.floor].boss) {
          var boss = adv.floors[C.floor].boss;
          var bossDead = C.actors.some(function (a) { return a.side === 'mon' && a.dead && a.x === boss.x && a.y === boss.y; });
          if (bossDead) {
            f.bossDead = 1;
            Campaign.completeQuest(C.adv, adv.mainQuest);
          }
        }
      } else if (C.lair) {
        var w = Campaign.advWorld(C.adv);
        w.wilds.lairCleared = 1;
        Campaign.log('The lair is cleared.');
      }
    }
    if (!victory && !fled) {
      // defeat: wake in town, half gold
      G.gold = Math.floor(G.gold / 2);
      G.party.forEach(function (p) { p.dead = 0; p.hp = 1; });
      Campaign.log('Defeat. The company is carried back to ' + ADV.get(C.adv).townName + ', half its gold gone.');
      returnToTown();
    } else if (fled) {
      Campaign.log('The company slips away from the fight.');
      restoreScene();
    } else {
      Campaign.autosave();
      restoreScene();
    }
    clearTimers();
    C = null;
    Game.dirty();
  }

  function restoreScene() {
    var G = Campaign.G;
    if (C.kind === 'dungeon') {
      var surv = null;
      C.actors.forEach(function (a) { if (a.side === 'party' && !a.dead && !surv) surv = a; });
      var loc = surv ? { x: surv.x, y: surv.y } : (G._combatLoc || { x: 2, y: 2 });
      Dungeon.enter(C.adv, C.floor, loc);
    } else {
      var w = Campaign.advWorld(C.adv);
      if (G._combatLoc) { w.wilds.x = G._combatLoc.x; w.wilds.y = G._combatLoc.y; }
      Overland.enter(C.adv);
    }
  }
  function returnToTown() {
    var a = ADV.get(C ? C.adv : Campaign.G.activeAdv);
    var w = Campaign.advWorld(a.id);
    var site = a.wilds.sites.find(function (s) { return s.kind === 'town'; });
    w.wilds.x = site.x; w.wilds.y = site.y;
    Overland.enter(a.id);
  }

  /* ---------------- API ---------------- */

  /* ---------------- rendering (2D tactical) ---------------- */
  var layout = null;
  function render(cv) {
    if (!C) return;
    var g = cv.getContext('2d');
    var grid = C.grid;
    // ---- isometric layout (2:1 diamonds) ----
    var tw = Math.min(56, Math.max(14, Math.floor(Math.min(2 * cv.width / (grid.w + grid.h + 1), 4 * (cv.height - 70) / (grid.w + grid.h + 1)))));
    var th = tw / 2;
    var totalW = (grid.w + grid.h - 2) * (tw / 2) + tw;
    var totalH = (grid.w + grid.h - 2) * (th / 2) + th + Math.max(4, th * 0.45);
    var ox = Math.floor(cv.width / 2);
    var oy = Math.floor((cv.height - 40 - totalH) / 2) + 26;
    layout = { ox: ox, oy: oy, tw: tw, th: th, iso: true };
    var ex = Math.max(4, th * 0.45);

    function cellXY(x, y) { return { sx: ox + (x - y) * (tw / 2), sy: oy + (x + y) * (th / 2) }; }
    function diaPath(sx, sy) {
      g.beginPath();
      g.moveTo(sx, sy);
      g.lineTo(sx + tw / 2, sy + th / 2);
      g.lineTo(sx, sy + th);
      g.lineTo(sx - tw / 2, sy + th / 2);
      g.closePath();
    }

    g.fillStyle = grid.kind === 'dungeon' ? '#141210' : '#101608';
    g.fillRect(0, 0, cv.width, cv.height);

    // draw cells sorted by (x+y) so nearer tiles paint over farther ones
    var cells = [];
    for (var y = 0; y < grid.h; y++) for (var x = 0; x < grid.w; x++) cells.push([x, y]);
    cells.sort(function (a, b) { return (a[0] + a[1]) - (b[0] + b[1]); });
    cells.forEach(function (cc) {
      var x = cc[0], y = cc[1], idx = y * grid.w + x;
      var p = cellXY(x, y);
      if (grid.solid[idx]) {
        // top face
        diaPath(p.sx, p.sy);
        g.fillStyle = grid.kind === 'dungeon' ? '#4a443c' : '#4a5a34';
        g.fill();
        // left face
        g.beginPath();
        g.moveTo(p.sx - tw / 2, p.sy + th / 2);
        g.lineTo(p.sx, p.sy + th);
        g.lineTo(p.sx, p.sy + th + ex);
        g.lineTo(p.sx - tw / 2, p.sy + th / 2 + ex);
        g.closePath();
        g.fillStyle = grid.kind === 'dungeon' ? '#2c2822' : '#303c20';
        g.fill();
        // right face
        g.beginPath();
        g.moveTo(p.sx + tw / 2, p.sy + th / 2);
        g.lineTo(p.sx, p.sy + th);
        g.lineTo(p.sx, p.sy + th + ex);
        g.lineTo(p.sx + tw / 2, p.sy + th / 2 + ex);
        g.closePath();
        g.fillStyle = grid.kind === 'dungeon' ? '#38332c' : '#3c4a28';
        g.fill();
      } else {
        diaPath(p.sx, p.sy);
        g.fillStyle = grid.kind === 'dungeon' ? '#26221a' : '#2e3d22';
        g.fill();
        if ((x * 7 + y * 13) % 3 === 0) { g.fillStyle = 'rgba(255,255,255,0.04)'; g.fill(); }
        g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 1; g.stroke();
      }
    });
    // walls of force
    (C.walls || []).forEach(function (w) {
      w.cells.forEach(function (c) {
        var p2 = cellXY(c.x, c.y); diaPath(p2.sx, p2.sy);
        g.fillStyle = 'rgba(90,180,220,0.5)'; g.fill();
      });
    });
    // clouds
    (C.clouds || []).forEach(function (cl) {
      cl.cells.forEach(function (c) {
        var p3 = cellXY(c.x, c.y); diaPath(p3.sx, p3.sy);
        g.fillStyle = 'rgba(150,80,160,0.45)'; g.fill();
      });
    });
    // highlights
    (C.highlights || []).forEach(function (hl) {
      var p4 = cellXY(hl.x, hl.y); diaPath(p4.sx, p4.sy);
      if (hl.kind === 'move') { g.fillStyle = 'rgba(80,140,220,0.4)'; g.fill(); }
      else if (hl.kind === 'target') { g.strokeStyle = '#e04040'; g.lineWidth = 3; g.stroke(); }
      else if (hl.kind === 'point') { g.fillStyle = 'rgba(240,200,80,0.45)'; g.fill(); }
    });
    // actors (painter's order)
    var alive = C.actors.filter(function (a) { return !a.dead; });
    alive.sort(function (a, b) { return (a.x + a.y) - (b.x + b.y); });
    alive.forEach(function (a) {
      var p5 = cellXY(a.x, a.y);
      var cx = p5.sx, cy = p5.sy + th / 2; // diamond centre
      var img = a.side === 'mon' ? Fig.monster(a.monId) : (a.char ? Fig.figure(a.char.race, a.char.cls) : Fig.monster('giant_rat'));
      var sc = (ts2()) / 32;
      var wpx = 32 * sc, hpx = 44 * sc;
      // shadow
      g.fillStyle = 'rgba(0,0,0,0.35)';
      g.beginPath(); g.ellipse(cx, cy + hpx * 0.42, wpx * 0.32, hpx * 0.12, 0, 0, Math.PI * 2); g.fill();
      g.globalAlpha = 0.97;
      g.drawImage(img, cx - wpx / 2, cy - hpx / 2, wpx, hpx);
      g.globalAlpha = 1;
      // hp bar
      var bw = wpx * 0.9;
      g.fillStyle = a.side === 'mon' ? '#401010' : '#103010';
      g.fillRect(cx - bw / 2, cy - hpx / 2 - 7, bw, 4);
      g.fillStyle = a.side === 'mon' ? '#d04040' : '#40c060';
      g.fillRect(cx - bw / 2, cy - hpx / 2 - 7, bw * Math.max(0, a.hp) / a.mhp, 4);
      if (C.cur === a && C.state === 'player') {
        diaPath(p5.sx, p5.sy);
        g.strokeStyle = '#ffd860'; g.lineWidth = 2; g.stroke();
      }
    });
    function ts2() { return tw; }
    // header
    g.fillStyle = 'rgba(10,8,6,0.8)';
    g.fillRect(0, 0, cv.width, 30);
    g.fillStyle = '#e8d8b0';
    g.font = '13px Georgia, serif';
    var curName = C.cur ? C.cur.name : '';
    g.fillText('Round ' + C.round + ' — ' + (C.state === 'player' ? curName + ' (your move)' : 'enemy move…'), 8, 19);
    // messages
    var msgs = C.roundMsgs.slice(-2);
    g.fillStyle = 'rgba(10,8,6,0.8)';
    g.fillRect(0, cv.height - 34, cv.width, 34);
    g.fillStyle = '#c8b890';
    msgs.forEach(function (m, i) { g.fillText(m.slice(0, 70), 8, cv.height - 20 + i * 14); });
  }

  // tap a cell in combat (move / attack / spell target)
  function tap(px, py) {
    if (!C || C.state !== 'player' || C.mode === 'menu') return false;
    if (!layout || !layout.iso) return false;
    var a = (px - layout.ox) / (layout.tw / 2);
    var b = (py - layout.oy) / (layout.th / 2);
    var x = Math.round((a + b) / 2);
    var y = Math.round((b - a) / 2);
    if (x < 0 || y < 0 || x >= C.grid.w || y >= C.grid.h) return false;
    if (C.mode === 'move') {
      var cells = reachableCells(C.cur);
      if (cells[y * C.grid.w + x] != null) { doMove(C.cur, x, y); return true; }
      return false;
    }
    if (C.mode === 'attack') {
      var t = actorAt(x, y);
      if (t && t.side !== 'party' && attackTargets(C.cur).indexOf(t) >= 0) { doAttack(C.cur, t); return true; }
      return false;
    }
    if (C.mode === 'cast') {
      var tgt = C.castTarget;
      if (tgt === 'none') { castSpell(C.cur, C.castEntry, null); return true; }
      if (tgt === 'ally' || tgt === 'point') {
        var a2 = actorAt(x, y);
        if (tgt === 'ally' && (!a2 || a2.side !== 'party')) return false;
        castSpell(C.cur, C.castEntry, a2 || null);
        return true;
      }
      var a3 = actorAt(x, y);
      if (a3 && a3.side === 'mon') { castSpell(C.cur, C.castEntry, a3); return true; }
      return false;
    }
    return false;
  }

  // mode helpers used by UI
  function enterMoveMode() {
    if (C.state !== 'player') return;
    C.mode = 'move';
    var cells = reachableCells(C.cur);
    C.highlights = Object.keys(cells).map(function (k) { return { x: k % C.grid.w, y: Math.floor(k / C.grid.w), kind: 'move' }; });
    UI.setBar([
      { id: 'combat.menu', label: 'Menu' },
      { id: 'combat.endmove', label: 'Wait' }
    ]);
    Game.dirty();
  }
  function enterAttackMode() {
    if (C.state !== 'player') return;
    C.mode = 'attack';
    C.highlights = attackTargets(C.cur).map(function (t) { return { x: t.x, y: t.y, kind: 'target' }; });
    UI.setBar([
      { id: 'combat.menu', label: 'Menu' },
      { id: 'combat.attackfire', label: 'Fire' }
    ]);
    Game.dirty();
  }
  function spellTargetKind(sp) {
    if (sp.kind === 'heal' || sp.kind === 'buff') return 'ally';
    if (sp.kind === 'missile' || sp.kind === 'damage' || sp.kind === 'debuff' || sp.kind === 'line' || sp.kind === 'cone') return 'enemy';
    if (sp.kind === 'area' || sp.kind === 'cloud' || sp.kind === 'wall') return 'point';
    return 'none';
  }
  function enterCastMode(entry) {
    C.mode = 'cast';
    C.castEntry = entry;
    C.castTarget = spellTargetKind(entry.sp);
    C.highlights = [];
    if (C.castTarget === 'enemy') C.highlights = attackTargets(C.cur).map(function (t) { return { x: t.x, y: t.y, kind: 'target' }; });
    if (C.castTarget === 'point') {
      for (var y = 1; y < C.grid.h - 1; y++) for (var x = 1; x < C.grid.w - 1; x++) {
        if (!C.grid.solid[y * C.grid.w + x]) C.highlights.push({ x: x, y: y, kind: 'point' });
      }
    }
    UI.setBar([
      { id: 'combat.cancelcast', label: 'Cancel' },
      { id: 'combat.selfcast', label: 'On Self' }
    ]);
    Game.dirty();
  }
  function combatMenu() {
    if (C.state !== 'player') return;
    C.mode = 'menu';
    C.highlights = [];
    var a = C.cur;
    var btns = [];
    btns.push({ id: 'combat.move', label: 'Move' });
    btns.push({ id: 'combat.attack', label: 'Attack' });
    btns.push({ id: 'combat.defend', label: 'Defend' });
    var opts = castOptions(a);
    if (opts.length) btns.push({ id: 'combat.cast', label: 'Cast' });
    if (a.char.cls === 'cleric' || a.char.cls === 'paladin') btns.push({ id: 'combat.turn', label: 'Turn' });
    btns.push({ id: 'combat.item', label: 'Item' });
    btns.push({ id: 'combat.flee', label: 'Flee' });
    btns.push({ id: 'combat.auto', label: C.auto ? 'Auto:On' : 'Auto', primary: C.auto });
    UI.setBar(btns);
    Game.dirty();
  }
  function toggleAuto() {
    if (!C || C.state !== 'player') return C.auto;
    C.auto = !C.auto;
    if (C.auto && C.cur) later(function () { autoTurn(C.cur); }, 260);
    combatMenu();
    return C.auto;
  }

  function combatCastPanel() {
    var a = C.cur;
    var opts = castOptions(a);
    var h = '<div class="panel spells"><div class="panel-h">Cast a Spell</div>';
    opts.forEach(function (o2, i) {
      h += '<button class="btn spell-row" data-act="combat.castpick" data-i="' + i + '"><b>' + o2.sp.n + '</b> <span class="dim">L' + o2.lv + ' · ' + o2.used + '/' + o2.max + '</span><span class="dim-sm">' + UI.esc(o2.sp.text) + '</span></button>';
    });
    if (!opts.length) h += '<div class="dim">No spells remain until dawn.</div>';
    h += '<div class="sheet-actions"><button class="btn" data-act="combat.menu">Back</button></div></div>';
    UI.open(h, 'spell-open');
    C._castOpts = opts;
  }
  function combatItemPanel() {
    var a = C.cur;
    var Gg = Campaign.G;
    var h = '<div class="panel spells"><div class="panel-h">Use an Item</div>';
    var any = false;
    Gg.party.forEach(function (p) {
      p.items.forEach(function (e) {
        var it = ADV.itemOf(e.id);
        if (!it || !usableInCombat(it)) return;
        any = true;
        h += '<button class="btn spell-row" data-act="combat.itempick" data-id="' + e.id + '"><b>' + it.n + '</b><span class="dim-sm">' + (it.desc || '') + '</span></button>';
      });
    });
    if (!any) h += '<div class="dim">Nothing usable.</div>';
    h += '<div class="sheet-actions"><button class="btn" data-act="combat.menu">Back</button></div></div>';
    UI.open(h, 'spell-open');
  }
  function usableInCombat(it) {
    if (it.c === 'potion' || it.c === 'scroll') return true;
    if (it.c === 'wand' && it.wd && it.wd.fx) return true;
    return false;
  }

  return {
    start: start, get C() { return C; }, current: current,
    reachableCells: reachableCells, attackTargets: attackTargets,
    doMove: doMove, doAttack: doAttack, doDefend: doDefend, doFlee: doFlee,
    castOptions: castOptions, castSpell: castSpell, useItemAction: useItemAction,
    doTurnUndead: doTurnUndead, actorAt: actorAt, los: los,
    render: render, tap: tap, endCombat: endCombat,
    enterMoveMode: enterMoveMode, enterAttackMode: enterAttackMode,
    enterCastMode: enterCastMode, combatMenu: combatMenu, toggleAuto: toggleAuto,
    combatCastPanel: combatCastPanel, combatItemPanel: combatItemPanel,
    spellTargetKind: spellTargetKind,
    _combat: function () { return C; }
  };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = { Combat: Combat };
