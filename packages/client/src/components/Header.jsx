import { useState } from 'react';

function Header({ isConnected, userId, onReset }) {
    const [resetting, setResetting] = useState(false);

    const handleReset = async () => {
        if (resetting) return;

        setResetting(true);
        try {
            const API_URL = import.meta.env.VITE_API_URL || '';
            const response = await fetch(`${API_URL}/api/reset`, {
                method: 'POST'
            });
            const data = await response.json();

            if (data.success) {
                // Trigger parent to refetch items
                onReset?.();
            }
        } catch (err) {
            console.error('Reset failed:', err);
        } finally {
            setResetting(false);
        }
    };

    return (
        <header className="header">
            <div className="header-content">
                <div className="logo">
                    <span className="logo-icon">⚡</span>
                    <span className="logo-text">LiveBid</span>
                </div>

                <div className="header-info">
                    <button
                        className={`reset-button ${resetting ? 'loading' : ''}`}
                        onClick={handleReset}
                        disabled={resetting}
                    >
                        {resetting ? '🔄 Resetting...' : '🔄 Reset Auctions'}
                    </button>

                    <div className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
                        <span className="status-dot"></span>
                        <span className="status-text">{isConnected ? 'Live' : 'Connecting...'}</span>
                    </div>

                    <div className="user-info">
                        <span className="user-label">Your ID:</span>
                        <code className="user-id">{userId.slice(-6)}</code>
                    </div>
                </div>
            </div>
        </header>
    );
}

export default Header;

