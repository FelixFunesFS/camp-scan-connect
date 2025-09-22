import { useLocation } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";

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
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <header className="h-12 flex items-center border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <SidebarTrigger className="ml-4" />
          </header>
          <main className="flex-1 p-6">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}