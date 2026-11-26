// Natural Disaster Survivor - Phase 4: the round loop.
//
// What this phase provides:
//   - the lobby room from the PRD: couch, carpet, table with benches and
//     plates, chandelier, bookshelf, Roulette cabinet, portal
//   - sitting on the couch and the benches with `E`
//   - interaction prompts for the bookshelf, the Roulette and the portal
//
// The portal and the Roulette are visual here; Phase 4 starts matches and
// Phase 9 makes the Roulette spin.

import * as THREE from 'three';
import { CollisionWorld } from './collision.js';
import { Player } from './player.js';
import { createLobby } from './lobby.js';
import { loadProfile, saveProfile, clearProfile } from './save.js';
import { askForUsername } from './identity.js';
import { updateNameplate, setShade } from './character.js';
import { createShop } from './shop.js';
import { createAudio } from './audio.js';
import { createBooks } from './books.js';
import { rankForWins, rankProgress } from './constants.js';
import { Round, PHASE, SLOTS } from './round.js';
import { USE_TEXT } from './supplies.js';

// --- Renderer -------------------------------------------------------------

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// --- Scene ----------------------------------------------------------------

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x15121c);

const camera = new THREE.PerspectiveCamera(
  70,
  window.innerWidth / window.innerHeight,
  0.08,
  200,
);

// --- Lights ---------------------------------------------------------------
// Indoors, so the chandelier and the portal do most of the work. The
// directional light is a fill that also casts the shadows; the walls and
// ceiling do not cast shadows, so it can still reach inside.

const hemisphere = new THREE.HemisphereLight(0xdbe4ff, 0x4a3b2a, 0.85);
scene.add(hemisphere);

const fill = new THREE.DirectionalLight(0xfff2dc, 1.05);
fill.position.set(10, 16, 9);
fill.castShadow = true;
fill.shadow.mapSize.set(2048, 2048);
fill.shadow.camera.left = -16;
fill.shadow.camera.right = 16;
fill.shadow.camera.top = 16;
fill.shadow.camera.bottom = -16;
fill.shadow.camera.far = 46;
fill.shadow.bias = -0.0006;
scene.add(fill);

// --- World ----------------------------------------------------------------

const collision = new CollisionWorld();
const lobby = createLobby(scene, collision);

// --- Profile and player ----------------------------------------------------
//
// The save is read before the player is built so the character wears the
// jacket you own and the nameplate shows your real name on the first frame,
// rather than flickering from a placeholder.

const { profile, isNew } = loadProfile();

const player = new Player(scene, collision, {
  shadeId: profile.equipped,
  username: profile.username || '...',
  wins: profile.wins,
});
player.position.copy(lobby.spawn);

// --- Input ------------------------------------------------------------------

const keys = new Set();
let interactPressed = false;

window.addEventListener('keydown', (e) => {
  if (e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
  // Escape is handled by the browser for pointer lock; the menu is shown
  // when the lock is lost rather than on the key itself.
  if (panelOpen()) return;
  if (e.code === 'KeyE' && !keys.has('KeyE')) interactPressed = true;
  if (e.code === 'KeyF' && !keys.has('KeyF')) round?.skipPrepare();
  // Digit1..Digit5 choose a hotbar slot.
  if (e.code === 'KeyC' && !keys.has('KeyC') && round.phase === PHASE.lobby) {
    audio.play('click');
    openPanel(() => shop.openShop());
  }
  if (e.code.startsWith('Digit')) {
    const slot = Number(e.code.slice(5)) - 1;
    if (slot >= 0 && slot < SLOTS) round?.select(slot);
  }
  keys.add(e.code);
});
window.addEventListener('keyup', (e) => keys.delete(e.code));
window.addEventListener('blur', () => keys.clear());

const overlay = document.getElementById('click-to-play');

// Pointer lock is refused in some embedded contexts (an iframe without the
// right permission, for instance). Catch it so it cannot throw, and say why
// rather than failing silently.
function requestLook() {
  // The browser will not let audio start until the player has interacted,
  // so this is the moment to wake it up.
  audio.unlock();
  const result = renderer.domElement.requestPointerLock();
  if (result && typeof result.catch === 'function') {
    result.catch(() => {
      overlay.querySelector('p').textContent =
        'Mouse-look needs a normal browser tab — open http://localhost:5173 directly';
    });
  }
}

overlay.addEventListener('click', requestLook);
renderer.domElement.addEventListener('click', () => {
  // A click is how you grab the mouse, and once you have it, how you use
  // whatever is in your hand.
  if (document.pointerLockElement !== renderer.domElement) {
    requestLook();
    return;
  }
  if (panelOpen()) return;
  round.useSelected();
});

document.addEventListener('pointerlockchange', () => {
  const locked = document.pointerLockElement === renderer.domElement;
  overlay.classList.toggle('hidden', locked);

  // Losing the mouse mid-game means Escape was pressed, which is the pause
  // menu. Not when a panel took the mouse on purpose.
  if (!locked && !panelOpen() && profile.username) {
    keys.clear();
    pauseEl.classList.add('show');
    refreshSoundButton();
  }
});

document.addEventListener('mousemove', (e) => {
  if (document.pointerLockElement !== renderer.domElement) return;
  player.addLook(e.movementX, e.movementY);
});

renderer.domElement.addEventListener(
  'wheel',
  (e) => {
    e.preventDefault();
    player.zoom(Math.sign(e.deltaY));
  },
  { passive: false },
);

// --- HUD --------------------------------------------------------------------

const phaseEl = document.getElementById('phase');
const winsEl = document.getElementById('hud-wins');
const winsWordEl = document.getElementById('hud-wins-word');
const gemsEl = document.getElementById('hud-gems');
const rankEl = document.getElementById('hud-rank');
const badgeEl = document.getElementById('hud-badge');
const rankFillEl = document.getElementById('hud-rank-fill');
const towardEl = document.getElementById('hud-toward');
const promptEl = document.getElementById('prompt');
const promptTextEl = document.getElementById('prompt-text');
const countdownEl = document.getElementById('countdown');
const countdownTimeEl = document.getElementById('countdown-time');
const countdownLabelEl = document.getElementById('countdown-label');
const warningEl = document.getElementById('warning');
const warningWhatEl = document.getElementById('warning-what');
const warningAdviceEl = document.getElementById('warning-advice');
const vitalsEl = document.getElementById('vitals');
const healthFillEl = document.getElementById('health-fill');
const vitalsStatusEl = document.getElementById('vitals-status');
const resultsEl = document.getElementById('results');
const resultsVerdictEl = document.getElementById('results-verdict');
const resultsDetailEl = document.getElementById('results-detail');
const resultsRewardEl = document.getElementById('results-reward');
const resultsEarnedEl = document.getElementById('results-earned');
const resultsTotalsEl = document.getElementById('results-totals');
const resultsRankupEl = document.getElementById('results-rankup');
const resultsRankupNameEl = document.getElementById('results-rankup-name');
const submergedEl = document.getElementById('submerged');
const hotbarEl = document.getElementById('hotbar');
const buffsEl = document.getElementById('buffs');
const flashEl = document.getElementById('flash');
phaseEl.textContent = 'LOBBY';

/**
 * Pushes the profile to everything that shows it: the HUD corner and the
 * nameplate above the character. Called after any change so there is one
 * place that knows how the numbers are displayed.
 */
function refreshProfileUI() {
  const { rank, next, have, need, fraction } = rankProgress(profile.wins);

  winsEl.textContent = profile.wins.toLocaleString();
  winsWordEl.textContent = profile.wins === 1 ? 'win' : 'wins';
  gemsEl.textContent = profile.gems.toLocaleString();

  rankEl.textContent = rank.name;
  rankEl.style.color = rank.color;
  badgeEl.style.background = rank.color;

  rankFillEl.style.width = `${fraction * 100}%`;
  rankFillEl.style.background = next ? next.color : rank.color;
  towardEl.textContent = next
    ? `${(need - have).toLocaleString()} more to ${next.name}`
    : 'Top rank';

  updateNameplate(player.character, profile.username || '...', profile.wins);
}

refreshProfileUI();
setShade(player.character, profile.equipped);

let notice = '';
let noticeUntil = 0;

function showNotice(text, seconds = 2.6) {
  notice = text;
  noticeUntil = performance.now() / 1000 + seconds;
}

/** The nearest interactable in range, by flat distance. */
function findNearest() {
  let best = null;
  let bestDistance = Infinity;

  for (const item of lobby.interactables) {
    const dx = item.position.x - player.position.x;
    const dz = item.position.z - player.position.z;
    const distance = Math.hypot(dx, dz);
    if (distance <= item.radius && distance < bestDistance) {
      best = item;
      bestDistance = distance;
    }
  }

  return best;
}

function interact(item) {
  switch (item.kind) {
    case 'seat':
      player.setSitting(true, item.seat);
      showNotice('Press a movement key to stand up');
      break;
    case 'bookshelf':
      audio.play('click');
      openPanel(() => books.open());
      break;
    case 'roulette':
      audio.play('click');
      openPanel(() => shop.openSpin());
      break;
    case 'portal':
      audio.play('portal');
      round.enterQueue();
      break;
    default:
      break;
  }
}

function updatePrompt(now) {
  // The lobby furniture is not there during a match, so nothing is in range.
  const inLobby = round.phase === PHASE.lobby;
  const nearest = player.sitting || !inLobby ? null : findNearest();

  // Handled before the notice is drawn, so a message on screen cannot
  // swallow the next `E` press.
  if (interactPressed && nearest) interact(nearest);

  // During a match `E` picks supplies up instead.
  let supply = null;
  if (round.inMatch && round.supplies) {
    supply = round.supplies.nearest(player.position);
    if (interactPressed && supply) round.pickUp();
  }

  if (notice && now < noticeUntil) {
    promptTextEl.textContent = notice;
    promptEl.classList.add('show');
    promptEl.firstElementChild.style.display = 'none';
    return;
  }

  notice = '';
  promptEl.firstElementChild.style.display = '';

  if (nearest) {
    promptTextEl.textContent = nearest.label;
    promptEl.classList.add('show');
  } else if (supply) {
    promptTextEl.textContent = `Take the ${supply.item.name.toLowerCase()}`;
    promptEl.classList.add('show');
  } else {
    promptEl.classList.remove('show');
  }
}

// --- Profile changes ----------------------------------------------------------
//
// Phases 8 and 9 award wins and gems and unlock shades; they all go through
// here so a change is never shown without also being written to disk.

function updateProfile(changes) {
  Object.assign(profile, changes);
  const stored = saveProfile(profile);
  refreshProfileUI();

  if (!stored) {
    showNotice('Progress cannot be saved in this browser', 4);
  }

  return stored;
}

// --- First launch -------------------------------------------------------------

const overlayTitle = overlay.querySelector('h1');

if (isNew) {
  // The click-to-play screen would otherwise sit behind the picker inviting a
  // click that does nothing useful until there is a name.
  overlay.classList.add('hidden');

  askForUsername().then((username) => {
    updateProfile({ username });
    overlay.classList.remove('hidden');
    overlayTitle.textContent = `WELCOME, ${username.toUpperCase()}`;
  });
}

// --- The round ----------------------------------------------------------------

const round = new Round({
  scene,
  player,
  lobby,
  lobbyCollision: collision,
  onFinished: (result) => {
    // Recorded on the result so the results screen can show what this round
    // was worth, whether or not anything was awarded.
    result.winsBefore = profile.wins;
    result.gemsBefore = profile.gems;

    if (result.wins === 0 && result.gems === 0) {
      result.rankedUp = null;
      return;
    }

    const before = rankForWins(profile.wins);
    updateProfile({
      wins: profile.wins + result.wins,
      gems: profile.gems + result.gems,
    });
    const after = rankForWins(profile.wins);

    // A rank-up is the only thing in this game worth interrupting for.
    // Celebrated on the results screen (PRD section 9), which is already on
    // screen at exactly this moment.
    result.rankedUp = after.name === before.name ? null : after;
    if (result.rankedUp) setTimeout(() => audio.play('rankUp'), 450);
  },
});

// Indoor lighting for the lobby, daylight for a map. Kept here rather than in
// the map so every map does not have to rebuild the lights it shares.
const LOBBY_LOOK = {
  background: new THREE.Color(0x15121c),
  fog: null,
  hemisphere: 0.85,
  fill: 1.05,
};

/** The map's own sky and fog, before a disaster starts changing them. */
let baseLook = null;

function applyLook(map) {
  baseLook = map ? { sky: new THREE.Color(map.info.sky), fog: map.info.fog, indoor: !!map.info.indoor } : null;
  if (map) {
    scene.background = new THREE.Color(map.info.sky);
    scene.fog = new THREE.Fog(map.info.fog.color, map.info.fog.near, map.info.fog.far);
    // A cave has rock where the sky would be, so it brings its own lights
    // and the sun is turned right down rather than shining through stone.
    hemisphere.intensity = map.info.indoor ? 0.3 : 1.1;
    fill.intensity = map.info.indoor ? 0.12 : 1.75;
  } else {
    scene.background = LOBBY_LOOK.background;
    scene.fog = LOBBY_LOOK.fog;
    hemisphere.intensity = LOBBY_LOOK.hemisphere;
    fill.intensity = LOBBY_LOOK.fill;
  }
}

/** Formats a number of seconds as m:ss, rounded up so it never shows 0:00 early. */
function clock_(seconds) {
  const total = Math.ceil(seconds);
  const minutes = Math.floor(total / 60);
  return `${minutes}:${String(total % 60).padStart(2, '0')}`;
}

const PHASE_LABEL = {
  [PHASE.lobby]: 'LOBBY',
  [PHASE.queue]: 'STARTING',
  [PHASE.prepare]: 'PREPARE',
  [PHASE.disaster]: 'SURVIVE',
  [PHASE.results]: 'RESULTS',
};

let shownPhase = null;
/**
 * The result currently drawn on the results panel.
 *
 * Keyed on the result rather than on a phase change: a transition can pass
 * without the render loop ever observing it, and then the panel keeps the
 * last round's verdict — telling you that you made it when you did not.
 */
let shownResult = null;

/** Fills in the results panel for one finished round. */
function drawResults(result) {
  // Nobody loses here, they just come back. The wording stays cheerful
  // either way: this is a game for a nine-year-old, not a war film.
  const { survived, map, disaster, rankedUp } = result;

  resultsVerdictEl.textContent = survived ? 'YOU MADE IT!' : 'BACK TO THE LOBBY';
  resultsVerdictEl.className = `verdict ${survived ? 'good' : 'soft'}`;
  resultsDetailEl.textContent = `${disaster} on the ${map} map`;

  resultsEarnedEl.innerHTML = survived
    ? '<span class="win">+1 win</span><span class="gem">+1 gem</span>'
    : '';

  // The totals are shown either way: a round you did not win leaves you no
  // further back, and seeing the number hold steady says exactly that.
  const { next, have, need } = rankProgress(profile.wins);
  resultsTotalsEl.textContent = next
    ? `${profile.wins.toLocaleString()} wins · ${profile.gems.toLocaleString()} gems · ${(need - have).toLocaleString()} more to ${next.name}`
    : `${profile.wins.toLocaleString()} wins · ${profile.gems.toLocaleString()} gems · top rank`;

  resultsRankupEl.classList.toggle('show', !!rankedUp);
  if (rankedUp) {
    resultsRankupNameEl.textContent = rankedUp.name.toUpperCase();
    resultsRankupNameEl.style.color = rankedUp.color;
  }

  resultsRewardEl.textContent = survived ? '' : 'Have another go!';
}

function updateRoundUI() {
  const phase = round.phase;

  if (phase !== shownPhase) {
    // Keyed on whether we are in a match rather than on one particular
    // transition, so entering the disaster phase by any route still gets
    // the map's sky instead of the lobby's dark interior.
    if (round.inMatch && !baseLook) applyLook(round.map);
    if (!round.inMatch && baseLook) applyLook(null);

    phaseEl.textContent = PHASE_LABEL[phase];
    shownPhase = phase;

    if (phase === PHASE.prepare) {
      warningWhatEl.textContent = round.disaster.info.name.toUpperCase();
      warningAdviceEl.textContent = round.disaster.info.advice;
    }
  }

  // Drawn whenever there is a result the panel has not shown yet, rather
  // than on the lobby -> results transition. A transition can slip past
  // without the render loop observing it, and the panel then keeps the last
  // round's verdict — telling you that you made it when you did not.
  if (round.phase === PHASE.results && round.result !== shownResult) {
    shownResult = round.result;
    drawResults(round.result);
  }
  if (round.phase !== PHASE.results) shownResult = null;

  warningEl.classList.toggle('show', phase === PHASE.prepare);
  vitalsEl.classList.toggle('show', phase === PHASE.disaster);
  resultsEl.classList.toggle('show', phase === PHASE.results);

  const showTimer = phase === PHASE.queue || round.inMatch;
  countdownEl.classList.toggle('show', showTimer);
  countdownEl.classList.toggle('compact', round.inMatch);

  if (showTimer) {
    countdownTimeEl.textContent = clock_(round.timeLeft);
    countdownLabelEl.textContent =
      phase === PHASE.queue
        ? 'Match starting - step out of the portal to cancel'
        : phase === PHASE.prepare
          ? 'Until the disaster - press F to start it now'
          : 'Survive';
  }

  if (phase === PHASE.disaster) {
    const fraction = Math.max(0, round.health) / 100;
    healthFillEl.style.width = `${fraction * 100}%`;
    healthFillEl.style.backgroundColor =
      fraction > 0.5 ? '#5fd97a' : fraction > 0.2 ? '#ffd45e' : '#ff6b6b';
    vitalsStatusEl.textContent = round.status ?? '';
  }

  // The water tint follows the status rather than re-testing the level here,
  // so there is one definition of being under water.
  submergedEl.classList.toggle('show', round.status === 'Underwater!');
}

// --- Shop and Roulette --------------------------------------------------------
//
// Everything here is bought with gems, and gems only ever come from
// surviving a disaster. There is no purchase of any kind, in any currency.

const audio = createAudio();

const books = createBooks({
  sound: (name) => audio.play(name),
  onClose: () => keys.clear(),
});

const pauseEl = document.getElementById('pause');
const soundButton = document.getElementById('pause-sound');

function refreshSoundButton() {
  soundButton.textContent = `Sound: ${audio.enabled ? 'on' : 'off'}`;
}
refreshSoundButton();

soundButton.addEventListener('click', () => {
  audio.setEnabled(!audio.enabled);
  refreshSoundButton();
});
document.getElementById('pause-resume').addEventListener('click', () => {
  audio.play('click');
  pauseEl.classList.remove('show');
  keys.clear();
});
document.getElementById('pause-books').addEventListener('click', () => {
  audio.play('click');
  pauseEl.classList.remove('show');
  books.open();
});

/** True while anything is covering the game. */
function panelOpen() {
  return shop.isOpen || books.isOpen || pauseEl.classList.contains('show');
}

const shop = createShop({
  getProfile: () => profile,
  onChange: (changes) => updateProfile(changes),
  onWear: (shadeId) => setShade(player.character, shadeId),
  /** Runs the lobby wheel and waits for it to stop. */
  playSpin: async (outcome) => {
    audio.play('lever');
    lobby.roulette.pullLever();

    // Ticks as the wheel passes segments, thinning out as it slows, which is
    // most of what makes a wheel feel like a wheel.
    const ticks = [];
    for (let t = 0; t < 3.7; t += 0.07 + (t / 3.7) ** 2 * 0.42) ticks.push(t);
    for (const at of ticks) setTimeout(() => audio.play('tick'), at * 1000);

    await lobby.roulette.spinTo(outcome.tier.id);

    if (outcome.duplicate) audio.play('duplicate');
    else if (outcome.tier.id === 'legendary') audio.play('fanfare');
    else audio.play('reward');

    lobby.roulette.lightCase(outcome.tier.id === 'legendary');
  },
  sound: (name) => audio.play(name),
});

shop.onClosed = () => keys.clear();

// Everything the round wants heard goes through one place.
round.onEvent = (name) => audio.play(name);

// A soft bump the first time a hazard starts hurting, and not once a frame
// after that — a continuous drain should not become a continuous noise.
let wasHurting = false;

/** A panel wants the mouse, so hand the pointer back while one is open. */
function openPanel(open) {
  if (document.pointerLockElement === renderer.domElement) document.exitPointerLock();
  keys.clear();
  open();
}

// --- Supplies -----------------------------------------------------------------

// Built once and then updated in place, so the hotbar is not rebuilt from
// scratch sixty times a second.
const slotEls = [];
for (let i = 0; i < SLOTS; i += 1) {
  const slot = document.createElement('div');
  slot.className = 'slot empty';
  slot.innerHTML =
    `<span class="key">${i + 1}</span><span class="chip"></span>` +
    '<span class="tag"></span><span class="count"></span>';
  hotbarEl.appendChild(slot);
  slotEls.push({
    root: slot,
    chip: slot.querySelector('.chip'),
    tag: slot.querySelector('.tag'),
    count: slot.querySelector('.count'),
  });
}

function hex(color) {
  return `#${color.toString(16).padStart(6, '0')}`;
}

function updateSupplies() {
  const inMatch = round.inMatch;
  hotbarEl.classList.toggle('show', inMatch);

  if (inMatch) {
    for (let i = 0; i < SLOTS; i += 1) {
      const slot = round.inventory[i];
      const el = slotEls[i];
      el.root.classList.toggle('on', i === round.selected);
      el.root.classList.toggle('empty', !slot);
      el.chip.style.background = slot ? hex(slot.item.color) : '';
      el.tag.textContent = slot ? slot.item.short : '';
      el.count.textContent = slot && slot.count > 1 ? slot.count : '';
    }

    const buffs = [];
    if (round.hydration > 0) buffs.push(`<span class="buff water">Water ${Math.ceil(round.hydration)}s</span>`);
    if (round.torch > 0) buffs.push(`<span class="buff torch">Torch ${Math.ceil(round.torch)}s</span>`);
    buffsEl.innerHTML = buffs.join('');
    buffsEl.classList.toggle('show', buffs.length > 0);
  } else {
    buffsEl.classList.remove('show');
  }

  // The line under the hotbar: whatever just happened, or — when nothing
  // has — what a click would do with the thing you are holding. A tent and
  // a loaf of bread both sit in the same slot, so the verb has to be said.
  const message = round.message;
  const held = inMatch ? round.inventory[round.selected] : null;
  const hint = held ? `Click to ${USE_TEXT[held.item.kind]} the ${held.item.name.toLowerCase()}` : '';
  const text = message || hint;

  flashEl.textContent = text;
  flashEl.classList.toggle('show', text !== '');
  flashEl.classList.toggle('hint', !message && hint !== '');
}

// --- What the disaster does to the view ---------------------------------------
//
// A disaster may ask for three things: the camera shaken, the air thickened,
// and the light coloured. They are applied here rather than inside each
// disaster so nothing else can quietly grab the camera.

const shakeOffset = new THREE.Vector3();
const tintColor = new THREE.Color();

// Carried light, for the cave and for seeing through a blizzard.
const torchLight = new THREE.PointLight(0xffc06a, 0, 22, 2);
torchLight.visible = false;
scene.add(torchLight);

function applyDisasterView(dt) {
  torchLight.visible = round.torch > 0;
  if (torchLight.visible) {
    torchLight.intensity = 26;
    torchLight.position.copy(player.position);
    torchLight.position.y += 1.5;
  }

  const disaster = round.phase === PHASE.disaster ? round.disaster : null;

  if (!disaster || !baseLook) {
    shakeOffset.set(0, 0, 0);
    return;
  }

  // Thicker air: the fog closes in, which is what a blizzard is really made
  // of. `murk` runs 0 to 1.
  const murk = disaster.murk ?? 0;
  if (scene.fog && baseLook.fog) {
    scene.fog.near = baseLook.fog.near * (1 - murk * 0.85);
    scene.fog.far = baseLook.fog.far * (1 - murk * 0.8);
  }

  if (disaster.tint) {
    tintColor.set(disaster.tint);
    scene.background = baseLook.sky.clone().lerp(tintColor, 0.25 + murk * 0.6);
    if (scene.fog) scene.fog.color.copy(scene.background);
  }

  // Shaking is an offset applied after the camera is placed, so it never
  // fights the player's aim.
  const shake = disaster.shake ?? 0;
  if (shake > 0) {
    const t = performance.now() * 0.001;
    shakeOffset.set(
      Math.sin(t * 47) * shake,
      Math.sin(t * 61) * shake * 0.7,
      Math.sin(t * 53) * shake,
    );
    camera.position.add(shakeOffset);
  }
}

// --- Loop ---------------------------------------------------------------------

const clock = new THREE.Clock();
let lastHealth = 100;

function animate() {
  requestAnimationFrame(animate);
  // Clamped so a backgrounded tab cannot resume with a huge time step.
  const dt = Math.min(clock.getDelta(), 0.05);
  const elapsed = clock.elapsedTime;

  round.update(dt);
  player.update(dt, keys, camera);
  if (round.phase === PHASE.lobby) lobby.update(elapsed);
  // One bump per spell of being hurt.
  const hurting = round.phase === PHASE.disaster && round.alive && round.health < lastHealth;
  if (hurting && !wasHurting) audio.play('hurt');
  wasHurting = hurting;
  lastHealth = round.health;

  round.supplies?.update(elapsed);
  applyDisasterView(dt);
  updateRoundUI();
  updateSupplies();
  updatePrompt(performance.now() / 1000);
  interactPressed = false;

  renderer.render(scene, camera);
}

animate();

// --- Resize ---------------------------------------------------------------------

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Exposed so the lobby can be checked from the console during testing.
window.__game = {
  player, collision, camera, keys, lobby, scene,
  profile, updateProfile, round,
  /** Development only: wipes the save so the next reload asks for a name. */
  resetProfile: clearProfile,
};
