import { Router } from 'express';
import { workoutController } from '../controllers/workoutController.js';
import { voiceController } from '../controllers/voiceController.js';

const router = Router();

// Rutas de entrenamiento
router.post('/workout/generate', workoutController.generateWorkoutPlan);
router.get('/workout/videos/:exerciseName', workoutController.searchExerciseVideos);

// Rutas de voz
router.post('/voice/process', voiceController.processVoiceInteraction);

export default router; 