// The saved profile: who you are, what you have won, and what you own.
//
// Everything lives in one localStorage entry so a save is a single atomic
// write. The key carries a version so a future format change can migrate
// rather than silently reading the wrong shape.
//
// Gems are only ever earned by playing. See PRD section 10: this game has no
// purchases of any kind, so there is nothing here that reads or writes money.

import { HOODIE_SHADES, STARTER_SHADES } from './constants.js';

const KEY = 'nds.profile.v1';

export const USERNAME = {
  minLength: 3,
  maxLength: 16,
  /** Letters, numbers and underscore. Deliberately no spaces or punctuation. */
  pattern: /^[A-Za-z0-9_]+$/,
};

const SHADE_IDS = new Set(HOODIE_SHADES.map((s) => s.id));

/** A brand new player: starter shades unlocked, red equipped, nothing earned. */
export function emptyProfile() {
  return {
    username: '',
    wins: 0,
    gems: 0,
    unlocked: [...STARTER_SHADES],
    equipped: 'red',
  };
}

/**
 * Checks a username the player typed.
 *
 * @returns {{ok: boolean, error?: string}}
 */
export function validateUsername(raw) {
  const name = (raw ?? '').trim();

  if (name.length === 0) return { ok: false, error: 'Type a name.' };
  if (name.length < USERNAME.minLength) {
    return { ok: false, error: `At least ${USERNAME.minLength} characters.` };
  }
  if (name.length > USERNAME.maxLength) {
    return { ok: false, error: `At most ${USERNAME.maxLength} characters.` };
  }
  if (!USERNAME.pattern.test(name)) {
    return { ok: false, error: 'Letters, numbers and _ only.' };
  }

  return { ok: true };
}

/**
 * Forces a loaded profile into a shape the game can trust.
 *
 * A save can be edited by hand or left behind by an older build, so every
 * field is checked rather than believed. Anything unusable falls back to the
 * new-player value instead of throwing, because a corrupt save should cost
 * you your progress at worst, never the ability to start the game.
 */
function sanitise(raw) {
  const base = emptyProfile();
  if (!raw || typeof raw !== 'object') return base;

  const username = typeof raw.username === 'string' ? raw.username.trim() : '';
  if (validateUsername(username).ok) base.username = username;

  if (Number.isFinite(raw.wins) && raw.wins >= 0) base.wins = Math.floor(raw.wins);
  if (Number.isFinite(raw.gems) && raw.gems >= 0) base.gems = Math.floor(raw.gems);

  // Note on trust: a hand-edited save can grant itself shades, because the
  // save is a local file and this is a single-player build. That is fine
  // here - there is nobody to cheat against. When multiplayer arrives (PRD
  // v2) the server owns wins, gems and unlocks, and this function stops
  // being the authority on them.
  if (Array.isArray(raw.unlocked)) {
    const owned = new Set(STARTER_SHADES);
    for (const id of raw.unlocked) {
      if (typeof id === 'string' && SHADE_IDS.has(id)) owned.add(id);
    }
    base.unlocked = [...owned];
  }

  // You can only wear what you own, so an equipped shade that is not unlocked
  // falls back rather than putting an unearned jacket on the character.
  if (typeof raw.equipped === 'string' && base.unlocked.includes(raw.equipped)) {
    base.equipped = raw.equipped;
  }

  return base;
}

/**
 * Reads the saved profile.
 *
 * @returns {{profile: object, isNew: boolean}} `isNew` is true when there is
 *   no usable save yet, which is what makes the game ask for a username.
 */
export function loadProfile() {
  let raw = null;

  try {
    const text = localStorage.getItem(KEY);
    if (text) raw = JSON.parse(text);
  } catch {
    // Private browsing, a blocked origin or malformed JSON. Start fresh
    // rather than refusing to run.
    raw = null;
  }

  const profile = sanitise(raw);
  return { profile, isNew: profile.username === '' };
}

/** Writes the profile. Returns false if storage refused it. */
export function saveProfile(profile) {
  try {
    localStorage.setItem(KEY, JSON.stringify(profile));
    return true;
  } catch {
    return false;
  }
}

/** Wipes the save. Only for development and the console. */
export function clearProfile() {
  try {
    localStorage.removeItem(KEY);
    return true;
  } catch {
    return false;
  }
}
