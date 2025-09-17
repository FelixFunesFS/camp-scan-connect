// RFID Testing Hub - Synthetic Testing Framework
import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  Play, 
  Square, 
  Zap, 
  Database, 
  TestTube, 
  Activity,
  ArrowLeft,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSyntheticRfid } from '@/hooks/useSyntheticRfid';
import { 
  generateTestRfidUid, 
  generateTestAttendee, 
  TEST_SCENARIOS, 
  RfidTestDatabase,
  performanceTests,
  type TestScenario 
} from '@/utils/rfidTestUtils';
import { rfidService } from '@/services/rfidService';
import { toast } from 'sonner';

export default function RfidTestingHub() {
  const navigate = useNavigate();
  const [currentUid, setCurrentUid] = useState('');
  const [testResults, setTestResults] = useState<Array<{
    scenario: string;
    status: 'pending' | 'running' | 'success' | 'error';
    message: string;
    timestamp: Date;
  }>>([]);
  const [isRunningScenarios, setIsRunningScenarios] = useState(false);
  const [selectedScenario, setSelectedScenario] = useState<TestScenario | null>(null);
  const [performanceResults, setPerformanceResults] = useState<any>(null);

  // Synthetic RFID hook
  const syntheticRfid = useSyntheticRfid({
    onCapture: (uid: string) => {
      setCurrentUid(uid);
      toast.success(`Synthetic RFID captured: ${uid}`);
    },
    autoMode: false,
    interval: 2000,
    uidType: 'valid'
  });

  const handleManualUidTest = async () => {
    if (!currentUid.trim()) {
      toast.error('Please enter a UID to test');
      return;
    }

    try {
      const attendee = await rfidService.findAttendeeByRfid(currentUid);
      if (attendee) {
        toast.success(`Found attendee: ${attendee.attendee?.first_name} ${attendee.attendee?.last_name}`);
      } else {
        toast.info('No attendee found for this UID');
      }
    } catch (error) {
      toast.error('Error testing UID');
      console.error(error);
    }
  };

  const runTestScenario = async (scenario: TestScenario) => {
    setSelectedScenario(scenario);
    
    const resultEntry = {
      scenario: scenario.name,
      status: 'running' as const,
      message: 'Initializing test...',
      timestamp: new Date()
    };
    
    setTestResults(prev => [...prev, resultEntry]);

    try {
      // Step 1: Create test attendee
      const success = await RfidTestDatabase.createTestAttendee(scenario.attendee);
      if (!success) {
        throw new Error('Failed to create test attendee');
      }

      // Step 2: Test RFID assignment if UID provided
      if (scenario.rfidUid) {
        const validation = await rfidService.validateRfidUid(scenario.rfidUid);
        if (!validation.isValid && scenario.expectedOutcome === 'success') {
          throw new Error(`RFID validation failed: ${validation.message}`);
        }

        const assignment = await rfidService.assignRfidToAttendee(
          scenario.attendee.id, 
          scenario.rfidUid
        );
        
        if (!assignment.success && scenario.expectedOutcome === 'success') {
          throw new Error(`RFID assignment failed: ${assignment.message}`);
        }
      }

      // Step 3: Test attendee readiness
      const readiness = await rfidService.checkAttendeeReadiness(scenario.attendee.id);
      
      // Update result based on expected outcome
      const finalResult = {
        ...resultEntry,
        status: (scenario.expectedOutcome === 'error' ? 
          (readiness.isReady ? 'error' : 'success') : 
          (readiness.isReady ? 'success' : 'error')) as 'success' | 'error',
        message: `Test completed. Readiness: ${readiness.message}`,
        timestamp: new Date()
      };

      setTestResults(prev => 
        prev.map(r => r.scenario === scenario.name ? finalResult : r)
      );

      toast.success(`Scenario "${scenario.name}" completed`);

    } catch (error) {
      const errorResult = {
        ...resultEntry,
        status: (scenario.expectedOutcome === 'error' ? 'success' : 'error') as 'success' | 'error',
        message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date()
      };

      setTestResults(prev => 
        prev.map(r => r.scenario === scenario.name ? errorResult : r)
      );

      if (scenario.expectedOutcome !== 'error') {
        toast.error(`Scenario "${scenario.name}" failed`);
      } else {
        toast.success(`Scenario "${scenario.name}" correctly failed as expected`);
      }
    }
  };

  const runAllScenarios = async () => {
    setIsRunningScenarios(true);
    setTestResults([]);

    for (const scenario of TEST_SCENARIOS) {
      await runTestScenario(scenario);
      // Small delay between scenarios
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    setIsRunningScenarios(false);
    toast.success('All test scenarios completed');
  };

  const runPerformanceTest = async () => {
    toast.info('Running performance tests...');
    
    try {
      const times = await performanceTests.testRapidScanning(20);
      const analysis = performanceTests.analyzePerformance(times);
      
      setPerformanceResults(analysis);
      toast.success(`Performance test completed. Average: ${analysis.average}ms`);
    } catch (error) {
      toast.error('Performance test failed');
      console.error(error);
    }
  };

  const cleanupTestData = async () => {
    try {
      await RfidTestDatabase.cleanupTestData();
      toast.success('Test data cleaned up successfully');
      setTestResults([]);
      setPerformanceResults(null);
    } catch (error) {
      toast.error('Failed to cleanup test data');
      console.error(error);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/admin')}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Admin Hub
          </Button>
          <div>
            <h1 className="text-3xl font-bold">RFID Testing Hub</h1>
            <p className="text-muted-foreground">Synthetic testing framework for RFID workflows</p>
          </div>
        </div>

        <Tabs defaultValue="generator" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="generator">UID Generator</TabsTrigger>
            <TabsTrigger value="scenarios">Test Scenarios</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="database">Database Utils</TabsTrigger>
          </TabsList>

          {/* UID Generator Tab */}
          <TabsContent value="generator" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Manual Testing */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TestTube className="h-5 w-5" />
                    Manual UID Testing
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>RFID UID</Label>
                    <div className="flex gap-2">
                      <Input
                        value={currentUid}
                        onChange={(e) => setCurrentUid(e.target.value)}
                        placeholder="Enter UID or generate one"
                        className="flex-1"
                      />
                      <Button
                        variant="outline"
                        onClick={() => setCurrentUid(generateTestRfidUid('valid'))}
                      >
                        Generate
                      </Button>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button onClick={handleManualUidTest} className="flex-1">
                      Test UID
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={syntheticRfid.singleScan}
                    >
                      <Zap className="h-4 w-4" />
                    </Button>
                  </div>

                  <Separator />
                  
                  <div className="space-y-2">
                    <Label>Quick Generate</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentUid(generateTestRfidUid('short'))}
                      >
                        Short UID
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentUid(generateTestRfidUid('long'))}
                      >
                        Long UID
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentUid(generateTestRfidUid('special'))}
                      >
                        Special Chars
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentUid(generateTestRfidUid('duplicate'))}
                      >
                        Duplicate Test
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Synthetic Scanner */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Synthetic RFID Scanner
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      This simulates an RFID reader without physical hardware
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Auto Scanning</Label>
                      <Badge variant={syntheticRfid.isActive ? "default" : "secondary"}>
                        {syntheticRfid.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        variant={syntheticRfid.isActive ? "destructive" : "default"}
                        onClick={syntheticRfid.isActive ? syntheticRfid.stopAutoScanning : syntheticRfid.startAutoScanning}
                        className="flex-1"
                      >
                        {syntheticRfid.isActive ? (
                          <>
                            <Square className="h-4 w-4 mr-2" />
                            Stop
                          </>
                        ) : (
                          <>
                            <Play className="h-4 w-4 mr-2" />
                            Start
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Rapid Fire Testing</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => syntheticRfid.rapidFire(5, 300)}
                        disabled={syntheticRfid.isActive}
                      >
                        5 Scans
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => syntheticRfid.rapidFire(10, 100)}
                        disabled={syntheticRfid.isActive}
                      >
                        10 Fast
                      </Button>
                    </div>
                  </div>

                  <div className="text-sm text-muted-foreground">
                    <div>Scans Generated: {syntheticRfid.scanCount}</div>
                    {syntheticRfid.lastUid && (
                      <div>Last UID: <code className="text-xs">{syntheticRfid.lastUid}</code></div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Test Scenarios Tab */}
          <TabsContent value="scenarios" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <TestTube className="h-5 w-5" />
                    Automated Test Scenarios
                  </span>
                  <Button 
                    onClick={runAllScenarios}
                    disabled={isRunningScenarios}
                    className="gap-2"
                  >
                    {isRunningScenarios ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                    Run All Scenarios
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {TEST_SCENARIOS.map((scenario, index) => (
                    <Card key={index} className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-semibold">{scenario.name}</h4>
                            <p className="text-sm text-muted-foreground">
                              {scenario.description}
                            </p>
                          </div>
                          <Badge variant={
                            scenario.expectedOutcome === 'success' ? 'default' :
                            scenario.expectedOutcome === 'error' ? 'destructive' : 'secondary'
                          }>
                            {scenario.expectedOutcome}
                          </Badge>
                        </div>
                        
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => runTestScenario(scenario)}
                          disabled={isRunningScenarios}
                          className="w-full"
                        >
                          Run Test
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>

                {/* Test Results */}
                {testResults.length > 0 && (
                  <div className="mt-6 space-y-2">
                    <h3 className="font-semibold">Test Results</h3>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {testResults.map((result, index) => (
                        <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
                          {result.status === 'running' && (
                            <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />
                          )}
                          {result.status === 'success' && (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          )}
                          {result.status === 'error' && (
                            <XCircle className="h-4 w-4 text-red-500" />
                          )}
                          
                          <div className="flex-1 min-w-0">
                            <div className="font-medium">{result.scenario}</div>
                            <div className="text-sm text-muted-foreground truncate">
                              {result.message}
                            </div>
                          </div>
                          
                          <div className="text-xs text-muted-foreground">
                            {result.timestamp.toLocaleTimeString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Performance Tab */}
          <TabsContent value="performance" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Performance Testing
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button onClick={runPerformanceTest} className="w-full">
                  Run Performance Test
                </Button>
                
                {performanceResults && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-green-600">
                        {performanceResults.average}ms
                      </div>
                      <div className="text-sm text-muted-foreground">Average</div>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">
                        {performanceResults.minimum}ms
                      </div>
                      <div className="text-sm text-muted-foreground">Minimum</div>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-orange-600">
                        {performanceResults.maximum}ms
                      </div>
                      <div className="text-sm text-muted-foreground">Maximum</div>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold">
                        {performanceResults.total}
                      </div>
                      <div className="text-sm text-muted-foreground">Total Scans</div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Database Utils Tab */}
          <TabsContent value="database" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Database Utilities
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    These utilities help manage test data in the database
                  </AlertDescription>
                </Alert>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button
                    variant="destructive"
                    onClick={cleanupTestData}
                    className="gap-2"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Cleanup Test Data
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={() => {
                      const attendee = generateTestAttendee('standard');
                      console.log('Generated test attendee:', attendee);
                      toast.success('Check console for generated test data');
                    }}
                    className="gap-2"
                  >
                    <TestTube className="h-4 w-4" />
                    Generate Test Data
                  </Button>
                </div>

                <div className="text-sm text-muted-foreground space-y-2">
                  <div>• Test attendees have "TEST_" prefix in regfox_id</div>
                  <div>• Test RFID tags use "TEST" prefix in UID</div>
                  <div>• Test transactions include test: true in extra_data</div>
                  <div>• Cleanup removes all test-related database entries</div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}