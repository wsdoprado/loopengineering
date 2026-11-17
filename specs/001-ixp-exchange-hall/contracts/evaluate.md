# Contract: `evaluate(round, answer)` (engine/rules.js)

The function is pure. It has no DOM access, timers, network calls, randomness, or state changes. The same inputs always give the same output.

## Input

- `round.challenge`: see [levels-schema.md](./levels-schema.md).
- `answer`: `{ exitId: string | null }`.

## Output

```text
{
  status:     "correct" | "incorrect" | "invalid-input" | "content-error",
  expected:   { exitId, prefix, length, source: "ixp" | "transit", localPref, origin } | null,
  reasonCode: string,
  evidence: {
    destination: "a.b.c.d",
    candidates:  [{ prefix, length, exitId, source, localPref, origin, contains: boolean }],
    longestLength: number | null,
    chosen: { exitId, kind: "peer" | "rs" | "transit", matchingRoutes: [...] } | null
  }
}
```

`origin` is the network ID that originated the prefix. For a customer route, it differs from `exitId`.

## Algorithm

1. **Derive IXP routes.** For each network with `atIxp: true`, compute its customer cone: the network itself plus every network reachable by following `relationships` from provider to customer, transitively. Each prefix of each network in the cone becomes a route `{ exitId: member.id, source: "ixp", localPref: challenge.peerLocalPref (200), origin }`.
2. **Transit routes.** Each `challenge.transit.routes[i]` becomes `{ exitId: transit.id, source: "transit", localPref: transit.localPref (100), origin: transit.id }`.
3. **Match.** Keep the candidates whose prefix contains the destination. If there are none, return `content-error` / `unmatched-destination`.
4. **Longest prefix match.** Keep the candidates with the maximum length (RFC 1812 §5.2.4.3).
5. **Preference.** Keep the candidates with the maximum `localPref` (RFC 4271 §9.1.1). If more than one distinct `exitId` remains, return `content-error` / `tied-peers`.
6. **Grade the answer.**
   - `exitId` is null or empty: `invalid-input` / `no-selection`.
   - `exitId` is not in `challenge.choices`: `invalid-input` / `unknown-choice`.
   - `exitId` equals the winner's exit: `correct` / `correct-peer` or `correct-transit`.
   - Anything else is `incorrect`, with the reason code chosen below.

`"rs"` is never produced by steps 1–5, so it can never be the correct answer.

## Reason codes for `incorrect` (first rule that applies)

| # | Condition | reasonCode | Spec misconception (FR-006) |
|---|-----------|-----------|------------------------------|
| 1 | Chose `rs` | `rs-not-in-forwarding-path` | The route server forwards traffic (RFC 7947 §1, §2.2.1) |
| 2 | Chose a peer whose matching route is shorter than the winner | `longest-prefix-before-preference` | Peer preference applied before longest match |
| 3 | Chose a peer with no matching route, and one of its providers (directly or further up) originates a prefix containing the destination | `peer-does-not-export-provider-routes` | A peer carries its provider's routes (RFC 7908 §3.3) |
| 4 | Chose a peer, and no IXP route contains the destination | `not-announced-at-ixp` | The IXP reaches the whole Internet |
| 5 | Chose a peer with no matching route (other cases) | `peer-prefix-does-not-contain-destination` | A peer whose prefixes don't contain the destination |
| 6 | Chose transit, and the winning peer route is longer than transit's longest match | `longest-prefix-before-preference` | Longest match ignored |
| 7 | Chose transit, and the winning peer route's `origin` ≠ its `exitId` (a customer route) | `peer-exports-customer-routes` | A peer's customer routes are ignored |
| 8 | Chose transit (otherwise) | `equal-length-prefer-peer` | Transit chosen over an equal-length peer route |

## Reference expectations (from the spec, hand-checked; tests use these as literals)

| Round / destination | Answer | status | reasonCode |
|---------------------|--------|--------|-----------|
| L1R1 `198.51.100.25` | streamco | correct | correct-peer |
| L1R1 | rs | incorrect | rs-not-in-forwarding-path |
| L1R1 | campusnet | incorrect | peer-prefix-does-not-contain-destination |
| L1R2 `203.0.113.10` | globaltransit | correct | correct-transit |
| L1R2 | campusnet | incorrect | not-announced-at-ixp |
| L2R1 `203.0.113.77` | campusnet | correct | correct-peer |
| L2R1 | globaltransit | incorrect | peer-exports-customer-routes |
| L2R2 `198.18.5.5` | globaltransit | correct | correct-transit |
| L2R2 | streamco | incorrect | peer-does-not-export-provider-routes |
| L3R1 `198.18.2.50` | globaltransit | correct | correct-transit |
| L3R1 | streamco | incorrect | longest-prefix-before-preference |
| L3 tables `198.18.2.255` | globaltransit | correct | correct-transit |
| L3 tables `198.18.3.0` | streamco | correct | correct-peer |
| L3 tables `198.18.4.0` | streamco | incorrect | not-announced-at-ixp |
| L3R2 `198.18.1.200` | streamco | correct | correct-peer |
| L3R2 | globaltransit | incorrect | equal-length-prefer-peer |
| any | null | invalid-input | no-selection |
| two peers announce `198.51.100.0/24` | any | content-error | tied-peers |
| destination matched by no route | any | content-error | unmatched-destination |
