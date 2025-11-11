# Claude Helper

CLI tools to help Claude Code interact with VS Code - compare git refs, set terminal titles, and send notifications.

## Installation

### 1. Install VS Code Extension

```bash
code --install-extension claude-helper
```

Or install from the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=YoniChechik.claude-helper)

### 2. Install CLI Tool

Using `uv` (recommended):

```bash
uv tool install claude-helper
```

Using `pip`:

```bash
pip install claude-helper
```

## Requirements

- VS Code with a workspace folder open
- GitLens extension (for git comparison features)

## Usage

### Compare Git References

```bash
# Compare two branches/commits
ch compare main feature-branch
ch compare HEAD origin/main

# Compare HEAD with another ref
ch compare-head origin/main
```

### Set Terminal Title

```bash
# Change the title of your current terminal
ch set-title "Building Project"
ch set-title "Running Tests"
```

### Notifications

```bash
# Show a notification in VS Code
ch ping
```

### Clear Comparisons

```bash
# Clear all GitLens comparisons
ch clear
```

## Command Reference

| Command | Alias | Description |
|---------|-------|-------------|
| `claude-helper compare <ref1> <ref2>` | `ch compare` | Compare two git references |
| `claude-helper compare-head <ref>` | `ch compare-head` | Compare HEAD with a reference |
| `claude-helper clear` | `ch clear` | Clear all comparisons |
| `claude-helper ping` | `ch ping` | Show notification in VS Code |
| `claude-helper set-title <title>` | `ch set-title` | Set current terminal title |

## Use Cases for Claude Code

Claude Code can use these tools to:

- **Compare branches** before merging or reviewing changes
- **Label terminals** during long-running builds or tests
- **Send notifications** when tasks complete
- **Organize workflows** with clear terminal naming

## Troubleshooting

### Extension Not Working

1. Ensure VS Code is open with a workspace folder
2. Check extension is installed: `code --list-extensions | grep claude-helper`
3. View logs in VS Code: `Ctrl+Shift+P` → `Claude Helper: Show Logs`

### CLI Timeout

- Make sure VS Code is running
- Verify you're in a git repository
- Check the extension is activated (you should see "Claude Helper activated" notification)

### Compare Commands Not Working

- Ensure GitLens extension is installed: `code --list-extensions | grep gitlens`
- Verify you're in a git repository with valid refs

## Documentation

- [Development Guide](docs/development.md) - For contributors
- [Debugging](docs/debugging.md) - Troubleshooting guide
- [Publishing](docs/publishing.md) - Release process
- [Registration](docs/registration.md) - First-time setup

## License

MIT

## Contributing

Contributions welcome! See [Development Guide](docs/development.md) for setup instructions.
