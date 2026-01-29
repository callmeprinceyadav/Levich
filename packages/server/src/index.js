/*
 * Main server entry point
 * Sets up Express + Socket.io with CORS for the bidding platform
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

// figure out what port we're running on
const PORT = process.env.PORT || 3001;

// cors config - pretty permissive for dev, tighten for prod
const corsOptions = {
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  methods: ['GET', 'POST'],
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json());

// socket.io setup with same cors
const io = new Server(httpServer, {
  cors: corsOptions,
  pingTimeout: 60000,
  pingInterval: 25000
});

// mount routes
app.use('/api', itemsRouter);

// health check - always handy
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    serverTime: getServerTime(),
    uptime: process.uptime()
  });
});

// time sync endpoint for clients
app.get('/api/time', (req, res) => {
  res.json({ serverTime: getServerTime() });
});

// wire up socket handlers
setupBidHandlers(io);

// track connections (useful for debugging)
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);
  
  // send server time right away so client can sync
  socket.emit('SERVER_TIME', { serverTime: getServerTime() });
  
  socket.on('disconnect', (reason) => {
    console.log(`Client disconnected: ${socket.id} - ${reason}`);
  });
});

httpServer.listen(PORT, () => {
  console.log(`
  ⚡️ Bidding server is live!
  📡 Port: ${PORT}
  🕐 Server time: ${new Date(getServerTime()).toISOString()}
  `);
});

export { io };
