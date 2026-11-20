/* ============================================================
   EMBERFALL — data.js
   The item list: ~300 items (weapons, armour, potions, scrolls,
   wands, staves, rings and other magic items, gems, jewellery,
   trade goods). Pure data; loaded right after rules.js.
   Item shape:
     n name, c category, d damage dice, sp weapon speed (level for
     a second attack), h hands, th throwable, rng missile range,
     ac armour class, sh shield flag, m magic bonuses {hit,dmg,ac},
     fx special effect flags, p potion effect, sc scroll ref,
     wd wand {charges,fx}, price gp, band shop level 1..5,
     qty default stack, desc flavor.
   ============================================================ */
'use strict';



var ITEMS = (function () {
  var I = {};
  function add(o) { I[o.id] = o; return o; }

  /* ---------- weapons ---------- */
  function wpn(id, n, d, sp, h, price, band, desc) {
    return add({ id:id, n:n, c:'weapon', d:d, sp:sp, h:h||1, price:price, band:band||1, desc:desc });
  }
  wpn('club','Club','1d6',8,1,5,1,'A heavy length of hardwood. Dull, honest and dependable.');
  wpn('dagger','Dagger','1d6',4,1,5,1,'A short, quick blade. Favored by thieves and quiet men.');
  wpn('hand_axe','Hand Axe','1d6',8,1,8,1,'One-hand axe, thrown or swung.');
  wpn('mace','Mace','1d6',8,1,10,1,'A studded head of iron on a wooden haft.');
  wpn('morningstar','Morningstar','1d6',8,1,12,1,'A spiked iron ball that bites deeper than it looks.');
  wpn('warhammer','Warhammer','1d8',8,1,12,1,'A two-pound head of wrought iron, balanced for heavy blows.');
  wpn('flail','Flail','1d8',10,1,20,2,'Chains and a spiked ball. It hits where the eye cannot follow.');
  wpn('quarterstaff','Quarterstaff','1d6',9,2,5,1,'A long pole of seasoned ash. It can parry as well as strike.');
  wpn('short_sword','Short Sword','1d8',8,1,15,1,'The common soldier\u2019s blade, short and sure.');
  wpn('long_sword','Long Sword','1d10',9,1,40,2,'A true arming sword. The weapon of choice for a hundred years of swordsmen.');
  wpn('two_sword','Two-Handed Sword','2d6',10,2,75,2,'A great blade that needs both hands and a steady heart.');
  wpn('battle_axe','Battle Axe','1d10',10,1,40,2,'A wide, sweeping head. One good swing and the job is done.');
  wpn('axe','Axe','1d8',10,1,15,1,'A woodcutter\u2019s axe, good enough for fighting in a pinch.');
  wpn('poleaxe','Poleaxe','1d10',12,2,50,2,'A long shaft with axe, spike and hook. A dwarf\u2019s pride.');
  wpn('halberd','Halberd','1d10+1',12,2,50,2,'A reach weapon of blade and fluke. Kept in pikes and halls alike.');
  wpn('trident','Trident','1d8',12,2,30,2,'Three prongs of tempered steel. Also a fisherman\u2019s tool.');
  wpn('war_pike','War Pike','1d10+1',12,2,35,2,'Long as a doorpost. Nothing walks past a wall of these.');
  wpn('spear','Spear','1d8',10,1,10,1,'Shaft and leaf of iron. Simple, and it saves lives.');
  wpn('javelin','Javelin','1d6',10,1,5,1,'A throwing spear for one good hurled strike.');
  wpn('war_pick','War Pick','1d8',10,1,25,2,'A narrow head that seeks the gap in the mail.');

  /* ---------- ranged ---------- */
  function bow(id, n, d, rng, sp, price, band, desc) {
    return add({ id:id, n:n, c:'ranged', d:d, rng:rng, sp:sp, h:1, price:price, band:band||1, desc:desc });
  }
  bow('short_bow','Short Bow','1d6',6,8,20,1,'Yew and horn, six squares of honest range.');
  bow('long_bow','Long Bow','1d8',8,8,50,2,'A six-foot shaft of yew. The marksmen\u2019s pride.');
  bow('comp_bow','Composite Bow','1d6',8,6,60,2,'Laminated wood and horn, fast loosing and far-reaching.');
  bow('crossbow_light','Light Crossbow','1d6',6,9,30,1,'A stock and a latch. It does not need a strong arm, only a steady one.');
  bow('crossbow_heavy','Heavy Crossbow','1d8',10,10,100,3,'Slow to wind, hard to stop. It parts shield and hide.');
  bow('sling','Sling','1d4',5,6,5,1,'A leather pocket on a cord. The oldest weapon still in use.');
  add({ id:'arrows', n:'Arrows (10)', c:'ammo', ammo:'bow', qty:10, price:2, band:1,
    desc:'A quiver of ten fletched shafts. Bows eat these.' });
  add({ id:'bolts', n:'Bolts (10)', c:'ammo', ammo:'xbow', qty:10, price:3, band:1,
    desc:'A pouch of ten crossbow bolts.' });
  add({ id:'sling_bullets', n:'Sling Bullets (20)', c:'ammo', ammo:'sling', qty:20, price:1, band:1,
    desc:'Smooth lead balls, weighed to the grain.' });

  /* ---------- armour & shields ---------- */
  function armor(id, n, ac, price, band, desc) {
    return add({ id:id, n:n, c:'armor', ac:ac, price:price, band:band||1, desc:desc });
  }
  armor('leather','Leather Armour',7,10,1,'Oiled hides. Light, quiet, and better than nothing.');
  armor('studded','Studded Leather',6,25,1,'Leather studded with iron bosses. The travelling standard.');
  armor('chain','Chain Mail',5,60,1,'Ten thousand rings of folded steel.');
  armor('scale','Scale Mail',5,70,2,'Steel scales riveted to a linen lining.');
  armor('brigandine','Brigandine',4,120,3,'Iron plates hidden beneath a cloth coat.');
  armor('splint','Splint Armour',3,250,3,'Wood and steel, boiled and laced. Heavy, and worth it.');
  armor('plate','Plate Armour',2,500,4,'A coat of hammered steel that turns a blade like a raindrop.');
  function shield(id, n, price, band, desc) {
    return add({ id:id, n:n, c:'shield', ac:1, sh:true, price:price, band:band||1, desc:desc });
  }
  shield('buckler','Buckler',5,1,'A small round shield held in the fist.');
  shield('round','Round Shield',10,1,'A classic roundel, bossed and painted.');
  shield('kite','Kite Shield',15,2,'Tall and narrow, shaped to the shoulders.');
  shield('tower','Tower Shield',30,3,'A great board of oak and iron. The face behind it barely shows.');

  /* ---------- common gear ---------- */
  add({ id:'torch', n:'Torch', c:'gear', qty:1, price:1, band:1, light:120,
    desc:'Lit, it burns for two hours and lights the nearest dark.' });
  add({ id:'lantern', n:'Lantern', c:'gear', qty:1, price:5, band:1, light:240,
    desc:'A glass-paned lamp that lasts four hours and keeps out the wind.' });
  add({ id:'lockpicks', n:'Lockpicks', c:'gear', qty:1, price:5, band:1, pick:2,
    desc:'A thin set of picks. Open Locks rolls gain +2.' });
  add({ id:'spyglass', n:'Spyglass', c:'gear', qty:1, price:25, band:1, spyglass:1,
    desc:'On use over land, it reveals a rumour of the region.' });
  add({ id:'silver_mirror', n:'Silver Mirror', c:'gear', qty:1, price:100, band:2, mirror:1,
    desc:'Polished silver. Once per dungeon, it shows the hidden doors of the floor.' });
  add({ id:'caltrops', n:'Caltrops', c:'gear', qty:1, price:10, band:1, caltrops:1,
    desc:'Iron spikes. In battle, plant them; the next foot that crosses is paid for.' });
  add({ id:'rations', n:'Rations', c:'gear', qty:10, price:1, band:1, rations:1,
    desc:'Dried meat and hardtack. One per traveller per overland day.' });
  add({ id:'faded_map', n:'Faded Map', c:'gear', qty:1, price:50, band:2, map_item:1,
    desc:'An old chart, edges worn to string. It marks the deep places below.' });

  /* ---------- potions ---------- */
  function pot(id, n, price, band, fx, desc) {
    return add({ id:id, n:n, c:'potion', price:price, band:band||1, p:fx, desc:desc });
  }
  pot('p_heal','Potion of Healing',100,1,{ heal:'1d6+1' },'It warms the chest and knits the wound.');
  pot('p_heal_great','Potion of Greater Healing',300,2,{ heal:'3d6' },'A deep, rolling warmth from the heart outward.');
  pot('p_heal_extra','Potion of Extra Healing',500,3,{ heal:'5d6' },'The draught of the shrine-keepers, for the edge of death.');
  pot('p_life','Potion of Life',1000,4,{ heal:'full' },'Gold on the tongue, fire in the veins. It gives back everything lost.');
  pot('p_cure_poison','Potion of Antidote',200,1,{ cure_poison:1 },'Cold and minty. It purges what was not meant for you.');
  pot('p_restore_lvl','Potion of Level Restoration',1500,3,{ restore_level:1, heal:'3d6' },
    'If a level has been drained from you, this gives it back. Otherwise it heals 3d6.');
  pot('p_invis','Potion of Invisibility',300,2,{ status:'invis', mins:60 },'The world narrows to sound and smell.');
  pot('p_strength','Potion of Strength',300,2,{ status:'strong', mins:120 },'The muscles swell and the world feels light to lift.');
  pot('p_heroism','Potion of Heroism',200,2,{ status:'heroic', mins:120 },'The blood runs loud and sure; +1 to hit for two hours.');
  pot('p_fire_res','Potion of Fire Resistance',400,3,{ status:'res_fire', mins:120 },'A slow ember settles in the blood. Fire half its bite.');
  pot('p_cold_res','Potion of Cold Resistance',400,3,{ status:'res_cold', mins:120 },'A winter chills in the chest. Cold half its bite.');
  pot('p_protect','Potion of Protection',300,2,{ status:'ward', mins:60 },'A film of light over the skin. Armour class improved for the hour.');
  pot('p_detect','Potion of Detection',150,1,{ detect_mins:10 },'The eyes tingle. Hidden things mark themselves on the mind\u2019s map.');
  pot('p_stinking','Potion of Stinking Cloud',250,3,{ cast:'stinking_cloud' },'Shake it near a foe and pour. A yellow cloud does the rest.');
  pot('p_vitality','Draught of Vitality',100,1,{ heal:'2d6' },'A bracing tonic that restores 2d6 hit points.');
  pot('p_courage','Potion of Courage',200,2,{ status:'courage', mins:60 },'No fear may take hold for the hour; +1 against fear and magic of the mind.');
  pot('p_stone','Potion of Stone Skin',400,3,{ status:'stone_skin', mins:120 },'The flesh hardens like old oak. Non-magic blows lose force.');
  pot('p_speed','Potion of Swiftness',500,4,{ status:'haste', mins:60 },'The mind races ahead of the body; a further attack and a swifter step.');
  pot('p_endurance','Potion of Endurance',300,2,{ status:'endure', mins:1440 },'No fatigue may touch you for the day. The road is yours.');
  pot('p_clarity','Potion of Clarity',200,2,{ cleanse:1 },'It lifts one curse, one cloud, one madness from the drinker.');

  /* ---------- scrolls (generated from the spell lists) ---------- */
  var scrollPrice = { 1:75, 2:200, 3:500, 4:1200, 5:2500, 6:5000, 7:8000 };
  var scrollBand  = { 1:1, 2:1, 3:2, 4:3, 5:4, 6:5, 7:5 };
  ['wizard','priest'].forEach(function (who) {
    var max = (who === 'wizard') ? 5 : 7;
    for (var id in RULES.SPELLS[who]) {
      var s = RULES.SPELLS[who][id];
      if (s.lvl > max) continue;
      add({ id:'sc_'+who+'_'+id, n:'Scroll of '+s.n, c:'scroll',
        sc:{ who:who, spell:id, lvl:s.lvl },
        price:scrollPrice[s.lvl], band:scrollBand[s.lvl],
        desc:'Parchment and ink, the working of '+s.n+' written once.' });
    }
  });

  /* ---------- wands ---------- */
  function wand(id, n, charges, fx, price, band, desc) {
    return add({ id:id, n:n, c:'wand', wd:{ charges:charges, fx:fx }, price:price, band:band||2, desc:desc });
  }
  wand('w_fire','Wand of Fire',15,{ area:2, dmg:'3d6', save:0, half:true },1500,2,'A bone staff that hisses when it is nearly spent.');
  wand('w_fire_great','Wand of Fire (Greater)',5,{ area:3, dmg:'5d6', save:0, half:true },4000,4,'The same working, drawn out and fed.');
  wand('w_lightning','Wand of Lightning',15,{ line:5, dmg:'2d6', save:0, half:true },1500,2,'It smells of rain before it strikes.');
  wand('w_lightning_great','Wand of Lightning (Greater)',5,{ line:7, dmg:'4d6', save:0, half:true },4000,4,'A storm kept on a leash.');
  wand('w_mm','Wand of Magic Missiles',15,{ missiles:2, dmg:'1d6+1' },1200,2,'Twin motes of force, sure as a heart\u2019s beat.');
  wand('w_heal','Wand of Healing',15,{ heal:'3d6', ally:true },1500,2,'A warmth passes out of the wood into the one you name.');
  wand('w_paral','Wand of Paralyzation',8,{ status:'stun', dur:1, noSave:true },3000,3,'The mark stands as if in resin, for a round.');
  wand('w_cold','Wand of Cold',15,{ cone:3, dmg:'2d6', save:0, half:true },1500,2,'Frost crawls along the air and bites deep.');
  wand('w_sleep','Wand of Sleeping',10,{ status:'sleep', dur:2, hdMax:4 },2000,3,'Small creatures of 4 HD or less fall where they stand.');
  wand('w_ouch','Wand of Ouch',4,{ dmg:'5d6', noSave:true },6000,4,'One word, one blow, no saving throw.');
  wand('w_web','Wand of Webbing',8,{ area:3, status:'ensnare', dur:2, save:0 },2000,3,'Strands of force erupt from the ground and snare.');
  wand('w_fog','Wand of Fog',8,{ cloud:3, dur:2, blockSight:true },1500,2,'A grey fog rolls out and eats the sight.');
  wand('w_ouch_great','Wand of Ouch (Greater)',3,{ dmg:'7d6', noSave:true },8000,5,'The word that ends arguments.');
  wand('w_holy','Wand of Holy Fire',8,{ dmg:'3d6', undeadBonus:'1d6' },3000,3,'Clean fire that only the unclean can feel.');
  wand('w_chain','Wand of Chain Lightning',5,{ line:7, dmg:'3d6', save:0, half:true, chain:2 },4000,4,'A fork of storm-crack that leaps to a second mark.');

  /* ---------- rings ---------- */
  function ring(id, n, price, band, fx, desc) {
    return add({ id:id, n:n, c:'ring', price:price, band:band||3, fx:fx, desc:desc });
  }
  ring('r_prot1','Ring of Protection +1',2000,2,{ ac:1 },'A band of plain silver that turns a blade\u2019s edge.');
  ring('r_prot2','Ring of Protection +2',8000,4,{ ac:2 },'Old gold, colder to the touch than any metal has a right to be.');
  ring('r_strength','Ring of Strength',5000,3,{ str:18 },'The arm that wears it finds a strength it did not know.');
  ring('r_swift','Ring of Swift Movement',4000,3,{ swift:1 },'The steps come out lighter and faster than thought.');
  ring('r_dragon','Ring of Dragon Resistance',6000,4,{ res_dragon:1 },'A shard of scale set in iron. Dragon fire half its bite.');
  ring('r_fire_res','Ring of Fire Resistance',3000,3,{ res_fire:1 },'An ember that never burns. Fire half its bite.');
  ring('r_cold_res','Ring of Cold Resistance',3000,3,{ res_cold:1 },'Frost that never melts. Cold half its bite.');
  ring('r_regen','Ring of Regeneration',15000,5,{ regen:1 },'Wounds close over it, round by round, like water over stone.');
  ring('r_detect','Ring of Detection',4000,3,{ detect:1 },'What moves in the dark moves against a tingling in the ring.');
  ring('r_free','Ring of Free Action',9000,4,{ free_action:1 },'No web, no root, no held breath may keep the hand that wears it still.');
  ring('r_luck','Ring of Fel Luck',5000,4,{ luck:1 },'Thief\u2019s work comes easier; skills gain +5.');

  /* ---------- amulets ---------- */
  function amu(id, n, price, band, fx, desc) {
    return add({ id:id, n:n, c:'amulet', price:price, band:band||3, fx:fx, desc:desc });
  }
  amu('a_detect','Amulet of Detection',5000,3,{ detect_far:1 },'It knows the living within ten squares, whatever the dark.');
  amu('a_protect','Amulet of Protection',2500,2,{ ac:1 },'A stone heart on a silver chain. Armour class improved.');
  amu('a_wanderer','Amulet of the Wanderer',4000,3,{ wanderer:1 },'Roads, fens and hills feel easier on the neck that bears it.');
  amu('a_life','Amulet of Life Protection',10000,5,{ life_prot:1 },'The first death that reaches for the wearer misses. Once.');
  amu('a_heroism','Amulet of Heroism',3000,2,{ save_undead:1 },'Saving throws against the dead and unclean gain +1.');

  /* ---------- cloaks ---------- */
  add({ id:'c_invis', n:'Cloak of Invisibility', c:'cloak', price:12000, band:5,
    fx:{ cloak_invis:1 },
    desc:'While worn, the body that is under it is not there. A strike breaks the weave.' });
  add({ id:'c_elvenkind', n:'Cloak of Elvenkind', c:'cloak', price:5000, band:4,
    fx:{ stealth:5 },
    desc:'Woven with spider-silk. Stealth and shadow-work gain +5.' });
  add({ id:'c_shadows', n:'Cloak of Shadows', c:'cloak', price:6000, band:4,
    fx:{ stealth_range:1 },
    desc:'The dark clings to the shoulders. Beasts and the like see you two squares sooner.' });

  /* ---------- staves ---------- */
  function staff(id, n, charges, fx, price, band, desc) {
    return add({ id:id, n:n, c:'staff', wd:{ charges:charges, fx:fx }, staff:true, price:price, band:band||3, desc:desc });
  }
  staff('st_heal','Staff of Healing',7,{ heal:'3d6', ally:true },3000,3,'A green-wood staff with a heart of warmth.');
  staff('st_heal_great','Staff of Healing (Greater)',3,{ heal:'5d6', ally:true },8000,4,'The same working, drawn deep from the wood.');
  staff('st_fire','Staff of Fire',5,{ cast:'fireball' },5000,4,'It hums like a kettle before the storm of it comes.');
  staff('st_ice','Staff of Ice',5,{ cast:'cone_cold' },5000,4,'Frost blooms on the grain when the air grows warm.');
  staff('st_lightning','Staff of Lightning',5,{ cast:'lightning_bolt' },6000,4,'Storm-wood, blackened, that remembers the sky.');
  staff('st_power','Staff of Power',3,{ heal:'5d6', ally:true, power:1 },10000,5,'Three great workings are kept in it, and then the wood is quiet.');
  staff('st_thunder','Staff of Thunder',5,{ line:4, dmg:'2d6', save:0, half:true },5000,4,'It strikes the air and the air strikes back.');
  staff('st_deep_ice','Staff of Deep Ice',3,{ cone:4, dmg:'3d6', save:0, half:true },8000,5,'The cold of the places where no sun has ever reached.');
  staff('st_ward','Staff of Wards',4,{ cast:'shield' },4000,3,'It puts a quiet wall of light between the bearer and harm.');

  /* ---------- magic weapons ---------- */
  function mwpn(id, n, base, bonus, price, band, extra, desc) {
    var w = I[base];
    var o = { id:id, n:n, c:w.c, d:w.d, sp:w.sp, h:w.h, m:{ hit:bonus, dmg:bonus },
      price:price, band:band||3, desc:desc || 'It strikes truer and bites harder than its plain kind.' };
    if (w.rng) { o.rng = w.rng; o.c = 'ranged'; }
    if (extra) for (var k in extra) o[k] = extra[k];
    return add(o);
  }
  mwpn('dagger_1','Dagger +1','dagger',1,1000,2);
  mwpn('short_sword_1','Short Sword +1','short_sword',1,1000,2);
  mwpn('long_sword_1','Long Sword +1','long_sword',1,1000,2);
  mwpn('two_sword_1','Two-Handed Sword +1','two_sword',1,1000,3);
  mwpn('mace_1','Mace +1','mace',1,1000,2);
  mwpn('flail_1','Flail +1','flail',1,1000,2);
  mwpn('axe_1','Axe +1','axe',1,1000,2);
  mwpn('long_bow_1','Long Bow +1','long_bow',1,1200,2);
  mwpn('halberd_1','Halberd +1','halberd',1,1000,3);
  mwpn('crossbow_heavy_1','Heavy Crossbow +1','crossbow_heavy',1,1200,3);
  mwpn('dagger_2','Dagger +2','dagger',2,4000,4);
  mwpn('short_sword_2','Short Sword +2','short_sword',2,4000,4);
  mwpn('long_sword_2','Long Sword +2','long_sword',2,4000,4);
  mwpn('two_sword_2','Two-Handed Sword +2','two_sword',2,4000,4);
  mwpn('mace_2','Mace +2','mace',2,4000,4);
  mwpn('flail_2','Flail +2','flail',2,4000,4);
  mwpn('poleaxe_2','Poleaxe +2','poleaxe',2,4500,4);
  mwpn('long_bow_2','Long Bow +2','long_bow',2,4500,4);
  mwpn('two_sword_3','Two-Handed Sword +3','two_sword',3,10000,5,
    null,'The finest blade ever taken from a forge. It does not miss its moment.');

  /* special weapons */
  function swpn(id, n, base, extra, price, band, desc) {
    var w = I[base];
    var o = { id:id, n:n, c:w.c, d:w.d, sp:w.sp, h:w.h, m:{ hit:0, dmg:0 },
      price:price, band:band||4, desc:desc };
    if (w.rng) { o.rng = w.rng; o.c = 'ranged'; }
    for (var k in extra) o[k] = extra[k];
    return add(o);
  }
  swpn('flame_tongue','Flame Tongue','long_sword',{ extra_fire:'1d6' },4000,4,
    'The edge runs with living fire; it adds 1d6 flame to every blow.');
  swpn('frost_brand','Frost Brand','long_sword',{ extra_cold:'1d6' },4000,4,
    'The blade is cold as a winter dawn; it adds 1d6 chill to every blow.');
  swpn('storm_blade','Storm Blade','two_sword',{ extra_light:'1d6' },5000,4,
    'It sparks and cracks as it is drawn; it adds 1d6 lightning to every blow.');
  swpn('demonbrand','Demonbrand','mace',{ extra_fire:'1d6' },4000,4,
    'Forged dark. It adds 1d6 burning to every blow, and the unclean flinch at it.');
  swpn('soul_reaver','Soul Reaver','two_sword',{ vamp:1, m:{ hit:1, dmg:1 } },8000,5,
    'What it wounds, it keeps: the bearer regains half the damage it deals.');
  swpn('windfury','Windfury','short_sword',{ double:1 },6000,5,
    'It swings like a gust; the bearer attacks twice with it.');
  swpn('thunder_hammer','Thunder Hammer','warhammer',{ stun_on_hit:1 },5000,4,
    'It rings when it strikes; a save or the mark is stunned for a round.');
  swpn('sun_blade','Sun Blade','two_sword',{ vs_undead:'1d6', m:{ hit:1, dmg:1 } },7000,5,
    'Daylight held in a blade. It burns the dead for an extra 1d6.');
  swpn('shadowfang','Shadowfang','dagger',{ vamp:1, m:{ hit:1, dmg:1 } },6000,5,
    'A knife out of a moonless night. The bearer keeps half of what it wounds.');
  swpn('grave_iron','Grave Iron','mace',{ vs_undead:'1d6', m:{ hit:1, dmg:1 } },5000,5,
    'Blessed and black. The dead take an extra 1d6 from it.');

  /* ---------- magic armour ---------- */
  function marm(id, n, base, bonus, price, band, desc) {
    var a = I[base];
    return add({ id:id, n:n, c:'armor', ac:a.ac, m:{ ac:bonus }, price:price, band:band||3,
      desc:desc || 'Old work, truer than it looks.' });
  }
  marm('leather_1','Leather Armour +1','leather',1,1000,2);
  marm('studded_1','Studded Leather +1','studded',1,1200,2);
  marm('chain_1','Chain Mail +1','chain',1,1500,3);
  marm('chain_2','Chain Mail +2','chain',2,5000,4);
  marm('scale_1','Scale Mail +1','scale',1,1500,3);
  marm('brigandine_1','Brigandine +1','brigandine',1,2500,3);
  marm('plate_1','Plate Armour +1','plate',1,6000,4);
  marm('plate_2','Plate Armour +2','plate',2,10000,5,
    'A coat of steel that has turned a hundred blades and will turn a hundred more.');
  marm('kite_1','Kite Shield +1','kite',1,1500,3);
  marm('tower_2','Tower Shield +2','tower',2,5000,4);
  marm('buckler_1','Buckler +1','buckler',1,1000,2);

  /* ---------- boots / belts / gloves / bracers ---------- */
  add({ id:'b_speed', n:'Boots of Speed', c:'boots', price:3000, band:3, fx:{ swift:1 },
    desc:'The feet carry where the legs are not.' });
  add({ id:'b_silent', n:'Boots of Silent Walking', c:'boots', price:3000, band:3, fx:{ stealth:5 },
    desc:'Stone and tile do not know the feet that wear them.' });
  add({ id:'b_wanderer', n:'Boots of the Wanderer', c:'boots', price:4000, band:3, fx:{ wanderer:1 },
    desc:'Roads, fens and hills feel easier on the feet that bear them.' });
  add({ id:'belt_vitality', n:'Belt of Vitality', c:'belt', price:3000, band:3, fx:{ hp:2 },
    desc:'Two further points of heart and breath.' });
  add({ id:'belt_strength', n:'Belt of Giant Strength', c:'belt', price:6000, band:4, fx:{ str:18 },
    desc:'The arm that it girds finds a strength it did not know.' });
  add({ id:'g_thievery', n:'Gloves of Thievery', c:'gloves', price:4000, band:3, fx:{ picks:5 },
    desc:'Locks and traps give easier to these hands. Open/Remove traps gain +5.' });
  add({ id:'bracers_defense', n:'Bracers of Defense', c:'boots', price:2500, band:2, fx:{ ac:1 },
    desc:'Steel bands for the forearms. Armour class improved.' });

  /* ---------- gems ---------- */
  function gem(id, n, price, desc) {
    return add({ id:id, n:n, c:'gem', price:price, band:1, gem:1, desc:desc });
  }
  gem('g_pearl','Moon Pearl',50,'A pearl the colour of a full moon on water.');
  gem('g_amber','Amber Bead',200,'A fly asleep in gold, ten thousand years.');
  gem('g_crystal','Crystal Cluster',300,'Jagged clear glass that sings to a struck tuning-fork.');
  gem('g_bloodstone','Bloodstone',800,'Dark red stone, warm to the touch.');
  gem('g_emerald','Emerald',1000,'Green as the deep of the forest, unclouded.');
  gem('g_topaz','Topaz',1200,'The colour of a harvest sunset, cut deep.');
  gem('g_sapphire','Sapphire',1500,'Blue as the sky a moment before a storm.');
  gem('g_ember_opal','Ember Opal',1000,'An original cut: fire rolls under the surface of it.');
  gem('g_star_shard','Star Shard',2000,'A splinter of something that fell. It is never quite cold.');
  gem('g_ruby','Ruby',3000,'Red as a wound in the rock, cut to a point.');
  gem('g_diamond','Diamond',5000,'It throws the light back at you and does not forgive it.');

  /* ---------- jewellery ---------- */
  function jewel(id, n, price, desc) {
    return add({ id:id, n:n, c:'jewel', price:price, band:1, gem:1, desc:desc });
  }
  jewel('j_pin','Silver Pin',50,'A plain silver pin, well made.');
  jewel('j_comb','Ivory Comb',150,'Carved ivory, fine as a hair.');
  jewel('j_gold_ring','Gold Ring',300,'A smooth band of honest gold.');
  jewel('j_chain','Gold Chain',500,'Links the size of a thumbnail, bright and even.');
  jewel('j_tiara','Tiara',800,'A circlet of gold set with three small stones.');
  jewel('j_circlet','Gold Circlet',1000,'Old work, engraved with a pattern no smith will name.');
  jewel('j_platinum_pin','Platinum Hairpin',800,'Cool, heavy, and far better made than it needs to be.');
  jewel('j_dragonbone','Dragonbone Necklace',1500,'A scale of some great thing, polished to a shine.');

  /* ---------- trade goods ---------- */
  function trade(id, n, price, desc) {
    return add({ id:id, n:n, c:'trade', price:price, band:1, trade:1, desc:desc });
  }
  trade('t_silk','Bolt of Silk',100,'Fine silk, unbleached.');
  trade('t_spice','Chest of Spices',200,'Saffron, pepper, and things named in other tongues.');
  trade('t_ledger','Merchant\u2019s Ledger',150,'A well-kept book of debts and credits.');
  trade('t_vial','Crystal Vial',300,'Empty, sealed, and worth the glass alone.');
  trade('t_ingot','Silver Ingot',500,'Stamped silver, road-safe money.');
  trade('t_copper','Copper Ingot',50,'Common copper, honest weight.');
  trade('t_beads','Glass Beads (bag)',80,'Bright beads, the trade currency of the fen-folk.');

  return I;
})();

if (typeof module !== 'undefined' && module.exports) module.exports = { ITEMS: ITEMS };
