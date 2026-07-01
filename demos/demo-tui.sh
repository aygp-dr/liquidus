#!/usr/bin/env bash
# TUI demo — Ruby liquidus-tui (from liquidus-006) hitting the demo mock.
# Feeds slash commands to the TUI via a here-doc, records the session.
set -e

LIQUIDUS_TUI=/home/jwalsh/ghq/github.com/aygp-dr/liquidus-006/bin/liquidus-tui
export LIQUIDUS_BASE_URL=http://localhost:4010
export LIQUIDUS_BEARER=liquidus-dev-stub

clear
echo "─── liquidus TUI demo (Ruby tty-prompt, spec v1.7) ───"
echo "slash-command palette; every /command re-hits the demo mock"
echo
sleep 2

# Drive the TUI with a scripted input stream. Each blank line waits for the
# TUI's prompt to render before submitting the next command.
{
  sleep 1
  echo "/help"
  sleep 2
  echo "/products search denim"
  sleep 3
  echo "/products get 3"
  sleep 3
  echo "/where"
  sleep 2
  echo "/quit"
} | $LIQUIDUS_TUI 2>/dev/null || true

echo
echo "─── done ───"
sleep 1
