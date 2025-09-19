import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, CreditCard, FileText, Activity } from 'lucide-react';

interface QuickActionsPanelProps {
  onNavigate: (tab: string) => void;
}

export const QuickActionsPanel: React.FC<QuickActionsPanelProps> = ({ onNavigate }) => {
  const quickActions = [
    {
      title: 'RFID Assignment',
      description: 'Assign RFID tags to attendees',
      icon: CreditCard,
      action: () => onNavigate('Event Management'),
      color: 'text-emerald-500'
    },
    {
      title: 'Staff Activation',
      description: 'Activate attendees and manage staff tools',
      icon: Users,
      action: () => onNavigate('Event Management'),
      color: 'text-blue-500'
    },
    {
      title: 'View Reports',
      description: 'Analytics and attendee reports',
      icon: FileText,
      action: () => onNavigate('Reports'),
      color: 'text-purple-500'
    },
    {
      title: 'System Management',
      description: 'Sync data and system maintenance',
      icon: Activity,
      action: () => onNavigate('System Management'),
      color: 'text-amber-500'
    }
  ];

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle>Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {quickActions.map((action, index) => {
            const IconComponent = action.icon;
            return (
              <Button
                key={index}
                variant="outline"
                className="h-auto p-4 flex-col items-start text-left space-y-2"
                onClick={action.action}
              >
                <div className="flex items-center gap-2 w-full">
                  <IconComponent className={`h-4 w-4 ${action.color}`} />
                  <span className="font-medium text-sm">{action.title}</span>
                </div>
                <p className="text-xs text-muted-foreground">{action.description}</p>
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};