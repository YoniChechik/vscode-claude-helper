import * as vscode from 'vscode';
import { CliResult } from './registry';
import { createSuccessResult, createErrorResult, handleCommandError } from '../utils/results';
import { findTerminalByTitle } from '../utils/terminal';

export async function executeSetTerminalTitle(
    args: string[],
    logger?: (msg: string) => void
): Promise<CliResult> {
    try {
        if (args.length < 1) {
            return createErrorResult('setTerminalTitle requires at least 1 argument: <new_title> [current_title]');
        }

        const newTitle = args[0];
        const currentTitle = args.length > 1 ? args[1] : '';
        let targetTerminal: vscode.Terminal | undefined;
        let oldTitle = '';

        // If currentTitle is provided and not empty, search by title
        if (currentTitle) {
            logger?.(`Searching for terminal with title: ${currentTitle}`);
            logger?.(`Will rename to: ${newTitle}`);

            targetTerminal = findTerminalByTitle(currentTitle);

            if (!targetTerminal) {
                logger?.(`Terminal with title "${currentTitle}" not found, falling back to active terminal`);
                targetTerminal = vscode.window.activeTerminal;

                if (!targetTerminal) {
                    return createErrorResult('Terminal not found and no active terminal available');
                }

                logger?.(`Using active terminal as fallback: ${targetTerminal.name}`);
            }

            oldTitle = targetTerminal.name;
        } else {
            // No currentTitle provided, use active terminal
            logger?.(`No current title provided, using active terminal`);
            logger?.(`Will rename to: ${newTitle}`);

            targetTerminal = vscode.window.activeTerminal;

            if (!targetTerminal) {
                return createErrorResult('No active terminal found');
            }

            oldTitle = targetTerminal.name;
            logger?.(`Active terminal: ${oldTitle}`);
        }

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
