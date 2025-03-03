import { fitnessChain } from '../config/langchain.config.js';
import { supabaseService } from '../config/supabase.config.js';
import { youtubeService } from '../config/youtube.config.js';

class WorkoutController {
  async generateWorkoutPlan(req, res) {
    try {
      const { userId, goals, fitnessLevel, duration } = req.body;

      // Generar plan con LangChain
      const result = await fitnessChain.call({
        userContext: `Nivel de fitness: ${fitnessLevel}, Objetivos: ${goals.join(', ')}`,
        userInput: `Genera un plan de entrenamiento para ${duration} minutos`
      });

      // Crear plan en Supabase
      const workoutPlan = await supabaseService.createWorkoutPlan({
        userId,
        name: `Plan personalizado - ${new Date().toLocaleDateString()}`,
        duration,
        difficulty: fitnessLevel,
        exercises: result.exercises.map(exercise => ({
          name: exercise.name,
          sets: exercise.sets,
          reps: exercise.reps,
          instructions: exercise.instructions
        }))
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

      // Buscar videos existentes en Supabase
      let videos = await supabaseService.findOrFetchVideos(exerciseId, difficulty, parseInt(limit));

      // Si no hay suficientes videos, buscar en YouTube
      if (!videos || videos.length < limit) {
        const neededVideos = limit - (videos?.length || 0);
        const youtubeResults = await youtubeService.searchVideos(
          `${difficulty} fitness exercise tutorial`,
          { maxResults: neededVideos }
        );

        // Procesar y guardar los nuevos videos
        const newVideos = await Promise.all(
          youtubeResults.map(async (video) => {
            const details = await youtubeService.getVideoDetails(video.id.videoId);
            
            return supabaseService.createExerciseVideo({
              exercise_id: exerciseId,
              youtube_id: video.id.videoId,
              title: video.snippet.title,
              description: video.snippet.description,
              thumbnail: video.snippet.thumbnails.high.url,
              duration: details.contentDetails.duration,
              views: parseInt(details.statistics.viewCount),
              likes: parseInt(details.statistics.likeCount),
              quality: this.#calculateQualityScore(
                parseInt(details.statistics.viewCount),
                parseInt(details.statistics.likeCount)
              )
            });
          })
        );

        videos = [...(videos || []), ...newVideos];
      }

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

      const { data: videos, error } = await supabase
        .from('exercise_videos')
        .select(`
          *,
          exercise:exercises (
            workout_plan:workout_plans (
              difficulty,
              user_id
            )
          )
        `)
        .eq('exercise.workout_plan.difficulty', fitnessLevel)
        .eq('exercise.workout_plan.user_id', userId)
        .order('quality', { ascending: false })
        .order('views', { ascending: false })
        .limit(parseInt(limit));

      if (error) throw error;
      res.json(videos);
    } catch (error) {
      console.error('Error obteniendo videos recomendados:', error);
      res.status(500).json({ error: 'Error obteniendo videos recomendados' });
    }
  }

  #calculateQualityScore(views, likes) {
    const viewsWeight = 0.6;
    const likesWeight = 0.4;
    const normalizedViews = Math.min(views / 100000, 1);
    const normalizedLikes = Math.min(likes / 10000, 1);
    return (normalizedViews * viewsWeight + normalizedLikes * likesWeight) * 100;
  }
}

export const workoutController = new WorkoutController(); 