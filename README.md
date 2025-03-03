# AI Fitness Assistant

Asistente de fitness impulsado por IA con recomendaciones de videos y procesamiento de voz.

## Características

- Generación de planes de entrenamiento personalizados
- Recomendaciones de videos de ejercicios
- Procesamiento de voz en tiempo real
- Integración con YouTube para contenido de ejercicios
- Almacenamiento de conversaciones y progreso del usuario

## Requisitos Previos

- Node.js >= 22.14.0
- Yarn >= 1.22.0
- Cuenta de Supabase
- Claves de API para:
  - YouTube Data API
  - Groq API
  - Deepgram API

## Instalación

1. Clonar el repositorio:
```bash
git clone <url-del-repositorio>
cd ai-fitness-assistant
```

2. Instalar dependencias:
```bash
yarn install
```

3. Configurar variables de entorno:
```bash
cp .env.example .env
```
Editar el archivo `.env` y completar las variables con tus claves:
- `SUPABASE_URL`
- `SUPABASE_KEY`
- `SUPABASE_SERVICE_KEY`
- `YOUTUBE_API_KEY`
- `GROQ_API_KEY`
- `DEEPGRAM_API_KEY`

4. Configurar Supabase:
- Crear un nuevo proyecto en Supabase
- Ejecutar el script SQL en `supabase/init.sql` en el editor SQL de Supabase

## Desarrollo

Iniciar el servidor en modo desarrollo:
```bash
yarn dev
```

## Producción

Iniciar el servidor en modo producción:
```bash
yarn start
```

## Scripts Disponibles

- `yarn dev` - Inicia el servidor en modo desarrollo con recarga automática
- `yarn start` - Inicia el servidor en modo producción
- `yarn test` - Ejecuta las pruebas

## API Endpoints

### Planes de Entrenamiento
- `POST /api/workout/generate` - Generar plan de entrenamiento
- `GET /api/workout/videos/:exerciseId` - Obtener videos para un ejercicio
- `GET /api/workout/recommended/:userId` - Obtener videos recomendados

### WebSocket Events
- `startStream` - Iniciar stream de audio
- `audioChunk` - Enviar chunk de audio
- `stopStream` - Detener stream de audio
- `transcriptionComplete` - Recibir transcripción y respuesta
- `audioResponse` - Recibir respuesta de audio

## Seguridad

- Autenticación mediante Supabase Auth
- Rate limiting configurado
- CORS habilitado
- Políticas RLS en Supabase
- Helmet para seguridad HTTP

## Solución de Problemas

Si encuentras algún error durante la instalación:

1. Limpiar la caché de Yarn:
```bash
yarn cache clean
```

2. Eliminar node_modules y volver a instalar:
```bash
rm -rf node_modules
yarn install
```

3. Verificar que las versiones de Node.js y Yarn sean las correctas:
```bash
node --version
yarn --version
```

## Licencia

MIT 