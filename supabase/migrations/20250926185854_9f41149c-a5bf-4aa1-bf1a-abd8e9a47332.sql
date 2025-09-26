-- Remove Andre Sigmon's test drink transactions
DELETE FROM station_transactions 
WHERE id IN (
    '47165181-4231-409d-bcc3-71b28bfd91f5',
    '97f9b1a3-e505-43ed-b0b7-ac0cf81e87d5', 
    'd4f8a865-efb9-4cb4-810d-3a61105adfc8'
) AND transaction_type = 'drink' AND station_type = 'drinks';