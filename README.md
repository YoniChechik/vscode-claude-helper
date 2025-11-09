# GitLens CLI Bridge

Run GitLens compare commands from the command line! This extension bridges the CLI with VS Code's GitLens extension, allowing you to trigger comparison views from your terminal.

## Features

- **Compare References**: Compare any two git references (branches, tags, commits)
- **Compare HEAD**: Compare HEAD with any reference
- Works with GitLens's powerful comparison views
- Simple CLI interface

## Requirements

1. **VS Code** must be installed
2. **GitLens extension** must be installed (`eamodio.gitlens`)
3. **Node.js** must be installed
4. **VS Code must be open** with your workspace

## Installation

### 1. Install the Extension

Open this folder in VS Code and press `F5` to run in development mode, or package and install:

```bash
# Package the extension
npx @vscode/vsce package

# Install the .vsix file in VS Code
code --install-extension gitlens-cli-bridge-1.0.0.vsix
```

### 2. Install the CLI Tool

```bash
# From this directory
npm link
```

This makes the `gitlens` command available globally.

## Usage

**Important**: VS Code must be open with your workspace before running these commands!

### Compare Two References

```bash
gitlens compare <ref1> <ref2>
```

Examples:
```bash
# Compare two branches
gitlens compare main feature-branch

# Compare with remote branches
gitlens compare origin/main HEAD

# Compare tags
gitlens compare v1.0.0 v2.0.0

# Compare commits
gitlens compare abc123 def456
```

### Compare HEAD with Reference

```bash
gitlens compare-head <ref>
```

Examples:
```bash
# Compare HEAD with main
gitlens compare-head main

# Compare HEAD with remote branch
gitlens compare-head origin/main

# Compare HEAD with a tag
gitlens compare-head v1.0.0
```

### Get Help

```bash
gitlens --help
```

## How It Works

The tool uses a file-based IPC mechanism:

1. **CLI tool** writes a command file (`.gitlens-cli`) in your workspace root
2. **VS Code extension** watches for this file and executes the GitLens command
3. **Extension** writes the result to `.gitlens-cli-result`
4. **CLI tool** reads the result and displays it

This approach works because:
- VS Code extensions can watch file system changes
- CLI tools can easily read/write files
- No complex IPC or socket communication needed

## Development

### Project Structure

```
├── src/
│   └── extension.ts      # VS Code extension (file watcher + GitLens bridge)
├── bin/
│   └── gitlens-cli.js    # CLI tool (writes commands, reads results)
└── package.json          # Extension + CLI configuration
```

### Building

```bash
npm run compile
```

### Testing

1. Open VS Code with a git repository
2. Press F5 to launch extension in development mode
3. In a terminal, navigate to that repository
4. Run `gitlens compare main HEAD`

## Troubleshooting

### "Not in a git repository"
Make sure you're running the command from within a git repository.

### "Timeout waiting for VS Code"
- Ensure VS Code is open with the workspace
- Ensure the extension is installed and activated
- Check VS Code's "GitLens CLI Bridge" output panel for errors

### "GitLens command failed"
- Ensure GitLens extension is installed
- Try running the comparison manually from VS Code first to verify GitLens works

## License

MIT License - see LICENSE.txt for details

---

**Enjoy comparing from the command line!**
