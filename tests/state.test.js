// Session state machine tests. Contract: contracts/session-state.md
import { test, assertEqual, assertTrue } from './runner.js';
import * as S from '../engine/state.js';
import { L1R1, L1R2, L2R1, L2R2, L3R1, L3R2 } from './fixtures.js';

const clone = (x) => JSON.parse(JSON.stringify(x));
const hints = [{ kind: 'method', text: 'm', sourceIds: [] }, { kind: 'worked', text: 'w', sourceIds: [] }];
const r = (id, c) => ({ id, prompt: 'p', challenge: clone(c), hints });
const DOC = {
  schemaVersion: 1, sources: [],
  levels: [
    { id: 'L1', rounds: [r('L1R1', L1R1), r('L1R2', L1R2)] },
    { id: 'L2', rounds: [r('L2R1', L2R1), r('L2R2', L2R2)] },
    { id: 'L3', rounds: [r('L3R1', L3R1), r('L3R2', L3R2)] },
  ],
};
// Correct exits are literals from the spec's Version-one content table.
const CORRECT = { L1R1: 'streamco', L1R2: 'globaltransit', L2R1: 'campusnet', L2R2: 'globaltransit', L3R1: 'globaltransit', L3R2: 'streamco' };

const fresh = () => S.start(S.initialState(DOC), DOC);
const prog = (s, id) => s.rounds[id];

// ---- Part 1 (US1) ----
test('state.initial-is-briefing-L1', () => {
  const s = S.initialState(DOC);
  assertEqual(s.view, 'briefing');
  assertEqual(s.levelIndex, 0);
});
test('state.start-opens-L1R1', () => {
  const s = fresh();
  assertEqual(s.view, 'round');
  assertEqual(S.currentRound(s, DOC).id, 'L1R1');
});
test('state.select-no-attempt', () => {
  const s = S.select(fresh(), 'rs');
  assertEqual(s.selection, 'rs');
  assertEqual(prog(s, 'L1R1').attempts, 0);
});
test('state.submit-no-selection-guidance', () => {
  const s = S.submit(fresh(), DOC);
  assertEqual(prog(s, 'L1R1').attempts, 0);
  assertEqual(prog(s, 'L1R1').solved, false);
  assertTrue(typeof prog(s, 'L1R1').guidance === 'string' && prog(s, 'L1R1').guidance.length > 0);
  assertEqual(prog(s, 'L1R1').revealed, false);
});
test('state.submit-incorrect', () => {
  const s = S.submit(S.select(fresh(), 'rs'), DOC);
  assertEqual(prog(s, 'L1R1').attempts, 1);
  assertEqual(prog(s, 'L1R1').solved, false);
  assertEqual(prog(s, 'L1R1').revealed, true);
  assertEqual(prog(s, 'L1R1').lastResult.status, 'incorrect');
  assertEqual(S.canSubmit(s), true);
});
test('state.submit-correct', () => {
  const s = S.submit(S.select(fresh(), 'streamco'), DOC);
  assertEqual(prog(s, 'L1R1').attempts, 1);
  assertEqual(prog(s, 'L1R1').solved, true);
  assertEqual(S.canSubmit(s), false);
});
test('state.submit-after-solved-no-effect', () => {
  const s1 = S.submit(S.select(fresh(), 'streamco'), DOC);
  const s2 = S.submit(s1, DOC);
  const s3 = S.submit(S.select(s2, 'rs'), DOC);
  assertEqual(prog(s3, 'L1R1').attempts, 1);
  assertEqual(prog(s3, 'L1R1').solved, true);
  assertEqual(prog(s3, 'L1R1').lastResult.status, 'correct');
});
test('state.guidance-cleared-by-graded-submit', () => {
  const s = S.submit(S.select(S.submit(fresh(), DOC), 'rs'), DOC);
  assertEqual(prog(s, 'L1R1').guidance, null);
});
test('state.pure-no-mutation', () => {
  const s0 = fresh();
  const before = JSON.stringify(s0);
  S.submit(S.select(s0, 'rs'), DOC);
  assertEqual(JSON.stringify(s0), before);
});

// ---- Part 2 (US2) ----
test('state.hint-increments-to-2-not-solved', () => {
  let s = fresh();
  s = S.hint(s); assertEqual(prog(s, 'L1R1').hintsShown, 1);
  s = S.hint(s); assertEqual(prog(s, 'L1R1').hintsShown, 2);
  s = S.hint(s); assertEqual(prog(s, 'L1R1').hintsShown, 2);
  assertEqual(prog(s, 'L1R1').solved, false);
  assertEqual(prog(s, 'L1R1').attempts, 0);
});
test('state.next-unsolved-no-change', () => {
  const s = fresh();
  assertEqual(JSON.stringify(S.next(s, DOC)), JSON.stringify(s));
});
test('state.next-round0-to-round1', () => {
  const s = S.next(S.submit(S.select(fresh(), 'streamco'), DOC), DOC);
  assertEqual(s.view, 'round');
  assertEqual(S.currentRound(s, DOC).id, 'L1R2');
  assertEqual(s.selection, null);
});
function solveCurrent(s) {
  return S.submit(S.select(s, CORRECT[S.currentRound(s, DOC).id]), DOC);
}
test('state.next-last-round-of-level-to-briefing', () => {
  let s = fresh();
  s = S.next(solveCurrent(s), DOC);
  s = S.next(solveCurrent(s), DOC);
  assertEqual(s.view, 'briefing');
  assertEqual(s.levelIndex, 1);
});
test('state.full-run-to-summary', () => {
  let s = fresh();
  s = S.select(s, 'rs'); s = S.submit(s, DOC); // one wrong attempt in L1R1
  s = S.hint(s);                               // assistance in L1R1
  for (let i = 0; i < 6; i += 1) {
    if (s.view === 'briefing') s = S.start(s, DOC);
    s = S.next(solveCurrent(s), DOC);
  }
  assertEqual(s.view, 'summary');
  const sum = S.summary(s, DOC);
  assertEqual(sum.completed, 6);
  assertEqual(sum.totalRounds, 6);
  assertEqual(sum.attempts, 7);
  assertEqual(sum.assistedRounds, 1);
  assertEqual(sum.rounds.length, 6);
});
test('state.restart-pending-and-cancel', () => {
  const s0 = S.submit(S.select(fresh(), 'rs'), DOC);
  const s1 = S.restart(s0);
  assertEqual(s1.restartPending, true);
  const s2 = S.cancelRestart(s1);
  assertEqual(s2.restartPending, false);
  assertEqual(prog(s2, 'L1R1').attempts, 1);
  assertEqual(s2.view, 'round');
});
test('state.confirm-restart-fresh', () => {
  const s = S.confirmRestart(S.restart(S.submit(S.select(fresh(), 'rs'), DOC)), DOC);
  assertEqual(s.view, 'briefing');
  assertEqual(s.levelIndex, 0);
  assertEqual(prog(s, 'L1R1').attempts, 0);
  assertEqual(s.restartPending, false);
});
