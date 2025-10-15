-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'judge');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Create tracks table
CREATE TABLE public.tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.tracks ENABLE ROW LEVEL SECURITY;

-- Create rooms table
CREATE TABLE public.rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  track_id UUID REFERENCES public.tracks(id) ON DELETE CASCADE NOT NULL,
  is_locked BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(name, track_id)
);

ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;

-- Create teams table
CREATE TABLE public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  team_number TEXT NOT NULL UNIQUE,
  track_id UUID REFERENCES public.tracks(id) ON DELETE CASCADE NOT NULL,
  room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE NOT NULL,
  members TEXT[],
  college TEXT,
  total_score DECIMAL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

-- Create criteria table
CREATE TABLE public.criteria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  max_score INTEGER NOT NULL CHECK (max_score > 0),
  weightage DECIMAL DEFAULT 1.0,
  track_id UUID REFERENCES public.tracks(id) ON DELETE CASCADE,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.criteria ENABLE ROW LEVEL SECURITY;

-- Create judge_assignments table
CREATE TABLE public.judge_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  judge_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(judge_id, room_id)
);

ALTER TABLE public.judge_assignments ENABLE ROW LEVEL SECURITY;

-- Create scores table
CREATE TABLE public.scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  judge_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  criterion_id UUID REFERENCES public.criteria(id) ON DELETE CASCADE NOT NULL,
  score DECIMAL NOT NULL CHECK (score >= 0),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(team_id, judge_id, criterion_id)
);

ALTER TABLE public.scores ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- RLS Policies for user_roles
CREATE POLICY "Anyone can view user roles" ON public.user_roles FOR SELECT USING (true);
CREATE POLICY "Only admins can manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for tracks
CREATE POLICY "Anyone can view tracks" ON public.tracks FOR SELECT USING (true);
CREATE POLICY "Only admins can manage tracks" ON public.tracks FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for rooms
CREATE POLICY "Anyone can view rooms" ON public.rooms FOR SELECT USING (true);
CREATE POLICY "Only admins can manage rooms" ON public.rooms FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for teams
CREATE POLICY "Anyone can view teams" ON public.teams FOR SELECT USING (true);
CREATE POLICY "Only admins can manage teams" ON public.teams FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for criteria
CREATE POLICY "Anyone can view criteria" ON public.criteria FOR SELECT USING (true);
CREATE POLICY "Only admins can manage criteria" ON public.criteria FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for judge_assignments
CREATE POLICY "Anyone can view judge assignments" ON public.judge_assignments FOR SELECT USING (true);
CREATE POLICY "Only admins can manage assignments" ON public.judge_assignments FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for scores
CREATE POLICY "Anyone can view scores" ON public.scores FOR SELECT USING (true);
CREATE POLICY "Judges can insert/update their own scores" ON public.scores 
  FOR ALL 
  USING (
    auth.uid() = judge_id AND 
    public.has_role(auth.uid(), 'judge')
  );
CREATE POLICY "Admins can manage all scores" ON public.scores FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$;

-- Trigger for new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Function to update team total scores
CREATE OR REPLACE FUNCTION public.calculate_team_score(_team_id UUID)
RETURNS DECIMAL
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(SUM(score), 0)
  FROM public.scores
  WHERE team_id = _team_id
$$;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Trigger for profiles updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for scores updated_at
CREATE TRIGGER update_scores_updated_at
  BEFORE UPDATE ON public.scores
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();