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
  regfox_id: string;
  order_id: string;
  count: number;
  attendee_name: string;
  records: Array<{
    id: string;
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
      // Find records with same regfox_id appearing multiple times
      const { data: duplicateCheck } = await supabase
        .from('attendees')
        .select(`
          id, 
          regfox_id, 
          order_id, 
          first_name, 
          last_name, 
          created_at, 
          updated_at,
          registration_status
        `)
        .not('regfox_id', 'is', null)
        .eq('registration_status', 'registered')
        .order('created_at');

      if (duplicateCheck) {
        // Group by regfox_id to find duplicates
        const regfoxGroups = new Map<string, any[]>();
        
        duplicateCheck.forEach(record => {
          const key = record.regfox_id!;
          if (!regfoxGroups.has(key)) {
            regfoxGroups.set(key, []);
          }
          regfoxGroups.get(key)!.push(record);
        });

        // Filter to only groups with multiple records
        const duplicates: DuplicateGroup[] = [];
        let totalExcess = 0;
        let totalRfidsAtRisk = 0;

        for (const [regfoxId, records] of regfoxGroups) {
          if (records.length > 1) {
            // Check RFID assignments for this group
            const { data: rfidData } = await supabase
              .from('rfid_tags')
              .select('uid, attendee_id, status')
              .in('attendee_id', records.map(r => r.id));

            const recordsWithRfid = records.map(record => ({
              id: record.id,
              created_at: record.created_at,
              updated_at: record.updated_at,
              has_rfid: rfidData?.some(r => r.attendee_id === record.id) || false,
              rfid_uid: rfidData?.find(r => r.attendee_id === record.id)?.uid
            }));

            const rfidsCount = rfidData?.length || 0;
            totalRfidsAtRisk += rfidsCount;

            duplicates.push({
              regfox_id: regfoxId,
              order_id: records[0].order_id,
              count: records.length,
              attendee_name: `${records[0].first_name} ${records[0].last_name}`,
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

  const performCleanup = async () => {
    if (!cleanupStats || cleanupStats.excessRecords === 0) return;

    setIsCleaningUp(true);
    let removedCount = 0;
    let preservedCount = 0;
    let rfidsConsolidated = 0;
    const errors: string[] = [];

    try {
      // Process each duplicate group
      for (const group of duplicateGroups) {
        try {
          // Determine canonical record (oldest created_at, newest updated_at preference)
          const sortedRecords = [...group.records].sort((a, b) => {
            const dateA = new Date(a.created_at).getTime();
            const dateB = new Date(b.created_at).getTime();
            if (dateA !== dateB) return dateA - dateB; // Oldest first
            
            // If same created_at, prefer newest updated_at
            const updatedA = new Date(a.updated_at).getTime();
            const updatedB = new Date(b.updated_at).getTime();
            return updatedB - updatedA;
          });

          const canonicalRecord = sortedRecords[0];
          const duplicateRecords = sortedRecords.slice(1);

          // Handle RFID consolidation
          for (const duplicate of duplicateRecords) {
            if (duplicate.has_rfid) {
              // Reassign RFID to canonical record
              const { error: rfidError } = await supabase
                .from('rfid_tags')
                .update({ attendee_id: canonicalRecord.id })
                .eq('attendee_id', duplicate.id);

              if (rfidError) {
                errors.push(`Failed to reassign RFID ${duplicate.rfid_uid} for ${group.attendee_name}`);
              } else {
                rfidsConsolidated++;
              }
            }
          }

          // Update station_transactions to point to canonical record
          for (const duplicate of duplicateRecords) {
            await supabase
              .from('station_transactions')
              .update({ attendee_id: canonicalRecord.id })
              .eq('attendee_id', duplicate.id);
          }

          // Remove duplicate attendee records
          const duplicateIds = duplicateRecords.map(d => d.id);
          const { error: deleteError } = await supabase
            .from('attendees')
            .delete()
            .in('id', duplicateIds);

          if (deleteError) {
            errors.push(`Failed to remove duplicates for ${group.attendee_name}: ${deleteError.message}`);
          } else {
            removedCount += duplicateIds.length;
            preservedCount += 1;
          }
        } catch (error) {
          errors.push(`Error processing ${group.attendee_name}: ${(error as Error).message}`);
        }
      }

      const result: CleanupResult = {
        success: errors.length === 0,
        removedCount,
        preservedCount,
        rfidsConsolidated,
        errors
      };

      setCleanupResult(result);

      if (result.success) {
        toast.success(`Cleanup completed: Removed ${removedCount} duplicate records, consolidated ${rfidsConsolidated} RFIDs`);
        // Rescan after cleanup
        await scanForDuplicates();
      } else {
        toast.error(`Cleanup completed with ${errors.length} errors`);
      }
    } catch (error) {
      console.error('Cleanup failed:', error);
      toast.error('Cleanup operation failed');
      setCleanupResult({
        success: false,
        removedCount,
        preservedCount,
        rfidsConsolidated,
        errors: [...errors, (error as Error).message]
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
                        RegFox ID: {group.regfox_id} | Order: {group.order_id}
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