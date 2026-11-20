/* ============================================================
   EMBERFALL — view3d.js
   First-person raycaster for towns, dungeons and building
   interiors. Low internal resolution (column step 2 px),
   DDA wall casting with texture sampling, per-column
   distance shading, billboard sprites with a z-buffer,
   gradient floor/ceiling and a darkness vignette for torch
   light. Runs comfortably on old hardware: small grids,
   ~240 columns per frame, redraw only when dirty.
   ============================================================ */
'use strict';

var View3D = (function () {
  function View3D(canvas) {
    this.cv = canvas;
    this.g = canvas.getContext('2d');
    this.map = null;
    this.x = 1; this.y = 1; this.dir = 0;
    this.zbuf = null;
    this.light = 14;        // max visible distance
    this.dark = false;      // torch-lit dungeon
    this.step = 2;          // render column step (px)
  }

  View3D.prototype.setMap = function (map) {
    this.map = map;
    this.zbuf = new Float32Array(Math.ceil(map.w * 8));
    // precompute render solidity: walls minus open doors
    var w = map.w, solid = this.solid = new Uint8Array(w * map.h);
    var tex = this.tex = new Uint8Array(w * map.h);
    for (var i = 0; i < w * map.h; i++) {
      solid[i] = map.solid[i] ? 1 : 0;
      tex[i] = map.tex[i] || 1;
    }
    for (var k in map.doors) {
      var d = map.doors[k], idx = +k;
      if (d.open) { solid[idx] = 0; }
      else {
        solid[idx] = 1;
        tex[idx] = (d.kind === 'secret' && d.found) ? 11 : (d.kind === 'locked' ? 12 : (d.kind === 'secret' ? (tex[idx] || 1) : 11));
      }
    }
  };

  View3D.prototype.setPos = function (x, y, dir) {
    this.x = x; this.y = y;
    if (dir != null) this.dir = dir;
  };

  function isWallAt(map, solid, x, y) {
    if (x < 0 || y < 0 || x >= map.w || y >= map.h) return 1;
    return solid[y * map.w + x];
  }

  View3D.prototype.render = function () {
    var g = this.g, W = this.cv.width, H = this.cv.height;
    var map = this.map, solid = this.solid, tex = this.tex;
    if (!map) return;
    var step = this.step;
    var halfH = H >> 1;
    var light = this.light;
    var needZ = Math.ceil(W / step) + 16;
    if (!this.zbuf || this.zbuf.length < needZ) this.zbuf = new Float32Array(needZ);

    // ceiling & floor gradients
    var sky = g.createLinearGradient(0, 0, 0, halfH);
    if (this.dark) { sky.addColorStop(0, '#05050a'); sky.addColorStop(1, '#1a1a24'); }
    else { sky.addColorStop(0, '#8aa8c8'); sky.addColorStop(1, '#c8d8e8'); }
    g.fillStyle = sky; g.fillRect(0, 0, W, halfH);
    var flr = g.createLinearGradient(0, halfH, 0, H);
    if (this.dark) { flr.addColorStop(0, '#0a0a10'); flr.addColorStop(1, '#2a241c'); }
    else { flr.addColorStop(0, '#3a3428'); flr.addColorStop(1, '#6a5f4a'); }
    g.fillStyle = flr; g.fillRect(0, halfH, W, halfH);

    var fov = Math.PI / 3;
    var dirX = Math.cos(this.dir), dirY = Math.sin(this.dir);
    var planeX = -dirY * Math.tan(fov / 2), planeY = dirX * Math.tan(fov / 2);
    var i = 0;
    for (var col = 0; col < W; col += step, i++) {
      var camX = 2 * col / W - 1;
      var rdx = dirX + planeX * camX;
      var rdy = dirY + planeY * camX;
      // DDA
      var mapX = this.x | 0, mapY = this.y | 0;
      var ddx = Math.abs(1 / (rdx || 1e-9)), ddy = Math.abs(1 / (rdy || 1e-9));
      var stepX, stepY, sdx, sdy;
      if (rdx < 0) { stepX = -1; sdx = (this.x - mapX) * ddx; } else { stepX = 1; sdx = (mapX + 1 - this.x) * ddx; }
      if (rdy < 0) { stepY = -1; sdy = (this.y - mapY) * ddy; } else { stepY = 1; sdy = (mapY + 1 - this.y) * ddy; }
      var side = 0, hit = 0, guard = 256;
      while (!hit && guard-- > 0) {
        if (sdx < sdy) { sdx += ddx; mapX += stepX; side = 0; }
        else { sdy += ddy; mapY += stepY; side = 1; }
        if (mapX < 0 || mapY < 0 || mapX >= map.w || mapY >= map.h) { hit = 1; break; }
        var idx = mapY * map.w + mapX;
        if (solid[idx]) hit = 1;
      }
      if (!hit) { this.zbuf[i] = 99; continue; }
      var dist = side === 0 ? sdx - ddx : sdy - ddy;
      if (dist < 0.05) dist = 0.05;
      this.zbuf[i] = dist;
      var lineH = Math.min(H * 3, (H / dist) | 0);
      var top = halfH - (lineH >> 1);
      var texX;
      var wallX = side === 0 ? this.y + dist * rdy : this.x + dist * rdx;
      wallX -= Math.floor(wallX);
      texX = (wallX * 64) | 0;
      if ((side === 0 && rdx > 0) || (side === 1 && rdy < 0)) texX = 63 - texX;
      var tId = tex[mapY * map.w + mapX];
      var tc = Fig.texture(tId);
      g.drawImage(tc, texX, 0, 1, 64, col, top, step, lineH);
      // distance shading
      var sh = Math.min(0.92, dist / light * (side === 1 ? 0.55 : 0.42) + (this.dark ? 0.25 : 0));
      if (sh > 0.02) {
        g.fillStyle = 'rgba(0,0,0,' + sh.toFixed(3) + ')';
        g.fillRect(col, top, step, lineH);
      }
    }

    // sprites (monsters, npcs, loot, props)
    var sprites = map.sprites || [];
    if (sprites.length) {
      var arr = [];
      for (var s2 = 0; s2 < sprites.length; s2++) {
        var sp = sprites[s2];
        var sx = sp.x - this.x, sy = sp.y - this.y;
        var invDet = 1 / (planeX * dirY - dirX * planeY);
        var tx = invDet * (dirY * sx - dirX * sy);
        var ty = invDet * (-planeY * sx + planeX * sy); // depth
        if (ty <= 0.15) continue;
        arr.push({ sp: sp, tx: tx, ty: ty });
      }
      arr.sort(function (a, b) { return b.ty - a.ty; });
      for (s2 = 0; s2 < arr.length; s2++) {
        var it = arr[s2], sc = it.sp;
        var scrX = (W / 2) * (1 + it.tx / it.ty);
        var size = Math.min(H * 2, (H / it.ty) * (sc.scale || 1)) | 0;
        var topOff = (H / it.ty) * (sc.yoff || 0);
        var drawH = size * (sc.h || 1.5) / 1.5;
        var bottom = halfH + (halfH / it.ty) - drawH * (sc.floor || 0);
        var drawW = size;
        var left = (scrX - drawW / 2) | 0;
        var right = (scrX + drawW / 2) | 0;
        var cvImg = sc.img;
        if (!cvImg) continue;
        var imgW = cvImg.width, imgH = cvImg.height;
        var topY = (bottom - drawH) | 0;
        var c0 = Math.max(0, left), c1 = Math.min(W, right);
        for (var col2 = c0; col2 < c1; col2 += step) {
          var zi = (col2 / step) | 0;
          if (zi >= this.zbuf.length || this.zbuf[zi] <= it.ty) continue;
          var t = (col2 - left) / drawW;
          var srcX = (t * imgW) | 0;
          if (srcX >= imgW) srcX = imgW - 1;
          g.drawImage(cvImg, srcX, 0, 1, imgH, col2, topY, step, drawH);
          var sh2 = Math.min(0.9, it.ty / light * 0.6 + (this.dark ? 0.2 : 0));
          if (sh2 > 0.05) {
            g.fillStyle = 'rgba(0,0,0,' + sh2.toFixed(3) + ')';
            g.fillRect(col2, topY, step, drawH);
          }
        }
      }
    }

    // darkness vignette
    if (this.dark) {
      var vg = g.createRadialGradient(W / 2, H / 2, H * 0.18, W / 2, H / 2, H * 0.75);
      vg.addColorStop(0, 'rgba(0,0,0,0)');
      vg.addColorStop(1, 'rgba(0,0,0,0.85)');
      g.fillStyle = vg; g.fillRect(0, 0, W, H);
    }
  };

  // direction from dx,dy
  function angleTo(dx, dy) { return Math.atan2(dy, dx); }

  return { View3D: View3D, angleTo: angleTo };
})();


// Scene-facing singleton wrapper
var View = (function () {
  var v = null, canvas = null;
  var gx = 0, gy = 0, gdir = 0, gliding = false;
  function angLerp(a, b, t) {
    var d = (b - a) % (Math.PI * 2);
    if (d > Math.PI) d -= Math.PI * 2;
    if (d < -Math.PI) d += Math.PI * 2;
    return a + d * t;
  }
  return {
    init: function (cv) { canvas = cv; v = new View3D.View3D(cv); gliding = false; },
    get cv() { return canvas; },
    set map(m) { v.setMap(m); gliding = false; },
    get map() { return v.map; },
    setPos: function (x, y, dir) { v.setPos(x, y, dir); if (dir != null) { gx = v.x; gy = v.y; gdir = v.dir; } },
    // start a smooth glide toward (x, y); dir optional
    glide: function (x, y, dir) {
      gx = x; gy = y;
      if (dir != null) gdir = dir;
      gliding = true;
    },
    glideDir: function (dir) { gdir = dir; gliding = true; },
    get gliding() { return gliding; },
    tick: function (dt) {
      if (!v || !gliding) return false;
      var t = 1 - Math.exp(-dt / 70); // smooth over ~70ms
      var nx = v.x + (gx - v.x) * t;
      var ny = v.y + (gy - v.y) * t;
      var nd = v.dir + (angLerp(v.dir, gdir, 1) - v.dir) * t;
      v.x = nx; v.y = ny; v.dir = nd;
      var dx = gx - nx, dy = gy - ny;
      if (dx * dx + dy * dy < 0.0004) {
        v.x = gx; v.y = gy;
        v.dir = gdir;
        gliding = false;
        return true;
      }
      return true;
    },
    set dark(d) { if (v) v.dark = d; },
    set light(l) { if (v) v.light = l; },
    render: function () { if (v) v.render(); },
    get dir() { return v ? v.dir : 0; },
    get x() { return v ? v.x : 0; },
    get y() { return v ? v.y : 0; }
  };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = { View3D: View3D };
