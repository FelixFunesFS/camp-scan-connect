import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Keyboard, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface KeyboardShortcutsHelperProps {
  isGroupedView: boolean;
}

export const KeyboardShortcutsHelper: React.FC<KeyboardShortcutsHelperProps> = ({
  isGroupedView
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F1' || (e.ctrlKey && e.key === '/')) {
        e.preventDefault();
        setIsVisible(!isVisible);
      } else if (e.key === 'Escape' && isVisible) {
        setIsVisible(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isVisible]);

  if (!isVisible) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Badge 
          variant="outline" 
          className="cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => setIsVisible(true)}
        >
          <Keyboard className="h-3 w-3 mr-1" />
          Shortcuts (F1)
        </Badge>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Card className="w-80 shadow-lg border">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-sm flex items-center gap-2">
              <Keyboard className="h-4 w-4" />
              Keyboard Shortcuts
            </h3>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setIsVisible(false)}
              className="h-6 w-6 p-0"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
          
            <div className="space-y-2">
              <p className="font-medium text-sm">Navigation</p>
              <div className="text-xs space-y-1 text-muted-foreground">
                <div>↑/↓ - Navigate between attendees</div>
                <div>Enter - Assign RFID</div>
                <div>Home - Jump to first unassigned</div>
                <div>End - Jump to last unassigned</div>
                <div>Escape - Cancel assignment</div>
              </div>
            </div>

            {isGroupedView && (
              <div className="space-y-2">
                <p className="font-medium text-sm">Group Processing</p>
                <div className="text-xs space-y-1 text-muted-foreground">
                  <div>Ctrl + G - Start group processing</div>
                  <div>Ctrl + E - Expand all groups</div>
                  <div>Ctrl + C - Collapse all groups</div>
                  <div>Tab - Next unassigned in group</div>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <p className="font-medium text-sm">General</p>
              <div className="text-xs space-y-1 text-muted-foreground">
                <div>F1 or Ctrl + / - Toggle this help</div>
                <div>Escape - Close dialogs</div>
              </div>
            </div>
        </CardContent>
      </Card>
    </div>
  );
};