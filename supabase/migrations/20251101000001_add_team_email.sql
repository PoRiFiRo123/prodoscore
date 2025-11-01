-- Add email field to teams table
ALTER TABLE public.teams
  ADD COLUMN email TEXT;

-- Add check constraint for email format (basic validation)
ALTER TABLE public.teams
  ADD CONSTRAINT teams_email_check CHECK (
    email IS NULL OR
    email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$'
  );

-- Create index for email lookups
CREATE INDEX idx_teams_email ON public.teams(email);

-- Add comment
COMMENT ON COLUMN public.teams.email IS 'Contact email for the team';
