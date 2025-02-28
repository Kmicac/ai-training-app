import { PrismaClient } from '@prisma/client';
import { fitnessChain } from '../config/langchain.config.js';
import youtube from '../config/youtube.config.js';

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

  async searchExerciseVideos(req, res) {
    try {
      const { exerciseName } = req.params;
      
      const response = await youtube.search.list({
        part: 'snippet',
        q: `${exerciseName} exercise tutorial`,
        type: 'video',
        maxResults: 3,
        videoEmbeddable: true
      });

      res.json(response.data.items);
    } catch (error) {
      console.error('Error buscando videos:', error);
      res.status(500).json({ error: 'Error buscando videos de ejercicios' });
    }
  }
}

export const workoutController = new WorkoutController(); 