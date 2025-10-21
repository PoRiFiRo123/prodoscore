-- Drop existing policies and table
DROP POLICY IF EXISTS "Judges can view own snippets" ON public.quick_snippets;
DROP POLICY IF EXISTS "Judges can insert own snippets" ON public.quick_snippets;
DROP POLICY IF EXISTS "Judges can update own snippets" ON public.quick_snippets;
DROP POLICY IF EXISTS "Judges can delete own snippets" ON public.quick_snippets;
DROP POLICY IF EXISTS "Admins can manage all snippets" ON public.quick_snippets;
DROP TRIGGER IF EXISTS update_quick_snippets_updated_at ON public.quick_snippets;
DROP TABLE IF EXISTS public.quick_snippets CASCADE;

-- Create quick_snippets table
CREATE TABLE public.quick_snippets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  judge_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shortcut TEXT NOT NULL,
  full_text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(judge_id, shortcut)
);

-- Enable RLS
ALTER TABLE public.quick_snippets ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Judges can view own snippets"
ON public.quick_snippets
FOR SELECT
USING (auth.uid() = judge_id);

CREATE POLICY "Judges can insert own snippets"
ON public.quick_snippets
FOR INSERT
WITH CHECK (auth.uid() = judge_id);

CREATE POLICY "Judges can update own snippets"
ON public.quick_snippets
FOR UPDATE
USING (auth.uid() = judge_id);

CREATE POLICY "Judges can delete own snippets"
ON public.quick_snippets
FOR DELETE
USING (auth.uid() = judge_id);

CREATE POLICY "Admins can manage all snippets"
ON public.quick_snippets
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger to update updated_at
CREATE TRIGGER update_quick_snippets_updated_at
  BEFORE UPDATE ON public.quick_snippets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create storage bucket for now_presenting
INSERT INTO storage.buckets (id, name, public)
VALUES ('now_presenting', 'now_presenting', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Anyone can view now_presenting"
ON storage.objects
FOR SELECT
USING (bucket_id = 'now_presenting');

CREATE POLICY "Authenticated can upload now_presenting"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'now_presenting' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated can update now_presenting"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'now_presenting' AND auth.role() = 'authenticated');