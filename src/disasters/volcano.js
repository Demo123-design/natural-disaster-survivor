// Volcanic eruption (PRD section 6, disaster 1).
// Mountain, Badlands, Forest, City, Cave.
//
// "Lava flows spread along low ground; falling fire-rocks. Get to high
// ground away from lava; avoid rock impact shadows."
//
// Two hazards at once: the lava is a slow line you must stay above, and the
// rocks are sudden but always announced by a ring on the ground first.

import * as THREE from 'three';
import {
  risingSurface, liquidTexture, marker, weather, disposeAll,
  makeRandom, flatDistance, SAFE, OUT,
} from './common.js';

export const VOLCANO = {
  id: 'volcano',
  name: 'Volcanic eruption',
  advice: 'Lava is spreading along the low ground, and rocks are falling. Climb, and watch for rings.',
  duration: 75,
};

const LAVA_LEVEL = 3.2;
const CALM_FRACTION = 0.1;
/** How long a ring shows before the rock lands on it. */
const WARNING_TIME = 2.0;
const BLAST_RADIUS = 4.2;
const BLAST_DAMAGE = 45;

export function createVolcano(scene, map) {
  const texture = liquidTexture('#d2440f', 'rgba(255, 196, 80, 0.75)');
  const lava = risingSurface(scene, map, { color: 0xffffff, opacity: 1, texture, emissive: true });
  lava.level = -3;

  const glow = new THREE.PointLight(0xff6a20, 0, 60, 2);
  glow.position.set(0, 6, 0);
  scene.add(glow);

  const ash = weather(scene, { count: 900, color: 0x3a3238, size: 0.2, fall: 3.4, drift: 2.0, opacity: 0.75 });

  const random = makeRandom(4242);
  /** @type {Array<{x:number,z:number,age:number,ring:THREE.Mesh,rock:THREE.Mesh}>} */
  const strikes = [];
  let nextStrike = 1.5;
  let elapsed = 0;

  const rockMaterial = new THREE.MeshBasicMaterial({ color: 0x3a2a25 });

  function launch() {
    const reach = map.info.halfSize - 6;
    const x = (random() - 0.5) * reach * 2;
    const z = (random() - 0.5) * reach * 2;

    const ring = marker(scene, { radius: BLAST_RADIUS, color: 0xff7a2a });
    ring.position.set(x, 0.06, z);

    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(1.1, 0), rockMaterial);
    rock.position.set(x, 34, z);
    scene.add(rock);

    strikes.push({ x, z, age: 0, ring, rock });
  }

  return {
    info: VOLCANO,
    get level() { return lava.level; },
    /** Rings that have not been struck yet. */
    get hazards() {
      return strikes.filter((s) => s.age < WARNING_TIME).map((s) => ({ x: s.x, z: s.z, radius: BLAST_RADIUS }));
    },

    update(dt, progress, ctx) {
      elapsed += dt;
      texture.offset.x = (texture.offset.x + dt * 0.03) % 1;
      texture.offset.y = (texture.offset.y + dt * 0.02) % 1;
      ash.update(dt, ctx.position, elapsed);

      const risen = Math.max(0, (progress - CALM_FRACTION) / (1 - CALM_FRACTION));
      lava.level = -3 + (LAVA_LEVEL + 3) * risen;
      glow.intensity = 14 * risen;
      glow.position.set(ctx.position.x, lava.level + 3, ctx.position.z);

      // Rocks fall more often as the eruption builds.
      nextStrike -= dt;
      if (nextStrike <= 0) {
        launch();
        nextStrike = 2.6 - progress * 1.6;
      }

      let damage = 0;
      let status = null;

      for (let i = strikes.length - 1; i >= 0; i -= 1) {
        const strike = strikes[i];
        strike.age += dt;

        if (strike.age < WARNING_TIME) {
          // The rock falls towards the ring while the ring pulses.
          const fall = strike.age / WARNING_TIME;
          strike.rock.position.y = 34 * (1 - fall * fall);
          strike.rock.rotation.x += dt * 3;
          strike.ring.material.opacity = 0.5 + Math.sin(strike.age * 16) * 0.35;
          if (flatDistance(ctx.position, strike) < BLAST_RADIUS) status = 'Rock coming — move!';
          continue;
        }

        if (strike.age < WARNING_TIME + 0.12) {
          // The moment of impact.
          strike.rock.position.y = 0.8;
          const distance = flatDistance(ctx.position, strike);
          if (distance < 1.4) {
            damage = OUT;
            status = 'A rock bonked you!';
          } else if (distance < BLAST_RADIUS) {
            damage += BLAST_DAMAGE * (1 - distance / BLAST_RADIUS);
            status = 'Too close to that one!';
          }
          continue;
        }

        if (strike.age > WARNING_TIME + 2.4) {
          disposeAll(scene, [strike.ring, strike.rock]);
          strikes.splice(i, 1);
        }
      }

      // Lava contact is listed as an instant kill.
      if (ctx.position.y < lava.level) {
        return { damage: OUT, status: 'Too hot down there!' };
      }
      if (ctx.position.y - 1.0 < lava.level && !status) status = 'Lava is rising';

      return damage > 0 || status ? { damage, status } : SAFE;
    },

    dispose() {
      lava.dispose();
      ash.dispose();
      scene.remove(glow);
      for (const strike of strikes) disposeAll(scene, [strike.ring, strike.rock]);
      rockMaterial.dispose();
    },
  };
}
