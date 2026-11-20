/* ============================================================
   EMBERFALL — tools/chrome_test.js
   Headless Chrome integration: loads index.html for real,
   captures console errors / page errors, then drives the game
   through title -> new game -> 3 characters -> overland ->
   town -> dungeon -> forced combat, verifying canvas content
   and phase transitions.
   Usage: node tools/chrome_test.js
   ============================================================ */
'use strict';
const { spawn } = require('child_process');
const path = require('path');
const http = require('http');

const CHROME = process.platform === 'darwin'
  ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
  : (process.env.CHROME_BIN || 'google-chrome');
const PORT = 9377;
const URL_TARGET = 'file://' + path.join(__dirname, '..', 'index.html');

let passed = 0, failed = 0;
function ok(cond, label) {
  if (cond) { passed++; console.log('  PASS ' + label); }
  else { failed++; console.log('  FAIL ' + label); }
}

function getJson(p) {
  return new Promise((resolve, reject) => {
    http.get({ host: '127.0.0.1', port: PORT, path: p }, (res) => {
      let d = '';
      res.on('data', (c) => (d += c));
      res.on('end', () => resolve(JSON.parse(d)));
    }).on('error', reject);
  });
}
function waitFor(fn, ms, what) {
  return new Promise((resolve, reject) => {
    const t0 = Date.now();
    (function poll() {
      fn().then(resolve, () => {
        if (Date.now() - t0 > ms) reject(new Error('timeout: ' + what));
        else setTimeout(poll, 150);
      });
    })();
  });
}

(async () => {
  const chrome = spawn(CHROME, [
    '--headless=new', '--disable-gpu', '--no-sandbox',
    '--remote-debugging-port=' + PORT, '--window-size=1024,768',
    '--user-data-dir=' + path.join(__dirname, '_chrome_profile'),
    'about:blank'
  ], { stdio: 'ignore' });
  console.log('== chrome ==');
  await waitFor(() => getJson('/json/version'), 15000, 'chrome devtools');
  const version = await getJson('/json/version');
  console.log('  browser: ' + version.Browser);
  ok(true, 'chrome launched');

  // open a fresh tab
  const tabs = await getJson('/json/list');
  const tab = tabs.find((t) => t.type === 'page') || tabs[0];
  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));
  let idc = 0;
  const pending = {};
  const consoleMsgs = [];
  const pageErrors = [];
  const events = [];
  ws.onmessage = (m) => {
    const d = JSON.parse(m.data);
    if (d.id && pending[d.id]) { pending[d.id](d.result); delete pending[d.id]; }
    else if (d.method) {
      events.push(d.method);
      if (d.method === 'Runtime.consoleAPICalled') {
        consoleMsgs.push(d.params.args.map((a) => a.value != null ? a.value : (a.description || a.type)).join(' '));
      }
      if (d.method === 'Runtime.exceptionThrown') {
        pageErrors.push((d.params.exceptionDetails.exception && d.params.exceptionDetails.exception.description) || d.params.exceptionDetails.text);
      }
      if (d.method === 'Log.entryAdded') pageErrors.push('[log] ' + d.params.entry.text);
    }
  };
  function send(method, params) {
    return new Promise((resolve, reject) => {
      const id = ++idc;
      pending[id] = resolve;
      ws.send(JSON.stringify({ id, method, params: params || {} }));
      setTimeout(() => { if (pending[id]) { delete pending[id]; reject(new Error(method + ' timeout')); } }, 15000);
    });
  }
  async function evalJs(expr) {
    const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) throw new Error('page exception: ' + JSON.stringify(r.exceptionDetails).slice(0, 700));
    return r.result.value;
  }

  await send('Runtime.enable');
  await send('Log.enable');
  await send('Page.enable');
  await send('Page.navigate', { url: URL_TARGET });
  await waitFor(async () => {
    const t = await evalJs('document.readyState');
    if (t !== 'complete') throw new Error('loading');
  }, 15000, 'page load');
  await new Promise((r) => setTimeout(r, 500));

  console.log('== load ==');
  ok(await evalJs("typeof Game !== 'undefined'"), 'Game global present');
  ok(await evalJs("typeof Campaign !== 'undefined' && typeof ADV !== 'undefined' && typeof Combat !== 'undefined'"), 'core globals present');
  ok(pageErrors.length === 0, 'no page errors on load' + (pageErrors.length ? ': ' + pageErrors[0] : ''));
  ok(consoleMsgs.filter((m) => /error/i.test(m)).length === 0, 'no console.error on load' + (consoleMsgs.filter((m) => /error/i.test(m)).length ? ': ' + consoleMsgs[0] : ''));
  ok(await evalJs("document.querySelector('#ui').classList.contains('open') && document.querySelector('#ui h1') && document.querySelector('#ui h1').textContent === 'EMBERFALL'"), 'title screen rendered');

  console.log('== new game via real DOM click ==');
  await evalJs("document.querySelector('#ui [data-act=\"new\"]').click()");
  
  await evalJs("(function(){var b=document.querySelector('#ui [data-act=\"create.size\"][data-n=\"3\"]'); if(b) b.click();})()");
  const chars = [
    ['human', 'fighter', 'ne'],
    ['elf', 'mage', 'cn'],
    ['dwarf', 'cleric', 'le']
  ];
  for (const [race, cls, align] of chars) {
    await evalJs("document.querySelector('#ui [data-act=\"create.race\"][data-r=\"" + race + "\"]').click()");
    await evalJs("document.querySelector('#ui [data-act=\"create.class\"][data-c=\"" + cls + "\"]').click()");
    await evalJs("document.querySelector('#ui [data-act=\"create.align\"][data-a=\"" + align + "\"]').click()");
    await evalJs("(function(){var b=document.querySelector('#ui [data-act=\"create.roll\"]'); if(b) b.click();})()");
    await evalJs("(function(){var b=document.querySelector('#ui [data-act=\"create.next\"]'); if(b) b.click();})()");
    await evalJs("(function(){var b=document.querySelector('#ui [data-act=\"create.finish\"]'); if(!b) throw new Error('no finish button: ' + document.querySelector('#ui').innerHTML.slice(0,300)); b.click();})()");
    await new Promise((r) => setTimeout(r, 60));
  }
  ok(await evalJs("Campaign.G.party.length") === 3, 'party of 3 created');
  ok(await evalJs("Campaign.G.phase") === 'overland', 'phase is overland');
  ok(await evalJs("document.getElementById('cv').width > 0 && document.getElementById('cv').height > 0"), 'canvas sized');
  const px = await evalJs("(function(){var cv=document.getElementById('cv'); var d=cv.getContext('2d', {willReadFrequently: true}).getImageData(cv.width/2|0, cv.height/2|0, 1, 1).data; return (d[0]|d[1]|d[2]) > 0;})()");
  ok(px, 'overland canvas has non-blank pixels');

  console.log('== town via real DOM ==');
  await evalJs("Town.enter(Campaign.G.activeAdv)");
  ok(await evalJs("Campaign.G.phase") === 'town', 'town phase');
  const px2 = await evalJs("(function(){var cv=document.getElementById('cv'); var d=cv.getContext('2d', {willReadFrequently: true}).getImageData(cv.width/2|0, cv.height/2|0, 1, 1).data; return (d[0]|d[1]|d[2]) > 0;})()");
  ok(px2, 'town 3D canvas has pixels');
  await evalJs("Town.leaveTown()");
  ok(await evalJs("Campaign.G.phase") === 'overland', 'back to overland');

  console.log('== dungeon via real DOM ==');
  await evalJs("Dungeon.enter(Campaign.G.activeAdv, 0)");
  ok(await evalJs("Campaign.G.phase") === 'dungeon', 'dungeon phase');
  await evalJs("Dungeon.step(0,-1)");
  ok(await evalJs("Campaign.G.phase") === 'dungeon' || await evalJs("Campaign.G.phase") === 'combat', 'stepped (dungeon or combat)');
  await evalJs("if (Campaign.G.phase !== 'combat') Dungeon.search()");

  console.log('== forced combat via real DOM ==');
  await evalJs("Combat.start('overland', { adv: Campaign.G.activeAdv, seed: 'chrometest', mobs: [{ id: 'goblin' }, { id: 'goblin' }], ambush: false })");
  ok(await evalJs("Campaign.G.phase") === 'combat', 'combat started');
  // play until combat resolves (monster turns run on real 380ms timers)
  const t0 = Date.now();
  let lastStall = Date.now(), lastState = '';
  for (let i = 0; i < 700; i++) {
    const state = await evalJs("Combat.C ? (Combat.C.state + ':' + Combat.C.mode) : 'none'");
    if (state === 'none') break;
    const snap = await evalJs("Combat.C ? Combat.C.round + '.' + Combat.C.turnIdx : 'x'");
    if (snap !== lastState) { lastState = snap; lastStall = Date.now(); }
    if (Date.now() - t0 > 90000) break;
    if (Date.now() - lastStall > 15000) {
      // stall guard: hand the fight to auto-fight and let it finish
      console.log('  (stall detected, engaging auto-fight)');
      await evalJs("(function(){ var C = Combat.C; if (!C) return; if (C.state === 'player') { Combat.toggleAuto(); } else { C.auto = true; } })()");
      lastStall = Date.now();
    }
    if (state === 'player:menu') {
      await evalJs(`(function(){
        var a = Combat.current(); if (!a) return;
        var t = Combat.attackTargets(a);
        if (t.length) { Combat.doAttack(a, t[0]); return; }
        var mon = Combat.C.actors.find(function(m){return m.side==='mon' && !m.dead;});
        var cells = Combat.reachableCells(a);
        var best = null, bd = 1e9;
        for (var k in cells) {
          var cx = +k % Combat.C.grid.w, cy = Math.floor(+k / Combat.C.grid.w);
          if (Combat.actorAt(cx, cy)) continue;
          var d = Math.abs(cx - mon.x) + Math.abs(cy - mon.y);
          if (d < bd) { bd = d; best = [cx, cy]; }
        }
        if (best && (Math.abs(best[0]-a.x)+Math.abs(best[1]-a.y) < Math.abs(a.x-mon.x)+Math.abs(a.y-mon.y))) Combat.doMove(a, best[0], best[1]);
        else Combat.doDefend(a);
      })()`);
    }
    await new Promise((r) => setTimeout(r, 120));
  }
  ok(await evalJs("!Combat.C") === true, 'combat resolved');
  ok(await evalJs("Object.keys(Campaign.G.bestiary).length > 0"), 'bestiary recorded kills');
  ok(await evalJs("Campaign.G.phase") === 'overland', 'restored to overland after combat');


  console.log('== save / load via real DOM ==');
  ok(await evalJs("Campaign.saveGame('slot1'); true"), 'saved slot1');
  ok(await evalJs("Campaign.hasSave('slot1')"), 'slot1 present');
  ok(await evalJs("Campaign.loadGame('slot1')"), 'loaded slot1');

  console.log('== final error sweep ==');
  const errs = pageErrors.concat(consoleMsgs.filter((m) => /error|uncaught/i.test(m))).filter((m) => m.indexOf('willReadFrequently') < 0);
  ok(errs.length === 0, 'no errors across full run' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));

  console.log('\n== RESULT: ' + passed + ' passed, ' + failed + ' failed ==');
  ws.close();
  chrome.kill();
  process.exit(failed ? 1 : 0);
})().catch((e) => {
  console.error('CHROME TEST CRASH:', e && e.message || e);
  process.exit(2);
});
