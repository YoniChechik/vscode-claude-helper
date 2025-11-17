import * as vscode from 'vscode';
import { CliResult } from './registry';
import { createSuccessResult, createErrorResult, handleCommandError } from '../utils/results';
import { findTerminalByUuid } from '../utils/terminal';

export async function executeSetTerminalTitle(
    args: string[],
    logger?: (msg: string) => void
): Promise<CliResult> {
    try {
        if (args.length < 2) {
            return createErrorResult('setTerminalTitle requires 2 arguments: <new_title> <terminal_id>');
        }

        const newTitle = args[0];
        const terminalId = args[1];

        logger?.(`Searching for terminal with ID: ${terminalId}`);
        logger?.(`Will rename to: ${newTitle}`);

        const targetTerminal = findTerminalByUuid(terminalId);

        if (!targetTerminal) {
            return createErrorResult(`Terminal with ID "${terminalId}" not found`);
        }

        logger?.(`Found terminal by ID: ${terminalId}`);

        const oldTitle = targetTerminal.name;

        // Show the terminal first to make it active, then rename
        targetTerminal.show();

        // Use VS Code's built-in command to rename terminal
        await vscode.commands.executeCommand('workbench.action.terminal.renameWithArg', {
            name: newTitle
        });

        logger?.('✓ Terminal renamed using VS Code API');

        return createSuccessResult(`Terminal title changed from "${oldTitle}" to "${newTitle}"`);
    } catch (error) {
        return handleCommandError(error);
    }
}
