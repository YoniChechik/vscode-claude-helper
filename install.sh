#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
EXTENSION_NAME="git-diff-viewer"
VERSION="0.0.1"
VSIX_FILE="${SCRIPT_DIR}/${EXTENSION_NAME}-${VERSION}.vsix"

cd "$SCRIPT_DIR"

echo "🔄 Reinstalling Git Diff Viewer extension..."

# Uninstall old version
echo "🗑️  Uninstalling old version..."
code --uninstall-extension local.${EXTENSION_NAME} 2>/dev/null || true

# Compile TypeScript
echo "🔨 Compiling TypeScript..."
npm run compile

# Package extension
echo "📦 Packaging extension..."
vsce package

# Install extension
echo "🚀 Installing extension in VS Code..."
code --install-extension "$VSIX_FILE"

echo "✅ Extension installed successfully!"
echo "   Look for 'Git Diff Viewer' in the Activity Bar"
