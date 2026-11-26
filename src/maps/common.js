// Shared map-building tools.
//
// Every map is a bounded arena with at least two ways to get high, because a
// flood or a tsunami is only survivable if there is somewhere to climb. The
// rules that make that work are here rather than copied into eight files.
//
// The important one is RISE. A jump clears about 1.1m, so any ledge the
// player is meant to reach sits 0.8m above the last one. Phase 4 shipped a
// map with 2.4m steps and it could not be climbed at all.

import * as THREE from 'three';
import { CollisionWorld } from '../collision.js';
import { toon, part } from '../materials.js';

/** The vertical step between climbable ledges, in metres. */
export const RISE = 0.8;
/** Every map puts its highest standing point at least this high. */
export const SAFE_HEIGHT = 7.0;

/**
 * Deterministic pseudo-random. Maps are laid out the same way every time:
 * a map that reshuffles itself cannot be learned, and learning the map is
 * most of how you survive.
 */
export function makeRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

/** Adds a box collider from a centre-on-the-floor position and a size. */
export function solid(collision, x, y, z, width, height, depth) {
  const half = new THREE.Vector3(width / 2, height / 2, depth / 2);
  const centre = new THREE.Vector3(x, y + height / 2, z);
  return collision.addBox(
    new THREE.Box3(centre.clone().sub(half), centre.clone().add(half)),
  );
}

/** A flat ground plane with optional darker patches for texture. */
export function ground(group, { size, color, patchColor, patches = 12, seed = 3 }) {
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(size, size), toon(color));
  plane.rotation.x = -Math.PI / 2;
  plane.receiveShadow = true;
  group.add(plane);

  if (!patchColor) return plane;

  const random = makeRandom(seed);
  const material = toon(patchColor);
  for (let i = 0; i < patches; i += 1) {
    const radius = (2 + random() * 4) * (size / 68);
    const patch = new THREE.Mesh(new THREE.CircleGeometry(radius, 10), material);
    patch.rotation.x = -Math.PI / 2;
    patch.position.set((random() - 0.5) * size * 0.85, 0.012, (random() - 0.5) * size * 0.85);
    patch.receiveShadow = true;
    group.add(patch);
  }
  return plane;
}

/**
 * A stepped mound: concentric boxes, each RISE taller and narrower than the
 * one below, so every level has a ledge wide enough to stand on and jump
 * from. This is how every map provides its high ground.
 *
 * @returns {{top: number}} the height of the summit
 */
export function terrace(
  group,
  collision,
  {
    x = 0,
    z = 0,
    levels = 9,
    width = 18,
    depth = 16,
    /** How much narrower each level is, total across both sides. */
    shrink = 1.8,
    colors = [0x7b8089, 0x5f656d],
    rise = RISE,
  },
) {
  let top = 0;

  for (let i = 0; i < levels; i += 1) {
    const height = rise * (i + 1);
    const w = width - i * shrink;
    const d = depth - i * shrink * 0.9;
    if (w <= 1.5 || d <= 1.5) break;

    const mesh = part(
      new THREE.BoxGeometry(w, height, d),
      toon(colors[i % colors.length]),
      x,
      height / 2,
      z,
      group,
      { outlineScale: 1.012, receive: true },
    );
    mesh.castShadow = true;
    solid(collision, x, 0, z, w, height, d);
    top = height;
  }

  return { top };
}

/**
 * A flight of steps leading up to a platform, rising RISE at a time.
 * Used for the things a terrace cannot be: cabin roofs, towers, mesas.
 *
 * `dirX`/`dirZ` point from the bottom step towards the platform.
 */
export function stairs(
  group,
  collision,
  { x, z, dirX = 1, dirZ = 0, steps = 5, width = 1.8, run = 1.0, color = 0x6b5338, visible = true },
) {
  for (let i = 0; i < steps; i += 1) {
    const height = RISE * (i + 1);
    const sx = x + dirX * run * i;
    const sz = z + dirZ * run * i;
    // Across the direction of travel, so the tread is always wide enough.
    const w = dirX !== 0 ? run * 1.7 : width;
    const d = dirX !== 0 ? width : run * 1.7;

    if (visible) {
      const mesh = part(
        new THREE.BoxGeometry(w, height, d),
        toon(color),
        sx,
        height / 2,
        sz,
        group,
        { outlineScale: 1.02, receive: true },
      );
      mesh.castShadow = true;
    }
    solid(collision, sx, 0, sz, w, height, d);
  }

  return { top: RISE * steps };
}

/**
 * A roof held up on pillars, with the space underneath left open.
 *
 * This is what "shelter" means to the blizzard, the heatwave and the acid
 * rain: somewhere with something overhead. A map that pairs with any of
 * those disasters must have at least one, or that match cannot be survived.
 *
 * @returns {{roofTop: number}}
 */
export function overhang(
  group,
  collision,
  { x, z, width = 10, depth = 8, clearance = 3.2, color = 0x8a8a90, pillarColor = null, pillars = true },
) {
  const thickness = 0.5;

  if (pillars) {
    const pillarMat = toon(pillarColor ?? color);
    for (const dx of [-1, 1]) {
      for (const dz of [-1, 1]) {
        const px = x + dx * (width / 2 - 0.7);
        const pz = z + dz * (depth / 2 - 0.7);
        const post = part(
          new THREE.BoxGeometry(0.7, clearance, 0.7), pillarMat,
          px, clearance / 2, pz, group, { outlineScale: 1.05 },
        );
        post.castShadow = true;
        solid(collision, px, 0, pz, 0.7, clearance, 0.7);
      }
    }
  }

  const roof = part(
    new THREE.BoxGeometry(width, thickness, depth), toon(color),
    x, clearance + thickness / 2, z, group,
    { outlineScale: 1.02, receive: true },
  );
  roof.castShadow = true;
  solid(collision, x, clearance, z, width, thickness, depth);

  return { roofTop: clearance + thickness };
}

/**
 * The edge of the map: a wall you cannot cross, hidden behind whatever the
 * map uses to mark its boundary.
 */
export function boundary(collision, halfSize, height = 16) {
  const thickness = 3;
  const span = halfSize * 2 + thickness * 2;
  solid(collision, 0, 0, -halfSize - thickness / 2, span, height, thickness);
  solid(collision, 0, 0, halfSize + thickness / 2, span, height, thickness);
  solid(collision, -halfSize - thickness / 2, 0, 0, thickness, height, span);
  solid(collision, halfSize + thickness / 2, 0, 0, thickness, height, span);
}

/**
 * Scatters props across the map, skipping anywhere that has to stay clear.
 *
 * @param {(x: number, z: number, scale: number, random: () => number) => void} place
 */
export function scatter(
  { halfSize, count, keepClear = [], margin = 6, seed = 11, minScale = 0.8, maxScale = 1.5 },
  place,
) {
  const random = makeRandom(seed);
  const reach = halfSize - margin;

  for (let i = 0; i < count; i += 1) {
    const x = (random() - 0.5) * reach * 2;
    const z = (random() - 0.5) * reach * 2;
    if (keepClear.some((c) => Math.hypot(x - c.x, z - c.z) < c.r)) continue;
    place(x, z, minScale + random() * (maxScale - minScale), random);
  }
}

/** A conifer: trunk plus two cones. Only the trunk is solid. */
export function conifer(group, collision, x, z, scale, random, { bark = 0x5a3f2c, leaf = 0x2f7a3b, leafLight = 0x3f9449 } = {}) {
  const tree = new THREE.Group();
  tree.position.set(x, 0, z);
  tree.rotation.y = random() * Math.PI * 2;
  group.add(tree);

  const trunkHeight = 3.2 * scale;
  const trunkRadius = 0.28 * scale;
  part(
    new THREE.CylinderGeometry(trunkRadius * 0.82, trunkRadius, trunkHeight, 8),
    toon(bark),
    0, trunkHeight / 2, 0, tree, { outlineScale: 1.09 },
  );
  part(
    new THREE.ConeGeometry(1.6 * scale, 2.9 * scale, 9),
    toon(leaf),
    0, trunkHeight + 1.0 * scale, 0, tree, { outlineScale: 1.05 },
  );
  part(
    new THREE.ConeGeometry(1.15 * scale, 2.3 * scale, 9),
    toon(leafLight),
    0, trunkHeight + 2.6 * scale, 0, tree, { outlineScale: 1.05 },
  );

  // Walking through foliage three metres overhead would be absurd to block.
  solid(collision, x, 0, z, trunkRadius * 2.2, trunkHeight, trunkRadius * 2.2);
  return tree;
}

/** A lumpy rock. */
export function rock(group, collision, x, z, size, random, color = 0x7b8089) {
  const mesh = part(
    new THREE.DodecahedronGeometry(size, 0),
    toon(color),
    x, size * 0.55, z, group,
    { outlineScale: 1.06, receive: true },
  );
  mesh.rotation.set(random(), random() * 3, random());
  solid(collision, x, 0, z, size * 1.6, size * 1.1, size * 1.6);
  return mesh;
}

/**
 * Wraps a built map in the shape the round controller expects, including
 * disposal, so no map has to remember to write it.
 */
export function finishMap(scene, group, collision, info, spawn, extra = {}) {
  return {
    group,
    collision,
    info,
    spawn,
    ...extra,

    dispose() {
      scene.remove(group);
      group.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
          for (const m of materials) m.dispose();
        }
      });
    },
  };
}

/** Creates the scene group and collision world every map starts with. */
export function startMap(scene, { groundY = 0 } = {}) {
  const group = new THREE.Group();
  scene.add(group);
  const collision = new CollisionWorld();
  collision.groundY = groundY;
  return { group, collision };
}
