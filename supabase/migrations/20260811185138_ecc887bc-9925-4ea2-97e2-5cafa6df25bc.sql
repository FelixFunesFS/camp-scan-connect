
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;
ALTER FUNCTION public.cleanup_generated_rfids() SET search_path = public;
ALTER FUNCTION public.authenticate_staff_code(text) SET search_path = public;
ALTER FUNCTION public.cleanup_abandoned_records() SET search_path = public;
ALTER FUNCTION public.format_phone_number(text) SET search_path = public;
