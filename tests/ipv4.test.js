import { test, assertEqual, assertTrue, assertThrows } from './runner.js';
import { parseIPv4, parseCIDR, contains, formatIPv4 } from '../engine/ipv4.js';

test('ipv4.parse.valid', () => {
  // 198*2^24 + 18*2^16 + 2*2^8 + 50
  assertEqual(parseIPv4('198.18.2.50'), 3323068978);
});
test('ipv4.parse.max', () => assertEqual(parseIPv4('255.255.255.255'), 4294967295));
test('ipv4.format.roundtrip', () => assertEqual(formatIPv4(parseIPv4('203.0.113.77')), '203.0.113.77'));
test('ipv4.parse.reject-octet-256', () => assertThrows(() => parseIPv4('256.1.1.1')));
test('ipv4.parse.reject-three-octets', () => assertThrows(() => parseIPv4('1.2.3')));
test('ipv4.parse.reject-leading-garbage', () => assertThrows(() => parseIPv4('1.2.3.4x')));
test('ipv4.parse.reject-empty-octet', () => assertThrows(() => parseIPv4('1..3.4')));

test('cidr.parse.valid', () => {
  const c = parseCIDR('198.18.0.0/22');
  assertEqual(c.length, 22);
  assertEqual(formatIPv4(c.network), '198.18.0.0');
  assertEqual(formatIPv4(c.mask), '255.255.252.0');
});
test('cidr.reject-host-bits', () => assertThrows(() => parseCIDR('198.18.1.0/22')));
test('cidr.reject-length-7', () => assertThrows(() => parseCIDR('10.0.0.0/7')));
test('cidr.reject-length-33', () => assertThrows(() => parseCIDR('10.0.0.0/33')));
test('cidr.reject-missing-length', () => assertThrows(() => parseCIDR('10.0.0.0')));
test('cidr.accept-32', () => assertEqual(parseCIDR('192.0.2.1/32').length, 32));
test('cidr.accept-8', () => assertEqual(parseCIDR('10.0.0.0/8').length, 8));

test('contains.last-in-24', () => assertTrue(contains('198.18.2.0/24', '198.18.2.255')));
test('contains.first-after-24', () => assertEqual(contains('198.18.2.0/24', '198.18.3.0'), false));
test('contains.in-22', () => assertTrue(contains('198.18.0.0/22', '198.18.3.0')));
test('contains.after-22', () => assertEqual(contains('198.18.0.0/22', '198.18.4.0'), false));
test('contains.in-15', () => assertTrue(contains('198.18.0.0/15', '198.18.4.0')));
test('contains.after-15', () => assertEqual(contains('198.18.0.0/15', '198.20.0.0'), false));
test('contains.before-15', () => assertEqual(contains('198.18.0.0/15', '198.17.255.255'), false));
