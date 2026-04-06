import * as db from '../db.js';

/**
 * Session Health Monitor - Tracks session heartbeats, detects zombies, manages cleanup
 */

const HEARTBEAT_INTERVAL_MS = 30_000; // 30 seconds
const HEARTBEAT_TIMEOUT_MS = 10_000; // 10 seconds to respond
const ZOMBIE_THRESHOLD_MS = 120_000; // Mark as zombie after 2 minutes of no heartbeat
const MAX_CONSECUTIVE_FAILURES = 3;

// In-memory tracking
const sessionHeartbeats = new Map(); // sessionId -> { lastHeartbeat, consecutiveFailures, isZombie }
const heartbeatIntervals = new Map(); // sessionId -> intervalId

/**
 * Initialize heartbeat monitoring for a session
 */
export const initializeSessionHealth = (sessionId) => {
    if (!sessionHeartbeats.has(sessionId)) {
        sessionHeartbeats.set(sessionId, {
            lastHeartbeat: Date.now(),
            consecutiveFailures: 0,
            isZombie: false,
        });
        console.log(`[Health] Initialized health tracking for session '${sessionId}'`);
    }
};

/**
 * Check if socket is responsive (performs a light async operation)
 */
const checkSocketHealth = async (socket) => {
    if (!socket) return false;
    
    try {
        // Try to access socket state - if it's alive it should respond quickly
        // This is a light check without blocking
        const isAlive = socket?.ws?.socket?.readyState === 1 || socket?.authState?.creds ? true : false;
        return isAlive;
    } catch (error) {
        console.error('[Health] Socket check error:', error.message);
        return false;
    }
};

/**
 * Record a successful heartbeat
 */
export const recordHeartbeat = (sessionId) => {
    const health = sessionHeartbeats.get(sessionId);
    if (health) {
        health.lastHeartbeat = Date.now();
        health.consecutiveFailures = 0;
        health.isZombie = false;
    }
};

/**
 * Record a failed heartbeat
 */
export const recordHeartbeatFailure = (sessionId) => {
    const health = sessionHeartbeats.get(sessionId);
    if (health) {
        health.consecutiveFailures = (health.consecutiveFailures || 0) + 1;
        if (health.consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
            health.isZombie = true;
            console.warn(`[Health] Session '${sessionId}' marked as ZOMBIE (${health.consecutiveFailures} failures)`);
        }
    }
};

/**
 * Get current health status of a session
 */
export const getSessionHealth = (sessionId) => {
    const health = sessionHeartbeats.get(sessionId);
    if (!health) {
        return {
            sessionId,
            status: 'UNKNOWN',
            isZombie: false,
            lastHeartbeat: null,
            consecutiveFailures: 0,
        };
    }

    const timeSinceHeartbeat = Date.now() - health.lastHeartbeat;
    const isStale = timeSinceHeartbeat > ZOMBIE_THRESHOLD_MS;

    return {
        sessionId,
        status: health.isZombie || isStale ? 'ZOMBIE' : 'HEALTHY',
        isZombie: health.isZombie || isStale,
        lastHeartbeat: health.lastHeartbeat,
        timeSinceHeartbeatMs: timeSinceHeartbeat,
        consecutiveFailures: health.consecutiveFailures,
    };
};

/**
 * Start heartbeat monitoring for a session
 * Called when session connects
 */
export const startHeartbeatMonitoring = (sessionId, socket) => {
    if (heartbeatIntervals.has(sessionId)) {
        clearInterval(heartbeatIntervals.get(sessionId));
    }

    if (!socket) {
        console.warn(`[Health] Cannot start monitoring for '${sessionId}': socket is null`);
        return;
    }

    initializeSessionHealth(sessionId);

    const intervalId = setInterval(async () => {
        try {
            const isHealthy = await checkSocketHealth(socket);
            
            if (isHealthy) {
                recordHeartbeat(sessionId);
                updateSessionHealthDB(sessionId, 'healthy', null).catch(err => 
                    console.error(`[Health] DB update failed for ${sessionId}:`, err.message)
                );
            } else {
                recordHeartbeatFailure(sessionId);
                const health = getSessionHealth(sessionId);
                
                if (health.isZombie) {
                    console.error(`[Health] Session '${sessionId}' detected as ZOMBIE - no recovery`);
                    updateSessionHealthDB(sessionId, 'zombie', 'No heartbeat response').catch(err =>
                        console.error(`[Health] DB update failed for ${sessionId}:`, err.message)
                    );
                    stopHeartbeatMonitoring(sessionId);
                } else {
                    updateSessionHealthDB(sessionId, 'degraded', 'Heartbeat failure').catch(err =>
                        console.error(`[Health] DB update failed for ${sessionId}:`, err.message)
                    );
                }
            }
        } catch (error) {
            console.error(`[Health] Heartbeat check error for '${sessionId}':`, error.message);
            recordHeartbeatFailure(sessionId);
        }
    }, HEARTBEAT_INTERVAL_MS);

    heartbeatIntervals.set(sessionId, intervalId);
    console.log(`[Health] Started heartbeat monitoring for session '${sessionId}' (every ${HEARTBEAT_INTERVAL_MS}ms)`);
};

/**
 * Stop heartbeat monitoring for a session
 */
export const stopHeartbeatMonitoring = (sessionId) => {
    const intervalId = heartbeatIntervals.get(sessionId);
    if (intervalId) {
        clearInterval(intervalId);
        heartbeatIntervals.delete(sessionId);
        console.log(`[Health] Stopped heartbeat monitoring for session '${sessionId}'`);
    }
};

/**
 * Update session health in database
 */
const updateSessionHealthDB = async (sessionId, healthStatus, errorMessage) => {
    try {
        await db.query(
            `UPDATE whatsapp_sessions 
             SET health_status = $1, 
                 last_heartbeat_at = NOW(),
                 last_error = $2,
                 updated_at = NOW()
             WHERE session_id = $3`,
            [healthStatus, errorMessage, sessionId]
        );
    } catch (error) {
        console.error(`[Health] Failed to update DB for session '${sessionId}':`, error.message);
    }
};

/**
 * Clean zombie sessions from memory and DB
 * Called periodically to remove dead sessions
 */
export const cleanupZombieSessions = async (sessions, sessionStores, sessionStoreFlushIntervals) => {
    const zombies = [];

    for (const [sessionId] of sessionHeartbeats) {
        const health = getSessionHealth(sessionId);
        if (health.isZombie) {
            zombies.push(sessionId);
        }
    }

    if (zombies.length === 0) return;

    console.log(`[Health] Found ${zombies.length} zombie session(s): ${zombies.join(', ')}`);

    for (const sessionId of zombies) {
        try {
            // Stop monitoring
            stopHeartbeatMonitoring(sessionId);

            // Clean memory maps
            sessions.delete(sessionId);
            sessionStores.delete(sessionId);

            const intervalId = sessionStoreFlushIntervals.get(sessionId);
            if (intervalId) {
                clearInterval(intervalId);
                sessionStoreFlushIntervals.delete(sessionId);
            }

            // Update DB to mark session as disconnected
            await db.query(
                `UPDATE whatsapp_sessions 
                 SET status = 'DISCONNECTED',
                     health_status = 'zombie',
                     updated_at = NOW()
                 WHERE session_id = $1`,
                [sessionId]
            );

            console.log(`[Health] Cleaned up zombie session '${sessionId}'`);
            
            // Trigger cleanup webhook
            // This can be extended to notify about cleanup
        } catch (error) {
            console.error(`[Health] Error cleaning up zombie session '${sessionId}':`, error.message);
        }
    }
};

/**
 * Start periodic zombie cleanup (runs every 5 minutes)
 */
export const startZombieCleanupSchedule = (sessions, sessionStores, sessionStoreFlushIntervals) => {
    const cleanupInterval = setInterval(async () => {
        await cleanupZombieSessions(sessions, sessionStores, sessionStoreFlushIntervals);
    }, 5 * 60 * 1000); // Every 5 minutes

    console.log('[Health] Started zombie cleanup schedule (every 5 minutes)');
    return cleanupInterval;
};

/**
 * Get all session health statuses
 */
export const getAllSessionHealth = () => {
    const statuses = [];
    for (const [sessionId, health] of sessionHeartbeats) {
        statuses.push(getSessionHealth(sessionId));
    }
    return statuses;
};

/**
 * Cleanup all monitoring (call on process exit)
 */
export const shutdownHealthMonitoring = () => {
    for (const [sessionId] of heartbeatIntervals) {
        stopHeartbeatMonitoring(sessionId);
    }
    sessionHeartbeats.clear();
    console.log('[Health] Shutdown health monitoring for all sessions');
};
