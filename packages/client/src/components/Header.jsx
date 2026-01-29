function Header({ isConnected, userId }) {
    return (
        <header className="header">
            <div className="header-content">
                <div className="logo">
                    <span className="logo-icon">⚡</span>
                    <span className="logo-text">LiveBid</span>
                </div>

                <div className="header-info">
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
