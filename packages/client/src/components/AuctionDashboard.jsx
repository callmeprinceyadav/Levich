import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSocket } from '../context/SocketContext';
import AuctionCard from './AuctionCard';

function AuctionDashboard({ userId, timeOffset }) {
    const { socket, isConnected } = useSocket();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // fetch initial items
    const fetchItems = useCallback(async () => {
        try {
            const response = await fetch('/api/items');
            const data = await response.json();

            if (data.success) {
                setItems(data.items);
            } else {
                setError('Failed to load auctions');
            }
        } catch (err) {
            console.error('Fetch error:', err);
            setError('Could not connect to server');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchItems();
    }, [fetchItems]);

    // listen for bid updates
    useEffect(() => {
        if (!socket) return;

        const handleBidUpdate = (data) => {
            setItems(prev => prev.map(item => {
                if (item.id === data.itemId) {
                    return {
                        ...item,
                        currentBid: data.currentBid,
                        highestBidderId: data.highestBidderId
                    };
                }
                return item;
            }));
        };

        socket.on('UPDATE_BID', handleBidUpdate);

        return () => {
            socket.off('UPDATE_BID', handleBidUpdate);
        };
    }, [socket]);

    // place a bid
    const handlePlaceBid = useCallback((itemId, currentBid) => {
        if (!socket || !isConnected) {
            return Promise.reject(new Error('Not connected'));
        }

        const bidAmount = currentBid + 10; // always +$10

        return new Promise((resolve, reject) => {
            socket.emit('BID_PLACED', {
                itemId,
                bidAmount,
                bidderId: userId
            }, (response) => {
                if (response.success) {
                    resolve(response);
                } else {
                    reject(new Error(response.message || 'Bid failed'));
                }
            });
        });
    }, [socket, isConnected, userId]);

    if (loading) {
        return (
            <div className="loading-container">
                <div className="loading-spinner"></div>
                <p>Loading auctions...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="error-container">
                <p className="error-message">{error}</p>
                <button onClick={fetchItems} className="retry-button">
                    Try Again
                </button>
            </div>
        );
    }

    return (
        <div className="dashboard">
            <div className="dashboard-header">
                <h1>Live Auctions</h1>
                <p className="subtitle">Bid fast - time is running out!</p>
            </div>

            <div className="auction-grid">
                <AnimatePresence>
                    {items.map((item, index) => (
                        <motion.div
                            key={item.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                        >
                            <AuctionCard
                                item={item}
                                userId={userId}
                                timeOffset={timeOffset}
                                onPlaceBid={handlePlaceBid}
                            />
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </div>
    );
}

export default AuctionDashboard;
