import { deepgramService } from '../config/deepgram.config.js';
import { fitnessChain } from '../config/langchain.config.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

class VoiceController {
  #deepgramStream = null;
  #currentTranscript = '';
  #isProcessing = false;

  async #processTranscription(socket, userId, transcription) {
    const { transcript, is_final, confidence, words } = transcription;

    if (!is_final) {
      socket.emit('interimTranscript', { transcript, words, confidence });
      return;
    }

    if (this.#isProcessing) return;
    this.#isProcessing = true;

    try {
      this.#currentTranscript = transcript;
      const response = await this.processAIResponse(userId, transcript);
      
      socket.emit('transcriptionComplete', {
        transcript: this.#currentTranscript,
        confidence,
        words,
        aiResponse: response
      });

      const ttsStream = await deepgramService.textToSpeech(
        response.text,
        {
          voice: 'nova',
          speed: 1.1,
          model: 'enhanced'
        }
      );

      for await (const chunk of ttsStream) {
        socket.emit('audioChunk', chunk);
      }

      socket.emit('audioComplete');
    } catch (error) {
      console.error('Error procesando transcripción final:', error);
      socket.emit('error', {
        message: 'Error procesando respuesta',
        details: error.message
      });
    } finally {
      this.#isProcessing = false;
    }
  }

  handleWebSocketConnection(socket) {
    socket.on('startStream', async (data) => {
      const { userId, language = 'es' } = data;
      
      try {
        this.#deepgramStream = deepgramService.createStreamingSTT({
          language,
          model: `nova-2-${language}`
        });

        this.#deepgramStream.addListener('transcriptReceived', 
          async (transcription) => this.#processTranscription(socket, userId, transcription));

        this.#deepgramStream.addListener('metadata', 
          (metadata) => socket.emit('metadata', metadata));

        this.#deepgramStream.addListener('utterance_end', 
          () => socket.emit('utteranceEnd'));

        this.#deepgramStream.addListener('error', (error) => {
          console.error('Error en stream:', error);
          socket.emit('error', {
            message: 'Error en streaming',
            details: error.message
          });
        });

        socket.emit('streamReady');

      } catch (error) {
        console.error('Error iniciando stream:', error);
        socket.emit('error', {
          message: 'Error iniciando stream',
          details: error.message
        });
      }
    });

    socket.on('audioChunk', (chunk) => {
      try {
        if (this.#deepgramStream) {
          deepgramService.handleAudioChunk(this.#deepgramStream, chunk);
        }
      } catch (error) {
        console.error('Error procesando chunk de audio:', error);
        socket.emit('error', {
          message: 'Error procesando audio',
          details: error.message
        });
      }
    });

    socket.on('stopStream', () => {
      if (this.#deepgramStream) {
        deepgramService.closeStream(this.#deepgramStream);
        this.#deepgramStream = null;
        this.#isProcessing = false;
      }
    });

    socket.on('disconnect', () => {
      if (this.#deepgramStream) {
        deepgramService.closeStream(this.#deepgramStream);
        this.#deepgramStream = null;
        this.#isProcessing = false;
      }
    });
  }

  async processAIResponse(userId, transcript) {
    const userContext = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        workoutPlans: {
          take: 1,
          orderBy: { createdAt: 'desc' }
        },
        conversations: {
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: { messages: true }
        }
      }
    });

    if (!userContext) {
      throw new Error('Usuario no encontrado');
    }

    const conversationHistory = userContext.conversations
      .flatMap(conv => conv.messages)
      .map(msg => `${msg.role}: ${msg.content}`)
      .join('\n');

    const aiResponse = await fitnessChain.call({
      userContext: `Nivel de fitness: ${userContext.fitnessLevel}, Objetivos: ${userContext.fitnessGoals.join(', ')}`,
      trainingHistory: userContext.workoutPlans[0] ? 
        `Último plan: ${userContext.workoutPlans[0].name}` : 
        'Sin historial previo',
      userInput: transcript,
      conversationHistory
    });

    await prisma.conversation.create({
      data: {
        userId,
        messages: {
          create: [
            { content: transcript, role: 'user' },
            { content: aiResponse.text, role: 'assistant' }
          ]
        }
      }
    });

    return aiResponse;
  }

  async processVoiceInteraction(req, res) {
    try {
      const { audioData, userId, language = 'es' } = req.body;
      
      const sttResult = await deepgramService.speechToText(
        Buffer.from(audioData, 'base64'),
        { 
          mimetype: 'audio/wav',
          language,
          model: `nova-2-${language}`
        }
      );

      const aiResponse = await this.processAIResponse(userId, sttResult.transcript);
      const audioResponse = await deepgramService.textToSpeech(
        aiResponse.text,
        { 
          voice: 'nova',
          language,
          model: 'enhanced'
        }
      );

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