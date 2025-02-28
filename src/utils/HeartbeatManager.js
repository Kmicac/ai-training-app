export class HeartbeatManager {
  #interval;
  #lastHeartbeat = Date.now();
  #heartbeatTimeout = null;
  #checkInterval = null;
  #onConnectionLoss = null;

  constructor({ interval = 30000 }) {
    this.#interval = interval;
  }

  start(socket, { onConnectionLoss }) {
    this.#onConnectionLoss = onConnectionLoss;
    this.#lastHeartbeat = Date.now();

    // Enviar ping periódicamente
    this.#heartbeatTimeout = setInterval(() => {
      socket.emit('ping');
    }, this.#interval);

    // Verificar respuestas
    this.#checkInterval = setInterval(() => {
      const timeSinceLastHeartbeat = Date.now() - this.#lastHeartbeat;
      
      if (timeSinceLastHeartbeat > this.#interval * 2) {
        console.warn('No se ha recibido heartbeat en el intervalo esperado');
        this.#handleConnectionLoss();
      }
    }, this.#interval);

    // Configurar listener para pong
    socket.on('pong', () => {
      this.#lastHeartbeat = Date.now();
    });
  }

  async #handleConnectionLoss() {
    if (this.#onConnectionLoss) {
      await this.#onConnectionLoss();
    }
  }

  stop() {
    if (this.#heartbeatTimeout) {
      clearInterval(this.#heartbeatTimeout);
      this.#heartbeatTimeout = null;
    }

    if (this.#checkInterval) {
      clearInterval(this.#checkInterval);
      this.#checkInterval = null;
    }
  }

  get isActive() {
    return this.#heartbeatTimeout !== null;
  }

  get timeSinceLastHeartbeat() {
    return Date.now() - this.#lastHeartbeat;
  }
} 