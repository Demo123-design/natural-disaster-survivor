# Natural Disaster Survivor

A 3D survival round game. Gather supplies, then survive the disaster.

Full design is in **[PRD.md](PRD.md)**.

## Running it

```bash
npm install
```

```bash
npm run dev
```

Then open the address it prints (usually `http://localhost:5173`) and click to play.

## Controls

| Input | Action |
|---|---|
| Mouse | Look around |
| `W` `A` `S` `D` or arrow keys | Move |
| `Shift` | Sprint |
| `Space` | Jump |
| Scroll wheel | Zoom the camera (all the way in = first person) |
| `E` | Interact — sit, read, spin, enter the portal, pick up a supply |
| `1`–`5` | Choose a hotbar slot |
| Left click | Use what you are holding |
| `F` | Skip the rest of the prepare phase |
| `C` | Jackets (lobby only) |
| `Esc` | Pause menu |

## Build progress

- [x] **P0 — Engine.** Scene, lights, ground, render loop, mouse-look.
- [x] **P1 — Player.** Gravity, jump, sprint, box collision with step-up,
      third-person camera with zoom to first person, obstacle course.
- [x] **P2 — Lobby.** Couch, carpet, table with benches and ten plates,
      chandelier, bookshelf, Roulette cabinet, portal, sitting, `E` prompts.
- [x] **P3 — Identity.** Username chosen once on first launch, nameplate with
      rank and wins above the head, profile saved to the browser.
- [x] **P4 — Round loop.** Portal starts a match, 2:00 prepare phase, the
      Flood disaster on the Forest map, health and drowning, results screen,
      return to the lobby. One map and one disaster; the rest follow.
- [x] **P5 — Maps.** All eight built, picked at random from the ones the
      disaster is allowed on. Every map has at least two ways to climb above
      the water.
- [x] **P6 — Disasters.** All twelve, each with its own hazard, timing and
      way out. Checked that every one can catch you and every one can be
      got through on every map it is allowed on.
- [x] **P7 — Supplies.** Nine kinds scattered each match, a five-slot hotbar,
      food, water, placeable shelter, torch and axe.
- [x] **P8 — Progression.** Rank badge and progress bar on the HUD, results
      screen showing what the round was worth, rank-up celebrated when you
      cross a threshold.
- [x] **P9 — Customisation.** Jacket shop with all 20 shades, gem spending,
      the Divine gradient, and the Roulette with real 80/19/1 odds and a
      half refund on duplicates.
- [x] **P10 — Polish.** Sound, pause menu, and thirteen readable survival
      books on the lobby bookshelf.

## Files

| File | What it holds |
|---|---|
| `index.html` | Page shell and HUD |
| `src/main.js` | Engine bootstrap, world setup and the main loop |
| `src/player.js` | Player movement, physics and the third-person camera |
| `src/collision.js` | Box collision: push-out, ground, ceilings, camera rays |
| `src/character.js` | The anime character: painted face, hair, jacket, hands |
| `src/lobby.js` | The lobby room, furniture, portal and Roulette |
| `src/materials.js` | Shared cel-shading: colour bands, outlines, canvas textures |
| `src/constants.js` | Jacket shades, ranks, timings, player tuning |
| `src/save.js` | The saved profile: name, wins, gems, jackets owned |
| `src/identity.js` | First-launch username picker |
| `src/round.js` | The round loop: phases, timers, energy, inventory |
| `src/supplies.js` | Supplies: what they are, where they land, what they do |
| `src/shop.js` | The jacket shop and the Roulette's panels |
| `src/roulette.js` | Roulette odds, duplicates and refunds |
| `src/audio.js` | All the sound, synthesised in the browser |
| `src/books.js` | The thirteen survival books on the bookshelf |
| `src/maps/index.js` | The map list and which disaster may use which map |
| `src/maps/common.js` | Shared terrain tools: terraces, stairs, scatter, trees |
| `src/maps/*.js` | The eight maps, one file each |
| `src/disasters/index.js` | The disaster list and random pairing |
| `src/disasters/common.js` | Shared hazard tools: rising surfaces, warnings, weather |
| `src/disasters/drain.js` | Blizzard, heatwave, acid rain and drought |
| `src/disasters/*.js` | The other eight disasters, one file each |

## The maps

| Map | What it is | Ways up |
|---|---|---|
| City | Street grid, buildings, cars, lamp posts | Two outdoor stair towers to rooftops |
| Desert | Dunes, cacti, a ruin | The ruin tower, a rock shelf |
| Mountain | A tall terraced peak, conifers | The peak, a cabin on a ledge |
| Tundra | Flat ice, drifts, a frozen lake | An ice shelf, a hut on stilts |
| Cave | Enclosed, stalactites, a pool, its own lights | A high ledge, a side alcove |
| Beach | Sand, palms, a pier, shallow sea | The lifeguard tower, a big dune |
| Forest | Dense conifers, a clearing, a log cabin | The rock outcrop, the cabin roof |
| Badlands | Canyons, mesas, dry riverbeds | Two mesas, the canyon wall |

A jump clears about 1.1m, so every ledge you are meant to reach sits 0.8m
above the last one. That rule lives in `src/maps/common.js` and is why the
terrain is stepped rather than sloped.

## Playing a round

Walk into the portal on the left of the lobby and press `E`. A disaster and a
map are drawn at random, you get two minutes to find your spot, then it
starts. Last until the timer runs out for **+1 win and +1 gem**.

**Nobody dies in this game.** Hazards drain your **energy** bar, and if it
empties you are simply sent back to the lobby to have another go. There is no
failure screen and nothing says you lost.

## The disasters

| Disaster | Length | How to get through it |
|---|---|---|
| Volcanic eruption | 75s | Climb above the lava, and move off the rings before the rocks land |
| Tsunami | 45s | A wave crosses the map — be above the flood line before it arrives |
| Tornado | 60s | Keep well clear of the funnel, or get under cover |
| Earthquake | 50s | Cracks open near you — keep stepping onto solid ground |
| Asteroid | 60s | Circles mark where meteors land; keep moving |
| Mudslide | 45s | Get high. The mud does not drain away |
| Blizzard | 90s | Get under cover and stay there |
| Extreme heatwave | 90s | Find shade |
| Drought | 90s | Stay in the shrinking waterhole |
| Overgrown forest | 60s | Reach the green circle before the vines spread |
| Acid rain | 75s | Stay under a roof |
| Flood | 60s | Climb, and be ready to climb higher |

Each disaster only appears on maps where it makes sense — no tsunami in the
cave. Every map has at least one spot with a roof and at least two ways to
climb above the water.

## Supplies

Supplies are scattered over the map at the start of each match. Walk up and
press `E` to take one; you can carry five things. Press `1`–`5` to choose one
and click to use it.

| Supply | What it does |
|---|---|
| Canned food, bread, fruit | Energy back (+35, +25, +20) |
| Water bottle | 30 seconds where heat and thirst cannot touch you |
| Umbrella, tarp, tent | Put up a roof — counts as cover for blizzard, heatwave and acid rain |
| Torch | 45 seconds of light; cuts through a blizzard, helps in the cave |
| Axe | Clears the vines around you in the overgrown forest |

The shelter items are the neat part: putting one up builds a real roof in the
world, and "sheltered" already means "something overhead" — so every
cover-based disaster respects a tarp without knowing supplies exist.

Not in yet: reinforcing a shelter with rope or a metal sheet (PRD section 7).

## Ranks

Rank comes from total wins. The corner of the screen shows your rank, a badge
in its colour, and a bar counting down to the next one.

| Rank | Wins | Rank | Wins |
|---|---|---|---|
| Unranked | 0 | Gold | 5,000 |
| Brass | 50 | Diamond | 10,000 |
| Copper | 100 | Quartz | 50,000 |
| Bronze | 500 | Emerald | 100,000 |
| Iron | 1,000 | Ruby | 1,000,000 |
| Silver | 2,000 | King | 1,500,000 |

Each round you finish is **+1 win and +1 gem**. A round you do not finish
costs you nothing — the totals hold steady, which the results screen shows on
purpose.

## Jackets

Press `C` in the lobby for the jacket menu. Click one you own to wear it, or
one you don't to buy it. Prices run from free (the four starters) through 25,
50, 100 and 500 gems, up to **Divine** at 100,000 — a blue-to-purple gradient
and the long-term goal.

### The Roulette

The machine in the lobby gives a random jacket for **750 gems**:

| Tier | Chance | Jackets |
|---|---|---|
| Rare | 80% | Indigo, Tan, Peach, Cream |
| Epic | 19% | Dark green, Light green, Yellow ochre |
| Legendary | 1% | Divine |

Land on one you already own and **375 gems come back** — half. Own all eight
and the machine says so and refuses to take your gems.

The result is decided before the wheel moves, and the wheel is then animated
to land on it. It never stops short of the gold sliver to tease you, and the
gold slice on the wheel really is only 1% wide.

## No real money, ever

Gems come from surviving disasters. That is the only way to get them.

There are no purchases, no gem top-ups, no bundles, no ads, and no payment
code or payment library anywhere in this project — the only dependencies are
Three.js and Vite. The Roulette is paid for in gems you earned by playing, so
the worst run of bad luck possible ends with "go and play more rounds".

This is permanent. See PRD section 10.

## The bookshelf

Press `E` at the bookshelf for thirteen short books: one for each disaster,
plus **How to play**. That is the whole tutorial — nothing is forced on you,
and it is there when you want it. Each disaster book opens with the same
advice line the in-game warning uses, so the books and the game cannot drift
apart.

## Sound

Every sound is generated in the browser rather than loaded from a file, so
there are no audio assets and nothing to go missing. The palette is
deliberately soft — running out of energy is a gentle slide down, not a
sting. Toggle it from the pause menu; the choice is remembered.

## Your save

Your name, wins, gems and jackets are saved in this browser, on this computer.
Clearing site data clears the save. There is no account and nothing is sent
anywhere.

To start over during development, open the browser console and run:

```js
__game.resetProfile()
```

then reload.

## Rules this project keeps

- **Nobody dies.** Hazards drain an energy bar; running out sends you back to
  the lobby with "have another go". No death, no failure screen. This is a
  game for a nine-year-old and the tone stays that way.
- **No chat** of any kind.
- **No real money.** Gems are earned by surviving. See PRD section 10.
- **Anime art style** throughout: cel shading, dark outlines, painted faces. See PRD section 8.
