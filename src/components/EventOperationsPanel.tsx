import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CreditCard, Users, Zap } from 'lucide-react';
import { RfidAssignmentTab } from '@/components/RfidAssignmentTab';
import { StaffActivationPanel } from '@/components/StaffActivationPanel';

export const EventOperationsPanel: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Zap className="h-6 w-6 text-primary" />
        <h2 className="text-2xl font-bold">Event Operations</h2>
        <Badge variant="outline" className="ml-auto">Live</Badge>
      </div>

      <Tabs defaultValue="rfid" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="rfid" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            RFID Management
          </TabsTrigger>
          <TabsTrigger value="staff" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Staff Tools
          </TabsTrigger>
        </TabsList>

        <TabsContent value="rfid" className="mt-6">
          <RfidAssignmentTab />
        </TabsContent>

        <TabsContent value="staff" className="mt-6">
          <StaffActivationPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
};