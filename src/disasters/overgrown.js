// Overgrown forest (PRD section 6, disaster 10).
// Forest, Cave, Mountain, City.
//
// "Vines and plants rapidly grow, blocking paths and trapping players. Keep
// clearing, keep moving, don't get enclosed; reach a clear zone."
//
// The growth spreads outward from seed points, so the safe ground shrinks
// rather than vanishing. The clear zone is marked from the start: it is the
// one place the vines never reach, and getting there early is the answer.

import * as THREE from 'three';
import { disposeAll, makeRandom, flatDistance, SAFE } from './common.js';

export const OVERGROWN = {
  id: 'overgrown',
  name: 'Overgrown forest',
  advice: 'Everything is growing. The green circle stays clear — get to it.',
  duration: 60,
};

/** Being inside the growth hurts; it is not an instant kill. */
const CHOKE_RATE = 16;
const CLEAR_RADIUS = 7.5;
const VINE_RADIUS = 2.4;

export function createOvergrown(scene, map) {
  const random = makeRandom(1212);
  const reach = map.info.halfSize - 6;

  // The safe clearing, marked from the first frame.
  const safeSpot = new THREE.Vector3(-map.info.halfSize * 0.4, 0, map.info.halfSize * 0.4);
  const ringMaterial = new THREE.MeshBasicMaterial({
    color: 0x7df09a, transparent: true, opacity: 0.6, side: THREE.DoubleSide, depthWrite: false,
  });
  const ring = new THREE.Mesh(new THREE.RingGeometry(CLEAR_RADIUS - 0.5, CLEAR_RADIUS, 36), ringMaterial);
  ring.rotation.x = -Math.PI / 2;
  ring.position.copy(safeSpot);
  ring.position.y = 0.08;
  scene.add(ring);

  const vineMaterial = new THREE.MeshBasicMaterial({ color: 0x2f6b32 });
  const leafMaterial = new THREE.MeshBasicMaterial({ color: 0x4a9e46 });

  /** Seed points the growth spreads from. None of them is the clearing. */
  const seeds = [];
  for (let i = 0; i < 26; i += 1) {
    let x;
    let z;
    let tries = 0;
    do {
      x = (random() - 0.5) * reach * 2;
      z = (random() - 0.5) * reach * 2;
      tries += 1;
      // Only the clearing itself is spared. A wider exclusion left a quiet
      // ring around it where you could stand untouched, which made getting
      // into the circle pointless.
    } while (Math.hypot(x - safeSpot.x, z - safeSpot.z) < CLEAR_RADIUS + 2.5 && tries < 30);
    seeds.push({ x, z });
  }

  const vines = [];
  let nextVine = 0.4;

  function sprout() {
    const seed = seeds[Math.floor(random() * seeds.length)];
    // Each new vine grows near an existing one, so the patch spreads.
    const spread = 3 + random() * 13;
    const angle = random() * Math.PI * 2;
    const x = seed.x + Math.cos(angle) * spread;
    const z = seed.z + Math.sin(angle) * spread;

    if (Math.hypot(x - safeSpot.x, z - safeSpot.z) < CLEAR_RADIUS + 2) return;
    if (Math.abs(x) > reach || Math.abs(z) > reach) return;

    const height = 2.4 + random() * 2.6;
    const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.3, height, 6), vineMaterial);
    stalk.position.set(x, height / 2, z);
    stalk.scale.y = 0.02;
    scene.add(stalk);

    const crown = new THREE.Mesh(new THREE.DodecahedronGeometry(1.1 + random() * 0.6, 0), leafMaterial);
    crown.position.set(x, height, z);
    crown.scale.setScalar(0.02);
    scene.add(crown);

    vines.push({ x, z, stalk, crown, height, age: 0 });
    // Vines become seeds themselves, which is what makes it spread.
    if (random() > 0.45) seeds.push({ x, z });
  }

  return {
    info: OVERGROWN,

    /**
     * Cuts back the growth around a point. This is what the axe does, and
     * the only disaster that has anything to clear (PRD section 7).
     *
     * @returns {number} how many vines were cut
     */
    clear(position, radius) {
      let cut = 0;
      for (let i = vines.length - 1; i >= 0; i -= 1) {
        const vine = vines[i];
        if (flatDistance(position, vine) > radius) continue;
        scene.remove(vine.stalk);
        scene.remove(vine.crown);
        vines.splice(i, 1);
        cut += 1;
      }
      return cut;
    },

    update(dt, progress, ctx) {
      // It has to actually reach you. With a slower spread a player who
      // stood still at the spawn was never touched, which made the clearing
      // pointless.
      nextVine -= dt;
      if (nextVine <= 0) {
        const bursts = 5 + Math.floor(progress * 9);
        for (let i = 0; i < bursts; i += 1) sprout();
        nextVine = 0.22;
      }

      ring.material.opacity = 0.45 + Math.sin(progress * 40) * 0.15;

      let enclosed = false;
      for (const vine of vines) {
        vine.age += dt;
        const grown = Math.min(1, vine.age / 1.4);
        vine.stalk.scale.y = 0.02 + grown * 0.98;
        vine.crown.scale.setScalar(0.02 + grown * 0.98);
        vine.crown.position.y = vine.height * (0.02 + grown * 0.98);

        if (grown > 0.5 && flatDistance(ctx.position, vine) < VINE_RADIUS) enclosed = true;
      }

      const inClearing = flatDistance(ctx.position, safeSpot) < CLEAR_RADIUS;
      if (inClearing) return { damage: 0, status: 'In the clearing' };
      if (enclosed) return { damage: CHOKE_RATE * dt, status: 'All tangled up!' };
      return SAFE;
    },

    dispose() {
      disposeAll(scene, [ring]);
      for (const vine of vines) {
        scene.remove(vine.stalk);
        scene.remove(vine.crown);
      }
      vineMaterial.dispose();
      leafMaterial.dispose();
      ringMaterial.dispose();
    },
  };
}
