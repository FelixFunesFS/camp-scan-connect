import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface DatabasePattern {
  range: string;
  count: number;
  examples: string[];
  regfoxIds: string[];
}

interface DatabaseAnalysisResult {
  totalAttendees: number;
  orderIdPatterns: DatabasePattern[];
  uniqueOrderIds: number;
  missingOrderIds: number;
  sampleRegfoxIds: string[];
}

export const DatabaseOrderIdComparison: React.FC = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<DatabaseAnalysisResult | null>(null);

  const analyzeDatabaseData = async () => {
    setIsAnalyzing(true);
    try {
      // Fetch all attendees with their order_id and regfox_id
      const { data: attendees, error } = await supabase
        .from('attendees')
        .select('order_id, regfox_id, first_name, last_name')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Database query error:', error);
        toast.error(`Database error: ${error.message}`);
        return;
      }

      if (!attendees || attendees.length === 0) {
        toast.error('No attendees found in database');
        return;
      }

      const orderIdPatterns: { [key: string]: DatabasePattern } = {};
      const allOrderIds = new Set<string>();
      let missingOrderIds = 0;
      const sampleRegfoxIds: string[] = [];

      // Process each attendee
      attendees.forEach((attendee) => {
        const orderId = attendee.order_id?.trim();
        const regfoxId = attendee.regfox_id?.trim();
        
        if (regfoxId && sampleRegfoxIds.length < 10) {
          sampleRegfoxIds.push(regfoxId);
        }
        
        if (!orderId || orderId === '') {
          missingOrderIds++;
          return;
        }
        
        allOrderIds.add(orderId);
        
        // Determine order ID range (first 2 digits + 'M')
        const range = orderId.substring(0, 2) + 'M';
        
        if (!orderIdPatterns[range]) {
          orderIdPatterns[range] = {
            range,
            count: 0,
            examples: [],
            regfoxIds: []
          };
        }
        
        orderIdPatterns[range].count++;
        if (orderIdPatterns[range].examples.length < 5) {
          orderIdPatterns[range].examples.push(orderId);
        }
        if (regfoxId && orderIdPatterns[range].regfoxIds.length < 3) {
          orderIdPatterns[range].regfoxIds.push(regfoxId);
        }
      });

      const result: DatabaseAnalysisResult = {
        totalAttendees: attendees.length,
        orderIdPatterns: Object.values(orderIdPatterns).sort((a, b) => b.count - a.count),
        uniqueOrderIds: allOrderIds.size,
        missingOrderIds,
        sampleRegfoxIds
      };

      setAnalysisResult(result);
      toast.success('Database analysis completed!');
      console.log('Database Order ID Analysis:', result);
      
    } catch (error) {
      console.error('Error analyzing database:', error);
      toast.error('Failed to analyze database');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>💾 Database Order ID Analysis</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground">
          <p>Analyze current database to see what order ID patterns exist in our synced data.</p>
        </div>
        
        <Button 
          onClick={analyzeDatabaseData} 
          disabled={isAnalyzing}
          className="w-full"
        >
          {isAnalyzing ? 'Analyzing Database...' : 'Analyze Database Patterns'}
        </Button>
        
        {analysisResult && (
          <div className="space-y-4">
            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="p-3 bg-muted rounded-md">
                <div className="text-sm font-medium">Total Attendees</div>
                <div className="text-2xl font-bold">{analysisResult.totalAttendees.toLocaleString()}</div>
              </div>
              <div className="p-3 bg-muted rounded-md">
                <div className="text-sm font-medium">Unique Orders</div>
                <div className="text-2xl font-bold">{analysisResult.uniqueOrderIds.toLocaleString()}</div>
              </div>
              <div className="p-3 bg-muted rounded-md">
                <div className="text-sm font-medium">Missing Order IDs</div>
                <div className="text-2xl font-bold text-red-600">{analysisResult.missingOrderIds}</div>
              </div>
            </div>

            {/* Order ID Patterns */}
            <div className="space-y-2">
              <h4 className="font-medium">Database Order ID Ranges:</h4>
              <ScrollArea className="h-40">
                <div className="space-y-2">
                  {analysisResult.orderIdPatterns.map((pattern) => (
                    <div key={pattern.range} className="p-3 border rounded-md">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium text-lg">{pattern.range} Range</span>
                        <span className="text-sm bg-primary/10 px-2 py-1 rounded">
                          {pattern.count.toLocaleString()} orders
                        </span>
                      </div>
                      <div className="text-xs space-y-1">
                        <div><strong>Examples:</strong> {pattern.examples.join(', ')}</div>
                        {pattern.regfoxIds.length > 0 && (
                          <div><strong>RegFox IDs:</strong> {pattern.regfoxIds.join(', ')}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Sample RegFox IDs */}
            <div className="p-3 border rounded-md">
              <h4 className="font-medium mb-2">Sample RegFox IDs in Database:</h4>
              <div className="text-xs font-mono">
                {analysisResult.sampleRegfoxIds.join(', ')}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};