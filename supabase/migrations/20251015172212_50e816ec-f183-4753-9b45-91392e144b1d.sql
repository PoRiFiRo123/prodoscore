-- Add type and options columns to criteria table
ALTER TABLE public.criteria
ADD COLUMN type text NOT NULL DEFAULT 'text' CHECK (type IN ('text', 'dropdown')),
ADD COLUMN options jsonb;

COMMENT ON COLUMN public.criteria.type IS 'Type of input: text (manual score entry) or dropdown (select from options)';
COMMENT ON COLUMN public.criteria.options IS 'For dropdown type: array of {label, score} objects';

-- Enable realtime for criteria
ALTER TABLE public.criteria REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.criteria;