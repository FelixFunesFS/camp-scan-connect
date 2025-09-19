import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Zap, RotateCcw, TestTube2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from "sonner";

interface TestRfidGeneratorProps {
  onGenerated: () => void;
}

export const TestRfidGenerator: React.FC<TestRfidGeneratorProps> = ({ onGenerated }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  const [lastGenerated, setLastGenerated] = useState<string[]>([]);
  

  const generateTestRfids = async () => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.rpc('generate_test_rfid_batch', { 
        count_requested: 5 
      });

      if (error) throw error;

      const generatedUids = data?.map((item: any) => item.test_uid) || [];
      setLastGenerated(generatedUids);

      toast({
        title: "Test RFIDs Generated",
        description: `Generated ${generatedUids.length} test RFID UIDs for rapid testing`,
        duration: 3000
      });

      onGenerated();
    } catch (error) {
      console.error('Failed to generate test RFIDs:', error);
      toast({
        title: "Generation Failed",
        description: "Failed to generate test RFIDs. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const cleanTestData = async () => {
    setIsCleaning(true);
    try {
      const { data: deletedCount, error } = await supabase.rpc('cleanup_test_rfid_data');

      if (error) throw error;

      toast({
        title: "Test Data Cleaned",
        description: `Removed ${deletedCount || 0} test RFID assignments`,
        duration: 2000
      });

      setLastGenerated([]);
      onGenerated();
    } catch (error) {
      console.error('Failed to clean test data:', error);
      toast({
        title: "Cleanup Failed", 
        description: "Failed to clean test data. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsCleaning(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <TestTube2 className="h-4 w-4" />
          RFID Test Generator
        </CardTitle>
        <CardDescription className="text-xs">
          Generate test UIDs for rapid RFID assignment testing
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Button
            onClick={generateTestRfids}
            disabled={isGenerating}
            size="sm"
            className="flex-1"
          >
            {isGenerating ? (
              <>
                <div className="animate-spin rounded-full h-3 w-3 border-2 border-primary border-t-transparent mr-2" />
                Generating...
              </>
            ) : (
              <>
                <Zap className="h-3 w-3 mr-2" />
                Generate 5 UIDs
              </>
            )}
          </Button>
          
          <Button
            onClick={cleanTestData}
            disabled={isCleaning}
            variant="outline"
            size="sm"
          >
            {isCleaning ? (
              <div className="animate-spin rounded-full h-3 w-3 border-2 border-primary border-t-transparent" />
            ) : (
              <RotateCcw className="h-3 w-3" />
            )}
          </Button>
        </div>

        {lastGenerated.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-medium text-muted-foreground">
              Last Generated:
            </div>
            <div className="flex flex-wrap gap-1">
              {lastGenerated.map((uid, index) => (
                <Badge 
                  key={uid} 
                  variant="secondary" 
                  className="text-xs font-mono cursor-pointer"
                  onClick={() => navigator.clipboard.writeText(uid)}
                  title="Click to copy"
                >
                  {uid}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <div className="text-xs text-muted-foreground space-y-1">
          <p><strong>Usage:</strong> Copy UIDs and paste into RFID input fields</p>
          <p><strong>Shortcuts:</strong> Ctrl+Shift+T to generate, Ctrl+Shift+R to cleanup</p>
        </div>
      </CardContent>
    </Card>
  );
};