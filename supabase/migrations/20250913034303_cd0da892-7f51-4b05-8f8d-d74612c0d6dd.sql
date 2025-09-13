-- Add new ticket types to support RegFox accommodation types
ALTER TYPE ticket_type ADD VALUE 'glamping';
ALTER TYPE ticket_type ADD VALUE 'cabin';
ALTER TYPE ticket_type ADD VALUE 'rv_site';