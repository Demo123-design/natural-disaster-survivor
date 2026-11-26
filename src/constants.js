// Shared game data: jacket shades, ranks, and tuning numbers from the PRD.

/** The 19 base jacket shades plus Divine. Prices from PRD section 12.1. */
export const HOODIE_SHADES = [
  { id: 'red',          name: 'Red',          color: 0xd63a3a, price: 0 },
  { id: 'green',        name: 'Green',        color: 0x3fae44, price: 0 },
  { id: 'blue',         name: 'Blue',         color: 0x3a74d6, price: 0 },
  { id: 'yellow',       name: 'Yellow',       color: 0xe8c33a, price: 0 },

  { id: 'orange',       name: 'Orange',       color: 0xe8862f, price: 25 },
  { id: 'purple',       name: 'Purple',       color: 0x8a46c9, price: 25 },
  { id: 'white',        name: 'White',        color: 0xf2f2f2, price: 25 },
  { id: 'black',        name: 'Black',        color: 0x24262b, price: 25 },

  { id: 'cyan',         name: 'Cyan',         color: 0x3fc9cf, price: 50 },
  { id: 'magenta',      name: 'Magenta',      color: 0xd63ab0, price: 50 },
  { id: 'grey',         name: 'Grey',         color: 0x8b9099, price: 50 },
  { id: 'brown',        name: 'Brown',        color: 0x7a5331, price: 50 },

  { id: 'indigo',       name: 'Indigo',       color: 0x4b3fc9, price: 100 },
  { id: 'tan',          name: 'Tan',          color: 0xc9a673, price: 100 },
  { id: 'peach',        name: 'Peach',        color: 0xf5b391, price: 100 },
  { id: 'cream',        name: 'Cream',        color: 0xf0e4c4, price: 100 },

  { id: 'darkgreen',    name: 'Dark green',   color: 0x1f5c33, price: 500 },
  { id: 'lightgreen',   name: 'Light green',  color: 0x8fd96b, price: 500 },
  { id: 'yellowochre',  name: 'Yellow ochre', color: 0xc08a2e, price: 500 },

  // Legendary: rendered as a blue -> purple gradient rather than a flat colour.
  { id: 'divine', name: 'Divine', gradient: [0x3a74d6, 0x8a46c9], price: 100000 },
];

export const STARTER_SHADES = HOODIE_SHADES.filter((s) => s.price === 0).map((s) => s.id);

/** Ranks by total wins. From PRD section 9. */
export const RANKS = [
  { name: 'Unranked', minWins: 0,       color: '#9aa0a6' },
  { name: 'Brass',    minWins: 50,      color: '#b5873a' },
  { name: 'Copper',   minWins: 100,     color: '#c97b4a' },
  { name: 'Bronze',   minWins: 500,     color: '#a9612b' },
  { name: 'Iron',     minWins: 1000,    color: '#9ea4ad' },
  { name: 'Silver',   minWins: 2000,    color: '#d8dde4' },
  { name: 'Gold',     minWins: 5000,    color: '#f0c54a' },
  { name: 'Diamond',  minWins: 10000,   color: '#7fe3f0' },
  { name: 'Quartz',   minWins: 50000,   color: '#f2e2ee' },
  { name: 'Emerald',  minWins: 100000,  color: '#3fd17a' },
  { name: 'Ruby',     minWins: 1000000, color: '#e2395b' },
  { name: 'King',     minWins: 1500000, color: '#ffd700' },
];

/** The highest rank whose win requirement the player has met. */
export function rankForWins(wins) {
  let current = RANKS[0];
  for (const rank of RANKS) {
    if (wins >= rank.minWins) current = rank;
  }
  return current;
}

/**
 * Where the player stands on the way to the next rank.
 *
 * At King there is no next rank, so `next` is null and `fraction` is 1 —
 * a full bar rather than an empty one, because you have arrived.
 *
 * @returns {{rank: object, next: object|null, have: number, need: number, fraction: number}}
 */
export function rankProgress(wins) {
  const rank = rankForWins(wins);
  const index = RANKS.indexOf(rank);
  const next = RANKS[index + 1] ?? null;

  if (!next) return { rank, next: null, have: 0, need: 0, fraction: 1 };

  const have = wins - rank.minWins;
  const need = next.minWins - rank.minWins;
  return { rank, next, have, need, fraction: Math.max(0, Math.min(1, have / need)) };
}

/** Round timings, in seconds. From PRD sections 3 and 12.2. */
export const TIMINGS = {
  queueCountdown: 15,
  prepare: 120,
  results: 10,
};

export const PLAYER = {
  radius: 0.38,
  height: 1.9,
  eyeHeight: 1.62,
  walkSpeed: 4.6,
  sprintSpeed: 7.8,
  jumpSpeed: 7.0,
  gravity: 22.0,
  acceleration: 46.0,
  airAcceleration: 10.0,
  friction: 11.0,
};
