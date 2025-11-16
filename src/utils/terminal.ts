import * as vscode from 'vscode';

// ============================================================================
// Public API
// ============================================================================

export function generateUniqueTerminalTitle(): string {
    const randomAdjective = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
    const randomNoun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
    return `claude-${randomAdjective}-${randomNoun}`;
}

export function findTerminalByTitle(title: string): vscode.Terminal | undefined {
    return vscode.window.terminals.find(terminal => terminal.name === title);
}

export function getActiveTerminalOrThrow(): vscode.Terminal {
    const terminal = vscode.window.activeTerminal;
    if (!terminal) {
        throw new Error('No active terminal found');
    }
    return terminal;
}

export async function createClaudeTerminal(
    title: string,
    port: number | undefined
): Promise<vscode.Terminal> {
    const terminal = vscode.window.createTerminal(title);
    terminal.show();

    await new Promise(resolve => setTimeout(resolve, 500));

    terminal.sendText(`export CLAUDE_HELPER_CURRENT_TERMINAL_TITLE="${title}"`, true);
    if (port) {
        terminal.sendText(`export CLAUDE_HELPER_PORT="${port}"`, true);
    }
    terminal.sendText('claude', true);

    return terminal;
}

// ============================================================================
// Constants
// ============================================================================

const ADJECTIVES = [
    'sleeping', 'happy', 'dancing', 'coding', 'thinking',
    'running', 'jumping', 'flying', 'swimming', 'clever',
    'wise', 'bright', 'swift', 'gentle', 'brave'
];

const NOUNS = [
    'hamster', 'panda', 'koala', 'penguin', 'dolphin',
    'owl', 'fox', 'wolf', 'bear', 'tiger',
    'eagle', 'hawk', 'lion', 'deer', 'rabbit'
];
