// The lobby, built from the PRD (section 4).
//
//   - couch in the middle, on a red carpet
//   - table behind it with a bench each side and five plates per side
//   - chandelier above the table
//   - bookshelf on the right, with the Roulette cabinet beside it
//   - portal on the left: yellow -> green -> blue, white "ENTER GAME"
//
// Seats and machines are returned as `interactables` for the `E` prompt.

import * as THREE from 'three';
import { toon, addOutline, part, canvasTexture } from './materials.js';

export /**
 * Where the wheel's rotation has to sit, in turns, for a wedge at offset 0
 * to be under the pointer.
 *
 * Worth writing down, because a first guess of 0 put the wheel two thirds of
 * a turn out and it stopped on blue when gold had been won — the animation
 * contradicting a result that was already decided, which is the one thing
 * PRD 10.1 says must never happen.
 *
 *   The face is drawn from 12 o'clock, sweeping clockwise. On a cylinder cap
 *   three.js lays the texture out so a point at local angle t sits at canvas
 *   angle -t, which puts a wedge whose middle is `mid` turns round the face
 *   at local angle pi/2 - 2*pi*mid.
 *
 *   The mesh is tipped by rotation.x = pi/2 and spun by rotation.y, so the
 *   local angle that ends up highest is t = pi - rotation.y.
 *
 *   Setting those equal gives rotation.y = pi/2 + 2*pi*mid: a quarter turn,
 *   plus the wedge's own offset.
 */
const TOP_OFFSET = 0.25;

const ROOM = {
  halfWidth: 11,
  halfDepth: 9,
  height: 5,
  wallThickness: 0.4,
};

const WOOD_DARK = 0x6b4426;
const WOOD_MID = 0x8a5a33;
const WALL = 0xe8ddc8;
const CARPET = 0xa51f27;
const COUCH = 0x3f5d8a;
const COUCH_CUSHION = 0x4d6fa0;
const METAL = 0xb9a46a;

/** Small deterministic generator, so the books look the same every load. */
function makeRandom(seed = 1) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

function addCollider(collision, mesh) {
  collision.addMesh(mesh);
  return mesh;
}

// --- Room -----------------------------------------------------------------

function buildRoom(group, collision) {
  const { halfWidth: hw, halfDepth: hd, height, wallThickness: t } = ROOM;

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(hw * 2, hd * 2),
    toon(WOOD_MID),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  group.add(floor);

  // Floor boards, for something to read the scale against.
  const boards = new THREE.Mesh(
    new THREE.PlaneGeometry(hw * 2, hd * 2),
    new THREE.MeshBasicMaterial({
      map: canvasTexture(16, 256, (ctx) => {
        ctx.fillStyle = 'rgba(0,0,0,0)';
        ctx.fillRect(0, 0, 16, 256);
        ctx.strokeStyle = 'rgba(40, 20, 8, 0.33)';
        ctx.lineWidth = 2;
        for (let y = 0; y <= 256; y += 32) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(16, y);
          ctx.stroke();
        }
      }),
      transparent: true,
    }),
  );
  boards.material.map.wrapS = THREE.RepeatWrapping;
  boards.material.map.wrapT = THREE.RepeatWrapping;
  boards.material.map.repeat.set(1, 6);
  boards.rotation.x = -Math.PI / 2;
  boards.position.y = 0.006;
  group.add(boards);

  const ceiling = new THREE.Mesh(
    new THREE.PlaneGeometry(hw * 2, hd * 2),
    toon(0xf2ece0),
  );
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = height;
  group.add(ceiling);

  // Walls. They do not cast shadows, so the sun can still light the interior.
  const wallMat = toon(WALL);
  const walls = [
    [hw * 2 + t * 2, height, t, 0, height / 2, -hd - t / 2],
    [hw * 2 + t * 2, height, t, 0, height / 2, hd + t / 2],
    [t, height, hd * 2, -hw - t / 2, height / 2, 0],
    [t, height, hd * 2, hw + t / 2, height / 2, 0],
  ];
  for (const [w, h, d, x, y, z] of walls) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
    wall.position.set(x, y, z);
    wall.receiveShadow = true;
    group.add(wall);
    addCollider(collision, wall);
  }

  // Skirting board, to stop the walls meeting the floor in a bare line.
  const skirtMat = toon(WOOD_DARK);
  for (const [w, d, x, z] of [
    [hw * 2, 0.08, 0, -hd + 0.04],
    [hw * 2, 0.08, 0, hd - 0.04],
    [0.08, hd * 2, -hw + 0.04, 0],
    [0.08, hd * 2, hw - 0.04, 0],
  ]) {
    const skirt = new THREE.Mesh(new THREE.BoxGeometry(w, 0.22, d), skirtMat);
    skirt.position.set(x, 0.11, z);
    group.add(skirt);
  }

  const carpet = new THREE.Mesh(new THREE.PlaneGeometry(9, 7), toon(CARPET));
  carpet.rotation.x = -Math.PI / 2;
  carpet.position.set(0, 0.015, -0.5);
  carpet.receiveShadow = true;
  group.add(carpet);

  // Carpet border.
  const border = new THREE.Mesh(
    new THREE.PlaneGeometry(9.5, 7.5),
    toon(0x7d141b),
  );
  border.rotation.x = -Math.PI / 2;
  border.position.set(0, 0.01, -0.5);
  group.add(border);
}

// --- Couch ----------------------------------------------------------------

function buildCouch(group, collision, interactables) {
  const couch = new THREE.Group();
  couch.position.set(0, 0, 1.3);
  group.add(couch);

  const frame = toon(COUCH);
  const cushionMat = toon(COUCH_CUSHION);

  const base = part(new THREE.BoxGeometry(3.3, 0.42, 1.25), frame, 0, 0.3, 0, couch, {
    outlineScale: 1.02,
  });
  addCollider(collision, base);

  const back = part(new THREE.BoxGeometry(3.3, 0.95, 0.28), frame, 0, 0.78, -0.62, couch, {
    outlineScale: 1.02,
  });
  addCollider(collision, back);

  for (const side of [-1, 1]) {
    const arm = part(
      new THREE.BoxGeometry(0.28, 0.72, 1.25),
      frame,
      side * 1.68,
      0.46,
      0,
      couch,
      { outlineScale: 1.03 },
    );
    addCollider(collision, arm);
  }

  // Three seat cushions, which are also the three sitting spots.
  for (const x of [-1.02, 0, 1.02]) {
    part(new THREE.BoxGeometry(0.95, 0.16, 1.1), cushionMat, x, 0.59, 0.02, couch, {
      outlineScale: 1.03,
    });
    part(new THREE.BoxGeometry(0.95, 0.62, 0.14), cushionMat, x, 0.82, -0.44, couch, {
      outlineScale: 1.03,
    });

    interactables.push({
      position: new THREE.Vector3(x, 0, 1.9),
      radius: 1.1,
      label: 'Sit on the couch',
      kind: 'seat',
      // Sitting on the couch faces the room, away from the table.
      // The y is the character's root, set so the hips land on the cushion
      // (cushion top 0.67, hips sit 0.86 above the root).
      seat: { position: new THREE.Vector3(x, -0.19, 1.18), facing: 0 },
    });
  }

  return couch;
}

// --- Table, benches and plates ---------------------------------------------

function buildDining(group, collision, interactables) {
  const dining = new THREE.Group();
  dining.position.set(0, 0, -3.6);
  group.add(dining);

  const woodMat = toon(WOOD_DARK);

  const top = part(new THREE.BoxGeometry(6, 0.16, 1.7), woodMat, 0, 0.92, 0, dining, {
    outlineScale: 1.02,
  });
  addCollider(collision, top);

  for (const x of [-2.7, 2.7]) {
    for (const z of [-0.65, 0.65]) {
      part(new THREE.BoxGeometry(0.18, 0.92, 0.18), woodMat, x, 0.46, z, dining);
    }
  }

  // Five plates per side, ten in total.
  const plateMat = toon(0xf4f1e8);
  const plateGeo = new THREE.CylinderGeometry(0.21, 0.17, 0.035, 18);
  for (const z of [-0.45, 0.45]) {
    for (const x of [-2, -1, 0, 1, 2]) {
      part(plateGeo, plateMat, x, 1.02, z, dining, { outlineScale: 1.05 });
    }
  }

  // A bench on each side, each with five places.
  for (const side of [-1, 1]) {
    const bench = new THREE.Group();
    bench.position.set(0, 0, side * 1.42);
    dining.add(bench);

    const seat = part(new THREE.BoxGeometry(6, 0.14, 0.52), woodMat, 0, 0.47, 0, bench, {
      outlineScale: 1.02,
    });
    addCollider(collision, seat);

    for (const x of [-2.6, 0, 2.6]) {
      part(new THREE.BoxGeometry(0.16, 0.47, 0.44), woodMat, x, 0.235, 0, bench);
    }

    for (const x of [-2, -1, 0, 1, 2]) {
      interactables.push({
        position: new THREE.Vector3(x, 0, -3.6 + side * 2.15),
        radius: 0.95,
        label: 'Sit at the table',
        kind: 'seat',
        // Benches face the table, so the two sides face each other.
        // Bench top is 0.54, so the root sits 0.86 below that.
        seat: {
          position: new THREE.Vector3(x, -0.32, -3.6 + side * 1.42),
          facing: side > 0 ? Math.PI : 0,
        },
      });
    }
  }
}

// --- Chandelier -------------------------------------------------------------

function buildChandelier(group) {
  const chandelier = new THREE.Group();
  chandelier.position.set(0, ROOM.height, -3.6);
  group.add(chandelier);

  const brass = toon(METAL);

  part(new THREE.CylinderGeometry(0.05, 0.05, 0.85, 8), brass, 0, -0.42, 0, chandelier, {
    outline: false,
  });

  const ring = part(
    new THREE.TorusGeometry(0.72, 0.055, 8, 28),
    brass,
    0,
    -0.9,
    0,
    chandelier,
    { outline: false },
  );
  ring.rotation.x = Math.PI / 2;

  const candleMat = toon(0xf5efdc);
  const flameMat = new THREE.MeshBasicMaterial({ color: 0xffd36b });
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    const x = Math.cos(angle) * 0.72;
    const z = Math.sin(angle) * 0.72;
    part(new THREE.CylinderGeometry(0.055, 0.055, 0.3, 10), candleMat, x, -0.74, z, chandelier, {
      outline: false,
    });
    const flame = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 6), flameMat);
    flame.position.set(x, -0.55, z);
    flame.scale.y = 1.6;
    chandelier.add(flame);
  }

  const light = new THREE.PointLight(0xffd9a0, 26, 17, 2);
  light.position.set(0, -0.85, 0);
  chandelier.add(light);

  return chandelier;
}

// --- Bookshelf ---------------------------------------------------------------

function buildBookshelf(group, collision, interactables) {
  const shelf = new THREE.Group();
  // Against the right-hand wall, facing back into the room.
  shelf.position.set(ROOM.halfWidth - 0.3, 0, -2.6);
  shelf.rotation.y = -Math.PI / 2;
  group.add(shelf);

  const woodMat = toon(0x5c3a20);
  const WIDTH = 4.6;
  const HEIGHT = 3.1;
  const DEPTH = 0.5;

  part(new THREE.BoxGeometry(WIDTH, 0.1, DEPTH), woodMat, 0, HEIGHT - 0.05, 0, shelf);
  part(new THREE.BoxGeometry(WIDTH, 0.1, DEPTH), woodMat, 0, 0.05, 0, shelf);
  for (const side of [-1, 1]) {
    part(new THREE.BoxGeometry(0.1, HEIGHT, DEPTH), woodMat, (side * WIDTH) / 2, HEIGHT / 2, 0, shelf);
  }
  const backPanel = part(
    new THREE.BoxGeometry(WIDTH, HEIGHT, 0.06),
    toon(0x452b17),
    0,
    HEIGHT / 2,
    -DEPTH / 2,
    shelf,
    { outline: false },
  );
  addCollider(collision, backPanel);

  const shelfYs = [0.72, 1.44, 2.16, 2.86];
  for (const y of shelfYs.slice(0, 3)) {
    part(new THREE.BoxGeometry(WIDTH - 0.1, 0.07, DEPTH), woodMat, 0, y, 0, shelf, {
      outline: false,
    });
  }

  // Books: varied heights and colours, in deterministic order.
  const random = makeRandom(7);
  const palette = [
    0xa8342c, 0x2f5f8a, 0x3f7a4a, 0xb0802a, 0x6b3a7a,
    0x2f7a78, 0xa85a2a, 0x7a2f4a, 0x4a5a7a, 0x8a7a2a,
  ];
  for (let s = 0; s < 4; s++) {
    const baseY = s === 0 ? 0.1 : shelfYs[s - 1] + 0.035;
    const maxHeight = (shelfYs[s] - baseY) * 0.92;
    let x = -WIDTH / 2 + 0.14;
    while (x < WIDTH / 2 - 0.2) {
      const thickness = 0.05 + random() * 0.07;
      const bookHeight = maxHeight * (0.72 + random() * 0.26);
      const book = new THREE.Mesh(
        new THREE.BoxGeometry(thickness, bookHeight, DEPTH * 0.72),
        toon(palette[Math.floor(random() * palette.length)]),
      );
      book.position.set(x + thickness / 2, baseY + bookHeight / 2, 0.02);
      // An occasional leaning book, so the rows are not perfectly regular.
      if (random() < 0.12) book.rotation.z = (random() - 0.5) * 0.3;
      book.castShadow = true;
      shelf.add(book);
      x += thickness + 0.012;
    }
  }

  interactables.push({
    position: new THREE.Vector3(ROOM.halfWidth - 1.3, 0, -2.6),
    radius: 1.6,
    label: 'Read a book',
    kind: 'bookshelf',
  });

  return shelf;
}

// --- Roulette ----------------------------------------------------------------

/** Wheel face: 80% Rare blue, 19% Epic purple, 1% Legendary gold. */
function makeWheelTexture() {
  return canvasTexture(512, 512, (ctx) => {
    const cx = 256;
    const cy = 256;
    const r = 250;

    // Wedges are sized by their real chance, not drawn as equal slices, so
    // the wheel shows the true odds: Rare 80%, Epic 19%, Legendary 1%.
    // Each tier is split into several wedges and interleaved so it still
    // reads as a wheel rather than three big blocks.
    const COLORS = { rare: '#2f6ea8', epic: '#7b3fb0', legendary: '#f0c23a' };

    let angle = -Math.PI / 2; // start at the top, under the pointer
    for (const { tier, share } of WEDGES) {
      const color = COLORS[tier];
      const span = share * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, angle, angle + span);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = 'rgba(20, 14, 28, 0.85)';
      ctx.lineWidth = 3;
      ctx.stroke();
      angle += span;
    }

    ctx.beginPath();
    ctx.arc(cx, cy, 52, 0, Math.PI * 2);
    ctx.fillStyle = '#1b1420';
    ctx.fill();
    ctx.fillStyle = '#f0c23a';
    ctx.font = 'bold 34px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('SPIN', cx, cy);
  });
}

function makePriceTexture() {
  return canvasTexture(256, 128, (ctx) => {
    ctx.fillStyle = '#140f1c';
    ctx.fillRect(0, 0, 256, 128);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#68e0ff';
    ctx.font = 'bold 54px "Trebuchet MS", sans-serif';
    ctx.fillText('750', 128, 46);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 30px "Trebuchet MS", sans-serif';
    ctx.fillText('GEMS', 128, 92);
  });
}

/**
 * How the wheel face is divided.
 *
 * The shares are the real odds: the Rare wedges add to 0.80, the Epic ones
 * to 0.19, and Legendary is a single 0.01 sliver. They are interleaved so it
 * reads as a wheel rather than three blocks, but the gold slice is genuinely
 * as thin as a 1% chance — the art is not allowed to flatter the odds.
 */
export const WEDGES = [
  { tier: 'rare', share: 0.1 }, { tier: 'epic', share: 0.0475 },
  { tier: 'rare', share: 0.1 }, { tier: 'epic', share: 0.0475 },
  { tier: 'rare', share: 0.1 }, { tier: 'epic', share: 0.0475 },
  { tier: 'rare', share: 0.1 }, { tier: 'epic', share: 0.0475 },
  { tier: 'rare', share: 0.1 }, { tier: 'legendary', share: 0.01 },
  { tier: 'rare', share: 0.1 }, { tier: 'rare', share: 0.1 }, { tier: 'rare', share: 0.1 },
];

/** Where each wedge sits, as turns from the top, with its midpoint. */
export const WEDGE_SPANS = (() => {
  const spans = [];
  let at = 0;
  for (const wedge of WEDGES) {
    spans.push({ ...wedge, start: at, end: at + wedge.share, mid: at + wedge.share / 2 });
    at += wedge.share;
  }
  return spans;
})();

function buildRoulette(group, collision, interactables) {
  const machine = new THREE.Group();
  machine.position.set(ROOM.halfWidth - 0.75, 0, 3.4);
  machine.rotation.y = -Math.PI / 2;
  group.add(machine);

  const cabinetMat = toon(0x2f2438);
  const trimMat = toon(0xf0c23a);

  const cabinet = part(new THREE.BoxGeometry(1.5, 2.1, 0.8), cabinetMat, 0, 1.05, 0, machine, {
    outlineScale: 1.02,
  });
  addCollider(collision, cabinet);

  part(new THREE.BoxGeometry(1.62, 0.1, 0.9), trimMat, 0, 2.14, 0, machine, {
    outlineScale: 1.02,
  });

  // The wheel, on the front face.
  const wheel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.52, 0.52, 0.09, 36),
    toon(0xffffff, { map: makeWheelTexture() }),
  );
  wheel.rotation.x = Math.PI / 2;
  wheel.position.set(0, 1.38, 0.43);
  wheel.castShadow = true;
  machine.add(wheel);

  // Pointer above the wheel.
  const pointer = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.18, 3), trimMat);
  pointer.position.set(0, 1.98, 0.46);
  pointer.rotation.x = Math.PI;
  machine.add(pointer);

  // Price plate.
  const plate = new THREE.Mesh(
    new THREE.PlaneGeometry(0.62, 0.31),
    new THREE.MeshBasicMaterial({ map: makePriceTexture() }),
  );
  plate.position.set(0, 0.62, 0.405);
  machine.add(plate);

  // Lever on the right-hand side.
  const leverBase = part(
    new THREE.SphereGeometry(0.08, 12, 10),
    trimMat,
    0.78,
    1.5,
    0,
    machine,
    { outline: false },
  );
  const leverArm = new THREE.Mesh(
    new THREE.CylinderGeometry(0.03, 0.03, 0.5, 8),
    toon(0xcfd4dc),
  );
  leverArm.position.set(0.78, 1.72, 0.08);
  leverArm.rotation.x = -0.35;
  leverArm.castShadow = true;
  machine.add(leverArm);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.075, 12, 10), toon(0xd8342c));
  knob.position.set(0.78, 1.96, 0.17);
  machine.add(knob);

  // Display case on top, where a won jacket is shown.
  const caseFrame = part(new THREE.BoxGeometry(0.95, 0.07, 0.6), trimMat, 0, 2.22, 0, machine, {
    outline: false,
  });
  const glass = new THREE.Mesh(
    new THREE.BoxGeometry(0.9, 0.72, 0.55),
    new THREE.MeshToonMaterial({ color: 0xbfe8ff, transparent: true, opacity: 0.26 }),
  );
  glass.position.set(0, 2.62, 0);
  machine.add(glass);
  part(new THREE.BoxGeometry(0.95, 0.07, 0.6), trimMat, 0, 3.0, 0, machine, { outline: false });

  const caseLight = new THREE.PointLight(0xffe9a8, 1.1, 2.4, 2);
  caseLight.position.set(0, 2.6, 0);
  machine.add(caseLight);

  interactables.push({
    position: new THREE.Vector3(ROOM.halfWidth - 1.9, 0, 3.4),
    radius: 1.7,
    label: 'Spin the Roulette — 750 gems',
    kind: 'roulette',
  });

  /**
   * Spins the wheel so that `tierId` ends up under the pointer.
   *
   * The result is decided before this is called; the animation is told where
   * to stop. It never picks the outcome and it never stops a hair short of
   * Legendary to tease — if gold is under the pointer, gold is what was won
   * (PRD section 10.1).
   *
   * @returns {Promise<void>} resolves when the wheel has stopped
   */
  function spinTo(tierId, { seconds = 4, random = Math.random } = {}) {
    const choices = WEDGE_SPANS.filter((w) => w.tier === tierId);
    const target = choices[Math.floor(random() * choices.length)];

    const from = wheel.rotation.y;
    // Several whole turns, then round to put the chosen wedge's midpoint
    // under the pointer.
    const turns = 4 + Math.floor(random() * 2);
    const landing = TOP_OFFSET + target.mid;
    const to = from + (turns + ((landing - from / (Math.PI * 2)) % 1 + 1) % 1) * Math.PI * 2;

    const started = performance.now();
    return new Promise((resolve) => {
      function step(now) {
        const t = Math.min(1, (now - started) / (seconds * 1000));
        // Fast, then easing to a stop, the way a real wheel settles.
        const eased = 1 - (1 - t) ** 3;
        wheel.rotation.y = from + (to - from) * eased;
        if (t < 1) requestAnimationFrame(step);
        else resolve();
      }
      requestAnimationFrame(step);
    });
  }

  /** A quick lever pull, purely so the machine looks like it did something. */
  function pullLever() {
    const from = leverArm.rotation.x;
    const started = performance.now();
    function step(now) {
      const t = Math.min(1, (now - started) / 520);
      // Down fast, back up slowly.
      const swing = t < 0.3 ? t / 0.3 : 1 - (t - 0.3) / 0.7;
      leverArm.rotation.x = from + swing * 0.75;
      knob.position.y = 1.96 - swing * 0.22;
      knob.position.z = 0.17 + swing * 0.12;
      if (t < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  /** Brightens the display case when something has been won. */
  function lightCase(big) {
    const target = big ? 9 : 3.2;
    const started = performance.now();
    function step(now) {
      const t = Math.min(1, (now - started) / 2200);
      // Flare, then settle back to the resting glow.
      caseLight.intensity = 1.1 + (target - 1.1) * Math.sin(t * Math.PI);
      if (big) caseLight.color.setHex(0xffd45e);
      if (t < 1) requestAnimationFrame(step);
      else {
        caseLight.intensity = 1.1;
        caseLight.color.setHex(0xffe9a8);
      }
    }
    requestAnimationFrame(step);
  }

  return { machine, wheel, spinTo, pullLever, lightCase };
}

// --- Portal --------------------------------------------------------------------

/**
 * The portal is three layers, because scrolling one combined texture drags
 * the lettering off the surface and puts a hard seam where it wraps:
 *   1. a still yellow -> green -> blue gradient
 *   2. repeating bands that scroll, for the sense of moving energy
 *   3. still white lettering on top
 */
function makePortalGradient() {
  return canvasTexture(64, 512, (ctx) => {
    const grad = ctx.createLinearGradient(0, 512, 0, 0);
    grad.addColorStop(0, '#2f6fd8');
    grad.addColorStop(0.5, '#3fcf6a');
    grad.addColorStop(1, '#f5d83a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 512);
  });
}

function makePortalBands() {
  return canvasTexture(64, 64, (ctx) => {
    ctx.clearRect(0, 0, 64, 64);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.16)';
    ctx.fillRect(0, 0, 64, 16);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.07)';
    ctx.fillRect(0, 30, 64, 8);
  });
}

function makePortalText() {
  return canvasTexture(512, 768, (ctx) => {
    ctx.clearRect(0, 0, 512, 768);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.font = 'bold 82px "Trebuchet MS", sans-serif';
    ctx.lineWidth = 18;
    ctx.strokeStyle = 'rgba(14, 22, 38, 0.6)';
    ctx.strokeText('ENTER', 256, 340);
    ctx.strokeText('GAME', 256, 432);
    ctx.fillStyle = '#ffffff';
    ctx.fillText('ENTER', 256, 340);
    ctx.fillText('GAME', 256, 432);
  });
}

function buildPortal(group, collision, interactables) {
  const portal = new THREE.Group();
  portal.position.set(-ROOM.halfWidth + 0.45, 0, 0);
  portal.rotation.y = Math.PI / 2; // facing into the room
  group.add(portal);

  const frameMat = toon(0x3a2f4a);

  // Frame: two posts and a lintel.
  for (const side of [-1, 1]) {
    const post = part(
      new THREE.BoxGeometry(0.34, 4.6, 0.34),
      frameMat,
      side * 1.82,
      2.3,
      0,
      portal,
      { outlineScale: 1.04 },
    );
    addCollider(collision, post);
  }
  part(new THREE.BoxGeometry(4, 0.38, 0.38), frameMat, 0, 4.6, 0, portal, {
    outlineScale: 1.03,
  });

  const surface = new THREE.Mesh(
    new THREE.PlaneGeometry(3.3, 4.4),
    new THREE.MeshBasicMaterial({ map: makePortalGradient() }),
  );
  surface.position.set(0, 2.3, 0.1);
  portal.add(surface);

  const bandTexture = makePortalBands();
  bandTexture.wrapS = THREE.RepeatWrapping;
  bandTexture.wrapT = THREE.RepeatWrapping;
  bandTexture.repeat.set(1, 7);
  const bands = new THREE.Mesh(
    new THREE.PlaneGeometry(3.3, 4.4),
    new THREE.MeshBasicMaterial({ map: bandTexture, transparent: true }),
  );
  bands.position.set(0, 2.3, 0.12);
  portal.add(bands);

  const label = new THREE.Mesh(
    new THREE.PlaneGeometry(3.3, 4.4),
    new THREE.MeshBasicMaterial({ map: makePortalText(), transparent: true }),
  );
  label.position.set(0, 2.3, 0.14);
  portal.add(label);

  const glow = new THREE.PointLight(0x58d9b0, 14, 9, 2);
  glow.position.set(0, 2.3, 0.9);
  portal.add(glow);

  // Players-waiting counter above the portal.
  const counterCanvas = document.createElement('canvas');
  counterCanvas.width = 512;
  counterCanvas.height = 128;
  const counterTexture = new THREE.CanvasTexture(counterCanvas);
  counterTexture.colorSpace = THREE.SRGBColorSpace;
  const counter = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: counterTexture, transparent: true }),
  );
  counter.scale.set(2.3, 0.58, 1);
  // Just under the ceiling, which sits at ROOM.height.
  counter.position.set(0, 4.82, 0.2);
  portal.add(counter);

  const setCounter = (text) => {
    const ctx = counterCanvas.getContext('2d');
    ctx.clearRect(0, 0, 512, 128);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 60px "Trebuchet MS", sans-serif';
    ctx.lineWidth = 14;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(0,0,0,0.8)';
    ctx.strokeText(text, 256, 64);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(text, 256, 64);
    counterTexture.needsUpdate = true;
  };
  setCounter('Players: 1');

  interactables.push({
    position: new THREE.Vector3(-ROOM.halfWidth + 1.5, 0, 0),
    radius: 1.8,
    label: 'Enter game',
    kind: 'portal',
  });

  return { portal, surface, bandTexture, setCounter };
}

// --- Entry point ------------------------------------------------------------------

/**
 * Builds the whole lobby into the scene and registers its colliders.
 *
 * @returns {{ group: THREE.Group, interactables: Array, spawn: THREE.Vector3, update: (t:number)=>void }}
 */
export function createLobby(scene, collision) {
  const group = new THREE.Group();
  scene.add(group);

  const interactables = [];

  buildRoom(group, collision);
  buildCouch(group, collision, interactables);
  buildDining(group, collision, interactables);
  const chandelier = buildChandelier(group);
  buildBookshelf(group, collision, interactables);
  const roulette = buildRoulette(group, collision, interactables);
  const portal = buildPortal(group, collision, interactables);

  const flames = chandelier.children.filter((c) => c.material?.isMeshBasicMaterial);

  return {
    group,
    interactables,
    portal,
    roulette,
    // Far enough from the back wall that the camera is not pinched in.
    spawn: new THREE.Vector3(0, 0, 5.1),

    /** Per-frame animation: the portal surface drifts and the candles flicker. */
    update(elapsed) {
      portal.bandTexture.offset.y = (elapsed * 0.11) % 1;
      const flicker = 0.9 + Math.sin(elapsed * 9) * 0.06 + Math.sin(elapsed * 23) * 0.04;
      for (const flame of flames) flame.scale.set(flicker, 1.6 * flicker, flicker);
    },
  };
}
