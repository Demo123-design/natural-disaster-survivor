// The bookshelf (PRD section 4, decision Q4).
//
// Thirteen readable books: one per disaster, plus "How to play". This is the
// tutorial, hidden in plain sight — nobody has to sit through it, and the
// player who wants to know how a blizzard works can go and look it up.
//
// The tips are written to be read by a nine-year-old: short sentences, plain
// words, and the useful thing first.

import { DISASTERS } from './disasters/index.js';

export const BOOKS = [
  {
    id: 'howto',
    title: 'How to play',
    spine: 0xf0c23a,
    pages: [
      'Walk into the glowing portal and press E. That starts a match.',
      'First you get two minutes to get ready. Look around, find the high ground, and pick up supplies. Press E to take one. You can carry five things.',
      'Then the disaster starts. Stay alive until the timer runs out and you win: +1 win and +1 gem.',
      'If your energy runs out you just come back to the lobby. Nothing bad happens. Have another go.',
      'Press 1 to 5 to choose a supply and click to use it. Food gives energy back. Water keeps you cool. A tarp or a tent gives you a roof.',
      'Press C in the lobby to change your jacket. Gems buy new ones, and you earn gems by winning.',
    ],
  },
  {
    id: 'volcano',
    title: 'Volcanic eruption',
    pages: [
      'Lava creeps along the low ground and keeps rising. Get high early.',
      'Rocks fall from the sky. An orange ring on the ground shows where one is about to land, so move off the ring.',
      'The rings are always honest. If you are not standing in one, nothing is going to land on you.',
      'High ground AND moving. You need both in this one.',
    ],
  },
  {
    id: 'tsunami',
    title: 'Tsunami',
    pages: [
      'A wall of water crosses the whole map from one side.',
      'You can see it coming for a long time. Use that time to climb, not to watch.',
      'After the wave passes, the map stays flooded. Being high is still the answer.',
      'The wave itself hurts much more than the water it leaves behind.',
    ],
  },
  {
    id: 'tornado',
    title: 'Tornado',
    pages: [
      'A big funnel wanders around the map, and later on it comes looking for you.',
      'It can never move as fast as you can sprint. Hold Shift and run.',
      'Being under a roof protects you a lot, even if the funnel comes close.',
      'Do not try to run around it in a circle. Pick a direction and go.',
    ],
  },
  {
    id: 'earthquake',
    title: 'Earthquake',
    pages: [
      'The ground splits open near wherever you are standing.',
      'Each crack takes a moment to open. The moment it starts, step off it.',
      'Climbing does not help here. Flat open ground is the safest place.',
      'Keep moving to fresh ground. Do not stand still and hope.',
    ],
  },
  {
    id: 'asteroid',
    title: 'Asteroid',
    pages: [
      'Meteors fall near you, over and over.',
      'A circle appears on the ground before each one lands. Get out of the circle.',
      'Standing still is the only way to get hit. Keep walking and you will be fine.',
      'Craters stay behind, so you can see where it has already struck.',
    ],
  },
  {
    id: 'mudslide',
    title: 'Mudslide',
    pages: [
      'A wave of mud pours across the map and settles.',
      'The mud does not drain away like water. Once it is there, it stays.',
      'Get up high before it arrives, and stay up.',
      'Going under the mud ends your round straight away.',
    ],
  },
  {
    id: 'blizzard',
    title: 'Blizzard',
    pages: [
      'Snow everywhere, and you can barely see.',
      'The cold drains your energy whenever you are under open sky.',
      'Get under a roof. A cabin, an overhang, or a tarp you put up yourself.',
      'A torch does not keep you warm, but it lets you see where you are going.',
    ],
  },
  {
    id: 'heatwave',
    title: 'Extreme heatwave',
    pages: [
      'The sun drains your energy whenever you are out in it.',
      'Shade fixes it. Anything with a roof counts.',
      'A water bottle keeps the heat off for thirty seconds wherever you are.',
      'Save the water for when you have to cross open ground.',
    ],
  },
  {
    id: 'drought',
    title: 'Drought',
    pages: [
      'There is one waterhole on the map and it shrinks the whole time.',
      'Standing in the water stops you getting thirsty. Find it early.',
      'As it shrinks you have to move closer and closer to the middle.',
      'A water bottle works too, and buys you thirty seconds away from the pool.',
    ],
  },
  {
    id: 'overgrown',
    title: 'Overgrown forest',
    pages: [
      'Vines grow everywhere and keep spreading.',
      'There is a green circle on the ground that stays clear the whole round. Get to it.',
      'Being tangled in the vines drains your energy slowly, so you have time to get out.',
      'An axe clears every vine around you. Handy if you get boxed in.',
    ],
  },
  {
    id: 'acidrain',
    title: 'Acid rain',
    pages: [
      'Green rain falls, and it stings whenever you are under open sky.',
      'Any roof will do. Find one early and settle in.',
      'If there is no roof nearby, put up a tarp or a tent of your own.',
      'This one lasts a while, so pick somewhere you are happy to wait.',
    ],
  },
  {
    id: 'flood',
    title: 'Flood',
    pages: [
      'The water rises steadily all round the map.',
      'Climb. Then be ready to climb again, because it keeps coming.',
      'The easy shelter usually floods before the end. The highest rock usually does not.',
      'Your head going under is what costs you energy. Standing in shallow water is fine.',
    ],
  },
];

/**
 * Builds the bookshelf panel.
 *
 * @param {object} deps
 * @param {(name: string) => void} deps.sound
 * @param {() => void} deps.onClose
 */
export function createBooks({ sound, onClose }) {
  const sheet = document.getElementById('books');
  const listEl = document.getElementById('books-list');
  const titleEl = document.getElementById('book-title');
  const pageEl = document.getElementById('book-page');
  const countEl = document.getElementById('book-count');
  const prevEl = document.getElementById('book-prev');
  const nextEl = document.getElementById('book-next');

  // The disaster books carry the same advice line the warning banner uses, so
  // the tutorial and the game can never drift apart.
  const advice = new Map(DISASTERS.map((d) => [d.info.id, d.info.advice]));

  let book = BOOKS[0];
  let page = 0;

  function drawPage() {
    titleEl.textContent = book.title;
    const extra = advice.get(book.id);
    const pages = extra ? [extra, ...book.pages] : book.pages;
    pageEl.textContent = pages[page];
    countEl.textContent = `${page + 1} / ${pages.length}`;
    prevEl.disabled = page === 0;
    nextEl.disabled = page === pages.length - 1;

    for (const el of listEl.children) {
      el.classList.toggle('on', el.dataset.id === book.id);
    }
  }

  function openBook(next) {
    book = next;
    page = 0;
    drawPage();
  }

  for (const entry of BOOKS) {
    const el = document.createElement('button');
    el.className = 'book';
    el.dataset.id = entry.id;
    el.textContent = entry.title;
    el.addEventListener('click', () => {
      sound('click');
      openBook(entry);
    });
    listEl.appendChild(el);
  }

  prevEl.addEventListener('click', () => {
    if (page > 0) {
      page -= 1;
      sound('back');
      drawPage();
    }
  });
  nextEl.addEventListener('click', () => {
    const extra = advice.get(book.id);
    const total = (extra ? 1 : 0) + book.pages.length;
    if (page < total - 1) {
      page += 1;
      sound('click');
      drawPage();
    }
  });
  document.getElementById('books-close').addEventListener('click', () => {
    sheet.classList.remove('show');
    sound('back');
    onClose();
  });

  return {
    open() {
      openBook(BOOKS[0]);
      sheet.classList.add('show');
    },
    close() {
      sheet.classList.remove('show');
    },
    get isOpen() {
      return sheet.classList.contains('show');
    },
  };
}
