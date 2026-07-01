# liquidus — public spec repo Makefile
#
# Only reifies the upstream Solidus OpenAPI spec locally against a pinned
# commit SHA. The reified copy is git-ignored: this repo tracks the
# pointer (SHA), not the payload. Downstream build repos (liquidus-00x)
# either pull the same SHA themselves or copy the reified file in.
#
# Requires: gmake (BSD make will not parse this file — user CLAUDE.md rule).

# Pinned Solidus commit. Bump deliberately, never track master here.
SOLIDUS_SPEC_SHA ?= 8d781ac742e38a83e417a4b90297b74f6266b070
SPEC_URL         := https://raw.githubusercontent.com/solidusio/solidus/$(SOLIDUS_SPEC_SHA)/api/openapi/solidus-api.oas.yml
SPEC_CACHE_DIR   := .spec-cache
SPEC_FILE        := $(SPEC_CACHE_DIR)/solidus-api.oas.yml
SPEC_SHA_FILE    := $(SPEC_CACHE_DIR)/.pinned-sha

.PHONY: help spec validate tags version clean nuke check-tools demo-mock demo-mock-stop demo-mock-install mcp-config

MOCK_PORT ?= 4010

help:
	@printf 'liquidus spec-repo targets:\n'
	@printf '  gmake spec              fetch the Solidus OpenAPI spec at pinned SHA\n'
	@printf '  gmake validate          run redocly lint against the reified spec\n'
	@printf '  gmake tags              list the tags in the reified spec\n'
	@printf '  gmake version           print the pinned SOLIDUS_SPEC_SHA and reified blob SHA\n'
	@printf '  gmake clean             remove the reified copy (keeps cache dir)\n'
	@printf '  gmake nuke              remove the whole cache dir\n'
	@printf '\ndemo-mock (deliberate constraint violation — see README §Demo mock exception):\n'
	@printf '  gmake demo-mock         install + start MSW-backed demo mock on :$(MOCK_PORT)\n'
	@printf '  gmake demo-mock-stop    stop the demo mock\n'
	@printf '  gmake mcp-config        print MCP client config for wiring liquidus-mcp\n'

$(SPEC_CACHE_DIR):
	@mkdir -p $(SPEC_CACHE_DIR)

spec: $(SPEC_FILE)

$(SPEC_FILE): | $(SPEC_CACHE_DIR)
	@printf 'fetching %s\n' "$(SPEC_URL)"
	@curl -fsSL "$(SPEC_URL)" -o "$(SPEC_FILE)"
	@printf '%s\n' "$(SOLIDUS_SPEC_SHA)" > "$(SPEC_SHA_FILE)"
	@printf 'reified: %s (%d bytes)\n' "$(SPEC_FILE)" "$$(wc -c < $(SPEC_FILE))"

check-tools:
	@command -v curl >/dev/null || { printf 'error: curl not found\n'; exit 1; }
	@command -v npx  >/dev/null || printf 'note: npx not found — validate/tags targets will fail until you install Node\n'

validate: spec check-tools
	@npx --yes @redocly/cli@latest lint "$(SPEC_FILE)"

tags: spec
	@awk '/^tags:/{flag=1;next} flag && /^[a-zA-Z]/{flag=0} flag && /^  - name:/{sub(/^  - name: */,""); print}' "$(SPEC_FILE)" | sort -u

version:
	@printf 'pinned SOLIDUS_SPEC_SHA: %s\n' "$(SOLIDUS_SPEC_SHA)"
	@if [ -f "$(SPEC_FILE)" ]; then \
	  printf 'reified blob sha1:      %s\n' "$$(git hash-object $(SPEC_FILE))"; \
	  printf 'reified size:           %d bytes\n' "$$(wc -c < $(SPEC_FILE))"; \
	else \
	  printf 'reified copy:           (absent — run gmake spec)\n'; \
	fi

clean:
	@rm -f "$(SPEC_FILE)" "$(SPEC_SHA_FILE)"

nuke:
	@rm -rf "$(SPEC_CACHE_DIR)"

# -----------------------------------------------------------------------------
# Demo mock (deliberate constraint violation — see README §Demo mock exception)

mocks/msw/node_modules: mocks/msw/package.json
	@cd mocks/msw && npm install --silent

demo-mock-install: mocks/msw/node_modules

demo-mock: demo-mock-install
	@if [ -f .demo-mock.pid ] && kill -0 "$$(cat .demo-mock.pid)" 2>/dev/null; then \
	  printf 'demo mock already running (pid %s)\n' "$$(cat .demo-mock.pid)"; \
	else \
	  LIQUIDUS_MOCK_PORT=$(MOCK_PORT) node mocks/msw/server.mjs > .demo-mock.log 2>&1 & echo $$! > .demo-mock.pid ; \
	  sleep 2 ; \
	  printf 'demo mock pid=%s on :%s\n' "$$(cat .demo-mock.pid)" "$(MOCK_PORT)"; \
	fi

demo-mock-stop:
	@if [ -f .demo-mock.pid ]; then \
	  kill "$$(cat .demo-mock.pid)" 2>/dev/null || true; \
	  rm -f .demo-mock.pid; \
	  printf 'stopped demo mock\n'; \
	fi

mcp-config:
	@printf '{\n  "mcpServers": {\n    "liquidus": {\n      "command": "%s/liquidus-005/.venv/bin/liquidus-mcp",\n      "env": {\n        "LIQUIDUS_BASE_URL": "http://localhost:%s",\n        "LIQUIDUS_BEARER": "liquidus-dev-stub"\n      }\n    }\n  }\n}\n' "$$(cd .. && pwd)" "$(MOCK_PORT)"
