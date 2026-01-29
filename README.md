# LiveBid - Real-Time Auction Platform

A real-time auction platform where users compete to buy items in the final seconds. Built with Node.js, Socket.io, React, and Docker.

![LiveBid](https://img.shields.io/badge/Live-Bidding-6366f1?style=for-the-badge)
![Node.js](https://img.shields.io/badge/Node.js-20-339933?style=flat-square&logo=node.js)
![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react)
![Socket.io](https://img.shields.io/badge/Socket.io-4-010101?style=flat-square&logo=socket.io)

## Features

- **Real-Time Bidding** - Instant bid updates via WebSocket
- **Race Condition Handling** - Mutex locks ensure fair bidding when multiple users bid simultaneously
- **Server-Synced Timers** - Countdown timers can't be manipulated client-side
- **Visual Feedback** - Price flashes, Winning/Outbid badges, urgency indicators
- **Docker Ready** - Full containerization with docker-compose

## Quick Start

### Prerequisites

- Node.js 18+ OR Docker

### Option 1: Local Development

```bash
# Install all dependencies
npm install

# Start both server and client
npm run dev
```

- Frontend: http://localhost:5173
- Backend: http://localhost:3001

### Option 2: Docker

```bash
# Build and run with Docker Compose
docker-compose up --build
```

- Application: http://localhost:3000
- Backend: http://localhost:3001

## Project Structure

```
levich-bidding/
├── packages/
│   ├── server/          # Node.js + Socket.io backend
│   │   ├── src/
│   │   │   ├── index.js         # Server entry point
│   │   │   ├── routes/          # REST API endpoints
│   │   │   ├── socket/          # Socket.io handlers
│   │   │   ├── store/           # Auction data store
│   │   │   └── utils/           # Utilities
│   │   ├── Dockerfile
│   │   └── package.json
│   │
│   └── client/          # React + Vite frontend
│       ├── src/
│       │   ├── components/      # React components
│       │   ├── hooks/           # Custom hooks
│       │   ├── context/         # Socket context
│       │   └── styles/          # CSS
│       ├── Dockerfile
│       └── package.json
│
├── docker-compose.yml
└── package.json         # Monorepo root
```

## API Documentation

### REST Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/items` | Get all auction items |
| GET | `/api/items/:id` | Get single item details |
| GET | `/api/time` | Get server timestamp |
| GET | `/health` | Health check |

### Socket Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `BID_PLACED` | Client → Server | Place a bid |
| `UPDATE_BID` | Server → All Clients | Broadcast new highest bid |
| `OUTBID` | Server → Client | Notify user they were outbid |
| `GET_SERVER_TIME` | Client → Server | Request server time for sync |
| `SERVER_TIME` | Server → Client | Periodic time sync broadcasts |

## Race Condition Handling

The system uses **async-mutex** to handle concurrent bids:

1. When a bid arrives, we acquire a lock for that specific item
2. Validate bid amount > current highest bid
3. Check auction hasn't ended
4. Update bid atomically
5. Release lock
6. Broadcast result

If two users bid at the exact same millisecond, only the first succeeds.

## Timer Synchronization

Clients sync with server time on connection:

1. Client sends time request, records local timestamp
2. Server responds with its current time
3. Client calculates offset: `offset = serverTime - localTime + (roundTrip/2)`
4. All countdown calculations use: `serverTime = localTime + offset`

This prevents client-side timer manipulation.

## Deployment

### Render (Backend)

1. Create new Web Service
2. Root Directory: `packages/server`
3. Build Command: `npm install`
4. Start Command: `node src/index.js`
5. Add env: `CLIENT_URL=https://your-vercel-app.vercel.app`

### Vercel (Frontend)

1. Create new project
2. Root Directory: `packages/client`
3. Framework: Vite
4. Add env: `VITE_API_URL=https://your-render-backend.onrender.com`

## Tech Stack

- **Backend**: Node.js, Express, Socket.io, async-mutex
- **Frontend**: React 18, Vite, Framer Motion, Socket.io-client
- **Infrastructure**: Docker, nginx

## License

MIT
