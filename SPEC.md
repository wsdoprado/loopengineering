# Exchange Hall · First playable specification

## The pitch

**A beginner network operator decides which exit each packet takes from their network at an Internet Exchange Point, and watches the packet cross the IXP fabric or leave through the paid transit link.**

The player is the new on-call engineer at Lagoa Fiber (AS64500), a small regional ISP that just joined an IXP and also buys transit from GlobalTransit (AS64510). Each round shows the IXP members, what each member announces (or the business relationships that decide what they announce), the transit routes, and one destination IP address. The player chooses the exit the router will use. A correct decision animates the packet along the chosen path and explains the rule. An incorrect decision shows the packet stopping at the wrong gate and explains which rule was missed and which values prove it. The session ends when all six rounds across three levels have a correct submission and the session summary is shown.

## Who this is for

- **Learner:** networking beginners: students or new IT staff who know what an IP address and a prefix such as /24 are, but have never worked with BGP or an IXP.
- **Assumed knowledge:** IPv4 dotted-decimal addresses and CIDR prefix notation. No BGP knowledge is assumed.
- **What the briefing teaches:** IXP, member, peering, transit, route server, prefix announcement, customer/provider/peer relationship, longest prefix match, and "peer preferred over transit" (LOCAL_PREF) as our network's policy.
- **Why interaction helps:** beginners often think that joining an IXP makes the whole Internet reachable through it, and that traffic flows "through the route server". Choosing an exit and seeing it fail makes both misconceptions visible.
- **Session target:** 5–10 minutes for a first playthrough, with unlimited thinking time.

## Learning outcomes and evidence

| ID | After playing, the learner can… | The game asks them to… | Evidence of success |
| --- | --- | --- | --- |
| LO1 | Identify whether a destination is reachable over IXP peering, and name the member that receives the traffic | Choose an exit from IXP members, the route server, and transit, given the route server's announcements | Correct exit chosen in Level 1, both rounds |
| LO2 | Predict which prefixes a peer announces from its business relationships (own + customers only, never its providers' or other peers' routes) | Choose an exit given the relationship diagram only, not the announced routes | Correct exit chosen in Level 2, both rounds |
| LO3 | Apply longest prefix match before the peer-over-transit preference | Choose an exit when IXP and transit routes overlap with different prefix lengths | Correct exit chosen in Level 3, both rounds |

## The technical model

- **Rule being taught:** for destination D, (1) list every route our router has installed (IXP peer routes plus transit routes); (2) keep only routes whose prefix contains D; (3) keep only the longest of those prefixes; (4) if both an IXP peer route and a transit route remain for that prefix, use the peer route (LOCAL_PREF 200 for peers, 100 for transit). The exit is the network that announced the winning route. An IXP peer's routes are its own prefixes plus its customers' prefixes only.
- **Context:** vendor-neutral IPv4 BGP. One IXP with one route server (multilateral peering). One transit provider that sends a full table.
- **Assumptions:** all BGP sessions are up. Every member at the IXP peers with the route server. The route server passes NEXT_HOP unchanged, so traffic goes directly to the announcing member across the IXP switch. The transit route table is listed in the round and contains a route for every destination used in the game.
- **Excluded behavior:** AS_PATH length and all later BGP tie-breaks, MED, communities, RPKI/IRR filtering, bilateral-only sessions, multiple route servers, IPv6, outages, asymmetric return paths, and traffic engineering. Addresses and AS numbers use documentation and benchmark ranges.
- **Authoritative references:**
  - RFC 7947 §1, "the route server does not forward traffic itself and is therefore not a router" — supports "traffic does not flow through the route server". https://www.rfc-editor.org/rfc/rfc7947#section-1
  - RFC 7947 §2.2.1, "the NEXT_HOP attribute MUST be passed unmodified to the route server clients" — supports "traffic goes directly to the member". https://www.rfc-editor.org/rfc/rfc7947#section-2.2.1
  - RFC 7908 §2 (route leak definition) and §3.3 "Leak of Transit-Provider Prefixes to Peer" — supports "a peer does not announce its provider's routes to you". https://www.rfc-editor.org/rfc/rfc7908#section-3.3
  - RFC 7908 §3.2 "Lateral ISP-ISP-ISP Leak" — supports "a peer does not announce its other peers' routes to you". https://www.rfc-editor.org/rfc/rfc7908#section-3.2
  - RFC 1812 §5.2.4.3 "Next Hop Address", rule (2) Longest Match — supports longest prefix match. https://www.rfc-editor.org/rfc/rfc1812#section-5.2.4.3
  - RFC 4271 §5.1.5 and §9.1.1 — LOCAL_PREF is the degree of preference among routes for the same prefix. https://www.rfc-editor.org/rfc/rfc4271#section-9.1.1
  - RFC 5737 §3, RFC 5398 §4, RFC 2544 §C.2.2 — documentation IPv4 blocks, documentation ASNs 64496–64511, benchmark block 198.18.0.0/15.

The briefing tells the learner in plain language that "prefer peers over transit" is Lagoa Fiber's policy, not a law of BGP, and that real routers have more tie-breaks than the game models. Two IXP peers announcing the same longest prefix is an unsupported tie in v1 and is rejected as a content error.

## The repeatable game loop

1. **Brief:** introduce one concept, its terms, and a worked example different from the challenge.
2. **Inspect:** show the IXP topology (members, route server, transit link) and a route table with prefix, length, announcing network, and source (IXP or transit). In Level 2, show business relationships instead of the IXP routes. All decision-relevant values are visible as text.
3. **Choose:** the player selects one exit (an IXP member, the route server, or the transit provider) and explicitly submits the decision.
4. **Explain:** display the result, the matching prefixes and their lengths, the preference applied, and the rule that connects them.
5. **Retry or advance:** a wrong answer leaves the round playable; a correct answer enables Next.
6. **Reflect:** the level summary shows completed rounds, valid attempts, and assistance used.

**Worked interaction:** Level 3, Round 1. The player sees destination `198.18.2.50`. IXP route: `198.18.0.0/22` from StreamCo (AS64502). Transit routes from GlobalTransit (AS64510): `198.18.0.0/15`, `198.18.0.0/22` and `198.18.2.0/24`. The player picks StreamCo, reasoning "peers are preferred". Feedback: "Not this time. `198.18.2.50` is inside `198.18.0.0/15`, `198.18.0.0/22` and `198.18.2.0/24`. The router first picks the longest matching prefix, /24, and only GlobalTransit announces it. The peer preference only breaks ties between routes for the same prefix. Hint: list every prefix that contains the address, then compare lengths." The player picks GlobalTransit. Feedback: "Correct. /24 is longer than /22, so the packet leaves through transit even though StreamCo is a peer." The packet animates across the transit link.

## Required stories and acceptance criteria

### US1 · Make and understand a decision — P1

As a learner, I want to apply the rule to visible evidence and understand the result.

- **AC1:** Given a fresh session, when I start, then I see the first briefing before answering a challenge.
- **AC2:** Given Level 1 Round 1 (destination `198.51.100.25`; IXP routes `192.0.2.0/24` from CampusNet AS64501 and `198.51.100.0/24` from StreamCo AS64502; transit has every route), when I submit StreamCo, then the round is marked complete, the packet crosses the IXP fabric to StreamCo, and the explanation names the matching `/24` and the peer-over-transit preference.
- **AC3:** Given that challenge, when I submit the Route Server, then feedback explains that the route server only distributes routes and does not forward traffic (RFC 7947 §1), completion stays unchanged, and I can retry.
- **AC4:** Given no selection, when I submit, then input guidance appears and attempts/completion remain unchanged.

### US2 · Learn from help and finish the game — P1

As a learner, I want help when stuck and a clear view of my progress.

- **AC5:** A hint first explains the method. Further help can show a worked solution; assistance is recorded without marking the round complete.
- **AC6:** Each valid submission counts as one attempt until the round is solved. Correct submission completes it once; repeated submission after success has no effect.
- **AC7:** A level completes after both of its rounds are solved. Next opens the following round or level; the final round opens a session summary.
- **AC8:** Restart asks for confirmation, then clears the current session and returns to the first briefing. Cancel preserves the session.

### US3 · Play with accessible controls — P1

As a keyboard user, I want to inspect the challenge, choose, submit, get help, and advance without a mouse.

- **AC9:** All core controls have visible focus and accessible names; keyboard interaction reaches every core action.
- **AC10:** Correct/incorrect feedback includes text, remains available to read, and is announced to assistive technology. Motion can be reduced without losing information.

## Version-one content

**Three levels, two rounds per level, six rounds total.** One new example per round; the same mechanic (choose the exit) throughout.

| Level | New concept | Prerequisite | Misconception to expose |
| --- | --- | --- | --- |
| 1 | Peering through the route server (LO1) | IPv4 prefixes | "Traffic goes through the route server" and "the IXP reaches the whole Internet" |
| 2 | Peers carry only own + customer prefixes (LO2) | Level 1 | "A peer will carry my traffic anywhere it can reach" |
| 3 | Longest prefix match before peer preference (LO3) | Level 2 | "A peer route always beats transit" |

Round content (all values from RFC 5737 / RFC 2544 / RFC 5398 ranges):

| Round | Setup | Destination | Correct exit |
| --- | --- | --- | --- |
| L1R1 | IXP: CampusNet AS64501 `192.0.2.0/24`, StreamCo AS64502 `198.51.100.0/24`. Transit: full table | `198.51.100.25` | StreamCo |
| L1R2 | Same IXP routes; `203.0.113.0/24` only via transit | `203.0.113.10` | GlobalTransit |
| L2R1 | SchoolNet AS64503 (`203.0.113.0/24`) is a customer of CampusNet; SchoolNet is not at the IXP | `203.0.113.77` | CampusNet |
| L2R2 | BigCarrier AS64511 (`198.18.0.0/15`) is StreamCo's transit provider; BigCarrier is not at the IXP | `198.18.5.5` | GlobalTransit |
| L3R1 | IXP: StreamCo `198.18.0.0/22`. Transit: `198.18.0.0/15`, `198.18.0.0/22`, `198.18.2.0/24` (CloudNine AS64507, not at the IXP) | `198.18.2.50` | GlobalTransit |
| L3R2 | Same as L3R1 | `198.18.1.200` | StreamCo |

**Progression:** sequential on first playthrough; retry without penalty. Completion requires a correct submission in every round. Hints remain available. No points, lives, timer, leaderboard, or streak mechanic in v1.

**Session behavior:** progress is held for the current page session; reload starts again. Saving across reloads is a stretch feature and must be specified before it is added.

## Cases the implementation must satisfy

Expected results were checked by hand against the rule above.

| Case | Input state | Player action | Expected result | Why / source |
| --- | --- | --- | --- | --- |
| Correct | L1R1, destination `198.51.100.25` | Choose StreamCo | Correct; exit AS64502 over IXP | `/24` matches; peer preferred over transit for same prefix (RFC 4271 §9.1.1) |
| Plausible mistake | L1R1 | Choose Route Server | Incorrect, reason `rs-not-in-forwarding-path` | RFC 7947 §1, §2.2.1 |
| Plausible mistake | L1R2, destination `203.0.113.10` | Choose CampusNet | Incorrect, reason `not-announced-at-ixp`: no IXP member announces a prefix containing the address | IXP is not a path to the whole Internet |
| Correct | L2R1, destination `203.0.113.77` | Choose CampusNet | Correct; customer prefix is exported to peers | Own + customer export rule |
| Plausible mistake | L2R1 | Choose GlobalTransit | Incorrect, reason `peer-exports-customer-routes` | Peers announce customer prefixes too |
| Plausible mistake | L2R2, destination `198.18.5.5` | Choose StreamCo | Incorrect, reason `peer-does-not-export-provider-routes` | RFC 7908 §3.3 |
| Correct | L3R1, destination `198.18.2.50` | Choose GlobalTransit | Correct; `/24` beats `/22` | RFC 1812 §5.2.4.3 |
| Plausible mistake | L3R1 | Choose StreamCo | Incorrect, reason `longest-prefix-before-preference` | RFC 1812 §5.2.4.3 |
| Boundary | L3R1 tables, destination `198.18.2.255` | Choose GlobalTransit | Correct; last address inside `198.18.2.0/24` | /24 covers `198.18.2.0`–`198.18.2.255` |
| Boundary | L3R1 tables, destination `198.18.3.0` | Choose StreamCo | Correct; outside the /24, only the /22 matches, peer preferred | /22 covers `198.18.0.0`–`198.18.3.255` |
| Boundary | L3R1 tables, destination `198.18.4.0` | Choose StreamCo | Incorrect; only transit's `198.18.0.0/15` matches | Outside `198.18.0.0/22` |
| Correct | L3R2, destination `198.18.1.200` | Choose StreamCo | Correct; only /22 matches, peer preferred | RFC 4271 §9.1.1 |
| Unsupported content | Two IXP members announce `198.51.100.0/24` | Open round | Visible content error; no grading or progress | Unsupported tie in v1 |
| Unsupported content | Destination matched by no route | Open round | Visible content error; no grading or progress | Authoring error, not learner failure |
| Unsupported content | Prefix with host bits set, e.g. `198.18.1.0/22` | Open round | Visible content error; no grading or progress | Invalid CIDR |

## Experience direction

- **Visual metaphor:** the IXP as a shared exchange hall: a central switch with member "gates" around it, the route server as an information desk off to the side (connected by dashed control lines, not the data path), and the transit link as a toll road leaving the hall.
- **One memorable moment:** when the player picks the route server, the packet walks to the information desk and receives a card naming the real next hop, then the round stays open. That shows the desk hands out directions but does not carry traffic.
- **Always visible:** destination IP, each candidate route's prefix and length, the announcing network and AS number, route source (IXP or transit), and the LOCAL_PREF values.
- **Feedback voice:** patient and specific; explain the observed choice before offering the next step.
- **Layout:** challenge first, action next, explanation beside or below it. Don't hide technical values behind hover-only interactions.

## Non-goals

No user accounts, multiplayer, backend, live infrastructure access, runtime AI, leaderboard, or level editor. No simulation of BGP session setup, AS_PATH and later tie-breaks, MED, communities, RPKI/IRR filtering, IPv6, or return-path routing. Visual polish must fit the existing mechanic.

## Open decisions for clarify

- Should the UI text be English only, or Portuguese (pt-BR) as well? This changes how content is stored.
- In Level 2, should the route server's actual received routes be revealed after a correct answer, to confirm the prediction?
- Should the route server stay a selectable exit in Levels 2–3, or only in Level 1? This changes what counts as a plausible wrong answer.

Delete this section when resolved, or record the answer beside each question. Don't let unresolved decisions become silent implementation guesses.

## Release evidence

All required acceptance criteria must have a recorded result. All six rounds and their explanations must be checked against the references. A teammate must complete the core flow using only the keyboard. The README must describe implemented behavior, exact run/test commands, and any remaining limits.
