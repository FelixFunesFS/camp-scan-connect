import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import type { TotalsComparison } from '@/services/regfoxService';
import { 
  AlertTriangle, 
  CheckCircle, 
  RefreshCw, 
  ExternalLink,
  TrendingUp,
  TrendingDown,
  Minus,
  Users,
  Database,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';

interface DiscrepancyItem {
  type: 'missing_in_db' | 'extra_in_db' | 'data_mismatch';
  regfox_id?: string;
  attendee_name?: string;
  details: string;
  impact: 'critical' | 'high' | 'medium' | 'low';
}

export function RegFoxComparisonPanel() {
  const [comparison, setComparison] = useState<TotalsComparison | null>(null);
  const [discrepancies, setDiscrepancies] = useState<DiscrepancyItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);

  // The RegFox API key stays server-side: this panel only reads aggregated
  // totals returned by the `regfox-compare` edge function.
  const performComparison = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('regfox-compare');
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Comparison failed');

      const comparisonData = data.comparison as TotalsComparison;
      setComparison(comparisonData);
      setDiscrepancies((data.discrepancy_list ?? []) as DiscrepancyItem[]);
      setLastSync(new Date().toISOString());

      if (comparisonData.sync_needed) {
        toast.warning(
          `Found ${Math.abs(comparisonData.discrepancies.total_difference)} attendee difference between RegFox and the database`
        );
      } else {
        toast.success('RegFox and database are in sync');
      }
    } catch (error) {
      console.error('Error performing comparison:', error);
      toast.error((error as Error).message || 'Failed to compare RegFox data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    performComparison();
  }, [performComparison]);

  const getComparisonIcon = (diff: number) => {
    if (diff > 0) return <TrendingUp className="h-4 w-4 text-red-500" />;
    if (diff < 0) return <TrendingDown className="h-4 w-4 text-blue-500" />;
    return <Minus className="h-4 w-4 text-green-500" />;
  };

  const getComparisonColor = (diff: number) => {
    if (diff > 0) return 'text-red-600';
    if (diff < 0) return 'text-blue-600';
    return 'text-green-600';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Comparing RegFox and database data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold">RegFox Data Comparison</h3>
          <p className="text-sm text-muted-foreground">
            Compare RegFox registrations with database records
            {lastSync && (
              <span className="ml-2">• Last checked: {new Date(lastSync).toLocaleString()}</span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => performComparison()} 
            disabled={isLoading}
            variant="outline"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" asChild>
            <a href="https://admin.regfox.com" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4 mr-2" />
              RegFox Admin
            </a>
          </Button>
        </div>
      </div>

      {!comparison ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Comparison Data</h3>
              <p className="text-muted-foreground mb-4">
                Click "Refresh" to compare RegFox data with your database.
              </p>
              <Button onClick={() => performComparison()} disabled={isLoading}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Run Comparison
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Sync Status Alert */}
          {comparison.sync_needed && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Sync Required:</strong> Found {Math.abs(comparison.discrepancies.total_difference)} attendee 
                difference between RegFox ({comparison.regfox?.total_attendees}) and database ({comparison.database.total_attendees}).
                {comparison.discrepancies.total_difference > 0 ? ' Database has more records.' : ' RegFox has more records.'}
              </AlertDescription>
            </Alert>
          )}

          {/* Overview Comparison */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">RegFox Registrants</CardTitle>
                <ExternalLink className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{comparison.regfox?.total_attendees || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Updated: {comparison.regfox ? new Date(comparison.regfox.last_updated).toLocaleString() : 'Unknown'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Database Records</CardTitle>
                <Database className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{comparison.database.total_attendees}</div>
                <p className="text-xs text-muted-foreground">
                  {comparison.database.activated_count} activated • {comparison.database.with_rfid} with RFID
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Difference</CardTitle>
                {getComparisonIcon(comparison.discrepancies.total_difference)}
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${getComparisonColor(comparison.discrepancies.total_difference)}`}>
                  {comparison.discrepancies.total_difference > 0 ? '+' : ''}{comparison.discrepancies.total_difference}
                </div>
                <p className="text-xs text-muted-foreground">
                  {comparison.sync_needed ? 'Sync needed' : 'In sync'}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Ticket Type Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Ticket Type Comparison</CardTitle>
              <CardDescription>Breakdown by ticket type showing RegFox vs Database counts</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(comparison.discrepancies.ticket_differences).map(([ticketType, diff]) => (
                  <div key={ticketType} className="flex items-center justify-between p-3 border rounded">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-primary"></div>
                      <div>
                        <h4 className="font-medium capitalize">{ticketType.replace('_', ' ')}</h4>
                        <p className="text-sm text-muted-foreground">
                          RegFox: {comparison.regfox?.ticket_breakdown[ticketType as keyof typeof comparison.regfox.ticket_breakdown] || 0} • 
                          Database: {comparison.database.ticket_breakdown[ticketType as keyof typeof comparison.database.ticket_breakdown]}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getComparisonIcon(diff)}
                      <span className={`font-medium ${getComparisonColor(diff)}`}>
                        {diff > 0 ? '+' : ''}{diff}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Detailed Discrepancies */}
          {discrepancies.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                  Detailed Discrepancies ({discrepancies.length})
                </CardTitle>
                <CardDescription>Individual attendee records that don't match between systems</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {discrepancies.slice(0, 10).map((discrepancy, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded">
                      <div className="flex items-center gap-3">
                        <Badge variant={
                          discrepancy.type === 'missing_in_db' ? 'destructive' : 
                          discrepancy.type === 'extra_in_db' ? 'default' : 'secondary'
                        }>
                          {discrepancy.type === 'missing_in_db' ? 'Missing in DB' :
                           discrepancy.type === 'extra_in_db' ? 'Extra in DB' : 'Data Mismatch'}
                        </Badge>
                        <div>
                          <h5 className="font-medium">{discrepancy.attendee_name}</h5>
                          <p className="text-sm text-muted-foreground">
                            RegFox ID: {discrepancy.regfox_id} • {discrepancy.details}
                          </p>
                        </div>
                      </div>
                      <Badge variant={discrepancy.impact === 'critical' ? 'destructive' : 'outline'}>
                        {discrepancy.impact}
                      </Badge>
                    </div>
                  ))}
                  {discrepancies.length > 10 && (
                    <p className="text-center text-muted-foreground">
                      ... and {discrepancies.length - 10} more discrepancies
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Sync Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Sync Actions</CardTitle>
              <CardDescription>Resolve discrepancies and keep systems in sync</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button variant="outline" className="w-full justify-start" disabled>
                  <Database className="h-4 w-4 mr-2" />
                  Manual Sync from RegFox
                  <Badge variant="secondary" className="ml-auto">Coming Soon</Badge>
                </Button>
                <Button variant="outline" className="w-full justify-start" disabled>
                  <Users className="h-4 w-4 mr-2" />
                  Export Discrepancy Report
                  <Badge variant="secondary" className="ml-auto">Coming Soon</Badge>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Perfect Sync State */}
          {!comparison.sync_needed && discrepancies.length === 0 && (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Systems are in Perfect Sync</h3>
                  <p className="text-muted-foreground">
                    RegFox and database records match completely. No action required.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}