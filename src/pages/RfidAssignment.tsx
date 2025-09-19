import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useRfidCapture } from "@/hooks/useRfidCapture";
import { supabase } from "@/integrations/supabase/client";
import { 
  Search, 
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Zap,
  Users,
  CheckCircle,
  AlertTriangle,
  Key,
  Timer
} from "lucide-react";
import { EnhancedRfidAssignmentCell } from "@/components/EnhancedRfidAssignmentCell";

interface AttendeeData {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  order_id?: string;
  ticket_type: string;
  rfid_uid?: string;
  rfid_status?: string;
  created_at: string;
}

const ROWS_PER_PAGE = 50;

export const RfidAssignment = () => {
  const [attendees, setAttendees] = useState<AttendeeData[]>([]);
  const [filteredAttendees, setFilteredAttendees] = useState<AttendeeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [mode, setMode] = useState<'pre-event' | 'day-of'>('pre-event');
  const [autoAdvanceEnabled, setAutoAdvanceEnabled] = useState(true);
  const [showOnlyUnassigned, setShowOnlyUnassigned] = useState(true);
  const [currentFocusRow, setCurrentFocusRow] = useState(0);
  const { toast } = useToast();

  // Progress calculations
  const totalCount = attendees.length;
  const assignedCount = attendees.filter(a => a.rfid_uid && a.rfid_status === 'assigned').length;
  const unassignedCount = totalCount - assignedCount;
  const progressPercent = totalCount > 0 ? (assignedCount / totalCount) * 100 : 0;

  // Load attendees data optimized for assignment workflow
  const loadAttendees = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('attendees')
        .select(`
          id,
          first_name,
          last_name,
          email,
          phone,
          order_id,
          ticket_type,
          created_at,
          rfid_tags(uid, status)
        `)
        .order('created_at', { ascending: false }); // Recent registrants first for day-of mode

      if (mode === 'pre-event') {
        // Pre-event: show all attendees, prioritize unassigned
        query = query.order('order_id', { ascending: true });
      }

      const { data, error } = await query;
      if (error) throw error;

      const processedAttendees: AttendeeData[] = data.map(attendee => {
        const rfidTag = (attendee.rfid_tags as any)?.[0];
        return {
          id: attendee.id,
          first_name: attendee.first_name,
          last_name: attendee.last_name,
          email: attendee.email,
          phone: attendee.phone,
          order_id: attendee.order_id,
          ticket_type: attendee.ticket_type,
          created_at: attendee.created_at,
          rfid_uid: rfidTag?.uid || null,
          rfid_status: rfidTag?.status || 'unissued',
        };
      });

      setAttendees(processedAttendees);
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
  }, [mode, toast]);

  // Enhanced filtering with search and assignment status
  useEffect(() => {
    let filtered = attendees;

    // Filter by assignment status
    if (showOnlyUnassigned) {
      filtered = filtered.filter(a => !a.rfid_uid || a.rfid_status !== 'assigned');
    }

    // Filter by search term
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(attendee => 
        `${attendee.first_name} ${attendee.last_name}`.toLowerCase().includes(term) ||
        (attendee.order_id && attendee.order_id.toLowerCase().includes(term)) ||
        (attendee.phone && attendee.phone.toLowerCase().includes(term)) ||
        (attendee.email && attendee.email.toLowerCase().includes(term))
      );
    }

    setFilteredAttendees(filtered);
    setCurrentPage(1); // Reset to first page on filter change
  }, [attendees, searchTerm, showOnlyUnassigned]);

  // Pagination
  const paginatedAttendees = useMemo(() => {
    const startIndex = (currentPage - 1) * ROWS_PER_PAGE;
    return filteredAttendees.slice(startIndex, startIndex + ROWS_PER_PAGE);
  }, [filteredAttendees, currentPage]);

  const totalPages = Math.ceil(filteredAttendees.length / ROWS_PER_PAGE);

  // Enhanced RFID capture handler
  const handleRfidCapture = useCallback(async (uid: string) => {
    if (!uid.trim()) return;
    
    toast({
      title: "RFID Captured",
      description: `UID: ${uid} - Ready for assignment`,
      duration: 2000,
    });
  }, [toast]);

  // RFID capture with optimized settings for assignment workflow
  useRfidCapture({
    onCapture: handleRfidCapture,
    enabled: true,
    minLength: 8,
    debounceMs: 50, // Ultra-fast for assignment workflow
  });

  // Auto-focus first unassigned row
  const focusFirstUnassigned = useCallback(() => {
    setTimeout(() => {
      const firstInput = document.querySelector('input[data-rfid-input="true"]:not([value])') as HTMLInputElement;
      if (firstInput) {
        firstInput.focus();
        firstInput.select();
        // Scroll row into view
        firstInput.closest('tr')?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        });
      }
    }, 200);
  }, []);

  // Keyboard shortcuts optimized for assignment workflow
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case 'g':
            e.preventDefault();
            focusFirstUnassigned();
            break;
          case ' ':
            e.preventDefault();
            setAutoAdvanceEnabled(prev => !prev);
            toast({
              title: "Auto-advance " + (autoAdvanceEnabled ? "disabled" : "enabled"),
              duration: 1500,
            });
            break;
          case 'r':
            e.preventDefault();
            loadAttendees();
            break;
        }
      } else if (e.key === 'F1') {
        e.preventDefault();
        // Show help overlay (could be implemented later)
        toast({
          title: "Keyboard Shortcuts",
          description: "Ctrl+G: Focus first unassigned • Ctrl+Space: Toggle auto-advance • Ctrl+R: Refresh",
          duration: 4000,
        });
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [focusFirstUnassigned, autoAdvanceEnabled, loadAttendees, toast]);

  // Load data on mount and when mode changes
  useEffect(() => {
    loadAttendees();
  }, [loadAttendees]);

  // Auto-focus first unassigned on data load
  useEffect(() => {
    if (paginatedAttendees.length > 0 && !loading) {
      focusFirstUnassigned();
    }
  }, [paginatedAttendees, loading, focusFirstUnassigned]);

  const handleAssignmentComplete = useCallback(() => {
    loadAttendees(); // Refresh data after assignment
  }, [loadAttendees]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto p-6">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 max-w-7xl">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground">RFID Assignment Station</h1>
              <p className="text-muted-foreground mt-1">
                Assign RFID tags to attendees using USB scanner
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Select value={mode} onValueChange={(value) => setMode(value as 'pre-event' | 'day-of')}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pre-event">Pre-Event</SelectItem>
                  <SelectItem value="day-of">Day-Of</SelectItem>
                </SelectContent>
              </Select>
              <Button 
                variant="outline" 
                onClick={loadAttendees}
                className="flex items-center gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                Refresh
              </Button>
            </div>
          </div>

          {/* Progress Overview */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-foreground">{totalCount}</div>
                <p className="text-xs text-muted-foreground">Total Attendees</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-warning">{unassignedCount}</div>
                <p className="text-xs text-muted-foreground">Unassigned</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-success">{assignedCount}</div>
                <p className="text-xs text-muted-foreground">Assigned</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-primary">{Math.round(progressPercent)}%</div>
                <p className="text-xs text-muted-foreground">Progress</p>
                <Progress value={progressPercent} className="mt-2 h-2" />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-muted-foreground">{filteredAttendees.length}</div>
                <p className="text-xs text-muted-foreground">Filtered Results</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between mb-6">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search name, order, phone, email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-search-input="true"
              data-exclude-rfid="true"
            />
          </div>

          {/* Controls */}
          <div className="flex items-center gap-6">
            <div className="flex items-center space-x-2">
              <Switch
                id="unassigned-only"
                checked={showOnlyUnassigned}
                onCheckedChange={setShowOnlyUnassigned}
              />
              <Label htmlFor="unassigned-only" className="text-sm">
                Unassigned only
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="auto-advance"
                checked={autoAdvanceEnabled}
                onCheckedChange={setAutoAdvanceEnabled}
              />
              <Label htmlFor="auto-advance" className="text-sm flex items-center gap-1">
                <Zap className="h-3 w-3" />
                Auto-advance
              </Label>
            </div>
          </div>
        </div>

        {/* Assignment Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                Assignment Table
                {mode === 'day-of' && (
                  <Badge variant="secondary" className="ml-2">
                    <Timer className="h-3 w-3 mr-1" />
                    Day-Of Mode
                  </Badge>
                )}
              </CardTitle>
              <div className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages} • {filteredAttendees.length} total
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Ticket Type</TableHead>
                    <TableHead className="w-64">RFID Assignment</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedAttendees.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12">
                        <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <div className="text-lg font-semibold mb-2">
                          {searchTerm ? 'No matches found' : 'No attendees to display'}
                        </div>
                        <p className="text-muted-foreground">
                          {searchTerm 
                            ? 'Try adjusting your search terms or filters'
                            : 'Load attendee data to begin RFID assignment'
                          }
                        </p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedAttendees.map((attendee, index) => {
                      const globalRowIndex = (currentPage - 1) * ROWS_PER_PAGE + index;
                      const isAssigned = attendee.rfid_uid && attendee.rfid_status === 'assigned';
                      
                      return (
                        <TableRow 
                          key={attendee.id} 
                          className={isAssigned ? 'bg-success/5' : ''}
                          data-row-index={globalRowIndex}
                        >
                          <TableCell className="font-mono text-sm">
                            {globalRowIndex + 1}
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">
                              {attendee.first_name} {attendee.last_name}
                            </div>
                            {attendee.email && (
                              <div className="text-sm text-muted-foreground">
                                {attendee.email}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {attendee.order_id || '-'}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {attendee.ticket_type}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <EnhancedRfidAssignmentCell
                              attendeeId={attendee.id}
                              currentRfidUid={attendee.rfid_uid}
                              currentRfidStatus={attendee.rfid_status}
                              attendeeName={`${attendee.first_name} ${attendee.last_name}`}
                              onAssignmentComplete={handleAssignmentComplete}
                            />
                          </TableCell>
                          <TableCell>
                            {isAssigned ? (
                              <div className="flex items-center gap-1 text-success">
                                <CheckCircle className="h-4 w-4" />
                                <span className="text-sm">Assigned</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 text-warning">
                                <AlertTriangle className="h-4 w-4" />
                                <span className="text-sm">Pending</span>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-muted-foreground">
                  Showing {((currentPage - 1) * ROWS_PER_PAGE) + 1} to{' '}
                  {Math.min(currentPage * ROWS_PER_PAGE, filteredAttendees.length)} of{' '}
                  {filteredAttendees.length} results
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <div className="text-sm px-3 py-1 border rounded">
                    {currentPage} / {totalPages}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Status Alert */}
        {autoAdvanceEnabled && (
          <Alert className="mt-4">
            <Zap className="h-4 w-4" />
            <AlertDescription>
              Auto-advance is enabled. After scanning an RFID, focus will automatically move to the next unassigned attendee.
              <kbd className="ml-2 px-2 py-1 text-xs bg-muted rounded">Ctrl+Space</kbd> to toggle.
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
};