# Feature Specification: Exchange Hall — IXP Peering Game (First Playable)

**Feature Branch**: `001-ixp-exchange-hall`

**Created**: 2026-11-17

**Status**: Draft

**Input**: User description: "Please refer to the SPEC.md file and build the specification" (source: `SPEC.md` at the repository root)

## Overview

Exchange Hall is a short browser game for networking beginners about Internet Exchange Points (IXPs). The player is the new on-call engineer at Lagoa Fiber (AS64500), a small regional ISP. Lagoa Fiber has just joined an IXP and also buys transit from GlobalTransit (AS64510).

Each round shows:
- the IXP members;
- what each member announces, or the business relationships that decide what it announces;
- the transit routes;
- one destination IP address.

The player chooses the exit the router will use for the packet. A correct choice shows the packet travelling the chosen path, with an explanation. An incorrect choice shows where the packet stops, which rule was missed, and the values that prove it. The session ends when all six rounds in three levels have a correct submission and the session summary appears.

### Technical model being taught

For a destination address D:

1. List every route the router has: IXP peer routes plus transit routes.
2. Keep only the routes whose prefix contains D.
3. Keep only the longest of those prefixes.
4. If both an IXP peer route and a transit route remain for that prefix, use the peer route. Lagoa Fiber's policy gives peers LOCAL_PREF 200 and transit LOCAL_PREF 100.

The exit is the network that announced the winning route. An IXP peer announces only its own prefixes and its customers' prefixes.

- **Context**: vendor-neutral IPv4 BGP; one IXP with one route server (multilateral peering); one transit provider that sends a full table.
- **Assumptions given to the learner**:
  - All sessions are up.
  - Every IXP member peers with the route server.
  - The route server does not change the next hop, so traffic goes directly to the announcing member across the IXP switch.
  - Every destination in the game has at least one transit route.
- **Excluded**: AS_PATH length and later tie-breaks, MED, communities, RPKI/IRR filtering, bilateral-only sessions, multiple route servers, IPv6, outages, asymmetric return paths, traffic engineering.
- **Authoritative references**:
  - RFC 7947 §1: the route server does not forward traffic.
  - RFC 7947 §2.2.1: NEXT_HOP is passed unmodified.
  - RFC 7908 §2: definition of a route leak.
  - RFC 7908 §3.2 and §3.3: peers do not re-announce other peers' or providers' routes.
  - RFC 1812 §5.2.4.3: Longest Match.
  - RFC 4271 §5.1.5 and §9.1.1: LOCAL_PREF as degree of preference.
  - RFC 5737 §3, RFC 5398 §4, RFC 2544 §C.2.2: documentation and benchmark address and ASN ranges.

The briefing tells the learner that "prefer peers over transit" is Lagoa Fiber's policy, not a rule of BGP. It also says that real routers have more tie-breaks than the game models.

## Clarifications

### Session 2026-11-17

- Q: Which language should player-facing text use: briefings, feedback, hints and buttons? → A: English only.
- Q: In Level 2, should the game show the routes each peer really announces after the player answers? → A: Yes, after every graded submission (correct or incorrect), alongside the feedback.
- Q: Should the Route Server be offered as an exit in Levels 2 and 3, or only in Level 1? → A: In all levels, always as a selectable and always incorrect exit.
- Q: When the player picks an IXP peer that announces no prefix containing the destination, what should the feedback say? → A: Specific feedback that names the peer's announced prefixes and says none contains the destination, then a method hint to find the prefix that contains the address.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Make and understand an exit decision (Priority: P1)

As a networking beginner, I want to apply the forwarding rule to visible route evidence and understand why the packet leaves where it does.

The player reads a briefing, inspects the topology and route evidence for one destination, chooses an exit, submits, and reads an explanation. Wrong answers leave the round open for retry. Correct answers enable Next.

**Why this priority**: this is the core learning loop. Without it there is no game and no learning outcome.

**Independent Test**: play Level 1 Round 1 in a fresh session. Submit one wrong exit and then the correct one. Confirm the explanation, retry behavior, and completion each time.

**Acceptance Scenarios**:

1. **Given** a fresh session, **When** I start, **Then** I see the first briefing before any challenge.
2. **Given** Level 1 Round 1 (destination `198.51.100.25`; IXP routes `192.0.2.0/24` from CampusNet AS64501 and `198.51.100.0/24` from StreamCo AS64502; transit has every route), **When** I submit StreamCo, **Then**:
   - the round is marked complete;
   - the packet is shown crossing the IXP to StreamCo;
   - the explanation names the matching `/24` and the peer-over-transit preference.
3. **Given** that round, **When** I submit the Route Server, **Then**:
   - the feedback explains that the route server only distributes routes and does not forward traffic;
   - completion is unchanged;
   - I can retry.
4. **Given** any round with no exit selected, **When** I submit, **Then** input guidance appears and attempts and completion are unchanged.
5. **Given** Level 3 Round 1 (destination `198.18.2.50`; IXP `198.18.0.0/22` from StreamCo; transit `198.18.0.0/15`, `198.18.0.0/22`, `198.18.2.0/24`), **When** I submit StreamCo, **Then**:
   - the feedback says the longest matching prefix (/24, transit only) wins before the peer preference applies;
   - the round stays open.

---

### User Story 2 - Learn from help and finish the game (Priority: P1)

As a learner, I want help when I am stuck and a clear view of my progress through all six rounds.

**Why this priority**: honest progress and help are constitution requirements (Principles II and III). Without a summary, the session cannot end.

**Independent Test**: play from a fresh start to the session summary. Use a hint, view one worked solution, submit one wrong answer and one duplicate correct submission, then restart and cancel once. Compare the counters with the expected values.

**Acceptance Scenarios**:

1. **Given** an unsolved round, **When** I ask for a hint, **Then** the first hint explains the method. **When** I ask again, **Then** a worked solution is offered. Assistance is recorded, and the round is not marked complete.
2. **Given** an unsolved round, **When** I submit a valid answer, **Then** exactly one attempt is counted. **Given** a solved round, **When** I submit again, **Then** nothing changes.
3. **Given** both rounds of a level are solved, **When** I press Next, **Then** the next level's briefing opens. After the final round, Next opens a session summary showing completed rounds, attempts, and assistance separately.
4. **Given** a session in progress, **When** I press Restart and confirm, **Then** the session clears and the first briefing appears. **When** I cancel instead, **Then** the session is unchanged.

---

### User Story 3 - Play with accessible controls (Priority: P1)

As a keyboard user, I want to inspect the challenge, choose an exit, submit, get help, and advance without a mouse.

**Why this priority**: the constitution makes access part of the core game (Principle IV).

**Independent Test**: complete the core flow from briefing to summary using only the keyboard. Repeat with reduced motion turned on and in a narrow browser window.

**Acceptance Scenarios**:

1. **Given** any screen, **When** I navigate by keyboard, **Then** every core control is reachable, has visible focus, and has an accessible name.
2. **Given** a submission, **When** feedback appears, **Then**:
   - it is stated in text, not only color;
   - it stays readable until my next graded submission or until I press Next (selecting a different exit does not clear it);
   - it is announced to assistive technology.
3. **Given** reduced motion is preferred, **When** a packet path is shown, **Then** the final state appears without animation and no information is lost.
4. **Given** a narrow window, **When** I view a round, **Then** route tables may scroll inside their own labeled area, and action buttons stay visible.

---

### Edge Cases

- **Boundary addresses** (Level 3 tables):
  - `198.18.2.255` is the last address in `198.18.2.0/24`, so the exit is transit.
  - `198.18.3.0` is outside the /24 and inside the /22, so the exit is StreamCo.
  - `198.18.4.0` is outside the /22, so only transit's `/15` matches and the exit is transit.
- **Tied peers**: two IXP members announce the same winning prefix. This is invalid content (FR-013): play is blocked before it starts, the error names the level and round, and nothing is graded.
- **Unmatched destination**: a round's destination matches no route. This is invalid content (FR-013): play is blocked before it starts, the error names the level and round, and nothing is graded.
- **Invalid prefix**: a prefix has host bits set (for example `198.18.1.0/22`) or is otherwise invalid. The game shows a content error before play, naming the level and round.
- **Content fails to load**: an error screen appears with a retry option. Nothing counts as a learner attempt.
- **Repeated submit**: rapid repeated Submit after a correct answer adds no attempts and no completions.
- **Page reload**: the session starts fresh. This is expected behavior in v1.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The game MUST show a briefing before each level's first challenge. The briefing introduces that level's concept, its terms, and a worked example that differs from the challenges.
- **FR-002**: Each round MUST display, as text:
  - the destination IP;
  - each candidate route's prefix and length;
  - the announcing network and its AS number;
  - the route source (IXP or transit);
  - the LOCAL_PREF values.
  Level 2 MUST instead show the business relationships (provider/customer) and IXP membership, and MUST NOT show the IXP announcements before the first graded submission. After every graded submission, correct or incorrect, Level 2 MUST reveal the announcements each peer really makes, alongside the feedback, and they stay visible for the rest of that round. Input-guidance responses (no selection) do not reveal them.
- **FR-003**: The player MUST choose exactly one exit from that round's options: IXP members, the Route Server, and the transit provider. The Route Server MUST be among the options in every round of every level. The decision is made only through an explicit Submit.
- **FR-004**: The game MUST grade each submission using the documented rule in the Technical model section. That means own + customer export for peers, then longest prefix match, then peer over transit for equal-length prefixes.
- **FR-005**: The Route Server MUST never be a correct exit. Choosing it MUST produce feedback that it distributes routes but does not forward traffic.
- **FR-006**: Feedback for an incorrect answer MUST name the specific misconception. Supported misconceptions:
  - the route server forwards traffic (feedback as defined in FR-005);
  - a destination not announced at the IXP is assumed reachable there;
  - a peer's customer routes are ignored;
  - a peer is expected to carry its provider's routes;
  - peer preference is applied before longest match;
  - transit is chosen over an equal-length peer route;
  - an IXP peer is chosen whose announced prefixes do not contain the destination. The feedback names that peer's prefixes, states that none contains the destination, and gives the method hint "find the prefix that contains the address".
  The feedback MUST show the relevant values and give a next step.
- **FR-007**: Feedback for a correct answer MUST explain why it works. It MUST show the matching prefixes and the rule step that decided the result.
- **FR-008**: A submission with no exit selected MUST show input guidance and MUST NOT change attempts or completion.
- **FR-009**: Each valid submission on an unsolved round MUST count as one attempt. A correct submission MUST complete the round exactly once. Submissions after success MUST have no effect.
- **FR-010**: Hints MUST explain the method first. A further request MUST offer a worked solution. Any hint or solution viewed MUST be recorded as assistance and MUST NOT complete the round.
- **FR-011**: A level MUST complete when both of its rounds are solved. Next MUST open the following round or level. After the final round, Next MUST open a session summary that shows completed rounds, valid attempts, and assistance separately.
- **FR-012**: Restart MUST ask for confirmation. Confirming clears the session and returns to the first briefing. Cancelling leaves the session unchanged.
- **FR-013**: All level content MUST be validated before play begins. Invalid content is any of these:
  - missing fields or duplicate IDs;
  - invalid addresses or prefixes;
  - unknown references;
  - an unmatched destination;
  - tied peers.
  Any invalid content MUST block play before the first briefing, show a visible error naming each affected level and round, and never be graded.
- **FR-014**: Briefings and explanations MUST cite their source (RFC number and section) for each networking rule they state.
- **FR-015**: The game MUST state in plain language that "peer preferred over transit" is Lagoa Fiber's policy. It MUST also list the model's exclusions.
- **FR-016**: All core actions MUST be operable by keyboard, with visible focus and accessible names. Feedback MUST be announced to assistive technology and conveyed by text as well as color. Essential diagrams MUST have a text equivalent.
- **FR-017**: Motion MUST respect the reduced-motion preference. Animation MUST NOT delay feedback or the availability of controls.
- **FR-018**: The game MUST run as a self-contained page. It needs no account, backend, live network access, or AI service.
- **FR-019**: Progress MUST last only for the current page session. Reloading starts a new session.
- **FR-020**: Adding another round that uses the same mechanic MUST need only a content change and its checks, not new grading logic.
- **FR-021**: All player-facing text (briefings, feedback, hints, labels, buttons, summary) MUST be in English. v1 has no language switch.
- **FR-022**: After each graded submission, the game MUST show the packet's path for the chosen exit:
  - a peer: across the IXP switch to that member;
  - transit: out along the transit link;
  - the Route Server: the packet stops at the route server, and a note says the route server only hands out routes, and packets go directly to a member's router.

  Until the round is solved, the path display and that note MUST NOT name or highlight the correct exit. Revealing the answer happens only through the worked solution (FR-010), which is recorded as assistance.

### Version-one content

| Round | Setup | Destination | Correct exit | Concept |
|-------|-------|-------------|--------------|---------|
| L1R1 | IXP: CampusNet AS64501 `192.0.2.0/24`, StreamCo AS64502 `198.51.100.0/24`. Transit: full table | `198.51.100.25` | StreamCo | Route server is not in the data path |
| L1R2 | Same IXP routes; `203.0.113.0/24` only via transit | `203.0.113.10` | GlobalTransit | The IXP is not the whole Internet |
| L2R1 | SchoolNet AS64503 (`203.0.113.0/24`) is CampusNet's customer and is not at the IXP | `203.0.113.77` | CampusNet | Peers announce customer prefixes |
| L2R2 | BigCarrier AS64511 (`198.18.0.0/15`) is StreamCo's transit provider and is not at the IXP | `198.18.5.5` | GlobalTransit | Peers do not announce provider routes |
| L3R1 | IXP: StreamCo `198.18.0.0/22`. Transit: `198.18.0.0/15`, `198.18.0.0/22`, `198.18.2.0/24` (CloudNine AS64507, not at the IXP) | `198.18.2.50` | GlobalTransit | Longest prefix wins first |
| L3R2 | Same as L3R1 | `198.18.1.200` | StreamCo | Equal length: peer preferred |

### Reference cases (hand-checked)

| Case | Input | Player action | Expected result |
|------|-------|---------------|-----------------|
| Correct | L1R1 | StreamCo | Correct |
| Mistake | L1R1 | Route Server | Incorrect: route server is not in the forwarding path |
| Mistake | L1R1 | CampusNet | Incorrect: CampusNet announces `192.0.2.0/24`, which does not contain `198.51.100.25` |
| Mistake | L1R2 | CampusNet | Incorrect: no IXP member announces a prefix containing `203.0.113.10` |
| Correct | L2R1 | CampusNet | Correct: customer prefix exported to peers |
| Mistake | L2R1 | GlobalTransit | Incorrect: peers announce customer prefixes |
| Mistake | L2R2 | StreamCo | Incorrect: peers do not export provider routes (RFC 7908 §3.3) |
| Correct | L3R1 | GlobalTransit | Correct: /24 beats /22 |
| Mistake | L3R1 | StreamCo | Incorrect: longest prefix before preference |
| Boundary | L3 tables, `198.18.2.255` | GlobalTransit | Correct |
| Boundary | L3 tables, `198.18.3.0` | StreamCo | Correct |
| Boundary | L3 tables, `198.18.4.0` | StreamCo | Incorrect: only transit `/15` matches |
| Correct | L3R2 | StreamCo | Correct: equal length, peer preferred |

### Key Entities

- **Network**: a participant in the scenario. Attributes: name, AS number (documentation range 64496–64511), whether it is an IXP member, and the prefixes it originates. Lagoa Fiber is the player's own network.
- **Relationship**: a provider/customer link between two networks. Peering between IXP members is implied by their membership through the route server.
- **Route**: a prefix that the player's router can use. Attributes: prefix, length, announcing network (exit), source (IXP or transit), and LOCAL_PREF.
- **Route Server**: the IXP's route distribution point. It is shown in the topology and offered as a choice, but it is never a forwarding exit.
- **Transit Provider**: GlobalTransit, which provides a route for every destination at LOCAL_PREF 100.
- **Round**: one challenge. It has the scenario networks, relationships, routes, one destination, the exit choices, and ordered hints.
- **Level**: a briefing, a learning outcome, source references, and two ordered rounds.
- **Source**: a reference record with title, URL, section, and the claim it supports.
- **Session progress**: current round, completed rounds, valid attempts per round, and assistance used per round.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A first-time beginner finishes all six rounds and reaches the session summary in 5–10 minutes. There is no time limit.
- **SC-002**: 100% of the reference cases in this specification produce the expected result and feedback reason.
- **SC-003**: After a deliberately wrong choice, a teammate playtester can name the specific rule they missed. Target: every playtester, for at least one wrong choice per level.
- **SC-004**: A keyboard-only player completes the full flow from first briefing to session summary without using a pointer.
- **SC-005**: The game is fully playable in a clean browser session using only the project's own files, with no network services.
- **SC-006**: Every networking claim in the six briefings and explanations has a cited RFC section. A reviewer confirms each one against its source.
- **SC-007**: A new round using the existing mechanic can be added and played by changing content only.

## Assumptions

- **Language**: all player-facing text is English only in v1. Localization is out of scope.
- **Level 2 reveal**: after the first graded submission, the revealed announcements make the retry easier. This is accepted, because the goal is learning, not testing.
- **Learners**: they know IPv4 addresses and CIDR notation but have no BGP experience.
- **Address ranges**: all addresses and AS numbers come from documentation and benchmark ranges (RFC 5737, RFC 5398, RFC 2544).
- **Fixed scope**: v1 has three levels × two rounds and no points, lives, timer, leaderboard, persistence, accounts, multiplayer, runtime AI, or level editor.
- **Device**: the game targets a typical laptop browser and must stay usable in a narrow window. Native mobile apps are out of scope.
