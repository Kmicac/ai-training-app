export class ReconnectionManager {
  #maxAttempts;
  #delay;
  #attempts = 0;
  #reconnecting = false;

  constructor({ maxAttempts = 3, delay = 2000 }) {
    this.#maxAttempts = maxAttempts;
    this.#delay = delay;
  }

  shouldAttemptReconnection(error) {
    // Errores que ameritan reconexión
    const reconnectableErrors = [
      'ECONNRESET',
      'ETIMEDOUT',
      'ECONNREFUSED',
      'NETWORK_ERROR',
      'STREAM_ERROR'
    ];

    return reconnectableErrors.some(errorType => 
      error.message?.includes(errorType) || error.code === errorType
    );
  }

  async handleReconnection(socket, userId, reconnectCallback) {
    if (this.#reconnecting) return false;
    this.#reconnecting = true;

    try {
      while (this.#attempts < this.#maxAttempts) {
        this.#attempts++;
        
        socket.emit('reconnecting', {
          attempt: this.#attempts,
          maxAttempts: this.#maxAttempts
        });

        await new Promise(resolve => setTimeout(resolve, this.#delay));

        try {
          if (reconnectCallback) {
            await reconnectCallback();
          }
          
          // Éxito en la reconexión
          this.#reset();
          socket.emit('reconnected');
          return true;
        } catch (error) {
          console.error(`Intento de reconexión ${this.#attempts} fallido:`, error);
          
          if (this.#attempts >= this.#maxAttempts) {
            throw new Error('Máximo número de intentos de reconexión alcanzado');
          }
        }
      }
    } catch (error) {
      socket.emit('reconnectionFailed', {
        message: error.message,
        code: 'MAX_RECONNECT_ATTEMPTS'
      });
      return false;
    } finally {
      this.#reconnecting = false;
    }
  }

  #reset() {
    this.#attempts = 0;
    this.#reconnecting = false;
  }

  get isReconnecting() {
    return this.#reconnecting;
  }

  get currentAttempt() {
    return this.#attempts;
  }
} 