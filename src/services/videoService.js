import { PrismaClient } from '@prisma/client';
import { youtubeService } from '../config/youtube.config.js';

const prisma = new PrismaClient();

class VideoService {
  #calculateQualityScore(views, likes) {
    // Fórmula simple para calcular la calidad del video
    // Podemos ajustar estos pesos según necesitemos
    const viewsWeight = 0.6;
    const likesWeight = 0.4;
    
    // Normalizar valores (asumiendo que 100k vistas y 10k likes son valores máximos)
    const normalizedViews = Math.min(views / 100000, 1);
    const normalizedLikes = Math.min(likes / 10000, 1);
    
    return (normalizedViews * viewsWeight + normalizedLikes * likesWeight) * 100;
  }

  async findOrFetchVideos(exerciseId, difficulty, limit = 3) {
    // Primero intentar obtener videos de nuestra base de datos
    let videos = await prisma.exerciseVideo.findMany({
      where: { exerciseId },
      orderBy: { quality: 'desc' },
      take: limit
    });

    // Si no hay suficientes videos, buscar en YouTube
    if (videos.length < limit) {
      const exercise = await prisma.exercise.findUnique({
        where: { id: exerciseId }
      });

      if (!exercise) {
        throw new Error('Ejercicio no encontrado');
      }

      const searchQuery = `${exercise.name} ${difficulty} fitness tutorial`;
      const youtubeVideos = await youtubeService.searchVideos(searchQuery, {
        maxResults: limit - videos.length
      });

      // Procesar y guardar los nuevos videos
      const newVideos = await Promise.all(
        youtubeVideos.map(async (video) => {
          const details = await youtubeService.getVideoDetails(video.id.videoId);
          
          return prisma.exerciseVideo.create({
            data: {
              exerciseId,
              youtubeId: video.id.videoId,
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
            }
          });
        })
      );

      videos = [...videos, ...newVideos];
    }

    return videos;
  }

  async updateVideoMetrics(videoId) {
    const video = await prisma.exerciseVideo.findUnique({
      where: { id: videoId }
    });

    if (!video) {
      throw new Error('Video no encontrado');
    }

    const details = await youtubeService.getVideoDetails(video.youtubeId);
    
    return await prisma.exerciseVideo.update({
      where: { id: videoId },
      data: {
        views: parseInt(details.statistics.viewCount),
        likes: parseInt(details.statistics.likeCount),
        quality: this.#calculateQualityScore(
          parseInt(details.statistics.viewCount),
          parseInt(details.statistics.likeCount)
        ),
        updatedAt: new Date()
      }
    });
  }

  async syncVideoData(hours = 24) {
    const videos = await prisma.exerciseVideo.findMany({
      where: {
        updatedAt: {
          lt: new Date(Date.now() - hours * 60 * 60 * 1000)
        }
      }
    });

    return await Promise.all(
      videos.map(video => this.updateVideoMetrics(video.id))
    );
  }

  async getRecommendedVideos(userId, fitnessLevel, limit = 5) {
    return await prisma.exerciseVideo.findMany({
      where: {
        exercise: {
          workoutPlan: {
            difficulty: fitnessLevel,
            userId
          }
        }
      },
      orderBy: [
        { quality: 'desc' },
        { views: 'desc' }
      ],
      take: limit
    });
  }
}

export const videoService = new VideoService(); 