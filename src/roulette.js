// The Roulette (PRD section 10.1).
//
// 750 gems for a random jacket shade. The odds are 80% Rare, 19% Epic, 1%
// Legendary, and a duplicate hands back half your gems.
//
// Worth being explicit about why a randomised reward is allowed here at all,
// because the project's hard rule is that there is never real money in this
// game (PRD section 10). A spin is paid for with gems earned by surviving
// disasters, gems cannot be bought, there is no top-up, and the worst run of
// luck possible ends with "go and play more rounds". That is what separates
// it from a paid loot box, and it only holds while gems stay unbuyable.

export const SPIN_COST = 750;
/** Half back on a duplicate, which is what stops the machine being free. */
export const DUPLICATE_REFUND = SPIN_COST / 2;

/**
 * The tiers, in the order the roll checks them. The chances add to 1.
 *
 * The roll picks a tier first and then a shade at random from everything in
 * that tier, owned or not — which is why duplicates happen at all.
 */
export const TIERS = [
  { id: 'rare', name: 'Rare', chance: 0.80, color: '#6ea8ff', shades: ['indigo', 'tan', 'peach', 'cream'] },
  { id: 'epic', name: 'Epic', chance: 0.19, color: '#c77dff', shades: ['darkgreen', 'lightgreen', 'yellowochre'] },
  { id: 'legendary', name: 'Legendary', chance: 0.01, color: '#ffd45e', shades: ['divine'] },
];

/** Every shade the machine can give you. */
export const POOL = TIERS.flatMap((tier) => tier.shades);

export function tierOf(shadeId) {
  return TIERS.find((tier) => tier.shades.includes(shadeId)) ?? null;
}

/** True once there is nothing left for the machine to give you. */
export function ownsEverything(unlocked) {
  return POOL.every((id) => unlocked.includes(id));
}

/**
 * Rolls a result.
 *
 * Called *before* the wheel animates, and the animation is then made to land
 * on this. The animation never changes the outcome and never fakes a near
 * miss: if it stops next to Legendary, that is genuinely where it landed.
 *
 * @param {() => number} [random]
 * @returns {{tier: object, shadeId: string}}
 */
export function roll(random = Math.random) {
  const pick = random();
  let seen = 0;

  for (const tier of TIERS) {
    seen += tier.chance;
    if (pick < seen) {
      const shadeId = tier.shades[Math.floor(random() * tier.shades.length)];
      return { tier, shadeId };
    }
  }

  // Only reachable through floating-point rounding at the very top of the
  // range. Falling back to the commonest tier keeps a spin from failing.
  const tier = TIERS[0];
  return { tier, shadeId: tier.shades[Math.floor(random() * tier.shades.length)] };
}

/**
 * Works out what a spin costs and gives, without changing anything.
 *
 * @param {string[]} unlocked shades already owned
 * @param {number} gems
 * @param {() => number} [random]
 * @returns {{ok: boolean, reason?: string, shadeId?: string, tier?: object,
 *            duplicate?: boolean, spend?: number, refund?: number, net?: number}}
 */
export function attemptSpin(unlocked, gems, random = Math.random) {
  if (ownsEverything(unlocked)) {
    return { ok: false, reason: 'You own them all' };
  }
  if (gems < SPIN_COST) {
    return { ok: false, reason: `You need ${SPIN_COST - gems} more gems` };
  }

  const { tier, shadeId } = roll(random);
  const duplicate = unlocked.includes(shadeId);
  const refund = duplicate ? DUPLICATE_REFUND : 0;

  return {
    ok: true,
    tier,
    shadeId,
    duplicate,
    spend: SPIN_COST,
    refund,
    net: SPIN_COST - refund,
  };
}
