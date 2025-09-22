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
  User
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
    <Sidebar collapsible="icon">
      <SidebarContent>
        {navigationItems.map((section) => (
          <SidebarGroup key={section.label}>
            <SidebarGroupLabel>{section.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton 
                      asChild 
                      isActive={isActive(item.url)}
                      tooltip={isCollapsed ? item.title : undefined}
                    >
                      <NavLink to={item.url}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
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