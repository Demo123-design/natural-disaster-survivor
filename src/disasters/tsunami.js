// Tsunami (PRD section 6, disaster 2). Beach, City, Forest, Tundra.
//
// "Water wall approaches from one side, floods the map to a set height.
// Climb above the flood line before it hits."
//
// Short and violent: 45 seconds, most of which is the wall crossing the map
// in plain sight. The warning is the whole game — once it arrives there is
// nothing to do but already be high.

import * as THREE from 'three';
import { risingSurface, liquidTexture, SAFE } from './common.js';

export const TSUNAMI = {
  id: 'tsunami',
  name: 'Tsunami',
  advice: 'A wave is coming from the north. Get above the flood line before it arrives.',
  duration: 45,
};

const WALL_HEIGHT = 9;
const FLOOD_LEVEL = 4.6;
const DROWN_RATE = 22;
/** Being inside the wall itself is far worse than the water it leaves. */
const IMPACT_RATE = 70;
/** The wave starts moving a third of the way in, after the warning. */
const CALM_FRACTION = 0.33;

export function createTsunami(scene, map) {
  const span = map.info.halfSize * 2 + 20;
  const start = -map.info.halfSize - 8;
  const end = map.info.halfSize + 8;

  const texture = liquidTexture('#2b6f93', 'rgba(220, 244, 255, 0.5)');
  texture.repeat.set(8, 2);

  const wall = new THREE.Mesh(
    new THREE.BoxGeometry(span, WALL_HEIGHT, 5),
    new THREE.MeshBasicMaterial({ color: 0xffffff, map: texture, transparent: true, opacity: 0.9 }),
  );
  wall.position.set(0, WALL_HEIGHT / 2 - 1, start);
  scene.add(wall);

  // The water the wave leaves behind, which rises as the wall passes.
  const after = risingSurface(scene, map, {
    color: 0xffffff, opacity: 0.8,
    texture: liquidTexture('#2f6f9e', 'rgba(190, 228, 248, 0.38)'),
  });
  after.level = -2;

  return {
    info: TSUNAMI,
    get wallZ() { return wall.position.z; },
    get level() { return after.level; },

    update(dt, progress, ctx) {
      texture.offset.x = (texture.offset.x + dt * 0.3) % 1;

      if (progress < CALM_FRACTION) {
        // Still out at sea. The wall sits at the edge, visible and growing.
        const build = progress / CALM_FRACTION;
        wall.scale.y = 0.35 + build * 0.65;
        wall.position.y = (WALL_HEIGHT * wall.scale.y) / 2 - 1;
        return { damage: 0, status: 'A wave is building' };
      }

      const swept = (progress - CALM_FRACTION) / (1 - CALM_FRACTION);
      wall.position.z = start + (end - start) * swept;

      // Behind the wall the map is flooded; ahead of it, dry.
      const behind = Math.max(0, Math.min(1, (wall.position.z - start) / (end - start)));
      after.level = -2 + (FLOOD_LEVEL + 2) * behind;

      const inWall = Math.abs(ctx.position.z - wall.position.z) < 3.4
        && ctx.eye.y < wall.position.y + (WALL_HEIGHT * wall.scale.y) / 2;
      if (inWall) return { damage: IMPACT_RATE * dt, status: 'The wave got you!' };

      if (ctx.eye.y < after.level) return { damage: DROWN_RATE * dt, status: 'Underwater!' };
      if (ctx.position.z > wall.position.z - 18 && ctx.position.z < wall.position.z) {
        return { damage: 0, status: 'The wave is almost here' };
      }
      return SAFE;
    },

    dispose() {
      scene.remove(wall);
      wall.geometry.dispose();
      wall.material.dispose();
      texture.dispose();
      after.dispose();
    },
  };
}
