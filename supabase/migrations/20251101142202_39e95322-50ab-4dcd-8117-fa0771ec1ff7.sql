-- Create function to handle team check-in via QR code
CREATE OR REPLACE FUNCTION public.check_in_team(
  _qr_token TEXT,
  _admin_id UUID
)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT,
  team_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_team_id UUID;
  v_team_name TEXT;
  v_already_checked_in BOOLEAN;
BEGIN
  -- Find the team with this QR token
  SELECT id, name, checked_in 
  INTO v_team_id, v_team_name, v_already_checked_in
  FROM public.teams
  WHERE qr_token = _qr_token;

  -- Check if team exists
  IF v_team_id IS NULL THEN
    RETURN QUERY SELECT 
      FALSE, 
      'Invalid QR code - team not found'::TEXT,
      NULL::TEXT;
    RETURN;
  END IF;

  -- Check if already checked in
  IF v_already_checked_in THEN
    RETURN QUERY SELECT 
      FALSE, 
      'Team has already been checked in'::TEXT,
      v_team_name;
    RETURN;
  END IF;

  -- Update team check-in status
  UPDATE public.teams
  SET 
    checked_in = TRUE,
    checked_in_at = NOW(),
    checked_in_by = _admin_id
  WHERE id = v_team_id;

  -- Return success
  RETURN QUERY SELECT 
    TRUE, 
    'Check-in successful'::TEXT,
    v_team_name;
END;
$$;

-- Create function to toggle team check-in status (for manual override)
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
  -- Update team check-in status
  IF _checked_in THEN
    UPDATE public.teams
    SET 
      checked_in = TRUE,
      checked_in_at = NOW(),
      checked_in_by = _admin_id
    WHERE id = _team_id;
  ELSE
    UPDATE public.teams
    SET 
      checked_in = FALSE,
      checked_in_at = NULL,
      checked_in_by = NULL
    WHERE id = _team_id;
  END IF;

  RETURN TRUE;
END;
$$;