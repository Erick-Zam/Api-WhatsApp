export class EngineAdapter {
    constructor(name) {
        this.name = name;
    }

    async connect() {
        throw new Error('connect() not implemented');
    }

    async disconnect() {
        throw new Error('disconnect() not implemented');
    }

    async sendText() {
        throw new Error('sendText() not implemented');
    }

    async sendImage() {
        throw new Error('sendImage() not implemented');
    }

    async sendVideo() {
        throw new Error('sendVideo() not implemented');
    }

    async sendAudio() {
        throw new Error('sendAudio() not implemented');
    }

    async sendDocument() {
        throw new Error('sendDocument() not implemented');
    }

    async sendLocation() {
        throw new Error('sendLocation() not implemented');
    }

    async sendContact() {
        throw new Error('sendContact() not implemented');
    }

    async sendPoll() {
        throw new Error('sendPoll() not implemented');
    }

    async updatePresence() {
        throw new Error('updatePresence() not implemented');
    }

    async health() {
        throw new Error('health() not implemented');
    }
}
