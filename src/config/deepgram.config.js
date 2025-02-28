import { Deepgram } from '@deepgram/sdk';

class DeepgramService {
  #client;
  #defaultOptions;

  constructor() {
    this.#client = new Deepgram(process.env.DEEPGRAM_API_KEY);
    this.#defaultOptions = {
      model: 'nova-2-es',  // Modelo optimizado para español
      language: 'es',
      smart_format: true,
      punctuate: true,
      utterances: true,
      diarize: true,
      filler_words: true,
      summarize: true
    };
  }

  async #handleError(error, context) {
    console.error(`Error en ${context}:`, error);
    throw error;
  }

  createStreamingSTT(options = {}) {
    try {
      const deepgramLive = this.#client.listen.live({
        ...this.#defaultOptions,
        ...options,
        encoding: 'linear16',
        sample_rate: 16000,
        channels: 1,
        interim_results: true,
        endpointing: true,
        utterance_end_ms: 1000
      });

      // Configurar manejadores de eventos
      deepgramLive.on('error', error => 
        this.#handleError(error, 'streaming STT'));

      deepgramLive.on('metadata', metadata => {
        console.log('Metadata recibida:', metadata);
      });

      deepgramLive.on('utterance_end', () => {
        console.log('Fin de utterance detectado');
      });

      return deepgramLive;
    } catch (error) {
      return this.#handleError(error, 'creando streaming STT');
    }
  }

  async speechToText(audioBuffer, options = {}) {
    try {
      const response = await this.#client.listen.prerecorded({
        buffer: audioBuffer,
        mimetype: options.mimetype ?? 'audio/wav',
        ...this.#defaultOptions,
        ...options
      });

      // Extraer información relevante de la respuesta
      return {
        transcript: response.results.channels[0].alternatives[0].transcript,
        confidence: response.results.channels[0].alternatives[0].confidence,
        words: response.results.channels[0].alternatives[0].words,
        utterances: response.results.utterances ?? [],
        summary: response.results.summary ?? null,
        topics: response.results.topics ?? [],
        sentiment: response.results.sentiment ?? null
      };
    } catch (error) {
      return this.#handleError(error, 'STT');
    }
  }

  async textToSpeech(text, options = {}) {
    try {
      // Configuración para TTS
      const ttsOptions = {
        text,
        voice: options.voice ?? 'nova', // Voz más natural
        model: options.model ?? 'enhanced',
        language: options.language ?? 'es',
        speed: options.speed ?? 1.0,
        pitch: options.pitch ?? 1.0,
        encoding: 'wav',
        sample_rate: 24000,
        streaming: true
      };

      return await this.#client.speak(ttsOptions);
    } catch (error) {
      return this.#handleError(error, 'TTS');
    }
  }

  handleAudioChunk(stream, chunk) {
    if (!stream?.send) {
      throw new Error('Stream inválido o no inicializado');
    }

    try {
      stream.send(chunk);
    } catch (error) {
      this.#handleError(error, 'enviando chunk de audio');
    }
  }

  closeStream(stream) {
    if (!stream?.finish) {
      return;
    }

    try {
      stream.finish();
    } catch (error) {
      console.error('Error cerrando stream:', error);
    }
  }
}

export const deepgramService = new DeepgramService(); 