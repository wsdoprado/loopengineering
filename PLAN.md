# Exchange Hall · Implementation plan

## Build target

Implement the clarified specification for Exchange Hall within the workshop build block. First deliver one complete round with correct grading, explanatory feedback, retry, and advance. Then add content and polish through the same implementation.

**Hardest behavior to get right:** deriving which routes each IXP peer announces from business relationships (own + customer prefixes only), then applying longest prefix match across IXP and transit routes *before* the peer-over-transit LOCAL_PREF tie-break.

**First evidence we'll check:** L3R1 from the spec. Destination `198.18.2.50`, IXP `198.18.0.0/22` from StreamCo, transit `198.18.0.0/15`, `198.18.0.0/22`, `198.18.2.0/24`. Expected exit is GlobalTransit (AS64510), and choosing StreamCo returns `longest-prefix-before-preference`.

## Stack and serving

- Semantic HTML, CSS, and native JavaScript modules. No framework, bundler, backend, or runtime model.
- DOM controls plus SVG for the exchange-hall topology diagram. No rendering dependency.
- `data/levels.json` for authored content; load it over HTTP using a relative URL.
- In-memory session state. Reload starts a fresh session, as specified. No persistence in v1.
- Static hosting, including a repository subpath such as GitHub Pages. Use relative asset paths and case-correct filenames.

Preview from the repository root after implementation creates `index.html`:

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

Open **http://127.0.0.1:8000**. On Windows use `py` in place of `python3`. Native modules and JSON fetching need a web server; opening the HTML with `file://` is not the supported run path. [MDN reference](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules).

## Proposed files and responsibilities

```text
index.html                   Semantic page shell and module entry point
style.css                    Layout, focus, feedback states, reduced motion
main.js                      Load → validate → start; render loading/errors
engine/
  ipv4.js                    Parse/validate IPv4 addresses and CIDR prefixes; containment
  rules.js                   Pure exit selection: derive peer routes, LPM, LOCAL_PREF
  content.js                 Validate authored level data and source references
  state.js                   Session transitions, attempts, completion, restart
  feedback.js                Explain structured evaluation results
ui/
  render.js                  Briefing, topology SVG, route table, feedback, summary
  controls.js                Input events and keyboard/focus behavior
data/
  levels.json                Briefings, networks, relationships, routes, hints, sources
tests/
  index.html                 Browser test runner with visible pass/fail summary
  ipv4.test.js               Parsing, host-bit rejection, containment boundaries
  rules.test.js              Independent expected results from the specification
  state.test.js              Attempts, assistance, duplicate submit, progression
  content.test.js            Invalid/missing/ambiguous authored data
README.md                    Actual run instructions, behavior, and evidence
```

## Data contract

One document containing `schemaVersion`, `sources`, and `levels`. Each level has a unique ID, title, learning outcome, briefing, source IDs, and ordered rounds. Each round has a unique ID, a challenge, choice IDs, and ordered hints.

**Domain fields (per round challenge):**

- `self`: `{ id: "lagoa", name: "Lagoa Fiber", asn: 64500 }`
- `networks`: array of `{ id: string, name: string, asn: integer 64496–64511 (RFC 5398), atIxp: boolean, prefixes: string[] (IPv4 CIDR, /8–/32) }`
- `relationships`: array of `{ provider: networkId, customer: networkId }`; peering between IXP members via the route server is implied by `atIxp`
- `transit`: `{ id: "globaltransit", name, asn, localPref: 100, routes: string[] (CIDR) }`
- `peerLocalPref`: 200
- `routeServer`: `{ id: "rs", name: "Route Server", asn }`
- `showAnnouncements`: boolean. When true (Levels 1 and 3), the UI shows the derived IXP route table. When false (Level 2), it shows only relationships.
- `destination`: IPv4 dotted-decimal string

**Choice representation:** one exit ID string from the round's `choices`: an IXP member's network ID, `"rs"`, or the transit ID.

**Validation rules:** reject the whole file and name the level/round ID when any of these occur:
- a missing field, or a duplicate level, round, or network ID;
- an ASN outside 64496–64511, or an invalid IPv4 address;
- a CIDR with host bits set (`198.18.1.0/22`) or a length outside /8–/32;
- a relationship that references an unknown network or forms a provider/customer cycle;
- a choice ID that is not a known exit;
- a destination matched by no route;
- two IXP peers announcing the same winning prefix (unsupported tie);
- a source ID that does not resolve.

The loader validates the whole content file before starting. Content errors are never counted as learner attempts. Briefings and hints reference source records with title, URL, section, and supported claim. There is no answer key in data: the evaluator computes the exit.

## Domain evaluation contract

```text
evaluate(challenge, answer) → {
  status: "correct" | "incorrect" | "invalid-input" | "content-error",
  expected: { exitId, prefix, source: "ixp" | "transit", localPref } | null,
  reasonCode: stable identifier for the rule/misconception,
  evidence: { destination, matchingRoutes: [{prefix, length, exitId, source, localPref}], longestLength }
}
```

- Pure function: same inputs, same result; no DOM, timer, network, random choice, or score changes.
- Algorithm:
  1. For each IXP member M, the routes it announces are M's own prefixes plus the prefixes of every network in M's customer cone. The cone follows `relationships` transitively. M never announces routes from its providers or other peers (RFC 7908 §3.2–3.3).
  2. The candidate routes are those announced IXP routes (localPref 200, exit = M) plus the transit routes (localPref 100, exit = transit).
  3. Keep the candidates whose prefix contains the destination. Keep only those with the maximum prefix length (RFC 1812 §5.2.4.3).
  4. Pick the highest localPref (RFC 4271 §9.1.1). If two IXP peers are still tied, return `content-error`.
- `"rs"` is never the correct exit; choosing it returns `rs-not-in-forwarding-path`.
- Reason codes: `correct-peer`, `correct-transit`, `rs-not-in-forwarding-path`, `not-announced-at-ixp`, `peer-exports-customer-routes`, `peer-does-not-export-provider-routes`, `longest-prefix-before-preference`, `equal-length-prefer-peer`, `no-selection`, `content-error`.
- The UI must not choose the correct answer by position, label, or animation destination.
- Expected answers in tests come from the spec's hand-checked case table, not from calling the evaluator.

**Feedback example:** in L2R2, the player chooses StreamCo. The result is `incorrect` with `peer-does-not-export-provider-routes`. The explanation reads: "StreamCo reaches `198.18.0.0/15` through its transit provider BigCarrier (AS64511). Peers only announce their own and their customers' prefixes. Announcing a provider's routes to a peer would be a route leak (RFC 7908 §3.3). No IXP route contains `198.18.5.5`, so the packet leaves through GlobalTransit."

## Session transitions

```text
loading → briefing → awaiting-answer
                     ├─ invalid input → guidance → awaiting-answer
                     ├─ incorrect → feedback → retry same round
                     └─ correct → feedback → Next → next round/briefing/summary
loading/content failure → error screen → retry loading
confirmed Restart → fresh first briefing
```

The state module owns attempts, assistance, completed round IDs, current round, and current view. Selection and hints do not submit an answer. Count valid submissions only while a round is unsolved. Disable Submit after success; guard in state logic as well. Advance only through explicit Next. Restart requires confirmation; cancellation changes nothing.

## Interaction and visual direction

Turn the "exchange hall" metaphor into an SVG. A central IXP switch has labeled member gates around it, with name, ASN, and prefixes. The route server is an information desk connected by dashed control lines. The transit link is a toll road leaving the hall. The route table sits beside the diagram as a real `<table>` with prefix, length, exit, source, and LOCAL_PREF. Motion reveals the consequence: the packet travels along the chosen path, and matching prefixes highlight in order of length. When the player picks the route server, the packet stops at the desk and shows the real next hop.

Use native radio buttons for the exits. Move focus to the feedback heading after submission, and announce feedback through a live region. Respect `prefers-reduced-motion`: show the final packet position with no animation. All values appear as text; a learner must not need animation, color vision, pointer precision, or hover to reason about the answer.

## Implementation order

| Slice | Deliverable | Evidence before the next slice |
| --- | --- | --- |
| 1 · Prove the rule | `ipv4.js` + pure evaluator, plus the spec's correct/wrong/boundary cases | Expected results pass independently of the UI |
| 2 · Complete one round | Briefing, topology, route table, choose, feedback, retry, Next for L1R1 | One correct and one wrong path work in the browser |
| 3 · Add the curriculum | All six rounds, validation, hints, session summary | Each shipped round agrees with its reviewed cases |
| 4 · Make it usable | Keyboard/focus, reduced motion, narrow layout, clear error states | Manual checks are recorded |
| 5 · Package the result | README, screenshot if available, optional hosting | Another attendee can run and explain the game |

Generate `tasks.md` from these slices and the actual acceptance criteria. Do not create a large task tree for hypothetical stretch features.

## Verification and reporting

Implement a dependency-free browser test runner at `tests/index.html`. It imports the pure modules, runs all assertions, and shows totals plus the IDs of failed cases. Zero discovered tests counts as a failure. Open **http://127.0.0.1:8000/tests/** after starting the same server.

| Check | What must be established |
| --- | --- |
| Domain cases | Every row of the spec's case table, including `198.18.2.255`, `198.18.3.0`, `198.18.4.0` boundaries |
| Input/content failures | No selection does not consume attempts; tied peers, unmatched destination, and host-bit CIDRs cannot be graded |
| State transitions | Retry, hints, duplicate submission, level completion, final summary, restart/cancel |
| Source review | Each briefing and explanation agrees with the cited RFC section |
| Browser playthrough | Fresh start to summary, keyboard-only core actions, readable feedback |
| Layout/motion | Typical laptop, narrow viewport, reduced motion |
| Hosting, if used | Assets and data load under the published repository path |

For each required acceptance criterion, record **pass / fail / not run**, the date, environment, and evidence in the README or a linked verification note. The test runner checks code behavior; a human still reviews the teaching content and actual interaction.

## Scope controls

No persistence, multiplayer, runtime AI, procedural scenario generator, editor, audio, IPv6, or BGP attributes beyond LOCAL_PREF in v1. If time runs short, propose the smallest coherent reduction to the specification and update the tasks. Do not hide skipped checks or silently weaken correctness.
