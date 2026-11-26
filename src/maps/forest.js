// Forest (PRD section 5, map 7).
//
// Dense trees, a clearing, a log cabin and a rock outcrop. The cabin roof is
// the easy shelter and the outcrop is the safe one: in a flood the roof goes
// under and the rock does not, which is what makes you move.

import * as THREE from 'three';
import { toon, part, addOutline } from '../materials.js';
import {
  startMap, finishMap, ground, terrace, boundary, scatter,
  conifer, rock, solid, makeRandom, RISE,
} from './common.js';

export const FOREST = {
  id: 'forest',
  name: 'Forest',
  halfSize: 34,
  peakHeight: 7.2,
  sky: 0x8fc5e8,
  fog: { color: 0xa8cfe4, near: 26, far: 96 },
};

const BARK = 0x5a3f2c;
const WOOD = 0x8a6239;
const ROOF = 0x6d3a2e;

/** The log cabin: walls with a doorway, and a roof reached by log steps. */
function buildCabin(group, collision) {
  const origin = new THREE.Vector3(13, 0, 9);
  const cabin = new THREE.Group();
  cabin.position.copy(origin);
  cabin.rotation.y = -0.3;
  group.add(cabin);

  const W = 8.2;
  const D = 6.6;
  const H = 3.4;
  const T = 0.42;
  const wallMat = toon(WOOD);
  const spin = new THREE.Vector3(0, 1, 0);

  // Colliders cannot be rotated, so each wall is registered as the
  // axis-aligned box that contains it.
  const addWall = (localX, localZ, sizeX, sizeZ) => {
    const v = new THREE.Vector3(localX, 0, localZ).applyAxisAngle(spin, cabin.rotation.y);
    const cos = Math.abs(Math.cos(cabin.rotation.y));
    const sin = Math.abs(Math.sin(cabin.rotation.y));
    solid(collision, origin.x + v.x, 0, origin.z + v.z,
      sizeX * cos + sizeZ * sin, H, sizeX * sin + sizeZ * cos);
  };

  part(new THREE.BoxGeometry(W, H, T), wallMat, 0, H / 2, -D / 2, cabin, { receive: true });
  addWall(0, -D / 2, W, T);
  part(new THREE.BoxGeometry(T, H, D), wallMat, -W / 2, H / 2, 0, cabin, { receive: true });
  addWall(-W / 2, 0, T, D);
  part(new THREE.BoxGeometry(T, H, D), wallMat, W / 2, H / 2, 0, cabin, { receive: true });
  addWall(W / 2, 0, T, D);

  const doorWidth = 1.9;
  const sideWidth = (W - doorWidth) / 2;
  for (const side of [-1, 1]) {
    const x = side * (doorWidth / 2 + sideWidth / 2);
    part(new THREE.BoxGeometry(sideWidth, H, T), wallMat, x, H / 2, D / 2, cabin, { receive: true });
    addWall(x, D / 2, sideWidth, T);
  }
  part(new THREE.BoxGeometry(doorWidth, 0.7, T), wallMat, 0, H - 0.35, D / 2, cabin);

  const roofMat = toon(ROOF);
  for (const side of [-1, 1]) {
    const slope = new THREE.Mesh(new THREE.BoxGeometry(W + 1.0, 0.3, D * 0.62), roofMat);
    slope.position.set(0, H + 0.78, side * D * 0.17);
    slope.rotation.x = side * -0.44;
    slope.castShadow = true;
    slope.receiveShadow = true;
    addOutline(slope, 1.02);
    cabin.add(slope);
  }
  part(new THREE.BoxGeometry(W + 1.2, 0.34, 0.5), roofMat, 0, H + 1.32, 0, cabin);

  // One flat ledge at ridge height. A stepped approximation of a sloped roof
  // makes walking on it jerky, and a single ledge is easier to read anyway.
  const roofTop = H + 1.15;
  solid(collision, origin.x, roofTop, origin.z, W * 1.02, 0.34, D * 1.02);

  // Log steps up to the roof. The tallest sits against the wall and they
  // descend outwards, so climbing them carries you towards the roof.
  const logMat = toon(BARK);
  for (let i = 0; i < 5; i += 1) {
    const height = RISE * (i + 1);
    const localX = -W / 2 - 1.1 - (4 - i) * 0.95;
    const v = new THREE.Vector3(localX, 0, 1.2).applyAxisAngle(spin, cabin.rotation.y);
    solid(collision, origin.x + v.x, 0, origin.z + v.z, 1.7, height, 2.4);

    const block = part(
      new THREE.BoxGeometry(1.6, height, 2.3),
      logMat, localX, height / 2, 1.2, cabin,
      { outlineScale: 1.03, receive: true },
    );
    block.castShadow = true;
  }

  return { roofTop: roofTop + 0.34 };
}

export function createForestMap(scene) {
  const { group, collision } = startMap(scene);

  ground(group, {
    size: FOREST.halfSize * 2,
    color: 0x4e8c43,
    patchColor: 0x3d6f36,
    patches: 14,
    seed: 31,
  });

  const outcrop = terrace(group, collision, {
    x: -15, z: -13, levels: 9, width: 18, depth: 16,
    colors: [0x7b8089, 0x5f656d],
  });
  const cabin = buildCabin(group, collision);

  // A ring of trees marks the edge; the wall behind them is what stops you.
  const edgeRandom = makeRandom(97);
  for (let i = 0; i < 64; i += 1) {
    const angle = (i / 64) * Math.PI * 2;
    const radius = FOREST.halfSize - 1.5 - edgeRandom() * 1.2;
    conifer(group, collision, Math.cos(angle) * radius, Math.sin(angle) * radius,
      1.1 + edgeRandom() * 0.5, edgeRandom);
  }
  boundary(collision, FOREST.halfSize);

  const keepClear = [
    { x: -15, z: -13, r: 14 },
    { x: 13, z: 9, r: 11 },
    { x: 0, z: 24, r: 7 },
  ];

  scatter({ halfSize: FOREST.halfSize, count: 70, keepClear, seed: 1987, minScale: 0.85, maxScale: 1.55 },
    (x, z, scale, random) => conifer(group, collision, x, z, scale, random));
  scatter({ halfSize: FOREST.halfSize, count: 18, keepClear, seed: 55, minScale: 0.5, maxScale: 1.4 },
    (x, z, scale, random) => rock(group, collision, x, z, scale, random));

  return finishMap(scene, group, collision, FOREST, new THREE.Vector3(0, 0, 24), {
    shelters: { outcropTop: outcrop.top, cabinRoof: cabin.roofTop },
  });
}
