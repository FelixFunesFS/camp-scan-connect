-- Add main_gate to station_type enum
ALTER TYPE station_type ADD VALUE IF NOT EXISTS 'main_gate';

-- Add gate_entry and gate_exit to transaction_type enum  
ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'gate_entry';
ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'gate_exit';