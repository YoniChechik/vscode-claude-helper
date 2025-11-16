import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { initializePortListener } from './portListener';
import { Logger } from './utils/logger';
import { createCommandHandlersMap, CliResult, CommandName } from './commands/registry';
import { generateUniqueTerminalTitle, createClaudeTerminal } from './utils/terminal';
import { handleCommandError } from './utils/results';

const CLI_COMMAND_FILE = '.claude-helper';
const CLI_RESULT_FILE = '.claude-helper-result';
const PORT_LISTENER_START_PORT = 3456;

interface CliCommand {
    command: CommandName;
    args: string[];
}

// Global state
let logger: Logger;
let currentPort: number | undefined;

// ============================================================================
// Public API
// ============================================================================

export async function activate(context: vscode.ExtensionContext) {
    const outputChannel = vscode.window.createOutputChannel('Claude Helper');
    context.subscriptions.push(outputChannel);

    logger = new Logger(outputChannel);

    // Get workspace root first
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceRoot) {
        console.log('No workspace folder found');
        return;
    }

    logger.log('Claude Helper is now active');
    console.log('Claude Helper is now active');

    // Show activation notification
    vscode.window.showInformationMessage('Claude Helper activated - logs in Output Panel');

    // Register command to show logs
    const showLogsCommand = vscode.commands.registerCommand('claude-helper.showLogs', () => {
        outputChannel.show();
    });
    context.subscriptions.push(showLogsCommand);

    // Initialize port listener FIRST before registering commands that depend on it
    const commandHandlers = createCommandHandlersMap();

    try {
        logger.log('Attempting to initialize HTTP port listener...');
        console.log('Attempting to initialize HTTP port listener...');
        currentPort = await initializePortListener(context, PORT_LISTENER_START_PORT, commandHandlers, logger);
        logger.log(`Port listener initialized on port ${currentPort}`);
        console.log(`Port listener initialized on port ${currentPort}`);

        // Store the port in workspace state for persistence
        context.workspaceState.update('claudeHelperPort', currentPort);
    } catch (error) {
        logger.log(`Failed to initialize port listener: ${error}`);
        console.error('Failed to initialize port listener:', error);
        vscode.window.showErrorMessage(`Claude Helper: Failed to start HTTP listener - ${error}`);
    }

    // Register command to open Claude terminal AFTER port is initialized
    const openClaudeTerminalCommand = vscode.commands.registerCommand('claude-helper.openClaudeTerminal', async () => {
        const uniqueTitle = generateUniqueTerminalTitle();
        await createClaudeTerminal(uniqueTitle, currentPort);
    });
    context.subscriptions.push(openClaudeTerminalCommand);

    const commandFilePath = path.join(workspaceRoot, CLI_COMMAND_FILE);
    const resultFilePath = path.join(workspaceRoot, CLI_RESULT_FILE);

    // Watch for CLI command file
    const watcher = vscode.workspace.createFileSystemWatcher(
        new vscode.RelativePattern(workspaceRoot, CLI_COMMAND_FILE)
    );

    watcher.onDidCreate(async () => {
        logger.log('CLI command file detected');
        console.log('CLI command file detected');
        await processCliCommand(commandFilePath, resultFilePath);
    });

    watcher.onDidChange(async () => {
        logger.log('CLI command file changed');
        console.log('CLI command file changed');
        await processCliCommand(commandFilePath, resultFilePath);
    });

    context.subscriptions.push(watcher);

    // Also check if file exists on activation
    if (fs.existsSync(commandFilePath)) {
        processCliCommand(commandFilePath, resultFilePath);
    }
}

export function deactivate() {
    console.log('Claude Helper is now deactivated');
}

// ============================================================================
// Private Helpers
// ============================================================================

async function processCliCommand(commandFilePath: string, resultFilePath: string) {
    try {
        // Clear logs for this command
        logger.clearLogs();

        // Read command file
        const commandData = fs.readFileSync(commandFilePath, 'utf8');
        const command: CliCommand = JSON.parse(commandData);

        logger.log(`Processing command: ${command.command} with args: ${JSON.stringify(command.args)}`);
        console.log('Processing command:', command);

        let result: CliResult;

        // Get command handler from registry
        const commandHandlers = createCommandHandlersMap();
        const handler = commandHandlers.get(command.command);

        if (handler) {
            result = await handler(command.args, logger.log.bind(logger));
        } else {
            result = {
                success: false,
                message: '',
                error: `Unknown command: ${command.command}`
            };
        }

        // Add logs to result
        result.logs = logger.getRecentLogs();

        // Write result
        fs.writeFileSync(resultFilePath, JSON.stringify(result, null, 2));

        // Delete command file
        fs.unlinkSync(commandFilePath);

    } catch (error) {
        logger.log(`Error processing CLI command: ${error instanceof Error ? error.message : String(error)}`);
        console.error('Error processing CLI command:', error);

        const errorResult = handleCommandError(error, logger.getRecentLogs());
        fs.writeFileSync(resultFilePath, JSON.stringify(errorResult, null, 2));

        // Try to delete command file
        try {
            fs.unlinkSync(commandFilePath);
        } catch (e) {
            console.error('Failed to delete command file:', e);
        }
    }
}
