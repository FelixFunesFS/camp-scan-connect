import { useLocation } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AppLayoutProps {
  children: React.ReactNode;
}

const stationRoutes = [
  '/activation',
  '/meal-station',
  '/drinks-station', 
  '/headphones-station',
  '/golf-carts-station',
  '/walkie-talkies-station',
  '/fanny-packs-station',
  '/tshirts-station',
  '/main-gate-station'
];

export function AppLayout({ children }: AppLayoutProps) {
  const location = useLocation();
  const isStationPage = stationRoutes.includes(location.pathname);

  // Station pages get clean, full-width layout without sidebar
  if (isStationPage) {
    return <div className="min-h-screen w-full mobile-container">{children}</div>;
  }

  // All other pages get sidebar navigation
  return (
    <SidebarProvider 
      defaultOpen={true}
      className="min-h-screen"
    >
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <main className="flex-1 p-4 sm:p-6 mobile-container">
          {children}
        </main>
      </div>
    </SidebarProvider>
  );
}