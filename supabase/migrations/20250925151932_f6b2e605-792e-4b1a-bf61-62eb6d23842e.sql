-- Reset active RFID tags back to assigned status to complete testing data cleanup
UPDATE rfid_tags 
SET status = 'assigned'
WHERE status = 'active';