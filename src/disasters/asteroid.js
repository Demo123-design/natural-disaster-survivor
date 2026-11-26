// Asteroid (PRD section 6, disaster 5). Every map except the Cave.
//
// "Warning shadows, then meteor impacts with blast radius. Keep moving; stay
// out of marked impact circles."
//
// Every impact is announced by a circle on the ground. Standing still is the
// only way to die, which is the opposite of the flood's answer.

import * as THREE from 'three';
import { marker, weather, disposeAll, makeRandom, flatDistance, SAFE, OUT } from './common.js';

export const ASTEROID = {
  id: 'asteroid',
  name: 'Asteroid',
  advice: 'Meteors are falling. Circles show where — keep moving and stay out of them.',
  duration: 60,
};

const WARNING_TIME = 1.9;
const BLAST_RADIUS = 6.5;
const DIRECT_RADIUS = 2.2;
const BLAST_DAMAGE = 55;

export function createAsteroid(scene, map) {
  const random = makeRandom(60606);
  const reach = map.info.halfSize - 5;

  const strikes = [];
  const rockMaterial = new THREE.MeshBasicMaterial({ color: 0x4a3a30 });
  const trailMaterial = new THREE.MeshBasicMaterial({ color: 0xffa23c, transparent: true, opacity: 0.6 });

  const dust = weather(scene, { count: 500, color: 0x6b5a4a, size: 0.16, fall: 2.2, opacity: 0.5 });

  let elapsed = 0;
  let nextStrike = 1.2;
  /** Craters stay, so the map tells the story of the last minute. */
  const craters = [];
  const craterMaterial = new THREE.MeshBasicMaterial({ color: 0x3a2f28 });

  /**
   * Drops a meteor somewhere near the player.
   *
   * Scattered evenly over the map, a player who never moved just took
   * glancing blasts and healed between them, so "keep moving" meant
   * nothing. Aiming near them makes standing still the thing that gets you
   * — and the circle on the ground is a nearly two-second warning, so
   * moving always works.
   */
  function launch(near) {
    const angle = random() * Math.PI * 2;
    const distance = 3 + random() * 20;
    const x = Math.max(-reach, Math.min(reach, near.x + Math.cos(angle) * distance));
    const z = Math.max(-reach, Math.min(reach, near.z + Math.sin(angle) * distance));

    const ring = marker(scene, { radius: BLAST_RADIUS, color: 0xffa23c });
    ring.position.set(x, 0.07, z);

    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(1.8, 0), rockMaterial);
    rock.position.set(x, 60, z);
    scene.add(rock);

    const trail = new THREE.Mesh(new THREE.ConeGeometry(1.4, 7, 8), trailMaterial);
    trail.position.set(x, 66, z);
    scene.add(trail);

    strikes.push({ x, z, age: 0, ring, rock, trail });
  }

  return {
    info: ASTEROID,
    shake: 0,
    /** Circles that have not landed yet, so they can be avoided. */
    get hazards() {
      return strikes.filter((s) => !s.hit).map((s) => ({ x: s.x, z: s.z, radius: BLAST_RADIUS }));
    },

    update(dt, progress, ctx) {
      elapsed += dt;
      dust.update(dt, ctx.position, elapsed);
      this.shake = Math.max(0, this.shake - dt * 1.4);

      // A steady barrage. Spread too thin, a player who never moved simply
      // healed through it between impacts, which made the whole disaster
      // optional.
      nextStrike -= dt;
      if (nextStrike <= 0) {
        launch(ctx.position);
        if (progress > 0.55) launch(ctx.position);
        nextStrike = 1.5 - progress * 0.7;
      }

      let damage = 0;
      let status = null;

      for (let i = strikes.length - 1; i >= 0; i -= 1) {
        const strike = strikes[i];
        strike.age += dt;

        if (strike.age < WARNING_TIME) {
          const fall = strike.age / WARNING_TIME;
          strike.rock.position.y = 60 * (1 - fall * fall);
          strike.trail.position.y = strike.rock.position.y + 5.5;
          strike.rock.rotation.x += dt * 4;
          strike.ring.material.opacity = 0.45 + Math.sin(strike.age * 18) * 0.4;
          if (flatDistance(ctx.position, strike) < BLAST_RADIUS) status = 'Hop out of the circle!';
          continue;
        }

        if (!strike.hit) {
          strike.hit = true;
          strike.rock.visible = false;
          strike.trail.visible = false;
          strike.ring.visible = false;
          this.shake = 0.3;

          const crater = new THREE.Mesh(new THREE.CircleGeometry(BLAST_RADIUS * 0.8, 18), craterMaterial);
          crater.rotation.x = -Math.PI / 2;
          crater.position.set(strike.x, 0.04, strike.z);
          scene.add(crater);
          craters.push(crater);

          const distance = flatDistance(ctx.position, strike);
          if (distance < DIRECT_RADIUS) {
            damage = OUT;
            status = 'A meteor bonked you!';
          } else if (distance < BLAST_RADIUS) {
            damage += BLAST_DAMAGE * (1 - distance / BLAST_RADIUS);
            status = 'Too close to that one!';
          }
        }

        if (strike.age > WARNING_TIME + 1.2) {
          disposeAll(scene, [strike.ring, strike.rock, strike.trail]);
          strikes.splice(i, 1);
        }
      }

      return damage > 0 || status ? { damage, status } : SAFE;
    },

    dispose() {
      for (const strike of strikes) disposeAll(scene, [strike.ring, strike.rock, strike.trail]);
      disposeAll(scene, craters);
      dust.dispose();
      rockMaterial.dispose();
      trailMaterial.dispose();
      craterMaterial.dispose();
    },
  };
}
