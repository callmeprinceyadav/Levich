/*
 * Items API routes
 */

import { Router } from 'express';
import { getAllItems, getItemById, resetItems } from '../store/auctionStore.js';
import { getServerTime } from '../utils/timeSync.js';

const router = Router();

// GET /api/items - fetch all auction items
router.get('/items', (req, res) => {
    try {
        const items = getAllItems();

        res.json({
            success: true,
            serverTime: getServerTime(),
            items
        });
    } catch (err) {
        console.error('Error fetching items:', err);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch items'
        });
    }
});

// GET /api/items/:id - single item details
router.get('/items/:id', (req, res) => {
    try {
        const item = getItemById(req.params.id);

        if (!item) {
            return res.status(404).json({
                success: false,
                error: 'Item not found'
            });
        }

        res.json({
            success: true,
            serverTime: getServerTime(),
            item
        });
    } catch (err) {
        console.error('Error fetching item:', err);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch item'
        });
    }
});

// POST /api/reset - restart all auctions with fresh timers
router.post('/reset', (req, res) => {
    try {
        resetItems();
        const items = getAllItems();

        console.log('🔄 All auctions have been reset!');

        res.json({
            success: true,
            message: 'All auctions have been reset!',
            serverTime: getServerTime(),
            items
        });
    } catch (err) {
        console.error('Error resetting items:', err);
        res.status(500).json({
            success: false,
            error: 'Failed to reset auctions'
        });
    }
});

export default router;
