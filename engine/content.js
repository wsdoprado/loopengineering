// Whole-file validation of data/levels.json.
// Contract: specs/001-ixp-exchange-hall/contracts/levels-schema.md ("Field rules").
// Returns every error as { at, message }; an empty array means valid.
import { parseIPv4, parseCIDR } from './ipv4.js';
import { evaluate } from './rules.js';

const ASN_MIN = 64496;
const ASN_MAX = 64511;

const isStr = (v) => typeof v === 'string' && v.trim().length > 0;
const isAsn = (v) => Number.isInteger(v) && v >= ASN_MIN && v <= ASN_MAX;

function hasCycle(relationships) {
  const edges = new Map();
  for (const r of relationships) {
    if (!edges.has(r.provider)) edges.set(r.provider, []);
    edges.get(r.provider).push(r.customer);
  }
  const state = new Map(); // 1 = visiting, 2 = done
  const visit = (n) => {
    if (state.get(n) === 1) return true;
    if (state.get(n) === 2) return false;
    state.set(n, 1);
    for (const m of edges.get(n) || []) if (visit(m)) return true;
    state.set(n, 2);
    return false;
  };
  return [...edges.keys()].some(visit);
}

function checkSourceIds(ids, at, sourceIds, errors, { min = 0 } = {}) {
  if (!Array.isArray(ids)) { errors.push({ at, message: 'sourceIds must be an array' }); return; }
  if (ids.length < min) errors.push({ at, message: `needs at least ${min} source` });
  for (const id of ids) {
    if (!sourceIds.has(id)) errors.push({ at, message: `Unknown source id "${id}"` });
  }
}

function validateChallenge(c, at, errors) {
  const before = errors.length;
  if (!c || typeof c !== 'object') { errors.push({ at, message: 'challenge missing' }); return; }
  const self = c.self || {};
  const rs = c.routeServer || {};
  const transit = c.transit || {};
  if (!isStr(self.id) || !isStr(self.name) || !isAsn(self.asn)) errors.push({ at: `${at}.self`, message: 'self needs id, name, documentation ASN 64496–64511' });
  if (rs.id !== 'rs' || !isStr(rs.name) || !isAsn(rs.asn)) errors.push({ at: `${at}.routeServer`, message: 'routeServer needs id "rs", name, documentation ASN' });
  if (!isStr(transit.id) || !isStr(transit.name) || !isAsn(transit.asn)) errors.push({ at: `${at}.transit`, message: 'transit needs id, name, documentation ASN' });
  if (!Number.isInteger(transit.localPref)) errors.push({ at: `${at}.transit.localPref`, message: 'localPref must be an integer' });
  if (!Number.isInteger(c.peerLocalPref) || !(c.peerLocalPref > transit.localPref)) {
    errors.push({ at: `${at}.peerLocalPref`, message: 'peerLocalPref must be an integer greater than transit.localPref' });
  }
  if (!Array.isArray(transit.routes) || transit.routes.length === 0) {
    errors.push({ at: `${at}.transit.routes`, message: 'transit.routes must be a non-empty array' });
  } else {
    transit.routes.forEach((p, i) => {
      try { parseCIDR(p); } catch (e) { errors.push({ at: `${at}.transit.routes[${i}]`, message: e.message }); }
    });
  }

  const reserved = new Set([self.id, 'rs', transit.id]);
  const ids = new Set();
  if (!Array.isArray(c.networks) || c.networks.length === 0) {
    errors.push({ at: `${at}.networks`, message: 'networks must be a non-empty array' });
  } else {
    c.networks.forEach((n, i) => {
      const nAt = `${at}.networks[${i}]`;
      if (!isStr(n.id)) errors.push({ at: `${nAt}.id`, message: 'id required' });
      else if (ids.has(n.id)) errors.push({ at: `${nAt}.id`, message: `Duplicate network id "${n.id}"` });
      else if (reserved.has(n.id)) errors.push({ at: `${nAt}.id`, message: `Network id "${n.id}" collides with self, rs, or transit` });
      ids.add(n.id);
      if (!isStr(n.name)) errors.push({ at: `${nAt}.name`, message: 'name required' });
      if (!isAsn(n.asn)) errors.push({ at: `${nAt}.asn`, message: `ASN ${n.asn} outside documentation range 64496–64511` });
      if (typeof n.atIxp !== 'boolean') errors.push({ at: `${nAt}.atIxp`, message: 'atIxp must be boolean' });
      if (!Array.isArray(n.prefixes) || n.prefixes.length === 0) {
        errors.push({ at: `${nAt}.prefixes`, message: 'prefixes must be a non-empty array' });
      } else {
        n.prefixes.forEach((p, j) => {
          try { parseCIDR(p); } catch (e) { errors.push({ at: `${nAt}.prefixes[${j}]`, message: e.message }); }
        });
      }
    });
  }

  if (!Array.isArray(c.relationships)) {
    errors.push({ at: `${at}.relationships`, message: 'relationships must be an array' });
  } else {
    c.relationships.forEach((r, i) => {
      const rAt = `${at}.relationships[${i}]`;
      if (!ids.has(r.provider)) errors.push({ at: rAt, message: `Unknown provider "${r.provider}"` });
      if (!ids.has(r.customer)) errors.push({ at: rAt, message: `Unknown customer "${r.customer}"` });
      if (r.provider === r.customer) errors.push({ at: rAt, message: 'Self-loop relationship' });
    });
    if (hasCycle(c.relationships)) errors.push({ at: `${at}.relationships`, message: 'Provider/customer cycle' });
  }

  if (typeof c.showAnnouncements !== 'boolean') errors.push({ at: `${at}.showAnnouncements`, message: 'showAnnouncements must be boolean' });

  try { parseIPv4(c.destination); } catch (e) { errors.push({ at: `${at}.destination`, message: e.message }); }

  const ixpIds = new Set((c.networks || []).filter((n) => n.atIxp).map((n) => n.id));
  if (!Array.isArray(c.choices)) {
    errors.push({ at: `${at}.choices`, message: 'choices must be an array' });
  } else {
    if (new Set(c.choices).size !== c.choices.length) errors.push({ at: `${at}.choices`, message: 'Duplicate choice' });
    for (const ch of c.choices) {
      if (!(ixpIds.has(ch) || ch === 'rs' || ch === transit.id)) errors.push({ at: `${at}.choices`, message: `Unknown exit "${ch}"` });
    }
    if (!c.choices.includes('rs')) errors.push({ at: `${at}.choices`, message: 'choices must include "rs" (FR-003)' });
    if (!c.choices.includes(transit.id)) errors.push({ at: `${at}.choices`, message: 'choices must include the transit id' });
  }

  // Only run the rule engine on structurally valid data.
  if (errors.length === before) {
    const r = evaluate(c, { exitId: null });
    if (r.status === 'content-error') {
      const msg = r.reasonCode === 'tied-peers'
        ? 'Two IXP peers tie for the winning route (unsupported in v1)'
        : `No route contains destination ${c.destination}`;
      errors.push({ at: `${at}.destination`, message: msg });
    } else if (!c.choices.includes(r.expected.exitId)) {
      errors.push({ at: `${at}.choices`, message: 'The correct exit is not among the choices' });
    }
  }
}

export function validateContent(doc) {
  const errors = [];
  if (!doc || typeof doc !== 'object') return [{ at: 'document', message: 'Content is not an object' }];
  if (doc.schemaVersion !== 1) errors.push({ at: 'schemaVersion', message: 'schemaVersion must be 1' });

  const sourceIds = new Set();
  if (!Array.isArray(doc.sources) || doc.sources.length === 0) {
    errors.push({ at: 'sources', message: 'sources must be a non-empty array' });
  } else {
    doc.sources.forEach((s, i) => {
      const at = `sources[${i}]`;
      if (!isStr(s.id)) errors.push({ at, message: 'id required' });
      else if (sourceIds.has(s.id)) errors.push({ at, message: `Duplicate source id "${s.id}"` });
      sourceIds.add(s.id);
      if (!isStr(s.url) || !s.url.startsWith('https://')) errors.push({ at, message: 'url must be https' });
      for (const f of ['title', 'section', 'claim']) if (!isStr(s[f])) errors.push({ at, message: `${f} required` });
    });
  }

  if (!Array.isArray(doc.levels) || doc.levels.length === 0) {
    errors.push({ at: 'levels', message: 'At least one level is required' });
  }
  const levelIds = new Set();
  const roundIds = new Set();
  (Array.isArray(doc.levels) ? doc.levels : []).forEach((lv, li) => {
    const lAt = isStr(lv.id) ? lv.id : `levels[${li}]`;
    if (!isStr(lv.id)) errors.push({ at: lAt, message: 'level id required' });
    else if (levelIds.has(lv.id)) errors.push({ at: lAt, message: `Duplicate level id "${lv.id}"` });
    levelIds.add(lv.id);
    if (!isStr(lv.title)) errors.push({ at: `${lAt}.title`, message: 'title required' });
    if (!isStr(lv.outcome)) errors.push({ at: `${lAt}.outcome`, message: 'outcome required' });
    const b = lv.briefing || {};
    if (!Array.isArray(b.paragraphs) || b.paragraphs.length === 0) errors.push({ at: `${lAt}.briefing`, message: 'briefing paragraphs required' });
    if (!Array.isArray(b.terms)) errors.push({ at: `${lAt}.briefing.terms`, message: 'terms must be an array' });
    if (!isStr(b.workedExample)) errors.push({ at: `${lAt}.briefing.workedExample`, message: 'workedExample required' });
    checkSourceIds(b.sourceIds, `${lAt}.briefing.sourceIds`, sourceIds, errors, { min: 1 });

    if (!Array.isArray(lv.rounds) || lv.rounds.length === 0) {
      errors.push({ at: `${lAt}.rounds`, message: 'Each level needs at least one round' });
    }
    (Array.isArray(lv.rounds) ? lv.rounds : []).forEach((rd, ri) => {
      const rAt = isStr(rd.id) ? `${lAt}/${rd.id}` : `${lAt}.rounds[${ri}]`;
      if (!isStr(rd.id)) errors.push({ at: rAt, message: 'round id required' });
      else if (roundIds.has(rd.id)) errors.push({ at: rAt, message: `Duplicate round id "${rd.id}"` });
      roundIds.add(rd.id);
      if (!isStr(rd.prompt)) errors.push({ at: `${rAt}.prompt`, message: 'prompt required' });
      const h = rd.hints;
      if (!Array.isArray(h) || h.length !== 2 || h[0].kind !== 'method' || h[1].kind !== 'worked') {
        errors.push({ at: `${rAt}.hints`, message: 'hints must be exactly [method, worked]' });
      } else {
        h.forEach((hint, hi) => {
          if (!isStr(hint.text)) errors.push({ at: `${rAt}.hints[${hi}]`, message: 'hint text required' });
          checkSourceIds(hint.sourceIds, `${rAt}.hints[${hi}].sourceIds`, sourceIds, errors);
        });
      }
      validateChallenge(rd.challenge, `${rAt}.challenge`, errors);
    });
  });
  return errors;
}
