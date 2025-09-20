-- Clean up all existing headphone transaction records to start fresh
DELETE FROM station_transactions 
WHERE station_type = 'headphones' 
AND transaction_type IN ('headphone_checkout', 'headphone_checkin');