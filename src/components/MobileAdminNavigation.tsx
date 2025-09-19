import React from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { 
  BarChart3, 
  FileText, 
  Menu,
  Shield,
  Settings
} from "lucide-react";

interface MobileAdminNavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const tabCategories = [
  {
    title: "Core Functions",
    description: "Main administrative tools",
    icon: BarChart3,
    tabs: [
      { id: 'dashboard', label: 'Dashboard', icon: BarChart3, description: 'System overview and quick actions' },
      { id: 'admin-tools', label: 'Admin Tools', icon: Settings, description: 'Event operations and system maintenance' },
      { id: 'reports', label: 'Reports', icon: FileText, description: 'Analytics and attendee reports' }
    ]
  }
];

export const MobileAdminNavigation: React.FC<MobileAdminNavigationProps> = ({
  activeTab,
  onTabChange
}) => {
  const [isOpen, setIsOpen] = React.useState(false);

  const currentTab = tabCategories
    .flatMap(category => category.tabs)
    .find(tab => tab.id === activeTab);

  const handleTabSelect = (tabId: string) => {
    onTabChange(tabId);
    setIsOpen(false);
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="lg:hidden">
          <Menu className="h-4 w-4 mr-2" />
          {currentTab?.label || "Select Tool"}
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-full sm:w-[400px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Admin Hub
          </SheetTitle>
        </SheetHeader>
        
        <div className="mt-6 space-y-6">
          {tabCategories.map((category) => (
            <div key={category.title} className="space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b">
                <category.icon className="h-5 w-5 text-primary" />
                <div>
                  <h3 className="font-medium text-primary">{category.title}</h3>
                  <p className="text-xs text-muted-foreground">{category.description}</p>
                </div>
              </div>
              
              <div className="space-y-2">
                {category.tabs.map((tab) => (
                  <Button
                    key={tab.id}
                    variant={activeTab === tab.id ? "default" : "ghost"}
                    size="sm"
                    onClick={() => handleTabSelect(tab.id)}
                    className="w-full justify-start h-auto p-3"
                  >
                    <div className="flex items-start gap-3 w-full">
                      <tab.icon className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 text-left">
                        <div className="font-medium text-sm">{tab.label}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {tab.description}
                        </div>
                      </div>
                    </div>
                  </Button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
};