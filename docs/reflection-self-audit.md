# Self-audit: applying the reflection & evaluation frame to the liquidus grind

Applying the six techniques from the "Reflection and evaluation" chapter to the actual v0 → v1.15 cycle. For each technique I say: what the mechanism looked like in this project, what worked as intended, what didn't, and what durable skill was extracted.

## 1. Intrinsic self-correction failure — the external signals that made correction possible

**What the chapter names:** an agent asked to "review your own output and improve it" produces trivially-different rewrites unless grounded in external signals.

**How it played in liquidus:** the v0 spec had three load-bearing bugs — wrong API generation (v2 storefront/platform assumed, upstream OAS is v1 classic), wrong storefront/platform auth split, wrong tag count (29 vs actual 33). No amount of me re-reading `spec.org` would have caught any of them. All three surfaced from **external signals**:

- The tag-count error surfaced from `gmake tags` (a shell command running against reified bytes).
- The API-generation error surfaced from `liquidus-001`'s FEEDBACK.md, which reported the concrete path-prefix stripping under Prism.
- The auth-split error surfaced from the same FEEDBACK, driven by inspecting the reified OAS's `securitySchemes` block.

Intrinsic reflection would have kept all three bugs in v0 through v1.9. Later, the same pattern repeated with the `X-Spree-Token` speculation in the v2 draft — I would have kept it normative without the mock team's live truth table refuting it.

**Extracted skill:** *the reify-first rule.* If a spec references an upstream artifact (OAS, schema, config), the artifact MUST be fetched and the actual bytes read before any assertion is written against them. Not "I'll fetch it later" — before the first assertion. This is now durable across projects.

**What still doesn't work:** even with `gmake spec` available in v0, I still didn't run it before writing fixtures F1–F5. The rule existed as a MAKE target but not as a discipline. The lesson is that tooling is necessary but not sufficient; the discipline of *always running the tool* is a separate thing to bake in.

## 2. Generator-Critic loops — where the critic was tool-grounded

**What the chapter names:** the generator proposes output; the critic evaluates using tools (not just LLM judgment); the loop refines until the critic accepts.

**How it played:**

- I was the *generator* (writing spec sections, build code, fixture assertions).
- The *critic* was concrete: `curl` probes, `jq` shape assertions, `pytest` / `rspec` runs, `gmake verify` outputs, live-backend responses.
- Every refutation condition in `spec.org` (`If <observable>, then this spec is wrong and MUST be updated`) is a **pre-registered critic**. The observation is what the loop measures against; the "MUST be updated" is the loop's edit action.

The v1.14 → v1.15 correction cycle is the cleanest example:

1. Generator wrote SDK code assuming `.get("/products")` would resolve against `SPREE_URL=http://host/api`.
2. Critic (Faraday `:logger` middleware) surfaced the actual request URL: `http://host/products` — the `/api` was gone.
3. Generator hypothesized a `.json` extension bug (v1.13). Wrote the fix.
4. Critic ran the CLI against real Solidus. Still failed — the actual body was HTML, not JSON.
5. Generator hypothesized a content-type parsing bug (v1.14). Wrote the fix. Prism regressions stayed clean, but real Solidus still returned HTML.
6. Critic (Faraday `:logger` again, now with headers=true) surfaced the URL was still `/products`, not `/api/products`. The content-type fix was necessary but secondary.
7. Generator wrote v1.15 (strip leading `/`, append trailing `/` on base URL). Critic finally passed.

**What worked:** the critic was cheap. Every iteration cost ~2 seconds of shell time. Three wrong hypotheses in a row cost minutes, not hours.

**What didn't work:** the generator (me) fell in love with the first hypothesis (`.json` extension) and shipped it as v1.13 before running the critic. That revision had to be superseded. The lesson: **run the critic before tagging.**

**Extracted skill:** *Refutation-condition-as-pre-registered-critic.* Any normative statement in a spec should carry a paired observable that can falsify it. If the observable is checkable with a shell command, the critic loop closes in seconds.

## 3. Skill packages — the SKILL.md ecosystem

**What the chapter names:** reusable capabilities packaged with a manifest, invokable by future agents.

**How it played:** the artifacts that graduated to "skill" status during the grind:

| Artifact | Reusability | Where it lives |
|----------|-------------|-----------------|
| `GNUmakefile` reify+validate+tags+version pattern | Any spec that references an upstream OpenAPI file | `spec.org` §Shared substrate; verbatim reusable |
| FEEDBACK.md 5-section template (ambiguities / missing / contradictions / firings / non-issues) | Any spec-consuming build repo | `CLAUDE.md` §Build repo scope |
| The refutation-condition regime | Any PRD/spec | `spec.org` §Style guide |
| The `docs/writeup.md` §Minimal reproduction pattern (135-line reset button) | Any grind's retrospective | `docs/writeup.md` |
| The version-bump policy (major = wire-break; minor = additive) | Any spec-tracked artifact | `spec.org` §Versioning policy |

**What worked:** the GNUmakefile skill package is the strongest — three lines of variable + six targets, and any consumer can `gmake spec / validate / tags / version / clean`. Every downstream build repo copied it verbatim.

**What didn't work:** I didn't extract a SKILL.md for the "how to write a FEEDBACK.md" pattern until midway through — the first FEEDBACK.md (liquidus-001) has all five sections but I hand-wrote them from scratch. If I had extracted the template first, cycles 2–8 would have been more consistent structurally.

**Extracted skill:** *skills should be extracted from the first artifact, not the third.* The moment I've written a pattern twice in a slightly different form, I have delayed extraction too long. The cost of hand-writing the third one is zero-marginal; the cost of retroactively normalizing five earlier ones is not.

## 4. Experience Replay — the three abstraction levels

**What the chapter names:** replay of past experiences at concrete / structural / meta levels for cross-session learning.

**How it played in this project:**

**Concrete replay (L1).** The specific mock URLs, tokens, and fixture assertions replayed across all 10 build repos. `SPREE_URL=http://192.168.86.22:4010`, `SPREE_TOKEN=liquidus-dev-stub`, fixtures F1–F5 verbatim. This is the cheapest replay layer — it's just copy-paste of concrete values.

**Structural replay (L2).** The pattern-templates: FEEDBACK.md 5-section shape, version-bump policy, cycle discipline (implement → FEEDBACK → fold → next), CLAUDE.md constraint sections. Consumers replayed the *structure* while filling in language-specific content.

**Meta replay (L3).** The philosophical rules that outlast this specific project: reify-first, refutation-as-tripwire, "a PRD without refutation conditions cannot fail." These are what belong in agent memory (this project's `feedback_spec_evolution.md`) for cross-session use.

**What worked:** the L1 → L2 → L3 progression was natural. Every FEEDBACK.md contributed to L1 (specific corrections), L2 (patterns to reuse in the next revision), and occasionally L3 (a durable rule).

**What didn't work:** L3 memories were written *late in the cycle*. `feedback_spec_evolution.md` in project memory captures the "over/under-specification oscillation" rule but was written mid-cycle, not from the earliest observation. Future projects should write L3 memories from cycle 1.

**Extracted skill:** *when a rule is stated for the second time in a project, promote it to L3 memory immediately.* Don't wait for the "when I do this next time" moment — write it into agent memory as the second observation lands, so cycle 3 through N benefit.

## 5. Self-Heal Loops — deterministic failure recovery through test-driven feedback

**What the chapter names:** when a test fails deterministically, the agent runs a loop that edits + re-tests until the test passes.

**How it played:** the strongest self-heal loop in the project was `liquidus-001`'s `bin/verify.sh` — probed F1–F4 against both Prism and MSW, printed a `mock × fixture` grid. When any fixture failed, the loop was:

```
verify.sh → identify failing cell → edit fixture or SDK → verify.sh
```

Same pattern in `liquidus-002`'s pytest suite (`test_sdk_fixtures.py`), `liquidus-006`'s rspec (`sdk_spec.rb`), `liquidus-008`'s cart-consistency invariant (`session_store_spec.rb`).

**What worked:** the loops closed fast when the tests were:
- **Deterministic** — same input, same output, always. Prism `-d` mode broke this once (nondeterministic bodies); the fix was to test only what's assertable (status codes, presence of keys), not specific values.
- **Cheap to run** — under 1 second per iteration. Any test suite above 30 seconds discourages the loop and encourages guessing.
- **Diagnostic** — a failing fixture named exactly which assertion broke. Not "test failed"; "F4a expected 401, got 200."

**What didn't work:** the v1.13 → v1.14 → v1.15 correction cycle would have been faster with a *live-backend acceptance test* baked into the reference CLI. I didn't have one; every time I tagged a fix I re-ran the manual `curl | jq` verify. If liquidus-006 had shipped a `rspec live_solidus_spec.rb` with the SPREE_URL/SPREE_TOKEN env vars documented, the loop would have been mechanical.

**Extracted skill:** *the self-heal loop's speed is set by the test suite's diagnosability and runtime.* Optimize both, before writing the test that guards a bug you've fixed once.

## 6. Five-layer evaluation stack

**What the chapter names:** a layered eval methodology that turns scattered metrics into a coherent system.

**Mapping to liquidus:**

| Layer | Question it answers | Concrete artifact |
|-------|--------------------|--------------------|
| **L1: unit / property** | Does the code's smallest testable claim hold? | `test_provenance.py` (F5 shape), `session_store_spec.rb` (cart-add invariant), `spec/sdk_spec.rb` (bearer tri-state) |
| **L2: fixture / contract** | Do the requests and responses match the OAS shape? | `bin/verify.sh` (F1–F5 curl probes against Prism + MSW), `test_sdk_fixtures.py` (Python live-mock assertions) |
| **L3: cross-implementation parity** | Do multiple language implementations agree on observable behavior? | Not formalized in this cycle; would look like a shared test-runner hitting each language's CLI with the same args and asserting the JSON outputs converge |
| **L4: PRD-vs-implementation feedback** | Does the spec name the tripwires the implementation needs? | Every `FEEDBACK.md` — the L4 artifact per build |
| **L5: live-backend end-to-end** | Does the whole toolkit survive contact with the target of the spec? | The `:3002` proxy probe. The reference CLI, real bodies, real order lookups |

**What worked:** L1, L2, L4, L5 all landed with real artifacts. L4 is the load-bearing one — no other layer catches "the spec is silently wrong."

**What didn't work:** L3 was never formalized. Cross-consumer parity is asserted narratively ("the Rust and Ruby CLIs produce equivalent outputs for the same subcommand") but never *measured*. If a build repo silently diverged from the shared surface — a language-specific quirk crept in — no automated test would catch it. Future spec work should add L3 explicitly.

**Extracted skill:** *the five layers are load-bearing in different ways.* L1 catches unit bugs. L2 catches contract drift. L3 catches surface divergence across implementations. L4 catches spec-level bugs. L5 catches "the whole thing is wrong." Skipping any layer means shipping a class of bug undetected. Skipping L3 is the most common miss because it requires cross-repo coordination.

## The composite lesson

Each of the six techniques from the chapter landed as a real mechanism in this project — some cleanly, some only partially. The composite pattern is:

- **External signals** (tools, probes, tests) are the only path to reliable self-correction. Intrinsic reflection alone is decorative.
- **Generator–critic loops** are cheap when the critic is a shell command and expensive when it's another LLM call.
- **Skills** should be extracted early (second occurrence, not third).
- **Experience replay** should promote rules to L3 memory as they land, not retroactively.
- **Self-heal loops** are gated by test suite runtime + diagnosability; optimize both.
- **The five-layer evaluation stack** is complete only when all five layers have concrete artifacts; L3 (cross-implementation parity) is the most-missed and the one that catches surface drift.

Applied back to how this specific project should evolve past v1.15:

1. L3 cross-implementation parity test: a small runner that hits each CLI (`liquidus-002` through `-010`) with the same three subcommands (`products search`, `products get 1`, `spec-sha`) and asserts stdout convergence.
2. L5 live-backend acceptance test in `liquidus-006`: `spec/live_solidus_spec.rb` that runs when `SPREE_URL` points at a real Solidus, asserts F1–F9 pass against real bodies.
3. A `SKILL.md` inside the public repo formalizing the FEEDBACK.md template, the version-bump policy, and the GNUmakefile pattern, so any *new* spec (not just liquidus) can bootstrap the regime without hand-copying from here.

Those three items would close the L3/L5 gap and make the whole regime portable to the next domain.
