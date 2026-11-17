---

description: "Task list for Exchange Hall — IXP Peering Game (First Playable)"
---

# Tasks: Exchange Hall — IXP Peering Game (First Playable)

**Input**: Design documents from `/specs/001-ixp-exchange-hall/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: REQUIRED. The spec lists hand-checked reference cases, Constitution I/VII require independent expected results, and plan.md defines a browser test runner. Test tasks come before the implementation they check. Expected values are literals from [contracts/evaluate.md](./contracts/evaluate.md), never computed by `evaluate()`.

**Organization**: grouped by user story. All three stories are P1. They are ordered US1 → US2 → US3 because US2 and US3 build on the playable round from US1.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on an unfinished task)
- **[Story]**: US1, US2, US3 from spec.md
- Paths are relative to the repository root (a single static frontend, per plan.md)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: project skeleton and the test harness.

- [X] T001 Create the directories `engine/`, `ui/`, `data/`, `tests/` at the repository root, per the plan.md Project Structure
- [X] T002 [P] Create the minimal test harness in `tests/runner.js`. Export `test(id, fn)`, `assertEqual(actual, expected, msg)`, `assertDeepEqual`, and `run()`, which returns `{passed, failed: [ids], total}`. Zero registered tests MUST count as a failure (research.md R7)
- [X] T003 [P] Create `tests/index.html`. It imports `runner.js` and every `*.test.js` as ES modules, then renders the totals, a PASS/FAIL banner, and the failed test IDs in the page. Use the relative paths `./runner.js` etc.
- [X] T004 [P] Create `README.md` with the project name, a one-line purpose, and the run and test commands from quickstart.md (`python3 -m http.server 8000 --bind 127.0.0.1`, `/`, `/tests/`). Add a note that `file://` is not supported

**Checkpoint**: `/tests/` loads and shows FAIL, because zero tests are registered.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: prove the rule (plan slice 1), then validate and load the content. Every story depends on this phase.

**⚠️ CRITICAL**: no UI work starts until T005–T015 pass at `/tests/`.

### Tests first

- [X] T005 [P] Write `tests/ipv4.test.js` covering:
  - `parseIPv4('198.18.2.50')`;
  - rejection of `256.1.1.1` and `1.2.3`;
  - `parseCIDR` rejecting host bits in `198.18.1.0/22` and lengths outside /8–/32 (data-model.md `Network.prefixes`, `Transit.routes`);
  - containment boundaries: `198.18.2.255` ∈ `198.18.2.0/24`, `198.18.3.0` ∉ `198.18.2.0/24`, `198.18.3.0` ∈ `198.18.0.0/22`, `198.18.4.0` ∉ `198.18.0.0/22`, `198.18.4.0` ∈ `198.18.0.0/15`.
- [X] T006 [P] Write `tests/rules.test.js` with one test per row of the "Reference expectations" table in contracts/evaluate.md: 16 graded rows, plus `no-selection`, `tied-peers`, and `unmatched-destination`. Each test asserts `status` and `reasonCode`, and for correct rows also `expected.exitId` and `expected.prefix`. Build the challenge fixtures inline from the spec's Version-one content table. Use literal expectations only
- [X] T007 [P] Write `tests/content.test.js`. A valid minimal document passes. Each of these is rejected with an `at` path naming the level or round:
  - a duplicate round ID;
  - an ASN of 65000 (data-model.md `Network.asn`);
  - the host-bit CIDR `198.18.1.0/22` (data-model.md `Network.prefixes`);
  - an unknown relationship ID, or a provider/customer cycle (data-model.md `Relationship.provider`, `Relationship.customer`);
  - `choices` missing `rs` or the transit ID (data-model.md `Challenge.choices`);
  - an unresolved `sourceIds` entry (data-model.md `Source.id`);
  - `hints` not exactly `[method, worked]` (data-model.md `Round.hints`);
  - `peerLocalPref <= transit.localPref` (data-model.md `Challenge.peerLocalPref`, `Transit.localPref`);
  - tied peers;
  - an unmatched destination.

### Implementation

- [X] T008 Implement `engine/ipv4.js`: `parseIPv4`, `parseCIDR` (returns `{network, length, mask}` or throws a descriptive error), `contains(cidr, addr)`, and `formatIPv4`, using unsigned 32-bit arithmetic (research.md R2). Make T005 pass
- [X] T009 Implement `deriveRoutes(challenge)` in `engine/rules.js`. It builds the customer cone for each `atIxp` network by following `relationships` from provider to customer (data-model.md `Relationship`, `Network.atIxp`). It emits IXP routes with `localPref = challenge.peerLocalPref` and `origin`, plus transit routes with `transit.localPref` (contracts/evaluate.md steps 1–2)
- [X] T010 Implement `evaluate(challenge, answer)` in `engine/rules.js`, following contracts/evaluate.md: match, longest prefix match, LOCAL_PREF, `content-error` (`unmatched-destination`, `tied-peers`), `invalid-input` (`no-selection`, `unknown-choice`), and the 8 ordered `incorrect` reason codes. Fill in `evidence.candidates`, `longestLength`, and `chosen`. The function must stay pure: no DOM or global state. Make T006 pass
- [X] T011 Implement `validateContent(doc)` in `engine/content.js`. It applies every rule in contracts/levels-schema.md "Field rules" (canonical constraints: data-model.md `Source.id`, `Level.id`, `Level.rounds`, `Round.id`, `Round.hints`, `Network.id`, `Network.asn`, `Network.prefixes`, `Relationship.provider`, `Relationship.customer`, `Transit.routes`, `Transit.localPref`, `Challenge.peerLocalPref`, `Challenge.choices`, `Challenge.destination`). It calls `evaluate(challenge, {exitId: null})` per round to catch `tied-peers` and `unmatched-destination`. It returns every error as `{at, message}`, not just the first. Make T007 pass
- [X] T012 Create `data/levels.json`, schema version 1, with the `sources` records:
  - `rfc7947-s1`, `rfc7947-s2.2.1`;
  - `rfc7908-s2`, `rfc7908-s3.2`, `rfc7908-s3.3`;
  - `rfc1812-s5.2.4.3`;
  - `rfc4271-s5.1.5`, `rfc4271-s9.1.1`;
  - `rfc5737-s3`, `rfc5398-s4`, `rfc2544-c2.2`.

  Use the URLs and claims from the spec's Authoritative references (data-model.md `Source`).
- [X] T013 Add Level 1 to `data/levels.json`: the briefing (terms IXP, member, peering, transit, route server, prefix announcement; a worked example unlike L1R1/L1R2), plus rounds L1R1 and L1R2 with the exact values from the spec's Version-one content table. Each round has a method hint and a worked hint, and `choices` include `rs` and `globaltransit` (data-model.md `Challenge`, `Round.hints`)
- [X] T014 Implement `main.js`. It fetches `data/levels.json` with a relative URL and runs `validateContent`. On errors it renders a content-error view listing each `at`/`message`, with a Retry button. On success it hands the document to the UI (stub for now). Loading and fetch failures show a message plus Retry and never count as attempts (spec Edge Cases)
- [X] T015 Add an integration test to `tests/content.test.js` that fetches `../data/levels.json` and asserts `validateContent` returns `[]`

**Checkpoint**: `/tests/` is all green. The rule is proven independently of the UI (plan slice 1 evidence).

---

## Phase 3: User Story 1 - Make and understand an exit decision (Priority: P1) 🎯 MVP

**Goal**: a learner reads a briefing, inspects one round's topology and routes, chooses an exit, submits, and gets a specific explanation. A wrong answer keeps the round open; a correct one enables Next.

**Independent Test**: fresh load, then L1R1. Submit Route Server (incorrect, round stays open), then CampusNet (wrong-peer feedback), then StreamCo (correct, explanation names `198.51.100.0/24` and LOCAL_PREF 200 > 100). Also run L3R1 with StreamCo, then GlobalTransit (quickstart V2–V8).

### Tests for User Story 1

- [X] T016 [P] [US1] Write `tests/state.test.js` (part 1) against contracts/session-state.md:
  - `select` does not count an attempt;
  - `submit` with no selection sets guidance and leaves attempts at 0 (data-model.md `RoundProgress.attempts`);
  - an incorrect submit adds 1 attempt and sets `revealed = true` (data-model.md `RoundProgress.revealed`);
  - a correct submit sets `solved`;
  - a second submit after solving changes nothing.
- [X] T017 [P] [US1] Write `tests/feedback.test.js`. For every reasonCode in contracts/evaluate.md, `explain(result, challenge)` returns non-empty English text that contains the destination and the decisive prefix(es), and cites a source ID. For `peer-prefix-does-not-contain-destination` it MUST name the chosen peer's prefixes and include the method hint "find the prefix that contains the address" (FR-006). For `rs-not-in-forwarding-path` it MUST cite `rfc7947-s1`. Add the file to `tests/index.html`

### Implementation for User Story 1

- [X] T018 [US1] Implement the session core in `engine/state.js`: `initialState(doc)`, `start`, `select`, and `submit` (calls `evaluate`, applies the counting rules in contracts/session-state.md, sets `revealed` on any graded submission, and sets `guidance` on `invalid-input`), and `canSubmit`. Fields: data-model.md `Session`, `RoundProgress`. Make T016 pass
- [X] T019 [P] [US1] Implement `explain(result, challenge, doc)` in `engine/feedback.js`. It maps each reasonCode and its `evidence` to English text:
  - observed choice → rule → values → next step;
  - for correct answers, why it works, naming the matching prefixes, the longest length, and the LOCAL_PREF applied;
  - the citations it returns are source IDs.

  Make T017 pass.
- [X] T020 [P] [US1] Create `index.html`: a semantic shell with `<header>` (title "Exchange Hall", Restart button), `<main>` regions for the briefing, challenge (topology + route table), exit `<fieldset>`, actions (Submit, Hint, Next), and feedback (`role="status"`, `aria-live="polite"`), and `<script type="module" src="main.js">`. All paths relative
- [X] T021 [P] [US1] Create `style.css`. Layout puts the challenge first, then actions, with the explanation beside it on a wide screen and below it on a narrow one. Add distinct correct and incorrect styles that also carry a text label, and a visible `:focus-visible` outline
- [X] T022 [US1] Implement the briefing and round rendering in `ui/render.js`:
  - `renderBriefing(level)`: paragraphs, term list, worked example, source links;
  - `renderTopology(challenge, state)`: an inline SVG "exchange hall" with an IXP switch, member gates labeled with name, ASN and prefixes, the route server as a desk joined by dashed control lines, and the transit road. It has `role="img"` and an `aria-labelledby` text summary;
  - `renderRouteTable(routes, state)`: a `<table>` with prefix, length, exit, source, LOCAL_PREF, and destination-match column. IXP rows are hidden when `showAnnouncements` is false and `revealed` is false (FR-002, research.md R9);
  - `renderChoices`;
  - `renderFeedback(result, text)`: shows the explanation plus links to the cited RFC sections, resolved from the source IDs returned by `explain()` (FR-014).
- [X] T023 [US1] Implement `ui/controls.js`: wire the radio `change` event to `select`, Submit to `submit`, and Next to `next` (stub until US2). After Submit, re-render and move focus to the feedback heading. Disable Submit when `!canSubmit`
- [X] T024 [US1] Implement the packet path display in `ui/render.js` (FR-022). On a graded submission, the packet moves along the chosen path: across the switch to the member gate, down the transit road, or to the route-server desk. At the desk it stops and shows a note: "The route server only hands out routes. Packets go directly to a member's router." Until the round is solved, neither the path nor the note may name or highlight the correct exit (Constitution II/III). Feedback text renders before the animation starts, and controls are never disabled by the animation (FR-017)
- [X] T025 [US1] Replace the `main.js` stub so a valid document renders the L1 briefing, and Start opens L1R1 via `ui/render.js` and `ui/controls.js`
- [X] T026 [US1] Add Level 2 to `data/levels.json`. The briefing covers customer, provider, peer relationships and the export rule, with a worked example unlike L2R1/L2R2. Rounds L2R1 and L2R2 use the exact spec values: `showAnnouncements: false`, SchoolNet as CampusNet's customer, BigCarrier as StreamCo's provider (data-model.md `Relationship`, `Challenge.showAnnouncements`). Each round has two hints
- [X] T027 [US1] Add Level 3 to `data/levels.json`. The briefing covers longest prefix match and LOCAL_PREF as Lagoa Fiber's policy (FR-015) and lists the model's exclusions, with a worked example unlike L3R1/L3R2. Rounds L3R1 and L3R2 use the exact spec values: transit `198.18.0.0/15`, `198.18.0.0/22`, `198.18.2.0/24`, and CloudNine labeled `atIxp: false`. Each round has two hints
- [X] T028 [US1] Run `/tests/` (T015 must still pass with all 6 rounds). Then follow quickstart V2–V8 and V21 (no answer leak) in the browser and note the results for T045

**Checkpoint**: one complete round loop works for every round. This is the MVP (plan slice 2 evidence).

---

## Phase 4: User Story 2 - Learn from help and finish the game (Priority: P1)

**Goal**: hints, then worked solution, recorded as assistance; honest attempts; level progression; session summary; confirmed restart.

**Independent Test**: fresh start to summary. Use Hint twice on one round, give one wrong answer, press Submit twice after a correct answer, then Restart → Cancel and Restart → Confirm. Compare the counters (quickstart V9–V12).

### Tests for User Story 2

- [X] T029 [P] [US2] Extend `tests/state.test.js` (part 2):
  - `hint` increments `hintsShown` up to 2 and never sets `solved` (data-model.md `RoundProgress.hintsShown`);
  - `next` while unsolved changes nothing;
  - `next` goes from round 0 to round 1, from the last round of L1/L2 to the next briefing, and from L3R2 to the summary;
  - summary totals report rounds completed out of 6, total attempts, and rounds with assistance, separately;
  - `restart` sets `restartPending` (data-model.md `Session.restartPending`);
  - `cancelRestart` keeps everything;
  - `confirmRestart` returns a fresh state on the L1 briefing.

### Implementation for User Story 2

- [X] T030 [US2] Implement `hint`, `next`, `restart`, `confirmRestart`, `cancelRestart`, and `summary(state, doc)` in `engine/state.js`, per contracts/session-state.md. Make T029 pass
- [X] T031 [US2] Render hints in `ui/render.js`. The first press shows the method hint, the second shows the worked solution labeled "Worked solution (counts as assistance)". The current round shows an "assistance used" indicator in text
- [X] T032 [US2] Render the session summary view in `ui/render.js`: rounds completed out of 6, valid attempts, and rounds where assistance was used, as separate labeled values, plus a per-round list. Add the text "Completion is not proof of independent mastery" (Constitution III)
- [X] T033 [US2] Wire Hint, Next, and Restart in `ui/controls.js`. Restart opens a native `<dialog>` with Confirm and Cancel. Next moves focus to the new view's heading. Add the `<dialog>` markup to `index.html`
- [X] T034 [US2] Run `/tests/`, then quickstart V9–V12 in the browser, and note the results for T045

**Checkpoint**: full playthrough from briefing to summary with honest counters (plan slice 3 evidence).

---

## Phase 5: User Story 3 - Play with accessible controls (Priority: P1)

**Goal**: keyboard-complete play, announced text feedback, reduced motion, and a narrow-window layout.

**Independent Test**: quickstart V13–V16: keyboard-only run to the summary, screen reader announcement, OS reduce-motion setting, 360 px viewport.

### Implementation for User Story 3

- [X] T035 [P] [US3] Check and fix the focus order in `index.html` and `ui/controls.js`: briefing → Start; topology summary → route table → exit radios → Submit → Hint → Next → Restart. Every control gets an accessible name (exits: "StreamCo, AS64502, IXP peer"; the Route Server: "Route Server, AS64504"). No positive `tabindex`
- [X] T036 [P] [US3] In `style.css`, add `@media (prefers-reduced-motion: reduce)` that disables packet transitions so the final position shows immediately. Make sure no information is shown only by motion (FR-017)
- [X] T037 [P] [US3] In `style.css`, make the layout narrow-friendly. At ≤ 600 px, use a single column. The route table goes in a labeled `role="region"` container with `overflow-x: auto` and `tabindex="0"`. Action buttons stay visible without horizontal page scroll down to 360 px
- [X] T038 [US3] In `ui/render.js`, make the feedback state its result in words ("Correct." / "Not this time.") before the explanation. Feedback must stay until the next graded submission or Next; selecting a different exit must not clear it (spec US3-2). Keep the topology text summary in sync with the reveal and with the packet result
- [ ] T039 [US3] Run quickstart V13–V16, plus V19 (reload starts a fresh session, FR-019). Also check the plan's performance goals: feedback appears with no perceptible delay after Submit, and the packet animation lasts at most 1 s. Note the results for T045

**Checkpoint**: access checks recorded (plan slice 4 evidence).

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T040 [P] Review every briefing, hint, and feedback template against its cited RFC section (Constitution I, SC-006). Confirm all player-facing text is English (FR-021). Record each source checked in `README.md`
- [X] T041 [P] Run quickstart V17: in a temporary copy of `data/levels.json`, give CampusNet `198.51.100.0/24` and confirm the content-error screen names the round. Then restore the original file
- [X] T042 [P] Run quickstart V18: in the DevTools Network panel during a full run, confirm only same-origin requests (SC-005)
- [X] T043 Prove the content-only extension (Constitution VI, SC-007): temporarily add a trial round to `data/levels.json`, confirm it validates and plays without touching `engine/`, then remove it. Record the result in `README.md`
- [X] T044 Complete `README.md`: what the game teaches; the technical model, with Lagoa Fiber's peer-over-transit policy stated as policy and the exclusions list; the run and test commands; the file layout; how to add a round
- [X] T045 Add a "Verification" section to `README.md` that records pass, fail, or not run, with the date and browser, for each spec acceptance scenario (US1-1…5, US2-1…4, US3-1…4) and quickstart V1–V21. Include the teammate playtest (V20): time to reach the summary (SC-001) and whether, after a deliberate wrong choice in each level, the playtester can name the rule they missed (SC-003). Keep failures and untested checks visible (Constitution VII)
- [X] T046 Fresh-clone check: from a clean checkout, follow `README.md` exactly and confirm the game and `/tests/` both work

---

## Dependencies & Execution Order

### Phase dependencies

- **Setup (Phase 1)**: no dependencies.
- **Foundational (Phase 2)**: depends on Setup. T005–T007 run before T008–T011. T012–T013 before T014–T015. This phase blocks all stories.
- **US1 (Phase 3)**: depends on Foundational. This is the MVP.
- **US2 (Phase 4)**: depends on US1 (it extends `engine/state.js`, `ui/render.js`, and `ui/controls.js`).
- **US3 (Phase 5)**: depends on US1. It can run alongside US2 if different people own `style.css` and `ui/render.js`. T038 touches `ui/render.js`, so coordinate it with T031–T032.
- **Polish (Phase 6)**: depends on US1–US3.

### Task dependencies

```text
T001 → T002, T003, T004
T005 → T008 ; T006 → T009 → T010 ; T007 → T011 (needs T010)
T012 → T013 → T014 → T015
T016 → T018 ; T017 → T019
T018, T019, T020, T021 → T022 → T023 → T024 → T025 → T026 → T027 → T028
T029 → T030 → T031 → T032 → T033 → T034
T035, T036, T037 → T038 → T039
T040–T043 → T044 → T045 → T046
```

## Parallel Execution Examples

**Phase 1**: T002, T003, and T004 together, all in different files.

**Phase 2 (tests first)**:

```text
T005 tests/ipv4.test.js
T006 tests/rules.test.js
T007 tests/content.test.js
```

**US1**: T016 + T017 (tests), then T019 + T020 + T021 alongside T018.

**US3**: T035 (markup/controls) + T036 (motion CSS) + T037 (layout CSS). T036 and T037 both edit `style.css`, so assign them to one person or merge them carefully.

**Polish**: T040, T041, and T042 in parallel.

## Implementation Strategy

### MVP first

1. Phases 1–2: the rule is proven at `/tests/`. **Stop and check:** do all reference cases pass?
2. Phase 3 (US1): a playable round loop for all six rounds. **Stop and check:** quickstart V2–V8.
3. Demo it. This is already a teaching tool.

### Incremental delivery

4. US2: hints, progression, summary, restart (V9–V12).
5. US3: access checks (V13–V16).
6. Polish: source review, content-only extension proof, README with verification record.

### If time runs short (Constitution VII)

Cut animation polish (T024 motion details, T036 still required) before anything else. Never cut T006, T010, T011, or T045. Reduce scope explicitly in spec.md and in this file rather than silently.

## Notes

- Expected results in tests are literals from contracts/evaluate.md. Never generate them by calling `evaluate()`.
- `data/levels.json` never contains a correct-answer field.
- Commit after each checkpoint.
