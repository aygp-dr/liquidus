# liquidus — agent instructions

**Foundational axiom (before line 10, per fixed-point kernel):** this repo is a *contract-only* spec for a Solidus API toolkit; there is no backend, and no implementation lives here. If you catch yourself writing consumer code, mock servers, or SDK stubs in *this* repo, you are in the wrong place — do that work in a `liquidus-00x` private validation repo.

## Your role

You are a coding agent operating in one of two modes. Read the current path before writing anything.

| Mode         | Path                                    | You may edit                        | You must NOT edit                              |
|--------------|-----------------------------------------|-------------------------------------|------------------------------------------------|
| **spec-repo**    | `github.com/aygp-dr/liquidus`           | `README.org`, `spec.org`, `CLAUDE.md` | Anything else — no `src/`, no `sdk/`, no code |
| **build-repo**   | `github.com/aygp-dr/liquidus-00x`       | Everything under the build repo     | The three spec files (copy-only; feed changes back via `FEEDBACK.md`) |

If you cannot tell which mode you're in, stop and ask.

## Confirmation gate

Before writing any code or creating any repository, output a summary of:

1. Which mode you're in (spec-repo or build-repo).
2. Which grind unit the current work maps to (see `spec.org` §Grind units).
3. The refutation condition for that grind unit — the concrete observation that would invalidate the work.

If the user does not confirm, do not proceed.

## Failure handler

If an acceptance test fails, stop. Document what failed, what you tried, and what the blocker is in `FEEDBACK.md` (in a build repo) or in the spec's refutation section (in the spec repo). Do not proceed to the next grind unit. Surface the failure as a CPRR refutation candidate.

## Instrumentation requirement

Every generated response body from a mock, every SDK call, and every MCP tool result carries a governance tuple identifying it as originating from `prism-mock` against a pinned spec SHA — never bare data. See `spec.org` §Component: MCP server for the canonical shape.

## Public repo scope (spec-repo mode)

This is the *entire* tracked file list:

- `README.org` — landing page, three-file constraint, pointer to build repos.
- `spec.org` — the v0 specification and its successors (v0.1, v0.2, …).
- `CLAUDE.md` — this file.

Anything else is a smell. If you need to add a diagram, tangle it from `spec.org` at read time; don't check the rendered SVG in.

## Build repo scope (build-repo mode)

Each `liquidus-00x` repo takes only `README.org`, `spec.org`, and `CLAUDE.md` as input (copied in, never symlinked to a live public checkout) and produces a working implementation of a single grind unit.

`FEEDBACK.md` is a **requirements/PRD clarity report**, not an implementation diary. On completion each build repo lands one at its root, structured as:

1. **Ambiguities** — spec sentences that admitted more than one reading. Quote the sentence, name the two readings, state which the build chose.
2. **Missing requirements** — decisions the implementer had to make that the spec did not cover. What was decided, and what a future spec revision should say.
3. **Contradictions** — places where two sections of the spec pulled in different directions. Cite both.
4. **Refutation firings** — refutation conditions from `spec.org` that were hit, and what they revealed about the spec's assumptions.
5. **Non-issues** — sections that read cleanly and translated to code without friction. This is signal, not filler; it prevents the next revision from over-editing sections that already work.

The public spec revs (v0.1, v0.2, …) accumulate these — never a hidden branch, never a private consensus. The build teams grade the spec, not the other way around.

## The cycle (strict)

For each `n` in 1..5:

1. Copy the current public spec (at whatever version tag is head) into `liquidus-00n`.
2. Implement the grind unit for `liquidus-00n`.
3. Land `FEEDBACK.md` at the root of `liquidus-00n`.
4. **In the public repo:** read `FEEDBACK.md`, revise `spec.org`, bump version (v0.n), commit, tag, push. Do this *before* starting `liquidus-00(n+1)`.
5. Only then bootstrap `liquidus-00(n+1)` — against the updated spec, not v0.

Skipping step 4 collapses the whole regime: a build repo built against an unrevised spec cannot discover a bug the previous build already found. The feedback-then-revise-then-next ordering is the point.

## Build sequence

Ordered by dependency. Do one build at a time; do not start `liquidus-00(n+1)` until `liquidus-00n`'s feedback has landed in the public spec.

| Repo          | Grind unit               | Language / runtime                | Depends on          |
|---------------|--------------------------|-----------------------------------|---------------------|
| liquidus-001  | Mocking framework        | Prism baseline + one alternative  | spec.org only       |
| liquidus-002  | CLI/TUI                  | Python (typer + textual)          | 001 fixtures        |
| liquidus-003  | CLI/TUI                  | Go (cobra + bubbletea)            | 001 fixtures        |
| liquidus-004  | CLI/TUI                  | TypeScript (commander + ink)      | 001 fixtures        |
| liquidus-005  | MCP server               | Language chosen from 002–004 feedback | 001 fixtures    |

## Full-implementation bootstrap protocol

Any `liquidus-00x` build repo, when initialized, follows the **Meta-Meta Prompt: Agent Bootstrap Protocol** from:

- Gist: `https://gist.github.com/aygp-dr/cff87f08f6c0f0225a275fdde52da558`
- Primary file: `meta-meta-prompt.md`

That protocol is the source of truth for CLAUDE.md structure inside build repos (role, anti-goals, build order, conjectures, health-check, memory setup, verification). Do not reinvent it; do not paraphrase it into this file. Fetch it, run it, and cite the gist SHA used at bootstrap time in the build repo's own CLAUDE.md.

The gist also carries the meta-meta-meta and meta⁴ prompts. In this project the relevant termination condition (from meta⁴) is: **write the concrete build**. We are at level 1 (per-repo CLAUDE.md), not going higher — the public spec is *not* a template for other domains; it is a domain instance.

## Anti-goals

- **Do not** ship a live-Solidus adapter in the spec repo. The whole point of `liquidus` is that no backend has solidified.
- **Do not** teach Prism to be stateful. If a build needs cross-request state, build a session shim in the *consumer* (see `spec.org` §Session shim).
- **Do not** collapse the 29 tags into a hand-curated resource taxonomy for the CLI. The tags are the taxonomy — the point of grinding against a contract is that translation is mechanical.
- **Do not** expose the bearer token as an MCP tool parameter. There is nothing behind the mock a different token would mean anything to; letting agents pass one is theater.

## Acceptance: end-to-end for the v0 grind cycle

The v0 grind is done when, and only when, all five build repos exist, each carries a green CI run against `spec.org` at the SHA they consumed, and each has landed a `FEEDBACK.md`. The public spec then tags v0.5 — the union of all five feedback rounds folded in. This is the system's definition of done for v0. Anything short of that is v0 in progress, not v0 shipped.
