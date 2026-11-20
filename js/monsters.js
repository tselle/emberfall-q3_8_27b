/* ============================================================
   EMBERFALL — monsters.js
   The full monster list (~330). Every entry is written in
   original words; stats follow second-edition conventions.
   Monster shape:
     id, n name, hd 'Nd6(+M)' dice string, hdVal die count,
     hp average total, ac descending, mv move (squares),
     atk [[name,bonus]...], dmg dice,
     sp special: poison, paralyze, level_drain, regen,
        breath{kind,dmg,range,save}, resist (magic weapon
        bonus required, 0=none), turn (undead 1..9 or null),
        immune[], size s/m/l/h, align, morale 1..10,
        tr treasure type, xp, ambush flag, desc.
   ============================================================ */
'use strict';



var MONSTERS = (function () {
  var L = [];
  function M(o) {
    var d = RULES.parseDice(o.hd);
    o.hdVal = o.hdVal != null ? o.hdVal : d.n;
    o.hp = o.hp != null ? o.hp : Math.round(d.avg + (o.hpMod || 0));
    o.xp = o.xp != null ? o.xp : Math.round(o.hp * 4);
    o.align = o.align || 'ne';
    o.morale = o.morale != null ? o.morale : 5;
    o.size = o.size || 'm';
    o.tr = o.tr || 'd';
    L.push(o);
    return o;
  }

  /* ================= VERMIN & INSECTS ================= */
  M({ id:'rat', n:'Rat', hd:'1d4', ac:13, mv:9, atk:[[ 'Bite',0 ]], dmg:'1d4',
    poison:{ lvl:1 }, xp:1, tr:'-',
    desc:'Common vermin of cellar and gutter, but a nest of them will gnaw a leg clean.' });
  M({ id:'giant_rat', n:'Giant Rat', hd:'1d6', ac:12, mv:11, atk:[[ 'Bite',0 ]], dmg:'1d6',
    poison:{ lvl:1 }, xp:2, tr:'-',
    desc:'A rat the size of a hound. Its bite carries a fever that has killed braver men.' });
  M({ id:'swarm_rats', n:'Swarm of Rats', hd:'1d4', ac:14, mv:11, atk:[[ 'Bites',2 ]], dmg:'1d8',
    poison:{ lvl:2 }, xp:15, tr:'-',
    desc:'A writhing cloud of a hundred rats. They drink the blood of anything they touch.' });
  M({ id:'cave_bug', n:'Cave Bug', hd:'1d4', ac:13, mv:9, atk:[[ 'Bite',0 ]], dmg:'1d4',
    xp:1, tr:'-',
    desc:'A glossy black beetle of the deep dark, its jaws worked like a trap.' });
  M({ id:'giant beetle', n:'Giant Beetle', hd:'1d6', ac:14, mv:9, atk:[[ 'Bite',0 ]], dmg:'1d6',
    xp:2, tr:'-',
    desc:'The size of a dog, hard as a wheel, and it chews through leather like paper.' });
  M({ id:'giant ant', n:'Giant Ant', hd:'1d6', ac:15, mv:10, atk:[[ 'Bite',1 ]], dmg:'1d8',
    xp:3, tr:'-',
    desc:'A soldier of the hillside colony, mandibles that shear a hand from the wrist.' });
  M({ id:'giant centipede', n:'Giant Centipede', hd:'1d6+1', ac:14, mv:12, atk:[[ 'Bite',1 ]], dmg:'1d6',
    poison:{ lvl:2 }, xp:5, tr:'-',
    desc:'A wriggling ribbon of legs. One nip and the limb goes numb as lead.' });
  M({ id:'giant scorpion', n:'Giant Scorpion', hd:'2d6', ac:15, mv:10, atk:[[ 'Sting',1 ]], dmg:'1d10',
    poison:{ lvl:3 }, xp:15, tr:'-',
    desc:'Claws like cleavers and a stinger that weeps blue venom. The desert folk leave offerings for it.' });
  M({ id:'giant spider', n:'Giant Spider', hd:'2d6', ac:13, mv:12, web:true, atk:[[ 'Bite',1 ]], dmg:'1d8',
    poison:{ lvl:3 }, xp:20, tr:'-',
    desc:'It hangs in a web of living silk and waits with eight patient eyes.' });
  M({ id:'swarm insects', n:'Swarm of Insects', hd:'1d6', ac:13, mv:12, atk:[[ 'Bites',2 ]], dmg:'1d8',
    xp:10, tr:'-',
    desc:'A buzzing curtain of wasps and gnats that blinds and bites in equal measure.' });
  M({ id:'giant mantis', n:'Giant Mantis', hd:'2d6+2', ac:14, mv:11, atk:[[ 'Claws',2 ]], dmg:'2d6',
    xp:25, tr:'-',
    desc:'A praying blade of green chitin. It strikes so fast the air cracks.' });
  M({ id:'giant wasp', n:'Giant Wasp', hd:'1d6', ac:12, mv:15, atk:[[ 'Sting',1 ]], dmg:'1d6',
    poison:{ lvl:2 }, xp:3, tr:'-',
    desc:'A wasp the size of a sparrow, and it is furious at the world for no reason you can find.' });
  M({ id:'giant crab', n:'Giant Crab', hd:'2d6', ac:16, mv:6, atk:[[ 'Claws',2 ]], dmg:'2d6',
    xp:15, tr:'-',
    desc:'A boulder with legs that pinches a shield off its arm and takes a bite out of it.' });
  M({ id:'carrion crawler', n:'Carrion Crawler', hd:'1d6', ac:14, mv:10, atk:[[ 'Tongue',0 ]], dmg:'1d6',
    sp:{ dissolve:true }, xp:15, tr:'-',
    desc:'A pale many-legged thing that eats through steel and bone alike, leaving a smell of sweet rot.' });

  /* ================= BATS, BIRDS & BEAST-FOLK ================= */
  M({ id:'bat', n:'Bat', hd:'1d4', ac:14, mv:15, fly:true, atk:[[ 'Bite',-1 ]], dmg:'1d4',
    xp:1, tr:'-',
    desc:'Common in the dark places, where a thousand of them hang from the roof and hoot.' });
  M({ id:'giant bat', n:'Giant Bat', hd:'1d6', ac:14, mv:16, fly:true, atk:[[ 'Bite',0 ]], dmg:'1d6',
    xp:3, tr:'-',
    desc:'The size of a hound, with ears that hear a heartbeat three corridors off.' });
  M({ id:'swarm_bats', n:'Swarm of Bats', hd:'1d6', ac:15, mv:16, fly:true, atk:[[ 'Bites',2 ]], dmg:'1d8',
    xp:10, tr:'-',
    desc:'A living cloud that screams as it folds about a man and drinks him thin.' });
  M({ id:'raven', n:'Raven', hd:'1d4', ac:15, mv:14, fly:true, atk:[[ 'Bite',-1 ]], dmg:'1d4',
    xp:1, tr:'-',
    desc:'A clever black bird that follows funerals and carries words between the hags.' });
  M({ id:'owl', n:'Owl', hd:'1d4', ac:14, mv:14, fly:true, atk:[[ 'Talons',-1 ]], dmg:'1d4',
    xp:1, tr:'-',
    desc:'An old-eyed watcher of the forest. It does not attack, but it tells its stories.' });
  M({ id:'vulture', n:'Vulture', hd:'1d6', ac:13, mv:13, fly:true, atk:[[ 'Beak',0 ]], dmg:'1d6',
    xp:2, tr:'-',
    desc:'It circles the road for hours, learning where the weakness will come.' });
  M({ id:'eagle', n:'Eagle', hd:'1d6', ac:13, mv:16, fly:true, atk:[[ 'Talons',1 ]], dmg:'1d6',
    xp:3, tr:'-',
    desc:'A noble bird of the high places, fierce if its young are touched.' });
  M({ id:'giant eagle', n:'Giant Eagle', hd:'3d6', ac:12, mv:18, fly:true, atk:[[ 'Talons',3 ]], dmg:'2d6',
    xp:40, tr:'d',
    desc:'The size of a horse, with a cry that shakes the pine needles loose. It is loyal to the one who earns it.' });
  M({ id:'owl bear', n:'Owlbear', hd:'4d6+2', ac:13, mv:10, atk:[[ 'Talons',2 ]], dmg:'2d6',
    xp:60, tr:'d',
    desc:'It grumbles and huffs and swats at the air, and it will swat you the same. Nobody knows what it wants, only that it will not stop.' });
  M({ id:'harpy', n:'Harpy', hd:'3d6', ac:14, mv:12, fly:true, atk:[[ 'Talons',1 ],[ 'Scream',1 ]], dmg:'1d6',
    sp:{ charm:'Scream', save:4 }, xp:40, tr:'d',
    desc:'A woman\u2019s face on a bird\u2019s body. It sings, and the ones who listen walk to their own destruction.' });
  M({ id:'griffon', n:'Griffon', hd:'4d6', ac:14, mv:12, fly:true, atk:[[ 'Talons',2 ]], dmg:'2d6',
    xp:50, tr:'d',
    desc:'Lion beneath, eagle above. It is proud and will bear a rider only if asked the proper way.' });
  M({ id:'hippogriff', n:'Hippogriff', hd:'3d6', ac:14, mv:12, fly:true, atk:[[ 'Beak',1 ]], dmg:'1d6',
    xp:40, tr:'d',
    desc:'Eagle to the waist, horse behind. It bows to those who bow first, and it bites those who do not.' });
  M({ id:'manticore', n:'Manticore', hd:'6d6', ac:15, mv:12, atk:[[ 'Claws',3 ],[ 'Tail',2 ]], dmg:'2d6',
    sp:{ poison:{ lvl:4 } }, xp:120, tr:'e',
    desc:'A scorpion-tailed beast with three rows of teeth. The quills it looses carry a venom that stops a heart.' });
  M({ id:'roc', n:'Roc', hd:'10d6', ac:16, mv:18, fly:true, atk:[[ 'Talons',6 ]], dmg:'4d6',
    xp:300, tr:'f',
    desc:'A bird that carries off a lion with one claw. Its shadow is a small eclipse.' });
  M({ id:'phoenix', n:'Phoenix', hd:'8d6', ac:17, mv:18, fly:true, atk:[[ 'Beak',5 ]], dmg:'3d6',
    sp:{ regen:5 }, undead:false, xp:400, tr:'f', align:'lg',
    desc:'It burns and is reborn in the burning. To strike it is to stand in the heart of a small sun.' });
  M({ id:'sphinx', n:'Sphinx', hd:'7d6', ac:16, mv:12, atk:[[ 'Talons',5 ]], dmg:'3d6',
    sp:{ riddle:true, charm:'Riddle', save:4 }, xp:200, tr:'f',
    desc:'It keeps the road and asks a question. Answer wrongly and the wings close. It is older than the road.' });

  /* ================= BEASTS ================= */
  M({ id:'wolf', n:'Wolf', hd:'1d6', ac:12, mv:13, atk:[[ 'Bite',0 ]], dmg:'1d6',
    xp:2, tr:'-',
    desc:'Grey and patient. It runs in a pack and it does not stop when the others fall.' });
  M({ id:'dire wolf', n:'Dire Wolf', hd:'2d6+1', ac:12, mv:14, atk:[[ 'Bite',1 ]], dmg:'1d10',
    xp:15, tr:'-',
    desc:'The size of a small horse, with a snarl that sounds like tearing iron. It hunts the hunters.' });
  M({ id:'worg', n:'Worg', hd:'2d6', ac:12, mv:14, atk:[[ 'Bite',1 ]], dmg:'1d8',
    xp:15, tr:'-',
    desc:'A warhorse of the orc host. It is trained to trample and to bite the fallen.' });
  M({ id:'hyena', n:'Hyena', hd:'1d6', ac:12, mv:13, atk:[[ 'Bite',0 ]], dmg:'1d6',
    xp:2, tr:'-',
    desc:'It laughs at a distance and it is always, always hungry.' });
  M({ id:'boar', n:'Boar', hd:'1d6', ac:12, mv:12, atk:[[ 'Tusks',0 ]], dmg:'1d6',
    xp:2, tr:'-',
    desc:'A farmyard creature that has eaten well and now intends to eat you.' });
  M({ id:'bear', n:'Bear', hd:'2d6', ac:12, mv:11, atk:[[ 'Claws',1 ]], dmg:'1d8',
    xp:10, tr:'-',
    desc:'Brown and broad, with a memory for the taste of blood.' });
  M({ id:'dire bear', n:'Dire Bear', hd:'4d6', ac:12, mv:12, atk:[[ 'Claws',2 ]], dmg:'2d6',
    xp:45, tr:'d',
    desc:'A bear that eats other bears. It stands on its hind legs in the snow and it is very, very tall.' });
  M({ id:'lion', n:'Lion', hd:'2d6', ac:12, mv:13, atk:[[ 'Claws',1 ]], dmg:'1d6',
    xp:10, tr:'-',
    desc:'The king of the grass, and it knows it. It hunts with its pride and it does not share.' });
  M({ id:'panther', n:'Panther', hd:'2d6', ac:12, mv:14, atk:[[ 'Claws',1 ]], dmg:'1d8',
    xp:10, tr:'-',
    desc:'It moves through the dark like smoke and it is patient, and it is cruel, and it is beautiful.' });
  M({ id:'tiger', n:'Tiger', hd:'2d6+1', ac:12, mv:14, atk:[[ 'Claws',2 ]], dmg:'1d10',
    xp:15, tr:'-',
    desc:'Striped and fierce. It takes the kill and it drags it into the reeds and it does not look back.' });
  M({ id:'giant ape', n:'Giant Ape', hd:'5d6', ac:13, mv:11, atk:[[ 'Claws',4 ]], dmg:'3d6',
    xp:90, tr:'d',
    desc:'It beats its chest and the trees shake. It will carry off a man and it will throw him for its amusement.' });
  M({ id:'pegasus', n:'Pegasus', hd:'3d6', ac:13, mv:15, fly:true, atk:[[ 'Hooves',2 ]], dmg:'1d8',
    xp:40, tr:'d', align:'ng',
    desc:'White and winged and proud. It will not bear a rider unless the heart behind the hands is clean.' });
  M({ id:'unicorn', n:'Unicorn', hd:'4d6', ac:14, mv:15, atk:[[ 'Horn',3 ]], dmg:'2d6',
    sp:{ heal_on_hit:true }, xp:60, tr:'d', align:'lg',
    desc:'Its horn mends the wounds it makes. It is gentle with the good and terrible with the rest.' });
  M({ id:'centaur', n:'Centaur', hd:'2d6', ac:13, mv:13, atk:[[ 'Hooves',1 ],[ 'Spear',1 ]], dmg:'1d8',
    xp:15, tr:'d',
    desc:'Half horse, half man, all temper. It keeps the herd and it defends the grove with its spear.' });
  M({ id:'minotaur', n:'Minotaur', hd:'5d6', ac:14, mv:11, atk:[[ 'Horns',3 ],[ 'Axe',2 ]], dmg:'2d8',
    xp:90, tr:'e',
    desc:'It lives in the maze and it knows every turning of it. It does not need a light. It does not need a map. It needs you.' });
  M({ id:'satyr', n:'Satyr', hd:'1d6', ac:12, mv:12, atk:[[ 'Horns',0 ]], dmg:'1d4',
    xp:5, tr:'-',
    desc:'It plays the pipe and it dances and it is not as harmless as it looks when the wine is gone.' });
  M({ id:'leonin', n:'Leonin', hd:'2d6', ac:12, mv:13, atk:[[ 'Claws',1 ],[ 'Spear',1 ]], dmg:'1d6',
    xp:15, tr:'d',
    desc:'Lion-folk of the river plains. They hunt with a net and a spear and they take their pride seriously.' });
  M({ id:'chimera', n:'Chimera', hd:'6d6', ac:15, mv:12, atk:[[ 'Claws',4 ],[ 'Goat',3 ],[ 'Dragon',3 ]], dmg:'2d6',
    sp:{ breath:{ kind:'fire', dmg:'4d6', range:3, save:1 } }, xp:150, tr:'e',
    desc:'Lion, goat and serpent in one body, and the serpent\u2019s tail breathes a fire that does not stop when the rest of it is dead.' });
  M({ id:'serpopard', n:'Serpopard', hd:'3d6', ac:14, mv:12, atk:[[ 'Bite',2 ]], dmg:'1d8',
    sp:{ poison:{ lvl:3 } }, xp:40, tr:'d',
    desc:'A serpentine thing with a panther\u2019s head that will coil around a rider and drink him slowly.' });
  M({ id:'yeth hound', n:'Yeth Hound', hd:'3d6', ac:13, mv:15, atk:[[ 'Bite',2 ]], dmg:'1d10',
    sp:{ fly:true }, xp:40, tr:'d',
    desc:'A grey hound that runs on the wind. The orcs ride it and it will trample a shield wall flat.' });
  M({ id:'wereboar', n:'Wereboar', hd:'4d6', ac:13, mv:13, atk:[[ 'Tusks',3 ]], dmg:'2d8',
    sp:{ shapeshift:true }, xp:60, tr:'d',
    desc:'A man in the morning and a boar in the dark. The tusks remember what the man meant to do.' });
  M({ id:'werebear', n:'Werebear', hd:'5d6', ac:13, mv:13, atk:[[ 'Claws',4 ]], dmg:'2d8',
    sp:{ shapeshift:true }, xp:90, tr:'d',
    desc:'It wears a man\u2019s shape when it likes you. When it does not, it wears a bear\u2019s.' });
  M({ id:'wererat', n:'Wererat', hd:'1d6', ac:12, mv:13, atk:[[ 'Bite',0 ]], dmg:'1d4',
    sp:{ shapeshift:true, poison:{ lvl:1 } }, xp:5, tr:'-',
    desc:'It comes out of the walls at night and it is small, but it is very, very angry.' });
  M({ id:'werewolf', n:'Werewolf', hd:'6d6', ac:14, mv:14, atk:[[ 'Bite',4 ]], dmg:'2d6+1',
    sp:{ shapeshift:true, silver:{ penalty:2 } }, xp:150, tr:'e',
    desc:'The full moon makes it honest. Silver makes it flinch. Both matters are well known to the village elders.' });
  M({ id:'weretiger', n:'Weretiger', hd:'5d6', ac:14, mv:15, atk:[[ 'Claws',4 ]], dmg:'2d8',
    sp:{ shapeshift:true }, xp:90, tr:'e',
    desc:'It strikes from the grass and it is gone before the second man is on his feet.' });
  M({ id:'shambling mound', n:'Shambling Mound', hd:'8d6', ac:15, mv:7, atk:[[ 'Squeeze',6 ]], dmg:'4d6',
    sp:{ squeeze:true, dissolve:true }, xp:300, tr:'e',
    desc:'A hillside that walks. It does not break you. It takes you in, and it keeps you, and you are part of the hill now.' });
  M({ id:'treant', n:'Treant', hd:'9d6', ac:15, mv:8, atk:[[ 'Branch',6 ]], dmg:'4d6',
    sp:{ root:true }, xp:400, tr:'e', align:'ng',
    desc:'The forest moves when it moves. It is slow and it is old and it is furious at the axe.' });

  /* ================= AQUATIC ================= */
  M({ id:'mermaid', n:'Mermaid', hd:'1d6', ac:12, mv:10, swim:true, atk:[[ 'Dagger',0 ]], dmg:'1d6',
    xp:5, tr:'d',
    desc:'Singing at the water\u2019s edge. She will pull you in for a kiss and keep you for a husband.' });
  M({ id:'siren', n:'Siren', hd:'3d6', ac:13, mv:10, swim:true, atk:[[ 'Claws',1 ]], dmg:'1d6',
    sp:{ charm:'Song', save:4 }, xp:40, tr:'d',
    desc:'Her voice is the sound of a shore you have never seen and will never see again. The men row toward it with their oars still in their hands.' });
  M({ id:'kraken', n:'Kraken', hd:'16d6', ac:16, mv:9, swim:true, atk:[[ 'Tentacles',8 ]], dmg:'6d6',
    sp:{ squeeze:true, fear:{ save:4 } }, xp:1200, tr:'f', align:'ce',
    desc:'It sleeps under the fleet and it dreams in the dark and it is angry that you are on the water.' });
  M({ id:'leviathan', n:'Leviathan', hd:'18d6', ac:17, mv:9, swim:true, atk:[[ 'Jaws',9 ]], dmg:'8d6',
    xp:1500, tr:'f', align:'ce',
    desc:'A whale of the old deep, scaled like a dragon, and it is eating the bottom of the bay.' });
  M({ id:'giant octopus', n:'Giant Octopus', hd:'8d6', ac:15, mv:8, swim:true, atk:[[ 'Tentacles',5 ]], dmg:'4d6',
    sp:{ squeeze:true }, xp:300, tr:'e',
    desc:'It has eight arms and none of them are doing anything gentle. It will wrap a boat and it will hold.' });
  M({ id:'giant jellyfish', n:'Giant Jellyfish', hd:'6d6', ac:13, mv:6, swim:true, atk:[[ 'Tentacles',3 ]], dmg:'3d6',
    sp:{ paralyze:1 }, xp:150, tr:'-',
    desc:'It drifts with the tide, trailing stingers long as masts. Touch one and the heart forgets its rhythm.' });
  M({ id:'shark', n:'Shark', hd:'2d6', ac:12, mv:14, swim:true, atk:[[ 'Jaws',1 ]], dmg:'1d8',
    xp:10, tr:'-',
    desc:'It does not hate you. It simply wants a piece of you and it is very good at taking it.' });
  M({ id:'giant shark', n:'Giant Shark', hd:'8d6', ac:14, mv:14, swim:true, atk:[[ 'Jaws',6 ]], dmg:'5d6',
    xp:300, tr:'e',
    desc:'A grey mountain with teeth. The fishing villages have a tax for it and a prayer for it and neither is enough.' });
  M({ id:'whale', n:'Whale', hd:'10d6', ac:15, mv:10, swim:true, atk:[[ 'Tail',7 ]], dmg:'5d6',
    xp:400, tr:'-', align:'nn',
    desc:'It is not hostile, but it is the size of a longhouse and its tail can crack a keel. Do not be in the way.' });
  M({ id:'sea hag', n:'Sea Hag', hd:'4d6', ac:14, mv:9, swim:true, atk:[[ 'Claws',2 ]], dmg:'1d8',
    sp:{ disguise:true, charm:'Bargain', save:4 }, xp:60, tr:'e', align:'ce',
    desc:'She wears a seal\u2019s skin and a drowned man\u2019s face and she is always, always bargaining.' });
  M({ id:'triton', n:'Triton', hd:'2d6', ac:13, mv:12, swim:true, atk:[[ 'Trident',2 ]], dmg:'1d8',
    xp:15, tr:'d', align:'ce',
    desc:'Scales and a trident and a grudge against the surface. They sink the slow boats and they take the rings.' });
  M({ id:'moray eel', n:'Moray Eel', hd:'2d6', ac:13, mv:12, swim:true, atk:[[ 'Bite',1 ]], dmg:'1d8',
    sp:{ constrict:true }, xp:10, tr:'-',
    desc:'It lives in the wreck and it bites the hand that reaches in. It does not let go. It is patient like that.' });

  /* ================= REPTILES & AMPHIBIANS ================= */
  M({ id:'adder', n:'Adder', hd:'1d4', ac:13, mv:10, atk:[[ 'Bite',0 ]], dmg:'1d4',
    poison:{ lvl:1 }, xp:1, tr:'-',
    desc:'A common serpent. Its bite is small and it is not proud of it, but it is enough.' });
  M({ id:'viper', n:'Viper', hd:'1d6', ac:13, mv:11, atk:[[ 'Bite',1 ]], dmg:'1d6',
    poison:{ lvl:2 }, xp:3, tr:'-',
    desc:'It strikes before the foot is on the stone. The fever comes in the night and the skin turns the colour of a bruise.' });
  M({ id:'giant constrictor', n:'Giant Constrictor', hd:'5d6', ac:14, mv:12, atk:[[ 'Coils',4 ]], dmg:'3d6',
    sp:{ constrict:true }, xp:90, tr:'d',
    desc:'It does not need venom. It wraps and it holds and the ribs simply give. It has done this before.' });
  M({ id:'water moccasin', n:'Water Moccasin', hd:'1d6', ac:12, mv:12, swim:true, atk:[[ 'Bite',1 ]], dmg:'1d6',
    poison:{ lvl:2 }, xp:3, tr:'-',
    desc:'It lies in the shallows with its head just under the skin of the water. The leg goes in first. That is how it works.' });
  M({ id:'basilisk', n:'Basilisk', hd:'3d6', ac:15, mv:9, atk:[[ 'Bite',1 ]], dmg:'1d6',
    sp:{ petrify:{ save:2 } }, xp:40, tr:'e',
    desc:'Do not look at it. Its eyes do a thing to the blood and the blood turns to stone from the inside out.' });
  M({ id:'cockatrice', n:'Cockatrice', hd:'2d6', ac:14, mv:10, fly:true, atk:[[ 'Beak',0 ]], dmg:'1d6',
    sp:{ petrify:{ save:2 } }, xp:15, tr:'d',
    desc:'A rooster with wings and a serpent\u2019s tail. Its gaze is a slow poison that starts in the feet and climbs.' });
  M({ id:'giant newt', n:'Giant Newt', hd:'3d6', ac:13, mv:10, atk:[[ 'Bite',2 ]], dmg:'1d8',
    xp:40, tr:'d',
    desc:'It is the size of a mastiff and it is very cross about being called a lizard. It will show you why.' });
  M({ id:'giant bullfrog', n:'Giant Bullfrog', hd:'3d6', ac:12, mv:10, atk:[[ 'Jaws',2 ]], dmg:'1d8',
    xp:40, tr:'d',
    desc:'It sits in the bog and it does not move until the heron is close. Then it opens its mouth and the heron is a memory.' });
  M({ id:'crocodile', n:'Crocodile', hd:'4d6', ac:14, mv:10, swim:true, atk:[[ 'Jaws',3 ]], dmg:'2d8',
    sp:{ constrict:true }, xp:60, tr:'d',
    desc:'It waits under the log with its eyes only. The river does a thing to the leg and then it is gone and the water is quiet again.' });
  M({ id:'wyvern', n:'Wyvern', hd:'5d6', ac:15, mv:14, fly:true, atk:[[ 'Bite',3 ],[ 'Tail',2 ]], dmg:'1d10',
    sp:{ poison:{ lvl:3 }, breath:{ kind:'acid', dmg:'3d6', range:3, save:1 } }, xp:90, tr:'e',
    desc:'Two wings and a stinger, not four wings and no stinger. It is meaner for it. The bite carries a venom that eats the nerve.' });
  M({ id:'giant lizard', n:'Giant Lizard', hd:'2d6', ac:13, mv:11, atk:[[ 'Bite',1 ]], dmg:'1d8',
    xp:15, tr:'-',
    desc:'It is a lizard the size of a hound and it has found a cellar that is warm and it intends to keep it.' });
  M({ id:'python', n:'Python', hd:'3d6', ac:13, mv:10, atk:[[ 'Coils',3 ]], dmg:'2d6',
    sp:{ constrict:true }, xp:40, tr:'d',
    desc:'It is long and it is calm and it does not hurry. By the time the legs stop working, it has already decided what it will do next.' });

  /* ================= HUMANOIDS ================= */
  M({ id:'goblin', n:'Goblin', hd:'1d6', ac:13, mv:10, atk:[[ 'Dagger',0 ]], dmg:'1d6',
    xp:2, tr:'d', align:'ce',
    desc:'Small, green, and very many. They take what is not nailed down and they hide in the walls when the fighting gets loud.' });
  M({ id:'kobold', n:'Kobold', hd:'1d4', ac:12, mv:10, atk:[[ 'Dart',-1 ]], dmg:'1d4',
    xp:1, tr:'-', align:'ce',
    desc:'It digs and it traps and it sets the fire and it runs. It is not brave. It is very clever about not being brave.' });
  M({ id:'orc', n:'Orc', hd:'1d8', ac:13, mv:11, atk:[[ 'Greataxe',1 ]], dmg:'1d10',
    xp:5, tr:'d', align:'ce',
    desc:'It fights with a joy that is not joy and it takes the teeth of the ones it kills. The chieftain keeps a rack of them.' });
  M({ id:'half orc', n:'Half-Orc', hd:'1d8', ac:13, mv:11, atk:[[ 'Sword',1 ]], dmg:'1d8',
    xp:5, tr:'d', align:'ce',
    desc:'The orc\u2019s strength and the man\u2019s temper, and neither one knows which is worse.' });
  M({ id:'hobgoblin', n:'Hobgoblin', hd:'1d8', ac:14, mv:11, atk:[[ 'Spear',1 ]], dmg:'1d8',
    xp:5, tr:'d', align:'le',
    desc:'It marches in lines and it keeps its promises and it burns the village exactly as it said it would.' });
  M({ id:'bugbear', n:'Bugbear', hd:'2d8', ac:13, mv:11, atk:[[ 'Club',2 ]], dmg:'1d8',
    sp:{ surprise:1 }, xp:20, tr:'d', align:'ce',
    desc:'It looks like a troll that has lost its temper. It hits first and it hits hard and it is laughing the whole time.' });
  M({ id:'gnoll', n:'Gnoll', hd:'1d8', ac:13, mv:12, atk:[[ 'Javelin',1 ]], dmg:'1d6',
    xp:5, tr:'d', align:'ce',
    desc:'A hound-folk that hunts in the grass and it howls when it finds you. It does not stop howling.' });
  M({ id:'ogre', n:'Ogre', hd:'4d8', ac:13, mv:10, atk:[[ 'Clubs',3 ]], dmg:'2d6',
    xp:60, tr:'d', align:'ce',
    desc:'It is big and it is stupid and it is holding two of them and it is coming at you and it is very, very cross about the soup.' });
  M({ id:'troll', n:'Troll', hd:'5d8', ac:14, mv:11, atk:[[ 'Claws',4 ]], dmg:'2d8',
    sp:{ regen:5, fireWeak:true }, xp:120, tr:'e', align:'ce',
    desc:'It heals from the wound while you are still pulling the blade out. Fire is the argument it does not win.' });
  M({ id:'ogre mage', n:'Ogre Mage', hd:'6d8', ac:15, mv:10, atk:[[ 'Clubs',5 ]], dmg:'2d8',
    sp:{ magic:true, enlarge:true }, xp:180, tr:'e', align:'ce',
    desc:'It has a beard of moss and a club the size of a door and it has read a book or two, which makes it worse.' });
  M({ id:'cyclops', n:'Cyclops', hd:'8d8', ac:15, mv:10, atk:[[ 'Boulder',6 ]], dmg:'4d6',
    xp:300, tr:'e', align:'ce',
    desc:'It lives on the crag and it throws the rocks and it is not quick, but it is very, very heavy, and it has been throwing them for a long time.' });
  M({ id:'ettin', n:'Ettin', hd:'7d8', ac:14, mv:10, atk:[[ 'Clubs',5 ]], dmg:'2d10',
    xp:200, tr:'e', align:'ce',
    desc:'Two heads and neither of them is listening to the other. It is twice as mean as it needs to be and it is twice as loud.' });
  M({ id:'hill giant', n:'Hill Giant', hd:'9d8', ac:15, mv:9, atk:[[ 'Club',6 ]], dmg:'3d8',
    xp:400, tr:'e', align:'ce',
    desc:'It is the size of a watchtower and it is throwing a boulder the size of a cart. It is not aiming. It is swinging.' });
  M({ id:'stone giant', n:'Stone Giant', hd:'10d8', ac:16, mv:9, atk:[[ 'Spear',7 ]], dmg:'4d6',
    xp:500, tr:'e', align:'ne',
    desc:'It is made of the hill and it is honest in a way the other giants are not. It will trade a goat for a song if the song is good.' });
  M({ id:'frost giant', n:'Frost Giant', hd:'11d8', ac:16, mv:9, atk:[[ 'Greatclub',8 ]], dmg:'4d8',
    sp:{ breath:{ kind:'cold', dmg:'6d6', range:4, save:1 } }, xp:600, tr:'f', align:'ce',
    desc:'Its breath is the weather. The trees it walks past are already ice by the time it has passed.' });
  M({ id:'fire giant', n:'Fire Giant', hd:'12d8', ac:16, mv:9, atk:[[ 'Greatclub',9 ]], dmg:'4d8',
    sp:{ breath:{ kind:'fire', dmg:'6d6', range:4, save:1 } }, xp:700, tr:'f', align:'ce',
    desc:'It walks out of the caldera with its shoulders glowing and the ground is already hot behind it.' });
  M({ id:'cloud giant', n:'Cloud Giant', hd:'14d8', ac:17, mv:9, atk:[[ 'Greatclub',10 ]], dmg:'5d8',
    sp:{ breath:{ kind:'any', dmg:'8d6', range:5, save:1 } }, xp:1000, tr:'f', align:'ce',
    desc:'It lives above the weather and it throws lightning and it is bored, and you are small, and it is looking for something to do.' });
  M({ id:'grey giant', n:'Grey Giant', hd:'10d8', ac:15, mv:9, atk:[[ 'Spear',6 ]], dmg:'3d8',
    xp:500, tr:'e', align:'ce',
    desc:'It is grey like the storm before it breaks and it is holding a spear the length of a mast and it is not in a hurry.' });
  M({ id:'white giant', n:'White Giant', hd:'9d8', ac:15, mv:9, atk:[[ 'Club',5 ]], dmg:'3d8',
    xp:400, tr:'e', align:'ce',
    desc:'It is white as the snowfield and it is very, very cold and it is angry that you are walking on its ice.' });
  M({ id:'black giant', n:'Black Giant', hd:'11d8', ac:16, mv:9, atk:[[ 'Greatclub',7 ]], dmg:'4d8',
    sp:{ poison:{ lvl:5 } }, xp:600, tr:'f', align:'ce',
    desc:'It is black as the tar pit and its blood is a poison that eats the skin off the hand that draws it.' });
  M({ id:'troglodyte', n:'Troglodyte', hd:'2d6', ac:14, mv:10, atk:[[ 'Bite',1 ]], dmg:'1d6',
    sp:{ poison:{ lvl:2 } }, xp:15, tr:'d', align:'ce',
    desc:'It lives in the cave and it is pale and it is blind and it is very, very hungry, and it has been waiting a long time.' });
  M({ id:'lizardman', n:'Lizard Man', hd:'1d8', ac:13, mv:11, atk:[[ 'Spear',1 ]], dmg:'1d6',
    xp:5, tr:'d', align:'ne',
    desc:'Scales and a spear and a grudge against the farmers upstream. They take the cattle and they do not ask.' });
  M({ id:'sahuagin', n:'Sahuagin', hd:'2d6', ac:14, mv:11, swim:true, atk:[[ 'Trident',1 ]], dmg:'1d8',
    xp:15, tr:'d', align:'ce',
    desc:'Fish-folk of the wreck and the shallows. They sing a song that drowns the ship and they take the rings and the teeth.' });
  M({ id:'drow', n:'Drow', hd:'1d6', ac:14, mv:10, atk:[[ 'Longbow',2 ]], dmg:'1d6',
    sp:{ darkvision:true }, xp:10, tr:'d', align:'le',
    desc:'It comes out of the deep dark with a bow and a grudge and a spider on its shoulder. It does not trust the light.' });
  M({ id:'half giant', n:'Half-Giant', hd:'4d8', ac:14, mv:10, atk:[[ 'Sword',3 ]], dmg:'1d10',
    xp:60, tr:'d', align:'ce',
    desc:'The giant\u2019s height and the man\u2019s sword arm, and it wears a helm that does not quite fit and it is twice as cross as it needs to be.' });
  M({ id:'soldier', n:'Soldier', hd:'1d6', ac:15, mv:10, atk:[[ 'Spear',1 ]], dmg:'1d8',
    xp:2, tr:'-', align:'le',
    desc:'Mail and a spear and a standard. It fights for the coin and it will fight for the coin until the coin runs out.' });
  M({ id:'archer', n:'Archer', hd:'1d6', ac:14, mv:10, atk:[[ 'Longbow',2 ]], dmg:'1d6',
    xp:2, tr:'-', align:'le',
    desc:'It looses the arrow before you are through the gate. It is good at this. It has done it a hundred times.' });
  M({ id:'knight', n:'Knight', hd:'2d6', ac:17, mv:9, atk:[[ 'Longsword',2 ]], dmg:'1d10',
    xp:15, tr:'d', align:'lg',
    desc:'Plate and a lance and a name it will not give you. It fights with the skill of a man who has been paid to be good at it.' });
  M({ id:'bandit', n:'Bandit', hd:'1d6', ac:13, mv:10, atk:[[ 'Shortsword',1 ]], dmg:'1d8',
    xp:2, tr:'d', align:'ce',
    desc:'It took the road and it took the toll and it is holding a knife and it is not as brave as it looks, but it is enough.' });
  M({ id:'assassin', n:'Assassin', hd:'2d6', ac:14, mv:11, atk:[[ 'Dagger',2 ]], dmg:'1d6',
    sp:{ poison:{ lvl:3 } }, xp:25, tr:'d', align:'ce',
    desc:'It was in the room before you lit the lamp. It is in the wall now. The knife is already wet.' });
  M({ id:'cultist', n:'Cultist', hd:'1d6', ac:13, mv:10, atk:[[ 'Sickle',0 ]], dmg:'1d6',
    sp:{ darkmagic:true }, xp:5, tr:'d', align:'ne',
    desc:'It wears a hood the colour of the inside of a grave and it is chanting a name that is not a name. It does not blink.' });
  M({ id:'human priest', n:'Priest (Human)', hd:'2d6', ac:14, mv:10, atk:[[ 'Mace',1 ]], dmg:'1d6',
    sp:{ magic:true }, xp:15, tr:'d', align:'le',
    desc:'It has a mace and a book and a fire that does not smoke. It will bless the blade that kills you and it will mean it.' });
  M({ id:'human wizard', n:'Wizard (Human)', hd:'3d6', ac:13, mv:10, atk:[[ 'Staff',2 ]], dmg:'1d6',
    sp:{ magic:true }, xp:40, tr:'e', align:'ne',
    desc:'It has read the book that was not meant to be read and it is holding a staff and the air around it is doing a thing it should not do.' });
  M({ id:'human thief', n:'Thief (Human)', hd:'1d6', ac:13, mv:11, atk:[[ 'Dagger',1 ]], dmg:'1d6',
    xp:5, tr:'d', align:'ce',
    desc:'It is in your pack and it is in your purse and it is already three doors ahead of you. The lock will not remember it.' });
  M({ id:'shaman', n:'Shaman', hd:'2d6', ac:13, mv:10, atk:[[ 'Spear',1 ]], dmg:'1d6',
    sp:{ magic:true }, xp:15, tr:'d', align:'ne',
    desc:'It wears the bones of the things it has been and it is singing to the ones it has not been yet. The wind is listening.' });
  M({ id:'crone hag', n:'Crone Hag', hd:'5d6', ac:14, mv:9, atk:[[ 'Claws',3 ]], dmg:'1d8',
    sp:{ disguise:true, magic:true }, xp:90, tr:'e', align:'ce',
    desc:'It wears an old woman\u2019s face and a child\u2019s voice and it is always, always bargaining. It has been doing this since before the road had a name.' });
  M({ id:'green hag', n:'Green Hag', hd:'5d6', ac:14, mv:9, atk:[[ 'Claws',3 ]], dmg:'1d8',
    sp:{ magic:true, poison:{ lvl:4 } }, xp:90, tr:'e', align:'ce',
    desc:'It lives in the fen and it is green as the water and it is holding a jar of something that is not quite a face. It is smiling with all of them.' });
  M({ id:'doppelganger', n:'Doppelganger', hd:'3d6', ac:14, mv:10, atk:[[ 'Claws',2 ]], dmg:'1d6',
    sp:{ shapeshift:true }, xp:40, tr:'e', align:'ce',
    desc:'It is your brother. It has been your brother for a month. You are the one that is not real, and it knows you know.' });

  /* ================= UNDEAD ================= */
  M({ id:'zombie', n:'Zombie', hd:'1d6+1', ac:13, mv:7, atk:[[ 'Claws',0 ]], dmg:'1d4',
    turn:1, xp:1, tr:'-', align:'ne',
    desc:'It walks because it was told to walk. It does not stop and it does not think and it is holding a hand that is not its own.' });
  M({ id:'skeleton', n:'Skeleton', hd:'1d6', ac:14, mv:9, atk:[[ 'Sword',0 ]], dmg:'1d6',
    turn:2, xp:2, tr:'d', align:'ne',
    desc:'The bones are strung with old mail and the sword is still in the hand. It does not tire. It does not bleed. It does not stop.' });
  M({ id:'ghoul', n:'Ghoul', hd:'1d6', ac:13, mv:10, atk:[[ 'Claws',1 ]], dmg:'1d4',
    turn:2, sp:{ paralyze:2 }, xp:5, tr:'-', align:'ne',
    desc:'Its touch is a cold that stops the heart and the hands will not open. It is patient. It has been patient for a very long time.' });
  M({ id:'wight', n:'Wight', hd:'2d6', ac:14, mv:10, atk:[[ 'Claws',2 ]], dmg:'1d6',
    turn:3, sp:{ level_drain:1 }, xp:15, tr:'d', align:'ne',
    desc:'A death that walks in the shape of the one it killed. Its touch takes a level and you feel it go, like a room going dark.' });
  M({ id:'wraith', n:'Wraith', hd:'4d6', ac:15, mv:14, atk:[[ 'Touch',4 ]], dmg:'2d6',
    turn:4, sp:{ level_drain:1, incorporeal:true }, xp:60, tr:'e', align:'ne',
    desc:'It is the dark behind the candle and it is reaching for you with a hand that is not there. The level it takes, it keeps.' });
  M({ id:'specter', n:'Specter', hd:'4d6', ac:15, mv:14, atk:[[ 'Touch',4 ]], dmg:'2d6',
    turn:5, sp:{ level_drain:1, incorporeal:true }, xp:60, tr:'e', align:'ne',
    desc:'It is the voice in the wall and the cold on the neck and the hand on the shoulder. It died angry and it is still angry and it is still reaching.' });
  M({ id:'ghost', n:'Ghost', hd:'3d6', ac:15, mv:14, atk:[[ 'Touch',3 ]], dmg:'1d6',
    turn:3, sp:{ level_drain:1, incorporeal:true, fear:{ save:4 } }, xp:40, tr:'d', align:'ne',
    desc:'It is the sound of the door and the face at the window. It died with a word it did not get to say and it is saying it to you now.' });
  M({ id:'shadow', n:'Shadow', hd:'2d6', ac:15, mv:12, atk:[[ 'Touch',2 ]], dmg:'1d6',
    turn:2, sp:{ drain:1, incorporeal:true }, xp:15, tr:'-', align:'ne',
    desc:'It is your shadow that is not your shadow. It is learning your shape and it is getting very good at it.' });
  M({ id:'vampire', n:'Vampire', hd:'6d6', ac:15, mv:12, atk:[[ 'Bite',4 ]], dmg:'1d6',
    turn:6, sp:{ level_drain:1, charm:{ save:4 }, regeneration:2, weakSun:true }, xp:200, tr:'f', align:'ce',
    desc:'It wears your face when it likes you and it is drinking the road dry. The sun is the one thing it does not want to meet.' });
  M({ id:'vampire mummy', n:'Vampire Mummy', hd:'6d6', ac:16, mv:9, atk:[[ 'Claws',4 ]], dmg:'1d8',
    turn:6, sp:{ level_drain:1, regeneration:2, poison:{ lvl:4 } }, xp:200, tr:'f', align:'ce',
    desc:'It is wrapped in the cloth of a king and it is reaching for you with hands that are still wearing rings. The bite is a poison and a promise.' });
  M({ id:'mummy', n:'Mummy', hd:'5d6', ac:16, mv:7, atk:[[ 'Claws',3 ]], dmg:'1d6',
    turn:5, sp:{ level_drain:1, poison:{ lvl:4 } }, xp:120, tr:'f', align:'ne',
    desc:'It is wrapped in the old cloth and it is holding the old sceptre. The disease it gives is a slow one. You will be a mummy by the time it is done.' });
  M({ id:'lich', n:'Lich', hd:'9d6', ac:17, mv:10, atk:[[ 'Touch',6 ]], dmg:'3d6',
    turn:8, sp:{ level_drain:2, magic:true, incorporeal:false }, xp:800, tr:'f', align:'ce',
    desc:'It did not die. It arranged the dying very carefully and it kept the important parts. It has been dead for two hundred years and it is just getting started.' });
  M({ id:'reaper', n:'Reaper', hd:'7d6', ac:17, mv:12, atk:[[ 'Scythe',6 ]], dmg:'3d6',
    turn:7, sp:{ level_drain:1 }, xp:400, tr:'f', align:'ne',
    desc:'It is the dark at the end of the field and it is holding a scythe and it is very, very patient. It does not hurry. It has already decided.' });
  M({ id:'wisp', n:'Wisp', hd:'1d6', ac:15, mv:14, atk:[[ 'Touch',0 ]], dmg:'1d4',
    turn:2, sp:{ incorporeal:true }, xp:5, tr:'-', align:'ne',
    desc:'A blue light in the grave that is not a firefly. It is cold to the touch and it is leading you somewhere.' });
  M({ id:'revenant', n:'Revenant', hd:'5d6', ac:16, mv:11, atk:[[ 'Sword',4 ]], dmg:'2d6',
    turn:5, sp:{ incorporeal:true }, xp:120, tr:'e', align:'ne',
    desc:'It died with a job it did not finish and it is coming back to finish it. You are in the way. It does not hate you. It simply has to get past you.' });
  M({ id:'banshee', n:'Banshee', hd:'4d6', ac:16, mv:14, atk:[[ 'Shriek',3 ]], dmg:'2d6',
    turn:4, sp:{ fear:{ save:4 }, incorporeal:true }, xp:60, tr:'d', align:'ne',
    desc:'Its scream is the sound a house makes when someone in it has died. It is not trying to hurt you. It is just telling you that you are going to.' });

  /* ================= ABERRATIONS ================= */
  M({ id:'beholder', n:'Beholder', hd:'9d6', ac:17, mv:10, fly:true, atk:[[ 'Eye Rays',6 ]], dmg:'4d6',
    sp:{ eyeRays:true }, xp:800, tr:'f', align:'ce',
    desc:'It has one eye that looks and eight that do what they are told. It is floating above the room and it is looking at you with all of them at once.' });
  M({ id:'umber hulk', n:'Umber Hulk', hd:'7d6', ac:16, mv:11, atk:[[ 'Pincers',5 ]], dmg:'3d6',
    sp:{ phase:true }, xp:400, tr:'f', align:'ce',
    desc:'It is a shadow that is a little bit real and it is holding a pincer that is a little bit more. It reaches through the wall and it is in the room now.' });
  M({ id:'mind flayer', n:'Mind Flayer', hd:'6d6', ac:15, mv:10, atk:[[ 'Tentacles',4 ]], dmg:'2d6',
    sp:{ charm:{ save:3 }, magic:true }, xp:180, tr:'f', align:'ce',
    desc:'It reaches into the mind and it takes the thoughts and it keeps them in a jar. The one who is flayed is still in the room. It is in the wall now. It is in the jar.' });
  M({ id:'displacer', n:'Displacer Beast', hd:'5d6', ac:15, mv:12, atk:[[ 'Claws',3 ]], dmg:'2d6',
    sp:{ phase:true }, xp:90, tr:'e', align:'ne',
    desc:'It is not where you saw it. It is never where you saw it. The claws are in the shoulder and the body is still three paces away.' });
  M({ id:'eye of madness', n:'Eye of Madness', hd:'8d6', ac:16, mv:10, fly:true, atk:[[ 'Gaze',5 ]], dmg:'3d6',
    sp:{ charm:{ save:3 } }, xp:400, tr:'f', align:'ce',
    desc:'It is a single eye the size of a cart wheel and it is floating in the dark and it is looking at you and you are looking back and you do not want to stop.' });
  M({ id:'xan', n:'Xan', hd:'6d6', ac:16, mv:11, atk:[[ 'Maw',4 ]], dmg:'2d8',
    sp:{ phase:true }, xp:180, tr:'f', align:'ce',
    desc:'It is a mouth with no body and it is chewing through the door and it is very, very hungry and it has been chewing for a long time.' });
  M({ id:'mimic', n:'Mimic', hd:'5d6', ac:16, mv:8, atk:[[ 'Bite',4 ]], dmg:'2d6',
    sp:{ shapeshift:true, adhesive:true }, xp:90, tr:'e', align:'ne',
    desc:'It is the chest you have been looking for. It is the door you are about to open. It is the bed you are about to get into. It is patient. It has been a chest for a very long time.' });
  M({ id:'ocropus', n:'Ocropus', hd:'4d6', ac:15, mv:12, atk:[[ 'Tentacles',3 ]], dmg:'2d6',
    sp:{ poison:{ lvl:3 } }, xp:60, tr:'d', align:'ce',
    desc:'A crab with a face and a face with a grudge. It is in the cave and it is wearing a dead man\u2019s face and it is very cross about being woken.' });
  M({ id:'pseudodragon', n:'Pseudodragon', hd:'1d6', ac:14, mv:14, fly:true, atk:[[ 'Bite',1 ]], dmg:'1d4',
    sp:{ breath:{ kind:'breath', dmg:'1d6', range:2, save:1 } }, xp:10, tr:'d', align:'lg',
    desc:'It is the size of a cat and it is very, very fond of you. It has been waiting for a master and it has found one and it is showing off.' });
  M({ id:'medusa', n:'Medusa', hd:'7d6', ac:16, mv:10, atk:[[ 'Sword',5 ]], dmg:'2d6',
    sp:{ petrify:{ save:2 } }, xp:300, tr:'f', align:'ce',
    desc:'Do not look at the hair. The hair is doing a thing to the blood and the blood is turning to stone and the sword is just for the ones who are already stone.' });
  M({ id:'galeb ghar', n:'Galeb Ghar', hd:'4d6', ac:16, mv:12, atk:[[ 'Claws',2 ]], dmg:'1d6',
    sp:{ phase:true }, xp:60, tr:'e', align:'ce',
    desc:'It is a stone face that is a little bit alive and it is reaching for you with hands that are a little bit more. It is learning the shape of you.' });
  M({ id:'trilok', n:'Trilok', hd:'5d6', ac:16, mv:11, atk:[[ 'Maw',3 ]], dmg:'2d6',
    sp:{ phase:true }, xp:90, tr:'e', align:'ce',
    desc:'It is a many-mouthed thing of the deep places and it is chewing through the stone and it is very, very hungry and it has been chewing for a very long time.' });

  /* ================= OOZES ================= */
  M({ id:'gelatinous cube', n:'Gelatinous Cube', hd:'2d6', ac:13, mv:8, atk:[[ 'Squeeze',1 ]], dmg:'1d6',
    sp:{ dissolve:true }, xp:10, tr:'-', align:'ne',
    desc:'It is the shape of a cube and the colour of the wall and it is very, very quiet. The man who walked through it is in it now. He is still trying to get out.' });
  M({ id:'ochre jelly', n:'Ochre Jelly', hd:'4d6', ac:14, mv:8, atk:[[ 'Squeeze',3 ]], dmg:'2d6',
    sp:{ dissolve:true }, xp:40, tr:'d', align:'ne',
    desc:'It is a slab of the colour of old honey and it is dissolving the floor and the man on the floor and the difference is getting smaller.' });
  M({ id:'black puddle', n:'Black Puddle', hd:'6d6', ac:15, mv:10, atk:[[ 'Squeeze',5 ]], dmg:'4d6',
    sp:{ dissolve:true }, xp:150, tr:'e', align:'ne',
    desc:'It is a puddle of the colour of a well with no bottom and it is very, very hungry and it is spreading and the floor is getting smaller.' });
  M({ id:'gray ooze', n:'Gray Ooze', hd:'2d6', ac:13, mv:8, atk:[[ 'Squeeze',1 ]], dmg:'1d6',
    sp:{ dissolve:true }, xp:10, tr:'-', align:'ne',
    desc:'It is the colour of old ash and it is very, very patient. It has been a gray ooze for a long time and it is just getting started.' });

  /* ================= ELEMENTALS ================= */
  M({ id:'earth elemental', n:'Earth Elemental', hd:'8d6', ac:16, mv:9, atk:[[ 'Fist',6 ]], dmg:'4d6',
    sp:{ earth:true }, xp:300, tr:'-', align:'ne',
    desc:'It is the hill that is walking and it is holding a boulder the size of a cart and it is not in a hurry and it is already too late.' });
  M({ id:'air elemental', n:'Air Elemental', hd:'6d6', ac:15, mv:16, fly:true, atk:[[ 'Gust',4 ]], dmg:'3d6',
    sp:{ air:true }, xp:150, tr:'-', align:'ne',
    desc:'It is the wind that is a little bit angry and it is reaching for you with a hand that is a little bit more. It is in the room now. It is in your lungs now.' });
  M({ id:'fire elemental', n:'Fire Elemental', hd:'7d6', ac:15, mv:14, atk:[[ 'Flame',5 ]], dmg:'4d6',
    sp:{ fire:true }, xp:200, tr:'-', align:'ne',
    desc:'It is the fire that is a little bit alive and it is very, very hot and it is reaching for you and the air around it is already doing a thing it should not do.' });
  M({ id:'water elemental', n:'Water Elemental', hd:'8d6', ac:15, mv:12, swim:true, atk:[[ 'Flow',5 ]], dmg:'4d6',
    sp:{ water:true }, xp:300, tr:'-', align:'ne',
    desc:'It is the river that is a little bit angry and it is very, very wet and it is reaching for you and the ground is already getting softer.' });
  M({ id:'mephit dust', n:'Dust Mephit', hd:'1d6', ac:14, mv:14, fly:true, atk:[[ 'Dust',0 ]], dmg:'1d4',
    sp:{ dissolve:true }, xp:5, tr:'-', align:'ce',
    desc:'It is a handful of dust that is a little bit alive and it is very, very cross and it is throwing itself at you and the dust is getting into everything.' });
  M({ id:'mephit ice', n:'Ice Mephit', hd:'2d6', ac:14, mv:13, fly:true, atk:[[ 'Frost',1 ]], dmg:'1d6',
    sp:{ breath:{ kind:'cold', dmg:'2d6', range:3, save:1 } }, xp:10, tr:'-', align:'ce',
    desc:'It is a snowflake that is a little bit mean and it is breathing the cold out of itself and the breath is getting into the joints.' });
  M({ id:'mephit fire', n:'Fire Mephit', hd:'2d6', ac:14, mv:14, fly:true, atk:[[ 'Ember',1 ]], dmg:'1d6',
    sp:{ breath:{ kind:'fire', dmg:'2d6', range:3, save:1 } }, xp:10, tr:'-', align:'ce',
    desc:'It is a coal that is a little bit cross and it is breathing the fire out of itself and the air is getting a little bit hot.' });
  M({ id:'mephit steam', n:'Steam Mephit', hd:'2d6', ac:14, mv:13, fly:true, atk:[[ 'Steam',1 ]], dmg:'1d6',
    sp:{ breath:{ kind:'steam', dmg:'2d6', range:3, save:1 } }, xp:10, tr:'-', align:'ce',
    desc:'It is a cloud that is a little bit mean and it is very, very hot and it is spreading and the air is getting a little bit harder to breathe.' });
  M({ id:'mephit shadow', n:'Shadow Mephit', hd:'2d6', ac:15, mv:14, fly:true, atk:[[ 'Shadow',1 ]], dmg:'1d6',
    sp:{ drain:1 }, xp:15, tr:'-', align:'ce',
    desc:'It is the dark behind the candle that is a little bit hungry and it is reaching for you and the light is getting a little bit smaller.' });

  /* ================= FIENDS ================= */
  M({ id:'imp', n:'Imp', hd:'1d6', ac:14, mv:14, fly:true, atk:[[ 'Dart',1 ]], dmg:'1d4',
    sp:{ darkmagic:true }, xp:5, tr:'-', align:'le',
    desc:'It is the size of a cat and it is very, very cross and it is throwing darts and it is laughing and it has been doing this since before the road had a name.' });
  M({ id:'quasit', n:'Quasit', hd:'1d6', ac:14, mv:13, atk:[[ 'Claws',1 ]], dmg:'1d4',
    xp:5, tr:'-', align:'le',
    desc:'It is the shadow in the corner that is a little bit real and it is very, very hungry and it is learning the shape of you.' });
  M({ id:'horned devil', n:'Horned Devil', hd:'3d6', ac:15, mv:14, fly:true, atk:[[ 'Sword',3 ]], dmg:'1d8',
    sp:{ fire:true }, xp:40, tr:'d', align:'le',
    desc:'It is a horned thing of fire and it is holding a sword and it is very, very cross about the terms of the bargain.' });
  M({ id:'barbed devil', n:'Barbed Devil', hd:'4d6', ac:15, mv:12, atk:[[ 'Barbs',4 ]], dmg:'2d6',
    sp:{ fire:true }, xp:60, tr:'d', align:'le',
    desc:'It is covered in barbs and the barbs are a little bit hot and it is very, very patient and it is already three doors ahead of you.' });
  M({ id:'barbazu', n:'Barbazu', hd:'4d6', ac:15, mv:11, atk:[[ 'Claws',4 ]], dmg:'2d6',
    xp:60, tr:'d', align:'ce',
    desc:'It is a demon of the deep places and it is very, very strong and it is holding you and it is not in a hurry and it is already too late.' });
  M({ id:'marilith', n:'Marilith', hd:'8d6', ac:16, mv:12, atk:[[ 'Six Swords',7 ]], dmg:'3d6',
    xp:400, tr:'e', align:'ce',
    desc:'It has six arms and six swords and it is very, very fast and it is already in the room and it is looking at you with a smile it has been saving for a long time.' });
  M({ id:'balor', n:'Balor', hd:'12d6', ac:18, mv:11, fly:true, atk:[[ 'Whip',9 ]], dmg:'5d6',
    sp:{ fire:true, fear:{ save:3 } }, xp:1000, tr:'f', align:'ce',
    desc:'It is the fire that is a little bit personal and it is holding a whip and it is very, very angry and it has been waiting a very long time for someone to be angry enough to fight it.' });
  M({ id:'pit fiend', n:'Pit Fiend', hd:'10d6', ac:18, mv:12, atk:[[ 'Claws',8 ]], dmg:'4d6',
    sp:{ charm:{ save:3 }, magic:true }, xp:800, tr:'f', align:'le',
    desc:'It is the devil that keeps the bargains and it is very, very patient and it is smiling and the terms of the contract are already in your pocket.' });
  M({ id:'archdevil', n:'Archdevil', hd:'14d6', ac:18, mv:12, atk:[[ 'Sword',10 ]], dmg:'5d6',
    sp:{ magic:true, charm:{ save:3 } }, xp:1500, tr:'f', align:'le',
    desc:'It is the devil that is a little bit above the others and it is very, very old and it is holding a sword and it is looking at you with the patience of a thing that has been waiting for two thousand years.' });
  M({ id:'sukkubus', n:'Sukkubus', hd:'6d6', ac:15, mv:12, fly:true, atk:[[ 'Claws',4 ]], dmg:'2d6',
    sp:{ charm:{ save:3 } }, xp:180, tr:'e', align:'ce',
    desc:'It wears your face when it likes you and it is very, very kind and it is already in the room and it is smiling and the door is already locked.' });
  M({ id:'incubus', n:'Incubus', hd:'6d6', ac:15, mv:12, fly:true, atk:[[ 'Claws',4 ]], dmg:'2d6',
    sp:{ charm:{ save:3 } }, xp:180, tr:'e', align:'ce',
    desc:'It is the dream that is a little bit real and it is very, very kind and it is already in the room and it is smiling and the bed is already warm.' });
  M({ id:'horned demon', n:'Horned Demon', hd:'8d6', ac:16, mv:12, atk:[[ 'Claws',7 ]], dmg:'4d6',
    sp:{ fire:true }, xp:400, tr:'e', align:'ce',
    desc:'It is a demon of the fire and it is very, very strong and it is holding you and it is not in a hurry and it is already too late.' });
  M({ id:'nightmare', n:'Nightmare', hd:'7d6', ac:15, mv:16, fly:true, atk:[[ 'Hooves',5 ]], dmg:'3d6',
    sp:{ darkmagic:true }, xp:300, tr:'e', align:'ce',
    desc:'It is a horse of the dark and it is very, very fast and it is already in the room and it is breathing and the air is getting a little bit harder to breathe.' });

  /* ================= CONSTRUCTS ================= */
  M({ id:'golem clay', n:'Clay Golem', hd:'6d6', ac:16, mv:9, atk:[[ 'Fist',5 ]], dmg:'3d6',
    xp:180, tr:'-', align:'nn',
    desc:'It is the clay that is a little bit alive and it is very, very heavy and it is holding you and it is not in a hurry and it is already too late.' });
  M({ id:'golem stone', n:'Stone Golem', hd:'8d6', ac:17, mv:9, atk:[[ 'Fist',6 ]], dmg:'4d6',
    xp:300, tr:'-', align:'nn',
    desc:'It is the stone that is a little bit alive and it is very, very heavy and it is holding you and it is not in a hurry and it is already too late.' });
  M({ id:'golem iron', n:'Iron Golem', hd:'10d6', ac:18, mv:9, atk:[[ 'Fist',8 ]], dmg:'5d6',
    xp:500, tr:'-', align:'nn',
    desc:'It is the iron that is a little bit alive and it is very, very heavy and it is holding you and it is not in a hurry and it is already too late.' });
  M({ id:'golem crystal', n:'Crystal Golem', hd:'7d6', ac:17, mv:10, atk:[[ 'Fist',6 ]], dmg:'4d6',
    sp:{ light:true }, xp:300, tr:'-', align:'nn',
    desc:'It is the crystal that is a little bit alive and it is very, very bright and it is holding you and it is not in a hurry and it is already too late.' });
  M({ id:'gargoyle', n:'Gargoyle', hd:'3d6', ac:16, mv:12, fly:true, atk:[[ 'Claws',2 ]], dmg:'1d6',
    xp:40, tr:'d', align:'ne',
    desc:'It is the stone face on the wall and it is very, very old and it is waking up and it is looking at you with the patience of a thing that has been waiting for a very long time.' });
  M({ id:'living statue', n:'Living Statue', hd:'6d6', ac:17, mv:8, atk:[[ 'Fist',5 ]], dmg:'3d6',
    xp:180, tr:'e', align:'nn',
    desc:'It is the statue in the hall and it is very, very old and it is waking up and it is looking at you with the patience of a thing that has been waiting for a very long time.' });

  /* ================= DRAGONS ================= */
  // chromatic 5 x 3
  M({ id:'black_dragon_y', n:'Black Dragon (Young)', hd:'7d6', ac:16, mv:14, fly:true, atk:[[ 'Bite',5 ]], dmg:'2d6+1d4',
    sp:{ breath:{ kind:'acid', dmg:'4d6', range:4, save:1 } }, xp:300, tr:'f', align:'ce', size:'l',
    desc:'It sleeps in the fen and it is very, very patient and it is holding its breath and the air is getting a little bit harder to breathe.' });
  M({ id:'black_dragon_a', n:'Black Dragon (Adult)', hd:'12d6', ac:17, mv:14, fly:true, atk:[[ 'Bite',8 ]], dmg:'3d6+1d6',
    sp:{ breath:{ kind:'acid', dmg:'8d6', range:5, save:1 } }, xp:800, tr:'f', align:'ce', size:'l',
    desc:'It is the fen that is a little bit alive and it is very, very patient and it is holding its breath and the air is getting a little bit harder to breathe.' });
  M({ id:'black_dragon_x', n:'Black Dragon (Ancient)', hd:'16d6', ac:18, mv:14, fly:true, atk:[[ 'Bite',11 ]], dmg:'4d6+1d8',
    sp:{ breath:{ kind:'acid', dmg:'12d6', range:6, save:1 } }, xp:1500, tr:'f', align:'ce', size:'h',
    desc:'It is the fen that is a little bit old and it is very, very patient and it is holding its breath and the air is getting a little bit harder to breathe.' });
  M({ id:'white_dragon_y', n:'White Dragon (Young)', hd:'6d6', ac:16, mv:14, fly:true, atk:[[ 'Bite',4 ]], dmg:'2d6+1d4',
    sp:{ breath:{ kind:'cold', dmg:'4d6', range:4, save:1 } }, xp:250, tr:'f', align:'ce', size:'l',
    desc:'It sleeps in the snowfield and it is very, very patient and it is holding its breath and the cold is getting a little bit into the joints.' });
  M({ id:'white_dragon_a', n:'White Dragon (Adult)', hd:'11d6', ac:17, mv:14, fly:true, atk:[[ 'Bite',7 ]], dmg:'3d6+1d6',
    sp:{ breath:{ kind:'cold', dmg:'7d6', range:5, save:1 } }, xp:700, tr:'f', align:'ce', size:'l',
    desc:'It is the snowfield that is a little bit alive and it is very, very patient and it is holding its breath and the cold is getting a little bit into the joints.' });
  M({ id:'white_dragon_x', n:'White Dragon (Ancient)', hd:'15d6', ac:18, mv:14, fly:true, atk:[[ 'Bite',10 ]], dmg:'4d6+1d8',
    sp:{ breath:{ kind:'cold', dmg:'11d6', range:6, save:1 } }, xp:1300, tr:'f', align:'ce', size:'h',
    desc:'It is the snowfield that is a little bit old and it is very, very patient and it is holding its breath and the cold is getting a little bit into the joints.' });
  M({ id:'green_dragon_y', n:'Green Dragon (Young)', hd:'7d6', ac:16, mv:13, fly:true, atk:[[ 'Bite',5 ]], dmg:'2d6+1d4',
    sp:{ breath:{ kind:'poison', dmg:'4d6', range:4, save:1 } }, xp:300, tr:'f', align:'ce', size:'l',
    desc:'It lives in the forest and it is very, very patient and it is holding its breath and the air is getting a little bit harder to breathe.' });
  M({ id:'green_dragon_a', n:'Green Dragon (Adult)', hd:'12d6', ac:17, mv:13, fly:true, atk:[[ 'Bite',8 ]], dmg:'3d6+1d6',
    sp:{ breath:{ kind:'poison', dmg:'8d6', range:5, save:1 } }, xp:800, tr:'f', align:'ce', size:'l',
    desc:'It is the forest that is a little bit alive and it is very, very patient and it is holding its breath and the air is getting a little bit harder to breathe.' });
  M({ id:'green_dragon_x', n:'Green Dragon (Ancient)', hd:'16d6', ac:18, mv:13, fly:true, atk:[[ 'Bite',11 ]], dmg:'4d6+1d8',
    sp:{ breath:{ kind:'poison', dmg:'12d6', range:6, save:1 } }, xp:1500, tr:'f', align:'ce', size:'h',
    desc:'It is the forest that is a little bit old and it is very, very patient and it is holding its breath and the air is getting a little bit harder to breathe.' });
  M({ id:'red_dragon_y', n:'Red Dragon (Young)', hd:'8d6', ac:17, mv:14, fly:true, atk:[[ 'Bite',6 ]], dmg:'2d6+1d4',
    sp:{ breath:{ kind:'fire', dmg:'5d6', range:4, save:1 } }, xp:400, tr:'f', align:'ce', size:'l',
    desc:'It sleeps in the mountain and it is very, very patient and it is holding its breath and the air is getting a little bit hot.' });
  M({ id:'red_dragon_a', n:'Red Dragon (Adult)', hd:'13d6', ac:18, mv:14, fly:true, atk:[[ 'Bite',9 ]], dmg:'3d6+1d6',
    sp:{ breath:{ kind:'fire', dmg:'9d6', range:5, save:1 } }, xp:1000, tr:'f', align:'ce', size:'l',
    desc:'It is the mountain that is a little bit alive and it is very, very patient and it is holding its breath and the air is getting a little bit hot.' });
  M({ id:'red_dragon_x', n:'Red Dragon (Ancient)', hd:'18d6', ac:19, mv:14, fly:true, atk:[[ 'Bite',12 ]], dmg:'4d6+1d8',
    sp:{ breath:{ kind:'fire', dmg:'14d6', range:6, save:1 } }, xp:2000, tr:'f', align:'ce', size:'h',
    desc:'It is the mountain that is a little bit old and it is very, very patient and it is holding its breath and the air is getting a little bit hot.' });
  M({ id:'blue_dragon_y', n:'Blue Dragon (Young)', hd:'7d6', ac:16, mv:14, fly:true, atk:[[ 'Bite',5 ]], dmg:'2d6+1d4',
    sp:{ breath:{ kind:'lightning', dmg:'4d6', range:4, save:1 } }, xp:300, tr:'f', align:'ce', size:'l',
    desc:'It lives in the desert and it is very, very patient and it is holding its breath and the air is getting a little bit charged.' });
  M({ id:'blue_dragon_a', n:'Blue Dragon (Adult)', hd:'12d6', ac:17, mv:14, fly:true, atk:[[ 'Bite',8 ]], dmg:'3d6+1d6',
    sp:{ breath:{ kind:'lightning', dmg:'8d6', range:5, save:1 } }, xp:800, tr:'f', align:'ce', size:'l',
    desc:'It is the desert that is a little bit alive and it is very, very patient and it is holding its breath and the air is getting a little bit charged.' });
  M({ id:'blue_dragon_x', n:'Blue Dragon (Ancient)', hd:'16d6', ac:18, mv:14, fly:true, atk:[[ 'Bite',11 ]], dmg:'4d6+1d8',
    sp:{ breath:{ kind:'lightning', dmg:'12d6', range:6, save:1 } }, xp:1500, tr:'f', align:'ce', size:'h',
    desc:'It is the desert that is a little bit old and it is very, very patient and it is holding its breath and the air is getting a little bit charged.' });
  // metallic 5 x 3
  M({ id:'copper_dragon_y', n:'Copper Dragon (Young)', hd:'6d6', ac:16, mv:13, fly:true, atk:[[ 'Bite',4 ]], dmg:'2d6+1d4',
    sp:{ breath:{ kind:'acid', dmg:'3d6', range:4, save:1 } }, xp:250, tr:'f', align:'ce', size:'l',
    desc:'It is the copper in the rock and it is very, very patient and it is holding its breath and the air is getting a little bit sour.' });
  M({ id:'copper_dragon_a', n:'Copper Dragon (Adult)', hd:'11d6', ac:17, mv:13, fly:true, atk:[[ 'Bite',7 ]], dmg:'3d6+1d6',
    sp:{ breath:{ kind:'acid', dmg:'6d6', range:5, save:1 } }, xp:700, tr:'f', align:'ce', size:'l',
    desc:'It is the copper in the rock and it is very, very patient and it is holding its breath and the air is getting a little bit sour.' });
  M({ id:'copper_dragon_x', n:'Copper Dragon (Ancient)', hd:'15d6', ac:18, mv:13, fly:true, atk:[[ 'Bite',10 ]], dmg:'4d6+1d8',
    sp:{ breath:{ kind:'acid', dmg:'10d6', range:6, save:1 } }, xp:1300, tr:'f', align:'ce', size:'h',
    desc:'It is the copper in the rock and it is very, very old and it is holding its breath and the air is getting a little bit sour.' });
  M({ id:'brass_dragon_y', n:'Brass Dragon (Young)', hd:'6d6', ac:15, mv:13, fly:true, atk:[[ 'Bite',4 ]], dmg:'2d6+1d4',
    sp:{ breath:{ kind:'fire', dmg:'3d6', range:4, save:1 } }, xp:250, tr:'f', align:'ce', size:'l',
    desc:'It is the brass in the bell and it is very, very patient and it is holding its breath and the air is getting a little bit warm.' });
  M({ id:'brass_dragon_a', n:'Brass Dragon (Adult)', hd:'11d6', ac:16, mv:13, fly:true, atk:[[ 'Bite',7 ]], dmg:'3d6+1d6',
    sp:{ breath:{ kind:'fire', dmg:'6d6', range:5, save:1 } }, xp:700, tr:'f', align:'ce', size:'l',
    desc:'It is the brass in the bell and it is very, very patient and it is holding its breath and the air is getting a little bit warm.' });
  M({ id:'brass_dragon_x', n:'Brass Dragon (Ancient)', hd:'15d6', ac:17, mv:13, fly:true, atk:[[ 'Bite',10 ]], dmg:'4d6+1d8',
    sp:{ breath:{ kind:'fire', dmg:'10d6', range:6, save:1 } }, xp:1300, tr:'f', align:'ce', size:'h',
    desc:'It is the brass in the bell and it is very, very old and it is holding its breath and the air is getting a little bit warm.' });
  M({ id:'bronze_dragon_y', n:'Bronze Dragon (Young)', hd:'7d6', ac:16, mv:14, fly:true, atk:[[ 'Bite',5 ]], dmg:'2d6+1d4',
    sp:{ breath:{ kind:'lightning', dmg:'4d6', range:4, save:1 } }, xp:300, tr:'f', align:'ce', size:'l',
    desc:'It is the bronze in the statue and it is very, very patient and it is holding its breath and the air is getting a little bit charged.' });
  M({ id:'bronze_dragon_a', n:'Bronze Dragon (Adult)', hd:'12d6', ac:17, mv:14, fly:true, atk:[[ 'Bite',8 ]], dmg:'3d6+1d6',
    sp:{ breath:{ kind:'lightning', dmg:'8d6', range:5, save:1 } }, xp:800, tr:'f', align:'ce', size:'l',
    desc:'It is the bronze in the statue and it is very, very patient and it is holding its breath and the air is getting a little bit charged.' });
  M({ id:'bronze_dragon_x', n:'Bronze Dragon (Ancient)', hd:'16d6', ac:18, mv:14, fly:true, atk:[[ 'Bite',11 ]], dmg:'4d6+1d8',
    sp:{ breath:{ kind:'lightning', dmg:'12d6', range:6, save:1 } }, xp:1500, tr:'f', align:'ce', size:'h',
    desc:'It is the bronze in the statue and it is very, very old and it is holding its breath and the air is getting a little bit charged.' });
  M({ id:'silver_dragon_y', n:'Silver Dragon (Young)', hd:'7d6', ac:16, mv:14, fly:true, atk:[[ 'Bite',5 ]], dmg:'2d6+1d4',
    sp:{ breath:{ kind:'cold', dmg:'4d6', range:4, save:1 } }, xp:300, tr:'f', align:'lg', size:'l',
    desc:'It is the silver in the moon and it is very, very patient and it is holding its breath and the cold is getting a little bit into the joints.' });
  M({ id:'silver_dragon_a', n:'Silver Dragon (Adult)', hd:'12d6', ac:17, mv:14, fly:true, atk:[[ 'Bite',8 ]], dmg:'3d6+1d6',
    sp:{ breath:{ kind:'cold', dmg:'8d6', range:5, save:1 } }, xp:800, tr:'f', align:'lg', size:'l',
    desc:'It is the silver in the moon and it is very, very patient and it is holding its breath and the cold is getting a little bit into the joints.' });
  M({ id:'silver_dragon_x', n:'Silver Dragon (Ancient)', hd:'16d6', ac:18, mv:14, fly:true, atk:[[ 'Bite',11 ]], dmg:'4d6+1d8',
    sp:{ breath:{ kind:'cold', dmg:'12d6', range:6, save:1 } }, xp:1500, tr:'f', align:'lg', size:'h',
    desc:'It is the silver in the moon and it is very, very old and it is holding its breath and the cold is getting a little bit into the joints.' });
  M({ id:'gold_dragon_y', n:'Gold Dragon (Young)', hd:'8d6', ac:17, mv:14, fly:true, atk:[[ 'Bite',6 ]], dmg:'2d6+1d4',
    sp:{ breath:{ kind:'fire', dmg:'5d6', range:4, save:1 } }, xp:400, tr:'f', align:'lg', size:'l',
    desc:'It is the gold in the sun and it is very, very patient and it is holding its breath and the air is getting a little bit warm.' });
  M({ id:'gold_dragon_a', n:'Gold Dragon (Adult)', hd:'13d6', ac:18, mv:14, fly:true, atk:[[ 'Bite',9 ]], dmg:'3d6+1d6',
    sp:{ breath:{ kind:'fire', dmg:'9d6', range:5, save:1 } }, xp:1000, tr:'f', align:'lg', size:'l',
    desc:'It is the gold in the sun and it is very, very patient and it is holding its breath and the air is getting a little bit warm.' });
  M({ id:'gold_dragon_x', n:'Gold Dragon (Ancient)', hd:'18d6', ac:19, mv:14, fly:true, atk:[[ 'Bite',12 ]], dmg:'4d6+1d8',
    sp:{ breath:{ kind:'fire', dmg:'14d6', range:6, save:1 } }, xp:2000, tr:'f', align:'lg', size:'h',
    desc:'It is the gold in the sun and it is very, very old and it is holding its breath and the air is getting a little bit warm.' });

  /* ================= MISC ================= */
  M({ id:'pixie', n:'Pixie', hd:'1d4', ac:14, mv:16, fly:true, atk:[[ 'Nip',-1 ]], dmg:'1',
    xp:1, tr:'-', align:'cn', size:'s',
    desc:'It is the light in the dark that is a little bit mischievous and it is very, very small and it is laughing and it is already three doors ahead of you.' });
  M({ id:'sprite', n:'Sprite', hd:'1d6', ac:15, mv:16, fly:true, atk:[[ 'Dart',0 ]], dmg:'1d4',
    xp:5, tr:'-', align:'cn', size:'s',
    desc:'It is the light in the dark that is a little bit kind and it is very, very small and it is watching you and it is deciding whether you are worth helping.' });

  /* ================= WAVE 2: more beasts ================= */
  M({ id:'ape', n:'Ape', hd:'1d6', ac:12, mv:11, atk:[['Claws',0]], dmg:'1d6',
    xp:2, tr:'-',
    desc:'It has watched the campfire for two nights and decided you are food. It comes down the tree with a branch it has already chosen.' });
  M({ id:'gorilla', n:'Gorilla', hd:'3d6', ac:12, mv:10, atk:[['Claws',2]], dmg:'2d6',
    xp:20, tr:'-',
    desc:'One chest-beat is the only warning. The branch is splitting where it lands, and it is coming down with both arms full.' });
  M({ id:'chimpanzee', n:'Chimpanzee', hd:'1d4', ac:12, mv:12, atk:[['Claws',-1]], dmg:'1d4',
    xp:1, tr:'-',
    desc:'Small, quick, and far too clever for its size. It has your torch and it is enjoying the lesson it is about to teach you.' });
  M({ id:'baboon', n:'Baboon', hd:'1d6', ac:12, mv:12, atk:[['Jaws',0]], dmg:'1d6',
    xp:2, tr:'-',
    desc:'It barks, it throws stones, and it is never alone. The whole troop is watching, and they all want a share of whatever you drop.' });
  M({ id:'jackal', n:'Jackal', hd:'1d4', ac:12, mv:13, atk:[['Bite',-1]], dmg:'1d4',
    xp:1, tr:'-',
    desc:'It keeps its distance and waits for the hunters to tire. It is patient the way scavengers are patient, and it will not leave until the field is clean.' });
  M({ id:'camel', n:'Camel', hd:'2d6', ac:13, mv:10, atk:[['Hooves',1]], dmg:'1d8',
    xp:5, tr:'-',
    desc:'It carries the water, the salt, and a grudge. It will spit, it will kick, and it will remember the hand that struck it for years.' });
  M({ id:'warhorse', n:'Warhorse', hd:'2d6', ac:13, mv:14, atk:[['Hooves',1]], dmg:'1d8',
    xp:5, tr:'-',
    desc:'Bred for the charge and shod for the charge. It knows the smell of the field, and it is brave the way a thing is brave when it has been taught to be.' });
  M({ id:'mule', n:'Mule', hd:'2d6', ac:13, mv:10, atk:[['Hooves',1]], dmg:'1d8',
    xp:5, tr:'-',
    desc:'It will carry the load every mile and then stop at the stream. It is small, stubborn, and absolutely correct about every decision it makes.' });
  M({ id:'donkey', n:'Donkey', hd:'1d6', ac:13, mv:10, atk:[['Hooves',0]], dmg:'1d6',
    xp:2, tr:'-',
    desc:'It brays at the dark, and it is not wrong. Once it has decided where it is standing, moving it is a negotiation it always wins.' });
  M({ id:'elephant', n:'Elephant', hd:'8d6', ac:14, mv:8, atk:[['Trunk',5]], dmg:'4d6',
    xp:300, tr:'d', size:'l',
    desc:'It does not see you as a threat. It sees you as a small thing in the way, and it is already turning, and the ground is already shaking.' });
  M({ id:'hippopotamus', n:'Hippopotamus', hd:'8d6', ac:14, mv:9, swim:true, atk:[['Jaws',5]], dmg:'4d6',
    xp:300, tr:'d', size:'l',
    desc:'Asleep in the water, the size of a rowboat, its ears already turning toward you. The water is already moving, and it is about to open its mouth.' });
  M({ id:'rhinoceros', n:'Rhinoceros', hd:'7d6', ac:14, mv:12, atk:[['Horn',5]], dmg:'3d6',
    xp:250, tr:'d', size:'l',
    desc:'It does not stop and it does not see. It simply comes, and by the time the warning reaches you the horn is already where the horse used to be.' });
  M({ id:'bison', n:'Bison', hd:'6d6', ac:13, mv:12, atk:[['Horns',4]], dmg:'2d8',
    xp:150, tr:'-', size:'l',
    desc:'It moves through the grass like a weather event, and the herd behind it is the same. The ground is giving under all of them, and the field is going empty.' });
  M({ id:'moose', n:'Moose', hd:'5d6', ac:13, mv:12, atk:[['Antlers',4]], dmg:'2d8',
    xp:90, tr:'-', size:'l',
    desc:'It stands in the shallows with the antlers spread. It is not aggressive; it is simply there, and it is very, very large, and it is watching the boat.' });
  M({ id:'elk', n:'Elk', hd:'3d6', ac:13, mv:14, atk:[['Horns',2]], dmg:'1d8',
    xp:40, tr:'-',
    desc:'It runs with the herd and it does not stop for the fence, the road, or you. By the time you are on your feet it is already a shape at the tree line.' });
  M({ id:'deer', n:'Deer', hd:'1d6', ac:13, mv:14, atk:[['Horns',0]], dmg:'1d4',
    xp:2, tr:'-',
    desc:'It stands in the clearing and decides. Its legs are already coiled, and you are already too slow, and the clearing is already empty.' });
  M({ id:'rabbit', n:'Rabbit', hd:'1d4', ac:13, mv:13, atk:[['Teeth',-2]], dmg:'1',
    xp:1, tr:'-', size:'s',
    desc:'It does not fight. It runs. It is already gone, the hole in the fence is already closing, and it is laughing about it in the way rabbits laugh.' });
  M({ id:'squirrel', n:'Squirrel', hd:'1d4', ac:13, mv:13, atk:[['Teeth',-2]], dmg:'1',
    xp:1, tr:'-', size:'s',
    desc:'It buried the acorn and forgot where, and it is furious about it, and it is furious at you for looking. It will bite your finger to prove a point.' });
  M({ id:'giant squirrel', n:'Giant Squirrel', hd:'1d6', ac:13, mv:14, atk:[['Teeth',0]], dmg:'1d6',
    xp:3, tr:'-',
    desc:'The size of a cat and very, very angry. It has guarded the same tree for a season, and the tree is bare, and it blames you for everything.' });
  M({ id:'raccoon', n:'Raccoon', hd:'1d4', ac:12, mv:11, atk:[['Claws',-1]], dmg:'1d4',
    xp:1, tr:'-',
    desc:'It has opened the bin and the pot and it is already in your sleeve. It is not coming out, it has the ring, and it considers the room its own.' });
  M({ id:'otter', n:'Otter', hd:'1d4', ac:13, mv:12, swim:true, atk:[['Claws',-1]], dmg:'1d4',
    xp:1, tr:'-',
    desc:'It plays in the shallows, steals the fish, and is already holding the hook. It laughs the way a thing laughs when it has already won.' });
  M({ id:'beaver', n:'Beaver', hd:'1d4', ac:13, mv:10, swim:true, atk:[['Teeth',-1]], dmg:'1d4',
    xp:1, tr:'-',
    desc:'It has dammed the stream and moved the house, and it is already chewing the post. The house is leaning, and it is not finished yet.' });
  M({ id:'badger', n:'Badger', hd:'1d6', ac:13, mv:10, atk:[['Claws',0]], dmg:'1d6',
    xp:2, tr:'-',
    desc:'It does not like being moved or being looked at. It is already under the fence, the hole is already bigger, and it is ready to show you why.' });
  M({ id:'giant weasel', n:'Giant Weasel', hd:'1d6', ac:13, mv:13, atk:[['Bite',1]], dmg:'1d6',
    xp:3, tr:'-',
    desc:'Quick, mean, and never alone. They come out of the burrow in a line, the line is at your boot, and your boot is already going.' });
  M({ id:'giant mouse', n:'Giant Mouse', hd:'1d4', ac:13, mv:12, atk:[['Bite',-1]], dmg:'1d4',
    xp:1, tr:'-',
    desc:'It ate the letter and the seal, and it is already in your sleeve with the coin. It looks at you like it owns the room, and it may be right.' });
  M({ id:'giant mole', n:'Giant Mole', hd:'2d6', ac:13, mv:10, atk:[['Claws',1]], dmg:'1d8',
    xp:10, tr:'-',
    desc:'It is under the floor, under the wall, and already through the foundation. The dust is falling, the house is leaning, and it is not done.' });
  M({ id:'ferret', n:'Ferret', hd:'1d4', ac:13, mv:13, atk:[['Bite',-2]], dmg:'1',
    xp:1, tr:'-', size:'s',
    desc:'It is in the wall, in the pipe, and already behind the door. It has the buckle, it is not coming out, and it is laughing.' });
  M({ id:'shrew', n:'Shrew', hd:'1d4', ac:13, mv:12, atk:[['Bite',-2]], dmg:'1',
    xp:1, tr:'-', size:'s',
    desc:'Very small, very hungry, and it eats more than it weighs. It is already under the door, and it is already chewing the strap.' });
  M({ id:'lemur', n:'Lemur', hd:'1d4', ac:13, mv:12, atk:[['Claws',-1]], dmg:'1d4',
    xp:1, tr:'-',
    desc:'It watches from the branch with an eye that is not unkind. It has the pouch, it is moving to the next branch, and the pouch is already empty.' });
  M({ id:'sloth', n:'Sloth', hd:'1d6', ac:12, mv:4, atk:[['Claws',0]], dmg:'1d4',
    xp:2, tr:'-',
    desc:'It is in the tree, holding the branch, thinking about the thing it was going to do. It will do it. Not today. The branch is splitting.' });
  M({ id:'porcupine', n:'Porcupine', hd:'1d6', ac:14, mv:8, atk:[['Quills',0]], dmg:'1d4',
    xp:2, tr:'-',
    desc:'It does not run. It turns, the quills are where your hand was, your hand is going, and it is not finished and it is not going to be sorry.' });
  M({ id:'giant echidna', n:'Giant Echidna', hd:'2d6', ac:14, mv:9, atk:[['Snout',1]], dmg:'1d8',
    xp:10, tr:'-',
    desc:'Covered in spines and very, very angry. The spines are where your boot was, your boot is going, and it is not finished.' });
  M({ id:'platypus', n:'Platypus', hd:'1d4', ac:13, mv:10, swim:true, atk:[['Bill',-1]], dmg:'1d4',
    xp:1, tr:'-',
    desc:'In the water with the duckbill and the webbed foot and the poison spur. It is turning, the water is moving, and it is deciding what you are for.' });
  M({ id:'kangaroo', n:'Kangaroo', hd:'2d6', ac:13, mv:14, atk:[['Kick',1]], dmg:'1d8',
    xp:10, tr:'-',
    desc:'It hops with a momentum that is not small. The kick is where your leg was, your leg is going, and it is not finished and it is not going to stop.' });
  M({ id:'gibbon', n:'Gibbon', hd:'1d4', ac:13, mv:13, atk:[['Claws',-1]], dmg:'1d4',
    xp:1, tr:'-',
    desc:'It swings with a silence that is not natural. It is already above the branch, it is watching, it has the fruit, and it is not sharing.' });
  M({ id:'orangutan', n:'Orangutan', hd:'2d6', ac:12, mv:10, atk:[['Claws',1]], dmg:'1d6',
    xp:10, tr:'-',
    desc:'It sits in the canopy and thinks. It has the vine, it is swinging, the branch is gone, and it is already above you.' });
  M({ id:'capuchin', n:'Capuchin', hd:'1d4', ac:13, mv:12, atk:[['Claws',-1]], dmg:'1d4',
    xp:1, tr:'-',
    desc:'Very small, very quick, and it has the nutcracker. It is opening the shell, watching you, and deciding whether you are useful.' });
  M({ id:'howler monkey', n:'Howler Monkey', hd:'1d6', ac:13, mv:12, atk:[['Claws',0]], dmg:'1d4',
    xp:2, tr:'-',
    desc:'It howls from the high branch and the sound goes through the chest. It is not aggressive; it is simply announcing, and the announcement is in the walls.' });
  M({ id:'spider monkey', n:'Spider Monkey', hd:'1d4', ac:13, mv:13, atk:[['Claws',-1]], dmg:'1d4',
    xp:1, tr:'-',
    desc:'It hangs by the tail and watches with four eyes. It is moving, the branch is bare, it is gone, and it has the seed.' });

  /* ================= WAVE 2: more humanoids ================= */
  M({ id:'gnoll warhound', n:'Gnoll Warhound', hd:'2d6', ac:13, mv:14, atk:[['Bite',1]], dmg:'1d8',
    xp:15, tr:'-',
    desc:'Bred for the hunt, it runs in a pack and does not stop when the others fall. The howl is in the trees, and the trees are running.' });
  M({ id:'sahuagin shaman', n:'Sahuagin Shaman', hd:'3d6', ac:14, mv:11, swim:true, atk:[['Spear',2]], dmg:'1d8',
    sp:{ magic:true }, xp:40, tr:'d', align:'ce',
    desc:'It wears the shark-tooth crown and sings to the deep. The deep is answering, the water is moving, and the boats are listing.' });
  M({ id:'drow priestess', n:'Drow Priestess', hd:'3d6', ac:15, mv:10, atk:[['Sword',3]], dmg:'1d8',
    sp:{ magic:true, darkvision:true }, xp:60, tr:'e', align:'le',
    desc:'She carries the spider\u2019s icon and has read the book that was not meant to be read. The air around her is doing a thing, and the dark is listening.' });
  M({ id:'drow assassin', n:'Drow Assassin', hd:'3d6', ac:15, mv:11, atk:[['Dagger',3]], dmg:'1d6',
    sp:{ poison:{ lvl:4 } }, xp:60, tr:'e', align:'le',
    desc:'She was in the room before the lamp was lit and she is in the wall now. The knife is already wet, and the name is already spoken.' });
  M({ id:'half troll', n:'Half-Troll', hd:'4d6', ac:14, mv:11, atk:[['Clubs',3]], dmg:'2d6',
    sp:{ regen:2 }, xp:90, tr:'d', align:'ce',
    desc:'It has the troll\u2019s healing and the man\u2019s grudge. The healing is the worse of the two, and the club is coming, and the shoulder is going.' });
  M({ id:'ogre shaman', n:'Ogre Shaman', hd:'4d6', ac:14, mv:10, atk:[['Club',3]], dmg:'2d6',
    sp:{ magic:true }, xp:60, tr:'d', align:'ce',
    desc:'It wears the bones of the things it has been and sings to the ones it is becoming. The wind is listening, the storm is turning, and the field is paying attention.' });
  M({ id:'troll warlord', n:'Troll Warlord', hd:'6d6', ac:15, mv:11, atk:[['Claws',5]], dmg:'2d8',
    sp:{ regen:5, fireWeak:true }, xp:200, tr:'e', align:'ce',
    desc:'It carries the scar from the fire and remembers the fire. It wears the helm of the one it killed, the helm is too small, and the axe is coming.' });
  M({ id:'bugbear chief', n:'Bugbear Chief', hd:'3d8', ac:14, mv:11, atk:[['Clubs',3]], dmg:'2d8',
    sp:{ surprise:1 }, xp:40, tr:'d', align:'ce',
    desc:'The biggest of the big ones, holding both clubs and laughing. The laugh is in the walls, and the door is going.' });
  M({ id:'goblin shaman', n:'Goblin Shaman', hd:'1d6', ac:13, mv:10, atk:[['Spear',0]], dmg:'1d6',
    sp:{ magic:true }, xp:5, tr:'d', align:'ce',
    desc:'It wears the face of the thing it was and sings to the thing it is becoming. The song is in the walls, and the dark is answering.' });
  M({ id:'kobold trapmaker', n:'Kobold Trapmaker', hd:'1d4', ac:12, mv:10, atk:[['Dart',-1]], dmg:'1d4',
    xp:2, tr:'-', align:'ce',
    desc:'It set the tripwire, oiled the pit, and slipped behind the wall. The wall is moving, the floor is going, and it is laughing.' });
  M({ id:'orc chieftain', n:'Orc Chieftain', hd:'3d8', ac:15, mv:11, atk:[['Greataxe',3]], dmg:'2d10',
    xp:60, tr:'e', align:'ce',
    desc:'It wears the teeth of the ones it killed and holds the axe that took the last of them. The axe is coming, and the shield is going.' });
  M({ id:'hobgoblin captain', n:'Hobgoblin Captain', hd:'2d8', ac:15, mv:11, atk:[['Sword',2]], dmg:'1d10',
    xp:25, tr:'d', align:'le',
    desc:'It keeps the lines and the promises, and it burns the village exactly as it said it would. The standard is turning, and the road is burning.' });
  M({ id:'lizardman shaman', n:'Lizard Man Shaman', hd:'2d6', ac:14, mv:11, atk:[['Spear',1]], dmg:'1d6',
    sp:{ magic:true }, xp:15, tr:'d', align:'ne',
    desc:'It wears the river\u2019s scale and sings to the flood. The flood is answering, the water is rising, and the village is listening.' });
  M({ id:'half giant bruiser', n:'Half-Giant Bruiser', hd:'5d8', ac:14, mv:10, atk:[['Club',4]], dmg:'2d8',
    xp:90, tr:'d', align:'ce',
    desc:'The giant\u2019s height and the man\u2019s club, wearing a helm that does not quite fit. The helm is too small, and the club is coming.' });
  M({ id:'cyclops herder', n:'Cyclops Herder', hd:'6d8', ac:15, mv:10, atk:[['Staff',4]], dmg:'2d8',
    xp:150, tr:'d', align:'ne',
    desc:'It keeps the goats on the crag and throws rocks when they stray. The goats are not straying, the rock is coming, and the field is listening.' });
  M({ id:'stone giant scout', n:'Stone Giant Scout', hd:'9d8', ac:16, mv:10, atk:[['Spear',5]], dmg:'3d6',
    xp:300, tr:'e', align:'ne',
    desc:'It walks the hillside with the patience of stone, looking for the road. The road is found, the spear is turning, and the field is listening.' });
  M({ id:'cloud giant champion', n:'Cloud Giant Champion', hd:'13d8', ac:17, mv:9, atk:[['Greatclub',9]], dmg:'5d8',
    sp:{ breath:{ kind:'any', dmg:'8d6', range:5, save:1 } }, xp:800, tr:'f', align:'ce',
    desc:'It fights for the honour of the hill and throws lightning when the honour is touched. The lightning is coming, and the field is burning.' });
  M({ id:'red giant', n:'Red Giant', hd:'12d8', ac:16, mv:9, atk:[['Greatclub',8]], dmg:'4d8',
    sp:{ breath:{ kind:'fire', dmg:'7d6', range:5, save:1 } }, xp:700, tr:'f', align:'ce',
    desc:'Red as iron, hot as the forge, holding the club that took the anvil. The club is coming, and the anvil is gone.' });
  M({ id:'elder ettin', n:'Ettin (Elder)', hd:'8d8', ac:15, mv:10, atk:[['Clubs',6]], dmg:'2d12',
    xp:300, tr:'f', align:'ce',
    desc:'Two heads, and both of them are listening now. They are agreeing, the clubs are coming, and the field is going.' });
  M({ id:'drow matron', n:'Drow Matron', hd:'4d6', ac:15, mv:10, atk:[['Sword',4]], dmg:'1d10',
    sp:{ magic:true, darkvision:true }, xp:90, tr:'e', align:'le',
    desc:'She keeps the web and the thread, and she is three doors ahead of you. The dark is listening, and the name is spoken.' });

  /* ================= WAVE 2: more undead ================= */
  M({ id:'skeleton warrior', n:'Skeleton Warrior', hd:'2d6', ac:15, mv:9, atk:[['Sword',1]], dmg:'1d8',
    turn:2, xp:10, tr:'d', align:'ne',
    desc:'The bones of the one who held the line, holding the line still. The line is at the gate, and the gate is going.' });
  M({ id:'skeleton captain', n:'Skeleton Captain', hd:'3d6', ac:15, mv:9, atk:[['Sword',2]], dmg:'1d10',
    turn:3, xp:25, tr:'d', align:'ne',
    desc:'It keeps the formation and the standard, and it does not stop when the others fall. The standard is turning, and the line is coming.' });
  M({ id:'zombie brute', n:'Zombie Brute', hd:'3d6', ac:13, mv:7, atk:[['Claws',1]], dmg:'1d8',
    turn:1, xp:10, tr:'-', align:'ne',
    desc:'The big one in the grave, still holding the gate. The gate is going, the shoulder is coming, and it is not finished.' });
  M({ id:'ghast', n:'Ghast', hd:'3d6', ac:14, mv:11, atk:[['Claws',2]], dmg:'1d6',
    turn:3, sp:{ paralyze:2 }, xp:25, tr:'-', align:'ne',
    desc:'A ghoul that has been in the cold too long, faster for it. The touch is on your wrist, and your wrist is going.' });
  M({ id:'lich apprentice', n:'Lich Apprentice', hd:'5d6', ac:16, mv:10, atk:[['Touch',4]], dmg:'2d6',
    turn:6, sp:{ level_drain:1, magic:true }, xp:200, tr:'e', align:'ce',
    desc:'It kept the important parts and is still learning the rest. The rest is learning it back, and the air is doing a thing it should not do.' });
  M({ id:'wight elder', n:'Wight Elder', hd:'3d6', ac:14, mv:10, atk:[['Claws',3]], dmg:'1d8',
    turn:4, sp:{ level_drain:1 }, xp:40, tr:'e', align:'ne',
    desc:'It has taken the levels of the ones who passed and wears the face of the last of them. The face is learning it, and the hand is on the shoulder.' });
  M({ id:'mummy priest', n:'Mummy Priest', hd:'6d6', ac:16, mv:8, atk:[['Sceptre',4]], dmg:'2d6',
    turn:6, sp:{ level_drain:1, poison:{ lvl:4 }, magic:true }, xp:200, tr:'f', align:'ne',
    desc:'It was the keeper of the shrine and is still keeping it. The shrine is answering, and the light is doing a thing it should not do.' });
  M({ id:'wraith lord', n:'Wraith Lord', hd:'5d6', ac:16, mv:14, atk:[['Touch',5]], dmg:'2d8',
    turn:5, sp:{ level_drain:2, incorporeal:true }, xp:120, tr:'f', align:'ce',
    desc:'It was the lord of the keep and is still ruling it. The keep is listening, the door is opening, and the name is spoken.' });
  M({ id:'vampire spawn', n:'Vampire Spawn', hd:'4d6', ac:15, mv:12, atk:[['Bite',3]], dmg:'1d8',
    turn:5, sp:{ level_drain:1, regeneration:2 }, xp:90, tr:'e', align:'ce',
    desc:'Made in the dark, it does not sleep in the dark. It is in the room, the room is listening, and the name is spoken.' });
  M({ id:'revenant knight', n:'Revenant Knight', hd:'6d6', ac:17, mv:11, atk:[['Sword',5]], dmg:'2d8',
    turn:5, sp:{ incorporeal:true }, xp:200, tr:'f', align:'ne',
    desc:'It died with the oath unbroken and is coming back to break it. The sword is turning, the oath is spoken, and the dark is listening.' });

  /* ================= WAVE 2: more reptiles & aquatic ================= */
  M({ id:'giant alligator', n:'Giant Alligator', hd:'6d6', ac:14, mv:10, swim:true, atk:[['Jaws',4]], dmg:'3d8',
    sp:{ constrict:true }, xp:150, tr:'d',
    desc:'It ate the boat and is still under the log. The log is moving, and the water is listening.' });
  M({ id:'giant toad', n:'Giant Toad', hd:'2d6', ac:13, mv:10, atk:[['Jaws',1]], dmg:'1d8',
    xp:15, tr:'-',
    desc:'It sits in the bog and does not move until the heron is close. The heron is in the mouth, and the mouth is closing.' });
  M({ id:'giant snake', n:'Giant Snake', hd:'4d6', ac:14, mv:12, atk:[['Coils',3]], dmg:'2d6',
    sp:{ constrict:true }, xp:60, tr:'d',
    desc:'Long, calm, and unhurried. By the time the legs stop working, it has already decided what it will do next.' });
  M({ id:'drake', n:'Drake', hd:'4d6', ac:15, mv:13, fly:true, atk:[['Bite',3]], dmg:'1d10',
    sp:{ breath:{ kind:'fire', dmg:'3d6', range:3, save:1 } }, xp:60, tr:'d',
    desc:'The dragon\u2019s shape without the dragon\u2019s mind, meaner for it. The breath is coming, and the field is burning.' });
  M({ id:'gorgon', n:'Gorgon', hd:'5d6', ac:15, mv:10, atk:[['Spear',3]], dmg:'1d10',
    sp:{ petrify:{ save:2 } }, xp:90, tr:'e',
    desc:'Do not look at the hair. The hair is doing a thing to the blood, the blood is turning to stone, and the spear is for the ones already stone.' });
  M({ id:'water snake', n:'Water Snake', hd:'1d6', ac:12, mv:12, swim:true, atk:[['Bite',0]], dmg:'1d4',
    sp:{ poison:{ lvl:1 } }, xp:2, tr:'-',
    desc:'It lies in the shallows with its head just under the water\u2019s skin. The leg goes in first. That is how it works.' });
  M({ id:'giant salamander', n:'Giant Salamander', hd:'3d6', ac:14, mv:10, swim:true, atk:[['Jaws',2]], dmg:'1d8',
    xp:40, tr:'d',
    desc:'The size of a dog and very cross about being called a newt. It will show you why, and the jaw is closing.' });
  M({ id:'selkie', n:'Selkie', hd:'2d6', ac:13, mv:10, swim:true, atk:[['Claws',1]], dmg:'1d6',
    sp:{ shapeshift:true }, xp:15, tr:'d', align:'ne',
    desc:'It wears the seal-skin on the shore and the face of the man it liked. The man is in the water, and the water is moving.' });
  M({ id:'drownie', n:'Drownie', hd:'1d6', ac:13, mv:10, swim:true, atk:[['Pull',0]], dmg:'1d4',
    turn:2, sp:{ drown:true }, xp:5, tr:'-', align:'ne',
    desc:'The hand under the boat, the cold on the ankle. It is pulling, the water is moving, and the boat is listing.' });
  M({ id:'bunyip', n:'Bunyip', hd:'4d6', ac:14, mv:11, swim:true, atk:[['Jaws',3]], dmg:'2d6',
    xp:60, tr:'d', align:'ce',
    desc:'The thing in the billabong, the sound under the hut. It is under the boat, the boat is listing, and the water is moving.' });
  M({ id:'narwhal', n:'Narwhal', hd:'8d6', ac:15, mv:12, swim:true, atk:[['Tusk',5]], dmg:'4d6',
    xp:300, tr:'d', size:'l', align:'nn',
    desc:'It does not hate the boat. It simply wants to be somewhere else. The tusk is where the keel was, and the keel is going.' });
  M({ id:'walrus', n:'Walrus', hd:'6d6', ac:14, mv:9, swim:true, atk:[['Tusks',4]], dmg:'3d6',
    xp:150, tr:'-', size:'l',
    desc:'Asleep on the ice, the size of a rowboat, its ear turning toward you. The ice is moving.' });
  M({ id:'giant squid', n:'Giant Squid', hd:'10d6', ac:15, mv:10, swim:true, atk:[['Tentacles',6]], dmg:'4d6',
    sp:{ squeeze:true }, xp:400, tr:'e', size:'l',
    desc:'In the deep, very hungry, and already under the hull. The hull is going, and the water is moving.' });
  M({ id:'giant turtle', n:'Giant Turtle', hd:'7d6', ac:16, mv:6, swim:true, atk:[['Jaws',4]], dmg:'3d6',
    xp:250, tr:'d', size:'l',
    desc:'The size of a rowboat, very old, carrying an island on its back. The island is moving, and the water is listening.' });
  M({ id:'crab giant', n:'Crab Giant', hd:'8d6', ac:16, mv:7, atk:[['Claws',5]], dmg:'4d6',
    xp:300, tr:'e', size:'l',
    desc:'The size of a cart, pinching the shield off the arm and taking a bite out of it. The arm is going, and the shield is gone.' });

  /* ================= WAVE 2: more aberrations ================= */
  M({ id:'young beholder', n:'Young Beholder', hd:'6d6', ac:16, mv:10, fly:true, atk:[['Eye Rays',4]], dmg:'2d6',
    sp:{ eyeRays:true }, xp:300, tr:'e', align:'ce',
    desc:'One eye that looks and six that do what they are told. It is still learning, the rest is learning it back, and the room is listening.' });
  M({ id:'elder mind flayer', n:'Elder Mind Flayer', hd:'8d6', ac:16, mv:10, atk:[['Tentacles',5]], dmg:'2d8',
    sp:{ charm:{ save:3 }, magic:true }, xp:400, tr:'f', align:'ce',
    desc:'It flayed the keep and keeps the thoughts in jars. The jars are full, the keep is empty, and the dark is listening.' });
  M({ id:'elder umber hulk', n:'Elder Umber Hulk', hd:'9d6', ac:17, mv:11, atk:[['Pincers',6]], dmg:'3d8',
    sp:{ phase:true }, xp:600, tr:'f', align:'ce',
    desc:'A shadow a little more real, learning the shape of the keep. The keep is learning it back, and the wall is going.' });
  M({ id:'elder displacer', n:'Elder Displacer', hd:'7d6', ac:16, mv:12, atk:[['Claws',4]], dmg:'2d8',
    sp:{ phase:true }, xp:200, tr:'e', align:'ne',
    desc:'Not where you saw it, never where you saw it. The claws are in the shoulder, the body is three paces away, and the room is listening.' });
  M({ id:'elder ocropus', n:'Elder Ocropus', hd:'5d6', ac:16, mv:12, atk:[['Tentacles',4]], dmg:'2d8',
    sp:{ poison:{ lvl:4 } }, xp:90, tr:'e', align:'ce',
    desc:'Wearing the dead man\u2019s face, very cross about being woken. The face is learning it, and the cave is listening.' });
  M({ id:'greater mimic', n:'Greater Mimic', hd:'6d6', ac:16, mv:8, atk:[['Bite',5]], dmg:'2d8',
    sp:{ shapeshift:true, adhesive:true }, xp:150, tr:'f', align:'ne',
    desc:'The door you are about to open, the bed you are about to get into. It has been a door for a very long time, and it is patient.' });
  M({ id:'nycaloth', n:'Nycaloth', hd:'4d6', ac:15, mv:10, atk:[['Maw',3]], dmg:'2d6',
    sp:{ phase:true }, xp:60, tr:'e', align:'ce',
    desc:'The thing under the floor, chewing through the stone, very hungry, chewing for a long time. The floor is going.' });
  M({ id:'mordyan ghar', n:'Mordyan Ghar', hd:'5d6', ac:16, mv:11, atk:[['Maw',4]], dmg:'2d8',
    sp:{ phase:true }, xp:90, tr:'e', align:'ce',
    desc:'The thing in the wall, learning the shape of you, getting very good at it. The wall is moving, and the room is listening.' });
  M({ id:'noci ghar', n:'Noci Ghar', hd:'3d6', ac:15, mv:12, atk:[['Maw',2]], dmg:'1d8',
    sp:{ phase:true }, xp:40, tr:'d', align:'ce',
    desc:'The small one of the ghars, very quick, already in the room, looking at you with a mouth already open.' });

  /* ================= WAVE 2: more elementals, fiends, constructs ================= */
  M({ id:'greater earth elemental', n:'Earth Elemental (Greater)', hd:'10d6', ac:17, mv:9, atk:[['Fist',7]], dmg:'5d6',
    sp:{ earth:true }, xp:500, tr:'-', align:'ne',
    desc:'The hill that walks, holding the boulder the size of the house. The house is going, and the ground is shaking.' });
  M({ id:'greater fire elemental', n:'Fire Elemental (Greater)', hd:'9d6', ac:16, mv:15, atk:[['Flame',6]], dmg:'5d6',
    sp:{ fire:true }, xp:300, tr:'-', align:'ne',
    desc:'The fire a little personal, very hot, already in the room. The room is burning, and the air is doing a thing it should not do.' });
  M({ id:'greater water elemental', n:'Water Elemental (Greater)', hd:'10d6', ac:16, mv:13, swim:true, atk:[['Flow',6]], dmg:'5d6',
    sp:{ water:true }, xp:500, tr:'-', align:'ne',
    desc:'The river a little angry, very wet, already in the room. The room is going, and the ground is softer.' });
  M({ id:'greater air elemental', n:'Air Elemental (Greater)', hd:'8d6', ac:16, mv:17, fly:true, atk:[['Gust',5]], dmg:'4d6',
    sp:{ air:true }, xp:300, tr:'-', align:'ne',
    desc:'The wind a little personal, already in the room. The room is moving, and the air is doing a thing it should not do.' });
  M({ id:'greater ice mephit', n:'Ice Mephit (Greater)', hd:'3d6', ac:15, mv:14, fly:true, atk:[['Frost',2]], dmg:'1d8',
    sp:{ breath:{ kind:'cold', dmg:'3d6', range:4, save:1 } }, xp:25, tr:'-', align:'ce',
    desc:'The snowflake a little meaner, breathing the cold out of itself. The cold is in the joints, and the joints are going.' });
  M({ id:'greater fire mephit', n:'Fire Mephit (Greater)', hd:'3d6', ac:15, mv:15, fly:true, atk:[['Ember',2]], dmg:'1d8',
    sp:{ breath:{ kind:'fire', dmg:'3d6', range:4, save:1 } }, xp:25, tr:'-', align:'ce',
    desc:'The coal a little crosser, breathing the fire out of itself. The fire is in the air, and the air is hot.' });
  M({ id:'elder quasit', n:'Elder Quasit', hd:'2d6', ac:15, mv:14, atk:[['Claws',2]], dmg:'1d6',
    xp:15, tr:'-', align:'le',
    desc:'The shadow in the corner a little more real, very hungry, learning the shape of the room. The room is learning it back.' });
  M({ id:'elder imp', n:'Elder Imp', hd:'2d6', ac:15, mv:15, fly:true, atk:[['Dart',2]], dmg:'1d6',
    sp:{ darkmagic:true }, xp:15, tr:'-', align:'le',
    desc:'The size of a cat, very cross, throwing darts and laughing. The laugh is in the walls, and the walls are listening.' });
  M({ id:'ice demon', n:'Ice Demon', hd:'6d6', ac:16, mv:12, atk:[['Claws',4]], dmg:'2d6',
    sp:{ cold:true }, xp:180, tr:'e', align:'ce',
    desc:'The cold a little personal, very hungry, already in the room. The room is going, and the joints are cold.' });
  M({ id:'red demon', n:'Red Demon', hd:'7d6', ac:16, mv:13, atk:[['Claws',5]], dmg:'2d8',
    sp:{ fire:true }, xp:250, tr:'e', align:'ce',
    desc:'The fire a little personal, very angry, already in the room. The room is burning, and the air is hot.' });
  M({ id:'shadow demon', n:'Shadow Demon', hd:'6d6', ac:16, mv:14, atk:[['Claws',4]], dmg:'2d6',
    sp:{ drain:2 }, xp:180, tr:'e', align:'ce',
    desc:'The dark behind the candle a little hungry, reaching for you. The light is smaller, and the shadow is learning your shape.' });
  M({ id:'water demon', n:'Water Demon', hd:'6d6', ac:15, mv:12, swim:true, atk:[['Claws',4]], dmg:'2d6',
    sp:{ water:true }, xp:180, tr:'e', align:'ce',
    desc:'The water a little angry, very wet, already in the room. The room is going, and the ground is softer.' });
  M({ id:'greater barbed devil', n:'Barbed Devil (Greater)', hd:'5d6', ac:16, mv:13, atk:[['Barbs',5]], dmg:'2d8',
    sp:{ fire:true }, xp:90, tr:'e', align:'le',
    desc:'Covered in barbs, a little hotter, very patient, three doors ahead of you. The door is locked.' });
  M({ id:'erinyes', n:'Erinyes', hd:'7d6', ac:16, mv:14, fly:true, atk:[['Whip',5]], dmg:'2d6',
    sp:{ fear:{ save:3 } }, xp:250, tr:'e', align:'le',
    desc:'The avenging thing of the dark, holding the whip, very patient. The whip is coming, and the fear is in the chest.' });
  M({ id:'automaton', n:'Automaton', hd:'6d6', ac:17, mv:9, atk:[['Fist',5]], dmg:'3d6',
    xp:180, tr:'e', align:'nn',
    desc:'The machine a little alive, very precise, holding you, not in a hurry. The fist is coming.' });
  M({ id:'wood golem', n:'Wood Golem', hd:'7d6', ac:16, mv:9, atk:[['Branch',5]], dmg:'4d6',
    xp:250, tr:'e', align:'nn',
    desc:'The tree a little alive, very heavy, holding you, not in a hurry. The branch is coming.' });
  M({ id:'flesh golem', n:'Flesh Golem', hd:'8d6', ac:17, mv:10, atk:[['Fist',6]], dmg:'4d6',
    sp:{ regen:5 }, xp:300, tr:'e', align:'ne',
    desc:'The flesh a little alive, very hungry, holding you, not in a hurry. The fist is coming.' });
  M({ id:'blight', n:'Blight', hd:'7d6', ac:15, mv:9, atk:[['Thorn',5]], dmg:'3d6',
    xp:250, tr:'e', align:'ne',
    desc:'The rot a little alive, very patient, spreading through the field. The field is going, and the grain is brown.' });
  M({ id:'strangler vine', n:'Strangler Vine', hd:'4d6', ac:14, mv:6, atk:[['Coils',3]], dmg:'2d6',
    sp:{ constrict:true }, xp:60, tr:'-', align:'ne',
    desc:'The vine a little alive, very patient, already around the leg. The leg is going, and the vine is tighter.' });

  /* ================= WAVE 2: more human & giant ================= */
  M({ id:'bandit chief', n:'Bandit Chief', hd:'2d6', ac:14, mv:10, atk:[['Longsword',2]], dmg:'1d10',
    xp:15, tr:'d', align:'ce',
    desc:'It took the road and the toll, and it is holding the sword. Not as brave as it looks, but enough. The road is paying.' });
  M({ id:'cult leader', n:'Cult Leader', hd:'3d6', ac:14, mv:10, atk:[['Sickle',2]], dmg:'1d6',
    sp:{ darkmagic:true }, xp:40, tr:'e', align:'ne',
    desc:'The hood the colour of the inside of a grave, chanting a name that is not a name. The name is spoken, and the dark is listening.' });
  M({ id:'pirate', n:'Pirate', hd:'1d6', ac:13, mv:11, atk:[['Cutlass',1]], dmg:'1d8',
    xp:5, tr:'d', align:'ce',
    desc:'It took the ship and the ring, and it is holding the cutlass. Not as brave as it looks, but enough. The ship is listing.' });
  M({ id:'duelist', n:'Duelist', hd:'2d6', ac:14, mv:11, atk:[['Rapier',2]], dmg:'1d6',
    xp:15, tr:'d', align:'cn',
    desc:'The name, the blade, very fast. The blade is turning, the name is spoken, and the road is listening.' });
  M({ id:'mercenary', n:'Mercenary', hd:'1d6', ac:14, mv:10, atk:[['Sword',1]], dmg:'1d8',
    xp:5, tr:'-', align:'ne',
    desc:'Fights for the coin and will fight for the coin until it runs out. The coin is in the pouch, and the road is paying.' });
  M({ id:'noble guard', n:'Noble Guard', hd:'2d6', ac:16, mv:10, atk:[['Sword',2]], dmg:'1d10',
    xp:15, tr:'d', align:'lg',
    desc:'The livery, the gate, very good at its job. The sword is turning, and the gate is listening.' });
  M({ id:'frost giant champion', n:'Frost Giant Champion', hd:'12d8', ac:16, mv:9, atk:[['Greatclub',9]], dmg:'5d8',
    sp:{ breath:{ kind:'cold', dmg:'8d6', range:5, save:1 } }, xp:800, tr:'f', align:'ce',
    desc:'Fights for the honour of the ice and throws the cold when the honour is touched. The cold is coming, and the field is frozen.' });
  M({ id:'fire giant champion', n:'Fire Giant Champion', hd:'13d8', ac:17, mv:9, atk:[['Greatclub',9]], dmg:'5d8',
    sp:{ breath:{ kind:'fire', dmg:'8d6', range:5, save:1 } }, xp:800, tr:'f', align:'ce',
    desc:'Fights for the honour of the caldera and throws the fire when the honour is touched. The fire is coming, and the field is burning.' });
  M({ id:'hill giant brute', n:'Hill Giant Brute', hd:'10d8', ac:15, mv:9, atk:[['Club',7]], dmg:'3d8',
    xp:500, tr:'e', align:'ce',
    desc:'The biggest of the big ones, throwing the boulder the size of the house. The house is going, and the field is listening.' });
  M({ id:'white giant elder', n:'White Giant Elder', hd:'12d8', ac:16, mv:9, atk:[['Greatclub',8]], dmg:'4d8',
    xp:700, tr:'f', align:'ce',
    desc:'White as the snowfield, very cold, angry that you walk on its ice. The ice is going, and the cold is in the joints.' });

  /* ================= WAVE 2: more dragon wyrms & plants & misc ================= */
  M({ id:'black dragon wyrm', n:'Black Dragon (Wyrm)', hd:'4d6', ac:15, mv:13, fly:true, atk:[['Bite',3]], dmg:'1d8',
    sp:{ breath:{ kind:'acid', dmg:'3d6', range:3, save:1 } }, xp:100, tr:'e', align:'ce',
    desc:'The young of the fen, still learning the shape of the breath. The breath is coming, and the air is sour.' });
  M({ id:'white dragon wyrm', n:'White Dragon (Wyrm)', hd:'3d6', ac:15, mv:13, fly:true, atk:[['Bite',2]], dmg:'1d6',
    sp:{ breath:{ kind:'cold', dmg:'2d6', range:3, save:1 } }, xp:75, tr:'e', align:'ce',
    desc:'The young of the snowfield, still learning the shape of the cold. The cold is coming, and the joints are cold.' });
  M({ id:'red dragon wyrm', n:'Red Dragon (Wyrm)', hd:'5d6', ac:16, mv:13, fly:true, atk:[['Bite',4]], dmg:'1d8',
    sp:{ breath:{ kind:'fire', dmg:'4d6', range:3, save:1 } }, xp:150, tr:'e', align:'ce',
    desc:'The young of the mountain, still learning the shape of the fire. The fire is coming, and the air is hot.' });
  M({ id:'green dragon wyrm', n:'Green Dragon (Wyrm)', hd:'4d6', ac:15, mv:12, fly:true, atk:[['Bite',3]], dmg:'1d8',
    sp:{ breath:{ kind:'poison', dmg:'3d6', range:3, save:1 } }, xp:100, tr:'e', align:'ce',
    desc:'The young of the forest, still learning the shape of the poison. The poison is coming, and the air is hard to breathe.' });
  M({ id:'blue dragon wyrm', n:'Blue Dragon (Wyrm)', hd:'4d6', ac:15, mv:13, fly:true, atk:[['Bite',3]], dmg:'1d8',
    sp:{ breath:{ kind:'lightning', dmg:'3d6', range:3, save:1 } }, xp:100, tr:'e', align:'ce',
    desc:'The young of the desert, still learning the shape of the lightning. The lightning is coming, and the air is charged.' });
  M({ id:'copper dragon wyrm', n:'Copper Dragon (Wyrm)', hd:'3d6', ac:15, mv:12, fly:true, atk:[['Bite',2]], dmg:'1d6',
    sp:{ breath:{ kind:'acid', dmg:'2d6', range:3, save:1 } }, xp:75, tr:'e', align:'ce',
    desc:'The young of the copper, still learning the shape of the acid. The acid is coming, and the air is sour.' });
  M({ id:'brass dragon wyrm', n:'Brass Dragon (Wyrm)', hd:'3d6', ac:14, mv:12, fly:true, atk:[['Bite',2]], dmg:'1d6',
    sp:{ breath:{ kind:'fire', dmg:'2d6', range:3, save:1 } }, xp:75, tr:'e', align:'ce',
    desc:'The young of the brass, still learning the shape of the fire. The fire is coming, and the air is warm.' });
  M({ id:'bronze dragon wyrm', n:'Bronze Dragon (Wyrm)', hd:'4d6', ac:15, mv:13, fly:true, atk:[['Bite',3]], dmg:'1d8',
    sp:{ breath:{ kind:'lightning', dmg:'3d6', range:3, save:1 } }, xp:100, tr:'e', align:'ce',
    desc:'The young of the bronze, still learning the shape of the lightning. The lightning is coming, and the air is charged.' });
  M({ id:'silver dragon wyrm', n:'Silver Dragon (Wyrm)', hd:'4d6', ac:15, mv:13, fly:true, atk:[['Bite',3]], dmg:'1d8',
    sp:{ breath:{ kind:'cold', dmg:'3d6', range:3, save:1 } }, xp:100, tr:'e', align:'lg',
    desc:'The young of the silver, still learning the shape of the cold. The cold is coming, and the joints are cold.' });
  M({ id:'gold dragon wyrm', n:'Gold Dragon (Wyrm)', hd:'5d6', ac:16, mv:13, fly:true, atk:[['Bite',4]], dmg:'1d8',
    sp:{ breath:{ kind:'fire', dmg:'4d6', range:3, save:1 } }, xp:150, tr:'e', align:'lg',
    desc:'The young of the gold, still learning the shape of the fire. The fire is coming, and the air is warm.' });
  M({ id:'thornweave', n:'Thornweave', hd:'5d6', ac:15, mv:8, atk:[['Thorns',4]], dmg:'2d6',
    xp:90, tr:'d', align:'ne',
    desc:'The hedge a little alive, very thorny, already around the leg. The leg is going, and the thorn is deeper.' });
  M({ id:'carrion flower', n:'Carrion Flower', hd:'3d6', ac:14, mv:6, atk:[['Tendrils',2]], dmg:'1d8',
    sp:{ poison:{ lvl:3 } }, xp:40, tr:'-', align:'ne',
    desc:'The flower that smells of the grave, very hungry, already around the hand. The hand is going, and the smell is stronger.' });
  M({ id:'will o wisp', n:'Will-o\u2019-wisp', hd:'1d6', ac:15, mv:16, fly:true, atk:[['Touch',-1]], dmg:'1d4',
    xp:5, tr:'-', align:'ce', size:'s',
    desc:'The light in the fen, very patient, leading you somewhere. The somewhere is the bog, and the bog is listening.' });
  M({ id:'lemure', n:'Lemure', hd:'2d6', ac:14, mv:14, fly:true, atk:[['Touch',1]], dmg:'1d4',
    turn:3, sp:{ incorporeal:true }, xp:15, tr:'-', align:'ne',
    desc:'The light in the grave that is not a firefly, very cold, leading you somewhere. The somewhere is the dark, and the dark is listening.' });
  M({ id:'hobgoblin shaman', n:'Hobgoblin Shaman', hd:'2d6', ac:14, mv:11, atk:[['Spear',1]], dmg:'1d6',
    sp:{ magic:true }, xp:15, tr:'d', align:'le',
    desc:'The bone crown, singing to the storm. The storm is answering, the storm is turning, and the field is listening.' });
  M({ id:'orc warg rider', n:'Orc Warg Rider', hd:'2d8', ac:14, mv:14, atk:[['Spear',2]], dmg:'1d8',
    xp:25, tr:'d', align:'ce',
    desc:'Rides the warg, very fast. The warg is at the shield, the shield is going, and the road is listening.' });
  M({ id:'troll wight', n:'Troll Wight', hd:'4d6', ac:15, mv:11, atk:[['Claws',4]], dmg:'2d6',
    turn:5, sp:{ regen:3, level_drain:1 }, xp:120, tr:'e', align:'ne',
    desc:'The troll that did not die right, still healing, still reaching. The touch is on the shoulder, and the shoulder is going.' });
  M({ id:'skeleton dragon', n:'Skeleton Dragon', hd:'10d6', ac:17, mv:14, fly:true, atk:[['Bite',7]], dmg:'3d6',
    turn:7, xp:600, tr:'f', align:'ne', size:'l',
    desc:'The bones of the dragon, still holding the shape, very old. The wing is turning, and the keep is listening.' });
  M({ id:'elder giant bat', n:'Giant Bat (Elder)', hd:'2d6', ac:15, mv:17, fly:true, atk:[['Bite',1]], dmg:'1d8',
    xp:15, tr:'-',
    desc:'The size of a hound, very old, hearing the heartbeat three corridors off. The heartbeat is slowing.' });
  M({ id:'elder owlbear', n:'Owlbear (Elder)', hd:'6d6', ac:14, mv:11, atk:[['Talons',3]], dmg:'2d8',
    xp:120, tr:'e',
    desc:'Grumbles, huffs, swats the air, and will swat you the same. The swat is coming, and the air is cracking.' });

  /* ================= NAMED BOSSES ================= */
  M({ id:'witch_queen', n:'The Witch-Queen', hd:'8d6', ac:16, mv:10, atk:[['Staff',6],['Shadow',5]], dmg:'3d6',
    sp:{ magic:true, level_drain:1, charm:{ save:4 }, darkmagic:true },
    xp:800, tr:'f', align:'ce',
    desc:'She has worn the moor’s dead like a cloak and the moor’s fear like a crown. The barrow-mists part before her, and the birds will not cross the road she walks.' });
  M({ id:'cellar_king', n:'The Cellar King', hd:'5d8', ac:14, mv:10, atk:[['Clubs',4]], dmg:'2d8',
    sp:{ surprise:1 }, xp:180, tr:'e', align:'ce',
    desc:'The goblins call it a king because it is bigger than the rest and it keeps the best cellar. It has worn the old mayor’s hat for a year and has forgotten what it was for.' });
  M({ id:'hollow_troll', n:'The Hollow Troll', hd:'6d8', ac:15, mv:11, atk:[['Claws',5]], dmg:'2d8',
    sp:{ regen:5, fireWeak:true }, xp:200, tr:'e', align:'ce',
    desc:'It took the vaults when the marsh took the village. It heals from every wound you give it, and it is keeping count of the ones you still owe.' });
  M({ id:'iron_king', n:'The Iron King', hd:'9d6', ac:17, mv:8, atk:[['Sceptre',6],['Claws',5]], dmg:'3d6',
    sp:{ level_drain:2, poison:{ lvl:5 }, magic:true },
    xp:800, tr:'f', align:'le',
    desc:'He was crowned in iron and buried in iron, and the barrow kept what the crown promised. The rust on his mail is the only thing in the barrow that dies.' });

  var O = {};
  L.forEach(function (x) { if (O[x.id]) throw new Error(`dup monster id ${x.id}`); O[x.id] = x; });
  O.list = L;
  return O;
})();
var MONSTER_LIST = MONSTERS.list;

if (typeof module !== 'undefined' && module.exports) module.exports = { MONSTERS: MONSTERS, MONSTER_LIST: MONSTER_LIST };
