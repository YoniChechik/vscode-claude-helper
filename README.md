# Claude Helper

VS Code extension with HTTP API to help Claude Code interact with VS Code - compare git refs, set terminal titles, and send notifications.

## Installation

Install the VS Code extension:

```bash
code --install-extension claude-helper
```

Or install from the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=YoniChechik.claude-helper)

## Requirements

- VS Code with a workspace folder open
- GitLens extension (for git comparison features)

## Usage

The extension listens on `http://localhost:3456` when VS Code is running. Send commands via HTTP POST requests:

### Send Notifications

```bash
# Show a notification with custom message
curl -X POST http://localhost:3456 \
  -H "Content-Type: application/json" \
  -d '{"command":"ping","args":["Build completed successfully"]}'

# Show notification with current terminal title
curl -X POST http://localhost:3456 \
  -H "Content-Type: application/json" \
  -d '{"command":"pingTerminalTitle","args":[]}'
```

### Set Terminal Title

```bash
# Change the title of your current terminal
curl -X POST http://localhost:3456 \
  -H "Content-Type: application/json" \
  -d '{"command":"setTerminalTitle","args":["Building Project"]}'
```

### Compare Git References

```bash
# Compare two branches/commits
curl -X POST http://localhost:3456 \
  -H "Content-Type: application/json" \
  -d '{"command":"compareReferences","args":["main","HEAD"]}'

# Compare HEAD with another ref
curl -X POST http://localhost:3456 \
  -H "Content-Type: application/json" \
  -d '{"command":"compareHead","args":["origin/main"]}'
```

### Clear Comparisons

```bash
# Clear all GitLens comparisons
curl -X POST http://localhost:3456 \
  -H "Content-Type: application/json" \
  -d '{"command":"clearComparisons","args":[]}'
```

## Available Commands

| Command | Arguments | Description |
|---------|-----------|-------------|
| `ping` | `[message]` (optional) | Show notification with timestamp and optional message |
| `pingTerminalTitle` | none | Show notification with current terminal title |
| `setTerminalTitle` | `title` (string) | Set current terminal title |
| `compareReferences` | `ref1, ref2` (strings) | Compare two git references |
| `compareHead` | `ref` (string) | Compare HEAD with a reference |
| `clearComparisons` | none | Clear all GitLens comparisons |

## Use Cases for Claude Code

Claude Code can use this extension to:

- **Compare branches** before merging or reviewing changes
- **Label terminals** during long-running builds or tests
- **Send notifications** when tasks complete
- **Organize workflows** with clear terminal naming

## Troubleshooting

### Extension Not Working

1. Ensure VS Code is open with a workspace folder
2. Check extension is installed: `code --list-extensions | grep claude-helper`
3. View logs in VS Code: `Ctrl+Shift+P` → `Claude Helper: Show Logs`

### Connection Refused

- Make sure VS Code is running with the extension activated
- Check logs for "HTTP listener started on http://127.0.0.1:3456"
- Ensure no other process is using port 3456

### Compare Commands Not Working

- Ensure GitLens extension is installed: `code --list-extensions | grep gitlens`
- Verify you're in a git repository with valid refs

## Documentation

- [Development Guide](docs/development.md) - For contributors
- [Publishing](docs/publishing.md) - Release process

## License

MIT

## Contributing

Contributions welcome! See [Development Guide](docs/development.md) for setup instructions.
