# Quickstart & Validation Guide: Exchange Hall

## Prerequisites

- Python 3 (only for the local static server). Any static server works.
- A current Chromium, Firefox, or Safari browser.

## Run

From the repository root:

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

- Game: **http://127.0.0.1:8000/**
- Tests: **http://127.0.0.1:8000/tests/**

Opening `index.html` through `file://` is not supported. ES modules and `fetch` need HTTP.

## Validation scenarios

Record each one as pass, fail, or not run, with the date and browser, in the README's verification section.

| # | Scenario | Steps | Expected |
|---|----------|-------|----------|
| V1 | Rule engine | Open `/tests/` | All tests pass. Totals shown. 0 tests discovered shows FAIL |
| V2 | First briefing (AC1) | Fresh load | Level 1 briefing appears before any challenge |
| V3 | Correct path (US1-2) | L1R1: select StreamCo, Submit | Correct. Packet crosses the IXP to StreamCo. Explanation names `198.51.100.0/24` and LOCAL_PREF 200 > 100 |
| V4 | Route server (US1-3) | L1R1: select Route Server, Submit | Incorrect: "does not forward traffic" (RFC 7947 §1). Round stays open. Attempts = 1 |
| V5 | No selection (US1-4) | Submit with nothing selected | Guidance shown. Attempts unchanged |
| V6 | Wrong peer (FR-006) | L1R1: select CampusNet | Names `192.0.2.0/24`, says it does not contain `198.51.100.25`, gives the method hint |
| V7 | Level 2 reveal (FR-002) | L2R2: submit StreamCo | Incorrect (provider routes). Real announcements now shown and stay visible |
| V8 | LPM first (US1-5) | L3R1: submit StreamCo, then GlobalTransit | First is incorrect (/24 beats /22), second is correct |
| V9 | Hints (US2-1) | Any round: Hint, Hint | Method, then worked solution. Assistance recorded. Round not complete |
| V10 | Duplicate submit (US2-2) | After a correct answer, press Enter on Submit again | Attempts unchanged. Submit disabled |
| V11 | Full run (US2-3) | Play all 6 rounds | Level briefings between levels. The summary shows rounds, attempts, and assistance separately |
| V12 | Restart (US2-4) | Restart → Cancel; Restart → Confirm | Cancel keeps progress. Confirm returns to the L1 briefing with zero counters |
| V13 | Keyboard only (US3-1) | V2–V11 without a mouse | All actions reachable. Focus is visible. Focus moves to the feedback heading after Submit |
| V14 | Screen reader text (US3-2) | Submit with a screen reader on | Feedback is announced. Result is stated in words, not only color |
| V15 | Reduced motion (US3-3) | Turn on the OS reduce-motion setting, then submit | No animation. Final packet position and feedback shown immediately |
| V16 | Narrow window (US3-4) | 360 px wide viewport | The route table scrolls in its own region. Buttons stay visible |
| V17 | Content error (FR-013) | Temporarily duplicate StreamCo's prefix on CampusNet in a copy of `levels.json` | Content-error screen names the round. Nothing is graded |
| V18 | Self-contained (SC-005) | DevTools Network panel during a full run | Only same-origin requests to the project's own files |
| V19 | Reload (FR-019) | Solve L1R1, then reload the page | Fresh session: L1 briefing, zero counters |
| V20 | Teammate playtest (SC-001, SC-003) | A teammate new to the game plays to the summary, making one deliberate wrong choice per level | Summary reached in 5–10 min. After each wrong choice, they can name the rule they missed |
| V22 | Content-only extension (SC-007) | Add a trial round to a copy of `levels.json`, play it | Validates and plays with `engine/` and `ui/` unchanged |
| V21 | No answer leak (FR-022) | L1R1: choose Route Server, Submit | The packet stops at the desk. Nothing names or highlights StreamCo until the round is solved or the worked solution is viewed |

Detailed expected reason codes: [contracts/evaluate.md](./contracts/evaluate.md).
