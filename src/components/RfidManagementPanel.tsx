import { getCurrentEventId } from "@/lib/eventRuntime";
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from "sonner";
import { Loader2, Zap, Users, Tag } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface RfidStats {
  total_attendees: number;
  unassigned_attendees: number;
  assigned_attendees: number;
  active_attendees: number;
}

interface GeneratedRfid {
  attendee_id: string;
  generated_uid: string;
  attendee_name: string;
}

interface GenerationResult {
  success: boolean;
  generated_count: number;
  generated_rfids: GeneratedRfid[];
  statistics: RfidStats;
}

export const RfidManagementPanel: React.FC = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [isClearingMock, setIsClearingMock] = useState(false);
  const [isClearingRfid, setIsClearingRfid] = useState(false);
  const [isClearingTest, setIsClearingTest] = useState(false);
  const [isBulkActivating, setIsBulkActivating] = useState(false);
  const [stats, setStats] = useState<RfidStats | null>(null);
  const [lastGenerated, setLastGenerated] = useState<GeneratedRfid[]>([]);
  

  const handleBulkGenerate = async (batchSize: number = 100) => {
    setIsGenerating(true);
    try {
      console.log(`Generating mock RFIDs for ${batchSize} attendees...`);

      const { data, error } = await supabase.functions.invoke('bulk-generate-rfids', {
        body: { batch_size: batchSize }
      });

      if (error) throw error;

      const result = data as GenerationResult;
      
      setStats(result.statistics);
      setLastGenerated(result.generated_rfids);

      toast.success(`Mock RFIDs Generated Successfully - Generated ${result.generated_count} mock credentials`);

      console.log('Generated RFIDs:', result.generated_rfids);

    } catch (error) {
      console.error('Error generating mock RFIDs:', error);
      toast.error(`Error - ${error.message || "Failed to generate mock RFIDs"}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClearRfids = async (format: string, setLoadingState: (loading: boolean) => void) => {
    setLoadingState(true);
    try {
      console.log(`Clearing ${format} RFIDs...`);

      const { data, error } = await (supabase.rpc as any)('cleanup_generated_rfids', { p_format: format });

      if (error) throw error;

      const result = data[0];
      
      toast.success(`${format} RFIDs Cleared - Reset ${result.deleted_count} credential assignments`);

      // Refresh stats and clear generated list if needed
      await loadCurrentStats();
      if (format === 'MOCK' || format === 'ALL') {
        setLastGenerated([]);
      }

      console.log(`Cleared ${result.deleted_count} ${format} RFIDs`);

    } catch (error) {
      console.error(`Error clearing ${format} RFIDs:`, error);
      toast.error(`Error - ${error.message || `Failed to clear ${format} RFIDs`}`);
    } finally {
      setLoadingState(false);
    }
  };

  const handleClearMockRfids = () => handleClearRfids('MOCK', setIsClearingMock);
  const handleClearRfidRfids = () => handleClearRfids('RFID', setIsClearingRfid);
  const handleClearTestRfids = () => handleClearRfids('TEST', setIsClearingTest);
  const handleClearAllRfids = () => handleClearRfids('ALL', setIsClearing);

  const handleBulkActivation = async () => {
    setIsBulkActivating(true);
    try {
      console.log('Starting bulk activation of assigned RFIDs...');

      const { data, error } = await supabase.rpc('bulk_activate_assigned_rfids');

      if (error) throw error;

      const result = data[0];
      
      if (result.activation_successful) {
        toast.success(
          `Bulk Activation Complete - Activated ${result.total_activated} attendees${
            result.veterans_thanked > 0 ? ` (${result.veterans_thanked} veterans thanked)` : ''
          }`
        );

        // Refresh stats after activation
        await loadCurrentStats();

        console.log('Bulk activation results:', {
          total_activated: result.total_activated,
          veterans_thanked: result.veterans_thanked,
          activated_attendees: result.activated_attendees
        });
      } else {
        throw new Error('Bulk activation failed');
      }

    } catch (error) {
      console.error('Error during bulk activation:', error);
      toast.error(`Error - ${error.message || "Failed to bulk activate wristbands"}`);
    } finally {
      setIsBulkActivating(false);
    }
  };

  const loadCurrentStats = async () => {
    try {
      const { count: totalAttendees } = await supabase
        .from('attendees')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', getCurrentEventId())
        .eq('registration_status', 'registered');

      // Get attendees with assigned RFIDs (status = 'assigned')
      const { data: assignedRfids } = await supabase
        .from('attendees')
        .select(`
          id,
          rfid_tags!inner(uid, status)
        `)
        .eq('event_id', getCurrentEventId())
        .eq('rfid_tags.status', 'assigned')
        .eq('registration_status', 'registered');

      // Get attendees with active RFIDs (status = 'active') - prioritize RFID status over activated_at
      const { data: activeRfids } = await supabase
        .from('attendees')
        .select(`
          id,
          rfid_tags!inner(uid, status)
        `)
        .eq('event_id', getCurrentEventId())
        .eq('rfid_tags.status', 'active')
        .eq('registration_status', 'registered');

      const total = totalAttendees || 0;
      const assigned = assignedRfids?.length || 0;
      const active = activeRfids?.length || 0;
      const unassigned = total - assigned - active;

      setStats({
        total_attendees: total,
        unassigned_attendees: unassigned,
        assigned_attendees: assigned,
        active_attendees: active
      });

    } catch (error) {
      console.error('Error loading stats:', error);
      toast.error("Error - Failed to load wristband statistics");
    }
  };

  React.useEffect(() => {
    loadCurrentStats();
  }, []);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5" />
            RFID Management
          </CardTitle>
          <CardDescription>
            Generate mock Codes for testing and manage credential assignments
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Statistics */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-600" />
                  <span className="font-semibold text-blue-900">Total Attendees</span>
                </div>
                <p className="text-2xl font-bold text-blue-700">{stats.total_attendees}</p>
              </div>
              
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-orange-600" />
                  <span className="font-semibold text-orange-900">Unassigned</span>
                </div>
                <p className="text-2xl font-bold text-orange-700">{stats.unassigned_attendees}</p>
              </div>
              
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <Tag className="h-5 w-5 text-yellow-600" />
                  <span className="font-semibold text-yellow-900">Assigned wristbands</span>
                </div>
                <p className="text-2xl font-bold text-yellow-700">{stats.assigned_attendees}</p>
              </div>
              
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-green-600" />
                  <span className="font-semibold text-green-900">Active</span>
                </div>
                <p className="text-2xl font-bold text-green-700">{stats.active_attendees}</p>
              </div>
            </div>
          )}

          {/* Generation Controls */}
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => handleBulkGenerate(50)}
                disabled={isGenerating || isClearing}
                variant="outline"
              >
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Zap className="h-4 w-4" />
                )}
                Generate 50 Mock RFIDs
              </Button>
              
              <Button
                onClick={() => handleBulkGenerate(100)}
                disabled={isGenerating || isClearing}
              >
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Zap className="h-4 w-4" />
                )}
                Generate 100 Mock RFIDs
              </Button>
              
              <Button
                onClick={() => handleBulkGenerate(500)}
                disabled={isGenerating || isClearing}
                variant="secondary"
              >
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Zap className="h-4 w-4" />
                )}
                Generate All Missing
              </Button>
            </div>

            {/* Bulk Activation Section */}
            {stats && stats.assigned_attendees > 0 && (
              <div className="flex flex-col gap-2 p-4 border border-amber-200 bg-amber-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-amber-600" />
                  <span className="font-semibold text-amber-900">
                    {stats.assigned_attendees} attendees have assigned RFIDs but need activation
                  </span>
                </div>
                <Button
                  onClick={handleBulkActivation}
                  disabled={isBulkActivating || isGenerating || isClearing}
                  className="w-fit"
                >
                  {isBulkActivating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Zap className="h-4 w-4" />
                  )}
                  Bulk Activate All Assigned ({stats.assigned_attendees})
                </Button>
                <p className="text-sm text-amber-700">
                  This will activate all attendees with assigned RFIDs and properly thank any veterans.
                </p>
              </div>
            )}

            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={handleClearMockRfids}
                  disabled={isGenerating || isClearingMock}
                  variant="destructive"
                  size="sm"
                >
                  {isClearingMock ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Zap className="h-4 w-4" />
                  )}
                  Clear MOCK RFIDs
                </Button>

                <Button
                  onClick={handleClearRfidRfids}
                  disabled={isGenerating || isClearingRfid}
                  variant="destructive"
                  size="sm"
                >
                  {isClearingRfid ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Zap className="h-4 w-4" />
                  )}
                  Clear RFID Tags
                </Button>

                <Button
                  onClick={handleClearTestRfids}
                  disabled={isGenerating || isClearingTest}
                  variant="destructive"
                  size="sm"
                >
                  {isClearingTest ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Zap className="h-4 w-4" />
                  )}
                  Clear TEST RFIDs
                </Button>

                <Button
                  onClick={handleClearAllRfids}
                  disabled={isGenerating || isClearing}
                  variant="destructive"
                  size="sm"
                >
                  {isClearing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Zap className="h-4 w-4" />
                  )}
                  Clear ALL Generated
                </Button>
              </div>

              <div className="flex justify-center">
                <Button
                  onClick={loadCurrentStats}
                  disabled={isGenerating || isClearing || isClearingMock || isClearingRfid || isClearingTest || isBulkActivating}
                  variant="ghost"
                  size="sm"
                >
                  Refresh Statistics
                </Button>
              </div>
            </div>
          </div>

          {/* Recently Generated */}
          {lastGenerated.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-semibold">Recently Generated ({lastGenerated.length})</h4>
              <div className="max-h-40 overflow-y-auto space-y-1">
                {lastGenerated.slice(0, 10).map((rfid, index) => (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <span className="font-medium">{rfid.attendee_name}</span>
                    <Badge variant="secondary">{rfid.generated_uid}</Badge>
                  </div>
                ))}
                {lastGenerated.length > 10 && (
                  <p className="text-sm text-muted-foreground">
                    ...and {lastGenerated.length - 10} more
                  </p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};