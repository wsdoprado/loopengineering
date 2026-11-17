# Implementation Plan: Exchange Hall — IXP Peering Game (First Playable)

**Branch**: `001-ixp-exchange-hall` | **Date**: 2026-11-17 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-ixp-exchange-hall/spec.md`, plus the design contract in the root `PLAN.md`

## Summary

Exchange Hall is a static browser game. A beginner chooses which exit a packet takes from Lagoa Fiber (AS64500): an IXP peer, the Route Server (always wrong), or the GlobalTransit provider. There are 3 levels with 2 rounds each.

The technical approach separates three parts:
- a **pure rule engine** that derives the routes each peer announces (own + customer cone), applies longest prefix match, then applies LOCAL_PREF 200 for peers over 100 for transit;
- **authored JSON content**, validated as a whole before play starts;
- a **thin DOM/SVG view** with an in-memory session state machine.

The rule engine is proven first, using hand-checked cases in a dependency-free browser test runner. Only after that is the UI built on top of it.

## Technical Context

**Language/Version**: HTML5, CSS3, JavaScript (ES2020 native modules)

**Primary Dependencies**: None. No framework, bundler, or runtime library. Inline SVG is used for the topology.

**Storage**: Authored content in `data/levels.json`, fetched over HTTP with a relative URL. Session state lives in memory only; reloading starts fresh (FR-019).

**Testing**: A dependency-free browser test runner (`tests/index.html`) running ES-module test files. Manual checklists cover keyboard use, narrow windows, and reduced motion.

**Target Platform**: Current evergreen desktop browsers (Chromium, Firefox, Safari), served by any static HTTP server. The local server is `python3 -m http.server`. Hosting under a subpath such as GitHub Pages must also work.

**Project Type**: Static single-page web game (frontend only)

**Performance Goals**: Feedback appears with no perceptible delay after Submit. Packet animation is at most 1 s and never blocks controls (FR-017). Checked manually in T039.

**Constraints**:
- No backend, account, network service, or AI at runtime (FR-018).
- Works offline once served.
- Keyboard-complete, and respects `prefers-reduced-motion`.
- Usable down to a 360 px wide viewport.
- English-only text (FR-021).
- Relative, case-correct asset paths.

**Scale/Scope**: 3 levels × 2 rounds, about 10 small source modules, one content file of about 15 KB, and 1 player per session.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Pre-design | Post-design |
|-----------|------|------------|-------------|
| I. Technical truth | Grading comes from a documented rule. Unsupported or ambiguous content is a content error, never graded. Each rule cites an RFC section. Simplifications appear in the briefing and README. | PASS. The rule and its RFC citations are in spec §Technical model. | PASS. `evaluate()` returns `content-error` for tied peers and unmatched destinations. The `sources` records are required by validation ([contracts/levels-schema.md](./contracts/levels-schema.md)). |
| II. Teach through a decision | Main action = choose an exit. Briefing comes before the test. Wrong answers name the misconception. Hints: method first, then worked solution, recorded as assistance. | PASS | PASS. Reason codes map 1:1 to the FR-006 misconceptions ([contracts/evaluate.md](./contracts/evaluate.md)). There are two hint tiers per round. |
| III. Honest progress | Only a valid correct submission completes a round. No selection is not an attempt. No double award. No lives or timer. Rounds, attempts, and assistance are shown separately. | PASS | PASS. The state transitions are defined in [contracts/session-state.md](./contracts/session-state.md) and guarded in state logic, not only in the UI. |
| IV. Access | Keyboard use, visible focus, text and color, text equivalent for the diagram, reduced motion, narrow window. | PASS | PASS. Exits use native radio buttons. Feedback uses an `aria-live` region. The route table is a real `<table>`. The SVG has a text summary. |
| V. Deterministic, self-contained | No account, backend, model, or API key. | PASS | PASS. Static files only. The evaluator is pure. |
| VI. Content separate from logic | Content lives in data and is validated before play. There is no answer key. A new round needs only data. | PASS | PASS. `levels.json` has no answer field. The evaluator computes the exit. |
| VII. Done is demonstrated | Every acceptance criterion gets a pass/fail/not-run record. README run and test commands are reproducible. | PASS | PASS. [quickstart.md](./quickstart.md) defines the validation scenarios. Results are recorded in the README. |

No violations, so Complexity Tracking is empty.

## Project Structure

### Documentation (this feature)

```text
specs/001-ixp-exchange-hall/
├── plan.md              # This file
├── research.md          # Phase 0 decisions
├── data-model.md        # Phase 1 entities, validation, state
├── quickstart.md        # Phase 1 run + validation guide
├── contracts/
│   ├── evaluate.md      # Rule-engine function contract + reason codes
│   ├── levels-schema.md # data/levels.json content contract
│   └── session-state.md # Session state machine contract
├── checklists/
│   └── requirements.md  # Spec quality checklist
└── tasks.md             # Phase 2 output (/speckit-tasks, not created here)
```

### Source Code (repository root)

```text
index.html                   Semantic page shell and module entry point
style.css                    Layout, focus, feedback states, reduced motion, narrow layout
main.js                      Load → validate → start; loading and content-error screens
engine/
  ipv4.js                    Parse IPv4/CIDR, reject host bits, containment, prefix length
  rules.js                   Pure evaluate(): customer-cone export, LPM, LOCAL_PREF, reason codes
  content.js                 Whole-file validation of levels.json with level/round IDs in errors
  state.js                   Session state machine: attempts, assistance, completion, restart
  feedback.js                Turn evaluation results into English explanation text
ui/
  render.js                  Briefing, topology SVG + text summary, route table, feedback, summary
  controls.js                Radio/submit/hint/next/restart events, focus management
data/
  levels.json                Sources, 3 levels × 2 rounds, briefings, hints
tests/
  index.html                 Browser test runner: totals, failed case IDs, zero-tests = fail
  runner.js                  Minimal test()/assertEqual harness
  ipv4.test.js               Parsing, host-bit rejection, boundary containment
  rules.test.js              Every spec reference case, from hand-checked expectations
  state.test.js              Attempts, no-selection, duplicate submit, hints, level/summary, restart
  content.test.js            Tied peers, unmatched destination, bad CIDR, unknown refs, cycles
  feedback.test.js           Every reason code → English text with values and source IDs
README.md                    Run/test commands, model + exclusions, verification record
```

**Structure Decision**: single static frontend at the repository root, as the root `PLAN.md` requires. `engine/` holds pure, DOM-free modules that the browser test runner can test. `ui/` holds the only DOM code. `data/` holds the only authored content. There are no `src/` or `backend/` directories.

## Implementation Slices

| Slice | Deliverable | Evidence before the next slice |
|-------|-------------|--------------------------------|
| 1 · Prove the rule | `ipv4.js`, `rules.js`, runner, `ipv4.test.js`, `rules.test.js` | All spec reference cases pass at `/tests/` |
| 2 · Complete one round | `index.html`, `main.js`, `state.js`, `feedback.js`, `render.js`, `controls.js`, L1R1 data | L1R1 right and wrong paths work in the browser |
| 3 · Add the curriculum | All 6 rounds, `content.js` + tests, hints, Level 2 reveal, summary | Every round matches its reference case. The content tests pass |
| 4 · Make it usable | Focus order, live region, reduced motion, 360 px layout, error screens | Manual checks recorded |
| 5 · Package | README with run/test commands, model, exclusions, AC results | A fresh-clone run works by following the README |

## Complexity Tracking

No constitution violations. Nothing to justify.
