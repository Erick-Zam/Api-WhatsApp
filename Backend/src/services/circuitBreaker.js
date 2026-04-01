const states = new Map();

const FAILURE_THRESHOLD = Number.parseInt(process.env.CIRCUIT_BREAKER_FAILURE_THRESHOLD || '3', 10);
const OPEN_TIMEOUT_MS = Number.parseInt(process.env.CIRCUIT_BREAKER_OPEN_TIMEOUT_MS || '10000', 10);

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
