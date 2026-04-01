import { EventEmitter } from 'events';

const wtBus = new EventEmitter();
wtBus.setMaxListeners(100);

const buildEvent = (type, payload = {}) => ({
    type,
    payload,
    occurredAt: new Date().toISOString(),
});

export const publishWTsocketEvent = (type, payload = {}) => {
    const event = buildEvent(type, payload);
    wtBus.emit('event', event);
    wtBus.emit(type, event);
    return event;
};

export const subscribeWTsocketEvent = (type, handler) => {
    const eventType = type || 'event';
    wtBus.on(eventType, handler);
    return () => wtBus.off(eventType, handler);
};

export const getWTsocketListenerCount = (type = 'event') => wtBus.listenerCount(type);

export const normalizeWTsocketOperationEvent = ({
    sessionId,
    engineType,
    action,
    success,
    latencyMs,
    userId = null,
    error = null,
}) => ({
    sessionId,
    userId,
    engineType,
    action,
    success,
    latencyMs,
    error,
});
