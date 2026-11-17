// Turns an evaluate() result into English feedback. Pure; no DOM.
// Incorrect feedback names the mistake and the decisive values, then a next step,
// and never names the correct exit (FR-022). Correct feedback explains why it works.

function nameOf(challenge, id) {
  if (id === challenge.routeServer.id) return challenge.routeServer.name;
  if (id === challenge.transit.id) return challenge.transit.name;
  const n = challenge.networks.find((x) => x.id === id);
  return n ? n.name : id;
}

function asnOf(challenge, id) {
  if (id === challenge.routeServer.id) return challenge.routeServer.asn;
  if (id === challenge.transit.id) return challenge.transit.asn;
  const n = challenge.networks.find((x) => x.id === id);
  return n ? n.asn : '';
}

const list = (items) => {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
};

function matchingPrefixes(result) {
  const seen = [];
  for (const r of result.evidence.candidates) {
    if (r.contains && !seen.includes(r.prefix)) seen.push(r.prefix);
  }
  return seen.sort((a, b) => Number(a.split('/')[1]) - Number(b.split('/')[1]));
}

function providersAbove(networkId, relationships) {
  const out = [];
  const queue = [networkId];
  while (queue.length) {
    const cur = queue.shift();
    for (const r of relationships) {
      if (r.customer === cur && !out.includes(r.provider)) { out.push(r.provider); queue.push(r.provider); }
    }
  }
  return out;
}

export function explain(result, challenge) {
  const d = result.evidence.destination;
  const pp = challenge.peerLocalPref;
  const tp = challenge.transit.localPref;
  const exp = result.expected;

  if (result.status === 'content-error') {
    return { headline: 'Content error.', sourceIds: ['rfc1812-s5.2.4.3'],
      text: 'This round has an authoring error and cannot be graded. It does not count as an attempt.' };
  }
  if (result.status === 'invalid-input') {
    return { headline: 'Choose an exit first.', sourceIds: ['rfc1812-s5.2.4.3'],
      text: 'Select one exit (an IXP member, the Route Server, or the transit provider), then press Submit. Nothing was counted.' };
  }

  const matches = matchingPrefixes(result);

  if (result.status === 'correct') {
    const exitName = nameOf(challenge, exp.exitId);
    const others = result.evidence.candidates.filter((r) => r.contains && r.length === exp.length && r.exitId !== exp.exitId);
    let why;
    if (exp.source === 'ixp' && others.length > 0) {
      why = `The longest match is ${exp.prefix} (/${exp.length}). Both ${exitName} and ${nameOf(challenge, challenge.transit.id)} offer it, so Lagoa Fiber's policy decides: peer routes have LOCAL_PREF ${pp}, transit routes ${tp}. The peer wins.`;
    } else if (exp.source === 'ixp') {
      why = `The longest match is ${exp.prefix} (/${exp.length}), and only ${exitName} offers it.`;
    } else if (matches.length > 1) {
      why = `The longest match is ${exp.prefix} (/${exp.length}). Only ${exitName} offers a prefix that long, and the longest prefix always wins before any peer preference.`;
    } else {
      why = `Only ${exitName} has a route containing it (${exp.prefix}); no IXP member announces one.`;
    }
    let extra = '';
    if (exp.source === 'ixp' && exp.origin !== exp.exitId) {
      extra = ` ${exitName} announces ${exp.prefix} because ${nameOf(challenge, exp.origin)} is its customer.`;
    }
    if (exp.source === 'ixp') extra += ` The packet crosses the IXP switch straight to ${exitName}'s router (AS${asnOf(challenge, exp.exitId)}).`;
    const sources = exp.source === 'ixp' ? ['rfc4271-s9.1.1', 'rfc7947-s2.2.1'] : ['rfc1812-s5.2.4.3'];
    if (exp.origin !== exp.exitId && exp.source === 'ixp') sources.push('rfc7908-s2');
    return { headline: 'Correct.', sourceIds: sources,
      text: `${d} is inside ${list(matches)}. ${why}${extra}` };
  }

  // Incorrect.
  const chosen = result.evidence.chosen;
  const chosenName = nameOf(challenge, chosen.exitId);
  switch (result.reasonCode) {
    case 'rs-not-in-forwarding-path':
      return { headline: 'Not this time.', sourceIds: ['rfc7947-s1', 'rfc7947-s2.2.1'],
        text: `The route server only hands out routes; it does not forward traffic. The routes it shares still point at the announcing member's router, so a packet for ${d} goes directly across the IXP switch to a member, or out through transit. Next step: find the route whose prefix contains ${d}.` };
    case 'peer-prefix-does-not-contain-destination': {
      const own = chosen.announcedRoutes.map((r) => r.prefix);
      return { headline: 'Not this time.', sourceIds: ['rfc1812-s5.2.4.3'],
        text: `${chosenName} announces ${list(own)}, which does not contain ${d}. Next step: find the prefix that contains the address.` };
    }
    case 'not-announced-at-ixp': {
      const ixp = [...new Set(result.evidence.candidates.filter((r) => r.source === 'ixp').map((r) => r.prefix))];
      return { headline: 'Not this time.', sourceIds: ['rfc7947-s1', 'rfc1812-s5.2.4.3'],
        text: `At the IXP, members announce only ${list(ixp)}. None of these contains ${d}, so no IXP member can deliver it. Joining an IXP does not reach the whole Internet. Next step: find which exit has a route containing ${d}.` };
    }
    case 'peer-does-not-export-provider-routes': {
      const rels = challenge.relationships || [];
      const prov = providersAbove(chosen.exitId, rels).find((pid) => {
        const n = challenge.networks.find((x) => x.id === pid);
        return n && n.prefixes.some((p) => result.evidence.candidates.some((c) => c.prefix === p && c.contains));
      });
      const provNet = challenge.networks.find((x) => x.id === prov) || { name: 'its provider', prefixes: [] };
      const provPrefix = provNet.prefixes.find((p) => matches.includes(p)) || provNet.prefixes[0] || '';
      return { headline: 'Not this time.', sourceIds: ['rfc7908-s3.3', 'rfc7908-s2'],
        text: `${chosenName} reaches ${provPrefix} through its provider ${provNet.name}. Peers announce only their own and their customers' prefixes; passing a provider's routes to a peer would be a route leak. So ${chosenName} does not announce ${provPrefix} at the IXP, and no IXP route contains ${d}. Next step: find which exit does have a route containing ${d}.` };
    }
    case 'longest-prefix-before-preference': {
      const longest = matches[matches.length - 1];
      if (chosen.kind === 'peer') {
        const mine = chosen.matchingRoutes.map((r) => r.prefix);
        return { headline: 'Not this time.', sourceIds: ['rfc1812-s5.2.4.3'],
          text: `${d} is inside ${list(matches)}. ${chosenName} offers ${list(mine)}, but ${longest} is longer. The router first picks the longest matching prefix; the peer preference only breaks ties between routes of the same length. Next step: check which exit offers ${longest}.` };
      }
      return { headline: 'Not this time.', sourceIds: ['rfc1812-s5.2.4.3'],
        text: `${d} is inside ${list(matches)}. ${longest} is the longest match, and ${chosenName} does not offer a prefix that long. The longest prefix always wins. Next step: check which exit offers ${longest}.` };
    }
    case 'peer-exports-customer-routes': {
      const ownerName = nameOf(challenge, exp.origin);
      const peerName = nameOf(challenge, exp.exitId);
      return { headline: 'Not this time.', sourceIds: ['rfc7908-s2', 'rfc4271-s9.1.1'],
        text: `${d} belongs to ${ownerName} (${exp.prefix}). ${ownerName} is a customer of ${peerName}, and peers announce their customers' prefixes as well as their own. So an IXP peer offers ${exp.prefix} with LOCAL_PREF ${pp}, which beats the same prefix from transit at LOCAL_PREF ${tp}. Next step: compare the IXP route with the transit route.` };
    }
    case 'equal-length-prefer-peer':
    default:
      return { headline: 'Not this time.', sourceIds: ['rfc4271-s9.1.1', 'rfc4271-s5.1.5'],
        text: `${d} is inside ${list(matches)}. The longest match, ${exp.prefix}, is offered by ${chosenName} and also by an IXP peer. When lengths are equal, Lagoa Fiber's policy decides: peer routes have LOCAL_PREF ${pp}, transit routes ${tp}. Next step: choose the peer that offers ${exp.prefix}.` };
  }
}
