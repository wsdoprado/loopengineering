---
# ARCADE submission for Exchange Hall. Facts come from this session's record, README.md, the
# Spec Kit artifacts in specs/001-ixp-exchange-hall/ and the git history.
arcade_version: 1

game:
  title: "Exchange Hall"
  slug: exchange-hall
  tagline: "Choose where each packet leaves your network: IXP peer, route server, or transit."
  summary: "Players run the on-call desk of a small ISP that has joined an Internet Exchange Point and pick the exit each packet takes. Three levels teach that the route server never carries traffic, that peers announce only their own and their customers' prefixes, and that longest prefix match wins before the peer-over-transit preference."
  topics: [IXP, BGP, Peering, Route server, Longest prefix match, RFC 7947]
  category: routing
  skill_level: beginner
  play_minutes: 10
  levels: 3
  card_image: assets/images/title.webp
  card_image_alt: "Exchange Hall round one: a diagram links Lagoa Fiber to an IXP switch, a dashed route server, two peers and a transit provider, beside exit choices and green Correct feedback."
  repo: "https://github.com/wsdoprado/loopengineering"
  repo_path: ""
  license: Apache-2.0

creator:
  name: "wsdoprado"
  github: wsdoprado
  location: ""
  organization: ""
  links: []
  first_spec_project: true
  workshop: "NAF AC6"
  consent_to_publish: true

build:
  started: "2026-11-17"
  finished: "2026-11-17T11:43:11-07:00"
  wall_time: unknown
  spec_driven:
    framework: "GitHub Spec Kit"
    framework_version: "1.4.3.dev0"
    artifacts: [constitution, spec, clarify, plan, tasks, analysis, checklists]
    task_count: 46
    loops_or_phases: 6
  model: "claude-opus-5-5"
  helper_models: ["claude-fable-5-2 (reported by the session for the first turn only: installing specify-cli)", "web-fetch sub-agents used to read RFCs and the workshop repo (model ID not recorded separately)"]
  harness: "Claude Code"
  harness_version: "2.1.326"
  mcp_servers: ["claude.ai Claude Docs (connected, not used)", "easel (connected, not used)", "GitHub plugin MCP (failed to connect, not used)"]
  rag_and_sources: ["RFC 7947 §1 and §2.2.1", "RFC 7908 §2, §3.2, §3.3", "RFC 1812 §5.2.4.3", "RFC 4271 §5.1.5, §9.1.1", "RFC 5737 §3, RFC 5398 §4, RFC 2544 App. C.2.2", "All RFCs read from rfc-editor.org during the session", "NAF AC6 workshop StarterKit: CONSTITUTION.md, SPEC.md, PLAN.md, ARCADE.md"]
  skills_and_plugins: ["Spec Kit skills: speckit-constitution, speckit-specify, speckit-clarify, speckit-plan, speckit-tasks, speckit-analyze", "Ralph Loop plugin 1.0.1 for the implementation run, cancelled by the human after 1 iteration", "caveman plugin (terse replies, active all session)"]
  other_tools: ["uv 0.11.29", "specify-cli 1.4.3.dev0", "Python 3.10.12 http.server", "Node v20.20.2", "Google Chrome 154 headless", "puppeteer-core 22.15.0 (outside the repo, for browser checks and the card screenshot)", "git"]
  human_prompts: 15
  usage:
    input_tokens: unknown
    output_tokens: unknown
    cost_note: "not measured by the harness during the session"
  ai_generated_assets: ["code, content and tests: claude-opus-5-5", "card image: browser screenshot of the game, not AI-generated", "no audio or 3D assets"]

runtime:
  kind: static-web
  stack: [HTML, CSS, "JavaScript ES modules", "inline SVG"]
  start: "python3 -m http.server 8000 --bind 127.0.0.1"
  url_after_start: "http://127.0.0.1:8000"
  hosted_url: ""
  static_root: "."
  requires_install: false
  requires_network: false
  requires_api_key: false
  uses_ai_at_runtime: false
  browsers: ["Chrome 154 (headless, automated)"]
  accessibility: "Automated keyboard-only playthrough to the summary (Tab, arrows, Space, Enter), visible focus, aria-live feedback in words, reduced-motion respected, 360 px layout checked. Not yet tested with a real screen reader or by a human keyboard user."
  save_state: "none (reload starts a fresh session)"

verification:
  tests: "start the server, then open http://127.0.0.1:8000/tests/"
  tests_passing: 100
  facts_sourced_from: ["RFC 7947", "RFC 7908", "RFC 1812", "RFC 4271", "RFC 5737", "RFC 5398", "RFC 2544"]
  known_limits: ["IPv4 only, one IXP with one route server, all sessions up", "No AS_PATH or later BGP tie-breaks, MED, communities or RPKI/IRR filtering", "Peer-over-transit LOCAL_PREF is the fictional ISP's policy, not a BGP rule", "No bilateral-only sessions, outages, return paths or traffic engineering", "Real screen-reader check and teammate playtest not run yet"]
---

## In one paragraph

Exchange Hall is a short browser game about what really happens when a network joins an Internet
Exchange Point. You are on call at Lagoa Fiber, a small ISP with an IXP port and a paid transit link,
and you decide which exit each packet takes. Wrong choices are explained with the exact prefixes and
the rule you missed, citing the RFC section. It is for networking beginners who know what a /24 is
but have never seen BGP peering, and it takes about ten minutes.

## How it was built

We followed the workshop's Spec Kit flow. The human chose the topic (IXP) and the audience, then the
agent filled in the starter constitution, spec and plan. It checked every cited RFC section against the
source text before using it. Clarify settled four questions: English-only text, showing the real peer
announcements in Level 2 after any graded answer, keeping the route server as an always-wrong choice,
and the wording of wrong-peer feedback. The plan defined a pure evaluator with eight reason codes and
a content schema with no answer key. Analyze found a critical issue: the planned route-server animation
would have revealed the correct exit for free. A new requirement fixed it before any code was written.
The engine was built and tested first (98 tests), then the UI, driven by an automated browser run. During
implementation, the validator's fixed "3 levels × 2 rounds" rule turned out to block content-only
additions, so it was relaxed and the count is now checked on the shipped content instead. Three layout
glitches were fixed after reviewing screenshots.

## What we'd tell the next builder

- Write down the exact rule order (here: export rule, then longest match, then LOCAL_PREF) and the hand-checked expected answers before any code.
- Run analyze seriously: it caught an animation that would have leaked every answer.
- Keep counts like "levels" in the content checks, not in the validator, or adding a round stops being a data-only change.
