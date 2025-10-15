-- Fix search_path for calculate_team_score function
CREATE OR REPLACE FUNCTION public.calculate_team_score(_team_id UUID)
RETURNS DECIMAL
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(score), 0)
  FROM public.scores
  WHERE team_id = _team_id
$$;