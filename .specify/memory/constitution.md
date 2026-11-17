# Exchange Hall Constitution

## Core Principles

### I. Technical Truth Is a Release Requirement

- The game MUST NOT reward a technically incorrect answer.
- Grading MUST be reproducible from a documented rule and the challenge inputs.
- Unsupported or ambiguous content is an authoring error. The game MUST show that the
  challenge is unavailable and MUST NOT grade it.
- The taught model MUST be documented. It is vendor-neutral IPv4 BGP at one IXP with one
  route server (RFC 7947). Peers export only their own and their customers' prefixes;
  exporting provider or other-peer routes is a route leak (RFC 7908 §3). The router forwards
  on the longest matching prefix (RFC 1812 §5.2.4.3). For equal-length prefixes, peer routes
  are preferred over transit via LOCAL_PREF (RFC 4271 §9.1.1). That preference is an
  operator policy, not a protocol rule, and MUST be presented as such.
- Excluded from the model: AS_PATH length and later tie-breaks, MED, communities, RPKI/IRR
  filtering, bilateral-only sessions, multiple route servers, IPv6, outages, and traffic
  engineering.
- Simplifications MUST appear in the briefing and README wherever they affect what the
  player can conclude. Fictional worlds and animations MAY illustrate a rule but MUST NOT
  change it.

**Evidence:** hand-checked correct, incorrect, and boundary cases; a source link and section
for each networking rule; review of all shipped briefings and explanations. Expected results
are recorded independently of the implementation under test.

### II. Every Round Teaches Through a Decision

- The player's main action (choosing a packet's exit) MUST exercise the target skill.
- A concept MUST be introduced before it is tested, and every value needed to reason about
  the answer MUST be shown.
- A wrong answer MUST explain the specific mistake and give a useful next step. A correct
  answer MUST explain why it works.
- Learning sequence:
  1. Peering through the route server: traffic goes directly to the member, not through the
     route server or the whole IXP.
  2. Peers carry only their own and their customers' prefixes.
  3. The longest matching prefix wins before the peering preference applies.
- Hints MUST reveal a method first, then a worked step.
- Worked solutions MUST be available to a stuck learner. Viewing one MUST be recorded as
  assistance, never as independent mastery.

**Evidence:** a teammate can connect each player action to a learning outcome and describe
what they learned from a deliberately wrong choice.

### III. Progress Is Honest and Retry Is Safe

- A round MUST complete only on a valid, correct submission. Incorrect answers MUST keep the
  challenge available.
- Empty or malformed submissions MUST give input guidance and MUST NOT count as an attempt.
- Repeated Submit actions MUST NOT award progress twice.
- Version 1 has no lives, countdown, or speed bonus. Hints and retries carry no penalty.
- Completed rounds, attempts, and assistance MUST be shown separately. Completion is not
  proof of independent mastery.
- The specification MUST state exactly what advances a round, finishes a level, and resets
  a session.

**Evidence:** wrong-answer, repeated-submit, hint, completion, and reset checks match the
specification.

### IV. Access Is Part of the Core Game

- All core actions MUST be usable by keyboard, with visible focus, readable labels, and an
  understandable order.
- Success and failure MUST be explained with text as well as color.
- Essential diagrams MUST have a text equivalent.
- Reduced-motion preferences MUST be respected. Animation MUST NOT delay feedback or
  controls.
- The challenge MUST stay usable on a typical laptop and in a narrow browser window. Dense
  technical data MAY scroll inside its own labeled container but MUST NOT hide action
  buttons.

**Evidence:** a keyboard-only playthrough, a narrow-window check, and a reduced-motion
check. Record what was actually checked; do not claim full accessibility certification.

### V. Deterministic and Self-Contained First Version

- Version 1 ships authored content and deterministic domain logic.
- The game MUST NOT require an account, backend, live device connection, model, or API key.
- AI MAY help write code and assets during development. Its output receives the same review
  as any other contribution.
- Runtime AI tutoring, generated questions, and free-text AI grading are stretch work. Any
  of them requires an explicit change to this constitution, the specification, and the
  verification approach before implementation.

**Evidence:** a clean browser session can play using only the project's static files; no
external content service decides an answer.

### VI. Content and Logic Are Reviewed Separately

- Level content, hints, sources, and difficulty MUST live in editable data.
- Domain rules MUST stay separate from rendering and progress tracking.
- Data MUST be validated before a challenge is presented.
- Feedback MUST agree with the evaluator's reasoning. A hand-authored answer key MUST NOT
  silently override the rule engine.
- A new challenge that uses the existing mechanic MUST need only a data change and its
  checks. It MUST NOT need a new scoring path or screen implementation.

**Evidence:** inspect one level's data, trace one answer through the evaluator, and add a
trial challenge without modifying the rule engine.

### VII. Done Is Demonstrated

- Only the agreed scope ships.
- Requirements, plan, tasks, and README MUST describe the same game.
- A feature is complete when its acceptance criteria pass and its actual status is recorded.
  A screenshot, a checked task box, or an agent saying "done" is not enough on its own.
- When time is short, reduce scope explicitly. Fix incorrect teaching and broken core
  interactions before adding visual effects.
- Failed and untested checks MUST stay visible.

**Evidence:** reproducible run/test commands, recorded verification results, a fresh-start
playthrough, and a README another attendee can follow.

## Scope and Technical Model

**Purpose:** help networking beginners predict how traffic leaves a network that is
connected to an Internet Exchange Point (IXP). The player chooses the exit each packet takes:
an IXP peer or the transit provider.

**First release budget:** one core mechanic, three short levels, runs in a browser, and is
built in a 60-minute workshop session. This budget changes only through an agreed update to
the scope.

Addresses and AS numbers MUST come from documentation and benchmark ranges (RFC 5737,
RFC 5398, RFC 2544).

## Development Workflow and Quality Gates

- The work follows the Spec Kit flow: constitution → specify → clarify → plan → tasks →
  analyze → implement.
- Grading questions and scope questions MUST be resolved during clarify, before planning.
- Each implementation slice MUST show its listed evidence before the next slice starts.
- Pure domain rules MUST be proven by independent expected results before any UI is built.
- Every acceptance criterion MUST have a result recorded as pass, fail, or not run, with the
  date, environment, and evidence.

## Governance

- This constitution overrides other project practices. Conflicts are resolved openly. The
  build agent MUST NOT weaken a principle just to make its implementation pass.
- Any material change MUST record its reason, update the affected spec and plan, and rerun
  `/speckit-analyze`.
- Versioning follows semantic versioning:
  - MAJOR: a principle is removed or redefined.
  - MINOR: a principle or section is added or materially expanded.
  - PATCH: clarifications and wording only.
- Plans and reviews MUST check compliance through the plan template's Constitution Check
  gate.

**Version**: 1.0.0 | **Ratified**: 2026-11-17 | **Last Amended**: 2026-11-17
