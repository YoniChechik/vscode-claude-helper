#!/bin/bash

# Prevent script from being sourced
if [ "${BASH_SOURCE[0]}" != "${0}" ]; then
    echo "ERROR: This script must be executed, not sourced."
    echo "Usage: bash ${BASH_SOURCE[0]}"
    return 1 2>/dev/null || exit 1
fi

# exit on errors
set -e

# Get directories (resolve symlinks with -P)
DOCKER_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
REPO_ROOT="$(dirname "$DOCKER_DIR")"

CONTAINER_NAME="vscode-git-diff-extension-dev-$(date +%Y%m%d-%H%M%S)"

# Check if this script has been changed in origin/main
if git rev-parse --git-dir >/dev/null 2>&1; then
    git fetch origin main >/dev/null 2>&1
    if ! git diff --quiet HEAD origin/main -- "$DOCKER_DIR/spin-dev-container.sh" 2>/dev/null; then
        # Files differ, determine which direction
        MERGE_BASE=$(git merge-base HEAD origin/main 2>/dev/null || echo "")
        if [ -n "$MERGE_BASE" ]; then
            LOCAL_CHANGED=false
            ORIGIN_CHANGED=false

            git diff --quiet "$MERGE_BASE" HEAD -- "$DOCKER_DIR/spin-dev-container.sh" 2>/dev/null || LOCAL_CHANGED=true
            git diff --quiet "$MERGE_BASE" origin/main -- "$DOCKER_DIR/spin-dev-container.sh" 2>/dev/null || ORIGIN_CHANGED=true

            if [ "$LOCAL_CHANGED" = true ] && [ "$ORIGIN_CHANGED" = true ]; then
                echo "WARNING: This script has diverged from origin/main!"
                echo "Both local and remote versions have been modified."
                echo "Consider reviewing changes and merging: git pull origin main"
                echo "Continuing with current version..."
                echo ""
            elif [ "$ORIGIN_CHANGED" = true ]; then
                echo "WARNING: This script has been modified in origin/main!"
                echo "Your local version may be outdated."
                echo "Consider running: git pull origin main"
                echo "Continuing with current version..."
                echo ""
            elif [ "$LOCAL_CHANGED" = true ]; then
                echo "INFO: This script has local changes not yet in origin/main."
                echo ""
            fi
        fi
    fi
fi

echo "Creating container: $CONTAINER_NAME"

# Change to repo root for docker-compose context
cd "$REPO_ROOT"

# Create container using dev service with volume mount
COMPOSE_BAKE=true docker compose -f "$DOCKER_DIR/docker-compose.yml" build dev
docker compose -f "$DOCKER_DIR/docker-compose.yml" run -d --name "$CONTAINER_NAME" dev sleep infinity

echo "Repository mounted from host: $REPO_ROOT"
echo "Worktrees will be inside: $REPO_ROOT/worktrees"
echo "Done. Container: $CONTAINER_NAME"
echo "To connect: docker exec -it $CONTAINER_NAME bash"
