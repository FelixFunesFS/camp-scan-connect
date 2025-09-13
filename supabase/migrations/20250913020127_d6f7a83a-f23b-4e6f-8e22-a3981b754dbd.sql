-- Phase 1: Data Cleanup and RLS Policy Fixes

-- Clear mock/test data
DELETE FROM public.station_transactions WHERE attendee_id IN (
  SELECT id FROM public.attendees WHERE regfox_id IS NULL OR regfox_id LIKE 'rf_%'
);

DELETE FROM public.scans WHERE rfid_uid IN (
  SELECT uid FROM public.rfid_tags WHERE attendee_id IN (
    SELECT id FROM public.attendees WHERE regfox_id IS NULL OR regfox_id LIKE 'rf_%'
  )
);

-- Reset all RFID tags to unissued status and clear attendee associations
UPDATE public.rfid_tags 
SET status = 'unissued', 
    attendee_id = NULL, 
    issued_at = NULL, 
    deactivated_at = NULL,
    reason = NULL;

-- Clear mock attendees (keeping structure for real RegFox data)
DELETE FROM public.attendees WHERE regfox_id IS NULL OR regfox_id LIKE 'rf_%';

-- Clear old sync logs with errors to start fresh
DELETE FROM public.regfox_sync_log WHERE status IN ('error', 'in_progress');

-- Fix RLS policies for attendees table to allow sync functions to INSERT
DROP POLICY IF EXISTS "Allow public read access to attendees" ON public.attendees;
DROP POLICY IF EXISTS "Allow public updates to attendees checkin status" ON public.attendees;

-- Create new RLS policies that allow sync operations
CREATE POLICY "Allow public read access to attendees" 
ON public.attendees FOR SELECT 
USING (true);

CREATE POLICY "Allow public updates to attendees" 
ON public.attendees FOR UPDATE 
USING (true);

CREATE POLICY "Allow sync functions to insert attendees" 
ON public.attendees FOR INSERT 
WITH CHECK (true);

-- Fix RFID tags RLS to allow INSERT operations for tag management
DROP POLICY IF EXISTS "Allow public read access to rfid_tags" ON public.rfid_tags;
DROP POLICY IF EXISTS "Allow public updates to rfid_tags" ON public.rfid_tags;

CREATE POLICY "Allow public read access to rfid_tags" 
ON public.rfid_tags FOR SELECT 
USING (true);

CREATE POLICY "Allow public updates to rfid_tags" 
ON public.rfid_tags FOR UPDATE 
USING (true);

CREATE POLICY "Allow public insert to rfid_tags" 
ON public.rfid_tags FOR INSERT 
WITH CHECK (true);