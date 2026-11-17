// Event wiring and focus management. Holds the current state; all changes go through engine/state.js.
import * as S from '../engine/state.js';
import { renderBriefing, renderRound, renderSummary, animatePacket, feedbackAnnouncement } from './render.js';

export function startGame(app, doc) {
  let state = S.initialState(doc);
  const live = document.getElementById('live');
  const dialog = document.getElementById('restart-dialog');
  const restartBtn = document.getElementById('restart-btn');

  function announce(text) {
    // Clear then set so repeated identical messages are still announced.
    live.textContent = '';
    window.setTimeout(() => { live.textContent = text; }, 50);
  }

  function focusById(id) {
    const target = document.getElementById(id);
    if (target) target.focus();
  }

  function render({ focus = 'view-title', animate = false } = {}) {
    app.innerHTML = '';
    if (state.view === 'briefing') {
      const level = S.currentLevel(state, doc);
      app.appendChild(renderBriefing(level, doc, state.levelIndex + 1, onStart));
      announce(`Level ${state.levelIndex + 1} briefing: ${level.title}`);
    } else if (state.view === 'round') {
      app.appendChild(renderRound(state, doc, { onSelect, onSubmit, onHint, onNext }));
      if (animate) animatePacket(app);
    } else if (state.view === 'summary') {
      app.appendChild(renderSummary(state, doc));
      announce('Session summary.');
    }
    if (focus) focusById(focus);
  }

  function onStart() {
    state = S.start(state, doc);
    render();
    const round = S.currentRound(state, doc);
    announce(`Round ${state.roundIndex + 1}. ${round.prompt}`);
  }

  function onSelect(exitId) {
    // Selecting does not submit and does not clear feedback (spec US3-2); no re-render keeps focus on the radio.
    state = S.select(state, exitId);
  }

  function onSubmit() {
    if (!S.canSubmit(state)) return;
    state = S.submit(state, doc);
    // Feedback text is rendered first; the animation never blocks controls (FR-017).
    render({ focus: 'fb-title', animate: true });
    announce(feedbackAnnouncement(S.currentRound(state, doc).challenge, state));
  }

  function onHint() {
    state = S.hint(state);
    render({ focus: 'hints-title' });
    const p = state.rounds[S.currentRoundId(state)];
    const h = S.currentRound(state, doc).hints[p.hintsShown - 1];
    if (h) announce(`${h.kind === 'method' ? 'Method' : 'Worked solution'}: ${h.text}`);
  }

  function onNext() {
    const before = state;
    state = S.next(state, doc);
    if (state === before) return;
    render();
    if (state.view === 'round') {
      announce(`Round ${state.roundIndex + 1}. ${S.currentRound(state, doc).prompt}`);
    }
  }

  restartBtn.onclick = () => {
    state = S.restart(state);
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else if (window.confirm('Restart the session? All progress will be cleared.')) confirm();
    else cancel();
  };
  function confirm() {
    state = S.confirmRestart(state, doc);
    if (dialog.open) dialog.close();
    render();
  }
  function cancel() {
    state = S.cancelRestart(state);
    if (dialog.open) dialog.close();
    restartBtn.focus();
  }
  document.getElementById('restart-confirm').onclick = confirm;
  document.getElementById('restart-cancel').onclick = cancel;
  dialog.oncancel = (e) => { e.preventDefault(); cancel(); }; // Escape = Cancel

  render();
  // Exposed for automated checks only; the game never reads it.
  window.__exchangeHall = { getState: () => state };
}
