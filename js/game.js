/* ============================================================
   EMBERFALL — game.js
   Boot and orchestration: canvas sizing, the render loop,
   action routing (all data-act buttons), canvas taps, and the
   phase-change hooks. Everything else plugs in here.
   ============================================================ */
'use strict';

// Live alias of the campaign state for modules that read a bare G.
// (campaign.js shadows this with its own private state object.)
var G = new Proxy({}, {
  get: function (t, k) { return Campaign.G ? Campaign.G[k] : undefined; },
  set: function (t, k, v) { if (Campaign.G) Campaign.G[k] = v; return true; }
});

var Game = (function () {
  var cv = null;
  var needRender = true;
  var olLayout = null;
  var phaseHooks = [];

  function dirty() { needRender = true; }

  // a ready-made company to start at once
  function readyCompany() {
    Campaign.newGame();
    var specs = [
      { name: 'Bram', race: 'human', cls: 'fighter', align: 'ne', attrs: { str: 15, int: 9, wis: 11, con: 13, dex: 12, cha: 12 } },
      { name: 'Seren', race: 'elf', cls: 'mage', align: 'cn', attrs: { str: 9, int: 16, wis: 12, con: 11, dex: 13, cha: 13 } },
      { name: 'Tola', race: 'dwarf', cls: 'cleric', align: 'le', attrs: { str: 13, int: 10, wis: 15, con: 14, dex: 10, cha: 12 } }
    ];
    specs.forEach(function (s) {
      var kit = UI.starterKit(s.cls);
      var p = Campaign.makeChar({ name: s.name, race: s.race, cls: s.cls, align: s.align, attrs: s.attrs, items: kit.items, known: kit.known });
      if (s.cls === 'mage' || s.cls === 'cleric') p.known = kit.known;
      Campaign.G.gold += kit.gold;
      Campaign.G.party.push(p);
    });
    Campaign.log('The ready company — ' + Campaign.G.party.map(function (p) { return p.name; }).join(', ') + ' — sets out from Thornwick. Starting gold: ' + M.fmtGold(Campaign.G.gold) + '.');
    Campaign.setPhase('overland');
    Overland.enter('E0');
    UI.close();
    dirty();
  }

  function onPhase(fn) { phaseHooks.push(fn); }

  function resize() {
    var stage = document.getElementById('stage');
    var w = stage.clientWidth, h = stage.clientHeight;
    var Gg = Campaign.G;
    // keep internal resolution modest for old tablets
    var maxW = Gg && Gg.options.lowFx ? 480 : 720;
    cv.width = Math.min(maxW, Math.floor(w * (window.devicePixelRatio > 1.5 ? 0.75 : 1)));
    cv.height = Math.min(450, Math.floor(h * 0.8));
    cv.style.width = '100%';
    cv.style.height = '100%';
    dirty();
  }

  var lastTs = 0;
  function loop(ts) {
    var dt = lastTs ? Math.min(50, ts - lastTs) : 16;
    lastTs = ts;
    if (needRender || View.tick(dt)) {
      needRender = false;
      render();
    }
    requestAnimationFrame(loop);
  }

  var promptEl = null;
  function setPrompt(html) {
    if (!promptEl) promptEl = document.getElementById('prompt');
    if (!promptEl) return;
    if (html && !UI.isOpen()) { promptEl.innerHTML = html; promptEl.className = ''; }
    else promptEl.className = 'hidden';
  }

  function render() {
    var Gg = Campaign.G;
    if (!Gg) return;
    if (Gg.phase === 'overland') {
      olLayout = Overland.render(cv);
      setPrompt(null);
    } else if (Gg.phase === 'town' || Gg.phase === 'building' || Gg.phase === 'dungeon') {
      View.render();
      setPrompt(Gg.phase === 'dungeon' ? Dungeon.prompt() : Town.prompt());
    } else if (Gg.phase === 'combat') {
      Combat.render(cv);
      setPrompt(null);
    } else {
      setPrompt(null);
    }
    Watch.render();
  }

  function setPhase(phase) {
    phaseHooks.forEach(function (fn) { fn(phase); });
  }

  /* ---------------- action routing ---------------- */
  function act(act, d) {
    var Gg = Campaign.G;
    var parts = act.split('.');
    var g = parts[0], a = parts.slice(1).join('.') || parts[1];
    switch (g) {
      case 'new':
        Campaign.newGame();
        UI.createStart();
        break;
      case 'ready':
        readyCompany();
        break;
      case 'load':
        UI.saveLoad(true);
        break;
      case 'help':
        UI.howTo();
        break;
      case 'close':
        UI.close();
        break;
      case 'create':
        createAction(a, d);
        break;
      case 'sheet':
        sheetAction(a, d);
        break;
      case 'inv':
        invAction(a, d);
        break;
      case 'shop':
        if (a === 'buy') Shop.buy(+d.i);
        else if (a === 'sell') Shop.sell(d.id);
        else if (a === 'close') UI.close();
        break;
      case 'save':
        if (a === 'act') {
          if (d.mode === 'load') {
            if (Campaign.loadGame(d.slot)) {
              UI.close();
              Campaign.autosave();
              enterPhaseFromSave();
              Toast('Loaded ' + Campaign.slotLabel(d.slot), 'good');
            } else Toast('That save is damaged.', 'warn');
          } else {
            Campaign.saveGame(d.slot);
            UI.saveLoad(false);
          }
        } else if (a === 'erase') { Campaign.eraseSave(d.slot); UI.saveLoad(UI.isLoadMode()); }
        else if (a === 'open') UI.saveLoad(false);
        break;
      case 'load':
        if (a === 'open') UI.saveLoad(true);
        break;
      case 'select':
        if (a === 'adv') {
          Gg.activeAdv = d.id;
          Campaign.log('The company turns toward ' + ADV.get(d.id).name + '.');
          UI.close();
          Overland.enter(d.id);
        } else if (a === 'close') UI.close();
        else if (a === 'open') UI.select();
        break;
      case 'dlg':
        dlgAction(a, d);
        break;
      case 'combat':
        combatAction(a, d);
        break;
      case 'map':
        if (!a || a === 'open') MapView.open();
        else if (a === 'mode') MapView.open(d.m);
        break;
      case 'site':
        if (!a) Overland.stepSiteButton();
        break;
      case 'journal':
        if (!a || a === 'open') Journal.open();
        break;
      case 'bestiary':
        if (!a || a === 'open') Bestiary.open();
        break;
      case 'party':
        UI.sheet(0);
        break;
      case 'opts':
        if (a === 'open') UI.options();
        else if (a === 'close') UI.close();
        else if (a === 'lowfx') { Gg.options.lowFx = !Gg.options.lowFx; resize(); UI.options(); }
        break;
      case 'yard':
        if (a === 'train') {
          var p = Gg.party[+d.idx];
          var err = Campaign.train(p);
          if (err) Toast(err, 'warn');
          UI.close();
          Game.dirty();
        }
        break;
      case 'key':
        keyAction(a, d);
        break;
      case 'rest-inn': {
        var cost = 10 * Gg.party.length;
        if (Gg.gold < cost) { Toast('You need ' + M.fmtGold(cost) + '.', 'warn'); return; }
        Gg.gold -= cost;
        Campaign.restUntilDawn(true, 'The party sleeps at the inn.');
        Gg.party.forEach(function (q) { q.fatigue = 0; });
        Campaign.autosave();
        UI.close();
        Toast('Rested until dawn. Day ' + Gg.day, 'info');
        Game.dirty();
        break;
      }
      case 'pray-temple': {
        Gg.party.forEach(function (q) {
          if (q.prayedDay < Gg.day) { q.prayedDay = Gg.day; q.hp = Campaign.mhp(q); q.dead = 0; }
        });
        Campaign.log('The party prays and is made whole.');
        Campaign.autosave();
        UI.close();
        Toast('The party is healed by prayer.', 'good');
        Game.dirty();
        break;
      }
      case 'town':
        if (a === 'out') Town.leaveTown();
        else if (a === 'interact') Town.interact();
        break;
      case 'building':
        if (a === 'exit') Town.exitInterior();
        break;
      case 'dungeon':
        if (a === 'interact') Dungeon.interact();
        else if (a === 'search') Dungeon.search();
        break;
      case 'overland':
        break;
    }
  }

  function createAction(a, d) {
    var c = UI._create;
    if (a === 'size') { c.count = +d.n; UI.createScreen(); }
    else if (a === 'size-1') { c.count = Math.max(1, c.count - 1); UI.createScreen(); }
    else if (a === 'size+1') { c.count = Math.min(6, c.count + 1); UI.createScreen(); }
    else if (a === 'race') {
      if (!c.draft) c.draft = { race: d.r, cls: null, align: null, attrs: null, name: randomName(d.r), known: [] };
      c.draft.race = d.r;
      c.step = 1;
      UI.createScreen();
    } else if (a === 'class') {
      c.draft.cls = d.c;
      c.step = 2;
      UI.createScreen();
    } else if (a === 'align') {
      c.draft.align = d.a;
      if (!c.draft.attrs) UI.rollAttrs();
      c.step = 3;
      UI.createScreen();
    } else if (a === 'roll') {
      if (c.draft && c.draft.attrs) UI.rollAttrs();
      UI.createScreen();
    } else if (a === 'rname') {
      c.draft.name = randomName(c.draft.race);
      UI.createScreen();
    } else if (a === 'spell') {
      if (!c.draft.known) c.draft.known = [];
      var i = c.draft.known.indexOf(d.s);
      if (i >= 0) c.draft.known.splice(i, 1);
      else { if (c.draft.known.length >= 2) c.draft.known.shift(); c.draft.known.push(d.s); }
      UI.createScreen();
    } else if (a === 'back') {
      c.step = Math.max(0, c.step - 1);
      UI.createScreen();
    } else if (a === 'next') {
      if ((c.step === 2 || c.step === 3) && !c.draft.attrs) UI.rollAttrs();
      c.step = Math.min(4, c.step + 1);
      UI.createScreen();
    } else if (a === 'finish') {
      UI.close();
      UI.finishChar();
      Game.dirty();
    }
  }

  function sheetAction(a, d) {
    var Gg = Campaign.G;
    if (a === 'close') UI.close();
    else if (a === 'items') UI.inventory();
    else if (a === 'unequip') {
      var p = Gg.party[+d.idx];
      Campaign.unequip(p, d.slot);
      UI.sheet(+d.idx);
    } else if (a === 'spec') {
      var p2 = Gg.party[+d.idx];
      p2.spec = p2.equip.weapon;
      Campaign.log(p2.name + ' specializes in the ' + (ITEMS[p2.spec] ? ITEMS[p2.spec].n : 'weapon') + '.');
      UI.sheet(+d.idx);
    }
  }

  function invAction(a, d) {
    var Gg = Campaign.G;
    if (a === 'close') UI.close();
    else if (a === 'tab') {
      UI.setInvTab(+d.idx);
      UI.inventory();
    }
    else if (a === 'use') useItem(+d.idx, d.id);
    else if (a === 'equip') {
      var p = Gg.party[+d.idx];
      Campaign.equipItem(p, d.id);
      Campaign.log(p.name + ' equips the ' + ADV.itemOf(d.id).n + '.');
      UI.inventory();
    } else if (a === 'drop') {
      var p2 = Gg.party[+d.idx];
      if (Gg.phase === 'dungeon') {
        Dungeon.dropItem(d.id, +d.idx);
        UI.close();
      } else {
        Campaign.removeItem(p2, d.id);
        Campaign.log(p2.name + ' discards the ' + ADV.itemOf(d.id).n + '.');
        UI.inventory();
      }
    } else if (a === 'learn') {
      var p3 = Gg.party[+d.idx];
      var it3 = ADV.itemOf(d.id);
      if (!it3 || !it3.sc || p3.cls !== 'mage') return;
      if ((p3.known || []).indexOf(it3.sc.spell) >= 0) { Toast('Already in the spellbook.', 'info'); return; }
      Campaign.removeItem(p3, d.id);
      if (!p3.known) p3.known = [];
      p3.known.push(it3.sc.spell);
      Campaign.log(p3.name + ' copies ' + RULES.SPELLS.wizard[it3.sc.spell].n + ' into the spellbook.');
      Toast('Learned ' + RULES.SPELLS.wizard[it3.sc.spell].n, 'good');
      UI.inventory();
    }
  }

  function diceParts(s) { var d = RULES.parseDice(s); return [d.sides || 6, d.n || 1, d.mod || 0]; }
  function useItem(pIdx, id) {
    var Gg = Campaign.G;
    var p = Gg.party[pIdx];
    var it = ADV.itemOf(id);
    if (it.c === 'potion') {
      if (it.p && it.p.heal) {
        var h = M.dice.apply(null, diceParts(it.p.heal));
        p.hp = Math.min(Campaign.mhp(p), p.hp + h);
        Campaign.log(p.name + ' drinks and is healed for ' + h + '.');
        Toast(p.name + ' is healed for ' + h, 'good');
      } else if (it.p && it.p.cure_poison) {
        p.hp = Math.min(Campaign.mhp(p), p.hp + 2);
        Campaign.log(p.name + ' is purged of poison.');
        Toast('Poison cleared', 'good');
      } else {
        p.hp = Math.min(Campaign.mhp(p), p.hp + 2);
        Campaign.log(p.name + ' uses the ' + it.n.toLowerCase() + '.');
      }
      Campaign.removeItem(p, id);
      UI.inventory();
      Game.dirty();
    } else if (it.c === 'scroll') {
      // outside combat: scrolls are battle tools; allow reading for info
      UI.dialog({ title: it.n, text: 'The words are only meaningful with the spell known. It will serve in a fight.', actions: [{ label: 'Close', act: 'close' }] });
    } else {
      Campaign.equipItem(p, id);
      UI.inventory();
    }
  }

  function dlgAction(a, d) {
    if (a === 'close') { UI.close(); return; }
    if (a === 'leave-town') { UI.close(); Town.leaveTown(); return; }
    var Gg = Campaign.G;
    if (a === 'camp-rest' || a === 'rest') {
      Campaign.restUntilDawn(true, 'The party rests until dawn.');
      Gg.party.forEach(function (p) { p.fatigue = 0; });
      Campaign.autosave();
      Toast('Rested until dawn. Day ' + Gg.day, 'info');
      UI.close();
      Game.dirty();
      return;
    }
    if (a === 'camp-resthealed' || a === 'resthealed') {
      Dungeon.restUntilHealed();
      Gg.party.forEach(function (p) { p.fatigue = 0; });
      Campaign.autosave();
      UI.close();
      Game.dirty();
      return;
    }
    if (a === 'dungeon.open') { UI.close(); Dungeon.openDoor(+JSON.parse(d.data || '{}').idx); return; }
    if (a === 'dungeon.listen') { Dungeon.listen(); return; }
    if (a === 'dungeon.disarm') { UI.close(); Dungeon.disarm(+JSON.parse(d.data || '{}').idx); return; }
    if (a === 'town.enter-door') { UI.close(); Town.enterInterior(JSON.parse(d.data || '{}').bld); return; }
    var site = d.site ? JSON.parse(d.site) : null;
    Overland.siteAction(a, { adv: d.adv || Gg.activeAdv, site: site });
  }

  function combatAction(a, d) {
    var C = Combat.C;
    if (!C) { UI.close(); return; }
    var Gg = Campaign.G;
    switch (a) {
      case 'menu':
        UI.close();
        Combat.combatMenu();
        break;
      case 'move':
        UI.close();
        Combat.enterMoveMode();
        break;
      case 'endmove':
        Combat.doDefend(Combat.current());
        break;
      case 'attack':
        UI.close();
        Combat.enterAttackMode();
        break;
      case 'attackfire': {
        var at = Combat.current();
        var tg = Combat.attackTargets(at)[0];
        if (tg) { UI.close(); Combat.doAttack(at, tg); }
        break;
      }
      case 'defend':
        UI.close();
        Combat.doDefend(Combat.current());
        break;
      case 'cast':
        UI.close();
        Combat.combatCastPanel();
        break;
      case 'castpick': {
        var opts = Combat.C._castOpts;
        var o = opts[+d.i];
        UI.close();
        var sp = o.sp;
        if (Combat.spellTargetKind(sp) === 'none') Combat.castSpell(Combat.current(), o, null);
        else Combat.enterCastMode(o);
        break;
      }
      case 'cancelcast':
        UI.close();
        Combat.combatMenu();
        break;
      case 'selfcast': {
        var o2 = C.castEntry;
        UI.close();
        if (Combat.spellTargetKind(o2.sp) === 'ally') Combat.castSpell(Combat.current(), o2, Combat.current());
        break;
      }
      case 'turn':
        UI.close();
        Combat.doTurnUndead(Combat.current());
        break;
      case 'item':
        UI.close();
        Combat.combatItemPanel();
        break;
      case 'itempick': {
        UI.close();
        var curA = Combat.current();
        if (curA && Combat.useItemAction(curA, d.id, null)) { Game.dirty(); }
        break;
      }
      case 'flee':
        UI.close();
        Combat.doFlee(Combat.current());
        break;
      case 'auto':
        UI.close();
        var on = Combat.toggleAuto();
        Toast('Auto-fight ' + (on ? 'on — the company will fight for itself.' : 'off.'), 'info');
        break;
    }
  }

  function keyAction(a, d) {
    var Gg = Campaign.G;
    var adv = d.adv || Gg.activeAdv;
    var a2 = ADV.get(adv);
    if (!a2.keyHalves) return;
    var w = Campaign.advWorld(adv);
    if (a === 'ask') {
      // give both halves for free (the wardenship pays)
      if (!Campaign.partyItem(a2.keyHalves.a)) {
        Campaign.addItem(Gg.party[0], a2.keyHalves.a, 1);
        Campaign.log(Gg.party[0].name + ' receives the cantor\u2019s half-key.');
      }
      if (!Campaign.partyItem(a2.keyHalves.b)) {
        Campaign.addItem(Gg.party[0], a2.keyHalves.b, 1);
        Campaign.log(Gg.party[0].name + ' receives the merchant\u2019s half-key.');
      }
      checkJoin();
      UI.close();
    } else if (a === 'take-a') {
      if (!Campaign.partyItem(a2.keyHalves.a)) {
        Campaign.addItem(Gg.party[0], a2.keyHalves.a, 1);
        Campaign.log(Gg.party[0].name + ' receives the cantor\u2019s half-key.');
        Toast('Received: ' + ADV.itemOf(a2.keyHalves.a).n, 'good');
      }
      checkJoin();
      UI.close();
    } else if (a === 'take-b') {
      if (!Campaign.partyItem(a2.keyHalves.b)) {
        Campaign.addItem(Gg.party[0], a2.keyHalves.b, 1);
        Campaign.log(Gg.party[0].name + ' receives the merchant\u2019s half-key.');
        Toast('Received: ' + ADV.itemOf(a2.keyHalves.b).n, 'good');
      }
      checkJoin();
      UI.close();
    } else if (a === 'join') {
      joinKeys();
    }
    function checkJoin() {
      if (Campaign.partyItem(a2.keyHalves.a) && Campaign.partyItem(a2.keyHalves.b)) {
        Toast('Both half-keys are in the party. Present them to the wardenship.', 'info');
      }
    }
    function joinKeys() {
      if (Campaign.partyItem(a2.keyHalves.a) && Campaign.partyItem(a2.keyHalves.b)) {
        Campaign.removeItem(Gg.party[0], a2.keyHalves.a);
        Campaign.removeItem(Gg.party[0], a2.keyHalves.b);
        Campaign.addItem(Gg.party[0], a2.keyHalves.joined, 1);
        Campaign.completeQuest(adv, a2.keyHalves.quest);
        Toast('The halves join: the ' + ADV.itemOf(a2.keyHalves.joined).n, 'good');
      }
      UI.close();
    }
  }

  function enterPhaseFromSave() {
    var Gg = Campaign.G;
    if (!Gg || !Gg.loc) return;
    var kind = Gg.loc.kind;
    if (kind === 'overland') Overland.enter(Gg.loc.adv);
    else if (kind === 'town') Town.enter(Gg.loc.adv);
    else if (kind === 'building') {
      Town.enter(Gg.loc.adv);
      Town.enterInterior(Gg.loc.bld);
    }
    else if (kind === 'dungeon') Dungeon.enter(Gg.loc.adv, Gg.loc.floor, { x: Gg.loc.x, y: Gg.loc.y });
    Game.dirty();
  }

  /* ---------------- init ---------------- */
  function init() {
    cv = document.getElementById('cv');
    Toast.init();
    View.init(cv);
    NavPad.init();
    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('orientationchange', function () { setTimeout(resize, 250); });

    // action delegation
    document.addEventListener('click', function (e) {
      var t = e.target;
      while (t && t !== document) {
        if (t.dataset && t.dataset.act) {
          act(t.dataset.act, t.dataset);
          return;
        }
        t = t.parentNode;
      }
    });

    // canvas tap
    cv.addEventListener('click', function (e) {
      var Gg = Campaign.G;
      if (!Gg || UI.isOpen()) return;
      var r = cv.getBoundingClientRect();
      var px = (e.clientX - r.left) * (cv.width / r.width);
      var py = (e.clientY - r.top) * (cv.height / r.height);
      if (Gg.phase === 'overland' && olLayout) Overland.tap(px, py, olLayout);
      else if (Gg.phase === 'combat') {
        if (!Combat.tap(px, py)) {
          // tap current actor = menu
          var C = Combat.C;
          if (C && C.state === 'player' && C.mode === 'menu') Combat.combatMenu();
        }
      } else if (Gg.phase === 'town' || Gg.phase === 'building' || Gg.phase === 'dungeon') {
        NavPad.action();
      }
    });

    // track phase for pad visibility
    var lastPhase = null;
    setInterval(function () {
      var Gg = Campaign.G;
      var ph = Gg ? Gg.phase : 'title';
      if (ph !== lastPhase) {
        lastPhase = ph;
        setPhase(ph);
        dirty();
      }
      // keep watch fresh (clock)
      Watch.render();
    }, 500);

    UI.title();
    loop();
  }

  return {
    init: init, dirty: dirty, onPhase: onPhase,
    get needRender() { return needRender; },
    wake: function () { needRender = true; }
  };
})();

// Campaign.setPhase and friends should wake the render loop
(function () {
  var origSetPhase = Campaign.setPhase;
  Campaign.setPhase = function (phase, loc) {
    origSetPhase(phase, loc);
    Game.wake();
  };
})();

window.addEventListener('load', function () {
  Game.init();
});

if (typeof module !== 'undefined' && module.exports) module.exports = { Game: Game };
