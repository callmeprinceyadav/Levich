import { useState, useCallback } from 'react';
import { useSocket } from '../context/SocketContext';

/*
 * Hook to sync local time with server
 * Returns the offset so components can calculate accurate countdowns
 */
export function useServerTime() {
    const { socket } = useSocket();
    const [timeOffset, setTimeOffset] = useState(0);

    const syncTime = useCallback(() => {
        if (!socket) return;

        const clientTime = Date.now();

        socket.emit('GET_SERVER_TIME', (response) => {
            if (response && response.serverTime) {
                const roundTripTime = Date.now() - clientTime;
                // estimate: server time when we sent + half the round trip
                const estimatedServerTime = response.serverTime + (roundTripTime / 2);
                const offset = estimatedServerTime - Date.now();

                setTimeOffset(offset);
                console.log(`Time sync: offset is ${offset}ms`);
            }
        });
    }, [socket]);

    // get current server time (local time adjusted by offset)
    const getServerTime = useCallback(() => {
        return Date.now() + timeOffset;
    }, [timeOffset]);

    return { timeOffset, syncTime, getServerTime };
}
