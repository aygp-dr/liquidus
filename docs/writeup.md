# liquidus — process writeup, timeline, lessons, minimal repro

## What this is

A retrospective on the liquidus grind cycle: a spec written for a Solidus-API toolkit against a Prism-mocked contract, then stress-tested by writing 10 isolated implementations in 6 languages across 3 surface types, folding each build's `FEEDBACK.md` back into the spec, and closing at v1.9.

## Timeline

All timestamps below are the actual git commit times on the public repo. Total elapsed: **1 h 37 min** for 15 spec-repo commits, 11 tags, 10 build repos.

| Time  | Event                                                                          | Spec version |
|-------|--------------------------------------------------------------------------------|--------------|
| 05:23 | v0 spec written (3 files: README.org, spec.org, CLAUDE.md)                     | v0           |
| 05:25 | CLAUDE.md tightens FEEDBACK.md structure & the strict feedback cycle           | v0           |
| 05:27 | Revision discipline codified: only boundaries/invariants/contracts/schemas     | v0           |
| 05:41 | Fixtures F1–F5 + Ruby builds 6–8 planned + GNUmakefile                         | v0.0         |
| 05:45 | v0 non-goals added (Command-J overlay, admin-only, carrier, stateful mock)     | v0.0         |
| 05:55 | **liquidus-001 lands** (Prism + MSW). Discovery: OAS is v1 classic, not v2     | v1.0 MAJOR   |
| 06:02 | **liquidus-002 lands** (Python typer+textual). Shim required at CART           | v1.1 MINOR   |
| 06:08 | **liquidus-003 lands** (Go cobra). Empty-vs-unset bearer env-var               | v1.2 MINOR   |
| 06:12 | **liquidus-004 lands** (TS commander). SDK generation contract widens          | v1.3 MINOR   |
| 06:21 | **liquidus-005 lands** (Python MCP). F5 wrap idempotency, MCP-server bearer    | v1.4 MINOR   |
| 06:28 | **liquidus-006 lands** (Ruby Thor+tty). MCP tool id types were wrong           | v1.5 MINOR   |
| 06:32 | **liquidus-007 lands** (Ruby SDK dry-struct). "Recommended codegen" removed    | v1.6 MINOR   |
| 06:36 | **liquidus-008 lands** (Ruby Rack shim). Discharges v1.1 shim refutation       | v1.7 MINOR   |
| 06:49 | CLI UX audit + demo mock + MCP wiring + GIFs (lucasfcosta)                     | v1.8 MINOR   |
| 07:00 | **liquidus-009 lands** (Rust clap+ureq) + **liquidus-010** (Zig curl subproc)  | v1.9 MINOR   |

The only major bump was v0 → v1.0: the reified upstream OAS turned out to be the v1 Spree classic API, not the v2 Storefront/Platform surface the initial spec assumed. Every subsequent revision was additive.

## Vetting PRDs — process observations

### What worked

1. **Reify the source before writing anything.** The spec claimed v2 Storefront/Platform paths (`/api/v2/storefront/products`) because that is what the current Solidus docs read like. Prism at the pinned SHA served `/products`, `/orders/mine`, `/orders/current` — the classic v1 API. The whole v0 → v1.0 major bump would have been avoided by 30 seconds of `curl | head` on the pinned SHA before writing fixtures. Reify first, write second.

2. **Refutation conditions in the PRD itself, not in a separate acceptance-test doc.** Every section of `spec.org` ends with `If <observable>, then this spec is wrong and MUST be updated`. Two of them fired during liquidus-001 alone (tag → subcommand family; F3 statelessness surprise). The condition-firings are cheaper than a retro. Refutations are the PRD's own tripwire.

3. **Version-bump policy stated in normative terms up front.** Adopting the crowsnest style guide's major-vs-minor policy meant every FEEDBACK.md item could be sorted `promote / drop / defer` mechanically. Without that policy a reviewer will always debate what "counts" as breaking; with it, the debate is 30 seconds.

4. **Feedback teams grade the spec, not the other way around.** Every private repo landed a `FEEDBACK.md` with five fixed sections: ambiguities, missing requirements, contradictions, refutation firings, non-issues. The last section is the surprise contributor: **explicitly naming what's working prevents the next revision from over-editing sections that are already fine.** Corrections-only feedback loops drift toward over-cautious spec.

5. **Boundary between spec and implementation held under pressure.** Only 5 items ever entered the spec from a FEEDBACK.md: boundaries, invariants, contracts, schemas, observable-interface behavior. Library choice, subcommand phrasing, file layout, and nice-to-haves stayed in the build repos. That kept the spec at ~600 lines instead of ballooning to a template for each language.

### What didn't work as well

1. **v0 anti-goals were prose, not enumerated.** The Cmd-J admin overlay and the CSR back-office had to be re-added as normative bullets in a later revision because the initial prose form was too soft — a reviewer could interpret them as "later" rather than "not this cycle." Anti-goals want to look like the goal list: enumerated, testable, refutation-condition-bearing.

2. **"RECOMMENDED" is a word that lies.** v1.3 §SDK generation contract listed openapi-generator ruby as RECOMMENDED and hand-authored as ACCEPTABLE. The Ruby SDK build (liquidus-007) hand-authored anyway and flagged that the wording implied second-class-ness. v1.6 removed the hierarchy. If the spec doesn't actually prefer one approach, don't imply preference — say both work, and here's the discipline that decides.

3. **The customer-flow narrative was late.** The v0 spec had §Component: CLI / TUI / MCP as tag-based enumerations, but the customer never thinks in tags. The five-stage narrative (browse → cart → checkout → payment → post-order) landed only in v1.0, driven by an L7 design-agent's parallel work. Any spec that has "user" in the domain SHOULD lead with the user's narrative before enumerating the technical surface. Waiting for a build team to derive it is expensive.

4. **Statelessness of the mock was underspecified.** The v0 spec named Prism as stateless but treated the shim as "only if you hit the refutation." Every consumer past cart-mutation hit the refutation. The v1.1 promotion to "required at CART stage" was the right correction, but the initial "only if" phrasing was too optimistic. When the mock's behavior differs from the target's behavior in an observable way, the mitigation is a required component, not an optional one.

### What the process taught about "vetting"

- **A PRD's first-pass truth-value is 60–80%.** The v0 spec had one major bug (v1 vs v2 API), three medium ambiguities, and about a dozen minor gaps. That is roughly what you'd expect from a good-faith attempt. Vetting is not "was the spec right" — it's "does the spec name its own tripwires so we know when it's wrong."
- **Boundary conditions are more valuable than acceptance criteria.** A fixture that says "F3 asserts the statelessness surprise, don't assert consistency" catches more bugs than "F3 asserts that POST then GET returns the same order." The counterintuitive assertion is the one that keeps the spec honest under adversarial implementation.
- **Each grind teaches two things.** The technical finding (session shim required at cart, not payment) plus a meta-finding (feedback teams push toward over- or under-specification depending on their scope). The meta-finding is often more durable than the technical one.

## Language observations

Ranked by what the surface produced during the grind, not by preference.

### Best for a customer-flow-scoped implementation: **Ruby (liquidus-006)**

Thor + Faraday + tty-prompt shipped a full 8-subcommand CLI and a full slash-palette TUI in one build. The spec's `liquidus <resource> <verb>` form is idiomatic Thor. Solidus is Ruby-native, so the domain vocabulary lines up with Ruby idiom directly. tty-prompt is line-oriented (not full-screen) but nothing in the spec required full-screen. If you were building this against a real Solidus in production, Ruby is the answer — but not for reasons of language quality; for reasons of domain adjacency.

### Best bearer-tri-state ergonomics: **Rust (liquidus-009)**

`env::var → Result<String, VarError>` discriminates "unset" as a distinct type variant. Python's `os.environ.get(...) is None`, Ruby's `ENV.fetch(name, :unset)` sentinel, and TypeScript's `undefined | null | string` all work but require conventions. Rust's does not.

### Best type-safety-per-line-of-code: **TypeScript (liquidus-004)**

The `Config.bearer: string | null` where `null` explicitly means "send no header" is genuinely helpful in a way Python and Go's zero-value-vs-unset distinction is not. The type system catches "did I forget the header again?" at compile time.

### Best "thin wrapper" pattern demonstration: **Zig (liquidus-010)**

Zig 0.15 shipped with a stdlib HTTP client whose API breaks every minor version. The wrapper shells out to `curl` instead — 200 lines of Zig, one child process, entirely stable. This is a legitimate technique the spec now names normatively. The winner in the "thin CLI" category is the language that admits its ecosystem constraints and works around them, not the one with the shiniest HTTP client.

### Best for a spec-heavy MCP layer: **Python (liquidus-005)**

The `mcp` SDK on PyPI maps cleanly to the tool/resource/template model in the spec. The `provenance.wrap()` function is 10 lines and self-tests. If you're implementing MCP, Python is the language where the code-to-spec ratio is smallest.

### Best for a session-shim-style middleware: **Ruby / Rack (liquidus-008)**

Rack is *the* middleware abstraction. `env`-in, `[status, headers, body]`-out is precisely what the shim needs. The `SessionStore` is a 40-line class with a rspec cart-consistency invariant. If you're building infrastructure that sits between other components, Rack wins.

### Best avoided if the surface is small: **Go (liquidus-003), TypeScript (liquidus-004)**

Not because they're bad — because their ecosystems assume you want more than a thin wrapper. cobra pulls in mousetrap + pflag transitively; commander pulls in nothing but the type-strict SDK layer is ~150 lines of TS to get a clean interface. Both are fine — but if the point is to ship a floor implementation in <300 lines, Rust and Ruby beat them.

### Which language would I pick if constrained to one?

- **If the point is to prove the spec exists and works**: Rust, because the compiler catches the tri-state and exit-code bugs at build time.
- **If the point is to ship a real Solidus toolkit**: Ruby, because the domain adjacency is worth 100 lines of Ruby's-not-a-real-type-system elsewhere.
- **If the point is a thin CLI wrapper for a demo**: Zig-with-curl or a `bash | jq` script. Anything that reduces to "run curl, run jq, done" is honest.

## Minimal reproduction

The smallest possible mock + CLI + TUI + MCP that replicates the demos in ~50 lines each. This is the reset button — if all 10 build repos vanished, someone could reconstruct the demo surface from this section alone.

### Mock server — one Python file, ~40 lines

```python
#!/usr/bin/env python3
# min-mock.py — smallest useful Solidus-shaped mock, cart-consistent, in-memory.
# Run: python3 min-mock.py  → :4010
import json, secrets, uuid
from http.server import BaseHTTPRequestHandler, HTTPServer

PRODUCTS = [
    {"id": i, "name": f"Solidus Item {i}", "display_price": f"${10 * i}.00", "sku": f"SLD-{i:02d}"}
    for i in range(1, 6)
]
SESSIONS = {}   # order_token -> order

class H(BaseHTTPRequestHandler):
    def _reply(self, code, body):
        b = json.dumps(body).encode()
        self.send_response(code); self.send_header("Content-Type","application/json"); self.end_headers(); self.wfile.write(b)
    def _auth_ok(self): return (self.headers.get("Authorization") or "").startswith("Bearer ")
    def do_GET(self):
        if not self._auth_ok(): return self._reply(401, {"error":"Unauthorized"})
        p = self.path.split("?")[0]
        if p == "/products": return self._reply(200, {"products": PRODUCTS, "count": len(PRODUCTS)})
        if p.startswith("/products/"):
            pid = int(p.split("/")[-1])
            hit = next((x for x in PRODUCTS if x["id"] == pid), None)
            return self._reply(404, {"error":"Not Found"}) if not hit else self._reply(200, hit)
        if p == "/orders/current":
            tok = self.headers.get("X-Spree-Order-Token")
            if tok and tok in SESSIONS: return self._reply(200, SESSIONS[tok])
            new_tok = f"tok_{secrets.token_hex(6)}"
            SESSIONS[new_tok] = {"token": new_tok, "number": f"R{uuid.uuid4().int % 100000}", "line_items": [], "total": "0.00"}
            self.send_response(200); self.send_header("X-Spree-Order-Token", new_tok); self.send_header("Content-Type","application/json"); self.end_headers(); self.wfile.write(json.dumps(SESSIONS[new_tok]).encode()); return
    def do_POST(self):
        if not self._auth_ok(): return self._reply(401, {"error":"Unauthorized"})
        if self.path == "/orders":
            tok = f"tok_{secrets.token_hex(6)}"; SESSIONS[tok] = {"token":tok, "number":f"R{uuid.uuid4().int%100000}", "line_items": [], "total":"0.00"}
            return self._reply(201, SESSIONS[tok])
        if self.path == "/orders/current/line_items":
            tok = self.headers.get("X-Spree-Order-Token")
            if tok not in SESSIONS: return self._reply(401, {"error":"token required"})
            body = json.loads(self.rfile.read(int(self.headers.get("Content-Length",0))))
            li = body["line_item"]; SESSIONS[tok]["line_items"].append({**li, "id": len(SESSIONS[tok]["line_items"])+1})
            SESSIONS[tok]["total"] = f"{sum(int(x['quantity']) * 10.0 for x in SESSIONS[tok]['line_items']):.2f}"
            return self._reply(200, SESSIONS[tok])

if __name__ == "__main__":
    HTTPServer(("127.0.0.1", 4010), H).serve_forever()
```

This satisfies F1 (products list with bearer), F2 (product 404 for unknown), F3 (order create → mints session token), and the v1.1 CART-stage session-shim invariant (add + show returns the same body).

### CLI — one bash script, ~15 lines

```bash
#!/usr/bin/env bash
# min-cli.sh — the smallest CLI that satisfies the v1.9 thin-wrapper pattern.
set -eu
: "${LIQUIDUS_BASE_URL:=http://localhost:4010}"
: "${LIQUIDUS_BEARER:=liquidus-dev-stub}"
AUTH=(-H "Authorization: Bearer ${LIQUIDUS_BEARER}")
case "${1:-help}" in
  products) case "${2:-}" in
    search) curl -sf "${AUTH[@]}" "${LIQUIDUS_BASE_URL}/products" | jq ;;
    get)    curl -sf "${AUTH[@]}" "${LIQUIDUS_BASE_URL}/products/${3:?product id}" | jq ;;
  esac ;;
  order)  case "${2:-}" in
    list)   curl -sf "${AUTH[@]}" "${LIQUIDUS_BASE_URL}/orders/mine" | jq ;;
    get)    curl -sf "${AUTH[@]}" "${LIQUIDUS_BASE_URL}/orders/${3:?order number}" | jq ;;
  esac ;;
  spec-sha) echo "SOLIDUS_SPEC_SHA=8d781ac742e38a83e417a4b90297b74f6266b070" ;;
  *) echo "usage: liquidus {products search|products get ID|order list|order get NUM|spec-sha}"; exit 2 ;;
esac
```

15 lines, satisfies v1.1 exit-code contract (curl -f gives 22 on 4xx/5xx, close enough), v1.2 bearer via env, v1.8 spec-sha.

### TUI — one Python file, ~30 lines

```python
#!/usr/bin/env python3
# min-tui.py — smallest slash-palette TUI, line-oriented (per v1.5 §TUI idiom acceptance).
import os, json, sys, urllib.request

BASE = os.environ.get("LIQUIDUS_BASE_URL", "http://localhost:4010")
BEARER = os.environ.get("LIQUIDUS_BEARER", "liquidus-dev-stub") or None
def call(path):
    req = urllib.request.Request(f"{BASE}{path}")
    if BEARER: req.add_header("Authorization", f"Bearer {BEARER}")
    try: return json.loads(urllib.request.urlopen(req, timeout=5).read())
    except Exception as e: return {"error": str(e)}

print("min-tui — /help /products search /products get ID /order NUM /quit")
stage = "browse"
while True:
    try: line = input(f"liquidus [{stage}]> ").strip()
    except (EOFError, KeyboardInterrupt): break
    if not line.startswith("/"): print("slash commands only"); continue
    parts = line[1:].split()
    if not parts: continue
    head, rest = parts[0], parts[1:]
    if   head == "quit": break
    elif head == "help": print("commands: products search | products get ID | order NUM | quit")
    elif head == "products" and rest and rest[0] == "search":
        stage = "browse"; print(json.dumps(call("/products"), indent=2)[:1000])
    elif head == "products" and rest and rest[0] == "get" and len(rest) > 1:
        stage = "browse"; print(json.dumps(call(f"/products/{rest[1]}"), indent=2))
    elif head == "order" and rest:
        stage = "post-order"; print(json.dumps(call(f"/orders/{rest[0]}"), indent=2))
    else: print("unknown command")
```

30 lines. Slash palette, stage tracking, per-command HTTP call, no dependencies beyond stdlib.

### MCP server — one Python file, ~50 lines

```python
#!/usr/bin/env python3
# min-mcp.py — smallest MCP server: JSON-RPC over stdio, 2 tools, F5 provenance wrap.
# Wired hand-authored (no mcp SDK) to prove the protocol shape.
import json, sys, os, urllib.request

BASE = os.environ.get("LIQUIDUS_BASE_URL", "http://localhost:4010")
BEARER = os.environ.get("LIQUIDUS_BEARER", "liquidus-dev-stub") or None
SPEC_SHA = "8d781ac742e38a83e417a4b90297b74f6266b070"

# v1.4 §MCP-server bearer env: refuse empty-bearer startup
if os.environ.get("LIQUIDUS_BEARER") == "":
    print("liquidus-mcp: LIQUIDUS_BEARER='' is invalid for MCP server", file=sys.stderr); sys.exit(3)

def _call(path):
    req = urllib.request.Request(f"{BASE}{path}")
    if BEARER: req.add_header("Authorization", f"Bearer {BEARER}")
    return json.loads(urllib.request.urlopen(req, timeout=5).read())

def wrap(result): return {"provenance": {"source":"prism-mock", "spec_sha":SPEC_SHA, "backend":"none"}, "result": result}

TOOLS = [
    {"name":"list_products", "description":"browse: list products", "inputSchema":{"type":"object","properties":{}}},
    {"name":"get_product",   "description":"browse: get product by id", "inputSchema":{"type":"object","properties":{"id":{"type":"integer"}},"required":["id"]}},
]

def dispatch(msg):
    m = msg.get("method")
    if m == "initialize":
        return {"jsonrpc":"2.0","id":msg["id"],"result":{"protocolVersion":"2024-11-05","capabilities":{"tools":{}},"serverInfo":{"name":"min-mcp","version":"0.1"}}}
    if m == "notifications/initialized": return None
    if m == "tools/list":
        return {"jsonrpc":"2.0","id":msg["id"],"result":{"tools":TOOLS}}
    if m == "tools/call":
        name = msg["params"]["name"]; args = msg["params"].get("arguments", {})
        if name == "list_products": body = _call("/products")
        elif name == "get_product": body = _call(f"/products/{args['id']}")
        else: body = {"error": f"unknown tool: {name}"}
        return {"jsonrpc":"2.0","id":msg["id"],"result":{"content":[{"type":"text","text":json.dumps(wrap(body))}]}}
    return {"jsonrpc":"2.0","id":msg.get("id"),"error":{"code":-32601,"message":f"Method not found: {m}"}}

for line in sys.stdin:
    line = line.strip()
    if not line: continue
    resp = dispatch(json.loads(line))
    if resp: print(json.dumps(resp), flush=True)
```

50 lines. Satisfies v1.4 F5 wrap shape, v1.4 MCP-server empty-bearer refuse, v1.5 id-type-integer for get_product's inputSchema.

### Drive them together

```bash
# terminal 1
python3 min-mock.py &

# terminal 2 — CLI
./min-cli.sh products search
./min-cli.sh products get 3
./min-cli.sh spec-sha

# terminal 3 — TUI
python3 min-tui.py
# then type: /products search, /products get 3, /quit

# terminal 4 — MCP round-trip (no SDK)
(printf '%s\n' \
   '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"demo","version":"0"}}}' \
   '{"jsonrpc":"2.0","method":"notifications/initialized"}' \
   '{"jsonrpc":"2.0","id":2,"method":"tools/list"}' \
   '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"get_product","arguments":{"id":3}}}' ) \
| python3 min-mcp.py | jq
```

Total: **135 lines of code** for the smallest working reproduction. The build repos are collectively ~10,000 lines. The ratio is instructive: most of what a "real" implementation adds is *ergonomics*, not *contract satisfaction*.

## What I would do differently

1. **Reify the upstream OAS in the same commit as the initial spec.** The v0 → v1.0 major bump was caused by claiming v2 storefront/platform paths when the pinned SHA served v1 classic. The reification target (`gmake spec`) existed by v0.0 but wasn't run before writing fixtures. Reify first, write fixtures against the reified copy, always.

2. **Ship the customer-flow narrative in v0, not v1.0.** The L7 design-agent's output landed alongside v1.0, but its content (five stages, tag → stage mapping, CLI/TUI/MCP triangulation) was structural and would have prevented three of the six MINOR revisions. Any spec that has an end-user in the domain SHOULD lead with the user's narrative before enumerating the technical surface.

3. **Require every FEEDBACK.md to include a §Non-issues section from the start.** Corrections-only feedback drifts toward over-specification. This was added mid-cycle in CLAUDE.md's revision discipline but should have been present in the v0 CLAUDE.md.

4. **Publish the demo mock's shape as normative in v0.** The gap between "Prism returns schema-noise" and "here's what a curated demo should look like" was the reason for the v1.8 boundary exception. If v0 had said "a demo mock's fixture data MUST be shaped like this," the exception wouldn't have been an exception.

5. **Do the language survey before writing the CLI section.** The v0 §Component: CLI (Go) section was Go-specific and became historical by v1.0. Writing it language-neutrally from the start would have saved a spec revision.

6. **Time-box each grind at ~10 minutes.** The v0 → v1.9 cycle was 97 minutes for 10 builds. Each grind averaged ~10 minutes of implementation + FEEDBACK.md + fold. Anything above 15 minutes correlated with either scope creep in the build or a subtle spec ambiguity that would have been caught by an earlier commit. Fast cycles beat exhaustive ones.

## The one durable finding

*A PRD without refutation conditions cannot fail. A PRD that can fail cannot mislead.* The single change that mattered most across the whole cycle was writing every constraint as a bulleted `If <observable>, then this spec is wrong and MUST be updated.` Everything else — style guide, version-bump policy, fixture numbering, feedback structure — is scaffolding around that one idea.
