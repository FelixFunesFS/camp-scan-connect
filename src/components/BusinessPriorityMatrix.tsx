import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  DragDropContext, 
  Droppable, 
  Draggable,
  DropResult
} from '@hello-pangea/dnd';
import { 
  Target, 
  DollarSign, 
  Clock, 
  AlertTriangle,
  TrendingUp,
  Users,
  Shield,
  BarChart3,
  Move,
  Download
} from 'lucide-react';

export interface PriorityItem {
  id: string;
  title: string;
  description: string;
  category: 'operational' | 'user-experience' | 'reliability' | 'business-intelligence';
  priority: 'critical' | 'high' | 'medium' | 'nice-to-have';
  implementationCost: number;
  operationalSavings: number;
  paybackMonths: number;
  riskLevel: 'low' | 'medium' | 'high';
  timeToImplement: number; // weeks
  stakeholderImpact: {
    business: number;
    operations: number;
    it: number;
    staff: number;
  };
}

const defaultPriorityItems: PriorityItem[] = [
  {
    id: 'rfid-tshirts-fix',
    title: 'Fix T-Shirts Station RFID Integration',
    description: 'Critical system failure: 100% missing RFID data (61/61 transactions)',
    category: 'reliability',
    priority: 'critical',
    implementationCost: 5000,
    operationalSavings: 15000,
    paybackMonths: 4,
    riskLevel: 'low',
    timeToImplement: 2,
    stakeholderImpact: { business: 9, operations: 10, it: 8, staff: 7 }
  },
  {
    id: 'activation-workflow',
    title: 'Optimize Activation Station Workflow',
    description: 'Highest volume station (715 transactions) needs efficiency improvements',
    category: 'operational',
    priority: 'high',
    implementationCost: 25000,
    operationalSavings: 45000,
    paybackMonths: 7,
    riskLevel: 'medium',
    timeToImplement: 8,
    stakeholderImpact: { business: 8, operations: 9, it: 6, staff: 9 }
  },
  {
    id: 'checkin-time-reduction',
    title: 'Reduce Check-in Time to <2 Minutes',
    description: 'Streamline registration process for faster attendee flow',
    category: 'user-experience',
    priority: 'high',
    implementationCost: 35000,
    operationalSavings: 60000,
    paybackMonths: 7,
    riskLevel: 'medium',
    timeToImplement: 12,
    stakeholderImpact: { business: 9, operations: 8, it: 7, staff: 8 }
  },
  {
    id: 'self-service-kiosks',
    title: 'Self-Service Activation Kiosks',
    description: 'Reduce staff dependency with automated activation stations',
    category: 'user-experience',
    priority: 'medium',
    implementationCost: 50000,
    operationalSavings: 80000,
    paybackMonths: 8,
    riskLevel: 'high',
    timeToImplement: 16,
    stakeholderImpact: { business: 7, operations: 6, it: 9, staff: 5 }
  },
  {
    id: 'offline-mode',
    title: 'Implement Offline Mode Capabilities',
    description: 'Prevent data loss during connectivity issues',
    category: 'reliability',
    priority: 'critical',
    implementationCost: 15000,
    operationalSavings: 25000,
    paybackMonths: 7,
    riskLevel: 'medium',
    timeToImplement: 6,
    stakeholderImpact: { business: 6, operations: 9, it: 8, staff: 7 }
  },
  {
    id: 'realtime-dashboard',
    title: 'Live Dashboard for Event Managers',
    description: 'Real-time visibility into event operations and bottlenecks',
    category: 'business-intelligence',
    priority: 'medium',
    implementationCost: 30000,
    operationalSavings: 40000,
    paybackMonths: 9,
    riskLevel: 'low',
    timeToImplement: 10,
    stakeholderImpact: { business: 10, operations: 7, it: 6, staff: 5 }
  },
  {
    id: 'predictive-analytics',
    title: 'Predictive Analytics for Resource Allocation',
    description: 'AI-driven insights for optimal staff and equipment distribution',
    category: 'business-intelligence',
    priority: 'nice-to-have',
    implementationCost: 75000,
    operationalSavings: 100000,
    paybackMonths: 9,
    riskLevel: 'high',
    timeToImplement: 24,
    stakeholderImpact: { business: 9, operations: 8, it: 7, staff: 6 }
  },
  {
    id: 'equipment-utilization',
    title: 'Improve Equipment Station Utilization',
    description: 'Address severe underutilization (2 total transactions)',
    category: 'operational',
    priority: 'high',
    implementationCost: 20000,
    operationalSavings: 35000,
    paybackMonths: 7,
    riskLevel: 'low',
    timeToImplement: 8,
    stakeholderImpact: { business: 6, operations: 8, it: 5, staff: 7 }
  }
];

const categoryColors = {
  'operational': 'bg-blue-500',
  'user-experience': 'bg-green-500',
  'reliability': 'bg-red-500',
  'business-intelligence': 'bg-purple-500'
};

const priorityColors = {
  'critical': 'bg-red-600 text-white',
  'high': 'bg-orange-500 text-white',
  'medium': 'bg-yellow-500 text-black',
  'nice-to-have': 'bg-gray-400 text-white'
};

const riskColors = {
  'low': 'text-green-600',
  'medium': 'text-yellow-600',
  'high': 'text-red-600'
};

export function BusinessPriorityMatrix() {
  const [items, setItems] = useState(defaultPriorityItems);
  const [selectedStakeholder, setSelectedStakeholder] = useState<'business' | 'operations' | 'it' | 'staff'>('business');
  const [budgetAllocation, setBudgetAllocation] = useState([300000]); // $300k total budget
  const [activeView, setActiveView] = useState<'matrix' | 'roi' | 'roadmap'>('matrix');

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const newItems = Array.from(items);
    const [reorderedItem] = newItems.splice(result.source.index, 1);
    newItems.splice(result.destination.index, 0, reorderedItem);

    setItems(newItems);
  };

  const getPriorityOrder = (priority: string) => {
    const order = { 'critical': 0, 'high': 1, 'medium': 2, 'nice-to-have': 3 };
    return order[priority as keyof typeof order] ?? 4;
  };

  const sortedItems = [...items].sort((a, b) => {
    const stakeholderWeight = selectedStakeholder;
    const aScore = a.stakeholderImpact[stakeholderWeight] * (5 - getPriorityOrder(a.priority));
    const bScore = b.stakeholderImpact[stakeholderWeight] * (5 - getPriorityOrder(b.priority));
    return bScore - aScore;
  });

  const totalCost = items.reduce((sum, item) => sum + item.implementationCost, 0);
  const totalSavings = items.reduce((sum, item) => sum + item.operationalSavings, 0);
  const averagePayback = items.reduce((sum, item) => sum + item.paybackMonths, 0) / items.length;

  const generatePhases = () => {
    const phases = {
      'Phase 1 (0-3 months)': sortedItems.filter(item => item.priority === 'critical').slice(0, 3),
      'Phase 2 (3-12 months)': sortedItems.filter(item => item.priority === 'high').slice(0, 4),
      'Phase 3 (12+ months)': sortedItems.filter(item => ['medium', 'nice-to-have'].includes(item.priority))
    };
    return phases;
  };

  const exportBusinessCase = () => {
    const businessCase = {
      executiveSummary: {
        totalInvestment: totalCost,
        expectedSavings: totalSavings,
        paybackPeriod: averagePayback,
        topPriorities: sortedItems.slice(0, 5).map(item => item.title)
      },
      phases: generatePhases(),
      stakeholderAnalysis: selectedStakeholder,
      budgetAllocation: budgetAllocation[0]
    };
    
    const dataStr = JSON.stringify(businessCase, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'business-case-priorities.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header with Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-lg font-semibold">Business Priority Ranking System</h3>
          <p className="text-sm text-muted-foreground">
            Drag and drop to rank priorities. Switch stakeholder perspective to see weighted recommendations.
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={exportBusinessCase}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export Business Case
          </Button>
        </div>
      </div>

      {/* Stakeholder Perspective Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Stakeholder Perspective</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {[
              { key: 'business', label: 'Business (40%)', icon: DollarSign },
              { key: 'operations', label: 'Operations (30%)', icon: Users },
              { key: 'it', label: 'IT (20%)', icon: Shield },
              { key: 'staff', label: 'Staff (10%)', icon: Users }
            ].map(({ key, label, icon: Icon }) => (
              <Button
                key={key}
                variant={selectedStakeholder === key ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedStakeholder(key as any)}
                className="flex items-center gap-2"
              >
                <Icon className="h-4 w-4" />
                {label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Investment</p>
                <p className="text-2xl font-bold">${(totalCost / 1000).toFixed(0)}K</p>
              </div>
              <DollarSign className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Expected Savings</p>
                <p className="text-2xl font-bold text-green-600">${(totalSavings / 1000).toFixed(0)}K</p>
              </div>
              <TrendingUp className="h-5 w-5 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg. Payback</p>
                <p className="text-2xl font-bold">{averagePayback.toFixed(1)} mo</p>
              </div>
              <Clock className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">ROI</p>
                <p className="text-2xl font-bold text-green-600">{((totalSavings - totalCost) / totalCost * 100).toFixed(0)}%</p>
              </div>
              <BarChart3 className="h-5 w-5 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeView} onValueChange={(value) => setActiveView(value as any)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="matrix">Priority Matrix</TabsTrigger>
          <TabsTrigger value="roi">ROI Analysis</TabsTrigger>
          <TabsTrigger value="roadmap">Implementation Roadmap</TabsTrigger>
        </TabsList>

        <TabsContent value="matrix" className="space-y-4">
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="priority-list">
              {(provided) => (
                <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-3">
                  {sortedItems.map((item, index) => (
                    <Draggable key={item.id} draggableId={item.id} index={index}>
                      {(provided, snapshot) => (
                        <Card
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={`transition-all duration-200 ${
                            snapshot.isDragging ? 'shadow-lg rotate-1' : ''
                          }`}
                        >
                          <CardContent className="pt-4">
                            <div className="flex items-start gap-4">
                              <div {...provided.dragHandleProps} className="mt-1">
                                <Move className="h-5 w-5 text-muted-foreground hover:text-foreground cursor-grab" />
                              </div>
                              
                              <div className="flex-1 space-y-3">
                                <div className="flex items-start justify-between">
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm font-medium text-muted-foreground">#{index + 1}</span>
                                      <h4 className="font-semibold">{item.title}</h4>
                                      <Badge className={priorityColors[item.priority]}>
                                        {item.priority}
                                      </Badge>
                                    </div>
                                    <p className="text-sm text-muted-foreground">{item.description}</p>
                                  </div>
                                  <div className={`w-3 h-3 rounded-full ${categoryColors[item.category]}`} />
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                  <div>
                                    <span className="text-muted-foreground">Cost: </span>
                                    <span className="font-medium">${(item.implementationCost / 1000).toFixed(0)}K</span>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Savings: </span>
                                    <span className="font-medium text-green-600">${(item.operationalSavings / 1000).toFixed(0)}K</span>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Payback: </span>
                                    <span className="font-medium">{item.paybackMonths} mo</span>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Risk: </span>
                                    <span className={`font-medium ${riskColors[item.riskLevel]}`}>
                                      {item.riskLevel}
                                    </span>
                                  </div>
                                </div>

                                <div className="space-y-2">
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="text-muted-foreground">Stakeholder Impact ({selectedStakeholder})</span>
                                    <span className="font-medium">{item.stakeholderImpact[selectedStakeholder]}/10</span>
                                  </div>
                                  <Progress 
                                    value={item.stakeholderImpact[selectedStakeholder] * 10} 
                                    className="h-2"
                                  />
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        </TabsContent>

        <TabsContent value="roi" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Cost-Benefit Analysis</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {sortedItems.slice(0, 5).map((item) => (
                  <div key={item.id} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">{item.title}</span>
                      <Badge variant="outline">{((item.operationalSavings - item.implementationCost) / item.implementationCost * 100).toFixed(0)}% ROI</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
                      <div>Cost: ${(item.implementationCost / 1000).toFixed(0)}K</div>
                      <div>Savings: ${(item.operationalSavings / 1000).toFixed(0)}K</div>
                    </div>
                    <Progress 
                      value={Math.min((item.operationalSavings / item.implementationCost) * 20, 100)} 
                      className="h-2"
                    />
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Budget Allocation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Total Budget</span>
                    <span className="text-lg font-bold">${(budgetAllocation[0] / 1000).toFixed(0)}K</span>
                  </div>
                  <Slider
                    value={budgetAllocation}
                    onValueChange={setBudgetAllocation}
                    max={500000}
                    min={100000}
                    step={25000}
                    className="w-full"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Available Budget</span>
                    <span className="font-medium">${(budgetAllocation[0] / 1000).toFixed(0)}K</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Required Investment</span>
                    <span className="font-medium">${(totalCost / 1000).toFixed(0)}K</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Remaining Budget</span>
                    <span className={`font-medium ${budgetAllocation[0] - totalCost >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ${((budgetAllocation[0] - totalCost) / 1000).toFixed(0)}K
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="roadmap" className="space-y-4">
          {Object.entries(generatePhases()).map(([phase, phaseItems]) => (
            <Card key={phase}>
              <CardHeader>
                <CardTitle className="text-lg">{phase}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {phaseItems.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="space-y-1">
                        <h4 className="font-medium">{item.title}</h4>
                        <p className="text-sm text-muted-foreground">{item.timeToImplement} weeks implementation</p>
                      </div>
                      <div className="text-right space-y-1">
                        <div className="text-sm font-medium">${(item.implementationCost / 1000).toFixed(0)}K</div>
                        <Badge className={priorityColors[item.priority]}>{item.priority}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t">
                  <div className="flex justify-between text-sm font-medium">
                    <span>Phase Total:</span>
                    <span>${(phaseItems.reduce((sum, item) => sum + item.implementationCost, 0) / 1000).toFixed(0)}K</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}