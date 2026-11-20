/* ============================================================
   EMBERFALL — modules.js
   Core utilities: deterministic seeded RNG with named substreams
   (so later features never shift existing generated content),
   dice, math, DOM helpers, toast, save/load, formatting.
   ============================================================ */
'use strict';

/* ---------- deterministic RNG ---------- */
// xmur3 string hash -> 32-bit seed
function xmur3(str) {
  var h = 1779033703 ^ str.length;
  for (var i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function () {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
  };
}
// mulberry32 PRNG
function mulberry32(seed) {
  var a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    var t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
// Streams: a base seed plus named substreams. Each name yields the
// same sequence on every load, independent of other names.
function Streams(seedStr) {
  this.seed = String(seedStr);
  this.cache = {};
}
Streams.prototype.rng = function (name) {
  var key = this.seed + ':' + name;
  if (!this.cache[key]) {
    var h = xmur3(key);
    this.cache[key] = mulberry32(h());
  }
  return this.cache[key];
};
Streams.prototype.int = function (name, min, max) { // inclusive
  var r = this.rng(name);
  return min + Math.floor(r() * (max - min + 1));
};
Streams.prototype.pick = function (name, arr) {
  return arr[Math.floor(this.rng(name)() * arr.length) % arr.length];
};
Streams.prototype.shuff = function (name, arr) {
  var r = this.rng(name), a = arr.slice(), i, j, t;
  for (i = a.length - 1; i > 0; i--) {
    j = Math.floor(r() * (i + 1)); t = a[i]; a[i] = a[j]; a[j] = t;
  }
  return a;
};
Streams.prototype.f64 = function (name) { return this.rng(name)(); };

/* ---------- dice ---------- */
var M = {
  dice: function (sides, n, mod) {
    n = n || 1; mod = mod || 0;
    var out = 0, i;
    for (i = 0; i < n; i++) out += 1 + Math.floor(Math.random() * sides);
    return Math.max(0, out + mod);
  },
  d6: function (n, mod) { return M.dice(6, n, mod); },
  d20: function (mod) { return M.dice(20, 1, mod); },
  diceDesc: function (n, sides) {
    var r = mulberry32(1234); // stable for display
    return String(n) + 'd' + sides;
  },
  pick: function (arr) { return arr[Math.floor(Math.random() * arr.length)]; },
  chance: function (p) { return Math.random() * 100 < p; },
  clamp: function (v, a, b) { return v < a ? a : v > b ? b : v; },
  lerp: function (a, b, t) { return a + (b - a) * t; },
  dist: function (x1, y1, x2, y2) { return Math.hypot(x2 - x1, y2 - y1); },
  angDiff: function (a, b) {
    var d = (b - a) % (Math.PI * 2);
    if (d > Math.PI) d -= Math.PI * 2;
    if (d < -Math.PI) d += Math.PI * 2;
    return d;
  },
  // line of sight on a grid (walls block). grid: array of wall cells (0/1), w,h
  los: function (grid, w, h, x1, y1, x2, y2) {
    var dx = x2 - x1, dy = y2 - y1;
    var steps = Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) * 8);
    if (steps < 1) return true;
    var i, x, y;
    for (i = 1; i < steps; i++) {
      x = Math.round(x1 + dx * i / steps);
      y = Math.round(y1 + dy * i / steps);
      if (grid[y * w + x]) return false;
    }
    return true;
  },
  bfs: function (grid, w, h, start, passable) {
    var seen = new Uint8Array(w * h), q = [start], qi = 0;
    seen[start] = 1;
    while (qi < q.length) {
      var c = q[qi++], cx = c % w, cy = (c / w) | 0;
      var nbs = [c - 1, c + 1, c - w, c + w];
      var nxs = [(cx - 1 + w) % w, (cx + 1) % w, cx, cx];
      var nys = [cy, cy, (cy - 1 + h) % h, (cy + 1) % h];
      for (var i = 0; i < 4; i++) {
        var n = nbs[i];
        if (n < 0 || n >= w * h) continue;
        if (seen[n]) continue;
        if (passable && !passable(n, nxs[i], nys[i])) continue;
        seen[n] = 1; q.push(n);
      }
    }
    return seen;
  },
  hashStr: function (s) {
    var h = 2166136261;
    for (var i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i); h = Math.imul(h, 16777619);
    }
    return (h >>> 0).toString(36);
  }
};

/* ---------- DOM helpers ---------- */
function $(sel, root) { return (root || document).querySelector(sel); }
function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
function el(tag, attrs, children) {
  var e = document.createElement(tag);
  if (attrs) for (var k in attrs) {
    if (k === 'class') e.className = attrs[k];
    else if (k === 'html') e.innerHTML = attrs[k];
    else if (k === 'style') e.style.cssText = attrs[k];
    else if (k.indexOf('on') === 0) e.addEventListener(k.slice(2), attrs[k]);
    else if (attrs[k] != null) e.setAttribute(k, attrs[k]);
  }
  if (children != null) {
    (Array.isArray(children) ? children : [children]).forEach(function (c) {
      if (c == null) return;
      e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
  }
  return e;
}
function clearNode(e) { while (e.firstChild) e.removeChild(e.firstChild); }
function fmtGold(g) {
  g = Math.floor(g || 0);
  if (g < 1000) return g + ' gp';
  if (g < 100000) return (g / 1000).toFixed(g % 1000 ? 1 : 0) + ' kg';
  return (g / 100000).toFixed(g % 100000 ? 2 : 0) + ' mg';
}
function fmtTime(min) {
  min = ((min % 1440) + 1440) % 1440;
  var h = Math.floor(min / 60), m = Math.floor(min % 60);
  return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
}
function fmtDay(day) {
  return 'Day ' + day;
}
function fmtNum(n) {
  n = Math.round(n || 0);
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}
M.fmtGold = fmtGold;
M.fmtTime = fmtTime;
M.fmtDay = fmtDay;
M.fmtNum = fmtNum;

/* ---------- toast ---------- */
var Toast = (function () {
  var box = null;
  function show(msg, ms) {
    if (!box) return;
    var t = el('div', { class: 'toastmsg' }, msg);
    box.appendChild(t);
    requestAnimationFrame(function () { t.classList.add('show'); });
    setTimeout(function () {
      t.classList.remove('show');
      setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 350);
    }, ms || 2600);
    while (box.children.length > 3) box.removeChild(box.firstChild);
  }
  function toast(msg, kind) {
    if (!box) return;
    var t = el('div', { class: 'toastmsg' + (kind ? ' ' + kind : '') }, msg);
    box.appendChild(t);
    requestAnimationFrame(function () { t.classList.add('show'); });
    setTimeout(function () {
      t.classList.remove('show');
      setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 350);
    }, kind === 'warn' ? 3400 : 2600);
    while (box.children.length > 3) box.removeChild(box.firstChild);
  }
  toast.show = show;
  toast.init = function () { box = $('#toast'); };
  return toast;
})();

/* ---------- save / load (localStorage) ---------- */
var SaveSys = {
  PREFIX: 'emberfall_save_',
  VERSION: 1,
  keys: function () {
    var out = [], i;
    for (i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i);
      if (k.indexOf(this.PREFIX) === 0) out.push(k.slice(this.PREFIX.length));
    }
    return out;
  },
  save: function (slot, state) {
    var data = { v: this.VERSION, when: Date.now(), state: state };
    try {
      localStorage.setItem(this.PREFIX + slot, JSON.stringify(data));
      return true;
    } catch (e) { Toast.show('Could not save (storage full?)'); return false; }
  },
  load: function (slot) {
    try {
      var raw = localStorage.getItem(this.PREFIX + slot);
      if (!raw) return null;
      var data = JSON.parse(raw);
      return data && data.state ? data : null;
    } catch (e) { return null; }
  },
  meta: function (slot) {
    var d = this.load(slot);
    if (!d) return null;
    var s = d.state, m = {};
    if (typeof s === 'string') { try { s = JSON.parse(s); } catch (e) { s = {}; } }
    if (s && s.day) { m.day = s.day; m.adv = s.activeAdv; }
    if (s.party) {
      m.party = s.party.map(function (p) { return p.name + ' ' + p.cls + ' ' + p.level; }).join(', ');
    }
    m.when = d.when;
    return m;
  },
  erase: function (slot) { localStorage.removeItem(this.PREFIX + slot); }
};

/* ---------- name tables (original) ---------- */
var NAMES = {
  human: ['Aldren','Brisa','Corin','Dessa','Edric','Fenna','Garret','Hela','Isolde','Jorah','Kessa','Loran','Maren','Nessa','Osric','Petra','Quentin','Renna','Sable','Tamsin','Ulric','Vess','Wrenne','Yorick'],
  dwarf: ['Borin','Dagnel','Eithel','Faramir','Grima','Haldir','Ismir','Karg','Lundir','Morwen','Narvik','Oskari','Perrin','Rurik','Sindir','Tove','Ulrik','Viggo','Wendel','Yrsa','Aldur','Bryn','Dolga','Eirik'],
  elf: ['Aelwen','Calen','Eldrin','Fael','Ilyana','Lael','Myrddin','Naelis','Orin','Sael','Tilion','Ulwen','Vael','Wynd','Ysra','Aerion','Cael','Doriann','Elenhil','Finneas','Gael','Ilyr','Sylwen','Thalwen'],
  gnome: ['Bink','Diddle','Fizz','Grumble','Hob','Kip','Merry','Nib','Pip','Quip','Rill','Scrim','Tock','Wick','Wumble','Zipp','Bram','Dink','Flick','Gerrit','Lolly','Mote','Pebble','Tansy'],
  halfelf: ['Alric','Branwen','Cerys','Dorian','Elowen','Ffion','Gareth','Hollis','Idris','Jonath','Keira','Lys','Meira','Nicol','Owen','Rhys','Seren','Tali','Wesley','Yara','Arienne','Cadwal','Delyth','Einion'],
  halfling: ['Berry','Clover','Dot','Fern','Hazel','Ivor','Juniper','Kip','Lark','Moss','Nell','Pip','Roe','Sage','Thistledown','Willow','Bramble','Clove','Daisy','Honey','Mungo','Oat','Parsley','Tansy']
};
function randomName(race, used) {
  var pool = NAMES[race] || NAMES.human, tries = 0, name;
  do {
    name = M.pick(pool);
    tries++;
  } while (used && used.indexOf(name) >= 0 && tries < 40);
  return name;
}
function titleCase(s) {
  return s.replace(/_/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); });
}

if (typeof module !== 'undefined' && module.exports)
  module.exports = { M: M, Streams: Streams, mulberry32: mulberry32, xmur3: xmur3,
    Toast: Toast, SaveSys: SaveSys, NAMES: NAMES, randomName: randomName, titleCase: titleCase,
    $: $, $all: $all, el: el, clearNode: clearNode, fmtGold: fmtGold, fmtTime: fmtTime, fmtDay: fmtDay };
