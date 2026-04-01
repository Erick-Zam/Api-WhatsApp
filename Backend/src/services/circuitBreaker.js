const states = new Map();

const FAILURE_THRESHOLD = Number.parseInt(process.env.CIRCUIT_BREAKER_FAILURE_THRESHOLD || '3', 10);
const OPEN_TIMEOUT_MS = Number.parseInt(process.env.CIRCUIT_BREAKER_OPEN_TIMEOUT_MS || '10000', 10);
const RETRY_MAX_ATTEMPTS = Number.parseInt(process.env.ENGINE_RETRY_MAX_ATTEMPTS || '2', 10);
const RETRY_BASE_DELAY_MS = Number.parseInt(process.env.ENGINE_RETRY_BASE_DELAY_MS || '300', 10);

const createDefaultState = () => ({
    state: 'CLOSED',
    failureCount: 0,
    openedAt: null,
    lastFailure: null,
    updatedAt: Date.now(),
});

const getState = (key) => {
    if (!states.has(key)) {
        states.set(key, createDefaultState());
    }
    return states.get(key);
};

const setState = (key, nextState) => {
    states.set(key, {
        ...nextState,
        updatedAt: Date.now(),
    });
};

const transitionToHalfOpenIfElapsed = (key, currentState) => {
    if (currentState.state !== 'OPEN') return currentState;

    const openedAt = currentState.openedAt || 0;
    if (Date.now() - openedAt < OPEN_TIMEOUT_MS) {
        return currentState;
    }

    const halfOpen = {
        ...currentState,
        state: 'HALF_OPEN',
        failureCount: 0,
        openedAt: null,
    };
    setState(key, halfOpen);
    return halfOpen;
};

export const executeWithCircuitBreaker = async (key, action, label = key) => {
    const current = transitionToHalfOpenIfElapsed(key, getState(key));

    if (current.state === 'OPEN') {
        const error = new Error(`Circuit is OPEN for ${label}`);
        error.code = 'CIRCUIT_OPEN';
        throw error;
    }

    try {
        const result = await action();

        setState(key, {
            ...current,
            state: 'CLOSED',
            failureCount: 0,
            openedAt: null,
            lastFailure: null,
        });

        return result;
    } catch (error) {
        const nextFailureCount = (current.failureCount || 0) + 1;
        const shouldOpen = nextFailureCount >= FAILURE_THRESHOLD;

        setState(key, {
            ...current,
            state: shouldOpen ? 'OPEN' : current.state,
            failureCount: nextFailureCount,
            openedAt: shouldOpen ? Date.now() : current.openedAt,
            lastFailure: error?.message || 'unknown_error',
        });

        throw error;
    }
};

export const getCircuitState = (key) => {
    const state = transitionToHalfOpenIfElapsed(key, getState(key));
    return {
        state: state.state,
        failureCount: state.failureCount,
        openedAt: state.openedAt,
        lastFailure: state.lastFailure,
        updatedAt: state.updatedAt,
    };
};

export const resetCircuit = (key) => {
    states.delete(key);
};

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const defaultShouldRetry = (error) => {
    const code = String(error?.code || '').toUpperCase();
    if (code === 'CIRCUIT_OPEN') return false;

    const message = String(error?.message || '').toLowerCase();
    return (
        message.includes('timeout') ||
        message.includes('temporar') ||
        message.includes('network') ||
        message.includes('connection') ||
        message.includes('econnreset') ||
        message.includes('etimedout')
    );
};

export const executeWithRetry = async (
    action,
    {
        maxAttempts = RETRY_MAX_ATTEMPTS,
        baseDelayMs = RETRY_BASE_DELAY_MS,
        shouldRetry = defaultShouldRetry,
    } = {}
) => {
    let lastError = null;

    for (let attempt = 1; attempt <= Math.max(1, maxAttempts); attempt += 1) {
        try {
            return await action(attempt);
        } catch (error) {
            lastError = error;

            const retryAllowed = attempt < maxAttempts && shouldRetry(error, attempt);
            if (!retryAllowed) {
                throw error;
            }

            const delay = baseDelayMs * (2 ** (attempt - 1));
            await wait(delay);
        }
    }

    throw lastError || new Error('Retry execution failed without specific error');
};
