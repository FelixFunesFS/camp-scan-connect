import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "./components/AppLayout";
import { EventProvider } from "./contexts/EventContext";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

import ActivationStation from "./pages/ActivationStation";
import { RfidAssignment } from "./pages/RfidAssignment";
import { StaffActivationHub } from "./components/StaffActivationHub";
import MealStation from "./pages/MealStation";
import DrinksStation from "./pages/DrinksStation";
import HeadphonesStation from "./pages/HeadphonesStation";
import GolfCartsStation from "./pages/GolfCartsStation";
import WalkieTalkiesStation from "./pages/WalkieTalkiesStation";
import FannyPacksStation from "./pages/FannyPacksStation";
import TShirtsStation from "./pages/TShirtsStation";
import MainGateStation from "./pages/MainGateStation";
import EquipmentHub from "./pages/EquipmentHub";
import AttendeeDetail from "./pages/AttendeeDetail";
import DeveloperDashboard from "./pages/DeveloperDashboard";
import Reports from "./pages/Reports";
import EventDebrief from "./pages/EventDebrief";
import ScanTester from "./pages/ScanTester";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <EventProvider>
      <TooltipProvider>
        <Toaster />
        <BrowserRouter>
          <AppLayout>
          <Routes>
            <Route path="/" element={<Index />} />
            
            <Route path="/activation" element={<ActivationStation />} />
            <Route path="/assignment" element={<RfidAssignment />} />
            {/* Legacy path — keep working for printed links and bookmarks */}
            <Route path="/rfid-assignment" element={<Navigate to="/assignment" replace />} />
            <Route path="/staff-hub" element={<StaffActivationHub />} />
            <Route path="/meal-station" element={<MealStation />} />
            <Route path="/drinks-station" element={<DrinksStation />} />
            <Route path="/headphones-station" element={<HeadphonesStation />} />
            <Route path="/golf-carts-station" element={<GolfCartsStation />} />
            <Route path="/walkie-talkies-station" element={<WalkieTalkiesStation />} />
            <Route path="/fanny-packs-station" element={<FannyPacksStation />} />
            <Route path="/tshirts-station" element={<TShirtsStation />} />
            <Route path="/main-gate-station" element={<MainGateStation />} />
            <Route path="/equipment-hub" element={<EquipmentHub />} />
            <Route path="/attendee/:id" element={<AttendeeDetail />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/debrief" element={<EventDebrief />} />
            <Route path="/dev" element={<DeveloperDashboard />} />
            <Route path="/scan-test" element={<ScanTester />} />
            
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          </AppLayout>
        </BrowserRouter>
      </TooltipProvider>
    </EventProvider>
  </QueryClientProvider>
);

export default App;
