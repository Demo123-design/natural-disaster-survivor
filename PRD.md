# Natural Disaster Survivor — Product Requirements Document (PRD)

**Version:** 1.0 (all open questions resolved — ready to build)
**Date:** 2026-11-22
**Author:** Kiaan (design) — written up for review

---

## 1. Overview

**Natural Disaster Survivor** is a 3D multiplayer-style survival round game. Players gather in a lobby, step through a portal to start a match, get **2 minutes** to collect supplies on a randomly chosen map, and then must survive a randomly chosen natural disaster. Surviving the disaster = **1 win** and **1 gem**. Wins drive a rank shown above the player's head; gems buy jacket colours.

**Platform:** Desktop web browser (keyboard + mouse).
**Camera:** 3D, mouse-look (look up / down / left / right), WASD or arrow keys to move.
**Chat:** None. Players cannot talk to each other. (Deliberate safety decision.)

---

## 2. Goals & Non-Goals

### Goals
- A playable 3D round loop: lobby → portal → prepare (2 min) → disaster → make it or head back → results → back to lobby.
- 12 distinct natural disasters, each with its own hazard behaviour and survival rule.
- 8 distinct maps with different layouts and shelter opportunities.
- A lobby that feels like a hangout: couch, red carpet, dining table with benches and plates, chandelier, bookshelf, portal.
- Persistent player identity: chosen username, win count, rank, gems, jacket colour.
- Rank + win count displayed above the player's head.

### Non-Goals (for v1)
- **Online multiplayer.** v1 is single-player with local save; multiplayer is v2 (see §12 Q2). The lobby and nameplate systems are built so other players can slot in later without redesign.
- Text or voice chat of any kind.
- Friends lists, parties, trading, or player-to-player interaction beyond being in the same world.
- Mobile / touch controls.

---

## 3. Core Game Loop

```
LOBBY  ──(walk into portal)──►  QUEUE  ──(1+ player entered)──►  MATCH START
                                                                      │
                                                            random map + random disaster
                                                                      │
                                                          PREPARE PHASE  (2:00 timer)
                                                     collect food / shelter / materials
                                                                      │
                                                          DISASTER PHASE
                                                      hazard plays out, players make it or run out of energy
                                                                      │
                                                            RESULTS SCREEN
                                                     survivors: +1 win, +1 gem
                                                                      │
                                                          ◄── return to LOBBY ──
```

### Phase details

| Phase | Duration | What happens |
|---|---|---|
| Lobby | Unlimited | Free walking, sitting on couch/bench, browsing bookshelf, customisation menu |
| Queue | 15s countdown (skipped if alone) | Portal shows "Enter game" + players-waiting counter + countdown |
| Prepare | 2:00 (120s) | Map loads, supplies spawn scattered around, HUD shows countdown + disaster name warning |
| Disaster | 45–90s (per disaster, see §12.2) | Hazard active; energy can run out; survival timer counts down |
| Results | 10s | Survived / Did not survive, wins + gems awarded, rank-up banner if applicable |

**Start condition:** entering the portal starts a **15-second countdown** so others can join. If you are the only player in the lobby, the countdown is skipped and the match starts immediately. If everyone steps back out of the portal, the countdown cancels.

**Early end:** if everyone runs out of energy before the survival timer ends, the round finishes early with "Everyone's heading back!" — no wins, no gems.

---

## 4. The Lobby

A single indoor room. Layout:

- **Centre:** a **couch** — players can sit on it (press `E` when near).
- **Under/around the couch:** a **red carpet**.
- **Behind the couch:** a long **table** with a **bench on each side** and **5 plates** on the table per side (10 plates total). Benches are sittable.
- **Above the table:** a **chandelier** (light source, gives the room its warm glow).
- **Right side of the room:** a **bookshelf** full of **readable books** — 12 disaster survival-tip books (one per disaster) plus a "How to play" book. This is the tutorial.
- **Right side, beside the bookshelf:** the **Roulette** machine (§10.1).
- **Left side of the room:** the **portal**.

### The Roulette machine
A standing arcade-style cabinet with a big vertical **spinning wheel** on the front.

- The wheel is divided into coloured segments by tier: **blue (Rare)**, **purple (Epic)**, and one thin **gold (Legendary)** slice.
- A **price plate** on the cabinet reads **750 GEMS**.
- A **lever** on the right side is what you pull to spin.
- Above the wheel, a **glass display case** lights up and shows the jacket you won, on a little mannequin.
- If you cannot afford it, the cabinet is dim and the price plate glows red.

### The Portal
- A vertical glowing gateway with a **yellow → green → blue gradient**.
- **White text on it reads "ENTER GAME".**
- Below/next to it: a **players-waiting counter** ("Players: 1").
- Walking into the portal enters the queue; walking back out leaves the queue.
- When the start condition is met, the portal flashes and all queued players are pulled into the match.

### Lobby interactions
- `E` to sit / stand on couch and benches.
- `E` on the bookshelf to open and read a book.
- `E` on the Roulette machine to pull the lever and spin (§10.1).
- Customisation menu (`C` or a nearby mirror/wardrobe stand) to pick jacket colour.
- Your own username, win count and rank float above your head, same as everyone else's.

---

## 5. Maps (8)

Each map is a bounded arena with terrain, props, and at least two viable shelter strategies.

| # | Map | Character | Natural shelter examples |
|---|---|---|---|
| 1 | **City** | Streets, buildings, cars, lamp posts | Building interiors, basements, under overpasses |
| 2 | **Desert** | Dunes, rocks, cacti, a ruin | Ruin walls, rock overhangs |
| 3 | **Mountain** | Slopes, cliffs, boulders, snow caps | Crevices, cabin, boulder lee side |
| 4 | **Tundra** | Flat ice, snow drifts, frozen lake | Ice shelter, hut, snow bank |
| 5 | **Cave** | Enclosed tunnels, stalactites, underground pool | Side tunnels, alcoves |
| 6 | **Beach** | Sand, palm trees, pier, shallow water | High ground, lifeguard tower, dunes |
| 7 | **Forest** | Dense trees, clearings, stream, log cabin | Cabin, thick tree cover, hollow log |
| 8 | **Badlands** | Canyons, mesas, dry riverbeds, dust | Canyon walls, mesa tops, caves |

Maps and disasters are chosen **independently at random** each match, with a compatibility table so nonsense pairings are avoided (e.g. tsunami on the Cave map) — see §6.3.

---

## 6. Natural Disasters (12)

### 6.1 List and survival rules

| # | Disaster | Hazard behaviour | How to survive |
|---|---|---|---|
| 1 | **Volcanic eruption** | Volcano erupts; lava flows spread along low ground; falling fire-rocks | Get to high ground away from lava; avoid rock impact shadows |
| 2 | **Tsunami** | Water wall approaches from one side, floods the map to a set height | Climb above the flood line before it hits |
| 3 | **Tornado** | A moving funnel wanders the map, sucking in anything nearby | Stay out of its radius; shelter indoors / behind heavy cover |
| 4 | **Earthquake** | Screen shakes, ground cracks open, structures collapse | Stay away from cracks and falling buildings; open flat ground is safest |
| 5 | **Asteroid** | Warning shadows, then meteor impacts with blast radius | Keep moving; stay out of marked impact circles |
| 6 | **Mudslide** | Mud wave pours down a slope and buries low areas | Reach high ground or solid shelter |
| 7 | **Blizzard** | Heavy snow, low visibility, cold meter drains | Get inside shelter or next to a heat source; use warm supplies |
| 8 | **Extreme heatwave** | Heat meter drains outdoors; ground becomes damaging in places | Find shade / indoors; use water supplies |
| 9 | **Drought** | Thirst meter drains fast; water sources dry up over time | Collect and ration water supplies; find the remaining water source |
| 10 | **Overgrown forest** | Vines and plants rapidly grow, blocking paths and trapping players | Keep clearing / keep moving; don't get enclosed; reach a clear zone |
| 11 | **Acid rain** | Corrosive rain damages anyone under open sky | Stay under a roof / overhang the whole time |
| 12 | **Flood** | Water level rises steadily across the whole map | Climb and keep climbing; stay above the water line |

### 6.2 Energy model

**Nobody dies in this game.** It is made for a nine-year-old, so the tone
stays cheerful the whole way through: hazards drain your **energy**, and when
it runs out you are sent back to the lobby to try again. No death, no
failure screen, no "you lost".

- Players have **100 energy**.
- Full-drain hazards (empty the bar at once): direct tornado hit, lava
  contact, asteroid direct impact, going under the mud, falling into a crack.
- Gradual hazards: cold (blizzard), heat (heatwave), thirst (drought), acid
  (acid rain), being underwater (tsunami/flood). These drain energy while you
  are exposed, stop when you are protected, and it refills slowly once you
  are safe.
- Out of energy = you watch the rest of the round, then return to the lobby
  with everyone else. **No win, no gem** — but the results screen says
  "Back to the lobby — have another go!", never anything harsher.

### 6.3 Map × Disaster compatibility
A simple allow-list so matches make sense. Draft:

| Disaster | Allowed maps |
|---|---|
| Volcanic eruption | Mountain, Badlands, Forest, City, Cave |
| Tsunami | Beach, City, Forest, Tundra |
| Tornado | City, Desert, Badlands, Forest, Tundra |
| Earthquake | All 8 |
| Asteroid | All 8 except Cave |
| Mudslide | Mountain, Forest, Badlands, City |
| Blizzard | Tundra, Mountain, Forest, Cave |
| Extreme heatwave | Desert, Badlands, Beach, City |
| Drought | Desert, Badlands, Forest, Beach |
| Overgrown forest | Forest, Cave, Mountain, City |
| Acid rain | All 8 except Cave |
| Flood | All 8 except Mountain peak-only areas (Cave allowed and extra scary) |

---

## 7. Supplies (Prepare phase)

Supplies spawn **scattered around the map** at random points each match. Walk over / press `E` to pick up. Inventory is a simple hotbar of 5 slots.

| Category | Examples | Use |
|---|---|---|
| **Food** | Canned food, bread, fruit, **water bottle** | Restores HP; water counters drought/heatwave drain |
| **Shelter** | Tent, tarp, planks, door, umbrella | Place to create a protected spot (counters acid rain, blizzard, heatwave) |
| **Materials** | Rope, metal sheet, torch, axe, flashlight | Reinforce shelter, make light (Cave/Blizzard), clear vines (Overgrown forest) |

Placement of shelter items is a simple "ghost preview + left click to place" system on flat ground.

---

## 8. Player Character & Customisation

### Art style: anime
The game is **cel-shaded anime**, not blocky. Every character and prop follows this:

- **Flat colour bands** instead of smooth shading — three steps (lit, mid, shadow), which is what gives the drawn look.
- **Dark outlines** around every silhouette, drawn as an inverted hull.
- **Anime proportions:** large rounded head (about 5 heads tall), slim limbs, narrow waist.
- **Painted faces:** large eyes with a heavy lash line, coloured iris, two white highlights, angled eyebrows, a small mouth and cheek blush.
- **Spiky layered hair** with a sheen band across the top.

### Character
An anime figure in a hooded **jacket**, built from Kiaan's reference drawing:

- **Hood worn UP**, wrapping the head with the face showing through the opening
- Long face, almond eyes, narrow nose, slight smile
- **White drawstrings with aglets** hanging from the collar
- Sleeves with **turned-back cuffs**
- **Open hands with five fingers** and visible fingernails
- A **kangaroo pocket** low on the front
- A **crown emblem** on the left trouser leg

### Colour spec

| Part | Colour |
|---|---|
| Skin | **Light peach** |
| Eyes | **Yellow** iris, with white highlights |
| Hair | Warm brown, visible as a fringe inside the hood |
| Fingernails | **Off-white** ("a tiny bit dark" white) |
| Trousers | **Black** |
| Crown on the leg | **Bright yellow** |
| Shoes | **Red → white gradient**, red at the sole fading up to white |
| Drawstrings | **White** |
| **Jacket** | **Whichever shade the player has equipped and bought** (§12.1) |

The jacket is the only part that changes — every shade in the shop and the Roulette recolours the jacket, hood, sleeves and pocket together. Everything else stays the same on every character.

### How the art is made
Everything is **generated in code** from spheres, capsules, cones and canvas-painted textures. No model files, no art pipeline, nothing to download.

**The ceiling on this:** code-generated geometry can get a convincing stylised-anime look, but it cannot reach the quality of a character modelled in Blender or a ready-made **VRM** avatar (the standard format for anime avatars). If the look ever needs to go further than code can take it, the upgrade path is to load a VRM or glTF model and keep the same cel-shading and outline setup around it. That is a v2 decision, not a v1 one.

### Jacket shades (unlockable with gems)
Base shades: Red, Green, Blue, Yellow, Indigo, Cyan, Magenta, Orange, Purple, Tan, Peach, White, Black, Grey, Dark green, Light green, Yellow ochre, Cream, Brown — **19 shades**.

Special: **Divine** — a blue→purple gradient jacket — **100,000 gems**.

Pricing: 4 starter shades free, then a 25 / 50 / 100 / 500 gem ladder; Divine is the 100,000-gem trophy shade. Full table in §12.1.

### Nameplate (above the player's head)
Three stacked lines, always visible to all players:

```
      [ RANK ]        ← rank name/badge, top line
      1,250 wins      ← win count, middle
      KiaanTheGreat   ← chosen username, bottom (closest to head)
```

### Username
- Player **chooses** their own username on first launch. No auto-generated names.
- It is kept permanently — **no renaming, ever**. A confirmation dialog warns you before it is locked in.
- Rules: 3–16 characters, letters/numbers/underscore only, must be unique, filtered against a blocked-words list.

---

## 9. Ranks

Rank is determined by total wins. Shown above the win count.

| Rank | Wins required |
|---|---|
| Unranked | 0 – 49 |
| Brass | 50 – 99 |
| Copper | 100 – 499 |
| Bronze | 500 – 999 |
| Iron | 1,000 – 1,999 |
| Silver | 2,000 – 4,999 |
| Gold | 5,000 – 9,999 |
| Diamond | 10,000 – 49,999 |
| Quartz | 50,000 – 99,999 |
| Emerald | 100,000 – 999,999 |
| Ruby | 1,000,000 – 1,499,999 |
| **King** | 1,500,000+ |

Each rank has its own colour/badge style. A rank-up is celebrated on the results screen.

---

## 10. Economy

> ### ⛔ Hard rule: NO REAL MONEY. EVER.
>
> This is a permanent constraint on the whole project, not a v1 scope decision. It does not get revisited in v2 or any later version.
>
> The game will **never** contain:
> - purchases of any kind, with real money or any currency
> - payment forms, card fields, checkout flows, or billing details
> - links out to any store, payment page or payment provider
> - gem top-ups, bundles, starter packs, battle passes or subscriptions
> - any way to buy a Roulette spin, or any paid loot box, crate or randomised reward
> - ads, sponsorships, or "watch a video for gems"
> - any code that talks to a payment service, and no payment library as a dependency
>
> **Gems are earned by playing. That is the only way to get them, and there is no second way.**
> 1 win = 1 gem. Nothing else creates gems.
>
> **About the Roulette (§10.1):** the lobby has a 750-gem random-shade machine. It is a randomised reward, so it is worth being clear why it does not break this rule: a spin is paid for with **gems you earned by surviving disasters**, and gems can never be bought. There is no way to spend real money to spin it, no way to buy gems to spin it with, and no way to run out and top up. The worst possible outcome of a bad run of spins is that you go and play more rounds. That is what separates it from a paid loot box, and that separation only holds while gems stay unbuyable — which is why the rule above is permanent.

### Earning
- **1 gem per win** (per survival). This is the sole source of gems.

### Spending
Gems are spent on jacket shades, in two ways:
1. **Buy a specific shade** directly at its listed price (§12.1).
2. **Spin the Roulette** for 750 gems and get a random one — duplicates refund 375 (§10.1).

No other sinks in v1.

---

## 10.1 The Roulette

A machine in the lobby that gives you a **random jacket shade** for **750 gems**.

### Odds

| Tier | Chance | Shades in the tier |
|---|---|---|
| **Rare** | **80%** | Indigo, Tan, Peach, Cream |
| **Epic** | **19%** | Dark green, Light green, Yellow ochre |
| **Legendary** | **1%** | Divine (blue→purple gradient) |

The three chances add to 100%. The roll picks a **tier** first, then picks a shade **at random from every shade in that tier**, whether or not you already own it.

### Duplicates refund half your gems
If the wheel lands on a shade you **already own**, you get **375 gems back** — half the 750 you spent.

- The wheel still spins and still lands on the shade, so you see what you got.
- The display case lights up, but the banner reads **"DUPLICATE — 375 gems refunded"**.
- Net cost of a duplicate: **375 gems**.
- **If you own all 8 roulette shades**, the machine goes dark and reads **"You own them all"**, and refuses to spin — there would be nothing left to win.

A duplicate therefore stings a little but never wipes you out: you lose half a spin, not a whole one. The half that is kept is what stops the machine from becoming free to use (see below).

### The spin
1. Press `E` at the machine. A confirm panel appears: *"Spin for 750 gems?"*
2. On confirm, 750 gems are deducted and the lever pulls.
3. The wheel spins for about **4 seconds**, slowing down, ticking as it passes segments.
4. It lands on the winning tier's segment; the display case lights up and the jacket appears on the mannequin.
5. A banner names the shade. Legendary triggers a bigger celebration — gold light, the chandelier flickers, a fanfare.
6. The shade is unlocked immediately and can be worn from the customisation menu — **or**, if you already owned it, the banner shows the duplicate result and 375 gems come straight back.

**The spin result is decided before the animation starts.** The wheel is then animated to land on that result. The animation never changes the outcome, and there are no near-misses faked to make it look close — if it lands next to Legendary, that is genuinely where it landed.

### Why half, and not all of it

**Resolved: half refund (375 gems).**

A *full* refund would have made the machine free to use. Once you own all 4 Rares and all 3 Epics, every result except Divine is a duplicate — so with a full refund every spin would cost nothing, and you could stand at the lever spinning forever on a 1% chance. About 100 spins is roughly 10 minutes of clicking, which would have handed out a 100,000-gem shade for free and killed the whole chase.

Keeping half back closes that. In the same owned-out position, each spin now costs about **375 gems net**, so reaching Divine through the machine averages around **38,000 gems** — a long grind you have to genuinely earn, but still well under the 100,000 sticker price. The Roulette stays the cheaper, riskier road to Divine; the shop stays the reliable one. Both are worth taking, which is exactly where this should land.

### Is it good value?
Worth knowing, since you set the price:

| Outcome | Chance | Shop value |
|---|---|---|
| Rare | 80% | 100 gems |
| Epic | 19% | 500 gems |
| Legendary | 1% | 100,000 gems |

Average value of a spin: **1,175 gems** for a 750-gem cost.

But that average is almost entirely the 1% Legendary. Ignoring it, a spin averages **175 gems** for 750 — so **99% of the time the roulette is a bad deal** versus just buying the shade you want. What you are really buying is a **1-in-100 shot at Divine**.

That shot is the point: Divine costs 100,000 gems outright, but chasing it through the machine averages around **38,000 gems** once duplicates and their half refunds are counted. So the roulette is the *cheaper and more exciting* road to Divine, and the straightforward shop is the reliable road to everything else. Both roads stay worth taking, which is a good place for the design to land.

Early spins are the best value of all: when you own few shades, almost every result is new, so duplicates and their half refunds barely come into it.

### Why this matters
Divine costs 100,000 gems. In a game that sold gems, a price like that exists to make buying them tempting. Here it is simply a long-term goal you play toward, and it must stay that way — the price is a challenge, never a nudge toward a shop.

---

## 11. Controls & UI

### Controls
| Input | Action |
|---|---|
| Mouse move | Look (yaw + pitch) — pointer lock |
| `W` `A` `S` `D` / Arrow keys | Move forward / left / back / right |
| `Space` | Jump |
| `Shift` | Sprint |
| `E` | Interact (sit, pick up, enter portal prompt) |
| `1`–`5` | Select hotbar slot |
| Left click | Use / place selected item |
| `C` | Customisation menu (lobby only) |
| `Esc` | Release mouse / pause menu |

### HUD
- Top centre: **phase timer** (e.g. `PREPARE 1:34`, then `SURVIVE 0:52`).
- Top centre, during prepare: **disaster warning banner** (`⚠ TORNADO INCOMING`).
- Bottom left: **health bar** + active meter (cold / heat / thirst) when relevant.
- Bottom centre: **5-slot hotbar**.
- Top right: **players alive** counter.
- Bottom right: your gems + wins.

---

## 12. Decisions (resolved)

| # | Question | **Decision** |
|---|---|---|
| Q1 | Does the match start the instant 1 player enters the portal? | **15-second countdown** starts when the first player steps in. Others can join during it. If you are the only player in the lobby, the countdown is skipped and the match starts immediately. Leaving the portal cancels the countdown if nobody is left inside. |
| Q2 | Real multiplayer in v1? | **No — v1 is single-player with local save.** The whole game (lobby, 8 maps, 12 disasters, ranks, gems, shades) gets built and made fun first. Real multiplayer is **v2**, built on a Node + WebSocket server. Nothing in the design changes when multiplayer arrives — the lobby and nameplates are already built to show other players. |
| Q3 | Hoodie shade prices? | **Gem ladder below** (§12.1). First 4 shades free so you always have a choice; Divine stays the 100,000-gem trophy. |
| Q4 | Bookshelf — decoration or readable? | **Readable.** Press `E` on the bookshelf to open a book. Books hold disaster survival tips — one book per disaster, 12 books, plus a "How to play" book. This is the tutorial, hidden in plain sight. |
| Q5 | Can a username be changed? | **No.** You choose it once, you keep it — exactly as specified. A confirmation dialog warns you before locking it in. |
| Q6 | What if everyone runs out of energy before the timer ends? | **Round ends early.** Results screen shows "Everyone's heading back!" No wins, no gems awarded. Straight back to the lobby. |
| Q7 | How long is the disaster phase? | **60 seconds default**, tuned per disaster within 45–90s (§12.2). |

### 12.1 Hoodie shade prices

| Tier | Shades | Price |
|---|---|---|
| Starter (free) | Red, Green, Blue, Yellow | **0 gems** |
| Common | Orange, Purple, White, Black | **25 gems** |
| Uncommon | Cyan, Magenta, Grey, Brown | **50 gems** |
| Rare | Indigo, Tan, Peach, Cream | **100 gems** |
| Epic | Dark green, Light green, Yellow ochre | **500 gems** |
| **Legendary** | **Divine** (blue→purple gradient) | **100,000 gems** |

19 base shades + Divine = 20 total. Total to unlock every base shade: 1,800 gems.

### 12.2 Disaster phase lengths

| Disaster | Length | Disaster | Length |
|---|---|---|---|
| Volcanic eruption | 75s | Blizzard | 90s |
| Tsunami | 45s | Extreme heatwave | 90s |
| Tornado | 60s | Drought | 90s |
| Earthquake | 50s | Overgrown forest | 60s |
| Asteroid | 60s | Acid rain | 75s |
| Mudslide | 45s | Flood | 60s |

Fast, violent disasters (tsunami, mudslide, earthquake) are short. Slow drain disasters (blizzard, heatwave, drought) run long so your supplies actually matter.

---

## 13. Proposed Technical Approach

| Area | Choice | Why |
|---|---|---|
| Engine | **Three.js** (WebGL) in the browser | Runs anywhere, no install, right size for this project |
| Language | JavaScript (ES modules) | Simple, no build complexity |
| Build/dev | **Vite** | Instant dev server + hot reload |
| Physics | Lightweight custom capsule collision (or `cannon-es` if needed) | Full physics engine is overkill for this |
| Art | Cel-shaded anime geometry built in code, with canvas-painted faces | Matches the reference drawing, no art pipeline needed |
| Save data | `localStorage` for v1 (username, wins, gems, unlocked shades) | No server needed to start |
| Multiplayer (v2) | Node + WebSocket authoritative server | Only after single-player feels good |

---

## 14. Build Plan (phases)

| Phase | What gets built | Outcome |
|---|---|---|
| **P0 — Setup** ✅ | Project scaffold, Vite, Three.js, empty 3D scene | A window you can look around in |
| **P1 — Player** ✅ | Mouse-look camera, WASD movement, jump, collision | You can walk around |
| **P2 — Lobby** ✅ | Room, couch, carpet, table, benches, 10 plates, chandelier, bookshelf, portal with gradient + "ENTER GAME", sitting | The lobby from your drawing |
| **P3 — Identity** ✅ | Username picker, nameplate above head (name + wins + rank), save/load | You have a name and it shows |
| **P4 — Round loop** ✅ | Portal → queue → prepare timer → disaster phase → results → back to lobby | A full round runs end to end |
| **P5 — Maps** ✅ | All 8 maps built and randomly selected | Variety |
| **P6 — Disasters** ✅ | All 12 disasters with hazards, damage, survival rules, compatibility table | The actual game |
| **P7 — Supplies** ✅ | Supply spawning, pickup, hotbar, shelter placement | The prepare phase matters |
| **P8 — Progression** ✅ | Wins, gems, 12 ranks, rank-up banner | Reason to keep playing |
| **P9 — Customisation** ✅ | 19 shades + Divine gradient, shop menu, gem spending, **Roulette machine + spin animation** | Make your guy yours |
| **P10 — Polish** ✅ | Sound, particles, screen shake, menus, tutorial books | Feels finished |
| **V2 (later)** | Real multiplayer server | Play with friends |

---

## 15. Success Criteria for v1

- A full round completes with no crashes on any of the 8 maps with any compatible disaster.
- Movement and mouse-look feel smooth at 60 fps.
- All 12 disasters are survivable with good play and lethal with bad play.
- Wins, gems, rank and jacket colour persist after closing and reopening the game.
- No chat anywhere in the game.
- **No real-money purchases anywhere in the game** — no payment code, no payment dependency, no store, no ads. Every gem in a player's balance was earned by surviving a disaster.
