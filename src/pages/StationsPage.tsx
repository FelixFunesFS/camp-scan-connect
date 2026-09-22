import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import {
  Utensils,
  Coffee,
  Headphones,
  Car,
  Radio,
  Package2,
  Shirt,
  DoorOpen,
  LayoutDashboard,
} from "lucide-react";

const STATIONS = [
  { title: "Meal Station", path: "/meal-station", icon: Utensils },
  { title: "Drinks Station", path: "/drinks-station", icon: Coffee },
  { title: "Headphones Station", path: "/headphones-station", icon: Headphones },
  { title: "Golf Carts Station", path: "/golf-carts-station", icon: Car },
  { title: "Walkie Talkies Station", path: "/walkie-talkies-station", icon: Radio },
  { title: "Fanny Packs Station", path: "/fanny-packs-station", icon: Package2 },
  { title: "T-Shirts Station", path: "/tshirts-station", icon: Shirt },
  { title: "Main Gate Station", path: "/main-gate-station", icon: DoorOpen },
] as const;

export default function StationsPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center space-y-1 pt-2">
          <h1 className="text-2xl font-bold">Stations</h1>
          <p className="text-sm text-muted-foreground">Tap a station to start scanning.</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {STATIONS.map((station) => (
            <Card
              key={station.path}
              role="button"
              tabIndex={0}
              onClick={() => navigate(station.path)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  navigate(station.path);
                }
              }}
              className="cursor-pointer transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <CardContent className="flex flex-col items-center justify-center gap-3 p-6 min-h-[120px]">
                <station.icon className="h-8 w-8 text-primary" />
                <span className="text-sm font-semibold text-center leading-tight">
                  {station.title}
                </span>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center pt-2">
          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <LayoutDashboard className="h-3.5 w-3.5" />
            Staff menu
          </button>
        </div>
      </div>
    </div>
  );
}
