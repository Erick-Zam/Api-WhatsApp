import test from 'node:test';
import assert from 'node:assert/strict';

import {
    executeWithCircuitBreaker,
    getCircuitState,
    resetCircuit,
} from '../services/circuitBreaker.js';

test('circuit breaker keeps CLOSED state on success', async () => {
    const key = 'test:success';
    resetCircuit(key);

    const result = await executeWithCircuitBreaker(key, async () => 'ok');
    const state = getCircuitState(key);

    assert.equal(result, 'ok');
    assert.equal(state.state, 'CLOSED');
    assert.equal(state.failureCount, 0);
});

test('circuit breaker opens after threshold failures and blocks calls', async () => {
    const key = 'test:open';
    resetCircuit(key);

    const failingAction = async () => {
        throw new Error('boom');
    };

    await assert.rejects(() => executeWithCircuitBreaker(key, failingAction), /boom/);
    await assert.rejects(() => executeWithCircuitBreaker(key, failingAction), /boom/);
    await assert.rejects(() => executeWithCircuitBreaker(key, failingAction), /boom/);

    const openState = getCircuitState(key);
    assert.equal(openState.state, 'OPEN');

    let called = false;
    await assert.rejects(
        () => executeWithCircuitBreaker(key, async () => {
            called = true;
            return 'should-not-run';
        }),
        /Circuit is OPEN/
    );
    assert.equal(called, false);
});
