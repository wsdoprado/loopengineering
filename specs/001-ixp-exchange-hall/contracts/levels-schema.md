# Contract: `data/levels.json`

This is the only authored content file. It is loaded with `fetch('data/levels.json')`, using a relative URL, and validated as a whole by `engine/content.js` before play starts.

The file contains no answer key. The correct exit is always computed by `evaluate()` (Constitution VI).

## Shape

```json
{
  "schemaVersion": 1,
  "sources": [
    { "id": "rfc7947-s1", "title": "RFC 7947 — Internet Exchange BGP Route Server",
      "url": "https://www.rfc-editor.org/rfc/rfc7947#section-1", "section": "§1",
      "claim": "The route server does not forward traffic itself." }
  ],
  "levels": [
    {
      "id": "L1",
      "title": "Who is in the hall?",
      "outcome": "LO1",
      "briefing": { "paragraphs": ["..."], "terms": [{ "term": "Route server", "definition": "..." }],
                    "workedExample": "...", "sourceIds": ["rfc7947-s1"] },
      "rounds": [
        {
          "id": "L1R1",
          "prompt": "Where does the packet for 198.51.100.25 leave Lagoa Fiber?",
          "challenge": {
            "self": { "id": "lagoa", "name": "Lagoa Fiber", "asn": 64500 },
            "routeServer": { "id": "rs", "name": "Route Server", "asn": 64504 },
            "transit": { "id": "globaltransit", "name": "GlobalTransit", "asn": 64510,
                         "localPref": 100, "routes": ["192.0.2.0/24", "198.51.100.0/24", "203.0.113.0/24", "198.18.0.0/15"] },
            "peerLocalPref": 200,
            "networks": [
              { "id": "campusnet", "name": "CampusNet", "asn": 64501, "atIxp": true,  "prefixes": ["192.0.2.0/24"] },
              { "id": "streamco",  "name": "StreamCo",  "asn": 64502, "atIxp": true,  "prefixes": ["198.51.100.0/24"] }
            ],
            "relationships": [],
            "showAnnouncements": true,
            "destination": "198.51.100.25",
            "choices": ["campusnet", "streamco", "rs", "globaltransit"]
          },
          "hints": [
            { "kind": "method", "text": "..." , "sourceIds": ["..."] },
            { "kind": "worked", "text": "..." , "sourceIds": ["..."] }
          ]
        }
      ]
    }
  ]
}
```

## Field rules

| Field | Rule |
|-------|------|
| `schemaVersion` | Must equal `1` |
| `sources[].id` | Unique, non-empty. `url` is https. `section`, `title`, and `claim` are non-empty |
| `levels` | At least 1, IDs unique. The shipped v1 file has exactly 3 (`L1`–`L3`); that count is checked on the shipped content, not by the validator, so adding content needs no engine change (Constitution VI) |
| `levels[].rounds` | At least 1 per level, IDs unique across the file. The shipped v1 file has exactly 2 per level |
| `briefing.sourceIds`, `hints[].sourceIds` | Every ID resolves to `sources[].id`. A briefing has at least 1 source |
| `hints` | Exactly 2: `[method, worked]`, in that order |
| `asn` (all networks, self, rs, transit) | Integer 64496–64511 (RFC 5398) |
| network `id` | Unique within the round. Must not equal `self.id`, `rs`, or `transit.id` |
| `prefixes`, `transit.routes` | Valid IPv4 CIDR, length 8–32, no host bits set |
| `relationships[]` | `{ provider, customer }`, both known network IDs, no self-loops, no cycles |
| `peerLocalPref` > `transit.localPref` | Required (peer preferred over transit, per the documented policy) |
| `destination` | Valid IPv4 dotted-decimal |
| `choices` | Unique, each a member network ID with `atIxp: true`, `rs`, or `transit.id`. Must include `rs` (FR-003) and the transit ID |
| Whole round | `evaluate(challenge, {exitId: null})` must not return `content-error` (no `tied-peers`, no `unmatched-destination`) |

## Errors

Validation returns `[{ at: "L2R1.challenge.networks[1].prefixes[0]", message: "Host bits set in 198.18.1.0/22" }, ...]`. Any error blocks play and shows the content-error screen, which lists each `at` and `message`.
