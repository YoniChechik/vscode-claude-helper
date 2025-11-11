# Sound/Audio Limitations

## The Problem

The `glcli ping` command is designed to play a sound notification in VS Code. However, there are limitations when using VS Code Remote Development (Remote - Containers, Remote - SSH, Remote - WSL).

## Why Sound Doesn't Work in Remote Scenarios

When you use VS Code with remote development:
- The **VS Code UI** runs on your local machine (Windows/Mac/Linux)
- The **extension code** runs in the remote environment (Docker container/SSH server/WSL)

The extension's `process.platform` reports the **remote** platform (e.g., Linux in a container), not your local Windows machine. Audio commands executed in the remote environment can't play sound on your local machine's speakers.

## Current Solution

The extension now uses VS Code's built-in notification system instead of trying to play sound files. This shows a visible notification: **🔔 Ping!**

### To Enable Audio Cues (Optional)

VS Code has built-in audio cues that can play sounds for certain events. To enable them:

1. Open VS Code Settings (`Ctrl+,` or `Cmd+,`)
2. Search for: **"audio cues"**
3. Enable audio cues for notifications

Settings to configure:
- `accessibility.signals.notificationSuccess` - Sound for success notifications
- `accessibility.signals.notificationError` - Sound for error notifications
- `accessibility.signals.notificationInfo` - Sound for info notifications

**Note:** Even with audio cues enabled, not all notifications trigger sounds. This is a VS Code limitation.

## Alternative Solutions

If you need a reliable audio notification, you can:

1. **Use a separate sound command in your workflow:**
   ```bash
   glcli ping && powershell -c "[console]::beep(800,200)"
   ```

2. **Create a wrapper script** that shows a notification on your host machine

3. **Use Windows notifications** directly from WSL/container if you have that configured

## For Future Development

Potential improvements:
- Create a separate host-side companion app that listens for ping commands
- Use VS Code's experimental APIs if they add sound support
- Integrate with OS-specific notification systems that support sound
