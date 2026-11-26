// Tundra (PRD section 5, map 4).
//
// Flat ice, snow drifts and a frozen lake. Being flat is the point, so the
// high ground is built: an ice shelf and a stilted hut.

import * as THREE from 'three';
import { toon, part } from '../materials.js';
import {
  startMap, finishMap, ground, terrace, stairs, boundary, scatter, rock, solid,
} from './common.js';

export const TUNDRA = {
  id: 'tundra',
  name: 'Tundra',
  halfSize: 34,
  peakHeight: 7.2,
  sky: 0xcfe2f0,
  fog: { color: 0xdceaf4, near: 24, far: 88 },
};

const SNOW = 0xe9f1f6;
const SNOW_SHADE = 0xd2e0ea;
const ICE = 0xa8d4e6;
const HUT = 0x5e6b73;

export function createTundraMap(scene) {
  const { group, collision } = startMap(scene);

  ground(group, { size: TUNDRA.halfSize * 2, color: SNOW, patchColor: SNOW_SHADE, patches: 16, seed: 21 });

  // The frozen lake: flat, slightly blue, and nothing stands on it.
  const lake = new THREE.Mesh(new THREE.CircleGeometry(13, 24), toon(ICE));
  lake.rotation.x = -Math.PI / 2;
  lake.position.set(12, 0.03, -10);
  lake.receiveShadow = true;
  group.add(lake);

  const shelf = terrace(group, collision, {
    x: -16, z: -12, levels: 9, width: 17, depth: 15, shrink: 1.7,
    colors: [SNOW, ICE],
  });

  // A hut on stilts, reached by a ramp of ice blocks.
  const deckHeight = 5.6;
  const hutX = 16;
  const hutZ = 14;
  for (const [dx, dz] of [[-3.2, -3.2], [3.2, -3.2], [-3.2, 3.2], [3.2, 3.2]]) {
    part(new THREE.CylinderGeometry(0.3, 0.34, deckHeight, 8), toon(HUT),
      hutX + dx, deckHeight / 2, hutZ + dz, group, { outlineScale: 1.08 });
    solid(collision, hutX + dx, 0, hutZ + dz, 0.8, deckHeight, 0.8);
  }
  const deck = part(new THREE.BoxGeometry(9, 0.4, 9), toon(0x7b8792),
    hutX, deckHeight + 0.2, hutZ, group, { outlineScale: 1.02, receive: true });
  deck.castShadow = true;
  solid(collision, hutX, deckHeight, hutZ, 9, 0.4, 9);

  const H = 2.6;
  const wallMat = toon(HUT);
  for (const [dx, dz, w, d] of [[0, -4.2, 8, 0.4], [-4.2, 0, 0.4, 8], [4.2, 0, 0.4, 8]]) {
    part(new THREE.BoxGeometry(w, H, d), wallMat, hutX + dx, deckHeight + 0.4 + H / 2, hutZ + dz,
      group, { receive: true });
    solid(collision, hutX + dx, deckHeight + 0.4, hutZ + dz, w, H, d);
  }
  const roof = part(new THREE.BoxGeometry(9.4, 0.35, 9.4), toon(SNOW),
    hutX, deckHeight + 0.4 + H + 0.18, hutZ, group, { outlineScale: 1.02 });
  roof.castShadow = true;
  solid(collision, hutX, deckHeight + 0.4 + H, hutZ, 9.4, 0.35, 9.4);

  stairs(group, collision, {
    x: hutX, z: hutZ + 11.2, dirX: 0, dirZ: -1,
    steps: 7, run: 1.1, width: 2.6, color: ICE,
  });

  const keepClear = [
    { x: -16, z: -12, r: 13 },
    { x: 16, z: 14, r: 12 },
    { x: 12, z: -10, r: 14 },
    { x: -14, z: 24, r: 6 },
  ];

  // Snow drifts: low mounds you walk over, not around.
  scatter({ halfSize: TUNDRA.halfSize, count: 22, keepClear, seed: 700, minScale: 3, maxScale: 7 },
    (x, z, scale) => {
      const drift = part(new THREE.SphereGeometry(scale, 12, 7, 0, Math.PI * 2, 0, Math.PI / 2),
        toon(SNOW_SHADE), x, 0, z, group, { outline: false, receive: true });
      drift.scale.y = 0.16;
    });
  scatter({ halfSize: TUNDRA.halfSize, count: 16, keepClear, seed: 701, minScale: 0.6, maxScale: 1.5 },
    (x, z, scale, random) => rock(group, collision, x, z, scale, random, 0x8e9aa4));

  boundary(collision, TUNDRA.halfSize);

  return finishMap(scene, group, collision, TUNDRA, new THREE.Vector3(-14, 0, 24), {
    shelters: { shelf: shelf.top, hutRoof: deckHeight + 0.4 + H + 0.35 },
  });
}
