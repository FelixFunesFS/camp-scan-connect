CREATE OR REPLACE FUNCTION public.force_gate_entry_only()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.transaction_type = 'gate_exit' THEN
    NEW.transaction_type := 'gate_entry';
    NEW.current_status := 'on_site';
    NEW.extra_data := COALESCE(NEW.extra_data, '{}'::jsonb) || jsonb_build_object('action','entry','converted_from','gate_exit');
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_force_gate_entry_only ON public.station_transactions;
CREATE TRIGGER trg_force_gate_entry_only BEFORE INSERT OR UPDATE ON public.station_transactions
FOR EACH ROW EXECUTE FUNCTION public.force_gate_entry_only();
UPDATE public.station_transactions SET transaction_type = 'gate_exit' WHERE false;