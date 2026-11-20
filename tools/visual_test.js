const { spawn } = require('child_process');
const http = require('http');
const path = require('path');
const PORT = 9391;
function getJson(p) { return new Promise((res, rej) => http.get({ host: '127.0.0.1', port: PORT, path: p }, (r) => { let d = ''; r.on('data', c => d += c); r.on('end', () => res(JSON.parse(d))); }).on('error', rej)); }
(async () => {
  const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', ['--headless=new','--disable-gpu','--no-sandbox','--remote-debugging-port='+PORT,'--window-size=1024,768','--user-data-dir='+path.join(__dirname,'_cp10'),'about:blank'], { stdio: 'ignore' });
  await new Promise(r => setTimeout(r, 2500));
  const tabs = await getJson('/json/list');
  const tab = tabs.find(t => t.type === 'page') || tabs[0];
  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise(r => (ws.onopen = r));
  let idc = 0; const pending = {}; const errs = [];
  ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pending[d.id]) { pending[d.id](d.result); delete pending[d.id]; } else if (d.method === 'Runtime.exceptionThrown') errs.push(d.params.exceptionDetails.exception && d.params.exceptionDetails.exception.description || d.params.exceptionDetails.text); };
  const send = (method, params) => new Promise((res) => { const id = ++idc; pending[id] = res; ws.send(JSON.stringify({ id, method, params: params || {} })); });
  await send('Runtime.enable'); await send('Page.enable');
  await send('Page.navigate', { url: 'file://' + path.join(__dirname, '..', 'index.html') });
  await new Promise(r => setTimeout(r, 1500));
  const ev = async (expr) => { const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true }); if (r.exceptionDetails) throw new Error((r.exceptionDetails.exception && r.exceptionDetails.exception.description || r.exceptionDetails.text).slice(0, 200)); return r.result.value; };
  const canvasStats = `(function(){
    var cv = document.getElementById('cv');
    var g = cv.getContext('2d');
    var d = g.getImageData(0, 0, cv.width, cv.height).data;
    var colors = {};
    var nonEmpty = 0, n = 0;
    for (var i = 0; i < d.length; i += 4 * 97) {
      var key = (d[i] >> 4) + '-' + (d[i+1] >> 4) + '-' + (d[i+2] >> 4);
      colors[key] = (colors[key] || 0) + 1;
      if (d[i] + d[i+1] + d[i+2] > 30) nonEmpty++;
      n++;
    }
    var top = Object.keys(colors).sort(function(a,b){return colors[b]-colors[a];}).slice(0,5).map(function(k){return k + ':' + colors[k];});
    return { w: cv.width, h: cv.height, sampled: n, nonEmpty: nonEmpty, top: top };
  })()`;
  let pass = 0, fail = 0;
  function ok(c, l) { if (c) { pass++; console.log('  PASS ' + l); } else { fail++; console.log('  FAIL ' + l); } }

  // 1) title
  const titleRect = await ev("(function(){var p=document.querySelector('#ui .panel'); var r=p.getBoundingClientRect(); return {w:Math.round(r.width), h:Math.round(r.height), x:Math.round(r.x), y:Math.round(r.y)};})()");
  ok(titleRect.w > 200 && titleRect.h > 200, 'title panel sized (' + JSON.stringify(titleRect) + ')');
  ok(await ev("!!document.querySelector('#ui .title-crest')"), 'title crest present');
  ok(await ev("document.querySelectorAll('#ui .title-actions .btn').length") === 4, 'title has 4 buttons');

  // create a party
  await ev("document.querySelector('#ui [data-act=\"new\"]').click()");
  await new Promise(r => setTimeout(r, 200));
  const chars = [['human','fighter','ne'],['elf','mage','cn'],['dwarf','cleric','le']];
  for (const [race, cls, align] of chars) {
    await ev("(function(){var b=document.querySelector('#ui [data-act=\\\"create.race\\\"][data-r=\\\"" + race + "\\\"]'); if(b) b.click();})()");
    await ev("(function(){var b=document.querySelector('#ui [data-act=\\\"create.class\\\"][data-c=\\\"" + cls + "\\\"]'); if(b) b.click();})()");
    await ev("(function(){var b=document.querySelector('#ui [data-act=\\\"create.align\\\"][data-a=\\\"" + align + "\\\"]'); if(b) b.click();})()");
    await ev("(function(){var b=document.querySelector('#ui [data-act=\\\"create.roll\\\"]'); if(b) b.click();})()");
    await ev("(function(){var b=document.querySelector('#ui [data-act=\\\"create.next\\\"]'); if(b) b.click();})()");
    await new Promise(r => setTimeout(r, 120));
    await ev("(function(){var b=document.querySelector('#ui [data-act=\\\"create.finish\\\"]'); if(b) b.click();})()");
    await new Promise(r => setTimeout(r, 200));
  }
  ok(await ev("Campaign.G.phase") === 'overland', 'overland phase');
  const ov = await ev(canvasStats);
  ok(ov.nonEmpty > ov.sampled * 0.5, 'overland canvas textured (nonEmpty ' + ov.nonEmpty + '/' + ov.sampled + ')');
  ok(ov.top.length >= 4, 'overland canvas has varied colors (' + ov.top.join(' ') + ')');

  // HUD visible
  ok(await ev("document.getElementById('watch') && !document.getElementById('watch').classList.contains('hidden')"), 'watch visible');
  ok(await ev("document.querySelectorAll('#vitals .vital').length") === 3, '3 vital chips');
  ok(await ev("document.getElementById('bar').children.length > 0"), 'command bar populated');
  ok(await ev("document.getElementById('pad').classList.contains('hidden') === false"), 'pad visible');
  ok(await ev("document.getElementById('top-clock').textContent.length > 3"), 'top clock set: ' + await ev("document.getElementById('top-clock').textContent"));
  ok(await ev("document.getElementById('top-loc').textContent.length > 3"), 'top location set: ' + await ev("document.getElementById('top-loc').textContent"));

  // town 3D
  await ev("Town.enter(Campaign.G.activeAdv)");
  await new Promise(r => setTimeout(r, 500));
  const tw = await ev(canvasStats);
  ok(tw.nonEmpty > tw.sampled * 0.5, 'town 3D canvas rendered (' + tw.nonEmpty + '/' + tw.sampled + ')');
  const townSky = await ev("(function(){var d=document.getElementById('cv').getContext('2d').getImageData(20,20,1,1).data; return d[2] > d[0];})()");
  ok(townSky, 'town sky brighter than red (outdoor lighting)');

  // dungeon 3D
  await ev("Town.leaveTown()");
  await ev("Dungeon.enter(Campaign.G.activeAdv, 0)");
  await new Promise(r => setTimeout(r, 500));
  const dg = await ev(canvasStats);
  ok(dg.nonEmpty > dg.sampled * 0.3, 'dungeon 3D canvas rendered (' + dg.nonEmpty + '/' + dg.sampled + ')');

  // combat 2D
  await ev("Combat.start('overland', { adv: Campaign.G.activeAdv, seed: 'vis', mobs: [{ id: 'goblin' }], ambush: false })");
  await new Promise(r => setTimeout(r, 800));
  const cb = await ev(canvasStats);
  ok(cb.nonEmpty > cb.sampled * 0.5, 'combat canvas rendered (' + cb.nonEmpty + '/' + cb.sampled + ')');
  // fight it out so the bestiary gets an entry
  for (let i = 0; i < 300 && CombatState() === 'on'; i++) {
    const state = await ev("Combat.C ? Combat.C.state + ':' + Combat.C.mode : 'none'");
    if (state === 'none') break;
    if (state === 'player:menu') {
      await ev("(function(){var a=Combat.current(); if(!a) return; var t=Combat.attackTargets(a); if(t.length){Combat.doAttack(a,t[0]);return;} var m=Combat.C.actors.find(function(x){return x.side==='mon'&&!x.dead;}); var cells=Combat.reachableCells(a); var best=null,bd=1e9; for(var k in cells){var cx=+k%Combat.C.grid.w, cy=Math.floor(+k/Combat.C.grid.w); if(Combat.actorAt(cx,cy))continue; var dd=Math.abs(cx-m.x)+Math.abs(cy-m.y); if(dd<bd){bd=dd;best=[cx,cy];}} if(best&&(Math.abs(best[0]-a.x)+Math.abs(best[1]-a.y) < Math.abs(a.x-m.x)+Math.abs(a.y-m.y))) Combat.doMove(a,best[0],best[1]); else Combat.doDefend(a);})()");
    }
    await new Promise(r => setTimeout(r, 120));
  }
  function CombatState() { return 'on'; }

  // panels render with content
  await ev("UI.sheet(0)");
  await new Promise(r => setTimeout(r, 250));
  ok(await ev("document.querySelectorAll('#ui .stat').length") >= 8, 'sheet stats rendered (' + await ev("document.querySelectorAll('#ui .stat').length") + ')');
  ok(await ev("!!document.querySelector('#ui .port') && document.querySelector('#ui .port').width === 48"), 'sheet portrait canvas');
  await ev("UI.close()");
  await ev("UI.inventory()");
  await new Promise(r => setTimeout(r, 250));
  ok(await ev("document.querySelectorAll('#ui .inv-row').length") >= 2, 'inventory rows rendered');
  await ev("UI.close()");
  await ev("MapView.open('dungeon')");
  await new Promise(r => setTimeout(r, 300));
  ok(await ev("!!document.getElementById('mapcv') && document.getElementById('mapcv').width > 0"), 'map canvas present');
  const mapPx = await ev("(function(){var cv=document.getElementById('mapcv'); var d=cv.getContext('2d', {willReadFrequently:true}).getImageData(0,0,cv.width,cv.height).data; var n=0; for (var i=0;i<d.length;i+=4*31){ if (d[i]+d[i+1]+d[i+2] > 30) n++; } return n;})()");
  ok(mapPx > 10, 'dungeon map has drawn cells');
  await ev("UI.close()");
  await ev("Bestiary.open()");
  await new Promise(r => setTimeout(r, 250));
  ok(await ev("document.querySelectorAll('#ui .best-entry').length") >= 1, 'bestiary entries rendered');
  await ev("UI.close()");

  ok(errs.length === 0, 'no page errors during visual pass' + (errs.length ? ': ' + errs[0] : ''));
  console.log('\nVISUAL: ' + pass + ' passed, ' + fail + ' failed');
  ws.close(); chrome.kill(); process.exit(fail ? 1 : 0);
})().catch(e => { console.error('CRASH:', e.message); process.exit(1); });
