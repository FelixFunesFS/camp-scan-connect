import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const RegFoxIdDebugger: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [debugData, setDebugData] = useState<any>(null);

  const handleDebugIds = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('regfox-debug-ids', {
        body: {}
      });

      if (error) {
        console.error('Debug function error:', error);
        toast.error(`Debug function error: ${error.message}`);
        return;
      }

      setDebugData(data);
      toast.success('Debug data retrieved! Check console for detailed logs.');
      console.log('RegFox ID Debug Data:', data);
    } catch (error) {
      console.error('Error calling debug function:', error);
      toast.error('Failed to debug RegFox IDs');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>RegFox ID Debug Tool</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={handleDebugIds} 
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? 'Debugging...' : 'Debug RegFox ID Fields'}
        </Button>
        
        {debugData && (
          <div className="mt-4 p-4 bg-muted rounded-lg">
            <h4 className="font-medium mb-2">Sample RegFox Data:</h4>
            <pre className="text-xs overflow-x-auto">
              {JSON.stringify(debugData.sampleData, null, 2)}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
};