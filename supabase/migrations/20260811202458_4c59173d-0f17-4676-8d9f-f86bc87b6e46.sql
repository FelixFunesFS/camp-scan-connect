ALTER TABLE public.rfid_tags
  ADD COLUMN IF NOT EXISTS credential_type text NOT NULL DEFAULT 'rfid';

ALTER TABLE public.rfid_tags
  DROP CONSTRAINT IF EXISTS rfid_tags_credential_type_check;

ALTER TABLE public.rfid_tags
  ADD CONSTRAINT rfid_tags_credential_type_check
  CHECK (credential_type IN ('rfid', 'barcode', 'qr'));

CREATE INDEX IF NOT EXISTS rfid_tags_credential_type_idx
  ON public.rfid_tags (credential_type);