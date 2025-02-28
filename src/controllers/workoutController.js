import { PrismaClient } from '@prisma/client';
import { fitnessChain } from '../config/langchain.config.js';
import { videoService } from '../services/videoService.js';

const prisma = new PrismaClient();

class WorkoutController {
  async generateWorkoutPlan(req, res) {
    try {
      const { userId, goals, fitnessLevel, duration } = req.body;

      // Generar plan con LangChain
      const result = await fitnessChain.call({
        userContext: `Nivel de fitness: ${fitnessLevel}, Objetivos: ${goals.join(', ')}`,
        userInput: `Genera un plan de entrenamiento para ${duration} minutos`
      });

      // Crear plan en la base de datos
      const workoutPlan = await prisma.workoutPlan.create({
        data: {
          userId,
          name: `Plan personalizado - ${new Date().toLocaleDateString()}`,
          duration,
          difficulty: fitnessLevel,
          exercises: {
            create: result.exercises.map(exercise => ({
              name: exercise.name,
              sets: exercise.sets,
              reps: exercise.reps,
              instructions: exercise.instructions
            }))
          }
        },
        include: {
          exercises: true
        }
      });

      res.json(workoutPlan);
    } catch (error) {
      console.error('Error generando plan de entrenamiento:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  async getExerciseVideos(req, res) {
    try {
      const { exerciseId } = req.params;
      const { difficulty = 'intermedio', limit = 3 } = req.query;

      const videos = await videoService.findOrFetchVideos(
        exerciseId,
        difficulty,
        parseInt(limit)
      );

      res.json(videos);
    } catch (error) {
      console.error('Error obteniendo videos:', error);
      res.status(500).json({ error: 'Error obteniendo videos de ejercicios' });
    }
  }

  async getRecommendedVideos(req, res) {
    try {
      const { userId } = req.params;
      const { fitnessLevel, limit = 5 } = req.query;

      const videos = await videoService.getRecommendedVideos(
        userId,
        fitnessLevel,
        parseInt(limit)
      );

      res.json(videos);
    } catch (error) {
      console.error('Error obteniendo videos recomendados:', error);
      res.status(500).json({ error: 'Error obteniendo videos recomendados' });
    }
  }
}

export const workoutController = new WorkoutController(); 