#!/usr/bin/env bash
# CLI demo — Ruby liquidus (from liquidus-006) hitting the demo mock.
# Recorded via `asciinema rec --command=demos/demo-cli.sh` then `agg` → GIF.
set -e

LIQUIDUS=/home/jwalsh/ghq/github.com/aygp-dr/liquidus-006/bin/liquidus
export LIQUIDUS_BASE_URL=http://localhost:4010
export LIQUIDUS_BEARER=liquidus-dev-stub

pause() { sleep "${1:-1.2}"; }
type_line() { printf "\e[1;32m$ \e[0m%s\n" "$1"; pause 0.6; }

clear
echo "─── liquidus CLI demo (Ruby, spec v1.7) ───"
echo "mock: MSW-backed demo (curated Solidus data on :4010)"
echo
pause 1.5

type_line "liquidus products search --query denim"
$LIQUIDUS products search --query denim 2>/dev/null | jq '.products[] | {id, name, display_price, sku}' || true
pause 2

type_line "liquidus products get 3"
$LIQUIDUS products get 3 2>/dev/null | jq '{id, name, description, display_price, sku}'
pause 2

type_line "liquidus taxonomies list"
$LIQUIDUS taxonomies list 2>/dev/null | jq '.taxonomies[] | {id, name, taxons: [.taxons[].name]}'
pause 2

type_line "liquidus products search --stage    # v1.0 flow-stage annotation"
$LIQUIDUS products search --stage 2>/dev/null | tail -1
pause 2

echo
echo "─── done ───"
pause 1
