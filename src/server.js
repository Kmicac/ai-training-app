const app = require('./app');
const dotenv = require('dotenv');

// Cargar variables de entorno
dotenv.config();

// Iniciar el servidor
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`Servidor ejecutándose en modo ${process.env.NODE_ENV} en el puerto ${PORT}`);
});

// Manejo de errores no capturados
process.on('unhandledRejection', (err) => {
  console.error(`Error: ${err.message}`);
  // Cerrar servidor y salir del proceso
  server.close(() => process.exit(1));
});