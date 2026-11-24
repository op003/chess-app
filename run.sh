#!/usr/bin/env bash
# Quick launcher script for Gambit Master Chess Game

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "============================================================"
echo "♟️  Starting Gambit Master Chess Game & AI Training Lab..."
echo "============================================================"

if [ -f "$SCRIPT_DIR/.venv/bin/python" ]; then
    "$SCRIPT_DIR/.venv/bin/python" main.py
else
    uv run python main.py
fi
