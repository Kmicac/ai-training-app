import { ChatGroq } from 'langchain/chat_models/groq';
import { PromptTemplate } from 'langchain/prompts';
import { LLMChain } from 'langchain/chains';

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

const fitnessChain = new LLMChain({
  llm: chatModel,
  prompt: fitnessAssistantPrompt,
});

export {
  chatModel,
  fitnessChain,
  fitnessAssistantPrompt
}; 