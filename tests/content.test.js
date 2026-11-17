import { test, assertEqual, assertTrue } from './runner.js';
import { validateContent } from '../engine/content.js';
import { L1R1, L1R2, L2R1, L2R2, L3R1, L3R2, TIED, UNMATCHED } from './fixtures.js';

const clone = (x) => JSON.parse(JSON.stringify(x));

function round(id, challenge) {
  return {
    id, prompt: 'Where does the packet leave Lagoa Fiber?', challenge: clone(challenge),
    hints: [
      { kind: 'method', text: 'Method.', sourceIds: ['s1'] },
      { kind: 'worked', text: 'Worked.', sourceIds: ['s1'] },
    ],
  };
}
function level(id, rounds) {
  return {
    id, title: id, outcome: 'LO1',
    briefing: { paragraphs: ['p'], terms: [{ term: 't', definition: 'd' }], workedExample: 'w', sourceIds: ['s1'] },
    rounds,
  };
}
function validDoc() {
  return {
    schemaVersion: 1,
    sources: [{ id: 's1', title: 'RFC 7947', url: 'https://www.rfc-editor.org/rfc/rfc7947#section-1', section: '§1', claim: 'c' }],
    levels: [
      level('L1', [round('L1R1', L1R1), round('L1R2', L1R2)]),
      level('L2', [round('L2R1', L2R1), round('L2R2', L2R2)]),
      level('L3', [round('L3R1', L3R1), round('L3R2', L3R2)]),
    ],
  };
}
function expectError(doc, atPart) {
  const errs = validateContent(doc);
  assertTrue(errs.length > 0, 'expected at least one error');
  assertTrue(errs.some((e) => e.at.includes(atPart)),
    `expected an error at "${atPart}", got ${JSON.stringify(errs)}`);
}

test('content.valid-minimal-doc', () => assertEqual(JSON.stringify(validateContent(validDoc())), '[]'));

test('content.duplicate-round-id', () => {
  const d = validDoc(); d.levels[0].rounds[1].id = 'L1R1'; expectError(d, 'L1');
});
test('content.asn-out-of-range', () => {
  const d = validDoc(); d.levels[0].rounds[0].challenge.networks[0].asn = 65000; expectError(d, 'L1R1');
});
test('content.host-bits-set', () => {
  const d = validDoc(); d.levels[1].rounds[0].challenge.networks[1].prefixes[0] = '198.18.1.0/22';
  expectError(d, 'L2R1');
});
test('content.unknown-relationship-id', () => {
  const d = validDoc(); d.levels[1].rounds[0].challenge.relationships[0].customer = 'ghostnet';
  expectError(d, 'L2R1');
});
test('content.relationship-cycle', () => {
  const d = validDoc(); d.levels[1].rounds[0].challenge.relationships.push({ provider: 'schoolnet', customer: 'campusnet' });
  expectError(d, 'L2R1');
});
test('content.choices-missing-rs', () => {
  const d = validDoc(); d.levels[0].rounds[0].challenge.choices = ['campusnet', 'streamco', 'globaltransit'];
  expectError(d, 'L1R1');
});
test('content.choices-missing-transit', () => {
  const d = validDoc(); d.levels[0].rounds[0].challenge.choices = ['campusnet', 'streamco', 'rs'];
  expectError(d, 'L1R1');
});
test('content.unresolved-source-id', () => {
  const d = validDoc(); d.levels[2].rounds[1].hints[0].sourceIds = ['nope']; expectError(d, 'L3R2');
});
test('content.hints-wrong-order', () => {
  const d = validDoc(); d.levels[0].rounds[1].hints.reverse(); expectError(d, 'L1R2');
});
test('content.peer-localpref-not-greater', () => {
  const d = validDoc(); d.levels[0].rounds[0].challenge.peerLocalPref = 100; expectError(d, 'L1R1');
});
test('content.tied-peers', () => {
  const d = validDoc(); d.levels[0].rounds[0] = round('L1R1', TIED); expectError(d, 'L1R1');
});
test('content.unmatched-destination', () => {
  const d = validDoc(); d.levels[0].rounds[0] = round('L1R1', UNMATCHED); expectError(d, 'L1R1');
});
test('content.duplicate-network-id', () => {
  const d = validDoc(); d.levels[0].rounds[0].challenge.networks[1].id = 'campusnet'; expectError(d, 'L1R1');
});
test('content.network-id-collides-with-rs', () => {
  const d = validDoc(); d.levels[0].rounds[0].challenge.networks[0].id = 'rs'; expectError(d, 'L1R1');
});
test('content.invalid-destination', () => {
  const d = validDoc(); d.levels[0].rounds[0].challenge.destination = '300.1.1.1'; expectError(d, 'L1R1');
});
test('content.no-levels', () => {
  const d = validDoc(); d.levels = []; expectError(d, 'levels');
});
test('content.level-without-rounds', () => {
  const d = validDoc(); d.levels[1].rounds = []; expectError(d, 'L2');
});
test('content.extra-round-is-content-only', () => {
  // Constitution VI / SC-007: another round with the same mechanic needs only data.
  const d = validDoc(); d.levels[0].rounds.push(round('L1R3', L3R2)); assertEqual(JSON.stringify(validateContent(d)), '[]');
});
test('content.reports-all-errors', () => {
  const d = validDoc();
  d.levels[0].rounds[0].challenge.networks[0].asn = 1;
  d.levels[2].rounds[0].challenge.destination = 'x';
  const errs = validateContent(d);
  assertTrue(errs.some((e) => e.at.includes('L1R1')) && errs.some((e) => e.at.includes('L3R1')),
    'both errors reported');
});

// T015: the shipped content file validates cleanly.
test('content.shipped-levels-json-valid', async () => {
  const res = await fetch(new URL('../data/levels.json', import.meta.url));
  assertEqual(res.ok, true, 'levels.json fetched');
  const doc = await res.json();
  const errs = validateContent(doc);
  assertEqual(JSON.stringify(errs), '[]');
  // v1 scope (spec "Version-one content"): exactly 3 levels x 2 rounds.
  assertEqual(doc.levels.length, 3, 'level count');
  assertEqual(doc.levels.map((l) => l.rounds.length).join(','), '2,2,2', 'rounds per level');
});
