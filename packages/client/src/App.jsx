import { useState, useEffect, useCallback } from 'react';
import { SocketProvider, useSocket } from './context/SocketContext';
import { useServerTime } from './hooks/useServerTime';
import AuctionDashboard from './components/AuctionDashboard';
import Header from './components/Header';

function AppContent() {
    const { socket, isConnected } = useSocket();
    const { timeOffset, syncTime } = useServerTime();
    const [resetKey, setResetKey] = useState(0);
    const [userId] = useState(() => {
        // generate a random user id or grab from localStorage
        const stored = localStorage.getItem('bidding_user_id');
        if (stored) return stored;

        const newId = 'user_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('bidding_user_id', newId);
        return newId;
    });

    useEffect(() => {
        if (socket && isConnected) {
            syncTime();
        }
    }, [socket, isConnected, syncTime]);

    // Handle reset - increment key to force AuctionDashboard to remount
    const handleReset = useCallback(() => {
        setResetKey(prev => prev + 1);
    }, []);

    return (
        <div className="app">
            <Header isConnected={isConnected} userId={userId} onReset={handleReset} />
            <main className="main-content">
                <AuctionDashboard key={resetKey} userId={userId} timeOffset={timeOffset} />
            </main>
        </div>
    );
}

function App() {
    return (
        <SocketProvider>
            <AppContent />
        </SocketProvider>
    );
}

export default App;

