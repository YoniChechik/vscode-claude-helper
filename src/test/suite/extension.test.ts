import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Extension Test Suite', () => {
    vscode.window.showInformationMessage('Start all tests.');

    test('Extension should be present', () => {
        const extension = vscode.extensions.getExtension('YoniChechik.git-changes-view');
        assert.ok(extension, 'Extension should be available');
    });

    test('Extension should activate', async () => {
        const extension = vscode.extensions.getExtension('YoniChechik.git-changes-view');
        if (extension) {
            await extension.activate();
            assert.strictEqual(extension.isActive, true, 'Extension should be active');
        }
    });

    test('Commands should be registered', async () => {
        const commands = await vscode.commands.getCommands(true);

        assert.ok(
            commands.includes('git-changes.showLogs'),
            'showLogs command should be registered'
        );
        assert.ok(
            commands.includes('git-changes.refresh'),
            'refresh command should be registered'
        );
        assert.ok(
            commands.includes('git-changes.openDiff'),
            'openDiff command should be registered'
        );
    });
});
