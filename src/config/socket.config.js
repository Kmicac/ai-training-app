import { Server } from 'socket.io';
import voiceController from '../controllers/voiceController';

function configureWebSocket(server) {
  const io = new Server(server, {
    cors: {
      origin: process.env.NODE_ENV === 'production' 
        ? process.env.FRONTEND_URL 
        : 'http://localhost:3000',
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket) => {
    console.log('Cliente conectado');
    
    // Configurar el manejo de voz para este socket
    voiceController.handleWebSocketConnection(socket);

    socket.on('disconnect', () => {
      console.log('Cliente desconectado');
    });
  });

  return io;
}

export default configureWebSocket; 