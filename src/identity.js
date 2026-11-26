// The first-launch username picker.
//
// PRD section 12 decision 5: you choose your name once and keep it. That is
// why this asks twice — a typo in a permanent name is worth one extra click.

import { validateUsername, USERNAME } from './save.js';

/**
 * Shows the picker and resolves with the chosen username.
 *
 * @returns {Promise<string>}
 */
export function askForUsername() {
  const root = document.getElementById('name-picker');
  const stepType = document.getElementById('name-step-type');
  const stepConfirm = document.getElementById('name-step-confirm');
  const input = document.getElementById('name-input');
  const note = document.getElementById('name-note');
  const continueBtn = document.getElementById('name-continue');
  const backBtn = document.getElementById('name-back');
  const confirmBtn = document.getElementById('name-confirm');
  const chosen = document.getElementById('name-chosen');

  const hint = `${USERNAME.minLength}–${USERNAME.maxLength} characters. Letters, numbers and _ only.`;

  return new Promise((resolve) => {
    let name = '';
    let confirmReadyAt = 0;

    function check() {
      name = input.value.trim();
      const result = validateUsername(name);
      continueBtn.disabled = !result.ok;

      // An empty box is not a mistake yet, so it keeps the plain hint rather
      // than scolding someone who has not typed anything.
      if (result.ok || name.length === 0) {
        note.textContent = hint;
        note.classList.remove('bad');
      } else {
        note.textContent = result.error;
        note.classList.add('bad');
      }
    }

    function toConfirm() {
      if (continueBtn.disabled) return;
      chosen.textContent = name;
      stepType.classList.add('hidden');
      stepConfirm.classList.remove('hidden');

      // Focus lands on the panel itself, not on either button. Enter in the
      // name box moves here while the key is still down, and the browser then
      // fires the key going up at whatever now has focus - so a focused
      // button would be pressed by an Enter meant for the name box. The guard
      // below catches the same thing from a held or repeated key.
      confirmReadyAt = performance.now() + 400;
      stepConfirm.focus();
    }

    function toType() {
      if (performance.now() < confirmReadyAt) return;
      stepConfirm.classList.add('hidden');
      stepType.classList.remove('hidden');
      input.focus();
      // Caret at the end rather than selecting the whole name: coming back
      // here usually means fixing one letter, and a select-all turns the next
      // keystroke into a retype of the lot.
      input.setSelectionRange(input.value.length, input.value.length);
    }

    function finish() {
      if (performance.now() < confirmReadyAt) return;
      root.classList.add('hidden');
      resolve(name);
    }

    input.addEventListener('input', check);
    input.addEventListener('keydown', (e) => {
      // Stops the game's own key handling from seeing letters typed here.
      e.stopPropagation();
      if (e.key === 'Enter') toConfirm();
    });

    continueBtn.addEventListener('click', toConfirm);
    backBtn.addEventListener('click', toType);
    confirmBtn.addEventListener('click', finish);

    root.classList.remove('hidden');
    check();
    input.focus();
  });
}
