// Badlands (PRD section 5, map 8).
//
// Dry canyons and flat-topped mesas. The mesas are the high ground and the
// riverbeds are the low ground, so the same map reads very differently to a
// flood and to a tornado.

import * as THREE from 'three';
import { toon, part } from '../materials.js';
import {
  startMap, finishMap, ground, terrace, stairs, boundary, scatter, rock, solid, overhang,
} from './common.js';

export const BADLANDS = {
  id: 'badlands',
  name: 'Badlands',
  halfSize: 36,
  peakHeight: 8.8,
  sky: 0xe6b584,
  fog: { color: 0xdcb189, near: 32, far: 108 },
};

const DIRT = 0xb07a4e;
const DIRT_DARK = 0x90603c;
const MESA = 0xc08a56;
const MESA_DARK = 0x9a6840;
const BED = 0xcaa178;

export function createBadlandsMap(scene) {
  const { group, collision } = startMap(scene);

  ground(group, { size: BADLANDS.halfSize * 2, color: DIRT, patchColor: DIRT_DARK, patches: 20, seed: 77 });

  // Dry riverbeds: strips of pale sand, flat and purely visual.
  const bedMat = toon(BED);
  for (const [x, z, w, d, rot] of [[-8, 6, 56, 7, 0.4], [14, -12, 44, 5, -0.9]]) {
    const bed = new THREE.Mesh(new THREE.PlaneGeometry(w, d), bedMat);
    bed.rotation.x = -Math.PI / 2;
    bed.rotation.z = rot;
    bed.position.set(x, 0.02, z);
    bed.receiveShadow = true;
    group.add(bed);
  }

  // Two mesas of different heights, each climbable by its own stepped sides.
  const big = terrace(group, collision, {
    x: -17, z: -14, levels: 11, width: 22, depth: 19, shrink: 1.8,
    colors: [MESA, MESA_DARK],
  });
  const small = terrace(group, collision, {
    x: 18, z: 15, levels: 8, width: 17, depth: 15, shrink: 1.9,
    colors: [MESA_DARK, MESA],
  });

  // A canyon wall along one side, with a stair up onto it.
  const wallHeight = 6.4;
  part(new THREE.BoxGeometry(9, wallHeight, 40), toon(MESA_DARK),
    -30, wallHeight / 2, 12, group, { outlineScale: 1.02, receive: true });
  solid(collision, -30, 0, 12, 9, wallHeight, 40);
  stairs(group, collision, {
    x: -24.4, z: 12, dirX: -1, dirZ: 0, steps: 8, run: 1.1, width: 3.0, color: MESA,
  });

  // A shaded hollow under the canyon wall, and a second overhang out in the
  // open. The PRD lists caves and canyon walls as Badlands shelter, and the
  // heatwave and acid rain both need somewhere with a roof.
  overhang(group, collision, {
    x: -22, z: 12, width: 9, depth: 12, clearance: 3.2,
    color: MESA_DARK, pillarColor: MESA,
  });
  overhang(group, collision, {
    x: 6, z: -22, width: 10, depth: 8, clearance: 3.0, color: MESA, pillarColor: MESA_DARK,
  });

  const keepClear = [
    { x: -17, z: -14, r: 16 },
    { x: -22, z: 12, r: 10 },
    { x: 6, z: -22, r: 9 },
    { x: 18, z: 15, r: 13 },
    { x: -30, z: 12, r: 14 },
    { x: 8, z: 26, r: 6 },
  ];

  scatter({ halfSize: BADLANDS.halfSize, count: 34, keepClear, seed: 1000, minScale: 0.6, maxScale: 2.0 },
    (x, z, scale, random) => rock(group, collision, x, z, scale, random, random() > 0.5 ? MESA : DIRT_DARK));

  // Dead shrubs, for something at eye level.
  scatter({ halfSize: BADLANDS.halfSize, count: 22, keepClear, seed: 1001, minScale: 0.6, maxScale: 1.2 },
    (x, z, scale, random) => {
      const bush = part(new THREE.DodecahedronGeometry(0.7 * scale, 0), toon(0x7b6a44),
        x, 0.55 * scale, z, group, { outlineScale: 1.07 });
      bush.rotation.set(random(), random() * 3, random());
      bush.scale.y = 0.7;
    });

  boundary(collision, BADLANDS.halfSize, 24);

  return finishMap(scene, group, collision, BADLANDS, new THREE.Vector3(8, 0, 26), {
    shelters: { bigMesa: big.top, smallMesa: small.top, canyonWall: wallHeight },
  });
}
