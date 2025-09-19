-- Enable real-time updates for attendees and rfid_tags tables
-- This allows the assignment table to show live updates

-- Enable replica identity full for attendees table to capture complete row data
ALTER TABLE public.attendees REPLICA IDENTITY FULL;

-- Enable replica identity full for rfid_tags table to capture complete row data  
ALTER TABLE public.rfid_tags REPLICA IDENTITY FULL;

-- Add tables to supabase_realtime publication for real-time functionality
ALTER PUBLICATION supabase_realtime ADD TABLE public.attendees;
ALTER PUBLICATION supabase_realtime ADD TABLE public.rfid_tags;