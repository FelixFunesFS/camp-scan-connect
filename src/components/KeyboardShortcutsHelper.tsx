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
          
          <div className="space-y-2 text-xs">
            <div className="space-y-1">
              <h4 className="font-medium text-muted-foreground">Navigation:</h4>
              <div className="flex justify-between">
                <span>↑↓ Arrow Keys</span>
                <Badge variant="outline" className="text-xs">Navigate rows</Badge>
              </div>
              <div className="flex justify-between">
                <span>Ctrl + G</span>
                <Badge variant="outline" className="text-xs">Next unassigned</Badge>
              </div>
              <div className="flex justify-between">
                <span>Enter</span>
                <Badge variant="outline" className="text-xs">Assign RFID</Badge>
              </div>
              <div className="flex justify-between">
                <span>Escape</span>
                <Badge variant="outline" className="text-xs">Clear input</Badge>
              </div>
            </div>
            
            {isGroupedView && (
              <div className="space-y-1 border-t pt-2">
                <h4 className="font-medium text-muted-foreground">Group Processing:</h4>
                <div className="flex justify-between">
                  <span>"Start Processing"</span>
                  <Badge variant="secondary" className="text-xs">Auto-expand & focus</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Scan RFID</span>
                  <Badge variant="secondary" className="text-xs">Auto-advance in group</Badge>
                </div>
              </div>
            )}
            
            <div className="space-y-1 border-t pt-2">
              <h4 className="font-medium text-muted-foreground">General:</h4>
              <div className="flex justify-between">
                <span>F1 / Ctrl + /</span>
                <Badge variant="outline" className="text-xs">Toggle shortcuts</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};