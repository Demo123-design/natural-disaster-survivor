// The twelve disasters, and the rules for choosing one.
//
// Lengths are from PRD section 12.2 and live on each disaster. Fast violent
// ones are short; slow drains run long so staying put actually costs you
// something.

import { FLOOD, createFlood } from './flood.js';
import { TSUNAMI, createTsunami } from './tsunami.js';
import { MUDSLIDE, createMudslide } from './mudslide.js';
import { VOLCANO, createVolcano } from './volcano.js';
import { TORNADO, createTornado } from './tornado.js';
import { EARTHQUAKE, createEarthquake } from './earthquake.js';
import { ASTEROID, createAsteroid } from './asteroid.js';
import { OVERGROWN, createOvergrown } from './overgrown.js';
import {
  BLIZZARD, HEATWAVE, ACID_RAIN, DROUGHT,
  createBlizzard, createHeatwave, createAcidRain, createDrought,
} from './drain.js';

export const DISASTERS = [
  { info: VOLCANO, create: createVolcano },
  { info: TSUNAMI, create: createTsunami },
  { info: TORNADO, create: createTornado },
  { info: EARTHQUAKE, create: createEarthquake },
  { info: ASTEROID, create: createAsteroid },
  { info: MUDSLIDE, create: createMudslide },
  { info: BLIZZARD, create: createBlizzard },
  { info: HEATWAVE, create: createHeatwave },
  { info: DROUGHT, create: createDrought },
  { info: OVERGROWN, create: createOvergrown },
  { info: ACID_RAIN, create: createAcidRain },
  { info: FLOOD, create: createFlood },
];

export function disasterById(id) {
  return DISASTERS.find((d) => d.info.id === id) ?? null;
}

/** Picks a disaster at random. The map is then chosen to suit it. */
export function pickDisaster(random = Math.random) {
  return DISASTERS[Math.floor(random() * DISASTERS.length)];
}
