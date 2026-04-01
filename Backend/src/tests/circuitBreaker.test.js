import test from 'node:test';
import assert from 'node:assert/strict';

import {
    executeWithCircuitBreaker,
    executeWithRetry,
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

test('retry wrapper retries transient failures then succeeds', async () => {
    let attempts = 0;

    const result = await executeWithRetry(async () => {
        attempts += 1;
        if (attempts < 3) {
            const error = new Error('temporary network issue');
            error.code = 'ECONNRESET';
            throw error;
        }
        return 'ok-after-retry';
    }, {
        maxAttempts: 3,
        baseDelayMs: 1,
    });

    assert.equal(result, 'ok-after-retry');
    assert.equal(attempts, 3);
});

test('retry wrapper does not retry when circuit is open', async () => {
    let attempts = 0;

    await assert.rejects(() => executeWithRetry(async () => {
        attempts += 1;
        const error = new Error('Circuit is OPEN for test');
        error.code = 'CIRCUIT_OPEN';
        throw error;
    }, {
        maxAttempts: 4,
        baseDelayMs: 1,
    }), /Circuit is OPEN/);

    assert.equal(attempts, 1);
});
