// Collision against axis-aligned boxes.
//
// The player is treated as a vertical cylinder: a circle in XZ, with a height
// in Y. That is cheap, predictable, and enough for a game made of rooms,
// crates and platforms. A full physics engine would be overkill here.

import * as THREE from 'three';

const EPS = 1e-6;

export class CollisionWorld {
  constructor() {
    /** @type {THREE.Box3[]} */
    this.boxes = [];
    /** Flat ground plane height; null disables it. */
    this.groundY = 0;
  }

  addBox(box) {
    this.boxes.push(box);
    return box;
  }

  /** Adds a mesh's world-space bounding box as a collider. */
  addMesh(mesh) {
    mesh.updateWorldMatrix(true, false);
    return this.addBox(new THREE.Box3().setFromObject(mesh));
  }

  clear() {
    this.boxes.length = 0;
  }

  /**
   * True when the player's circle overlaps this box in XZ.
   * Also reports the closest point, so callers can push out along it.
   */
  static overlapXZ(box, x, z, radius) {
    const closestX = Math.min(Math.max(x, box.min.x), box.max.x);
    const closestZ = Math.min(Math.max(z, box.min.z), box.max.z);
    const dx = x - closestX;
    const dz = z - closestZ;
    const dist2 = dx * dx + dz * dz;
    const inside = x > box.min.x && x < box.max.x && z > box.min.z && z < box.max.z;
    return { hit: inside || dist2 < radius * radius, dx, dz, dist2, inside };
  }

  /**
   * Pushes the player out of any box they are intersecting horizontally.
   *
   * Boxes whose top is within `stepHeight` of the player's feet are ignored,
   * so low ledges are walked onto rather than bumped into.
   *
   * @param {THREE.Vector3} position feet position, modified in place
   */
  resolveHorizontal(position, radius, height, stepHeight = 0.35) {
    for (const box of this.boxes) {
      // No vertical overlap: the player passes above or below it.
      if (box.max.y <= position.y + stepHeight + EPS) continue;
      if (box.min.y >= position.y + height - EPS) continue;

      const { hit, dx, dz, dist2, inside } = CollisionWorld.overlapXZ(
        box,
        position.x,
        position.z,
        radius,
      );
      if (!hit) continue;

      if (!inside && dist2 > EPS) {
        // Push straight out along the surface normal.
        const dist = Math.sqrt(dist2);
        const push = radius - dist;
        position.x += (dx / dist) * push;
        position.z += (dz / dist) * push;
        continue;
      }

      // Centre is inside the box: leave by the nearest face.
      const toMinX = position.x - box.min.x;
      const toMaxX = box.max.x - position.x;
      const toMinZ = position.z - box.min.z;
      const toMaxZ = box.max.z - position.z;
      const least = Math.min(toMinX, toMaxX, toMinZ, toMaxZ);

      if (least === toMinX) position.x = box.min.x - radius;
      else if (least === toMaxX) position.x = box.max.x + radius;
      else if (least === toMinZ) position.z = box.min.z - radius;
      else position.z = box.max.z + radius;
    }
  }

  /**
   * The highest surface the player can stand on at this XZ position, at or
   * below their feet (plus a step tolerance). Returns the ground plane if
   * nothing else supports them.
   */
  supportHeight(position, radius, stepHeight = 0.35) {
    let best = this.groundY ?? -Infinity;

    for (const box of this.boxes) {
      if (box.max.y > position.y + stepHeight + EPS) continue;
      if (box.max.y <= best) continue;
      if (!CollisionWorld.overlapXZ(box, position.x, position.z, radius).hit) continue;
      best = box.max.y;
    }

    return best;
  }

  /**
   * The lowest overhead surface at this XZ position.
   *
   * Boxes are selected by being above the player's *feet*, not above their
   * head: testing against the head means that once a jump has already pushed
   * the head inside a box, the box stops counting and the player passes
   * straight through it.
   */
  ceilingHeight(position, radius, height) {
    let best = Infinity;

    for (const box of this.boxes) {
      if (box.min.y < position.y + 0.1) continue;
      if (box.min.y >= best) continue;
      if (!CollisionWorld.overlapXZ(box, position.x, position.z, radius).hit) continue;
      best = box.min.y;
    }

    return best;
  }

  /**
   * Distance along a ray before it enters a box, used to stop the camera
   * passing through walls. `padding` fattens the boxes so the near plane does
   * not clip through a surface the camera is resting against.
   */
  rayDistance(origin, direction, maxDistance, padding = 0.2) {
    let nearest = maxDistance;

    for (const box of this.boxes) {
      let tMin = 0;
      let tMax = nearest;
      let missed = false;

      for (const axis of ['x', 'y', 'z']) {
        const min = box.min[axis] - padding;
        const max = box.max[axis] + padding;
        const d = direction[axis];

        if (Math.abs(d) < EPS) {
          if (origin[axis] < min || origin[axis] > max) {
            missed = true;
            break;
          }
          continue;
        }

        let t1 = (min - origin[axis]) / d;
        let t2 = (max - origin[axis]) / d;
        if (t1 > t2) [t1, t2] = [t2, t1];

        tMin = Math.max(tMin, t1);
        tMax = Math.min(tMax, t2);
        if (tMin > tMax) {
          missed = true;
          break;
        }
      }

      if (!missed && tMin < nearest) nearest = tMin;
    }

    return nearest;
  }
}
