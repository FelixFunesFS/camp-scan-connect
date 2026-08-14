import React from 'react';
import { 
  HelpCircle, 
  X, 
  Zap, 
  Users, 
  Search, 
  Keyboard, 
  AlertTriangle,
  CheckCircle,
  WifiOff,
  RefreshCw
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface RfidAssignmentFAQProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RfidAssignmentFAQ: React.FC<RfidAssignmentFAQProps> = ({ isOpen, onClose }) => {
  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 md:hidden"
          onClick={onClose}
        />
      )}
      
      {/* FAQ Panel */}
      <div className={`
        fixed left-0 top-0 h-full w-80 bg-background border-r shadow-lg z-50
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        overflow-y-auto
      `}>
        <div className="sticky top-0 bg-background border-b p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-primary" />
            <h2 className="font-semibold text-lg">Credential Assignment Guide</h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-4">
          <Accordion type="multiple" defaultValue={["workflow", "scanner"]} className="w-full">
            
            {/* Quick Start Workflow */}
            <AccordionItem value="workflow">
              <AccordionTrigger className="text-left">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  Quick Start Workflow
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-3">
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <Badge variant="secondary" className="text-xs">1</Badge>
                    <span className="text-sm">Search for attendee by name, order ID, or phone</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Badge variant="secondary" className="text-xs">2</Badge>
                    <span className="text-sm">Click in the Code field (blue highlight indicates active)</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Badge variant="secondary" className="text-xs">3</Badge>
                    <span className="text-sm">Scan or tap credential near scanner</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Badge variant="secondary" className="text-xs">4</Badge>
                    <span className="text-sm">UID auto-fills and saves (or press Enter/click ✓)</span>
                  </div>
                </div>
                
                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground">
                    <strong>Default View:</strong> Shows all active attendees, sorted by arrival day then order ID.
                  </p>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Scanner Setup */}
            <AccordionItem value="scanner">
              <AccordionTrigger className="text-left">
                <div className="flex items-center gap-2">
                  <WifiOff className="h-4 w-4" />
                  Scanner Instructions
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-3">
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Hardware Setup:</h4>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>• Connect USB scanner to computer</li>
                    <li>• Ensure scanner is in "keyboard emulation" mode</li>
                    <li>• Scanner should send data + Enter key automatically</li>
                  </ul>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Scanning Process:</h4>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>• Position credential within 1-2 inches of scanner</li>
                    <li>• Listen for beep or see LED confirmation</li>
                    <li>• UID appears instantly in active field</li>
                    <li>• System validates and saves automatically</li>
                  </ul>
                </div>

                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground">
                    <strong>Manual Entry:</strong> You can also type UIDs manually and press Enter to save.
                  </p>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Filter Controls */}
            <AccordionItem value="filters">
              <AccordionTrigger className="text-left">
                <div className="flex items-center gap-2">
                  <Search className="h-4 w-4" />
                  Filter Controls
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-3">
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">"Show Only Unassigned" Toggle:</h4>
                  <p className="text-sm text-muted-foreground">
                    When ON: Shows only attendees needing credential assignment (workflow focus).
                    When OFF: Shows all active attendees (comprehensive overview).
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium text-sm">"Cancelled Registrations" Toggle:</h4>
                  <p className="text-sm text-muted-foreground">
                    When ON: Shows ONLY cancelled registrations (exclusive view).
                    When OFF: Shows all active registrations (normal operation).
                  </p>
                </div>

                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground">
                    <strong>Note:</strong> These toggles work independently. Use "Unassigned Only" during assignment workflow, "Cancelled Registrations" for cleanup tasks.
                  </p>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Assignment Methods */}
            <AccordionItem value="methods">
              <AccordionTrigger className="text-left">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Assignment Methods
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-3">
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Individual Assignment:</h4>
                  <p className="text-sm text-muted-foreground">
                    Assign credentials one person at a time. Best for accuracy and when attendees are present.
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Group Assignment:</h4>
                  <p className="text-sm text-muted-foreground">
                    Switch to "Group" view to assign multiple RFIDs to attendees from the same order. 
                    Useful for families or groups registering together.
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Bulk Operations:</h4>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>• Use search to find specific groups</li>
                    <li>• Filter by meal plan or arrival day</li>
                    <li>• Export unassigned list for offline work</li>
                  </ul>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Troubleshooting */}
            <AccordionItem value="troubleshooting">
              <AccordionTrigger className="text-left">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Troubleshooting
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-3">
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Scanner Not Working:</h4>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>• Check USB connection and power</li>
                    <li>• Try scanning into notepad first</li>
                    <li>• Ensure cursor is in RFID field (blue highlight)</li>
                    <li>• Restart browser if scanner was recently connected</li>
                  </ul>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Duplicate RFID Error:</h4>
                  <p className="text-sm text-muted-foreground">
                    If you see "RFID already assigned," the tag is already in use. Check the error message 
                    for details about who has it assigned.
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Save Issues:</h4>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>• Click the ✓ button or press Enter to save</li>
                    <li>• Red border indicates validation error</li>
                    <li>• Check internet connection for sync issues</li>
                  </ul>
                </div>
              </AccordionContent>
            </AccordionItem>


            {/* Status Indicators */}
            <AccordionItem value="status">
              <AccordionTrigger className="text-left">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Status Indicators
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-sm">Assigned - credential successfully linked</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                    <span className="text-sm">Pending - Assignment in progress</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <span className="text-sm">Error - Assignment failed, check details</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                    <span className="text-sm">Unassigned - No credential linked</span>
                  </div>
                </div>

                <div className="pt-2 border-t">
                  <h4 className="font-medium text-sm">Field Indicators:</h4>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>• Blue border: Active input field</li>
                    <li>• Green border: Successfully saved</li>
                    <li>• Red border: Validation error</li>
                    <li>• ✓ button: Click to save assignment</li>
                  </ul>
                </div>
              </AccordionContent>
            </AccordionItem>

          </Accordion>

          {/* Quick Reference */}
          <div className="mt-6 p-3 bg-muted/50 rounded-lg">
            <h3 className="font-medium text-sm mb-2 flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              Quick Reference
            </h3>
            <ul className="space-y-1 text-xs text-muted-foreground">
              <li>• <strong>Default Sort:</strong> Arrival day → Order ID for organized workflow</li>
              <li>• <strong>Search:</strong> Find by name, order, or phone</li>
              <li>• <strong>Scan:</strong> Position tag near scanner, listen for beep</li>
              <li>• <strong>Save:</strong> Auto-saves on scan or press Enter</li>
              <li>• <strong>Navigate:</strong> Use mouse/touch to navigate between attendees</li>
              <li>• <strong>Filter:</strong> "Unassigned Only" for workflow, "Cancelled Registrations" for cleanup</li>
            </ul>
          </div>
        </div>
      </div>
    </>
  );
};