const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { errorHandler } = require('./middleware/errorMiddleware');

// Importar rutas
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const aiRoutes = require('./routes/aiRoutes');

// Inicializar Express
const app = express();

// Middleware de seguridad
app.use(helmet()); // Protege las cabeceras HTTP
app.use(cors()); // Habilita CORS
app.use(express.json()); // Parseador de JSON

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Limitar solicitudes
const limiter = rateLimit({
  windowMs: process.env.RATE_LIMIT_WINDOW * 60 * 1000, // en minutos
  max: process.env.RATE_LIMIT_MAX,
  message: 'Demasiadas solicitudes desde esta IP, por favor inténtalo de nuevo más tarde',
});
app.use('/api', limiter);

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/ai', aiRoutes);

// Ruta de bienvenida
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Bienvenido a la API de la Aplicación de Entrenamiento con IA',
  });
});

// Middleware de manejo de errores
app.use(errorHandler);

// Manejo de rutas no encontradas
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Recurso no encontrado',
  });
});

module.exports = app;