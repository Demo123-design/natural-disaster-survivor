// The map list, and the rules for choosing one.
//
// PRD section 6.3: maps and disasters are picked independently, but an
// allow-list keeps the pairing sensible — a tsunami inside a cave would be
// nonsense, and a blizzard in the desert is not a disaster, it is a surprise.

import { FOREST, createForestMap } from './forest.js';
import { CITY, createCityMap } from './city.js';
import { DESERT, createDesertMap } from './desert.js';
import { MOUNTAIN, createMountainMap } from './mountain.js';
import { TUNDRA, createTundraMap } from './tundra.js';
import { CAVE, createCaveMap } from './cave.js';
import { BEACH, createBeachMap } from './beach.js';
import { BADLANDS, createBadlandsMap } from './badlands.js';

export const MAPS = [
  { info: CITY, create: createCityMap },
  { info: DESERT, create: createDesertMap },
  { info: MOUNTAIN, create: createMountainMap },
  { info: TUNDRA, create: createTundraMap },
  { info: CAVE, create: createCaveMap },
  { info: BEACH, create: createBeachMap },
  { info: FOREST, create: createForestMap },
  { info: BADLANDS, create: createBadlandsMap },
];

const ALL = MAPS.map((m) => m.info.id);
const without = (...ids) => ALL.filter((id) => !ids.includes(id));

/** Which maps each disaster is allowed on. From PRD section 6.3. */
export const COMPATIBILITY = {
  volcano: ['mountain', 'badlands', 'forest', 'city', 'cave'],
  tsunami: ['beach', 'city', 'forest', 'tundra'],
  tornado: ['city', 'desert', 'badlands', 'forest', 'tundra'],
  earthquake: ALL,
  asteroid: without('cave'),
  mudslide: ['mountain', 'forest', 'badlands', 'city'],
  blizzard: ['tundra', 'mountain', 'forest', 'cave'],
  heatwave: ['desert', 'badlands', 'beach', 'city'],
  drought: ['desert', 'badlands', 'forest', 'beach'],
  overgrown: ['forest', 'cave', 'mountain', 'city'],
  acidrain: without('cave'),
  flood: ALL,
};

export function mapById(id) {
  return MAPS.find((m) => m.info.id === id) ?? null;
}

/**
 * Picks a map at random from those this disaster is allowed on.
 *
 * An unknown disaster id falls back to every map rather than to none: a
 * missing table entry should make a match odd, not impossible.
 *
 * @param {string} disasterId
 * @param {() => number} [random]
 */
export function pickMap(disasterId, random = Math.random) {
  const allowed = COMPATIBILITY[disasterId] ?? ALL;
  const choices = MAPS.filter((m) => allowed.includes(m.info.id));
  const pool = choices.length > 0 ? choices : MAPS;
  return pool[Math.floor(random() * pool.length)];
}
