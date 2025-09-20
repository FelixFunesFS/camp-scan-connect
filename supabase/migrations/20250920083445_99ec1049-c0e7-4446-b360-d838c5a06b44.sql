-- Add new weekend meal transaction types to the transaction_type enum
ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'meal_fri_lunch';
ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'meal_fri_dinner'; 
ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'meal_sat_breakfast';
ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'meal_sat_lunch';
ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'meal_sat_dinner';
ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'meal_sun_breakfast';