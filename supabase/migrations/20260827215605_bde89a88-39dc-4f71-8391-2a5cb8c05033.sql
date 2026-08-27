-- Normalize stored credential codes: trim + uppercase, skipping collisions
UPDATE public.rfid_tags t
   SET uid = upper(trim(t.uid))
 WHERE t.uid <> upper(trim(t.uid))
   AND NOT EXISTS (
     SELECT 1 FROM public.rfid_tags o
      WHERE o.uid = upper(trim(t.uid))
   );

-- Fast case-insensitive lookups by scanned code
CREATE INDEX IF NOT EXISTS rfid_tags_uid_upper_idx
  ON public.rfid_tags (upper(uid));