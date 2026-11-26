// Tornado (PRD section 6, disaster 3).
// City, Desert, Badlands, Forest, Tundra.
//
// "A moving funnel wanders the map, sucking in anything nearby. Stay out of
// its radius; shelter indoors or behind heavy cover."
//
// The funnel never teleports and never chases perfectly: it drifts on a
// smooth path, so it can always be read and outrun.

import * as THREE from 'three';
import { weather, makeRandom, flatDistance, SAFE, OUT } from './common.js';

export const TORNADO = {
  id: 'tornado',
  name: 'Tornado',
  advice: 'A funnel is crossing the map. Stay well clear of it, or get under cover.',
  duration: 60,
};

/** Inside this, the PRD calls it an instant kill. */
const KILL_RADIUS = 3.4;
/** Out to here it drags at you and hurts. */
const PULL_RADIUS = 11;
const PULL_DAMAGE = 26;
/** Indoors the wind cannot reach you, so cover halves the pull. */
const SHELTER_FACTOR = 0.25;
/**
 * How fast the funnel can travel, in metres per second. Deliberately below
 * a sprint (7.8), so running away always works.
 */
const SPEED = 4.6;
/**
 * How strongly it leans towards the player, early and late.
 *
 * It starts wandering and finishes hunting. Leaning only part of the way
 * meant it circled at a polite distance and never actually arrived, so
 * standing still was a free win on half the maps.
 */
const PURSUIT_START = 0.3;
const PURSUIT_END = 0.95;

function funnelTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createLinearGradient(0, 0, 0, 128);
  grad.addColorStop(0, 'rgba(90, 96, 110, 0.15)');
  grad.addColorStop(0.5, 'rgba(70, 74, 88, 0.75)');
  grad.addColorStop(1, 'rgba(48, 50, 60, 0.95)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 32, 128);
  for (let i = 0; i < 40; i += 1) {
    ctx.fillStyle = `rgba(200, 204, 214, ${0.05 + (i % 4) * 0.05})`;
    ctx.fillRect(0, i * 3.2, 32, 1.4);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3, 1);
  return texture;
}

export function createTornado(scene, map) {
  const texture = funnelTexture();
  const funnel = new THREE.Mesh(
    new THREE.CylinderGeometry(7.5, KILL_RADIUS, 26, 20, 1, true),
    new THREE.MeshBasicMaterial({
      map: texture, transparent: true, opacity: 0.88,
      side: THREE.DoubleSide, depthWrite: false,
    }),
  );
  funnel.position.set(0, 13, 0);
  scene.add(funnel);

  const debris = weather(scene, {
    count: 500, color: 0x7a6a52, size: 0.22, area: 26, fall: -3, drift: 5, opacity: 0.8,
  });

  const random = makeRandom(31337);
  const reach = map.info.halfSize - 8;
  // Four waypoints, looped. A wandering path beats random jumps: you can
  // watch where it is heading and move the other way.
  const path = [];
  for (let i = 0; i < 5; i += 1) {
    path.push(new THREE.Vector2((random() - 0.5) * reach * 2, (random() - 0.5) * reach * 2));
  }

  let elapsed = 0;
  const at = new THREE.Vector2();

  return {
    info: TORNADO,
    get position() { return funnel.position; },
    /** The funnel, so anything deciding where to stand can avoid it. */
    get hazards() {
      return [{ x: funnel.position.x, z: funnel.position.z, radius: PULL_RADIUS }];
    },

    update(dt, progress, ctx) {
      elapsed += dt;
      texture.offset.x = (texture.offset.x - dt * 1.6) % 1;
      funnel.rotation.y += dt * 2.4;

      // It follows a wandering route, leaning part of the way towards the
      // player. On rails it simply missed most people; chasing outright
      // would be unfair. Leaning, and capped below sprinting speed, it finds
      // you but can always be outrun.
      const t = progress * path.length;
      const index = Math.floor(t) % path.length;
      const next = (index + 1) % path.length;
      const blend = t - Math.floor(t);
      at.copy(path[index]).lerp(path[next], blend);
      const pursuit = PURSUIT_START + (PURSUIT_END - PURSUIT_START) * progress;
      at.x += (ctx.position.x - at.x) * pursuit;
      at.y += (ctx.position.z - at.y) * pursuit;

      const toX = at.x - funnel.position.x;
      const toZ = at.y - funnel.position.z;
      const span = Math.hypot(toX, toZ);
      if (span > 0.001) {
        const step = Math.min(SPEED * dt, span);
        funnel.position.x += (toX / span) * step;
        funnel.position.z += (toZ / span) * step;
      }

      debris.update(dt, funnel.position, elapsed);
      debris.points.position.set(0, 0, 0);

      const distance = flatDistance(ctx.position, funnel.position);

      if (distance < KILL_RADIUS) {
        return { damage: OUT, status: 'Whoosh! It got you!' };
      }
      if (distance < PULL_RADIUS) {
        const closeness = 1 - distance / PULL_RADIUS;
        const shielded = ctx.sheltered ? SHELTER_FACTOR : 1;
        return {
          damage: PULL_DAMAGE * closeness * shielded * dt,
          status: ctx.sheltered ? 'Sheltering from the wind' : 'The wind is pulling you!',
        };
      }
      if (distance < PULL_RADIUS + 9) return { damage: 0, status: 'The tornado is close' };
      return SAFE;
    },

    dispose() {
      scene.remove(funnel);
      funnel.geometry.dispose();
      funnel.material.dispose();
      texture.dispose();
      debris.dispose();
    },
  };
}
