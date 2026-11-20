/* ============================================================
   EMBERFALL — navpad.js
   Input: the on-screen pad (forward/back, turn, sidestep,
   action, menu) and keyboard. Routes to the current scene:
   3D scenes use turn/step semantics; tactical scenes (overland,
   combat) use N/S/E/W stepping. Also canvas taps.
   ============================================================ */
'use strict';

var NavPad = (function () {
  var KEY = {
    'ArrowUp': 'fwd', 'KeyW': 'fwd',
    'ArrowDown': 'back', 'KeyS': 'back',
    'ArrowLeft': 'tleft', 'ArrowRight': 'tright',
    'KeyA': 'tside-l', 'KeyD': 'tside-r',
    'KeyQ': 'tside-l', 'KeyE': 'tside-r',
    'Space': 'act',
    'Enter': 'enter', 'NumpadEnter': 'enter',
    'KeyF': 'search', 'KeyR': 'camp',
    'KeyM': 'map', 'KeyI': 'inventory', 'KeyJ': 'journal',
    'KeyB': 'bestiary', 'KeyP': 'party', 'Escape': 'menu',
    'Digit1': 'sheet1', 'Digit2': 'sheet2', 'Digit3': 'sheet3',
    'Digit4': 'sheet4', 'Digit5': 'sheet5', 'Digit6': 'sheet6'
  };

  function is3D() {
    var Gg = Campaign.G;
    return Gg && (Gg.phase === 'town' || Gg.phase === 'building' || Gg.phase === 'dungeon');
  }

  function move(dx, dy) {
    var Gg = Campaign.G;
    if (!Gg || UI.isOpen()) return;
    if (Gg.phase === 'overland') Overland.step(dx, dy);
    else if (Gg.phase === 'combat') combatStep(dx, dy);
    else if (Gg.phase === 'town' || Gg.phase === 'building' || Gg.phase === 'dungeon') {
      (Gg.phase === 'dungeon' ? Dungeon : Town).step(dx, dy);
    }
  }

  function combatStep(dx, dy) {
    var C = Combat.C;
    if (!C || C.state !== 'player') return;
    var a = Combat.current();
    if (!a) return;
    if (C.mode === 'move') {
      var cells = Combat.reachableCells(a);
      var idx = (a.y + dy) * C.grid.w + (a.x + dx);
      if (cells[idx] != null) { Combat.doMove(a, a.x + dx, a.y + dy); return; }
    }
    // if in menu, a step starts a single-square move
    if (C.mode === 'menu') {
      Combat.enterMoveMode();
      var cells2 = Combat.reachableCells(a);
      var idx2 = (a.y + dy) * C.grid.w + (a.x + dx);
      if (cells2[idx2] != null) Combat.doMove(a, a.x + dx, a.y + dy);
    }
  }

  function turn(rad) {
    View.glideDir(View.dir + rad);
    Game.dirty();
  }

  function sidestep(sign) {
    // move perpendicular to facing
    var dx = -Math.sin(View.dir) * sign, dy = Math.cos(View.dir) * sign;
    var Gg = Campaign.G;
    var nx = Math.round(Gg.loc.x + dx), ny = Math.round(Gg.loc.y + dy);
    (Gg.phase === 'dungeon' ? Dungeon : Town).step(nx - Gg.loc.x, ny - Gg.loc.y);
  }

  function action() {
    var Gg = Campaign.G;
    if (!Gg) return;
    if (Gg.phase === 'overland') Overland.stepSiteButton();
    else if (Gg.phase === 'town' || Gg.phase === 'building') Town.interact();
    else if (Gg.phase === 'dungeon') Dungeon.interact();
    else if (Gg.phase === 'combat') Combat.combatMenu();
  }

  function handle(pad) {
    var Gg = Campaign.G;
    if (!Gg) return;
    if (pad === 'fwd') {
      if (is3D()) {
        // step forward one square along facing
        var dx = Math.round(Math.cos(View.dir)), dy = Math.round(Math.sin(View.dir));
        move(dx, dy);
      } else move(0, -1);
    } else if (pad === 'back') {
      if (is3D()) {
        var dx2 = Math.round(-Math.cos(View.dir)), dy2 = Math.round(-Math.sin(View.dir));
        move(dx2, dy2);
      } else {
        if (UI.isOpen()) UI.close();
        else move(0, 1);
      }
    } else if (pad === 'tleft') {
      if (is3D()) turn(-Math.PI / 2);
      else move(-1, 0);
    } else if (pad === 'tright') {
      if (is3D()) turn(Math.PI / 2);
      else move(1, 0);
    } else if (pad === 'tside-l') {
      if (is3D()) sidestep(-1);
      else { if (UI.isOpen()) UI.close(); }
    } else if (pad === 'tside-r') {
      if (is3D()) sidestep(1);
      else { if (UI.isOpen()) UI.close(); }
    } else if (pad === 'act') {
      action();
    } else if (pad === 'menu') {
      menuOpen();
    } else if (pad === 'map') {
      MapView.open();
    }
  }

  function menuOpen() {
    var h = '<div class="panel opts"><div class="panel-h">Menu</div>';
    h += '<button class="btn menu-row" data-act="party">The Party</button>';
    h += '<button class="btn menu-row" data-act="map.open">The Map</button>';
    h += '<button class="btn menu-row" data-act="journal.open">The Journal</button>';
    h += '<button class="btn menu-row" data-act="bestiary.open">The Bestiary</button>';
    h += '<button class="btn menu-row" data-act="save.open">Save</button>';
    h += '<button class="btn menu-row" data-act="load.open">Load</button>';
    h += '<button class="btn menu-row" data-act="opts.open">Options</button>';
    h += '<div class="sheet-actions"><button class="btn" data-act="close">Close</button></div></div>';
    UI.open(h, 'opts-open');
  }

  function init() {
    // pad buttons
    document.querySelectorAll('#pad [data-pad]').forEach(function (b) {
      b.addEventListener('click', function (e) {
        e.preventDefault();
        handle(b.dataset.pad);
      });
    });
    // keyboard
    document.addEventListener('keydown', function (e) {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
      var k = KEY[e.code];
      if (!k) return;
      e.preventDefault();
      var Gg = Campaign.G;
      if (k === 'map') { MapView.open(); return; }
      if (k === 'inventory') { UI.inventory(); return; }
      if (k === 'journal') { Journal.open(); return; }
      if (k === 'bestiary') { Bestiary.open(); return; }
      if (k === 'party') { UI.sheet(0); return; }
      if (k.indexOf('sheet') === 0) { UI.sheet(+k.slice(5) - 1); return; }
      if (k === 'menu') { if (UI.isOpen()) UI.close(); else menuOpen(); return; }
      if (k === 'search') {
        if (Gg && Gg.phase === 'dungeon') Dungeon.search();
        else if (Gg && Gg.phase === 'overland') Toast('There is nothing here to search.', 'info');
        else if (Gg && (Gg.phase === 'town' || Gg.phase === 'building')) Town.interact();
        return;
      }
      if (k === 'camp') {
        if (Gg && Gg.phase === 'overland') Overland.campDialog();
        else Toast('You can only camp in the open wilds.', 'info');
        return;
      }
      if (k === 'back') { if (UI.isOpen()) { UI.close(); return; } handle('back'); return; }
      if (k === 'enter') {
        // Enter confirms the primary action of an open dialog
        // (first button: 'Enter {town}', 'Descend', 'Go in', …).
        // With no panel open it acts like Space (interact / step site).
        if (UI.isOpen()) {
          var r = UI.root();
          var b = r && r.querySelector ? r.querySelector('.dlg-actions .btn') : null;
          if (b && b.click) { b.click(); }
          return;
        }
        handle('act');
        return;
      }
      if (UI.isOpen() && (k === 'act')) { UI.close(); return; }
      handle(k);
    });
    // pad visibility per phase
    Game.onPhase(function (phase) {
      var pad = document.getElementById('pad');
      var bar = document.getElementById('bar');
      var watch = document.getElementById('watch');
      var playing = phase && phase !== 'title' && phase !== 'create' && !UI.isOpen();
      pad.className = playing ? '' : 'hidden';
      bar.className = playing ? '' : 'hidden';
      watch.className = phase && phase !== 'title' && phase !== 'create' ? '' : 'hidden';
    });
  }

  return { init: init, handle: handle, action: action };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = { NavPad: NavPad };
