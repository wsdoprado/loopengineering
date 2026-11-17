// All DOM rendering. Reads state and content; never changes state.
import { deriveRoutes } from '../engine/rules.js';
import { explain } from '../engine/feedback.js';
import { contains } from '../engine/ipv4.js';
import { currentRound, currentLevel, currentRoundId, summary } from '../engine/state.js';

const SVG = 'http://www.w3.org/2000/svg';

export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === false || v === null || v === undefined) continue;
    if (k === 'class') node.className = v;
    else if (k === 'text') node.textContent = v;
    else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat(Infinity)) {
    if (c === null || c === undefined || c === false) continue;
    node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  }
  return node;
}

function svg(tag, attrs = {}, ...children) {
  const node = document.createElementNS(SVG, tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'text') node.textContent = v; else node.setAttribute(k, v);
  }
  for (const c of children.flat(Infinity)) if (c) node.appendChild(c);
  return node;
}

function sourceLinks(doc, ids) {
  const items = [];
  for (const id of [...new Set(ids)]) {
    const s = doc.sources.find((x) => x.id === id);
    if (!s) continue;
    items.push(el('li', {}, el('a', { href: s.url, target: '_blank', rel: 'noopener' }, `${s.title}, ${s.section}`)));
  }
  return items.length ? el('ul', { class: 'sources', 'aria-label': 'Sources' }, items) : null;
}

export function exitLabel(challenge, id) {
  if (id === challenge.routeServer.id) {
    return { name: challenge.routeServer.name, asn: challenge.routeServer.asn, kind: 'IXP route server' };
  }
  if (id === challenge.transit.id) {
    return { name: challenge.transit.name, asn: challenge.transit.asn, kind: 'transit provider' };
  }
  const n = challenge.networks.find((x) => x.id === id);
  return { name: n.name, asn: n.asn, kind: 'IXP peer' };
}

// ---------------- Briefing ----------------
export function renderBriefing(level, doc, levelNumber, onStart) {
  const b = level.briefing;
  return el('section', { class: 'panel briefing', 'aria-labelledby': 'view-title' },
    el('p', { class: 'progress' }, el('span', {}, `Level ${levelNumber} of ${doc.levels.length}`), el('span', {}, 'Briefing')),
    el('h2', { id: 'view-title', tabindex: '-1' }, `Level ${levelNumber}: ${level.title}`),
    el('p', {}, el('strong', {}, 'Goal: '), level.outcome),
    b.paragraphs.map((p) => el('p', {}, p)),
    el('h3', {}, 'Key terms'),
    el('dl', {}, b.terms.map((t) => [el('dt', {}, t.term), el('dd', {}, t.definition)])),
    el('h3', {}, 'Worked example'),
    el('p', { class: 'worked' }, b.workedExample),
    el('h3', {}, 'Sources'),
    sourceLinks(doc, b.sourceIds),
    el('p', {}, el('button', { type: 'button', class: 'btn btn-primary', id: 'start-btn', onclick: onStart },
      `Start level ${levelNumber}`)),
  );
}

// ---------------- Topology ----------------
// Layout coordinates; the packet path depends only on the chosen exit, never on the answer.
function layout(challenge) {
  const members = challenge.networks.filter((n) => n.atIxp);
  const outside = challenge.networks.filter((n) => !n.atIxp);
  const pos = {
    self: { x: 20, y: 120, w: 130, h: 56 },
    switch: { x: 245, y: 120, w: 130, h: 56 },
    rs: { x: 245, y: 14, w: 130, h: 50 },
    transit: { x: 245, y: 240, w: 130, h: 56 },
  };
  const gap = members.length > 1 ? 150 / (members.length - 1) : 0;
  members.forEach((m, i) => { pos[m.id] = { x: 470, y: members.length > 1 ? 50 + i * gap : 120, w: 140, h: 56 }; });
  outside.forEach((n, i) => { pos[n.id] = { x: 650, y: 40 + i * 110, w: 130, h: 56 }; });
  return { pos, members, outside };
}
const mid = (p) => ({ x: p.x + p.w / 2, y: p.y + p.h / 2 });

export function packetPath(challenge, exitId) {
  const { pos } = layout(challenge);
  const s = mid(pos.self);
  const out = { x: pos.self.x + pos.self.w, y: s.y };
  if (exitId === challenge.routeServer.id) {
    return [out, { x: 200, y: s.y }, { x: 200, y: mid(pos.rs).y }, { x: pos.rs.x, y: mid(pos.rs).y }];
  }
  if (exitId === challenge.transit.id) {
    return [{ x: s.x, y: pos.self.y + pos.self.h }, { x: s.x, y: mid(pos.transit).y }, { x: pos.transit.x, y: mid(pos.transit).y }];
  }
  const m = pos[exitId];
  const sw = mid(pos.switch);
  return [out, { x: pos.switch.x, y: sw.y }, { x: pos.switch.x + pos.switch.w, y: sw.y }, { x: m.x, y: mid(m).y }];
}

function node(p, cls, title, sub) {
  return svg('g', { class: `node ${cls}` },
    svg('rect', { x: p.x, y: p.y, width: p.w, height: p.h, rx: 8 }),
    svg('text', { x: p.x + p.w / 2, y: p.y + 22, 'text-anchor': 'middle', text: title }),
    sub ? svg('text', { class: 'sub', x: p.x + p.w / 2, y: p.y + 40, 'text-anchor': 'middle', text: sub }) : null);
}

export function topologySummary(challenge, state, revealedIxp) {
  const { members, outside } = layout(challenge);
  const parts = [];
  parts.push(`Lagoa Fiber (AS${challenge.self.asn}) connects to the IXP switch and to ${challenge.transit.name} (AS${challenge.transit.asn}) for transit.`);
  parts.push(`IXP members: ${members.map((m) => `${m.name} (AS${m.asn}, owns ${m.prefixes.join(', ')})`).join('; ')}.`);
  parts.push(`The ${challenge.routeServer.name} (AS${challenge.routeServer.asn}) shares routes over dashed control lines and is not on the data path.`);
  for (const n of outside) {
    const rels = (challenge.relationships || []).filter((r) => r.customer === n.id || r.provider === n.id);
    const relText = rels.map((r) => (r.customer === n.id
      ? `customer of ${challenge.networks.find((x) => x.id === r.provider).name}`
      : `provider of ${challenge.networks.find((x) => x.id === r.customer).name}`)).join(', ');
    parts.push(`${n.name} (AS${n.asn}, owns ${n.prefixes.join(', ')}) is not at the IXP${relText ? `; ${relText}` : '; reachable only through transit'}.`);
  }
  if (!challenge.showAnnouncements && !revealedIxp) parts.push('IXP announcements are hidden until you submit an answer.');
  const p = state.rounds[currentRoundId(state)];
  if (p.lastResult && p.lastResult.evidence.chosen) {
    const c = p.lastResult.evidence.chosen;
    const lbl = exitLabel(challenge, c.exitId);
    parts.push(c.kind === 'rs'
      ? 'Your packet stopped at the route server: it only hands out routes.'
      : `Your packet was sent toward ${lbl.name} (${lbl.kind}).`);
  }
  return parts.join(' ');
}

export function renderTopology(challenge, state) {
  const { pos, members, outside } = layout(challenge);
  const width = outside.length ? 800 : 630;
  const s = svg('svg', { viewBox: `0 0 ${width} 310`, role: 'img', 'aria-labelledby': 'topo-title topo-desc', focusable: 'false' });
  s.appendChild(svg('title', { id: 'topo-title', text: 'Exchange hall topology' }));
  s.appendChild(svg('desc', { id: 'topo-desc', text: 'Described in the text below the diagram.' }));

  const sm = mid(pos.self);
  const sw = mid(pos.switch);
  // Data path: Lagoa -> switch -> members.
  s.appendChild(svg('path', { class: 'link', d: `M${pos.self.x + pos.self.w},${sm.y} H${pos.switch.x}` }));
  for (const m of members) {
    const mm = mid(pos[m.id]);
    s.appendChild(svg('path', { class: 'link', d: `M${pos.switch.x + pos.switch.w},${sw.y} L${pos[m.id].x},${mm.y}` }));
  }
  // Transit road.
  s.appendChild(svg('path', { class: 'road', d: `M${sm.x},${pos.self.y + pos.self.h} V${mid(pos.transit).y} H${pos.transit.x}` }));
  // Route server control lines (not data path).
  const rsm = mid(pos.rs);
  s.appendChild(svg('path', { class: 'control', d: `M${sm.x},${pos.self.y} V${rsm.y} H${pos.rs.x}` }));
  for (const m of members) {
    const mm = mid(pos[m.id]);
    s.appendChild(svg('path', { class: 'control', d: `M${pos.rs.x + pos.rs.w},${rsm.y} L${mm.x},${pos[m.id].y}` }));
  }
  // Relationships to networks outside the IXP.
  for (const n of outside) {
    const nm = mid(pos[n.id]);
    const rel = (challenge.relationships || []).find((r) => r.customer === n.id || r.provider === n.id);
    if (rel) {
      const otherId = rel.customer === n.id ? rel.provider : rel.customer;
      const o = pos[otherId];
      s.appendChild(svg('path', { class: 'rel', d: `M${o.x + o.w},${mid(o).y} L${pos[n.id].x},${nm.y}` }));
      const label = rel.customer === n.id ? 'customer' : 'provider';
      s.appendChild(svg('text', { class: 'sub', x: (o.x + o.w + pos[n.id].x) / 2, y: (mid(o).y + nm.y) / 2 - 6, 'text-anchor': 'middle', text: label }));
    } else {
      s.appendChild(svg('path', { class: 'rel', d: `M${pos.transit.x + pos.transit.w},${mid(pos.transit).y} L${pos[n.id].x},${nm.y}` }));
    }
  }

  s.appendChild(node(pos.self, 'self', challenge.self.name, `AS${challenge.self.asn} · you`));
  s.appendChild(node(pos.switch, 'switch', 'IXP switch', 'shared fabric'));
  s.appendChild(node(pos.rs, 'desk', challenge.routeServer.name, `AS${challenge.routeServer.asn} · routes`));
  s.appendChild(node(pos.transit, 'transit', challenge.transit.name, `AS${challenge.transit.asn} · transit`));
  for (const m of members) s.appendChild(node(pos[m.id], 'member', `${m.name} AS${m.asn}`, m.prefixes.join(', ')));
  for (const n of outside) s.appendChild(node(pos[n.id], 'outside', `${n.name} AS${n.asn}`, `${n.prefixes.join(', ')} · not at IXP`));

  const p = state.rounds[currentRoundId(state)];
  if (p.lastResult && p.lastResult.evidence.chosen) {
    const pts = packetPath(challenge, p.lastResult.evidence.chosen.exitId);
    const d = `M${pts.map((q) => `${q.x},${q.y}`).join(' L')}`;
    s.appendChild(svg('path', { class: 'path-trace', d }));
    const end = pts[pts.length - 1];
    const dot = svg('circle', { class: 'packet', r: 9, cx: end.x, cy: end.y, 'data-path': JSON.stringify(pts) });
    s.appendChild(dot);
  }
  return s;
}

// Animates the packet along its path (≤ 0.9 s). Skipped under reduced motion: the dot is
// already drawn at its final position, and feedback is rendered before this runs.
export function animatePacket(root) {
  const dot = root.querySelector('circle.packet');
  if (!dot) return;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const pts = JSON.parse(dot.getAttribute('data-path'));
  const segs = [];
  let total = 0;
  for (let i = 1; i < pts.length; i += 1) {
    const len = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    segs.push({ a: pts[i - 1], b: pts[i], len });
    total += len;
  }
  const duration = 900;
  const t0 = performance.now();
  const step = (now) => {
    const t = Math.min(1, (now - t0) / duration);
    let dist = t * total;
    for (const sg of segs) {
      if (dist <= sg.len || sg === segs[segs.length - 1]) {
        const f = sg.len ? Math.min(1, dist / sg.len) : 1;
        dot.setAttribute('cx', sg.a.x + (sg.b.x - sg.a.x) * f);
        dot.setAttribute('cy', sg.a.y + (sg.b.y - sg.a.y) * f);
        break;
      }
      dist -= sg.len;
    }
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

// ---------------- Tables ----------------
function networksTable(challenge) {
  const rows = challenge.networks.map((n) => el('tr', {},
    el('td', {}, n.name), el('td', {}, `AS${n.asn}`), el('td', {}, n.atIxp ? 'Yes' : 'No'),
    el('td', { class: 'mono' }, n.prefixes.join(', '))));
  const rels = challenge.relationships || [];
  const relTable = rels.length
    ? el('div', { class: 'table-region', role: 'region', 'aria-label': 'Business relationships', tabindex: '0' },
      el('table', {}, el('caption', {}, 'Business relationships'),
        el('thead', {}, el('tr', {}, el('th', { scope: 'col' }, 'Provider'), el('th', { scope: 'col' }, 'Customer'))),
        el('tbody', {}, rels.map((r) => el('tr', {},
          el('td', {}, challenge.networks.find((x) => x.id === r.provider).name),
          el('td', {}, challenge.networks.find((x) => x.id === r.customer).name))))))
    : null;
  return [
    el('div', { class: 'table-region', role: 'region', 'aria-label': 'Networks', tabindex: '0' },
      el('table', {}, el('caption', {}, 'Networks and the prefixes they own'),
        el('thead', {}, el('tr', {}, ['Network', 'ASN', 'At the IXP?', 'Owns'].map((h) => el('th', { scope: 'col' }, h)))),
        el('tbody', {}, rows))),
    relTable,
  ];
}

export function renderRouteTable(challenge, state) {
  const p = state.rounds[currentRoundId(state)];
  const showIxp = challenge.showAnnouncements || p.revealed;
  const routes = deriveRoutes(challenge).filter((r) => showIxp || r.source !== 'ixp');
  const showMatch = p.revealed; // match column is evidence shown after a graded submission
  const head = ['Prefix', 'Length', 'Exit', 'Source', 'LOCAL_PREF'];
  if (showMatch) head.push('Contains destination?');
  const rows = routes.map((r) => {
    const lbl = exitLabel(challenge, r.exitId);
    const via = r.source === 'ixp' && r.origin !== r.exitId
      ? ` (customer ${challenge.networks.find((n) => n.id === r.origin).name})` : '';
    return el('tr', {},
      el('td', { class: 'mono' }, r.prefix),
      el('td', {}, `/${r.length}`),
      el('td', {}, `${lbl.name} AS${lbl.asn}${via}`),
      el('td', { class: r.source === 'ixp' ? 'src-ixp' : 'src-transit' }, r.source === 'ixp' ? 'IXP peer' : 'Transit'),
      el('td', {}, String(r.localPref)),
      showMatch ? el('td', {}, contains(r.prefix, challenge.destination) ? 'Yes' : 'No') : null);
  });
  const parts = [];
  if (!challenge.showAnnouncements) parts.push(...networksTable(challenge));
  else parts.push(networksTable(challenge)[0]);
  parts.push(el('div', { class: 'table-region', role: 'region', 'aria-label': 'Routes known to Lagoa Fiber', tabindex: '0' },
    el('table', {}, el('caption', {}, p.revealed && !challenge.showAnnouncements
      ? 'Routes known to Lagoa Fiber (IXP announcements now revealed)' : 'Routes known to Lagoa Fiber'),
    el('thead', {}, el('tr', {}, head.map((h) => el('th', { scope: 'col' }, h)))),
    el('tbody', {}, rows))));
  if (!showIxp) {
    parts.push(el('p', { class: 'hidden-note' },
      'IXP announcements are hidden in this level. Predict them from the relationships; they are revealed after you submit.'));
  }
  return parts;
}

// ---------------- Choices, feedback, hints ----------------
export function renderChoices(challenge, state, onSelect) {
  const p = state.rounds[currentRoundId(state)];
  return el('fieldset', { class: 'choices' },
    el('legend', {}, 'Choose the exit for this packet'),
    challenge.choices.map((id) => {
      const lbl = exitLabel(challenge, id);
      const input = el('input', { type: 'radio', name: 'exit', value: id, id: `exit-${id}`,
        checked: state.selection === id, onchange: () => onSelect(id) });
      return el('label', { class: 'choice', for: `exit-${id}` }, input,
        el('span', {}, el('strong', {}, lbl.name), ` AS${lbl.asn} `, el('span', { class: 'kind' }, `· ${lbl.kind}`)));
    }));
}

export function renderFeedback(challenge, state, doc) {
  const p = state.rounds[currentRoundId(state)];
  if (p.guidance) {
    return el('section', { class: 'panel guidance', 'aria-labelledby': 'fb-title' },
      el('h3', { id: 'fb-title', class: 'headline', tabindex: '-1' }, 'Choose an exit first.'),
      el('p', {}, p.guidance));
  }
  if (!p.lastResult) {
    return el('section', { class: 'panel feedback', 'aria-labelledby': 'fb-title' },
      el('h3', { id: 'fb-title', tabindex: '-1' }, 'Feedback'),
      el('p', {}, 'Pick an exit and press Submit. The explanation appears here.'));
  }
  const fb = explain(p.lastResult, challenge);
  const ok = p.lastResult.status === 'correct';
  const lbl = exitLabel(challenge, p.lastResult.evidence.chosen.exitId);
  return el('section', { class: `panel feedback ${ok ? 'ok' : 'bad'}`, 'aria-labelledby': 'fb-title' },
    el('h3', { id: 'fb-title', class: 'headline', tabindex: '-1' }, fb.headline),
    el('p', { class: 'assist' }, `Your answer: ${lbl.name} (${lbl.kind}).`),
    el('p', {}, fb.text),
    sourceLinks(doc, fb.sourceIds));
}

export function feedbackAnnouncement(challenge, state) {
  const p = state.rounds[currentRoundId(state)];
  if (p.guidance) return `Choose an exit first. ${p.guidance}`;
  if (!p.lastResult) return '';
  const fb = explain(p.lastResult, challenge);
  return `${fb.headline} ${fb.text}`;
}

export function renderHints(round, state, doc) {
  const p = state.rounds[currentRoundId(state)];
  const shown = round.hints.slice(0, p.hintsShown);
  if (!shown.length) return null;
  return el('section', { class: 'panel hints', 'aria-labelledby': 'hints-title' },
    el('h3', { id: 'hints-title', tabindex: '-1' }, 'Help'),
    el('ol', {}, shown.map((h) => el('li', {},
      el('strong', {}, h.kind === 'method' ? 'Method: ' : 'Worked solution (counts as assistance): '), h.text))),
    sourceLinks(doc, shown.flatMap((h) => h.sourceIds)));
}

// ---------------- Round view ----------------
export function renderRound(state, doc, handlers) {
  const level = currentLevel(state, doc);
  const round = currentRound(state, doc);
  const c = round.challenge;
  const p = state.rounds[round.id];
  const sum = summary(state, doc);
  const isLastRound = state.roundIndex === level.rounds.length - 1;
  const isLastLevel = state.levelIndex === doc.levels.length - 1;
  const nextLabel = !isLastRound ? 'Next round' : isLastLevel ? 'See session summary' : 'Next level';
  const hintLabel = p.hintsShown === 0 ? 'Show a hint' : 'Show the worked solution';

  const topoSummaryId = 'topo-summary';
  return el('div', { class: 'round' },
    el('p', { class: 'progress' },
      el('span', {}, el('strong', {}, `Level ${state.levelIndex + 1} of ${doc.levels.length}`), ` · ${level.title}`),
      el('span', {}, `Round ${state.roundIndex + 1} of ${level.rounds.length}`),
      el('span', {}, `Attempts this round: ${p.attempts}`),
      el('span', {}, `Rounds completed: ${sum.completed} of ${sum.totalRounds}`),
      el('span', {}, `Assistance this round: ${p.hintsShown > 0 ? 'yes' : 'no'}`)),
    el('div', { class: 'round-grid' },
      el('div', { class: 'round-main' },
        el('section', { class: 'panel', 'aria-labelledby': 'view-title' },
          el('h2', { id: 'view-title', class: 'prompt', tabindex: '-1' }, round.prompt),
          el('p', { class: 'destination' }, 'Destination: ', el('code', {}, c.destination)),
          el('div', { class: 'topology' }, renderTopology(c, state),
            el('p', { id: topoSummaryId, class: 'topology-summary' },
              topologySummary(c, state, p.revealed)))),
        el('section', { class: 'panel', 'aria-label': 'Route evidence' }, renderRouteTable(c, state))),
      el('div', { class: 'round-side' },
        el('section', { class: 'panel', 'aria-label': 'Your decision' },
          renderChoices(c, state, handlers.onSelect),
          el('div', { class: 'actions' },
            el('button', { type: 'button', class: 'btn btn-primary', id: 'submit-btn', disabled: p.solved, onclick: handlers.onSubmit },
              p.solved ? 'Solved' : 'Submit'),
            el('button', { type: 'button', class: 'btn', id: 'hint-btn', disabled: p.hintsShown >= 2, onclick: handlers.onHint },
              p.hintsShown >= 2 ? 'All help shown' : hintLabel),
            el('button', { type: 'button', class: 'btn', id: 'next-btn', disabled: !p.solved, onclick: handlers.onNext }, nextLabel)),
          el('p', { class: 'assist' }, 'Hints and the worked solution are always available. Using them is recorded as assistance; it never completes a round.')),
        renderFeedback(c, state, doc),
        renderHints(round, state, doc))));
}

// ---------------- Summary ----------------
export function renderSummary(state, doc) {
  const s = summary(state, doc);
  return el('section', { class: 'panel', 'aria-labelledby': 'view-title' },
    el('h2', { id: 'view-title', tabindex: '-1' }, 'Session summary'),
    el('dl', { class: 'stats' },
      el('div', { class: 'stat' }, el('dt', {}, 'Rounds completed'), el('dd', {}, `${s.completed} of ${s.totalRounds}`)),
      el('div', { class: 'stat' }, el('dt', {}, 'Valid attempts'), el('dd', {}, String(s.attempts))),
      el('div', { class: 'stat' }, el('dt', {}, 'Rounds with assistance'), el('dd', {}, String(s.assistedRounds)))),
    el('div', { class: 'table-region', role: 'region', 'aria-label': 'Per-round results', tabindex: '0' },
      el('table', {}, el('caption', {}, 'Per-round results'),
        el('thead', {}, el('tr', {}, ['Round', 'Completed', 'Attempts', 'Assistance'].map((h) => el('th', { scope: 'col' }, h)))),
        el('tbody', {}, s.rounds.map((r) => el('tr', {},
          el('td', {}, r.id), el('td', {}, r.solved ? 'Yes' : 'No'), el('td', {}, String(r.attempts)),
          el('td', {}, r.workedSolution ? 'Worked solution' : r.assisted ? 'Hint' : 'None')))))),
    el('p', {}, 'Completion is not proof of independent mastery: attempts and assistance are shown separately so you can see where help was needed.'),
    el('p', {}, 'Use Restart (top right) to play again.'));
}
