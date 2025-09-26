-- Fix data consistency: Sync attendees.activated_at with station_transactions
-- This updates attendees.activated_at to match their actual activation transactions

UPDATE attendees 
SET activated_at = (
  SELECT st.created_at 
  FROM station_transactions st 
  WHERE st.attendee_id = attendees.id 
    AND st.station_type = 'activation' 
    AND st.transaction_type = 'activate'
  ORDER BY st.created_at DESC 
  LIMIT 1
)
WHERE EXISTS (
  SELECT 1 
  FROM station_transactions st 
  WHERE st.attendee_id = attendees.id 
    AND st.station_type = 'activation' 
    AND st.transaction_type = 'activate'
) AND (
  activated_at IS NULL 
  OR activated_at != (
    SELECT st.created_at 
    FROM station_transactions st 
    WHERE st.attendee_id = attendees.id 
      AND st.station_type = 'activation' 
      AND st.transaction_type = 'activate'
    ORDER BY st.created_at DESC 
    LIMIT 1
  )
);

-- Create trigger to keep attendees.activated_at in sync with activation transactions
CREATE OR REPLACE FUNCTION sync_attendee_activation()
RETURNS TRIGGER AS $$
BEGIN
    -- When activation transaction is inserted
    IF NEW.station_type = 'activation' AND NEW.transaction_type = 'activate' THEN
        UPDATE attendees 
        SET activated_at = NEW.created_at
        WHERE id = NEW.attendee_id;
    END IF;
    
    -- When activation transaction is updated to activate
    IF TG_OP = 'UPDATE' AND NEW.station_type = 'activation' AND NEW.transaction_type = 'activate' AND 
       (OLD.transaction_type IS NULL OR OLD.transaction_type != 'activate') THEN
        UPDATE attendees 
        SET activated_at = NEW.created_at
        WHERE id = NEW.attendee_id;
    END IF;
    
    -- When deactivation transaction is inserted
    IF NEW.station_type = 'activation' AND NEW.transaction_type = 'deactivate' THEN
        UPDATE attendees 
        SET activated_at = NULL
        WHERE id = NEW.attendee_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on station_transactions
DROP TRIGGER IF EXISTS trigger_sync_attendee_activation ON station_transactions;
CREATE TRIGGER trigger_sync_attendee_activation
    AFTER INSERT OR UPDATE ON station_transactions
    FOR EACH ROW
    EXECUTE FUNCTION sync_attendee_activation();

-- Create function to validate station access based on activation status
CREATE OR REPLACE FUNCTION check_station_access(p_attendee_id UUID)
RETURNS TABLE(
    has_access BOOLEAN, 
    access_reason TEXT,
    activation_status TEXT,
    rfid_status TEXT
) 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
DECLARE
    rfid_record RECORD;
    activation_record RECORD;
BEGIN
    -- Check RFID assignment
    SELECT INTO rfid_record uid, status 
    FROM rfid_tags 
    WHERE attendee_id = p_attendee_id 
      AND status IN ('assigned', 'active')
    ORDER BY issued_at DESC 
    LIMIT 1;
    
    -- Check activation status
    SELECT INTO activation_record transaction_type, created_at
    FROM station_transactions 
    WHERE attendee_id = p_attendee_id 
      AND station_type = 'activation'
    ORDER BY created_at DESC 
    LIMIT 1;
    
    -- No RFID assigned
    IF rfid_record IS NULL THEN
        RETURN QUERY SELECT 
            FALSE as has_access,
            'No RFID assigned' as access_reason,
            'none' as activation_status,
            'unassigned' as rfid_status;
        RETURN;
    END IF;
    
    -- RFID assigned but not activated
    IF activation_record IS NULL OR activation_record.transaction_type != 'activate' THEN
        RETURN QUERY SELECT 
            FALSE as has_access,
            'RFID assigned but not activated' as access_reason,
            COALESCE(activation_record.transaction_type, 'none') as activation_status,
            rfid_record.status as rfid_status;
        RETURN;
    END IF;
    
    -- RFID assigned and activated - full access
    RETURN QUERY SELECT 
        TRUE as has_access,
        'Full station access granted' as access_reason,
        activation_record.transaction_type as activation_status,
        rfid_record.status as rfid_status;
END;
$$;