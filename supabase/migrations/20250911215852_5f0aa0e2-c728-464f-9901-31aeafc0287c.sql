-- Insert 5 sample attendees for testing
INSERT INTO public.attendees (first_name, last_name, email, phone, regfox_id, ticket_type, early_access, override_early_checkin, notes, arrival_window) VALUES
('Sarah', 'Johnson', 'sarah.johnson@example.com', '4045551234', '12346', 'premium_power', true, false, 'VIP guest, early arrival requested', 'early'),
('Mike', 'Chen', 'mike.chen@example.com', '4045551256', '12347', 'dry_site', false, false, 'First time attendee, needs assistance', 'standard'),
('Emma', 'Rodriguez', 'emma.rodriguez@example.com', '4045551278', '12348', 'day_pass', false, true, 'Override approved by management - family emergency', 'standard'),
('David', 'Thompson', 'david.thompson@example.com', '4045551290', '12349', 'staff', true, false, 'Security team member, full access', 'early'),
('Lisa', 'Anderson', 'lisa.anderson@example.com', '4045551301', '12350', 'vendor', false, false, 'Food truck vendor - Gate B setup', 'early');