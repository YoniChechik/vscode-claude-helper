import * as vscode from 'vscode';
import * as crypto from 'crypto';

// ============================================================================
// Terminal Registry
// ============================================================================

// Maps UUID to terminal instance
const terminalRegistry = new Map<string, vscode.Terminal>();

// Maps terminal to UUID for cleanup
const terminalToUuid = new Map<vscode.Terminal, string>();

// ============================================================================
// Public API
// ============================================================================

export function generateUniqueTerminalTitle(): string {
    const randomAdjective = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
    const randomNoun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
    return `claude-${randomAdjective}-${randomNoun}`;
}

export function generateTerminalUuid(): string {
    return crypto.randomUUID();
}

export function registerTerminal(uuid: string, terminal: vscode.Terminal): void {
    terminalRegistry.set(uuid, terminal);
    terminalToUuid.set(terminal, uuid);
}

export function unregisterTerminal(uuid: string): void {
    const terminal = terminalRegistry.get(uuid);
    if (terminal) {
        terminalToUuid.delete(terminal);
    }
    terminalRegistry.delete(uuid);
}

export function unregisterTerminalByInstance(terminal: vscode.Terminal): void {
    const uuid = terminalToUuid.get(terminal);
    if (uuid) {
        terminalRegistry.delete(uuid);
        terminalToUuid.delete(terminal);
    }
}

export function findTerminalByUuid(uuid: string): vscode.Terminal | undefined {
    return terminalRegistry.get(uuid);
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
    // Generate a unique ID for this terminal (set once and never changes)
    const uuid = generateTerminalUuid();

    // Create terminal with environment variables
    const terminal = vscode.window.createTerminal({
        name: title,
        env: {
            CLAUDE_HELPER_ID: uuid,
            ...(port ? { CLAUDE_HELPER_PORT: port.toString() } : {})
        }
    });

    // Register the terminal
    registerTerminal(uuid, terminal);

    terminal.show();

    await new Promise(resolve => setTimeout(resolve, 500));

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
