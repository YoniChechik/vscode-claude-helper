#!/bin/bash

# Prevent script from being sourced
if [ "${BASH_SOURCE[0]}" != "${0}" ]; then
    echo "ERROR: This script must be executed, not sourced."
    echo "Usage: bash ${BASH_SOURCE[0]}"
    return 1 2>/dev/null || exit 1
fi

# exit on errors
set -e

# Get the most recently created container ID (including stopped)
LATEST_CONTAINER=$(docker ps -a --format '{{.Names}}\t{{.ID}}' | grep '^vscode-claude-helper-dev-' | head -n 1 | cut -f2)

if [ -z "$LATEST_CONTAINER" ]; then
    echo "No containers found."
    exit 1
fi

# Get the container name
CONTAINER_NAME=$(docker inspect --format='{{.Name}}' "$LATEST_CONTAINER" | sed 's|^/||')

echo "Latest container ID: $LATEST_CONTAINER"
echo "Container name: $CONTAINER_NAME"
echo "Starting latest container: $LATEST_CONTAINER"
docker start "$LATEST_CONTAINER"
