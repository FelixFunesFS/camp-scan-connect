import { useState, useEffect } from "react";
import { getCurrentEventId, getEventStartDate } from "@/lib/eventRuntime";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  TrendingUp, 
  Shield, 
  Database,
  Zap,
  Users
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface RfidAnalysisData {
  totalTransactions: number;
  transactionsWithRfid: number;
  transactionsWithoutRfid: number;
  rfidCaptureRate: number;
  stationBreakdown: {
    [station: string]: {
      total: number;
      withRfid: number;
      withoutRfid: number;
      captureRate: number;
    };
  };
  criticalIssues: string[];
  recommendations: string[];
}

interface SystemMetrics {
  activationSuccess: number;
  staffAssistanceRate: number;
  dataIntegrityScore: number;
  operationalEfficiency: number;
}

export function PostProductionAnalysis() {
  const [analysisData, setAnalysisData] = useState<RfidAnalysisData | null>(null);
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchAnalysisData();
  }, []);

  const fetchAnalysisData = async () => {
    try {
      setIsLoading(true);
      
      // Event-relative cutoff: from the morning the event opened (6am ET).
      const start = getEventStartDate();
      const cutoffDate = new Date(start.getTime() + 10 * 60 * 60 * 1000).toISOString();
      
      let query = supabase
        .from('station_transactions')
        .select(`
          id,
          station_type,
          transaction_type,
          rfid_uid,
          created_at,
          activation_method
        `)
        .gte('created_at', cutoffDate)
        .or('rfid_uid.is.null,and(rfid_uid.not.like.MOCK%)'); // Include NULL values but exclude MOCK test transactions

      const eventId = getCurrentEventId();
      if (eventId) query = query.eq('event_id', eventId);

      const { data: transactions, error } = await query;

      if (error) throw error;

      // Analyze code capture rates
      const totalTransactions = transactions?.length || 0;
      const transactionsWithRfid = transactions?.filter(t => t.rfid_uid).length || 0;
      const transactionsWithoutRfid = totalTransactions - transactionsWithRfid;
      const rfidCaptureRate = totalTransactions > 0 ? (transactionsWithRfid / totalTransactions) * 100 : 0;

      // Station breakdown
      const stationBreakdown: RfidAnalysisData['stationBreakdown'] = {};
      transactions?.forEach(transaction => {
        const station = transaction.station_type;
        if (!stationBreakdown[station]) {
          stationBreakdown[station] = {
            total: 0,
            withRfid: 0,
            withoutRfid: 0,
            captureRate: 0
          };
        }
        
        stationBreakdown[station].total++;
        if (transaction.rfid_uid) {
          stationBreakdown[station].withRfid++;
        } else {
          stationBreakdown[station].withoutRfid++;
        }
      });

      // Calculate capture rates for each station
      Object.keys(stationBreakdown).forEach(station => {
        const data = stationBreakdown[station];
        data.captureRate = data.total > 0 ? (data.withRfid / data.total) * 100 : 0;
      });

      // Identify critical issues
      const criticalIssues: string[] = [];
      const recommendations: string[] = [];

      Object.entries(stationBreakdown).forEach(([station, data]) => {
        if (data.captureRate === 0 && data.total > 0) {
          criticalIssues.push(`${station.toUpperCase()}: Zero code capture rate (${data.total} transactions without Codes)`);
          recommendations.push(`Fix ${station} station integration to capture Codes in transaction records`);
        } else if (data.captureRate < 90 && data.total > 10) {
          criticalIssues.push(`${station.toUpperCase()}: Low code capture rate (${data.captureRate.toFixed(1)}%)`);
          recommendations.push(`Investigate ${station} station workflow for code scanning inconsistencies`);
        }
      });

      // Calculate system metrics
      const activations = transactions?.filter(t => t.station_type === 'activation') || [];
      const staffAssisted = activations.filter(t => t.activation_method === 'staff_assisted').length;
      const selfActivated = activations.filter(t => t.activation_method === 'self_activated').length;
      
      const systemMetrics: SystemMetrics = {
        activationSuccess: activations.length > 0 ? ((activations.length) / (activations.length)) * 100 : 0,
        staffAssistanceRate: activations.length > 0 ? (staffAssisted / activations.length) * 100 : 0,
        dataIntegrityScore: rfidCaptureRate,
        operationalEfficiency: activations.length > 0 ? (selfActivated / activations.length) * 100 : 0
      };

      setAnalysisData({
        totalTransactions,
        transactionsWithRfid,
        transactionsWithoutRfid,
        rfidCaptureRate,
        stationBreakdown,
        criticalIssues,
        recommendations
      });

      setSystemMetrics(systemMetrics);

    } catch (error) {
      console.error('Error fetching analysis data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center p-6">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
              <div className="text-muted-foreground">Analyzing post-production data...</div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!analysisData || !systemMetrics) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center p-6 text-muted-foreground">
              No analysis data available
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Critical Issues Alert */}
      {analysisData.criticalIssues.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>{analysisData.criticalIssues.length} Critical Issue{analysisData.criticalIssues.length !== 1 ? 's' : ''} Detected</strong>
            <ul className="mt-2 list-disc list-inside space-y-1">
              {analysisData.criticalIssues.map((issue, index) => (
                <li key={index} className="text-sm">{issue}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* System Health Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Database className="h-4 w-4" />
              Data Integrity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemMetrics.dataIntegrityScore.toFixed(1)}%</div>
            <div className="text-xs text-muted-foreground">
              Credential Capture Rate
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Operational Efficiency
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemMetrics.operationalEfficiency.toFixed(1)}%</div>
            <div className="text-xs text-muted-foreground">
              Self-Service Rate
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              Staff Assistance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemMetrics.staffAssistanceRate.toFixed(1)}%</div>
            <div className="text-xs text-muted-foreground">
              Activations Needing Help
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Total Transactions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analysisData.totalTransactions}</div>
            <div className="text-xs text-muted-foreground">
              Post-Production
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="rfid-analysis" className="space-y-6">
        <TabsList>
          <TabsTrigger value="rfid-analysis">Credential Analysis</TabsTrigger>
          <TabsTrigger value="station-performance">Station Performance</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
        </TabsList>

        <TabsContent value="rfid-analysis" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Credential Scanning Audit</CardTitle>
              <CardDescription>
                Analysis of Code capture across all station transactions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{analysisData.transactionsWithRfid}</div>
                  <div className="text-sm text-muted-foreground">With Code</div>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-red-600">{analysisData.transactionsWithoutRfid}</div>
                  <div className="text-sm text-muted-foreground">Missing Code</div>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="text-2xl font-bold">{analysisData.rfidCaptureRate.toFixed(1)}%</div>
                  <div className="text-sm text-muted-foreground">Overall Capture Rate</div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold">Station Breakdown</h4>
                {Object.entries(analysisData.stationBreakdown).map(([station, data]) => (
                  <div key={station} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {data.captureRate === 100 ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : data.captureRate === 0 ? (
                        <XCircle className="h-5 w-5 text-red-600" />
                      ) : (
                        <AlertTriangle className="h-5 w-5 text-yellow-600" />
                      )}
                      <div>
                        <div className="font-medium capitalize">{station.replace('_', ' ')}</div>
                        <div className="text-sm text-muted-foreground">
                          {data.total} transactions
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge 
                        variant={data.captureRate === 100 ? "default" : data.captureRate === 0 ? "destructive" : "secondary"}
                      >
                        {data.captureRate.toFixed(1)}%
                      </Badge>
                      <div className="text-sm text-muted-foreground mt-1">
                        {data.withRfid} / {data.total}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="station-performance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Station Performance Analytics</CardTitle>
              <CardDescription>
                Detailed performance metrics for each station
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(analysisData.stationBreakdown).map(([station, data]) => (
                <Card key={station}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg capitalize flex items-center justify-between">
                      {station.replace('_', ' ')} Station
                      <Badge variant={data.captureRate === 100 ? "default" : data.captureRate === 0 ? "destructive" : "secondary"}>
                        {data.captureRate === 100 ? 'Perfect' : data.captureRate === 0 ? 'Critical' : 'Warning'}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-4 gap-4 text-center">
                      <div>
                        <div className="text-lg font-semibold">{data.total}</div>
                        <div className="text-sm text-muted-foreground">Total Transactions</div>
                      </div>
                      <div>
                        <div className="text-lg font-semibold text-green-600">{data.withRfid}</div>
                        <div className="text-sm text-muted-foreground">With credential</div>
                      </div>
                      <div>
                        <div className="text-lg font-semibold text-red-600">{data.withoutRfid}</div>
                        <div className="text-sm text-muted-foreground">Missing credential</div>
                      </div>
                      <div>
                        <div className="text-lg font-semibold">{data.captureRate.toFixed(1)}%</div>
                        <div className="text-sm text-muted-foreground">Success Rate</div>
                      </div>
                    </div>
                    
                    {data.captureRate === 0 && data.total > 0 && (
                      <Alert className="mt-4">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          <strong>Critical Issue:</strong> This station is not capturing Codes in transaction records. 
                          This creates a security and audit gap where transactions cannot be tied to physical code scans.
                        </AlertDescription>
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>System Improvement Recommendations</CardTitle>
              <CardDescription>
                Prioritized action items based on analysis
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {analysisData.recommendations.length > 0 ? (
                <div className="space-y-3">
                  <h4 className="font-semibold text-red-600">Critical Fixes Required</h4>
                  {analysisData.recommendations.map((recommendation, index) => (
                    <div key={index} className="p-4 border border-red-200 rounded-lg bg-red-50">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                        <div className="text-sm">{recommendation}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center p-6">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-600" />
                  <div className="text-lg font-medium text-green-800">System Performance Excellent</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    No critical issues detected in code scanning workflows
                  </div>
                </div>
              )}

              <div className="space-y-3 mt-6">
                <h4 className="font-semibold">General Recommendations</h4>
                <div className="space-y-2">
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-start gap-2">
                      <Shield className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div className="text-sm">
                        <strong>Security Enhancement:</strong> Implement Code validation across all station transaction types to ensure complete audit trails.
                      </div>
                    </div>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-start gap-2">
                      <Users className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <div className="text-sm">
                        <strong>Training Opportunity:</strong> {systemMetrics.staffAssistanceRate.toFixed(1)}% of activations required staff assistance. Consider additional self-service training or UI improvements.
                      </div>
                    </div>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-start gap-2">
                      <TrendingUp className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
                      <div className="text-sm">
                        <strong>Performance Monitoring:</strong> Implement real-time alerts for stations with code capture rates below 95% to catch issues immediately.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}