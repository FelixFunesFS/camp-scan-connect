import * as React from "react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

interface ResponsiveTableProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  mobileBreakpoint?: "sm" | "md" | "lg";
}

const ResponsiveTable = React.forwardRef<HTMLDivElement, ResponsiveTableProps>(
  ({ className, children, mobileBreakpoint = "md", ...props }, ref) => {
    const isMobile = useIsMobile();
    
    return (
      <div 
        ref={ref} 
        className={cn(
          "relative w-full",
          // Desktop table layout
          `hidden ${mobileBreakpoint}:block`,
          className
        )} 
        {...props}
      >
        <div className="overflow-auto rounded-md border">
          {children}
        </div>
      </div>
    );
  }
);
ResponsiveTable.displayName = "ResponsiveTable";

const ResponsiveTableMobile = React.forwardRef<HTMLDivElement, ResponsiveTableProps>(
  ({ className, children, mobileBreakpoint = "md", ...props }, ref) => {
    return (
      <div 
        ref={ref} 
        className={cn(
          "w-full space-y-3",
          // Mobile card layout
          `block ${mobileBreakpoint}:hidden`,
          className
        )} 
        {...props}
      >
        {children}
      </div>
    );
  }
);
ResponsiveTableMobile.displayName = "ResponsiveTableMobile";

interface ResponsiveTableCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

const ResponsiveTableCard = React.forwardRef<HTMLDivElement, ResponsiveTableCardProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div 
        ref={ref} 
        className={cn(
          "mobile-card rounded-lg border bg-card text-card-foreground shadow-sm",
          className
        )} 
        {...props}
      >
        {children}
      </div>
    );
  }
);
ResponsiveTableCard.displayName = "ResponsiveTableCard";

export { ResponsiveTable, ResponsiveTableMobile, ResponsiveTableCard };