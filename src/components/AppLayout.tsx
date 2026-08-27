import { useLocation } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { useEvent } from "@/contexts/EventContext";

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
  const { eventId } = useEvent();
  // Remount page content when the year changes so every query refetches.
  const scoped = <div key={eventId ?? "none"} className="contents">{children}</div>;

  // Station pages get clean, full-width layout without sidebar
  if (isStationPage) {
    return <div className="min-h-screen w-full mobile-container">{scoped}</div>;
  }

  // All other pages get sidebar navigation
  return (
    <SidebarProvider 
      defaultOpen={true}
      className="min-h-screen"
    >
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 min-w-0 flex flex-col">
          <header className="flex items-center gap-3 border-b px-4 sm:px-6 py-3">
            <SidebarTrigger className="shrink-0" />
          </header>
          <main className="flex-1 p-4 sm:p-6 mobile-container">
            {scoped}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
