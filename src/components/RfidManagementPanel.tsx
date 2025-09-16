import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Zap, Users, Tag } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface RfidStats {
  total_attendees: number;
  attendees_with_rfids: number;
  attendees_without_rfids: number;
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
  const [stats, setStats] = useState<RfidStats | null>(null);
  const [lastGenerated, setLastGenerated] = useState<GeneratedRfid[]>([]);
  const { toast } = useToast();

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
        description: `Generated ${result.generated_count} mock RFID tags`,
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

  const loadCurrentStats = async () => {
    try {
      const { count: totalAttendees } = await supabase
        .from('attendees')
        .select('*', { count: 'exact', head: true });

      const { data: attendeesWithRfids } = await supabase
        .from('attendees')
        .select(`
          id,
          rfid_tags!inner(uid, status)
        `);

      const withRfids = attendeesWithRfids?.length || 0;
      const total = totalAttendees || 0;

      setStats({
        total_attendees: total,
        attendees_with_rfids: withRfids,
        attendees_without_rfids: total - withRfids
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
            Generate mock RFID UIDs for testing and manage RFID assignments
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Statistics */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-600" />
                  <span className="font-semibold text-blue-900">Total Attendees</span>
                </div>
                <p className="text-2xl font-bold text-blue-700">{stats.total_attendees}</p>
              </div>
              
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <Tag className="h-5 w-5 text-green-600" />
                  <span className="font-semibold text-green-900">With RFIDs</span>
                </div>
                <p className="text-2xl font-bold text-green-700">{stats.attendees_with_rfids}</p>
              </div>
              
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-orange-600" />
                  <span className="font-semibold text-orange-900">Need RFIDs</span>
                </div>
                <p className="text-2xl font-bold text-orange-700">{stats.attendees_without_rfids}</p>
              </div>
            </div>
          )}

          {/* Generation Controls */}
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => handleBulkGenerate(50)}
                disabled={isGenerating}
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
                disabled={isGenerating}
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
                disabled={isGenerating}
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

            <Button
              onClick={loadCurrentStats}
              variant="ghost"
              size="sm"
            >
              Refresh Statistics
            </Button>
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