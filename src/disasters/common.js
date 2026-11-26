// Shared disaster tools.
//
// Every disaster is built the same way: it makes its own meshes, is given the
// player's situation once a frame, and answers with how much it hurt them.
// It never moves the player and never ends the round — the round controller
// owns both.
//
// The context a disaster is handed each frame (see round.js):
//   eye        the player's eye position
//   position   their feet
//   grounded   standing on something
//   ceiling    height of the lowest thing overhead, or Infinity for open sky
//   sheltered  true when something is overhead
//   height     the highest ground this map has, for scaling hazards

import * as THREE from 'three';
import { canvasTexture, toon } from '../materials.js';

/** Returned by a disaster that is doing nothing to you this frame. */
export const SAFE = { damage: 0, status: null };

/**
 * Enough to empty the energy bar at once.
 *
 * Nothing in this game kills anybody: when your energy runs out you are
 * simply sent back to the lobby to try again. The hazards that used to be
 * called instant kills are the ones that empty the bar in one go.
 */
export const OUT = Infinity;

/** Deterministic pseudo-random, so a disaster plays out the same way twice. */
export function makeRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

/**
 * A large horizontal surface that rises over the course of the disaster:
 * flood water, lava, the mud left behind by a slide.
 */
export function risingSurface(scene, map, { color, opacity = 0.8, texture = null, emissive = false }) {
  const span = map.info.halfSize * 2 + 24;
  const material = emissive
    ? new THREE.MeshBasicMaterial({ color, map: texture, transparent: opacity < 1, opacity })
    : new THREE.MeshBasicMaterial({ color, map: texture, transparent: true, opacity, depthWrite: false });
  material.side = THREE.DoubleSide;

  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(span, span), material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.renderOrder = 5;
  scene.add(mesh);

  return {
    mesh,
    set level(y) { mesh.position.y = y; },
    get level() { return mesh.position.y; },
    dispose() {
      scene.remove(mesh);
      mesh.geometry.dispose();
      material.dispose();
      texture?.dispose();
    },
  };
}

/** Loose horizontal streaks, which read as a moving liquid once scrolled. */
export function liquidTexture(base, streak) {
  const texture = canvasTexture(256, 256, (ctx, canvas) => {
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = streak;
    ctx.lineWidth = 3;
    for (let i = 0; i < 26; i += 1) {
      const y = (i / 26) * canvas.height + Math.sin(i) * 4;
      ctx.beginPath();
      ctx.moveTo(0, y);
      for (let x = 0; x <= canvas.width; x += 16) {
        ctx.lineTo(x, y + Math.sin((x / canvas.width) * Math.PI * 4 + i) * 3);
      }
      ctx.stroke();
    }
  });
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(10, 10);
  return texture;
}

/**
 * A flat ring drawn on the ground to mark where something is about to land.
 * Warnings are what make an instant-kill hazard fair rather than cruel.
 */
export function marker(scene, { radius, color = 0xff5a3c }) {
  const mesh = new THREE.Mesh(
    new THREE.RingGeometry(radius * 0.72, radius, 28),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false }),
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.renderOrder = 4;
  scene.add(mesh);
  return mesh;
}

/**
 * A field of drifting points: snow, ash, rain, dust.
 *
 * The field is a fixed box that follows the player, so a few thousand points
 * look like weather everywhere instead of thinning out at the edges.
 */
export function weather(scene, { count = 1400, color = 0xffffff, size = 0.17, area = 44, fall = 6, drift = 1.4, opacity = 0.9 }) {
  const positions = new Float32Array(count * 3);
  const random = makeRandom(5150);
  for (let i = 0; i < count; i += 1) {
    positions[i * 3] = (random() - 0.5) * area;
    positions[i * 3 + 1] = random() * 26;
    positions[i * 3 + 2] = (random() - 0.5) * area;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({ color, size, transparent: true, opacity, depthWrite: false });
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  scene.add(points);

  return {
    points,
    /** @param {THREE.Vector3} centre the player, so the field follows them */
    update(dt, centre, elapsed = 0) {
      const array = geometry.attributes.position.array;
      for (let i = 0; i < count; i += 1) {
        const j = i * 3;
        array[j + 1] -= fall * dt;
        array[j] += Math.sin(elapsed * 0.8 + i) * drift * dt;
        if (array[j + 1] < -2) array[j + 1] = 24;
        // Wrap around the player rather than respawning at the centre.
        if (array[j] - centre.x > area / 2) array[j] -= area;
        if (array[j] - centre.x < -area / 2) array[j] += area;
        if (array[j + 2] - centre.z > area / 2) array[j + 2] -= area;
        if (array[j + 2] - centre.z < -area / 2) array[j + 2] += area;
      }
      geometry.attributes.position.needsUpdate = true;
    },
    dispose() {
      scene.remove(points);
      geometry.dispose();
      material.dispose();
    },
  };
}

/** Removes a list of meshes from the scene and frees their geometry. */
export function disposeAll(scene, objects) {
  for (const obj of objects) {
    scene.remove(obj);
    obj.geometry?.dispose();
    if (obj.material) {
      const list = Array.isArray(obj.material) ? obj.material : [obj.material];
      for (const m of list) m.dispose();
    }
  }
}

/** Distance between two points, ignoring height. */
export function flatDistance(a, b) {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

export { toon };
