import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Shield } from "lucide-react";

export interface SafetyConfirmationProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  destructive?: boolean;
  requiresTyping?: boolean;
  expectedText?: string;
  requiresStaffCode?: boolean;
  isProcessing?: boolean;
}

export const SafetyConfirmationDialog: React.FC<SafetyConfirmationProps> = ({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
  confirmText = "Confirm",
  destructive = false,
  requiresTyping = false,
  expectedText = "",
  requiresStaffCode = false,
  isProcessing = false
}) => {
  const [typedText, setTypedText] = React.useState("");
  const [staffCode, setStaffCode] = React.useState("");

  const canConfirm = React.useMemo(() => {
    if (isProcessing) return false;
    
    if (requiresTyping && typedText.toLowerCase() !== expectedText.toLowerCase()) {
      return false;
    }
    
    if (requiresStaffCode && staffCode.toLowerCase() !== 'mc2025') {
      return false;
    }
    
    return true;
  }, [isProcessing, requiresTyping, typedText, expectedText, requiresStaffCode, staffCode]);

  const handleConfirm = () => {
    if (canConfirm) {
      onConfirm();
      setTypedText("");
      setStaffCode("");
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!isProcessing) {
      onOpenChange(newOpen);
      if (!newOpen) {
        setTypedText("");
        setStaffCode("");
      }
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            {destructive ? (
              <AlertTriangle className="h-5 w-5 text-destructive" />
            ) : (
              <Shield className="h-5 w-5 text-primary" />
            )}
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-left">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {(requiresTyping || requiresStaffCode) && (
          <div className="space-y-4 py-4">
            {requiresStaffCode && (
              <div className="space-y-2">
                <Label htmlFor="staff-code" className="text-sm font-medium">
                  Staff Code Required
                </Label>
                <Input
                  id="staff-code"
                  type="password"
                  value={staffCode}
                  onChange={(e) => setStaffCode(e.target.value)}
                  placeholder="Enter your staff code..."
                  disabled={isProcessing}
                />
              </div>
            )}

            {requiresTyping && (
              <div className="space-y-2">
                <Label htmlFor="confirmation-text" className="text-sm font-medium">
                  Type "{expectedText}" to confirm
                </Label>
                <Input
                  id="confirmation-text"
                  value={typedText}
                  onChange={(e) => setTypedText(e.target.value)}
                  placeholder={expectedText}
                  disabled={isProcessing}
                />
              </div>
            )}
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={!canConfirm}
            className={destructive ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
          >
            {isProcessing ? "Processing..." : confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};