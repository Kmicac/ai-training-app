export class AudioBuffer {
  #buffer = [];
  #maxBufferSize;
  #processInterval;
  #isProcessing = false;
  #processingTimeout = null;

  constructor({ maxBufferSize = 50, processInterval = 100 }) {
    this.#maxBufferSize = maxBufferSize;
    this.#processInterval = processInterval;
  }

  addChunk(chunk) {
    if (this.#buffer.length >= this.#maxBufferSize) {
      this.#buffer.shift();
    }
    this.#buffer.push(chunk);
  }

  async startProcessing(stream) {
    if (this.#isProcessing) return;
    this.#isProcessing = true;

    const processChunks = async () => {
      if (!this.#isProcessing) return;

      if (this.#buffer.length > 0) {
        const chunk = this.#buffer.shift();
        try {
          await stream.send(chunk);
        } catch (error) {
          console.error('Error procesando chunk de audio:', error);
        }
      }

      this.#processingTimeout = setTimeout(processChunks, this.#processInterval);
    };

    await processChunks();
  }

  pause() {
    this.#isProcessing = false;
    if (this.#processingTimeout) {
      clearTimeout(this.#processingTimeout);
      this.#processingTimeout = null;
    }
  }

  resume() {
    if (!this.#isProcessing) {
      this.startProcessing();
    }
  }

  clear() {
    this.#buffer = [];
    this.pause();
  }

  get bufferLength() {
    return this.#buffer.length;
  }
} 