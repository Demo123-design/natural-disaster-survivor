// The player controller: movement, gravity, jumping, collision, and the
// third-person camera that follows the character.

import * as THREE from 'three';
import { createCharacter, animateCharacter, setSitting } from './character.js';
import { PLAYER } from './constants.js';

const CAMERA = {
  minDistance: 0.0,
  maxDistance: 7.5,
  defaultDistance: 4.2,
  zoomStep: 0.6,
  /** Below this the view becomes first person and the body is hidden. */
  firstPersonAt: 0.9,
  targetHeight: 1.5,
  pitchLimit: Math.PI / 2 - 0.05,
  sensitivity: 0.0022,
};

/** Shortest signed angle from a to b, so turning never takes the long way. */
function angleDelta(a, b) {
  return Math.atan2(Math.sin(b - a), Math.cos(b - a));
}

export class Player {
  /**
   * @param {THREE.Scene} scene
   * @param {import('./collision.js').CollisionWorld} collision
   */
  constructor(scene, collision, { shadeId = 'red', username = 'Player', wins = 0 } = {}) {
    this.collision = collision;

    /** Feet position. */
    this.position = new THREE.Vector3(0, 0, 0);
    this.velocity = new THREE.Vector3();
    this.grounded = false;
    this.sitting = false;

    this.look = { yaw: 0, pitch: -0.12 };
    this.cameraDistance = CAMERA.defaultDistance;
    // Facing away from the camera, which is where the player is looking.
    this.facing = this.look.yaw + Math.PI;

    // Lets a jump still register for a moment after walking off an edge,
    // which stops jumps feeling like they were swallowed.
    this.coyote = 0;
    this.jumpBuffer = 0;

    this.character = createCharacter({ shadeId, username, wins });
    scene.add(this.character);

    this._wish = new THREE.Vector3();
    this._forward = new THREE.Vector3();
    this._right = new THREE.Vector3();
    this._camTarget = new THREE.Vector3();
    this._camDir = new THREE.Vector3();
  }

  get eyePosition() {
    return this._camTarget.set(
      this.position.x,
      this.position.y + CAMERA.targetHeight,
      this.position.z,
    );
  }

  addLook(dx, dy) {
    this.look.yaw -= dx * CAMERA.sensitivity;
    this.look.pitch -= dy * CAMERA.sensitivity;
    this.look.pitch = Math.max(-CAMERA.pitchLimit, Math.min(CAMERA.pitchLimit, this.look.pitch));
  }

  zoom(delta) {
    this.cameraDistance = Math.max(
      CAMERA.minDistance,
      Math.min(CAMERA.maxDistance, this.cameraDistance + delta * CAMERA.zoomStep),
    );
  }

  setSitting(sitting, seat = null) {
    this.sitting = sitting;
    setSitting(this.character, sitting);
    if (sitting && seat) {
      this.position.copy(seat.position);
      this.facing = seat.facing ?? this.facing;
      this.velocity.set(0, 0, 0);
    }
  }

  /**
   * @param {number} dt seconds
   * @param {Set<string>} keys currently held key codes
   * @param {THREE.PerspectiveCamera} camera
   */
  update(dt, keys, camera) {
    const wantsJump = keys.has('Space');

    if (this.sitting) {
      // Any movement key stands you back up.
      if (wantsJump || this._hasMoveKey(keys)) this.setSitting(false);
    }

    if (!this.sitting) {
      this._move(dt, keys, wantsJump);
    }

    this.character.position.copy(this.position);
    this.character.rotation.y = this.facing;

    const speed = Math.hypot(this.velocity.x, this.velocity.z);
    animateCharacter(this.character, speed, dt, this.grounded, this.sitting);

    this._updateCamera(camera);
  }

  _hasMoveKey(keys) {
    return (
      keys.has('KeyW') || keys.has('KeyA') || keys.has('KeyS') || keys.has('KeyD') ||
      keys.has('ArrowUp') || keys.has('ArrowLeft') || keys.has('ArrowDown') || keys.has('ArrowRight')
    );
  }

  _move(dt, keys, wantsJump) {
    const { radius, height, gravity, jumpSpeed, walkSpeed, sprintSpeed } = PLAYER;

    // --- Wish direction, relative to where the camera is looking ----------
    this._forward.set(-Math.sin(this.look.yaw), 0, -Math.cos(this.look.yaw));
    this._right.set(Math.cos(this.look.yaw), 0, -Math.sin(this.look.yaw));

    this._wish.set(0, 0, 0);
    if (keys.has('KeyW') || keys.has('ArrowUp')) this._wish.add(this._forward);
    if (keys.has('KeyS') || keys.has('ArrowDown')) this._wish.sub(this._forward);
    if (keys.has('KeyD') || keys.has('ArrowRight')) this._wish.add(this._right);
    if (keys.has('KeyA') || keys.has('ArrowLeft')) this._wish.sub(this._right);

    const moving = this._wish.lengthSq() > 0;
    if (moving) this._wish.normalize();

    const sprinting = keys.has('ShiftLeft') || keys.has('ShiftRight');
    const targetSpeed = sprinting ? sprintSpeed : walkSpeed;

    // --- Horizontal acceleration and friction -----------------------------
    const accel = (this.grounded ? PLAYER.acceleration : PLAYER.airAcceleration) * dt;

    if (moving) {
      this.velocity.x += (this._wish.x * targetSpeed - this.velocity.x) * Math.min(accel / targetSpeed, 1);
      this.velocity.z += (this._wish.z * targetSpeed - this.velocity.z) * Math.min(accel / targetSpeed, 1);
    } else if (this.grounded) {
      const drop = PLAYER.friction * dt;
      const speed = Math.hypot(this.velocity.x, this.velocity.z);
      if (speed > 0) {
        const scale = Math.max(0, speed - drop * targetSpeed) / speed;
        this.velocity.x *= scale;
        this.velocity.z *= scale;
      }
    }

    // --- Jumping -----------------------------------------------------------
    this.coyote = this.grounded ? 0.12 : Math.max(0, this.coyote - dt);
    this.jumpBuffer = wantsJump ? 0.12 : Math.max(0, this.jumpBuffer - dt);

    if (this.jumpBuffer > 0 && this.coyote > 0) {
      this.velocity.y = jumpSpeed;
      this.grounded = false;
      this.coyote = 0;
      this.jumpBuffer = 0;
    }

    // --- Gravity -----------------------------------------------------------
    this.velocity.y -= gravity * dt;
    // Terminal velocity, so a long fall cannot tunnel through the floor.
    this.velocity.y = Math.max(this.velocity.y, -40);

    // --- Integrate and resolve ---------------------------------------------
    this.position.x += this.velocity.x * dt;
    this.position.z += this.velocity.z * dt;
    this.collision.resolveHorizontal(this.position, radius, height);

    this.position.y += this.velocity.y * dt;

    const support = this.collision.supportHeight(this.position, radius);
    if (this.velocity.y <= 0 && this.position.y <= support) {
      this.position.y = support;
      this.velocity.y = 0;
      this.grounded = true;
    } else {
      this.grounded = false;

      const ceiling = this.collision.ceilingHeight(this.position, radius, height);
      if (this.velocity.y > 0 && this.position.y + height > ceiling) {
        this.position.y = ceiling - height;
        this.velocity.y = 0;
      }
    }

    // --- Face the way we are moving ----------------------------------------
    if (moving) {
      const target = Math.atan2(this._wish.x, this._wish.z);
      this.facing += angleDelta(this.facing, target) * Math.min(1, dt * 12);
    }
  }

  _updateCamera(camera) {
    const target = this.eyePosition;

    camera.rotation.set(this.look.pitch, this.look.yaw, 0, 'YXZ');

    const firstPerson = this.cameraDistance < CAMERA.firstPersonAt;
    this.character.visible = !firstPerson;

    if (firstPerson) {
      camera.position.copy(target);
      return;
    }

    // Behind the player, along the look direction.
    // The opposite of the camera's forward vector for this yaw/pitch.
    this._camDir
      .set(
        Math.sin(this.look.yaw) * Math.cos(this.look.pitch),
        -Math.sin(this.look.pitch),
        Math.cos(this.look.yaw) * Math.cos(this.look.pitch),
      )
      .normalize();

    // Pull the camera in if a wall is in the way.
    //
    // While seated the player is surrounded by furniture, which would pull the
    // camera right into their head. Seated, the camera keeps a floor distance
    // and uses less padding, accepting a little clipping through a bench in
    // exchange for a view that is actually usable.
    const padding = this.sitting ? 0.1 : 0.25;
    const minDistance = this.sitting ? 2.2 : 0.4;
    const clear = this.collision.rayDistance(target, this._camDir, this.cameraDistance, padding);
    camera.position.copy(target).addScaledVector(this._camDir, Math.max(minDistance, clear));
  }
}
