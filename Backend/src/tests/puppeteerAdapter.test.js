import test from 'node:test';
import assert from 'node:assert/strict';

import { getMissingAdapterMethods } from '../services/engines/adapterContract.js';
import { PuppeteerAdapter } from '../services/engines/puppeteerAdapter.js';

test('puppeteer adapter satisfies contract surface', () => {
    const adapter = new PuppeteerAdapter();
    const missing = getMissingAdapterMethods(adapter);
    assert.deepEqual(missing, []);
});

test('puppeteer adapter health is controlled-unavailable', async () => {
    const adapter = new PuppeteerAdapter();
    const health = await adapter.health('session-demo');

    assert.equal(health.engineType, 'puppeteer');
    assert.equal(health.healthy, false);
    assert.equal(health.status, 'UNAVAILABLE');
    assert.match(health.message, /pending implementation/i);
});
