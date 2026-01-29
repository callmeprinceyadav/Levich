import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useSocket } from '../context/SocketContext';
import CountdownTimer from './CountdownTimer';

function AuctionCard({ item, userId, timeOffset, onPlaceBid }) {
    const { socket } = useSocket();
    const [currentBid, setCurrentBid] = useState(item.currentBid);
    const [highestBidderId, setHighestBidderId] = useState(item.highestBidderId);
    const [bidding, setBidding] = useState(false);
    const [priceFlash, setPriceFlash] = useState(null); // 'up' or 'outbid'
    const [error, setError] = useState(null);
    const [auctionEnded, setAuctionEnded] = useState(false);

    const isWinning = highestBidderId === userId;
    const wasWinning = item.highestBidderId === userId && !isWinning;

    // listen for live updates on this item
    useEffect(() => {
        if (!socket) return;

        const handleUpdate = (data) => {
            if (data.itemId !== item.id) return;

            const wasLeading = highestBidderId === userId;

            setCurrentBid(data.currentBid);
            setHighestBidderId(data.highestBidderId);

            // flash effect
            if (data.highestBidderId === userId) {
                setPriceFlash('up');
            } else if (wasLeading) {
                setPriceFlash('outbid');
            } else {
                setPriceFlash('up');
            }

            // clear flash after animation
            setTimeout(() => setPriceFlash(null), 600);
        };

        const handleOutbid = (data) => {
            if (data.itemId === item.id && data.outbidUserId === userId) {
                setPriceFlash('outbid');
                setTimeout(() => setPriceFlash(null), 600);
            }
        };

        socket.on('UPDATE_BID', handleUpdate);
        socket.on('OUTBID', handleOutbid);

        return () => {
            socket.off('UPDATE_BID', handleUpdate);
            socket.off('OUTBID', handleOutbid);
        };
    }, [socket, item.id, userId, highestBidderId]);

    const handleBidClick = useCallback(async () => {
        if (bidding || auctionEnded) return;

        setBidding(true);
        setError(null);

        try {
            await onPlaceBid(item.id, currentBid);
            // success handled by socket update
        } catch (err) {
            setError(err.message);
            setTimeout(() => setError(null), 3000);
        } finally {
            setBidding(false);
        }
    }, [item.id, currentBid, bidding, auctionEnded, onPlaceBid]);

    const handleAuctionEnd = useCallback(() => {
        setAuctionEnded(true);
    }, []);

    // determine card state
    let statusBadge = null;
    if (auctionEnded) {
        statusBadge = isWinning ? (
            <span className="badge badge-won">🏆 You Won!</span>
        ) : (
            <span className="badge badge-ended">Auction Ended</span>
        );
    } else if (isWinning) {
        statusBadge = <span className="badge badge-winning">✓ Winning</span>;
    }

    return (
        <motion.div
            className={`auction-card ${auctionEnded ? 'ended' : ''} ${isWinning ? 'winning' : ''}`}
            whileHover={!auctionEnded ? { scale: 1.02 } : {}}
        >
            <div className="card-image">
                <div className="image-placeholder">
                    {/* would use real images in prod */}
                    <span className="emoji-icon">
                        {item.title.includes('Keyboard') && '⌨️'}
                        {item.title.includes('Sneaker') && '👟'}
                        {item.title.includes('Guitar') && '🎸'}
                        {item.title.includes('Pokemon') && '🎴'}
                        {item.title.includes('Watch') && '⌚'}
                        {item.title.includes('Gaming') && '🎮'}
                    </span>
                </div>
                {statusBadge}
            </div>

            <div className="card-content">
                <h3 className="item-title">{item.title}</h3>
                <p className="item-description">{item.description}</p>

                <div className="bid-info">
                    <div className="price-section">
                        <span className="price-label">Current Bid</span>
                        <motion.span
                            className={`price-value ${priceFlash === 'up' ? 'flash-green' : ''} ${priceFlash === 'outbid' ? 'flash-red' : ''}`}
                            key={currentBid}
                            initial={{ scale: 1 }}
                            animate={priceFlash ? { scale: [1, 1.1, 1] } : { scale: 1 }}
                            transition={{ duration: 0.3 }}
                        >
                            ${currentBid.toLocaleString()}
                        </motion.span>
                    </div>

                    <CountdownTimer
                        endTime={item.auctionEndTime}
                        timeOffset={timeOffset}
                        onEnd={handleAuctionEnd}
                    />
                </div>

                {error && (
                    <motion.div
                        className="error-toast"
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        {error}
                    </motion.div>
                )}

                <button
                    className={`bid-button ${bidding ? 'loading' : ''} ${auctionEnded ? 'disabled' : ''}`}
                    onClick={handleBidClick}
                    disabled={bidding || auctionEnded}
                >
                    {bidding ? (
                        <span className="button-loading">Placing bid...</span>
                    ) : auctionEnded ? (
                        'Auction Ended'
                    ) : (
                        `Bid +$10 → $${(currentBid + 10).toLocaleString()}`
                    )}
                </button>
            </div>
        </motion.div>
    );
}

export default AuctionCard;
