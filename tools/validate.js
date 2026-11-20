/* ============================================================
   EMBERFALL — tools/validate.js
   Checks the game against the prompt.md requirements:
     - rule tables (abilities, races, classes, alignments,
       THAC0, saves, XP to 20, movement, turning)
     - spell list sizes (wizard 75, priest 61)
     - item count >= 290, monster count >= 320
     - adventures: >= 50 total, >= 4 authored; each has town,
       wilderness, dungeon; floors have 2-3 traps, secret doors
       with loot alcoves, reachable treasure & stairs, boss on
       the last floor
     - reachability BFS on every town and dungeon floor
     - index.html loads scripts in the required order and has
       no external assets
   Run: node tools/validate.js
   ============================================================ */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

// load game files into a shared vm context in page order (simulates <script> tags)
const vm = require('vm');
let GAME = null;
function loadGame(files) {
  const list = files || ['js/rules.js', 'js/data.js', 'js/modules.js', 'js/monsters.js', 'js/wilds.js', 'js/treasure.js', 'js/adventures.js', 'js/figures.js', 'js/view3d.js', 'js/ui.js', 'js/combat.js', 'js/overland.js', 'js/campaign.js', 'js/journal.js', 'js/map.js', 'js/bestiary.js', 'js/navpad.js', 'js/watch.js', 'js/game.js'];
  const ctx = { console, Math, Date, JSON, setTimeout: (fn) => 0, clearTimeout: () => {}, setInterval: () => 0, clearInterval: () => {}, requestAnimationFrame: (fn) => 0, cancelAnimationFrame: () => {}, devicePixelRatio: 1, performance: { now: () => Date.now() }, addEventListener: () => {}, alert: () => {} };
  const fakeCtx = new Proxy({}, { get: (t, k) => (k === 'measureText' ? () => ({ width: 0 }) : () => ({})), set: () => true });
  const fakeEl = () => ({ style: {}, dataset: {}, classList: { add() {}, remove() {}, contains: () => false }, setAttribute() {}, addEventListener() {}, appendChild() {}, removeChild() {}, children: [], getContext: () => fakeCtx, width: 800, height: 450, querySelector: () => null, querySelectorAll: () => [] });
  ctx.document = { createElement: fakeEl, createTextNode: () => ({}), getElementById: () => fakeEl(), querySelector: () => fakeEl(), querySelectorAll: () => [], addEventListener: () => {}, body: fakeEl() };
  ctx.window = ctx;
  ctx.localStorage = { _s: {}, getItem(k) { return this._s[k] || null; }, setItem(k, v) { this._s[k] = String(v); }, removeItem(k) { delete this._s[k]; }, get length() { return Object.keys(this._s).length; }, key(i) { return Object.keys(this._s)[i]; } };
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  for (const f of list) {
    const code = fs.readFileSync(path.join(ROOT, f), 'utf8');
    vm.runInContext(code, ctx, { filename: f });
  }
  GAME = ctx;
  return ctx;
}

let pass = 0, fail = 0, warns = 0;
function ok(cond, msg) {
  if (cond) { pass++; } else { fail++; console.log('  FAIL: ' + msg); }
}
function warn(cond, msg) {
  if (!cond) { warns++; console.log('  WARN: ' + msg); }
}

function checkRules() {
  console.log('\n== rules ==');
  const R = GAME.RULES;
  ok(R.ABILITY_KEYS.length === 6, 'six ability scores');
  ok(Object.keys(R.RACES).length === 6, 'six races');
  ok(Object.keys(R.CLASSES).length === 6, 'six classes');
  ok(R.ALIGNMENTS.length === 9, 'nine alignments');
  // XP tables to level 20
  for (const c of Object.keys(R.CLASSES)) {
    const t = R.XP[c];
    ok(t && t.length >= 20, 'class ' + c + ' xp table to level 20 (' + (t ? t.length : 0) + ')');
  }
  // THAC0 to 20 (fighter 19 -> 1)
  ok(R.THAC0 && R.THAC0.fighter && R.THAC0.fighter.length >= 20, 'THAC0 tables to level 20');
  ok(R.THAC0.fighter[0] === 19 && R.THAC0.fighter[19] === 1, 'fighter THAC0 19 -> 1 (descending AC system)');
  // five save categories
  ok(R.SAVE_NAMES.length === 5, 'five saving throw categories');
  // prime requisites
  const primes = Object.values(R.CLASSES).filter(c => c.prime).length;
  ok(primes === 6, 'prime requisites defined for all classes');
  // race/class limits
  let hasLimits = false;
  for (const r of Object.keys(R.RACES)) {
    const lim = R.RACES[r].classes;
    if (lim && Object.values(lim).some(v => v < 20)) hasLimits = true;
  }
  ok(hasLimits, 'race/class level limits present');
  // demi-human movement ~15% slower
  const h = R.RACES.human.move, e = R.RACES.elf.move, dw = R.RACES.dwarf.move;
  ok(Math.abs((h - e) / h - 0.15) < 0.05, 'elf moves ~15% slower than human (' + e + ' vs ' + h + ')');
  ok(Math.abs((h - dw) / h - 0.15) < 0.05, 'dwarf moves ~15% slower than human');
  ok(R.SPEC_BONUS != null, 'weapon specialization bonus defined');
  ok(typeof R.effectiveTurnLevel === 'function', 'undead turning rules defined');
  // paladin turns 2 levels below cleric
  ok(R.effectiveTurnLevel('paladin', 10) === 8 && R.effectiveTurnLevel('cleric', 10) === 10, 'paladin turns as cleric -2');
  ok(R.TRAIN_COST === 100, 'training cost 100 gp per level');
  ok(R.THIEF_SKILLS && R.THIEF_SKILLS.length >= 5, 'thief skills defined (' + R.THIEF_SKILLS.length + ')');
  ok(R.BACKSTAB != null, 'backstab defined');
  ok(R.classAllowsAlign('paladin', 'lg') && !R.classAllowsAlign('paladin', 'ce'), 'paladin alignment restriction');
  // thief skill chance improves with level
  ok(R.thiefChance('find_traps', 10) > R.thiefChance('find_traps', 1), 'thief skills improve with level');
}

function checkSpells() {
  console.log('\n== spells ==');
  const R = GAME.RULES;
  const wiz = Object.keys(R.SPELLS.wizard).length;
  const pri = Object.keys(R.SPELLS.priest).length;
  ok(wiz >= 75, 'wizard spell count >= 75 (got ' + wiz + ')');
  ok(pri >= 61, 'priest spell count >= 61 (got ' + pri + ')');
  // every scroll item references a real spell
  let bad = 0;
  for (const id in GAME.ITEMS) {
    if (id.indexOf('sc_') === 0) {
      const who = id.indexOf('sc_wizard_') === 0 ? 'wizard' : 'priest';
      const sid = id.slice(3 + who.length + 1);
      if (!R.SPELLS[who][sid]) bad++;
    }
  }
  ok(bad === 0, 'all ' + Object.keys(GAME.ITEMS).filter(k => k.indexOf('sc_') === 0).length + ' scrolls reference real spells (' + bad + ' bad)');
}

function checkItemsMonsters() {
  console.log('\n== items & monsters ==');
  const nItems = Object.keys(GAME.ITEMS).length;
  ok(nItems >= 290, 'item count >= 290 (got ' + nItems + ')');
  const nMons = GAME.MONSTER_LIST.length;
  ok(nMons >= 320, 'monster count >= 320 (got ' + nMons + ')');
  // monster stat sanity
  let badM = GAME.MONSTER_LIST.filter(m => !m.hp || m.hp <= 0 || !m.ac || !m.dmg || !m.atk.length || !m.desc || !m.xp).length;
  ok(badM === 0, 'all monsters complete (' + badM + ' incomplete)');
  // treasure rolls produce real items
  const str = new GAME.Streams('val');
  let badT = 0;
  for (let i = 0; i < 40; i++) {
    const t = GAME.TREASURE.rollTreasure(str.rng('t' + i), GAME.M.pick(['a','b','c','d','e','f','g','h']), 1 + Math.floor(Math.random() * 20));
    t.items.forEach(it => { if (it.id !== '_gold' && !GAME.ITEMS[it.id]) badT++; });
  }
  ok(badT === 0, 'treasure rolls produce real items (' + badT + ' bad)');
}

// ---------- reachability ----------
function reachable(f, openDoors) {
  // openDoors: predicate idx -> true if door at idx is passable
  const seen = {};
  const q = [[f.start.x, f.start.y]];
  seen[f.start.y * f.w + f.start.x] = 1;
  while (q.length) {
    const [x, y] = q.shift();
    for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= f.w || ny >= f.h) continue;
      const idx = ny * f.w + nx;
      if (seen[idx]) continue;
      if (f.solid[idx]) {
        const d = f.doors[idx];
        if (d && openDoors(d, idx)) { seen[idx] = 1; q.push([nx, ny]); }
        continue;
      }
      seen[idx] = 1;
      q.push([nx, ny]);
    }
  }
  return seen;
}

function floorReachable(advId, f, fIdx) {
  const problems = [];
  // pass 1: no locked doors; find reachable keys
  let seen1 = reachable(f, (d) => d.kind === 'secret');
  const keysReachable = {};
  for (const k in f.keys) if (seen1[+k]) keysReachable[f.keys[k].itemId] = 1;
  // pass 2: locked doors whose key is reachable
  const seen = reachable(f, (d) => d.kind === 'secret' || (d.kind === 'locked' && keysReachable[d.key]));
  // goals
  function goal(x, y, label) {
    const idx = y * f.w + x;
    if (!seen[idx]) problems.push(label + ' not reachable at ' + x + ',' + y);
  }
  goal(f.up.x, f.up.y, 'stairs up');
  goal(f.down.x, f.down.y, 'stairs down');
  if (f.boss) goal(f.boss.x, f.boss.y, 'boss');
  for (const k in f.loot) goal(k % f.w, Math.floor(k / f.w), 'loot');
  for (const k in f.gold) goal(k % f.w, Math.floor(k / f.w), 'gold');
  for (const k in f.keys) goal(k % f.w, Math.floor(k / f.w), 'key');
  if (f.shrine >= 0) goal(f.shrine % f.w, Math.floor(f.shrine / f.w), 'shrine');
  // traps: 2-3 per floor
  const nTraps = Object.keys(f.traps).length;
  if (nTraps < 2 || nTraps > 3) problems.push('trap count ' + nTraps + ' (want 2-3)');
  // secret doors have loot alcove: check loot within 3 cells of the pocket side
  for (const k in f.doors) {
    const d = f.doors[k];
    if (d.kind !== 'secret') continue;
    const x = k % f.w, y = Math.floor(k / f.w);
    let foundLoot = false;
    outer:
    for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) {
      const lx = x + dx, ly = y + dy;
      if (lx < 0 || ly < 0 || lx >= f.w || ly >= f.h) continue;
      const li = ly * f.w + lx;
      if (f.loot[li] || f.gold[li]) { foundLoot = true; break outer; }
    }
    if (!foundLoot) problems.push('secret door with no nearby loot');
  }
  // mobs on floor cells
  f.mobs.forEach(m => { if (f.solid[m.y * f.w + m.x]) problems.push('mob in wall ' + m.id); });
  // monsters present
  if (!f.mobs.length && !f.boss) problems.push('no monsters on floor');
  return problems;
}

function townReachable(a) {
  const problems = [];
  const t = a.town;
  const seen = {};
  const q = [[t.gate.x, t.gate.y]];
  seen[t.gate.y * t.w + t.gate.x] = 1;
  while (q.length) {
    const [x, y] = q.shift();
    for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= t.w || ny >= t.h) continue;
      const idx = ny * t.w + nx;
      if (seen[idx]) continue;
      if (t.solid[idx]) {
        const d = t.doors[idx];
        if (d) { seen[idx] = 1; q.push([nx, ny]); }
        continue;
      }
      seen[idx] = 1;
      q.push([nx, ny]);
    }
  }
  // building doors reachable
  for (const k in t.doors) {
    if (!seen[+k]) problems.push('building door unreachable at ' + (k % t.w) + ',' + Math.floor(k / t.w));
  }
  // npcs reachable (they stand inside buildings: check the building door instead)
  for (const bld in t.buildingsById) {
    const b = t.buildingsById[bld];
    const dxy = (b.y + b.h - 1) * t.w + (b.x + (b.w >> 1));
    if (!seen[dxy]) problems.push('building ' + b.id + ' door unreachable');
  }
  return problems;
}

function checkAdventures() {
  console.log('\n== adventures ==');
  const A = GAME.ADV;
  const total = A.ORDER.length;
  const authored = A.ORDER.filter(id => id.indexOf('E') === 0).length;
  ok(total >= 50, 'adventure count >= 50 (got ' + total + ')');
  ok(authored >= 4, 'authored adventures >= 4 (got ' + authored + ')');
  // level bands covered
  const bands = {};
  A.ORDER.forEach(id => { bands[A.get(id).band] = (bands[A.get(id).band] || 0) + 1; });
  for (let b = 1; b <= 5; b++) ok(bands[b], 'level band ' + b + ' has adventures (' + (bands[b] || 0) + ')');
  let allProblems = 0;
  A.ORDER.forEach(id => {
    const a = A.get(id);
    const probs = [];
    // town
    probs.push.apply(probs, townReachable(a).map(p => 'town: ' + p));
    // wilderness sites present
    const kinds = {};
    a.wilds.sites.forEach(s => { kinds[s.kind] = 1; });
    ['town','dungeon','hamlet','healer','holy','lair','camp'].forEach(k => {
      if (!kinds[k]) probs.push('wilds: missing site ' + k);
    });
    // dungeon
    if (a.floors.length < 2) probs.push('dungeon: fewer than 2 floors');
    a.floors.forEach((f, fi) => {
      floorReachable(id, f, fi).forEach(p => probs.push('floor' + (fi + 1) + ': ' + p));
    });
    // boss on last floor
    const last = a.floors[a.floors.length - 1];
    if (!last.boss) probs.push('no boss on last floor');
    // treasure on floors
    let hasGold = false, hasItem = false;
    a.floors.forEach(f => {
      if (Object.keys(f.gold).length) hasGold = true;
      if (Object.keys(f.loot).length) hasItem = true;
    });
    if (!hasGold) probs.push('no gold in dungeon');
    if (!hasItem) probs.push('no items in dungeon');
    if (probs.length) { allProblems++; console.log('  ' + id + ': ' + probs.join(' | ')); }
  });
  ok(allProblems === 0, 'all adventures pass town/floor checks (' + allProblems + ' with problems)');
}

function checkIndex() {
  console.log('\n== index.html ==');
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const order = ['rules','data','modules','monsters','wilds','treasure','adventures','figures','view3d','ui','combat','overland','campaign','journal','map','bestiary','navpad','watch','game'];
  let last = -1, seq = [];
  for (const name of order) {
    const m = html.match(new RegExp('js/' + name + '\\.js'));
    if (!m) { console.log('  WARN: missing script js/' + name + '.js'); warns++; continue; }
    seq.push(name);
  }
  // verify relative order of the ones present
  const idx = {};
  order.forEach(n => { const m = html.indexOf('js/' + n + '.js'); if (m >= 0) idx[n] = m; });
  let ordered = true;
  for (let i = 1; i < seq.length; i++) {
    if (idx[seq[i]] < idx[seq[i - 1]]) ordered = false;
  }
  ok(ordered, 'scripts in required relative order');
  ok(!/src=["'][^"']*https?:/.test(html), 'no external http(s) asset src');
  ok(!/fetch\s*\(/.test(html), 'no fetch()');
  const css = html.match(/href="([^"]+\.css)"/);
  ok(!!css && !/^https?:/.test(css[1]), 'relative stylesheet link');
}

function checkNoExternalAssets() {
  console.log('\n== no external assets ==');
  const files = fs.readdirSync(path.join(ROOT, 'js')).filter(f => f.endsWith('.js'));
  let bad = 0;
  for (const f of files) {
    const s = fs.readFileSync(path.join(ROOT, 'js', f), 'utf8');
    if (/new Image\(\)/.test(s) || /\.mp3/.test(s) || /\.ogg/.test(s) || /audio/i.test(s)) {
      // image generation is allowed; only flag audio
      if (/new Audio|\.mp3|\.ogg/.test(s)) { bad++; console.log('  FAIL: ' + f + ' references audio'); }
    }
    if (/require\(['"]\.\//.test(s)) { bad++; console.log('  FAIL: ' + f + ' has relative require'); }
  }
  ok(bad === 0, 'no audio/relative-require in game files');
}

function checkModules() {
  console.log('\n== modules (all 19 scripts) ==');
  const need = ['RULES', 'ITEMS', 'MONSTERS', 'MONSTER_LIST', 'M', 'Streams', 'Toast', 'SaveSys', 'WILDS', 'TREASURE', 'ADV', 'Fig', 'View3D', 'View', 'UI', 'Shop', 'Combat', 'Overland', 'Campaign', 'Journal', 'MapView', 'Bestiary', 'NavPad', 'Watch', 'Game'];
  need.forEach((n) => ok(typeof GAME[n] !== 'undefined', 'global ' + n + ' defined'));
  // every static data-act emitted somewhere must be routed by game.js (or be dlg.*/combat.*)
  const files = ['js/rules.js', 'js/data.js', 'js/modules.js', 'js/monsters.js', 'js/wilds.js', 'js/treasure.js', 'js/adventures.js', 'js/figures.js', 'js/view3d.js', 'js/ui.js', 'js/combat.js', 'js/overland.js', 'js/campaign.js', 'js/journal.js', 'js/map.js', 'js/bestiary.js', 'js/navpad.js', 'js/watch.js', 'js/game.js'];
  const acts = new Set();
  files.forEach((f) => {
    const code = fs.readFileSync(path.join(ROOT, f), 'utf8');
    let m;
    const re = /data-act="([a-z0-9.]+)"/gi;
    while ((m = re.exec(code))) acts.add(m[1]);
  });
  const gameCode = fs.readFileSync(path.join(ROOT, 'js/game.js'), 'utf8');
  const cases = new Set();
  const cre = /case '([a-z0-9]+)':/g;
  let cm;
  while ((cm = cre.exec(gameCode))) cases.add(cm[1]);
  let bad = 0;
  acts.forEach((a) => {
    if (a === 'close') return;
    if (a.indexOf('dlg.') === 0) return; // routed via dlgAction -> Overland.siteAction
    const g = a.split('.')[0];
    if (!cases.has(g)) { bad++; console.log('  FAIL: data-act "' + a + '" has no router case'); }
  });
  ok(bad === 0, 'all ' + acts.size + ' static data-act values routed');
  // key API cross-checks
  ok(typeof GAME.Combat.useItemAction === 'function', 'Combat.useItemAction');
  ok(typeof GAME.Combat.combatMenu === 'function', 'Combat.combatMenu');
  ok(typeof GAME.Overland.stepSiteButton === 'function', 'Overland.stepSiteButton');
  ok(typeof GAME.UI.finishChar === 'function', 'UI.finishChar');
  ok(typeof GAME.UI.rollAttrs === 'function', 'UI.rollAttrs');
  ok(typeof GAME.UI.setInvTab === 'function', 'UI.setInvTab');
  ok(typeof GAME.Town !== 'undefined' && typeof GAME.Dungeon !== 'undefined', 'Town and Dungeon scenes');
  ok(typeof GAME.M.fmtGold === 'function' && typeof GAME.M.fmtNum === 'function', 'M.fmtGold / M.fmtNum');
  ok(typeof GAME.RULES.hitDice('dwarf', 'fighter') === 'string', 'hitDice(race, cls)');
}

loadGame();
checkModules();
checkRules();
checkSpells();
checkItemsMonsters();
checkAdventures();
checkIndex();
checkNoExternalAssets();
console.log('\n============================');
console.log('PASS: ' + pass + '  FAIL: ' + fail + '  WARN: ' + warns);
process.exit(fail > 0 ? 1 : 0);
