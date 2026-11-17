// Every reason code produces specific English text with values and source IDs (FR-006, FR-007, FR-014).
import { test, assertTrue, assertEqual } from './runner.js';
import { evaluate } from '../engine/rules.js';
import { explain } from '../engine/feedback.js';
import { L1R1, L1R2, L2R1, L2R2, L3R1, L3R2, l3 } from './fixtures.js';

const cases = [
  // id, challenge, exitId, expected reasonCode (literal), strings that must appear
  ['fb.correct-peer', L1R1, 'streamco', 'correct-peer', ['198.51.100.25', '198.51.100.0/24', '200', '100']],
  ['fb.correct-transit', L3R1, 'globaltransit', 'correct-transit', ['198.18.2.50', '198.18.2.0/24', '/24']],
  ['fb.rs', L1R1, 'rs', 'rs-not-in-forwarding-path', ['198.51.100.25', 'route server']],
  ['fb.wrong-peer', L1R1, 'campusnet', 'peer-prefix-does-not-contain-destination', ['192.0.2.0/24', '198.51.100.25', 'find the prefix that contains the address']],
  ['fb.not-at-ixp', L1R2, 'campusnet', 'not-announced-at-ixp', ['203.0.113.10', '192.0.2.0/24']],
  ['fb.customer-routes', L2R1, 'globaltransit', 'peer-exports-customer-routes', ['203.0.113.77', '203.0.113.0/24', 'SchoolNet', 'CampusNet']],
  ['fb.provider-routes', L2R2, 'streamco', 'peer-does-not-export-provider-routes', ['198.18.5.5', '198.18.0.0/15', 'BigCarrier']],
  ['fb.lpm-peer-chosen', L3R1, 'streamco', 'longest-prefix-before-preference', ['198.18.2.50', '198.18.2.0/24', '198.18.0.0/22']],
  ['fb.equal-length', L3R2, 'globaltransit', 'equal-length-prefer-peer', ['198.18.1.200', '198.18.0.0/22', '200']],
  ['fb.boundary-4.0', l3('198.18.4.0'), 'streamco', 'not-announced-at-ixp', ['198.18.4.0', '198.18.0.0/22']],
];

for (const [id, challenge, exitId, code, needles] of cases) {
  test(id, () => {
    const result = evaluate(challenge, { exitId });
    assertEqual(result.reasonCode, code, 'reasonCode');
    const fb = explain(result, challenge);
    assertTrue(typeof fb.text === 'string' && fb.text.length > 40, 'non-empty text');
    for (const n of needles) {
      assertTrue(fb.text.toLowerCase().includes(n.toLowerCase()), `text should contain "${n}": ${fb.text}`);
    }
    assertTrue(Array.isArray(fb.sourceIds) && fb.sourceIds.length > 0, 'cites a source id');
    assertTrue(fb.headline === (result.status === 'correct' ? 'Correct.' : 'Not this time.'), 'headline in words');
  });
}

test('fb.rs-cites-rfc7947-s1', () => {
  const fb = explain(evaluate(L1R1, { exitId: 'rs' }), L1R1);
  assertTrue(fb.sourceIds.includes('rfc7947-s1'));
});

// FR-022: before the round is solved, incorrect feedback must not name the correct exit.
const leakCases = [
  ['leak.rs', L1R1, 'rs', 'StreamCo'],
  ['leak.wrong-peer', L1R1, 'campusnet', 'StreamCo'],
  ['leak.lpm', L3R1, 'streamco', 'GlobalTransit'],
  ['leak.equal-length', L3R2, 'globaltransit', 'StreamCo'],
  ['leak.customer', L2R1, 'globaltransit', 'exit: CampusNet'],
];
for (const [id, challenge, exitId, forbidden] of leakCases) {
  test(id, () => {
    const fb = explain(evaluate(challenge, { exitId }), challenge);
    assertEqual(fb.text.toLowerCase().includes(forbidden.toLowerCase()), false,
      `incorrect feedback must not reveal "${forbidden}": ${fb.text}`);
  });
}

test('fb.invalid-input-guidance', () => {
  const fb = explain(evaluate(L1R1, { exitId: null }), L1R1);
  assertTrue(fb.text.length > 10);
});
