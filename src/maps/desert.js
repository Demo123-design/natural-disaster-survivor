// Desert (PRD section 5, map 2).
//
// Open sand, dunes you can walk over, cacti, and a ruin at the centre. The
// ruin's tower is the high ground; a rock shelf at the edge is the second.

import * as THREE from 'three';
import { toon, part } from '../materials.js';
import {
  startMap, finishMap, ground, terrace, boundary, scatter, rock, solid, overhang,
} from './common.js';

export const DESERT = {
  id: 'desert',
  name: 'Desert',
  halfSize: 36,
  peakHeight: 7.2,
  sky: 0xf0cf96,
  fog: { color: 0xeccb93, near: 34, far: 110 },
};

const SAND = 0xdcb973;
const SAND_DARK = 0xc7a158;
const STONE = 0xbfa47c;
const STONE_DARK = 0x9c8360;
const CACTUS = 0x3f7d4a;

/** A sand dune: a wide flattened dome, low enough to walk straight over. */
function dune(group, x, z, radius, height) {
  const mesh = part(
    new THREE.SphereGeometry(radius, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2),
    toon(SAND_DARK),
    x, 0, z, group,
    { outline: false, receive: true },
  );
  mesh.scale.y = height / radius;
  mesh.receiveShadow = true;
  return mesh;
}

function cactus(group, collision, x, z, scale, random) {
  const plant = new THREE.Group();
  plant.position.set(x, 0, z);
  plant.rotation.y = random() * Math.PI * 2;
  group.add(plant);

  const height = 2.6 * scale;
  part(new THREE.CapsuleGeometry(0.34 * scale, height, 4, 10), toon(CACTUS),
    0, height / 2 + 0.3, 0, plant, { outlineScale: 1.07 });

  for (const side of [-1, 1]) {
    if (random() < 0.35) continue;
    const arm = part(new THREE.CapsuleGeometry(0.22 * scale, 1.1 * scale, 4, 8), toon(CACTUS),
      side * 0.62 * scale, height * 0.72, 0, plant, { outlineScale: 1.08 });
    arm.rotation.z = side * -0.5;
  }

  solid(collision, x, 0, z, 0.9 * scale, height, 0.9 * scale);
}

export function createDesertMap(scene) {
  const { group, collision } = startMap(scene);

  ground(group, { size: DESERT.halfSize * 2, color: SAND, patchColor: SAND_DARK, patches: 18, seed: 12 });

  // The ruin: a broken wall ring with a stepped tower in one corner.
  const ruin = new THREE.Group();
  group.add(ruin);
  const wallMat = toon(STONE);

  const segments = [
    { x: -7, z: -7, w: 14, d: 0.9, h: 2.6 },
    { x: -7, z: 7, w: 9, d: 0.9, h: 1.9 },
    { x: -7.5, z: 0, w: 0.9, d: 14, h: 2.2 },
    { x: 7.5, z: 2, w: 0.9, d: 9, h: 3.0 },
  ];
  for (const seg of segments) {
    const mesh = part(new THREE.BoxGeometry(seg.w, seg.h, seg.d), wallMat,
      seg.x, seg.h / 2, seg.z, ruin, { outlineScale: 1.02, receive: true });
    mesh.castShadow = true;
    solid(collision, seg.x, 0, seg.z, seg.w, seg.h, seg.d);
  }

  // Part of the ruin still has its roof, and there is a rock overhang out in
  // the open. Without shade the heatwave here is a death sentence.
  overhang(group, collision, {
    x: -4, z: 2, width: 9, depth: 9, clearance: 3.0, color: STONE, pillarColor: STONE_DARK,
  });
  overhang(group, collision, {
    x: 20, z: 17, width: 11, depth: 8, clearance: 3.4, color: 0xa88a62, pillarColor: 0x8d7049,
  });

  const tower = terrace(group, collision, {
    x: 6, z: -6, levels: 9, width: 9.5, depth: 9.5, shrink: 0.9,
    colors: [STONE, STONE_DARK],
  });

  // A rock shelf away from the ruin, so the two shelters are far apart.
  const shelf = terrace(group, collision, {
    x: -22, z: 19, levels: 9, width: 16, depth: 14,
    colors: [0xb08f63, 0x8d7049],
  });

  const keepClear = [
    { x: 0, z: 0, r: 14 },
    { x: -22, z: 19, r: 12 },
    { x: 0, z: 26, r: 6 },
  ];

  scatter({ halfSize: DESERT.halfSize, count: 34, keepClear, seed: 300, minScale: 0.8, maxScale: 1.5 },
    (x, z, scale, random) => cactus(group, collision, x, z, scale, random));
  scatter({ halfSize: DESERT.halfSize, count: 24, keepClear, seed: 301, minScale: 0.5, maxScale: 1.3 },
    (x, z, scale, random) => rock(group, collision, x, z, scale, random, 0xa88a62));
  scatter({ halfSize: DESERT.halfSize, count: 16, keepClear, seed: 302, minScale: 4, maxScale: 9 },
    (x, z, scale) => dune(group, x, z, scale, 0.9 + scale * 0.12));

  boundary(collision, DESERT.halfSize);

  return finishMap(scene, group, collision, DESERT, new THREE.Vector3(0, 0, 26), {
    shelters: { tower: tower.top, shelf: shelf.top },
  });
}
