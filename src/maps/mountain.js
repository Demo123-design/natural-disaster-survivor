// Mountain (PRD section 5, map 3).
//
// A big terraced peak in the middle with boulders and snow caps. The peak is
// the obvious high ground; a cabin on a ledge gives a second option that is
// quicker to reach from the spawn.

import * as THREE from 'three';
import { toon, part } from '../materials.js';
import {
  startMap, finishMap, ground, terrace, stairs, boundary, scatter,
  conifer, rock, solid,
} from './common.js';

export const MOUNTAIN = {
  id: 'mountain',
  name: 'Mountain',
  halfSize: 36,
  peakHeight: 12.0,
  sky: 0xa8c8e4,
  fog: { color: 0xc3d6e4, near: 30, far: 105 },
};

const SLOPE = 0x6f7466;
const SLOPE_DARK = 0x565b50;
const SNOW = 0xeef3f7;
const CABIN = 0x6b4a30;

export function createMountainMap(scene) {
  const { group, collision } = startMap(scene);

  ground(group, { size: MOUNTAIN.halfSize * 2, color: 0x5c6b52, patchColor: 0x4a573f, patches: 14, seed: 8 });

  // The peak: fifteen terraces, so it is genuinely tall and still climbable.
  const peak = terrace(group, collision, {
    x: 0, z: -4, levels: 15, width: 30, depth: 27, shrink: 1.9,
    colors: [SLOPE, SLOPE_DARK],
  });

  // A snow cap sitting on the summit. Kept narrower than the top terrace:
  // a wider cap overhangs the ledge below it and turns the last step into a
  // 1.25m reach, which is more than a jump.
  part(new THREE.BoxGeometry(3.0, 0.45, 2.6), toon(SNOW), 0, peak.top + 0.22, -4, group,
    { outlineScale: 1.03, receive: true });
  solid(collision, 0, peak.top, -4, 3.0, 0.45, 2.6);

  // A cabin on a ledge partway up, reached by its own stairs from the ground.
  const ledgeHeight = 4.8;
  const cabinX = -19;
  const cabinZ = 16;
  const platform = part(new THREE.BoxGeometry(10, ledgeHeight, 9), toon(SLOPE_DARK),
    cabinX, ledgeHeight / 2, cabinZ, group, { outlineScale: 1.02, receive: true });
  platform.castShadow = true;
  solid(collision, cabinX, 0, cabinZ, 10, ledgeHeight, 9);

  stairs(group, collision, {
    x: cabinX + 10.5, z: cabinZ, dirX: -1, dirZ: 0,
    steps: 6, run: 1.1, width: 2.6, color: SLOPE,
  });

  const wallMat = toon(CABIN);
  const H = 2.8;
  for (const [dx, dz, w, d] of [[0, -3, 7, 0.4], [-3.3, 0, 0.4, 6], [3.3, 0, 0.4, 6]]) {
    part(new THREE.BoxGeometry(w, H, d), wallMat, cabinX + dx, ledgeHeight + H / 2, cabinZ + dz,
      group, { receive: true });
    solid(collision, cabinX + dx, ledgeHeight, cabinZ + dz, w, H, d);
  }
  const roof = part(new THREE.BoxGeometry(8, 0.35, 7), toon(0x4a3326),
    cabinX, ledgeHeight + H + 0.18, cabinZ, group, { outlineScale: 1.02 });
  roof.castShadow = true;
  solid(collision, cabinX, ledgeHeight + H, cabinZ, 8, 0.35, 7);

  const keepClear = [
    { x: 0, z: -4, r: 18 },
    { x: -19, z: 16, r: 10 },
    { x: 14, z: 26, r: 6 },
  ];

  scatter({ halfSize: MOUNTAIN.halfSize, count: 40, keepClear, seed: 600, minScale: 0.7, maxScale: 1.3 },
    (x, z, scale, random) => conifer(group, collision, x, z, scale, random,
      { leaf: 0x2a5f36, leafLight: 0x387043 }));
  scatter({ halfSize: MOUNTAIN.halfSize, count: 30, keepClear, seed: 601, minScale: 0.6, maxScale: 1.7 },
    (x, z, scale, random) => rock(group, collision, x, z, scale, random, 0x6b7064));

  boundary(collision, MOUNTAIN.halfSize, 34);

  return finishMap(scene, group, collision, MOUNTAIN, new THREE.Vector3(14, 0, 26), {
    shelters: { peak: peak.top, cabinRoof: ledgeHeight + H + 0.35 },
  });
}
