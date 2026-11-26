// Beach (PRD section 5, map 6).
//
// Sand, palms, a pier and shallow water along one edge. A lifeguard tower and
// a tall dune give two ways up, and the water edge makes the tsunami obvious
// when it arrives.

import * as THREE from 'three';
import { toon, part } from '../materials.js';
import {
  startMap, finishMap, ground, terrace, stairs, boundary, scatter, rock, solid,
} from './common.js';

export const BEACH = {
  id: 'beach',
  name: 'Beach',
  halfSize: 34,
  peakHeight: 7.2,
  sky: 0x87ccee,
  fog: { color: 0xa9dcf0, near: 32, far: 104 },
};

const SAND = 0xead9a8;
const SAND_WET = 0xd3bd86;
const SEA = 0x2f8fb5;
const PALM = 0x7a5a36;
const FROND = 0x3f9450;
const TOWER = 0xd6603f;

function palm(group, collision, x, z, scale, random) {
  const tree = new THREE.Group();
  tree.position.set(x, 0, z);
  tree.rotation.y = random() * Math.PI * 2;
  group.add(tree);

  const height = 5.0 * scale;
  const trunk = part(new THREE.CylinderGeometry(0.22 * scale, 0.32 * scale, height, 8),
    toon(PALM), 0, height / 2, 0, tree, { outlineScale: 1.09 });
  trunk.rotation.z = (random() - 0.5) * 0.25;

  for (let i = 0; i < 6; i += 1) {
    const frond = part(new THREE.ConeGeometry(0.42 * scale, 2.6 * scale, 5),
      toon(FROND),
      Math.cos((i / 6) * Math.PI * 2) * 1.1 * scale,
      height - 0.1,
      Math.sin((i / 6) * Math.PI * 2) * 1.1 * scale,
      tree, { outlineScale: 1.06 });
    frond.rotation.set(Math.sin((i / 6) * Math.PI * 2) * 1.0, 0, -Math.cos((i / 6) * Math.PI * 2) * 1.0);
  }

  solid(collision, x, 0, z, 0.8 * scale, height, 0.8 * scale);
}

export function createBeachMap(scene) {
  const { group, collision } = startMap(scene);

  ground(group, { size: BEACH.halfSize * 2, color: SAND, patchColor: SAND_WET, patches: 12, seed: 44 });

  // Shallow water along the far edge, which is where a wave would come from.
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(BEACH.halfSize * 2, 20),
    toon(SEA, { transparent: true, opacity: 0.85 }));
  sea.rotation.x = -Math.PI / 2;
  sea.position.set(0, 0.05, -BEACH.halfSize + 10);
  sea.receiveShadow = true;
  group.add(sea);

  // The lifeguard tower: a deck on legs with a stair run up to it.
  const deckHeight = 5.6;
  const towerX = 4;
  const towerZ = -12;
  for (const [dx, dz] of [[-2.4, -2.4], [2.4, -2.4], [-2.4, 2.4], [2.4, 2.4]]) {
    part(new THREE.BoxGeometry(0.4, deckHeight, 0.4), toon(TOWER),
      towerX + dx, deckHeight / 2, towerZ + dz, group, { outlineScale: 1.08 });
    solid(collision, towerX + dx, 0, towerZ + dz, 0.7, deckHeight, 0.7);
  }
  const deck = part(new THREE.BoxGeometry(7, 0.4, 7), toon(0xe8dcc0),
    towerX, deckHeight + 0.2, towerZ, group, { outlineScale: 1.02, receive: true });
  deck.castShadow = true;
  solid(collision, towerX, deckHeight, towerZ, 7, 0.4, 7);

  const H = 2.2;
  for (const [dx, dz, w, d] of [[0, -3.3, 7, 0.35], [-3.3, 0, 0.35, 7]]) {
    part(new THREE.BoxGeometry(w, H, d), toon(TOWER),
      towerX + dx, deckHeight + 0.4 + H / 2, towerZ + dz, group);
    solid(collision, towerX + dx, deckHeight + 0.4, towerZ + dz, w, H, d);
  }
  const roof = part(new THREE.BoxGeometry(7.6, 0.3, 7.6), toon(0xf2efe6),
    towerX, deckHeight + 0.4 + H + 0.15, towerZ, group, { outlineScale: 1.02 });
  roof.castShadow = true;
  solid(collision, towerX, deckHeight + 0.4 + H, towerZ, 7.6, 0.3, 7.6);

  stairs(group, collision, {
    x: towerX, z: towerZ + 9.2, dirX: 0, dirZ: -1,
    steps: 7, run: 1.1, width: 2.4, color: 0xc9b58b,
  });

  // A big dune at the other end: the second way up.
  const dune = terrace(group, collision, {
    x: -18, z: 18, levels: 9, width: 18, depth: 16, shrink: 1.8,
    colors: [SAND, SAND_WET],
  });

  // The pier runs out over the water. Low, so it floods early.
  const pierMat = toon(0x8a6a44);
  for (let i = 0; i < 9; i += 1) {
    const z = -14 - i * 2.2;
    part(new THREE.BoxGeometry(5, 0.3, 2.0), pierMat, 20, 1.5, z, group, { outlineScale: 1.03 });
    solid(collision, 20, 1.5, z, 5, 0.3, 2.0);
    for (const dx of [-2, 2]) {
      part(new THREE.CylinderGeometry(0.2, 0.2, 1.6, 7), pierMat, 20 + dx, 0.8, z, group,
        { outlineScale: 1.08 });
    }
  }
  stairs(group, collision, { x: 20, z: -11.6, dirX: 0, dirZ: -1, steps: 2, run: 1.1, width: 3, color: 0x8a6a44 });

  const keepClear = [
    { x: 4, z: -12, r: 12 },
    { x: -18, z: 18, r: 13 },
    { x: 20, z: -22, r: 9 },
    { x: 0, z: 26, r: 6 },
    { x: 0, z: -30, r: 16 },
  ];

  scatter({ halfSize: BEACH.halfSize, count: 26, keepClear, seed: 800, minScale: 0.8, maxScale: 1.4 },
    (x, z, scale, random) => palm(group, collision, x, z, scale, random));
  scatter({ halfSize: BEACH.halfSize, count: 14, keepClear, seed: 801, minScale: 0.5, maxScale: 1.2 },
    (x, z, scale, random) => rock(group, collision, x, z, scale, random, 0x9c8f78));

  boundary(collision, BEACH.halfSize);

  return finishMap(scene, group, collision, BEACH, new THREE.Vector3(0, 0, 26), {
    shelters: { towerRoof: deckHeight + 0.4 + H + 0.3, dune: dune.top },
  });
}
