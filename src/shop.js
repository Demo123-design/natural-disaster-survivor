// The jacket shop and the Roulette's panels (PRD sections 10, 10.1, 12.1).
//
// Everything here is paid for in gems, which are only ever earned by
// surviving a disaster. There is no purchase of any kind in this file, no
// price in any real currency, and no way to acquire gems other than playing.
// That is a permanent rule for this project, not a v1 simplification.

import { HOODIE_SHADES } from './constants.js';
import { SPIN_COST, DUPLICATE_REFUND, attemptSpin, ownsEverything, tierOf } from './roulette.js';

/** Price bands, from PRD section 12.1. */
const BANDS = [
  { max: 0, name: 'Starter' },
  { max: 25, name: 'Common' },
  { max: 50, name: 'Uncommon' },
  { max: 100, name: 'Rare' },
  { max: 500, name: 'Epic' },
  { max: Infinity, name: 'Legendary' },
];

function bandFor(price) {
  return BANDS.find((b) => price <= b.max).name;
}

/** The CSS background for a shade, including Divine's gradient. */
function swatch(shade) {
  if (shade.gradient) {
    const [from, to] = shade.gradient.map((c) => `#${c.toString(16).padStart(6, '0')}`);
    return `linear-gradient(135deg, ${from}, ${to})`;
  }
  return `#${shade.color.toString(16).padStart(6, '0')}`;
}

/**
 * Wires up both panels.
 *
 * @param {object} deps
 * @param {() => object} deps.getProfile
 * @param {(changes: object) => void} deps.onChange writes and saves the profile
 * @param {(shadeId: string) => void} deps.onWear puts a jacket on the character
 * @param {(result: object) => Promise<void>} deps.playSpin runs the wheel animation
 * @param {(name: string) => void} [deps.sound]
 * @param {() => number} [deps.random]
 */
export function createShop({ getProfile, onChange, onWear, playSpin, sound = () => {}, random = Math.random }) {
  const shopEl = document.getElementById('shop');
  const gridEl = document.getElementById('shop-grid');
  const purseEl = document.getElementById('shop-purse');
  const subEl = document.getElementById('shop-sub');

  const spinEl = document.getElementById('spin-panel');
  const askEl = document.getElementById('spin-ask');
  const busyEl = document.getElementById('spin-busy');
  const resultEl = document.getElementById('spin-result');
  const noteEl = document.getElementById('spin-note');
  const goEl = document.getElementById('spin-go');

  let onClose = null;

  // --- Shop ----------------------------------------------------------------

  function drawShop() {
    const profile = getProfile();
    purseEl.textContent = `${profile.gems.toLocaleString()} gems`;
    gridEl.replaceChildren();

    for (const shade of HOODIE_SHADES) {
      const owned = profile.unlocked.includes(shade.id);
      const worn = profile.equipped === shade.id;
      const affordable = profile.gems >= shade.price;

      const card = document.createElement('div');
      card.className = `shade ${worn ? 'worn' : ''} ${owned ? '' : 'locked'} ${!owned && !affordable ? 'cant' : ''}`;
      card.innerHTML =
        `<div class="swatch" style="background:${swatch(shade)}"></div>` +
        `<div class="name">${shade.name}</div>` +
        `<div class="price ${owned ? 'own' : 'cost'}">${
          worn ? 'Wearing' : owned ? 'Owned' : `${shade.price.toLocaleString()} gems`
        }</div>` +
        `<div class="tier">${bandFor(shade.price).toUpperCase()}</div>`;

      card.addEventListener('click', () => {
        const now = getProfile();
        if (now.unlocked.includes(shade.id)) {
          sound('click');
          onChange({ equipped: shade.id });
          onWear(shade.id);
          drawShop();
          return;
        }
        if (now.gems < shade.price) {
          sound('full');
          subEl.textContent = `${shade.name} costs ${shade.price.toLocaleString()} gems — you have ${now.gems.toLocaleString()}. Win more rounds.`;
          return;
        }
        sound('reward');
        onChange({
          gems: now.gems - shade.price,
          unlocked: [...now.unlocked, shade.id],
          equipped: shade.id,
        });
        onWear(shade.id);
        subEl.textContent = `${shade.name} is yours. Looking good.`;
        drawShop();
      });

      gridEl.appendChild(card);
    }
  }

  document.getElementById('shop-close').addEventListener('click', () => {
    sound('back');
    closeShop();
  });

  function openShop() {
    subEl.textContent = 'Click a jacket to wear it. Locked ones cost gems you have earned by surviving.';
    drawShop();
    shopEl.classList.add('show');
  }

  function closeShop() {
    shopEl.classList.remove('show');
    onClose?.();
  }

  // --- Roulette ------------------------------------------------------------

  function showAsk() {
    const profile = getProfile();
    askEl.style.display = '';
    busyEl.style.display = 'none';
    resultEl.style.display = 'none';

    const allOwned = ownsEverything(profile.unlocked);
    const canAfford = profile.gems >= SPIN_COST;

    goEl.disabled = allOwned || !canAfford;
    noteEl.textContent = allOwned
      ? 'You own every jacket the machine can give. Nothing left to win.'
      : canAfford
        ? `You have ${profile.gems.toLocaleString()} gems. A jacket you already own gives ${DUPLICATE_REFUND} back.`
        : `You have ${profile.gems.toLocaleString()} gems and need ${SPIN_COST.toLocaleString()}. Win more rounds.`;
  }

  async function spin() {
    const profile = getProfile();
    const outcome = attemptSpin(profile.unlocked, profile.gems, random);
    if (!outcome.ok) {
      sound('full');
      noteEl.textContent = outcome.reason;
      return;
    }

    // Gems come out before the wheel moves, and the result is already
    // decided — the animation is shown a result, it never picks one.
    const unlocked = outcome.duplicate
      ? profile.unlocked
      : [...profile.unlocked, outcome.shadeId];

    onChange({
      gems: profile.gems - outcome.spend + outcome.refund,
      unlocked,
    });

    askEl.style.display = 'none';
    busyEl.style.display = '';
    resultEl.style.display = 'none';

    await playSpin(outcome);

    const shade = HOODIE_SHADES.find((s) => s.id === outcome.shadeId);
    document.getElementById('spin-swatch').style.background = swatch(shade);
    document.getElementById('spin-name').textContent = shade.name;
    const tier = tierOf(outcome.shadeId);
    const tierEl = document.getElementById('spin-tier');
    tierEl.textContent = tier.name.toUpperCase();
    tierEl.style.color = tier.color;
    document.getElementById('spin-dup').textContent = outcome.duplicate
      ? `DUPLICATE — ${DUPLICATE_REFUND} gems refunded`
      : '';

    busyEl.style.display = 'none';
    resultEl.style.display = '';
  }

  document.getElementById('spin-go').addEventListener('click', spin);
  document.getElementById('spin-again').addEventListener('click', showAsk);
  document.getElementById('spin-cancel').addEventListener('click', () => closeSpin());
  document.getElementById('spin-done').addEventListener('click', () => closeSpin());

  function openSpin() {
    showAsk();
    spinEl.classList.add('show');
  }

  function closeSpin() {
    spinEl.classList.remove('show');
    onClose?.();
  }

  return {
    openShop,
    openSpin,
    closeAll() {
      shopEl.classList.remove('show');
      spinEl.classList.remove('show');
    },
    get isOpen() {
      return shopEl.classList.contains('show') || spinEl.classList.contains('show');
    },
    set onClosed(fn) {
      onClose = fn;
    },
  };
}
