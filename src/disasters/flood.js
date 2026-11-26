// Flood (PRD section 6, disaster 12). Allowed on every map.
//
// "Water level rises steadily across the whole map. Climb and keep climbing;
// stay above the water line."
//
// The level finishes above the easy shelter on each map and below the hard
// one, so the first place you run to eventually fails. Being forced to move
// once is what makes it a disaster rather than a waiting game.

import { risingSurface, liquidTexture, SAFE } from './common.js';

export const FLOOD = {
  id: 'flood',
  name: 'Flood',
  advice: 'Water is rising. Get high, and be ready to climb higher.',
  duration: 60,
};

const DROWN_RATE = 20;
const START_LEVEL = -1.2;
const FINAL_LEVEL = 5.6;
/** The water holds still at first, so you see it start to move. */
const CALM_FRACTION = 0.08;

export function createFlood(scene, map) {
  const texture = liquidTexture('#2f6f9e', 'rgba(190, 228, 248, 0.38)');
  const surface = risingSurface(scene, map, { color: 0xffffff, opacity: 0.78, texture });
  surface.level = START_LEVEL;

  return {
    info: FLOOD,
    get level() { return surface.level; },

    update(dt, progress, ctx) {
      const risen = Math.max(0, (progress - CALM_FRACTION) / (1 - CALM_FRACTION));
      surface.level = START_LEVEL + (FINAL_LEVEL - START_LEVEL) * risen;

      // Scrolling the texture rather than moving the plane keeps the surface
      // exactly level, which matters because the water line is the rule.
      texture.offset.x = (texture.offset.x + dt * 0.02) % 1;
      texture.offset.y = (texture.offset.y + dt * 0.013) % 1;

      if (ctx.eye.y < surface.level) return { damage: DROWN_RATE * dt, status: 'Underwater!' };
      if (ctx.eye.y - 1.3 < surface.level) return { damage: 0, status: 'Water rising' };
      return SAFE;
    },

    dispose() {
      surface.dispose();
    },
  };
}
