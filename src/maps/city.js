// City (PRD section 5, map 1).
//
// A grid of streets with buildings you can climb. Two of them have external
// stair towers so there is always a way up; the rest are cover.

import * as THREE from 'three';
import { toon, part, canvasTexture } from '../materials.js';
import {
  startMap, finishMap, ground, stairs, boundary, scatter, solid, makeRandom, overhang,
} from './common.js';

export const CITY = {
  id: 'city',
  name: 'City',
  halfSize: 34,
  peakHeight: 8.0,
  sky: 0x9fb3c9,
  fog: { color: 0xb7c4d2, near: 30, far: 100 },
};

const ROAD = 0x3a3d44;
const PAVEMENT = 0x6e7178;
const CONCRETE = [0x8d8f94, 0x7d7a78, 0x96918a, 0x6f7681];
const CAR_COLORS = [0xc0392b, 0x2980b9, 0xf1c40f, 0xecf0f1, 0x27ae60];

/** Windows painted onto a wall, so buildings do not read as plain boxes. */
function windowTexture(color) {
  return canvasTexture(64, 64, (ctx, canvas) => {
    ctx.fillStyle = '#' + color.toString(16).padStart(6, '0');
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'rgba(40, 56, 74, 0.85)';
    for (let row = 0; row < 4; row += 1) {
      for (let col = 0; col < 3; col += 1) {
        ctx.fillRect(10 + col * 17, 8 + row * 15, 10, 9);
      }
    }
  });
}

function buildBlock(group, collision, x, z, width, depth, height, color) {
  const texture = windowTexture(color);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(Math.max(1, Math.round(width / 4)), Math.max(1, Math.round(height / 4)));

  const mesh = part(
    new THREE.BoxGeometry(width, height, depth),
    toon(0xffffff, { map: texture }),
    x, height / 2, z, group,
    { outlineScale: 1.012, receive: true },
  );
  mesh.castShadow = true;
  solid(collision, x, 0, z, width, height, depth);

  // A parapet, so a roof reads as somewhere you can stand.
  part(new THREE.BoxGeometry(width + 0.4, 0.5, depth + 0.4), toon(PAVEMENT),
    x, height + 0.25, z, group, { outlineScale: 1.02 });
  return mesh;
}

function buildCar(group, collision, x, z, angle, color) {
  const car = new THREE.Group();
  car.position.set(x, 0, z);
  car.rotation.y = angle;
  group.add(car);

  part(new THREE.BoxGeometry(2.0, 0.7, 4.2), toon(color), 0, 0.62, 0, car, { outlineScale: 1.04 });
  part(new THREE.BoxGeometry(1.7, 0.66, 2.0), toon(0x2c3e50), 0, 1.25, -0.2, car, { outlineScale: 1.05 });
  for (const sx of [-0.95, 0.95]) {
    for (const sz of [-1.4, 1.4]) {
      part(new THREE.CylinderGeometry(0.34, 0.34, 0.26, 10), toon(0x1c1c1f),
        sx, 0.34, sz, car, { outlineScale: 1.08 }).rotation.z = Math.PI / 2;
    }
  }
  solid(collision, x, 0, z, 3.4, 1.4, 3.4);
}

export function createCityMap(scene) {
  const { group, collision } = startMap(scene);

  ground(group, { size: CITY.halfSize * 2, color: ROAD });

  // Pavements along the street grid.
  const paveMat = toon(PAVEMENT);
  for (const line of [-18, 0, 18]) {
    for (const axis of ['x', 'z']) {
      const strip = new THREE.Mesh(
        new THREE.PlaneGeometry(axis === 'x' ? CITY.halfSize * 2 : 11, axis === 'x' ? 11 : CITY.halfSize * 2),
        paveMat,
      );
      strip.rotation.x = -Math.PI / 2;
      strip.position.set(axis === 'x' ? 0 : line, 0.02, axis === 'x' ? line : 0);
      strip.receiveShadow = true;
      group.add(strip);
    }
  }

  // Blocks sit in the squares between the streets.
  const random = makeRandom(404);
  const centres = [-26, -9, 9, 26];
  let index = 0;
  const climbable = [];

  for (const cx of centres) {
    for (const cz of centres) {
      index += 1;
      // The middle of the map stays open so a spawn is not inside a wall.
      if (Math.abs(cx) < 10 && Math.abs(cz) < 10) continue;

      const width = 9 + random() * 3;
      const depth = 9 + random() * 3;
      const height = 5 + Math.floor(random() * 4) * 2.4;
      buildBlock(group, collision, cx, cz, width, depth, height, CONCRETE[index % CONCRETE.length]);

      if (height >= 8) climbable.push({ x: cx, z: cz, width, depth, height });
    }
  }

  // Two buildings get an outdoor stair tower. Without one, a roof is just a
  // box you can see and never reach.
  const peaks = [];
  for (const target of climbable.slice(0, 2)) {
    const steps = Math.round(target.height / 0.8);
    const startX = target.x + target.width / 2 + 1.2 + (steps - 1) * 1.0;
    stairs(group, collision, {
      x: startX, z: target.z, dirX: -1, dirZ: 0,
      steps, run: 1.0, width: 2.4, color: 0x5d6168,
    });
    peaks.push(target.height);
  }

  // An overpass across the middle street, and an arcade along one block.
  // The PRD lists "under overpasses" as City shelter, and without something
  // roofed the heatwave and the acid rain cannot be survived here.
  overhang(group, collision, {
    x: 0, z: -18, width: 30, depth: 7, clearance: 4.0,
    color: 0x6b6f76, pillarColor: 0x5c6066,
  });
  overhang(group, collision, {
    x: 18, z: 0, width: 8, depth: 16, clearance: 3.2, color: 0x7a7067,
  });

  // Lamp posts and cars for cover and scale.
  scatter({ halfSize: CITY.halfSize, count: 26, margin: 7, seed: 71,
    keepClear: centres.flatMap((cx) => centres.map((cz) => ({ x: cx, z: cz, r: 8 }))) },
    (x, z, scale, r) => {
      const post = part(new THREE.CylinderGeometry(0.13, 0.17, 5.2, 8), toon(0x4a4f57),
        x, 2.6, z, group, { outlineScale: 1.1 });
      post.castShadow = true;
      part(new THREE.BoxGeometry(0.9, 0.3, 0.5), toon(0xf4e3a1), x + 0.3, 5.2, z, group);
      solid(collision, x, 0, z, 0.5, 5.2, 0.5);
      if (r() > 0.55) buildCar(group, collision, x + 3.4, z + 2.0, r() * Math.PI, CAR_COLORS[Math.floor(r() * CAR_COLORS.length)]);
    });

  boundary(collision, CITY.halfSize, 30);

  return finishMap(scene, group, collision, CITY, new THREE.Vector3(0, 0, 0), {
    shelters: { rooftops: peaks },
  });
}
