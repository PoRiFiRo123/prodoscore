-- Add voting fields to teams table
ALTER TABLE public.teams
  ADD COLUMN voting_enabled BOOLEAN DEFAULT false,
  ADD COLUMN voting_opened_at TIMESTAMPTZ,
  ADD COLUMN completed BOOLEAN DEFAULT false,
  ADD COLUMN completed_at TIMESTAMPTZ;

-- Create public_votes table
CREATE TABLE public.public_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  criterion_id UUID REFERENCES public.criteria(id) ON DELETE CASCADE NOT NULL,
  score DECIMAL NOT NULL CHECK (score >= 0),
  session_id TEXT NOT NULL, -- Simple session tracking
  voted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(team_id, criterion_id, session_id)
);

-- Enable RLS
ALTER TABLE public.public_votes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for public_votes
-- Anyone can view public votes
CREATE POLICY "Anyone can view public votes" ON public.public_votes
  FOR SELECT USING (true);

-- Anyone can insert their own votes (we'll use session_id for tracking)
CREATE POLICY "Anyone can insert votes" ON public.public_votes
  FOR INSERT WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX idx_public_votes_team_id ON public.public_votes(team_id);
CREATE INDEX idx_public_votes_session_id ON public.public_votes(session_id);
CREATE INDEX idx_teams_voting_enabled ON public.teams(voting_enabled) WHERE voting_enabled = true;

-- Function to get average public vote score for a team
CREATE OR REPLACE FUNCTION public.get_team_public_score(_team_id UUID)
RETURNS DECIMAL
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(AVG(score), 0)
  FROM public.public_votes
  WHERE team_id = _team_id
$$;

-- Function to get average judge score for a team
CREATE OR REPLACE FUNCTION public.get_team_judge_score(_team_id UUID)
RETURNS DECIMAL
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(AVG(score), 0)
  FROM public.scores
  WHERE team_id = _team_id
$$;

-- Function to calculate weighted total score (90% judges + 10% public)
CREATE OR REPLACE FUNCTION public.get_team_weighted_score(_team_id UUID)
RETURNS DECIMAL
LANGUAGE sql
STABLE
AS $$
  SELECT
    (public.get_team_judge_score(_team_id) * 0.9) +
    (public.get_team_public_score(_team_id) * 0.1)
$$;

-- Function to get public vote count for a team
CREATE OR REPLACE FUNCTION public.get_team_vote_count(_team_id UUID)
RETURNS BIGINT
LANGUAGE sql
STABLE
AS $$
  SELECT COUNT(DISTINCT session_id)
  FROM public.public_votes
  WHERE team_id = _team_id
$$;

-- Function to check if a session has voted for a team
CREATE OR REPLACE FUNCTION public.has_voted_for_team(_team_id UUID, _session_id TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.public_votes
    WHERE team_id = _team_id AND session_id = _session_id
  )
$$;

-- Function to auto-enable voting after check-in (called by a trigger or manually)
CREATE OR REPLACE FUNCTION public.auto_enable_voting()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- If team just got checked in and voting is not enabled yet
  IF NEW.checked_in = true AND OLD.checked_in = false AND NEW.voting_enabled = false THEN
    -- Schedule voting to open after 1 minute (we'll handle this in the app layer)
    -- For now, just mark when check-in happened
    NEW.checked_in_at = NOW();
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger to auto-handle check-in timing
CREATE TRIGGER on_team_checked_in
  BEFORE UPDATE ON public.teams
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_enable_voting();

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION public.get_team_public_score(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_team_judge_score(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_team_weighted_score(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_team_vote_count(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_voted_for_team(UUID, TEXT) TO anon, authenticated;
