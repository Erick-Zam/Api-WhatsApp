export const REQUIRED_ADAPTER_METHODS = [
    'connect',
    'disconnect',
    'sendText',
    'sendImage',
    'sendVideo',
    'sendAudio',
    'sendDocument',
    'sendLocation',
    'sendContact',
    'sendPoll',
    'updatePresence',
    'health',
];

export const getMissingAdapterMethods = (adapter) => {
    if (!adapter) {
        return [...REQUIRED_ADAPTER_METHODS];
    }

    return REQUIRED_ADAPTER_METHODS.filter((methodName) => typeof adapter[methodName] !== 'function');
};

export const assertAdapterContract = (name, adapter) => {
    const missing = getMissingAdapterMethods(adapter);

    if (missing.length > 0) {
        throw new Error(`Adapter '${name}' is missing methods: ${missing.join(', ')}`);
    }
};
