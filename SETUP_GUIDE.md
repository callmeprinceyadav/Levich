# LiveBid Platform - Complete Setup Guide (From Scratch)

This guide explains every step to build this auction platform manually, including the "why" behind each decision.

---

## Table of Contents

1. [Project Architecture Overview](#1-project-architecture-overview)
2. [Prerequisites](#2-prerequisites)
3. [Step 1: Initialize Monorepo Structure](#step-1-initialize-monorepo-structure)
4. [Step 2: Set Up Backend Server](#step-2-set-up-backend-server)
5. [Step 3: Set Up Frontend Client](#step-3-set-up-frontend-client)
6. [Step 4: Add Docker Support](#step-4-add-docker-support)
7. [Running the Project](#running-the-project)

---

## 1. Project Architecture Overview

```
livebid-project/
├── packages/
│   ├── server/           ← Node.js + Express + Socket.io
│   │   ├── src/
│   │   │   ├── index.js           ← Main server entry
│   │   │   ├── routes/items.js    ← REST API endpoints
│   │   │   ├── socket/bidHandler.js ← Real-time bid events
│   │   │   ├── store/auctionStore.js ← Data + Race condition lock
│   │   │   └── utils/timeSync.js    ← Server time utility
│   │   ├── Dockerfile
│   │   └── package.json
│   │
│   └── client/           ← React + Vite
│       ├── src/
│       │   ├── main.jsx           ← React entry
│       │   ├── App.jsx            ← Main component
│       │   ├── components/        ← UI components
│       │   ├── hooks/             ← Custom hooks
│       │   ├── context/           ← Socket context
│       │   └── styles/            ← CSS files
│       ├── vite.config.js
│       ├── Dockerfile
│       └── package.json
│
├── docker-compose.yml
├── package.json          ← Root with npm workspaces
└── README.md
```

### Why Monorepo?

- **Single repository** for both frontend and backend
- **Shared tooling** (git, linting, CI/CD)
- **Easy refactoring** - can see both codebases together
- **npm workspaces** handles dependencies across packages

---

## 2. Prerequisites

```bash
# Check Node.js version (need 18+)
node --version

# Check npm version (need 8+)
npm --version

# Optional: Docker for containerization
docker --version
```

---

## Step 1: Initialize Monorepo Structure

### 1.1 Create Project Directory

```bash
# Create main folder
mkdir livebid-project
cd livebid-project

# Create package directories
mkdir -p packages/server/src/routes
mkdir -p packages/server/src/socket
mkdir -p packages/server/src/store
mkdir -p packages/server/src/utils
mkdir -p packages/client/src/components
mkdir -p packages/client/src/hooks
mkdir -p packages/client/src/context
mkdir -p packages/client/src/styles
```

### 1.2 Create Root package.json (Monorepo Config)

Create `package.json` in the root folder:

```json
{
  "name": "livebid-project",
  "version": "1.0.0",
  "private": true,
  "description": "Real-time live bidding auction platform",
  "workspaces": [
    "packages/*"
  ],
  "scripts": {
    "dev": "concurrently \"npm run dev:server\" \"npm run dev:client\"",
    "dev:server": "npm run dev --workspace=@livebid/server",
    "dev:client": "npm run dev --workspace=@livebid/client",
    "build": "npm run build --workspaces",
    "start": "npm run start --workspace=@livebid/server"
  },
  "devDependencies": {
    "concurrently": "^8.2.2"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

**Key Points:**
- `workspaces: ["packages/*"]` tells npm to treat subdirectories as linked packages
- `concurrently` lets us run server + client simultaneously
- Scripts use `--workspace=` to target specific packages

### 1.3 Create .gitignore

```
node_modules/
dist/
.env
.env.local
*.log
.DS_Store
coverage/
```

---

## Step 2: Set Up Backend Server

### 2.1 Create packages/server/package.json

```json
{
  "name": "@livebid/server",
  "version": "1.0.0",
  "description": "Backend server for live bidding platform",
  "main": "src/index.js",
  "type": "module",
  "scripts": {
    "dev": "nodemon src/index.js",
    "start": "node src/index.js"
  },
  "dependencies": {
    "cors": "^2.8.5",
    "express": "^4.18.2",
    "socket.io": "^4.7.4",
    "async-mutex": "^0.4.1",
    "uuid": "^9.0.1"
  },
  "devDependencies": {
    "nodemon": "^3.0.3"
  }
}
```

**Dependencies Explained:**
- `express` - Web server framework
- `socket.io` - Real-time WebSocket communication
- `async-mutex` - Handles race conditions (critical for bidding!)
- `cors` - Allow frontend to call backend
- `uuid` - Generate unique IDs for bids
- `nodemon` - Auto-restart server on file changes

### 2.2 Create Main Server Entry (src/index.js)

```javascript
/*
 * Main server entry point
 * Sets up Express + Socket.io with CORS
 */

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

import itemsRouter from './routes/items.js';
import { setupBidHandlers } from './socket/bidHandler.js';
import { getServerTime } from './utils/timeSync.js';

const app = express();
const httpServer = createServer(app);

// Port configuration
const PORT = process.env.PORT || 3001;

// CORS settings - allow frontend to connect
const corsOptions = {
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  methods: ['GET', 'POST'],
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json());

// Socket.io setup
const io = new Server(httpServer, {
  cors: corsOptions,
  pingTimeout: 60000,
  pingInterval: 25000
});

// Mount REST routes
app.use('/api', itemsRouter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    serverTime: getServerTime(),
    uptime: process.uptime()
  });
});

// Time sync endpoint for clients
app.get('/api/time', (req, res) => {
  res.json({ serverTime: getServerTime() });
});

// Wire up socket handlers
setupBidHandlers(io);

// Handle connections
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);
  
  // Send server time immediately for sync
  socket.emit('SERVER_TIME', { serverTime: getServerTime() });
  
  socket.on('disconnect', (reason) => {
    console.log(`Client disconnected: ${socket.id} - ${reason}`);
  });
});

// Start server
httpServer.listen(PORT, () => {
  console.log(`
  ⚡️ Bidding server is live!
  📡 Port: ${PORT}
  🕐 Server time: ${new Date(getServerTime()).toISOString()}
  `);
});

export { io };
```

### 2.3 Create Auction Store with Race Condition Handling (src/store/auctionStore.js)

**This is the most important file for handling concurrent bids!**

```javascript
/*
 * Auction data store with mutex for race condition handling
 * 
 * WHY MUTEX? 
 * If two users bid at the EXACT same millisecond:
 * 1. Both read current bid as $100
 * 2. Both try to place $110 bid
 * 3. Without lock, both might succeed (BUG!)
 * 
 * With mutex: Only one can read-check-write at a time
 */

import { Mutex } from 'async-mutex';
import { v4 as uuidv4 } from 'uuid';

// One lock per item - so bidding on item1 doesn't block item2
const itemLocks = new Map();

function getLockForItem(itemId) {
  if (!itemLocks.has(itemId)) {
    itemLocks.set(itemId, new Mutex());
  }
  return itemLocks.get(itemId);
}

// Sample auction items (replace with database in production)
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
    // ... more items
  ];
};

let auctionItems = createSampleItems();

// Get all items (public view)
export function getAllItems() {
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
 * THE MAGIC: Place a bid with mutex lock
 * 
 * Flow:
 * 1. Acquire lock for this item (wait if someone else has it)
 * 2. Validate bid
 * 3. Update item
 * 4. Release lock
 */
export async function placeBid(itemId, bidderId, bidAmount) {
  const lock = getLockForItem(itemId);
  
  // This blocks until we get the lock
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
    
    // Check if auction ended
    const serverTime = Date.now();
    if (serverTime >= item.auctionEndTime) {
      return {
        success: false,
        error: 'AUCTION_ENDED',
        message: 'Sorry, this auction has already ended'
      };
    }
    
    // Validate bid is higher
    if (bidAmount <= item.currentBid) {
      return {
        success: false,
        error: 'BID_TOO_LOW',
        message: `Bid must be higher than current: $${item.currentBid}`,
        currentBid: item.currentBid
      };
    }
    
    // All good - update the item
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
    // ALWAYS release the lock, even if error
    release();
  }
}
```

### 2.4 Create Socket Event Handlers (src/socket/bidHandler.js)

```javascript
/*
 * Socket.io event handlers for bidding
 */

import { placeBid, getAllItems } from '../store/auctionStore.js';
import { getServerTime } from '../utils/timeSync.js';

export function setupBidHandlers(io) {
  io.on('connection', (socket) => {
    
    // Client requests current items
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
    
    // Client requests server time (for sync)
    socket.on('GET_SERVER_TIME', (callback) => {
      if (typeof callback === 'function') {
        callback({ serverTime: getServerTime() });
      }
    });
    
    // THE MAIN EVENT: Placing a bid
    socket.on('BID_PLACED', async (data, callback) => {
      const { itemId, bidAmount, bidderId } = data;
      
      // Basic validation
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
      
      // Try to place the bid (mutex handles concurrency)
      const result = await placeBid(itemId, bidderId, bidAmount);
      
      if (result.success) {
        // Tell the bidder they succeeded
        if (typeof callback === 'function') {
          callback({
            success: true,
            message: result.message,
            item: result.item
          });
        }
        
        // BROADCAST to ALL clients (including sender)
        io.emit('UPDATE_BID', {
          itemId: result.item.id,
          currentBid: result.item.currentBid,
          highestBidderId: result.item.highestBidderId,
          previousBidderId: result.previousBidderId,
          serverTime: getServerTime()
        });
        
        // If someone got outbid, notify them
        if (result.previousBidderId && result.previousBidderId !== bidderId) {
          io.emit('OUTBID', {
            itemId: result.item.id,
            outbidUserId: result.previousBidderId,
            newBid: result.item.currentBid,
            newBidderId: result.item.highestBidderId
          });
        }
        
        console.log(`Bid accepted: ${bidderId} now winning at $${result.item.currentBid}`);
        
      } else {
        // Bid failed - tell them why
        if (typeof callback === 'function') {
          callback({
            success: false,
            error: result.error,
            message: result.message,
            currentBid: result.currentBid
          });
        }
        
        console.log(`Bid rejected: ${result.error}`);
      }
    });
    
    // Periodic time sync (every 30 sec)
    const syncInterval = setInterval(() => {
      socket.emit('SERVER_TIME', { serverTime: getServerTime() });
    }, 30000);
    
    socket.on('disconnect', () => {
      clearInterval(syncInterval);
    });
  });
}
```

### 2.5 Create REST Routes (src/routes/items.js)

```javascript
import { Router } from 'express';
import { getAllItems, getItemById } from '../store/auctionStore.js';
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
    res.status(500).json({
      success: false,
      error: 'Failed to fetch item'
    });
  }
});

export default router;
```

### 2.6 Create Time Utility (src/utils/timeSync.js)

```javascript
/*
 * Time synchronization utilities
 */

export function getServerTime() {
  return Date.now();
}

export function formatTime(timestamp) {
  return new Date(timestamp).toISOString();
}
```

---

## Step 3: Set Up Frontend Client

### 3.1 Create packages/client/package.json

```json
{
  "name": "@livebid/client",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "socket.io-client": "^4.7.4",
    "framer-motion": "^11.0.3"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.2.1",
    "vite": "^5.1.0"
  }
}
```

**Dependencies:**
- `react`, `react-dom` - UI framework
- `socket.io-client` - Connect to backend WebSocket
- `framer-motion` - Smooth animations
- `vite` - Fast bundler/dev server

### 3.2 Create Vite Config (vite.config.js)

```javascript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Proxy API calls to backend during development
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      },
      '/socket.io': {
        target: 'http://localhost:3001',
        ws: true  // Important for WebSocket!
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  }
});
```

### 3.3 Create index.html

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="Real-time live auction platform" />
    <title>LiveBid - Real-Time Auctions</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

### 3.4 Create React Entry (src/main.jsx)

```javascript
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

### 3.5 Create Socket Context (src/context/SocketContext.jsx)

```javascript
import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext(null);

// Server URL - use env var in production
const SERVER_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export function SocketProvider({ children }) {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Create socket connection
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

    // Cleanup on unmount
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
```

### 3.6 Create Time Sync Hook (src/hooks/useServerTime.js)

**Critical for preventing timer manipulation!**

```javascript
import { useState, useCallback } from 'react';
import { useSocket } from '../context/SocketContext';

/*
 * Hook to sync local time with server
 * 
 * WHY?
 * - User can change their computer clock to extend auctions
 * - We calculate offset: how far is their clock from server?
 * - All countdowns use server time, not local time
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
        // Estimate: server time + half round trip
        const estimatedServerTime = response.serverTime + (roundTripTime / 2);
        const offset = estimatedServerTime - Date.now();
        
        setTimeOffset(offset);
        console.log(`Time sync: offset is ${offset}ms`);
      }
    });
  }, [socket]);

  // Get current server time
  const getServerTime = useCallback(() => {
    return Date.now() + timeOffset;
  }, [timeOffset]);

  return { timeOffset, syncTime, getServerTime };
}
```

### 3.7 Create App.jsx, Components, and CSS

(The full code for these is in the project - they follow the same patterns shown above)

---

## Step 4: Add Docker Support

### 4.1 Server Dockerfile (packages/server/Dockerfile)

```dockerfile
FROM node:20-alpine AS base
WORKDIR /app
COPY package.json ./
RUN npm install --production
COPY src ./src
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1
CMD ["node", "src/index.js"]
```

### 4.2 Client Dockerfile (packages/client/Dockerfile)

```dockerfile
# Build stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### 4.3 docker-compose.yml (root)

```yaml
version: '3.8'

services:
  server:
    build:
      context: ./packages/server
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - PORT=3001
      - CLIENT_URL=http://localhost:3000
    restart: unless-stopped

  client:
    build:
      context: ./packages/client
    ports:
      - "3000:80"
    depends_on:
      - server
    restart: unless-stopped

networks:
  default:
    name: livebid-network
```

---

## Running the Project

### Local Development

```bash
# 1. Navigate to project root
cd livebid-project

# 2. Install all dependencies (runs for all workspaces)
npm install

# 3. Start both servers
npm run dev

# 4. Open browser
# Frontend: http://localhost:5173
# Backend: http://localhost:3001
```

### With Docker

```bash
# Build and run
docker-compose up --build

# Access at http://localhost:3000
```

---

## Key Concepts Summary

| Concept | Solution |
|---------|----------|
| **Monorepo** | npm workspaces in root package.json |
| **Race Conditions** | async-mutex lock per auction item |
| **Real-Time Updates** | Socket.io BID_PLACED → UPDATE_BID broadcast |
| **Timer Sync** | Calculate offset between client & server clocks |
| **Visual Feedback** | Framer Motion + CSS keyframe animations |
| **Containerization** | Multi-stage Docker builds + docker-compose |
