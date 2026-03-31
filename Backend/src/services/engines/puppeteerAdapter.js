import { EngineAdapter } from './engineAdapter.js';

export class PuppeteerAdapter extends EngineAdapter {
    constructor() {
        super('puppeteer');
    }

    async connect() {
        throw new Error('Puppeteer adapter is not implemented yet');
    }

    async disconnect() {
        throw new Error('Puppeteer adapter is not implemented yet');
    }

    async sendText() {
        throw new Error('Puppeteer adapter is not implemented yet');
    }

    async health(sessionId) {
        return {
            engineType: 'puppeteer',
            sessionId,
            status: 'UNAVAILABLE',
            healthy: false,
            timestamp: new Date().toISOString(),
            message: 'Puppeteer adapter pending implementation',
        };
    }
}
