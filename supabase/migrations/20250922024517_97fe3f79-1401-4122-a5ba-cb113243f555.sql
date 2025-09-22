-- Remove test gate entry/exit transactions for Andre Sigmon (RFID: 2585363204)
-- Keep legitimate activation and equipment transactions

DELETE FROM station_transactions 
WHERE rfid_uid = '2585363204'
AND station_type = 'main_gate'
AND transaction_type IN ('gate_entry', 'gate_exit');