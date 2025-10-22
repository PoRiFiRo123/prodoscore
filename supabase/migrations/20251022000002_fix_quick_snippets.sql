ALTER TABLE public.quick_snippets
  DROP CONSTRAINT quick_snippets_judge_id_fkey,
  DROP CONSTRAINT quick_snippets_judge_id_shortcut_key,
  ADD COLUMN judge_id UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD CONSTRAINT quick_snippets_track_id_shortcut_judge_id_key UNIQUE (track_id, shortcut, judge_id);