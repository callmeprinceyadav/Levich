/*
 * Socket.io event handlers for bidding
 */

import { placeBid, getAllItems } from '../store/auctionStore.js';
import { getServerTime } from '../utils/timeSync.js';

export function setupBidHandlers(io) {
    io.on('connection', (socket) => {

        // client requests current items
        socket.on('GET_ITEMS', (callback) => {
            const items = getAllItems();
            if (typeof callback === 'function') {
                callback({
                    success: true,
                    serverTime: getServerTime(),
                    items
                });
            }
        });

        // client requests server time (for sync)
        socket.on('GET_SERVER_TIME', (callback) => {
            if (typeof callback === 'function') {
                callback({ serverTime: getServerTime() });
            }
        });

        // the main event - placing a bid
        socket.on('BID_PLACED', async (data, callback) => {
            const { itemId, bidAmount, bidderId } = data;

            // basic validation
            if (!itemId || !bidAmount || !bidderId) {
                if (typeof callback === 'function') {
                    callback({
                        success: false,
                        error: 'INVALID_DATA',
                        message: 'Missing required fields'
                    });
                }
                return;
            }

            console.log(`Bid attempt: ${bidderId} -> $${bidAmount} on ${itemId}`);

            // try to place the bid (mutex handles concurrency)
            const result = await placeBid(itemId, bidderId, bidAmount);

            if (result.success) {
                // tell the bidder they succeeded
                if (typeof callback === 'function') {
                    callback({
                        success: true,
                        message: result.message,
                        item: result.item
                    });
                }

                // broadcast to everyone (including sender) so UI updates
                io.emit('UPDATE_BID', {
                    itemId: result.item.id,
                    currentBid: result.item.currentBid,
                    highestBidderId: result.item.highestBidderId,
                    previousBidderId: result.previousBidderId,
                    serverTime: getServerTime()
                });

                // if someone got outbid, send them a specific event
                if (result.previousBidderId && result.previousBidderId !== bidderId) {
                    io.emit('OUTBID', {
                        itemId: result.item.id,
                        outbidUserId: result.previousBidderId,
                        newBid: result.item.currentBid,
                        newBidderId: result.item.highestBidderId
                    });
                }

                console.log(`Bid accepted: ${bidderId} now winning ${itemId} at $${result.item.currentBid}`);

            } else {
                // bid failed - let them know why
                if (typeof callback === 'function') {
                    callback({
                        success: false,
                        error: result.error,
                        message: result.message,
                        currentBid: result.currentBid
                    });
                }

                console.log(`Bid rejected: ${result.error} - ${result.message}`);
            }
        });

        // periodic time sync broadcasts (every 30 sec)
        const syncInterval = setInterval(() => {
            socket.emit('SERVER_TIME', { serverTime: getServerTime() });
        }, 30000);

        socket.on('disconnect', () => {
            clearInterval(syncInterval);
        });
    });
}
