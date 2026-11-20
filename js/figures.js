/* ============================================================
   EMBERFALL — figures.js
   All art drawn in code at start-up: wall textures, monster
   sprites, character portraits, item icons, overland site
   icons. Deterministic per id (seeded RNG), cached canvases.
   No image files anywhere in the game.
   ============================================================ */
'use strict';

var Fig = (function () {
  var cache = {};

  function cv(w, h) {
    var c = document.createElement('canvas');
    c.width = w; c.height = h;
    return c;
  }
  function hashStr(s) {
    var h = 2166136261;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function rngFor(seed) { return mulberry32(hashStr(seed)); }
  function shade(hex, f) {
    // hex '#rrggbb', f -1..1 (negative darkens, positive lightens)
    var r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
    if (f >= 0) { r += (255 - r) * f; g += (255 - g) * f; b += (255 - b) * f; }
    else { r *= 1 + f; g *= 1 + f; b *= 1 + f; }
    return 'rgb(' + (r | 0) + ',' + (g | 0) + ',' + (b | 0) + ')';
  }

  /* ---------------- wall textures (64x64) ---------------- */
  var TEX = {
    1: 'stone', 2: 'brick', 3: 'rubble', 4: 'mossy', 5: 'marble',
    6: 'wood', 7: 'building', 8: 'painted', 9: 'townwall', 10: 'tree', 11: 'door', 12: 'locked'
  };
  function texture(id) {
    if (cache['tex' + id]) return cache['tex' + id];
    var c = cv(64, 64), g = c.getContext('2d');
    var r = rngFor('tex' + id);
    function noise(base, amt, n) {
      for (var i = 0; i < n; i++) {
        g.fillStyle = shade(base, (r() - 0.5) * amt);
        g.fillRect(r() * 64, r() * 64, 1 + r() * 2, 1 + r() * 2);
      }
    }
    var kind = TEX[id] || 'stone';
    var i;
    if (kind === 'stone' || kind === 'townwall') {
      var base = kind === 'townwall' ? '#5a564e' : '#6b675f';
      g.fillStyle = base; g.fillRect(0, 0, 64, 64);
      // ashlar blocks
      for (var y = 0; y < 64; y += 16) {
        var off = (y / 16) % 2 ? 8 : 0;
        for (var x = -8; x < 64; x += 16) {
          g.fillStyle = shade(base, (r() - 0.5) * 0.16);
          g.fillRect(x + off + 1, y + 1, 14, 14);
        }
      }
      g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 1;
      for (y = 0; y <= 64; y += 16) { g.beginPath(); g.moveTo(0, y + 0.5); g.lineTo(64, y + 0.5); g.stroke(); }
      noise(base, 0.2, 140);
    } else if (kind === 'brick') {
      g.fillStyle = '#7a4a38'; g.fillRect(0, 0, 64, 64);
      for (y = 0; y < 64; y += 8) {
        var off2 = (y / 8) % 2 ? 8 : 0;
        for (x = -8; x < 64; x += 16) {
          g.fillStyle = shade('#8a5540', (r() - 0.5) * 0.25);
          g.fillRect(x + off2 + 1, y + 1, 14, 6);
        }
      }
      noise('#8a5540', 0.2, 120);
    } else if (kind === 'rubble') {
      g.fillStyle = '#4f4a42'; g.fillRect(0, 0, 64, 64);
      for (i = 0; i < 90; i++) {
        g.fillStyle = shade('#5d564c', (r() - 0.5) * 0.5);
        g.beginPath();
        g.arc(r() * 64, r() * 64, 2 + r() * 5, 0, 7);
        g.fill();
      }
    } else if (kind === 'mossy') {
      g.fillStyle = '#5f6156'; g.fillRect(0, 0, 64, 64);
      for (y = 0; y < 64; y += 16) {
        var off3 = (y / 16) % 2 ? 8 : 0;
        for (x = -8; x < 64; x += 16) {
          g.fillStyle = shade('#6b6d60', (r() - 0.5) * 0.2);
          g.fillRect(x + off3 + 1, y + 1, 14, 14);
        }
      }
      for (i = 0; i < 26; i++) {
        g.fillStyle = shade('#3f5d33', r() * 0.4);
        g.beginPath(); g.arc(r() * 64, r() * 64, 2 + r() * 6, 0, 7); g.fill();
      }
    } else if (kind === 'marble') {
      g.fillStyle = '#c9c4b8'; g.fillRect(0, 0, 64, 64);
      for (i = 0; i < 8; i++) {
        g.strokeStyle = 'rgba(120,110,95,0.35)'; g.lineWidth = 1;
        g.beginPath();
        var px = r() * 64, py = 0;
        g.moveTo(px, py);
        while (py < 64) { py += 4 + r() * 6; px += (r() - 0.5) * 8; g.lineTo(px, py); }
        g.stroke();
      }
      noise('#c9c4b8', 0.1, 80);
    } else if (kind === 'wood') {
      g.fillStyle = '#5d452c'; g.fillRect(0, 0, 64, 64);
      for (x = 0; x < 64; x += 8) {
        g.fillStyle = shade('#6b4f30', (r() - 0.5) * 0.3);
        g.fillRect(x + 1, 0, 6, 64);
        g.strokeStyle = 'rgba(0,0,0,0.3)';
        g.beginPath(); g.moveTo(x + 0.5, 0); g.lineTo(x + 0.5, 64); g.stroke();
      }
      for (i = 0; i < 6; i++) {
        g.fillStyle = 'rgba(40,25,12,0.6)';
        g.beginPath(); g.ellipse(r() * 64, r() * 64, 2, 3, 0, 0, 7); g.fill();
      }
    } else if (kind === 'building') {
      g.fillStyle = '#8a7a5c'; g.fillRect(0, 0, 64, 64);
      g.strokeStyle = '#4d3d26'; g.lineWidth = 4;
      g.strokeRect(2, 2, 60, 60);
      g.beginPath(); g.moveTo(32, 2); g.lineTo(32, 62); g.stroke();
      g.beginPath(); g.moveTo(2, 32); g.lineTo(62, 32); g.stroke();
      noise('#8a7a5c', 0.15, 90);
    } else if (kind === 'painted') {
      g.fillStyle = '#b3987a'; g.fillRect(0, 0, 64, 64);
      g.fillStyle = 'rgba(120,90,60,0.4)'; g.fillRect(0, 48, 64, 16);
      noise('#b3987a', 0.12, 70);
    } else if (kind === 'tree') {
      g.fillStyle = '#243418'; g.fillRect(0, 0, 64, 64);
      for (i = 0; i < 60; i++) {
        g.fillStyle = shade('#2f4527', (r() - 0.5) * 0.5);
        g.beginPath(); g.arc(r() * 64, r() * 44, 4 + r() * 8, 0, 7); g.fill();
      }
      g.fillStyle = '#4d3820'; g.fillRect(28, 44, 8, 20);
      for (i = 0; i < 8; i++) { g.fillStyle = shade('#4d3820', (r() - 0.5) * 0.4); g.fillRect(28 + r() * 8, 44 + r() * 20, 2, 4); }
    } else if (kind === 'door' || kind === 'locked') {
      g.fillStyle = '#4d3820'; g.fillRect(0, 0, 64, 64);
      for (x = 0; x < 64; x += 10) {
        g.fillStyle = shade('#5d4426', (r() - 0.5) * 0.3);
        g.fillRect(x + 1, 0, 8, 64);
      }
      g.fillStyle = '#3a3a3a';
      g.fillRect(0, 10, 64, 4); g.fillRect(0, 50, 64, 4);
      g.fillStyle = kind === 'locked' ? '#8a2020' : '#6a6a6a';
      g.fillRect(24, 28, 16, 12);
      g.fillStyle = '#222'; g.beginPath(); g.arc(32, 34, 2.5, 0, 7); g.fill();
    }
    cache['tex' + id] = c;
    return c;
  }

  /* ---------------- monster sprites (32x48) ---------------- */
  function archetypeOf(id, mon) {
    var s = id;
    if (/dragon|wyrm|drake|wyvern/.test(s)) return 'wyvern';
    if (/beholder/.test(s)) return 'beholder';
    if (/golem|jelly|slime|puddle|automaton/.test(s)) return 'blob';
    if (/spider/.test(s)) return 'spider';
    if (/bat/.test(s)) return 'bat';
    if (/snake|worm|centipede|serpent/.test(s)) return 'serpent';
    if (/rat|mole|weasel|squirrel|ferret|shrew|fox|boar|badger/.test(s)) return 'beastlet';
    if (/wolf|bear|horse|camel|kangaroo|elk|deer|moose|bison|ape|gorilla|monkey|lemur|otter|beaver|rabbit|hippo|rhino|elephant|walrus|narwhal|turtle|squid|crab/.test(s)) return 'beast';
    if (/giant|troll|ettin|ogre|cyclops/.test(s)) return 'brute';
    if (mon && mon.turn) return 'undead';
    if (/dragon/.test(s)) return 'wyvern';
    if (/eye|ocropus|mind|flayer|octopus/.test(s)) return 'aberrant';
    return 'humanoid';
  }
  function monster(id) {
    var key = 'mon:' + id;
    if (cache[key]) return cache[key];
    var mon = (typeof MONSTERS !== 'undefined' && MONSTERS[id]) || { n:id, size:'m' };
    var c = cv(32, 48), g = c.getContext('2d');
    var r = rngFor('mon:' + id);
    var hue = r() * 360;
    function hsl(h, s, l) { return 'hsl(' + (h | 0) + ',' + (s | 0) + '%,' + (l | 0) + '%)'; }
    var base = hsl(hue, 35 + r() * 30, 38 + r() * 14);
    var dark = hsl(hue, 40, 24);
    var light = hsl(hue, 30, 55);
    var arch = archetypeOf(id, mon);
    var big = mon.size === 'l' || mon.size === 'h';
    g.fillStyle = base;
    function blob(cx, cy, rx, ry) { g.beginPath(); g.ellipse(cx, cy, rx, ry, 0, 0, 7); g.fill(); }
    if (arch === 'wyvern') {
      // wings
      g.fillStyle = dark;
      g.beginPath(); g.moveTo(16, 20); g.lineTo(0, 8); g.lineTo(8, 24); g.closePath(); g.fill();
      g.beginPath(); g.moveTo(16, 20); g.lineTo(32, 8); g.lineTo(24, 24); g.closePath(); g.fill();
      // body
      g.fillStyle = base; blob(16, 28, 7, 12);
      // neck + head
      g.fillRect(13, 12, 6, 12); blob(16, 11, 5, 4);
      // tail
      g.strokeStyle = base; g.lineWidth = 3; g.beginPath(); g.moveTo(16, 40); g.quadraticCurveTo(24, 46, 28, 40); g.stroke();
      g.fillStyle = light; blob(14, 10, 1.6, 1.2); blob(18, 10, 1.6, 1.2); // eyes
      g.fillStyle = '#ffd24a'; g.fillRect(13, 10, 2, 2); g.fillRect(17, 10, 2, 2);
      // legs
      g.fillStyle = dark; g.fillRect(11, 38, 3, 7); g.fillRect(18, 38, 3, 7);
    } else if (arch === 'beholder') {
      g.fillStyle = hsl(hue, 45, 45); blob(16, 24, 11, 12);
      g.fillStyle = hsl(hue, 45, 60); blob(16, 20, 8, 8);
      // eye stalks
      g.strokeStyle = hsl(hue, 40, 35); g.lineWidth = 1.5;
      for (var i = 0; i < 6; i++) {
        var a = (i / 6) * 6.28;
        g.beginPath(); g.moveTo(16, 24); g.lineTo(16 + Math.cos(a) * 12, 24 + Math.sin(a) * 12); g.stroke();
        g.fillStyle = '#e8e8e8'; g.beginPath(); g.arc(16 + Math.cos(a) * 12, 24 + Math.sin(a) * 12, 2, 0, 7); g.fill();
        g.fillStyle = '#c03030'; g.beginPath(); g.arc(16 + Math.cos(a) * 12, 24 + Math.sin(a) * 12, 1, 0, 7); g.fill();
      }
      g.fillStyle = '#fff'; g.beginPath(); g.arc(16, 22, 4, 0, 7); g.fill();
      g.fillStyle = '#7020a0'; g.beginPath(); g.arc(16, 22, 2, 0, 7); g.fill();
    } else if (arch === 'blob') {
      g.fillStyle = base;
      g.beginPath();
      g.moveTo(4, 44);
      g.quadraticCurveTo(2, 24, 16, 16);
      g.quadraticCurveTo(30, 24, 28, 44);
      g.closePath(); g.fill();
      g.fillStyle = light; blob(12, 30, 4, 5);
      g.fillStyle = '#111'; blob(12, 24, 1.5, 1.5); blob(20, 24, 1.5, 1.5);
    } else if (arch === 'spider') {
      g.strokeStyle = dark; g.lineWidth = 2;
      for (i = 0; i < 4; i++) {
        var ly = 24 + i * 4;
        g.beginPath(); g.moveTo(10, ly); g.lineTo(1, ly - 6 + i * 2); g.stroke();
        g.beginPath(); g.moveTo(22, ly); g.lineTo(31, ly - 6 + i * 2); g.stroke();
      }
      g.fillStyle = base; blob(16, 28, 8, 9); blob(16, 16, 5, 5);
      g.fillStyle = '#ffd24a';
      for (i = 0; i < 4; i++) { g.beginPath(); g.arc(14 + (i % 2) * 4, 14 + (i / 2) * 3, 1, 0, 7); g.fill(); }
    } else if (arch === 'bat') {
      g.fillStyle = dark;
      g.beginPath(); g.moveTo(16, 20); g.lineTo(0, 10); g.lineTo(6, 26); g.closePath(); g.fill();
      g.beginPath(); g.moveTo(16, 20); g.lineTo(32, 10); g.lineTo(26, 26); g.closePath(); g.fill();
      g.fillStyle = base; blob(16, 22, 6, 8); blob(16, 13, 4, 4);
      g.fillStyle = '#ff5050'; blob(14, 13, 1.2, 1.2); blob(18, 13, 1.2, 1.2);
      // fangs
      g.fillStyle = '#fff'; g.fillRect(14, 16, 1, 2); g.fillRect(17, 16, 1, 2);
    } else if (arch === 'serpent') {
      g.strokeStyle = base; g.lineWidth = 6;
      g.beginPath();
      g.moveTo(4, 42);
      g.bezierCurveTo(20, 44, 12, 30, 24, 28);
      g.bezierCurveTo(30, 27, 28, 18, 18, 16);
      g.stroke();
      g.fillStyle = base; blob(17, 15, 5, 4);
      g.fillStyle = '#ffd24a'; blob(15, 14, 1.2, 1.2); blob(19, 14, 1.2, 1.2);
      g.strokeStyle = light; g.lineWidth = 1;
      g.beginPath(); g.moveTo(17, 19); g.lineTo(14, 22); g.moveTo(17, 19); g.lineTo(20, 22); g.stroke();
    } else if (arch === 'beastlet') {
      g.fillStyle = base; blob(14, 30, 9, 7); blob(24, 26, 5, 4);
      g.fillStyle = dark;
      g.fillRect(9, 34, 3, 8); g.fillRect(18, 34, 3, 8);
      g.fillRect(23, 32, 3, 7);
      // ears + eye + tail
      g.fillStyle = base; g.beginPath(); g.moveTo(26, 23); g.lineTo(28, 19); g.lineTo(29, 24); g.closePath(); g.fill();
      g.fillStyle = '#111'; blob(26, 26, 1, 1);
      g.strokeStyle = base; g.lineWidth = 2; g.beginPath(); g.moveTo(6, 30); g.quadraticCurveTo(1, 28, 2, 24); g.stroke();
    } else if (arch === 'beast') {
      var sc = big ? 1.15 : 1;
      g.save(); g.translate(16, 30); g.scale(sc, sc); g.translate(-16, -30);
      g.fillStyle = base; blob(14, 30, 11, 8); blob(25, 22, 6, 5);
      g.fillStyle = dark;
      g.fillRect(8, 34, 4, 10); g.fillRect(17, 34, 4, 10);
      g.fillRect(20, 30, 4, 10);
      g.fillStyle = base; g.beginPath(); g.moveTo(28, 19); g.lineTo(30, 14); g.lineTo(31, 20); g.closePath(); g.fill();
      g.fillStyle = '#ffd24a'; blob(27, 22, 1.3, 1.3);
      g.restore();
    } else if (arch === 'brute') {
      g.fillStyle = base;
      blob(16, 26, 11, 14);          // torso
      blob(16, 9, 6, 6);            // head
      g.fillStyle = dark;
      g.fillRect(4, 18, 5, 14);     // arms
      g.fillRect(23, 18, 5, 14);
      g.fillRect(10, 36, 5, 10);    // legs
      g.fillRect(17, 36, 5, 10);
      g.fillStyle = '#ffd24a'; blob(14, 9, 1.4, 1.4); blob(18, 9, 1.4, 1.4);
      g.fillStyle = dark; g.fillRect(13, 13, 6, 2); // jaw
      if (mon.id && /cyclops/.test(mon.id)) { g.fillStyle = '#ff5050'; blob(16, 8, 2, 2); }
    } else if (arch === 'undead') {
      g.fillStyle = hsl(hue, 20, 55);
      blob(16, 10, 5, 6);           // skull-ish head
      g.fillStyle = base;
      g.fillRect(10, 16, 12, 18);   // torso
      g.fillStyle = hsl(hue, 20, 50);
      g.fillRect(5, 17, 4, 12); g.fillRect(23, 17, 4, 12);
      g.fillRect(11, 34, 4, 10); g.fillRect(17, 34, 4, 10);
      g.fillStyle = '#0c0c12';
      blob(14, 10, 1.6, 2); blob(18, 10, 1.6, 2);  // eye sockets
      g.fillStyle = mon.id && /lich|vampire|wraith/.test(mon.id) ? '#70f0f0' : '#70f0a0';
      g.globalAlpha = 0.8; blob(14, 10, 0.8, 0.8); blob(18, 10, 0.8, 0.8);
      g.globalAlpha = 1;
      // tatters
      g.fillStyle = hsl(hue, 20, 40);
      for (i = 0; i < 6; i++) g.fillRect(10 + i * 2, 32 + (i % 2) * 2, 2, 4);
    } else if (arch === 'aberrant') {
      g.fillStyle = hsl(hue, 35, 45); blob(16, 26, 10, 12);
      g.fillStyle = hsl(hue, 35, 60); blob(16, 14, 7, 6);
      g.fillStyle = '#111'; blob(16, 16, 4, 2.5);  // mouth
      g.fillStyle = '#fff';
      for (i = 0; i < 5; i++) g.fillRect(13 + i * 1.6, 14.5, 1, 1.6);
      g.strokeStyle = hsl(hue, 35, 35); g.lineWidth = 2;
      for (i = 0; i < 3; i++) {
        g.beginPath(); g.moveTo(16, 34); g.lineTo(8 + i * 8, 44); g.stroke();
      }
      g.fillStyle = '#e8e8e8'; blob(13, 11, 1.6, 1.6); blob(19, 11, 1.6, 1.6);
    } else {
      // humanoid
      g.fillStyle = base;
      blob(16, 10, 4.5, 5);         // head
      g.fillRect(10, 15, 12, 16);   // torso
      g.fillStyle = dark;
      g.fillRect(5, 16, 4, 12);     // arms
      g.fillRect(23, 16, 4, 12);
      g.fillRect(11, 31, 4, 12);    // legs
      g.fillRect(17, 31, 4, 12);
      g.fillStyle = light; blob(16, 9, 3, 3.4);
      g.fillStyle = '#111'; blob(14, 9, 0.9, 0.9); blob(18, 9, 0.9, 0.9);
      // weapon hint
      g.strokeStyle = '#c8c8c8'; g.lineWidth = 1.5;
      g.beginPath(); g.moveTo(27, 12); g.lineTo(27, 30); g.stroke();
    }
    // outline
    g.strokeStyle = 'rgba(0,0,0,0.4)'; g.lineWidth = 1;
    g.strokeRect(0.5, 0.5, 31, 47);
    cache[key] = c;
    return c;
  }

  /* ---------------- portraits (48x48) ---------------- */
  var RACE_SKIN = {
    human: '#d8a878', dwarf: '#c98f6a', elf: '#e0c0a0', gnome: '#e8c8a8',
    halfelf: '#dcab84', halfling: '#e2b48c'
  };
  var HAIR = ['#3a2a18', '#5d4020', '#8a6a30', '#b08040', '#555', '#7a2a20', '#2a2a3a', '#999'];
  function portrait(race, cls) {
    var key = 'port:' + race + ':' + cls;
    if (cache[key]) return cache[key];
    var c = cv(48, 48), g = c.getContext('2d');
    var r = rngFor('port:' + race + ':' + cls);
    var skin = RACE_SKIN[race] || '#d8a878';
    var hair = HAIR[Math.floor(r() * HAIR.length)];
    g.fillStyle = '#2a2622'; g.fillRect(0, 0, 48, 48); // bg
    // shoulders / class garb
    var garb = { fighter: '#7a4a2a', paladin: '#8a8a92', ranger: '#4a5d3a', mage: '#3a4a7a', cleric: '#b8a86a', thief: '#4a4048' }[cls] || '#666';
    g.fillStyle = garb;
    g.beginPath(); g.moveTo(8, 48); g.lineTo(14, 36); g.lineTo(34, 36); g.lineTo(40, 48); g.closePath(); g.fill();
    // neck
    g.fillStyle = skin; g.fillRect(20, 32, 8, 6);
    // head
    g.fillStyle = skin;
    g.beginPath(); g.ellipse(24, 22, 10, 12, 0, 0, 7); g.fill();
    // ears
    if (race === 'elf' || race === 'halfelf') {
      g.fillStyle = skin;
      g.beginPath(); g.moveTo(14, 22); g.lineTo(8, 16); g.lineTo(14, 18); g.closePath(); g.fill();
      g.beginPath(); g.moveTo(34, 22); g.lineTo(40, 16); g.lineTo(34, 18); g.closePath(); g.fill();
    } else if (race === 'dwarf') {
      g.fillStyle = skin; g.beginPath(); g.arc(14, 22, 2.5, 0, 7); g.fill();
      g.beginPath(); g.arc(34, 22, 2.5, 0, 7); g.fill();
    } else {
      g.fillStyle = skin; g.beginPath(); g.arc(14, 22, 2.2, 0, 7); g.fill();
      g.beginPath(); g.arc(34, 22, 2.2, 0, 7); g.fill();
    }
    // hair
    g.fillStyle = hair;
    g.beginPath();
    g.ellipse(24, 15, 10, 7, 0, Math.PI, 0);
    g.fill();
    if (race === 'dwarf') {
      // beard
      g.fillStyle = hair;
      g.beginPath(); g.moveTo(15, 24); g.quadraticCurveTo(24, 40, 33, 24); g.lineTo(30, 26); g.quadraticCurveTo(24, 34, 18, 26); g.closePath(); g.fill();
      g.fillStyle = skin; g.fillRect(20, 24, 8, 3);
    } else if (race === 'gnome' || race === 'halfling') {
      g.fillStyle = hair; g.beginPath(); g.arc(24, 12, 4, 0, 7); g.fill(); // topknot
    }
    // eyes
    g.fillStyle = '#fff'; g.fillRect(19, 20, 4, 3); g.fillRect(27, 20, 4, 3);
    g.fillStyle = '#2a2a3a'; g.fillRect(21, 21, 2, 2); g.fillRect(28, 21, 2, 2);
    // brows
    g.fillStyle = hair; g.fillRect(19, 18, 4, 1); g.fillRect(27, 18, 4, 1);
    // class emblem
    g.fillStyle = 'rgba(255,215,120,0.9)';
    if (cls === 'fighter' || cls === 'thief') {
      g.fillRect(22, 39, 2, 7); g.fillRect(20, 38, 6, 2);
    } else if (cls === 'paladin' || cls === 'cleric') {
      g.fillRect(23, 38, 2, 8); g.fillRect(20, 40, 8, 2);
    } else if (cls === 'ranger') {
      g.strokeStyle = 'rgba(255,215,120,0.9)'; g.lineWidth = 1.5;
      g.beginPath(); g.arc(24, 42, 4, Math.PI * 0.15, Math.PI * 0.85, true); g.stroke();
    } else if (cls === 'mage') {
      g.beginPath(); g.arc(24, 42, 3, 0, 7); g.fill();
      g.fillRect(23, 36, 2, 4);
    }
    g.strokeStyle = 'rgba(0,0,0,0.5)'; g.strokeRect(0.5, 0.5, 47, 47);
    cache[key] = c;
    return c;
  }

  /* ---------------- item icons (24x24) ---------------- */
  function icon(item) {
    var c = item;
    var cat = c.c || 'gear';
    var key = 'icon:' + c.id;
    if (cache[key]) return cache[key];
    var v = cv(24, 24), g = v.getContext('2d');
    var r = rngFor('icon:' + c.id);
    g.fillStyle = '#1c1a16'; g.fillRect(0, 0, 24, 24);
    if (cat === 'weapon' || cat === 'ranged') {
      var blade = c.id.indexOf('bow') >= 0 || c.id.indexOf('crossbow') >= 0;
      g.strokeStyle = '#c8c8c8'; g.lineWidth = 2;
      if (blade) {
        g.beginPath(); g.arc(18, 12, 8, Math.PI * 0.6, Math.PI * 1.4); g.stroke();
        g.strokeStyle = '#8a6a30'; g.beginPath(); g.moveTo(14, 5); g.lineTo(14, 19); g.stroke();
      } else {
        g.beginPath(); g.moveTo(4, 20); g.lineTo(18, 6); g.stroke();
        g.strokeStyle = '#8a6a30'; g.lineWidth = 2.5;
        g.beginPath(); g.moveTo(8, 12); g.lineTo(12, 16); g.stroke();
      }
    } else if (cat === 'ammo') {
      g.strokeStyle = '#c8c8c8'; g.lineWidth = 1.5;
      for (var i = 0; i < 3; i++) {
        g.beginPath(); g.moveTo(7 + i * 4, 20); g.lineTo(7 + i * 4, 8); g.stroke();
        g.fillStyle = '#8a6a30'; g.beginPath(); g.moveTo(7 + i * 4, 8); g.lineTo(5.5 + i * 4, 5); g.lineTo(8.5 + i * 4, 5); g.closePath(); g.fill();
      }
    } else if (cat === 'armor') {
      g.fillStyle = c.id.indexOf('leather') >= 0 ? '#7a5a30' : c.id.indexOf('plate') >= 0 ? '#b8b8b8' : '#9a8a60';
      g.beginPath(); g.moveTo(6, 6); g.lineTo(12, 4); g.lineTo(18, 6); g.lineTo(19, 16); g.lineTo(12, 20); g.lineTo(5, 16); g.closePath(); g.fill();
      g.strokeStyle = 'rgba(0,0,0,0.4)'; g.stroke();
    } else if (cat === 'shield') {
      g.fillStyle = '#8a6a30';
      g.beginPath(); g.moveTo(12, 3); g.lineTo(19, 6); g.lineTo(18, 16); g.lineTo(12, 21); g.lineTo(6, 16); g.lineTo(5, 6); g.closePath(); g.fill();
      g.fillStyle = '#c8b890'; g.beginPath(); g.arc(12, 11, 4, 0, 7); g.fill();
    } else if (cat === 'potion') {
      var pc = c.p && c.p.heal ? '#c03040' : c.p && c.p.restore_level ? '#40a0c0' : c.id.indexOf('invis') >= 0 ? '#9060c0' : c.id.indexOf('poison') >= 0 ? '#40a050' : '#d08030';
      g.fillStyle = '#d8d0c0'; g.fillRect(10, 3, 4, 3);
      g.fillStyle = pc;
      g.beginPath(); g.arc(12, 14, 7, 0, 7); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.5)'; g.beginPath(); g.arc(9, 12, 2, 0, 7); g.fill();
    } else if (cat === 'scroll') {
      g.fillStyle = '#d8c8a0'; g.fillRect(5, 7, 14, 10);
      g.fillStyle = '#b8a878'; g.fillRect(4, 5, 4, 14); g.fillRect(16, 5, 4, 14);
      g.strokeStyle = '#6a5a3a'; g.lineWidth = 1;
      for (i = 0; i < 3; i++) { g.beginPath(); g.moveTo(9, 10 + i * 2.5); g.lineTo(16, 10 + i * 2.5); g.stroke(); }
    } else if (cat === 'wand') {
      g.strokeStyle = '#6a4a2a'; g.lineWidth = 2.5;
      g.beginPath(); g.moveTo(5, 19); g.lineTo(17, 7); g.stroke();
      g.fillStyle = c.id.indexOf('fire') >= 0 ? '#e06030' : '#50c0d0';
      g.beginPath(); g.arc(18, 6, 3, 0, 7); g.fill();
    } else if (cat === 'ring' || cat === 'amulet') {
      g.strokeStyle = c.id.indexOf('gold') >= 0 || cat === 'ring' ? '#e8b830' : '#c0c0c0'; g.lineWidth = 2.5;
      g.beginPath(); g.arc(12, 13, 6, 0, 7); g.stroke();
      if (cat === 'amulet') { g.fillStyle = '#50c0d0'; g.beginPath(); g.moveTo(12, 17); g.lineTo(9, 21); g.lineTo(12, 24); g.lineTo(15, 21); g.closePath(); g.fill(); }
      else { g.fillStyle = '#c04040'; g.fillRect(10.5, 5.5, 3, 3); }
    } else if (cat === 'cloak') {
      g.fillStyle = '#4a5d7a';
      g.beginPath(); g.moveTo(12, 4); g.lineTo(18, 8); g.lineTo(20, 20); g.lineTo(4, 20); g.lineTo(6, 8); g.closePath(); g.fill();
      g.fillStyle = '#3a4a60'; g.beginPath(); g.arc(12, 6, 2.5, 0, 7); g.fill();
    } else if (cat === 'staff') {
      g.strokeStyle = '#6a4a2a'; g.lineWidth = 2.5;
      g.beginPath(); g.moveTo(12, 22); g.lineTo(12, 6); g.stroke();
      g.fillStyle = '#50c0d0'; g.beginPath(); g.arc(12, 5, 3, 0, 7); g.fill();
    } else if (cat === 'boots' || cat === 'belt' || cat === 'gloves') {
      g.fillStyle = '#7a5a30';
      if (cat === 'boots') { g.fillRect(8, 5, 5, 12); g.fillRect(8, 15, 10, 4); g.fillRect(14, 5, 5, 12); g.fillRect(14, 15, 10, 4); }
      else if (cat === 'belt') { g.fillRect(3, 10, 18, 4); g.fillStyle = '#e8b830'; g.fillRect(10, 9, 4, 6); }
      else { g.fillRect(7, 8, 5, 10); g.fillRect(13, 8, 5, 10); g.fillStyle = '#5d452c'; g.fillRect(7, 14, 5, 4); g.fillRect(13, 14, 5, 4); }
    } else if (cat === 'gem' || cat === 'jewel') {
      var gc = { pearl: '#e8e8e0', amber: '#e09030', bloodstone: '#a03030', crystal: '#c0e0f0', emerald: '#40a060', topaz: '#e0c030', sapphire: '#3060c0', star: '#c0c8e0', ruby: '#c03040', diamond: '#d8f0f8', opal: '#d0e8d8' }[c.id.split('_')[1]] || '#c060a0';
      g.fillStyle = gc;
      g.beginPath(); g.moveTo(12, 4); g.lineTo(19, 10); g.lineTo(16, 19); g.lineTo(8, 19); g.lineTo(5, 10); g.closePath(); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.5)'; g.beginPath(); g.moveTo(12, 4); g.lineTo(15, 10); g.lineTo(8, 10); g.closePath(); g.fill();
    } else if (cat === 'trade') {
      g.fillStyle = '#b8a060'; g.fillRect(4, 8, 16, 8);
      g.strokeStyle = '#6a5a30'; g.strokeRect(4.5, 8.5, 15, 7);
      g.beginPath(); g.moveTo(12, 8); g.lineTo(12, 16); g.stroke();
    } else if (cat === 'key') {
      g.strokeStyle = '#c8a830'; g.lineWidth = 2.5;
      g.beginPath(); g.arc(9, 9, 4, 0, 7); g.stroke();
      g.beginPath(); g.moveTo(12, 12); g.lineTo(19, 19); g.moveTo(16, 16); g.lineTo(14, 18); g.moveTo(19, 19); g.lineTo(17, 21); g.stroke();
    } else if (cat === 'quest') {
      g.fillStyle = '#d8c8a0'; g.fillRect(5, 5, 14, 14);
      g.strokeStyle = '#8a6a30'; g.strokeRect(5.5, 5.5, 13, 13);
      g.fillStyle = '#8a2020'; g.beginPath(); g.arc(12, 12, 3, 0, 7); g.fill();
    } else {
      g.fillStyle = '#9a8a60'; g.fillRect(7, 7, 10, 10);
      g.strokeStyle = '#5d4a2a'; g.strokeRect(7.5, 7.5, 9, 9);
    }
    g.strokeStyle = 'rgba(0,0,0,0.5)'; g.strokeRect(0.5, 0.5, 23, 23);
    cache[key] = v;
    return v;
  }

  /* ---------------- overland site icons (20x20) ---------------- */
  function site(kind) {
    var key = 'site:' + kind;
    if (cache[key]) return cache[key];
    var v = cv(20, 20), g = v.getContext('2d');
    if (kind === 'town') {
      g.fillStyle = '#c8b890'; g.fillRect(4, 8, 12, 8);
      g.fillStyle = '#8a7a5c'; g.fillRect(4, 5, 12, 3);
      g.fillStyle = '#5d4a2a'; g.fillRect(8, 12, 4, 4);
      g.fillStyle = '#c8b890'; g.fillRect(2, 10, 3, 6); g.fillRect(15, 10, 3, 6);
    } else if (kind === 'dungeon') {
      g.fillStyle = '#4a4a52'; g.fillRect(3, 12, 14, 5);
      g.fillStyle = '#2a2a30';
      g.beginPath(); g.moveTo(7, 12); g.lineTo(10, 6); g.lineTo(13, 12); g.closePath(); g.fill();
      g.fillStyle = '#111'; g.fillRect(8, 10, 4, 3);
    } else if (kind === 'hamlet') {
      g.fillStyle = '#9a8a60';
      g.fillRect(3, 10, 6, 6); g.fillRect(11, 9, 6, 7);
      g.fillStyle = '#6a5a3a';
      g.beginPath(); g.moveTo(2, 10); g.lineTo(6, 6); g.lineTo(10, 10); g.closePath(); g.fill();
      g.beginPath(); g.moveTo(10, 9); g.lineTo(14, 5); g.lineTo(18, 9); g.closePath(); g.fill();
    } else if (kind === 'healer') {
      g.fillStyle = '#9a8a60'; g.fillRect(5, 9, 10, 8);
      g.fillStyle = '#e0d8c0'; g.fillRect(4, 6, 12, 3);
      g.fillStyle = '#8a2020'; g.fillRect(9, 11, 2, 6); g.fillRect(7, 13, 6, 2);
    } else if (kind === 'holy') {
      g.strokeStyle = '#e8c850'; g.lineWidth = 2;
      g.beginPath(); g.moveTo(10, 3); g.lineTo(10, 17); g.moveTo(5, 8); g.lineTo(15, 8); g.stroke();
    } else if (kind === 'lair') {
      g.strokeStyle = '#c8c8c8'; g.lineWidth = 2;
      g.beginPath(); g.moveTo(5, 5); g.lineTo(15, 15); g.moveTo(15, 5); g.lineTo(5, 15); g.stroke();
      g.fillStyle = '#8a8a8a'; g.beginPath(); g.arc(10, 10, 2, 0, 7); g.fill();
    } else if (kind === 'camp') {
      g.fillStyle = '#7a5a30';
      g.beginPath(); g.moveTo(10, 4); g.lineTo(17, 16); g.lineTo(3, 16); g.closePath(); g.fill();
      g.fillStyle = '#3a2a18';
      g.beginPath(); g.moveTo(10, 8); g.lineTo(13, 16); g.lineTo(7, 16); g.closePath(); g.fill();
    }
    g.strokeStyle = 'rgba(0,0,0,0.5)'; g.strokeRect(0.5, 0.5, 19, 19);
    cache[key] = v;
    return v;
  }


  /* ---------------- standing figure (32x48) for towns/dungeons ---------------- */
  function figure(race, cls) {
    var key = 'fig:' + race + ':' + cls;
    if (cache[key]) return cache[key];
    var port = portrait(race, cls);
    var c = cv(32, 48), g = c.getContext('2d');
    var r = rngFor('fig:' + race + ':' + cls);
    var skin = RACE_SKIN[race] || '#d8a878';
    var garb = { fighter: '#7a4a2a', paladin: '#8a8a92', ranger: '#4a5d3a', mage: '#3a4a7a', cleric: '#b8a86a', thief: '#4a4048' }[cls] || '#666';
    // legs
    g.fillStyle = '#3a3028'; g.fillRect(11, 36, 4, 10); g.fillRect(17, 36, 4, 10);
    // torso
    g.fillStyle = garb; g.fillRect(9, 18, 14, 18);
    g.fillStyle = shade(garb, -0.25); g.fillRect(9, 18, 14, 4);
    // arms
    g.fillStyle = garb; g.fillRect(5, 19, 4, 12); g.fillRect(23, 19, 4, 12);
    g.fillStyle = skin; g.fillRect(5, 30, 4, 3); g.fillRect(23, 30, 4, 3);
    // head from portrait (crop the face region)
    g.drawImage(port, 14, 8, 20, 24, 8, 0, 16, 20);
    g.strokeStyle = 'rgba(0,0,0,0.35)'; g.strokeRect(0.5, 0.5, 31, 47);
    cache[key] = c;
    return c;
  }

  /* ---------------- loot / props sprites (16x16) ---------------- */
  function lootSprite(kind) {
    var key = 'loot:' + kind;
    if (cache[key]) return cache[key];
    var v = cv(16, 16), g = v.getContext('2d');
    if (kind === 'gold') {
      g.fillStyle = '#e8b830';
      for (var i = 0; i < 7; i++) { g.beginPath(); g.arc(3 + (i % 3) * 4, 9 + ((i / 3) | 0) * 3, 2, 0, 7); g.fill(); }
      g.fillStyle = '#ffd860'; g.fillRect(5, 5, 3, 2); g.fillRect(9, 7, 2, 2);
    } else if (kind === 'chest') {
      g.fillStyle = '#6a4a2a'; g.fillRect(2, 7, 12, 7);
      g.fillStyle = '#7a5a30'; g.fillRect(2, 5, 12, 4);
      g.fillStyle = '#c8a830'; g.fillRect(7, 7, 2, 4);
      g.strokeStyle = '#3a2a18'; g.strokeRect(2.5, 5.5, 11, 8);
    } else if (kind === 'key') {
      g.strokeStyle = '#c8a830'; g.lineWidth = 1.5;
      g.beginPath(); g.arc(6, 6, 2.5, 0, 7); g.stroke();
      g.beginPath(); g.moveTo(8, 8); g.lineTo(12, 12); g.moveTo(10, 10); g.lineTo(8.5, 11.5); g.stroke();
    } else if (kind === 'shrine') {
      g.fillStyle = '#b8a86a'; g.fillRect(5, 6, 6, 9);
      g.fillStyle = '#e8c850'; g.fillRect(7, 2, 2, 12); g.fillRect(4, 5, 8, 2);
    } else {
      // generic item
      g.drawImage(icon({ id: kind, c: 'gear' }), 0, 0);
    }
    cache[key] = v;
    return v;
  }

  return { texture: texture, monster: monster, portrait: portrait, icon: icon, site: site, figure: figure, lootSprite: lootSprite, shade: shade, rngFor: rngFor };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = { Fig: Fig };
