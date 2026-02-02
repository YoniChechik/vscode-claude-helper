import * as assert from 'assert';
import * as vscode from 'vscode';
import * as sinon from 'sinon';
import { GitChangesTreeProvider, GitChangeItem } from '../../gitChangesTreeProvider';

suite('GitChangesTreeProvider Test Suite', () => {
    let sandbox: sinon.SinonSandbox;
    let mockLogger: { log: sinon.SinonStub };

    setup(() => {
        sandbox = sinon.createSandbox();
        mockLogger = {
            log: sandbox.stub()
        };
    });

    teardown(() => {
        sandbox.restore();
    });

    suite('GitChangeItem', () => {
        test('should create a file item with correct properties', () => {
            const uri = vscode.Uri.file('/workspace/src/test.ts');
            const item = new GitChangeItem(
                'test.ts',
                vscode.TreeItemCollapsibleState.None,
                uri,
                'modified',
                undefined,
                false
            );

            assert.strictEqual(item.label, 'test.ts');
            assert.strictEqual(item.collapsibleState, vscode.TreeItemCollapsibleState.None);
            assert.strictEqual(item.resourceUri?.fsPath, uri.fsPath);
            assert.strictEqual(item.status, 'modified');
            assert.strictEqual(item.isDirectory, false);
            assert.strictEqual(item.contextValue, 'gitChangeFile');
            assert.ok(item.command);
            assert.strictEqual(item.command?.command, 'git-changes.openDiff');
        });

        test('should create a directory item with correct properties', () => {
            const uri = vscode.Uri.file('/workspace/src');
            const item = new GitChangeItem(
                'src',
                vscode.TreeItemCollapsibleState.Expanded,
                uri,
                undefined,
                undefined,
                true
            );

            assert.strictEqual(item.label, 'src');
            assert.strictEqual(item.collapsibleState, vscode.TreeItemCollapsibleState.Expanded);
            assert.strictEqual(item.isDirectory, true);
            assert.strictEqual(item.contextValue, 'gitChangeDirectory');
            assert.strictEqual(item.command, undefined);
        });

        test('should create added file with correct status', () => {
            const uri = vscode.Uri.file('/workspace/new-file.ts');
            const item = new GitChangeItem(
                'new-file.ts',
                vscode.TreeItemCollapsibleState.None,
                uri,
                'added',
                undefined,
                false
            );

            assert.strictEqual(item.status, 'added');
        });

        test('should create deleted file with correct status', () => {
            const uri = vscode.Uri.file('/workspace/deleted-file.ts');
            const item = new GitChangeItem(
                'deleted-file.ts',
                vscode.TreeItemCollapsibleState.None,
                uri,
                'deleted',
                undefined,
                false
            );

            assert.strictEqual(item.status, 'deleted');
        });

        test('should create renamed file with oldPath', () => {
            const uri = vscode.Uri.file('/workspace/new-name.ts');
            const item = new GitChangeItem(
                'new-name.ts',
                vscode.TreeItemCollapsibleState.None,
                uri,
                'renamed',
                'old-name.ts',
                false
            );

            assert.strictEqual(item.status, 'renamed');
            assert.strictEqual(item.oldPath, 'old-name.ts');
        });
    });

    suite('GitChangesTreeProvider', () => {
        test('should create provider with workspace root', () => {
            const provider = new GitChangesTreeProvider('/workspace', mockLogger as any);
            assert.ok(provider);
        });

        test('should return TreeItem from getTreeItem', () => {
            const provider = new GitChangesTreeProvider('/workspace', mockLogger as any);
            const uri = vscode.Uri.file('/workspace/test.ts');
            const item = new GitChangeItem(
                'test.ts',
                vscode.TreeItemCollapsibleState.None,
                uri,
                'modified',
                undefined,
                false
            );

            const result = provider.getTreeItem(item);
            assert.strictEqual(result, item);
        });

        test('should have onDidChangeTreeData event', () => {
            const provider = new GitChangesTreeProvider('/workspace', mockLogger as any);
            assert.ok(provider.onDidChangeTreeData);
        });

        test('should fire event on refresh', () => {
            const provider = new GitChangesTreeProvider('/workspace', mockLogger as any);
            let eventFired = false;

            provider.onDidChangeTreeData(() => {
                eventFired = true;
            });

            provider.refresh();
            assert.strictEqual(eventFired, true);
        });
    });
});
