-- Habilitar la extensión pgvector para embeddings
create extension if not exists vector;

-- Tabla de usuarios
create table public.users (
  id uuid references auth.users not null primary key,
  email text unique,
  full_name text,
  fitness_level text,
  goals text[],
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Tabla de planes de entrenamiento
create table public.workout_plans (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade,
  name text not null,
  duration integer not null,
  difficulty text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Tabla de ejercicios
create table public.exercises (
  id uuid default uuid_generate_v4() primary key,
  workout_plan_id uuid references public.workout_plans(id) on delete cascade,
  name text not null,
  sets integer,
  reps integer,
  instructions text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Tabla de videos de ejercicios
create table public.exercise_videos (
  id uuid default uuid_generate_v4() primary key,
  exercise_id uuid references public.exercises(id) on delete cascade,
  youtube_id text unique not null,
  title text not null,
  description text,
  thumbnail text,
  duration text,
  views integer default 0,
  likes integer default 0,
  quality float default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Tabla de conversaciones
create table public.conversations (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Tabla de mensajes
create table public.messages (
  id uuid default uuid_generate_v4() primary key,
  conversation_id uuid references public.conversations(id) on delete cascade,
  content text not null,
  role text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Índices para mejorar el rendimiento
create index idx_workout_plans_user_id on public.workout_plans(user_id);
create index idx_exercises_workout_plan_id on public.exercises(workout_plan_id);
create index idx_exercise_videos_exercise_id on public.exercise_videos(exercise_id);
create index idx_messages_conversation_id on public.messages(conversation_id);

-- Políticas RLS
alter table public.users enable row level security;
alter table public.workout_plans enable row level security;
alter table public.exercises enable row level security;
alter table public.exercise_videos enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;

-- Políticas para usuarios
create policy "Users can read their own data"
  on public.users for select
  using (auth.uid() = id);

create policy "Users can update their own data"
  on public.users for update
  using (auth.uid() = id);

-- Políticas para planes de entrenamiento
create policy "Users can CRUD their own workout plans"
  on public.workout_plans for all
  using (auth.uid() = user_id);

-- Políticas para ejercicios
create policy "Users can CRUD exercises in their workout plans"
  on public.exercises for all
  using (
    exists (
      select 1 from public.workout_plans
      where id = workout_plan_id
      and user_id = auth.uid()
    )
  );

-- Políticas para videos
create policy "Anyone can read exercise videos"
  on public.exercise_videos for select
  to authenticated
  using (true);

-- Políticas para conversaciones
create policy "Users can CRUD their own conversations"
  on public.conversations for all
  using (auth.uid() = user_id);

-- Políticas para mensajes
create policy "Users can read messages from their conversations"
  on public.messages for select
  using (
    exists (
      select 1 from public.conversations
      where id = conversation_id
      and user_id = auth.uid()
    )
  ); 