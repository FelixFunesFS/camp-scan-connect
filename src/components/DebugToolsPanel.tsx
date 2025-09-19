import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ComprehensiveCsvAnalysis } from '@/components/ComprehensiveCsvAnalysis';
import { DatabaseOrderIdComparison } from '@/components/DatabaseOrderIdComparison';
import { RegFoxIdDebugger } from '@/components/RegFoxIdDebugger';
import { RegFoxCsvComparison } from '@/components/RegFoxCsvComparison';
import { RegFoxMissingAnalysis } from '@/components/RegFoxMissingAnalysis';
import { Bug, ChevronDown, ChevronRight, AlertTriangle } from 'lucide-react';

export const DebugToolsPanel: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false);

  const debugTools = [
    {
      id: 'csv-analysis',
      title: 'CSV Analysis',
      description: 'Comprehensive CSV data analysis',
      component: ComprehensiveCsvAnalysis
    },
    {
      id: 'order-comparison',
      title: 'Order ID Comparison',
      description: 'Database order ID debugging',
      component: DatabaseOrderIdComparison
    },
    {
      id: 'regfox-debugger',
      title: 'RegFox ID Debugger',
      description: 'RegFox integration debugging',
      component: RegFoxIdDebugger
    },
    {
      id: 'regfox-csv',
      title: 'RegFox CSV Comparison',
      description: 'Compare RegFox CSV data',
      component: RegFoxCsvComparison
    },
    {
      id: 'missing-analysis',
      title: 'Missing Data Analysis',
      description: 'Analyze missing RegFox data',
      component: RegFoxMissingAnalysis
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Bug className="h-6 w-6 text-primary" />
        <h2 className="text-2xl font-bold">Developer Tools</h2>
        <Badge variant="destructive" className="ml-auto">Debug Only</Badge>
      </div>

      <Card>
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  Debug & Analysis Tools
                  <Badge variant="outline">{debugTools.length} tools</Badge>
                </div>
                <Button variant="ghost" size="sm">
                  {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          
          <CollapsibleContent>
            <CardContent className="pt-0">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
                <div className="flex items-center gap-2 text-amber-800 mb-2">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="font-medium">Developer Tools Warning</span>
                </div>
                <p className="text-sm text-amber-700">
                  These tools are intended for debugging and development purposes only. 
                  Use with caution in production environments.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {debugTools.map((tool) => {
                  const ToolComponent = tool.component;
                  return (
                    <div key={tool.id} className="space-y-2">
                      <div className="flex items-center gap-2 p-2 bg-muted rounded">
                        <h4 className="font-medium text-sm">{tool.title}</h4>
                        <Badge variant="outline" className="text-xs">{tool.description}</Badge>
                      </div>
                      <ToolComponent />
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>
    </div>
  );
};