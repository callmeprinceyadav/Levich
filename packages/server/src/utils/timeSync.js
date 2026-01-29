/*
 * Time synchronization utilities
 * 
 * Pretty simple for now - just returns server timestamp
 * Could be extended to use NTP or other time sources
 */

export function getServerTime() {
    return Date.now();
}

// format time for logging
export function formatTime(timestamp) {
    return new Date(timestamp).toISOString();
}
