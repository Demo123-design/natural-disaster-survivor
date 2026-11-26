// The round loop (PRD section 3).
//
//   lobby -> queue -> prepare -> disaster -> results -> lobby
//
// This owns the phase, the timers, and which world the player is standing in.
// Phase 4 ships one map and one disaster; the structure is the same for all
// eight maps and twelve disasters, which arrive in phases 5 and 6.

import * as THREE from 'three';
import { TIMINGS, PLAYER } from './constants.js';
import { pickMap, mapById } from './maps/index.js';
import { pickDisaster, disasterById } from './disasters/index.js';
import { createSupplies, ITEMS } from './supplies.js';

export const PHASE = {
  lobby: 'lobby',
  queue: 'queue',
  prepare: 'prepare',
  disaster: 'disaster',
  results: 'results',
};

const MAX_HEALTH = 100;
/** How many things you can carry (PRD section 7). */
export const SLOTS = 5;
/** HP per second regained once nothing is hurting you. */
const REGEN_RATE = 4;
/** How long after the last damage regeneration starts. */
const REGEN_DELAY = 3;

export class Round {
  /**
   * @param {object} deps
   * @param {THREE.Scene} deps.scene
   * @param {import('./player.js').Player} deps.player
   * @param {object} deps.lobby
   * @param {import('./collision.js').CollisionWorld} deps.lobbyCollision
   * @param {(result: object) => void} deps.onFinished called with the round result
   */
  constructor({ scene, player, lobby, lobbyCollision, onFinished }) {
    this.scene = scene;
    this.player = player;
    this.lobby = lobby;
    this.lobbyCollision = lobbyCollision;
    this.onFinished = onFinished;
    /** Named moments worth hearing. Set by whatever owns the sound. */
    this.onEvent = null;

    this.phase = PHASE.lobby;
    this.timeLeft = 0;
    this.health = MAX_HEALTH;
    this.alive = true;
    this.status = null;
    this.sinceDamage = REGEN_DELAY;

    this.map = null;
    this.disaster = null;
    this.supplies = null;
    this.result = null;

    /** Five slots, each null or {item, count}. */
    this.inventory = new Array(SLOTS).fill(null);
    this.selected = 0;
    /** Seconds of water left; while this lasts heat and thirst do nothing. */
    this.hydration = 0;
    /** Seconds of torchlight left. */
    this.torch = 0;
    /** Set for a moment after using something, for the HUD to show. */
    this.flash = '';
    this.flashUntil = 0;
    /** Set to force the next match's map or disaster. Testing only. */
    this.nextMapId = null;
    this.nextDisasterId = null;

    this._eye = new THREE.Vector3();
  }

  get inMatch() {
    return this.phase === PHASE.prepare || this.phase === PHASE.disaster;
  }

  /**
   * Called when the player steps into the portal.
   *
   * With other players waiting there is a 15 second countdown so they can
   * join. Alone, the PRD says to skip it rather than make one person watch a
   * timer, so v1 always starts at once — the countdown path is kept for when
   * multiplayer arrives.
   */
  enterQueue(playersWaiting = 1) {
    if (this.phase !== PHASE.lobby) return;

    if (playersWaiting > 1) {
      this.phase = PHASE.queue;
      this.timeLeft = TIMINGS.queueCountdown;
      return;
    }

    this._startMatch();
  }

  /** Stepping out of the portal cancels a countdown that has not fired yet. */
  cancelQueue() {
    if (this.phase !== PHASE.queue) return;
    this.phase = PHASE.lobby;
    this.timeLeft = 0;
  }

  /**
   * Starts a match. The disaster is drawn first and the map second, from the
   * ones that disaster is allowed on (PRD section 6.3) — doing it the other
   * way round would mean rejecting draws until one fitted.
   *
   * @param {string} [forcedMapId] a specific map, for testing
   * @param {string} [forcedDisasterId] a specific disaster, for testing
   */
  _startMatch(forcedMapId = this.nextMapId, forcedDisasterId = this.nextDisasterId) {
    const disaster = (forcedDisasterId && disasterById(forcedDisasterId)) || pickDisaster();
    const chosen = (forcedMapId && mapById(forcedMapId)) || pickMap(disaster.info.id);
    this.nextMapId = null;
    this.nextDisasterId = null;

    this.map = chosen.create(this.scene);
    this.disaster = disaster.create(this.scene, this.map);
    this.supplies = createSupplies(this.scene, this.map);

    this.inventory.fill(null);
    this.selected = 0;
    this.hydration = 0;
    this.torch = 0;

    this.health = MAX_HEALTH;
    this.alive = true;
    this.status = null;
    this.sinceDamage = REGEN_DELAY;
    this.result = null;

    this.lobby.group.visible = false;
    this.player.collision = this.map.collision;
    this.player.setSitting(false);
    this.player.position.copy(this.map.spawn);
    this.player.velocity.set(0, 0, 0);

    this.phase = PHASE.prepare;
    this.timeLeft = TIMINGS.prepare;
    this.onEvent?.('warn');
  }

  /** Ends the prepare phase early. */
  skipPrepare() {
    if (this.phase !== PHASE.prepare) return;
    this.timeLeft = 0;
  }

  _startDisaster() {
    this.phase = PHASE.disaster;
    this.timeLeft = this.disaster.info.duration;
    this.onEvent?.('start');
  }

  _finishMatch(survived) {
    this.result = {
      survived,
      disaster: this.disaster.info.name,
      map: this.map.info.name,
      // Awarded by the caller, which owns the profile. PRD section 10: one
      // win and one gem for making it to the end, nothing otherwise.
      wins: survived ? 1 : 0,
      gems: survived ? 1 : 0,
    };

    this.phase = PHASE.results;
    this.timeLeft = TIMINGS.results;
    this.onFinished?.(this.result);
    this.onEvent?.(survived ? 'win' : 'out');
  }

  _returnToLobby() {
    this.supplies?.dispose();
    this.disaster?.dispose();
    this.map?.dispose();
    this.supplies = null;
    this.disaster = null;
    this.map = null;
    this.inventory.fill(null);
    this.hydration = 0;
    this.torch = 0;

    this.lobby.group.visible = true;
    this.player.collision = this.lobbyCollision;
    this.player.position.copy(this.lobby.spawn);
    this.player.velocity.set(0, 0, 0);
    this.player.character.visible = true;

    this.health = MAX_HEALTH;
    this.alive = true;
    this.status = null;
    this.phase = PHASE.lobby;
    this.timeLeft = 0;
  }

  /** Picks up the nearest supply, if there is one and there is room. */
  pickUp() {
    if (!this.supplies || !this.inMatch) return null;
    const pickup = this.supplies.nearest(this.player.position);
    if (!pickup) return null;

    // Stack with the same item first, then take an empty slot.
    const stack = this.inventory.find((s) => s && s.item.id === pickup.item.id);
    if (stack) {
      stack.count += 1;
    } else {
      const slot = this.inventory.indexOf(null);
      if (slot === -1) {
        this.onEvent?.('full');
        this._say('Your hands are full');
        return null;
      }
      this.inventory[slot] = { item: pickup.item, count: 1 };
    }

    this.supplies.take(pickup);
    this.onEvent?.('pickup');
    this._say(`Picked up ${pickup.item.name.toLowerCase()}`);
    return pickup.item;
  }

  select(index) {
    if (index >= 0 && index < SLOTS) this.selected = index;
  }

  /** Uses whatever is in the selected slot. */
  useSelected() {
    if (!this.inMatch || !this.alive) return;
    const slot = this.inventory[this.selected];
    if (!slot) return;

    const item = slot.item;
    let used = true;

    switch (item.kind) {
      case 'food':
        if (this.health >= MAX_HEALTH) {
          this._say('Already full of energy');
          used = false;
        } else {
          this.health = Math.min(MAX_HEALTH, this.health + item.energy);
          this.onEvent?.('eat');
          this._say(`+${item.energy} energy`);
        }
        break;

      case 'water':
        this.hydration = Math.max(this.hydration, item.seconds);
        this.onEvent?.('drink');
        this._say(`Water for ${item.seconds}s`);
        break;

      case 'shelter': {
        // Only on the ground, and only where it will not grow out of a wall.
        if (!this.player.grounded) {
          this._say('Stand on the ground to put that up');
          used = false;
          break;
        }
        const roof = this.supplies.place(item, this.player.position);
        this.onEvent?.('place');
        this._say(`${item.name} up`);
        void roof;
        break;
      }

      case 'material':
        if (item.id === 'torch') {
          this.torch = Math.max(this.torch, item.seconds);
          this.onEvent?.('torch');
          this._say('Torch lit');
        } else if (item.id === 'axe') {
          // Only the overgrown forest has anything to clear, so anywhere
          // else this is an honest "nothing to do here" rather than a
          // silently wasted item.
          const cleared = this.disaster.clear?.(this.player.position, item.radius) ?? 0;
          if (cleared > 0) {
            this.onEvent?.('chop');
            this._say(`Cleared ${cleared} vines`);
          } else {
            this._say('Nothing to clear here');
            used = false;
          }
        }
        break;

      default:
        used = false;
    }

    if (!used) return;

    slot.count -= 1;
    if (slot.count <= 0) this.inventory[this.selected] = null;
  }

  _say(text, seconds = 2) {
    this.flash = text;
    this.flashUntil = performance.now() / 1000 + seconds;
  }

  get message() {
    return performance.now() / 1000 < this.flashUntil ? this.flash : '';
  }

  /**
   * Height of the lowest thing above the player, or Infinity under open sky.
   * This is what "sheltered" means for every disaster.
   */
  collisionFor(position) {
    return this.player.collision.ceilingHeight(position, PLAYER.radius, PLAYER.height);
  }

  /** @param {number} dt seconds */
  update(dt) {
    if (this.phase === PHASE.lobby) return;

    this.timeLeft = Math.max(0, this.timeLeft - dt);

    switch (this.phase) {
      case PHASE.queue:
        if (this.timeLeft === 0) this._startMatch();
        break;

      case PHASE.prepare:
        if (this.timeLeft === 0) this._startDisaster();
        break;

      case PHASE.disaster:
        this._updateDisaster(dt);
        break;

      case PHASE.results:
        if (this.timeLeft === 0) this._returnToLobby();
        break;

      default:
        break;
    }
  }

  _updateDisaster(dt) {
    const progress = 1 - this.timeLeft / this.disaster.info.duration;
    const position = this.player.position;
    this._eye.copy(position);
    this._eye.y += PLAYER.eyeHeight;

    // Anything overhead counts as cover. One definition, used by every
    // disaster that cares, so a roof that works in a blizzard also works in
    // acid rain — the player should never have to guess which is which.
    const ceiling = this.collisionFor(position);

    this.hydration = Math.max(0, this.hydration - dt);
    this.torch = Math.max(0, this.torch - dt);

    const effect = this.disaster.update(dt, progress, {
      position,
      eye: this._eye,
      grounded: this.player.grounded,
      ceiling,
      sheltered: Number.isFinite(ceiling),
      hydrated: this.hydration > 0,
      lit: this.torch > 0,
      peakHeight: this.map.info.peakHeight,
    });
    this.status = this.alive ? effect.status : 'Heading back to the lobby';

    if (this.alive) {
      if (effect.damage > 0) {
        this.health = Math.max(0, this.health - effect.damage);
        this.sinceDamage = 0;

        if (this.health === 0) {
          this.alive = false;
          // Nobody dies in this game. Your energy runs out and you are sent
          // back to the lobby to try again.
          this.status = 'Out of energy — heading back!';
          this.onEvent?.('out');
        }
      } else {
        this.sinceDamage += dt;
        if (this.sinceDamage > REGEN_DELAY) {
          this.health = Math.min(MAX_HEALTH, this.health + REGEN_RATE * dt);
        }
      }
    }

    // Once everyone is out of energy the round ends early.
    if (!this.alive) {
      this._finishMatch(false);
      return;
    }

    if (this.timeLeft === 0) this._finishMatch(true);
  }
}
