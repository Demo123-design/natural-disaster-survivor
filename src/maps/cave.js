// Cave (PRD section 5, map 5).
//
// Enclosed, dark, with a ceiling and side alcoves. The roof is what makes
// this map different: it is the one place a disaster cannot see the sky, so
// the lighting is its own and the exits are ledges rather than open ground.

import * as THREE from 'three';
import { toon, part } from '../materials.js';
import {
  startMap, finishMap, ground, terrace, stairs, boundary, scatter, rock, solid, makeRandom,
} from './common.js';

export const CAVE = {
  id: 'cave',
  name: 'Cave',
  halfSize: 28,
  peakHeight: 7.2,
  sky: 0x0d0f16,
  fog: { color: 0x11141d, near: 16, far: 58 },
  /** The cave lights itself; daylight would come through solid rock. */
  indoor: true,
};

const STONE = 0x5b5a63;
const STONE_DARK = 0x45444d;
const STONE_WET = 0x4e5a63;
const POOL = 0x2c6b7a;

export function createCaveMap(scene) {
  const { group, collision } = startMap(scene);

  ground(group, { size: CAVE.halfSize * 2, color: STONE_DARK, patchColor: 0x3a3942, patches: 14, seed: 66 });

  // The ceiling. High enough not to feel like a corridor, low enough to read
  // as underground.
  const ceiling = part(new THREE.BoxGeometry(CAVE.halfSize * 2, 1.2, CAVE.halfSize * 2),
    toon(STONE_DARK), 0, 14.6, 0, group, { outline: false });
  ceiling.receiveShadow = true;
  solid(collision, 0, 14, 0, CAVE.halfSize * 2, 1.2, CAVE.halfSize * 2);

  // Stalactites hanging from it, and stalagmites below.
  const random = makeRandom(909);
  for (let i = 0; i < 46; i += 1) {
    const x = (random() - 0.5) * CAVE.halfSize * 1.8;
    const z = (random() - 0.5) * CAVE.halfSize * 1.8;
    const length = 1.6 + random() * 3.4;
    const spike = part(new THREE.ConeGeometry(0.4 + random() * 0.35, length, 7),
      toon(STONE), x, 14 - length / 2, z, group, { outlineScale: 1.05 });
    spike.rotation.x = Math.PI;

    if (random() < 0.45) {
      const up = 1.0 + random() * 2.0;
      part(new THREE.ConeGeometry(0.45 + random() * 0.4, up, 7), toon(STONE),
        x + (random() - 0.5) * 2, up / 2, z + (random() - 0.5) * 2, group, { outlineScale: 1.05 });
      solid(collision, x, 0, z, 1.0, up, 1.0);
    }
  }

  // The underground pool.
  const pool = new THREE.Mesh(new THREE.CircleGeometry(7.5, 20), toon(POOL, { transparent: true, opacity: 0.85 }));
  pool.rotation.x = -Math.PI / 2;
  pool.position.set(10, 0.04, 8);
  group.add(pool);

  // High ledges: the way out of a rising flood down here.
  const ledge = terrace(group, collision, {
    x: -14, z: -10, levels: 9, width: 16, depth: 14, shrink: 1.7,
    colors: [STONE, STONE_WET],
  });

  // A side alcove: a raised shelf against the wall, reached by steps.
  const alcoveHeight = 5.6;
  const shelf = part(new THREE.BoxGeometry(12, alcoveHeight, 7), toon(STONE_DARK),
    16, alcoveHeight / 2, -17, group, { outlineScale: 1.02, receive: true });
  shelf.castShadow = true;
  solid(collision, 16, 0, -17, 12, alcoveHeight, 7);
  stairs(group, collision, { x: 16, z: -9.6, dirX: 0, dirZ: -1, steps: 7, run: 1.1, width: 2.6, color: STONE });

  const keepClear = [
    { x: -14, z: -10, r: 12 },
    { x: 16, z: -17, r: 11 },
    { x: 10, z: 8, r: 9 },
    { x: -6, z: 20, r: 6 },
  ];
  scatter({ halfSize: CAVE.halfSize, count: 22, keepClear, margin: 5, seed: 910, minScale: 0.6, maxScale: 1.8 },
    (x, z, scale, r) => rock(group, collision, x, z, scale, r, STONE));

  boundary(collision, CAVE.halfSize, 20);

  // Lights, because there is no sky down here.
  const glow = new THREE.PointLight(0x9fd6e8, 18, 34, 2);
  glow.position.set(10, 5, 8);
  group.add(glow);
  const lamp = new THREE.PointLight(0xffc98a, 16, 30, 2);
  lamp.position.set(-12, 7, -8);
  group.add(lamp);

  return finishMap(scene, group, collision, CAVE, new THREE.Vector3(-6, 0, 20), {
    shelters: { ledge: ledge.top, alcove: alcoveHeight },
  });
}
