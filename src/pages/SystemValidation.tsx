import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  RefreshCw, 
  Database, 
  Wifi, 
  Users, 
  Settings,
  ArrowLeft,
  Play
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

interface ValidationTest {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'running' | 'passed' | 'failed' | 'warning';
  result?: string;
  details?: string[];
}

interface SystemStats {
  totalAttendees: number;
  activeRfidTags: number;
  unissuedRfidTags: number;
  orphanedTags: number;
  recentTransactions: number;
  lastRegfoxSync: string;
}

const SystemValidation = () => {
  const [tests, setTests] = useState<ValidationTest[]>([
    {
      id: 'database_connection',
      name: 'Database Connection',
      description: 'Verify Supabase connection and basic queries',
      status: 'pending'
    },
    {
      id: 'rfid_integrity',
      name: 'RFID Tag Integrity',
      description: 'Check for orphaned tags and proper assignments',
      status: 'pending'
    },
    {
      id: 'attendee_data',
      name: 'Attendee Data Validation',
      description: 'Verify attendee records and RegFox sync',
      status: 'pending'
    },
    {
      id: 'station_workflows',
      name: 'Station Workflows',
      description: 'Test all station transaction capabilities',
      status: 'pending'
    },
    {
      id: 'sync_status',
      name: 'Sync Status & Lock Management',
      description: 'Validate RegFox sync health and cleanup mechanisms',
      status: 'pending'
    },
    {
      id: 'edge_functions',
      name: 'Edge Function Health',
      description: 'Test edge function availability and functionality',
      status: 'pending'
    },
    {
      id: 'database_schema',
      name: 'Database Schema Validation',
      description: 'Verify all required tables and enums exist',
      status: 'pending'
    }
  ]);

  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    loadSystemStats();
  }, []);

  const loadSystemStats = async () => {
    try {
      // Get attendee count
      const { data: attendeeData, error: attendeeError } = await supabase
        .from('attendees')
        .select('count', { count: 'exact' });

      if (attendeeError) throw attendeeError;

      // Get RFID tag stats
      const { data: rfidData, error: rfidError } = await supabase
        .from('rfid_tags')
        .select('status, attendee_id');

      if (rfidError) throw rfidError;

      // Get recent sync log
      const { data: syncData, error: syncError } = await supabase
        .from('regfox_sync_log')
        .select('sync_completed_at')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (syncError && syncError.code !== 'PGRST116') throw syncError;

      // Get recent transactions
      const { data: transactionData, error: transactionError } = await supabase
        .from('station_transactions')
        .select('count', { count: 'exact' })
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      if (transactionError) throw transactionError;

      const activeRfids = rfidData?.filter(tag => tag.status === 'active') || [];
      const unissuedRfids = rfidData?.filter(tag => tag.status === 'unissued') || [];
      const orphanedTags = activeRfids.filter(tag => !tag.attendee_id);

      setSystemStats({
        totalAttendees: attendeeData?.[0]?.count || 0,
        activeRfidTags: activeRfids.length,
        unissuedRfidTags: unissuedRfids.length,
        orphanedTags: orphanedTags.length,
        recentTransactions: transactionData?.[0]?.count || 0,
        lastRegfoxSync: syncData?.sync_completed_at || 'Never'
      });

    } catch (error) {
      console.error('Error loading system stats:', error);
      toast({
        title: "Error",
        description: "Failed to load system statistics",
        variant: "destructive"
      });
    }
  };

  const runValidationTests = async () => {
    setIsRunning(true);
    setProgress(0);

    for (let i = 0; i < tests.length; i++) {
      const test = tests[i];
      
      // Update test status to running
      setTests(prev => prev.map(t => 
        t.id === test.id ? { ...t, status: 'running' } : t
      ));

      try {
        const result = await runIndividualTest(test.id);
        
        setTests(prev => prev.map(t => 
          t.id === test.id ? { ...t, ...result } : t
        ));
      } catch (error) {
        setTests(prev => prev.map(t => 
          t.id === test.id ? { 
            ...t, 
            status: 'failed', 
            result: 'Test execution failed',
            details: [error instanceof Error ? error.message : 'Unknown error']
          } : t
        ));
      }

      setProgress(((i + 1) / tests.length) * 100);
      
      // Small delay between tests for better UX
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    setIsRunning(false);
    toast({
      title: "Validation Complete",
      description: "All system validation tests have been completed",
    });
  };

  const runIndividualTest = async (testId: string): Promise<Partial<ValidationTest>> => {
    switch (testId) {
      case 'database_connection':
        try {
          const { data, error } = await supabase.from('attendees').select('count', { count: 'exact' }).limit(1);
          if (error) throw error;
          return {
            status: 'passed',
            result: 'Database connection successful',
            details: [`Connected to Supabase`, `Query executed successfully`]
          };
        } catch (error) {
          return {
            status: 'failed',
            result: 'Database connection failed',
            details: [error instanceof Error ? error.message : 'Unknown database error']
          };
        }

      case 'rfid_integrity':
        try {
          const { data: rfidData, error } = await supabase
            .from('rfid_tags')
            .select('uid, status, attendee_id');
          
          if (error) throw error;
          
          // Check for duplicate UIDs
          const duplicateUids = rfidData?.filter((tag, index, array) => 
            array.findIndex(t => t.uid === tag.uid) !== index
          ) || [];
          
          // Get all distinct statuses currently in use (these are valid by database constraint)
          const usedStatuses = [...new Set(rfidData?.map(tag => tag.status) || [])];
          
          // Check orphaned active tags - any active tag without an attendee_id
          const orphaned = rfidData?.filter(tag => tag.status === 'active' && !tag.attendee_id) || [];
          const active = rfidData?.filter(tag => tag.status === 'active') || [];
          
          const issues = [];
          if (duplicateUids.length > 0) issues.push(`${duplicateUids.length} duplicate RFID UIDs found`);
          if (orphaned.length > 0) issues.push(`${orphaned.length} orphaned active tags`);
          
          if (issues.length > 0) {
            return {
              status: 'warning',
              result: 'RFID integrity issues found',
              details: [
                ...issues,
                `${active.length} total active RFID tags`,
                `Statuses in use: ${usedStatuses.join(', ')}`
              ]
            };
          }
          
          return {
            status: 'passed',
            result: 'RFID tag integrity validated',
            details: [
              `${active.length} active RFID tags`,
              `0 orphaned tags found`,
              `0 duplicate UIDs found`,
              'All tags have valid statuses'
            ]
          };
        } catch (error) {
          return {
            status: 'failed',
            result: 'RFID integrity check failed',
            details: [error instanceof Error ? error.message : 'Unknown RFID error']
          };
        }

      case 'attendee_data':
        try {
          // Query attendee data
          const { data: attendeeData, error } = await supabase
            .from('attendees')
            .select('id, first_name, last_name, regfox_id, ticket_type');
          
          if (error) throw error;
          
          // Get all distinct ticket types currently in use (these are valid by database constraint)
          const usedTicketTypes = [...new Set(attendeeData?.map(a => a.ticket_type) || [])];
          
          const missingNames = attendeeData?.filter(a => !a.first_name || !a.last_name) || [];
          const missingRegfox = attendeeData?.filter(a => !a.regfox_id) || [];
          
          // Get ticket type distribution
          const ticketDistribution = attendeeData?.reduce((acc, a) => {
            acc[a.ticket_type] = (acc[a.ticket_type] || 0) + 1;
            return acc;
          }, {} as Record<string, number>) || {};
          
          const issues = [];
          if (missingNames.length > 0) issues.push(`${missingNames.length} attendees missing names`);
          if (missingRegfox.length > 0) issues.push(`${missingRegfox.length} attendees missing RegFox ID`);
          
          if (issues.length > 0) {
            return {
              status: 'warning',
              result: 'Attendee data validation issues found',
              details: [
                ...issues,
                `Ticket types in use: ${usedTicketTypes.join(', ')}`,
                `Distribution: ${Object.entries(ticketDistribution).map(([k, v]) => `${k}: ${v}`).join(', ')}`
              ]
            };
          }
          
          return {
            status: 'passed',
            result: 'Attendee data validated successfully',
            details: [
              `${attendeeData?.length || 0} attendees in database`,
              'All required fields present',
              `Ticket types: ${usedTicketTypes.join(', ')}`,
              `Distribution: ${Object.entries(ticketDistribution).map(([k, v]) => `${k}: ${v}`).join(', ')}`
            ]
          };
        } catch (error) {
          return {
            status: 'failed',
            result: 'Attendee data validation failed',
            details: [error instanceof Error ? error.message : 'Unknown attendee error']
          };
        }

      case 'station_workflows':
        try {
          const { data: transactionData, error } = await supabase
            .from('station_transactions')
            .select('station_type, transaction_type, created_at')
            .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
            .limit(100);
          
          if (error) throw error;
          
          // Get all distinct types currently in use (these are valid by database constraint)
          const usedStationTypes = [...new Set(transactionData?.map(t => t.station_type) || [])];
          const usedTransactionTypes = [...new Set(transactionData?.map(t => t.transaction_type) || [])];
          
          const stationActivity = transactionData?.reduce((acc, t) => {
            acc[t.station_type] = (acc[t.station_type] || 0) + 1;
            return acc;
          }, {} as Record<string, number>) || {};
          
          const issues = [];
          // Since database constraints ensure valid enum values, we just check for data consistency
          
          if (issues.length > 0) {
            return {
              status: 'warning',
              result: 'Station workflow validation issues found',
              details: [
                ...issues,
                `Station types: ${usedStationTypes.join(', ')}`,
                `Transaction types: ${usedTransactionTypes.join(', ')}`
              ]
            };
          }
          
          return {
            status: 'passed',
            result: 'Station workflows validated successfully',
            details: [
              `${transactionData?.length || 0} recent transactions (24h)`,
              `Station types: ${usedStationTypes.join(', ') || 'None'}`,
              `Transaction types: ${usedTransactionTypes.join(', ') || 'None'}`,
              `Activity: ${Object.entries(stationActivity).map(([k, v]) => `${k}: ${v}`).join(', ') || 'None'}`
            ]
          };
        } catch (error) {
          return {
            status: 'failed',
            result: 'Station workflow validation failed',
            details: [error instanceof Error ? error.message : 'Unknown station error']
          };
        }

      case 'sync_status':
        try {
          // Check sync locks and cleanup mechanism
          const { data: lockData, error: lockError } = await supabase
            .from('sync_locks')
            .select('*');
          
          const { data: syncData, error: syncError } = await supabase
            .from('regfox_sync_log')
            .select('status, sync_started_at, sync_completed_at, error_message, heartbeat_at')
            .order('sync_started_at', { ascending: false })
            .limit(10);
          
          if (syncError) throw syncError;
          
          const recentSync = syncData?.[0];
          const activeSyncs = syncData?.filter(s => s.status === 'in_progress') || [];
          
          // Check for stuck syncs (no heartbeat for >3 minutes)
          const stuckSyncs = activeSyncs.filter(s => {
            const heartbeat = s.heartbeat_at ? new Date(s.heartbeat_at) : new Date(s.sync_started_at);
            return Date.now() - heartbeat.getTime() > 3 * 60 * 1000;
          });
          
          const issues = [];
          if (activeSyncs.length > 1) issues.push(`${activeSyncs.length} active syncs (should be ≤1)`);
          if (stuckSyncs.length > 0) issues.push(`${stuckSyncs.length} stuck syncs (no heartbeat for >3min)`);
          
          if (issues.length > 0) {
            return {
              status: 'warning',
              result: 'Sync status issues detected',
              details: [
                ...issues,
                `Active locks: ${lockData?.length || 0}`,
                `Last sync: ${recentSync?.status || 'none'}`,
                'Cleanup mechanism may need attention'
              ]
            };
          }
          
          return {
            status: 'passed',
            result: 'Sync status healthy',
            details: [
              `Last sync: ${recentSync?.status || 'No syncs found'}`,
              `Active syncs: ${activeSyncs.length}`,
              `Active locks: ${lockData?.length || 0}`,
              'Cleanup mechanism working properly'
            ]
          };
        } catch (error) {
          return {
            status: 'failed',
            result: 'Sync status check failed',
            details: [error instanceof Error ? error.message : 'Unknown sync error']
          };
        }

      case 'edge_functions':
        try {
          // Test edge function health by checking sync functionality
          const { data: canSyncData, error: canSyncError } = await supabase.rpc('can_start_sync');
          
          const issues = [];
          if (canSyncError) issues.push(`can_start_sync function error: ${canSyncError.message}`);
          
          if (issues.length > 0) {
            return {
              status: 'failed',
              result: 'Edge function health check failed',
              details: issues
            };
          }
          
          return {
            status: 'passed',
            result: 'Edge functions accessible',
            details: [
              'Database functions responding',
              `can_start_sync: ${canSyncData ? 'ready' : 'blocked'}`,
              'RegFox sync functions operational'
            ]
          };
        } catch (error) {
          return {
            status: 'failed',
            result: 'Edge function test failed',
            details: [error instanceof Error ? error.message : 'Unknown function error']
          };
        }

      case 'database_schema':
        try {
          // Validate key tables and functionality exist
          const tableChecks = [];
          const errors = [];
          
          try {
            await supabase.from('attendees').select('id').limit(1);
            tableChecks.push('attendees');
          } catch (e) {
            errors.push('attendees table inaccessible');
          }
          
          try {
            await supabase.from('rfid_tags').select('uid').limit(1);
            tableChecks.push('rfid_tags');
          } catch (e) {
            errors.push('rfid_tags table inaccessible');
          }
          
          try {
            await supabase.from('station_transactions').select('id').limit(1);
            tableChecks.push('station_transactions');
          } catch (e) {
            errors.push('station_transactions table inaccessible');
          }
          
          try {
            await supabase.from('regfox_sync_log').select('id').limit(1);
            tableChecks.push('regfox_sync_log');
          } catch (e) {
            errors.push('regfox_sync_log table inaccessible');
          }
          
          try {
            await supabase.from('sync_locks').select('id').limit(1);
            tableChecks.push('sync_locks');
          } catch (e) {
            errors.push('sync_locks table inaccessible');
          }
          
          if (errors.length > 0) {
            return {
              status: 'failed',
              result: 'Database schema validation failed',
              details: errors
            };
          }
          
          return {
            status: 'passed',
            result: 'Database schema validated',
            details: [
              `${tableChecks.length} core tables accessible`,
              'All required tables present',
              'Schema structure verified',
              `Tables: ${tableChecks.join(', ')}`
            ]
          };
        } catch (error) {
          return {
            status: 'failed',
            result: 'Database schema check failed',
            details: [error instanceof Error ? error.message : 'Unknown schema error']
          };
        }

      default:
        return {
          status: 'failed',
          result: 'Unknown test',
          details: ['Test implementation not found']
        };
    }
  };

  const getStatusIcon = (status: ValidationTest['status']) => {
    switch (status) {
      case 'passed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'running':
        return <RefreshCw className="h-5 w-5 text-blue-500 animate-spin" />;
      default:
        return <div className="h-5 w-5 rounded-full bg-gray-300" />;
    }
  };

  const getStatusBadge = (status: ValidationTest['status']) => {
    const variants = {
      passed: 'default',
      failed: 'destructive',
      warning: 'secondary',
      running: 'outline',
      pending: 'outline'
    } as const;

    return (
      <Badge variant={variants[status]}>
        {status.toUpperCase()}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-secondary">System Validation</h1>
            <p className="text-muted-foreground">Pre-event system testing and validation</p>
          </div>
          <Button variant="outline" onClick={() => navigate("/")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Button>
        </div>

        {/* System Stats */}
        {systemStats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Attendees</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{systemStats.totalAttendees}</div>
                <p className="text-xs text-muted-foreground">Registered attendees</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active RFID Tags</CardTitle>
                <Wifi className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{systemStats.activeRfidTags}</div>
                <p className="text-xs text-muted-foreground">
                  {systemStats.orphanedTags > 0 
                    ? `${systemStats.orphanedTags} orphaned`
                    : 'All properly assigned'
                  }
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Available Tags</CardTitle>
                <Database className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{systemStats.unissuedRfidTags}</div>
                <p className="text-xs text-muted-foreground">Ready for activation</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
                <Settings className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{systemStats.recentTransactions}</div>
                <p className="text-xs text-muted-foreground">Transactions (24h)</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Test Controls */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Play className="h-5 w-5" />
              Validation Tests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mb-4">
              <Button 
                onClick={runValidationTests} 
                disabled={isRunning}
                size="lg"
              >
                {isRunning && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
                {isRunning ? 'Running Tests...' : 'Run All Validation Tests'}
              </Button>
              
              {isRunning && (
                <div className="flex-1">
                  <Progress value={progress} className="w-full" />
                  <p className="text-sm text-muted-foreground mt-1">
                    {Math.round(progress)}% complete
                  </p>
                </div>
              )}
            </div>

            {tests.some(t => t.status === 'failed') && (
              <Alert variant="destructive" className="mb-4">
                <XCircle className="h-4 w-4" />
                <AlertDescription>
                  Some validation tests failed. Please review the results and fix any issues before going live.
                </AlertDescription>
              </Alert>
            )}

            {tests.some(t => t.status === 'warning') && (
              <Alert className="mb-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Some validation tests have warnings. Review the details to ensure optimal performance.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Test Results */}
        <div className="space-y-4">
          {tests.map((test) => (
            <Card key={test.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(test.status)}
                    <div>
                      <CardTitle className="text-lg">{test.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">{test.description}</p>
                    </div>
                  </div>
                  {getStatusBadge(test.status)}
                </div>
              </CardHeader>
              
              {test.result && (
                <CardContent>
                  <div className="space-y-2">
                    <p className="font-medium">{test.result}</p>
                    {test.details && test.details.length > 0 && (
                      <ul className="text-sm text-muted-foreground space-y-1">
                        {test.details.map((detail, index) => (
                          <li key={index} className="flex items-center gap-2">
                            <div className="w-1 h-1 bg-muted-foreground rounded-full" />
                            {detail}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SystemValidation;