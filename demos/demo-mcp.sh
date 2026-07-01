#!/usr/bin/env bash
# MCP demo — liquidus-mcp (from liquidus-005) driven by hand-crafted
# JSON-RPC over stdio, showing tools/list and one tool call with F5 wrap.
set -e

MCP_BIN=/home/jwalsh/ghq/github.com/aygp-dr/liquidus-005/.venv/bin/liquidus-mcp
export LIQUIDUS_BASE_URL=http://localhost:4010
export LIQUIDUS_BEARER=liquidus-dev-stub

clear
echo "─── liquidus MCP demo (Python, spec v1.7) ───"
echo "stdio JSON-RPC → 4 tools, every result wrapped with F5 provenance"
echo
sleep 2

INIT='{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"demo","version":"0.0"}}}'
INITED='{"jsonrpc":"2.0","method":"notifications/initialized"}'
LIST='{"jsonrpc":"2.0","id":2,"method":"tools/list"}'
CALL='{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"get_product","arguments":{"id":"3"}}}'

echo "$ liquidus-mcp    # stdio server"
echo
sleep 1
echo "→ initialize"
sleep 1
echo "→ tools/list"
sleep 1
echo "→ tools/call get_product id=3"
sleep 1
echo
echo "─── responses ───"
sleep 1

(printf '%s\n' "$INIT" "$INITED" "$LIST" "$CALL"; sleep 1) \
  | $MCP_BIN 2>/dev/null \
  | while IFS= read -r line; do
      echo "$line" | jq -r 'if .id==2 then {tools: [.result.tools[] | .name]} elif .id==3 then {result: (.result.content[0].text | fromjson)} else . end' 2>/dev/null || echo "$line"
      sleep 0.4
    done

echo
echo "─── done — every result carried provenance ───"
sleep 1
