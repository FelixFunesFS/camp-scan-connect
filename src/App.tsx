import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AppLayout } from "./components/AppLayout";
import { EventProvider } from "./contexts/EventContext";
import { StaffAuthProvider, useStaffAuth } from "./contexts/StaffAuthContext";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

import ActivationStation from "./pages/ActivationStation";
import StaffLogin from "./pages/StaffLogin";
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
import TShirtHub from "./pages/TShirtHub";
import AttendeeDetail from "./pages/AttendeeDetail";
import DeveloperDashboard from "./pages/DeveloperDashboard";
import Reports from "./pages/Reports";
import EventDebrief from "./pages/EventDebrief";
import ScanTester from "./pages/ScanTester";
import StationsPage from "./pages/StationsPage";

const queryClient = new QueryClient();

/** Every staff screen sits behind the shared device passcode. */
function RequireStaff({ children }: { children: React.ReactNode }) {
  const { isUnlocked } = useStaffAuth();
  const location = useLocation();
  if (!isUnlocked) {
    return <Navigate to="/staff" replace state={{ from: location.pathname }} />;
  }
  return <>{children}</>;
}

const staff = (element: React.ReactNode) => <RequireStaff>{element}</RequireStaff>;

const App = () => (
  <QueryClientProvider client={queryClient}>
    <EventProvider>
      <StaffAuthProvider>
        <TooltipProvider>
          <Toaster />
          <BrowserRouter>
            <AppLayout>
            <Routes>
              {/* Camper-facing home: self check-in */}
              <Route path="/" element={<ActivationStation />} />
              <Route path="/activation" element={<ActivationStation />} />

              {/* Hidden staff entry point */}
              <Route path="/staff" element={<StaffLogin />} />

              <Route path="/dashboard" element={staff(<Index />)} />
              <Route path="/assignment" element={staff(<RfidAssignment />)} />
              {/* Legacy path — keep working for printed links and bookmarks */}
              <Route path="/rfid-assignment" element={<Navigate to="/assignment" replace />} />
              <Route path="/staff-hub" element={staff(<StaffActivationHub />)} />
              <Route path="/stations" element={<StationsPage />} />
              <Route path="/meal-station" element={staff(<MealStation />)} />
              <Route path="/drinks-station" element={staff(<DrinksStation />)} />
              <Route path="/headphones-station" element={staff(<HeadphonesStation />)} />
              <Route path="/golf-carts-station" element={staff(<GolfCartsStation />)} />
              <Route path="/walkie-talkies-station" element={staff(<WalkieTalkiesStation />)} />
              <Route path="/fanny-packs-station" element={staff(<FannyPacksStation />)} />
              <Route path="/tshirts-station" element={staff(<TShirtsStation />)} />
              <Route path="/main-gate-station" element={staff(<MainGateStation />)} />
              <Route path="/tshirt-hub" element={staff(<TShirtHub />)} />
              <Route path="/equipment-hub" element={staff(<EquipmentHub />)} />
              <Route path="/attendee/:id" element={staff(<AttendeeDetail />)} />
              <Route path="/reports" element={staff(<Reports />)} />
              <Route path="/debrief" element={staff(<EventDebrief />)} />
              <Route path="/dev" element={staff(<DeveloperDashboard />)} />
              <Route path="/scan-test" element={staff(<ScanTester />)} />

              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            </AppLayout>
          </BrowserRouter>
        </TooltipProvider>
      </StaffAuthProvider>
    </EventProvider>
  </QueryClientProvider>
);

export default App;
