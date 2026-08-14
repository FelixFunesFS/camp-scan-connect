import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { 
  Book, 
  Search, 
  AlertTriangle, 
  CheckCircle,
  Clock,
  Users,
  CreditCard,
  Utensils,
  Coffee,
  Headphones,
  Car,
  Radio,
  Shirt,
  DoorOpen,
  Zap,
  Phone,
  Wifi,
  Settings,
  Shield,
  HelpCircle,
  FileText,
  Printer,
  Download
} from 'lucide-react';

interface StationGuide {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
  keyProcedures: string[];
  commonIssues: { problem: string; solution: string }[];
  quickActions: { action: string; steps: string[] }[];
}

interface EmergencyProcedure {
  title: string;
  icon: React.ReactNode;
  severity: 'critical' | 'high' | 'medium';
  steps: string[];
  contacts: string[];
}

export function StaffGuideHub() {
  const [searchTerm, setSearchTerm] = useState('');

  const stationGuides: StationGuide[] = [
    {
      id: 'activation',
      name: 'Activation Station',
      icon: <Zap className="h-5 w-5" />,
      description: 'Primary check-in point for attendee RFID activation',
      keyProcedures: [
        'Phone number verification and activation',
        'RFID bracelet assignment and testing',
        'Waiver compliance validation',
        'Group vs individual processing decisions'
      ],
      commonIssues: [
        {
          problem: 'Phone number not found',
          solution: 'Search by email or full name. Check phone format: (555) 123-4567'
        },
        {
          problem: 'RFID not scanning',
          solution: 'Try different reader angle. Check for damage. Use backup manual entry'
        },
        {
          problem: 'Waiver not signed',
          solution: 'Direct attendee to complete waiver before activation'
        }
      ],
      quickActions: [
        {
          action: 'Emergency Manual Activation',
          steps: [
            'Verify attendee identity with photo ID',
            'Record phone and email manually',
            'Assign RFID and note manual override',
            'Create follow-up task for data sync'
          ]
        }
      ]
    },
    {
      id: 'meal',
      name: 'Meal Station',
      icon: <Utensils className="h-5 w-5" />,
      description: 'Track meal distributions and dietary restrictions',
      keyProcedures: [
        'Scan RFID for meal validation',
        'Check daily meal allowances',
        'Handle dietary restriction requests',
        'Process veteran priority service'
      ],
      commonIssues: [
        {
          problem: 'Daily limit exceeded',
          solution: 'Check transaction history. Override only with supervisor approval'
        },
        {
          problem: 'Dietary restriction not in system',
          solution: 'Note special request and coordinate with kitchen staff'
        }
      ],
      quickActions: [
        {
          action: 'Quick Meal Distribution',
          steps: [
            'Scan attendee RFID bracelet',
            'Select meal type (breakfast/lunch/dinner)',
            'Confirm dietary requirements',
            'Complete transaction'
          ]
        }
      ]
    },
    {
      id: 'drinks',
      name: 'Drinks Station',
      icon: <Coffee className="h-5 w-5" />,
      description: 'Beverage service and tracking',
      keyProcedures: [
        'code scan for drink validation',
        'Age verification for alcoholic beverages',
        'Daily consumption tracking',
        'Special event drink distributions'
      ],
      commonIssues: [
        {
          problem: 'Age verification required',
          solution: 'Check photo ID. Flag account if under 21 for alcohol restrictions'
        },
        {
          problem: 'Excessive consumption flagged',
          solution: 'Review daily history. Consult with security if needed'
        }
      ],
      quickActions: [
        {
          action: 'Quick Drink Service',
          steps: [
            'Scan RFID bracelet',
            'Select drink type',
            'Verify age for alcohol (if applicable)',
            'Complete transaction'
          ]
        }
      ]
    },
    {
      id: 'headphones',
      name: 'Headphones Station',
      icon: <Headphones className="h-5 w-5" />,
      description: 'Equipment checkout and return tracking',
      keyProcedures: [
        'Equipment checkout process',
        'Return inspection and sanitization',
        'Damage assessment and fees',
        'Lost equipment replacement'
      ],
      commonIssues: [
        {
          problem: 'Equipment damaged on return',
          solution: 'Document damage with photos. Apply replacement fee if severe'
        },
        {
          problem: 'Lost equipment claim',
          solution: 'Check transaction history. Process replacement fee'
        }
      ],
      quickActions: [
        {
          action: 'Equipment Checkout',
          steps: [
            'Scan attendee RFID',
            'Select equipment type',
            'Inspect equipment condition',
            'Complete checkout transaction'
          ]
        },
        {
          action: 'Equipment Return',
          steps: [
            'Scan attendee RFID',
            'Inspect returned equipment',
            'Sanitize if required',
            'Complete return transaction'
          ]
        }
      ]
    },
    {
      id: 'main_gate',
      name: 'Main Gate',
      icon: <DoorOpen className="h-5 w-5" />,
      description: 'Entry/exit access control and security',
      keyProcedures: [
        'RFID validation for entry/exit',
        'Guest pass verification',
        'Re-entry tracking',
        'Security incident reporting'
      ],
      commonIssues: [
        {
          problem: 'RFID not recognized',
          solution: 'Verify activation status. Check for technical issues. Use manual entry if needed'
        },
        {
          problem: 'Re-entry denied',
          solution: 'Check exit transaction history. Verify bracelet authenticity'
        }
      ],
      quickActions: [
        {
          action: 'Manual Gate Entry',
          steps: [
            'Verify attendee identity',
            'Check activation status',
            'Record manual entry reason',
            'Complete gate transaction'
          ]
        }
      ]
    }
  ];

  const emergencyProcedures: EmergencyProcedure[] = [
    {
      title: 'System Wide Network Outage',
      icon: <Wifi className="h-5 w-5" />,
      severity: 'critical',
      steps: [
        'Immediately switch to paper backup sheets',
        'Record all transactions manually with timestamp',
        'Use mobile hotspot for critical operations only',
        'Notify all station supervisors via radio',
        'Post manual processing signs at all stations',
        'Continue operations with extended processing times',
        'Sync all data once connectivity restored'
      ],
      contacts: ['IT Support: ext. 911', 'Event Director: ext. 100']
    },
    {
      title: 'Scanner Hardware Failure',
      icon: <CreditCard className="h-5 w-5" />,
      severity: 'high',
      steps: [
        'Switch to backup scanner immediately',
        'Test backup scanner functionality',
        'If no backup available, use manual RFID entry',
        'Record hardware failure in incident log',
        'Contact technical support for repair',
        'Document all manual transactions for later sync'
      ],
      contacts: ['Tech Support: ext. 505', 'Station Supervisor: ext. 200']
    },
    {
      title: 'Mass Attendee Check-in Failure',
      icon: <Users className="h-5 w-5" />,
      severity: 'high',
      steps: [
        'Identify root cause (system, network, or process)',
        'Implement manual check-in procedure',
        'Set up express lanes for verified attendees',
        'Deploy additional staff to manage queues',
        'Communicate delays to attendees',
        'Escalate to event management if widespread'
      ],
      contacts: ['Event Manager: ext. 101', 'Guest Services: ext. 300']
    },
    {
      title: 'Food Safety Incident',
      icon: <Utensils className="h-5 w-5" />,
      severity: 'critical',
      steps: [
        'Immediately stop affected food service',
        'Isolate and quarantine suspected items',
        'Document all affected meal transactions',
        'Notify health department if required',
        'Implement alternative food service plan',
        'Coordinate with medical staff for attendee care'
      ],
      contacts: ['Health Officer: ext. 911', 'Kitchen Manager: ext. 400']
    }
  ];

  const filteredStations = stationGuides.filter(station =>
    station.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    station.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getSeverityBadge = (severity: string) => {
    const variants = {
      critical: 'destructive',
      high: 'destructive',
      medium: 'default'
    } as const;
    
    return <Badge variant={variants[severity as keyof typeof variants]}>{severity}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Staff Operations Guide</h2>
          <p className="text-muted-foreground">Comprehensive operational procedures and troubleshooting</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Printer className="h-4 w-4 mr-2" />
            Print Quick Reference
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export Procedures
          </Button>
        </div>
      </div>

      <Tabs defaultValue="stations" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="stations">Station Operations</TabsTrigger>
          <TabsTrigger value="emergency">Emergency Procedures</TabsTrigger>
          <TabsTrigger value="admin">Admin Operations</TabsTrigger>
          <TabsTrigger value="training">Training Modules</TabsTrigger>
        </TabsList>

        <TabsContent value="stations" className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search station procedures..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Badge variant="secondary">{filteredStations.length} stations</Badge>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredStations.map((station) => (
              <Card key={station.id} className="h-fit">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    {station.icon}
                    {station.name}
                  </CardTitle>
                  <CardDescription>{station.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      Key Procedures
                    </h4>
                    <ul className="text-sm space-y-1">
                      {station.keyProcedures.map((procedure, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <span className="text-muted-foreground">•</span>
                          {procedure}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <Separator />

                  <Accordion type="single" collapsible>
                    <AccordionItem value="troubleshooting">
                      <AccordionTrigger className="text-sm">
                        <span className="flex items-center gap-2">
                          <HelpCircle className="h-4 w-4" />
                          Common Issues & Solutions
                        </span>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-3">
                          {station.commonIssues.map((issue, index) => (
                            <div key={index} className="p-3 bg-muted/50 rounded-lg">
                              <p className="font-medium text-sm text-red-700">Problem: {issue.problem}</p>
                              <p className="text-sm text-green-700 mt-1">Solution: {issue.solution}</p>
                            </div>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="quick-actions">
                      <AccordionTrigger className="text-sm">
                        <span className="flex items-center gap-2">
                          <Zap className="h-4 w-4" />
                          Quick Action Guides
                        </span>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-4">
                          {station.quickActions.map((action, index) => (
                            <div key={index} className="p-3 border rounded-lg">
                              <h5 className="font-medium text-sm mb-2">{action.action}</h5>
                              <ol className="text-sm space-y-1">
                                {action.steps.map((step, stepIndex) => (
                                  <li key={stepIndex} className="flex items-start gap-2">
                                    <span className="bg-primary text-primary-foreground rounded-full w-4 h-4 flex items-center justify-center text-xs font-medium">
                                      {stepIndex + 1}
                                    </span>
                                    {step}
                                  </li>
                                ))}
                              </ol>
                            </div>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="emergency" className="space-y-4">
          <div className="grid gap-4">
            {emergencyProcedures.map((procedure, index) => (
              <Card key={index}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-3">
                      {procedure.icon}
                      {procedure.title}
                    </span>
                    {getSeverityBadge(procedure.severity)}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-2">Emergency Response Steps</h4>
                      <ol className="space-y-2">
                        {procedure.steps.map((step, stepIndex) => (
                          <li key={stepIndex} className="flex items-start gap-3">
                            <span className="bg-red-100 text-red-800 rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium">
                              {stepIndex + 1}
                            </span>
                            <span className="text-sm">{step}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                    
                    <Separator />
                    
                    <div>
                      <h4 className="font-semibold mb-2 flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        Emergency Contacts
                      </h4>
                      <div className="space-y-1">
                        {procedure.contacts.map((contact, contactIndex) => (
                          <Badge key={contactIndex} variant="outline" className="mr-2">
                            {contact}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="admin" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  System Configuration
                </CardTitle>
                <CardDescription>Administrative setup and maintenance procedures</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="p-3 border rounded-lg">
                  <h4 className="font-medium mb-2">Daily Setup Checklist</h4>
                  <ul className="text-sm space-y-1">
                    <li>• Verify all station scanners operational</li>
                    <li>• Check network connectivity at all locations</li>
                    <li>• Confirm staff assignments and radio channels</li>
                    <li>• Test backup power systems</li>
                    <li>• Review daily capacity and resource allocation</li>
                  </ul>
                </div>
                <div className="p-3 border rounded-lg">
                  <h4 className="font-medium mb-2">End of Day Procedures</h4>
                  <ul className="text-sm space-y-1">
                    <li>• Export daily transaction reports</li>
                    <li>• Sync any manual entries from outages</li>
                    <li>• Secure physical equipment and cash</li>
                    <li>• Document incidents and resolutions</li>
                    <li>• Prepare summary for management review</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Reporting & Analytics
                </CardTitle>
                <CardDescription>Data management and reporting procedures</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="p-3 border rounded-lg">
                  <h4 className="font-medium mb-2">Real-time Monitoring</h4>
                  <ul className="text-sm space-y-1">
                    <li>• Monitor station transaction volumes</li>
                    <li>• Track equipment checkout/return ratios</li>
                    <li>• Watch for system performance alerts</li>
                    <li>• Review assistance request queues</li>
                  </ul>
                </div>
                <div className="p-3 border rounded-lg">
                  <h4 className="font-medium mb-2">Report Generation</h4>
                  <ul className="text-sm space-y-1">
                    <li>• Generate hourly capacity reports</li>
                    <li>• Create equipment utilization summaries</li>
                    <li>• Export attendee activity data</li>
                    <li>• Compile incident and resolution logs</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="training" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Book className="h-5 w-5" />
                Interactive Training Modules
              </CardTitle>
              <CardDescription>Comprehensive training for new and existing staff</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg">
                  <h4 className="font-semibold mb-2">New Staff Onboarding</h4>
                  <p className="text-sm text-muted-foreground mb-3">Complete orientation for first-time staff</p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>System Overview</span>
                      <Badge variant="secondary">30 min</Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span>RFID Technology Basics</span>
                      <Badge variant="secondary">15 min</Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span>Customer Service Standards</span>
                      <Badge variant="secondary">20 min</Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span>Emergency Procedures</span>
                      <Badge variant="secondary">25 min</Badge>
                    </div>
                  </div>
                  <Button className="w-full mt-3" size="sm">Start Training Module</Button>
                </div>

                <div className="p-4 border rounded-lg">
                  <h4 className="font-semibold mb-2">Station Specialist Certification</h4>
                  <p className="text-sm text-muted-foreground mb-3">Advanced training for station supervisors</p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Advanced Troubleshooting</span>
                      <Badge variant="secondary">45 min</Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span>Data Management</span>
                      <Badge variant="secondary">30 min</Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span>Incident Management</span>
                      <Badge variant="secondary">35 min</Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span>Staff Coordination</span>
                      <Badge variant="secondary">25 min</Badge>
                    </div>
                  </div>
                  <Button className="w-full mt-3" size="sm" variant="outline">Begin Certification</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}