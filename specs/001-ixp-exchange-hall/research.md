# Phase 0 Research: Exchange Hall

The Technical Context had no NEEDS CLARIFICATION items. The stack is fixed by the root `PLAN.md`, and the spec's open decisions were resolved in `/speckit-clarify`. This file records the design decisions and the reasoning behind them.

## R1 · Stack: native HTML/CSS/JS modules, no dependencies

- **Decision**: semantic HTML, CSS, and ES-module JavaScript, served statically. No framework or bundler.
- **Rationale**:
  - Constitution V requires a self-contained game.
  - The 60-minute workshop budget leaves no time for toolchain setup.
  - Native modules work on any static host.
- **Alternatives considered**:
  - React or Vite: needs a build step and npm.
  - Three.js: a 3D view adds nothing to the teaching and makes access harder.

## R2 · IPv4 arithmetic

- **Decision**: represent addresses as unsigned 32-bit integers (`>>> 0`). Masks are `len === 0 ? 0 : (~0 << (32 - len)) >>> 0`. Containment is `(addr & mask) === network`. A prefix is invalid if `(network & ~mask) !== 0`, which means host bits are set.
- **Rationale**: exact, dependency-free, and easy to test at boundaries (`198.18.2.255`, `198.18.3.0`). The unsigned shift avoids sign bugs in JavaScript bitwise operators.
- **Alternatives considered**: string and octet comparison is error-prone for non-octet lengths such as /22 and /15. BigInt is unnecessary for 32 bits.

## R3 · Peer export rule: customer cone

- **Decision**: an IXP member M announces M's own prefixes plus those of every network reachable by following `provider → customer` edges down from M (transitively). Routes M learns from its providers or from other peers are never announced.
- **Rationale**: this is the standard Gao-Rexford export policy. Sending provider or peer routes to a peer is a route leak (RFC 7908 §3.2, §3.3). The spec's Level 2 cases depend on it.
- **Alternatives considered**: authoring each peer's announcements directly in the data would make Level 2 untestable as a rule, and would let an answer key bypass the engine, which Constitution VI forbids.

## R4 · Decision order: LPM first, then LOCAL_PREF

- **Decision**: filter the candidates that contain the destination, keep the maximum prefix length, then pick the highest LOCAL_PREF (peer 200, transit 100). Two IXP peers still tied after that is a `content-error`.
- **Rationale**: BGP chooses the best path per prefix (RFC 4271 §9.1.1). The forwarding table then uses the longest match across prefixes (RFC 1812 §5.2.4.3). The combined order gives the same result as a real router for every case in the model.
- **Alternatives considered**: modelling AS_PATH length and later tie-breaks was rejected because they are out of scope per the spec exclusions. That is why tied peers are rejected rather than resolved.

## R5 · Reason codes and feedback

- **Decision**: `evaluate()` returns one stable `reasonCode`, using the first rule that applies (full table in [contracts/evaluate.md](./contracts/evaluate.md)):
  1. The choice is `rs`: `rs-not-in-forwarding-path`.
  2. The choice is an IXP peer that has a route containing the destination, but that route is shorter than the winner: `longest-prefix-before-preference`.
  3. The choice is an IXP peer with no route containing the destination, and one of its providers (directly or further up) originates a prefix that contains it: `peer-does-not-export-provider-routes`.
  4. The choice is an IXP peer, and no IXP route contains the destination: `not-announced-at-ixp`.
  5. The choice is any other IXP peer with no route containing the destination: `peer-prefix-does-not-contain-destination`.
  6. The choice is transit, the winner is a peer route with a longer prefix than transit's best match: `longest-prefix-before-preference`.
  7. The choice is transit, and the winning peer route comes from a customer of that peer: `peer-exports-customer-routes`.
  8. The choice is transit and none of the above applies (equal length, peer preferred): `equal-length-prefer-peer`.

  `feedback.js` maps each code and its evidence to English text.
- **Rationale**: one deterministic code per misconception keeps the feedback testable (Constitution VI: feedback agrees with the evaluator).
- **Alternatives considered**: free-text explanation strings in the data for each wrong choice were rejected because they could disagree with the engine.

## R6 · Content loading and validation

- **Decision**: `main.js` runs `fetch('data/levels.json')`, then `validateContent()`, which collects every error and gives each one an `at` (levelId/roundId). Any error shows the content-error screen with a Retry button. The validator also runs `evaluate()` once per round with no answer, to detect ties and unmatched destinations up front.
- **Rationale**: FR-013 and Constitution I and VI. A broken round must never be gradable.
- **Alternatives considered**: lazy per-round validation was rejected because a learner could reach a broken round mid-session.

## R7 · Test runner

- **Decision**: `tests/index.html` imports `runner.js` and every `*.test.js`. Each test registers with `test(id, fn)`. The page shows the pass and fail totals and lists the failed IDs. If zero tests are discovered, it shows FAIL. Expected values are literals copied from the spec's reference-case table, never computed by `evaluate()`.
- **Rationale**: no npm. It runs on the same static server.
- **Alternatives considered**: Node's built-in test runner would also work for the pure modules, but it adds a second run path and a Node install.

## R8 · Access and motion

- **Decision**:
  - Exits are a native radio `fieldset` with `legend`.
  - Submit, Hint, Next, and Restart are `<button>` elements.
  - Feedback is a container with `role="status"` / `aria-live="polite"` and a heading that receives focus after Submit.
  - Restart confirmation uses a native `<dialog>`.
  - The SVG has `role="img"` and an `aria-labelledby` text summary.
  - Packet motion uses CSS transitions, disabled under `@media (prefers-reduced-motion: reduce)`.
  - Feedback text renders before the animation starts.
- **Rationale**: Constitution IV and FR-016/017. Native controls give keyboard behavior for free.
- **Alternatives considered**: custom div-based choice cards need ARIA work for no gain.

## R9 · Level 2 reveal

- **Decision**: a per-round flag `revealed` is set by the first graded submission (correct or incorrect) and stays true until the round ends. When `showAnnouncements` is false (Level 2), the IXP route table renders only once `revealed` is true.
- **Rationale**: this was the clarify answer (2026-11-17).
- **Alternatives considered**: revealing only after a correct answer was rejected in clarify.
