import * as vscode from 'vscode';

const MAX_LOG_MESSAGES = 100;

export class Logger {
    private outputChannel: vscode.OutputChannel;
    private logMessages: string[] = [];
    private maxLogMessages: number;
    private prefix: string;

    constructor(
        outputChannel: vscode.OutputChannel,
        prefix: string = '',
        maxLogMessages: number = MAX_LOG_MESSAGES
    ) {
        this.outputChannel = outputChannel;
        this.prefix = prefix;
        this.maxLogMessages = maxLogMessages;
    }

    log(message: string): void {
        const timestamp = new Date().toLocaleTimeString();
        const prefixStr = this.prefix ? `[${this.prefix}] ` : '';
        const logLine = `[${timestamp}] ${prefixStr}${message}`;

        this.outputChannel.appendLine(logLine);
        console.log(logLine);

        this.logMessages.push(logLine);
        if (this.logMessages.length > this.maxLogMessages) {
            this.logMessages.shift();
        }
    }

    getRecentLogs(): string[] {
        return [...this.logMessages];
    }

    clearLogs(): void {
        this.logMessages = [];
    }
}
