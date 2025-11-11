# GitLens CLI Bridge

> Run GitLens comparisons from your terminal in seconds.

Bridge your command line with VS Code's GitLens extension. Compare branches, tags, and commits without leaving your terminal.

## CLI Commands

```bash
# Compare two references (branches, tags, commits)
gitlens-cli compare <ref1> <ref2>
glcli compare <ref1> <ref2>

# Compare HEAD with a reference
gitlens-cli compare-head <ref>
glcli compare-head <ref>

# Clear all comparisons
gitlens-cli clear
glcli clear

# Show help
gitlens-cli --help
glcli --help
```

### Examples

```bash
# Compare branches
glcli compare main feature-branch

# Compare with remote
glcli compare origin/main HEAD

# Compare tags
glcli compare v1.0.0 v2.0.0

# Compare HEAD with main
glcli compare-head main

# Clear all comparisons
glcli clear
```

## Requirements

- **VS Code** with **GitLens extension** (`eamodio.gitlens`)
- **Python 3.9+**
- **VS Code must be open** with your workspace when running commands

## Installation

### CLI Tool

```bash
# Install globally using uv (recommended)
uv tool install gitlens-cli-bridge

# Or install from source
uv tool install .

# Update to latest
uv tool upgrade gitlens-cli-bridge
```

### VS Code Extension

```bash
# Package and install
npx @vscode/vsce package
code --install-extension gitlens-cli-bridge-1.0.0.vsix

# Or press F5 in VS Code for development mode
```

## How It Works

1. CLI writes command to `.gitlens-cli` file in workspace root
2. VS Code extension watches and executes the GitLens command
3. Extension writes result to `.gitlens-cli-result`
4. CLI reads and displays the result

Simple file-based IPC with no complex communication needed.

## Troubleshooting

**"Not in a git repository"** - Run from within a git repository

**"Timeout waiting for VS Code"** - Ensure:
- VS Code is open with the workspace
- GitLens CLI Bridge extension is installed and activated
- Check VS Code's "GitLens CLI Bridge" output panel for errors

**"GitLens command failed"** - Ensure GitLens extension is installed

## Development

```bash
# Build extension
npm run compile

# Test: Open VS Code (F5), then in terminal:
glcli compare main HEAD
```

### Project Structure

```
vscode-git-diff-extension/
├── src/
│   └── extension.ts           # VS Code extension (file watcher)
├── gitlens_cli_bridge/
│   └── cli.py                 # Python CLI tool
├── pyproject.toml             # Python package config
└── package.json               # VS Code extension config
```

## License

MIT License - see LICENSE.txt for details
