import * as vscode from 'vscode';
import * as http from 'http';
import * as net from 'net';

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

/**
 * Try to find an available port starting from the given port number.
 * Tries up to maxAttempts consecutive ports.
 */
async function findAvailablePort(startPort: number, maxAttempts: number = 10): Promise<number> {
    for (let port = startPort; port < startPort + maxAttempts; port++) {
        if (await isPortAvailable(port)) {
            log(`Found available port: ${port}`);
            return port;
        }
        log(`Port ${port} is in use, trying next...`);
    }
    throw new Error(`No available port found in range ${startPort}-${startPort + maxAttempts - 1}`);
}

/**
 * Check if a port is available by trying to create a server on it
 */
function isPortAvailable(port: number): Promise<boolean> {
    return new Promise((resolve) => {
        const testServer = net.createServer();

        testServer.once('error', (err: NodeJS.ErrnoException) => {
            if (err.code === 'EADDRINUSE') {
                resolve(false);
            } else {
                // Other errors mean we can't use this port either
                resolve(false);
            }
        });

        testServer.once('listening', () => {
            testServer.close();
            resolve(true);
        });

        testServer.listen(port, '127.0.0.1');
    });
}

export async function initializePortListener(
    context: vscode.ExtensionContext,
    startPort: number,
    handlers: Map<string, CommandHandler>
): Promise<number> {
    console.log('[Port Listener] initializePortListener called with start port:', startPort);
    console.log('[Port Listener] Handlers count:', handlers.size);
    outputChannel = vscode.window.createOutputChannel('Claude Helper Port Listener');
    context.subscriptions.push(outputChannel);
    commandHandlers = handlers;

    // Find an available port
    const port = await findAvailablePort(startPort);
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

    return new Promise<number>((resolve, reject) => {
        server!.on('error', (error: NodeJS.ErrnoException) => {
            log(`Server error: ${error.message}`);
            vscode.window.showErrorMessage(`Claude Helper: Port listener error - ${error.message}`);
            reject(error);
        });

        server!.listen(port, '127.0.0.1', () => {
            log(`HTTP listener started on http://127.0.0.1:${port}`);
            vscode.window.showInformationMessage(`Claude Helper: HTTP listener active on port ${port}`);
            resolve(port);
        });

        context.subscriptions.push({
            dispose: () => {
                if (server) {
                    server.close();
                    log('HTTP listener stopped');
                }
            }
        });
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
