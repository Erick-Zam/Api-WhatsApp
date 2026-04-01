import test from 'node:test';
import assert from 'node:assert/strict';

import {
    getWTsocketListenerCount,
    normalizeWTsocketOperationEvent,
    publishWTsocketEvent,
    subscribeWTsocketEvent,
} from '../services/wtsocketBus.js';

test('wtsocket bus publishes to global event listeners', async () => {
    const received = [];
    const unsubscribe = subscribeWTsocketEvent('event', (event) => received.push(event));

    const emitted = publishWTsocketEvent('session.health', { sessionId: 's1' });

    await new Promise((resolve) => setImmediate(resolve));
    unsubscribe();

    assert.equal(received.length, 1);
    assert.equal(received[0].type, 'session.health');
    assert.equal(received[0].payload.sessionId, 's1');
    assert.equal(typeof emitted.occurredAt, 'string');
});

test('wtsocket bus supports scoped event subscriptions', async () => {
    let count = 0;
    const unsubscribe = subscribeWTsocketEvent('message.sent', () => {
        count += 1;
    });

    publishWTsocketEvent('message.sent', { id: 1 });
    publishWTsocketEvent('message.failed', { id: 2 });

    await new Promise((resolve) => setImmediate(resolve));
    unsubscribe();

    assert.equal(count, 1);
});

test('normalizeWTsocketOperationEvent builds stable payload shape', () => {
    const event = normalizeWTsocketOperationEvent({
        sessionId: 's1',
        engineType: 'baileys',
        action: 'sendText',
        success: true,
        latencyMs: 45,
    });

    assert.deepEqual(event, {
        sessionId: 's1',
        userId: null,
        engineType: 'baileys',
        action: 'sendText',
        success: true,
        latencyMs: 45,
        error: null,
    });
});

test('listener count reflects subscribe/unsubscribe', () => {
    const before = getWTsocketListenerCount('event');
    const unsubscribe = subscribeWTsocketEvent('event', () => {});
    const during = getWTsocketListenerCount('event');
    unsubscribe();
    const after = getWTsocketListenerCount('event');

    assert.equal(during, before + 1);
    assert.equal(after, before);
});
