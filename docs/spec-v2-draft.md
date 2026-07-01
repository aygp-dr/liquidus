# liquidus spec v2.0 — DRAFT (live-Solidus mode)

**Status: DRAFT.** Not tagged. Not normative. Meant to be iterated against a reachable Solidus 4.x. This file is what changes; `spec.org` at head (v1.9) is what's normative until the DRAFT lands.

**Scope of this draft:** the CLI, TUI, and MCP surfaces. Nothing else. Reasons enumerated in §Scope below.

---

## v2 foundational axiom

**A live Solidus instance is the source of truth.** The v1 axiom ("no backend has solidified — contract in, contract out") is deliberately refuted for consumers that opt into live mode. The reified upstream OAS remains one input; the running instance is a co-equal input, and where they disagree the instance wins for behavior but the contract wins for shape assertions.

Where v1 said *"there is no running Solidus to test against, therefore the overlay cannot be exercised"*, v2 says *"a running Solidus exists at a URL configured per-consumer; the CLI/TUI/MCP MUST honestly report which of the two they are talking to on every response."*

**Anti-axiom (v2 rejects):** *"live mode is just mock mode with a real URL."* It is not. Statelessness, role-based denial, real error codes, and real-cost side effects all change simultaneously. Consumers that swap the URL without wiring the v2 changes below will behave incorrectly in ways that are silent, not loud.

---

## Scope

I own the CLI, TUI, and MCP-server surfaces. This draft therefore covers those and nothing else. Deliberately out of scope for v2 in this draft:

- **The mock.** The v1 `liquidus-001` (Prism + MSW) and `mocks/msw/` demo mock remain unchanged. A different team owns them and v2 does not require they change.
- **The overlay.** The Cmd-J admin overlay shipped at `liquidus-overlay.equinox-yak.workers.dev/overlay.bundled.js` is a sibling project. v2 does NOT specify its behavior; it references its existence in the promoted §Related-but-out-of-scope section (below).
- **The SDK.** v1.6 §SDK generation contract stays. If an SDK layer needs live-mode changes (it does), that's a v2 draft in the SDK team's court, not this one.
- **The session shim.** v1.7 `liquidus-008` (Rack shim) is explicitly **deleted** from v2's normative surface — never wire in front of live Solidus. If someone wants a live-adjacent state layer they build it differently and call it something else.

If a v2 change I propose in this draft requires action from one of those other teams, I flag it inline with **[coord]** so the boundary is obvious.

---

## Wire-breaking changes vs v1 (justifies MAJOR)

The following are wire-breaking against v1 consumers built to `mock` behavior. Together they justify v2.0 MAJOR, not a v1.x MINOR.

1. **New env var `LIQUIDUS_BACKEND`.** Values: `mock` (default, v1-compat) or `live`. When `live`, the v1.2 cart-bootstrap placeholder, the v1.1 statelessness-tolerant F3 assertion, and the v1.4 F5 `provenance.source = "prism-mock"` claim are all wrong.

2. **New env var `LIQUIDUS_AUTH_MODE`** (replaces the ~~`LIQUIDUS_AUTH_HEADER`~~ proposal — see F-B: `X-Spree-Token` refuted). Values: `header` (default; `Authorization: Bearer <key>` — the only working header form) or `query` (URL query param `?token=<key>`, second channel real Solidus honors). NOT a security recommendation; both are wire-level channels Solidus 4.7 accepts.

3. **Exit code 8 added.** v1.1's table (0/3/4/5/6/7) extends: `403 → exit 8` ("forbidden — role-denied, not credential-missing"). In v1 mock mode Prism could never emit 403 because it did presence-only auth; in live mode a role-scoped API key hits 403 constantly, and conflating it with 401 confuses users about whether they need a token or a *different* token.

4. **F5 governance-tuple `source` becomes an enum.** v1.4 fixed it as `"prism-mock"`. v2 promotes to one of: `"prism-mock"`, `"msw-demo"`, `"live-solidus"`, `"session-shim"`. Any MCP tool result that emits a `source` value inconsistent with what the server actually talks to is a fixture failure (dishonesty is worse than a mislabel).

5. **F5 governance-tuple `backend` becomes an enum.** v1.4 fixed it as `"none"`. v2 promotes to: `"none"` (mock), `"solidus-4.x"` (with x replaced by actual minor when known via a `X-Runtime-Version` header the server emits, else literal `solidus-4.x`), or `"solidus-unknown"` (live URL served an unrecognizable identity).

6. **v1.7 §Session shim is removed from v2's surface.** In v2 consumers MUST NOT wire the shim between themselves and the URL. If a build repo attempts to (i.e. sets `LIQUIDUS_BASE_URL` to the shim), the shim's own `config.ru` guard from v1.7 refuses — that check moves from SHOULD (v1.7) to MUST (v2).

7. **Statelessness assumption inverts.** The v1.7 F7 assertion says "under bare Prism the fixture will fail; under the shim it MUST pass." In v2 live mode: cart-add MUST reflect in a subsequent cart-show, always. There is no "bare" mode — the backend is real and stateful, always. Consumers written against v1 will still work (a real backend is at least as consistent as the shim was), but the fixture text becomes wrong.

---

## Backwards compatibility via `LIQUIDUS_BACKEND`

A v2-conformant CLI, TUI, or MCP MUST support both modes and pick at startup:

- `LIQUIDUS_BACKEND` unset OR `mock` → v1 semantics. No changes visible. Existing scripts continue.
- `LIQUIDUS_BACKEND=live` → v2 semantics active. All the wire-breaking changes above apply.

The default (`mock`) means every existing v1 script keeps working. **Consumers do not have to migrate immediately.** But a script that sets `LIQUIDUS_BACKEND=live` and points at Prism will observe honest failures (cart consistency actually holds; 403 possible; provenance says `live-solidus` while the URL is Prism — refutation firing).

---

## CLI surface changes (v2)

Everything from v1.0 §CLI surface (27 subcommands + global flags) stays. Additions:

### New global flags

- `--backend <mock|live>` — override `LIQUIDUS_BACKEND` for a single invocation. Useful for `liquidus --backend=live products search` from a mock-defaulting shell.
- `--auth-header <bearer|x-spree-token>` — override `LIQUIDUS_AUTH_HEADER` for a single invocation. Same rationale.
- No new sub-tree; the existing 27 subcommands work in both modes.

### Behavior changes per subcommand

- **`liquidus cart show`** — in `live` mode, `LIQUIDUS_ORDER_TOKEN=<session-shim-required>` placeholder is REMOVED. Emits the *real* order-token minted by Solidus, both to stdout (in JSON body's `token` field) and stderr (as `LIQUIDUS_ORDER_TOKEN=<real-token>` for shell reuse). v1.8's anti-pattern fix (also-to-stdout) survives; only the placeholder text changes.
- **`liquidus checkout complete`** — in `live` mode, MUST prompt for interactive confirmation when stdin is a TTY (`isatty(0)==1`). Reason: `checkout complete` is the irreversible cost-incurring step, and swapping URL from mock to live can turn a demo tap into a real order. Non-interactive mode (`isatty(0)==0` or `--no-confirm`) is only conformant when explicit.
- **`liquidus spec-sha`** — v1.9 says it reports the compile-time SHA. v2 adds: on `LIQUIDUS_BACKEND=live`, MUST print a second line: `LIQUIDUS_BACKEND=live URL=<base-url>`. Consumers reading spec-sha to detect what they're talking to now get both facts.

### Error-response table extension (v2)

Extending v1.1 §Error-response contract:

| HTTP | Meaning                                      | Exit | Message |
|------|----------------------------------------------|------|---------|
| 200/2xx | success                                   | 0    | (stdout body) |
| 401  | no auth OR auth-format-wrong                 | 3    | check LIQUIDUS_BEARER / LIQUIDUS_AUTH_HEADER |
| 403  | **role-denied (auth present, insufficient)** | **8**| your API key is missing a role for this endpoint |
| 404  | not found                                    | 4    | check the id                                  |
| 4xx other | client error                            | 5    | (server message) |
| 5xx  | server error                                 | 6    | (server message) |
| net  | connect/timeout                              | 7    | check LIQUIDUS_BASE_URL and network           |

Exit code 2 (user error) stays reserved (v1.8 typo-suggestions).

---

## TUI surface changes (v2)

Slash palette from v1.0 §TUI slash commands (27 + 4 meta) stays. Additions:

- **`/status`** (new, meta-stage). Pings the backend, prints one of:
  - `mock (prism -d) — schema-noise, cart-consistent via session-shim if wired`
  - `mock (msw-demo) — curated data, cart-consistent`
  - `live — solidus-4.7, cart-consistent, real cost on complete`
  - `unreachable — check LIQUIDUS_BASE_URL and network`
  The identification is best-effort: probe `/api/v2/platform/spree/version` or equivalent, fall back to `solidus-unknown` if the endpoint isn't mounted.

- **`/refresh` semantic change.** In v1 the docstring said "makes statelessness observable." In v2 live mode: `/refresh` re-hits the backend and MUST show the same cart it did last invocation (barring backend-side mutation from another session). The command still exists but the demonstrative purpose is inverted.

- **`/where` prefix.** In `live` mode, `/where` output MUST prefix with `LIVE:` — makes it visible in screencasts that a session is live vs mock. Example: `LIVE: stage=cart, backend=solidus-4.7`.

---

## MCP server surface changes (v2)

Everything from v1.0 §MCP tool/resource/template surface (27 tools + 16 resources + 7 templates) stays. Additions:

### New tool: `assert_backend_kind`

```json
{
  "name": "assert_backend_kind",
  "description": "Verify what the MCP server is actually connected to. Returns provenance without invoking a business endpoint.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "expected": { "type": "string", "enum": ["prism-mock", "msw-demo", "live-solidus", "any"] }
    }
  }
}
```

Returns the F5 governance-tuple (with a synthetic empty `result`). Agents call this on session start to confirm what backend they're wired to before issuing writes. Fails (non-2xx tool error) if `expected != any` and the actual backend differs.

### F5 governance-tuple enum promotion (normative)

v1.4 fixed `source: "prism-mock"`. v2 makes it a required enum:

```json
{
  "provenance": {
    "source": "prism-mock" | "msw-demo" | "live-solidus" | "session-shim",
    "spec_sha": "<pinned OAS commit>",
    "backend": "none" | "solidus-4.7" | "solidus-4.8" | ... | "solidus-unknown",
    "url": "<full base URL the server is calling>"
  },
  "result": "<upstream response body>"
}
```

The `url` field is new (v2). Reason: an agent that wants to *verify* what it's talking to needs to see the URL, not just the source label. `source: "live-solidus"` with `url: "http://localhost:4010"` is a fixture failure — the label lies.

### MCP-server bearer env expanded

v1.4 said an empty `LIQUIDUS_BEARER` was invalid on MCP server startup. v2 extends: on `LIQUIDUS_BACKEND=live`, `LIQUIDUS_BEARER=liquidus-dev-stub` (the mock stub literal) is ALSO invalid at startup. Reason: an agent connecting to a live backend with the stub literal will hit 401 forever; the server should refuse to start rather than let the agent burn tokens on doomed requests. Exit code 3, stderr message names the specific stub literal.

### Anti-tool-parameter rule stays

v1.4's rule (bearer MUST NOT be a tool parameter) stays and extends: neither `LIQUIDUS_AUTH_HEADER` nor `LIQUIDUS_BACKEND` may be tool parameters. Agents don't get to switch backends per-tool-call; the server's identity is fixed at startup.

---

## Refutation conditions (v2)

- *If a v2-conformant consumer sets `LIQUIDUS_BACKEND=live` against a Prism URL and observes cart-add-then-cart-show consistency, but the F5 tuple emits `source: "live-solidus"`, then this spec is wrong and MUST be updated — the honesty invariant is broken.*
- *If Solidus 4.x's admin-scoped and storefront-scoped API keys produce the same 401 response body (indistinguishable to a caller), then the exit-code-8 (403) distinction is not observable in practice and this spec is wrong.*
- *If any v2 consumer connects to a URL where `X-Spree-Token: <api-key>` returns 200 but `Authorization: Bearer <api-key>` returns 401 (or vice versa), and the consumer's `LIQUIDUS_AUTH_HEADER` was set incorrectly, then the spec MUST require a startup probe that discovers the correct header.*
- *If a build repo attempts to use `assert_backend_kind` as a substitute for actually checking upstream identity (e.g., trusts the URL substring rather than probing), then §MCP tool: assert_backend_kind is wrong and MUST require a wire-probe, not a config-check.*

---

## New fixtures (schemas only; bodies pending live access)

F1'–F9' are the live-mode equivalents of F1–F9. Only shape assertions are named here; concrete request/response bodies wait until a live Solidus 4.x is reachable for authoring.

- **F1'** — products listing, live. Same request shape as F1; response body should include real product data (not schema-faker Latin). Consumer MUST assert `.products[0].name` is non-null and non-random-Latin (some kind of dictionary sanity check).
- **F3'** — order create + fetch, live. The statelessness surprise INVERTS: consumer MUST assert F3b's fetched order includes F3a's order, i.e. persistent state.
- **F4'** — auth presence + auth-header-form. Extends F4: (a) no auth → 401; (b) `Authorization: Bearer <valid-key>` → 200 OR 401 depending on Solidus config; (c) `X-Spree-Token: <valid-key>` → 200 OR 401 depending on same; (d) wrong-role key → 403. The consumer's `LIQUIDUS_AUTH_HEADER` selects (b) or (c); (d) is exit-code-8.
- **F5'** — governance tuple round-trip against live. All the F5 rules stay; source MUST be `"live-solidus"`, backend MUST be `"solidus-4.x"` or `"solidus-unknown"`, url MUST be the actual base URL.
- **F6'** — order-token flow against live. Guest checkout MUST work: real order-token minted, `X-Spree-Order-Token` header carries across calls, backend persists.

F2', F7'–F9' pending until a real body is authored. When live Solidus is reachable, I'll write them.

---

## Migration plan (v1 → v2)

For each of my three surfaces:

1. **CLI.** Add `--backend`, `--auth-header` global flags. Add exit code 8 in the `emit_or_die` / `Emit` layer. Add live-mode branch in `cart show` that strips the placeholder. Update `spec-sha` subcommand to print the second line when backend=live. Ship as a MINOR bump of each build repo (liquidus-002/003/004/006/009/010) with `LIQUIDUS_BACKEND=mock` as default so nothing breaks.

2. **TUI.** Add `/status` command. Change `/refresh` docstring (behavior in mock stays; in live it's a fresh backend read, same as before — the semantic reframing is documentation). Prefix `/where` output with `LIVE:` when backend=live. Ship as MINOR of liquidus-002 and liquidus-006.

3. **MCP.** Add `assert_backend_kind` tool. Expand F5 tuple with the `url` field. Enforce enum on `source` and `backend`. Refuse-empty-bearer extends to refuse-stub-literal-on-live. Ship as MINOR of liquidus-005.

The MAJOR bump on the *spec* is unavoidable (contract shape changes: new required env vars, new enum values, new exit code). The MAJOR bump on each *build repo* is optional — consumers can stay v1-conformant indefinitely, they just don't get live mode.

---

## Related-but-out-of-scope (v2 formalizes)

Promoted from v0's `§Explicit non-goals::Web-context "Jump" command`:

- **Cmd-J admin overlay** — the JS bundle shipped at `liquidus-overlay.equinox-yak.workers.dev/overlay.bundled.js` provides a slash-command palette inside the Solidus admin UI. It is NOT part of `liquidus` v2's spec. It composes with our CLI/TUI/MCP by sharing the command *names* (a customer can walk from `liquidus products search` in a terminal to `Cmd-J → /products search` in the browser and expect the same semantics), but the overlay's shipping cadence, feature set, and hosting are the overlay team's business. Coordination point: the spec's §CLI surface subcommand names are shared vocabulary.

- **The mock.** `liquidus-001` (Prism + MSW), the demo mock in `mocks/msw/`, and any Prism configuration are the mock team's business. v2 adds `source: "msw-demo"` to the F5 enum acknowledging msw-demo as a distinct provenance value but does not tell the mock team what to serve.

- **The SDK.** v1.6 §SDK generation contract stays. If SDKs need live-mode adjustments (URL construction, header selection, error decoding), that's the SDK team's v2 draft. Coordination point: F5 tuple shape (my scope) and the SDK's response wrapper (their scope) MUST agree on the `provenance` key.

- **The session shim.** `liquidus-008` (Rack middleware) is deleted from v2's normative shape. It remains available for `LIQUIDUS_BACKEND=mock` demos of what stateful mock looks like, but v2 consumers MUST NOT wire it in live mode. **[coord]** with shim owner: shim's `config.ru` guard becomes MUST, not SHOULD.

---

## Findings from the 2026-07-01 probe of your infrastructure

Late additions after actually hitting `:4010`, `:3000/api`, and (attempting) `:3001`. All three of these change the shape of v2, so they belong in the draft rather than in the "open questions" bucket.

### F-A. Two mocks serve two API generations

- **`:4010`** (canonical Prism mock) — v1 classic Spree OAS. Response bodies are flat: `{count, products: [{id, name, display_price, ...}]}`. Paths: `/products`, `/orders/mine`.
- **`:3000/api`** (mock-solidus, previously unprobed by me) — v2 JSONAPI shape: `{data: [{id, type: "product", attributes: {name, sku, price}}], meta: {...}}`. Curated data ("Solidus T-Shirt", "SOL-TSHIRT", "$19.99"), not schema-noise. Paths prefixed with `/api/`.

**Implication for v2:** the SDK layer (owned by another team, coord point) MUST adapt to both response shapes. This is not "the CLI reads different envs and calls it a day" — the body parser has to know whether it's expecting `.products[0].name` (v1 flat) or `.data[0].attributes.name` (v2 JSONAPI). Options for v2:

1. **`LIQUIDUS_API_GENERATION` env** (`v1` | `v2`, default detected from response shape on first call). Consumer picks explicitly or auto-detects. Adds startup latency (probe call) unless declared.
2. **URL-path-prefix heuristic.** `SPREE_URL` ending in `/api/` → v2 JSONAPI; else → v1 flat. Zero startup cost but wrong when someone deploys v2 on a non-`/api/`-prefixed URL. Fragile.
3. **Two SDKs.** `liquidus-sdk-v1` and `liquidus-sdk-v2`, consumers pick at build time. Cleanest, most work.

Draft leans toward option 1 with option 2 as a fallback heuristic when the env var is unset. Confirm.

### F-B. `X-Spree-Token` — **REFUTED against real Solidus 4.7**

Live probe against `:3001` (Solidus 4.7 legacy `/api/*`, `libvips` blocker cleared) produced this auth-scheme truth table:

| Method                                    | Result | Note                                                    |
|-------------------------------------------|--------|---------------------------------------------------------|
| no auth                                   | 401    | as expected                                             |
| `Authorization: Bearer <key>`             | 200 ✅ | matches OAS `securitySchemes.api-key = http bearer`     |
| `X-Spree-Token: <key>`                    | 401 ❌ | **REFUTED — was speculation, now confirmed dead**       |
| `Authorization: <key>` (bare, no Bearer)  | 401    | prefix required                                         |
| `?token=<key>` (query param)              | 200 ✅ | **new — a third valid auth channel**                    |
| `Authorization: Bearer <bad-key>`         | 401    | key is validated, not presence-only (unlike Prism)      |

**Normative consequences for v2:**

1. **`LIQUIDUS_AUTH_HEADER` is removed from v2's normative surface.** The two options (bearer vs x-spree-token) collapse to one confirmed option (bearer). No consumer needs to select between them, so no env var is needed. The v2 draft's earlier speculation on this env var was wrong and is deleted.

2. **New: `LIQUIDUS_AUTH_MODE`** with values `header` (default; `Authorization: Bearer <key>`) or `query` (URL query param `?token=<key>`). Useful when consumer environments make header injection hard — a browser link, a `<img src>`, a webhook without header control. NOT a security recommendation; simply the second wire-level auth channel that a real Solidus honors.

3. **Real Solidus validates the key value.** Prism (mock) does presence-only `checkSecurity` — any bearer-shaped string works. Real Solidus 4.7 rejects `<bad-key>`. Consumers CANNOT rely on the stub literal against live; the v1.4 §MCP-server bearer env "refuse-stub-literal-on-live" check MUST be enforced. Under `LIQUIDUS_BACKEND=live` an MCP server started with `SPREE_TOKEN=liquidus-dev-stub` refuses to launch.

4. **The v1.2 bearer tri-state (unset → stub; empty → no header; string → verbatim) still holds** for the `Authorization` header channel. Under `LIQUIDUS_AUTH_MODE=query`, empty-string means the query param is omitted; string means `?token=<value>` gets appended.

5. **Startup probe** (previously proposed as an ergonomic escape hatch) is unnecessary. Bearer is the only working header form; live consumers use it or fail immediately with a clean 401.

### F-B'. Reachability note

Verification of F-B was provided by the mock team from their side; my sandbox still cannot reach `:3001` even with 30-second timeouts (TCP opens, HTTP hangs 30s → curl 000). This is a network-path constraint from the sandbox, unrelated to libvips. The refutations above are landed based on the user-provided truth table, not on independent verification from this sandbox. If a future v2 revision needs to re-test any of these, someone with `:3001` reachability MUST run the probes.

### F-C. Env-var naming coordinated with mock team

Mock team's convention: `SPREE_URL` / `SPREE_TOKEN`. Landed in spec v1.11 (MINOR) with `LIQUIDUS_*` as compat aliases. This is not a v2 concern (already resolved in v1 line) but I'm noting it here so a v2 reviewer doesn't propose the SAME env vars again from scratch.

**Normative env-var precedence for v2:** `SPREE_URL` > `LIQUIDUS_BASE_URL` > built-in default. `SPREE_TOKEN` > `LIQUIDUS_BEARER` > `liquidus-dev-stub`. The v1.2 bearer tri-state applies to whichever wins.

## Open questions (asked to whoever handles v2 ratification)

1. **Which Solidus version(s)?** Draft assumes 4.7 (your instance). If v2 should cover 4.6 or 4.8+, `backend` enum needs to be flexible ("`solidus-4.6`", "`solidus-4.7`", "`solidus-4.8`") — currently I wrote it that way, but confirm the version-detection endpoint. `X-Runtime-Version` was a guess; needs live probe.
2. **Storefront vs Platform vs Classic paths.** Your `:3001` currently serves legacy `/api/*` only. v2 draft is agnostic about which path prefix applies because `LIQUIDUS_BASE_URL` already carries it. But fixture F1'–F9' bodies will differ meaningfully between v2 JSONAPI (`{data: {attributes: {name}}}`) and v1 classic (`{name}`). Draft can't fix that without a live probe.
3. **`assert_backend_kind` — probe or config-check?** Currently the refutation condition insists on wire-probe. That means an extra HTTP request on every MCP session-init. Alternative: config-only (trust `LIQUIDUS_BACKEND`), let the caller shoot themselves in the foot if they misconfigure. My take: probe. Confirm.
4. **Default for `LIQUIDUS_BACKEND` — mock or live?** Draft defaults to `mock` (backward compat). Alternative: default `live`, require explicit `mock` for demos. Live-first is louder — a build that omits the env doesn't silently run against a demo mock. Mock-first is safer. Both are defensible. Confirm.

---

## When this draft lands

- All four open questions have answers.
- At least one build repo (candidate: `liquidus-006` Ruby) has consumed the draft and produced a `FEEDBACK.md` against actual live Solidus 4.7.
- The overlay team has ack'd the shared subcommand-name vocabulary (§Related-but-out-of-scope point 1).
- `spec.org` bumps from v1.9 to **v2.0 MAJOR** and this file becomes historical (moved to `docs/spec-v2-history/2026-07-01-draft.md` or similar).

Until then this file is what changes and `spec.org` at v1.9 is what's normative.
