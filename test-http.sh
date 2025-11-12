#!/bin/bash
# Quick HTTP listener test

PORT=3456

echo "Testing HTTP Listener on port $PORT"
echo "======================================"
echo ""

# Test 1: Simple ping (no timestamp needed!)
echo "1. Ping..."
curl -s -X POST http://127.0.0.1:$PORT \
  -H "Content-Type: application/json" \
  -d '{"command":"ping","args":["Hello from HTTP"],"timestamp":0}'
echo ""

# Test 2: Set terminal title
echo "2. Set terminal title..."
curl -s -X POST http://127.0.0.1:$PORT \
  -H "Content-Type: application/json" \
  -d '{"command":"setTerminalTitle","args":["HTTP Listener"],"timestamp":0}'
echo ""

echo "======================================"
echo "✓ Commands sent! Check VS Code for notifications!"
