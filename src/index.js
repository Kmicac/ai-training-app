import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

import testRoutes from './routes/test.routes.js';
import { workoutController } from './controllers/workoutController.js';
import { voiceController } from './controllers/voiceController.js';

// Configuración de variables de entorno
dotenv.config();

// Inicialización de Express
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN,
    methods: ['GET', 'POST']
  }
});

// Middleware de seguridad
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN
}));
app.use(morgan('dev'));
app.use(express.json({ limit: '50mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: process.env.RATE_LIMIT_WINDOW * 60 * 1000,
  max: process.env.RATE_LIMIT_MAX_REQUESTS
});
app.use(limiter);

// Rutas de prueba
app.use('/api/test', testRoutes);

// Rutas de la API
app.post('/api/workout/generate', workoutController.generateWorkoutPlan);
app.get('/api/workout/videos/:exerciseId', workoutController.getExerciseVideos);
app.get('/api/workout/recommended/:userId', workoutController.getRecommendedVideos);

// Manejo de WebSocket para voz
io.on('connection', (socket) => {
  console.log('Cliente conectado:', socket.id);
  voiceController.handleWebSocketConnection(socket);
});

// Manejo de errores
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Error interno del servidor' });
});

// Iniciar servidor
const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
}); 