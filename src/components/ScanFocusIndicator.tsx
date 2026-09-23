import { cn } from "@/lib/utils";
import { ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ScanFocusIndicatorProps {
  isFocused: boolean;
  onClick?: () => void;
  className?: string;
}

export function ScanFocusIndicator({ isFocused, onClick, className }: ScanFocusIndicatorProps) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={onClick}
      className={cn(
        "inline-flex min-h-11 items-center gap-2 rounded-full px-3 py-1 text-xs font-medium transition-colors",
        isFocused
          ? "border-primary/40 bg-primary/10 text-primary"
          : "border-border bg-muted text-muted-foreground",
        className
      )}
    >
      <span className="relative flex h-2 w-2">
        {isFocused && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
        )}
        <span
          className={cn(
            "relative inline-flex h-2 w-2 rounded-full",
            isFocused ? "bg-primary" : "bg-muted-foreground/50"
          )}
        />
      </span>
      <ScanLine className="h-3.5 w-3.5" />
      {isFocused ? "Ready to scan" : "Tap here to scan"}
    </Button>
  );
}
