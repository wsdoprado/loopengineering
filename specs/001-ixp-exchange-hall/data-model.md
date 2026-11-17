# Data Model: Exchange Hall

The authored content is defined in [contracts/levels-schema.md](./contracts/levels-schema.md). The runtime session is defined in [contracts/session-state.md](./contracts/session-state.md). This file summarizes the entities and how they relate.

## Entities

| Entity | Fields | Relationships / rules |
|--------|--------|-----------------------|
| **Source** | id, title, url, section, claim | Referenced by Level briefings and Round hints. Every networking claim cites one |
| **Level** | id (L1–L3), title, outcome (LO1–LO3), briefing {paragraphs, terms, workedExample, sourceIds}, rounds[2] | Ordered. Completed when both rounds are solved |
| **Round** | id (L1R1…L3R2), prompt, challenge, hints[2] | Belongs to one Level. Graded only by `evaluate()` |
| **Challenge** | self, routeServer, transit, peerLocalPref, networks[], relationships[], showAnnouncements, destination, choices[] | Validated as a whole before play |
| **Network** | id, name, asn (64496–64511), atIxp, prefixes[] (CIDR) | If `atIxp`, it peers through the Route Server and its exit is offered |
| **Relationship** | provider (network id), customer (network id) | Directed. Acyclic. Defines the customer cone |
| **Transit** | id, name, asn, localPref (100), routes[] | Covers every destination (validated by the absence of `unmatched-destination`) |
| **Route** (derived) | prefix, length, exitId, source (ixp/transit), localPref, origin | IXP routes come from the customer cones. Transit routes come from `transit.routes` |
| **EvaluateResult** (derived) | status, expected, reasonCode, evidence | See [contracts/evaluate.md](./contracts/evaluate.md) |
| **RoundProgress** | attempts, hintsShown, solved, revealed, lastResult, guidance | One per Round, per session |
| **Session** | view, levelIndex, roundIndex, selection, rounds{}, restartPending | Memory only. Reset by a confirmed Restart or a page reload |

## Version-one network cast (shared names; values set per round)

| id | Name | ASN | Role |
|----|------|-----|------|
| lagoa | Lagoa Fiber | 64500 | Player's network (self) |
| campusnet | CampusNet | 64501 | IXP member |
| streamco | StreamCo | 64502 | IXP member |
| schoolnet | SchoolNet | 64503 | Customer of CampusNet (L2R1), not at the IXP |
| rs | Route Server | 64504 | IXP route server; never an exit |
| cloudnine | CloudNine | 64507 | Holds `198.18.2.0/24` (L3), reachable only via transit |
| globaltransit | GlobalTransit | 64510 | Transit provider |
| bigcarrier | BigCarrier | 64511 | StreamCo's transit provider (L2R2), not at the IXP |

In L3, CloudNine's `/24` appears only in the transit routes. CloudNine is listed as a network with `atIxp: false` purely for labeling.

## State transitions

See [contracts/session-state.md](./contracts/session-state.md). Summary:

```text
loading → briefing → round ⇄ (guidance | incorrect feedback) → correct → Next → round | briefing | summary
loading → content-error → retry
confirmed restart → briefing(L1)
```
