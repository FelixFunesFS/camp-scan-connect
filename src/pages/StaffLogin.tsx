import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock } from "lucide-react";
import { toast } from "sonner";
import { useStaffAuth } from "@/contexts/StaffAuthContext";

export default function StaffLogin() {
  const [code, setCode] = useState("");
  const { unlock, isUnlocked } = useStaffAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = (location.state as { from?: string } | null)?.from ?? "/dashboard";

  const submit = () => {
    if (unlock(code)) {
      toast.success("Staff tools unlocked on this device");
      navigate(redirectTo, { replace: true });
    } else {
      toast.error("That passcode isn't right");
      setCode("");
    }
  };

  if (isUnlocked) {
    navigate(redirectTo, { replace: true });
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="mx-auto mt-24 w-full max-w-sm">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              <Lock className="h-5 w-5" />
              Staff Access
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="staff-passcode">Passcode</Label>
              <Input
                id="staff-passcode"
                type="password"
                inputMode="numeric"
                autoComplete="off"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submit()}
                placeholder="Enter passcode"
                className="h-12 text-center text-lg tracking-widest"
              />
            </div>
            <Button onClick={submit} disabled={!code.trim()} size="lg" className="h-12 w-full">
              Unlock
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
