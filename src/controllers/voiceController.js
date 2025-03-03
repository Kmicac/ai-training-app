import { deepgramService } from '../config/deepgram.config.js';
import { groqService } from '../config/groq.config.js';
import { supabaseService } from '../config/supabase.config.js';
import { AudioBuffer } from '../utils/AudioBuffer.js';
import { ReconnectionManager } from '../utils/ReconnectionManager.js';
import { HeartbeatManager } from '../utils/HeartbeatManager.js';

class VoiceController {
  #deepgramStream = null;
  #audioBuffer;
  #reconnectionManager;
  #heartbeatManager;
  #isProcessing = false;

  constructor() {
    this.#audioBuffer = new AudioBuffer({
      maxBufferSize: 50,
      processInterval: 100
    });

    this.#reconnectionManager = new ReconnectionManager({
      maxAttempts: 3,
      delay: 2000
    });

    this.#heartbeatManager = new HeartbeatManager({
      interval: 30000
    });
  }

  async handleWebSocketConnection(socket) {
    // Iniciar heartbeat
    this.#heartbeatManager.start(socket, {
      onConnectionLoss: async () => {
        await this.#handleConnectionLoss(socket);
      }
    });

    socket.on('startStream', async (data) => {
      const { userId, language = 'es' } = data;
      
      try {
        await this.#initializeStream(socket, userId, language);
      } catch (error) {
        await this.#reconnectionManager.handleReconnection(socket, userId, async () => {
          await this.#initializeStream(socket, userId, language);
        });
      }
    });

    socket.on('audioChunk', (chunk) => {
      if (this.#deepgramStream) {
        this.#audioBuffer.addChunk(chunk);
      }
    });

    socket.on('stopStream', () => {
      this.#cleanup(socket);
    });

    socket.on('disconnect', () => {
      this.#cleanup(socket);
    });
  }

  async #initializeStream(socket, userId, language) {
    this.#deepgramStream = deepgramService.createStreamingSTT({
      language,
      model: `nova-2-${language}`,
      encoding: 'linear16',
      sample_rate: 16000,
      channels: 1,
      interim_results: true,
      endpointing: true,
      utterance_end_ms: 1000
    });

    // Configurar el procesamiento del buffer
    await this.#audioBuffer.startProcessing(this.#deepgramStream);

    // Configurar manejadores de eventos
    this.#setupEventHandlers(socket, userId);

    socket.emit('streamReady');
  }

  #setupEventHandlers(socket, userId) {
    this.#deepgramStream.addListener('transcriptReceived', 
      async (transcription) => {
        try {
          await this.#processTranscription(socket, userId, transcription);
        } catch (error) {
          if (this.#reconnectionManager.shouldAttemptReconnection(error)) {
            await this.#reconnectionManager.handleReconnection(socket, userId);
          } else {
            this.#handleError(socket, error);
          }
        }
      });

    this.#deepgramStream.addListener('error', async (error) => {
      if (this.#reconnectionManager.shouldAttemptReconnection(error)) {
        await this.#reconnectionManager.handleReconnection(socket, userId);
      } else {
        this.#handleError(socket, error);
      }
    });

    this.#deepgramStream.addListener('metadata', 
      (metadata) => socket.emit('metadata', metadata));

    this.#deepgramStream.addListener('utterance_end', 
      () => socket.emit('utteranceEnd'));
  }

  async #processTranscription(socket, userId, transcription) {
    const { transcript, is_final, confidence, words, sentiment, topics } = transcription;

    if (!is_final) {
      socket.emit('interimTranscript', { 
        transcript, 
        words, 
        confidence,
        metadata: {
          sentiment,
          topics
        }
      });
      return;
    }

    if (this.#isProcessing) return;
    this.#isProcessing = true;

    try {
      // Obtener contexto del usuario
      const userContext = await this.#getUserContext(userId);
      
      // Generar respuesta con Groq
      const response = await groqService.generateResponse({
        userContext: `Nivel de fitness: ${userContext.fitnessLevel}, Objetivos: ${userContext.fitnessGoals.join(', ')}`,
        trainingHistory: userContext.workoutPlans[0] ? 
          `Último plan: ${userContext.workoutPlans[0].name}` : 
          'Sin historial previo',
        conversationHistory: userContext.conversationHistory,
        userInput: transcript
      });

      socket.emit('transcriptionComplete', {
        transcript,
        confidence,
        words,
        aiResponse: response,
        metadata: {
          sentiment,
          topics
        }
      });

      // Generar audio con Deepgram TTS
      const ttsStream = await deepgramService.textToSpeech(
        response.text,
        {
          voice: 'nova',
          speed: 1.1,
          model: 'enhanced',
          language: 'es'
        }
      );

      for await (const chunk of ttsStream) {
        socket.emit('audioChunk', chunk);
      }

      socket.emit('audioComplete');

      // Guardar conversación
      await this.#saveConversation(userId, transcript, response.text);

    } catch (error) {
      this.#handleError(socket, error);
    } finally {
      this.#isProcessing = false;
    }
  }

  async #handleConnectionLoss(socket) {
    this.#audioBuffer.pause();
    
    const reconnected = await this.#reconnectionManager.handleReconnection(
      socket, 
      socket.userId
    );

    if (reconnected) {
      this.#audioBuffer.resume();
    } else {
      this.#cleanup(socket);
    }
  }

  #handleError(socket, error) {
    console.error('Error en VoiceController:', error);
    socket.emit('error', {
      message: 'Error en el procesamiento de voz',
      details: error.message
    });
  }

  #cleanup(socket) {
    this.#audioBuffer.clear();
    this.#heartbeatManager.stop();
    if (this.#deepgramStream) {
      deepgramService.closeStream(this.#deepgramStream);
      this.#deepgramStream = null;
    }
    this.#isProcessing = false;
  }

  async #getUserContext(userId) {
    const { data: user, error } = await supabaseService.getUserContext(userId);

    if (error || !user) {
      throw new Error('Usuario no encontrado');
    }

    const conversationHistory = user.conversations
      .flatMap(conv => conv.messages)
      .map(msg => `${msg.role}: ${msg.content}`)
      .join('\n');

    return {
      ...user,
      conversationHistory
    };
  }

  async #saveConversation(userId, userMessage, assistantMessage) {
    await supabaseService.saveConversation(userId, userMessage, assistantMessage);
  }

  async processVoiceInteraction(req, res) {
    try {
      const { audioData, userId, language = 'es' } = req.body;
      
      // Procesar audio con Deepgram STT
      const sttResult = await deepgramService.speechToText(
        Buffer.from(audioData, 'base64'),
        { 
          mimetype: 'audio/wav',
          language,
          model: `nova-2-${language}`
        }
      );

      // Obtener contexto del usuario
      const userContext = await this.#getUserContext(userId);

      // Generar respuesta con Groq
      const aiResponse = await groqService.generateResponse({
        userContext: `Nivel de fitness: ${userContext.fitnessLevel}, Objetivos: ${userContext.fitnessGoals.join(', ')}`,
        trainingHistory: userContext.workoutPlans[0] ? 
          `Último plan: ${userContext.workoutPlans[0].name}` : 
          'Sin historial previo',
        conversationHistory: userContext.conversationHistory,
        userInput: sttResult.transcript
      });

      // Generar audio con Deepgram TTS
      const audioResponse = await deepgramService.textToSpeech(
        aiResponse.text,
        { 
          voice: 'nova',
          language,
          model: 'enhanced',
          speed: 1.1
        }
      );

      // Guardar conversación
      await this.#saveConversation(userId, sttResult.transcript, aiResponse.text);

      res.json({
        success: true,
        transcription: sttResult.transcript,
        textResponse: aiResponse.text,
        audioResponse,
        confidence: sttResult.confidence,
        summary: sttResult.summary,
        topics: sttResult.topics,
        sentiment: sttResult.sentiment
      });
    } catch (error) {
      console.error('Error en el procesamiento de voz:', error);
      res.status(500).json({ 
        error: 'Error procesando la interacción de voz',
        details: error.message 
      });
    }
  }
}

export const voiceController = new VoiceController(); 