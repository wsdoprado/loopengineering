# Exchange Hall

A short browser game that teaches networking beginners how traffic leaves a network at an Internet Exchange Point (IXP).

You are on call at Lagoa Fiber (AS64500), a small ISP that has joined an IXP and also buys transit from GlobalTransit (AS64510). In each round you choose the exit a packet takes: an IXP peer, the route server, or the transit provider. The game then explains the rule that decides it. There are 3 levels of 2 rounds each, and a first playthrough takes about 5–10 minutes.

| Level | You learn to… |
|-------|---------------|
| 1 · Who is in the hall? | Tell whether a destination is reachable over IXP peering, and see that the route server never carries traffic |
| 2 · What do peers share? | Predict what a peer announces from business relationships: its own and its customers' prefixes, never its providers' |
| 3 · Longest match first | Apply longest prefix match before the peer-over-transit preference |

## Run

From the repository root:

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

- Game: http://127.0.0.1:8000/
- Tests: http://127.0.0.1:8000/tests/ shows PASS/FAIL, totals and failed test IDs. Zero tests counts as FAIL.

On Windows, use `py` in place of `python3`. Opening `index.html` directly (`file://`) is not supported, because ES modules and `fetch` need HTTP. No build step, no dependencies, no network services: the game uses only the files in this repository.

## The technical model (and what it leaves out)

For a destination D, the router:

1. Lists every route it has: IXP peer routes plus transit routes. An IXP peer announces **only its own prefixes and its customers' prefixes**. Passing on a provider's or another peer's routes would be a route leak (RFC 7908 §3.2, §3.3).
2. Keeps the routes whose prefix contains D.
3. Keeps the **longest** matching prefix (RFC 1812 §5.2.4.3).
4. If an IXP peer and transit both offer that prefix, uses the peer. Peer routes have LOCAL_PREF 200 and transit routes LOCAL_PREF 100 (RFC 4271 §9.1.1).

**"Prefer peers over transit" is Lagoa Fiber's policy, not a rule of BGP.** Packets never go through the route server: it only distributes routes, and the next hop it passes on is the announcing member's router (RFC 7947 §1, §2.2.1).

**Not modelled:**
- AS_PATH length and the later BGP tie-breaks;
- MED, communities, RPKI/IRR filtering;
- bilateral-only sessions and multiple route servers;
- IPv6, outages, return paths, and traffic engineering.

Two IXP peers tying on the winning route is rejected as a content error. All addresses and AS numbers come from documentation and benchmark ranges (RFC 5737, RFC 5398, RFC 2544).

## Files

```text
index.html, style.css, main.js   Page shell, styles, load → validate → start
engine/ipv4.js                   IPv4/CIDR parsing and containment (32-bit integers)
engine/rules.js                  Pure evaluate(): customer-cone export, longest match, LOCAL_PREF, reason codes
engine/content.js                Whole-file validation of data/levels.json
engine/state.js                  Session state machine (attempts, hints, completion, restart)
engine/feedback.js               English explanations for each reason code
ui/render.js, ui/controls.js     DOM/SVG rendering, events and focus
data/levels.json                 All authored content: sources, briefings, rounds, hints (no answer key)
tests/                           Browser test runner and test files
specs/001-ixp-exchange-hall/     Spec Kit spec, plan, contracts, tasks
```

## Adding a round

Add a round object to a level in `data/levels.json`, following `specs/001-ixp-exchange-hall/contracts/levels-schema.md`:
- networks, relationships, transit routes, destination, and `choices`, which must include `rs` and the transit ID;
- two hints, `[method, worked]`.

Do not write the answer anywhere: the engine computes it. Reload the game. If the content is invalid, the game shows which level and round to fix. No change to `engine/` or `ui/` is needed (verified, see V22 below).

## Verification

Recorded on **2026-11-17**, on Linux with Google Chrome 154.0.8037.57 (headless) and Node v20.20.2. The automated browser checks used puppeteer-core driving that Chrome against `python3 -m http.server`. Status values are **pass**, **fail**, or **not run**.

### Automated tests (`/tests/`)

| Check | Result |
|-------|--------|
| V1 · Test runner: 100 tests (IPv4, every reference case in `contracts/evaluate.md`, content validation, state machine, feedback) | **pass**: 100/100 |

### Spec acceptance scenarios

| Scenario | Result | Evidence |
|----------|--------|----------|
| US1-1 First briefing before any challenge | **pass** | V2 |
| US1-2 L1R1 StreamCo correct, packet to StreamCo, explanation names `198.51.100.0/24` and 200 > 100 | **pass** | V3 |
| US1-3 Route Server, then "does not forward traffic", round stays open | **pass** | V4 |
| US1-4 No selection, then guidance, attempts unchanged | **pass** | V5 |
| US1-5 L3R1 StreamCo, then longest-match feedback, round open | **pass** | V8 |
| US2-1 Hint, then worked solution, recorded as assistance, not complete | **pass** | V9 |
| US2-2 One attempt per valid submit; repeat after success has no effect | **pass** | V10 |
| US2-3 Level briefings between levels; summary shows rounds, attempts, assistance separately | **pass** | V11 |
| US2-4 Restart confirm/cancel | **pass** | V12 |
| US3-1 Keyboard reaches every control, visible focus, accessible names | **pass** (automated keyboard run) | V13 |
| US3-2 Feedback in words, persists, announced | **pass** (live region) / **not run** (real screen reader) | V14 |
| US3-3 Reduced motion: final state without animation | **pass** | V15 |
| US3-4 Narrow window: tables scroll in own region, buttons visible | **pass** | V16 |

### Quickstart scenarios

| # | Result | Notes |
|---|--------|-------|
| V2 First briefing | **pass** | Focus starts on the briefing heading |
| V3 Correct path | **pass** | 3 attempts recorded (RS, CampusNet, StreamCo) |
| V4 Route server | **pass** | Cites RFC 7947 §1 |
| V5 No selection | **pass** | Attempts stay 0 |
| V6 Wrong peer | **pass** | "CampusNet announces 192.0.2.0/24, which does not contain 198.51.100.25 … find the prefix that contains the address" |
| V7 Level 2 reveal | **pass** | IXP rows are hidden before the first graded submission, then revealed and kept |
| V8 Longest match first | **pass** | |
| V9 Hints | **pass** | |
| V10 Duplicate submit | **pass** | Submit disabled; attempts unchanged |
| V11 Full run to summary | **pass** | 6 of 6 completed, 11 attempts, 1 round with assistance (as scripted) |
| V12 Restart | **pass** | Cancel keeps progress; Escape also cancels |
| V13 Keyboard only | **pass** | Full run to summary using only Tab, arrow keys, Space and Enter; focus moves to the feedback heading after Submit; focus outline visible. Automated in headless Chrome; no human keyboard run yet |
| V14 Screen reader | **pass (partial)** | The live region announces "Not this time. …" with the full explanation, and the result is stated in words. **Not run:** a real screen reader (NVDA/VoiceOver), which needs a person |
| V15 Reduced motion | **pass** | The packet is drawn at its final position with no movement; feedback is visible immediately |
| V16 Narrow 360 px | **pass** | No horizontal page scroll; Submit, Hint and Next fully inside the viewport |
| V17 Content error | **pass** | A copy with a tied prefix shows "Content error … L1/L1R1 … tie" and no Start button |
| V18 Self-contained | **pass** | Only same-origin requests during a full run; no console errors |
| V19 Reload | **pass** | Reload returns to the L1 briefing with zero counters |
| V20 Teammate playtest (SC-001 time, SC-003 names the missed rule) | **not run** | Needs a person new to the game |
| V21 No answer leak | **pass** | Choosing the Route Server stops the packet at the route server; neither the feedback nor the path names StreamCo |
| V22 Content-only extension (SC-007) | **pass** | A trial round L1R3 added to a copy of `levels.json` validated and played to "Correct"; `engine/` and `ui/` identical |
| Fresh copy | **pass** | A fresh copy of the project files, served per the Run section: `/tests/` PASS 100/100 and the game starts. The repository had no commit with these files yet, so this was a file copy, not a `git clone` |
| Performance | **pass** | Feedback 28–35 ms after Submit; packet animation 0.9 s; Hint button enabled during animation |

### Source review (Constitution I, SC-006)

Each rule stated in briefings, hints and feedback was checked against the text of its cited section on 2026-11-17:

| Source | Claim used in the game | Checked |
|--------|------------------------|---------|
| RFC 7947 §1 | The route server does not forward traffic ("it does not forward traffic itself and is therefore not a router") | yes |
| RFC 7947 §2.2.1 | NEXT_HOP is passed unmodified, so packets go directly to the announcing member | yes |
| RFC 7908 §2 | A route leak is propagation beyond the intended scope | yes |
| RFC 7908 §3.2, §3.3 | Peer-to-peer and provider-to-peer re-announcements are leaks | yes |
| RFC 1812 §5.2.4.3 | Longest Match rule | yes |
| RFC 4271 §5.1.5, §9.1.1 | LOCAL_PREF is the degree of preference | yes |
| RFC 5737 §3, RFC 5398 §4, RFC 2544 App. C.2.2 | Documentation and benchmark address and ASN ranges | yes |

All player-facing text is English (FR-021).

### Known limits

- A real screen-reader pass (V14) and a teammate playtest (V20) are still **not run**.
- Progress is not saved across reloads, by design for v1.
