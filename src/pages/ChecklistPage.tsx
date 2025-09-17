import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, Circle, Clock, AlertTriangle, Zap, Users, Database, Search, BarChart3, FileText, Settings, ArrowLeft, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  status: 'completed' | 'in-progress' | 'not-started' | 'critical';
  estimatedHours: number;
  category: 'core' | 'nice-to-have';
  dependencies?: string[];
}

const ChecklistPage: React.FC = () => {
  const navigate = useNavigate();
  
  const handleRefreshData = () => {
    // Refresh checklist data - could trigger real-time updates
    window.location.reload();
  };

  const checklistItems: ChecklistItem[] = [
    // Core Features (Critical for MVP)
    {
      id: 'rfid-assignment',
      title: 'RFID Assignment System',
      description: 'Core functionality for assigning RFID UIDs to attendees with validation',
      status: 'completed',
      estimatedHours: 3,
      category: 'core'
    },
    {
      id: 'database-integration',
      title: 'Database Integration',
      description: 'Supabase backend integration with real-time sync',
      status: 'completed',
      estimatedHours: 2,
      category: 'core'
    },
    {
      id: 'keyboard-navigation',
      title: 'Keyboard Navigation',
      description: 'Arrow key navigation between RFID input fields',
      status: 'completed',
      estimatedHours: 1.5,
      category: 'core'
    },
    {
      id: 'search-filtering',
      title: 'Search & Filtering',
      description: 'Column filters, search functionality, and data sorting',
      status: 'completed',
      estimatedHours: 2,
      category: 'core'
    },
    {
      id: 'grouped-individual-views',
      title: 'Grouped/Individual Views',
      description: 'Toggle between grouped by order and individual attendee views',
      status: 'completed',
      estimatedHours: 2.5,
      category: 'core'
    },
    {
      id: 'transaction-logging',
      title: 'Station Transaction Logging',
      description: 'Comprehensive activity tracking and audit trail',
      status: 'completed',
      estimatedHours: 1.5,
      category: 'core'
    },
    {
      id: 'realtime-rfid-capture',
      title: 'Real-time RFID Capture',
      description: 'Hardware integration for RFID scanning',
      status: 'completed',
      estimatedHours: 2,
      category: 'core'
    },
    {
      id: 'sticky-headers',
      title: 'Sticky Table Headers',
      description: 'Headers remain visible during scrolling',
      status: 'completed',
      estimatedHours: 0.5,
      category: 'core'
    },
    {
      id: 'group-controls',
      title: 'Group Management Controls',
      description: 'Expand/collapse all groups functionality',
      status: 'completed',
      estimatedHours: 1,
      category: 'core'
    },
    {
      id: 'test-rfid-generation',
      title: 'Test RFID Generation',
      description: '5-at-a-time test RFID system with cleanup (Ctrl+Shift+T/R)',
      status: 'completed',
      estimatedHours: 1,
      category: 'core'
    },

    // Nice-to-Have Features
    {
      id: 'advanced-reporting',
      title: 'Advanced Reporting Analytics',
      description: 'Detailed analytics dashboard with charts and insights',
      status: 'not-started',
      estimatedHours: 4,
      category: 'nice-to-have'
    },
    {
      id: 'bulk-rfid-tools',
      title: 'Bulk RFID Assignment Tools',
      description: 'Batch operations for multiple RFID assignments',
      status: 'not-started',
      estimatedHours: 3,
      category: 'nice-to-have'
    },
    {
      id: 'mobile-optimization',
      title: 'Mobile-Optimized Interface',
      description: 'Enhanced mobile experience with touch-friendly controls',
      status: 'in-progress',
      estimatedHours: 2,
      category: 'nice-to-have'
    },
    {
      id: 'export-import',
      title: 'Export/Import Capabilities',
      description: 'CSV/Excel export and import functionality',
      status: 'not-started',
      estimatedHours: 2.5,
      category: 'nice-to-have'
    },
    {
      id: 'advanced-search',
      title: 'Advanced Search Filters',
      description: 'Complex search with date ranges, multi-select filters',
      status: 'not-started',
      estimatedHours: 2,
      category: 'nice-to-have'
    },
    {
      id: 'user-roles',
      title: 'User Role Management',
      description: 'Different access levels for staff, managers, admins',
      status: 'not-started',
      estimatedHours: 3,
      category: 'nice-to-have'
    }
  ];

  const getStatusIcon = (status: ChecklistItem['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'in-progress':
        return <Clock className="h-5 w-5 text-blue-600" />;
      case 'critical':
        return <AlertTriangle className="h-5 w-5 text-red-600" />;
      default:
        return <Circle className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: ChecklistItem['status']) => {
    switch (status) {
      case 'completed':
        return 'default';
      case 'in-progress':
        return 'secondary';
      case 'critical':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const coreItems = checklistItems.filter(item => item.category === 'core');
  const niceToHaveItems = checklistItems.filter(item => item.category === 'nice-to-have');

  const coreCompleted = coreItems.filter(item => item.status === 'completed').length;
  const coreTotal = coreItems.length;
  const coreProgress = (coreCompleted / coreTotal) * 100;

  const totalEstimatedHours = checklistItems.reduce((sum, item) => sum + item.estimatedHours, 0);
  const completedHours = checklistItems
    .filter(item => item.status === 'completed')
    .reduce((sum, item) => sum + item.estimatedHours, 0);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 max-w-6xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="outline" onClick={() => navigate('/reports')} className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Reports
          </Button>
          <div>
            <h1 className="text-3xl font-bold">RFID Management System Checklist</h1>
            <p className="text-muted-foreground">Complete project status and feature implementation progress</p>
          </div>
        </div>

        {/* Progress Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Core Features
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{coreCompleted} of {coreTotal} completed</span>
                  <span className="font-semibold">{Math.round(coreProgress)}%</span>
                </div>
                <Progress value={coreProgress} className="h-2" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-lg">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-blue-600" />
                  Time Investment
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleRefreshData}
                  className="h-8 w-8 p-0"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                <div className="text-2xl font-bold">{completedHours}h completed</div>
                <div className="text-sm text-muted-foreground">of {totalEstimatedHours}h estimated total</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Zap className="h-5 w-5 text-yellow-600" />
                MVP Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                <div className="text-2xl font-bold text-green-600">Ready</div>
                <div className="text-sm text-muted-foreground">All core features implemented</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Feature Categories */}
        <div className="space-y-8">
          {/* Core Features */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Core Features - MVP Requirements
              </CardTitle>
              <CardDescription>
                Essential functionality required for production deployment
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {coreItems.map((item) => (
                  <div key={item.id} className="flex items-start gap-3 p-3 rounded-lg border bg-card/50">
                    {getStatusIcon(item.status)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{item.title}</h3>
                        <Badge variant={getStatusColor(item.status)} className="text-xs">
                          {item.status.replace('-', ' ')}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {item.estimatedHours}h
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Nice-to-Have Features */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Nice-to-Have Features - Post-MVP
              </CardTitle>
              <CardDescription>
                Enhancement features for future development iterations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {niceToHaveItems.map((item) => (
                  <div key={item.id} className="flex items-start gap-3 p-3 rounded-lg border bg-card/50 opacity-75">
                    {getStatusIcon(item.status)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{item.title}</h3>
                        <Badge variant={getStatusColor(item.status)} className="text-xs">
                          {item.status.replace('-', ' ')}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {item.estimatedHours}h
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* RFID Workflow Documentation */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              RFID Management Workflow
            </CardTitle>
            <CardDescription>
              Step-by-step process for RFID assignment and activation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  RFID Assignment Process
                </h4>
                <ol className="space-y-2 text-sm">
                  <li className="flex gap-2">
                    <span className="font-mono bg-muted px-1 rounded text-xs">1</span>
                    Navigate to Reports → Check-in Management
                  </li>
                  <li className="flex gap-2">
                    <span className="font-mono bg-muted px-1 rounded text-xs">2</span>
                    Use search/filters to find attendee
                  </li>
                  <li className="flex gap-2">
                    <span className="font-mono bg-muted px-1 rounded text-xs">3</span>
                    Click in RFID Assignment field or use keyboard navigation (↑↓)
                  </li>
                  <li className="flex gap-2">
                    <span className="font-mono bg-muted px-1 rounded text-xs">4</span>
                    Scan or manually enter RFID UID
                  </li>
                  <li className="flex gap-2">
                    <span className="font-mono bg-muted px-1 rounded text-xs">5</span>
                    Press Enter or click assign button
                  </li>
                  <li className="flex gap-2">
                    <span className="font-mono bg-muted px-1 rounded text-xs">6</span>
                    System validates UID and creates assignment
                  </li>
                </ol>
              </div>
              
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  Activation Workflow
                </h4>
                <ol className="space-y-2 text-sm">
                  <li className="flex gap-2">
                    <span className="font-mono bg-muted px-1 rounded text-xs">1</span>
                    Navigate to Activation Station
                  </li>
                  <li className="flex gap-2">
                    <span className="font-mono bg-muted px-1 rounded text-xs">2</span>
                    Enter phone number for lookup
                  </li>
                  <li className="flex gap-2">
                    <span className="font-mono bg-muted px-1 rounded text-xs">3</span>
                    System displays all attendees for that phone
                  </li>
                  <li className="flex gap-2">
                    <span className="font-mono bg-muted px-1 rounded text-xs">4</span>
                    Click "Activate Group" or "Activate Individual"
                  </li>
                  <li className="flex gap-2">
                    <span className="font-mono bg-muted px-1 rounded text-xs">5</span>
                    System activates RFID tags and marks attendees as active
                  </li>
                  <li className="flex gap-2">
                    <span className="font-mono bg-muted px-1 rounded text-xs">6</span>
                    Attendees can now use services at stations
                  </li>
                </ol>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Keyboard Shortcuts Reference */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Keyboard Shortcuts & Features
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h4 className="font-semibold mb-3">Navigation</h4>
                <ul className="space-y-1 text-sm">
                  <li><code className="bg-muted px-1 rounded">↑↓</code> Navigate between RFID fields</li>
                  <li><code className="bg-muted px-1 rounded">Enter</code> Assign RFID</li>
                  <li><code className="bg-muted px-1 rounded">Esc</code> Clear field</li>
                  <li><code className="bg-muted px-1 rounded">Ctrl+G</code> Next unassigned</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold mb-3">Test RFIDs</h4>
                <ul className="space-y-1 text-sm">
                  <li><code className="bg-muted px-1 rounded">Ctrl+Shift+T</code> Generate 5 test UIDs</li>
                  <li><code className="bg-muted px-1 rounded">Ctrl+Shift+R</code> Clean test data</li>
                  <li>Click generated UIDs to copy</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold mb-3">Views & Filters</h4>
                <ul className="space-y-1 text-sm">
                  <li>Toggle Grouped/Individual view</li>
                  <li>Column visibility controls</li>
                  <li>Advanced search and filters</li>
                  <li>Export to CSV/Excel</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ChecklistPage;