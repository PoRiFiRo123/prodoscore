-- Add check-in fields to teams table
ALTER TABLE public.teams
  ADD COLUMN checked_in BOOLEAN DEFAULT false,
  ADD COLUMN checked_in_at TIMESTAMPTZ,
  ADD COLUMN checked_in_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN qr_token TEXT UNIQUE DEFAULT gen_random_uuid()::text;

-- Create index for faster queries on checked_in status
CREATE INDEX idx_teams_checked_in ON public.teams(checked_in);

-- Create index for qr_token lookups
CREATE INDEX idx_teams_qr_token ON public.teams(qr_token);

-- Update RLS policies to allow check-in updates
-- Admins can update check-in status
CREATE POLICY "Admins can update check-in status" ON public.teams
  FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Function to check in a team
CREATE OR REPLACE FUNCTION public.check_in_team(
  _qr_token TEXT,
  _admin_id UUID
)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT,
  team_id UUID,
  team_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _team RECORD;
BEGIN
  -- Verify admin role
  IF NOT public.has_role(_admin_id, 'admin') THEN
    RETURN QUERY SELECT false, 'Unauthorized: Admin role required'::TEXT, NULL::UUID, NULL::TEXT;
    RETURN;
  END IF;

  -- Find team by QR token
  SELECT id, name, checked_in INTO _team
  FROM public.teams
  WHERE qr_token = _qr_token;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Invalid QR code'::TEXT, NULL::UUID, NULL::TEXT;
    RETURN;
  END IF;

  -- Check if already checked in
  IF _team.checked_in THEN
    RETURN QUERY SELECT false, 'Team already checked in'::TEXT, _team.id, _team.name;
    RETURN;
  END IF;

  -- Check in the team
  UPDATE public.teams
  SET
    checked_in = true,
    checked_in_at = now(),
    checked_in_by = _admin_id
  WHERE qr_token = _qr_token;

  RETURN QUERY SELECT true, 'Check-in successful'::TEXT, _team.id, _team.name;
END;
$$;

-- Function to manually toggle check-in status
CREATE OR REPLACE FUNCTION public.toggle_team_checkin(
  _team_id UUID,
  _admin_id UUID,
  _checked_in BOOLEAN
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify admin role
  IF NOT public.has_role(_admin_id, 'admin') THEN
    RETURN false;
  END IF;

  UPDATE public.teams
  SET
    checked_in = _checked_in,
    checked_in_at = CASE WHEN _checked_in THEN now() ELSE NULL END,
    checked_in_by = CASE WHEN _checked_in THEN _admin_id ELSE NULL END
  WHERE id = _team_id;

  RETURN true;
END;
$$;
