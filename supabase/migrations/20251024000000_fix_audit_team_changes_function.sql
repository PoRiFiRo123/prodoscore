-- Drop existing triggers
DROP TRIGGER IF EXISTS audit_teams_delete ON public.teams;
DROP TRIGGER IF EXISTS audit_teams_insert ON public.teams;
DROP TRIGGER IF EXISTS audit_teams_update ON public.teams;

-- Drop the old audit_team_changes function
DROP FUNCTION IF EXISTS public.audit_team_changes();

-- Recreate the audit_team_changes function to use auth.uid() for judge_id
CREATE OR REPLACE FUNCTION public.audit_team_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    log_entry JSONB;
    performer_uid UUID; -- Declare a variable for the user ID
BEGIN
    -- Get the authenticated user's UID
    performer_uid := auth.uid();

    log_entry := jsonb_build_object(
        'timestamp', NOW(),
        'action', TG_OP,
        'entity', 'team',
        'entity_id', CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END,
        'previous_state', CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE row_to_json(OLD) END,
        'new_state', CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE row_to_json(NEW) END,
        'performer_uid', performer_uid -- Include the UID of the user who performed the action
    );

    -- Use the performer_uid for the audit log, if append_judge_audit_log exists and takes it.
    -- If append_judge_audit_log is specific to 'judges', you might need a different audit log function for general admin actions.
    -- For now, assuming append_judge_audit_log can take any user's UUID.
    IF performer_uid IS NOT NULL THEN
        PERFORM append_judge_audit_log(performer_uid, log_entry);
    END IF;
    
    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

-- Recreate triggers
CREATE TRIGGER audit_teams_delete
AFTER DELETE ON public.teams
FOR EACH ROW
EXECUTE FUNCTION public.audit_team_changes();

CREATE TRIGGER audit_teams_insert
AFTER INSERT ON public.teams
FOR EACH ROW
EXECUTE FUNCTION public.audit_team_changes();

CREATE TRIGGER audit_teams_update
AFTER UPDATE ON public.teams
FOR EACH ROW
EXECUTE FUNCTION public.audit_team_changes();
