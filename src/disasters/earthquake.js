// Earthquake (PRD section 6, disaster 4). Allowed on every map.
//
// "Screen shakes, ground cracks open, structures collapse. Stay away from
// cracks and falling buildings; open flat ground is safest."
//
// The one disaster where climbing is the wrong instinct: high ground is no
// safer, and the open middle of the map is.

import * as THREE from 'three';
import { disposeAll, makeRandom, SAFE, OUT } from './common.js';

export const EARTHQUAKE = {
  id: 'earthquake',
  name: 'Earthquake',
  advice: 'The ground is splitting. Open flat ground is safest — stay off the cracks.',
  duration: 50,
};

const CRACK_WIDTH = 2.6;
/** A crack takes this long to open, so it can be stepped away from. */
const OPEN_TIME = 1.6;

export function createEarthquake(scene, map) {
  const random = makeRandom(8181);
  const reach = map.info.halfSize - 5;

  const cracks = [];
  const crackMaterial = new THREE.MeshBasicMaterial({ color: 0x14100f });

  let elapsed = 0;
  let nextCrack = 2.0;

  /**
   * Opens a crack somewhere near the player.
   *
   * Scattering them over the whole map meant a player who never moved was
   * simply lucky or unlucky. Keeping the splitting close means the ground
   * you are standing on is always the ground at risk — and since a crack
   * takes 1.6 seconds to open, that is a warning rather than an ambush.
   */
  function open(near) {
    const angle = random() * Math.PI * 2;
    const distance = 5 + random() * 20;
    const x = Math.max(-reach, Math.min(reach, near.x + Math.cos(angle) * distance));
    const z = Math.max(-reach, Math.min(reach, near.z + Math.sin(angle) * distance));
    const crackAngle = random() * Math.PI;
    const length = 11 + random() * 11;

    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(CRACK_WIDTH, length), crackMaterial);
    mesh.rotation.x = -Math.PI / 2;
    mesh.rotation.z = crackAngle;
    mesh.position.set(x, 0.05, z);
    mesh.scale.x = 0.05;
    scene.add(mesh);

    cracks.push({
      mesh, x, z, length, age: 0,
      // Unit vector along the crack, so the distance test is a line test.
      dx: Math.sin(crackAngle), dz: Math.cos(crackAngle),
    });
  }

  /** Distance from the player to the centre line of a crack. */
  function distanceTo(crack, position) {
    const ox = position.x - crack.x;
    const oz = position.z - crack.z;
    const along = ox * crack.dx + oz * crack.dz;
    if (Math.abs(along) > crack.length / 2) return Infinity;
    return Math.abs(ox * crack.dz - oz * crack.dx);
  }

  return {
    info: EARTHQUAKE,
    /** Read by the renderer to shake the camera. */
    shake: 0,
    /** Open cracks, so anything deciding where to stand can see them. */
    get hazards() {
      return cracks.map((c) => ({
        x: c.x, z: c.z, dx: c.dx, dz: c.dz,
        length: c.length, width: CRACK_WIDTH * c.mesh.scale.x,
      }));
    },

    update(dt, progress, ctx) {
      elapsed += dt;

      // Shaking builds, peaks in the middle, and eases off at the end.
      const build = Math.sin(Math.min(1, progress * 1.15) * Math.PI);
      this.shake = build * 0.36;

      // Cracks come thick and fast. Standing still used to be a free win:
      // open ground is the right answer, but it has to be ground you keep
      // choosing rather than the spot you happened to start on.
      nextCrack -= dt;
      if (nextCrack <= 0 && progress > 0.06) {
        open(ctx.position);
        nextCrack = 1.7 - progress * 0.5;
      }

      let status = null;
      let damage = 0;

      for (const crack of cracks) {
        crack.age += dt;
        const opened = Math.min(1, crack.age / OPEN_TIME);
        crack.mesh.scale.x = 0.05 + opened * 0.95;

        const distance = distanceTo(crack, ctx.position);
        const halfWidth = (CRACK_WIDTH * crack.mesh.scale.x) / 2;

        if (distance < halfWidth && ctx.grounded) {
          if (opened >= 1) {
            damage = OUT;
            status = 'Oops — down you go!';
          } else {
            status = 'The ground is opening — move!';
          }
        } else if (distance < halfWidth + 2 && !status) {
          status = 'Standing near a crack';
        }
      }

      return damage > 0 || status ? { damage, status } : SAFE;
    },

    dispose() {
      disposeAll(scene, cracks.map((c) => c.mesh));
      crackMaterial.dispose();
    },
  };
}
