-- Add passcode to rooms
ALTER TABLE public.rooms ADD COLUMN passcode text;

-- Add judge_name to scores and make judge_id nullable
ALTER TABLE public.scores ADD COLUMN judge_name text;
ALTER TABLE public.scores ALTER COLUMN judge_id DROP NOT NULL;

-- Update RLS policy for scores to allow anonymous judges
DROP POLICY IF EXISTS "Judges can insert/update their own scores" ON public.scores;

CREATE POLICY "Anyone with room access can manage scores"
ON public.scores
FOR ALL
USING (true)
WITH CHECK (true);

-- Add display_order to criteria if not exists (for proper ordering)
ALTER TABLE public.criteria ADD COLUMN IF NOT EXISTS display_order integer DEFAULT 0;