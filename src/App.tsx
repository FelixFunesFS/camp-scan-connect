import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Reports from "./pages/Reports";
import ParkingActivation from "./pages/ParkingActivation";
import Ranger from "./pages/Ranger";
import ActivationStation from "./pages/ActivationStation";
import MealStation from "./pages/MealStation";
import DrinksStation from "./pages/DrinksStation";
import HeadphonesStation from "./pages/HeadphonesStation";
import SystemValidation from "./pages/SystemValidation";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/parking-activation" element={<ParkingActivation />} />
          <Route path="/ranger" element={<Ranger />} />
          <Route path="/activation" element={<ActivationStation />} />
          <Route path="/meal-station" element={<MealStation />} />
          <Route path="/drinks-station" element={<DrinksStation />} />
          <Route path="/headphones-station" element={<HeadphonesStation />} />
          <Route path="/system-validation" element={<SystemValidation />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
