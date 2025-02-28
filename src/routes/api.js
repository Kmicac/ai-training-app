import { Router } from 'express';
import { workoutController } from '../controllers/workoutController.js';
import { voiceController } from '../controllers/voiceController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = Router();

// Rutas protegidas de entrenamiento
router.use('/workout', protect);
router.post('/workout/generate', workoutController.generateWorkoutPlan);
router.get('/workout/exercise/:exerciseId/videos', workoutController.getExerciseVideos);
router.get('/workout/user/:userId/recommended-videos', workoutController.getRecommendedVideos);

// Rutas de voz
router.post('/voice/process', voiceController.processVoiceInteraction);

export default router; 