// Pure exit-selection rule engine. Contract: specs/001-ixp-exchange-hall/contracts/evaluate.md
// No DOM, timers, network, randomness, or state changes.
import { parseCIDR, parseIPv4, contains } from './ipv4.js';

// Every network reachable from `rootId` by following provider -> customer edges, including the root.
export function customerCone(rootId, relationships) {
  const cone = [rootId];
  const seen = new Set(cone);
  for (let i = 0; i < cone.length; i += 1) {
    for (const rel of relationships) {
      if (rel.provider === cone[i] && !seen.has(rel.customer)) {
        seen.add(rel.customer);
        cone.push(rel.customer);
      }
    }
  }
  return cone;
}

// Every provider above `networkId`, directly or transitively.
export function providersAbove(networkId, relationships) {
  const above = [];
  const seen = new Set([networkId]);
  const queue = [networkId];
  while (queue.length) {
    const current = queue.shift();
    for (const rel of relationships) {
      if (rel.customer === current && !seen.has(rel.provider)) {
        seen.add(rel.provider);
        above.push(rel.provider);
        queue.push(rel.provider);
      }
    }
  }
  return above;
}

// Contract steps 1–2: IXP routes from each member's customer cone, plus transit routes.
export function deriveRoutes(challenge) {
  const byId = new Map(challenge.networks.map((n) => [n.id, n]));
  const routes = [];
  for (const member of challenge.networks) {
    if (!member.atIxp) continue;
    for (const originId of customerCone(member.id, challenge.relationships || [])) {
      const origin = byId.get(originId);
      if (!origin) continue;
      for (const prefix of origin.prefixes) {
        const { length } = parseCIDR(prefix);
        routes.push({ prefix, length, exitId: member.id, source: 'ixp',
          localPref: challenge.peerLocalPref, origin: originId });
      }
    }
  }
  for (const prefix of challenge.transit.routes) {
    const { length } = parseCIDR(prefix);
    routes.push({ prefix, length, exitId: challenge.transit.id, source: 'transit',
      localPref: challenge.transit.localPref, origin: challenge.transit.id });
  }
  return routes;
}

function result(status, reasonCode, expected, evidence) {
  return { status, expected, reasonCode, evidence };
}

export function evaluate(challenge, answer) {
  const destination = challenge.destination;
  const dest = parseIPv4(destination);
  const candidates = deriveRoutes(challenge).map((r) => ({ ...r, contains: contains(r.prefix, dest) }));
  const matching = candidates.filter((r) => r.contains);
  const evidence = { destination, candidates, longestLength: null, chosen: null };

  // Step 3: match.
  if (matching.length === 0) return result('content-error', 'unmatched-destination', null, evidence);

  // Step 4: longest prefix match (RFC 1812 §5.2.4.3).
  const longestLength = Math.max(...matching.map((r) => r.length));
  evidence.longestLength = longestLength;
  const longest = matching.filter((r) => r.length === longestLength);

  // Step 5: highest LOCAL_PREF (RFC 4271 §9.1.1).
  const bestPref = Math.max(...longest.map((r) => r.localPref));
  const best = longest.filter((r) => r.localPref === bestPref);
  if (new Set(best.map((r) => r.exitId)).size > 1) {
    return result('content-error', 'tied-peers', null, evidence);
  }
  const w = best[0];
  const expected = { exitId: w.exitId, prefix: w.prefix, length: w.length, source: w.source,
    localPref: w.localPref, origin: w.origin };

  // Step 6: grade.
  const exitId = answer ? answer.exitId : null;
  if (exitId === null || exitId === undefined || exitId === '') {
    return result('invalid-input', 'no-selection', expected, evidence);
  }
  if (!challenge.choices.includes(exitId)) {
    return result('invalid-input', 'unknown-choice', expected, evidence);
  }

  const transitId = challenge.transit.id;
  const kind = exitId === challenge.routeServer.id ? 'rs' : exitId === transitId ? 'transit' : 'peer';
  const chosenMatching = matching.filter((r) => r.exitId === exitId);
  evidence.chosen = { exitId, kind, matchingRoutes: chosenMatching,
    announcedRoutes: candidates.filter((r) => r.exitId === exitId) };

  if (exitId === w.exitId) {
    return result('correct', w.source === 'ixp' ? 'correct-peer' : 'correct-transit', expected, evidence);
  }

  // Reason codes for incorrect answers, first rule that applies.
  const rels = challenge.relationships || [];
  const byId = new Map(challenge.networks.map((n) => [n.id, n]));
  let reason;
  if (kind === 'rs') {
    reason = 'rs-not-in-forwarding-path';
  } else if (kind === 'peer') {
    if (chosenMatching.length > 0) {
      reason = 'longest-prefix-before-preference';
    } else if (providersAbove(exitId, rels).some((pid) =>
      (byId.get(pid)?.prefixes || []).some((p) => contains(p, dest)))) {
      reason = 'peer-does-not-export-provider-routes';
    } else if (!matching.some((r) => r.source === 'ixp')) {
      reason = 'not-announced-at-ixp';
    } else {
      reason = 'peer-prefix-does-not-contain-destination';
    }
  } else {
    const transitBest = Math.max(-1, ...chosenMatching.map((r) => r.length));
    if (w.length > transitBest) reason = 'longest-prefix-before-preference';
    else if (w.origin !== w.exitId) reason = 'peer-exports-customer-routes';
    else reason = 'equal-length-prefer-peer';
  }
  return result('incorrect', reason, expected, evidence);
}
