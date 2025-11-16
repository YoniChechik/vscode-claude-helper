import * as vscode from 'vscode';
import * as http from 'http';
import * as net from 'net';
import { Logger } from './utils/logger';
import { CliResult, CommandHandler, CommandName } from './commands/registry';
import { createErrorResult, handleCommandError } from './utils/results';

const PORT_HOST = '127.0.0.1';
const PORT_MAX_ATTEMPTS = 10;

interface CliCommand {
    command: CommandName;
    args: string[];
}

let server: http.Server | null = null;
let logger: Logger;
let commandHandlers: Map<string, CommandHandler> = new Map();

// ============================================================================
// Public API
// ============================================================================

export async function initializePortListener(
    context: vscode.ExtensionContext,
    startPort: number,
    handlers: Map<string, CommandHandler>,
    sharedLogger: Logger
): Promise<number> {
    console.log('[Port Listener] initializePortListener called with start port:', startPort);
    console.log('[Port Listener] Handlers count:', handlers.size);

    logger = sharedLogger;
    commandHandlers = handlers;

    // Find an available port
    const port = await findAvailablePort(startPort);
    logger.log(`Initializing HTTP listener on port ${port}...`);

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

        logger.log(`Request from ${req.socket.remoteAddress}`);

        // Read request body
        let body = '';
        req.on('data', (chunk) => {
            body += chunk.toString();
        });

        req.on('end', async () => {
            try {
                const command: CliCommand = JSON.parse(body);
                logger.log(`Received command: ${command.command} with args: ${JSON.stringify(command.args)}`);

                const result = await processCommand(command);

                res.writeHead(200);
                res.end(JSON.stringify(result, null, 2));
                logger.log(`Sent response: ${result.success ? 'success' : 'failure'}`);

            } catch (error) {
                const errorResult = handleCommandError(error);
                res.writeHead(400);
                res.end(JSON.stringify(errorResult, null, 2));
                logger.log(`Error processing request: ${errorResult.error}`);
            }
        });
    });

    return new Promise<number>((resolve, reject) => {
        server!.on('error', (error: NodeJS.ErrnoException) => {
            logger.log(`Server error: ${error.message}`);
            vscode.window.showErrorMessage(`Claude Helper: Port listener error - ${error.message}`);
            reject(error);
        });

        server!.listen(port, PORT_HOST, () => {
            logger.log(`HTTP listener started on http://${PORT_HOST}:${port}`);
            vscode.window.showInformationMessage(`Claude Helper: HTTP listener active on port ${port}`);
            resolve(port);
        });

        context.subscriptions.push({
            dispose: () => {
                if (server) {
                    server.close();
                    logger.log('HTTP listener stopped');
                }
            }
        });
    });
}

export function stopPortListener(): void {
    if (server) {
        server.close();
        server = null;
        logger.log('HTTP listener stopped');
    }
}

// ============================================================================
// Private Helpers
// ============================================================================

async function findAvailablePort(startPort: number, maxAttempts: number = PORT_MAX_ATTEMPTS): Promise<number> {
    for (let port = startPort; port < startPort + maxAttempts; port++) {
        if (await isPortAvailable(port)) {
            logger.log(`Found available port: ${port}`);
            return port;
        }
        logger.log(`Port ${port} is in use, trying next...`);
    }
    throw new Error(`No available port found in range ${startPort}-${startPort + maxAttempts - 1}`);
}

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

        testServer.listen(port, PORT_HOST);
    });
}

async function processCommand(command: CliCommand): Promise<CliResult> {
    const handler = commandHandlers.get(command.command);

    if (!handler) {
        return createErrorResult(`Unknown command: ${command.command}`);
    }

    try {
        return await handler(command.args, logger.log.bind(logger));
    } catch (error) {
        return handleCommandError(error);
    }
}
