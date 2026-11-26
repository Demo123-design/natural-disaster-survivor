// Supplies (PRD section 7).
//
// Scattered around the map during the prepare phase, picked up with `E`, held
// in a five-slot hotbar and used with a left click.
//
// The shelter items are the interesting ones: placing a tarp builds a real
// roof in the world, and "sheltered" already means "something overhead", so
// the blizzard, the heatwave and the acid rain all respect it without any of
// them knowing that supplies exist.

import * as THREE from 'three';
import { toon, part } from './materials.js';
import { makeRandom, solid } from './maps/common.js';

/**
 * @typedef {object} Item
 * @property {string} id
 * @property {string} name
 * @property {'food'|'water'|'shelter'|'material'} kind
 * @property {string} short two or three letters for the hotbar
 * @property {number} color
 * @property {string} use what a left click does, shown in the HUD
 */

export const ITEMS = {
  // --- Food: energy back ---------------------------------------------------
  cannedFood: { id: 'cannedFood', name: 'Canned food', kind: 'food', short: 'CAN', color: 0xb4603a, energy: 35 },
  bread:      { id: 'bread',      name: 'Bread',       kind: 'food', short: 'BRD', color: 0xd9a65a, energy: 25 },
  fruit:      { id: 'fruit',      name: 'Fruit',       kind: 'food', short: 'FRT', color: 0xe05a4a, energy: 20 },

  // --- Water: stops heat and thirst draining you ---------------------------
  water: { id: 'water', name: 'Water bottle', kind: 'water', short: 'H2O', color: 0x53b7e8, seconds: 30 },

  // --- Shelter: placed, and then it is simply a roof -----------------------
  umbrella: { id: 'umbrella', name: 'Umbrella', kind: 'shelter', short: 'UMB', color: 0xcf4f6f, span: 3.2, clearance: 2.4 },
  tarp:     { id: 'tarp',     name: 'Tarp',     kind: 'shelter', short: 'TRP', color: 0x3f8f6a, span: 5.0, clearance: 2.6 },
  tent:     { id: 'tent',     name: 'Tent',     kind: 'shelter', short: 'TNT', color: 0xd4a04a, span: 6.4, clearance: 2.8 },

  // --- Materials -----------------------------------------------------------
  torch:     { id: 'torch',     name: 'Torch',     kind: 'material', short: 'TCH', color: 0xf0a63c, seconds: 45 },
  axe:       { id: 'axe',       name: 'Axe',       kind: 'material', short: 'AXE', color: 0x9aa3ab, radius: 6 },
};

/** What a left click does with each item, for the prompt line. */
export const USE_TEXT = {
  food: 'eat',
  water: 'drink',
  shelter: 'place',
  material: 'use',
};

const SPAWN_TABLE = [
  ITEMS.cannedFood, ITEMS.bread, ITEMS.fruit,
  ITEMS.water, ITEMS.water,
  ITEMS.umbrella, ITEMS.tarp, ITEMS.tent,
  ITEMS.torch, ITEMS.axe,
];

const PICKUP_RANGE = 2.0;

/** A small floating marker so a supply can be spotted across the map. */
function buildPickup(item) {
  const group = new THREE.Group();

  const body = part(
    new THREE.BoxGeometry(0.52, 0.52, 0.52),
    toon(item.color),
    0, 0, 0, group,
    { outlineScale: 1.1 },
  );
  body.castShadow = true;

  // A pale glow underneath, which is what you actually notice at distance.
  const halo = new THREE.Mesh(
    new THREE.CircleGeometry(0.7, 16),
    new THREE.MeshBasicMaterial({ color: item.color, transparent: true, opacity: 0.35, depthWrite: false }),
  );
  halo.rotation.x = -Math.PI / 2;
  halo.position.y = -0.6;
  group.add(halo);

  return group;
}

export function createSupplies(scene, map, { count = 26, seed = 9090 } = {}) {
  const random = makeRandom(seed);
  const reach = map.info.halfSize - 8;
  const probe = new THREE.Vector3();

  /** @type {Array<{item: Item, mesh: THREE.Group, position: THREE.Vector3, taken: boolean}>} */
  const pickups = [];

  for (let i = 0; i < count; i += 1) {
    const item = SPAWN_TABLE[Math.floor(random() * SPAWN_TABLE.length)];

    // Place it on whatever the ground is at that point, so supplies sit on
    // rooftops and ledges as happily as on grass.
    const x = (random() - 0.5) * reach * 2;
    const z = (random() - 0.5) * reach * 2;
    probe.set(x, 40, z);
    const y = map.collision.supportHeight(probe, 0.4);
    if (!Number.isFinite(y)) continue;

    const mesh = buildPickup(item);
    mesh.position.set(x, y + 0.9, z);
    scene.add(mesh);

    pickups.push({ item, mesh, position: new THREE.Vector3(x, y, z), taken: false });
  }

  /** Roofs the player has put up. */
  const placed = [];

  return {
    pickups,

    /** The nearest supply within reach, or null. */
    nearest(position) {
      let best = null;
      let bestDistance = PICKUP_RANGE;
      for (const pickup of pickups) {
        if (pickup.taken) continue;
        const distance = Math.hypot(
          pickup.position.x - position.x,
          pickup.position.z - position.z,
        );
        if (distance < bestDistance && Math.abs(pickup.position.y - position.y) < 2.5) {
          best = pickup;
          bestDistance = distance;
        }
      }
      return best;
    },

    take(pickup) {
      pickup.taken = true;
      scene.remove(pickup.mesh);
      return pickup.item;
    },

    /**
     * Puts up a shelter. The roof is registered as a collider, which is what
     * makes every cover-based disaster respect it.
     */
    place(item, position) {
      const group = new THREE.Group();
      scene.add(group);

      const half = item.span / 2;
      const top = position.y + item.clearance;

      const roof = part(
        new THREE.BoxGeometry(item.span, 0.26, item.span),
        toon(item.color),
        position.x, top + 0.13, position.z, group,
        { outlineScale: 1.03, receive: true },
      );
      roof.castShadow = true;

      const postMat = toon(0x6b5a44);
      const posts = item.id === 'umbrella'
        ? [[0, 0]]
        : [[-half + 0.35, -half + 0.35], [half - 0.35, -half + 0.35],
           [-half + 0.35, half - 0.35], [half - 0.35, half - 0.35]];

      for (const [dx, dz] of posts) {
        const post = part(
          new THREE.CylinderGeometry(0.1, 0.12, item.clearance, 7),
          postMat,
          position.x + dx, position.y + item.clearance / 2, position.z + dz,
          group, { outlineScale: 1.1 },
        );
        post.castShadow = true;
      }

      solid(map.collision, position.x, top, position.z, item.span, 0.26, item.span);
      placed.push(group);
      return { top: top + 0.26 };
    },

    /** Bobbing, so supplies read as collectable rather than as scenery. */
    update(elapsed) {
      for (let i = 0; i < pickups.length; i += 1) {
        const pickup = pickups[i];
        if (pickup.taken) continue;
        pickup.mesh.position.y = pickup.position.y + 0.9 + Math.sin(elapsed * 2 + i) * 0.12;
        pickup.mesh.rotation.y = elapsed * 0.8 + i;
      }
    },

    dispose() {
      for (const pickup of pickups) {
        if (!pickup.taken) scene.remove(pickup.mesh);
      }
      for (const group of placed) scene.remove(group);
    },
  };
}
