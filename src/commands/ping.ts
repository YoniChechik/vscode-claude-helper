import * as vscode from 'vscode';
import { CliResult } from './registry';
import { createSuccessResult, handleCommandError } from '../utils/results';

export async function executePing(
    args: string[],
    logger?: (msg: string) => void
): Promise<CliResult> {
    try {
        logger?.('Ping command received');

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
        logger?.(`✓ Notification shown: ${notificationMsg}`);

        return createSuccessResult(`Ping! Notification shown in VS Code: ${notificationMsg}`);
    } catch (error) {
        return handleCommandError(error);
    }
}
