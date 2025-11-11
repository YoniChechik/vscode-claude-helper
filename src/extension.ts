import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

const CLI_COMMAND_FILE = '.gitlens-cli';
const CLI_RESULT_FILE = '.gitlens-cli-result';

interface CliCommand {
    command: 'compareReferences' | 'compareHead' | 'clearComparisons' | 'ping';
    args: string[];
    timestamp: number;
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

async function playSound(): Promise<void> {
    log('Attempting to play sound...');

    const platform = process.platform;
    log(`Platform detected: ${platform}`);

    try {
        // Use VS Code's built-in error/warning to trigger audio cues
        // This respects user's VS Code audio settings and works in remote scenarios
        log('Triggering VS Code audio cue via information message');

        // Show and hide a message quickly to trigger the notification sound
        const message = vscode.window.showInformationMessage('🔔 Ping!');

        // The notification itself triggers a sound if user has audio cues enabled
        log('✓ Audio cue triggered via VS Code notification system');

        return;
    } catch (error) {
        log(`Failed to trigger audio cue: ${error instanceof Error ? error.message : String(error)}`);
    }
}

export function activate(context: vscode.ExtensionContext) {
    outputChannel = vscode.window.createOutputChannel('GitLens CLI Bridge');
    context.subscriptions.push(outputChannel);

    // Get workspace root first
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceRoot) {
        console.log('No workspace folder found');
        return;
    }

    // Set up log file path
    workspaceLogPath = path.join(workspaceRoot, '.gitlens-cli-extension.log');

    log('GitLens CLI Bridge is now active');
    console.log('GitLens CLI Bridge is now active');

    // Show activation notification
    vscode.window.showInformationMessage('GitLens CLI Bridge activated - logs in .gitlens-cli-extension.log');

    // Register command to show logs
    const showLogsCommand = vscode.commands.registerCommand('gitlens-cli-bridge.showLogs', () => {
        outputChannel.show();
    });
    context.subscriptions.push(showLogsCommand);

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
                result = await executePing();
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

    const [ref1, ref2] = args;

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

    const [ref] = args;

    // Just delegate to executeCompareReferences with HEAD as first ref
    return executeCompareReferences(['HEAD', ref]);
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

async function executePing(): Promise<CliResult> {
    try {
        log('Ping command received');

        // Play sound (which shows notification)
        await playSound();

        return {
            success: true,
            message: 'Ping! Notification shown in VS Code'
        };
    } catch (error) {
        return {
            success: false,
            message: '',
            error: `Failed to execute ping: ${error instanceof Error ? error.message : String(error)}`
        };
    }
}

export function deactivate() {
    console.log('GitLens CLI Bridge is now deactivated');
}
