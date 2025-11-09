import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

const CLI_COMMAND_FILE = '.gitlens-cli';
const CLI_RESULT_FILE = '.gitlens-cli-result';

interface CliCommand {
    command: 'compareReferences' | 'compareHead';
    args: string[];
    timestamp: number;
}

interface CliResult {
    success: boolean;
    message: string;
    error?: string;
}

export function activate(context: vscode.ExtensionContext) {
    console.log('GitLens CLI Bridge is now active');

    // Get workspace root
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceRoot) {
        console.log('No workspace folder found');
        return;
    }

    const commandFilePath = path.join(workspaceRoot, CLI_COMMAND_FILE);
    const resultFilePath = path.join(workspaceRoot, CLI_RESULT_FILE);

    // Watch for CLI command file
    const watcher = vscode.workspace.createFileSystemWatcher(
        new vscode.RelativePattern(workspaceRoot, CLI_COMMAND_FILE)
    );

    watcher.onDidCreate(async () => {
        console.log('CLI command file detected');
        await processCliCommand(commandFilePath, resultFilePath);
    });

    watcher.onDidChange(async () => {
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
        // Read command file
        const commandData = fs.readFileSync(commandFilePath, 'utf8');
        const command: CliCommand = JSON.parse(commandData);

        console.log('Processing command:', command);

        let result: CliResult;

        switch (command.command) {
            case 'compareReferences':
                result = await executeCompareReferences(command.args);
                break;
            case 'compareHead':
                result = await executeCompareHead(command.args);
                break;
            default:
                result = {
                    success: false,
                    message: '',
                    error: `Unknown command: ${command.command}`
                };
        }

        // Write result
        fs.writeFileSync(resultFilePath, JSON.stringify(result, null, 2));

        // Delete command file
        fs.unlinkSync(commandFilePath);

    } catch (error) {
        console.error('Error processing CLI command:', error);
        const errorResult: CliResult = {
            success: false,
            message: '',
            error: error instanceof Error ? error.message : String(error)
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
        // Try multiple command invocation strategies
        // Strategy 1: Try the compare command with refs
        try {
            await vscode.commands.executeCommand('gitlens.views.compareWith', ref1, ref2);
            return {
                success: true,
                message: `Comparing ${ref1} with ${ref2}`
            };
        } catch (e1) {
            console.log('Strategy 1 failed, trying strategy 2', e1);
        }

        // Strategy 2: Try with object parameters
        try {
            await vscode.commands.executeCommand('gitlens.compareWith', { ref1, ref2 });
            return {
                success: true,
                message: `Comparing ${ref1} with ${ref2}`
            };
        } catch (e2) {
            console.log('Strategy 2 failed, trying strategy 3', e2);
        }

        // Strategy 3: Try compareReferences command
        try {
            await vscode.commands.executeCommand('gitlens.compareReferences', ref1, ref2);
            return {
                success: true,
                message: `Comparing ${ref1} with ${ref2}`
            };
        } catch (e3) {
            console.log('Strategy 3 failed, trying strategy 4', e3);
        }

        // Strategy 4: Try without parameters (opens picker with defaults)
        await vscode.commands.executeCommand('gitlens.compareWith');

        return {
            success: true,
            message: `Opened GitLens compare (use UI to select ${ref1} and ${ref2})`
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

    try {
        // Try multiple command invocation strategies
        // Strategy 1: Try with ref as parameter
        try {
            await vscode.commands.executeCommand('gitlens.compareHeadWith', ref);
            return {
                success: true,
                message: `Comparing HEAD with ${ref}`
            };
        } catch (e1) {
            console.log('Strategy 1 failed, trying strategy 2', e1);
        }

        // Strategy 2: Try with object parameter
        try {
            await vscode.commands.executeCommand('gitlens.compareHeadWith', { ref });
            return {
                success: true,
                message: `Comparing HEAD with ${ref}`
            };
        } catch (e2) {
            console.log('Strategy 2 failed, trying strategy 3', e2);
        }

        // Strategy 3: Try views command
        try {
            await vscode.commands.executeCommand('gitlens.views.compareHeadWith', ref);
            return {
                success: true,
                message: `Comparing HEAD with ${ref}`
            };
        } catch (e3) {
            console.log('Strategy 3 failed, trying strategy 4', e3);
        }

        // Strategy 4: Try without parameters (opens picker)
        await vscode.commands.executeCommand('gitlens.compareHeadWith');

        return {
            success: true,
            message: `Opened GitLens compare HEAD (use UI to select ${ref})`
        };

    } catch (error) {
        return {
            success: false,
            message: '',
            error: `Failed to execute GitLens compare: ${error instanceof Error ? error.message : String(error)}`
        };
    }
}

export function deactivate() {
    console.log('GitLens CLI Bridge is now deactivated');
}
