import * as vscode from 'vscode';
import * as http from 'http';

interface CliCommand {
    command: string;
    args: string[];
}

interface CliResult {
    success: boolean;
    message: string;
    error?: string;
    logs?: string[];
}

type CommandHandler = (args: string[]) => Promise<CliResult>;

let server: http.Server | null = null;
let outputChannel: vscode.OutputChannel | null = null;
let commandHandlers: Map<string, CommandHandler> = new Map();

function log(message: string) {
    if (outputChannel) {
        const timestamp = new Date().toLocaleTimeString();
        outputChannel.appendLine(`[${timestamp}] [Port Listener] ${message}`);
    }
    console.log(`[Port Listener] ${message}`);
}

export function initializePortListener(
    context: vscode.ExtensionContext,
    port: number,
    handlers: Map<string, CommandHandler>
): void {
    console.log('[Port Listener] initializePortListener called with port:', port);
    console.log('[Port Listener] Handlers count:', handlers.size);
    outputChannel = vscode.window.createOutputChannel('Claude Helper Port Listener');
    context.subscriptions.push(outputChannel);
    commandHandlers = handlers;
    log(`Initializing HTTP listener on port ${port}...`);

    // Create HTTP server
    server = http.createServer(async (req, res) => {
        // Enable CORS for browser requests
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        res.setHeader('Content-Type', 'application/json');

        // Handle OPTIONS preflight
        if (req.method === 'OPTIONS') {
            res.writeHead(200);
            res.end();
            return;
        }

        // Only accept POST requests for commands
        if (req.method !== 'POST') {
            res.writeHead(405);
            res.end(JSON.stringify({
                success: false,
                error: 'Method not allowed. Use POST to send commands.'
            }));
            return;
        }

        log(`Request from ${req.socket.remoteAddress}`);

        // Read request body
        let body = '';
        req.on('data', (chunk) => {
            body += chunk.toString();
        });

        req.on('end', async () => {
            try {
                const command: CliCommand = JSON.parse(body);
                log(`Received command: ${command.command} with args: ${JSON.stringify(command.args)}`);

                const result = await processCommand(command);

                res.writeHead(200);
                res.end(JSON.stringify(result, null, 2));
                log(`Sent response: ${result.success ? 'success' : 'failure'}`);

            } catch (error) {
                const errorResult: CliResult = {
                    success: false,
                    message: '',
                    error: error instanceof Error ? error.message : String(error)
                };
                res.writeHead(400);
                res.end(JSON.stringify(errorResult, null, 2));
                log(`Error processing request: ${errorResult.error}`);
            }
        });
    });

    server.on('error', (error: NodeJS.ErrnoException) => {
        if (error.code === 'EADDRINUSE') {
            log(`Port ${port} is already in use. Port listener disabled.`);
            vscode.window.showWarningMessage(`Claude Helper: Port ${port} is already in use. Port listener disabled.`);
        } else {
            log(`Server error: ${error.message}`);
            vscode.window.showErrorMessage(`Claude Helper: Port listener error - ${error.message}`);
        }
    });

    server.listen(port, '127.0.0.1', () => {
        log(`HTTP listener started on http://127.0.0.1:${port}`);
        vscode.window.showInformationMessage(`Claude Helper: HTTP listener active on port ${port}`);
    });

    context.subscriptions.push({
        dispose: () => {
            if (server) {
                server.close();
                log('HTTP listener stopped');
            }
        }
    });
}

async function processCommand(command: CliCommand): Promise<CliResult> {
    const handler = commandHandlers.get(command.command);

    if (!handler) {
        return {
            success: false,
            message: '',
            error: `Unknown command: ${command.command}`
        };
    }

    try {
        return await handler(command.args);
    } catch (error) {
        return {
            success: false,
            message: '',
            error: error instanceof Error ? error.message : String(error)
        };
    }
}

export function stopPortListener(): void {
    if (server) {
        server.close();
        server = null;
        log('HTTP listener stopped');
    }
}
