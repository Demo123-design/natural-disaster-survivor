// Sound, synthesised in the browser.
//
// Every sound here is generated with Web Audio rather than loaded from a
// file: no downloads, no asset licensing, and nothing to go missing. It also
// keeps the whole game a handful of text files.
//
// The palette is deliberately soft. This is a game for a nine-year-old, so
// nothing stings, nothing is sudden and loud, and being caught by a disaster
// sounds gentle rather than alarming.

const STORAGE_KEY = 'nds.sound.v1';

/** Notes, so tunes can be written as names rather than numbers. */
const NOTE = {
  C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.00, A4: 440.00, B4: 493.88,
  C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99, A5: 880.00, C6: 1046.50,
};

export function createAudio() {
  let context = null;
  let master = null;
  let on = true;

  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved !== null) on = saved === 'on';
  } catch {
    // Storage can be blocked. Sound simply defaults to on.
  }

  /**
   * Browsers refuse to start audio until the player has interacted, so the
   * context is built on the first sound after a click rather than up front.
   */
  function ready() {
    if (!on) return null;
    if (!context) {
      const Ctor = window.AudioContext || window.webkitAudioContext;
      if (!Ctor) return null;
      context = new Ctor();
      master = context.createGain();
      master.gain.value = 0.32;
      master.connect(context.destination);
    }
    if (context.state === 'suspended') context.resume();
    return context;
  }

  /** One note, with a soft attack and release so nothing clicks. */
  function tone(freq, { at = 0, length = 0.18, type = 'sine', gain = 0.6, bend = 0 } = {}) {
    const ctx = ready();
    if (!ctx) return;

    const start = ctx.currentTime + at;
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    if (bend) osc.frequency.exponentialRampToValueAtTime(Math.max(20, freq + bend), start + length);

    amp.gain.setValueAtTime(0.0001, start);
    amp.gain.exponentialRampToValueAtTime(gain, start + 0.012);
    amp.gain.exponentialRampToValueAtTime(0.0001, start + length);

    osc.connect(amp);
    amp.connect(master);
    osc.start(start);
    osc.stop(start + length + 0.02);
  }

  /** Filtered noise: thuds, whooshes, ticks. */
  function noise({ at = 0, length = 0.2, gain = 0.4, frequency = 900, q = 1, type = 'lowpass' } = {}) {
    const ctx = ready();
    if (!ctx) return;

    const start = ctx.currentTime + at;
    const frames = Math.max(1, Math.floor(ctx.sampleRate * length));
    const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < frames; i += 1) data[i] = Math.random() * 2 - 1;

    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = frequency;
    filter.Q.value = q;

    const amp = ctx.createGain();
    amp.gain.setValueAtTime(gain, start);
    amp.gain.exponentialRampToValueAtTime(0.0001, start + length);

    source.connect(filter);
    filter.connect(amp);
    amp.connect(master);
    source.start(start);
  }

  /** A sequence of notes, as [frequency, startOffset, length]. */
  function tune(notes, options = {}) {
    for (const [freq, at, length] of notes) {
      tone(freq, { at, length: length ?? 0.18, ...options });
    }
  }

  const sounds = {
    click: () => tone(NOTE.E5, { length: 0.07, type: 'triangle', gain: 0.35 }),
    back: () => tone(NOTE.C4, { length: 0.1, type: 'triangle', gain: 0.3 }),

    pickup: () => tune([[NOTE.E5, 0, 0.09], [NOTE.A5, 0.06, 0.12]], { type: 'triangle', gain: 0.4 }),
    full: () => tone(NOTE.C4, { length: 0.14, type: 'sine', gain: 0.3 }),

    eat: () => { tone(NOTE.G4, { length: 0.1, type: 'sine', gain: 0.35 }); tone(NOTE.C5, { at: 0.08, length: 0.16, type: 'sine', gain: 0.35 }); },
    drink: () => { tone(NOTE.D5, { length: 0.12, type: 'sine', gain: 0.3, bend: 120 }); noise({ at: 0.02, length: 0.14, gain: 0.12, frequency: 1800 }); },
    place: () => { noise({ length: 0.18, gain: 0.35, frequency: 320 }); tone(NOTE.C4, { length: 0.14, type: 'triangle', gain: 0.25 }); },
    torch: () => noise({ length: 0.5, gain: 0.3, frequency: 1200, type: 'bandpass', q: 0.8 }),
    chop: () => { noise({ length: 0.16, gain: 0.4, frequency: 600 }); noise({ at: 0.09, length: 0.2, gain: 0.25, frequency: 2400 }); },

    // A soft bump rather than anything painful.
    hurt: () => tone(NOTE.D4, { length: 0.14, type: 'sine', gain: 0.3, bend: -60 }),
    /** Running out of energy: a gentle slide down, not a death sting. */
    out: () => tune([[NOTE.G4, 0, 0.18], [NOTE.E4, 0.14, 0.2], [NOTE.C4, 0.3, 0.34]], { type: 'sine', gain: 0.32 }),

    warn: () => { tone(NOTE.A4, { length: 0.22, type: 'triangle', gain: 0.3 }); tone(NOTE.A4, { at: 0.26, length: 0.22, type: 'triangle', gain: 0.3 }); },
    start: () => { noise({ length: 0.7, gain: 0.26, frequency: 420, type: 'bandpass', q: 0.6 }); tone(NOTE.C4, { length: 0.5, type: 'sine', gain: 0.25, bend: 160 }); },

    win: () => tune([[NOTE.C5, 0, 0.14], [NOTE.E5, 0.11, 0.14], [NOTE.G5, 0.22, 0.3]], { type: 'triangle', gain: 0.4 }),
    rankUp: () => tune(
      [[NOTE.C5, 0, 0.14], [NOTE.E5, 0.12, 0.14], [NOTE.G5, 0.24, 0.14], [NOTE.C6, 0.36, 0.46]],
      { type: 'triangle', gain: 0.45 },
    ),

    tick: () => noise({ length: 0.035, gain: 0.3, frequency: 2600, type: 'bandpass', q: 3 }),
    lever: () => { noise({ length: 0.12, gain: 0.3, frequency: 500 }); tone(NOTE.E4, { at: 0.05, length: 0.1, type: 'square', gain: 0.18 }); },
    reward: () => tune([[NOTE.E5, 0, 0.14], [NOTE.A5, 0.12, 0.26]], { type: 'triangle', gain: 0.4 }),
    duplicate: () => tune([[NOTE.E4, 0, 0.16], [NOTE.C4, 0.14, 0.24]], { type: 'triangle', gain: 0.3 }),
    /** Legendary deserves more than a chime. */
    fanfare: () => {
      tune([[NOTE.C5, 0, 0.16], [NOTE.E5, 0.14, 0.16], [NOTE.G5, 0.28, 0.16], [NOTE.C6, 0.42, 0.6]], { type: 'triangle', gain: 0.5 });
      tune([[NOTE.G4, 0.42, 0.6], [NOTE.E5, 0.42, 0.6]], { type: 'sine', gain: 0.28 });
    },

    portal: () => { tone(NOTE.C4, { length: 0.6, type: 'sine', gain: 0.3, bend: 500 }); noise({ length: 0.6, gain: 0.16, frequency: 900, type: 'bandpass', q: 1.4 }); },
  };

  return {
    /** @param {keyof sounds} name */
    play(name) {
      if (!on) return;
      sounds[name]?.();
    },

    get enabled() {
      return on;
    },

    setEnabled(value) {
      on = value;
      try {
        localStorage.setItem(STORAGE_KEY, value ? 'on' : 'off');
      } catch {
        // Not being able to remember the choice is not worth failing over.
      }
      if (on) {
        ready();
        sounds.click();
      }
    },

    /** Called on the first click, so the browser lets audio start. */
    unlock() {
      ready();
    },
  };
}
