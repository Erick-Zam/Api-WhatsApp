import test from 'node:test';
import assert from 'node:assert/strict';

import { getMissingAdapterMethods } from '../services/engines/adapterContract.js';
import { PuppeteerAdapter } from '../services/engines/puppeteerAdapter.js';

test('puppeteer adapter satisfies contract surface', () => {
    const adapter = new PuppeteerAdapter();
    const missing = getMissingAdapterMethods(adapter);
    assert.deepEqual(missing, []);
});

test('puppeteer adapter health reports fallback runtime mode', async () => {
    const adapter = new PuppeteerAdapter();
    const health = await adapter.health('session-demo');

    assert.equal(health.engineType, 'puppeteer');
    assert.equal(health.healthy, false);
    assert.equal(health.status, 'DISCONNECTED');
    assert.equal(health.mode, 'in-memory-mvp');
    assert.match(health.message, /in-memory mode/i);
});

test('puppeteer adapter connect enables sendText/sendImage flow', async () => {
    const adapter = new PuppeteerAdapter();

    await adapter.connect('session-demo');

    const textResult = await adapter.sendText('session-demo', '1000@s.whatsapp.net', 'hello');
    const imageResult = await adapter.sendImage('session-demo', '1000@s.whatsapp.net', 'https://example.com/a.jpg', 'caption');
    const health = await adapter.health('session-demo');

    assert.equal(textResult.engineType, 'puppeteer');
    assert.equal(imageResult.engineType, 'puppeteer');
    assert.equal(health.status, 'CONNECTED');
    assert.equal(health.healthy, true);
});

test('puppeteer adapter sendText requires connected session', async () => {
    const adapter = new PuppeteerAdapter();

    await assert.rejects(
        () => adapter.sendText('not-connected', '1000@s.whatsapp.net', 'hello'),
        /not connected/i
    );
});
