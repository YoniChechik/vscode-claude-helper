#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

if [ ! -f .env ]; then
    echo "Error: .env file not found"
    exit 1
fi

source .env

if [ -z "$VSCE_PAT" ]; then
    echo "Error: VSCE_PAT not set in .env"
    exit 1
fi

echo "Running tests..."
npm test

echo "Publishing extension..."
AZURE_DEVOPS_ORG=chechikyoni VSCE_PAT="$VSCE_PAT" npx vsce publish

echo "Published successfully!"
