/* ============================================================
   EMBERFALL — treasure.js
   First-edition style treasure: types A..H, gems, jewellery,
   trade goods, coin by level, magic-item tables by level band.
   Also shops: stock generation by level band.
   ============================================================ */
'use strict';

var TREASURE = (function () {
  var GEM_POOL = ['g_pearl','g_amber','g_bloodstone','g_crystal','g_emerald','g_ember_opal','g_topaz','g_sapphire','g_star_shard','g_ruby','g_diamond'];
  var JEWEL_POOL = ['j_pin','j_comb','j_gold_ring','j_chain','j_tiara','j_circlet','j_platinum_pin','j_dragonbone'];
  var TRADE_POOL = ['t_copper','t_beads','t_silk','t_ledger','t_spice','t_vial','t_ingot'];

  // band 1..5 from level
  function bandOf(level) {
    if (level <= 4) return 1;
    if (level <= 8) return 2;
    if (level <= 12) return 3;
    if (level <= 16) return 4;
    return 5;
  }

  function pickByPool(rng, pool, n) {
    var out = [], seen = {};
    for (var i = 0; i < n; i++) {
      var id = pool[Math.floor(rng() * pool.length)];
      if (seen[id]) continue;
      seen[id] = 1;
      out.push({ id:id, qty:1 });
    }
    return out;
  }

  // magic item tables by band: returns array of item ids
  var WEAPON_MAGIC = {
    1:['dagger_1','short_sword_1','mace_1','long_bow_1','flame_tongue','frost_brand'],
    2:['long_sword_1','two_sword_1','axe_1','long_bow_1','flail_1','mace_1','storm_blade','demonbrand'],
    3:['long_sword_2','two_sword_2','dagger_2','mace_2','poleaxe_2','flail_2','thunder_hammer','sun_blade','grave_iron'],
    4:['two_sword_2','long_sword_2','poleaxe_2','soul_reaver','windfury','shadowfang'],
    5:['two_sword_3','soul_reaver','windfury','shadowfang','flame_tongue','storm_blade']
  };
  var ARMOR_MAGIC = {
    1:['leather_1','studded_1','chain_1','kite_1','buckler_1','bracers_defense'],
    2:['chain_1','scale_1','brigandine_1','leather_1','kite_1','bracers_defense'],
    3:['chain_2','plate_1','brigandine_1','scale_1','kite_1','bracers_defense'],
    4:['plate_1','plate_2','chain_2','tower_2','plate_1'],
    5:['plate_2','tower_2','plate_1','chain_2']
  };
  var RING_POOL = {
    1:['r_prot1','r_fire_res','r_cold_res'],
    2:['r_prot1','r_swift','r_detect','r_fire_res','r_cold_res'],
    3:['r_prot2','r_strength','r_dragon','r_swift','r_detect'],
    4:['r_prot2','r_regen','r_free','r_luck','r_strength','r_dragon'],
    5:['r_regen','r_free','r_luck','r_prot2','r_dragon']
  };
  var STAFF_POOL = {
    1:['st_heal','st_ward'],
    2:['st_heal','st_fire','st_ice','st_ward'],
    3:['st_lightning','st_thunder','st_heal_great','st_ice'],
    4:['st_power','st_deep_ice','st_lightning','st_fire'],
    5:['st_power','st_deep_ice','st_heal_great','st_lightning']
  };
  var POTION_BAND = {
    1:['p_heal','p_vitality','p_cure_poison','p_detect','p_invis','p_heroism'],
    2:['p_heal','p_heal_great','p_cure_poison','p_invis','p_strength','p_protect','p_stinking','p_courage'],
    3:['p_heal_great','p_heal_extra','p_restore_lvl','p_fire_res','p_cold_res','p_stone','p_endurance','p_clarity'],
    4:['p_heal_extra','p_life','p_restore_lvl','p_speed','p_stone','p_courage'],
    5:['p_life','p_heal_extra','p_speed','p_restore_lvl','p_stone']
  };

  // pick a magic item of the given kind for a band
  function magicItem(rng, kind, band) {
    var pool = kind === 'weapon' ? WEAPON_MAGIC[band]
      : kind === 'armor' ? ARMOR_MAGIC[band]
      : kind === 'ring' ? RING_POOL[band]
      : kind === 'staff' ? STAFF_POOL[band]
      : POTION_BAND[band];
    return pool[Math.floor(rng() * pool.length)];
  }

  // roll a treasure pile by type & level. Returns {gold, items:[{id,qty}]}
  function rollTreasure(rng, type, level) {
    var band = bandOf(level);
    var out = { gold:0, items:[] };
    function gold(n, d) { out.gold += n * (1 + Math.floor(rng() * d)); }
    switch (type) {
      case 'a': // gems
        gold(1, 6);
        out.items = out.items.concat(pickByPool(rng, GEM_POOL, 1 + Math.floor(rng() * 3)));
        break;
      case 'b': // jewellery
        gold(1, 6);
        out.items = out.items.concat(pickByPool(rng, JEWEL_POOL, 1 + Math.floor(rng() * 3)));
        break;
      case 'c': // trade goods
        gold(1, 6);
        out.items = out.items.concat(pickByPool(rng, TRADE_POOL, 1 + Math.floor(rng() * 4)));
        break;
      case 'd': // common: coin, some gems
        gold(2 + band, 6 + band * 2);
        if (rng() < 0.5) out.items = out.items.concat(pickByPool(rng, GEM_POOL, 1));
        if (rng() < 0.3) out.items = out.items.concat(pickByPool(rng, JEWEL_POOL, 1));
        break;
      case 'e': // fine: coin + magic (1d100)
        gold(3 + band, 8 + band * 2);
        out.items = out.items.concat(pickByPool(rng, GEM_POOL, 1 + Math.floor(rng() * 2)));
        var r1 = Math.floor(rng() * 100);
        if (r1 < 20) out.items.push({ id:magicItem(rng, 'weapon', band), qty:1 });
        else if (r1 < 40) out.items.push({ id:magicItem(rng, 'armor', band), qty:1 });
        else if (r1 < 60) out.items.push({ id:magicItem(rng, 'potion', band), qty:1 });
        else if (r1 < 80) out.items.push({ id:magicItem(rng, 'scroll', band, rng), qty:1 });
        break;
      case 'f': // hoard: coin + better magic
        gold(4 + band * 2, 10 + band * 3);
        out.items = out.items.concat(pickByPool(rng, GEM_POOL, 2 + Math.floor(rng() * 3)));
        out.items = out.items.concat(pickByPool(rng, JEWEL_POOL, 1 + Math.floor(rng() * 2)));
        var r2 = Math.floor(rng() * 100);
        if (r2 < 25) out.items.push({ id:magicItem(rng, 'weapon', Math.min(5, band + 1)), qty:1 });
        else if (r2 < 50) out.items.push({ id:magicItem(rng, 'armor', Math.min(5, band + 1)), qty:1 });
        else if (r2 < 75) out.items.push({ id:magicItem(rng, 'potion', Math.min(5, band)), qty:1 + Math.floor(rng() * 2) });
        else if (r2 < 90) out.items.push({ id:magicItem(rng, 'scroll', Math.min(5, band), rng), qty:1 + Math.floor(rng() * 2) });
        else if (r2 < 97) out.items.push({ id:magicItem(rng, 'ring', band), qty:1 });
        else out.items.push({ id:magicItem(rng, 'staff', band), qty:1 });
        break;
      case 'g': // dwarven: mostly coin
        gold(4 + band, 10 + band * 3);
        out.items = out.items.concat(pickByPool(rng, GEM_POOL, 1 + Math.floor(rng() * 2)));
        if (rng() < 0.4) out.items.push({ id:magicItem(rng, 'weapon', band), qty:1 });
        break;
      case 'h': // orc: mostly coin
        gold(2 + band, 6 + band * 2);
        if (rng() < 0.3) out.items.push({ id:M.pick(JEWEL_POOL), qty:1 });
        break;
      default:
        gold(1, 6);
    }
    return out;
  }

  // a scroll item id for a band (random spell of appropriate level)
  function scrollForBand(rng, band) {
    var who = rng() < 0.5 ? 'wizard' : 'priest';
    var maxLvl = Math.min(5, 1 + band); // band1 -> lvl1-2, band2 -> lvl1-3, etc.
    var list = RULES.spellList(who === 'wizard' ? 'mage' : 'cleric', maxLvl).filter(function (id) {
      return RULES.SPELLS[who][id].lvl <= maxLvl;
    });
    if (!list.length) list = RULES.spellList(who === 'wizard' ? 'mage' : 'cleric', 1);
    return 'sc_' + who + '_' + list[Math.floor(rng() * list.length)];
  }

  // chest/loot roll used by dungeons: combines type + level
  function rollChest(rng, level, type) {
    return rollTreasure(rng, type || M.pick(['d','e','f','g']), level);
  }

  /* ---------------- shops ---------------- */
  var SHOP_KINDS = {
    general: { name:'General Goods', desc:'weapons, armour and the like' },
    apothecary: { name:'Apothecary', desc:'potions and tonics' },
    scribe: { name:'Scribe & Scrolls', desc:'scrolls and parchments' },
    magic: { name:'Arcana', desc:'wands, rings and finer work' }
  };

  // generate shop stock for a band (deterministic on rng)
  function shopStock(rng, kind, band, seedSalt) {
    var stock = [];
    function add(id, qty, mult) {
      if (!ITEMS[id]) return;
      stock.push({ id:id, qty:qty, price:Math.max(1, Math.round(ITEMS[id].price * (mult || 1))) });
    }
    var r = rng;
    if (kind === 'general') {
      var weapons = ['club','dagger','mace','short_sword','spear','hand_axe','long_sword','battle_axe','flail','two_sword','poleaxe','halberd','trident','war_pick','short_bow','long_bow','comp_bow','crossbow_light','crossbow_heavy','sling','arrows','bolts','sling_bullets'];
      var armor = ['leather','studded','chain','scale','brigandine','splint','plate','buckler','round','kite','tower'];
      var gear = ['torch','lantern','lockpicks','rations'];
      var nW = 5 + Math.floor(r() * 3), nA = 4 + Math.floor(r() * 3);
      for (var i = 0; i < nW; i++) add(M.pick(weapons), 1 + Math.floor(r() * 2));
      for (i = 0; i < nA; i++) add(M.pick(armor), 1);
      for (i = 0; i < 3; i++) add(M.pick(gear), 2 + Math.floor(r() * 4));
      if (band >= 2 && r() < 0.7) add(M.pick(['leather_1','studded_1','short_sword_1','mace_1','chain_1']), 1, 1);
      if (band >= 3 && r() < 0.6) add(M.pick(['chain_1','scale_1','long_sword_1','two_sword_1']), 1);
      if (band >= 4 && r() < 0.5) add(M.pick(['chain_2','plate_1','long_sword_2']), 1);
      if (band >= 5 && r() < 0.5) add(M.pick(['plate_2','two_sword_2','tower_2']), 1);
    } else if (kind === 'apothecary') {
      var pots = POTION_BAND[band].concat(POTION_BAND[Math.max(1, band - 1)]);
      for (var i = 0; i < 6 + Math.floor(r() * 3); i++) add(M.pick(pots), 1 + (r() < 0.3 ? 1 : 0));
      add('p_heal', 2);
      if (band >= 3 && r() < 0.6) add('p_restore_lvl', 1);
      if (band >= 4 && r() < 0.5) add('p_life', 1);
    } else if (kind === 'scribe') {
      for (var i = 0; i < 5 + Math.floor(r() * 4); i++) {
        add(scrollForBand(r, band), 1);
      }
      if (r() < 0.5) add('faded_map', 1);
    } else if (kind === 'magic') {
      for (var i = 0; i < 3 + Math.floor(r() * 3); i++) {
        var kind2 = M.pick(['weapon','armor','potion','ring','staff','scroll']);
        if (kind2 === 'scroll') add(scrollForBand(r, band), 1);
        else add(magicItem(r, kind2, band), 1);
      }
      if (band >= 3 && r() < 0.7) add(M.pick(['r_prot1','c_elvenkind','b_silent','g_thievery','a_protect']), 1);
      if (band >= 4 && r() < 0.6) add(M.pick(['r_prot2','c_shadows','st_power','a_life']), 1);
    }
    // de-dup
    var seen = {}, out = [];
    for (var j = 0; j < stock.length; j++) {
      var k = stock[j].id;
      if (!seen[k]) { seen[k] = 1; out.push(stock[j]); }
    }
    return out;
  }

  return {
    bandOf: bandOf, rollTreasure: rollTreasure, rollChest: rollChest,
    SHOP_KINDS: SHOP_KINDS, shopStock: shopStock, scrollForBand: scrollForBand,
    GEM_POOL: GEM_POOL, JEWEL_POOL: JEWEL_POOL, TRADE_POOL: TRADE_POOL
  };
})();


if (typeof module !== 'undefined' && module.exports) module.exports = { TREASURE: TREASURE };
