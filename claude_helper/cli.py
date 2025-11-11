#!/usr/bin/env python3
"""Claude Helper - CLI tools for Claude Code."""

import argparse
import json
import sys
import time
from pathlib import Path
from typing import Optional

# Constants
CLI_COMMAND_FILE = ".claude-helper"
CLI_RESULT_FILE = ".claude-helper-result"
POLL_INTERVAL = 0.1  # seconds
TIMEOUT = 30.0  # seconds


def find_git_root(start_path: Optional[Path] = None) -> Optional[Path]:
    """Find the git repository root by traversing up the directory tree."""
    if start_path is None:
        start_path = Path.cwd()

    current_path = start_path.resolve()

    while current_path != current_path.parent:
        git_path = current_path / ".git"
        if git_path.exists():
            return current_path
        current_path = current_path.parent

    return None


def wait_for_result(result_path: Path, timeout: float) -> dict:
    """Wait for VS Code extension to write result file."""
    start_time = time.time()

    while time.time() - start_time < timeout:
        if result_path.exists():
            try:
                result_data = result_path.read_text()
                result = json.loads(result_data)

                # Clean up result file
                try:
                    result_path.unlink()
                except Exception:
                    pass  # Ignore cleanup errors

                return result
            except Exception as e:
                raise RuntimeError(f"Failed to read result: {e}")

        time.sleep(POLL_INTERVAL)

    raise TimeoutError("Timeout waiting for VS Code to process command")


def execute_command(workspace_root: Path, command: str, args: list[str]) -> int:
    """Execute a GitLens command via file-based IPC."""
    command_path = workspace_root / CLI_COMMAND_FILE
    result_path = workspace_root / CLI_RESULT_FILE

    # Clean up any existing files
    try:
        command_path.unlink(missing_ok=True)
        result_path.unlink(missing_ok=True)
    except Exception as e:
        print(f"Warning: Failed to clean up existing files: {e}", file=sys.stderr)

    # Write command file
    command_data = {"command": command, "args": args, "timestamp": int(time.time() * 1000)}

    command_path.write_text(json.dumps(command_data, indent=2))

    # Wait for result
    try:
        result = wait_for_result(result_path, TIMEOUT)
    except Exception as e:
        print(f"✗ Error: {e}", file=sys.stderr)
        print("\nMake sure:", file=sys.stderr)
        print("  - VS Code is open with your workspace", file=sys.stderr)
        print("  - Claude Helper extension is installed and activated", file=sys.stderr)
        print("  - GitLens extension is installed (for compare commands)", file=sys.stderr)
        return 1

    # Debug: Write result to file for inspection
    import json as json_module

    debug_path = workspace_root / ".claude-helper-debug.json"
    debug_path.write_text(json_module.dumps(result, indent=2))
    print(f"[Debug: Result written to {debug_path}]")

    # Always print logs for debugging
    if result.get("logs"):
        print("\n--- Extension Logs ---")
        for log_line in result["logs"]:
            print(log_line)
        print("--- End Logs ---\n")
    else:
        print("\n[No logs available from extension]")

    if result.get("success"):
        print(f"✓ {result.get('message')}")
        return 0
    else:
        print(f"✗ Error: {result.get('error', 'Unknown error')}", file=sys.stderr)
        return 1


def print_usage():
    """Print usage information."""
    usage = """
Claude Helper - CLI tools for Claude Code

Usage:
  claude-helper compare <ref1> <ref2>   Compare two git references
  claude-helper compare-head <ref>      Compare HEAD with a reference
  claude-helper clear                   Clear all comparisons
  claude-helper ping [message]          Show notification in VS Code with timestamp
  claude-helper set-title <title>       Set the current terminal title
  ch compare <ref1> <ref2>              (short alias)
  ch compare-head <ref>                 (short alias)
  ch clear                              (short alias)
  ch ping [message]                     (short alias)
  ch set-title <title>                  (short alias)

Examples:
  claude-helper compare main feature-branch
  claude-helper compare origin/main HEAD
  claude-helper compare-head origin/main
  claude-helper clear
  claude-helper ping
  claude-helper ping "Build completed successfully"
  claude-helper set-title "Building Project"

  # Using short alias
  ch compare main feature-branch
  ch clear
  ch ping
  ch ping "Tests finished"
  ch set-title "Running Tests"

Requirements:
  - Must be run from within a git repository
  - VS Code must be open with the workspace
  - GitLens extension must be installed (for compare commands)
  - Claude Helper extension must be installed in VS Code
"""
    print(usage)


def main():
    """Main entry point for the CLI."""
    parser = argparse.ArgumentParser(
        description="GitLens CLI Bridge - Run GitLens compare commands from the CLI", add_help=False
    )
    parser.add_argument("command", nargs="?", help="Command to execute")
    parser.add_argument("args", nargs="*", help="Command arguments")
    parser.add_argument("-h", "--help", action="store_true", help="Show help")

    args = parser.parse_args()

    if args.help or not args.command:
        print_usage()
        return 0

    # Find workspace root
    workspace_root = find_git_root()

    if workspace_root is None:
        print("✗ Error: Not in a git repository", file=sys.stderr)
        print("  Please run this command from within a git repository", file=sys.stderr)
        return 1

    print(f"Workspace: {workspace_root}")

    # Execute command
    if args.command == "compare":
        if len(args.args) < 2:
            print("✗ Error: compare requires 2 arguments: <ref1> <ref2>", file=sys.stderr)
            print_usage()
            return 1
        return execute_command(workspace_root, "compareReferences", args.args)

    elif args.command == "compare-head":
        if len(args.args) < 1:
            print("✗ Error: compare-head requires 1 argument: <ref>", file=sys.stderr)
            print_usage()
            return 1
        return execute_command(workspace_root, "compareHead", args.args)

    elif args.command == "clear":
        return execute_command(workspace_root, "clearComparisons", [])

    elif args.command == "ping":
        # Add current timestamp as first argument, then any custom message
        from datetime import datetime
        current_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        ping_args = [current_time] + args.args
        return execute_command(workspace_root, "ping", ping_args)

    elif args.command == "set-title":
        if len(args.args) < 1:
            print("✗ Error: set-title requires 1 argument: <title>", file=sys.stderr)
            print_usage()
            return 1
        return execute_command(workspace_root, "setTerminalTitle", args.args)

    else:
        print(f"✗ Error: Unknown command: {args.command}", file=sys.stderr)
        print_usage()
        return 1


def cli_main():
    """Entry point wrapper for console script."""
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        print("\n✗ Interrupted", file=sys.stderr)
        sys.exit(130)
    except Exception as e:
        print(f"✗ Fatal error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    cli_main()
