#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const CLI_COMMAND_FILE = '.gitlens-cli';
const CLI_RESULT_FILE = '.gitlens-cli-result';
const POLL_INTERVAL = 100; // ms
const TIMEOUT = 30000; // 30 seconds

function findGitRoot(startPath) {
    let currentPath = startPath;

    while (currentPath !== path.parse(currentPath).root) {
        const gitPath = path.join(currentPath, '.git');
        if (fs.existsSync(gitPath)) {
            return currentPath;
        }
        currentPath = path.dirname(currentPath);
    }

    return null;
}

async function waitForResult(resultPath, timeout) {
    const startTime = Date.now();

    return new Promise((resolve, reject) => {
        const interval = setInterval(() => {
            if (Date.now() - startTime > timeout) {
                clearInterval(interval);
                reject(new Error('Timeout waiting for VS Code to process command'));
                return;
            }

            if (fs.existsSync(resultPath)) {
                clearInterval(interval);
                try {
                    const resultData = fs.readFileSync(resultPath, 'utf8');
                    const result = JSON.parse(resultData);

                    // Clean up result file
                    try {
                        fs.unlinkSync(resultPath);
                    } catch (e) {
                        // Ignore cleanup errors
                    }

                    resolve(result);
                } catch (error) {
                    reject(new Error(`Failed to read result: ${error.message}`));
                }
            }
        }, POLL_INTERVAL);
    });
}

async function executeCommand(workspaceRoot, command, args) {
    const commandPath = path.join(workspaceRoot, CLI_COMMAND_FILE);
    const resultPath = path.join(workspaceRoot, CLI_RESULT_FILE);

    // Clean up any existing files
    try {
        if (fs.existsSync(commandPath)) {
            fs.unlinkSync(commandPath);
        }
        if (fs.existsSync(resultPath)) {
            fs.unlinkSync(resultPath);
        }
    } catch (e) {
        console.error(`Warning: Failed to clean up existing files: ${e.message}`);
    }

    // Write command file
    const commandData = {
        command,
        args,
        timestamp: Date.now()
    };

    fs.writeFileSync(commandPath, JSON.stringify(commandData, null, 2));

    // Wait for result
    const result = await waitForResult(resultPath, TIMEOUT);

    if (result.success) {
        console.log('✓', result.message);
        return 0;
    } else {
        console.error('✗ Error:', result.error);
        return 1;
    }
}

function printUsage() {
    console.log(`
GitLens CLI Bridge - Run GitLens compare commands from the CLI

Usage:
  gitlens compare <ref1> <ref2>     Compare two references
  gitlens compare-head <ref>        Compare HEAD with a reference

Examples:
  gitlens compare main feature-branch
  gitlens compare origin/main HEAD
  gitlens compare-head origin/main

Requirements:
  - Must be run from within a git repository
  - VS Code must be open with the workspace
  - GitLens extension must be installed
`);
}

async function main() {
    const args = process.argv.slice(2);

    if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
        printUsage();
        return 0;
    }

    const command = args[0];
    const commandArgs = args.slice(1);

    // Find workspace root
    const workspaceRoot = findGitRoot(process.cwd());

    if (!workspaceRoot) {
        console.error('✗ Error: Not in a git repository');
        console.error('  Please run this command from within a git repository');
        return 1;
    }

    console.log(`Workspace: ${workspaceRoot}`);

    // Execute command
    switch (command) {
        case 'compare':
            if (commandArgs.length < 2) {
                console.error('✗ Error: compare requires 2 arguments: <ref1> <ref2>');
                printUsage();
                return 1;
            }
            return await executeCommand(workspaceRoot, 'compareReferences', commandArgs);

        case 'compare-head':
            if (commandArgs.length < 1) {
                console.error('✗ Error: compare-head requires 1 argument: <ref>');
                printUsage();
                return 1;
            }
            return await executeCommand(workspaceRoot, 'compareHead', commandArgs);

        default:
            console.error(`✗ Error: Unknown command: ${command}`);
            printUsage();
            return 1;
    }
}

main().then(code => {
    process.exit(code);
}).catch(error => {
    console.error('✗ Fatal error:', error.message);
    process.exit(1);
});
