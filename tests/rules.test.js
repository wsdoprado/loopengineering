// Expected values are literals from contracts/evaluate.md "Reference expectations".
// They are hand-checked and must never be computed by calling evaluate().
import { test, assertEqual } from './runner.js';
import { evaluate } from '../engine/rules.js';
import { L1R1, L1R2, L2R1, L2R2, L3R1, L3R2, l3, TIED, UNMATCHED } from './fixtures.js';

const cases = [
  // id, challenge, exitId, status, reasonCode, expectedExit, expectedPrefix
  ['ref.L1R1.streamco', L1R1, 'streamco', 'correct', 'correct-peer', 'streamco', '198.51.100.0/24'],
  ['ref.L1R1.rs', L1R1, 'rs', 'incorrect', 'rs-not-in-forwarding-path'],
  ['ref.L1R1.campusnet', L1R1, 'campusnet', 'incorrect', 'peer-prefix-does-not-contain-destination'],
  ['ref.L1R2.globaltransit', L1R2, 'globaltransit', 'correct', 'correct-transit', 'globaltransit', '203.0.113.0/24'],
  ['ref.L1R2.campusnet', L1R2, 'campusnet', 'incorrect', 'not-announced-at-ixp'],
  ['ref.L2R1.campusnet', L2R1, 'campusnet', 'correct', 'correct-peer', 'campusnet', '203.0.113.0/24'],
  ['ref.L2R1.globaltransit', L2R1, 'globaltransit', 'incorrect', 'peer-exports-customer-routes'],
  ['ref.L2R2.globaltransit', L2R2, 'globaltransit', 'correct', 'correct-transit', 'globaltransit', '198.18.0.0/15'],
  ['ref.L2R2.streamco', L2R2, 'streamco', 'incorrect', 'peer-does-not-export-provider-routes'],
  ['ref.L3R1.globaltransit', L3R1, 'globaltransit', 'correct', 'correct-transit', 'globaltransit', '198.18.2.0/24'],
  ['ref.L3R1.streamco', L3R1, 'streamco', 'incorrect', 'longest-prefix-before-preference'],
  ['ref.L3.198.18.2.255.globaltransit', l3('198.18.2.255'), 'globaltransit', 'correct', 'correct-transit', 'globaltransit', '198.18.2.0/24'],
  ['ref.L3.198.18.3.0.streamco', l3('198.18.3.0'), 'streamco', 'correct', 'correct-peer', 'streamco', '198.18.0.0/22'],
  ['ref.L3.198.18.4.0.streamco', l3('198.18.4.0'), 'streamco', 'incorrect', 'not-announced-at-ixp'],
  ['ref.L3R2.streamco', L3R2, 'streamco', 'correct', 'correct-peer', 'streamco', '198.18.0.0/22'],
  ['ref.L3R2.globaltransit', L3R2, 'globaltransit', 'incorrect', 'equal-length-prefer-peer'],
  ['ref.any.no-selection', L1R1, null, 'invalid-input', 'no-selection'],
  ['ref.any.empty-selection', L1R1, '', 'invalid-input', 'no-selection'],
  ['ref.any.unknown-choice', L1R1, 'bigcarrier', 'invalid-input', 'unknown-choice'],
  ['ref.tied-peers', TIED, 'streamco', 'content-error', 'tied-peers'],
  ['ref.unmatched-destination', UNMATCHED, 'globaltransit', 'content-error', 'unmatched-destination'],
];

for (const [id, challenge, exitId, status, reasonCode, expExit, expPrefix] of cases) {
  test(id, () => {
    const r = evaluate(challenge, { exitId });
    assertEqual(r.status, status, 'status');
    assertEqual(r.reasonCode, reasonCode, 'reasonCode');
    if (status === 'correct') {
      assertEqual(r.expected.exitId, expExit, 'expected.exitId');
      assertEqual(r.expected.prefix, expPrefix, 'expected.prefix');
    }
  });
}

test('rules.rs-never-correct', () => {
  for (const c of [L1R1, L1R2, L2R1, L2R2, L3R1, L3R2]) {
    assertEqual(evaluate(c, { exitId: 'rs' }).status, 'incorrect');
  }
});

test('rules.pure-same-input-same-output', () => {
  const a = JSON.stringify(evaluate(L3R1, { exitId: 'streamco' }));
  const b = JSON.stringify(evaluate(L3R1, { exitId: 'streamco' }));
  assertEqual(a, b);
});

test('rules.does-not-mutate-input', () => {
  const before = JSON.stringify(L2R1);
  evaluate(L2R1, { exitId: 'campusnet' });
  assertEqual(JSON.stringify(L2R1), before);
});

test('rules.evidence.longest-length', () => {
  const r = evaluate(L3R1, { exitId: 'streamco' });
  assertEqual(r.evidence.longestLength, 24);
  assertEqual(r.evidence.destination, '198.18.2.50');
});
