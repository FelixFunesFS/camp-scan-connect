import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { StaffPasscodeGate } from "@/components/StaffPasscodeGate";
import { useStaffAuth } from "@/contexts/StaffAuthContext";

export default function StaffLogin() {
  const { isUnlocked } = useStaffAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = (location.state as { from?: string } | null)?.from ?? "/dashboard";

  useEffect(() => {
    if (isUnlocked) {
      navigate(redirectTo, { replace: true });
    }
  }, [isUnlocked, navigate, redirectTo]);

  if (isUnlocked) return null;

  return <StaffPasscodeGate />;
}
