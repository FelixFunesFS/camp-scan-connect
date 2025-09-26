import { useState, useEffect } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface StationAccessValidatorProps {
  attendeeId: string;
  children: (hasAccess: boolean, accessInfo: AccessInfo) => React.ReactNode;
}

interface AccessInfo {
  hasAccess: boolean;
  accessReason: string;
  activationStatus: string;
  rfidStatus: string;
}

/**
 * Component that validates station access using the standardized check_station_access function
 * This ensures all stations use the same validation logic as the RFID assignment page
 */
export function StationAccessValidator({ attendeeId, children }: StationAccessValidatorProps) {
  const [accessInfo, setAccessInfo] = useState<AccessInfo>({
    hasAccess: false,
    accessReason: 'Checking access...',
    activationStatus: 'checking',
    rfidStatus: 'checking'
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    validateAccess();
  }, [attendeeId]);

  const validateAccess = async () => {
    if (!attendeeId) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .rpc('check_station_access', { p_attendee_id: attendeeId });

      if (error) {
        console.error('Error checking station access:', error);
        setAccessInfo({
          hasAccess: false,
          accessReason: 'Error checking access',
          activationStatus: 'error',
          rfidStatus: 'error'
        });
        return;
      }

      const accessRecord = data?.[0];
      if (accessRecord) {
        setAccessInfo({
          hasAccess: accessRecord.has_access,
          accessReason: accessRecord.access_reason,
          activationStatus: accessRecord.activation_status,
          rfidStatus: accessRecord.rfid_status
        });
      }
    } catch (error) {
      console.error('Error validating station access:', error);
      setAccessInfo({
        hasAccess: false,
        accessReason: 'Validation error',
        activationStatus: 'error',
        rfidStatus: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>Validating station access...</AlertDescription>
      </Alert>
    );
  }

  return (
    <>
      {/* Access Status Display */}
      <Alert variant={accessInfo.hasAccess ? "default" : "destructive"}>
        {accessInfo.hasAccess ? (
          <CheckCircle className="h-4 w-4" />
        ) : (
          <XCircle className="h-4 w-4" />
        )}
        <AlertDescription className="flex items-center gap-2">
          {accessInfo.accessReason}
          <Badge variant={accessInfo.hasAccess ? "default" : "destructive"}>
            {accessInfo.activationStatus}
          </Badge>
        </AlertDescription>
      </Alert>
      
      {/* Render children with access info */}
      {children(accessInfo.hasAccess, accessInfo)}
    </>
  );
}