import { useLocation } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AppLayoutProps {
  children: React.ReactNode;
}

const stationRoutes = [
  '/meal-station',
  '/drinks-station', 
  '/headphones-station',
  '/golf-carts-station',
  '/walkie-talkies-station',
  '/fanny-packs-station',
  '/main-gate-station'
];

export function AppLayout({ children }: AppLayoutProps) {
  const location = useLocation();
  const isStationPage = stationRoutes.includes(location.pathname);

  // Station pages get clean, full-width layout without sidebar
  if (isStationPage) {
    return <div className="min-h-screen w-full">{children}</div>;
  }

  // All other pages get sidebar navigation
  return (
    <SidebarProvider 
      defaultOpen={true}
      className="min-h-screen"
    >
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <header className="h-12 flex items-center justify-between border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4">
            <SidebarTrigger className="h-8 w-8" />
          </header>
          <main className="flex-1 p-6">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}