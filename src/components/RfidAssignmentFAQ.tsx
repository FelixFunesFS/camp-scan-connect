import React from 'react';
import { 
  HelpCircle, 
  X, 
  Zap, 
  Users, 
  Search, 
  Camera,
  AlertTriangle,
  CheckCircle,
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
                    <span className="text-sm">Choose the correct attendee, then tap <strong>Scan with phone camera</strong></span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Badge variant="secondary" className="text-xs">3</Badge>
                    <span className="text-sm">Hold the printed barcode or QR code inside the camera frame</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Badge variant="secondary" className="text-xs">4</Badge>
                    <span className="text-sm">Verify the code, then tap ✓ to assign it</span>
                  </div>
                </div>
                
                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground">
                    <strong>Default view:</strong> Shows registered and pending attendees. Use sorting and filters to organize the list.
                  </p>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Scanner Setup */}
            <AccordionItem value="scanner">
              <AccordionTrigger className="text-left">
                <div className="flex items-center gap-2">
                   <Camera className="h-4 w-4" />
                  Scanner Instructions
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-3">
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Phone camera (default):</h4>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>• Tap <strong>Scan with phone camera</strong> for the selected attendee</li>
                    <li>• Allow camera access when the browser asks</li>
                    <li>• Center the full printed code in the guide; the scan happens automatically</li>
                    <li>• Use the flashlight or switch-camera controls when needed</li>
                  </ul>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">USB reader (backup):</h4>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>• Connect a USB or Bluetooth reader in keyboard mode</li>
                    <li>• Tap <strong>USB reader (backup)</strong> and keep the code field selected</li>
                    <li>• A reader configured to send Enter validates and saves automatically</li>
                    <li>• Otherwise, tap ✓ after the code appears</li>
                  </ul>
                </div>

                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground">
                    <strong>Type code instead:</strong> Enter the printed code in the field, verify it, then press Enter or tap ✓.
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
                    When ON: Shows only attendees without an assigned or active credential.
                    When OFF: Shows all registered and pending attendees.
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
                     Use <strong>By Order</strong> to keep people from the same order together. Use <strong>By Site</strong> to organize by site assignment.
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

            {/* Deactivating a band */}
            <AccordionItem value="deactivation">
              <AccordionTrigger className="text-left">
                <div className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4" />
                  How to deactivate a band
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-3">
                <div className="space-y-2 text-sm">
                  <p><strong>Change code</strong> — correct a code that was typed or scanned incorrectly. The replacement code is linked to the same person.</p>
                  <p><strong>Replace</strong> — use this when a band is lost or damaged. The old band is retired and, if the person was already checked in, the replacement keeps that check-in status.</p>
                  <p><strong>Remove</strong> — use this when the credential should no longer belong to the person. A reason is required. Removing an active credential checks the person out; staff can still use the documented override process when necessary.</p>
                  <p className="text-muted-foreground">Every removal is recorded with its reason so it shows up in the audit reports.</p>
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
                  <h4 className="font-medium text-sm">Camera will not scan:</h4>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>• Allow camera access for this site in browser settings</li>
                    <li>• Hold the phone steady with the entire code visible and well lit</li>
                    <li>• Move slightly closer or farther away until the code is sharp</li>
                    <li>• Try the flashlight or switch-camera control</li>
                    <li>• If needed, use the USB reader backup or type the printed code</li>
                  </ul>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Code already assigned:</h4>
                  <p className="text-sm text-muted-foreground">
                    Assignment is blocked when a code belongs to someone else. Read the message to identify the current attendee before changing anything.
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Save Issues:</h4>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>• Verify the displayed attendee and code before tapping ✓</li>
                    <li>• A red border or message means the code needs attention</li>
                    <li>• Check the internet connection if saving or syncing fails</li>
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
                    <div className="w-3 h-3 bg-success rounded-full"></div>
                    <span className="text-sm">Checked In — credential is active</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-warning rounded-full"></div>
                    <span className="text-sm">Assigned — credential is linked but not activated</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-muted-foreground rounded-full"></div>
                    <span className="text-sm">Unassigned — no credential is linked</span>
                  </div>
                </div>

                <div className="pt-2 border-t">
                  <h4 className="font-medium text-sm">Field Indicators:</h4>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>• Camera result: decoded code appears in the assignment field</li>
                    <li>• Red border or message: validation needs attention</li>
                    <li>• ✓ button: confirm the assignment</li>
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
              <li>• <strong>Sort:</strong> Choose a field and use Asc/Desc or A–Z/Z–A</li>
              <li>• <strong>Search:</strong> Find by name, order, or phone</li>
              <li>• <strong>Scan:</strong> Phone camera is primary; USB reader is backup</li>
              <li>• <strong>Save:</strong> Verify the code, then tap ✓</li>
              <li>• <strong>Navigate:</strong> Use mouse/touch to navigate between attendees</li>
              <li>• <strong>Filter:</strong> "Unassigned Only" for workflow, "Cancelled Registrations" for cleanup</li>
            </ul>
          </div>
        </div>
      </div>
    </>
  );
};