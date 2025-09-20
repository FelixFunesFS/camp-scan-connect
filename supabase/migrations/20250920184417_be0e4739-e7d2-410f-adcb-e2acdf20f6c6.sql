-- Add new station types for equipment checkout
ALTER TYPE station_type ADD VALUE 'golf_carts';
ALTER TYPE station_type ADD VALUE 'walkie_talkies';  
ALTER TYPE station_type ADD VALUE 'fanny_packs';

-- Add new transaction types for equipment checkout/checkin
ALTER TYPE transaction_type ADD VALUE 'golf_cart_checkout';
ALTER TYPE transaction_type ADD VALUE 'golf_cart_checkin';
ALTER TYPE transaction_type ADD VALUE 'walkie_talkie_checkout';
ALTER TYPE transaction_type ADD VALUE 'walkie_talkie_checkin';
ALTER TYPE transaction_type ADD VALUE 'fanny_pack_checkout';
ALTER TYPE transaction_type ADD VALUE 'fanny_pack_checkin';