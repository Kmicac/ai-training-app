import { OpenAI } from '@langchain/openai';
import { PromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { RunnableSequence } from '@langchain/core/runnables';

class GroqService {
  #llm;
  #defaultTemplate;
  #chain;

  constructor() {
    this.#llm = new OpenAI({
      baseURL: 'https://api.groq.com/openai/v1',
      apiKey: process.env.GROQ_API_KEY,
      modelName: 'llama-3.2-11b-vision-preview',
      temperature: 0.7,
      streaming: true
    });

    this.#defaultTemplate = PromptTemplate.fromTemplate(`
      Eres un asistente de fitness profesional y amigable. Utiliza el siguiente contexto para responder:
      
      Contexto del usuario: {userContext}
      Historial de entrenamiento: {trainingHistory}
      Historial de conversación: {conversationHistory}
      
      Pregunta del usuario: {userInput}
      
      Responde de manera natural, motivadora y específica al contexto del usuario.
    `);

    this.#chain = RunnableSequence.from([
      this.#defaultTemplate,
      this.#llm,
      new StringOutputParser()
    ]);
  }

  async generateResponse({
    userContext,
    trainingHistory,
    conversationHistory,
    userInput
  }) {
    try {
      const response = await this.#chain.invoke({
        userContext,
        trainingHistory,
        conversationHistory,
        userInput
      });

      return {
        text: response,
        metadata: {
          model: 'llama-3.2-11b-vision-preview',
          type: 'fitness_response'
        }
      };
    } catch (error) {
      console.error('Error generando respuesta con Groq:', error);
      throw new Error('Error al generar respuesta de IA');
    }
  }

  async streamResponse({
    userContext,
    trainingHistory,
    conversationHistory,
    userInput,
    callbacks
  }) {
    try {
      const stream = await this.#chain.stream({
        userContext,
        trainingHistory,
        conversationHistory,
        userInput
      });

      for await (const chunk of stream) {
        if (callbacks?.onToken) {
          callbacks.onToken(chunk);
        }
      }
    } catch (error) {
      console.error('Error en streaming de respuesta Groq:', error);
      throw new Error('Error en streaming de respuesta de IA');
    }
  }
}

export const groqService = new GroqService(); 