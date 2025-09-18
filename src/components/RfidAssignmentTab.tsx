import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { useRfidCapture } from "@/hooks/useRfidCapture";
import { supabase } from "@/integrations/supabase/client";
import { 
  Users, 
  ChevronDown, 
  ChevronRight, 
  TestTube, 
  CheckCircle, 
  AlertTriangle, 
  Zap,
  SkipForward,
  RotateCcw
} from "lucide-react";
import { EnhancedRfidAssignmentCell } from "@/components/EnhancedRfidAssignmentCell";
import { RfidTestingSection } from "@/components/RfidTestingSection";
import { RfidBulkOperationsSection } from "@/components/RfidBulkOperationsSection";

interface AttendeeWithRfid {
  id: string;
  first_name: string;
  last_name: string;
  order_id: string | null;
  rfid_uid: string | null;
  rfid_status: string | null;
}

interface OrderGroup {
  orderId: string;
  attendees: AttendeeWithRfid[];
  assignedCount: number;
  totalCount: number;
  progress: number;
}

export const RfidAssignmentTab = () => {
  // Safety check for React availability
  if (!React || !React.useState || !React.useEffect) {
    console.error('React hooks not available in RfidAssignmentTab');
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-bold mb-2">RFID Assignment Loading...</h2>
        <p className="text-muted-foreground">Please wait while the component initializes.</p>
      </div>
    );
  }

  const [attendees, setAttendees] = useState<AttendeeWithRfid[]>([]);
  const [orderGroups, setOrderGroups] = useState<OrderGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [testModeEnabled, setTestModeEnabled] = useState(false);
  const [autoAdvanceEnabled, setAutoAdvanceEnabled] = useState(true);
  const [totalProgress, setTotalProgress] = useState(0);
  const { toast } = useToast();

  // Load attendees data
  const loadAttendees = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('attendees')
        .select(`
          id,
          first_name,
          last_name,
          order_id,
          rfid_tags(uid, status)
        `)
        .order('order_id', { ascending: true })
        .order('first_name', { ascending: true });

      if (error) throw error;

      // Flatten and enhance the data
      const enhancedAttendees: AttendeeWithRfid[] = data.map(attendee => ({
        id: attendee.id,
        first_name: attendee.first_name,
        last_name: attendee.last_name,
        order_id: attendee.order_id,
        rfid_uid: (attendee.rfid_tags as any)?.[0]?.uid || null,
        rfid_status: (attendee.rfid_tags as any)?.[0]?.status || null,
      }));

      setAttendees(enhancedAttendees);
    } catch (error) {
      console.error('Error loading attendees:', error);
      toast({
        title: "Error",
        description: "Failed to load attendee data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Process attendees into order groups
  const processOrderGroups = useMemo(() => {
    if (!attendees.length) return [];

    const grouped = attendees.reduce((acc, attendee) => {
      const orderId = attendee.order_id || 'no-order';
      if (!acc[orderId]) {
        acc[orderId] = [];
      }
      acc[orderId].push(attendee);
      return acc;
    }, {} as Record<string, AttendeeWithRfid[]>);

    return Object.entries(grouped).map(([orderId, groupAttendees]) => {
      const assignedCount = groupAttendees.filter(a => 
        a.rfid_uid && a.rfid_status === 'assigned'
      ).length;
      
      return {
        orderId,
        attendees: groupAttendees,
        assignedCount,
        totalCount: groupAttendees.length,
        progress: groupAttendees.length > 0 ? (assignedCount / groupAttendees.length) * 100 : 0
      };
    }).sort((a, b) => {
      // Sort by progress (incomplete first), then by order ID
      if (a.progress !== b.progress) {
        return a.progress - b.progress;
      }
      return a.orderId.localeCompare(b.orderId);
    });
  }, [attendees]);

  // Update order groups when processed
  useEffect(() => {
    setOrderGroups(processOrderGroups);
    
    // Calculate total progress
    const totalAttendees = attendees.length;
    const totalAssigned = attendees.filter(a => 
      a.rfid_uid && a.rfid_status === 'assigned'
    ).length;
    setTotalProgress(totalAttendees > 0 ? (totalAssigned / totalAttendees) * 100 : 0);
  }, [processOrderGroups, attendees]);

  // Simple navigation state for groups
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Generate synthetic RFID for testing
  const generateSyntheticRfid = useCallback(() => {
    const timestamp = Date.now().toString();
    return `TEST${timestamp.slice(-8)}`;
  }, []);

  // Enhanced RFID capture with auto-advance
  const handleRfidCapture = useCallback(async (uid: string) => {
    if (!uid.trim()) return;

    const finalUid = testModeEnabled ? generateSyntheticRfid() : uid.trim();
    
    console.log('RFID captured:', finalUid);
    
    if (autoAdvanceEnabled) {
      // Auto-advance to next unassigned field after successful capture
      setTimeout(() => {
        const nextInput = document.querySelector('input[data-rfid-input="true"]:not([value])') as HTMLInputElement;
        if (nextInput) {
          nextInput.focus();
          nextInput.select();
        }
      }, 500);
    }

    toast({
      title: "RFID Captured",
      description: `UID: ${finalUid}${testModeEnabled ? ' (Test Mode)' : ''}`,
    });
  }, [testModeEnabled, autoAdvanceEnabled, generateSyntheticRfid, toast]);

  // RFID capture hook
  useRfidCapture({
      onCapture: handleRfidCapture,
      enabled: true,
      minLength: 8,
      debounceMs: 50, // Faster for assignment workflow
  });

  // Focus first unassigned attendee overall
  const focusFirstUnassigned = useCallback(() => {
    setTimeout(() => {
      const firstInput = document.querySelector('input[data-rfid-input="true"]:not([value])') as HTMLInputElement;
      if (firstInput) {
        firstInput.focus();
        firstInput.select();
      }
    }, 200);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case 'g':
            e.preventDefault();
            // Focus first unassigned RFID input
            focusFirstUnassigned();
            break;
          case ' ':
            e.preventDefault();
            // Toggle auto-advance
            setAutoAdvanceEnabled(prev => !prev);
            break;
          case 's':
            e.preventDefault();
            // Skip current attendee - focus next
            const nextInput = document.querySelector('input[data-rfid-input="true"]:not([value])') as HTMLInputElement;
            if (nextInput) {
              nextInput.focus();
              nextInput.select();
            }
            break;
        }
      } else if (e.key === 'Escape') {
        // Reset focus to first unassigned
        focusFirstUnassigned();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [focusFirstUnassigned]);

  // Load data on mount and auto-expand incomplete groups
  useEffect(() => {
    loadAttendees();
  }, [loadAttendees]);

  // Auto-expand incomplete groups and focus first unassigned
  useEffect(() => {
    if (orderGroups.length > 0) {
      // Expand all incomplete groups
      const incompleteGroupIds = orderGroups
        .filter(g => g.progress < 100)
        .map(g => g.orderId);
      
      if (incompleteGroupIds.length > 0) {
        setExpandedGroups(new Set(incompleteGroupIds));
        // Focus first unassigned input
        focusFirstUnassigned();
      }
    }
  }, [orderGroups, focusFirstUnassigned]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const incompleteGroups = orderGroups.filter(g => g.progress < 100);
  const completedGroups = orderGroups.filter(g => g.progress === 100);

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-primary/20">
        <CardHeader>
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-xl text-primary flex items-center gap-2">
                <Zap className="h-5 w-5" />
                RFID Assignment Station
              </CardTitle>
              <p className="text-muted-foreground text-sm">
                Rapid USB reader workflow for event bag RFID assignment
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <TestTube className="h-4 w-4" />
                <Label htmlFor="test-mode">Test Mode</Label>
                <Switch
                  id="test-mode"
                  checked={testModeEnabled}
                  onCheckedChange={setTestModeEnabled}
                />
              </div>
              <div className="flex items-center gap-2">
                <SkipForward className="h-4 w-4" />
                <Label htmlFor="auto-advance">Auto Advance</Label>
                <Switch
                  id="auto-advance"
                  checked={autoAdvanceEnabled}
                  onCheckedChange={setAutoAdvanceEnabled}
                />
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Progress Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{orderGroups.length}</div>
            <p className="text-xs text-muted-foreground">Total Orders</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-warning">{incompleteGroups.length}</div>
            <p className="text-xs text-muted-foreground">Pending Orders</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-success">{completedGroups.length}</div>
            <p className="text-xs text-muted-foreground">Completed Orders</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{Math.round(totalProgress)}%</div>
            <p className="text-xs text-muted-foreground">Overall Progress</p>
            <Progress value={totalProgress} className="mt-2 h-2" />
          </CardContent>
        </Card>
      </div>

      {/* Test Mode Alert */}
      {testModeEnabled && (
        <Alert className="border-warning">
          <TestTube className="h-4 w-4" />
          <AlertDescription>
            Test Mode Active: Mock UIDs will be generated instead of physical reader input
          </AlertDescription>
        </Alert>
      )}

      {/* Keyboard Shortcuts */}
      <Card className="border-muted">
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-muted rounded text-xs">Ctrl+G</kbd>
              <span>Focus first unassigned</span>
            </div>
            <div className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-muted rounded text-xs">Ctrl+S</kbd>
              <span>Skip current</span>
            </div>
            <div className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-muted rounded text-xs">Ctrl+Space</kbd>
              <span>Toggle auto-advance</span>
            </div>
            <div className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-muted rounded text-xs">Esc</kbd>
              <span>Reset focus</span>
            </div>
            <div className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-muted rounded text-xs">↑↓</kbd>
              <span>Navigate rows</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Order Groups */}
      <div className="space-y-4">
        {/* Incomplete Groups First */}
        {incompleteGroups.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              Pending Orders ({incompleteGroups.length})
            </h3>
            {incompleteGroups.map((group) => (
              <GroupCard
                key={group.orderId}
                group={group}
                expandedGroups={expandedGroups}
                toggleGroup={(groupId) => {
                  setExpandedGroups(prev => {
                    const next = new Set(prev);
                    if (next.has(groupId)) {
                      next.delete(groupId);
                    } else {
                      next.add(groupId);
                    }
                    return next;
                  });
                }}
                onRefresh={loadAttendees}
              />
            ))}
          </div>
        )}

        {/* Completed Groups */}
        {completedGroups.length > 0 && (
          <div className="space-y-3">
            <Separator />
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-success" />
              Completed Orders ({completedGroups.length})
            </h3>
            {completedGroups.map((group) => (
              <GroupCard
                key={group.orderId}
                group={group}
                expandedGroups={expandedGroups}
                toggleGroup={(groupId) => {
                  setExpandedGroups(prev => {
                    const next = new Set(prev);
                    if (next.has(groupId)) {
                      next.delete(groupId);
                    } else {
                      next.add(groupId);
                    }
                    return next;
                  });
                }}
                onRefresh={loadAttendees}
                isCompleted
              />
            ))}
          </div>
        )}
      </div>

      {/* Testing & Development Tools */}
      <RfidTestingSection />

      {/* Bulk Operations */}
      <RfidBulkOperationsSection staffId="MC2025" />
    </div>
  );
};

// Group Card Component
interface GroupCardProps {
  group: OrderGroup;
  expandedGroups: Set<string>;
  toggleGroup: (groupId: string) => void;
  onRefresh: () => void;
  isCompleted?: boolean;
}

const GroupCard: React.FC<GroupCardProps> = ({
  group,
  expandedGroups,
  toggleGroup,
  onRefresh,
  isCompleted = false
}) => {
  const isExpanded = expandedGroups.has(group.orderId);
  
  return (
    <Card className={`${isCompleted ? 'border-success/50 bg-success/5' : ''}`}>
      <Collapsible open={isExpanded} onOpenChange={() => toggleGroup(group.orderId)}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                <div>
                  <CardTitle className="text-base">
                    Order: {group.orderId === 'no-order' ? 'Individual Attendees' : group.orderId}
                  </CardTitle>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant={group.progress === 100 ? 'default' : 'secondary'}>
                      {group.assignedCount}/{group.totalCount} assigned
                    </Badge>
                    {isCompleted && <Badge variant="default" className="bg-success text-success-foreground">Completed</Badge>}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium">{Math.round(group.progress)}%</div>
                <Progress value={group.progress} className="w-20 h-2" />
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent>
            <div data-group={group.orderId}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>RFID Assignment</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {group.attendees.map((attendee, index) => (
                    <TableRow key={attendee.id}>
                      <TableCell>
                        {attendee.first_name} {attendee.last_name}
                      </TableCell>
                      <TableCell>
                        <EnhancedRfidAssignmentCell
                          attendeeId={attendee.id}
                          currentRfidUid={attendee.rfid_uid}
                          currentRfidStatus={attendee.rfid_status}
                          attendeeName={`${attendee.first_name} ${attendee.last_name}`}
                          onAssignmentComplete={onRefresh}
                        />
                      </TableCell>
                      <TableCell>
                        <Badge variant={
                          attendee.rfid_uid && attendee.rfid_status === 'assigned' 
                            ? 'default' 
                            : 'secondary'
                        }>
                          {attendee.rfid_uid && attendee.rfid_status === 'assigned' 
                            ? 'Assigned' 
                            : 'Pending'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};