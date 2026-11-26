// Mudslide (PRD section 6, disaster 6). Mountain, Forest, Badlands, City.
//
// "Mud wave pours down a slope and buries low areas. Reach high ground or
// solid shelter."
//
// Like the tsunami it crosses the map, but it does not drain away: the mud
// it leaves is permanent and being buried in it kills rather than drowns.

import * as THREE from 'three';
import { risingSurface, SAFE, OUT } from './common.js';
import { canvasTexture } from '../materials.js';

export const MUDSLIDE = {
  id: 'mudslide',
  name: 'Mudslide',
  advice: 'Mud is coming down the slope. Get high — it will not drain away.',
  duration: 45,
};

const MUD_LEVEL = 3.6;
const CALM_FRACTION = 0.22;

/** Thick swirls rather than streaks, so mud does not read as water. */
function mudTexture() {
  const texture = canvasTexture(256, 256, (ctx, canvas) => {
    ctx.fillStyle = '#5a4026';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < 60; i += 1) {
      ctx.fillStyle = i % 2 ? 'rgba(112, 82, 48, 0.8)' : 'rgba(70, 48, 28, 0.8)';
      ctx.beginPath();
      ctx.ellipse(
        (i * 53) % canvas.width, (i * 97) % canvas.height,
        14 + (i % 5) * 7, 7 + (i % 3) * 4, i, 0, Math.PI * 2,
      );
      ctx.fill();
    }
  });
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(9, 9);
  return texture;
}

export function createMudslide(scene, map) {
  const span = map.info.halfSize * 2 + 20;
  const start = map.info.halfSize + 8;
  const end = -map.info.halfSize - 8;

  const frontTexture = mudTexture();
  frontTexture.repeat.set(6, 1.5);
  const front = new THREE.Mesh(
    new THREE.BoxGeometry(span, 6.5, 6),
    new THREE.MeshBasicMaterial({ color: 0xffffff, map: frontTexture }),
  );
  front.position.set(0, 2.2, start);
  scene.add(front);

  const settled = risingSurface(scene, map, {
    color: 0xffffff, opacity: 1, texture: mudTexture(), emissive: true,
  });
  settled.level = -2;

  return {
    info: MUDSLIDE,
    get level() { return settled.level; },

    update(dt, progress, ctx) {
      frontTexture.offset.x = (frontTexture.offset.x + dt * 0.25) % 1;

      if (progress < CALM_FRACTION) {
        return { damage: 0, status: 'The slope is giving way' };
      }

      const swept = (progress - CALM_FRACTION) / (1 - CALM_FRACTION);
      front.position.z = start + (end - start) * swept;
      settled.level = -2 + (MUD_LEVEL + 2) * Math.min(1, swept * 1.1);

      // Under the mud: the energy bar empties at once and you head back.
      if (ctx.eye.y < settled.level - 0.2) {
        return { damage: OUT, status: 'Stuck in the mud!' };
      }
      if (Math.abs(ctx.position.z - front.position.z) < 4 && ctx.eye.y < front.position.y + 3.2) {
        return { damage: OUT, status: 'Stuck in the mud!' };
      }
      if (ctx.eye.y - 1.2 < settled.level) return { damage: 0, status: 'Mud is rising' };
      return SAFE;
    },

    dispose() {
      scene.remove(front);
      front.geometry.dispose();
      front.material.dispose();
      frontTexture.dispose();
      settled.dispose();
    },
  };
}
