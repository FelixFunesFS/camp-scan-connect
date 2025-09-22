import { 
  Home, 
  Users, 
  UserCog, 
  Package, 
  BarChart3, 
  Settings, 
  Smartphone,
  Utensils,
  Coffee,
  Headphones,
  Car,
  Radio,
  Package2,
  DoorOpen,
  User,
  Shirt
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";

const navigationItems = [
  {
    label: "Management",
    items: [
      { title: "Dashboard", url: "/", icon: Home },
      { title: "Reports", url: "/reports", icon: BarChart3 },
      { title: "Developer Tools", url: "/dev", icon: Settings },
    ]
  },
  {
    label: "Staff Operations", 
    items: [
      { title: "RFID Assignment", url: "/rfid-assignment", icon: Users },
      { title: "Staff Hub", url: "/staff-hub", icon: UserCog },
      { title: "Equipment Hub", url: "/equipment-hub", icon: Package },
    ]
  },
  {
    label: "Self-Service",
    items: [
      { title: "Activation Station", url: "/activation", icon: Smartphone },
    ]
  },
  {
    label: "Station Operations",
    items: [
      { title: "Meal Station", url: "/meal-station", icon: Utensils },
      { title: "Drinks Station", url: "/drinks-station", icon: Coffee },
      { title: "Headphones Station", url: "/headphones-station", icon: Headphones },
      { title: "Golf Carts Station", url: "/golf-carts-station", icon: Car },
      { title: "Walkie Talkies Station", url: "/walkie-talkies-station", icon: Radio },
      { title: "Fanny Packs Station", url: "/fanny-packs-station", icon: Package2 },
      { title: "T-Shirts Station", url: "/tshirts-station", icon: Shirt },
      { title: "Main Gate Station", url: "/main-gate-station", icon: DoorOpen },
    ]
  }
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const isCollapsed = state === "collapsed";
  
  const isActive = (path: string) => {
    if (path === "/") {
      return location.pathname === "/";
    }
    return location.pathname === path;
  };

  return (
    <Sidebar 
      collapsible="icon"
      className="transition-all duration-300 ease-in-out"
    >
      <SidebarContent className="gap-0">
        <div className="flex items-center justify-between p-3 border-b border-border/50">
          <SidebarTrigger className="h-8 w-8" />
        </div>
        {navigationItems.map((section) => (
          <SidebarGroup key={section.label}>
            {!isCollapsed && (
              <SidebarGroupLabel className="text-xs font-medium text-muted-foreground/70 px-3 py-2">
                {section.label}
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton 
                      asChild 
                      isActive={isActive(item.url)}
                      tooltip={isCollapsed ? item.title : undefined}
                      className="h-9 transition-colors duration-200"
                    >
                      <NavLink to={item.url}>
                        <item.icon className="h-4 w-4 shrink-0" />
                        {!isCollapsed && <span className="truncate">{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  );
}