#!/usr/bin/env node

/**
 * Test script for GitLens CLI Bridge
 *
 * This script simulates what the VS Code extension does:
 * 1. Watches for .gitlens-cli command file
 * 2. Processes the command
 * 3. Writes a result to .gitlens-cli-result
 *
 * Usage: node test-cli.js
 * Then in another terminal: gitlens compare-head master
 */

const fs = require('fs');
const path = require('path');

const CLI_COMMAND_FILE = '.gitlens-cli';
const CLI_RESULT_FILE = '.gitlens-cli-result';

console.log('🧪 GitLens CLI Bridge Test Mode');
console.log('Watching for CLI commands...');
console.log('\nIn another terminal, try:');
console.log('  gitlens compare-head master');
console.log('  gitlens compare main HEAD\n');

// Watch for command file
setInterval(() => {
    if (fs.existsSync(CLI_COMMAND_FILE)) {
        try {
            const commandData = fs.readFileSync(CLI_COMMAND_FILE, 'utf8');
            const command = JSON.parse(commandData);

            console.log(`\n📥 Received command: ${command.command}`);
            console.log(`   Args: ${command.args.join(', ')}`);

            // Simulate processing
            let result;
            if (command.command === 'compareReferences') {
                result = {
                    success: true,
                    message: `Comparing ${command.args[0]} with ${command.args[1]}`
                };
            } else if (command.command === 'compareHead') {
                result = {
                    success: true,
                    message: `Comparing HEAD with ${command.args[0]}`
                };
            } else {
                result = {
                    success: false,
                    message: '',
                    error: `Unknown command: ${command.command}`
                };
            }

            // Write result
            fs.writeFileSync(CLI_RESULT_FILE, JSON.stringify(result, null, 2));
            console.log(`✅ Result written: ${result.message || result.error}`);

            // Delete command file
            fs.unlinkSync(CLI_COMMAND_FILE);

        } catch (error) {
            console.error('❌ Error processing command:', error.message);

            // Write error result
            const errorResult = {
                success: false,
                message: '',
                error: error.message
            };
            fs.writeFileSync(CLI_RESULT_FILE, JSON.stringify(errorResult, null, 2));

            // Try to delete command file
            try {
                fs.unlinkSync(CLI_COMMAND_FILE);
            } catch (e) {
                // Ignore
            }
        }
    }
}, 100);

// Keep the script running
process.on('SIGINT', () => {
    console.log('\n\n👋 Stopping test mode');
    process.exit(0);
});
