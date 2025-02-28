import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { PrismaClient } from '@prisma/client';
import { createClient } from 'redis';
import app from './app.js';

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? process.env.FRONTEND_URL 
      : 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});

// Singleton instances
const prisma = new PrismaClient();
const redisClient = createClient({
  url: process.env.REDIS_URL
});

// Graceful shutdown handler
async function shutdown(signal) {
  console.log(`\n${signal} signal received. Starting graceful shutdown...`);
  
  try {
    // Close HTTP server (stop accepting new connections)
    await new Promise((resolve) => httpServer.close(resolve));
    console.log('✅ HTTP server closed');

    // Close WebSocket connections
    await io.close();
    console.log('✅ WebSocket server closed');

    // Disconnect Redis
    await redisClient.quit();
    console.log('✅ Redis disconnected');

    // Disconnect Prisma
    await prisma.$disconnect();
    console.log('✅ Database disconnected');

    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
}

// Handle shutdown signals
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  shutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  shutdown('UNHANDLED_REJECTION');
});

// Initialize WebSocket connection
io.on('connection', (socket) => {
  console.log('👤 Client connected');
  
  socket.on('disconnect', () => {
    console.log('👋 Client disconnected');
  });
});

// Start server
const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, async () => {
  try {
    // Connect to Redis
    await redisClient.connect();
    console.log('✅ Redis connected');

    // Test database connection
    await prisma.$connect();
    console.log('✅ Database connected');

    console.log(`🚀 Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
  } catch (error) {
    console.error('Error during startup:', error);
    await shutdown('STARTUP_ERROR');
  }
}); 