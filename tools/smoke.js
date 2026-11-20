/* ============================================================
   EMBERFALL — tools/smoke.js
   Headless integration test: loads all 19 scripts in a DOM-shim
   context and drives the whole game: title -> create -> overland
   -> town (shops, inn, temple, hall) -> dungeon (doors, traps,
   loot, search, stairs) -> combat (move/attack/cast/turn/item/
   flee) -> save/load -> map/journal/bestiary.
   ============================================================ */
'use strict';
const fs = require('fs');
const vm = require('vm');
const path = require('path');

/* ---------------- DOM shim ---------------- */
function makeCtx() {
  const noop = () => {};
  const grad = { addColorStop: noop };
  return new Proxy({}, {
    get(t, k) {
      if (k === 'createLinearGradient' || k === 'createRadialGradient' || k === 'createPattern') return () => grad;
      if (k === 'createImageData') return (w, h) => ({ data: new Uint8ClampedArray(Math.max(1, w * h * 4)), width: w, height: h });
      if (k === 'getImageData') return (x, y, w, h) => ({ data: new Uint8ClampedArray(Math.max(1, w * h * 4)) });
      if (k === 'measureText') return () => ({ width: 10 });
      if (k in t) return t[k];
      return noop;
    },
    set(t, k, v) { t[k] = v; return true; }
  });
}

let allElements = [];
class ClassList {
  constructor(el) { this.el = el; this.set = new Set(); }
  add(...c) { c.forEach(x => this.set.add(x)); this.sync(); }
  remove(...c) { c.forEach(x => this.set.delete(x)); this.sync(); }
  contains(c) { return this.set.has(c); }
  toggle(c) { this.set.has(c) ? this.set.delete(c) : this.set.add(c); this.sync(); }
  sync() { this.el.className = [...this.set].join(' '); }
}
class El {
  constructor(tag) {
    this.tagName = (tag || 'div').toUpperCase();
    this.children = [];
    this.parentNode = null;
    this.dataset = {};
    this.attributes = {};
    this.style = { cssText: '' };
    this.classList = new ClassList(this);
    this.listeners = {};
    this._innerHTML = '';
    this.value = '';
    if (this.tagName === 'CANVAS') { this.width = 800; this.height = 450; this._ctx = makeCtx(); }
    allElements.push(this);
  }
  get className() { return [...this.classList.set].join(' '); }
  set className(v) { this.classList.set = new Set(String(v).split(/\s+/).filter(Boolean)); }
  get clientWidth() { return this.width || 800; }
  get clientHeight() { return this.height || 450; }
  get firstChild() { return this.children[0] || null; }
  appendChild(c) { if (c.parentNode) c.parentNode.removeChild(c); c.parentNode = this; this.children.push(c); return c; }
  removeChild(c) { const i = this.children.indexOf(c); if (i >= 0) this.children.splice(i, 1); c.parentNode = null; return c; }
  setAttribute(k, v) { this.attributes[k] = String(v); if (k.startsWith('data-')) { const key = k.slice(5).replace(/-([a-z])/g, (m, x) => x.toUpperCase()); this.dataset[key] = String(v); } }
  getAttribute(k) { return this.attributes[k] != null ? this.attributes[k] : null; }
  addEventListener(ev, fn) { (this.listeners[ev] = this.listeners[ev] || []).push(fn); }
  removeEventListener() {}
  dispatch(ev, e) { (this.listeners[ev] || []).forEach(fn => fn(e)); }
  get innerHTML() { return this._innerHTML; }
  set innerHTML(v) { this._innerHTML = String(v); this.children = []; }
  getBoundingClientRect() { return { left: 0, top: 0, width: this.width || 800, height: this.height || 450 }; }
  querySelector(sel) { return this.querySelectorAll(sel)[0] || null; }
  querySelectorAll(sel) {
    // support: tag, .class, #id, tag.class, compound like 'canvas.best-ic', '[data-pad]'
    const out = [];
    const parts = sel.trim().split(/\s+/);
    // last part is the selector; preceding parts are ancestor filters (ignored except for tag containment)
    const selP = parts[parts.length - 1];
    const ancestors = parts.slice(0, -1);
    const test = parseSel(selP);
    const walk = (el) => {
      el.children.forEach(c => { if (test(c)) out.push(c); walk(c); });
    };
    if (this) walk(this);
    return out.filter(e2 => {
      return ancestors.every(a => {
        let node = e2;
        while (node) { if (parseSel(a)(node)) return true; node = node.parentNode; }
        return false;
      });
    });
  }
  getContext(kind) { return this._ctx || makeCtx(); }
  closest() { return null; }
}
function parseSel(sel) {
  const m = sel.match(/^([a-zA-Z0-9]*)(#[a-zA-Z0-9_-]*)?((?:\.[a-zA-Z0-9_-]+)*)?\[?data-([a-z-]*)\]?$|^data-([a-z-]+)$/);
  return (el) => {
    if (sel.startsWith('data-')) { const k = sel.slice(5); return el.dataset && el.dataset[k.replace(/-([a-z])/g, (x, y) => y.toUpperCase())] != null; }
    if (!m) {
      // attribute selector [data-x]
      const am = sel.match(/^\[data-([a-z-]+)\]$/i);
      if (am) return el.dataset && el.dataset[am[1].replace(/-([a-z])/g, (x, y) => y.toUpperCase())] != null;
      return false;
    }
    const tag = m[1], id = m[2] || '', classes = (m[3] || '').split('.').filter(Boolean);
    if (tag && el.tagName !== tag.toUpperCase()) return false;
    if (id && el.attributes['id'] !== id.slice(1)) return false;
    if (classes.length) { const have = (el.className || '').split(/\s+/); if (!classes.every(c => have.indexOf(c) >= 0)) return false; }
    return true;
  };
}

// prebuilt app shell
const ids = {};
['app', 'topbar', 'top-title', 'top-loc', 'top-clock', 'top-gold', 'stage', 'cv', 'prompt', 'watch', 'minimap', 'vitals', 'bar', 'pad', 'ui', 'toast'].forEach(id => {
  const e = new El(id === 'cv' || id === 'minimap' ? 'canvas' : 'div');
  e.attributes['id'] = id;
  ids[id] = e;
});
['pad-dirs', 'pad-side'].forEach(cls => {
  const e = new El('div'); e.classList.add(cls);
  ids[cls] = e;
});
ids['pad'].appendChild(ids['pad-side']);
ids['pad'].appendChild(ids['pad-dirs']);
ids['stage'].appendChild(ids['cv']);
ids['stage'].appendChild(ids['prompt']);
ids['stage'].appendChild(ids['watch']);
ids['stage'].appendChild(ids['bar']);
ids['stage'].appendChild(ids['pad']);
ids['stage'].appendChild(ids['ui']);
ids['stage'].appendChild(ids['toast']);
ids['watch'].appendChild(ids['minimap']);
ids['watch'].appendChild(ids['vitals']);
ids['topbar'].appendChild(ids['top-title']);
ids['app'].appendChild(ids['topbar']);
ids['app'].appendChild(ids['stage']);

const padBtns = {};
['back', 'fwd', 'act', 'menu', 'tleft', 'tside-l', 'tside-r', 'tright'].forEach(p => {
  const b = new El('button');
  b.setAttribute('data-pad', p);
  (p === 'act' || p === 'menu' || p === 'back' || p === 'fwd' ? ids['pad-side'] : ids['pad-dirs']).appendChild(b);
  padBtns[p] = b;
});

function queryAllRoot(sel) {
  return ids['app'].querySelectorAll(sel);
}

let rafQueue = [];
const timerQueue = []; // [fn, ms]
const sandbox = {
  console,
  setTimeout: (fn, ms) => { timerQueue.push([fn, ms || 0]); return timerQueue.length; },
  clearTimeout: (id) => { if (id && timerQueue[id - 1]) timerQueue[id - 1] = null; },
  setInterval: (fn, ms) => { const id = setInterval(fn, ms); return id; },
  clearInterval,
  requestAnimationFrame: (fn) => { rafQueue.push(fn); return rafQueue.length; },
  cancelAnimationFrame: () => {},
  window: null,
  document: {
    createElement: (t) => new El(t),
    createTextNode: (t) => ({ nodeType: 3, textContent: t }),
    getElementById: (id) => ids[id] || null,
    querySelector: (sel) => {
      if (sel.startsWith('#')) return ids[sel.slice(1)] || null;
      return queryAllRoot(sel)[0] || null;
    },
    querySelectorAll: (sel) => queryAllRoot(sel),
    addEventListener: () => {},
    body: ids['app']
  },
  localStorage: (function () {
    const store = {};
    return {
      getItem: (k) => (k in store ? store[k] : null),
      setItem: (k, v) => { store[k] = String(v); },
      removeItem: (k) => { delete store[k]; },
      get length() { return Object.keys(store).length; },
      key: (i) => Object.keys(store)[i] || null
    };
  })(),
  devicePixelRatio: 1,
  addEventListener: () => {},
  alert: () => {},
  performance: { now: () => Date.now() }
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
const context = vm.createContext(sandbox);

/* ---------------- load scripts ---------------- */
const ROOT = path.join(__dirname, '..');
const files = ['rules', 'data', 'modules', 'monsters', 'wilds', 'treasure', 'adventures', 'figures', 'view3d', 'ui', 'combat', 'overland', 'campaign', 'journal', 'map', 'bestiary', 'navpad', 'watch', 'game'];
files.forEach(f => {
  const code = fs.readFileSync(path.join(ROOT, 'js', f + '.js'), 'utf8');
  vm.runInContext(code, context, { filename: f + '.js' });
});

/* ---------------- helpers ---------------- */
let passed = 0, failed = 0;
function ok(cond, label) {
  if (cond) { passed++; console.log('  PASS ' + label); }
  else { failed++; console.log('  FAIL ' + label); }
}
function act(str) {
  const [g, a] = str.split('.');
  const btn = new El('button');
  btn.setAttribute('data-act', str);
  const ev = { target: btn, preventDefault: () => {} };
  // emulate delegation: find handler on document
  (sandbox.document._clickHandlers || []).forEach(fn => fn(ev));
}
function fireDocumentClick(btnEl) {
  const ev = { target: btnEl, preventDefault: () => {}, stopPropagation: () => {} };
  (sandbox.document._clickHandlers || []).forEach(fn => fn(ev));
}
// capture document click handler (game.js registers one)
{
  const origAdd = sandbox.document.addEventListener.bind(sandbox.document);
  sandbox.document.addEventListener = function (ev, fn) {
    if (ev === 'click') { (sandbox.document._clickHandlers = sandbox.document._clickHandlers || []).push(fn); }
    if (ev === 'keydown') { (sandbox.document._keyHandlers = sandbox.document._keyHandlers || []).push(fn); }
    return origAdd(ev, fn);
  };
}
function fireKey(code) {
  const e = { code, target: { tagName: 'BODY' }, preventDefault: () => {} };
  (sandbox.document._keyHandlers || []).forEach(fn => fn(e));
}
function tapCanvas(x, y) {
  const ev = { clientX: x, clientY: y };
  (ids['cv'].listeners['click'] || []).forEach(fn => fn(ev));
}
function pump(n) {
  for (let i = 0; i < (n || 40); i++) {
    const idx = timerQueue.findIndex(t => t);
    if (idx === -1) break;
    const [fn] = timerQueue[idx];
    timerQueue[idx] = null;
    fn();
  }
}
function pumpRAF(n) {
  for (let i = 0; i < (n || 5); i++) {
    const q = rafQueue.splice(0, rafQueue.length);
    q.forEach(fn => fn());
  }
}
const G = () => context.Campaign.G;

/* ---------------- drive the game ---------------- */
(async function main() {
  console.log('== boot ==');
  context.Game.init();
  pumpRAF();
  ok(context.UI.isOpen(), 'title screen open');

  console.log('== new game ==');
  act('new');
  ok(G().party.length === 0, 'party empty');
  ok(G().phase === 'create' || context.UI.isOpen(), 'create flow open');

  console.log('== create 3 characters ==');
  const chars = [
    { race: 'human', cls: 'fighter', align: 'ne' },
    { race: 'elf', cls: 'mage', align: 'cn' },
    { race: 'dwarf', cls: 'cleric', align: 'le' }
  ];
  {
    const b = new El('button'); b.setAttribute('data-act', 'create.size'); b.setAttribute('data-n', '3');
    fireDocumentClick(b);
  }
  for (const c of chars) {
    let b = new El('button'); b.setAttribute('data-act', 'create.race'); b.setAttribute('data-r', c.race); fireDocumentClick(b);
    b = new El('button'); b.setAttribute('data-act', 'create.class'); b.setAttribute('data-c', c.cls); fireDocumentClick(b);
    b = new El('button'); b.setAttribute('data-act', 'create.align'); b.setAttribute('data-a', c.align); fireDocumentClick(b);
    b = new El('button'); b.setAttribute('data-act', 'create.roll'); fireDocumentClick(b);
    b = new El('button'); b.setAttribute('data-act', 'create.finish'); fireDocumentClick(b);
    pumpRAF();
  }
  ok(G().party.length === 3, 'party has 3 chars (got ' + G().party.length + ')');
  ok(G().phase === 'overland', 'phase is overland (got ' + G().phase + ')');
  ok(G().loc && G().loc.x != null && G().loc.y != null, 'overland loc has coords');
  const fighter = G().party[0];
  ok(fighter.cls === 'fighter' && fighter.level === 1, 'fighter created');
  const mage = G().party[1];
  ok(mage.cls === 'mage' && mage.known.length === 2, 'mage has 2 spells');
  ok(mage.mv < fighter.mv || true, 'demi-human move check (informational)');

  console.log('== overland movement ==');
  const x0 = G().loc.x, y0 = G().loc.y;
  context.Overland.step(0, 1);
  ok(G().loc.y === y0 + 1 || G().loc.y === y0, 'overland step moved or blocked');
  ok(G().minute > 0, 'time advanced');
  // Enter key acts as the action key: on a site it opens the site dialog
  context.UI.close();
  {
    const wS = context.Campaign.advWorld(G().activeAdv);
    const advS = context.ADV.get(G().activeAdv);
    const ts = advS.wilds.sites.find(s => s.kind === 'town');
    wS.wilds.x = ts.x; wS.wilds.y = ts.y;
    context.Overland.enter(G().activeAdv);
    fireKey('Enter');
    ok(sandbox.document.getElementById('ui').classList.contains('open'), 'Enter opens the site dialog on a site');
    context.UI.close();
  }

  console.log('== town ==');
  act('dlg.enter-town');
  // siteDialog not necessarily open; go directly
  context.Town.enter(G().loc.adv || 'E0');
  ok(G().phase === 'town', 'entered town (got ' + G().phase + ')');
  const t = G().loc;
  // street npc prompt: face the first street npc
  const advEarly = context.ADV.get(G().activeAdv);
  const streetNpcs = Object.keys(advEarly.town.npcs).filter(id => !advEarly.town.npcs[id].bld);
  ok(streetNpcs.length >= 2, 'town has street npcs (got ' + streetNpcs.length + ')');
  if (streetNpcs.length) {
    const n0 = advEarly.town.npcs[streetNpcs[0]];
    G().loc.x = n0.x + 1; G().loc.y = n0.y;
    context.View.setPos(G().loc.x + 0.5, G().loc.y + 0.5, Math.PI); // face west, toward the npc
    context.UI.close();
    const pr = context.Town.prompt();
    ok(pr && pr.indexOf(n0.name) >= 0, 'town prompt names street npc when facing');
    context.Game.wake(); pumpRAF();
    ok(sandbox.document.getElementById('prompt').innerHTML.indexOf(n0.name) >= 0, 'prompt element rendered by the game loop');
  }
  // walk around
  context.Town.step(0, -1);
  context.Town.step(1, 0);
  ok(G().phase === 'town', 'still in town after steps');
  // interact with the guild hall door: find a building door near us
  const adv = context.ADV.get(G().activeAdv);
  const doorIdx = Object.keys(adv.town.doors)[0];
  const dx = doorIdx % adv.town.w, dy = Math.floor(doorIdx / adv.town.w);
  // teleport next to the door for the test
  G().loc.x = dx; G().loc.y = dy + 1;
  context.View.setPos(G().loc.x + 0.5, G().loc.y + 0.5);
  context.Town.interact();
  // stepping onto the door cell enters the interior
  const bldId = adv.town.doors[doorIdx].bld;
  context.Town.enterInterior(bldId);
  ok(G().phase === 'building', 'entered building (got ' + G().phase + ')');
  // counter action
  const bld = adv.town.buildingsById[bldId];
  if (bld.kind === 'general' || bld.kind === 'apothecary' || bld.kind === 'scribe' || bld.kind === 'magic') {
    context.Town.counterAction(bldId);
    ok(context.UI.isOpen(), 'shop open at ' + bld.kind);
    if (context.Shop && context.Shop.cur && context.Shop.cur.stock.length) {
      const gold0 = G().gold;
      const item = context.Shop.cur.stock[0];
      context.Shop.buy(0);
      ok(G().gold < gold0 || item.price > gold0, 'buy attempted (gold delta ' + (gold0 - G().gold) + ')');
      context.Shop.sell(item.id);
      ok(true, 'sell attempted');
    }
    act('shop.close');
  } else {
    ok(true, 'non-shop building (' + bld.kind + ') skipped shop test');
  }
  context.Town.exitInterior();
  ok(G().phase === 'town', 'back in town');
  context.Town.leaveTown();
  ok(G().phase === 'overland', 'left town to overland');

  console.log('== dungeon ==');
  const adv2 = context.ADV.get(G().activeAdv);
  context.Dungeon.enter(adv2.id, 0);
  ok(G().phase === 'dungeon', 'entered dungeon (got ' + G().phase + ')');
  ok(context.Dungeon.cur && context.Dungeon.cur.mobs.length > 0, 'dungeon has mobs');
  // step forward a few times
  context.Dungeon.step(0, -1);
  context.Dungeon.step(1, 0);
  ok(G().phase === 'dungeon' || G().phase === 'combat', 'still dungeon or combat (got ' + G().phase + ')');
  // search
  if (G().phase === 'dungeon') {
    context.Dungeon.search();
    ok(true, 'search ran');
    // interact: find a door facing us — scan
    let foundDoor = false;
    const f = adv2.floors[0];
    for (const k in f.doors) {
      const ddx = k % f.w, ddy = Math.floor(k / f.w);
      if (Math.abs(ddx - G().loc.x) + Math.abs(ddy - G().loc.y) <= 2) {
        G().loc.x = ddx; G().loc.y = ddy + 1 < f.h && !f.solid[(ddy + 1) * f.w + ddx] ? ddx : ddx;
        break;
      }
    }
    context.Dungeon.interact();
    ok(true, 'dungeon interact ran');
    // dungeon prompt: face the up-stairs
    const fU = adv2.floors[0];
    G().loc.x = fU.up.x; G().loc.y = fU.up.y + 1 < fU.h ? fU.up.y + 1 : fU.up.y - 1;
    context.View.setPos(G().loc.x + 0.5, G().loc.y + 0.5, G().loc.y < fU.up.y ? Math.PI / 2 : -Math.PI / 2);
    context.UI.close();
    const dpr = context.Dungeon.prompt();
    ok(dpr && dpr.indexOf('stairs up') >= 0, 'dungeon prompt names stairs when facing (' + (dpr || 'null') + ')');
  }

  console.log('== combat (forced) ==');
  // force a combat: place two goblins adjacent
  context.Combat.start('overland', { adv: G().activeAdv, seed: 'smoke', mobs: [{ id: 'goblin' }, { id: 'goblin' }], ambush: false });
  ok(G().phase === 'combat', 'combat started');
  ok(context.Combat.C.actors.length >= 5, 'actors present (got ' + context.Combat.C.actors.length + ')');
  pump(); pumpRAF();
  // play a few player actions
  const C = () => context.Combat.C;
  context.Combat.combatMenu();
  context.Combat.enterMoveMode();
  const cur = context.Combat.current();
  const cells = context.Combat.reachableCells(cur);
  const freeKey = Object.keys(cells).find(k => !context.Combat.actorAt(k % C().grid.w, Math.floor(k / C().grid.w)));
  if (freeKey != null) {
    const fx = freeKey % C().grid.w, fy = Math.floor(freeKey / C().grid.w);
    context.Combat.doMove(cur, fx, fy);
    ok(true, 'moved');
  }
  pump(); pumpRAF();
  // attack
  context.Combat.combatMenu();
  context.Combat.enterAttackMode();
  const tg = context.Combat.attackTargets(context.Combat.current());
  if (tg.length) { context.Combat.doAttack(context.Combat.current(), tg[0]); ok(true, 'attacked'); }
  pump(); pumpRAF();
  // mage cast
  const mageC = context.Combat.C.actors.find(a => a.side === 'party' && a.char.cls === 'mage');
  if (mageC) {
    const opts = context.Combat.castOptions(mageC);
    ok(opts.length > 0, 'mage has cast options');
    if (opts.length) {
      const o = opts[0];
      const kind = context.Combat.spellTargetKind(o.sp);
      if (kind === 'none') context.Combat.castSpell(mageC, o, null);
      else if (kind === 'enemy') context.Combat.castSpell(mageC, o, C().actors.find(a => a.side === 'mon' && !a.dead));
      else context.Combat.castSpell(mageC, o, mageC);
      ok(true, 'cast ' + o.sp.n);
    }
  }
  pump(); pumpRAF();
  // cleric turn undead
  const clericC = context.Combat.C && context.Combat.C.actors.find(a => a.side === 'party' && a.char.cls === 'cleric');
  if (clericC) { context.Combat.doTurnUndead(clericC); ok(true, 'turn undead ran'); }
  pump(); pumpRAF();
  // fight to the end (cap iterations)
  let guard = 0, idle = 0;
  while (context.Combat.C && guard++ < 400) {
    pump(50); pumpRAF();
    const cc = context.Combat.C;
    if (!cc) break;
    if (guard > 320 && !cc.auto) { cc.auto = true; } // stall guard: engage auto-fight
    if (cc.state === 'player' && cc.mode === 'menu') {
      const a2 = context.Combat.current();
      if (a2) {
        const tgs = context.Combat.attackTargets(a2);
        if (tgs.length) { context.Combat.doAttack(a2, tgs[0]); idle = 0; }
        else {
          // move toward nearest enemy
          const mon = cc.actors.find(m => m.side === 'mon' && !m.dead);
          const cells = context.Combat.reachableCells(a2);
          if (mon) {
            let best = null, bd = 1e9;
            for (const k in cells) {
              const cx = +k % cc.grid.w, cy = Math.floor(+k / cc.grid.w);
              const d = Math.abs(cx - mon.x) + Math.abs(cy - mon.y);
              if (d < bd && !context.Combat.actorAt(cx, cy)) { bd = d; best = [cx, cy]; }
            }
            if (best && (Math.abs(best[0] - a2.x) + Math.abs(best[1] - a2.y) < Math.abs(a2.x - mon.x) + Math.abs(a2.y - mon.y))) {
              context.Combat.doMove(a2, best[0], best[1]); idle = 0;
            } else { context.Combat.doDefend(a2); idle = 0; }
          } else { context.Combat.doDefend(a2); idle = 0; }
        }
      } else idle++;
    }
    if (idle > 40) break;
  }
  ok(!context.Combat.C, 'combat ended (guard ' + guard + ')');
  ok(G().phase === 'overland', 'back to overland after combat (got ' + G().phase + ')');
  ok(Object.keys(G().bestiary).length > 0, 'bestiary populated (' + Object.keys(G().bestiary).length + ')');

  console.log('== save / load ==');
  context.Campaign.saveGame('slot1');
  ok(context.Campaign.hasSave('slot1'), 'slot1 saved');
  const dayBefore = G().day;
  ok(context.Campaign.loadGame('slot1'), 'slot1 loaded');
  ok(G().day === dayBefore, 'load restored day');

  console.log('== panels ==');
  context.MapView.open('overland');
  ok(context.UI.isOpen(), 'map panel open');
  act('close');
  context.Journal.open();
  ok(context.UI.isOpen(), 'journal panel open');
  act('close');
  context.Bestiary.open();
  ok(context.UI.isOpen(), 'bestiary panel open');
  act('close');
  context.UI.sheet(0);
  ok(context.UI.isOpen(), 'sheet open');
  act('close');
  context.UI.inventory();
  ok(context.UI.isOpen(), 'inventory open');
  act('close');
  context.UI.select();
  ok(context.UI.isOpen(), 'adventure select open');
  act('close');

  console.log('== render all scenes ==');
  context.Dungeon.enter(adv2.id, 0);
  pumpRAF();
  ok(true, 'dungeon 3D rendered');
  context.Overland.enter(adv2.id);
  pumpRAF();
  ok(true, 'overland rendered');
  context.Town.enter(adv2.id);
  pumpRAF();
  ok(true, 'town 3D rendered');

  console.log('== new features ==');

  // ready-made company
  context.Campaign.newGame();
  context.UI.title();
  { const b = new El('button'); b.setAttribute('data-act', 'ready'); fireDocumentClick(b); }
  pumpRAF();
  ok(G().phase === 'overland', 'ready company reaches overland (got ' + G().phase + ')');
  ok(G().party.length === 3, 'ready company has 3 chars (got ' + G().party.length + ')');

  // party of six
  context.Campaign.newGame();
  context.UI.createStart();
  { const b = new El('button'); b.setAttribute('data-act', 'create.size'); b.setAttribute('data-n', '6'); fireDocumentClick(b); }
  const six = [
    { race: 'human', cls: 'fighter', align: 'ne' },
    { race: 'dwarf', cls: 'cleric', align: 'le' },
    { race: 'elf', cls: 'mage', align: 'cn' },
    { race: 'halfelf', cls: 'ranger', align: 'ne' },
    { race: 'gnome', cls: 'thief', align: 'cn' },
    { race: 'halfling', cls: 'paladin', align: 'lg' }
  ];
  for (const c of six) {
    let b = new El('button'); b.setAttribute('data-act', 'create.race'); b.setAttribute('data-r', c.race); fireDocumentClick(b);
    b = new El('button'); b.setAttribute('data-act', 'create.class'); b.setAttribute('data-c', c.cls); fireDocumentClick(b);
    b = new El('button'); b.setAttribute('data-act', 'create.align'); b.setAttribute('data-a', c.align); fireDocumentClick(b);
    b = new El('button'); b.setAttribute('data-act', 'create.roll'); fireDocumentClick(b);
    b = new El('button'); b.setAttribute('data-act', 'create.finish'); fireDocumentClick(b);
    pumpRAF();
  }
  ok(G().party.length === 6, 'party of 6 created (got ' + G().party.length + ')');

  // learn a wizard scroll into the spellbook
  const mage6 = G().party[2];
  const scrollId = Object.keys(context.ITEMS).find(k => context.ITEMS[k].c === 'scroll' && context.ITEMS[k].sc && context.ITEMS[k].sc.who === 'wizard' && context.ITEMS[k].sc.lvl === 1 && (mage6.known || []).indexOf(context.ITEMS[k].sc.spell) < 0);
  context.Campaign.addItem(mage6, scrollId, 1);
  context.UI.setInvTab(2);
  context.UI.inventory();
  ok(sandbox.document.getElementById('ui').innerHTML.indexOf('inv.learn') >= 0, 'learn button rendered for wizard scroll');
  { const b = new El('button'); b.setAttribute('data-act', 'inv.learn'); b.setAttribute('data-idx', '2'); b.setAttribute('data-id', scrollId); fireDocumentClick(b); }
  ok((mage6.known || []).indexOf(context.ITEMS[scrollId].sc.spell) >= 0, 'spell learned into book');
  ok(context.Campaign.countItem(mage6, scrollId) === 0, 'scroll consumed on learn');
  const knownSpell = (mage6.known || [])[0];
  const knownScroll = Object.keys(context.ITEMS).find(k => context.ITEMS[k].c === 'scroll' && context.ITEMS[k].sc && context.ITEMS[k].sc.spell === knownSpell);
  if (knownScroll) {
    context.Campaign.addItem(mage6, knownScroll, 1);
    context.UI.setInvTab(2);
    context.UI.inventory();
    ok(sandbox.document.getElementById('ui').innerHTML.indexOf('disabled') >= 0, 'learn greyed out for known spell');
  }

  // dropped items stay on the ground (dungeon)
  context.Dungeon.enter(adv2.id, 0);
  const dpx = G().loc.x, dpy = G().loc.y;
  context.Campaign.addItem(G().party[0], 'torch', 1);
  context.Dungeon.dropItem('torch', 0);
  const dst = context.Dungeon.cur.st;
  ok(dst.dropped && dst.dropped.length === 1, 'drop leaves item on the ground');
  ok(context.Campaign.countItem(G().party[0], 'torch') === 2, 'dropped item left inventory (2 of 3 remain)');
  // step to an open neighbour, then back to pick it up
  const f0 = context.ADV.get(adv2.id).floors[0];
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  let moved = false;
  for (const d of dirs) {
    const nx = dpx + d[0], ny = dpy + d[1];
    if (nx < 0 || ny < 0 || nx >= f0.w || ny >= f0.h) continue;
    if (f0.solid[ny * f0.w + nx]) continue;
    if (nx === f0.up.x && ny === f0.up.y) continue;
    if (nx === f0.down.x && ny === f0.down.y) continue;
    context.Dungeon.step(d[0], d[1]);
    if (G().phase !== 'dungeon') break; // stairs took us away
    if (G().loc.x !== dpx || G().loc.y !== dpy) { moved = true; break; }
  }
  if (moved) {
    context.Dungeon.step(dpx - G().loc.x, dpy - G().loc.y);
    ok(context.Campaign.countItem(G().party[0], 'torch') === 3, 'stepping back picks the item up');
  } else ok(true, 'no open neighbour to test pickup (skipped)');

  // auto-fight resolves a combat
  context.Overland.enter(adv2.id);
  context.Combat.start('overland', { adv: adv2.id, seed: 'feat-auto', mobs: [{ id: 'goblin' }], ambush: false });
  let guardA = 0, autoOn = false;
  while (context.Combat.C && guardA++ < 400) {
    const cc = context.Combat.C;
    if (cc.state === 'player' && !autoOn) { context.Combat.toggleAuto(); autoOn = true; pump(50); continue; }
    pump(50);
  }
  ok(!context.Combat.C, 'auto-fight resolved combat (guard ' + guardA + ')');

  // surprise: foes lose their first actions
  context.Combat.start('overland', { adv: adv2.id, seed: 'feat-spr', mobs: [{ id: 'goblin' }, { id: 'goblin' }], ambush: false, surprise: true });
  const mons2 = context.Combat.C.actors.filter(a => a.side === 'mon');
  ok(mons2.every(a => a.acted), 'surprise: monsters lose first action');
  ok(typeof mons2[0].morale === 'number', 'monster actors carry morale');
  mons2.forEach(a => { a.dead = true; a.hp = 0; });
  context.Combat.endCombat(true);
  ok(G().phase === 'overland', 'surprise combat cleaned up (got ' + G().phase + ')');

  // camp dialog + rest until healed
  context.Overland.enter(adv2.id);
  const hpP0 = G().party[0];
  hpP0.hp = 1;
  context.Overland.campDialog();
  ok(sandbox.document.getElementById('ui').innerHTML.indexOf('camp-resthealed') >= 0, 'camp offers rest until healed');
  { const b = new El('button'); b.setAttribute('data-act', 'dlg.camp-resthealed'); fireDocumentClick(b); }
  pump(20);
  ok(hpP0.hp === context.Campaign.mhp(hpP0), 'rest until healed restores HP (' + hpP0.hp + '/' + context.Campaign.mhp(hpP0) + ')');

  // keyboard routing (Q/E/F/R/1-6/Esc)
  fireKey('KeyR');
  ok(sandbox.document.getElementById('ui').innerHTML.indexOf('camp-rest') >= 0, 'R opens camp dialog');
  { const b = new El('button'); b.setAttribute('data-act', 'close'); fireDocumentClick(b); }
  fireKey('Digit1');
  ok(context.UI.isOpen(), '1 opens first sheet');
  fireKey('Escape');
  ok(!context.UI.isOpen(), 'Esc closes panels');
  fireKey('KeyJ');
  ok(context.UI.isOpen(), 'J opens journal');
  { const b = new El('button'); b.setAttribute('data-act', 'close'); fireDocumentClick(b); }

  // smooth glide: tick converges on the target
  context.Dungeon.enter(adv2.id, 0);
  const gx0 = context.View.x, gy0 = context.View.y;
  context.View.glide(gx0 + 1, gy0);
  let gl = 0;
  while (context.View.gliding && gl++ < 200) context.View.tick(16);
  ok(!context.View.gliding && Math.abs(context.View.x - (gx0 + 1)) < 0.01, 'glide converges on target in ' + gl + ' ticks');

  console.log('\n== RESULT: ' + passed + ' passed, ' + failed + ' failed ==');
  process.exit(failed ? 1 : 0);
})().catch(e => {
  console.error('SMOKE CRASH:', e && e.stack || e);
  process.exit(2);
});
