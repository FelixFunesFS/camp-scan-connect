import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { regfoxService, RegFoxTotals, DatabaseTotals, TotalsComparison } from '@/services/regfoxService';
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
  const [regfoxCredentials, setRegfoxCredentials] = useState<{ apiKey: string; formId: string } | null>(null);

  useEffect(() => {
    loadCredentialsAndCompare();
  }, []);

  const loadCredentialsAndCompare = async () => {
    try {
      // Get RegFox credentials from secrets
      const { data: secrets } = await supabase.functions.invoke('get-secrets');
      if (secrets?.REGFOX_API_KEY && secrets?.REGFOX_FORM_ID) {
        setRegfoxCredentials({
          apiKey: secrets.REGFOX_API_KEY,
          formId: secrets.REGFOX_FORM_ID
        });
        await performComparison(secrets.REGFOX_API_KEY, secrets.REGFOX_FORM_ID);
      } else {
        toast.error('RegFox credentials not configured');
      }
    } catch (error) {
      console.error('Error loading credentials:', error);
      toast.error('Failed to load RegFox credentials');
    }
  };

  const performComparison = async (apiKey?: string, formId?: string) => {
    setIsLoading(true);
    try {
      // Use provided credentials or stored ones
      const creds = regfoxCredentials || { apiKey: apiKey!, formId: formId! };
      
      // Get database totals
      const dbTotals = await getDatabaseTotals();
      
      // Get RegFox totals
      const regfoxTotals = await regfoxService.getRegFoxTotals(creds.apiKey, creds.formId);
      
      if (!regfoxTotals) {
        toast.error('Failed to fetch RegFox data');
        return;
      }

      // Calculate discrepancies
      const totalDiff = dbTotals.total_attendees - regfoxTotals.total_attendees;
      const ticketDiffs = {
        dry_site: dbTotals.ticket_breakdown.dry_site - regfoxTotals.ticket_breakdown.dry_site,
        glamping: dbTotals.ticket_breakdown.glamping - regfoxTotals.ticket_breakdown.glamping,
        cabin: dbTotals.ticket_breakdown.cabin - regfoxTotals.ticket_breakdown.cabin,
        rv_site: dbTotals.ticket_breakdown.rv_site - regfoxTotals.ticket_breakdown.rv_site
      };

      const comparisonData: TotalsComparison = {
        database: dbTotals,
        regfox: regfoxTotals,
        discrepancies: {
          total_difference: totalDiff,
          ticket_differences: ticketDiffs
        },
        sync_needed: Math.abs(totalDiff) > 0 || Object.values(ticketDiffs).some(diff => Math.abs(diff) > 0)
      };

      setComparison(comparisonData);
      
      // Analyze detailed discrepancies
      await analyzeDetailedDiscrepancies(creds.apiKey, creds.formId);
      
      setLastSync(new Date().toISOString());
      
      if (comparisonData.sync_needed) {
        toast.warning(`Found ${Math.abs(totalDiff)} attendee difference between RegFox and database`);
      } else {
        toast.success('RegFox and database are in sync');
      }
    } catch (error) {
      console.error('Error performing comparison:', error);
      toast.error('Failed to compare RegFox data');
    } finally {
      setIsLoading(false);
    }
  };

  const getDatabaseTotals = async (): Promise<DatabaseTotals> => {
    const { data: attendees } = await supabase
      .from('attendees')
      .select('id, order_id, ticket_type, activated_at, registration_status')
      .eq('registration_status', 'registered');

    const { data: rfidCounts } = await supabase
      .from('rfid_tags')
      .select('attendee_id')
      .not('attendee_id', 'is', null);

    const { data: lastSyncData } = await supabase
      .from('regfox_sync_log')
      .select('sync_completed_at')
      .eq('status', 'success')
      .order('sync_completed_at', { ascending: false })
      .limit(1);

    const totalAttendees = attendees?.length || 0;
    const uniqueOrders = new Set(attendees?.filter(a => a.order_id).map(a => a.order_id)).size;
    const withOrderIds = attendees?.filter(a => a.order_id && a.order_id !== '').length || 0;
    const activatedCount = attendees?.filter(a => a.activated_at).length || 0;
    const withRfid = rfidCounts?.length || 0;

    // Count by ticket type
    const ticketBreakdown = {
      dry_site: attendees?.filter(a => a.ticket_type === 'dry_site').length || 0,
      glamping: attendees?.filter(a => a.ticket_type === 'glamping').length || 0,
      cabin: attendees?.filter(a => a.ticket_type === 'cabin').length || 0,
      rv_site: attendees?.filter(a => a.ticket_type === 'rv_site').length || 0
    };

    return {
      total_attendees: totalAttendees,
      unique_orders: uniqueOrders,
      with_order_ids: withOrderIds,
      ticket_breakdown: ticketBreakdown,
      activated_count: activatedCount,
      with_rfid: withRfid,
      last_sync: lastSyncData?.[0]?.sync_completed_at || null
    };
  };

  const analyzeDetailedDiscrepancies = async (apiKey: string, formId: string) => {
    try {
      // Get all RegFox registrants with more detailed data
      const response = await fetch(`https://api.webconnex.com/v2/public/search/registrants?product=regfox.com&formId=${encodeURIComponent(formId)}&limit=2000&sort=desc`, {
        headers: {
          'apiKey': apiKey,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) return;

      const regfoxData = await response.json();
      const regfoxRegistrants = regfoxData.data || [];

      // Get all database attendees
      const { data: dbAttendees } = await supabase
        .from('attendees')
        .select('id, regfox_id, first_name, last_name, email, registration_status')
        .eq('registration_status', 'registered');

      const discrepancyList: DiscrepancyItem[] = [];
      
      // Find missing in database (exists in RegFox but not in DB)
      for (const regfoxReg of regfoxRegistrants) {
        const regfoxId = regfoxReg.id?.toString();
        if (regfoxId && !dbAttendees?.some(db => db.regfox_id === regfoxId)) {
          const firstName = regfoxReg.firstName || regfoxReg.first_name || '';
          const lastName = regfoxReg.lastName || regfoxReg.last_name || '';
          
          discrepancyList.push({
            type: 'missing_in_db',
            regfox_id: regfoxId,
            attendee_name: `${firstName} ${lastName}`.trim(),
            details: `Exists in RegFox but not in database`,
            impact: 'high'
          });
        }
      }

      // Find extra in database (exists in DB but not in RegFox)
      const regfoxIds = new Set(regfoxRegistrants.map(r => r.id?.toString()).filter(Boolean));
      for (const dbAttendee of dbAttendees || []) {
        if (dbAttendee.regfox_id && !regfoxIds.has(dbAttendee.regfox_id)) {
          discrepancyList.push({
            type: 'extra_in_db',
            regfox_id: dbAttendee.regfox_id,
            attendee_name: `${dbAttendee.first_name} ${dbAttendee.last_name}`,
            details: `Exists in database but not in RegFox`,
            impact: 'medium'
          });
        }
      }

      setDiscrepancies(discrepancyList);
    } catch (error) {
      console.error('Error analyzing detailed discrepancies:', error);
    }
  };

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
            onClick={() => regfoxCredentials && performComparison()} 
            disabled={!regfoxCredentials || isLoading}
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
              <Button onClick={loadCredentialsAndCompare} disabled={isLoading}>
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