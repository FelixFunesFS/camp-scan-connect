import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Users, 
  Zap,
  Database,
  Wifi,
  Shield,
  Settings,
  Phone,
  CreditCard,
  Monitor,
  TrendingUp,
  Trash2,
  BarChart3
} from 'lucide-react';
import { toast } from 'sonner';
import { StaffGuideHub } from './StaffGuideHub';
import { AbandonedRecordsCleanup } from './AbandonedRecordsManager';
import { RegFoxComparisonPanel } from './RegFoxComparisonPanel';

interface SystemHealthMetrics {
  totalAttendees: number;
  activatedAttendees: number;
  assignedRfids: number;
  unassignedRfids: number;
  openAssistanceRequests: number;
  waiverSignedCount: number;
  activationRate: number;
  rfidUtilization: number;
  waiverCompliance: number;
}

interface EdgeCaseTestResult {
  testName: string;
  status: 'pass' | 'fail' | 'warning' | 'critical';
  message: string;
  impact: 'critical' | 'high' | 'medium' | 'low';
}

export function ProductionReadiness() {
  const [healthMetrics, setHealthMetrics] = useState<SystemHealthMetrics | null>(null);
  const [testResults, setTestResults] = useState<EdgeCaseTestResult[]>([]);
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(true);

  useEffect(() => {
    loadSystemHealth();
  }, []);

  const loadSystemHealth = async () => {
    try {
      setIsLoadingMetrics(true);
      
      // Get attendee statistics
      const { data: attendeeStats } = await supabase
        .from('attendees')
        .select('id, activated_at, waiver_signed');
      
      // Get RFID statistics  
      const { data: rfidStats } = await supabase
        .from('rfid_tags')
        .select('uid, status, attendee_id');

      // Get assistance requests
      const { data: assistanceStats } = await supabase
        .from('staff_assistance_requests')
        .select('id, status')
        .eq('status', 'open');

      if (attendeeStats && rfidStats) {
        const totalAttendees = attendeeStats.length;
        const activatedAttendees = attendeeStats.filter(a => a.activated_at).length;
        const waiverSignedCount = attendeeStats.filter(a => a.waiver_signed).length;
        const assignedRfids = rfidStats.filter(r => r.status === 'assigned').length;
        const unassignedRfids = rfidStats.filter(r => r.status === 'unissued').length;
        
        setHealthMetrics({
          totalAttendees,
          activatedAttendees,
          assignedRfids,
          unassignedRfids,
          openAssistanceRequests: assistanceStats?.length || 0,
          waiverSignedCount,
          activationRate: totalAttendees > 0 ? (activatedAttendees / totalAttendees) * 100 : 0,
          rfidUtilization: rfidStats.length > 0 ? (assignedRfids / rfidStats.length) * 100 : 0,
          waiverCompliance: totalAttendees > 0 ? (waiverSignedCount / totalAttendees) * 100 : 0
        });
      }
    } catch (error) {
      console.error('Error loading system health:', error);
      toast.error("Could not load system health metrics");
    } finally {
      setIsLoadingMetrics(false);
    }
  };

  const runEdgeCaseTests = async () => {
    setIsRunningTests(true);
    const results: EdgeCaseTestResult[] = [];

    try {
      // Test 1: Phone Number Format Validation
      const { data: phoneData } = await supabase
        .from('attendees')
        .select('phone')
        .not('phone', 'is', null);
      
      const invalidPhones = phoneData?.filter(p => 
        p.phone && !/^\(\d{3}\) \d{3}-\d{4}$/.test(p.phone)
      ) || [];
      
      results.push({
        testName: 'Phone Number Format Consistency',
        status: invalidPhones.length === 0 ? 'pass' : 'warning',
        message: invalidPhones.length === 0 
          ? 'All phone numbers are properly formatted'
          : `${invalidPhones.length} phone numbers need standardization`,
        impact: 'high'
      });

      // Test 2: Waiver Compliance
      const waiverFailures = healthMetrics ? 
        healthMetrics.totalAttendees - healthMetrics.waiverSignedCount : 0;
      
      results.push({
        testName: 'Waiver Compliance Check',
        status: waiverFailures === 0 ? 'pass' : 'critical',
        message: waiverFailures === 0 
          ? 'All attendees have signed waivers'
          : `${waiverFailures} attendees missing signed waivers`,
        impact: 'critical'
      });

      // Test 3: Credential Assignment Gaps
      const unassignedCount = healthMetrics?.unassignedRfids || 0;
      results.push({
        testName: 'Credential Assignment Coverage',
        status: unassignedCount < 50 ? 'pass' : 'warning',
        message: `${unassignedCount} credentials available for assignment`,
        impact: 'medium'
      });

      // Test 4: Duplicate Registration Check
      const { data: duplicateCheck } = await supabase
        .from('attendees')
        .select('email, phone')
        .not('email', 'is', null);
      
      const emailCounts = new Map();
      duplicateCheck?.forEach(a => {
        if (a.email) {
          emailCounts.set(a.email, (emailCounts.get(a.email) || 0) + 1);
        }
      });
      
      const duplicates = Array.from(emailCounts.values()).filter(count => count > 1).length;
      
      results.push({
        testName: 'Duplicate Registration Detection',
        status: duplicates === 0 ? 'pass' : 'warning',
        message: duplicates === 0 
          ? 'No duplicate registrations found'
          : `${duplicates} potential duplicate email addresses detected`,
        impact: 'medium'
      });

      // Test 5: System Connectivity
      const startTime = Date.now();
      await supabase.from('attendees').select('id').limit(1);
      const responseTime = Date.now() - startTime;
      
      results.push({
        testName: 'Database Response Time',
        status: responseTime < 1000 ? 'pass' : responseTime < 3000 ? 'warning' : 'fail',
        message: `Database responding in ${responseTime}ms`,
        impact: responseTime > 3000 ? 'high' : 'low'
      });

    } catch (error) {
      results.push({
        testName: 'Test Suite Execution',
        status: 'fail',
        message: 'Error occurred during testing: ' + (error as Error).message,
        impact: 'high'
      });
    }

    setTestResults(results);
    setIsRunningTests(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'fail': return <XCircle className="h-4 w-4 text-red-600" />;
      case 'critical': return <XCircle className="h-4 w-4 text-red-700" />;
      default: return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getImpactBadge = (impact: string) => {
    const variants = {
      critical: 'destructive',
      high: 'destructive', 
      medium: 'default',
      low: 'secondary'
    } as const;
    
    return <Badge variant={variants[impact as keyof typeof variants]}>{impact}</Badge>;
  };

  if (isLoadingMetrics) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading system metrics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Production Readiness Dashboard</h2>
          <p className="text-muted-foreground">Monitor system health and validate edge cases</p>
        </div>
        <Button onClick={loadSystemHealth} variant="outline">
          <Monitor className="h-4 w-4 mr-2" />
          Refresh Metrics
        </Button>
      </div>

      <Tabs defaultValue="health" className="space-y-4">
        <TabsList className="grid w-full grid-cols-8">
          <TabsTrigger value="health">System Health</TabsTrigger>
          <TabsTrigger value="tests">Edge Case Tests</TabsTrigger>
          <TabsTrigger value="cleanup">Database Cleanup</TabsTrigger>
          <TabsTrigger value="regfox">RegFox Comparison</TabsTrigger>
          <TabsTrigger value="guides">Staff Operations Guide</TabsTrigger>
          <TabsTrigger value="bulk">Bulk Operations</TabsTrigger>
          <TabsTrigger value="fallbacks">Fallback Procedures</TabsTrigger>
          <TabsTrigger value="contacts">Emergency Contacts</TabsTrigger>
        </TabsList>

        <TabsContent value="health" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Attendees</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{healthMetrics?.totalAttendees || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {healthMetrics?.activatedAttendees || 0} activated ({healthMetrics?.activationRate.toFixed(1)}%)
                </p>
                <Progress value={healthMetrics?.activationRate || 0} className="mt-2" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">RFID Utilization</CardTitle>
                <CreditCard className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{healthMetrics?.assignedRfids || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {healthMetrics?.unassignedRfids || 0} available ({healthMetrics?.rfidUtilization.toFixed(1)}% used)
                </p>
                <Progress value={healthMetrics?.rfidUtilization || 0} className="mt-2" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Waiver Compliance</CardTitle>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{healthMetrics?.waiverSignedCount || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {healthMetrics?.waiverCompliance.toFixed(1)}% compliance rate
                </p>
                <Progress value={healthMetrics?.waiverCompliance || 0} className="mt-2" />
              </CardContent>
            </Card>
          </div>

          {healthMetrics && healthMetrics.waiverCompliance < 100 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Waiver Compliance Warning:</strong> {healthMetrics.totalAttendees - healthMetrics.waiverSignedCount} attendees 
                have not signed waivers. This will prevent activation and may cause issues during check-in.
              </AlertDescription>
            </Alert>
          )}

          {healthMetrics && healthMetrics.openAssistanceRequests > 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Pending Assistance:</strong> {healthMetrics.openAssistanceRequests} open staff assistance requests 
                require attention.
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>

        <TabsContent value="tests" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Edge Case Validation</h3>
              <p className="text-sm text-muted-foreground">Run comprehensive tests to identify potential issues</p>
            </div>
            <Button 
              onClick={runEdgeCaseTests} 
              disabled={isRunningTests}
              className="flex items-center gap-2"
            >
              {isRunningTests ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Running Tests...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4" />
                  Run Edge Case Tests
                </>
              )}
            </Button>
          </div>

          {testResults.length > 0 && (
            <div className="space-y-2">
              {testResults.map((result, index) => (
                <Card key={index}>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(result.status)}
                        <div>
                          <h4 className="font-medium">{result.testName}</h4>
                          <p className="text-sm text-muted-foreground">{result.message}</p>
                        </div>
                      </div>
                      {getImpactBadge(result.impact)}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="cleanup" className="space-y-4">
          <AbandonedRecordsCleanup />
        </TabsContent>

        <TabsContent value="regfox" className="space-y-4">
          <RegFoxComparisonPanel />
        </TabsContent>

        <TabsContent value="guides" className="space-y-4">
          <StaffGuideHub />
        </TabsContent>

        <TabsContent value="bulk" className="space-y-4">
          <h3 className="text-lg font-semibold">Bulk Operations</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Data Management
                </CardTitle>
                <CardDescription>Bulk operations for attendee and RFID data</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full justify-start">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clean Duplicate Records
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Compare RegFox Data
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  Bulk Credential Assignment
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  Mass Attendee Import
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  Batch Waiver Updates
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  System Operations
                </CardTitle>
                <CardDescription>Administrative and maintenance tasks</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full justify-start">
                  Reset Failed Transactions
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  Clear Test Data
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  Force Sync RegFox
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="fallbacks" className="space-y-4">
          <h3 className="text-lg font-semibold">Emergency Procedures</h3>
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wifi className="h-5 w-5" />
                  Network Connectivity Issues
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="list-decimal list-inside space-y-2 text-sm">
                  <li>Switch to manual RFID entry mode</li>
                  <li>Record transactions on paper backup sheets</li>
                  <li>Use mobile hotspot for critical operations</li>
                  <li>Contact IT support: ext. 911</li>
                  <li>Sync transactions once connectivity restored</li>
                </ol>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="h-5 w-5" />
                  Phone Activation Failures
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="list-decimal list-inside space-y-2 text-sm">
                  <li>Verify phone number format: (555) 123-4567</li>
                  <li>Search by email or name as alternative</li>
                  <li>Use staff activation override if attendee present</li>
                  <li>Create manual assistance request for follow-up</li>
                  <li>Document issue in transaction notes</li>
                </ol>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Scanner Hardware Failure
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="list-decimal list-inside space-y-2 text-sm">
                  <li>Switch to manual UID entry mode</li>
                  <li>Use backup USB scanner if available</li>
                  <li>Record RFID numbers manually on backup forms</li>
                  <li>Contact hardware support: ext. 915</li>
                  <li>Process manual entries during next sync</li>
                </ol>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="contacts" className="space-y-4">
          <h3 className="text-lg font-semibold">Emergency Contacts</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Technical Support</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="font-medium">Developer Lead:</span>
                  <span>ext. 901</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Database Admin:</span>
                  <span>ext. 902</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">IT Hardware:</span>
                  <span>ext. 915</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Network Support:</span>
                  <span>ext. 911</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Event Operations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="font-medium">Event Director:</span>
                  <span>ext. 800</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Staff Coordinator:</span>
                  <span>ext. 801</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Check-in Lead:</span>
                  <span>ext. 805</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Equipment Manager:</span>
                  <span>ext. 820</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}