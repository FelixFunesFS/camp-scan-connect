-- Clean up test headphone checkout transactions
DELETE FROM station_transactions 
WHERE station_type = 'headphones' 
AND transaction_type = 'headphone_checkout';