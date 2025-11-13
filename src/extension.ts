import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { initializePortListener } from './portListener';

const CLI_COMMAND_FILE = '.claude-helper';
const CLI_RESULT_FILE = '.claude-helper-result';

interface CliCommand {
    command: 'compareReferences' | 'compareHead' | 'clearComparisons' | 'ping' | 'setTerminalTitle';
    args: string[];
}

interface CliResult {
    success: boolean;
    message: string;
    error?: string;
    logs?: string[];
}

// Create output channel for logging
let outputChannel: vscode.OutputChannel;
let logMessages: string[] = [];
let workspaceLogPath: string | undefined;
let currentPort: number | undefined;

function log(message: string) {
    const timestamp = new Date().toLocaleTimeString();
    const logLine = `[${timestamp}] ${message}`;
    outputChannel.appendLine(logLine);
    logMessages.push(logLine);

    // Write to file immediately for debugging
    if (workspaceLogPath) {
        try {
            const allLogs = logMessages.join('\n') + '\n';
            fs.writeFileSync(workspaceLogPath, allLogs);
        } catch (e) {
            console.error('Failed to write log file:', e);
        }
    }

    // Keep only last 100 log messages
    if (logMessages.length > 100) {
        logMessages.shift();
    }
}

function generateUniqueTerminalTitle(): string {
    const adjectives = ['sleeping', 'happy', 'dancing', 'coding', 'thinking', 'running', 'jumping', 'flying', 'swimming', 'clever', 'wise', 'bright', 'swift', 'gentle', 'brave'];
    const nouns = ['hamster', 'panda', 'koala', 'penguin', 'dolphin', 'owl', 'fox', 'wolf', 'bear', 'tiger', 'eagle', 'hawk', 'lion', 'deer', 'rabbit'];

    const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];

    return `claude-${randomAdjective}-${randomNoun}`;
}

function findTerminalByTitle(title: string): vscode.Terminal | undefined {
    const terminals = vscode.window.terminals;

    for (const terminal of terminals) {
        if (terminal.name === title) {
            log(`✓ Found terminal: ${terminal.name}`);
            return terminal;
        }
    }

    log(`✗ Terminal with title "${title}" not found`);
    log(`Available terminals: ${terminals.map(t => t.name).join(', ')}`);
    return undefined;
}

// Levenshtein distance for fuzzy matching
function levenshteinDistance(a: string, b: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= b.length; i++) {
        matrix[i] = [i];
    }

    for (let j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j] + 1
                );
            }
        }
    }

    return matrix[b.length][a.length];
}

// Get all git references (branches, tags, worktrees)
async function getAllGitReferences(): Promise<string[]> {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
        return [];
    }

    const gitExtension = vscode.extensions.getExtension('vscode.git')?.exports;
    const git = gitExtension?.getAPI(1);

    if (!git || git.repositories.length === 0) {
        return [];
    }

    const repo = git.repositories[0];
    const refs: string[] = [];

    try {
        // Get local branches
        const localBranches = repo.state.refs
            .filter((ref: any) => ref.type === 0) // RefType.Head
            .map((ref: any) => ref.name || '');
        refs.push(...localBranches);

        // Get remote branches
        const remoteBranches = repo.state.refs
            .filter((ref: any) => ref.type === 1) // RefType.RemoteHead
            .map((ref: any) => ref.name || '');
        refs.push(...remoteBranches);

        // Get tags
        const tags = repo.state.refs
            .filter((ref: any) => ref.type === 2) // RefType.Tag
            .map((ref: any) => ref.name || '');
        refs.push(...tags);

        // Get recent commits (HEAD~N format)
        for (let i = 0; i <= 10; i++) {
            refs.push(`HEAD~${i}`);
        }

        // Add common references
        refs.push('HEAD', 'ORIG_HEAD', 'FETCH_HEAD', 'MERGE_HEAD');

        // Try to get worktrees using git command
        try {
            const { execSync } = require('child_process');
            const worktreeOutput = execSync('git worktree list --porcelain', {
                cwd: workspaceFolder.uri.fsPath,
                encoding: 'utf-8'
            });

            const worktreeLines = worktreeOutput.split('\n');
            for (const line of worktreeLines) {
                if (line.startsWith('branch ')) {
                    const branch = line.substring(7).trim().replace('refs/heads/', '');
                    if (branch && !refs.includes(branch)) {
                        refs.push(branch);
                    }
                }
            }
        } catch (e) {
            // Worktrees command failed, skip
            log(`Failed to get worktrees: ${e}`);
        }

    } catch (error) {
        log(`Error getting git references: ${error}`);
    }

    return refs.filter(ref => ref.length > 0);
}

// Find closest matching git reference
async function findClosestGitReference(userInput: string): Promise<string> {
    const allRefs = await getAllGitReferences();

    if (allRefs.length === 0) {
        // No refs found, return user input as-is
        return userInput;
    }

    // Check for exact match first
    if (allRefs.includes(userInput)) {
        log(`✓ Exact match found: ${userInput}`);
        return userInput;
    }

    // Check for case-insensitive exact match
    const lowerInput = userInput.toLowerCase();
    const caseInsensitiveMatch = allRefs.find(ref => ref.toLowerCase() === lowerInput);
    if (caseInsensitiveMatch) {
        log(`✓ Case-insensitive match found: ${caseInsensitiveMatch} (from input: ${userInput})`);
        return caseInsensitiveMatch;
    }

    // Check for substring match
    const substringMatches = allRefs.filter(ref =>
        ref.toLowerCase().includes(lowerInput) || lowerInput.includes(ref.toLowerCase())
    );

    if (substringMatches.length > 0) {
        // Return the shortest substring match (likely the most specific)
        const bestMatch = substringMatches.reduce((a, b) => a.length <= b.length ? a : b);
        log(`✓ Substring match found: ${bestMatch} (from input: ${userInput})`);
        return bestMatch;
    }

    // Use Levenshtein distance for fuzzy matching
    let bestMatch = allRefs[0];
    let bestDistance = levenshteinDistance(userInput.toLowerCase(), bestMatch.toLowerCase());

    for (const ref of allRefs) {
        const distance = levenshteinDistance(userInput.toLowerCase(), ref.toLowerCase());
        if (distance < bestDistance) {
            bestDistance = distance;
            bestMatch = ref;
        }
    }

    log(`✓ Fuzzy match found: ${bestMatch} (from input: ${userInput}, distance: ${bestDistance})`);
    return bestMatch;
}


export async function activate(context: vscode.ExtensionContext) {
    outputChannel = vscode.window.createOutputChannel('Claude Helper');
    context.subscriptions.push(outputChannel);

    // Get workspace root first
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceRoot) {
        console.log('No workspace folder found');
        return;
    }

    // Set up log file path
    workspaceLogPath = path.join(workspaceRoot, '.claude-helper.log');

    log('Claude Helper is now active');
    console.log('Claude Helper is now active');

    // Show activation notification
    vscode.window.showInformationMessage('Claude Helper activated - logs in .claude-helper.log');

    // Register command to show logs
    const showLogsCommand = vscode.commands.registerCommand('claude-helper.showLogs', () => {
        outputChannel.show();
    });
    context.subscriptions.push(showLogsCommand);

    // Initialize port listener FIRST before registering commands that depend on it
    const portListenerStartPort = 3456; // Starting port for Claude Helper
    const commandHandlers = new Map<string, (args: string[]) => Promise<CliResult>>([
        ['compareReferences', executeCompareReferences],
        ['compareHead', executeCompareHead],
        ['clearComparisons', executeClearComparisons],
        ['ping', executePing],
        ['setTerminalTitle', executeSetTerminalTitle]
    ]);

    try {
        log('Attempting to initialize HTTP port listener...');
        console.log('Attempting to initialize HTTP port listener...');
        currentPort = await initializePortListener(context, portListenerStartPort, commandHandlers);
        log(`Port listener initialized on port ${currentPort}`);
        console.log(`Port listener initialized on port ${currentPort}`);

        // Store the port in workspace state for persistence
        context.workspaceState.update('claudeHelperPort', currentPort);
    } catch (error) {
        log(`Failed to initialize port listener: ${error}`);
        console.error('Failed to initialize port listener:', error);
        vscode.window.showErrorMessage(`Claude Helper: Failed to start HTTP listener - ${error}`);
    }

    // Register command to open Claude terminal AFTER port is initialized
    const openClaudeTerminalCommand = vscode.commands.registerCommand('claude-helper.openClaudeTerminal', () => {
        const uniqueTitle = generateUniqueTerminalTitle();
        const terminal = vscode.window.createTerminal(uniqueTitle);
        terminal.show();
        // Wait for terminal to be ready, export environment variables, then run claude
        setTimeout(() => {
            terminal.sendText(`export CLAUDE_HELPER_CURRENT_TERMINAL_TITLE="${uniqueTitle}"`, true);
            if (currentPort) {
                terminal.sendText(`export CLAUDE_HELPER_PORT="${currentPort}"`, true);
            }
            terminal.sendText('claude', true);
        }, 500);
    });
    context.subscriptions.push(openClaudeTerminalCommand);

    const commandFilePath = path.join(workspaceRoot, CLI_COMMAND_FILE);
    const resultFilePath = path.join(workspaceRoot, CLI_RESULT_FILE);

    // Watch for CLI command file
    const watcher = vscode.workspace.createFileSystemWatcher(
        new vscode.RelativePattern(workspaceRoot, CLI_COMMAND_FILE)
    );

    watcher.onDidCreate(async () => {
        log('CLI command file detected');
        console.log('CLI command file detected');
        await processCliCommand(commandFilePath, resultFilePath);
    });

    watcher.onDidChange(async () => {
        log('CLI command file changed');
        console.log('CLI command file changed');
        await processCliCommand(commandFilePath, resultFilePath);
    });

    context.subscriptions.push(watcher);

    // Also check if file exists on activation
    if (fs.existsSync(commandFilePath)) {
        processCliCommand(commandFilePath, resultFilePath);
    }
}

async function processCliCommand(commandFilePath: string, resultFilePath: string) {
    try {
        // Clear logs for this command
        logMessages = [];

        // Read command file
        const commandData = fs.readFileSync(commandFilePath, 'utf8');
        const command: CliCommand = JSON.parse(commandData);

        log(`Processing command: ${command.command} with args: ${JSON.stringify(command.args)}`);
        console.log('Processing command:', command);

        let result: CliResult;

        switch (command.command) {
            case 'compareReferences':
                result = await executeCompareReferences(command.args);
                break;
            case 'compareHead':
                result = await executeCompareHead(command.args);
                break;
            case 'clearComparisons':
                result = await executeClearComparisons();
                break;
            case 'ping':
                result = await executePing(command.args);
                break;
            case 'setTerminalTitle':
                result = await executeSetTerminalTitle(command.args);
                break;
            default:
                result = {
                    success: false,
                    message: '',
                    error: `Unknown command: ${command.command}`
                };
        }

        // Add logs to result
        result.logs = [...logMessages];

        // Write result
        fs.writeFileSync(resultFilePath, JSON.stringify(result, null, 2));

        // Delete command file
        fs.unlinkSync(commandFilePath);

    } catch (error) {
        log(`Error processing CLI command: ${error instanceof Error ? error.message : String(error)}`);
        console.error('Error processing CLI command:', error);
        const errorResult: CliResult = {
            success: false,
            message: '',
            error: error instanceof Error ? error.message : String(error),
            logs: [...logMessages]
        };
        fs.writeFileSync(resultFilePath, JSON.stringify(errorResult, null, 2));

        // Try to delete command file
        try {
            fs.unlinkSync(commandFilePath);
        } catch (e) {
            console.error('Failed to delete command file:', e);
        }
    }
}

async function executeCompareReferences(args: string[]): Promise<CliResult> {
    if (args.length < 2) {
        return {
            success: false,
            message: '',
            error: 'compareReferences requires 2 arguments: <ref1> <ref2>'
        };
    }

    const [userRef1, userRef2] = args;

    // Find closest matching git references
    const ref1 = await findClosestGitReference(userRef1);
    const ref2 = await findClosestGitReference(userRef2);

    log(`compareReferences: User input "${userRef1}" matched to "${ref1}"`);
    log(`compareReferences: User input "${userRef2}" matched to "${ref2}"`);

    try {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            return {
                success: false,
                message: '',
                error: 'No workspace folder found'
            };
        }

        // Get the Git extension API
        const gitExtension = vscode.extensions.getExtension('vscode.git')?.exports;
        const git = gitExtension?.getAPI(1);

        if (!git || git.repositories.length === 0) {
            return {
                success: false,
                message: '',
                error: 'No Git repository found'
            };
        }

        const repo = git.repositories[0];

        // Try to open the comparison using GitLens's showQuickCommit
        // This opens a comparison view for the changes between two refs
        try {
            await vscode.commands.executeCommand('gitlens.compareWith', {
                ref1: ref1,
                ref2: ref2,
                repoPath: repo.rootUri.fsPath
            });
            return {
                success: true,
                message: `Opened comparison: ${ref1} ↔ ${ref2}`
            };
        } catch (e1) {
            console.log('compareWith failed, trying openComparisonOnRemote', e1);
        }

        // Alternative: Try the Views comparison
        try {
            await vscode.commands.executeCommand('gitlens.views.compare.selectForCompare');
            await vscode.commands.executeCommand('gitlens.views.compare.compareWithSelected');
            return {
                success: true,
                message: `Opened GitLens comparison view for ${ref1} and ${ref2}`
            };
        } catch (e2) {
            console.log('Views compare failed, trying diffWith', e2);
        }

        // Last resort: Open a simple diff view
        try {
            const uri1 = vscode.Uri.parse(`gitlens://ref/${ref1}`);
            const uri2 = vscode.Uri.parse(`gitlens://ref/${ref2}`);
            await vscode.commands.executeCommand('vscode.diff', uri1, uri2, `${ref1} ↔ ${ref2}`);
            return {
                success: true,
                message: `Opened diff view: ${ref1} ↔ ${ref2}`
            };
        } catch (e3) {
            console.log('Diff failed, falling back to plain compareWith', e3);
        }

        // Final fallback: Just open the GitLens compare view (user will need to select refs)
        await vscode.commands.executeCommand('gitlens.compareWith');
        return {
            success: true,
            message: `Opened GitLens compare view (please select ${ref1} and ${ref2} from the UI)`
        };

    } catch (error) {
        return {
            success: false,
            message: '',
            error: `Failed to execute GitLens compare: ${error instanceof Error ? error.message : String(error)}`
        };
    }
}

async function executeCompareHead(args: string[]): Promise<CliResult> {
    if (args.length < 1) {
        return {
            success: false,
            message: '',
            error: 'compareHead requires 1 argument: <ref>'
        };
    }

    const [userRef] = args;

    // Find closest matching git reference
    const matchedRef = await findClosestGitReference(userRef);

    log(`compareHead: User input "${userRef}" matched to "${matchedRef}"`);

    // Delegate to executeCompareReferences with HEAD as first ref
    return executeCompareReferences(['HEAD', matchedRef]);
}

async function executeClearComparisons(): Promise<CliResult> {
    try {
        // Try various GitLens commands to clear/dismiss comparisons
        const commandsToTry = [
            // The correct command from searchAndCompareView.ts
            { cmd: 'gitlens.views.searchAndCompare.clear', msg: 'Cleared all comparisons from Search & Compare view' },
            // Legacy commands (keeping as fallback)
            { cmd: 'gitlens.views.compare.clearResults', msg: 'Cleared all comparison results' },
            { cmd: 'gitlens.views.clearComparison', msg: 'Cleared comparison state' },
            { cmd: 'gitlens.clearComparison', msg: 'Cleared comparisons' },
            { cmd: 'gitlens.views.compare.clear', msg: 'Cleared compare view' },
            { cmd: 'gitlens.closeComparison', msg: 'Closed comparisons' },
            { cmd: 'gitlens.views.compare.dismissAll', msg: 'Dismissed all comparisons' }
        ];

        // Try each command in sequence
        for (const { cmd, msg } of commandsToTry) {
            try {
                log(`Trying command: ${cmd}`);
                await vscode.commands.executeCommand(cmd);
                log(`✓ Successfully executed ${cmd}`);
                console.log(`Successfully executed ${cmd}`);
                return {
                    success: true,
                    message: msg
                };
            } catch (e) {
                log(`✗ Command ${cmd} failed: ${e}`);
                console.log(`Command ${cmd} failed:`, e);
                // Continue to next command
            }
        }

        // If all commands fail, open the GitLens view so user can manually clear
        log('All clear commands failed, opening GitLens view for manual clearing');
        try {
            await vscode.commands.executeCommand('workbench.view.extension.gitlens');
            return {
                success: false,
                message: '',
                error: 'Could not automatically clear comparisons - please use the X buttons in GitLens Compare view to dismiss them manually'
            };
        } catch (e) {
            log(`Opening GitLens view failed: ${e}`);
            console.log('Opening GitLens view failed', e);
        }

        return {
            success: false,
            message: '',
            error: 'Could not clear comparisons - please manually dismiss them using the X buttons in GitLens Compare view'
        };

    } catch (error) {
        return {
            success: false,
            message: '',
            error: `Failed to clear comparisons: ${error instanceof Error ? error.message : String(error)}`
        };
    }
}

async function executePing(args: string[]): Promise<CliResult> {
    try {
        log('Ping command received');

        // Use current time as timestamp
        const timestamp = new Date().toLocaleTimeString();
        const customMessage = args.length > 0 ? args.join(' ') : '';

        // Build notification message
        let notificationMsg = `🔔 Ping! [${timestamp}]`;
        if (customMessage) {
            notificationMsg += ` ${customMessage}`;
        }

        // Show notification
        vscode.window.showInformationMessage(notificationMsg);
        log(`✓ Notification shown: ${notificationMsg}`);

        return {
            success: true,
            message: `Ping! Notification shown in VS Code: ${notificationMsg}`
        };
    } catch (error) {
        return {
            success: false,
            message: '',
            error: `Failed to execute ping: ${error instanceof Error ? error.message : String(error)}`
        };
    }
}

async function executeSetTerminalTitle(args: string[]): Promise<CliResult> {
    try {
        if (args.length < 1) {
            return {
                success: false,
                message: '',
                error: 'setTerminalTitle requires at least 1 argument: <new_title> [current_title]'
            };
        }

        const newTitle = args[0];
        const currentTitle = args.length > 1 ? args[1] : '';
        let targetTerminal: vscode.Terminal | undefined;
        let oldTitle = '';

        // If currentTitle is provided and not empty, search by title
        if (currentTitle) {
            log(`Searching for terminal with title: ${currentTitle}`);
            log(`Will rename to: ${newTitle}`);

            targetTerminal = findTerminalByTitle(currentTitle);

            if (!targetTerminal) {
                log(`Terminal with title "${currentTitle}" not found, falling back to active terminal`);
                targetTerminal = vscode.window.activeTerminal;

                if (!targetTerminal) {
                    return {
                        success: false,
                        message: '',
                        error: 'Terminal not found and no active terminal available'
                    };
                }

                log(`Using active terminal as fallback: ${targetTerminal.name}`);
            }

            oldTitle = targetTerminal.name;
        } else {
            // No currentTitle provided, use active terminal
            log(`No current title provided, using active terminal`);
            log(`Will rename to: ${newTitle}`);

            targetTerminal = vscode.window.activeTerminal;

            if (!targetTerminal) {
                return {
                    success: false,
                    message: '',
                    error: 'No active terminal found'
                };
            }

            oldTitle = targetTerminal.name;
            log(`Active terminal: ${oldTitle}`);
        }

        // Show the terminal first to make it active, then rename
        targetTerminal.show();

        // Use VS Code's built-in command to rename terminal
        await vscode.commands.executeCommand('workbench.action.terminal.renameWithArg', {
            name: newTitle
        });

        log('✓ Terminal renamed using VS Code API');

        return {
            success: true,
            message: `Terminal title changed from "${oldTitle}" to "${newTitle}"`
        };
    } catch (error) {
        return {
            success: false,
            message: '',
            error: `Failed to set terminal title: ${error instanceof Error ? error.message : String(error)}`
        };
    }
}

export function deactivate() {
    console.log('Claude Helper is now deactivated');
}
