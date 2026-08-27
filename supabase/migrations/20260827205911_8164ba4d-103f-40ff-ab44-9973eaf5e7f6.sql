ALTER TABLE public.waiver_signatures ADD COLUMN IF NOT EXISTS receipt_path text;
GRANT UPDATE (receipt_path) ON public.waiver_signatures TO anon, authenticated;
CREATE POLICY "Anyone can attach waiver receipt path"
ON public.waiver_signatures
FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);