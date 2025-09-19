import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';

interface OrderIdPattern {
  range: string;
  count: number;
  examples: string[];
  registrantIds: string[];
}

interface CsvAnalysisResult {
  totalRecords: number;
  orderIdPatterns: OrderIdPattern[];
  uniqueOrderIds: number;
  registrantIdPatterns: {
    alphanumeric: number;
    numeric: number;
    examples: string[];
  };
}

export const ComprehensiveCsvAnalysis: React.FC = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<CsvAnalysisResult | null>(null);

  const analyzeCsvData = async () => {
    setIsAnalyzing(true);
    try {
      const response = await fetch('user-uploads://registrants.csv');
      const csvText = await response.text();
      
      // Parse CSV manually (simple approach for this analysis)
      const lines = csvText.split('\n');
      const headers = lines[0].split(',');
      
      // Find Order ID and Registrant ID column indices
      const orderIdIndex = headers.findIndex(h => h.includes('Order ID'));
      const registrantIdIndex = headers.findIndex(h => h.includes('Registrant ID'));
      
      if (orderIdIndex === -1 || registrantIdIndex === -1) {
        toast.error('Could not find Order ID or Registrant ID columns in CSV');
        return;
      }

      const orderIdPatterns: { [key: string]: OrderIdPattern } = {};
      const allOrderIds = new Set<string>();
      const registrantIds: string[] = [];
      let alphanumericCount = 0;
      let numericCount = 0;

      // Process each data row (skip header)
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const columns = line.split(',');
        if (columns.length <= Math.max(orderIdIndex, registrantIdIndex)) continue;
        
        const orderId = columns[orderIdIndex]?.trim();
        const registrantId = columns[registrantIdIndex]?.trim();
        
        if (orderId && orderId !== '') {
          allOrderIds.add(orderId);
          
          // Determine order ID range (first 2 digits + 'M')
          const range = orderId.substring(0, 2) + 'M';
          
          if (!orderIdPatterns[range]) {
            orderIdPatterns[range] = {
              range,
              count: 0,
              examples: [],
              registrantIds: []
            };
          }
          
          orderIdPatterns[range].count++;
          if (orderIdPatterns[range].examples.length < 5) {
            orderIdPatterns[range].examples.push(orderId);
          }
          if (registrantId && orderIdPatterns[range].registrantIds.length < 3) {
            orderIdPatterns[range].registrantIds.push(registrantId);
          }
        }
        
        if (registrantId && registrantId !== '') {
          registrantIds.push(registrantId);
          
          // Check if alphanumeric or numeric
          if (/^[0-9]+$/.test(registrantId)) {
            numericCount++;
          } else if (/^[0-9A-Z]+$/.test(registrantId)) {
            alphanumericCount++;
          }
        }
      }

      const result: CsvAnalysisResult = {
        totalRecords: lines.length - 1, // Exclude header
        orderIdPatterns: Object.values(orderIdPatterns).sort((a, b) => b.count - a.count),
        uniqueOrderIds: allOrderIds.size,
        registrantIdPatterns: {
          alphanumeric: alphanumericCount,
          numeric: numericCount,
          examples: registrantIds.slice(0, 10)
        }
      };

      setAnalysisResult(result);
      toast.success('CSV analysis completed! Found multiple order ID ranges.');
      console.log('Comprehensive CSV Analysis:', result);
      
    } catch (error) {
      console.error('Error analyzing CSV:', error);
      toast.error('Failed to analyze CSV file');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>📊 Comprehensive CSV Analysis</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground">
          <p>Analyze the uploaded CSV to identify all order ID patterns and registrant ID formats.</p>
        </div>
        
        <Button 
          onClick={analyzeCsvData} 
          disabled={isAnalyzing}
          className="w-full"
        >
          {isAnalyzing ? 'Analyzing CSV...' : 'Analyze CSV Patterns'}
        </Button>
        
        {analysisResult && (
          <div className="space-y-4">
            {/* Summary Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-muted rounded-md">
                <div className="text-sm font-medium">Total Records</div>
                <div className="text-2xl font-bold">{analysisResult.totalRecords.toLocaleString()}</div>
              </div>
              <div className="p-3 bg-muted rounded-md">
                <div className="text-sm font-medium">Unique Orders</div>
                <div className="text-2xl font-bold">{analysisResult.uniqueOrderIds.toLocaleString()}</div>
              </div>
            </div>

            {/* Order ID Patterns */}
            <div className="space-y-2">
              <h4 className="font-medium">Order ID Ranges Found:</h4>
              <ScrollArea className="h-48">
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
                        {pattern.registrantIds.length > 0 && (
                          <div><strong>Sample Registrant IDs:</strong> {pattern.registrantIds.join(', ')}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Registrant ID Analysis */}
            <div className="p-3 border rounded-md">
              <h4 className="font-medium mb-2">Registrant ID Patterns:</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Alphanumeric:</span> {analysisResult.registrantIdPatterns.alphanumeric}
                </div>
                <div>
                  <span className="font-medium">Numeric:</span> {analysisResult.registrantIdPatterns.numeric}
                </div>
              </div>
              <div className="mt-2 text-xs">
                <strong>Examples:</strong> {analysisResult.registrantIdPatterns.examples.slice(0, 5).join(', ')}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};