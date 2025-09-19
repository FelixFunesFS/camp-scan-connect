import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const RegFoxCsvComparison: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [debugData, setDebugData] = useState<any>(null);

  const handleDebugFields = async () => {
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
      toast.success('RegFox field data retrieved! Check console for details.');
      console.log('RegFox Field Debug:', data);
    } catch (error) {
      console.error('Error calling debug function:', error);
      toast.error('Failed to debug RegFox fields');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>RegFox Field Mapping Analysis</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground">
          <p><strong>Expected from CSV:</strong></p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>Order ID: 57407070, 57422866, etc. (57M range)</li>
            <li>Registrant ID: 01JH0XDA2674GH4YYTB, etc. (alphanumeric)</li>
          </ul>
          <p className="mt-4"><strong>Current database:</strong></p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>Order ID: 65729726, 65714096, etc. (65M range) ❌</li>
            <li>This suggests we're using displayId instead of orderId</li>
          </ul>
        </div>
        
        <Button 
          onClick={handleDebugFields} 
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? 'Analyzing...' : 'Debug RegFox API Fields'}
        </Button>
        
        {debugData && (
          <div className="mt-4 p-4 bg-muted rounded-lg">
            <h4 className="font-medium mb-2">RegFox API Response Structure:</h4>
            <pre className="text-xs overflow-x-auto whitespace-pre-wrap">
              {JSON.stringify(debugData.sampleData, null, 2)}
            </pre>
            
            {debugData.sampleData && Array.isArray(debugData.sampleData) && debugData.sampleData[0] && (
              <div className="mt-4 p-3 bg-background border rounded">
                <h5 className="font-medium mb-2">Field Analysis:</h5>
                <div className="space-y-2 text-sm">
                  <div><strong>id:</strong> {debugData.sampleData[0].id} (Registrant ID)</div>
                  <div><strong>displayId:</strong> {debugData.sampleData[0].displayId} (Display ID - 65M range?)</div>
                  <div><strong>orderId:</strong> {debugData.sampleData[0].orderId} (Actual Order ID - should be 57M range)</div>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};