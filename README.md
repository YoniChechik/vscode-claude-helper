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

The extension automatically finds an available port (starting from 3456) when VS Code starts. When using "Claude Helper: Open Claude Terminal", the `$CLAUDE_HELPER_PORT` environment variable contains the port number. Send commands via HTTP POST requests:

## Available Commands

| Command | Arguments | Description |
|---------|-----------|-------------|
| `ping` | `[message]` (optional) | Show notification with timestamp and optional message (can include `$CLAUDE_HELPER_CURRENT_TERMINAL_TITLE`) |
| `setTerminalTitle` | `new_title, [current_title]` | Rename terminal (with optional targeting) |
| `compareReferences` | `ref1, ref2, [submodule_path]` | Compare git refs or working tree in main repo or submodule (auto-clears previous comparisons) |

### Send Notifications

```bash
# Show a notification with custom message
curl -X POST http://localhost:$CLAUDE_HELPER_PORT \
  -H "Content-Type: application/json" \
  -d '{"command":"ping","args":["Build completed successfully"]}'

# Include terminal title in notification
curl -X POST http://localhost:$CLAUDE_HELPER_PORT \
  -H "Content-Type: application/json" \
  -d "{\"command\":\"ping\",\"args\":[\"Task done in $CLAUDE_HELPER_CURRENT_TERMINAL_TITLE\"]}"
```

### Set Terminal Title

```bash
# In a Claude Helper terminal (with $CLAUDE_HELPER_CURRENT_TERMINAL_TITLE)
curl -X POST http://localhost:$CLAUDE_HELPER_PORT \
  -H "Content-Type: application/json" \
  -d "{\"command\":\"setTerminalTitle\",\"args\":[\"Building Project\",\"$CLAUDE_HELPER_CURRENT_TERMINAL_TITLE\"]}"

# Or rename the active terminal (fallback)
curl -X POST http://localhost:$CLAUDE_HELPER_PORT \
  -H "Content-Type: application/json" \
  -d '{"command":"setTerminalTitle","args":["Building Project"]}'
```

**Tip**: When using "Claude Helper: Open Claude Terminal", the terminal automatically exports:
- `$CLAUDE_HELPER_CURRENT_TERMINAL_TITLE` - The terminal's unique title for precise targeting
- `$CLAUDE_HELPER_PORT` - The HTTP port number for sending commands

### Compare Git References

Opens GitLens Search & Compare view. Automatically clears previous comparisons.

```bash
# Compare two branches/commits in main repository
curl -X POST http://localhost:$CLAUDE_HELPER_PORT \
  -H "Content-Type: application/json" \
  -d '{"command":"compareReferences","args":["main","HEAD"]}'

# Compare HEAD with another ref
curl -X POST http://localhost:$CLAUDE_HELPER_PORT \
  -H "Content-Type: application/json" \
  -d '{"command":"compareReferences","args":["HEAD","origin/main"]}'

# Compare working tree with a ref (use empty string for ref2)
curl -X POST http://localhost:$CLAUDE_HELPER_PORT \
  -H "Content-Type: application/json" \
  -d '{"command":"compareReferences","args":["HEAD~3",""]}'

# Compare in a submodule (add submodule path as 3rd argument)
curl -X POST http://localhost:$CLAUDE_HELPER_PORT \
  -H "Content-Type: application/json" \
  -d '{"command":"compareReferences","args":["HEAD~2","HEAD",".claude"]}'

# Compare working tree in submodule
curl -X POST http://localhost:$CLAUDE_HELPER_PORT \
  -H "Content-Type: application/json" \
  -d '{"command":"compareReferences","args":["HEAD","",".claude"]}'
```


## Troubleshooting

### Extension Not Working

1. Ensure VS Code is open with a workspace folder
2. Check extension is installed: `code --list-extensions | grep claude-helper`
3. View logs in VS Code: `Ctrl+Shift+P` → `Claude Helper: Show Logs`

## Documentation

- [Development Guide](docs/development.md) - For contributors
- [Publishing](docs/publishing.md) - Release process

## License

MIT

## Contributing

Contributions welcome! See [Development Guide](docs/development.md) for setup instructions.
