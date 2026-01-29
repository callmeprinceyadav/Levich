import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext(null);

// server URL - use env var in prod
const SERVER_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export function SocketProvider({ children }) {
    const [socket, setSocket] = useState(null);
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        // create socket connection
        const newSocket = io(SERVER_URL, {
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 1000
        });

        newSocket.on('connect', () => {
            console.log('Connected to server:', newSocket.id);
            setIsConnected(true);
        });

        newSocket.on('disconnect', (reason) => {
            console.log('Disconnected:', reason);
            setIsConnected(false);
        });

        newSocket.on('connect_error', (error) => {
            console.error('Connection error:', error.message);
        });

        setSocket(newSocket);

        // cleanup on unmount
        return () => {
            newSocket.close();
        };
    }, []);

    return (
        <SocketContext.Provider value={{ socket, isConnected }}>
            {children}
        </SocketContext.Provider>
    );
}

export function useSocket() {
    const context = useContext(SocketContext);
    if (!context) {
        throw new Error('useSocket must be used within SocketProvider');
    }
    return context;
}
