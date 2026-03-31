import test from 'node:test';
import assert from 'node:assert/strict';

import {
    REQUIRED_ADAPTER_METHODS,
    getMissingAdapterMethods,
    assertAdapterContract,
} from '../services/engines/adapterContract.js';
import { EngineAdapter } from '../services/engines/engineAdapter.js';

test('engine adapter base exposes required method names', () => {
    assert.equal(REQUIRED_ADAPTER_METHODS.length > 0, true);
    const base = new EngineAdapter('base');
    const missing = getMissingAdapterMethods(base);

    // Base class intentionally defines all methods as placeholders.
    assert.deepEqual(missing, []);
});

test('contract check reports missing methods', () => {
    const partial = {
        connect() {},
        disconnect() {},
        sendText() {},
        health() {},
    };

    const missing = getMissingAdapterMethods(partial);
    assert.equal(missing.includes('sendImage'), true);
    assert.equal(missing.includes('updatePresence'), true);
});

test('assertAdapterContract throws for invalid adapter', () => {
    assert.throws(
        () => assertAdapterContract('invalid', { connect() {} }),
        /missing methods/i
    );
});
