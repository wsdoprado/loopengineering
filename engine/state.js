// Session state machine. Contract: specs/001-ixp-exchange-hall/contracts/session-state.md
// Every function is pure: (state, ...) -> new state. Memory only; reload starts fresh.
import { evaluate } from './rules.js';

const GUIDANCE = 'Choose an exit first, then press Submit. Nothing was counted.';

function freshProgress() {
  return { attempts: 0, hintsShown: 0, solved: false, revealed: false, lastResult: null, guidance: null };
}

const copy = (s) => ({ ...s, rounds: { ...s.rounds } });

export function initialState(doc) {
  const rounds = {};
  const layout = doc.levels.map((lv) => lv.rounds.map((rd) => rd.id));
  for (const lv of doc.levels) for (const rd of lv.rounds) rounds[rd.id] = freshProgress();
  return { view: 'briefing', levelIndex: 0, roundIndex: 0, selection: null, rounds, layout, restartPending: false };
}

export function currentRoundId(state) {
  return state.layout[state.levelIndex][state.roundIndex];
}

export function currentLevel(state, doc) {
  return doc.levels[state.levelIndex];
}

export function currentRound(state, doc) {
  return doc.levels[state.levelIndex].rounds[state.roundIndex];
}

function withRound(state, patch) {
  const id = currentRoundId(state);
  const s = copy(state);
  s.rounds[id] = { ...s.rounds[id], ...patch };
  return s;
}

// briefing -> first round of the current level
export function start(state, doc) {
  if (state.view !== 'briefing') return state;
  return { ...copy(state), view: 'round', roundIndex: 0, selection: null };
}

export function select(state, exitId) {
  if (state.view !== 'round') return state;
  return { ...copy(state), selection: exitId };
}

export function canSubmit(state) {
  return state.view === 'round' && !state.rounds[currentRoundId(state)].solved;
}

export function submit(state, doc) {
  if (state.view !== 'round') return state;
  const round = currentRound(state, doc);
  const p = state.rounds[round.id];
  if (p.solved) return state; // FR-009: no effect after success
  const result = evaluate(round.challenge, { exitId: state.selection });
  if (result.status === 'invalid-input' || result.status === 'content-error') {
    return withRound(state, { guidance: GUIDANCE });
  }
  return withRound(state, {
    attempts: p.attempts + 1,
    solved: result.status === 'correct',
    revealed: true,
    lastResult: result,
    guidance: null,
  });
}

// Hints never submit or complete a round; any hint counts as assistance.
export function hint(state) {
  if (state.view !== 'round') return state;
  const p = state.rounds[currentRoundId(state)];
  return withRound(state, { hintsShown: Math.min(p.hintsShown + 1, 2) });
}

export function next(state, doc) {
  if (state.view !== 'round') return state;
  const round = currentRound(state, doc);
  if (!state.rounds[round.id].solved) return state;
  const level = currentLevel(state, doc);
  if (state.roundIndex + 1 < level.rounds.length) {
    return { ...copy(state), roundIndex: state.roundIndex + 1, selection: null };
  }
  if (state.levelIndex + 1 < doc.levels.length) {
    return { ...copy(state), view: 'briefing', levelIndex: state.levelIndex + 1, roundIndex: 0, selection: null };
  }
  return { ...copy(state), view: 'summary', selection: null };
}

export function restart(state) {
  return { ...copy(state), restartPending: true };
}

export function cancelRestart(state) {
  return { ...copy(state), restartPending: false };
}

export function confirmRestart(state, doc) {
  return initialState(doc);
}

export function summary(state, doc) {
  const rounds = [];
  for (const lv of doc.levels) {
    for (const rd of lv.rounds) {
      const p = state.rounds[rd.id];
      rounds.push({ id: rd.id, levelId: lv.id, solved: p.solved, attempts: p.attempts, assisted: p.hintsShown > 0,
        workedSolution: p.hintsShown >= 2 });
    }
  }
  return {
    completed: rounds.filter((r) => r.solved).length,
    totalRounds: rounds.length,
    attempts: rounds.reduce((a, r) => a + r.attempts, 0),
    assistedRounds: rounds.filter((r) => r.assisted).length,
    rounds,
  };
}
