ALTER TABLE public.profiles
ADD COLUMN audit_logs JSONB DEFAULT '[]'::JSONB;

CREATE POLICY "Admins can update own audit_logs" ON public.profiles FOR UPDATE USING (auth.uid() = id AND public.has_role(auth.uid(), 'admin')) WITH CHECK (auth.uid() = id AND public.has_role(auth.uid(), 'admin'));