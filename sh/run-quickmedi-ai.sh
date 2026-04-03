#!/bin/bash
# Activate Python venv and run quickmedi-ai
cd "$(dirname "$0")/../quickmedi-ai"
if [ -d ".venv" ]; then
  source .venv/bin/activate
fi
python main.py
