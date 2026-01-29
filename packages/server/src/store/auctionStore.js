/*
 * Auction data store with mutex for race condition handling
 * 
 * This is the heart of the concurrency control - we use a mutex per item
 * so two simultaneous bids on the same item get serialized properly
 */

import { Mutex } from 'async-mutex';
import { v4 as uuidv4 } from 'uuid';

// mutex locks per item - created on demand
const itemLocks = new Map();

// helper to get or create a lock for an item
function getLockForItem(itemId) {
    if (!itemLocks.has(itemId)) {
        itemLocks.set(itemId, new Mutex());
    }
    return itemLocks.get(itemId);
}

// sample auction items - in real life this would be in a database
// end times are set relative to server start
const createSampleItems = () => {
    const now = Date.now();

    return [
        {
            id: 'item-001',
            title: 'Vintage Mechanical Keyboard',
            description: 'Cherry MX Blue switches, retro design',
            imageUrl: '/images/keyboard.jpg',
            startingPrice: 50,
            currentBid: 50,
            highestBidderId: null,
            auctionEndTime: now + (5 * 60 * 1000), // 5 mins from now
            bidHistory: []
        },
        {
            id: 'item-002',
            title: 'Limited Edition Sneakers',
            description: 'Size 10, never worn, original box',
            imageUrl: '/images/sneakers.jpg',
            startingPrice: 120,
            currentBid: 120,
            highestBidderId: null,
            auctionEndTime: now + (8 * 60 * 1000), // 8 mins
            bidHistory: []
        },
        {
            id: 'item-003',
            title: 'Signed Guitar Pick Collection',
            description: 'From various rock legends',
            imageUrl: '/images/guitar-picks.jpg',
            startingPrice: 200,
            currentBid: 200,
            highestBidderId: null,
            auctionEndTime: now + (3 * 60 * 1000), // 3 mins - ends soon!
            bidHistory: []
        },
        {
            id: 'item-004',
            title: 'Rare Pokemon Card - Charizard',
            description: 'First edition, mint condition',
            imageUrl: '/images/pokemon.jpg',
            startingPrice: 500,
            currentBid: 500,
            highestBidderId: null,
            auctionEndTime: now + (10 * 60 * 1000), // 10 mins
            bidHistory: []
        },
        {
            id: 'item-005',
            title: 'Antique Pocket Watch',
            description: '1920s Swiss movement, gold plated',
            imageUrl: '/images/watch.jpg',
            startingPrice: 300,
            currentBid: 300,
            highestBidderId: null,
            auctionEndTime: now + (6 * 60 * 1000), // 6 mins
            bidHistory: []
        },
        {
            id: 'item-006',
            title: 'Gaming Console Bundle',
            description: 'Latest gen with 5 games included',
            imageUrl: '/images/console.jpg',
            startingPrice: 400,
            currentBid: 400,
            highestBidderId: null,
            auctionEndTime: now + (4 * 60 * 1000), // 4 mins
            bidHistory: []
        }
    ];
};

// the actual store
let auctionItems = createSampleItems();

// public API

export function getAllItems() {
    // return a clean copy without internal stuff like bid history
    return auctionItems.map(item => ({
        id: item.id,
        title: item.title,
        description: item.description,
        imageUrl: item.imageUrl,
        startingPrice: item.startingPrice,
        currentBid: item.currentBid,
        highestBidderId: item.highestBidderId,
        auctionEndTime: item.auctionEndTime
    }));
}

export function getItemById(itemId) {
    return auctionItems.find(item => item.id === itemId);
}

/*
 * Place a bid - this is where the magic happens
 * 
 * Uses mutex to ensure atomic read-check-write
 * Returns { success, message, item } or { success: false, error }
 */
export async function placeBid(itemId, bidderId, bidAmount) {
    const lock = getLockForItem(itemId);

    // acquire the lock - only one bid at a time per item
    const release = await lock.acquire();

    try {
        const item = auctionItems.find(i => i.id === itemId);

        if (!item) {
            return {
                success: false,
                error: 'ITEM_NOT_FOUND',
                message: 'This item does not exist'
            };
        }

        // check if auction has ended
        const serverTime = Date.now();
        if (serverTime >= item.auctionEndTime) {
            return {
                success: false,
                error: 'AUCTION_ENDED',
                message: 'Sorry, this auction has already ended'
            };
        }

        // validate bid amount
        if (bidAmount <= item.currentBid) {
            return {
                success: false,
                error: 'BID_TOO_LOW',
                message: `Bid must be higher than current: $${item.currentBid}`,
                currentBid: item.currentBid
            };
        }

        // all good - update the item
        const previousBidderId = item.highestBidderId;

        item.currentBid = bidAmount;
        item.highestBidderId = bidderId;
        item.bidHistory.push({
            id: uuidv4(),
            bidderId,
            amount: bidAmount,
            timestamp: serverTime
        });

        return {
            success: true,
            message: 'Bid placed successfully!',
            item: {
                id: item.id,
                title: item.title,
                currentBid: item.currentBid,
                highestBidderId: item.highestBidderId,
                auctionEndTime: item.auctionEndTime
            },
            previousBidderId
        };

    } finally {
        // always release the lock
        release();
    }
}

// for testing - reset items
export function resetItems() {
    auctionItems = createSampleItems();
    itemLocks.clear();
}
