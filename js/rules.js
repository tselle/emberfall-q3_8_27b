/* ============================================================
   EMBERFALL — rules.js
   Second-edition style core rules: abilities, races, classes,
   THAC0, descending AC, five saving throws, XP/HP/THAC0 tables,
   weapon specialization, thief skills, spell memorization,
   and the full wizard / priest spell lists.
   Pure data + tiny local helpers (loads before modules.js).
   ============================================================ */
'use strict';

var RULES = (function () {
  var R = {};

  /* ---------- abilities ---------- */
  R.ABILITY_KEYS = ['str','int','wis','dex','con','cha'];
  R.ABILITY_NAMES = { str:'Strength', int:'Intelligence', wis:'Wisdom',
    dex:'Dexterity', con:'Constitution', cha:'Charisma' };

  R.abilityMod = function (v) {
    // to-hit / damage / AC modifiers (classic tables, condensed)
    if (v <= 4) return -2;
    if (v === 5 || v === 6) return -1;
    if (v <= 15) return 0;
    if (v === 16 || v === 17) return 1;
    if (v === 18) return 2;
    if (v === 19) return 3;
    return 4;
  };
  R.dmgMod = function (str) {
    if (str <= 5) return -1;
    if (str <= 12) return 0;
    if (str <= 15) return 1;
    if (str <= 17) return 2;
    if (str === 18) return 3;
    return 4;
  };
  R.acMod = function (dex) {
    if (dex <= 4) return -3;
    if (dex <= 5) return -2;
    if (dex <= 9) return -1;
    if (dex <= 15) return 0;
    if (dex <= 17) return 1;
    if (dex === 18) return 2;
    return 3;
  };
  R.missileMod = function (dex) {
    if (dex <= 4) return -2;
    if (dex <= 8) return -1;
    if (dex <= 15) return 0;
    if (dex <= 17) return 1;
    return 2;
  };

  /* ---------- races ---------- */
  // move: squares per round-equivalent (humans 12, demi-humans ~15% slower)
  R.RACES = {
    human:   { name:'Human',   move:12,
      classes:{ fighter:20, paladin:20, ranger:20, mage:20, cleric:20, thief:20 },
      align:['nn','ce','le','cg','lg','ne','cn','fe'],
      save:{}, desc:'The most common folk of the Emberwild. Adaptable and ambitious, humans settle every road and ruin.' },
    dwarf:   { name:'Dwarf',   move:10,
      classes:{ fighter:20, cleric:20 },
      align:['lg','le','ne'],
      save:{ poison:-1, breath:-1 },
      desc:'Stout and steady, dwelling in deep-hewn halls. Dwarves see in the dark and sense hidden doors as a birthright.' },
    elf:     { name:'Elf',     move:10,
      classes:{ fighter:20, mage:20, cleric:5 },
      align:['cg','ce','cn','nn'],
      save:{ magic:-1 },
      desc:'Slender and long-lived, kin to the old forests. Elves see in the dark and bend magic with an easy hand.' },
    gnome:   { name:'Gnome',   move:10,
      classes:{ fighter:15, thief:15, mage:15 },
      align:['cg','ce','cn'],
      save:{ magic:-1 },
      desc:'Quick-witted and quick-footed, dwelling in mossy hollows. Gnomes are natural tricksters and tinkerers.' },
    halfelf: { name:'Half-Elf',move:12,
      classes:{ fighter:20, thief:20, mage:15, cleric:15 },
      align:['nn','ce','le','cg','lg','cn','fe'],
      save:{},
      desc:'Between two peoples, at home in neither. Half-elves make fine rangers, priests and swashbucklers.' },
    halfling:{ name:'Halfling',move:10,
      classes:{ fighter:20, thief:20 },
      align:['nn'],
      save:{ all:-1 },
      desc:'Small, lucky and fond of good food. Halflings move a little slower than humans but are hard to shake.' }
  };

  // prime-requisite XP bonus by score (class prime OR race prime, stacked, capped 40%)
  R.primeBonus = function (score) {
    if (score >= 18) return 20;
    if (score === 17) return 15;
    if (score >= 15) return 10;
    return 0;
  };
  R.RACE_PRIME = { human:'str', dwarf:'con', elf:'int', gnome:'int',
    halfelf:'cha', halfling:'dex' };
  R.raceXpBonus = function (race, ab) {
    var p = R.RACE_PRIME[race];
    return R.primeBonus(ab[p] || 9);
  };

  /* ---------- classes ---------- */
  R.CLASSES = {
    fighter:{ name:'Fighter', hd:'1d6', prime:'str', align:[],
      weapons:'all',
      desc:'The backbone of any company. Fighters may specialize in one weapon.' },
    paladin:{ name:'Paladin', hd:'1d6', prime:'wis', align:['lg','ng','ne'],
      weapons:'melee',
      desc:'Sworn sword of the old oaths. Paladins turn undead as a cleric two levels lower.' },
    ranger: { name:'Ranger', hd:'1d6', prime:'dex', align:[],
      weapons:'all',
      desc:'Tracker and skirmisher. Ranges are competitive with specialized fighters.' },
    mage:   { name:'Mage', hd:'1d4', prime:'int', align:[],
      weapons:'all', spells:'wizard', book:true,
      desc:'Student of the deep lore. Mages learn spells from scrolls into a spellbook.' },
    cleric: { name:'Cleric', hd:'1d6', prime:'wis', align:[],
      weapons:'all', spells:'priest',
      desc:'Voice of the shrine. Clerics heal, smite and turn the dead.' },
    thief:  { name:'Thief', hd:'1d4', prime:'dex', align:[],
      weapons:'all',
      desc:'The unseen hand. Thieves find and remove traps, pick locks and backstab.' }
  };

  // dwarf / halfling get tougher hit dice for a few classes
  R.hitDice = function (race, cls) {
    var base = R.CLASSES[cls].hd;
    if ((race==='dwarf' && (cls==='fighter'||cls==='cleric'))) return '2d6';
    if (race==='halfling' && cls==='thief') return '2d6';
    if (race==='halfling' && cls==='fighter') return '1d6';
    return base;
  };

  /* ---------- experience tables (XP required to REACH level; index 0 = level 1 = 0) ---------- */
  R.XP = {
    fighter:[0,1500,3000,7500,15000,30000,45000,75000,135000,270000,540000,750000,950000,1250000,1500000,2000000,2500000,3500000,4500000,5500000],
    paladin:[0,1300,2600,6500,13000,26000,39000,65000,117000,234000,468000,650000,845000,1100000,1350000,1750000,2250000,3000000,4000000,5000000],
    ranger: [0,1300,2600,6500,13000,26000,39000,65000,117000,234000,468000,650000,845000,1100000,1350000,1750000,2250000,3000000,4000000,5000000],
    mage:   [0,1200,2400,6000,12000,24000,36000,60000,108000,216000,432000,600000,770000,1000000,1200000,1500000,2000000,2500000,3500000,4500000],
    cleric: [0,1500,3000,7500,15000,30000,45000,75000,135000,270000,540000,750000,950000,1250000,1500000,2000000,2500000,3500000,4500000,5500000],
    thief:  [0,900,1800,4500,9000,18000,27000,45000,81000,162000,324000,450000,570000,750000,900000,1100000,1400000,1800000,2200000,2500000]
  };

  /* ---------- THAC0 (to-hit) tables, index 0 = level 1 ---------- */
  R.THAC0 = {
    fighter:[19,18,17,16,15,14,13,12,11,10,9,8,7,6,5,4,3,2,2,1],
    paladin:[19,19,18,17,16,15,14,13,12,11,10,9,8,7,6,5,4,3,2,2],
    ranger: [19,18,17,16,15,14,13,12,11,10,9,8,8,7,6,5,4,3,2,2],
    mage:   [20,19,18,17,16,15,14,13,12,11,10,9,8,7,6,5,4,3,3,2],
    cleric: [19,18,17,16,15,14,13,12,11,10,9,8,7,6,5,4,3,2,2,1],
    thief:  [19,19,18,17,16,15,14,13,12,11,10,9,8,7,6,5,4,3,3,2]
  };

  /* ---------- saving throws ----------
     Five categories, descending (lower is better; roll d20, succeed if d20 <= save).
     saveCategories indexed 0..4. */
  R.SAVE_NAMES = ['Paralysis / Poison / Rod','Breath','Petrify / Polymorph',
    'Magic Missile / Spell','Death'];
  R.SAVE_BASE = { // level-1 values per category
    fighter:[16,15,15,15,14], paladin:[15,15,15,14,14], ranger:[16,15,15,15,15],
    cleric:[15,15,14,14,13], mage:[17,16,16,14,15], thief:[16,16,15,15,15]
  };
  R.SAVE_PACE = { // every N levels the save improves by 1
    fighter:[4,4,4,4,3], paladin:[4,4,4,4,3], ranger:[4,4,4,4,3],
    cleric:[4,4,4,4,3], mage:[4,4,4,4,4], thief:[4,4,4,4,4]
  };
  R.raceSaveBonus = function (race) {
    var r = R.RACES[race].save;
    var out = [0,0,0,0,0];
    var map = { poison:0, breath:1, magic:3, all:[0,1,2,3,4] };
    for (var k in r) {
      var idx = map[k];
      if (Array.isArray(idx)) for (var i=0;i<5;i++) out[i]+=r[k];
      else out[idx]+=r[k];
    }
    return out;
  };
  R.saveValue = function (cls, lvl, cat, race) {
    var base = R.SAVE_BASE[cls][cat];
    var pace = R.SAVE_PACE[cls][cat];
    var v = base - Math.floor((lvl-1)/pace);
    v += R.raceSaveBonus(race)[cat];
    return Math.max(6, Math.min(20, v));
  };

  /* ---------- weapon specialization ---------- */
  // +1 to hit, +2 to damage with the specialized weapon (fighter;
  // ranger and paladin are competitive and receive the same bonus).
  R.SPEC_BONUS = { hit:1, dmg:2 };

  /* ---------- thief skills ----------
     Each skill: base % at level 1, dropping with level (2e style). */
  R.THIEF_SKILLS = [
    { id:'find_traps',  name:'Find Traps',        base:10 },
    { id:'remove_traps',name:'Remove Traps',      base:10 },
    { id:'find_doors',  name:'Find Secret Doors', base:20 },
    { id:'open_locks',  name:'Open Locks',        base:20 },
    { id:'move_silent', name:'Move Silently',     base:10 },
    { id:'hide_shadows',name:'Hide in Shadows',   base:10 },
    { id:'climb_walls', name:'Climb Walls',       base:30 },
    { id:'disguise',    name:'Disguise',          base:20 },
    { id:'listen',      name:'Listen',            base:20 }
  ];
  R.thiefChance = function (skillId, lvl) {
    for (var i=0;i<R.THIEF_SKILLS.length;i++) {
      var s = R.THIEF_SKILLS[i];
      if (s.id === skillId) return Math.min(95, s.base + 2*(lvl-1));
    }
    return 0;
  };

  /* ---------- turning undead ---------- */
  // undead have a turn value 1..9 (higher = harder); some are immune.
  // roll d6 + effective level. 9+ on the roll destroys (undead of HD <= lvl).
  // Paladins turn as a cleric two levels lower.
  R.effectiveTurnLevel = function (cls, lvl) {
    if (cls === 'cleric') return lvl;
    if (cls === 'paladin') return Math.max(0, lvl-2);
    return 0;
  };

  /* ---------- dice ---------- */
  R.parseDice = function (s) {
    if (!s) return { min:0, max:0, avg:0 };
    var m = String(s).match(/(\d*)d(\d+)/);
    if (!m) return { min:0, max:0, avg:0 };
    var n = m[1] ? parseInt(m[1],10) : 1;
    var sides = parseInt(m[2],10);
    var mod = 0;
    var rest = String(s).replace(/(\d*)d(\d+)/,'');
    var mm = rest.match(/([+-])\s*(\d+)/);
    if (mm) mod = (mm[1]==='-'?-1:1)*parseInt(mm[2],10);
    return { min:n*1+mod, max:n*sides+mod, avg:n*(sides+1)/2+mod,
      n:n, sides:sides, mod:mod };
  };
  R.dmgDesc = function (s) {
    var d = R.parseDice(s);
    if (d.min===d.max) return String(d.min);
    return d.min+'–'+d.max;
  };

  /* ---------- spells ----------
     kind: missile | damage | area | line | cone | wall | cloud | heal |
           buff | debuff | summon | utility
     utility sub: light | door | open | knock | detect | truesight |
                  dispel | counterspell | escape | door_step | feather |
                  wish | time_stop
     save: category index (0..4) to halve/nullify, or null.
  */
  var W = {}; // wizard
  var P = {}; // priest

  // ---- WIZARD 1 ----
  W.magic_missile = { n:'Magic Missile', lvl:1, kind:'missile', count:'1d3', dmg:'1d6+1', range:8,
    text:'Three motes of force lash out, striking with sure aim.' };
  W.shield = { n:'Shield', lvl:1, kind:'buff', target:'self', status:'shield', dur:2,
    text:'A shimmering barrier wards your body (AC improved).' };
  W.light = { n:'Light', lvl:1, kind:'utility', sub:'light', dur:5,
    text:'A steady glow follows you, driving back the dark.' };
  W.open_close = { n:'Open/Close', lvl:1, kind:'utility', sub:'door',
    text:'Unseen hands slide a door open or shut, even against its lock (once).' };
  W.detect_evil = { n:'Detect Evil', lvl:1, kind:'utility', sub:'detect', dur:10, filter:'evil',
    text:'A tingling sense marks evil creatures upon the map.' };
  W.detect_magic = { n:'Detect Magic', lvl:1, kind:'utility', sub:'detect', dur:10,
    text:'All lurking creatures are marked upon the map.' };
  W.sleep = { n:'Sleep', lvl:1, kind:'debuff', target:'area', area:2, status:'sleep', dur:2,
    hdLimit:function(l){ return 2 + Math.max(0, l-3); },
    text:'Creatures of 2+1 HD per level beyond 3rd sink into slumber.' };
  W.charm_person = { n:'Charm Person', lvl:1, kind:'debuff', target:'single', status:'charm', dur:2, save:4,
    text:'The mark\'s eyes glaze; they see you as a friend for a while.' };
  W.knock = { n:'Knock', lvl:1, kind:'utility', sub:'knock',
    text:'A soft rap and every lock in the door gives way for good.' };
  W.dancing_lights = { n:'Dancing Lights', lvl:1, kind:'debuff', target:'area', area:3, status:'distract', dur:1, save:4,
    text:'Will-o\'-wisps flit about, drawing the eye (nearby foes miss by one).' };
  W.grease = { n:'Grease', lvl:1, kind:'debuff', target:'area', area:2, status:'stun', dur:1, save:0,
    text:'A slick film seeps across the floor. Those caught on it go down (save for no effect).' };
  W.web = { n:'Web', lvl:1, kind:'debuff', target:'area', area:3, status:'ensnare', dur:2, save:0,
    text:'Thick strands erupt from the ground, snaring those within (save to avoid).' };
  W.chill_touch = { n:'Chill Touch', lvl:1, kind:'damage', target:'single', dmg:'1d6', undeadBonus:'1d6',
    text:'A crawling cold that only the dead can feel, hurting them twice as keenly.' };
  W.feather_fall = { n:'Feather Fall', lvl:1, kind:'utility', sub:'feather',
    text:'You drift on a breeze of down; no fall or pit can harm you (one use).' };

  // ---- WIZARD 2 ----
  W.mirror_image = { n:'Mirror Image', lvl:2, kind:'buff', target:'self', status:'mirror', dur:2,
    text:'Ghostly copies of you spin and dance, confusing blade and bolt (-1 to foes\' hit).' };
  W.invisibility = { n:'Invisibility', lvl:2, kind:'buff', target:'self', status:'invis', dur:2,
    text:'You slip from sight. An attack or loud word breaks the veil.' };
  W.fog_cloud = { n:'Fog Cloud', lvl:2, kind:'cloud', target:'area', area:3, dur:2, blockSight:true,
    text:'A choking grey fog: no arrow or bolt may fly true through it.' };
  W.scorching_ray = { n:'Scorching Ray', lvl:2, kind:'missile', count:2, dmg:'1d6', range:8,
    text:'Two red needles of heat sear the mark.' };
  W.stone_skin = { n:'Stone Skin', lvl:2, kind:'buff', target:'self', status:'stone_skin', dur:4,
    text:'Your flesh takes on the toughness of granite (non-magic blows lose force).' };
  W.infravision = { n:'Infravision', lvl:2, kind:'utility', sub:'infrac', dur:5,
    text:'Heat glows in your sight; the dark no longer hides anything.' };
  W.hold_person = { n:'Hold Person', lvl:2, kind:'debuff', target:'single', status:'held', dur:1, save:4,
    text:'The mark is rooted to the spot as if in stone (save to avoid).' };
  W.hold_animal = { n:'Hold Animal', lvl:2, kind:'debuff', target:'single', status:'held', dur:1, save:4,
    text:'Beasts and monsters of the beast-kin are rooted to the spot (save to avoid).' };
  W.phantasm = { n:'Phantasm', lvl:2, kind:'debuff', target:'area', area:3, dmg:'1d6', save:4, status:'fear', dur:1,
    text:'A horror takes shape in the air. The frightened take damage and reel back.' };
  W.blur = { n:'Blur', lvl:2, kind:'buff', target:'self', status:'blur', dur:2,
    text:'Your edges swim and smear; eyes cannot settle on you (-1 to foes\' hit).' };
  W.continual_light = { n:'Continual Light', lvl:2, kind:'utility', sub:'light', dur:10,
    text:'A bright, unwavering glow that will not gutter out.' };
  W.ray_enfeeblement = { n:'Ray of Enfeeblement', lvl:2, kind:'debuff', target:'single', status:'weaken', dur:2,
    text:'The mark\'s arms grow heavy; they strike for less and aim true no more.' };

  // ---- WIZARD 3 ----
  W.haste = { n:'Haste', lvl:3, kind:'buff', target:'ally', status:'haste', dur:2,
    text:'The mark moves in a blur, gaining a further attack and swifter step.' };
  W.slow = { n:'Slow', lvl:3, kind:'debuff', target:'single', status:'slow', dur:1, save:4,
    text:'Time thickens around the mark; they can hardly lift a limb (save to avoid).' };
  W.fireball = { n:'Fireball', lvl:3, kind:'area', area:3, dmg:'1d6', perLvl:1, save:0, half:true, range:8,
    text:'A roaring orb of flame blossoms in a circle of 10 feet (save for half).' };
  W.stinking_cloud = { n:'Stinking Cloud', lvl:3, kind:'cloud', target:'area', area:3, dur:2,
    status:'stun', save:0, range:4,
    text:'A billowing yellow cloud of the vilest stench. All within must save each round or sicken and stand helpless.' };
  W.animate_dead = { n:'Animate Dead', lvl:3, kind:'summon', summon:{mon:'skeleton', n:'1d4'}, dur:4,
    text:'Bones rattle together and rise, fighting at your side for a few rounds.' };
  W.counterspell = { n:'Counterspell', lvl:3, kind:'utility', sub:'counterspell', dur:2,
    text:'Your magic coils and waits; the next hostile working of power is snuffed out.' };
  W.fire = { n:'Fire', lvl:3, kind:'damage', target:'single', dmg:'2d6', range:6,
    text:'A tongue of fire leaps out and takes the mark, no saving throw.' };
  W.dispel_magic = { n:'Dispel Magic', lvl:3, kind:'utility', sub:'dispel',
    text:'Unweaves one working of magic — a blessing, a curse, or a zone of power.' };
  W.shadow_door = { n:'Shadow Door', lvl:3, kind:'utility', sub:'door_step', range:4,
    text:'You step sideways into the dark and out again, four squares away.' };
  W.blindness = { n:'Blindness', lvl:3, kind:'debuff', target:'single', status:'blind', dur:2, save:4,
    text:'White roars behind the mark\'s eyes (save to avoid).' };
  W.confusion = { n:'Confusion', lvl:3, kind:'debuff', target:'area', area:3, status:'confuse', dur:2, save:4,
    text:'The marks\' minds swim; they may strike friend or foe alike (save to avoid).' };

  // ---- WIZARD 4 ----
  W.fire_wall = { n:'Fire Wall', lvl:4, kind:'wall', area:6, dmg:'1d6', perLvl:1, save:0, half:true, dur:2, range:8,
    text:'A roaring wall of flame: those who cross it or stand near it suffer each round (save for half).' };
  W.lightning_bolt = { n:'Lightning Bolt', lvl:4, kind:'line', area:8, dmg:'1d6', perLvl:1, save:0, half:true,
    text:'A jagged bolt of storm-crack races in a straight line for 8 squares (save for half).' };
  W.blink = { n:'Blink', lvl:4, kind:'buff', target:'self', status:'blink', dur:1,
    text:'You flicker between planes; every third blow meant for you finds only air.' };
  W.dimension_door = { n:'Dimension Door', lvl:4, kind:'utility', sub:'door_step', range:4,
    text:'You fold space and reappear four squares away, through wall or foe.' };
  W.ice_storm = { n:'Ice Storm', lvl:4, kind:'area', area:3, dmg:'1d6', perLvl:1, save:0, half:true, range:8,
    text:'Hail and splintering ice fall in a circle (save for half).' };
  W.hold_monster = { n:'Hold Monster', lvl:4, kind:'debuff', target:'single', status:'held', dur:2, save:4,
    text:'Any creature — beast or otherwise — is rooted to the spot (save to avoid).' };
  W.ensnaring = { n:'Ensnaring', lvl:4, kind:'debuff', target:'area', area:3, status:'ensnare', dur:2, save:0,
    text:'Roots and thongs of force erupt, binding all within (save to avoid).' };
  W.phantasmal_killer = { n:'Phantasmal Killer', lvl:4, kind:'debuff', target:'single', dmg:'2d6', save:4, status:'fear', dur:1,
    text:'The mark\'s worst fear gives shape and teeth (save for half and a round of terror).' };
  W.wall_of_fire = { n:'Wall of Fire', lvl:4, kind:'wall', area:6, dmg:'1d6', perLvl:1, save:0, half:true, dur:2, range:8,
    text:'A blazing barrier of fire; crossing it burns each round (save for half).' };

  // ---- WIZARD 5 ----
  W.cone_cold = { n:'Cone of Cold', lvl:5, kind:'cone', area:3, dmg:'1d6', perLvl:1, save:0, half:true,
    text:'A cone of freezing air: those in it take damage and are slowed (save for half).' };
  W.chain_lightning = { n:'Chain Lightning', lvl:5, kind:'line', area:8, dmg:'1d6', perLvl:1, save:0, half:true, chain:2,
    text:'A lightning fork that leaps between two further marks (save for half).' };
  W.true_seeing = { n:'True Seeing', lvl:5, kind:'utility', sub:'truesight', dur:5,
    text:'You see as things are: illusions and darkness part before your gaze.' };
  W.globe_invulnerability = { n:'Globe of Invulnerability', lvl:5, kind:'buff', target:'ally', status:'globe', dur:2,
    text:'A globe of pure force: no missile or bolt may strike the mark; only blade and hand may reach them.' };
  W.disintegrate = { n:'Disintegrate', lvl:5, kind:'damage', target:'single', dmg:'3d10', save:3,
    text:'The mark simply ceases, save against which they may throw all their being (save or die).' };
  W.cloudkill = { n:'Cloudkill', lvl:5, kind:'cloud', target:'area', area:4, dur:2, dmg:'1d6', perLvl:1, save:0, range:4,
    text:'A green miasma: all within take damage each round and must save (save for half).' };
  W.maze = { n:'Maze', lvl:5, kind:'utility', sub:'escape',
    text:'You are hurled into a shifting maze of stone. In battle it may end the fight (roll d6+2, need 8).' };
  W.teleport = { n:'Teleport', lvl:5, kind:'utility', sub:'escape',
    text:'You fold space and vanish from the field. In battle it ends the fight (roll d6+2, need 8).' };

  // ---- WIZARD 6 ----
  W.power_word_stun = { n:'Power Word: Stun', lvl:6, kind:'debuff', target:'single', status:'stun', dur:2, hpLimit:'level',
    text:'A word of power: any creature at or below your level in hit points is stunned, no save.' };
  W.wall_of_ice = { n:'Wall of Ice', lvl:6, kind:'wall', area:6, dmg:'1d6', perLvl:1, save:0, half:true, dur:2, range:8,
    text:'A wall of bitter ice: those who cross it or stand near it suffer each round (save for half).' };
  W.fire_storm = { n:'Fire Storm', lvl:6, kind:'area', area:4, dmg:'2d6', perLvl:1, save:0, half:true, range:8,
    text:'A storm of falling fire in a wide circle (save for half).' };
  W.time_stop = { n:'Time Stop', lvl:6, kind:'utility', sub:'time_stop',
    text:'The world holds its breath. You act again this round, unopposed.' };
  W.wish = { n:'Wish', lvl:6, kind:'utility', sub:'wish',
    text:'A single, perfect word: the company is healed, all curses lift, and zones of power fail.' };
  W.meteor = { n:'Meteor', lvl:6, kind:'area', area:5, dmg:'4d6', save:0, half:true, range:8,
    text:'A rock of fire falls from the sky in a great circle (save for half).' };
  W.starfire = { n:'Starfire', lvl:6, kind:'area', area:6, dmg:'3d6', save:0, half:true, range:8,
    text:'A shard of a falling star bursts in a vast circle (save for half).' };

  // ---- WIZARD 7 ----
  W.power_word_blind = { n:'Power Word: Blind', lvl:7, kind:'debuff', target:'single', status:'blind', dur:2, hdLimitFn:true,
    text:'A word of power blinds any creature at or below your level in hit dice, no save.' };
  W.banish = { n:'Banish', lvl:7, kind:'damage', target:'single', banish:true,
    text:'The mark is hurled from this place, save against which they may throw all their being (save or leave the field).' };
  W.globe_great = { n:'Globe of Invulnerability (Greater)', lvl:7, kind:'buff', target:'ally', status:'globe', dur:3,
    text:'A greater globe of force surrounds the mark for longer; no missile may reach them.' };
  W.chain_great = { n:'Chain Lightning (Greater)', lvl:7, kind:'line', area:8, dmg:'2d6', perLvl:1, save:0, half:true, chain:3,
    text:'A greater lightning fork that leaps between three further marks (save for half).' };
  W.dispel_great = { n:'Dispel Magic (Greater)', lvl:7, kind:'utility', sub:'dispel', great:true,
    text:'Unweaves all workings of magic on the mark, or all zones of power.' };
  W.teleport_great = { n:'Teleport (Greater)', lvl:7, kind:'utility', sub:'escape', great:true,
    text:'You fold space and vanish from the field, without roll. In dungeon it places you at the nearest stairs.' };

  // ---- WIZARD 8 ----
  W.power_word_kill = { n:'Power Word: Kill', lvl:8, kind:'damage', target:'single', hpLimit:'level',
    text:'A word of power: any creature at or below your level in hit points simply drops, no save.' };
  W.time_stop_great = { n:'Time Stop (Greater)', lvl:8, kind:'utility', sub:'time_stop', great:true,
    text:'The world holds its breath for longer. You act again this round, and next, unopposed.' };
  W.wish_great = { n:'Wish (Greater)', lvl:8, kind:'utility', sub:'wish', great:true,
    text:'A greater, perfect word: the company is fully healed, all curses lift, and all zones of power fail.' };
  W.meteor_great = { n:'Meteor (Greater)', lvl:8, kind:'area', area:6, dmg:'5d6', save:0, half:true, range:8,
    text:'A greater rock of fire falls in a vast circle (save for half).' };
  W.prism_spray = { n:'Prism Spray', lvl:8, kind:'missile', count:5, dmg:'2d6', noSave:true,
    text:'Five prisms of different light burst from your hand, striking one mark without saving throw.' };

  // ---- WIZARD 9 ----
  W.wish_absolute = { n:'Wish (Absolute)', lvl:9, kind:'utility', sub:'wish', great:true,
    text:'The highest word: the company is fully healed, all curses lift, all zones fail, and the field is cleared of hostile workings.' };
  W.starfall = { n:'Starfall', lvl:9, kind:'area', area:8, dmg:'6d6', save:0, half:true, range:8,
    text:'The sky itself falls in a vast circle of fire (save for half).' };
  W.word_of_recall = { n:'Word of Recall', lvl:9, kind:'utility', sub:'recall',
    text:'A word of the shrine: you step out of the dungeon entirely, to the surface air.' };

  R.SPELLS = { wizard:W, priest:P };

  /* ---------- priest spells ---------- */
  // ---- PRIEST 1 ----
  P.cure_light = { n:'Cure Light Wounds', lvl:1, kind:'heal', target:'ally', dmg:'1d6+1',
    text:'Warm light knits flesh and steadies the breath.' };
  P.holy_smite = { n:'Holy Smite', lvl:1, kind:'damage', target:'single', dmg:'1d6', perLvl:1, undeadOnly:true,
    text:'A flash of divine fire that only the dead and unclean can feel.' };
  P.bless = { n:'Bless', lvl:1, kind:'buff', target:'ally', status:'bless', dur:2,
    text:'A blessing settles on the mark; they strike with sure aim (+1 to hit).' };
  P.sanctuary = { n:'Sanctuary', lvl:1, kind:'buff', target:'ally', status:'sanctuary', dur:2,
    text:'A ward of light shields the mark from close blows (AC improved vs melee).' };
  P.shield_faith = { n:'Shield of Faith', lvl:1, kind:'buff', target:'ally', status:'shield_faith', dur:3,
    text:'A soft radiance hardens the mark\'s defence (AC improved).' };
  P.prot_evil = { n:'Protection from Evil', lvl:1, kind:'buff', target:'ally', status:'prot_evil', dur:2,
    text:'The mark is warded; evil things strike them less truly and their saving throws against the dead are swifter.' };
  P.prayer = { n:'Prayer', lvl:1, kind:'buff', target:'ally', status:'prayer', dur:2,
    text:'A quiet prayer: the mark\'s defence and saving throws are briefly improved.' };
  P.blessed_weapon = { n:'Blessed Weapon', lvl:1, kind:'buff', target:'ally', status:'blessed', dur:2,
    text:'The mark\'s blade gleams; it strikes the unclean with extra force (+1 dmg vs evil/undead).' };

  // ---- PRIEST 2 ----
  P.cure_mod = { n:'Cure Moderate Wounds', lvl:2, kind:'heal', target:'ally', dmg:'3d6',
    text:'Deeper warmth mends gashes and drains the chill from the blood.' };
  P.atonement = { n:'Atonement', lvl:2, kind:'utility', sub:'dispel',
    text:'A rite of cleansing lifts one curse or malady from the mark.' };
  P.contagion = { n:'Contagion', lvl:2, kind:'debuff', target:'single', dmg:'1d6', status:'poison', dur:1, save:0,
    text:'A withering touch: the mark takes damage and is poisoned for a round (save to avoid).' };
  P.hold_undead = { n:'Hold Undead', lvl:2, kind:'debuff', target:'single', status:'held', dur:1, save:4, undeadOnly:true,
    text:'The dead are rooted to the spot as if in stone (save to avoid, undead only).' };
  P.cause_fear = { n:'Cause Fear', lvl:2, kind:'debuff', target:'area', area:2, status:'fear', dur:1, save:4,
    text:'A wave of dread rolls out; the marked reel back (save to avoid).' };
  P.guiding_bolt = { n:'Guiding Bolt', lvl:2, kind:'missile', count:1, dmg:'1d6', bonus:2, range:8,
    text:'A shaft of light that finds its mark with sure aim (+2 to hit, 1d6).' };
  P.blessed_armor = { n:'Blessed Armor', lvl:2, kind:'buff', target:'ally', status:'blessed_armor', dur:3,
    text:'The mark\'s armour is blessed; their defence is briefly improved (AC improved).' };
  P.hold_animal_p = { n:'Hold Animal', lvl:2, kind:'debuff', target:'single', status:'held', dur:1, save:4,
    text:'Beasts and monsters of the beast-kin are rooted to the spot (save to avoid).' };

  // ---- PRIEST 3 ----
  P.cure_serious = { n:'Cure Serious Wounds', lvl:3, kind:'heal', target:'ally', dmg:'5d6',
    text:'Strong healing light mends deep wounds and sets broken bones.' };
  P.great_shield_faith = { n:'Greater Shield of Faith', lvl:3, kind:'buff', target:'ally', status:'shield_faith2', dur:3,
    text:'A greater radiance hardens the mark\'s defence (AC improved further).' };
  P.blindness_p = { n:'Blindness', lvl:3, kind:'debuff', target:'single', status:'blind', dur:2, save:4,
    text:'White roars behind the mark\'s eyes (save to avoid).' };
  P.great_prot_evil = { n:'Greater Protection from Evil', lvl:3, kind:'buff', target:'ally', status:'prot_evil2', dur:3,
    text:'A greater ward; evil things strike the mark far less truly and their saves against the dead are swifter.' };
  P.slow_p = { n:'Slow', lvl:3, kind:'debuff', target:'single', status:'slow', dur:1, save:4,
    text:'Time thickens around the mark; they can hardly lift a limb (save to avoid).' };
  P.great_prayer = { n:'Greater Prayer', lvl:3, kind:'buff', target:'ally', status:'prayer2', dur:3,
    text:'A greater prayer: the mark\'s defence and saving throws are improved for longer.' };
  P.contagion2 = { n:'Contagion (Greater)', lvl:3, kind:'debuff', target:'single', dmg:'2d6', status:'poison', dur:2, save:0,
    text:'A greater withering touch: the mark takes more damage and is poisoned for longer (save to avoid).' };

  // ---- PRIEST 4 ----
  P.cure_critical = { n:'Cure Critical Wounds', lvl:4, kind:'heal', target:'ally', dmg:'7d6',
    text:'The strongest healing light: near-death is turned back.' };
  P.mass_cure_light = { n:'Mass Cure Light Wounds', lvl:4, kind:'heal', target:'ally', dmg:'1d6+1', mass:true,
    text:'Warm light mends every wound in the company, lightly.' };
  P.confusion_p = { n:'Confusion', lvl:4, kind:'debuff', target:'area', area:3, status:'confuse', dur:2, save:4,
    text:'The marks\' minds swim; they may strike friend or foe alike (save to avoid).' };
  P.stoning = { n:'Stoning', lvl:4, kind:'damage', target:'single', dmg:'1d6', perLvl:1,
    text:'A pebble of divine wrath strikes the mark, no saving throw.' };
  P.prot_normal = { n:'Protection from Normal Weapons', lvl:4, kind:'buff', target:'ally', status:'prot_normal', dur:3,
    text:'The mark is warded; non-magic blows lose their force (dmg reduced).' };
  P.guardian = { n:'Guardian', lvl:4, kind:'buff', target:'ally', status:'guardian', dur:2,
    text:'A spirit of the shrine stands behind the mark; their defence is improved (AC improved).' };
  P.great_contagion = { n:'Contagion (Greater 2)', lvl:4, kind:'debuff', target:'single', dmg:'3d6', status:'poison', dur:2, save:0,
    text:'A still greater withering touch (save to avoid).' };

  // ---- PRIEST 5 ----
  P.raise_dead = { n:'Raise Dead', lvl:5, kind:'heal', target:'ally', dmg:'9d6',
    text:'The strongest mending: a fallen companion may be called back (full heal).' };
  P.wall_of_fire_p = { n:'Wall of Fire', lvl:5, kind:'wall', area:6, dmg:'1d6', perLvl:1, save:0, half:true, dur:2, range:8,
    text:'A blazing barrier of fire; crossing it burns each round (save for half).' };
  P.healing = { n:'Healing', lvl:5, kind:'heal', target:'ally', dmg:'3d6',
    text:'Steadying light: mends wounds and lifts fear and poison from the mark.' };
  P.prot_magic = { n:'Protection from Magical Weapons', lvl:5, kind:'buff', target:'ally', status:'prot_magic', dur:3,
    text:'The mark is warded; magic weapons lose their force against them (dmg reduced).' };
  P.true_seeing_p = { n:'True Seeing', lvl:5, kind:'utility', sub:'truesight', dur:5,
    text:'You see as things are: illusions and darkness part before your gaze.' };
  P.cloudkill_p = { n:'Cloudkill', lvl:5, kind:'cloud', target:'area', area:4, dur:2, dmg:'1d6', perLvl:1, save:0, range:4,
    text:'A green miasma: all within take damage each round (save for half).' };
  P.great_shield_faith2 = { n:'Greater Shield of Faith (2)', lvl:5, kind:'buff', target:'ally', status:'shield_faith2', dur:4,
    text:'A greater radiance hardens the mark\'s defence for longer.' };

  // ---- PRIEST 6 ----
  P.teleport_p = { n:'Teleport', lvl:6, kind:'utility', sub:'escape', great:true,
    text:'You fold space and vanish from the field, without roll.' };
  P.stone = { n:'Stone', lvl:6, kind:'debuff', target:'single', status:'stun', dur:2, save:2,
    text:'The mark is turned to stone, save against which they may throw all their being (save or be stunned).' };
  P.dispel_magic_p = { n:'Dispel Magic', lvl:6, kind:'utility', sub:'dispel',
    text:'Unweaves one working of magic — a blessing, a curse, or a zone of power.' };
  P.mass_cure_mod = { n:'Mass Cure Moderate Wounds', lvl:6, kind:'heal', target:'ally', dmg:'3d6', mass:true,
    text:'Deeper warmth mends every wound in the company.' };
  P.cloudkill_p2 = { n:'Cloudkill (Greater)', lvl:6, kind:'cloud', target:'area', area:5, dur:2, dmg:'2d6', perLvl:1, save:0, range:4,
    text:'A greater green miasma (save for half).' };
  P.stone2 = { n:'Stone (Greater)', lvl:6, kind:'debuff', target:'single', status:'stun', dur:3, save:2,
    text:'The mark is turned to stone for longer, save against which they may throw all their being.' };

  // ---- PRIEST 7 ----
  P.resurrection = { n:'Resurrection', lvl:7, kind:'heal', target:'ally', dmg:'12d6',
    text:'The highest mending: a fallen companion is called back whole (full heal).' };
  P.wish_p = { n:'Wish', lvl:7, kind:'utility', sub:'wish',
    text:'A single, perfect word: the company is healed, all curses lift, and zones of power fail.' };
  P.wrath = { n:'Wrath of the Gods', lvl:7, kind:'area', area:5, dmg:'3d6', save:0, half:true, range:8,
    text:'The wrath of the gods falls in a great circle (save for half).' };
  P.divine_storm = { n:'Divine Storm', lvl:7, kind:'cone', area:3, dmg:'4d6', undeadOnly:true,
    text:'A cone of holy lightning that only the dead and unclean can feel.' };
  P.hold_absolute = { n:'Hold (Absolute)', lvl:7, kind:'debuff', target:'single', status:'held', dur:2, save:4,
    text:'Any creature is rooted to the spot for a full round (save to avoid).' };
  P.great_heal = { n:'Greater Heal', lvl:7, kind:'heal', target:'ally', dmg:'9d6',
    text:'The strongest healing light, mending all wounds (near-full heal).' };
  P.banish_p = { n:'Banish', lvl:7, kind:'damage', target:'single', banish:true, undeadOnly:true,
    text:'The mark is hurled from this place, save against which they may throw all their being (undead only).' };

  /* ---------- priest spells (cont.) ---------- */
  P.light_p = { n:'Light', lvl:1, kind:'utility', sub:'light', dur:5,
    text:'A steady glow follows you, driving back the dark.' };
  P.holy_fire = { n:'Holy Fire', lvl:2, kind:'damage', target:'single', dmg:'1d6', undeadBonus:'1d6', range:6,
    text:'Clean fire that burns the unclean twice as hard, and nothing else at all.' };
  P.holy_aegis = { n:'Holy Aegis', lvl:2, kind:'buff', target:'ally', status:'aegis', dur:2,
    text:'A shield of living light stands before the mark (AC improved).' };
  P.purify = { n:'Purify', lvl:3, kind:'heal', target:'ally', dmg:'1d6', cleanse:true,
    text:'Cleansing light mends the mark and lifts poison, fear and blindness from them.' };
  P.blinding_light = { n:'Blinding Light', lvl:3, kind:'cone', area:3, status:'blind', dur:1, save:4,
    text:'A searing cone of pure light: those in it must save or be blinded for a round.' };
  P.mass_cure_serious = { n:'Mass Cure Serious Wounds', lvl:4, kind:'heal', target:'ally', dmg:'5d6', mass:true,
    text:'Strong healing light mends deep wounds across the whole company.' };
  P.mass_bless = { n:'Mass Bless', lvl:4, kind:'buff', target:'ally', status:'bless', dur:2, mass:true,
    text:'A blessing settles on the whole company; all strike with sure aim (+1 to hit).' };
  P.ward_light = { n:'Warding Light', lvl:5, kind:'buff', target:'ally', status:'ward_light', dur:3, mass:true,
    text:'The company is bathed in light; their saving throws against magic are swifter (+1).' };
  P.wall_of_light = { n:'Wall of Light', lvl:6, kind:'wall', area:6, dmg:'1d6', perLvl:1, save:0, half:true, dur:2, range:8,
    text:'A blazing wall of clean light: those who cross it suffer each round (save for half), doubly so if unclean.' };
  P.divine_justice = { n:'Divine Justice', lvl:6, kind:'damage', target:'single', dmg:'1d6', perLvl:1, noSave:true,
    text:'A hand of judgment strikes the mark down, no saving throw.' };
  P.wrath_of_dawn = { n:'Wrath of Dawn', lvl:7, kind:'area', area:4, dmg:'2d6', undeadBonus:'1d6', save:0, half:true, range:8,
    text:'The light of a rising sun breaks in a great circle (save for half); the unclean burn far harder.' };

  /* ---------- spell slots ----------
     slots[class][level][spellLevel] = count */
  R.SPELL_SLOTS = {
    wizard: {
      1:{1:1}, 2:{1:2}, 3:{1:2,2:1}, 4:{1:2,2:2}, 5:{1:3,2:2,3:1},
      6:{1:3,2:2,3:1,4:1}, 7:{1:3,2:2,3:2,4:1}, 8:{1:3,2:2,3:2,4:1,5:1},
      9:{1:3,2:3,3:2,4:1,5:1}, 10:{1:3,2:3,3:2,4:2,5:1},
      11:{1:3,2:3,3:2,4:2,5:1,6:1}, 12:{1:3,2:3,3:2,4:2,5:1,6:1},
      13:{1:3,2:3,3:3,4:2,5:1,6:1}, 14:{1:3,2:3,3:3,4:2,5:2,6:1},
      15:{1:3,2:3,3:3,4:2,5:2,6:1,7:1}, 16:{1:3,2:3,3:3,4:3,5:2,6:1,7:1},
      17:{1:3,2:3,3:3,4:3,5:2,6:2,7:1}, 18:{1:3,2:3,3:3,4:3,5:2,6:2,7:1,8:1},
      19:{1:3,2:3,3:3,4:3,5:2,6:2,7:2,8:1}, 20:{1:3,2:3,3:3,4:3,5:2,6:2,7:2,8:1,9:1}
    },
    priest: {
      1:{1:1}, 2:{1:2}, 3:{1:2,2:1}, 4:{1:2,2:2}, 5:{1:3,2:2,3:1},
      6:{1:3,2:2,3:1,4:1}, 7:{1:3,2:2,3:2,4:1}, 8:{1:3,2:2,3:2,4:1,5:1},
      9:{1:3,2:3,3:2,4:1,5:1}, 10:{1:3,2:3,3:2,4:2,5:1},
      11:{1:3,2:3,3:2,4:2,5:1,6:1}, 12:{1:3,2:3,3:2,4:2,5:1,6:1},
      13:{1:3,2:3,3:3,4:2,5:1,6:1}, 14:{1:3,2:3,3:3,4:2,5:2,6:1},
      15:{1:3,2:3,3:3,4:2,5:2,6:1,7:1}, 16:{1:3,2:3,3:3,4:3,5:2,6:1,7:1},
      17:{1:3,2:3,3:3,4:3,5:2,6:2,7:1}, 18:{1:3,2:3,3:3,4:3,5:2,6:2,7:1},
      19:{1:3,2:3,3:3,4:3,5:2,6:2,7:2}, 20:{1:3,2:3,3:3,4:3,5:2,6:2,7:2}
    }
  };

  R.spellList = function (cls, maxLvl) {
    var book = cls === 'mage' ? 'wizard' : 'priest';
    var out = [];
    for (var id in R.SPELLS[book]) {
      var s = R.SPELLS[book][id];
      if (s.lvl <= maxLvl) out.push(id);
    }
    out.sort(function (a,b) {
      var A=R.SPELLS[book][a], B=R.SPELLS[book][b];
      return A.lvl - B.lvl || A.n.localeCompare(B.n);
    });
    return out;
  };


  /* ---------- alignments ---------- */
  R.ALIGNMENTS = [
    { id:'lg', name:'Lawful Good' }, { id:'ng', name:'Neutral Good' }, { id:'cg', name:'Chaotic Good' },
    { id:'ln', name:'Lawful Neutral' }, { id:'nn', name:'True Neutral' }, { id:'cn', name:'Chaotic Neutral' },
    { id:'le', name:'Lawful Evil' }, { id:'ne', name:'Neutral Evil' }, { id:'ce', name:'Chaotic Evil' }
  ];
  R.alignmentName = function (id) {
    for (var i = 0; i < R.ALIGNMENTS.length; i++) if (R.ALIGNMENTS[i].id === id) return R.ALIGNMENTS[i].name;
    return id;
  };
  // class alignment restrictions (empty = any)
  R.ALIGN_RESTRICT = {
    fighter: [], paladin: ['lg','ng','cg','ln','nn'], ranger: [],
    mage: [], cleric: [], thief: []
  };
  R.classAllowsAlign = function (cls, id) {
    var r = R.ALIGN_RESTRICT[cls] || [];
    return !r.length || r.indexOf(id) >= 0;
  };

  /* ---------- training ---------- */
  // 100 gold per level of training (cost scales with the level reached)
  R.TRAIN_COST = 100;
  R.trainCost = function (toLevel) { return R.TRAIN_COST * toLevel; };

  /* ---------- thief backstab ---------- */
  // a thief attacking from behind or from surprise deals double damage
  R.BACKSTAB = { mult: 2, desc: 'From behind, or on a surprised foe, a thief’s blow counts double.' };

  return R;
})();

if (typeof module !== 'undefined' && module.exports) module.exports = { RULES: RULES };
