import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import { SafetyConfirmationDialog } from './SafetyConfirmationDialog';
import { 
  TestTube, 
  Loader2, 
  Zap, 
  Users, 
  Tag, 
  ChevronDown, 
  ChevronRight,
  AlertTriangle,
  Shield
} from 'lucide-react';
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

export const RfidTestingSection: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [clearingStates, setClearingStates] = useState({
    mock: false,
    rfid: false,
    test: false,
    all: false
  });
  const [stats, setStats] = useState<RfidStats | null>(null);
  const [lastGenerated, setLastGenerated] = useState<GeneratedRfid[]>([]);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    type: 'mock' | 'rfid' | 'test' | 'all';
    title: string;
    description: string;
  }>({
    open: false,
    type: 'mock',
    title: '',
    description: ''
  });
  const { toast } = useToast();

  useEffect(() => {
    if (isExpanded) {
      loadCurrentStats();
    }
  }, [isExpanded]);

  const loadCurrentStats = async () => {
    try {
      const { count: totalAttendees } = await supabase
        .from('attendees')
        .select('*', { count: 'exact', head: true });

      const { data: assignedRfids } = await supabase
        .from('attendees')
        .select(`
          id,
          rfid_tags!inner(uid, status)
        `)
        .eq('rfid_tags.status', 'assigned');

      const { data: activeRfids } = await supabase
        .from('attendees')
        .select(`
          id,
          activated_at,
          rfid_tags!inner(uid, status)
        `)
        .eq('rfid_tags.status', 'active')
        .not('activated_at', 'is', null);

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
      toast({
        title: "Error",
        description: "Failed to load RFID statistics",
        variant: "destructive",
      });
    }
  };

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

      toast({
        title: "Mock RFIDs Generated Successfully",
        description: `Generated ${result.generated_count} mock RFID tags for testing`,
      });

      console.log('Generated RFIDs:', result.generated_rfids);

    } catch (error) {
      console.error('Error generating mock RFIDs:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to generate mock RFIDs",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClearRfids = async (format: string) => {
    const stateKey = format.toLowerCase() as keyof typeof clearingStates;
    setClearingStates(prev => ({ ...prev, [stateKey]: true }));
    
    try {
      console.log(`Clearing ${format} RFIDs...`);

      const { data, error } = await supabase.rpc('cleanup_generated_rfids', { p_format: format });

      if (error) throw error;

      const result = data[0];
      
      toast({
        title: `${format} RFIDs Cleared`,
        description: `Reset ${result.deleted_count} RFID assignments and cleared attendee activation status`,
      });

      // Refresh stats and clear generated list if needed
      await loadCurrentStats();
      if (format === 'MOCK' || format === 'ALL') {
        setLastGenerated([]);
      }

      console.log(`Cleared ${result.deleted_count} ${format} RFIDs`);

    } catch (error) {
      console.error(`Error clearing ${format} RFIDs:`, error);
      toast({
        title: "Error",
        description: error.message || `Failed to clear ${format} RFIDs`,
        variant: "destructive",
      });
    } finally {
      setClearingStates(prev => ({ ...prev, [stateKey]: false }));
      setConfirmDialog(prev => ({ ...prev, open: false }));
    }
  };

  const openClearConfirmation = (type: 'mock' | 'rfid' | 'test' | 'all') => {
    const configs = {
      mock: {
        title: 'Clear Mock RFIDs',
        description: 'This will remove all MOCK-prefixed test RFIDs and reset associated attendee activation status. This action cannot be undone.'
      },
      rfid: {
        title: 'Clear RFID Tags', 
        description: 'This will remove all RFID-prefixed test RFIDs and reset associated attendee activation status. This action cannot be undone.'
      },
      test: {
        title: 'Clear Test RFIDs',
        description: 'This will remove all TEST-prefixed test RFIDs and reset associated attendee activation status. This action cannot be undone.'
      },
      all: {
        title: 'Clear ALL Generated RFIDs',
        description: 'This will remove ALL generated test RFIDs (MOCK, RFID, TEST prefixes) and reset all associated attendee activation status. This is a destructive action that cannot be undone.'
      }
    };

    setConfirmDialog({
      open: true,
      type,
      ...configs[type]
    });
  };

  const isAnyClearing = Object.values(clearingStates).some(state => state);

  return (
    <>
      <Card className="border-warning/50">
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  <div>
                    <CardTitle className="flex items-center gap-2 text-warning">
                      <TestTube className="h-5 w-5" />
                      Testing & Development Tools
                    </CardTitle>
                    <CardDescription>
                      Generate mock RFID UIDs for testing and manage test data cleanup
                    </CardDescription>
                  </div>
                </div>
                <Badge variant="outline" className="border-warning text-warning">
                  Development Only
                </Badge>
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-6">
              {/* Safety Warning */}
              <Alert className="border-warning bg-warning/5">
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  <strong>Development Environment Only:</strong> These tools generate synthetic test data and should only be used in development or testing environments.
                </AlertDescription>
              </Alert>

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
                      <span className="font-semibold text-yellow-900">Assigned RFIDs</span>
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
                <h4 className="font-semibold flex items-center gap-2">
                  <TestTube className="h-4 w-4" />
                  Mock RFID Generation
                </h4>
                
                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={() => handleBulkGenerate(50)}
                    disabled={isGenerating || isAnyClearing}
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
                    disabled={isGenerating || isAnyClearing}
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
                    disabled={isGenerating || isAnyClearing}
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

                {/* Cleanup Controls */}
                <div className="space-y-3">
                  <h4 className="font-semibold flex items-center gap-2 text-destructive">
                    <AlertTriangle className="h-4 w-4" />
                    Test Data Cleanup
                  </h4>
                  
                  <Alert className="border-destructive/50 bg-destructive/5">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Warning:</strong> Cleanup operations will remove test RFIDs and reset attendee activation status. These actions cannot be undone.
                    </AlertDescription>
                  </Alert>
                  
                  <div className="flex flex-wrap gap-2">
                    <Button
                      onClick={() => openClearConfirmation('mock')}
                      disabled={isGenerating || clearingStates.mock}
                      variant="destructive"
                      size="sm"
                    >
                      {clearingStates.mock ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Zap className="h-4 w-4" />
                      )}
                      Clear MOCK RFIDs
                    </Button>

                    <Button
                      onClick={() => openClearConfirmation('rfid')}
                      disabled={isGenerating || clearingStates.rfid}
                      variant="destructive"
                      size="sm"
                    >
                      {clearingStates.rfid ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Zap className="h-4 w-4" />
                      )}
                      Clear RFID Tags
                    </Button>

                    <Button
                      onClick={() => openClearConfirmation('test')}
                      disabled={isGenerating || clearingStates.test}
                      variant="destructive"
                      size="sm"
                    >
                      {clearingStates.test ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Zap className="h-4 w-4" />
                      )}
                      Clear TEST RFIDs
                    </Button>

                    <Button
                      onClick={() => openClearConfirmation('all')}
                      disabled={isGenerating || clearingStates.all}
                      variant="destructive"
                      size="sm"
                    >
                      {clearingStates.all ? (
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
                      disabled={isGenerating || isAnyClearing}
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
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Safety Confirmation Dialog */}
      <SafetyConfirmationDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog(prev => ({ ...prev, open }))}
        onConfirm={() => handleClearRfids(confirmDialog.type.toUpperCase())}
        title={confirmDialog.title}
        description={confirmDialog.description}
        confirmText="Clear RFIDs"
        destructive={true}
        requiresTyping={confirmDialog.type === 'all'}
        expectedText={confirmDialog.type === 'all' ? 'CLEAR ALL' : ''}
        isProcessing={clearingStates[confirmDialog.type]}
      />
    </>
  );
};