import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Phone } from "lucide-react";
import { toast } from "sonner";
import { PhoneActivationService, GroupActivationResult } from "@/services/phoneActivationService";

interface QuickStaffActivationProps {
  onSuccess: (result: GroupActivationResult) => void;
  onCancel: () => void;
}

export function QuickStaffActivation({ onSuccess, onCancel }: QuickStaffActivationProps) {
  const [phone, setPhone] = useState("");
  const [isActivating, setIsActivating] = useState(false);
  const [error, setError] = useState("");

  const handleActivate = async () => {
    if (!phone.trim()) {
      setError("Please enter the attendee's phone number");
      return;
    }

    setIsActivating(true);
    setError("");

    try {
      const result = await PhoneActivationService.activateGroupByPhone(phone.trim(), 'staff_assisted');
      
      if (!result || result.activated_count === 0) {
        setError("Phone number not found or already activated");
        return;
      }

      toast.success(`Activated ${result.activated_count} attendee(s)!`);
      onSuccess(result);
    } catch (error) {
      console.error("Activation error:", error);
      setError("Activation failed. Please try again or use staff override.");
    } finally {
      setIsActivating(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isActivating) {
      handleActivate();
    }
  };

  return (
    <div className="p-4 bg-primary/10 rounded-lg border border-primary/20 space-y-3">
      <div className="flex items-center gap-2 mb-3">
        <Phone className="h-4 w-4 text-primary" />
        <h3 className="font-medium">Quick Staff Activation</h3>
      </div>

      <div className="flex gap-2">
        <Input
          placeholder="Attendee's phone number"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={isActivating}
          className="flex-1"
          autoFocus
        />
        <Button 
          onClick={handleActivate}
          disabled={isActivating || !phone.trim()}
          size="default"
        >
          {isActivating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            "Activate"
          )}
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription className="text-sm">{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex justify-end">
        <Button variant="ghost" size="sm" onClick={onCancel} disabled={isActivating}>
          Cancel
        </Button>
      </div>
    </div>
  );
}