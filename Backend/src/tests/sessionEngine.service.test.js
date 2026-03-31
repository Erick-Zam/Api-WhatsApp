import test from 'node:test';
import assert from 'node:assert/strict';

import {
    __setSessionEngineQueryRunnerForTests,
    getAvailableEngines,
    getSessionEngineMetrics,
    setSessionEngineConfig,
} from '../services/sessionEngine.js';

const withMockedQuery = async (mockImpl, fn) => {
    __setSessionEngineQueryRunnerForTests(mockImpl);
    try {
        await fn();
    } finally {
        __setSessionEngineQueryRunnerForTests(null);
    }
};

test('getAvailableEngines always includes baileys', () => {
    const engines = getAvailableEngines();
    assert.equal(Array.isArray(engines), true);
    assert.equal(engines.some((e) => e.id === 'baileys' && e.enabled), true);
});

test('setSessionEngineConfig blocks engine switch while CONNECTED', async () => {
    await withMockedQuery(async (text) => {
        if (String(text).includes('SELECT engine_type, status')) {
            return { rows: [{ engine_type: 'puppeteer', status: 'CONNECTED' }] };
        }
        throw new Error('unexpected query in test');
    }, async () => {
        await assert.rejects(
            () => setSessionEngineConfig({
                sessionId: 's1',
                userId: 'u1',
                engineType: 'baileys',
                engineConfig: {},
            }),
            /DISCONNECTED session state/i
        );
    });
});

test('setSessionEngineConfig updates and returns new config', async () => {
    let updateCalled = false;

    await withMockedQuery(async (text) => {
        const q = String(text);
        if (q.includes('SELECT engine_type, status')) {
            return { rows: [{ engine_type: 'baileys', status: 'DISCONNECTED' }] };
        }
        if (q.includes('UPDATE whatsapp_sessions')) {
            updateCalled = true;
            return {
                rows: [{
                    session_id: 's1',
                    user_id: 'u1',
                    status: 'DISCONNECTED',
                    engine_type: 'baileys',
                    engine_config: {},
                    health_status: 'unknown',
                    last_heartbeat_at: null,
                    last_error: null,
                    updated_at: new Date().toISOString(),
                }],
            };
        }
        if (q.includes('INSERT INTO session_engine_events')) {
            return { rows: [] };
        }
        throw new Error('unexpected query in test');
    }, async () => {
        const result = await setSessionEngineConfig({
            sessionId: 's1',
            userId: 'u1',
            engineType: 'baileys',
            engineConfig: {},
        });

        assert.equal(updateCalled, true);
        assert.equal(result?.engineType, 'baileys');
    });
});

test('getSessionEngineMetrics enforces safe limit', async () => {
    await withMockedQuery(async (_text, params) => {
        // LIMIT should be clamped to 200 when called with large value
        assert.equal(params[1], 200);
        return { rows: [] };
    }, async () => {
        const metrics = await getSessionEngineMetrics('s1', 9999);
        assert.deepEqual(metrics, []);
    });
});
