# Contract: Session state machine (engine/state.js)

The state is held in memory only. Every function is pure: `(state, event) → newState`. The UI renders from the returned state and never changes it directly.

## State

```text
{
  view: "loading" | "content-error" | "briefing" | "round" | "summary",
  levelIndex: 0..2,
  roundIndex: 0..1,
  selection: exitId | null,
  rounds: { [roundId]: { attempts: int, hintsShown: 0..2, solved: bool, revealed: bool,
                         lastResult: EvaluateResult | null, guidance: string | null } },
  restartPending: bool
}
```

## Transitions

```text
loading ──ok──▶ briefing(L1) ──start──▶ round(L1R1)
loading ──errors──▶ content-error ──retry──▶ loading

round:
  select(exitId)             → selection = exitId (no attempt, no grading)
  submit, selection = null   → guidance set; attempts and solved unchanged
  submit, solved = true      → no change (FR-009)
  submit, incorrect          → attempts+1, revealed = true, lastResult; round stays open
  submit, correct            → attempts+1, revealed = true, solved = true, lastResult; Next enabled
  hint                       → hintsShown = min(hintsShown+1, 2); solved unchanged
  next, solved = false       → no change
  next, solved, roundIndex 0 → round(roundIndex 1)
  next, solved, last round of level < L3 → briefing(next level)
  next, solved, L3R2         → summary

any view except loading/content-error:
  restart                    → restartPending = true (confirmation shown)
  confirmRestart             → fresh state, view = briefing(L1)
  cancelRestart              → restartPending = false, everything else unchanged
```

## Derived values

- **Assistance used** for a round: `hintsShown > 0`. The worked solution counts as `hintsShown = 2`.
- **Summary**: three separate numbers, shown separately (Constitution III):
  - rounds completed out of 6;
  - total valid attempts;
  - rounds where assistance was used.
  The summary also includes a per-round list.
- **Submit enabled**: `view === "round" && !solved`. This is also guarded inside `submit`.
