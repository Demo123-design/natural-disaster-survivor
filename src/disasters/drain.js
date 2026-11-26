// The four disasters that work by draining you (PRD section 6.2).
//
//   Blizzard          cold, unless you are under cover
//   Extreme heatwave  heat, unless you are in shade
//   Acid rain         corrosion, unless you are under a roof
//   Drought           thirst, unless you are at the water
//
// They share one shape: something drains your health while you are exposed,
// stops when you are not, and the map's shelter is the answer. Writing them
// as one parameterised disaster keeps that promise identical across all
// four — if cover works for the blizzard it works for the acid rain.
//
// They are the long ones (90s, 90s, 75s, 90s) because surviving them is
// about staying put somewhere correct rather than reacting.

import * as THREE from 'three';
import { weather, SAFE } from './common.js';

/**
 * @typedef {object} DrainSpec
 * @property {string} id
 * @property {string} name
 * @property {string} advice
 * @property {number} duration
 * @property {number} rate HP per second while exposed
 * @property {string} exposedStatus
 * @property {string} safeStatus
 * @property {object} [weather] particle settings, if it has weather
 * @property {number} [tint] a colour laid over the sky as it worsens
 * @property {'cover'|'water'} shelter what counts as safe
 * @property {boolean} [quenched] true when a water bottle holds it off
 */

export const BLIZZARD = {
  id: 'blizzard', name: 'Blizzard',
  advice: 'Cold and no visibility. Get under cover and stay there.',
  duration: 90, rate: 9, shelter: 'cover',
  exposedStatus: 'Brrr! Too cold!', safeStatus: 'Sheltered from the cold',
  weather: { count: 2200, color: 0xffffff, size: 0.18, fall: 7, drift: 3.4, opacity: 0.95 },
  tint: 0xdfe9f2, visibility: 0.35,
};

export const HEATWAVE = {
  id: 'heatwave', name: 'Extreme heatwave',
  advice: 'The sun is lethal. Find shade or get indoors.',
  duration: 90, rate: 8, shelter: 'cover', quenched: true,
  exposedStatus: 'Phew! Too hot!', safeStatus: 'In the shade',
  tint: 0xffb25e, visibility: 0.9,
};

export const ACID_RAIN = {
  id: 'acidrain', name: 'Acid rain',
  advice: 'The rain burns. Stay under a roof the whole time.',
  duration: 75, rate: 11, shelter: 'cover',
  exposedStatus: 'Yuck! Acid rain!', safeStatus: 'Under cover',
  weather: { count: 2000, color: 0xb6e05a, size: 0.1, fall: 22, drift: 0.5, opacity: 0.75 },
  tint: 0x9ab84a, visibility: 0.7,
};

export const DROUGHT = {
  id: 'drought', name: 'Drought',
  advice: 'The water is drying up. Find what is left of it and stay close.',
  duration: 90, rate: 7, shelter: 'water', quenched: true,
  exposedStatus: 'Getting thirsty!', safeStatus: 'At the water',
};

/**
 * The drought needs somewhere to drink, and not every map has a pool, so it
 * brings its own: a shrinking pond that is safety until it is gone.
 */
function buildWaterhole(scene, map) {
  const START_RADIUS = 9;
  const pool = new THREE.Mesh(
    new THREE.CircleGeometry(START_RADIUS, 24),
    new THREE.MeshBasicMaterial({ color: 0x2f7fa0, transparent: true, opacity: 0.9 }),
  );
  pool.rotation.x = -Math.PI / 2;
  // Away from the middle, so reaching it is a decision rather than a default.
  pool.position.set(map.info.halfSize * 0.42, 0.05, -map.info.halfSize * 0.36);
  scene.add(pool);

  const bed = new THREE.Mesh(
    new THREE.CircleGeometry(START_RADIUS + 1.5, 24),
    new THREE.MeshBasicMaterial({ color: 0x6b5a42 }),
  );
  bed.rotation.x = -Math.PI / 2;
  bed.position.set(pool.position.x, 0.03, pool.position.z);
  scene.add(bed);

  return {
    position: pool.position,
    /** Shrinks to a quarter of its size, never to nothing. */
    radius(progress) {
      return START_RADIUS * (1 - 0.75 * progress);
    },
    update(progress) {
      const scale = Math.max(0.05, 1 - 0.75 * progress);
      pool.scale.set(scale, scale, 1);
    },
    dispose() {
      for (const mesh of [pool, bed]) {
        scene.remove(mesh);
        mesh.geometry.dispose();
        mesh.material.dispose();
      }
    },
  };
}

/**
 * Builds one of the drain disasters.
 *
 * @param {DrainSpec} spec
 */
export function createDrain(spec) {
  return function create(scene, map) {
    const particles = spec.weather ? weather(scene, spec.weather) : null;
    const waterhole = spec.shelter === 'water' ? buildWaterhole(scene, map) : null;
    let elapsed = 0;

    return {
      info: spec,
      /** How much the view should close in, 0 to 1. Read by the renderer. */
      murk: 0,
      tint: spec.tint ?? null,

      update(dt, progress, ctx) {
        elapsed += dt;
        particles?.update(dt, ctx.position, elapsed);

        // The weather thickens over the first third and then holds.
        const intensity = Math.min(1, progress * 3);
        this.murk = spec.visibility ? intensity * (1 - spec.visibility) : 0;
        // A lit torch does not stop the cold, but you can see again.
        if (ctx.lit) this.murk *= 0.45;

        let safe;
        if (waterhole) {
          waterhole.update(progress);
          const distance = Math.hypot(
            ctx.position.x - waterhole.position.x,
            ctx.position.z - waterhole.position.z,
          );
          safe = distance < waterhole.radius(progress);
        } else {
          safe = ctx.sheltered;
        }

        if (safe) return { damage: 0, status: spec.safeStatus };

        // A water bottle holds off heat and thirst wherever you are, which
        // is the whole reason to carry one (PRD section 7).
        if (spec.quenched && ctx.hydrated) {
          return { damage: 0, status: 'Sipping water' };
        }

        // The drain ramps up, so the first few seconds outside are a warning
        // rather than a death sentence.
        return { damage: spec.rate * intensity * dt, status: spec.exposedStatus };
      },

      dispose() {
        particles?.dispose();
        waterhole?.dispose();
      },
    };
  };
}

export const createBlizzard = createDrain(BLIZZARD);
export const createHeatwave = createDrain(HEATWAVE);
export const createAcidRain = createDrain(ACID_RAIN);
export const createDrought = createDrain(DROUGHT);
