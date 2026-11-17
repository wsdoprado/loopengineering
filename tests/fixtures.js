// Challenge fixtures built from spec.md "Version-one content". Used by tests only.
const self = { id: 'lagoa', name: 'Lagoa Fiber', asn: 64500 };
const routeServer = { id: 'rs', name: 'Route Server', asn: 64504 };
const fullTable = ['192.0.2.0/24', '198.51.100.0/24', '203.0.113.0/24', '198.18.0.0/15'];

function transit(routes) {
  return { id: 'globaltransit', name: 'GlobalTransit', asn: 64510, localPref: 100, routes };
}
const campusnet = { id: 'campusnet', name: 'CampusNet', asn: 64501, atIxp: true, prefixes: ['192.0.2.0/24'] };
const streamco = { id: 'streamco', name: 'StreamCo', asn: 64502, atIxp: true, prefixes: ['198.51.100.0/24'] };

function base(extra) {
  return {
    self, routeServer, peerLocalPref: 200, transit: transit(fullTable),
    networks: [campusnet, streamco], relationships: [], showAnnouncements: true,
    choices: ['campusnet', 'streamco', 'rs', 'globaltransit'],
    ...extra,
  };
}

export const L1R1 = base({ destination: '198.51.100.25' });
export const L1R2 = base({ destination: '203.0.113.10' });

export const L2R1 = base({
  networks: [campusnet, streamco,
    { id: 'schoolnet', name: 'SchoolNet', asn: 64503, atIxp: false, prefixes: ['203.0.113.0/24'] }],
  relationships: [{ provider: 'campusnet', customer: 'schoolnet' }],
  showAnnouncements: false,
  destination: '203.0.113.77',
});

export const L2R2 = base({
  networks: [campusnet, streamco,
    { id: 'bigcarrier', name: 'BigCarrier', asn: 64511, atIxp: false, prefixes: ['198.18.0.0/15'] }],
  relationships: [{ provider: 'bigcarrier', customer: 'streamco' }],
  showAnnouncements: false,
  destination: '198.18.5.5',
});

export function l3(destination) {
  return base({
    transit: transit(['192.0.2.0/24', '198.51.100.0/24', '203.0.113.0/24',
      '198.18.0.0/15', '198.18.0.0/22', '198.18.2.0/24']),
    networks: [
      campusnet,
      { id: 'streamco', name: 'StreamCo', asn: 64502, atIxp: true, prefixes: ['198.18.0.0/22'] },
      { id: 'cloudnine', name: 'CloudNine', asn: 64507, atIxp: false, prefixes: ['198.18.2.0/24'] },
    ],
    destination,
  });
}
export const L3R1 = l3('198.18.2.50');
export const L3R2 = l3('198.18.1.200');

export const TIED = base({
  networks: [{ ...campusnet, prefixes: ['198.51.100.0/24'] }, streamco],
  destination: '198.51.100.25',
});
export const UNMATCHED = base({ destination: '100.64.0.1' });
