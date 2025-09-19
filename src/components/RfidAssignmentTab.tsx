import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
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
  RotateCcw,
  Search,
  List,
  Grid
} from "lucide-react";
import { EnhancedRfidAssignmentCell } from "@/components/EnhancedRfidAssignmentCell";
import { IndividualView } from "@/components/IndividualRfidView";
import { RfidTestingSection } from "@/components/RfidTestingSection";
import { RfidBulkOperationsSection } from "@/components/RfidBulkOperationsSection";
import { ScrollToTop } from "@/components/ui/scroll-to-top";

interface AttendeeWithRfid {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  regfox_id?: string;
  order_id?: string;
  ticket_type: string;
  registration_status: string;
  activated_at?: string;
  waiver_signed?: boolean;
  rfid_uid?: string;
  rfid_status: string;
  has_headphones?: boolean;
  bar_hits?: number;
  arrival_day?: string;
  is_duplicate?: boolean;
  is_phone_duplicate?: boolean;
  meal_plan?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  group_size?: number;
  is_group_order?: boolean;
  is_veteran?: boolean;
  city?: string;
  state?: string;
  special_accommodations?: string;
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
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'groups' | 'individual'>('groups');
  const [isViewModeSwitch, setIsViewModeSwitch] = useState(false);
  const scrollPositionRef = useRef<number>(0);
  

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
          email,
          phone,
          regfox_id,
          order_id,
          ticket_type,
          registration_status,
          activated_at,
          waiver_signed,
          meal_plan,
          notes,
          special_accommodations,
          created_at,
          updated_at,
          city,
          state,
          arrival_window,
          is_veteran,
          rfid_tags(uid, status, activated_at)
        `)
        .order('order_id', { ascending: true })
        .order('first_name', { ascending: true });

      if (error) throw error;

      // Flatten and enhance the data
      const enhancedAttendees: AttendeeWithRfid[] = data.map(attendee => {
        const rfidTag = (attendee.rfid_tags as any)?.[0];
        return {
          id: attendee.id,
          first_name: attendee.first_name,
          last_name: attendee.last_name,
          email: attendee.email,
          phone: attendee.phone,
          regfox_id: attendee.regfox_id,
          order_id: attendee.order_id,
          ticket_type: attendee.ticket_type,
          registration_status: attendee.registration_status,
          activated_at: attendee.activated_at,
          waiver_signed: attendee.waiver_signed,
          meal_plan: attendee.meal_plan,
          notes: attendee.notes,
          special_accommodations: attendee.special_accommodations,
          created_at: attendee.created_at,
          updated_at: attendee.updated_at,
          city: attendee.city,
          state: attendee.state,
          rfid_uid: rfidTag?.uid || null,
          rfid_status: rfidTag?.status || 'unissued',
          has_headphones: false, // Default values for computed fields
          bar_hits: 0,
          arrival_day: attendee.arrival_window,
          is_duplicate: false,
          is_phone_duplicate: false,
          group_size: 1,
          is_group_order: false,
          is_veteran: attendee.is_veteran || false,
        };
      });

      setAttendees(enhancedAttendees);
    } catch (error) {
      console.error('Error loading attendees:', error);
      toast.error("Error - Failed to load attendee data");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Filter attendees based on search term
  const filteredAttendees = useMemo(() => {
    if (!searchTerm.trim()) return attendees;
    
    const term = searchTerm.toLowerCase().trim();
    return attendees.filter(attendee => 
      `${attendee.first_name} ${attendee.last_name}`.toLowerCase().includes(term) ||
      (attendee.order_id && attendee.order_id.toLowerCase().includes(term)) ||
      (attendee.phone && attendee.phone.toLowerCase().includes(term)) ||
      (attendee.rfid_uid && attendee.rfid_uid.toLowerCase().includes(term))
    );
  }, [attendees, searchTerm]);

  // Process attendees into order groups
  const processOrderGroups = useMemo(() => {
    if (!filteredAttendees.length) return [];

    const grouped = filteredAttendees.reduce((acc, attendee) => {
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
  }, [filteredAttendees]);

  // Update order groups when processed
  useEffect(() => {
    setOrderGroups(processOrderGroups);
    
    // Calculate total progress based on all attendees (not filtered)
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
          nextInput.focus({ preventScroll: true });
          nextInput.select();
        }
      }, 500);
    }

    toast.info(`RFID Captured: UID: ${finalUid}${testModeEnabled ? ' (Test Mode)' : ''}`);
  }, [testModeEnabled, autoAdvanceEnabled, generateSyntheticRfid, toast]);

  // RFID capture hook
  useRfidCapture({
      onCapture: handleRfidCapture,
      enabled: true,
      minLength: 8,
      debounceMs: 50, // Faster for assignment workflow
  });

  // Focus first unassigned attendee overall
  const focusFirstUnassigned = useCallback((preventScroll: boolean = false) => {
    // Don't auto-focus during view mode switches
    if (isViewModeSwitch && preventScroll) return;
    
    setTimeout(() => {
      const firstInput = document.querySelector('input[data-rfid-input="true"]:not([value])') as HTMLInputElement;
      if (firstInput) {
        firstInput.focus({ preventScroll });
        firstInput.select();
      }
    }, 200);
  }, [isViewModeSwitch]);

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
              nextInput.focus({ preventScroll: false });
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
        // Only focus on initial load, not during view switches
        if (!isViewModeSwitch) {
          focusFirstUnassigned(false);
        }
      }
    }
  }, [orderGroups, focusFirstUnassigned, isViewModeSwitch]);

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
      {/* Progress Overview - Top Section */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{attendees.length}</div>
            <p className="text-xs text-muted-foreground">Total Attendees</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-warning">
              {attendees.filter(a => !a.rfid_uid || a.rfid_status !== 'assigned').length}
            </div>
            <p className="text-xs text-muted-foreground">Unassigned</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-success">
              {attendees.filter(a => a.rfid_uid && a.rfid_status === 'assigned').length}
            </div>
            <p className="text-xs text-muted-foreground">Assigned</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{orderGroups.length}</div>
            <p className="text-xs text-muted-foreground">All Orders</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{Math.round(totalProgress)}%</div>
            <p className="text-xs text-muted-foreground">Assignment Progress</p>
            <Progress value={totalProgress} className="mt-2 h-2" />
          </CardContent>
        </Card>
      </div>

      {/* Search and View Toggle - Second Section */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search name, order, phone, RFID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            data-search-input="true"
            data-exclude-rfid="true"
          />
          {searchTerm && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
              onClick={() => setSearchTerm('')}
            >
              ×
            </Button>
          )}
        </div>
        
        {/* View Mode Toggle */}
        <Tabs value={viewMode} onValueChange={(value) => {
          // Capture current scroll position
          scrollPositionRef.current = window.scrollY;
          
          // Mark as view mode switch
          setIsViewModeSwitch(true);
          setViewMode(value as 'groups' | 'individual');
          
          // Restore scroll position and reset switch flag after render
          setTimeout(() => {
            window.scrollTo({ top: scrollPositionRef.current, behavior: 'instant' });
            setIsViewModeSwitch(false);
          }, 50);
        }}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="groups" className="flex items-center gap-2">
              <Grid className="h-4 w-4" />
              Groups
            </TabsTrigger>
            <TabsTrigger value="individual" className="flex items-center gap-2">
              <List className="h-4 w-4" />
              Individual
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Search Results Info */}
      {searchTerm && (
        <Alert>
          <Search className="h-4 w-4" />
          <AlertDescription>
            Showing {filteredAttendees.length} of {attendees.length} attendees matching "{searchTerm}"
            {filteredAttendees.length === 0 && (
              <Button 
                variant="link" 
                className="p-0 h-auto ml-2" 
                onClick={() => setSearchTerm('')}
              >
                Clear search
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Test Mode Alert */}
      {testModeEnabled && (
        <Alert className="border-warning">
          <TestTube className="h-4 w-4" />
          <AlertDescription>
            Test Mode Active: Mock UIDs will be generated instead of physical reader input
          </AlertDescription>
        </Alert>
      )}

      {/* Main Content Views - Middle Section */}
      <Tabs value={viewMode}>
        <TabsContent value="groups" className="space-y-4">
          {/* Group Order View */}
          {orderGroups.length === 0 ? (
            <Card>
              <CardContent className="pt-8 pb-8 text-center">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  {searchTerm ? 'No matches found' : 'No attendees available'}
                </h3>
                <p className="text-muted-foreground">
                  {searchTerm ? 'Try adjusting your search terms' : 'Load attendee data to begin RFID assignment'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
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
          )}
        </TabsContent>

        <TabsContent value="individual" className="space-y-4">
          {/* Individual View */}
          <IndividualView 
            attendees={filteredAttendees} 
            onRefresh={loadAttendees}
            searchTerm={searchTerm}
          />
        </TabsContent>
      </Tabs>

      {/* Bottom Section - Settings, Progress Overview, and Tools */}
      <Separator />
      
      {/* RFID Assignment Station Header */}
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
            {/* Settings */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <TestTube className="h-4 w-4" />
                <Label htmlFor="test-mode-bottom">Test Mode</Label>
                <Switch
                  id="test-mode-bottom"
                  checked={testModeEnabled}
                  onCheckedChange={setTestModeEnabled}
                />
              </div>
              <div className="flex items-center gap-2">
                <SkipForward className="h-4 w-4" />
                <Label htmlFor="auto-advance-bottom">Auto Advance</Label>
                <Switch
                  id="auto-advance-bottom"
                  checked={autoAdvanceEnabled}  
                  onCheckedChange={setAutoAdvanceEnabled}
                />
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>


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

      {/* Testing & Development Tools */}
      <RfidTestingSection />

      {/* Bulk Operations */}
      <RfidBulkOperationsSection staffId="MC2025" />

      {/* Scroll to Top Button */}
      <ScrollToTop />
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