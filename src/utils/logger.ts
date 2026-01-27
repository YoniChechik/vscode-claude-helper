import * as vscode from 'vscode';

export class Logger {
    constructor(private outputChannel: vscode.OutputChannel) {}

    log(message: string): void {
        const timestamp = new Date().toLocaleTimeString();
        const logLine = `[${timestamp}] ${message}`;
        this.outputChannel.appendLine(logLine);
    }
}
