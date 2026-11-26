// The player character, in anime style, built from Kiaan's reference drawing.
//
// From the drawing:
//   - hood UP, framing the face
//   - long face, almond eyes, small nose, slight smile
//   - white drawstrings with aglets hanging from the collar
//   - sleeves with turned-back cuffs, and open hands with five fingers
//   - a kangaroo pocket on the front of the jacket
//   - a crown emblem on the left trouser leg
//
// Colour spec (PRD section 8):
//   skin        light peach
//   eyes        yellow
//   fingernails off-white
//   trousers    black
//   crown       bright yellow
//   shoes       red -> white gradient
//   drawstrings white
//   jacket      whichever shade the player has equipped
//
// Everything is generated in code, so there are no model files to load.

import * as THREE from 'three';
import { HOODIE_SHADES, rankForWins } from './constants.js';
import { toon, addOutline, part, canvasTexture, gradientTexture } from './materials.js';

const SKIN = 0xffd9bd;        // light peach
const NAIL = 0xe6e1d8;        // "a tiny bit dark" white
const HAIR = 0x8a5733;        // warm brown, as drawn beside the face
const HAIR_SHEEN = 0xc08a54;
const TROUSERS = 0x121217;    // black
const CROWN = 0xffd21f;       // bright yellow
const EYE_IRIS = '#f7d63c';   // yellow
const EYE_IRIS_DEEP = '#c9951a';

/**
 * The face, painted onto the head sphere's texture.
 *
 * Three maps a sphere so that +Z (the direction the character faces) sits at
 * u = 0.25 and the equator at v = 0.5, so the face is drawn around there.
 */
function makeFaceTexture() {
  return canvasTexture(1024, 512, (ctx) => {
    ctx.fillStyle = '#' + SKIN.toString(16).padStart(6, '0');
    ctx.fillRect(0, 0, 1024, 512);

    const cx = 256; // +Z, straight ahead
    const cy = 268;

    const eye = (ex, dir) => {
      // Almond shape with a heavy upper lash line, as drawn.
      ctx.fillStyle = '#2b2033';
      ctx.beginPath();
      ctx.ellipse(ex, cy, 33, 25, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(ex, cy + 3, 28, 20, 0, 0, Math.PI * 2);
      ctx.fill();

      // Yellow iris.
      const iris = ctx.createLinearGradient(ex, cy - 18, ex, cy + 22);
      iris.addColorStop(0, EYE_IRIS_DEEP);
      iris.addColorStop(0.5, EYE_IRIS);
      iris.addColorStop(1, '#fff0a8');
      ctx.fillStyle = iris;
      ctx.beginPath();
      ctx.ellipse(ex, cy + 3, 17, 19, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#3a2a10';
      ctx.beginPath();
      ctx.ellipse(ex, cy + 3, 8, 11, 0, 0, Math.PI * 2);
      ctx.fill();

      // Highlights, which is what makes anime eyes read as alive.
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(ex - 8 * dir, cy - 7, 7, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(ex + 9 * dir, cy + 13, 4, 4.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Lower lid line.
      ctx.strokeStyle = 'rgba(70, 50, 60, 0.5)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(ex, cy + 4, 29, 21, 0, 0.5, Math.PI - 0.5);
      ctx.stroke();
    };

    eye(cx - 48, 1);
    eye(cx + 48, -1);

    // Eyebrows.
    ctx.strokeStyle = '#6b4526';
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    for (const [ex, dir] of [[cx - 48, 1], [cx + 48, -1]]) {
      ctx.beginPath();
      ctx.moveTo(ex - 25 * dir, cy - 42);
      ctx.quadraticCurveTo(ex, cy - 52, ex + 23 * dir, cy - 44);
      ctx.stroke();
    }

    // Long narrow nose, as drawn: a vertical line with a small base.
    ctx.strokeStyle = 'rgba(190, 140, 118, 0.75)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(cx - 2, cy + 22);
    ctx.lineTo(cx - 5, cy + 58);
    ctx.quadraticCurveTo(cx + 1, cy + 64, cx + 7, cy + 57);
    ctx.stroke();

    // Slight smile.
    ctx.strokeStyle = '#b5705f';
    ctx.lineWidth = 4.5;
    ctx.beginPath();
    ctx.moveTo(cx - 20, cy + 88);
    ctx.quadraticCurveTo(cx, cy + 98, cx + 20, cy + 88);
    ctx.stroke();

    // Soft cheek warmth. (The drawing's orange streak is built as an actual
    // hair strand in 3D instead - painting it on read as a scar.)
    ctx.fillStyle = 'rgba(235, 150, 130, 0.26)';
    for (const ex of [cx - 92, cx + 92]) {
      ctx.beginPath();
      ctx.ellipse(ex, cy + 42, 22, 13, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

/** Shoes: red at the sole fading up into white. */
function makeShoeTexture() {
  return canvasTexture(32, 64, (ctx) => {
    const grad = ctx.createLinearGradient(0, 64, 0, 0);
    grad.addColorStop(0, '#c81f1f');
    grad.addColorStop(0.4, '#e03535');
    grad.addColorStop(0.72, '#ffd8d2');
    grad.addColorStop(1, '#ffffff');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 32, 64);
  });
}

/** The crown emblem on the trouser leg. */
function makeCrownTexture() {
  return canvasTexture(128, 128, (ctx) => {
    ctx.clearRect(0, 0, 128, 128);
    ctx.fillStyle = '#' + CROWN.toString(16).padStart(6, '0');
    ctx.strokeStyle = '#8a6a00';
    ctx.lineWidth = 5;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(22, 96);
    ctx.lineTo(22, 40);
    ctx.lineTo(45, 62);
    ctx.lineTo(64, 30);
    ctx.lineTo(83, 62);
    ctx.lineTo(106, 40);
    ctx.lineTo(106, 96);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  });
}

/** The jacket material, from whichever shade the player has equipped. */
function shadeMaterial(shadeId) {
  const shade = HOODIE_SHADES.find((s) => s.id === shadeId) ?? HOODIE_SHADES[0];
  if (shade.gradient) return toon(0xffffff, { map: gradientTexture(...shade.gradient) });
  return toon(shade.color);
}

/** An open hand with five fingers and off-white nails, as drawn. */
function buildHand(parent, side, skinMat, nailMat) {
  const hand = new THREE.Group();
  hand.position.y = -0.47;
  parent.add(hand);

  const palm = part(new THREE.BoxGeometry(0.082, 0.085, 0.042), skinMat, 0, -0.03, 0, hand, {
    outlineScale: 1.1,
  });
  palm.rotation.z = side * -0.06;

  // Four fingers, splayed slightly as in the drawing.
  const fingerGeo = new THREE.CapsuleGeometry(0.0115, 0.042, 3, 7);
  const nailGeo = new THREE.BoxGeometry(0.016, 0.012, 0.009);
  for (let i = 0; i < 4; i++) {
    const fx = -0.03 + i * 0.02;
    const finger = new THREE.Mesh(fingerGeo, skinMat);
    finger.position.set(fx, -0.1, 0.004);
    finger.rotation.z = (fx / 0.03) * 0.13;
    finger.castShadow = true;
    hand.add(finger);

    const nail = new THREE.Mesh(nailGeo, nailMat);
    nail.position.set(fx + (fx / 0.03) * 0.016, -0.128, 0.016);
    hand.add(nail);
  }

  // Thumb, out to the side.
  const thumb = new THREE.Mesh(new THREE.CapsuleGeometry(0.013, 0.032, 3, 7), skinMat);
  thumb.position.set(side * 0.05, -0.05, 0.012);
  thumb.rotation.z = side * 0.95;
  thumb.castShadow = true;
  hand.add(thumb);

  const thumbNail = new THREE.Mesh(nailGeo, nailMat);
  thumbNail.position.set(side * 0.072, -0.062, 0.022);
  thumbNail.rotation.z = side * 0.95;
  hand.add(thumbNail);

  return hand;
}

/** Hair visible inside the hood opening: a fringe and strands by the cheeks. */
function buildHair(parent, hairMat, sheenMat) {
  const cap = new THREE.Mesh(
    new THREE.SphereGeometry(0.206, 24, 18, 0, Math.PI * 2, 0, Math.PI * 0.46),
    hairMat,
  );
  cap.position.y = 0.008;
  cap.castShadow = true;
  addOutline(cap, 1.04);
  parent.add(cap);

  // Fringe shards, stopping above the eyebrows.
  const fringe = [
    { x: -0.123, rz: 0.48, len: 0.1 },
    { x: -0.067, rz: 0.2, len: 0.13 },
    { x: 0.0, rz: -0.05, len: 0.14 },
    { x: 0.07, rz: -0.26, len: 0.12 },
    { x: 0.126, rz: -0.52, len: 0.095 },
  ];
  for (const { x, rz, len } of fringe) {
    const shard = new THREE.Mesh(new THREE.ConeGeometry(0.05, len, 4), hairMat);
    shard.position.set(x, 0.132, 0.112);
    shard.rotation.set(Math.PI * 0.93, 0.4, rz);
    shard.castShadow = true;
    addOutline(shard, 1.08);
    parent.add(shard);
  }

  // Strands beside the cheeks.
  for (const side of [-1, 1]) {
    const lock = new THREE.Mesh(new THREE.ConeGeometry(0.036, 0.21, 4), hairMat);
    lock.position.set(side * 0.168, 0.015, 0.082);
    lock.rotation.set(Math.PI, 0, side * 0.1);
    lock.castShadow = true;
    addOutline(lock, 1.08);
    parent.add(lock);
  }

  const sheen = new THREE.Mesh(
    new THREE.TorusGeometry(0.152, 0.014, 6, 24, Math.PI * 1.1),
    sheenMat,
  );
  sheen.position.set(0, 0.125, 0.015);
  sheen.rotation.set(Math.PI / 2 - 0.42, 0, 0);
  parent.add(sheen);
}

/**
 * The hood, worn UP. A sphere shell with a wedge removed from the front, so
 * it wraps the head and leaves the face showing through the opening.
 */
function buildHood(parent, hoodieMat) {
  const OPENING = 1.55; // radians of the shell removed at the front
  const R = 0.265;
  const place = (mesh) => {
    mesh.position.set(0, 0.085, -0.025);
    mesh.scale.set(1, 1.1, 1.02);
    mesh.castShadow = true;
    addOutline(mesh, 1.035);
    parent.add(mesh);
  };

  // Closed dome over the top, so no gap shows above the face opening.
  place(
    new THREE.Mesh(
      new THREE.SphereGeometry(R, 32, 10, 0, Math.PI * 2, 0, Math.PI * 0.34),
      hoodieMat,
    ),
  );

  // Band below it, with the wedge removed at the front for the face.
  place(
    new THREE.Mesh(
      new THREE.SphereGeometry(
        R,
        32,
        14,
        Math.PI / 2 + OPENING / 2,
        Math.PI * 2 - OPENING,
        Math.PI * 0.34,
        Math.PI * 0.4,
      ),
      hoodieMat,
    ),
  );

  // Neck gathering at the back of the hood.
  const gather = new THREE.Mesh(new THREE.SphereGeometry(0.15, 18, 12), hoodieMat);
  gather.position.set(0, -0.085, -0.14);
  gather.scale.set(1.15, 0.8, 0.85);
  gather.castShadow = true;
  addOutline(gather, 1.05);
  parent.add(gather);
}

function makeNameplate() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 192;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: texture, depthTest: false, transparent: true }),
  );
  sprite.scale.set(2.2, 0.82, 1);
  sprite.renderOrder = 999;

  sprite.userData.update = (username, wins) => {
    const rank = rankForWins(wins);
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.textAlign = 'center';
    ctx.lineJoin = 'round';

    const line = (text, y, size, fill) => {
      ctx.font = `bold ${size}px "Trebuchet MS", sans-serif`;
      ctx.lineWidth = size * 0.22;
      ctx.strokeStyle = 'rgba(0,0,0,0.85)';
      ctx.strokeText(text, 256, y);
      ctx.fillStyle = fill;
      ctx.fillText(text, 256, y);
    };

    line(rank.name.toUpperCase(), 44, 38, rank.color);
    line(`${wins.toLocaleString()} ${wins === 1 ? 'win' : 'wins'}`, 96, 34, '#ffd45e');
    line(username, 152, 42, '#ffffff');
    texture.needsUpdate = true;
  };

  return sprite;
}

/**
 * Builds a character. Returns the root group, plus the limb references the
 * walk animation needs and a nameplate the HUD can refresh.
 */
export function createCharacter({ shadeId = 'red', username = 'Player', wins = 0 } = {}) {
  const root = new THREE.Group();

  const hoodie = shadeMaterial(shadeId);
  const skinMat = toon(SKIN);
  const nailMat = toon(NAIL);
  const hairMat = toon(HAIR);
  const sheenMat = toon(HAIR_SHEEN);
  const trouserMat = toon(TROUSERS);
  const shoeMat = toon(0xffffff, { map: makeShoeTexture() });

  // --- Legs: black trousers, red-and-white shoes ------------------------
  const hips = new THREE.Group();
  hips.position.y = 0.86;
  root.add(hips);

  // Each leg is a thigh plus a knee joint carrying the shin and shoe. The
  // knee is what lets him sit properly: without it the whole leg rotates as
  // one piece and sticks straight out.
  const legs = [];
  const knees = [];
  for (const side of [-1, 1]) {
    const leg = new THREE.Group();
    leg.position.set(side * 0.115, 0, 0);
    hips.add(leg);

    part(new THREE.CapsuleGeometry(0.084, 0.24, 4, 12), trouserMat, 0, -0.2, 0, leg);

    const knee = new THREE.Group();
    knee.position.y = -0.42;
    leg.add(knee);

    part(new THREE.CapsuleGeometry(0.078, 0.2, 4, 12), trouserMat, 0, -0.18, 0, knee);
    part(new THREE.BoxGeometry(0.16, 0.1, 0.26), shoeMat, 0, -0.39, 0.045, knee, {
      outlineScale: 1.12,
    });

    legs.push(leg);
    knees.push(knee);
  }

  // Crown emblem on the left trouser leg.
  const crown = new THREE.Mesh(
    new THREE.PlaneGeometry(0.11, 0.11),
    new THREE.MeshBasicMaterial({ map: makeCrownTexture(), transparent: true }),
  );
  crown.position.set(0, -0.22, 0.086);
  legs[0].add(crown);

  const hipJoint = new THREE.Mesh(new THREE.CapsuleGeometry(0.115, 0.1, 4, 12), trouserMat);
  hipJoint.position.y = 0.9;
  hipJoint.scale.set(1.18, 1, 0.82);
  hipJoint.castShadow = true;
  addOutline(hipJoint, 1.05);
  root.add(hipJoint);

  // --- Jacket ------------------------------------------------------------
  const torso = part(
    new THREE.CapsuleGeometry(0.168, 0.4, 4, 16),
    hoodie,
    0,
    1.17,
    0,
    root,
    { outlineScale: 1.05 },
  );
  torso.scale.set(1.04, 1.0, 0.78);

  const shoulders = part(
    new THREE.CapsuleGeometry(0.072, 0.3, 4, 12),
    hoodie,
    0,
    1.4,
    0,
    root,
    { outlineScale: 1.07 },
  );
  shoulders.rotation.z = Math.PI / 2;
  shoulders.scale.set(1, 1, 0.88);

  // Kangaroo pocket, drawn as a rectangle low on the front.
  const pocketMat = hoodie.clone();
  pocketMat.color = hoodie.color.clone().offsetHSL(0, 0, -0.07);
  const pocket = new THREE.Mesh(new THREE.BoxGeometry(0.21, 0.1, 0.028), pocketMat);
  pocket.position.set(0, 1.0, 0.134);
  root.add(pocket);

  // White drawstrings with aglets.
  const whiteMat = toon(0xffffff);
  for (const side of [-1, 1]) {
    const string = new THREE.Mesh(new THREE.CapsuleGeometry(0.0095, 0.11, 3, 6), whiteMat);
    string.position.set(side * 0.046, 1.3, 0.122);
    root.add(string);

    const aglet = new THREE.Mesh(
      new THREE.CylinderGeometry(0.012, 0.012, 0.022, 8),
      whiteMat,
    );
    aglet.position.set(side * 0.046, 1.235, 0.122);
    root.add(aglet);
  }

  // --- Arms: sleeves with cuffs, open hands ------------------------------
  const arms = [];
  for (const side of [-1, 1]) {
    const arm = new THREE.Group();
    arm.position.set(side * 0.238, 1.37, 0);
    arm.rotation.z = side * 0.12;
    root.add(arm);

    part(new THREE.CapsuleGeometry(0.063, 0.3, 4, 12), hoodie, 0, -0.23, 0, arm, {
      outlineScale: 1.07,
    });

    // Turned-back cuff.
    const cuff = part(
      new THREE.CylinderGeometry(0.069, 0.066, 0.055, 14),
      hoodie,
      0,
      -0.4,
      0,
      arm,
      { outlineScale: 1.08 },
    );
    cuff.material = pocketMat;

    buildHand(arm, side, skinMat, nailMat);
    arms.push(arm);
  }

  // --- Head ---------------------------------------------------------------
  const head = new THREE.Group();
  head.position.y = 1.56;
  root.add(head);

  part(new THREE.CapsuleGeometry(0.052, 0.05, 3, 10), skinMat, 0, -0.07, 0, head, {
    outlineScale: 1.1,
  }); // neck

  const skull = new THREE.Mesh(
    new THREE.SphereGeometry(0.215, 36, 28),
    toon(0xffffff, { map: makeFaceTexture() }),
  );
  skull.position.y = 0.115;
  skull.scale.set(0.95, 1.08, 0.95); // slightly long, as drawn
  skull.castShadow = true;
  addOutline(skull, 1.04);
  head.add(skull);

  const hairGroup = new THREE.Group();
  hairGroup.position.y = 0.115;
  head.add(hairGroup);
  buildHair(hairGroup, hairMat, sheenMat);

  buildHood(head, hoodie);

  const nameplate = makeNameplate();
  nameplate.position.y = 2.72;
  nameplate.userData.update(username, wins);
  root.add(nameplate);

  root.userData = {
    shadeId,
    hoodie,
    pocketMat,
    legL: legs[0],
    legR: legs[1],
    kneeL: knees[0],
    kneeR: knees[1],
    armL: arms[0],
    armR: arms[1],
    head,
    nameplate,
    walkPhase: 0,
  };
  return root;
}

/**
 * Swings the arms and legs. `speed` is horizontal metres per second.
 *
 * `sitting` must be passed through: otherwise the idle branch below resets the
 * legs to zero every frame and silently undoes the seated pose.
 */
export function animateCharacter(character, speed, dt, grounded = true, sitting = false) {
  const parts = character.userData;
  const moving = speed > 0.3 && !sitting;

  parts.walkPhase += moving && grounded ? dt * speed * 2.6 : dt * 2.0;

  const s = Math.sin(parts.walkPhase);

  if (sitting) {
    // Hold the seated pose, with only a small breathing motion on the arms.
    // Thighs forward, shins hanging down from the knees.
    parts.legL.rotation.x = -Math.PI / 2;
    parts.legR.rotation.x = -Math.PI / 2;
    parts.kneeL.rotation.x = Math.PI / 2;
    parts.kneeR.rotation.x = Math.PI / 2;
    parts.armL.rotation.x = -0.3 + s * 0.03;
    parts.armR.rotation.x = -0.3 - s * 0.03;
    parts.head.rotation.z = s * 0.01;
  } else if (moving && grounded) {
    const swing = Math.min(speed / 5, 1.4) * 0.7;
    parts.legL.rotation.x = s * swing;
    parts.legR.rotation.x = -s * swing;
    // A little knee bend on the leg swinging back, so the stride is not stiff.
    parts.kneeL.rotation.x = Math.max(0, -s) * swing * 0.6;
    parts.kneeR.rotation.x = Math.max(0, s) * swing * 0.6;
    parts.armL.rotation.x = -s * swing * 0.8;
    parts.armR.rotation.x = s * swing * 0.8;
  } else {
    parts.legL.rotation.x = 0;
    parts.legR.rotation.x = 0;
    parts.kneeL.rotation.x = 0;
    parts.kneeR.rotation.x = 0;
    parts.armL.rotation.x = s * 0.04;
    parts.armR.rotation.x = -s * 0.04;
    parts.head.rotation.z = s * 0.012;
  }
}

/** Sitting pose for the couch and benches. */
export function setSitting(character, sitting) {
  const { legL, legR, kneeL, kneeR, armL, armR } = character.userData;
  const angle = sitting ? -Math.PI / 2 : 0;
  legL.rotation.x = angle;
  legR.rotation.x = angle;
  kneeL.rotation.x = sitting ? Math.PI / 2 : 0;
  kneeR.rotation.x = sitting ? Math.PI / 2 : 0;
  armL.rotation.x = sitting ? -0.3 : 0;
  armR.rotation.x = sitting ? -0.3 : 0;
}

/**
 * Changes the jacket colour on a character that is already built.
 *
 * Only the jacket changes — hood, sleeves and pocket included — because
 * every shade in the shop and the Roulette recolours exactly those parts
 * (PRD section 8). The pocket keeps its slightly darker tone.
 */
export function setShade(character, shadeId) {
  const parts = character.userData;
  if (parts.shadeId === shadeId) return;

  const shade = HOODIE_SHADES.find((s) => s.id === shadeId) ?? HOODIE_SHADES[0];

  if (shade.gradient) {
    const texture = gradientTexture(...shade.gradient);
    parts.hoodie.map = texture;
    parts.hoodie.color.set(0xffffff);
    parts.pocketMat.map = texture;
    parts.pocketMat.color.set(0xd8d8d8);
  } else {
    parts.hoodie.map = null;
    parts.hoodie.color.set(shade.color);
    parts.pocketMat.map = null;
    parts.pocketMat.color.set(shade.color);
    parts.pocketMat.color.offsetHSL(0, 0, -0.07);
  }

  parts.hoodie.needsUpdate = true;
  parts.pocketMat.needsUpdate = true;
  parts.shadeId = shadeId;
}

export function updateNameplate(character, username, wins) {
  character.userData.nameplate.userData.update(username, wins);
}
