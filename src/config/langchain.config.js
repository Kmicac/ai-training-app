import dotenv from 'dotenv';
import { ChatGroq } from '@langchain/groq';
import { PromptTemplate } from '@langchain/core/prompts';
import { RunnableSequence } from '@langchain/core/runnables';

// Cargar variables de entorno
dotenv.config();

if (!process.env.GROQ_API_KEY) {
  throw new Error('GROQ_API_KEY no encontrada en el archivo .env');
}

const chatModel = new ChatGroq({
  apiKey: process.env.GROQ_API_KEY,
  model: "mixtral-8x7b-32768", // Usando Mixtral como modelo base
  temperature: 0.7,
});

// Plantilla mejorada para el asistente de fitness
const fitnessAssistantPrompt = new PromptTemplate({
  template: `Eres un experto entrenador personal y nutricionista con años de experiencia.
  
  Contexto del usuario: {userContext}
  Historial de entrenamiento: {trainingHistory}
  Pregunta o solicitud: {userInput}
  
  Proporciona una respuesta detallada y profesional que incluya:
  1. Evaluación del contexto
  2. Recomendaciones específicas y personalizadas
  3. Explicación científica de los beneficios
  4. Precauciones o consideraciones importantes
  
  Mantén un tono motivador y profesional.`,
  inputVariables: ['userContext', 'trainingHistory', 'userInput'],
});

const fitnessChain = RunnableSequence.from([
  fitnessAssistantPrompt,
  chatModel
]);

export {
  chatModel,
  fitnessChain,
  fitnessAssistantPrompt
}; 