import express from 'express';
import { deepgramService } from '../config/deepgram.config.js';
import { groqService } from '../config/groq.config.js';

const router = express.Router();

// Ruta para probar Text-to-Speech
router.post('/tts', async (req, res) => {
  try {
    const { text, voice, language } = req.body;
    const audioResponse = await deepgramService.textToSpeech(text, {
      voice,
      language
    });
    res.json({ success: true, audio: audioResponse });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Ruta para probar Speech-to-Text con archivo de audio
router.post('/stt', async (req, res) => {
  try {
    const audioBuffer = req.body.audio;
    const result = await deepgramService.speechToText(Buffer.from(audioBuffer, 'base64'));
    res.json({ success: true, transcription: result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Ruta para probar el chat con Groq
router.post('/chat', async (req, res) => {
  try {
    const { message } = req.body;
    const response = await groqService.generateResponse({
      userContext: "Usuario de prueba",
      trainingHistory: "Sin historial previo",
      userInput: message
    });
    res.json({ success: true, response });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router; 