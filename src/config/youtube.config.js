import { google } from 'googleapis';

class YouTubeService {
  #client;
  #defaultOptions;

  constructor() {
    this.#client = google.youtube({
      version: 'v3',
      auth: process.env.YOUTUBE_API_KEY
    });

    this.#defaultOptions = {
      part: 'snippet',
      type: 'video',
      videoEmbeddable: true,
      maxResults: 10,
      safeSearch: 'moderate',
      relevanceLanguage: 'es'
    };
  }

  async searchVideos(query, options = {}) {
    try {
      const response = await this.#client.search.list({
        ...this.#defaultOptions,
        ...options,
        q: query
      });

      return response.data.items;
    } catch (error) {
      console.error('Error en búsqueda de YouTube:', error);
      throw new Error('Error al buscar videos en YouTube');
    }
  }

  async getVideoDetails(videoId) {
    try {
      const response = await this.#client.videos.list({
        part: 'snippet,contentDetails,statistics',
        id: videoId
      });

      return response.data.items[0];
    } catch (error) {
      console.error('Error obteniendo detalles del video:', error);
      throw new Error('Error al obtener detalles del video');
    }
  }
}

export const youtubeService = new YouTubeService(); 