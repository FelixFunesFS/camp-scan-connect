import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { 
  AlertTriangle, 
  CheckCircle, 
  Users, 
  Database,
  Trash2,
  Shield,
  RotateCcw,
  Eye
} from 'lucide-react';
import { toast } from 'sonner';

interface DuplicateGroup {
  composite_key: string;
  order_id: string;
  count: number;
  attendee_name: string;
  email: string;
  regfox_ids: string[];
  records: Array<{
    id: string;
    regfox_id: string;
    created_at: string;
    updated_at: string;
    has_rfid: boolean;
    rfid_uid?: string;
  }>;
}

interface CleanupStats {
  totalDuplicates: number;
  duplicateGroups: number;
  excessRecords: number;
  rfidsAtRisk: number;
}

interface CleanupResult {
  success: boolean;
  removedCount: number;
  preservedCount: number;
  rfidsConsolidated: number;
  errors: string[];
  beforeCount?: number;
  afterCount?: number;
  cleanupDetails?: any;
}

export function DuplicateCleanupManager() {
  const [duplicateGroups, setDuplicateGroups] = useState<DuplicateGroup[]>([]);
  const [cleanupStats, setCleanupStats] = useState<CleanupStats | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isCleaningUp, setIsCleaningUp] = useState(false);
  const [cleanupResult, setCleanupResult] = useState<CleanupResult | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    scanForDuplicates();
  }, []);

  const scanForDuplicates = async () => {
    setIsScanning(true);
    try {
      // Find records and group by composite key (order_id + email + first_name + last_name)
      const { data: duplicateCheck } = await supabase
        .from('attendees')
        .select(`
          id, 
          regfox_id, 
          order_id, 
          first_name, 
          last_name, 
          email,
          created_at, 
          updated_at,
          registration_status
        `)
        .not('regfox_id', 'is', null)
        .eq('registration_status', 'registered')
        .order('created_at');

      if (duplicateCheck) {
        // Group by composite key (order_id + email + first_name + last_name)
        const compositeGroups = new Map<string, any[]>();
        
        duplicateCheck.forEach(record => {
          // Create composite key for real duplicates (same person, multiple regfox_ids)
          const orderKey = (record.order_id || '').trim();
          const emailKey = (record.email || '').trim().toLowerCase();
          const nameKey = `${(record.first_name || '').trim()}_${(record.last_name || '').trim()}`.toLowerCase();
          
          // Use order_id as primary key if available, fallback to email + name
          const compositeKey = orderKey && orderKey !== '' 
            ? `order:${orderKey}` 
            : `email:${emailKey}:${nameKey}`;
          
          if (!compositeGroups.has(compositeKey)) {
            compositeGroups.set(compositeKey, []);
          }
          compositeGroups.get(compositeKey)!.push(record);
        });

        // Filter to only groups with multiple records
        const duplicates: DuplicateGroup[] = [];
        let totalExcess = 0;
        let totalRfidsAtRisk = 0;

        for (const [compositeKey, records] of compositeGroups) {
          if (records.length > 1) {
            // Check RFID assignments for this group
            const { data: rfidData } = await supabase
              .from('rfid_tags')
              .select('uid, attendee_id, status')
              .in('attendee_id', records.map(r => r.id));

            const recordsWithRfid = records.map(record => ({
              id: record.id,
              regfox_id: record.regfox_id,
              created_at: record.created_at,
              updated_at: record.updated_at,
              has_rfid: rfidData?.some(r => r.attendee_id === record.id) || false,
              rfid_uid: rfidData?.find(r => r.attendee_id === record.id)?.uid
            }));

            const rfidsCount = rfidData?.length || 0;
            totalRfidsAtRisk += rfidsCount;

            const uniqueRegfoxIds = [...new Set(records.map(r => r.regfox_id).filter(Boolean))];

            duplicates.push({
              composite_key: compositeKey,
              order_id: records[0].order_id || 'N/A',
              count: records.length,
              attendee_name: `${records[0].first_name} ${records[0].last_name}`,
              email: records[0].email || 'N/A',
              regfox_ids: uniqueRegfoxIds,
              records: recordsWithRfid
            });

            totalExcess += records.length - 1; // All but one are excess
          }
        }

        setDuplicateGroups(duplicates);
        setCleanupStats({
          totalDuplicates: duplicateCheck.length,
          duplicateGroups: duplicates.length,
          excessRecords: totalExcess,
          rfidsAtRisk: totalRfidsAtRisk
        });
      }
    } catch (error) {
      console.error('Error scanning for duplicates:', error);
      toast.error('Failed to scan for duplicates');
    } finally {
      setIsScanning(false);
    }
  };

  // Enhanced safe cleanup using database function
  const performCleanup = async () => {
    if (!cleanupStats || cleanupStats.excessRecords === 0) return;

    setIsCleaningUp(true);
    const toastId = toast.loading("Safely cleaning up duplicate records...");

    try {
      // Use the safe cleanup database function
      const { data, error } = await supabase
        .rpc('safe_cleanup_duplicates');

      if (error) {
        throw new Error(`Cleanup function failed: ${error.message}`);
      }

      if (!data || data.length === 0) {
        throw new Error("No response from cleanup function");
      }

      const result = data[0];

      setCleanupResult({
        success: result.cleanup_successful,
        removedCount: result.duplicates_removed,
        preservedCount: result.total_records_after,
        rfidsConsolidated: 0, // Will be enhanced in future versions
        errors: result.errors_encountered || [],
        beforeCount: result.total_records_before,
        afterCount: result.total_records_after,
        cleanupDetails: result.cleanup_details
      });

      if (result.cleanup_successful) {
        toast.success(
          `Successfully cleaned up ${result.duplicates_removed} duplicate records. 
           Database reduced from ${result.total_records_before} to ${result.total_records_after} attendees.`, 
          { id: toastId, duration: 6000 }
        );
        // Rescan for duplicates after successful cleanup
        await scanForDuplicates();
      } else {
        const errorMessages = result.errors_encountered?.join(', ') || 'Unknown errors occurred';
        toast.error(`Cleanup failed: ${errorMessages}`, { id: toastId });
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      toast.error(`Cleanup failed: ${errorMessage}`, { id: toastId });
      setCleanupResult({
        success: false,
        removedCount: 0,
        preservedCount: 0,
        rfidsConsolidated: 0,
        errors: [errorMessage]
      });
    } finally {
      setIsCleaningUp(false);
    }
  };

  if (isScanning) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Scanning for duplicate records...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold">Database Cleanup Manager</h3>
          <p className="text-sm text-muted-foreground">Identify and safely remove duplicate attendee records</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={scanForDuplicates} variant="outline">
            <Eye className="h-4 w-4 mr-2" />
            Rescan
          </Button>
          {cleanupStats && cleanupStats.excessRecords > 0 && (
            <Button 
              onClick={() => setShowPreview(!showPreview)} 
              variant="outline"
            >
              {showPreview ? 'Hide' : 'Show'} Preview
            </Button>
          )}
        </div>
      </div>

      {/* Cleanup Statistics */}
      {cleanupStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Records</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{cleanupStats.totalDuplicates}</div>
              <p className="text-xs text-muted-foreground">In database</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Duplicate Groups</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{cleanupStats.duplicateGroups}</div>
              <p className="text-xs text-muted-foreground">People with duplicates</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Excess Records</CardTitle>
              <Trash2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{cleanupStats.excessRecords}</div>
              <p className="text-xs text-muted-foreground">To be removed</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">RFIDs at Risk</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{cleanupStats.rfidsAtRisk}</div>
              <p className="text-xs text-muted-foreground">Need consolidation</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Cleanup Action */}
      {cleanupStats && cleanupStats.excessRecords > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Cleanup Required
            </CardTitle>
            <CardDescription>
              {cleanupStats.duplicateGroups} attendees have duplicate records that need cleanup
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                <strong>Safe Cleanup Process:</strong>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Preserve oldest record (canonical)</li>
                  <li>Consolidate RFID assignments</li>
                  <li>Migrate transaction history</li>
                  <li>Remove excess duplicates</li>
                  <li>Maintain data integrity</li>
                </ul>
              </AlertDescription>
            </Alert>

            <div className="flex gap-2">
              <Button 
                onClick={performCleanup}
                disabled={isCleaningUp}
                className="flex items-center gap-2"
                variant="default"
              >
                {isCleaningUp ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Cleaning Up...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    Clean Up {cleanupStats.excessRecords} Duplicates
                  </>
                )}
              </Button>
              {cleanupResult && !cleanupResult.success && (
                <Button variant="outline" onClick={scanForDuplicates}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Retry Scan
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cleanup Results */}
      {cleanupResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {cleanupResult.success ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-red-500" />
              )}
              Cleanup Results
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              {cleanupResult.beforeCount && cleanupResult.afterCount && (
                <div className="col-span-3 mb-4">
                  <div className="flex justify-between items-center text-sm text-muted-foreground mb-2">
                    <span>Database Size:</span>
                    <span className="font-semibold text-blue-600">
                      {cleanupResult.beforeCount} → {cleanupResult.afterCount}
                    </span>
                  </div>
                </div>
              )}
              <div>
                <div className="text-2xl font-bold text-red-600">{cleanupResult.removedCount}</div>
                <p className="text-sm text-muted-foreground">Records Removed</p>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">{cleanupResult.preservedCount}</div>
                <p className="text-sm text-muted-foreground">Records Preserved</p>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600">{cleanupResult.rfidsConsolidated}</div>
                <p className="text-sm text-muted-foreground">RFIDs Consolidated</p>
              </div>
            </div>

            {cleanupResult.errors.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-red-600">Errors Encountered:</h4>
                {cleanupResult.errors.map((error, index) => (
                  <Alert key={index} variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Duplicate Groups Preview */}
      {showPreview && duplicateGroups.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Duplicate Groups Preview</CardTitle>
            <CardDescription>
              Showing {duplicateGroups.length} groups with duplicate records
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {duplicateGroups.slice(0, 10).map((group, index) => (
                <div key={index} className="border rounded p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h5 className="font-medium">{group.attendee_name}</h5>
                      <p className="text-sm text-muted-foreground">
                        Order: {group.order_id} | Email: {group.email}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        RegFox IDs: {group.regfox_ids.join(', ')}
                      </p>
                    </div>
                    <Badge variant="destructive">{group.count} copies</Badge>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 text-xs">
                    {group.records.map((record, idx) => (
                      <div key={idx} className={`p-2 rounded border ${
                        idx === 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                      }`}>
                        <div className="flex items-center justify-between">
                          <span>{idx === 0 ? 'KEEP' : 'REMOVE'}</span>
                          {record.has_rfid && (
                            <Badge variant="outline" className="text-xs">RFID</Badge>
                          )}
                        </div>
                        <div className="text-muted-foreground">
                          RegFox: {record.regfox_id}
                        </div>
                        <div className="text-muted-foreground">
                          Created: {new Date(record.created_at).toLocaleDateString()}
                        </div>
                        {record.rfid_uid && (
                          <div className="text-muted-foreground">
                            RFID: {record.rfid_uid}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {duplicateGroups.length > 10 && (
                <p className="text-center text-muted-foreground">
                  ... and {duplicateGroups.length - 10} more groups
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Duplicates Found */}
      {cleanupStats && cleanupStats.excessRecords === 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Database is Clean</h3>
              <p className="text-muted-foreground">
                No duplicate records found. Your database is optimized and ready for operations.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}