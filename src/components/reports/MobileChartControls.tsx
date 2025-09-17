import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Settings, 
  Eye, 
  EyeOff, 
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Download,
  Share2,
  Filter,
  Calendar,
  BarChart3
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

interface MobileChartControlsProps {
  title: string;
  visibleSeries?: Record<string, boolean>;
  onToggleSeries?: (series: string) => void;
  onRefresh?: () => void;
  onExport?: () => void;
  onShare?: () => void;
  children?: React.ReactNode;
}

export const MobileChartControls: React.FC<MobileChartControlsProps> = ({
  title,
  visibleSeries = {},
  onToggleSeries,
  onRefresh,
  onExport,
  onShare,
  children
}) => {
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);

  if (!isMobile) {
    return <>{children}</>;
  }

  return (
    <div className="relative">
      {/* Mobile Chart Header */}
      <div className="flex items-center justify-between mb-3 sticky top-0 bg-background/95 backdrop-blur-sm z-10 py-2">
        <h3 className="text-sm font-medium truncate flex-1">{title}</h3>
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 w-8 p-0 ml-2 shrink-0">
              <Settings className="h-4 w-4" />
            </Button>
          </SheetTrigger>
          
          <SheetContent side="bottom" className="h-[80vh] overflow-auto">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Chart Controls
              </SheetTitle>
            </SheetHeader>

            <div className="space-y-6 mt-6">
              {/* Chart Series Controls */}
              {Object.keys(visibleSeries).length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    Data Series
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(visibleSeries).map(([series, visible]) => (
                      <Button
                        key={series}
                        variant={visible ? "default" : "outline"}
                        size="sm"
                        onClick={() => onToggleSeries?.(series)}
                        className="justify-start gap-2 h-auto py-2"
                      >
                        {visible ? (
                          <Eye className="h-3 w-3" />
                        ) : (
                          <EyeOff className="h-3 w-3" />
                        )}
                        <span className="text-xs capitalize">
                          {series.replace(/_/g, ' ')}
                        </span>
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              <Separator />

              {/* Chart Actions */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium">Chart Actions</h4>
                <div className="grid grid-cols-1 gap-2">
                  {onRefresh && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        onRefresh();
                        setIsOpen(false);
                      }}
                      className="justify-start gap-2"
                    >
                      <RotateCcw className="h-4 w-4" />
                      Refresh Data
                    </Button>
                  )}
                  
                  {onExport && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        onExport();
                        setIsOpen(false);
                      }}
                      className="justify-start gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Export Chart
                    </Button>
                  )}
                  
                  {onShare && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        onShare();
                        setIsOpen(false);
                      }}
                      className="justify-start gap-2"
                    >
                      <Share2 className="h-4 w-4" />
                      Share Chart
                    </Button>
                  )}
                </div>
              </div>

              <Separator />

              {/* Chart Info */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Chart Information</h4>
                <div className="space-y-1">
                  <Badge variant="outline" className="text-xs">
                    Mobile Optimized
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    Real-time Data
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    Touch Gestures Enabled
                  </Badge>
                </div>
              </div>

              {/* Touch Gestures Guide */}
              <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                <h5 className="text-xs font-medium">Touch Gestures</h5>
                <div className="space-y-1 text-xs text-muted-foreground">
                  <p>• Tap chart elements for details</p>
                  <p>• Pinch to zoom in/out</p>
                  <p>• Swipe to pan across data</p>
                  <p>• Long press for context menu</p>
                </div>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Chart Content */}
      <div className="touch-manipulation">
        {children}
      </div>

      {/* Mobile Chart Footer */}
      <div className="mt-3 pt-2 border-t border-border/50">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Updated: {new Date().toLocaleTimeString()}</span>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span>Live</span>
          </div>
        </div>
      </div>
    </div>
  );
};