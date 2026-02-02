import * as assert from 'assert';
import * as sinon from 'sinon';
import { GitWatcher } from '../../gitWatcher';

suite('GitWatcher Test Suite', () => {
    let sandbox: sinon.SinonSandbox;

    setup(() => {
        sandbox = sinon.createSandbox();
    });

    teardown(() => {
        sandbox.restore();
    });

    suite('GitWatcher', () => {
        test('should create watcher with workspace root and callback', () => {
            const callback = sandbox.stub();
            const watcher = new GitWatcher('/workspace', callback);
            assert.ok(watcher);
            watcher.dispose();
        });

        test('should start watching without errors', () => {
            const callback = sandbox.stub();
            const watcher = new GitWatcher('/workspace', callback);

            assert.doesNotThrow(() => {
                watcher.start();
            });

            watcher.dispose();
        });

        test('should be disposable', () => {
            const callback = sandbox.stub();
            const watcher = new GitWatcher('/workspace', callback);
            watcher.start();

            assert.doesNotThrow(() => {
                watcher.dispose();
            });
        });

        test('should debounce refresh calls', async () => {
            const callback = sandbox.stub();
            const watcher = new GitWatcher('/workspace', callback);

            const clock = sandbox.useFakeTimers();

            watcher.start();

            const debouncedRefresh = (watcher as any)._debouncedRefresh.bind(watcher);
            debouncedRefresh();
            debouncedRefresh();
            debouncedRefresh();

            await clock.tickAsync(100);
            assert.strictEqual(callback.callCount, 0);

            await clock.tickAsync(250);
            assert.strictEqual(callback.callCount, 1);

            watcher.dispose();
            clock.restore();
        });

        test('should cancel debounce timer on dispose', async () => {
            const callback = sandbox.stub();
            const watcher = new GitWatcher('/workspace', callback);

            const clock = sandbox.useFakeTimers();

            watcher.start();

            const debouncedRefresh = (watcher as any)._debouncedRefresh.bind(watcher);
            debouncedRefresh();

            watcher.dispose();

            await clock.tickAsync(500);
            assert.strictEqual(callback.callCount, 0);

            clock.restore();
        });
    });
});
