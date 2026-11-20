# Emberfall: The Emberwild Saga

A party-based fantasy RPG that runs entirely in the browser — no build step,
no assets. Open `index.html` and play.

It plays like a late-1980s "gold box" computer RPG:

- **First-person exploration** — a textured raycaster for towns, building
  interiors and torch-lit dungeon floors (all textures drawn in code). Turn to
  face a person, door, counter or stair and a gold prompt appears at the base
  of the view; press Space or `◙` to act. Towns keep their own folk — the
  watchman and the road-wearied traveller pass the day's rumours of the wilds.
- **Overland travel** — terrain grids, roads and rivers, sites (towns,
  dungeon entrances, hamlets, healers, holy stones, monster lairs, camps),
  encounters, rumours and passing travellers.
- **Turn-based tactical combat** — initiative, movement, melee and missile
  attacks, spells with ranges and areas, backstabs, turning undead, morale
  and fleeing, and an auto-fight option.
- **Second-edition tabletop rules** — THAC0 with descending armour class,
  five saving throws, hit dice, XP tables to level 20, prime-requisite
  bonuses, race/class level caps, 100 gp/level training, fighter weapon
  specialization, thief skills and ×2 backstab, paladins turning undead as
  a cleric two levels lower, demi-human movement ~15% slower.

## Contents

- **54 adventures** — four authored sagas (*The Cellars of Thornwick*,
  *The Hollow Vaults*, *Barrow of the Iron King*, *The Witch-Queen of
  Ravenmoor*) plus fifty seeded-generated ventures across five level bands
  (identical on every load, separate RNG streams so content never shifts).
- **~330 monsters**, **~300 items**, **75 wizard + 61 priest spells**,
  first-edition-style treasure types, shop stock by level band.
- Every dungeon level has secret doors (often hiding loot alcoves),
  single- and whole-party traps with saving throws, reachable treasure and
  stairs, and a named boss on the last floor. A validator checks all of it.

## Controls

- **Touch** — on-screen pad: `▷/◁` turn, `▶/◀` sidestep, `▶`/`◀` (side
  column) step forward/back, `◙` search/interact, `☰` menu. Tap the map to
  step; tap enemies to attack.
- **Keyboard** — `WASD`/arrows move and turn, `Q`/`E` sidestep, `F` search,
  `R` camp, `Space` interact, `M` map, `J` journal, `B` bestiary,
  `1–6` character sheets, `Esc` menu / back. Parties may hold up to six.

## Saves

Four manual slots plus an autosave, in `localStorage`.

## Development

No framework, bundler or package manager — plain scripts in `js/` loaded by
ordinary `<script>` tags in the required order. All art (wall textures,
monsters, portraits, icons, site glyphs, loot) is drawn to canvases at
start-up from seeded RNGs.

Test tooling (Node, no dependencies beyond a system Chrome for the browser
suite):

```sh
node tools/validate.js      # static checks: rules, spells, items, monsters,
                            # adventures (reachability, traps, secrets,
                            # bosses), script order, no external assets
node tools/smoke.js         # headless DOM integration: create -> overland
                            # -> town -> dungeon -> combat -> save/load
node tools/chrome_test.js   # real headless Chrome: loads index.html, clicks
                            # through the game, watches for page errors
node tools/visual_test.js   # real headless Chrome: verifies every scene
                            # renders to canvas and panels populate
```

## Layout

| file | purpose |
| --- | --- |
| `index.html` | app shell + script load order |
| `style.css` | gold-box parchment & bronze UI, phone/tablet layouts |
| `js/rules.js` | rule tables: abilities, races, classes, THAC0, saves, XP, spells |
| `js/data.js` | item list (~300) |
| `js/modules.js` | dice, seeded streams, saves, DOM helpers, names |
| `js/monsters.js` | ~330 monsters with abilities |
| `js/wilds.js` | terrain generation, sites, encounter tables, rumours |
| `js/treasure.js` | treasure types, magic items, shops |
| `js/adventures.js` | town/dungeon/wilds generators + all 54 adventures |
| `js/figures.js` | all code-drawn art |
| `js/view3d.js` | first-person raycaster |
| `js/ui.js` | panels: creation, sheets, inventory, shops, saves, select |
| `js/combat.js` | tactical combat |
| `js/overland.js` | wilderness scene |
| `js/campaign.js` | state, characters, town & dungeon scenes, saves |
| `js/journal.js` | quest log + dated notes |
| `js/map.js` | full-page map (wilderness + dungeon floor) |
| `js/bestiary.js` | monster codex |
| `js/navpad.js` | touch pad + keyboard input |
| `js/watch.js` | HUD: minimap, vitals, clock |
| `js/game.js` | boot, scene routing, action dispatch |

## Licence

MIT — see `LICENSE`. All setting, characters, names, adventures and text
are original.
