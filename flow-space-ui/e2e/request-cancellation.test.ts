import assert from 'node:assert/strict';
import { getEventListeners } from 'node:events';
import test from 'node:test';
import { isCancel } from 'axios';
import { createRequestDeadline, waitForRequest } from '../src/contexts/app-data/request-cancellation.ts';

test('a deadline aborts stalled work and rejects its waiter', async context => {
    context.mock.timers.enable({ apis: ['setTimeout'] });
    const deadline = createRequestDeadline(10_000);
    const waiting = waitForRequest(new Promise(() => {}), deadline.signal);
    const rejected = assert.rejects(waiting, isCancel);
    context.mock.timers.tick(9_999);
    assert.equal(deadline.signal.aborted, false);
    context.mock.timers.tick(1);
    await rejected;
    assert.equal(deadline.signal.aborted, true);
    assert.equal(getEventListeners(deadline.signal, 'abort').length, 0);
    deadline.dispose();
});

test('parent cleanup cancels the child request and releases listeners', async () => {
    const parent = new AbortController();
    const deadline = createRequestDeadline(10_000, parent.signal);
    const waiting = waitForRequest(new Promise(() => {}), deadline.signal);
    const rejected = assert.rejects(waiting, isCancel);
    parent.abort();
    await rejected;
    deadline.dispose();
    assert.equal(deadline.signal.aborted, true);
    assert.equal(getEventListeners(parent.signal, 'abort').length, 0);
});

test('completed work disposes the deadline and its cancellation listener', async context => {
    context.mock.timers.enable({ apis: ['setTimeout'] });
    const parent = new AbortController();
    const deadline = createRequestDeadline(10_000, parent.signal);
    assert.equal(await waitForRequest(Promise.resolve('alarms'), deadline.signal), 'alarms');
    assert.equal(getEventListeners(deadline.signal, 'abort').length, 0);
    deadline.dispose();
    context.mock.timers.tick(20_000);
    parent.abort();
    assert.equal(deadline.signal.aborted, false);
});

test('one cancelled waiter leaves shared authentication available to another', async () => {
    let complete!: (value: string) => void;
    const shared = new Promise<string>(resolve => { complete = resolve; });
    const caller = new AbortController();
    const first = waitForRequest(shared, caller.signal);
    const second = waitForRequest(shared);
    const rejected = assert.rejects(first, isCancel);
    caller.abort();
    await rejected;
    complete('refreshed');
    assert.equal(await second, 'refreshed');
});

test('an already cancelled waiter handles a late shared rejection', async () => {
    const caller = new AbortController();
    caller.abort();
    let fail!: (reason: Error) => void;
    const shared = new Promise<string>((_, reject) => { fail = reject; });
    await assert.rejects(waitForRequest(shared, caller.signal), isCancel);
    fail(new Error('refresh unavailable'));
    await new Promise(resolve => { setImmediate(resolve); });
    assert.equal(getEventListeners(caller.signal, 'abort').length, 0);
});
