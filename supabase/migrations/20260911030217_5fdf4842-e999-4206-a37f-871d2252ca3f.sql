ALTER TABLE public.regfox_webhook_deliveries DROP CONSTRAINT regfox_webhook_deliveries_status_check;
ALTER TABLE public.regfox_webhook_deliveries ADD CONSTRAINT regfox_webhook_deliveries_status_check CHECK (status = ANY (ARRAY['received','processing','processed','ignored','deferred','error']));
ALTER TABLE public.regfox_webhook_deliveries ALTER COLUMN regfox_form_id DROP NOT NULL;