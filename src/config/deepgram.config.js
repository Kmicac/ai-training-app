import { createClient } from '@deepgram/sdk';
import dotenv from 'dotenv';

dotenv.config();

class DeepgramService {
  #client;
  #defaultOptions;

  constructor() {
    if (!process.env.DEEPGRAM_API_KEY) {
      throw new Error('DEEPGRAM_API_KEY no encontrada en el archivo .env');
    }

    this.#client = createClient(process.env.DEEPGRAM_API_KEY);

    this.#defaultOptions = {
      model: 'nova-2',
      language: 'es',
      smart_format: true,
      punctuate: true,
      utterances: true,
      diarize: true
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

      deepgramLive.addListener('transcriptReceived', (transcription) => {
        console.log('Transcripción recibida:', transcription);
      });

      deepgramLive.addListener('error', (error) => {
        console.error('Error en streaming:', error);
      });

      deepgramLive.addListener('close', () => {
        console.log('Conexión cerrada');
      });

      return deepgramLive;
    } catch (error) {
      return this.#handleError(error, 'creando streaming STT');
    }
  }

  async speechToText(audioBuffer, options = {}) {
    try {
      const source = {
        buffer: audioBuffer,
        mimetype: options.mimetype || 'audio/wav'
      };

      const { result, error } = await this.#client.transcription.preRecorded(source, {
        ...this.#defaultOptions,
        ...options
      });

      if (error) {
        throw error;
      }

      return {
        transcript: result?.results?.channels[0]?.alternatives[0]?.transcript || '',
        confidence: result?.results?.channels[0]?.alternatives[0]?.confidence || 0,
        words: result?.results?.channels[0]?.alternatives[0]?.words || [],
        utterances: result?.results?.utterances || []
      };
    } catch (error) {
      return this.#handleError(error, 'STT');
    }
  }

  async textToSpeech(text, options = {}) {
    try {
      const { result, error } = await this.#client.speak({
        text,
        voice: options.voice || 'nova',
        model: options.model || 'enhanced',
        language: options.language || 'es'
      });

      if (error) {
        throw error;
      }

      return result;
    } catch (error) {
      return this.#handleError(error, 'TTS');
    }
  }

  handleAudioChunk(stream, chunk) {
    if (!stream) {
      throw new Error('Stream no inicializado');
    }

    try {
      stream.send(chunk);
    } catch (error) {
      this.#handleError(error, 'enviando chunk de audio');
    }
  }

  closeStream(stream) {
    if (!stream) return;

    try {
      stream.finish();
    } catch (error) {
      console.error('Error cerrando stream:', error);
    }
  }
}

export const deepgramService = new DeepgramService(); 