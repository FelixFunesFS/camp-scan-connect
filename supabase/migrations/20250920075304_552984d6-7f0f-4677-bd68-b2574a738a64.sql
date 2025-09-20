-- Delete all headphones station test records to reset to clean state
DELETE FROM station_transactions 
WHERE station_type = 'headphones';