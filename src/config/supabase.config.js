import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Cliente público (para operaciones del lado del cliente)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// Cliente con permisos de servicio (para operaciones administrativas)
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Definición de tablas
const TABLES = {
  USERS: 'users',
  WORKOUT_PLANS: 'workout_plans',
  EXERCISES: 'exercises',
  EXERCISE_VIDEOS: 'exercise_videos',
  NUTRITION_PLANS: 'nutrition_plans',
  MEALS: 'meals',
  FOODS: 'foods',
  CONVERSATIONS: 'conversations',
  MESSAGES: 'messages'
};

class SupabaseService {
  // Workout Plans
  async createWorkoutPlan({ userId, name, duration, difficulty, exercises }) {
    const { data: workoutPlan, error: workoutError } = await supabase
      .from(TABLES.WORKOUT_PLANS)
      .insert({
        user_id: userId,
        name,
        duration,
        difficulty,
        created_at: new Date(),
        updated_at: new Date()
      })
      .select()
      .single();

    if (workoutError) throw workoutError;

    // Crear ejercicios asociados
    if (exercises && exercises.length > 0) {
      const { error: exercisesError } = await supabase
        .from(TABLES.EXERCISES)
        .insert(
          exercises.map(exercise => ({
            workout_plan_id: workoutPlan.id,
            ...exercise,
            created_at: new Date(),
            updated_at: new Date()
          }))
        );

      if (exercisesError) throw exercisesError;
    }

    return workoutPlan;
  }

  // Exercise Videos
  async findOrFetchVideos(exerciseId, difficulty, limit = 3) {
    // Buscar videos existentes
    const { data: existingVideos, error: searchError } = await supabase
      .from(TABLES.EXERCISE_VIDEOS)
      .select('*')
      .eq('exercise_id', exerciseId)
      .order('quality', { ascending: false })
      .limit(limit);

    if (searchError) throw searchError;

    return existingVideos;
  }

  async createExerciseVideo(videoData) {
    const { data, error } = await supabase
      .from(TABLES.EXERCISE_VIDEOS)
      .insert({
        ...videoData,
        created_at: new Date(),
        updated_at: new Date()
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateVideoMetrics(videoId, metrics) {
    const { data, error } = await supabase
      .from(TABLES.EXERCISE_VIDEOS)
      .update({
        ...metrics,
        updated_at: new Date()
      })
      .eq('id', videoId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Conversations
  async saveConversation(userId, userMessage, assistantMessage) {
    const { data: conversation, error: convError } = await supabase
      .from(TABLES.CONVERSATIONS)
      .insert({
        user_id: userId,
        created_at: new Date(),
        updated_at: new Date()
      })
      .select()
      .single();

    if (convError) throw convError;

    const { error: msgError } = await supabase
      .from(TABLES.MESSAGES)
      .insert([
        {
          conversation_id: conversation.id,
          content: userMessage,
          role: 'user',
          created_at: new Date()
        },
        {
          conversation_id: conversation.id,
          content: assistantMessage,
          role: 'assistant',
          created_at: new Date()
        }
      ]);

    if (msgError) throw msgError;
    return conversation;
  }

  // User Context
  async getUserContext(userId) {
    const { data: user, error: userError } = await supabase
      .from(TABLES.USERS)
      .select(`
        *,
        workout_plans (
          *,
          exercises (*)
        ),
        conversations (
          *,
          messages (*)
        )
      `)
      .eq('id', userId)
      .single();

    if (userError) throw userError;
    return user;
  }
}

export const supabaseService = new SupabaseService();
export { supabase, supabaseAdmin, TABLES }; 